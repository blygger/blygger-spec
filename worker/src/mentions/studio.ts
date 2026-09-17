// Detect stubs — v0.3-plan §3.3. The studio view of verified inbound
// mentions, and of what we have told other people.
//
// This is a *signal* surface, not a protocol one: nothing here is published,
// nothing enters the feed, and no content of anyone else's is stored (a row
// is a pointer — §2.3.5). Whether any of it is ever shown publicly is
// curation, and is Venkat's call in Phase B.

import { Hono } from "hono";
import { stubScript } from "../importer/studio.ts";
import { listSubscriptions } from "../importer/store.ts";
import { getItem } from "../model.ts";
import { formatDate, studioHeader, studioLayout } from "../studio.ts";
import type { Env, MentionInRow, MentionOutRow } from "../types.ts";
import { escapeHtml, normalizeMount, studioPath } from "../util.ts";
import { listOutbound, listVerifiedInbound } from "./store.ts";

export const mentionsStudio = new Hono<{ Bindings: Env }>({ strict: false });

const MENTIONS_STYLE = `
.mention-group { border-top: 1px solid var(--rule); padding: 0.85rem 0; }
.mention-group h3 { margin: 0 0 0.5rem; font-size: 0.95rem; font-weight: 600; }
.mention-group h3 a { color: inherit; }
.mention-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: baseline; padding: 0.35rem 0; font-size: 0.9rem; }
.mention-row .rel { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid var(--rule); border-radius: 3px; padding: 0 0.35rem; }
.mention-row .who { font-weight: 600; }
.mention-row .when { color: var(--ink-soft); font-size: 0.85rem; }
.mention-row.gone { opacity: 0.55; text-decoration: line-through; }
.mention-row .subscribe-first { color: var(--ink-soft); font-size: 0.85rem; }
.out-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: baseline; padding: 0.3rem 0; font-size: 0.88rem; border-bottom: 1px solid var(--rule); }
.out-row .status { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
.out-row .status.sent { color: var(--ok, inherit); }
.out-row .status.failed, .out-row .status.no_endpoint { color: var(--ink-soft); }
.mentions-empty { color: var(--ink-soft); }
.mentions-note { color: var(--ink-soft); font-size: 0.88rem; margin: 0 0 1rem; }
`;

function authorName(row: MentionInRow): string {
  if (!row.source_author_json) return row.source_origin ?? row.source;
  try {
    const author = JSON.parse(row.source_author_json) as { name?: string };
    return author?.name || (row.source_origin ?? row.source);
  } catch {
    return row.source_origin ?? row.source;
  }
}

/**
 * Stubbing back requires the stubber to be a subscription — the local-snapshot
 * rule (§2.1) means we can only quote what we have imported. So the button is
 * offered when we hold their item and points at "subscribe first" when we
 * don't, rather than failing at publish time with a resolution error.
 */
async function stubBackControl(db: D1Database, row: MentionInRow, mount: string): Promise<string> {
  if (!row.source_origin || !row.source_id) return "";
  // Ask for the subscription that actually *holds* this item, rather than the
  // first one matching the origin: nothing stops two subscriptions pointing at
  // one origin, and only one of them may have imported the item yet.
  const holder = await db
    .prepare(
      `SELECT s.id AS id FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id
       WHERE ii.remote_id = ? AND s.origin = ? LIMIT 1`,
    )
    .bind(row.source_id, row.source_origin)
    .first<{ id: string }>();
  if (holder) {
    return `<button type="button" class="stub-btn" data-action="stub" data-sub="${escapeHtml(holder.id)}" data-remote="${escapeHtml(row.source_id)}">stub back ↗</button>`;
  }
  const sub = (await listSubscriptions(db)).find((s) => s.origin === row.source_origin);
  if (!sub) {
    return `<span class="subscribe-first">— <a href="${studioPath(mount)}/subs">subscribe to ${escapeHtml(row.source_origin)}</a> to stub back</span>`;
  }
  return `<span class="subscribe-first">— not imported yet; <a href="${studioPath(mount)}/subs">resync ${escapeHtml(sub.title || sub.origin)}</a> to stub back</span>`;
}

function outboundRow(row: MentionOutRow, mount: string): string {
  const detail = row.last_error ? ` <span class="when">${escapeHtml(row.last_error)}</span>` : "";
  const when = row.next_attempt_at && row.status === "pending" ? ` <span class="when">retrying after ${formatDate(row.next_attempt_at)}</span>` : "";
  return `<div class="out-row">
<span class="status ${row.status}">${row.status.replace("_", " ")}</span>
<a href="${mount}/t/${escapeHtml(row.item_id)}/">v${row.version} of ${escapeHtml(row.item_id.slice(0, 8))}…</a>
<span>→ <a href="${escapeHtml(row.target)}">${escapeHtml(row.target)}</a></span>${when}${detail}
</div>`;
}

mentionsStudio.get("/mentions", async (c) => {
  const mount = normalizeMount(c.env.MOUNT);
  const inbound = await listVerifiedInbound(c.env.DB);
  const outbound = await listOutbound(c.env.DB);

  // Grouped by *our* item: the question an author asks is "who responded to
  // this", not "what arrived most recently".
  const byTarget = new Map<string, MentionInRow[]>();
  for (const row of inbound) {
    const list = byTarget.get(row.target_item_id) ?? [];
    list.push(row);
    byTarget.set(row.target_item_id, list);
  }

  const groups: string[] = [];
  for (const [itemId, rows] of byTarget) {
    const item = await getItem(c.env.DB, itemId);
    const kind = item?.kind === "thread" ? "t" : "f";
    const lines: string[] = [];
    for (const row of rows) {
      lines.push(`<div class="mention-row${row.status === "gone" ? " gone" : ""}">
<span class="rel">${escapeHtml(row.relation ?? "mention")}</span>
<span class="who"><a href="${escapeHtml(row.source_page ?? row.source)}">${escapeHtml(authorName(row))}</a></span>
<span class="when">v${row.source_version ?? "?"} &middot; first seen ${formatDate(row.first_seen)}${
        row.last_seen !== row.first_seen ? `, last ${formatDate(row.last_seen)}` : ""
      }${row.status === "gone" ? " &middot; no longer verifies" : ""}</span>
${row.status === "gone" ? "" : await stubBackControl(c.env.DB, row, mount)}
</div>`);
    }
    groups.push(`<div class="mention-group">
<h3><a href="${mount}/${kind}/${escapeHtml(itemId)}/">${escapeHtml(itemId.slice(0, 8))}… ${item ? "" : "(deleted)"}</a> &middot; ${rows.length} response${rows.length === 1 ? "" : "s"}</h3>
${lines.join("\n")}
</div>`);
  }

  // A deployment with no canonical origin cannot name itself as a source, so
  // it cannot send — say so here rather than leaving a queue of silent
  // failures for someone to find later.
  const siteUrl = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'site_url'").first<{ value: string }>();
  const originWarning = siteUrl?.value
    ? ""
    : `<p class="mentions-note">⚠ No <strong>site URL</strong> is set in settings, so outbound mentions sent from the cron have no source URL to name. Set it before relying on delivery.</p>`;

  const body = `${studioHeader("blyg studio — mentions", mount, "mentions")}
<style>${MENTIONS_STYLE}</style>
<p class="mentions-note">Verified responses to your items, found by Webmention and checked against the sender's own item document — not by looking for your link in their page. Nothing here is published; it is yours to read, and to answer.</p>
${originWarning}
<h2>Responses to you</h2>
${groups.join("\n") || '<p class="mentions-empty">No verified mentions yet.</p>'}
<h2>Sent by you</h2>
${outbound.length ? outbound.map((row) => outboundRow(row, mount)).join("\n") : '<p class="mentions-empty">Nothing sent yet — mentions go out when you publish something that cites another origin.</p>'}
<script>${stubScript(mount)}</script>`;
  return c.html(studioLayout("mentions — blyg studio", body, true));
});
