// Public server-rendered pages — v0.1-plan §3.4. Rewired session 4 to the
// rev-2/rev-3 wireframe conventions reviewed with Venkat (docs/wireframes/):
// embeddable `.blygg`-scoped block with a bare Home+RSS header (the public
// page's header is presumed content, not real navigation — unlike studio's),
// Created/Most-recent timestamp lines, a version-nav scrubber, and a plain
// "Permalink" text link (dropping the ∞ glyph). Task 8 originally shipped
// against the rev-1 mockup; this brings it forward together with threads.

import { excerptFromHtml } from "./markdown.ts";
import { listMediaForItem, publishedVersion } from "./model.ts";
import type { ItemRow, MediaRow, Settings, Transclusion } from "./types.ts";
import { escapeHtml } from "./util.ts";

export const STYLE_CSS = `/* blygg v0.1 — one minimal stylesheet, no build step */
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.55;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}
.blygg { max-width: 65ch; margin: 0 auto; }
.blygg-header { margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: baseline; }
.blygg-header a { color: inherit; text-decoration: none; font-size: 0.95rem; }
.blygg-header a:hover { text-decoration: underline; }
article.fragment, article.thread { border-top: 1px solid rgba(128,128,128,0.35); padding: 1rem 0; }
article.fragment img, article.thread img { max-width: 100%; height: auto; }
article.fragment p:first-child, article.thread p:first-child { margin-top: 0; }
.timestamps { font-size: 0.85rem; opacity: 0.7; margin-top: 0.6rem; display: flex; flex-direction: column; gap: 0.1rem; }
.version-nav { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; font-size: 0.85rem; }
.version-nav button {
  font: inherit; font-size: 0.8rem; line-height: 1; padding: 0.25rem 0.5rem;
  border: 1px solid rgba(128,128,128,0.4); border-radius: 4px; background: transparent; color: inherit; cursor: pointer;
}
.version-nav button:disabled { opacity: 0.3; cursor: default; }
.version-nav .vn-label { opacity: 0.7; margin: 0 0.25rem; }
.version-note { font-size: 0.85rem; opacity: 0.75; font-style: italic; margin: 0.3rem 0 0; }
p.permalink, p > a.permalink { margin-top: 0.6rem; }
a.permalink { font-size: 0.85rem; opacity: 0.8; }
.withdrawn { opacity: 0.7; font-style: italic; }
.kind-chip { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; border: 1px solid rgba(128,128,128,0.5); border-radius: 3px; padding: 0.05rem 0.35rem; opacity: 0.75; vertical-align: middle; }
.thread-card p:first-child { margin-bottom: 0.3rem; }
blockquote.blygg-transclusion {
  margin: 1.25rem 0; padding: 0.75rem 1rem;
  border-left: 3px solid rgba(128,128,128,0.55);
  background: rgba(128,128,128,0.08); border-radius: 0 4px 4px 0;
}
blockquote.blygg-transclusion p:first-child { margin-top: 0; }
blockquote.blygg-transclusion p:last-of-type { margin-bottom: 0.25rem; }
.provenance { font-size: 0.78rem; opacity: 0.65; margin: 0.4rem 0 0; }
.provenance a { text-decoration: none; }
ul.archive { list-style: none; padding: 0; }
ul.archive li { padding: 0.3rem 0; border-top: 1px solid rgba(128,128,128,0.25); }
ul.archive .meta { font-size: 0.85rem; opacity: 0.7; margin-left: 0.5rem; }
footer.older { text-align: center; padding: 1rem 0; }
`;

export function layout(title: string, body: string, mount: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${mount}/style.css">
<link rel="alternate" type="application/rss+xml" href="${mount}/feed.xml">
</head>
<body>
${body}
</body>
</html>
`;
}

/**
 * Bare embeddable header (rev-2 review: "embeddable no-navbar public page").
 * Deliberately minimal — this is presumed content, not real site navigation;
 * site identity (title/bio/links) lives in the manifest, feed channel, and
 * studio settings, not on this page. "Home" is a placeholder link for the
 * standalone deployment; an embedding host page supplies its own.
 */
function pageHeader(mount: string): string {
  return `<header class="blygg-header">
<a href="/">Home</a>
<a href="${mount}/feed.xml" title="RSS feed">RSS ⧉</a>
</header>`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Version-nav + note + Created/Most-recent lines (rev-2/3 convention).
 * v0.1 gap flagged in DEVLOG session 4: only the latest version is ever
 * fetchable as HTML (older content is withheld per §2.3 unless pinned, and
 * pinned versions are JSON-only per §2.8) — there is no route to browse to
 * a prior version's HTML, so the scrubber is display-only here.
 */
function itemMeta(item: ItemRow, note: string | null): string {
  const created = formatDate(item.created);
  if (item.version <= 1) {
    return `<p class="timestamps"><span>Created: ${created}</span></p>`;
  }
  const nav = `<div class="version-nav">
<button title="first version" disabled>|&lt;</button>
<button title="previous version" disabled>&lt;</button>
<span class="vn-label">v${item.version} of ${item.version}</span>
<button title="next version" disabled>&gt;</button>
<button title="latest version" disabled>&gt;|</button>
</div>`;
  const noteHtml = note ? `<p class="version-note">&ldquo;${escapeHtml(note)}&rdquo;</p>` : "";
  return `${nav}
${noteHtml}
<p class="timestamps">
<span>Created: ${created}</span>
<span>Most recent: ${formatDate(item.updated)}, v${item.version}</span>
</p>`;
}

function permalinkLink(id: string, isThread: boolean, mount: string): string {
  return `<p><a class="permalink" href="${mount}/${isThread ? "t" : "f"}/${id}/">Permalink</a></p>`;
}

function mediaHtml(media: MediaRow[], mount: string): string {
  return media
    .map((m) => `<p><img src="${mount}/${m.r2_key}" alt="${escapeHtml(m.alt ?? "")}" loading="lazy"></p>`)
    .join("\n");
}

export function renderFragment(item: ItemRow, contentHtml: string, media: MediaRow[], note: string | null, mount: string): string {
  return `<article class="fragment">
${contentHtml}
${mediaHtml(media, mount)}
${itemMeta(item, note)}
${permalinkLink(item.id, false, mount)}
</article>`;
}

async function fragmentBlock(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const latest = await publishedVersion(db, item);
  const media = await listMediaForItem(db, item.id);
  return renderFragment(item, latest?.content_html ?? "", media, latest?.note ?? null, mount);
}

/**
 * Inject a small provenance link after each baked transclusion blockquote.
 * Presentation only — this is never stored in the protocol content_html
 * (§2.9 specifies only the blockquote + data attributes as baked content).
 */
export function injectProvenance(html: string, transclusions: Transclusion[], mount: string): string {
  let i = 0;
  return html.replace(
    /(<blockquote class="blygg-transclusion"[^>]*>)([\s\S]*?)(<\/blockquote>)/g,
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
${itemMeta(item, latest?.note ?? null)}
</article>`;
}

async function threadBlock(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const latest = await publishedVersion(db, item);
  const html = injectProvenance(latest?.content_html ?? "", parseTransclusions(latest?.transclusions), mount);
  const media = await listMediaForItem(db, item.id);
  return `<article class="thread">
${html}
${mediaHtml(media, mount)}
${itemMeta(item, latest?.note ?? null)}
${permalinkLink(item.id, true, mount)}
</article>`;
}

function withdrawnBlock(item: ItemRow): string {
  return `<article class="fragment withdrawn"><p>This item was withdrawn.</p>
${itemMeta(item, null)}
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
  const body = `<div class="blygg">
${pageHeader(mount)}
${blocks.join("\n") || '<p class="withdrawn">Nothing published yet.</p>'}
${hasMore ? `<footer class="older"><a href="${mount}/archive/">older items →</a></footer>` : ""}
</div>`;
  return layout(settings.site_title, body, mount);
}

/** Fragment permalink page — caller (index.ts) 404s if the item's authored kind isn't fragment. */
export async function permalinkPage(db: D1Database, settings: Settings, item: ItemRow, mount: string): Promise<string> {
  if (item.kind === "withdrawn") {
    return layout(`withdrawn — ${settings.site_title}`, `<div class="blygg">\n${pageHeader(mount)}\n${withdrawnBlock(item)}\n</div>`, mount);
  }
  const body = `<div class="blygg">
${pageHeader(mount)}
${await fragmentBlock(db, item, mount)}
</div>`;
  return layout(settings.site_title, body, mount);
}

/** Thread permalink page (§2.9) — caller (index.ts) 404s if the item's authored kind isn't thread. */
export async function threadPage(db: D1Database, settings: Settings, item: ItemRow, mount: string): Promise<string> {
  if (item.kind === "withdrawn") {
    return layout(`withdrawn — ${settings.site_title}`, `<div class="blygg">\n${pageHeader(mount)}\n${withdrawnBlock(item)}\n</div>`, mount);
  }
  const body = `<div class="blygg">
${pageHeader(mount)}
${await threadBlock(db, item, mount)}
</div>`;
  return layout(settings.site_title, body, mount);
}

export async function archivePage(db: D1Database, settings: Settings, items: ItemRow[], mount: string): Promise<string> {
  const rows: string[] = [];
  for (const item of items) {
    if (item.kind === "withdrawn") {
      rows.push(`<li class="withdrawn">withdrawn<span class="meta">${item.updated.slice(0, 10)}</span></li>`);
      continue;
    }
    const isThread = item.kind === "thread";
    const latest = await publishedVersion(db, item);
    const text = excerptFromHtml(latest?.content_html ?? "", 80);
    const href = `${mount}/${isThread ? "t" : "f"}/${item.id}/`;
    rows.push(
      `<li>${isThread ? '<span class="kind-chip">thread</span> ' : ""}<a href="${href}">${escapeHtml(text)}</a><span class="meta">${item.updated.slice(0, 10)} · v${item.version}</span></li>`,
    );
  }
  const body = `<div class="blygg">
${pageHeader(mount)}
<h2>Archive</h2>
<ul class="archive">
${rows.join("\n")}
</ul>
</div>`;
  return layout(`archive — ${settings.site_title}`, body, mount);
}
