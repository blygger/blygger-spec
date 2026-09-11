// Subscribe-side studio pages — v0.2-plan.md §4.2 task 7 (subs list +
// add-by-URL), task 9 (reading feed), task 10 (hoppers). Server-rendered
// HTML + vanilla JS against the /api/* endpoints, same conventions as
// ../studio.ts (no client framework, per CLAUDE.md stack conventions).

import { Hono } from "hono";
import { excerptFromHtml } from "../markdown.ts";
import { authoredKind, listPublic, publishedVersion } from "../model.ts";
import { formatDate, studioHeader, studioLayout } from "../studio.ts";
import type { Env, SubscriptionRow } from "../types.ts";
import { escapeHtml, normalizeMount } from "../util.ts";
import type { ImportedEntryInput, OwnEntryInput, ReadingFeedEntry } from "./reading.ts";
import { buildReadingFeed } from "./reading.ts";
import { sanitizeHtml } from "./sanitize.ts";
import {
  getHopper,
  getImportedItem,
  getSignal,
  listAllImportedItems,
  listHoppers,
  listHopperItems,
  listSubscriptions,
} from "./store.ts";
import type { HopperRow } from "../types.ts";

const SUBS_STYLE = `
.sub-row { border-top: 1px solid rgba(128,128,128,0.3); padding: 0.75rem 0; }
.sub-row .title-line { display: flex; align-items: center; gap: 0.5rem; }
.status-dot { font-size: 0.8rem; }
.status-dot.active { color: #2a7; }
.status-dot.paused { opacity: 0.5; }
.status-dot.degraded { color: #c60; }
.kind-chip { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; border: 1px solid rgba(128,128,128,0.5); border-radius: 3px; padding: 0.05rem 0.35rem; opacity: 0.75; }
.sub-row .meta { font-size: 0.82rem; opacity: 0.7; margin: 0.25rem 0; }
.sub-row .flags { font-size: 0.8rem; color: #c60; margin: 0.25rem 0; }
.sub-row .actions { display: flex; gap: 0.4rem; align-items: center; margin-top: 0.4rem; flex-wrap: wrap; font-size: 0.85rem; }
.sub-row label.blogroll { font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; }
.add-sub { border: 1px solid rgba(128,128,128,0.4); border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem; }
.add-sub input[type="url"] { width: 100%; font: inherit; padding: 0.4rem 0.5rem; border-radius: 4px; border: 1px solid rgba(128,128,128,0.5); background: transparent; color: inherit; }
.add-sub .confirm { margin-top: 0.6rem; font-size: 0.9rem; padding: 0.5rem; border: 1px solid rgba(128,128,128,0.4); border-radius: 4px; }
.add-sub .mismatch { color: #c60; }
`;

function subRow(sub: SubscriptionRow): string {
  const flags: { type: string; at: string; detail?: string }[] = (() => {
    try {
      const parsed = JSON.parse(sub.flags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const flagsHtml = flags.length
    ? `<p class="flags">⚠ ${flags
        .slice(-3)
        .map((f) => escapeHtml(f.type + (f.detail ? `: ${f.detail}` : "")))
        .join(" · ")}</p>`
    : "";
  const pollLine = sub.last_poll_at ? `last polled ${formatDate(sub.last_poll_at)}` : "never polled";
  const pauseResume =
    sub.status === "paused"
      ? `<button type="button" data-action="resume" data-id="${sub.id}">resume</button>`
      : `<button type="button" data-action="pause" data-id="${sub.id}">pause</button>`;
  const resyncBtn =
    sub.kind === "blyg" ? `<button type="button" data-action="resync" data-id="${sub.id}">resync</button>` : "";
  return `<div class="sub-row">
<div class="title-line">
<span class="status-dot ${sub.status}">●</span>
<span class="kind-chip">${sub.kind}</span>
<strong>${escapeHtml(sub.title || sub.origin)}</strong>
</div>
<p class="meta">${escapeHtml(sub.origin)} &middot; ${pollLine}${sub.status === "degraded" ? ` &middot; degraded (${sub.fail_count} consecutive failures)` : ""}</p>
${flagsHtml}
<div class="actions">
${pauseResume}
${resyncBtn}
<button type="button" class="danger" data-action="delete-sub" data-id="${sub.id}">delete</button>
<label class="blogroll"><input type="checkbox" data-action="toggle-blogroll" data-id="${sub.id}" ${sub.in_blogroll ? "checked" : ""}> in blogroll</label>
</div>
</div>`;
}

const SUBS_SCRIPT = `
async function subsApi(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action, id = btn.dataset.id;
  if (action === "pause") await subsApi("POST", "/api/subscriptions/" + id + "/pause");
  else if (action === "resume") await subsApi("POST", "/api/subscriptions/" + id + "/resume");
  else if (action === "resync") { await subsApi("POST", "/api/subscriptions/" + id + "/resync"); alert("resynced"); }
  else if (action === "delete-sub") {
    if (!confirm("Delete this subscription? Local imports, hopper memberships, and signals for it are removed. Nothing public is affected.")) return;
    await subsApi("DELETE", "/api/subscriptions/" + id);
  } else return;
  location.reload();
});
document.addEventListener("change", async (e) => {
  if (e.target.dataset.action !== "toggle-blogroll") return;
  await subsApi("PUT", "/api/subscriptions/" + e.target.dataset.id, { in_blogroll: e.target.checked });
});

const addForm = document.getElementById("add-sub-form");
const urlInput = document.getElementById("add-sub-url");
const confirmSlot = document.getElementById("add-sub-confirm");
let pendingResolve = null;
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;
  const { ok, json } = await subsApi("POST", "/api/subscriptions", { url });
  if (!ok) {
    confirmSlot.innerHTML = '<div class="confirm mismatch">Could not resolve: ' + (json && json.error ? json.error.replace(/</g, "&lt;") : "unknown error") + '</div>';
    return;
  }
  pendingResolve = { url, title: json.title };
  const mismatchHtml = json.siteMismatch
    ? '<p class="mismatch">Note: this origin\\'s manifest claims to be ' + json.siteMismatch.asserted.replace(/</g, "&lt;") + ', but was actually fetched from ' + json.siteMismatch.actual.replace(/</g, "&lt;") + '. Subscribing to the fetched origin.</p>'
    : "";
  confirmSlot.innerHTML =
    '<div class="confirm">Resolved as <strong>' + json.kind + '</strong>: ' + (json.origin || json.feedUrl).replace(/</g, "&lt;") +
    mismatchHtml +
    '<p><button type="button" id="confirm-sub-btn">confirm subscribe</button></p></div>';
  document.getElementById("confirm-sub-btn").addEventListener("click", async () => {
    if (!pendingResolve) return;
    const { ok: ok2 } = await subsApi("POST", "/api/subscriptions", { url: pendingResolve.url, confirm: true, title: pendingResolve.title });
    if (ok2) location.reload();
  });
});
`;

export const importerStudio = new Hono<{ Bindings: Env }>({ strict: false });

importerStudio.get("/subs", async (c) => {
  const subs = await listSubscriptions(c.env.DB);
  const mount = normalizeMount(c.env.MOUNT);
  const body = `${studioHeader("blyg studio — subscriptions", mount)}
<style>${SUBS_STYLE}</style>
<div class="add-sub">
<form id="add-sub-form">
<label for="add-sub-url" style="display:block;font-size:0.85rem;opacity:0.8;margin-bottom:0.3rem;">Subscribe to a URL (a blyg origin, its feed, or a legacy RSS feed)</label>
<input type="url" id="add-sub-url" placeholder="https://example.com/" required>
<p style="margin-top:0.5rem;"><button type="submit">resolve</button></p>
</form>
<div id="add-sub-confirm"></div>
</div>
${subs.length ? subs.map(subRow).join("\n") : "<p>No subscriptions yet.</p>"}
<script>${SUBS_SCRIPT}</script>`;
  return c.html(studioLayout("subscriptions — blyg studio", body));
});

// --- Reading feed (task 9, §3.6) ---

const READING_STYLE = `
.reading-entry { border-top: 1px solid rgba(128,128,128,0.3); padding: 0.85rem 0; }
.reading-entry .byline { font-size: 0.8rem; opacity: 0.7; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.reading-entry .byline .kind-chip { font-size: 0.68rem; padding: 0.02rem 0.3rem; }
.reading-entry .byline .l0-chip { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; border: 1px solid rgba(128,128,128,0.5); border-radius: 3px; padding: 0.02rem 0.3rem; opacity: 0.7; }
.reading-entry .content { margin-top: 0.4rem; }
.reading-entry .content img { max-width: 100%; }
.reading-entry.withdrawn-entry { opacity: 0.6; font-style: italic; }
.entry-actions { margin-top: 0.5rem; display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
.entry-actions button { font-size: 0.9rem; padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid rgba(128,128,128,0.4); background: transparent; cursor: pointer; }
.entry-actions button.active { border-color: currentColor; background: rgba(128,128,128,0.15); }
.entry-actions select { font: inherit; font-size: 0.85rem; padding: 0.15rem 0.3rem; border-radius: 4px; border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit; }
`;

async function ownEntries(db: D1Database): Promise<OwnEntryInput[]> {
  const items = await listPublic(db);
  const out: OwnEntryInput[] = [];
  for (const item of items) {
    const withdrawn = item.kind === "withdrawn";
    const kind = await authoredKind(db, item);
    const latest = withdrawn ? null : await publishedVersion(db, item);
    out.push({ id: item.id, kind, withdrawn, updated: item.updated, contentHtml: latest?.content_html ?? "" });
  }
  return out;
}

async function importedEntries(db: D1Database): Promise<ImportedEntryInput[]> {
  const [imports, subs] = await Promise.all([listAllImportedItems(db), listSubscriptions(db)]);
  const titleOf = new Map(subs.map((s) => [s.id, s.title || s.origin]));
  const out: ImportedEntryInput[] = [];
  for (const row of imports) {
    out.push({
      subscriptionId: row.subscription_id,
      subscriptionTitle: titleOf.get(row.subscription_id) ?? row.subscription_id,
      remoteId: row.remote_id,
      kind: row.kind,
      withdrawn: row.state === "tombstone",
      l0: row.l0 === 1,
      updated: row.updated,
      observedAt: row.observed_at,
      contentHtml: row.l0 ? row.content_html : await sanitizeHtml(row.content_html),
      pinnedVersionRetained: row.pinned_version_retained,
    });
  }
  return out;
}

function hopperPicker(imp: NonNullable<ReadingFeedEntry["imported"]>, hoppers: HopperRow[]): string {
  if (!hoppers.length) return "";
  const options = hoppers.map((h) => `<option value="${h.id}">${escapeHtml(h.name)}</option>`).join("");
  return `<select data-action="add-to-hopper" data-sub="${imp.subscriptionId}" data-remote="${imp.remoteId}">
<option value="">+ add to hopper…</option>
${options}
</select>`;
}

function thumbButtons(imp: NonNullable<ReadingFeedEntry["imported"]>, thumb: 1 | -1 | null): string {
  return `<button type="button" data-action="thumb" data-sub="${imp.subscriptionId}" data-remote="${imp.remoteId}" data-thumb="1" class="${thumb === 1 ? "active" : ""}">👍</button>
<button type="button" data-action="thumb" data-sub="${imp.subscriptionId}" data-remote="${imp.remoteId}" data-thumb="-1" class="${thumb === -1 ? "active" : ""}">👎</button>`;
}

async function readingEntryHtml(db: D1Database, e: ReadingFeedEntry, hoppers: HopperRow[]): Promise<string> {
  if (e.withdrawn) {
    const retained = e.imported?.pinnedVersionRetained;
    if (retained === null || retained === undefined) {
      return `<div class="reading-entry withdrawn-entry">
<p class="byline"><span class="kind-chip">${e.kind}</span> ${escapeHtml(e.imported?.subscriptionTitle ?? "")}</p>
<p>withdrawn by origin</p>
</div>`;
    }
    // Pinned-retained content still renders below, with the withdrawal noted.
  }
  const byline =
    e.source === "own"
      ? `<span class="kind-chip">${e.kind}</span> you`
      : `<span class="kind-chip">${e.kind}</span> ${e.l0 ? '<span class="l0-chip">legacy rss</span> ' : ""}${escapeHtml(e.imported?.subscriptionTitle ?? "")}`;
  const withdrawnNote = e.withdrawn ? `<p style="opacity:0.7;font-style:italic;">withdrawn by origin — retained via a pin (v${e.imported?.pinnedVersionRetained})</p>` : "";
  let actions = "";
  if (e.imported) {
    const signal = await getSignal(db, e.imported.subscriptionId, e.imported.remoteId);
    actions = `<div class="entry-actions">${thumbButtons(e.imported, signal ? (signal.thumb as 1 | -1) : null)} ${hopperPicker(e.imported, hoppers)}</div>`;
  }
  return `<div class="reading-entry">
<p class="byline">${byline} <span>&middot; ${formatDate(e.displayAt)}</span></p>
${withdrawnNote}
<div class="content">${e.contentHtml || "<p><em>(empty)</em></p>"}</div>
${actions}
</div>`;
}

const READING_SCRIPT = `
async function readingApi(method, path, body) {
  await fetch(path, { method, headers: body !== undefined ? { "content-type": "application/json" } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
}
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action='thumb']");
  if (!btn) return;
  await readingApi("PUT", "/api/signals/" + btn.dataset.sub + "/" + btn.dataset.remote, { thumb: Number(btn.dataset.thumb) });
  location.reload();
});
document.addEventListener("change", async (e) => {
  const sel = e.target.closest("[data-action='add-to-hopper']");
  if (!sel || !sel.value) return;
  await readingApi("PUT", "/api/hoppers/" + sel.value + "/items/" + sel.dataset.sub + "/" + sel.dataset.remote);
  sel.value = "";
  alert("added to hopper");
});
`;

importerStudio.get("/reading", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const [own, imported, hoppers] = await Promise.all([ownEntries(c.env.DB), importedEntries(c.env.DB), listHoppers(c.env.DB)]);
  const feed = buildReadingFeed(own, imported);
  const rows = await Promise.all(feed.map((e) => readingEntryHtml(c.env.DB, e, hoppers)));
  const body = `${studioHeader("blyg studio — reading", mount)}
<style>${READING_STYLE}</style>
${rows.length ? rows.join("\n") : "<p>Nothing to read yet — publish something, or subscribe to a blyg or feed.</p>"}
<script>${READING_SCRIPT}</script>`;
  return c.html(studioLayout("reading — blyg studio", body, true));
});

// --- Hoppers (task 10, §3.4) ---

const HOPPERS_STYLE = `
.hopper-row { border-top: 1px solid rgba(128,128,128,0.3); padding: 0.75rem 0; display: flex; justify-content: space-between; align-items: center; }
.hopper-row .hopper-meta { font-size: 0.85rem; opacity: 0.7; }
.hopper-row .actions { display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
`;

function hoppersScript(mount: string): string {
  return `
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "new-hopper-form") return;
  e.preventDefault();
  const name = document.getElementById("new-hopper-name").value.trim();
  if (!name) return;
  const res = await fetch("/api/hoppers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
  if (res.ok) location.reload();
});
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  if (btn.dataset.action === "delete-hopper") {
    if (!confirm("Delete this hopper? Membership is removed locally; nothing public is affected.")) return;
    await fetch("/api/hoppers/" + btn.dataset.id, { method: "DELETE" });
    location.href = "${mount}/studio/hoppers";
  } else if (btn.dataset.action === "remove-hopper-item") {
    await fetch("/api/hoppers/" + btn.dataset.hopper + "/items/" + btn.dataset.sub + "/" + btn.dataset.remote, { method: "DELETE" });
    location.reload();
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.dataset.action !== "toggle-public") return;
  await fetch("/api/hoppers/" + e.target.dataset.id, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ public: e.target.checked }),
  });
});
`;
}

importerStudio.get("/hoppers", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const hoppers = await listHoppers(c.env.DB);
  const rows = await Promise.all(
    hoppers.map(async (h) => {
      const items = await listHopperItems(c.env.DB, h.id);
      return `<div class="hopper-row">
<div>
<a href="${mount}/studio/hoppers/${h.id}"><strong>${escapeHtml(h.name)}</strong></a>
<p class="hopper-meta">${items.length} item${items.length === 1 ? "" : "s"} &middot; slug: ${escapeHtml(h.slug ?? "")}</p>
</div>
<div class="actions">
<label><input type="checkbox" data-action="toggle-public" data-id="${h.id}" ${h.public ? "checked" : ""}> public</label>
<button type="button" data-action="delete-hopper" data-id="${h.id}">delete</button>
</div>
</div>`;
    }),
  );
  const body = `${studioHeader("blyg studio — hoppers", mount)}
<style>${HOPPERS_STYLE}</style>
<form id="new-hopper-form" style="margin-bottom:1rem;">
<input type="text" id="new-hopper-name" placeholder="new hopper name" required>
<button type="submit">create</button>
</form>
${rows.length ? rows.join("\n") : "<p>No hoppers yet — add items to a hopper from the reading feed.</p>"}
<script>${hoppersScript(mount)}</script>`;
  return c.html(studioLayout("hoppers — blyg studio", body));
});

importerStudio.get("/hoppers/:id", async (c) => {
  const hopper = await getHopper(c.env.DB, c.req.param("id"));
  if (!hopper) return c.notFound();
  const mount = normalizeMount(c.env.MOUNT);
  const memberships = await listHopperItems(c.env.DB, hopper.id);
  const rows: string[] = [];
  for (const m of memberships) {
    const row = await getImportedItem(c.env.DB, m.subscription_id, m.remote_id);
    if (!row) continue;
    const withdrawn = row.state === "tombstone";
    const content = withdrawn
      ? row.pinned_version_retained !== null
        ? `<p style="opacity:0.7;font-style:italic;">withdrawn by origin — retained via a pin (v${row.pinned_version_retained})</p>${row.l0 ? row.content_html : await sanitizeHtml(row.content_html)}`
        : `<p>withdrawn by origin</p>`
      : row.l0
        ? row.content_html
        : await sanitizeHtml(row.content_html);
    rows.push(`<div class="reading-entry">
<p class="byline"><span class="kind-chip">${row.kind}</span>${row.l0 ? ' <span class="l0-chip">legacy rss</span>' : ""}</p>
<div class="content">${content}</div>
<div class="entry-actions"><button type="button" data-action="remove-hopper-item" data-hopper="${hopper.id}" data-sub="${m.subscription_id}" data-remote="${m.remote_id}">remove from hopper</button></div>
</div>`);
  }
  const body = `${studioHeader(`blyg studio — ${hopper.name}`, mount)}
<style>${READING_STYLE}</style>
<nav style="margin:-0.5rem 0 1rem;font-size:0.9rem;"><a href="${mount}/studio/hoppers">← hoppers</a></nav>
<p style="opacity:0.7;font-size:0.85rem;">${hopper.public ? `Public at ${mount}/h/${escapeHtml(hopper.slug ?? "")}/` : "Not public — toggle from the hoppers list."}</p>
${rows.length ? rows.join("\n") : "<p>Nothing in this hopper yet.</p>"}
<script>${hoppersScript(mount)}</script>`;
  return c.html(studioLayout(`${hopper.name} — blyg studio`, body, true));
});
