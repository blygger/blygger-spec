// Public hopper page — v0.2-plan.md §4.2 task 11. Curation display only
// (decision #12): local snapshots + source attribution + origin links,
// never a re-emission of anyone else's content on our own feed.

import { layout } from "../pages.ts";
import type { HopperRow, ImportedItemRow, SubscriptionRow } from "../types.ts";
import { escapeHtml } from "../util.ts";
import { sanitizeHtml } from "./sanitize.ts";

export interface HopperItemView {
  row: ImportedItemRow;
  sub: SubscriptionRow;
}

export async function publicHopperPage(hopper: HopperRow, items: HopperItemView[], mount: string): Promise<string> {
  const blocks: string[] = [];
  for (const { row, sub } of items) {
    const withdrawn = row.state === "tombstone";
    const subLabel = escapeHtml(sub.title || sub.origin);
    if (withdrawn && row.pinned_version_retained === null) {
      blocks.push(`<article class="fragment withdrawn">
<p>Withdrawn by origin — no longer citable.</p>
<p class="provenance">from <a href="${sub.origin}">${subLabel}</a></p>
</article>`);
      continue;
    }
    const html = row.l0 ? row.content_html : await sanitizeHtml(row.content_html);
    // L0 content already embeds its own source link inline; blyg imports get a constructed permalink on the origin.
    const sourceLink = row.l0 ? "" : `${sub.origin}${row.kind === "thread" ? "t" : "f"}/${row.remote_id}/`;
    const pinNote = withdrawn
      ? `<p class="provenance">withdrawn by origin — retained via a pinned version: <a href="${sub.origin}items/${row.remote_id}/v${row.pinned_version_retained}.json">v${row.pinned_version_retained}</a></p>`
      : "";
    const attribution = `<p class="provenance">from <a href="${sub.origin}">${subLabel}</a>${sourceLink ? ` — <a href="${sourceLink}">source ↗</a>` : ""}</p>`;
    blocks.push(`<article class="fragment">
${html}
${pinNote}
${attribution}
</article>`);
  }
  const body = `<div class="blyg">
<header class="blyg-header"><a href="/">Home</a></header>
<h2>${escapeHtml(hopper.name)}</h2>
${blocks.join("\n") || "<p>Nothing here yet.</p>"}
</div>`;
  return layout(hopper.name, body, mount);
}
