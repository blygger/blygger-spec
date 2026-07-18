// Owner API (cookie auth, JSON) — v0.1-plan §3.3.

import { Hono } from "hono";
import {
  createDraft,
  deleteItem,
  getItem,
  insertMedia,
  publish,
  putSettings,
  saveWorkingCopy,
  unpublish,
} from "./model.ts";
import type { Env } from "./types.ts";
import { FRAGMENT_MAX_CHARS } from "./types.ts";
import { newMediaId } from "./util.ts";

const MEDIA_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const api = new Hono<{ Bindings: Env }>({ strict: false });

api.post("/items", async (c) => {
  const body = await c.req.json<{ content_md?: string }>().catch(() => ({}) as { content_md?: string });
  const item = await createDraft(c.env.DB, body.content_md ?? "");
  return c.json({ id: item.id, status: item.status }, 201);
});

api.put("/items/:id", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  if (item.kind === "tombstone") return c.json({ error: "item is deleted" }, 409);
  const body = await c.req.json<{ content_md?: string }>();
  if (typeof body.content_md !== "string") return c.json({ error: "content_md required" }, 400);
  await saveWorkingCopy(c.env.DB, item.id, body.content_md);
  return c.json({ ok: true });
});

api.post("/items/:id/publish", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  if (item.kind === "tombstone") return c.json({ error: "item is deleted" }, 409);
  // Studio-side fragment cap (§2.7): enforced at publish time, never by readers.
  if (item.content_md.length > FRAGMENT_MAX_CHARS) {
    return c.json({ error: `fragment exceeds ${FRAGMENT_MAX_CHARS} characters` }, 400);
  }
  const body = await c.req.json<{ note?: string }>().catch(() => ({}) as { note?: string });
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const version = await publish(c.env.DB, item, note);
  return c.json({ ok: true, version });
});

api.post("/items/:id/unpublish", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  if (item.kind === "tombstone") return c.json({ error: "item is deleted" }, 409);
  if (item.status !== "public") return c.json({ error: "not published" }, 409);
  await unpublish(c.env.DB, item.id);
  return c.json({ ok: true });
});

api.delete("/items/:id", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  if (item.kind === "tombstone") return c.json({ error: "already deleted" }, 409);
  const outcome = await deleteItem(c.env.DB, item);
  return c.json({ ok: true, outcome });
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

const SETTINGS_KEYS = ["site_title", "author_name", "author_bio", "site_url", "avatar_media_id"] as const;

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
