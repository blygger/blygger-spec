// Blygger v0.1 "Seed" — route wiring. Public surface per v0.1-plan §3.3.
//
// Session 8 (locked decision #14): the public surface's mount path is
// deployment config (Env.MOUNT, default /blyg), freely assignable including
// "" = domain root. Routes are built per-mount by makeApp() and memoized.
// /studio is client furniture, not protocol surface (decision #3) — nested
// under the mount since session 16 (venkateshrao.com/blyg/studio, not
// venkateshrao.com/studio) so a non-root deployment doesn't put studio at a
// URL that looks unrelated to its own public page; a root-mount deployment
// (mount="") is unaffected, since mount+"/studio" === "/studio" there. /api
// stays host-rooted regardless of mount — it's invisible plumbing the
// studio JS calls into, never a bookmarked/navigated URL, so nesting it
// bought nothing and would have meant threading a mount-aware base through
// every embedded fetch() call in studio.ts/importer/studio.ts instead of
// just the human-facing links. Registration order matters at root mount:
// studio/api handlers are registered before the public sub-app so its cache
// middleware never wraps them — verified this still holds with studio
// nested under a non-root mount too (no path collision: pub has no /studio
// route, and studio/api are still registered on `app` before `pub` is
// attached).

import { type Context, Hono } from "hono";
import { api } from "./api.ts";
import { verifySession } from "./auth.ts";
import { importerApi } from "./importer/api.ts";
import { buildBlogrollOpml } from "./importer/opml.ts";
import { publicHopperPage } from "./importer/pages.ts";
import { runScheduledPoll } from "./importer/schedule.ts";
import { importerStudio } from "./importer/studio.ts";
import { getHopperBySlug, getImportedItem, getSubscription, listBlogrollSubscriptions, listHopperItems } from "./importer/store.ts";
import { authoredKind, getItem, getMedia, getSettings, getVersion, listPublic } from "./model.ts";
import { archivePage, feedPage, permalinkPage, pinnedVersionPage, STYLE_CSS, threadPage } from "./pages.ts";
import { buildArchiveIndex, buildFeedXml, buildItemJson, buildManifest, buildPinnedVersionJson, siteOrigin } from "./protocol.ts";
import { studio } from "./studio.ts";
import type { Env } from "./types.ts";
import { FEED_PAGE_SIZE } from "./types.ts";
import { normalizeMount, studioPath } from "./util.ts";

const cors = (c: { header: (k: string, v: string) => void }) =>
  c.header("Access-Control-Allow-Origin", "*");

/** Build the app for one normalized mount ("" = root, else "/path"). */
export function makeApp(mount: string) {
  const app = new Hono<{ Bindings: Env }>({ strict: false });

  // --- Studio: cookie auth, mount-relative (see header note). API: cookie auth, host-rooted. Registered first. ---

  const studioBase = studioPath(mount);
  const studioLogin = studioBase + "/login";

  app.use(studioBase + "/*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (path === studioLogin || path === studioBase + "/logout") return next();
    if (!(await verifySession(c.env, c.req.header("cookie")))) return c.redirect(studioLogin);
    return next();
  });
  app.use(studioBase, async (c, next) => {
    if (!(await verifySession(c.env, c.req.header("cookie")))) return c.redirect(studioLogin);
    return next();
  });
  app.route(studioBase, studio);
  app.route(studioBase, importerStudio);

  app.use("/api/*", async (c, next) => {
    if (!(await verifySession(c.env, c.req.header("cookie")))) {
      return c.json({ error: "unauthorized" }, 401);
    }
    return next();
  });
  app.route("/api", api);
  app.route("/api", importerApi);

  // --- Public surface: mount-relative — cache 60s; JSON/XML get permissive CORS. ---

  const pub = new Hono<{ Bindings: Env }>({ strict: false });

  pub.use("*", async (c, next) => {
    await next();
    if (c.res.ok && !c.res.headers.has("Cache-Control")) {
      c.res.headers.set("Cache-Control", "public, max-age=60");
    }
  });

  // strict:false: serves both {mount} and {mount}/ (and "/" at root mount).
  pub.get("/", async (c) => {
    const settings = await getSettings(c.env.DB);
    const items = await listPublic(c.env.DB, FEED_PAGE_SIZE + 1);
    const hasMore = items.length > FEED_PAGE_SIZE;
    return c.html(await feedPage(c.env.DB, settings, items.slice(0, FEED_PAGE_SIZE), hasMore, mount, siteOrigin(settings, c.req.url, mount)));
  });

  pub.get("/style.css", (c) => c.text(STYLE_CSS, 200, { "Content-Type": "text/css; charset=utf-8" }));

  pub.get("/feed.xml", async (c) => {
    const settings = await getSettings(c.env.DB);
    const xml = await buildFeedXml(c.env.DB, settings, siteOrigin(settings, c.req.url, mount));
    cors(c);
    return c.body(xml, 200, { "Content-Type": "application/rss+xml; charset=utf-8" });
  });

  pub.get("/blyg.json", async (c) => {
    const settings = await getSettings(c.env.DB);
    cors(c);
    return c.json(await buildManifest(c.env.DB, settings, siteOrigin(settings, c.req.url, mount)));
  });

  pub.get("/items/index.json", async (c) => {
    cors(c);
    return c.json(await buildArchiveIndex(c.env.DB));
  });

  // §2.2 blogroll: 404 when no subscription is flagged public.
  pub.get("/blogroll.opml", async (c) => {
    const subs = await listBlogrollSubscriptions(c.env.DB);
    if (!subs.length) return c.notFound();
    const settings = await getSettings(c.env.DB);
    cors(c);
    return c.body(buildBlogrollOpml(subs, settings.site_title), 200, { "Content-Type": "text/x-opml; charset=utf-8" });
  });

  // §4.2 public hopper page: curation display only (decision #12) — 404 unless the hopper is public.
  pub.get("/h/:slug", async (c) => {
    const hopper = await getHopperBySlug(c.env.DB, c.req.param("slug"));
    if (!hopper || hopper.public !== 1) return c.notFound();
    const memberships = await listHopperItems(c.env.DB, hopper.id);
    const subCache = new Map<string, Awaited<ReturnType<typeof getSubscription>>>();
    const items: { row: NonNullable<Awaited<ReturnType<typeof getImportedItem>>>; sub: NonNullable<Awaited<ReturnType<typeof getSubscription>>> }[] = [];
    for (const m of memberships) {
      const row = await getImportedItem(c.env.DB, m.subscription_id, m.remote_id);
      if (!row) continue;
      let sub = subCache.get(m.subscription_id);
      if (sub === undefined) {
        sub = await getSubscription(c.env.DB, m.subscription_id);
        subCache.set(m.subscription_id, sub);
      }
      if (!sub) continue;
      items.push({ row, sub });
    }
    return c.html(await publicHopperPage(hopper, items, mount));
  });

  pub.get("/items/:file", async (c) => {
    const file = c.req.param("file");
    if (!file.endsWith(".json")) return c.notFound();
    const item = await getItem(c.env.DB, file.slice(0, -5));
    // 404 for drafts/unknown; withdrawn endcaps are 200 forever (§3.3).
    if (!item || item.status === "draft") return c.notFound();
    const settings = await getSettings(c.env.DB);
    cors(c);
    return c.json(await buildItemJson(c.env.DB, settings, item, siteOrigin(settings, c.req.url, mount)));
  });

  // §2.8 pinned version files: 404 unless pinned; 200 forever once pinned,
  // surviving edits and withdrawal of the live stream.
  pub.get("/items/:id/:vfile", async (c) => {
    const m = /^v(\d+)\.json$/.exec(c.req.param("vfile"));
    if (!m) return c.notFound();
    const item = await getItem(c.env.DB, c.req.param("id") ?? "");
    if (!item || item.status === "draft") return c.notFound();
    const row = await getVersion(c.env.DB, item.id, Number(m[1]));
    if (!row || row.pinned !== 1) return c.notFound();
    const settings = await getSettings(c.env.DB);
    cors(c);
    return c.json(buildPinnedVersionJson(settings, item, row, siteOrigin(settings, c.req.url, mount)));
  });

  pub.get("/f/:id", async (c) => {
    const item = await getItem(c.env.DB, c.req.param("id"));
    if (!item || item.status === "draft") return c.notFound();
    if ((await authoredKind(c.env.DB, item)) !== "fragment") return c.notFound();
    const settings = await getSettings(c.env.DB);
    return c.html(await permalinkPage(c.env.DB, settings, item, mount, siteOrigin(settings, c.req.url, mount)));
  });

  // Pinned-version HTML pages (session-18 decision, additive per §2.8's
  // reserved path): the live permalink + /v{n}/. Same gate as the JSON —
  // 404 unless that exact version is pinned; 200 forever once it is,
  // surviving withdrawal. The authored kind of the *pinned version* decides
  // which route serves it (a withdrawn item's kind is 'withdrawn', but its
  // pinned v1 was authored as fragment or thread — transclusions tells us).
  const pinnedPage = (wantThread: boolean) => async (c: Context<{ Bindings: Env }>) => {
    const m = /^v(\d+)$/.exec(c.req.param("vseg") ?? "");
    if (!m) return c.notFound();
    const item = await getItem(c.env.DB, c.req.param("id") ?? "");
    if (!item || item.status === "draft") return c.notFound();
    const row = await getVersion(c.env.DB, item.id, Number(m[1]));
    if (!row || row.pinned !== 1) return c.notFound();
    const isThread = row.transclusions !== null;
    if (isThread !== wantThread) return c.notFound();
    const settings = await getSettings(c.env.DB);
    return c.html(pinnedVersionPage(settings, item, row, isThread, mount, siteOrigin(settings, c.req.url, mount)));
  };
  pub.get("/f/:id/:vseg", pinnedPage(false));
  pub.get("/t/:id/:vseg", pinnedPage(true));

  // §2.9 thread permalink page.
  pub.get("/t/:id", async (c) => {
    const item = await getItem(c.env.DB, c.req.param("id"));
    if (!item || item.status === "draft") return c.notFound();
    if ((await authoredKind(c.env.DB, item)) !== "thread") return c.notFound();
    const settings = await getSettings(c.env.DB);
    return c.html(await threadPage(c.env.DB, settings, item, mount, siteOrigin(settings, c.req.url, mount)));
  });

  pub.get("/archive", async (c) => {
    const settings = await getSettings(c.env.DB);
    return c.html(await archivePage(c.env.DB, settings, await listPublic(c.env.DB), mount, siteOrigin(settings, c.req.url, mount)));
  });

  pub.get("/media/:file", async (c) => {
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

  if (mount === "") {
    app.route("/", pub);
  } else {
    app.get("/", (c) => c.redirect(mount + "/"));
    app.route(mount, pub);
  }

  return app;
}

const apps = new Map<string, ReturnType<typeof makeApp>>();

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const mount = normalizeMount(env.MOUNT);
    let app = apps.get(mount);
    if (!app) {
      app = makeApp(mount);
      apps.set(mount, app);
    }
    return app.fetch(req, env, ctx);
  },
  // Cron trigger (§4.2): poll every due subscription. Due-selection + backoff
  // logic lives in importer/schedule.ts, fake-clock testable in isolation.
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledPoll(env.DB));
  },
};
