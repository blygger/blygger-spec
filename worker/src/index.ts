// Ygg v0.1 "Seed" — route wiring. Public surface per v0.1-plan §3.3.

import { Hono } from "hono";
import { api } from "./api.ts";
import { verifySession } from "./auth.ts";
import { getItem, getMedia, getSettings, listPublic } from "./model.ts";
import { archivePage, feedPage, permalinkPage, STYLE_CSS } from "./pages.ts";
import { buildArchiveIndex, buildFeedXml, buildItemJson, buildManifest, siteOrigin } from "./protocol.ts";
import { studio } from "./studio.ts";
import type { Env } from "./types.ts";
import { FEED_PAGE_SIZE } from "./types.ts";

const app = new Hono<{ Bindings: Env }>({ strict: false });

// --- Public: /ygg/* — cache 60s; JSON/XML surfaces get permissive CORS. ---

app.use("/ygg/*", async (c, next) => {
  await next();
  if (c.res.ok && !c.res.headers.has("Cache-Control")) {
    c.res.headers.set("Cache-Control", "public, max-age=60");
  }
});

const cors = (c: { header: (k: string, v: string) => void }) =>
  c.header("Access-Control-Allow-Origin", "*");

app.get("/", (c) => c.redirect("/ygg/"));

// strict:false: registered without trailing slash, serves /ygg and /ygg/.
app.get("/ygg", async (c) => {
  const settings = await getSettings(c.env.DB);
  const items = await listPublic(c.env.DB, FEED_PAGE_SIZE + 1);
  const hasMore = items.length > FEED_PAGE_SIZE;
  return c.html(await feedPage(c.env.DB, settings, items.slice(0, FEED_PAGE_SIZE), hasMore));
});

app.get("/ygg/style.css", (c) => c.text(STYLE_CSS, 200, { "Content-Type": "text/css; charset=utf-8" }));

app.get("/ygg/feed.xml", async (c) => {
  const settings = await getSettings(c.env.DB);
  const xml = await buildFeedXml(c.env.DB, settings, siteOrigin(settings, c.req.url));
  cors(c);
  return c.body(xml, 200, { "Content-Type": "application/rss+xml; charset=utf-8" });
});

app.get("/ygg/ygg.json", async (c) => {
  const settings = await getSettings(c.env.DB);
  cors(c);
  return c.json(await buildManifest(c.env.DB, settings, siteOrigin(settings, c.req.url)));
});

app.get("/ygg/items/index.json", async (c) => {
  cors(c);
  return c.json(await buildArchiveIndex(c.env.DB));
});

app.get("/ygg/items/:file", async (c) => {
  const file = c.req.param("file");
  if (!file.endsWith(".json")) return c.notFound();
  const item = await getItem(c.env.DB, file.slice(0, -5));
  // 404 for drafts/unknown; tombstones are 200 forever (§3.3).
  if (!item || item.status === "draft") return c.notFound();
  const settings = await getSettings(c.env.DB);
  cors(c);
  return c.json(await buildItemJson(c.env.DB, settings, item, siteOrigin(settings, c.req.url)));
});

app.get("/ygg/f/:id", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item || item.status === "draft") return c.notFound();
  const settings = await getSettings(c.env.DB);
  return c.html(await permalinkPage(c.env.DB, settings, item));
});

app.get("/ygg/archive", async (c) => {
  const settings = await getSettings(c.env.DB);
  return c.html(await archivePage(c.env.DB, settings, await listPublic(c.env.DB)));
});

app.get("/ygg/media/:file", async (c) => {
  const file = c.req.param("file");
  const media = await getMedia(c.env.DB, file.split(".")[0]);
  if (!media || media.r2_key !== `media/${file}`) return c.notFound();
  const object = await c.env.MEDIA.get(media.r2_key);
  if (!object) return c.notFound();
  return c.body(object.body as ReadableStream, 200, {
    "Content-Type": media.mime,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
});

// --- Studio & API: cookie auth. Login/logout are the only unauthenticated studio routes. ---

app.use("/studio/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path === "/studio/login" || path === "/studio/logout") return next();
  if (!(await verifySession(c.env, c.req.header("cookie")))) return c.redirect("/studio/login");
  return next();
});
app.use("/studio", async (c, next) => {
  if (!(await verifySession(c.env, c.req.header("cookie")))) return c.redirect("/studio/login");
  return next();
});
app.route("/studio", studio);

app.use("/api/*", async (c, next) => {
  if (!(await verifySession(c.env, c.req.header("cookie")))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
});
app.route("/api", api);

export default app;
