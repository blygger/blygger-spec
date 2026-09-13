// Public server-rendered pages — v0.1-plan §3.4. Rewired session 4 to the
// rev-2/rev-3 wireframe conventions reviewed with Venkat (docs/wireframes/):
// embeddable `.blyg`-scoped block with a bare Home+RSS header (the public
// page's header is presumed content, not real navigation — unlike studio's),
// Created/Most-recent timestamp lines, a version-nav scrubber, and a plain
// "Permalink" text link (dropping the ∞ glyph). Task 8 originally shipped
// against the rev-1 mockup; this brings it forward together with threads.

import { listBlogrollSubscriptions } from "./importer/store.ts";
import { excerptFromHtml } from "./markdown.ts";
import { authoredKind, getMedia, listMediaForItem, listVersions, publishedVersion } from "./model.ts";
import type { ItemRow, MediaRow, Settings, Transclusion, VersionRow } from "./types.ts";
import { escapeHtml } from "./util.ts";

export const STYLE_CSS = `/* blyg v0.1 — one minimal stylesheet, no build step */
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.55;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}
.blyg { max-width: 65ch; margin: 0 auto; }
.blyg-header { margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: baseline; }
.blyg-header a { color: inherit; text-decoration: none; font-size: 0.95rem; }
.blyg-header a:hover { text-decoration: underline; }
.blyg-header .blyg-name { font-weight: 600; }
.masthead { display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 0.5rem; }
.masthead .avatar { border-radius: 50%; flex: none; object-fit: cover; }
.masthead .masthead-text { min-width: 0; }
.masthead p { margin: 0 0 0.15rem; }
.masthead .author-name { font-weight: 600; }
.masthead .author-bio { font-size: 0.92rem; opacity: 0.8; }
.masthead .author-links { font-size: 0.85rem; }
.masthead .author-links a { color: inherit; text-decoration: none; border-bottom: 1px dotted currentColor; }
article.fragment, article.thread { border-top: 1px solid rgba(128,128,128,0.35); padding: 1rem 0; }
article.fragment img, article.thread img { max-width: 100%; height: auto; }
article.fragment p:first-child, article.thread p:first-child { margin-top: 0; }
.timestamps { font-size: 0.85rem; opacity: 0.7; margin-top: 0.6rem; display: flex; flex-direction: column; gap: 0.1rem; }
.pinned-banner { font-size: 0.85rem; border: 1px solid rgba(128,128,128,0.4); border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 1rem; opacity: 0.85; }
.pinned-banner a { border-bottom: 1px dotted currentColor; text-decoration: none; }
.version-line { margin-top: 0.75rem; font-size: 0.85rem; opacity: 0.75; }
.version-line .pins a { text-decoration: none; border-bottom: 1px dotted currentColor; }
.version-note { font-size: 0.85rem; opacity: 0.75; font-style: italic; margin: 0.3rem 0 0; }
p.permalink, p > a.permalink { margin-top: 0.6rem; }
a.permalink { font-size: 0.85rem; opacity: 0.8; }
.withdrawn { opacity: 0.7; font-style: italic; }
.kind-chip { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; border: 1px solid rgba(128,128,128,0.5); border-radius: 3px; padding: 0.05rem 0.35rem; opacity: 0.75; vertical-align: middle; }
.thread-card p:first-child { margin-bottom: 0.3rem; }
blockquote.blyg-transclusion {
  margin: 1.25rem 0; padding: 0.75rem 1rem;
  border-left: 3px solid rgba(128,128,128,0.55);
  background: rgba(128,128,128,0.08); border-radius: 0 4px 4px 0;
}
blockquote.blyg-transclusion p:first-child { margin-top: 0; }
blockquote.blyg-transclusion p:last-of-type { margin-bottom: 0.25rem; }
.provenance { font-size: 0.78rem; opacity: 0.65; margin: 0.4rem 0 0; }
.provenance a { text-decoration: none; }
ul.archive { list-style: none; padding: 0; }
ul.archive li { padding: 0.3rem 0; border-top: 1px solid rgba(128,128,128,0.25); }
ul.archive .meta { font-size: 0.85rem; opacity: 0.7; margin-left: 0.5rem; }
footer.older { text-align: center; padding: 1rem 0; }
`;

export function layout(title: string, body: string, mount: string, hasBlogroll = false, canonical?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${mount}/style.css">
<link rel="alternate" type="application/rss+xml" href="${mount}/feed.xml">
${canonical ? `<link rel="canonical" href="${canonical}">\n` : ""}${hasBlogroll ? `<link rel="blogroll" href="${mount}/blogroll.opml">\n` : ""}</head>
<body>
${body}
</body>
</html>
`;
}

/**
 * Bare embeddable header (rev-2 review: "embeddable no-navbar public page").
 * Still one line and still no navbar — an embedding host that supplies its own
 * chrome hides it with `.blyg-header { display: none }` exactly as before.
 *
 * The left slot was a hardcoded `Home` → `/`, which session 19 replaced with
 * the blyg's own title → `{mount}/`. Two things were wrong with the old link.
 * On a **root-mounted** node (`MOUNT=""`, which is how blyg.protocol-institute.org
 * runs) `/` *is* this page, so "Home" was a self-link. On a **path-mounted** node
 * `/` is the host site, which meant a reader who landed on a permalink had no
 * link back to the blyg at all — the one destination the page can actually
 * name. A blyg cannot know what lives at `/`; it does know where it itself is.
 *
 * Linking back to the host site is now an author-configured `author_links`
 * entry rendered in the masthead, which is honest: only the author knows
 * whether `/` is their homepage, someone else's site, or nothing.
 */
function pageHeader(settings: Settings, mount: string): string {
  return `<header class="blyg-header">
<a class="blyg-name" href="${mount}/">${escapeHtml(settings.site_title)}</a>
<a href="${mount}/feed.xml" title="RSS feed">RSS ⧉</a>
</header>`;
}

/**
 * Feed-page masthead — avatar, author name, bio, author links.
 *
 * Session 19. This is the one place that departs from the rev-2 note "site
 * identity lives in the manifest, feed channel, and studio settings, not on
 * this page." That note's rationale was embeddability, and it holds for an
 * embedded block: a host page supplies its own identity. But **both live nodes
 * are standalone deployments**, which the same note acknowledged and left
 * unserved — so every identity field the protocol already carries
 * (`title`, `author.name`, `author.bio`, `author.links`, the avatar) was
 * published in `blyg.json` and in the feed channel, and rendered nowhere a
 * human could see it. A reader arriving at the page could not tell whose it was.
 *
 * Scoped to the **feed page only**: that is the front door. Permalink, thread,
 * pinned and archive pages stay lean, so the embeddable-block case is unchanged
 * for every page that is likely to be embedded.
 *
 * Presentation only — reads settings that already exist, writes no new field,
 * and nothing here appears in any wire representation.
 */
async function masthead(db: D1Database, settings: Settings, mount: string): Promise<string> {
  const bits: string[] = [];
  // The avatar's URL is its `r2_key` (`media/{id}.{ext}`), not `media/{id}` —
  // the `/media/:file` route matches on the full key including the extension,
  // so an id alone 404s. Same lookup `mediaHtml` does for item images.
  const avatar = settings.avatar_media_id ? await getMedia(db, settings.avatar_media_id) : null;
  if (avatar) {
    bits.push(`<img class="avatar" src="${mount}/${avatar.r2_key}" alt="" width="48" height="48">`);
  }
  const lines: string[] = [];
  if (settings.author_name) lines.push(`<p class="author-name">${escapeHtml(settings.author_name)}</p>`);
  if (settings.author_bio) lines.push(`<p class="author-bio">${escapeHtml(settings.author_bio)}</p>`);
  if (settings.author_links.length) {
    lines.push(
      `<p class="author-links">${settings.author_links
        .map((l) => `<a href="${escapeHtml(l.url)}" rel="me">${escapeHtml(l.label)}</a>`)
        .join(" &middot; ")}</p>`,
    );
  }
  if (!lines.length && !bits.length) return "";
  bits.push(`<div class="masthead-text">${lines.join("\n")}</div>`);
  return `<div class="masthead">${bits.join("\n")}</div>`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Version line + note + Created/Most-recent lines.
 *
 * This replaces the rev-3 scrubber (`|< < v2 of 2 > >|`, every button
 * hardcoded `disabled`), which promised paging that cannot exist: §2.8's
 * session-5 decision is that **no route ever serves an older version as an
 * HTML page**, so there is nothing for those arrows to navigate to, now or
 * later. §2.8 names the replacement outright — "the public page's version
 * display is an indicator, not navigation ... the right presentation is
 * discrete pin citations (e.g. 'v6 · pinned: v2, v4') linking to the existing
 * v{n}.json files" — because that is what pins are: a sequence of frozen
 * citable artifacts of one identity, not pages of one document.
 *
 * Pins are shown on withdrawn items too. That is the point of a pin: it
 * survives withdrawal of the live stream (§2.8), so the endcap page is
 * exactly where a reader needs to be told what remains citable.
 */
function itemMeta(item: ItemRow, note: string | null, pins: number[], mount: string, isThread: boolean): string {
  const created = formatDate(item.created);
  // Citations link the HTML pages (session-18 route); each page links its
  // JSON twin, so the machine-citable file is one hop away, never hidden.
  // isThread comes from the caller, not item.kind — a withdrawn item's kind
  // is 'withdrawn', but its pinned versions live under their authored route.
  const kindSeg = isThread ? "t" : "f";
  const pinPart = pins.length
    ? ` &middot; <span class="pins">pinned: ${pins
        .map((v) => `<a href="${mount}/${kindSeg}/${item.id}/v${v}/" title="frozen snapshot of v${v}">v${v}</a>`)
        .join(", ")}</span>`
    : "";
  // A single-version item with no pins has no version story worth telling.
  if (item.version <= 1 && !pins.length) {
    return `<p class="timestamps"><span>Created: ${created}</span></p>`;
  }
  const versionLine = `<p class="version-line">v${item.version}${pinPart}</p>`;
  const noteHtml = note ? `<p class="version-note">&ldquo;${escapeHtml(note)}&rdquo;</p>` : "";
  const recent =
    item.version > 1 ? `\n<span>Most recent: ${formatDate(item.updated)}, v${item.version}</span>` : "";
  return `${versionLine}
${noteHtml}
<p class="timestamps">
<span>Created: ${created}</span>${recent}
</p>`;
}

/** Pinned version numbers for an item, ascending — the citations §2.8 says the page should show. */
async function pinnedVersions(db: D1Database, itemId: string): Promise<number[]> {
  return (await listVersions(db, itemId)).filter((v) => v.pinned === 1).map((v) => v.version);
}

function permalinkLink(id: string, isThread: boolean, mount: string): string {
  return `<p><a class="permalink" href="${mount}/${isThread ? "t" : "f"}/${id}/">Permalink</a></p>`;
}

function mediaHtml(media: MediaRow[], mount: string): string {
  return media
    .map((m) => `<p><img src="${mount}/${m.r2_key}" alt="${escapeHtml(m.alt ?? "")}" loading="lazy"></p>`)
    .join("\n");
}

export function renderFragment(item: ItemRow, contentHtml: string, media: MediaRow[], note: string | null, mount: string, pins: number[] = []): string {
  return `<article class="fragment">
${contentHtml}
${mediaHtml(media, mount)}
${itemMeta(item, note, pins, mount, false)}
${permalinkLink(item.id, false, mount)}
</article>`;
}

async function fragmentBlock(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const latest = await publishedVersion(db, item);
  const media = await listMediaForItem(db, item.id);
  return renderFragment(item, latest?.content_html ?? "", media, latest?.note ?? null, mount, await pinnedVersions(db, item.id));
}

/**
 * Inject a small provenance link after each baked transclusion blockquote.
 * Presentation only — this is never stored in the protocol content_html
 * (§2.9 specifies only the blockquote + data attributes as baked content).
 */
export function injectProvenance(html: string, transclusions: Transclusion[], mount: string): string {
  let i = 0;
  return html.replace(
    /(<blockquote class="blyg-transclusion"[^>]*>)([\s\S]*?)(<\/blockquote>)/g,
    (_m, open: string, inner: string, close: string) => {
      const t = transclusions[i++];
      const provenance = t
        ? `<p class="provenance"><a href="${mount}/f/${t.id}/">fragment ↗</a> · snapshot of v${t.version}</p>`
        : "";
      return `${open}${inner}\n${provenance}${close}`;
    },
  );
}

function parseTransclusions(json: string | null | undefined): Transclusion[] {
  if (!json) return [];
  return JSON.parse(json) as Transclusion[];
}

async function threadCard(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const latest = await publishedVersion(db, item);
  const html = latest?.content_html ?? "";
  return `<article class="fragment thread-card">
<p><span class="kind-chip">thread</span> ${escapeHtml(excerptFromHtml(html, 300))}</p>
<p><a href="${mount}/t/${item.id}/">read the thread →</a></p>
${itemMeta(item, latest?.note ?? null, await pinnedVersions(db, item.id), mount, true)}
</article>`;
}

async function threadBlock(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const latest = await publishedVersion(db, item);
  const html = injectProvenance(latest?.content_html ?? "", parseTransclusions(latest?.transclusions), mount);
  const media = await listMediaForItem(db, item.id);
  return `<article class="thread">
${html}
${mediaHtml(media, mount)}
${itemMeta(item, latest?.note ?? null, await pinnedVersions(db, item.id), mount, true)}
${permalinkLink(item.id, true, mount)}
</article>`;
}

async function withdrawnBlock(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const isThread = (await authoredKind(db, item)) === "thread";
  return `<article class="fragment withdrawn"><p>This item was withdrawn.</p>
${itemMeta(item, null, await pinnedVersions(db, item.id), mount, isThread)}
</article>`;
}

export async function feedPage(db: D1Database, settings: Settings, items: ItemRow[], hasMore: boolean, mount: string): Promise<string> {
  const blocks: string[] = [];
  for (const item of items) {
    // Withdrawn items don't appear on the feed page (rev-3 wireframe note) —
    // they still live in the archive listing and their permanent endcap URLs.
    if (item.kind === "fragment") blocks.push(await fragmentBlock(db, item, mount));
    else if (item.kind === "thread") blocks.push(await threadCard(db, item, mount));
  }
  const body = `<div class="blyg">
${pageHeader(settings, mount)}
${await masthead(db, settings, mount)}
${blocks.join("\n") || '<p class="withdrawn">Nothing published yet.</p>'}
${hasMore ? `<footer class="older"><a href="${mount}/archive/">older items →</a></footer>` : ""}
</div>`;
  // §2.2: publishers SHOULD emit rel="blogroll" on the HTML feed page when the blogroll is non-empty.
  const hasBlogroll = (await listBlogrollSubscriptions(db)).length > 0;
  return layout(settings.site_title, body, mount, hasBlogroll);
}

/** Fragment permalink page — caller (index.ts) 404s if the item's authored kind isn't fragment. */
export async function permalinkPage(db: D1Database, settings: Settings, item: ItemRow, mount: string): Promise<string> {
  if (item.kind === "withdrawn") {
    return layout(`withdrawn — ${settings.site_title}`, `<div class="blyg">\n${pageHeader(settings, mount)}\n${await withdrawnBlock(db, item, mount)}\n</div>`, mount);
  }
  const body = `<div class="blyg">
${pageHeader(settings, mount)}
${await fragmentBlock(db, item, mount)}
</div>`;
  return layout(settings.site_title, body, mount);
}

/** Thread permalink page (§2.9) — caller (index.ts) 404s if the item's authored kind isn't thread. */
export async function threadPage(db: D1Database, settings: Settings, item: ItemRow, mount: string): Promise<string> {
  if (item.kind === "withdrawn") {
    return layout(`withdrawn — ${settings.site_title}`, `<div class="blyg">\n${pageHeader(settings, mount)}\n${await withdrawnBlock(db, item, mount)}\n</div>`, mount);
  }
  const body = `<div class="blyg">
${pageHeader(settings, mount)}
${await threadBlock(db, item, mount)}
</div>`;
  return layout(settings.site_title, body, mount);
}

/**
 * Pinned-version HTML page — `{mount}/f/{id}/v{n}/`, `{mount}/t/{id}/v{n}/`
 * (session-18 decision, amending §2.8's session-5 "JSON only" via the additive
 * path that decision explicitly reserved; demand demonstrated by Venkat
 * clicking a pin citation and getting raw JSON).
 *
 * The pin's *promise* stays the JSON file — this page is presentation of the
 * same already-promised bytes: the version's stored publish-time content_html,
 * verbatim, never re-rendered. What the page adds is human legibility: a
 * frozen banner (a reader must never mistake a snapshot for the live item), a
 * canonical link to the live permalink (the living page is the one to index),
 * and a pointer to the JSON twin (machine citation ↔ human citation).
 *
 * Deliberately NOT here: feed/archive/index membership (pinning is not a
 * publish event), any new wire vocabulary, any route for unpinned versions
 * (withheld-unless-pinned is what keeps withdrawal meaningful).
 */
export function pinnedVersionPage(
  settings: Settings,
  item: ItemRow,
  row: VersionRow,
  isThread: boolean,
  mount: string,
  origin: string,
): string {
  const live = `${mount}/${isThread ? "t" : "f"}/${item.id}/`;
  const html = isThread
    ? injectProvenance(row.content_html, parseTransclusions(row.transclusions), mount)
    : row.content_html;
  const noteHtml = row.note ? `<p class="version-note">&ldquo;${escapeHtml(row.note)}&rdquo;</p>` : "";
  const body = `<div class="blyg">
${pageHeader(settings, mount)}
<p class="pinned-banner">📌 Pinned v${row.version} — a frozen snapshot from ${formatDate(row.published_at)}.
<a href="${live}">latest version</a> &middot; <a href="${mount}/items/${item.id}/v${row.version}.json">citable JSON</a></p>
<article class="${isThread ? "thread" : "fragment"}">
${html}
${noteHtml}
<p class="timestamps"><span>Published: ${formatDate(row.published_at)}</span></p>
</article>
</div>`;
  // Canonical points at the live permalink (absolute — origin is the blyg
  // base URL, trailing slash included): the frozen page is a version of the
  // same work, and the living one is the page that should be indexed.
  const canonical = `${origin}${isThread ? "t" : "f"}/${item.id}/`;
  return layout(`v${row.version} — ${settings.site_title}`, body, mount, false, canonical);
}

export async function archivePage(db: D1Database, settings: Settings, items: ItemRow[], mount: string): Promise<string> {
  const rows: string[] = [];
  for (const item of items) {
    // A withdrawn row is a link like any other: the endcap page is a real,
    // permanent URL (§2.8) and is where a reader learns which versions stay
    // citable. Its authored kind picks the route — `kind` is 'withdrawn' by
    // then, so it cannot say whether this was a fragment or a thread.
    if (item.kind === "withdrawn") {
      const href = `${mount}/${(await authoredKind(db, item)) === "thread" ? "t" : "f"}/${item.id}/`;
      rows.push(
        `<li class="withdrawn"><a href="${href}">withdrawn</a><span class="meta">${formatDate(item.updated)}</span></li>`,
      );
      continue;
    }
    const isThread = item.kind === "thread";
    const latest = await publishedVersion(db, item);
    const text = excerptFromHtml(latest?.content_html ?? "", 80);
    const href = `${mount}/${isThread ? "t" : "f"}/${item.id}/`;
    rows.push(
      `<li>${isThread ? '<span class="kind-chip">thread</span> ' : ""}<a href="${href}">${escapeHtml(text)}</a><span class="meta">${formatDate(item.updated)} · v${item.version}</span></li>`,
    );
  }
  const body = `<div class="blyg">
${pageHeader(settings, mount)}
<h2>Archive</h2>
<ul class="archive">
${rows.join("\n")}
</ul>
</div>`;
  return layout(`archive — ${settings.site_title}`, body, mount);
}
