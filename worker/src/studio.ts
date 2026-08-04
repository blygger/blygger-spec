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
import { renderMarkdown } from "./markdown.ts";
import { authoredKind, getItem, getSettings, listAll, listMediaForItem, listVersions, publishedVersion } from "./model.ts";
import { previewTransclusions } from "./transclusion.ts";
import type { Env, ItemRow, Transclusion } from "./types.ts";
import { FRAGMENT_MAX_CHARS } from "./types.ts";
import { escapeHtml, normalizeMount } from "./util.ts";

const STUDIO_STYLE = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.55;
  max-width: 65ch;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}
body.wide { max-width: 110ch; }
header.studio { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; }
header.studio h1 { font-size: 1.2rem; margin: 0; }
header.studio nav a, header.studio nav button.link { margin-left: 0.75rem; font-size: 0.9rem; }
button.link { background: none; border: none; padding: 0; font: inherit; color: inherit; text-decoration: underline; cursor: pointer; }
.composer { border: 1px solid rgba(128,128,128,0.4); border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem; }
.composer textarea { width: 100%; min-height: 5.5rem; border: none; resize: vertical; font: inherit; background: transparent; outline: none; }
.composer .bar { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.85rem; flex-wrap: wrap; gap: 0.5rem; }
.count { opacity: 0.6; }
.count.over { color: #c00; opacity: 1; }
.new-thread-line { font-size: 0.85rem; margin: -0.5rem 0 1.5rem; }
button, .composer button, .item-row button, .bar button { font: inherit; font-size: 0.85rem; padding: 0.25rem 0.7rem; border-radius: 4px; border: 1px solid rgba(128,128,128,0.5); background: transparent; color: inherit; cursor: pointer; }
button.primary { border-color: currentColor; font-weight: 600; }
button.danger { color: #c00; border-color: #c00; }
.item-row { border-top: 1px solid rgba(128,128,128,0.3); border-left: 3px solid transparent; padding: 0.75rem 0.5rem 0.75rem 0.6rem; margin-left: -0.6rem; }
.item-row .state { font-size: 0.8rem; margin-right: 0.4rem; }
.item-row .state.pub { color: #2a7; }
.item-row .state.draft { opacity: 0.5; }
.item-row .excerpt { margin: 0 0 0.3rem; }
.item-row .timestamps { font-size: 0.8rem; opacity: 0.7; margin: 0.4rem 0; display: flex; flex-direction: column; gap: 0.1rem; }
.item-row .version-nav { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; font-size: 0.85rem; }
.item-row .version-nav button { font-size: 0.8rem; line-height: 1; padding: 0.25rem 0.5rem; }
.item-row .version-nav button:disabled { opacity: 0.3; cursor: default; }
.item-row .version-nav .vn-label { opacity: 0.7; margin: 0 0.25rem; }
.item-row .version-note { font-size: 0.85rem; opacity: 0.75; font-style: italic; margin: 0.3rem 0 0; }
.item-row .actions { display: flex; gap: 0.4rem; align-items: center; margin-top: 0.5rem; flex-wrap: wrap; }
.item-row.dirty { border-left-color: #c00; background: rgba(200,0,0,0.07); }
.unpublished-flag {
  display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.02em;
  color: #c00; background: rgba(200,0,0,0.14); border: 1px solid rgba(200,0,0,0.45);
  border-radius: 3px; padding: 0.1rem 0.4rem; margin-left: 0.5rem; vertical-align: middle;
}
.item-row.dirty .timestamps .draft-line { color: #c00; opacity: 1; font-weight: 600; }
.withdrawn-row { opacity: 0.55; font-style: italic; }
.kind-chip { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; border: 1px solid rgba(128,128,128,0.5); border-radius: 3px; padding: 0.05rem 0.35rem; opacity: 0.75; vertical-align: middle; margin-right: 0.35rem; }
.split, .panes { display: flex; gap: 1.25rem; align-items: stretch; }
.pane { flex: 1; border: 1px solid rgba(128,128,128,0.4); border-radius: 6px; padding: 0.75rem; min-height: 20rem; }
.pane h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; margin: 0 0 0.5rem; }
.pane textarea { width: 100%; height: 18rem; border: none; resize: vertical; font: inherit; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9rem; line-height: 1.5; background: transparent; outline: none; }
@media (max-width: 800px) { .split, .panes { flex-direction: column; } }
.preview img { max-width: 100%; }
.preview blockquote.blygg-transclusion { margin: 1rem 0; padding: 0.6rem 0.8rem; border-left: 3px solid rgba(128,128,128,0.55); background: rgba(128,128,128,0.08); border-radius: 0 4px 4px 0; font-size: 0.92rem; }
.preview blockquote.blygg-transclusion p { margin: 0 0 0.25rem; }
.preview .provenance { font-size: 0.75rem; opacity: 0.65; }
.preview .unresolved { border-left-color: #c00; background: rgba(200,0,0,0.07); color: #c00; font-style: italic; }
.edit-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; flex-wrap: wrap; gap: 0.5rem; }
input.note { font: inherit; font-size: 0.9rem; padding: 0.3rem 0.5rem; border-radius: 4px; border: 1px solid rgba(128,128,128,0.5); background: transparent; color: inherit; width: 22rem; max-width: 100%; }
.changelog { margin-top: 1.5rem; font-size: 0.85rem; opacity: 0.85; }
.changelog h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; }
.changelog li { margin-bottom: 0.2rem; }
.error-banner { border: 1px solid rgba(200,0,0,0.5); background: rgba(200,0,0,0.09); color: #c00; border-radius: 4px; padding: 0.5rem 0.75rem; font-size: 0.85rem; margin-bottom: 0.75rem; }
.error-banner code { color: inherit; }
.note-row { margin-top: 0.75rem; font-size: 0.85rem; display: flex; gap: 0.5rem; align-items: center; }
.note-row input { flex: 1; }
.palette { position: absolute; border: 1px solid rgba(128,128,128,0.5); border-radius: 6px; padding: 0.5rem; background: Canvas; max-width: 60ch; box-shadow: 0 4px 14px rgba(0,0,0,0.15); z-index: 10; }
.palette .search { width: 100%; font: inherit; padding: 0.3rem 0.5rem; border: 1px solid rgba(128,128,128,0.4); border-radius: 4px; background: transparent; color: inherit; }
.palette ul { list-style: none; margin: 0.5rem 0 0; padding: 0; font-size: 0.9rem; max-height: 14rem; overflow-y: auto; }
.palette li { padding: 0.35rem 0.5rem; border-top: 1px solid rgba(128,128,128,0.2); cursor: pointer; }
.palette li.sel { background: rgba(128,128,128,0.15); border-radius: 4px; }
.palette .meta { font-size: 0.78rem; opacity: 0.6; margin-left: 0.5rem; }
.settings-form label { display: block; margin: 0.75rem 0 0.25rem; font-size: 0.85rem; opacity: 0.8; }
.settings-form input, .settings-form textarea { width: 100%; font: inherit; padding: 0.4rem 0.5rem; border-radius: 4px; border: 1px solid rgba(128,128,128,0.5); background: transparent; color: inherit; }
`;

function studioLayout(title: string, body: string, wide = false): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STUDIO_STYLE}</style>
</head>
<body${wide ? ' class="wide"' : ""}>
${body}
</body>
</html>
`;
}

function studioHeader(title: string, mount: string): string {
  return `<header class="studio">
<h1>${escapeHtml(title)}</h1>
<nav>
<a href="${mount}/">public page ↗</a>
<a href="/studio/settings">settings</a>
<form method="post" action="/studio/logout" style="display:inline"><button type="submit" class="link">log out</button></form>
</nav>
</header>`;
}

function loginPage(error?: string): string {
  return studioLayout(
    "blygg studio — login",
    `<h1>blygg studio</h1>
${error ? `<p style="color:#c00">${escapeHtml(error)}</p>` : ""}
<form method="post" action="/studio/login">
<p><input type="password" name="password" placeholder="password" autofocus required></p>
<p><button type="submit">log in</button></p>
</form>`,
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function versionNav(version: number): string {
  return `<div class="version-nav">
<button title="first version" disabled>|&lt;</button>
<button title="previous version" disabled>&lt;</button>
<span class="vn-label">v${version} of ${version}</span>
<button title="next version" disabled>&gt;</button>
<button title="latest version" disabled>&gt;|</button>
</div>`;
}

async function itemRow(db: D1Database, item: ItemRow): Promise<string> {
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
<div class="actions"><a href="/studio/edit/${id}"><button type="button">edit</button></a><button type="button" data-action="republish" data-id="${id}">republish</button></div>
</div>`;
  }

  if (item.version === 0) {
    // Never published.
    const kind = item.kind === "thread" ? '<span class="kind-chip">thread</span>' : "";
    return `<div class="item-row">
<p class="excerpt"><span class="state draft">○</span>${kind}${escapeHtml(excerptOf(item.content_md))}</p>
<p class="timestamps">
<span>Created: ${formatDate(item.created)} — draft, never published</span>
<span>Saved: just now</span>
</p>
<div class="actions"><a href="/studio/edit/${id}"><button type="button">edit</button></a><button type="button" data-action="publish" data-id="${id}">publish</button><button type="button" data-action="discard" data-id="${id}">discard</button></div>
</div>`;
  }

  const latest = await publishedVersion(db, item);
  const isThread = item.kind === "thread";
  const chip = isThread ? '<span class="kind-chip">thread</span>' : "";
  const transclusionCount = isThread ? (JSON.parse(latest?.transclusions ?? "[]") as Transclusion[]).length : 0;
  const excerptText = isThread ? excerptOf(latest?.content_md.replace(/^\s*!\[\[.*\]\]\s*$/gm, "") ?? "") : excerptOf(item.content_md);

  if (item.dirty === 1) {
    return `<div class="item-row dirty">
<p class="excerpt"><span class="state pub">●</span>${chip}${escapeHtml(excerptText)}<span class="unpublished-flag">unpublished changes</span></p>
<p class="timestamps">
<span>Created: ${formatDate(item.created)}</span>
<span>Most recent published: ${formatDate(item.updated)}, v${item.version}</span>
<span class="draft-line">Draft saved — not yet published</span>
</p>
<div class="actions"><a href="/studio/edit/${id}"><button type="button">edit</button></a><button type="button" class="primary" data-action="publish" data-id="${id}">publish v${item.version + 1}</button><button type="button" data-action="withdraw" data-id="${id}">withdraw</button></div>
</div>`;
  }

  const note = latest?.note ?? null;
  const noteHtml = item.version > 1 && note ? `<p class="version-note">&ldquo;${escapeHtml(note)}&rdquo;</p>` : "";
  const nav = item.version > 1 ? versionNav(item.version) : "";
  const mostRecentLine = isThread
    ? `<span>Most recent: ${formatDate(item.updated)}, v${item.version} &mdash; transcludes ${transclusionCount} fragment${transclusionCount === 1 ? "" : "s"}</span>`
    : `<span>Most recent: ${formatDate(item.updated)}, v${item.version}</span>`;
  return `<div class="item-row">
<p class="excerpt"><span class="state pub">●</span>${chip}${escapeHtml(excerptText)}</p>
${nav}
${noteHtml}
<p class="timestamps">
<span>Created: ${formatDate(item.created)}</span>
${mostRecentLine}
</p>
<div class="actions"><a href="/studio/edit/${id}"><button type="button">edit</button></a><button type="button" data-action="pin" data-id="${id}" data-version="${item.version}">pin v${item.version}&hellip;</button><button type="button" data-action="withdraw" data-id="${id}">withdraw</button></div>
</div>`;
}

function excerptOf(text: string, n = 80): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= n ? t || "(empty)" : t.slice(0, n).trimEnd() + "…";
}

const ACTION_SCRIPT = `
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
  } else if (action === "new-thread") {
    const created = await api("POST", "/api/items", { content_md: "", kind: "thread" });
    if (created) location.href = "/studio/edit/" + created.id;
    return;
  } else {
    return;
  }
  location.reload();
});
`;

const COMPOSER_SCRIPT = `
const composerText = document.getElementById("composer-text");
const composerCount = document.getElementById("composer-count");
function updateCount() {
  const n = composerText.value.length;
  composerCount.textContent = n + " / ${FRAGMENT_MAX_CHARS}";
  composerCount.classList.toggle("over", n > ${FRAGMENT_MAX_CHARS});
}
composerText.addEventListener("input", updateCount);
updateCount();
document.getElementById("save-draft-btn").addEventListener("click", async () => {
  const created = await api("POST", "/api/items", { content_md: composerText.value });
  if (created) location.reload();
});
document.getElementById("publish-btn").addEventListener("click", async () => {
  const created = await api("POST", "/api/items", { content_md: composerText.value });
  if (!created) return;
  if (!(await api("POST", "/api/items/" + created.id + "/publish", {}))) { location.reload(); return; }
  location.reload();
});
document.getElementById("composer-attach").addEventListener("click", async () => {
  const created = await api("POST", "/api/items", { content_md: composerText.value });
  if (created) location.href = "/studio/edit/" + created.id;
});
`;

export const studio = new Hono<{ Bindings: Env }>({ strict: false });

studio.get("/login", async (c) => {
  if (await verifySession(c.env, c.req.header("cookie"))) return c.redirect("/studio");
  return c.html(loginPage());
});

studio.post("/login", async (c) => {
  const form = await c.req.formData();
  const password = String(form.get("password") ?? "");
  if (!(await checkPassword(c.env, password))) {
    return c.html(loginPage("Wrong password."), 403);
  }
  c.header("Set-Cookie", await issueSessionCookie(c.env));
  return c.redirect("/studio");
});

studio.post("/logout", (c) => {
  c.header("Set-Cookie", clearSessionCookie());
  return c.redirect("/studio/login");
});

studio.get("/", async (c) => {
  const items = await listAll(c.env.DB);
  const rows = await Promise.all(items.map((item) => itemRow(c.env.DB, item)));
  const body = `${studioHeader("blygg studio", normalizeMount(c.env.MOUNT))}
<div class="composer">
<textarea id="composer-text" placeholder="compose a fragment…"></textarea>
<div class="bar">
  <span><button type="button" id="composer-attach">attach image</button></span>
  <span class="count" id="composer-count">0 / ${FRAGMENT_MAX_CHARS}</span>
  <span><button type="button" id="save-draft-btn">save draft</button> <button type="button" class="primary" id="publish-btn">publish</button></span>
</div>
</div>
<p class="new-thread-line"><button type="button" class="link" data-action="new-thread">+ new thread</button> <span style="opacity:0.6;">— long-form, opens the thread editor</span></p>
${rows.join("\n") || "<p>Nothing yet — compose your first fragment above.</p>"}
<script>${ACTION_SCRIPT}</script>
<script>${COMPOSER_SCRIPT}</script>`;
  return c.html(studioLayout("blygg studio", body));
});

studio.get("/settings", async (c) => {
  const settings = await getSettings(c.env.DB);
  const linksText = settings.author_links.map((l) => `${l.label} | ${l.url}`).join("\n");
  const body = `${studioHeader("blygg studio — settings", normalizeMount(c.env.MOUNT))}
<nav style="margin:-0.5rem 0 1rem;font-size:0.9rem;"><a href="/studio">← studio</a></nav>
<form class="settings-form" id="settings-form">
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
<p style="margin-top:1rem;"><button type="submit" class="primary">save settings</button></p>
</form>
<script>${ACTION_SCRIPT}</script>
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
    author_links: links,
  };
  if (await api("PUT", "/api/settings", body)) alert("saved");
});
</script>`;
  return c.html(studioLayout("settings — blygg studio", body));
});

/** Studio-only live preview for the fragment editor — not a protocol surface. */
studio.post("/preview", async (c) => {
  const body = await c.req.json<{ content_md?: string }>().catch(() => ({}) as { content_md?: string });
  return c.json({ html: renderMarkdown(body.content_md ?? "") });
});

/** Studio-only provisional thread preview + validation — publish still re-resolves for real. */
studio.post("/preview-thread", async (c) => {
  const body = await c.req.json<{ content_md?: string }>().catch(() => ({}) as { content_md?: string });
  const resolved = await previewTransclusions(c.env.DB, body.content_md ?? "");
  return c.json({ html: resolved.html, errors: resolved.errors, transclusions: resolved.transclusions });
});

/** Studio-only fragment search for the thread editor's `![[` palette. */
studio.get("/fragments/search", async (c) => {
  const q = (c.req.query("q") ?? "").toLowerCase();
  const items = await listAll(c.env.DB);
  const results: { id: string; excerpt: string; version: number; updated: string }[] = [];
  for (const item of items) {
    if (item.kind !== "fragment" || item.status !== "public") continue;
    const latest = await publishedVersion(c.env.DB, item);
    if (!latest) continue;
    const excerpt = excerptOf(latest.content_md, 70);
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
  const previewHtml = renderMarkdown(item.content_md);
  const changelogHtml = versions
    .slice()
    .reverse()
    .map((v) => {
      const noteText = v.note ? ` &middot; &ldquo;${escapeHtml(v.note)}&rdquo;` : "";
      const pinAction = v.content_md
        ? v.pinned === 1
          ? "📌 pinned"
          : `<button type="button" data-action="pin" data-id="${item.id}" data-version="${v.version}">pin&hellip;</button>`
        : "";
      return `<li>v${v.version} &middot; ${v.published_at}${noteText} &middot; ${pinAction}</li>`;
    })
    .join("\n");
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
  const body = `${studioHeader(`blygg studio — editing ${escapeHtml(item.id.slice(0, 8))}…`, mount)}
<nav style="margin:-0.5rem 0 1rem;font-size:0.9rem;"><a href="/studio">← studio</a> <a href="${mount}/f/${item.id}/" target="_blank">permalink ↗</a></nav>
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
<div class="changelog">
<h2>changelog</h2>
<ul>
${changelogHtml || "<li>not yet published</li>"}
</ul>
</div>
<script>${ACTION_SCRIPT}</script>
<script>
const id = ${JSON.stringify(item.id)};
const mdInput = document.getElementById("md-input");
const previewBody = document.getElementById("preview-body");
const editCount = document.getElementById("edit-count");
let debounceTimer;
function scheduleSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    await api("PUT", "/api/items/" + id, { content_md: mdInput.value });
    const res = await fetch("/studio/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content_md: mdInput.value }) });
    const { html } = await res.json();
    previewBody.innerHTML = html;
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
  if (!(await api("POST", "/api/items/" + id + "/publish", note ? { note } : {}))) return;
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
  return studioLayout(`editing — blygg studio`, body, true);
}

async function threadEditPage(db: D1Database, item: ItemRow, mount: string): Promise<string> {
  const media = await listMediaForItem(db, item.id);
  const versions = await listVersions(db, item.id);
  const preview = await previewTransclusions(db, item.content_md);
  const changelogHtml = versions
    .slice()
    .reverse()
    .map((v) => {
      const noteText = v.note ? ` &middot; &ldquo;${escapeHtml(v.note)}&rdquo;` : "";
      const pinAction = v.content_md
        ? v.pinned === 1
          ? "📌 pinned"
          : `<button type="button" data-action="pin" data-id="${item.id}" data-version="${v.version}">pin&hellip;</button>`
        : "";
      return `<li>v${v.version} &middot; ${v.published_at}${noteText} &middot; ${pinAction}</li>`;
    })
    .join("\n");
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
  const body = `${studioHeader("blygg studio — editing thread", mount)}
<nav style="margin:-0.5rem 0 1rem;font-size:0.9rem;"><a href="/studio">← studio</a> <a href="${mount}/t/${item.id}/" target="_blank">permalink ↗</a></nav>
<div id="error-banner-slot"></div>
<div class="panes">
<div class="pane" style="position:relative;">
<h2>markdown source</h2>
<textarea id="md-input">${escapeHtml(item.content_md)}</textarea>
<div class="palette" id="palette" style="display:none;">
<input class="search" id="palette-search" placeholder="transclude a fragment…">
<ul id="palette-results"></ul>
</div>
</div>
<div class="pane preview" id="preview-pane">
<h2>preview</h2>
<div id="preview-body">${preview.html}</div>
</div>
</div>
${mediaHtml}
<div class="note-row"><label for="note-input">What changed?</label><input id="note-input" placeholder="optional edit note, shows in changelog + feed title"></div>
<div class="edit-bar">
<span><button type="button" id="attach-btn">attach image</button></span>
<span><button type="button" id="save-draft-btn">save draft</button> <button type="button" class="primary" id="publish-btn">${publishLabel}</button> ${withdrawBtn}</span>
</div>
<div class="changelog">
<h2>changelog</h2>
<ul>
${changelogHtml || "<li>not yet published</li>"}
</ul>
</div>
<script>${ACTION_SCRIPT}</script>
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
  const res = await fetch("/studio/preview-thread", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content_md: mdInput.value }) });
  const data = await res.json();
  previewBody.innerHTML = data.html;
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
  const res = await fetch("/studio/fragments/search?q=" + encodeURIComponent(m[1]));
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
  if (!res.ok) {
    errorSlot.innerHTML = '<div class="error-banner">Cannot publish: ' +
      (data.errors || []).map((e) => "<code>" + e.directive.replace(/</g, "&lt;") + "</code> does not resolve — " + e.reason).join("<br>") +
      "</div>";
    return;
  }
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
  return studioLayout("editing thread — blygg studio", body, true);
}
