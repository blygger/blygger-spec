// Public server-rendered pages — v0.1-plan §3.4, wireframes §4.

import { excerpt, renderMarkdown } from "./markdown.ts";
import { listMediaForItem, listVersions, publishedVersion } from "./model.ts";
import type { ItemRow, MediaRow, Settings } from "./types.ts";
import { escapeHtml, relativeTime } from "./util.ts";

export const STYLE_CSS = `/* ygg v0.1 — one minimal stylesheet, no build step */
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.55;
  max-width: 65ch;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}
header.site { margin-bottom: 1rem; }
header.site h1 { font-size: 1.4rem; margin: 0; display: inline; }
header.site .rss { float: right; font-size: 0.9rem; }
header.site .bio { margin: 0.25rem 0 0; opacity: 0.8; font-size: 0.95rem; }
header.site .links { font-size: 0.9rem; margin: 0.25rem 0 0; }
header.site .links a { margin-right: 0.75rem; }
article.fragment { border-top: 1px solid rgba(128,128,128,0.35); padding: 1rem 0; }
article.fragment img { max-width: 100%; height: auto; }
article.fragment p:first-child { margin-top: 0; }
.byline { font-size: 0.85rem; opacity: 0.7; margin-top: 0.5rem; }
.byline a { text-decoration: none; }
.tombstone { opacity: 0.7; font-style: italic; }
ul.archive { list-style: none; padding: 0; }
ul.archive li { padding: 0.3rem 0; border-top: 1px solid rgba(128,128,128,0.25); }
ul.archive .meta { font-size: 0.85rem; opacity: 0.7; margin-left: 0.5rem; }
footer.older { text-align: center; padding: 1rem 0; }
`;

export function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/ygg/style.css">
<link rel="alternate" type="application/rss+xml" href="/ygg/feed.xml">
</head>
<body>
${body}
</body>
</html>
`;
}

export function siteHeader(settings: Settings): string {
  const links = settings.author_links
    .map((l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`)
    .join("");
  return `<header class="site">
<a class="rss" href="/ygg/feed.xml">RSS ⧉</a>
<h1><a href="/ygg/">${escapeHtml(settings.site_title)}</a></h1>
${settings.author_bio ? `<p class="bio">${escapeHtml(settings.author_bio)}</p>` : ""}
${links ? `<p class="links">${links}</p>` : ""}
</header>`;
}

/** `v3 · edited 2h ago · "note" · ∞` — the only per-fragment metadata surface. */
function byline(item: ItemRow, note: string | null): string {
  const parts = [`v${item.version}`];
  parts.push(item.version > 1 ? `edited ${relativeTime(item.updated)}` : relativeTime(item.updated));
  if (item.version > 1 && note) parts.push(`“${escapeHtml(note)}”`);
  return `<p class="byline">${parts.join(" · ")} · <a href="/ygg/f/${item.id}/" title="permalink">∞</a></p>`;
}

export function renderFragment(item: ItemRow, contentMd: string, media: MediaRow[], note: string | null): string {
  const mediaHtml = media
    .map((m) => `<p><img src="/ygg/${m.r2_key}" alt="${escapeHtml(m.alt ?? "")}" loading="lazy"></p>`)
    .join("\n");
  return `<article class="fragment">
${renderMarkdown(contentMd)}
${mediaHtml}
${byline(item, note)}
</article>`;
}

async function fragmentBlock(db: D1Database, item: ItemRow): Promise<string> {
  const latest = await publishedVersion(db, item);
  const media = await listMediaForItem(db, item.id);
  return renderFragment(item, latest?.content_md ?? "", media, latest?.note ?? null);
}

export async function feedPage(db: D1Database, settings: Settings, items: ItemRow[], hasMore: boolean): Promise<string> {
  const fragments = items.filter((i) => i.kind === "fragment");
  const blocks: string[] = [];
  for (const item of fragments) blocks.push(await fragmentBlock(db, item));
  const body = `${siteHeader(settings)}
${blocks.join("\n") || '<p class="tombstone">Nothing published yet.</p>'}
${hasMore ? '<footer class="older"><a href="/ygg/archive/">older items →</a></footer>' : ""}`;
  return layout(settings.site_title, body);
}

export async function permalinkPage(db: D1Database, settings: Settings, item: ItemRow): Promise<string> {
  if (item.kind === "tombstone") {
    const body = `${siteHeader(settings)}
<article class="fragment tombstone"><p>This item was deleted.</p>
<p class="byline">v${item.version} · ${relativeTime(item.updated)}</p></article>`;
    return layout(`deleted — ${settings.site_title}`, body);
  }
  const body = `${siteHeader(settings)}\n${await fragmentBlock(db, item)}`;
  return layout(settings.site_title, body);
}

export async function archivePage(db: D1Database, settings: Settings, items: ItemRow[]): Promise<string> {
  const rows: string[] = [];
  for (const item of items) {
    if (item.kind === "tombstone") {
      rows.push(`<li class="tombstone">deleted<span class="meta">${item.updated.slice(0, 10)}</span></li>`);
      continue;
    }
    const latest = await publishedVersion(db, item);
    rows.push(
      `<li><a href="/ygg/f/${item.id}/">${escapeHtml(excerpt(latest?.content_md ?? "", 80))}</a><span class="meta">${item.updated.slice(0, 10)} · v${item.version}</span></li>`,
    );
  }
  const body = `${siteHeader(settings)}
<h2>Archive</h2>
<ul class="archive">
${rows.join("\n")}
</ul>`;
  return layout(`archive — ${settings.site_title}`, body);
}
