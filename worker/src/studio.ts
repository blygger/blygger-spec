// Studio: owner-only composer, item list, fragment/thread editors, settings
// — v0.1-plan task 9 (fragments) + task 15 (threads), built against the
// rev-3 wireframes reviewed with Venkat (docs/wireframes/studio.html,
// edit.html, thread-edit.html). Server-rendered HTML + vanilla JS calling the
// existing /api/* JSON endpoints; no client-side framework (CLAUDE.md stack
// conventions). Studio-only routes here (preview, fragment search) are
// authoring-tool internals, not protocol surfaces — the studio/page split
// means this side is unconstrained.

import { Hono } from "hono";
import { checkPassword, clearSessionCookie, issueSessionCookie, verifySession } from "./auth.ts";
import { plainTextFromHtml, renderMarkdown } from "./markdown.ts";
import { authoredKind, getItem, getSettings, getVersion, listAll, listMediaForItem, listVersions, publishedVersion } from "./model.ts";
import { clampText, previewFromHtml, stripTransclusionQuotes, type HtmlPreview } from "./preview.ts";
import { annotateGenerated, applyGeneratedWrappers, parseScopes, previewStrip, type TkScope } from "./tk.ts";
import { extractDirectives, previewTransclusions } from "./transclusion.ts";
import type { Env, ItemRow, Transclusion, VersionRow } from "./types.ts";
import { FRAGMENT_MAX_CHARS } from "./types.ts";
import { escapeHtml, normalizeMount, studioPath } from "./util.ts";
import { getImportedItem, getSubscription } from "./importer/store.ts";
import { sourceTitleAndUrl } from "./importer/util.ts";

/**
 * Studio-only scope summary for the Generate/Regenerate panel (task 6) — not
 * a protocol surface. `output` is truncated for display only.
 */
function scopeSummaries(scopes: TkScope[]): { index: number; instruction: string; output: string | null; hasOutput: boolean; block: boolean }[] {
  return scopes.map((s, index) => ({
    index,
    instruction: s.instruction,
    output: s.output === null ? null : excerptOf(s.output, 60),
    hasOutput: s.output !== null,
    block: s.block,
  }));
}

/**
 * Studio preview rendering shared by /preview and /preview-thread: strips TK
 * scopes (tolerantly — previewStrip never throws), highlights every resolved
 * scope regardless of real provenance (an authoring aid, not the wire's
 * disclosure rule — see model.ts publish() for the provenance-gated version),
 * and lets the caller render the remaining markdown (plain, or via
 * previewTransclusions for threads).
 */
function annotateTkPreview(contentMd: string): { scopes: TkScope[]; text: string; finish: (renderedHtml: string) => string } {
  const { scopes } = parseScopes(contentMd);
  const { text, spans } = previewStrip(contentMd, scopes);
  const annotated = annotateGenerated(text, spans, spans.map(() => true));
  return { scopes, text: annotated.text, finish: (renderedHtml) => applyGeneratedWrappers(renderedHtml, annotated) };
}

export const STUDIO_STYLE = `
/* Design tokens — the same palette the public pages use (see STYLE_CSS in
 * pages.ts), so the studio and the thing it publishes read as one product.
 * The studio deliberately keeps its own *type*: it is a dense working tool,
 * not a reading surface, so it stays sans and compact where the public pages
 * are serif and airy. Only the colours are shared.
 *
 * Every studio page gets this block via studioLayout(); the importer's
 * section styles (subs/reading/hoppers) are appended inside the body and
 * inherit these variables rather than restating literals, which is what the
 * scattered rgba(128,128,128,…)/#c00 values used to be. */
:root {
  color-scheme: light dark;
  --paper: #fafbfb;
  --paper-sunk: #eef1f3;
  --ink: #1b2426;
  --ink-soft: #5c686b;
  --rule: #dde3e5;
  --rule-strong: #c3cdd0;
  --pencil: #23608c;
  /* State colours. These were var(--alert) and var(--ok) — fine on white, barely legible
     on a dark background, which is where a dark-mode studio actually lives. */
  --alert: #b3261e;
  --alert-wash: rgba(179,38,30,0.08);
  --ok: #1c7a52;
  --warn: #a35a00;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #14191a;
    --paper-sunk: #1d2426;
    --ink: #e3e7e7;
    --ink-soft: #95a2a5;
    --rule: #2b3436;
    --rule-strong: #3d494c;
    --pencil: #8cc0e4;
    --alert: #f0a19a;
    --alert-wash: rgba(240,161,154,0.12);
    --ok: #74c79c;
    --warn: #e0a75c;
  }
}

* { box-sizing: border-box; }
/* Reserve the scrollbar track always: without it, a short page (settings) and
   a long one (reading) render at different widths and the whole layout jumps
   sideways on navigation. */
html { scrollbar-gutter: stable; }
body {
  background: var(--paper);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.55;
  /* One width for every studio page — see studioLayout(). */
  max-width: 100ch;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}
/* The studio never set a link colour, so every link fell back to the browser's
 * default blue-then-purple — including the six nav tabs, which are chrome
 * rather than content and should not read as six visited links. */
a { color: var(--pencil); }
a:focus-visible, button:focus-visible, textarea:focus-visible, input:focus-visible {
  outline: 2px solid var(--pencil); outline-offset: 2px; border-radius: 2px;
}
/* Readable measure for text-heavy sections, without shrinking the page frame. */
.prose { max-width: 68ch; }
header.studio { margin-bottom: 1.25rem; border-bottom: 1px solid var(--rule); }
header.studio .studio-title { display: flex; align-items: baseline; min-height: 1.9rem; }
header.studio h1 { font-size: 1.2rem; margin: 0; }
header.studio nav {
  display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap;
  /* Fixed row height so a wrapping or longer title never shifts the links. */
  min-height: 2.4rem; font-size: 0.9rem;
}
header.studio nav .nav-spacer { flex: 1; }
header.studio nav form { display: inline; margin: 0; }
header.studio nav a { color: var(--ink-soft); text-decoration: none; padding-bottom: 0.15rem; border-bottom: 2px solid transparent; }
header.studio nav a:hover { color: var(--ink); border-bottom-color: var(--rule-strong); }
header.studio nav a.current { color: var(--ink); font-weight: 600; border-bottom-color: var(--pencil); }
button.link { background: none; border: none; padding: 0; font: inherit; color: inherit; text-decoration: underline; cursor: pointer; }
.composer { border: 1px solid var(--rule); border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem; }
.composer textarea { width: 100%; min-height: 5.5rem; border: none; resize: vertical; font: inherit; background: transparent; outline: none; }
.composer .bar { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.85rem; flex-wrap: wrap; gap: 0.5rem; }
.count { opacity: 0.6; }
.count.over { color: var(--alert); opacity: 1; }
.new-thread-line { font-size: 0.85rem; margin: -0.5rem 0 1.5rem; }
.compose-help { font-size: 0.8rem; opacity: 0.65; margin: 0 0 0.5rem; }
.compose-help code { font-size: 0.95em; }
button, .composer button, .item-row button, .bar button { font: inherit; font-size: 0.85rem; padding: 0.25rem 0.7rem; border-radius: 4px; border: 1px solid var(--rule-strong); background: transparent; color: inherit; cursor: pointer; }
button.primary { border-color: currentColor; font-weight: 600; }
button.danger { color: var(--alert); border-color: var(--alert); }
.item-row { border-top: 1px solid var(--rule); border-left: 3px solid transparent; padding: 0.75rem 0.5rem 0.75rem 0.6rem; margin-left: -0.6rem; }
.item-row .state { font-size: 0.8rem; margin-right: 0.4rem; }
.item-row .state.pub { color: var(--ok); }
.item-row .state.draft { opacity: 0.5; }
.item-row .excerpt { margin: 0 0 0.3rem; }
.item-row .excerpt.has-title { margin-bottom: 0.1rem; }
.item-row .excerpt-title { font-weight: 600; }
.item-row .excerpt-body { margin: 0 0 0.3rem; opacity: 0.8; font-size: 0.95rem; }
.tc-chip { font-size: 0.72rem; border: 1px solid var(--rule-strong); border-radius: 3px; padding: 0.02rem 0.28rem; margin-right: 0.35rem; opacity: 0.75; }
.item-row .timestamps { font-size: 0.8rem; opacity: 0.7; margin: 0.4rem 0; display: flex; flex-direction: column; gap: 0.1rem; }
.item-row .version-summary { font-size: 0.8rem; opacity: 0.75; margin: 0.3rem 0 0; }
.item-row .pin-chips a { text-decoration: none; border-bottom: 1px dotted currentColor; }
.item-row .version-note { font-size: 0.85rem; opacity: 0.75; font-style: italic; margin: 0.3rem 0 0; }
.item-row .actions { display: flex; gap: 0.4rem; align-items: center; margin-top: 0.5rem; flex-wrap: wrap; }
.item-row.dirty { border-left-color: var(--alert); background: var(--alert-wash); }
.unpublished-flag {
  display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.02em;
  color: var(--alert); background: var(--alert-wash); border: 1px solid var(--alert);
  border-radius: 3px; padding: 0.1rem 0.4rem; margin-left: 0.5rem; vertical-align: middle;
}
.item-row.dirty .timestamps .draft-line { color: var(--alert); opacity: 1; font-weight: 600; }
.withdrawn-row { opacity: 0.55; font-style: italic; }
.kind-chip { font-size: 0.8rem; font-style: italic; color: var(--pencil); margin-right: 0.35rem; }
.split, .panes { display: flex; gap: 1.25rem; align-items: stretch; }
.pane { flex: 1; border: 1px solid var(--rule); border-radius: 6px; padding: 0.75rem; min-height: 20rem; }
.pane h2 { font-size: 0.8rem; font-weight: 600; color: var(--ink-soft); margin: 0 0 0.5rem; }
.pane textarea { width: 100%; height: 18rem; border: none; resize: vertical; font: inherit; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9rem; line-height: 1.5; background: transparent; outline: none; }
@media (max-width: 800px) { .split, .panes { flex-direction: column; } }
.preview img { max-width: 100%; }
.preview blockquote.blyg-transclusion { margin: 1rem 0; padding: 0.6rem 0.8rem; border-left: 3px solid var(--rule-strong); background: var(--paper-sunk); border-radius: 0 4px 4px 0; font-size: 0.92rem; }
.preview blockquote.blyg-transclusion p { margin: 0 0 0.25rem; }
.preview .provenance { font-size: 0.75rem; opacity: 0.65; }
.preview .unresolved { border-left-color: var(--alert); background: var(--alert-wash); color: var(--alert); font-style: italic; }
.edit-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; flex-wrap: wrap; gap: 0.5rem; }
input.note { font: inherit; font-size: 0.9rem; padding: 0.3rem 0.5rem; border-radius: 4px; border: 1px solid var(--rule-strong); background: transparent; color: inherit; width: 22rem; max-width: 100%; }
.history { margin-top: 1.5rem; font-size: 0.85rem; }
.history h2 { font-size: 0.8rem; font-weight: 600; color: var(--ink-soft); }
.history .h-hint { text-transform: none; letter-spacing: 0; font-weight: 400; opacity: 0.7; }
.history .h-list { list-style: none; padding: 0; margin: 0; }
.h-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding: 0.35rem 0; border-top: 1px solid var(--rule); }
.h-row.selected { background: var(--paper-sunk); }
.h-select { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; min-width: 3.2rem; }
.h-select:disabled { opacity: 0.4; cursor: default; }
.h-when { opacity: 0.7; }
.h-note { font-style: italic; opacity: 0.8; }
.h-badge { font-size: 0.75rem; color: var(--ink-soft); border: 1px solid var(--rule); border-radius: 3px; padding: 0.02rem 0.3rem; }
.h-badge.current { border-color: var(--ok); color: var(--ok); }
.h-badge.pinned { text-decoration: none; }
.h-actions { margin-left: auto; display: flex; gap: 0.35rem; }
.h-viewer { margin-top: 0.75rem; border: 1px solid var(--rule); border-radius: 6px; padding: 0.75rem; }
.h-viewer-bar { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; font-size: 0.8rem; }
.h-viewer-body { font-size: 0.95rem; max-height: 26rem; overflow-y: auto; }
.h-viewer-body img { max-width: 100%; }
.h-viewer-body blockquote.blyg-transclusion { margin: 1rem 0; padding: 0.6rem 0.8rem; border-left: 3px solid var(--rule-strong); background: var(--paper-sunk); border-radius: 0 4px 4px 0; font-size: 0.92rem; }
.error-banner { border: 1px solid var(--alert); background: var(--alert-wash); color: var(--alert); border-radius: 4px; padding: 0.5rem 0.75rem; font-size: 0.85rem; margin-bottom: 0.75rem; }
.error-banner code { color: inherit; }
.note-row { margin-top: 0.75rem; font-size: 0.85rem; display: flex; gap: 0.5rem; align-items: center; }
.note-row input { flex: 1; }
.palette { position: absolute; border: 1px solid var(--rule-strong); border-radius: 6px; padding: 0.5rem; background: Canvas; max-width: 60ch; box-shadow: 0 4px 14px rgba(0,0,0,0.15); z-index: 10; }
.palette .search { width: 100%; font: inherit; padding: 0.3rem 0.5rem; border: 1px solid var(--rule); border-radius: 4px; background: transparent; color: inherit; }
.palette ul { list-style: none; margin: 0.5rem 0 0; padding: 0; font-size: 0.9rem; max-height: 14rem; overflow-y: auto; }
.palette li { padding: 0.35rem 0.5rem; border-top: 1px solid var(--rule); cursor: pointer; }
.palette li.sel { background: var(--paper-sunk); border-radius: 4px; }
.palette .meta { font-size: 0.78rem; opacity: 0.6; margin-left: 0.5rem; }
.settings-form label { display: block; margin: 0.75rem 0 0.25rem; font-size: 0.85rem; opacity: 0.8; }
.settings-form input, .settings-form textarea { width: 100%; font: inherit; padding: 0.4rem 0.5rem; border-radius: 4px; border: 1px solid var(--rule-strong); background: transparent; color: inherit; }
.tk-panel { margin-top: 1rem; border: 1px solid var(--rule); border-radius: 6px; padding: 0.75rem; }
.tk-panel h2 { font-size: 0.8rem; font-weight: 600; color: var(--ink-soft); margin: 0 0 0.5rem; }
.tk-panel ul { list-style: none; margin: 0; padding: 0; }
.tk-scope-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0; border-top: 1px solid var(--rule); font-size: 0.88rem; }
.tk-scope-row:first-child { border-top: none; }
.tk-instruction { flex: 1; opacity: 0.85; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-pending { font-size: 0.75rem; opacity: 0.65; font-style: italic; }
.tk-empty { opacity: 0.6; font-size: 0.88rem; font-style: italic; }
/* Studio-only visibility for the wire's disclosure class — the public page defaults to invisible (decision record). */
.preview .blyg-tk-gen { background: rgba(90,140,255,0.12); border-radius: 3px; box-shadow: 0 0 0 2px rgba(90,140,255,0.12); }
.preview div.blyg-tk-gen { padding: 0.1rem 0.4rem; }
.preview span.blyg-tk-gen { padding: 0.03rem 0.15rem; }
`;

/**
 * `wide` is retained as a no-op parameter: every studio page now renders at
 * one width so the chrome never moves between tabs. Text-heavy sections keep
 * a readable measure via `.prose` instead of by shrinking the whole page.
 */
export function studioLayout(title: string, body: string, _wide = false): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STUDIO_STYLE}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

/** Nav sections, in order. `compose` is the studio index — the way back from every other tab. */
const NAV: { key: StudioSection; label: string; path: (mount: string) => string }[] = [
  { key: "compose", label: "compose", path: (m) => studioPath(m) },
  { key: "subs", label: "subscriptions", path: (m) => `${studioPath(m)}/subs` },
  { key: "reading", label: "reading", path: (m) => `${studioPath(m)}/reading` },
  { key: "hoppers", label: "hoppers", path: (m) => `${studioPath(m)}/hoppers` },
  { key: "settings", label: "settings", path: (m) => `${studioPath(m)}/settings` },
  { key: "syntax", label: "syntax", path: (m) => `${studioPath(m)}/syntax` },
];

export type StudioSection = "compose" | "subs" | "reading" | "hoppers" | "settings" | "syntax" | null;

/**
 * Studio chrome. The nav sits on its own row at a fixed height and every page
 * renders at one width (see STUDIO_STYLE), so the links stay in exactly the
 * same place as you move between tabs — previously the title row and nav
 * shared a line, and pages alternated between a 65ch and a 110ch body, so
 * every navigation shifted the links sideways.
 *
 * `current` marks the active section; editor pages pass null (they are reached
 * from compose, and highlighting "compose" there would be a lie).
 */
export function studioHeader(title: string, mount: string, current: StudioSection = null): string {
  const links = NAV.map(
    (n) =>
      `<a href="${n.path(mount)}"${n.key === current ? ' class="current" aria-current="page"' : ""}>${n.label}</a>`,
  ).join("\n");
  return `<header class="studio">
<div class="studio-title"><h1>${escapeHtml(title)}</h1></div>
<nav>
${links}
<span class="nav-spacer"></span>
<a href="${mount}/" target="_blank">public page ↗</a>
<form method="post" action="${studioPath(mount)}/logout"><button type="submit" class="link">log out</button></form>
</nav>
</header>`;
}

function loginPage(mount: string, error?: string): string {
  return studioLayout(
    "blyg studio — login",
    `<h1>blyg studio</h1>
${error ? `<p style="color:var(--alert)">${escapeHtml(error)}</p>` : ""}
<form method="post" action="${studioPath(mount)}/login">
<p><input type="password" name="password" placeholder="password" autofocus required></p>
<p><button type="submit">log in</button></p>
</form>`,
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Truthful version summary for an index row. Replaces the five permanently
 * `disabled` arrow buttons that used to sit here: they implied version
 * navigation the studio never had, and always read "vN of N". Browsing and
 * restoring live in the editor's history panel; the index only states what
 * is true — how many versions exist, and which are publicly pinned.
 */
function versionSummary(item: ItemRow, versions: VersionRow[], mount: string, isThread: boolean): string {
  // Pin chips link the rendered frozen pages (session-18 route), not the raw
  // JSON — clicking a pin should read as a page; the page links its JSON twin.
  const pins = versions.filter((v) => v.pinned === 1).map((v) => v.version);
  const pinLinks = pins
    .map(
      (v) =>
        `<a href="${mount}/${isThread ? "t" : "f"}/${item.id}/v${v}/" target="_blank" title="frozen snapshot of v${v}">v${v}</a>`,
    )
    .join(", ");
  const pinPart = pins.length ? ` &middot; <span class="pin-chips">📌 ${pinLinks}</span>` : "";
  return `<p class="version-summary"><a href="${studioPath(mount)}/edit/${item.id}#history">${item.version} version${item.version === 1 ? "" : "s"}</a>${pinPart}</p>`;
}

/**
 * Title + one-line body for an index row, always derived from rendered HTML
 * (see preview.ts). Published items reuse the stored `content_html`;
 * unpublished working copies are rendered on the fly through the same
 * pipeline the editor preview uses, with TK scopes reduced to their output
 * (or an "ungenerated" marker) so raw `[TK]` never reaches the index.
 */
function rowPreview(item: ItemRow, latest: VersionRow | null): HtmlPreview & { transclusions: number } {
  const publishedClean = item.dirty === 0 && latest?.content_html;
  if (publishedClean) {
    const transclusions = (JSON.parse(latest.transclusions ?? "[]") as Transclusion[]).length;
    const html = transclusions ? stripTransclusionQuotes(latest.content_html) : latest.content_html;
    return { ...previewFromHtml(html), transclusions };
  }
  // Draft or unpublished-changes: no rendered HTML exists yet.
  const { count, withoutDirectives } = extractDirectives(item.content_md);
  const tk = previewStrip(withoutDirectives, parseScopes(withoutDirectives).scopes);
  return { ...previewFromHtml(renderMarkdown(tk.text)), transclusions: count };
}

/** `● thread ⧉2  Title / body…` — chips, then optional title line, then the body excerpt. */
function excerptBlock(
  stateDot: string,
  chip: string,
  preview: HtmlPreview & { transclusions: number },
  suffix = "",
): string {
  const tc = preview.transclusions
    ? `<span class="tc-chip" title="transcludes ${preview.transclusions} fragment${preview.transclusions === 1 ? "" : "s"}">⧉${preview.transclusions}</span>`
    : "";
  const head = `${stateDot}${chip}${tc}`;
  const body = escapeHtml(preview.body) || "<em>(empty)</em>";
  if (preview.title) {
    return `<p class="excerpt has-title">${head}<span class="excerpt-title">${escapeHtml(preview.title)}</span>${suffix}</p>
<p class="excerpt-body">${body}</p>`;
  }
  return `<p class="excerpt">${head}${body}${suffix}</p>`;
}

/**
 * Version history panel, shared by the fragment and thread editors. Replaces
 * the old flat "changelog" list: every version is selectable and renders into
 * a read-only pane, since the full text of every version has always been
 * retained (`versions.content_html`) but was previously unreachable from the
 * UI. Pinned versions additionally link to their permanent public file.
 *
 * "restore" writes the version back into the working copy and is labelled
 * with the version it would publish as — the forward-only semantics of
 * model.restoreVersion() made visible rather than implied.
 */
function historyPanel(item: ItemRow, versions: VersionRow[], mount: string): string {
  if (!versions.length) return `<div class="history" id="history"><h2>history</h2><p>Not yet published.</p></div>`;
  const rows = versions
    .slice()
    .reverse()
    .map((v) => {
      const isEndcap = !v.content_md;
      const note = v.note ? `<span class="h-note">&ldquo;${escapeHtml(v.note)}&rdquo;</span>` : "";
      const badges = [
        v.version === item.version ? '<span class="h-badge current">current</span>' : "",
        v.pinned === 1
          ? `<a class="h-badge pinned" href="${mount}/${v.transclusions !== null ? "t" : "f"}/${item.id}/v${v.version}/" target="_blank" title="frozen snapshot page">📌 pinned</a>`
          : "",
        isEndcap ? '<span class="h-badge endcap">withdrawal</span>' : "",
      ]
        .filter(Boolean)
        .join(" ");
      const actions = isEndcap
        ? ""
        : `${v.pinned === 1 ? "" : `<button type="button" data-action="pin" data-id="${item.id}" data-version="${v.version}">pin&hellip;</button>`}
<button type="button" data-action="restore" data-id="${item.id}" data-version="${v.version}" data-next="${item.version + 1}">restore&hellip;</button>`;
      return `<li class="h-row" data-version="${v.version}">
<button type="button" class="h-select" data-action="view-version" data-id="${item.id}" data-version="${v.version}"${isEndcap ? " disabled" : ""}>v${v.version}</button>
<span class="h-when">${formatDate(v.published_at)}</span>
${badges}
${note}
<span class="h-actions">${actions}</span>
</li>`;
    })
    .join("\n");
  return `<div class="history" id="history">
<h2>history <span class="h-hint">— ${versions.length} version${versions.length === 1 ? "" : "s"}; click one to read it</span></h2>
<ul class="h-list">${rows}</ul>
<div class="h-viewer" id="h-viewer" hidden>
  <div class="h-viewer-bar"><strong id="h-viewer-label"></strong> <button type="button" class="link" id="h-viewer-close">close</button></div>
  <div class="h-viewer-body" id="h-viewer-body"></div>
</div>
</div>`;
}

async function itemRow(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const id = item.id;
  if (item.status === "withdrawn") {
    const versions = await listVersions(db, id);
    const kind = await authoredKind(db, item);
    const chip = kind === "thread" ? '<span class="kind-chip">thread</span>' : "";
    const pinnedNote = versions.some((v) => v.pinned === 1) ? " — a pinned version is still citable" : "";
    return `<div class="item-row withdrawn-row">
<p class="excerpt">${chip}withdrawn item — permanent public endcap; working copy retained, republishable</p>
<p class="timestamps">
<span>Created: ${formatDate(item.created)}</span>
<span>Withdrawn: ${formatDate(item.updated)}, v${item.version}${pinnedNote}</span>
</p>
<div class="actions"><a href="${studioPath(mount)}/edit/${id}"><button type="button">edit</button></a><button type="button" data-action="republish" data-id="${id}">republish</button></div>
</div>`;
  }

  if (item.version === 0) {
    // Never published.
    const kind = item.kind === "thread" ? '<span class="kind-chip">thread</span>' : "";
    return `<div class="item-row">
${excerptBlock('<span class="state draft">○</span>', kind, rowPreview(item, null))}
<p class="timestamps">
<span>Created: ${formatDate(item.created)} — draft, never published</span>
<span>Saved: just now</span>
</p>
<div class="actions"><a href="${studioPath(mount)}/edit/${id}"><button type="button">edit</button></a><button type="button" data-action="publish" data-id="${id}">publish</button><button type="button" data-action="discard" data-id="${id}">discard</button></div>
</div>`;
  }

  const latest = await publishedVersion(db, item);
  const isThread = item.kind === "thread";
  const chip = isThread ? '<span class="kind-chip">thread</span>' : "";
  const preview = rowPreview(item, latest);

  if (item.dirty === 1) {
    return `<div class="item-row dirty">
${excerptBlock('<span class="state pub">●</span>', chip, preview, '<span class="unpublished-flag">unpublished changes</span>')}
<p class="timestamps">
<span>Created: ${formatDate(item.created)}</span>
<span>Most recent published: ${formatDate(item.updated)}, v${item.version}</span>
<span class="draft-line">Draft saved — not yet published</span>
</p>
<div class="actions"><a href="${studioPath(mount)}/edit/${id}"><button type="button">edit</button></a><button type="button" class="primary" data-action="publish" data-id="${id}">publish v${item.version + 1}</button><button type="button" data-action="withdraw" data-id="${id}">withdraw</button></div>
</div>`;
  }

  const note = latest?.note ?? null;
  const noteHtml = item.version > 1 && note ? `<p class="version-note">&ldquo;${escapeHtml(note)}&rdquo;</p>` : "";
  const nav = versionSummary(item, await listVersions(db, id), mount, isThread);
  const mostRecentLine = isThread
    ? `<span>Most recent: ${formatDate(item.updated)}, v${item.version} &mdash; transcludes ${preview.transclusions} fragment${preview.transclusions === 1 ? "" : "s"}</span>`
    : `<span>Most recent: ${formatDate(item.updated)}, v${item.version}</span>`;
  return `<div class="item-row">
${excerptBlock('<span class="state pub">●</span>', chip, preview)}
${nav}
${noteHtml}
<p class="timestamps">
<span>Created: ${formatDate(item.created)}</span>
${mostRecentLine}
</p>
<div class="actions"><a href="${studioPath(mount)}/edit/${id}"><button type="button">edit</button></a><button type="button" data-action="pin" data-id="${id}" data-version="${item.version}">pin v${item.version}&hellip;</button><button type="button" data-action="withdraw" data-id="${id}">withdraw</button></div>
</div>`;
}

export function excerptOf(text: string, n = 80): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= n ? t || "(empty)" : t.slice(0, n).trimEnd() + "…";
}

function actionScript(mount: string): string {
  return `
async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    alert((json && (json.error || (json.errors && json.errors.map(e => e.directive + ": " + e.reason).join("\\n")))) || ("request failed: " + res.status));
    return null;
  }
  return json;
}
/** Renders a publish-error banner for both TransclusionResolveError ({directive,reason}) and TkPublishError ({at,reason}) shapes. */
function renderPublishErrorBanner(slot, data) {
  const items = (data && data.errors) || [];
  if (!items.length) {
    slot.innerHTML = '<div class="error-banner">Cannot publish: ' + ((data && data.error) || "unknown error") + "</div>";
    return;
  }
  slot.innerHTML = '<div class="error-banner">Cannot publish: ' +
    items.map((e) => e.directive
      ? "<code>" + e.directive.replace(/</g, "&lt;") + "</code> does not resolve — " + e.reason
      : "TK scope — " + e.reason
    ).join("<br>") +
    "</div>";
}
/** TK scope panel (task 6) — per-scope Generate/Regenerate list, shared by the fragment and thread editors. */
function renderTkPanel(scopes) {
  const list = document.getElementById("tk-scope-list");
  if (!list) return;
  if (!scopes.length) {
    list.innerHTML = '<li class="tk-empty">No [TK]…[/TK] scopes in this draft.</li>';
    return;
  }
  list.innerHTML = scopes.map((s) => {
    const label = s.hasOutput ? "regenerate" : "generate";
    const state = s.hasOutput ? "" : '<span class="tk-pending">ungenerated</span> ';
    const instr = (s.instruction || "(no instruction)").replace(/</g, "&lt;");
    return '<li class="tk-scope-row"><span class="tk-instruction">' + instr + "</span> " + state +
      '<button type="button" class="tk-generate-btn" data-scope="' + s.index + '">' + label + "</button></li>";
  }).join("");
}
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action, id = btn.dataset.id;
  if (action === "withdraw") {
    if (!confirm("Withdraw this item? This publishes a permanent endcap — reversible by republishing, but the withdrawal itself can't be undone.")) return;
    if (!(await api("POST", "/api/items/" + id + "/withdraw", {}))) return;
  } else if (action === "publish" || action === "republish") {
    if (!(await api("POST", "/api/items/" + id + "/publish", {}))) return;
  } else if (action === "discard") {
    if (!confirm("Discard this draft? It was never published.")) return;
    if (!(await api("DELETE", "/api/items/" + id))) return;
  } else if (action === "pin") {
    const version = Number(btn.dataset.version);
    if (!confirm("Pin v" + version + "? This is irrevocable — it stays fetchable forever, even past withdrawal.")) return;
    if (!(await api("POST", "/api/items/" + id + "/pin", { version }))) return;
  } else if (action === "view-version") {
    // Read-only: loads a past version's stored HTML into the history viewer.
    const version = Number(btn.dataset.version);
    const res = await fetch("${studioPath(mount)}/versions/" + id + "/" + version);
    const data = await res.json().catch(() => null);
    if (!data) { alert("could not load v" + version); return; }
    const viewer = document.getElementById("h-viewer");
    document.getElementById("h-viewer-label").textContent =
      "v" + data.version + " · " + data.published_at + (data.pinned ? " · pinned" : "") + (data.note ? " · “" + data.note + "”" : "");
    document.getElementById("h-viewer-body").innerHTML = data.content_html || "<em>(empty)</em>";
    viewer.hidden = false;
    document.querySelectorAll(".h-row").forEach((r) => r.classList.toggle("selected", Number(r.dataset.version) === version));
    viewer.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return;
  } else if (action === "restore") {
    const version = Number(btn.dataset.version);
    const next = btn.dataset.next;
    if (!confirm(
      "Restore v" + version + " into the working copy?\\n\\n" +
      "Nothing is published yet and no version is rewound — this replaces your current draft, " +
      "which you would then publish as v" + next + "."
    )) return;
    if (!(await api("POST", "/api/items/" + id + "/restore", { version }))) return;
  } else if (action === "new-thread") {
    const created = await api("POST", "/api/items", { content_md: "", kind: "thread" });
    if (created) location.href = "${studioPath(mount)}/edit/" + created.id;
    return;
  } else {
    return;
  }
  location.reload();
});
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "h-viewer-close") {
    document.getElementById("h-viewer").hidden = true;
    document.querySelectorAll(".h-row.selected").forEach((r) => r.classList.remove("selected"));
  }
});
`;
}

function composerScript(mount: string): string {
  return `
const composerText = document.getElementById("composer-text");
const composerCount = document.getElementById("composer-count");
function updateCount() {
  const n = composerText.value.length;
  composerCount.textContent = n + " / ${FRAGMENT_MAX_CHARS}";
  composerCount.classList.toggle("over", n > ${FRAGMENT_MAX_CHARS});
}
composerText.addEventListener("input", updateCount);
// A "respond" prefill arrives in the markup, so seed the counter from it and
// put the caret after the citation line, where the author's own words go.
updateCount();
if (composerText.value) {
  composerText.focus();
  composerText.setSelectionRange(composerText.value.length, composerText.value.length);
}
updateCount();
document.getElementById("save-draft-btn").addEventListener("click", async () => {
  const created = await api("POST", "/api/items", { content_md: composerText.value });
  if (created) location.reload();
});
document.getElementById("publish-btn").addEventListener("click", async () => {
  const created = await api("POST", "/api/items", { content_md: composerText.value });
  if (!created) return;
  // A failed publish still created the draft above. Reloading here used to
  // wipe the composer and drop an unexplained new draft into the list — the
  // text was never lost, but nothing said where it went. Go to that draft's
  // editor instead: it is where the text now lives, and where an unresolved
  // TK scope (the most common cause of this failure) can be generated.
  if (!(await api("POST", "/api/items/" + created.id + "/publish", {}))) {
    location.href = "${studioPath(mount)}/edit/" + created.id;
    return;
  }
  location.reload();
});
document.getElementById("composer-attach").addEventListener("click", async () => {
  const created = await api("POST", "/api/items", { content_md: composerText.value });
  if (created) location.href = "${studioPath(mount)}/edit/" + created.id;
});
// TK scopes need review before publishing (decision #20: generation is an
// explicit, author-reviewed act), and a one-line composer is the wrong place
// to read a paragraph of generated prose — so the composer does not grow a
// generate panel. It offers the door instead, and only when there is a scope.
const composerGenerate = document.getElementById("composer-generate");
function syncGenerateBtn() {
  composerGenerate.hidden = !composerText.value.includes("[TK]");
}
composerText.addEventListener("input", syncGenerateBtn);
syncGenerateBtn();
composerGenerate.addEventListener("click", async () => {
  const created = await api("POST", "/api/items", { content_md: composerText.value });
  if (created) location.href = "${studioPath(mount)}/edit/" + created.id + "#tk";
});
`;
}

export const studio = new Hono<{ Bindings: Env }>({ strict: false });

studio.get("/login", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  if (await verifySession(c.env, c.req.header("cookie"))) return c.redirect(studioPath(mount));
  return c.html(loginPage(mount));
});

studio.post("/login", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const form = await c.req.formData();
  const password = String(form.get("password") ?? "");
  if (!(await checkPassword(c.env, password))) {
    return c.html(loginPage(mount, "Wrong password."), 403);
  }
  c.header("Set-Cookie", await issueSessionCookie(c.env));
  return c.redirect(studioPath(mount));
});

studio.post("/logout", (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  c.header("Set-Cookie", clearSessionCookie());
  return c.redirect(studioPath(mount) + "/login");
});

/**
 * Prefill for the composer when the reading feed sent us here with
 * `?respond=<subId>:<remoteId>`. Decision #12: an imported item is never
 * re-emitted on our feed, so responding produces the author's *own* fragment.
 * The prefill is therefore a citation line and nothing else — a link to the
 * source, a blank line, and an empty stage for the author's words. None of
 * the imported item's text is copied in.
 */
async function respondPrefill(db: D1Database, raw: string | undefined): Promise<string> {
  if (!raw) return "";
  const sep = raw.indexOf(":");
  if (sep < 1) return "";
  const [subId, remoteId] = [raw.slice(0, sep), raw.slice(sep + 1)];
  const sub = await getSubscription(db, subId);
  if (!sub) return "";
  const row = await getImportedItem(db, subId, remoteId);
  if (!row) return "";
  const { title, url } = sourceTitleAndUrl(row, sub.origin);
  const label = title || sub.title || sub.origin;
  return `[${label.replace(/[[\]]/g, "")}](${url})\n\n`;
}

studio.get("/", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const items = await listAll(c.env.DB);
  const rows = await Promise.all(items.map((item) => itemRow(c.env.DB, item, mount)));
  const prefill = await respondPrefill(c.env.DB, c.req.query("respond"));
  const body = `${studioHeader("blyg studio", mount, "compose")}
<div class="composer">
<p class="compose-help">Markdown supported. Write <code>[TK]an instruction[/TK]</code> to mark a scope for AI-drafted text — a <em>generate</em> button appears, which saves and opens the editor. <a href="${studioPath(mount)}/syntax">full syntax reference</a></p>
${prefill ? `<p class="compose-help">Responding to a post in your reading feed — this is your own fragment, citing it. Nothing of theirs is republished.</p>` : ""}
<textarea id="composer-text" placeholder="compose a fragment…">${escapeHtml(prefill)}</textarea>
<div class="bar">
  <span><button type="button" id="composer-attach">attach image</button> <button type="button" id="composer-generate" hidden>generate in editor →</button></span>
  <span class="count" id="composer-count">0 / ${FRAGMENT_MAX_CHARS}</span>
  <span><button type="button" id="save-draft-btn">save draft</button> <button type="button" class="primary" id="publish-btn">publish</button></span>
</div>
</div>
<p class="new-thread-line"><button type="button" class="link" data-action="new-thread">+ new thread</button> <span style="opacity:0.6;">— long-form, opens the thread editor</span></p>
${rows.join("\n") || "<p>Nothing yet — compose your first fragment above.</p>"}
<script>${actionScript(mount)}</script>
<script>${composerScript(mount)}</script>`;
  return c.html(studioLayout("blyg studio", body));
});

studio.get("/settings", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const settings = await getSettings(c.env.DB);
  const linksText = settings.author_links.map((l) => `${l.label} | ${l.url}`).join("\n");
  const body = `${studioHeader("blyg studio — settings", mount, "settings")}
<form class="settings-form prose" id="settings-form">
<label for="site_title">Site title</label>
<input id="site_title" name="site_title" value="${escapeHtml(settings.site_title)}">
<label for="author_name">Author name</label>
<input id="author_name" name="author_name" value="${escapeHtml(settings.author_name)}">
<label for="author_bio">Bio</label>
<textarea id="author_bio" name="author_bio" rows="3">${escapeHtml(settings.author_bio)}</textarea>
<label for="author_links">Links (one per line, "label | url")</label>
<textarea id="author_links" name="author_links" rows="3">${escapeHtml(linksText)}</textarea>
<label for="site_url">Canonical site URL (blank = derive from request)</label>
<input id="site_url" name="site_url" value="${escapeHtml(settings.site_url)}">
<label for="ai_model">TK generation model (blank = provider default, currently claude-opus-5)</label>
<input id="ai_model" name="ai_model" value="${escapeHtml(settings.ai_model)}" placeholder="claude-opus-5">
<label for="ai_style_prompt">TK site-level style prompt (optional, appended to every generation request)</label>
<textarea id="ai_style_prompt" name="ai_style_prompt" rows="3">${escapeHtml(settings.ai_style_prompt)}</textarea>
<p style="margin-top:1rem;"><button type="submit" class="primary">save settings</button></p>
</form>
<script>${actionScript(mount)}</script>
<script>
document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const links = document.getElementById("author_links").value
    .split("\\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => { const [label, url] = l.split("|").map((s) => s.trim()); return { label, url }; })
    .filter((l) => l.label && l.url);
  const body = {
    site_title: document.getElementById("site_title").value,
    author_name: document.getElementById("author_name").value,
    author_bio: document.getElementById("author_bio").value,
    site_url: document.getElementById("site_url").value,
    ai_model: document.getElementById("ai_model").value,
    ai_style_prompt: document.getElementById("ai_style_prompt").value,
    author_links: links,
  };
  if (await api("PUT", "/api/settings", body)) alert("saved");
});
</script>`;
  return c.html(studioLayout("settings — blyg studio", body));
});

/** Syntax cheat sheet — studio furniture, not a protocol surface. Linked from the nav and from both composers' compose-help hints. */
studio.get("/syntax", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const body = `${studioHeader("blyg studio — syntax", mount, "syntax")}
<div class="prose">
<p>Standard markdown always works (paragraphs, headings, lists, links, emphasis, code). Everything below is studio-private authoring syntax — none of it reaches the wire except where noted.</p>

<h2>Fragment transclusion — <code>![[id]]</code></h2>
<ul>
<li><strong>Threads only</strong> — fragments can't transclude anything.</li>
<li>Alone on its own line, nothing else: <code>![[7c9wk2n4h6q1x8v0z3m5rjy2ke]]</code> — <code>id</code> is the 26-character id of one of <em>your own published</em> fragments (not a draft, not withdrawn, not a thread — no nesting yet).</li>
<li>Always pulls the fragment's current/latest version at publish time and bakes it into the thread's HTML. An explicit pinned-version form, <code>![[id@v3]]</code>, is reserved syntax, not implemented — using it fails publish with an explicit error rather than resolving.</li>
<li>Any unresolvable id fails the <em>whole</em> publish, with every bad reference listed. In the thread editor, type <code>![[</code> to open a fragment picker; an unresolvable ref shows a red placeholder in preview before you publish.</li>
</ul>

<h2>Instructed generation (TK) — <code>[TK]…[/TK]</code></h2>
<ul>
<li>Available in <strong>both</strong> the fragment composer and the thread editor.</li>
<li>Ungenerated scope: <code>[TK]an instruction[/TK]</code>. Generated scope: <code>[TK]an instruction[=]the output[/TK]</code> — the studio writes the <code>[=]output</code> part for you when you click Generate/Regenerate; don't type it by hand.</li>
<li>An empty instruction, <code>[TK][/TK]</code>, is valid — the "journalism TK" placeholder.</li>
<li>A scope is block-level if it sits alone in its own paragraph, inline otherwise — same grammar either way, no separate syntax.</li>
<li>No nesting — a <code>[TK]</code> scope can't contain another.</li>
<li>Publish strips every scope down to its bare output — readers never see the instruction. Machine-generated spans carry a provenance record plus a highlighted style; hand-written or hand-edited output carries no disclosure. Publish fails if any scope still has no output ("never generated").</li>
</ul>

<h2>Source refs inside a TK scope — <code>![[id]]</code> (own-line <em>or</em> inline)</h2>
<ul>
<li>Different meaning from plain transclusion: inside a <code>[TK]…[/TK]</code> scope, <em>every</em> <code>![[id]]</code> — whether alone on its line or inline in the instruction or output text — is a <strong>source reference</strong> fed to the generator, not a quote. It's disclosed in the published <code>generated[].sources</code> provenance, never rendered as a blockquote.</li>
<li>Same id rule as transclusion: must resolve to one of your own published fragments.</li>
<li>Works in fragment scopes too, even though a fragment can't do a plain transclusion outside a scope.</li>
<li>A TK scope can't also contain a plain transclusion — keep the two apart rather than nesting them.</li>
</ul>
</div>`;
  return c.html(studioLayout("syntax — blyg studio", body));
});

/** Studio-only live preview for the fragment editor — not a protocol surface. TK scopes are highlighted (task 6). */
studio.post("/preview", async (c) => {
  const body = await c.req.json<{ content_md?: string }>().catch(() => ({}) as { content_md?: string });
  const tk = annotateTkPreview(body.content_md ?? "");
  const html = tk.finish(renderMarkdown(tk.text));
  return c.json({ html, scopes: scopeSummaries(tk.scopes) });
});

/** Studio-only provisional thread preview + validation — publish still re-resolves for real. TK scopes are highlighted (task 6). */
studio.post("/preview-thread", async (c) => {
  const body = await c.req.json<{ content_md?: string }>().catch(() => ({}) as { content_md?: string });
  const tk = annotateTkPreview(body.content_md ?? "");
  const resolved = await previewTransclusions(c.env.DB, tk.text);
  return c.json({
    html: tk.finish(resolved.html),
    errors: resolved.errors,
    transclusions: resolved.transclusions,
    scopes: scopeSummaries(tk.scopes),
  });
});

/** Studio-only fragment search for the thread editor's `![[` palette. */
/**
 * Read one past version for the editor's history viewer. Studio-only: the
 * stored `content_html` of any version, pinned or not — unlike the public
 * `items/{id}/vN.json` surface, which serves pinned versions only (§2.8).
 * Reading history locally is not the same act as promising it publicly.
 */
studio.get("/versions/:id/:v", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  const version = Number(c.req.param("v"));
  if (!Number.isInteger(version)) return c.json({ error: "bad version" }, 400);
  const row = await getVersion(c.env.DB, item.id, version);
  if (!row) return c.json({ error: "version not found" }, 404);
  return c.json({
    version: row.version,
    published_at: formatDate(row.published_at),
    note: row.note,
    pinned: row.pinned === 1,
    content_html: row.content_html ?? "",
  });
});

studio.get("/fragments/search", async (c) => {
  const q = (c.req.query("q") ?? "").toLowerCase();
  const items = await listAll(c.env.DB);
  const results: { id: string; excerpt: string; version: number; updated: string }[] = [];
  for (const item of items) {
    if (item.kind !== "fragment" || item.status !== "public") continue;
    const latest = await publishedVersion(c.env.DB, item);
    if (!latest) continue;
    // From rendered HTML, not markdown source — the picker showed literal
    // "#"/"*" markers otherwise, same bug class as the index rows.
    const excerpt = clampText(plainTextFromHtml(latest.content_html ?? ""), 70) || excerptOf(latest.content_md, 70);
    if (q && !excerpt.toLowerCase().includes(q) && !item.id.includes(q)) continue;
    results.push({ id: item.id, excerpt, version: item.version, updated: item.updated });
  }
  results.sort((a, b) => (a.updated < b.updated ? 1 : -1));
  return c.json({ results: results.slice(0, 20) });
});

studio.get("/edit/:id", async (c) => {
  const item = await getItem(c.env.DB, c.req.param("id"));
  if (!item) return c.notFound();
  const kind = await authoredKind(c.env.DB, item);
  const mount = normalizeMount(c.env.MOUNT);
  if (kind === "thread") return c.html(await threadEditPage(c.env.DB, item, mount));
  return c.html(await fragmentEditPage(c.env.DB, item, mount));
});

async function fragmentEditPage(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const media = await listMediaForItem(db, item.id);
  const versions = await listVersions(db, item.id);
  const tk = annotateTkPreview(item.content_md);
  const previewHtml = tk.finish(renderMarkdown(tk.text));
  const mediaHtml = media.length
    ? `<p style="font-size:0.85rem;opacity:0.7;">attached: ${media.map((m) => escapeHtml(m.r2_key)).join(", ")}</p>`
    : "";
  const withdrawBtn =
    item.status === "public"
      ? `<button type="button" class="danger" data-action="withdraw" data-id="${item.id}">withdraw</button>`
      : item.status === "withdrawn"
        ? `<button type="button" class="primary" data-action="republish" data-id="${item.id}">republish</button>`
        : "";
  const publishLabel = item.status === "withdrawn" || item.version === 0 ? "publish" : `publish v${item.version + 1}`;
  const body = `${studioHeader(`blyg studio — editing ${escapeHtml(item.id.slice(0, 8))}…`, mount)}
<nav style="margin:-0.5rem 0 1rem;font-size:0.9rem;"><a href="${studioPath(mount)}">← compose</a> <a href="${mount}/f/${item.id}/" target="_blank">permalink ↗</a></nav>
<div id="error-banner-slot"></div>
<div class="split">
<div class="pane">
<h2>markdown</h2>
<textarea id="md-input">${escapeHtml(item.content_md)}</textarea>
</div>
<div class="pane preview" id="preview-pane">
<h2>preview</h2>
<div id="preview-body">${previewHtml}</div>
</div>
</div>
<div class="tk-panel" id="tk">
<h2>TK scopes <button type="button" class="link" id="tk-generate-whole-btn">generate whole fragment&hellip;</button></h2>
<ul id="tk-scope-list">${scopeSummaries(tk.scopes)
    .map(
      (s) =>
        `<li class="tk-scope-row"><span class="tk-instruction">${escapeHtml(s.instruction || "(no instruction)")}</span> ${
          s.hasOutput ? "" : '<span class="tk-pending">ungenerated</span> '
        }<button type="button" class="tk-generate-btn" data-scope="${s.index}">${s.hasOutput ? "regenerate" : "generate"}</button></li>`,
    )
    .join("") || '<li class="tk-empty">No [TK]…[/TK] scopes in this draft.</li>'}</ul>
</div>
${mediaHtml}
<div class="edit-bar">
<span><button type="button" id="attach-btn">attach image</button> <span class="count" id="edit-count">${item.content_md.length} / ${FRAGMENT_MAX_CHARS}</span></span>
<span>
  <input class="note" id="note-input" type="text" placeholder="what changed? (optional edit note)">
  <button type="button" id="save-draft-btn">save draft</button>
  <button type="button" class="primary" id="publish-btn">${publishLabel}</button>
  ${withdrawBtn}
</span>
</div>
${historyPanel(item, versions, mount)}
<script>${actionScript(mount)}</script>
<script>
const id = ${JSON.stringify(item.id)};
const mdInput = document.getElementById("md-input");
const previewBody = document.getElementById("preview-body");
const editCount = document.getElementById("edit-count");
const errorSlot = document.getElementById("error-banner-slot");
let debounceTimer;
function scheduleSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    await api("PUT", "/api/items/" + id, { content_md: mdInput.value });
    const res = await fetch("${studioPath(mount)}/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content_md: mdInput.value }) });
    const data = await res.json();
    previewBody.innerHTML = data.html;
    renderTkPanel(data.scopes);
  }, 400);
}
mdInput.addEventListener("input", () => {
  editCount.textContent = mdInput.value.length + " / ${FRAGMENT_MAX_CHARS}";
  editCount.classList.toggle("over", mdInput.value.length > ${FRAGMENT_MAX_CHARS});
  scheduleSave();
});
document.getElementById("save-draft-btn").addEventListener("click", async () => {
  await api("PUT", "/api/items/" + id, { content_md: mdInput.value });
  location.reload();
});
document.getElementById("publish-btn").addEventListener("click", async () => {
  await api("PUT", "/api/items/" + id, { content_md: mdInput.value });
  const note = document.getElementById("note-input").value.trim();
  const res = await fetch("/api/items/" + id + "/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(note ? { note } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { renderPublishErrorBanner(errorSlot, data); return; }
  location.reload();
});
document.getElementById("tk-generate-whole-btn").addEventListener("click", () => {
  const instruction = prompt("Instruction for the whole fragment:");
  if (!instruction) return;
  const existing = mdInput.value.trim();
  mdInput.value = "[TK]" + instruction + (existing ? "[=]" + existing : "") + "[/TK]";
  scheduleSave();
});
document.getElementById("tk-scope-list").addEventListener("click", async (e) => {
  const btn = e.target.closest(".tk-generate-btn");
  if (!btn) return;
  const scope = Number(btn.dataset.scope);
  btn.disabled = true;
  btn.textContent = "generating…";
  await api("PUT", "/api/items/" + id, { content_md: mdInput.value });
  if (!(await api("POST", "/api/items/" + id + "/generate", { scope }))) { btn.disabled = false; return; }
  location.reload();
});
document.getElementById("attach-btn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file"; input.accept = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("item_id", id);
    const res = await fetch("/api/media", { method: "POST", body: form });
    if (!res.ok) { alert("upload failed"); return; }
    location.reload();
  };
  input.click();
});
</script>`;
  return studioLayout(`editing — blyg studio`, body, true);
}

async function threadEditPage(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const media = await listMediaForItem(db, item.id);
  const versions = await listVersions(db, item.id);
  const tk = annotateTkPreview(item.content_md);
  const preview = await previewTransclusions(db, tk.text);
  const previewHtml = tk.finish(preview.html);
  const mediaHtml = media.length
    ? `<p style="font-size:0.85rem;opacity:0.7;">attached: ${media.map((m) => escapeHtml(m.r2_key)).join(", ")}</p>`
    : "";
  const withdrawBtn =
    item.status === "public"
      ? `<button type="button" class="danger" data-action="withdraw" data-id="${item.id}">withdraw</button>`
      : item.status === "withdrawn"
        ? `<button type="button" class="primary" data-action="republish" data-id="${item.id}">republish</button>`
        : "";
  const publishLabel = item.status === "withdrawn" || item.version === 0 ? "publish" : `publish v${item.version + 1}`;
  const body = `${studioHeader("blyg studio — editing thread", mount)}
<nav style="margin:-0.5rem 0 1rem;font-size:0.9rem;"><a href="${studioPath(mount)}">← compose</a> <a href="${mount}/t/${item.id}/" target="_blank">permalink ↗</a></nav>
<div id="error-banner-slot"></div>
<div class="panes">
<div class="pane" style="position:relative;">
<h2>markdown source</h2>
<p class="compose-help">Markdown, plus <code>![[id]]</code> on its own line to transclude a fragment (type <code>![[</code> for a picker) and <code>[TK]an instruction[/TK]</code> to mark a scope for AI-drafted text. <a href="${studioPath(mount)}/syntax">full syntax reference</a></p>
<textarea id="md-input">${escapeHtml(item.content_md)}</textarea>
<div class="palette" id="palette" style="display:none;">
<input class="search" id="palette-search" placeholder="transclude a fragment…">
<ul id="palette-results"></ul>
</div>
</div>
<div class="pane preview" id="preview-pane">
<h2>preview</h2>
<div id="preview-body">${previewHtml}</div>
</div>
</div>
<div class="tk-panel" id="tk">
<h2>TK scopes</h2>
<ul id="tk-scope-list">${scopeSummaries(tk.scopes)
    .map(
      (s) =>
        `<li class="tk-scope-row"><span class="tk-instruction">${escapeHtml(s.instruction || "(no instruction)")}</span> ${
          s.hasOutput ? "" : '<span class="tk-pending">ungenerated</span> '
        }<button type="button" class="tk-generate-btn" data-scope="${s.index}">${s.hasOutput ? "regenerate" : "generate"}</button></li>`,
    )
    .join("") || '<li class="tk-empty">No [TK]…[/TK] scopes in this draft.</li>'}</ul>
</div>
${mediaHtml}
<div class="note-row"><label for="note-input">What changed?</label><input id="note-input" placeholder="optional edit note, shows in changelog + feed title"></div>
<div class="edit-bar">
<span><button type="button" id="attach-btn">attach image</button></span>
<span><button type="button" id="save-draft-btn">save draft</button> <button type="button" class="primary" id="publish-btn">${publishLabel}</button> ${withdrawBtn}</span>
</div>
${historyPanel(item, versions, mount)}
<script>${actionScript(mount)}</script>
<script>
const id = ${JSON.stringify(item.id)};
const mdInput = document.getElementById("md-input");
const previewBody = document.getElementById("preview-body");
const errorSlot = document.getElementById("error-banner-slot");
const palette = document.getElementById("palette");
const paletteResults = document.getElementById("palette-results");
let debounceTimer, paletteDebounce, paletteSel = 0, paletteItems = [];

function currentLinePrefix() {
  const pos = mdInput.selectionStart;
  const text = mdInput.value;
  const lineStart = text.lastIndexOf("\\n", pos - 1) + 1;
  return { lineStart, pos, prefix: text.slice(lineStart, pos) };
}

async function refreshPreview() {
  const res = await fetch("${studioPath(mount)}/preview-thread", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content_md: mdInput.value }) });
  const data = await res.json();
  previewBody.innerHTML = data.html;
  renderTkPanel(data.scopes);
}

function scheduleSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    await api("PUT", "/api/items/" + id, { content_md: mdInput.value });
    refreshPreview();
  }, 400);
}

function renderPaletteSelection() {
  [...paletteResults.children].forEach((li, i) => li.classList.toggle("sel", i === paletteSel));
}

async function updatePalette() {
  const { prefix } = currentLinePrefix();
  const m = /^\\s*!\\[\\[([^\\]]*)$/.exec(prefix);
  if (!m) { palette.style.display = "none"; return; }
  const res = await fetch("${studioPath(mount)}/fragments/search?q=" + encodeURIComponent(m[1]));
  const data = await res.json();
  paletteItems = data.results;
  paletteSel = 0;
  paletteResults.innerHTML = paletteItems
    .map((it, i) => '<li data-i="' + i + '">' + it.excerpt.replace(/</g, "&lt;") + '<span class="meta">v' + it.version + '</span></li>')
    .join("");
  renderPaletteSelection();
  palette.style.display = paletteItems.length ? "block" : "none";
}

function insertFromPalette(picked) {
  const { lineStart, pos } = currentLinePrefix();
  const before = mdInput.value.slice(0, lineStart);
  const after = mdInput.value.slice(pos);
  const insertion = "![[" + picked.id + "]]";
  mdInput.value = before + insertion + after;
  const newPos = (before + insertion).length;
  mdInput.setSelectionRange(newPos, newPos);
  palette.style.display = "none";
  mdInput.focus();
  scheduleSave();
  refreshPreview();
}

mdInput.addEventListener("input", () => {
  scheduleSave();
  clearTimeout(paletteDebounce);
  paletteDebounce = setTimeout(updatePalette, 150);
});
mdInput.addEventListener("keydown", (e) => {
  if (palette.style.display === "none") return;
  if (e.key === "Escape") { palette.style.display = "none"; }
  else if (e.key === "ArrowDown") { e.preventDefault(); paletteSel = Math.min(paletteSel + 1, paletteItems.length - 1); renderPaletteSelection(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); paletteSel = Math.max(paletteSel - 1, 0); renderPaletteSelection(); }
  else if (e.key === "Enter" && paletteItems[paletteSel]) { e.preventDefault(); insertFromPalette(paletteItems[paletteSel]); }
});
paletteResults.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (li) insertFromPalette(paletteItems[Number(li.dataset.i)]);
});

document.getElementById("save-draft-btn").addEventListener("click", async () => {
  await api("PUT", "/api/items/" + id, { content_md: mdInput.value });
  location.reload();
});
document.getElementById("publish-btn").addEventListener("click", async () => {
  await api("PUT", "/api/items/" + id, { content_md: mdInput.value });
  const note = document.getElementById("note-input").value.trim();
  const res = await fetch("/api/items/" + id + "/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(note ? { note } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { renderPublishErrorBanner(errorSlot, data); return; }
  location.reload();
});
document.getElementById("tk-scope-list").addEventListener("click", async (e) => {
  const btn = e.target.closest(".tk-generate-btn");
  if (!btn) return;
  const scope = Number(btn.dataset.scope);
  btn.disabled = true;
  btn.textContent = "generating…";
  await api("PUT", "/api/items/" + id, { content_md: mdInput.value });
  if (!(await api("POST", "/api/items/" + id + "/generate", { scope }))) { btn.disabled = false; return; }
  location.reload();
});
document.getElementById("attach-btn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file"; input.accept = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("item_id", id);
    const res = await fetch("/api/media", { method: "POST", body: form });
    if (!res.ok) { alert("upload failed"); return; }
    location.reload();
  };
  input.click();
});
</script>`;
  return studioLayout("editing thread — blyg studio", body, true);
}
