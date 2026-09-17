// Owner API (cookie auth, JSON) — v0.1-plan §3.3.

import { type Context, Hono } from "hono";
import {
  authoredKind,
  createDraft,
  discardDraft,
  FragmentTooLongError,
  getItem,
  getSettings,
  getVersion,
  insertMedia,
  pinVersion,
  publish,
  putSettings,
  RestoreVersionError,
  restoreVersion,
  saveWorkingCopy,
  setStubOf,
  TkPublishError,
  TransclusionResolveError,
  withdraw,
} from "./model.ts";
import { mentionFetch } from "./mentions/http.ts";
import { drainOutbound, enqueueForVersion } from "./mentions/send.ts";
import { siteOrigin } from "./protocol.ts";
import { parseStubOf } from "./stub.ts";
import { runGenerateScope } from "./tk-generate.ts";
import type { Env } from "./types.ts";
import { newMediaId, normalizeMount } from "./util.ts";

const MEDIA_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const api = new Hono<{ Bindings: Env }>({ strict: false });

type ItemBody = { content_md?: string; kind?: string; stub_of?: unknown };

api.post("/items", async (c) => {
  const body = await c.req.json<ItemBody>().catch(() => ({}) as ItemBody);
  const kind = body.kind === "thread" ? "thread" : "fragment";
  // A stub is a thread declaring one target (§2.2) — the stub action creates
  // the draft and its citation in one call.
  let stub = null;
  if (body.stub_of != null) {
    if (kind !== "thread") return c.json({ error: "only threads can be stubs" }, 400);
    const parsed = parseStubOf(body.stub_of);
    if (!parsed.ok) return c.json({ error: parsed.reason }, 400);
    stub = parsed.stub;
  }
  const item = await createDraft(c.env.DB, body.content_md ?? "", kind);
  if (stub) await setStubOf(c.env.DB, item.id, stub);
  return c.json({ id: item.id, kind: item.kind, status: item.status }, 201);
});

api.put("/items/:id", async (c) => {
  // Withdrawn items stay editable — the working copy survives withdrawal
  // and can be republished (§3.1).
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<ItemBody>();
  // `stub_of: null` clears the citation — the body stays as written, so what
  // was a stub becomes a thread that happens to quote something (§3.1).
  if ("stub_of" in body) {
    if ((await authoredKind(c.env.DB, item)) !== "thread") return c.json({ error: "only threads can be stubs" }, 400);
    if (body.stub_of === null) {
      await setStubOf(c.env.DB, item.id, null);
    } else {
      const parsed = parseStubOf(body.stub_of);
      if (!parsed.ok) return c.json({ error: parsed.reason }, 400);
      await setStubOf(c.env.DB, item.id, parsed.stub);
    }
    if (typeof body.content_md !== "string") return c.json({ ok: true });
  }
  if (typeof body.content_md !== "string") return c.json({ error: "content_md required" }, 400);
  await saveWorkingCopy(c.env.DB, item.id, body.content_md);
  return c.json({ ok: true });
});

/**
 * Queue (and immediately attempt) the mentions a version owes, then get out
 * of the way. Delivery is fire-and-forget from the author's point of view
 * (§2.3.3): publish has already succeeded by the time this runs, nothing here
 * can fail it, and the cron retries whatever this attempt doesn't land.
 */
async function sendMentionsFor(c: Context<{ Bindings: Env }>, itemId: string, version: number): Promise<void> {
  const row = await getVersion(c.env.DB, itemId, version);
  if (!row) return;
  const settings = await getSettings(c.env.DB);
  const origin = siteOrigin(settings, c.req.url, normalizeMount(c.env.MOUNT));
  const refs = await enqueueForVersion(c.env.DB, itemId, version, row, origin);
  if (!refs.length) return;
  // Fire-and-forget in the strong sense: a delivery error is a row status,
  // never an uncaught rejection in the worker that just published.
  c.executionCtx.waitUntil(drainOutbound(c.env.DB, mentionFetch, { origin }).catch(() => {}));
}

api.post("/items/:id/publish", async (c) => {
  // Also the republish path for withdrawn items: vN+1 restores 'public'/authored kind.
  // Studio-side fragment cap (§2.7) is enforced inside publish() against the
  // TK-stripped (published) length, not the raw working copy — see FragmentTooLongError.
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ note?: string }>().catch(() => ({}) as { note?: string });
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  try {
    const version = await publish(c.env.DB, item, note);
    await sendMentionsFor(c, item.id, version);
    return c.json({ ok: true, version });
  } catch (e) {
    if (e instanceof TransclusionResolveError) {
      return c.json({ error: "one or more transclusions do not resolve", errors: e.errors }, 400);
    }
    if (e instanceof TkPublishError) {
      return c.json({ error: "one or more TK scopes are not publish-ready", errors: e.issues }, 400);
    }
    if (e instanceof FragmentTooLongError) {
      return c.json({ error: `fragment exceeds ${e.max} characters` }, 400);
    }
    throw e;
  }
});

/**
 * TK generation (tk-core-plan.md §5): resolve scope `n`'s sources exactly
 * like transclusion targets, call the provider, splice the output into the
 * working copy, and record provenance for the next publish to pick up.
 * Errors are surfaced verbatim (no retry loop, per §5/§6 task 4). Logic
 * lives in tk-generate.ts's runGenerateScope so tests can inject a fixture
 * provider fetch (same DI pattern as importer/schedule.ts's runScheduledPoll).
 */
api.post("/items/:id/generate", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ scope?: number }>().catch(() => ({}) as { scope?: number });
  if (typeof body.scope !== "number") return c.json({ error: "scope index required" }, 400);

  const result = await runGenerateScope(c.env, item, body.scope);
  if (!result.ok) return c.json(result.body, result.status as 400 | 404 | 502);
  return c.json({ text: result.text, model: result.model });
});

api.post("/items/:id/withdraw", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  if (item.status === "withdrawn") return c.json({ error: "already withdrawn" }, 409);
  if (item.status !== "public") return c.json({ error: "not published" }, 409);
  const body = await c.req.json<{ note?: string }>().catch(() => ({}) as { note?: string });
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const version = await withdraw(c.env.DB, item, note);
  // §2.3.6: a withdrawn stub re-sends its mention once, from the last real
  // version's references — the endcap has none — so the receiver re-verifies,
  // finds a withdrawn document, and marks the row gone. That is the
  // W3C-blessed way to say "this is no longer there".
  await sendMentionsFor(c, item.id, item.version);
  return c.json({ ok: true, version });
});

api.post("/items/:id/pin", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ version?: number }>().catch(() => ({}) as { version?: number });
  if (typeof body.version !== "number") return c.json({ error: "version required" }, 400);
  const row = await getVersion(c.env.DB, item.id, body.version);
  if (!row) return c.json({ error: "version not found" }, 404);
  // Endcap (withdrawal) versions have no content to cite (§2.8).
  if (!row.content_md) return c.json({ error: "cannot pin an endcap version" }, 409);
  const already = row.pinned === 1;
  if (!already) await pinVersion(c.env.DB, item.id, body.version);
  return c.json({ ok: true, version: body.version, already });
});

/**
 * Restore a past version into the working copy (studio furniture). Nothing is
 * published here and no version number moves: the author reviews the restored
 * draft and publishes it as the next version, forward-only. See
 * model.restoreVersion().
 */
api.post("/items/:id/restore", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ version?: number }>().catch(() => ({}) as { version?: number });
  if (typeof body.version !== "number") return c.json({ error: "version required" }, 400);
  try {
    await restoreVersion(c.env.DB, item, body.version);
  } catch (err) {
    if (err instanceof RestoreVersionError) return c.json({ error: err.message }, 409);
    throw err;
  }
  return c.json({ ok: true, restored: body.version, publishesAs: item.version + 1 });
});

api.delete("/items/:id", async (c) => {
  // Drafts only. Published items leave the public stream via withdraw — no delete exists.
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  if (item.version > 0) return c.json({ error: "published items are withdrawn, not deleted" }, 409);
  await discardDraft(c.env.DB, item);
  return c.json({ ok: true, outcome: "discarded" });
});

api.post("/media", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return c.json({ error: "file field required (multipart)" }, 400);
  const ext = MEDIA_TYPES[file.type];
  if (!ext) return c.json({ error: `unsupported type ${file.type || "(none)"}; allowed: png/jpg/gif/webp/svg` }, 415);
  if (file.size > MEDIA_MAX_BYTES) return c.json({ error: "file exceeds 5 MB" }, 413);
  const itemId = form?.get("item_id");
  if (typeof itemId === "string" && itemId && !(await getItem(c.env.DB, itemId))) {
    return c.json({ error: "item_id not found" }, 404);
  }
  const id = newMediaId();
  const r2Key = `media/${id}.${ext}`;
  await c.env.MEDIA.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const alt = form?.get("alt");
  const row = await insertMedia(c.env.DB, {
    id,
    item_id: typeof itemId === "string" && itemId ? itemId : null,
    r2_key: r2Key,
    mime: file.type,
    alt: typeof alt === "string" ? alt : null,
  });
  return c.json({ id: row.id, url: row.r2_key, mime: row.mime }, 201);
});

const SETTINGS_KEYS = [
  "site_title",
  "theme",
  "author_name",
  "author_bio",
  "site_url",
  "avatar_media_id",
  "ai_model",
  "ai_style_prompt",
] as const;

api.put("/settings", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: "JSON body required" }, 400);
  const patch: Record<string, string> = {};
  for (const key of SETTINGS_KEYS) {
    if (typeof body[key] === "string") patch[key] = body[key] as string;
  }
  if (Array.isArray(body.author_links)) {
    const links = body.author_links.filter(
      (l): l is { label: string; url: string } =>
        !!l && typeof l === "object" && typeof (l as Record<string, unknown>).label === "string" && typeof (l as Record<string, unknown>).url === "string",
    );
    patch.author_links = JSON.stringify(links.map((l) => ({ label: l.label, url: l.url })));
  }
  await putSettings(c.env.DB, patch);
  return c.json({ ok: true });
});
