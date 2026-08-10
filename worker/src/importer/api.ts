// Subscribe-side owner API (cookie auth, JSON) — v0.2-plan.md §4.2. Mounted
// alongside ../api.ts under /api.

import { Hono } from "hono";
import type { Env } from "../types.ts";
import { pollSubscription, reconcileIndex } from "./poll.ts";
import { resolve } from "./resolve.ts";
import {
  addHopperItem,
  createHopper,
  createSubscription,
  deleteHopper,
  deleteSignal,
  deleteSubscription,
  getHopper,
  getHopperBySlug,
  getSubscription,
  removeHopperItem,
  setBlogrollFlag,
  setHopperPublic,
  setSignal,
  setSubscriptionStatus,
  setSubscriptionTitle,
} from "./store.ts";

export const importerApi = new Hono<{ Bindings: Env }>({ strict: false });

function titleFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Two-phase add-by-URL (§2.1/§4.2): without `confirm`, resolves and returns
 * the identity for the owner to confirm (surfacing any site-vs-origin
 * mismatch); with `confirm: true`, actually creates the subscription and
 * runs an initial backfill so the first read isn't empty.
 */
importerApi.post("/subscriptions", async (c) => {
  const body = await c.req.json<{ url?: string; confirm?: boolean; title?: string }>().catch(() => ({}) as { url?: string; confirm?: boolean; title?: string });
  if (typeof body.url !== "string" || !body.url.trim()) return c.json({ error: "url required" }, 400);

  const result = await resolve(body.url.trim());
  if (result.kind === "failure") {
    return c.json({ error: "could not resolve this URL to a blyg or a feed", tried: result.tried }, 422);
  }

  if (!body.confirm) {
    if (result.kind === "blyg") {
      return c.json({
        needsConfirm: true,
        kind: "blyg",
        origin: result.origin,
        title: typeof result.manifest.title === "string" ? result.manifest.title : titleFromUrl(result.origin),
        siteMismatch: result.siteMismatch,
      });
    }
    return c.json({ needsConfirm: true, kind: "rss", feedUrl: result.feedUrl, title: titleFromUrl(result.feedUrl) });
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : undefined;
  const sub =
    result.kind === "blyg"
      ? await createSubscription(c.env.DB, {
          kind: "blyg",
          origin: result.origin,
          feedUrl: typeof result.manifest.feed === "string" ? new URL(result.manifest.feed, result.origin).toString() : `${result.origin}feed.xml`,
          title: title ?? (typeof result.manifest.title === "string" ? result.manifest.title : titleFromUrl(result.origin)),
        })
      : await createSubscription(c.env.DB, {
          kind: "rss",
          origin: result.feedUrl,
          feedUrl: result.feedUrl,
          title: title ?? titleFromUrl(result.feedUrl),
        });
  // Initial backfill (§3.2 step 4 / plan §7 open decision #2: import the full
  // archive on first subscribe) — a fresh subscription's null
  // last_index_sync_at makes the very first pollSubscription() call reconcile
  // unconditionally, which also bootstraps newest_guid/etag for future gap
  // detection (§3.2) in one pass, for both kinds uniformly.
  await pollSubscription(c.env.DB, sub);
  return c.json({ id: sub.id, kind: sub.kind, origin: sub.origin }, 201);
});

importerApi.put("/subscriptions/:id", async (c) => {
  const sub = await getSubscription(c.env.DB, c.req.param("id"));
  if (!sub) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ in_blogroll?: boolean; title?: string }>().catch(() => ({}) as Record<string, never>);
  if (typeof body.in_blogroll === "boolean") await setBlogrollFlag(c.env.DB, sub.id, body.in_blogroll);
  if (typeof body.title === "string" && body.title.trim()) await setSubscriptionTitle(c.env.DB, sub.id, body.title.trim());
  return c.json({ ok: true });
});

importerApi.post("/subscriptions/:id/pause", async (c) => {
  const sub = await getSubscription(c.env.DB, c.req.param("id"));
  if (!sub) return c.json({ error: "not found" }, 404);
  await setSubscriptionStatus(c.env.DB, sub.id, "paused");
  return c.json({ ok: true });
});

importerApi.post("/subscriptions/:id/resume", async (c) => {
  const sub = await getSubscription(c.env.DB, c.req.param("id"));
  if (!sub) return c.json({ error: "not found" }, 404);
  await setSubscriptionStatus(c.env.DB, sub.id, "active");
  return c.json({ ok: true });
});

/** Force an index reconciliation right now, regardless of the periodic schedule. */
importerApi.post("/subscriptions/:id/resync", async (c) => {
  const sub = await getSubscription(c.env.DB, c.req.param("id"));
  if (!sub) return c.json({ error: "not found" }, 404);
  if (sub.kind !== "blyg") return c.json({ error: "resync only applies to blyg subscriptions" }, 409);
  const result = await reconcileIndex(c.env.DB, sub);
  return c.json({ ok: result.ok, changed: result.changed });
});

importerApi.delete("/subscriptions/:id", async (c) => {
  const sub = await getSubscription(c.env.DB, c.req.param("id"));
  if (!sub) return c.json({ error: "not found" }, 404);
  await deleteSubscription(c.env.DB, sub.id);
  return c.json({ ok: true });
});

// --- Hoppers + signals (task 10, §3.4/§4.2) ---

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "hopper"
  );
}

importerApi.post("/hoppers", async (c) => {
  const body = await c.req.json<{ name?: string }>().catch(() => ({}) as { name?: string });
  if (typeof body.name !== "string" || !body.name.trim()) return c.json({ error: "name required" }, 400);
  const base = slugify(body.name.trim());
  let slug = base;
  for (let i = 2; await getHopperBySlug(c.env.DB, slug); i++) slug = `${base}-${i}`;
  const hopper = await createHopper(c.env.DB, body.name.trim(), slug);
  return c.json({ id: hopper.id, name: hopper.name, slug: hopper.slug }, 201);
});

importerApi.put("/hoppers/:id", async (c) => {
  const hopper = await getHopper(c.env.DB, c.req.param("id"));
  if (!hopper) return c.json({ error: "not found" }, 404);
  const body = await c.req.json<{ public?: boolean }>().catch(() => ({}) as { public?: boolean });
  if (typeof body.public === "boolean") await setHopperPublic(c.env.DB, hopper.id, body.public);
  return c.json({ ok: true });
});

importerApi.delete("/hoppers/:id", async (c) => {
  const hopper = await getHopper(c.env.DB, c.req.param("id"));
  if (!hopper) return c.json({ error: "not found" }, 404);
  await deleteHopper(c.env.DB, hopper.id);
  return c.json({ ok: true });
});

importerApi.put("/hoppers/:id/items/:sub/:remoteId", async (c) => {
  const hopper = await getHopper(c.env.DB, c.req.param("id"));
  if (!hopper) return c.json({ error: "hopper not found" }, 404);
  const sub = await getSubscription(c.env.DB, c.req.param("sub"));
  if (!sub) return c.json({ error: "subscription not found" }, 404);
  await addHopperItem(c.env.DB, hopper.id, sub.id, c.req.param("remoteId"));
  return c.json({ ok: true });
});

importerApi.delete("/hoppers/:id/items/:sub/:remoteId", async (c) => {
  const hopper = await getHopper(c.env.DB, c.req.param("id"));
  if (!hopper) return c.json({ error: "hopper not found" }, 404);
  await removeHopperItem(c.env.DB, hopper.id, c.req.param("sub"), c.req.param("remoteId"));
  return c.json({ ok: true });
});

importerApi.put("/signals/:sub/:remoteId", async (c) => {
  const sub = await getSubscription(c.env.DB, c.req.param("sub"));
  if (!sub) return c.json({ error: "subscription not found" }, 404);
  const body = await c.req.json<{ thumb?: number }>().catch(() => ({}) as { thumb?: number });
  if (body.thumb !== 1 && body.thumb !== -1) return c.json({ error: "thumb must be 1 or -1" }, 400);
  await setSignal(c.env.DB, sub.id, c.req.param("remoteId"), body.thumb);
  return c.json({ ok: true });
});

importerApi.delete("/signals/:sub/:remoteId", async (c) => {
  await deleteSignal(c.env.DB, c.req.param("sub"), c.req.param("remoteId"));
  return c.json({ ok: true });
});
