// Merged reading feed — v0.2-plan.md §3.6 (client policy, not protocol).
// Pure merge/sort so the clamp is unit-testable without the DB or HTML.

import { toIsoUtc } from "../util.ts";

/**
 * Reverse-chron display time = min(claimed updated, observed_at) — the
 * clamp means a future-dated or badly-skewed origin cannot pin itself to
 * the top of the reading feed forever; it sorts no newer than when we
 * actually saw it.
 */
export function clampDisplayAt(claimedUpdated: string | null | undefined, observedAt: string): string {
  const claimed = toIsoUtc(claimedUpdated);
  if (!claimed) return observedAt;
  return Date.parse(claimed) < Date.parse(observedAt) ? claimed : observedAt;
}

export interface OwnEntryInput {
  id: string;
  kind: "fragment" | "thread";
  withdrawn: boolean;
  updated: string;
  contentHtml: string;
}

export interface ImportedEntryInput {
  subscriptionId: string;
  subscriptionTitle: string;
  remoteId: string;
  kind: "fragment" | "thread";
  withdrawn: boolean;
  l0: boolean;
  updated: string | null;
  observedAt: string;
  contentHtml: string;
  pinnedVersionRetained: number | null;
}

export interface ReadingFeedEntry {
  source: "own" | "imported";
  kind: "fragment" | "thread";
  withdrawn: boolean;
  l0: boolean;
  contentHtml: string;
  displayAt: string;
  own?: OwnEntryInput;
  imported?: ImportedEntryInput;
}

export function buildReadingFeed(own: OwnEntryInput[], imported: ImportedEntryInput[]): ReadingFeedEntry[] {
  const entries: ReadingFeedEntry[] = [];
  for (const o of own) {
    entries.push({ source: "own", kind: o.kind, withdrawn: o.withdrawn, l0: false, contentHtml: o.contentHtml, displayAt: o.updated, own: o });
  }
  for (const i of imported) {
    entries.push({
      source: "imported",
      kind: i.kind,
      withdrawn: i.withdrawn,
      l0: i.l0,
      contentHtml: i.contentHtml,
      displayAt: clampDisplayAt(i.updated, i.observedAt),
      imported: i,
    });
  }
  // Sort on parsed instants, not on the strings. `pubDate` is normalized at
  // the parse boundary now, but rows imported before that are still stored in
  // their origin's own format, and a lexicographic compare of those sorts by
  // day-of-week name — which is exactly how this feed came to run Jul 1, Jul
  // 28, Jul 9, Jul 12, Jul 5 (Wed > Tue > Thu > Sun > Sun). Comparing
  // instants makes the order correct regardless of what shape reached the DB.
  entries.sort((a, b) => Date.parse(b.displayAt) - Date.parse(a.displayAt));
  return entries;
}
