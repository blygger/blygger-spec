// Index reconciler + poll cycle — v0.2-plan.md §3.1/§3.2, locked decision
// #18. The archive index is the reconciliation surface; the feed is a cheap
// trigger. See §3.1's three invariants: item documents are ground truth,
// the watermark never silently regresses, and retention past withdrawal
// follows the origin's own serving surface (task 10 layers that last one on
// top of rollup-null via `applyEffect`'s `retainPinnedVersion`).

import { contentHash, nowIso } from "../util.ts";
import { parseFeed } from "./feed.ts";
import type { FetchLike, FetchResult } from "./http.ts";
import { platformFetch } from "./http.ts";
import { pollL0Subscription } from "./l0.ts";
import { appendFlag, applyEffect, getImportedItem, listHoppersForItem, recordIndexSync, recordPollFailure, recordPollSuccess, toLocalState } from "./store.ts";
import { transition } from "./transition.ts";
import { mapLimit } from "./util.ts";
import type { SubscriptionRow } from "../types.ts";

const INDEX_SYNC_PERIOD_MS = 24 * 3600 * 1000;
const RECONCILE_CONCURRENCY = 4;

/**
 * Fetch one item document and run it through the transition function,
 * persisting the effect and any discrepancy flags. Shared by the feed
 * trigger-set loop and index reconciliation — both just differ in how they
 * discover candidate (remoteId, itemUrl) pairs.
 */
async function processItemCandidate(
  db: D1Database,
  sub: SubscriptionRow,
  fetchFn: FetchLike,
  remoteId: string,
  itemUrl: string,
  observedAt: string,
): Promise<{ processed: boolean }> {
  let res: FetchResult;
  try {
    res = await fetchFn(itemUrl);
  } catch {
    return { processed: false };
  }
  if (!res.ok) return { processed: false };
  let raw: unknown;
  try {
    raw = JSON.parse(await res.text());
  } catch {
    await appendFlag(db, sub.id, "unparseable", remoteId);
    return { processed: false };
  }
  const localRow = await getImportedItem(db, sub.id, remoteId);
  const local = toLocalState(localRow);
  const result = transition({ local, doc: raw, storedContentHash: localRow?.content_hash ?? undefined });
  for (const flag of result.flags) await appendFlag(db, sub.id, flag, remoteId);
  // §3.3 notes: content_hash SHOULD be verified against content_md on import —
  // an integrity check on the origin's own claim, not a security boundary;
  // content is adopted either way (transition() already decided that).
  if ("doc" in result.effect) {
    const expected = await contentHash(result.effect.doc.content_md);
    if (result.effect.doc.content_hash && result.effect.doc.content_hash !== expected) {
      await appendFlag(db, sub.id, "hash-mismatch", remoteId);
    }
  }
  if (result.effect.type === "rollup-null" && localRow) {
    const retainPinnedVersion = await pinnedVersionToRetain(db, sub, fetchFn, remoteId, localRow.version);
    await applyEffect(db, sub.id, remoteId, result.effect, observedAt, { retainPinnedVersion });
  } else {
    await applyEffect(db, sub.id, remoteId, result.effect, observedAt);
  }
  return { processed: true };
}

/**
 * §3.4: on withdrawal roll-up, hopper entries downgrade to a placeholder —
 * *unless* the snapshot version is confirmed pinned on the origin, in which
 * case retention is conformant (invariant 3). Only checked for hopper-
 * tracked items (the only place this distinction is user-visible); one
 * extra fetch, at withdrawal-processing time only.
 */
async function pinnedVersionToRetain(
  db: D1Database,
  sub: SubscriptionRow,
  fetchFn: FetchLike,
  remoteId: string,
  lastKnownVersion: number,
): Promise<number | undefined> {
  const hoppers = await listHoppersForItem(db, sub.id, remoteId);
  if (!hoppers.length) return undefined;
  try {
    const res = await fetchFn(`${sub.origin}items/${remoteId}/v${lastKnownVersion}.json`);
    return res.ok ? lastKnownVersion : undefined;
  } catch {
    return undefined;
  }
}

/** Full index diff (§3.1): total reconciliation, recovers losslessly from any gap regardless of cause. */
export async function reconcileIndex(db: D1Database, sub: SubscriptionRow, fetchFn: FetchLike = platformFetch): Promise<{ ok: boolean; changed: number }> {
  let res: FetchResult;
  try {
    res = await fetchFn(`${sub.origin}items/index.json`);
  } catch {
    return { ok: false, changed: 0 };
  }
  if (!res.ok) {
    // A 404 on items/index.json from an otherwise-live blyg is a nonconforming
    // publisher — fall back to feed-window-only operation (the caller's feed
    // pass already ran independently of this), flag it once.
    if (res.status === 404) await appendFlag(db, sub.id, "lossy-mode", "items/index.json 404");
    return { ok: false, changed: 0 };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await res.text());
  } catch {
    return { ok: false, changed: 0 };
  }
  const items = Array.isArray((parsed as Record<string, unknown>)?.items) ? ((parsed as Record<string, unknown>).items as unknown[]) : [];
  const candidates: { id: string }[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    if (typeof it.id !== "string" || typeof it.version !== "number") continue;
    const local = await getImportedItem(db, sub.id, it.id);
    const watermark = local ? local.version : 0;
    if (it.version > watermark) candidates.push({ id: it.id });
  }
  const observedAt = nowIso();
  const outcomes = await mapLimit(candidates, RECONCILE_CONCURRENCY, async (c) => {
    const r = await processItemCandidate(db, sub, fetchFn, c.id, `${sub.origin}items/${c.id}.json`, observedAt);
    return r.processed;
  });
  await recordIndexSync(db, sub.id);
  return { ok: true, changed: outcomes.filter(Boolean).length };
}

export interface PollResult {
  outcome: "not-modified" | "polled" | "failed" | "skipped";
  itemsFetched: number;
  reconciled: boolean;
}

/** One §3.2 poll cycle for a single subscription. `sub.kind === "rss"` defers entirely to the L0 wrapper (§3.5). */
export async function pollSubscription(db: D1Database, sub: SubscriptionRow, fetchFn: FetchLike = platformFetch): Promise<PollResult> {
  if (sub.kind !== "blyg") {
    const r = await pollL0Subscription(db, sub, fetchFn);
    return { outcome: r.outcome, itemsFetched: r.itemsChanged, reconciled: false };
  }

  const headers: Record<string, string> = {};
  if (sub.etag) headers["If-None-Match"] = sub.etag;
  if (sub.last_modified) headers["If-Modified-Since"] = sub.last_modified;

  let res: FetchResult;
  try {
    res = await fetchFn(sub.feed_url, { headers });
  } catch {
    // Failure path: never touch imported_items, only the subscription's own bookkeeping.
    await recordPollFailure(db, sub.id);
    return { outcome: "failed", itemsFetched: 0, reconciled: false };
  }

  if (res.status === 304) {
    await recordPollSuccess(db, sub.id, { etag: sub.etag, lastModified: sub.last_modified });
    return { outcome: "not-modified", itemsFetched: 0, reconciled: false };
  }
  if (!res.ok) {
    await recordPollFailure(db, sub.id);
    return { outcome: "failed", itemsFetched: 0, reconciled: false };
  }

  const wasDegraded = sub.status === "degraded";
  const etag = res.headers.get("ETag");
  const lastModified = res.headers.get("Last-Modified");
  const body = await res.text();
  const parsed = parseFeed(body);
  const observedAt = nowIso();

  let itemsFetched = 0;
  let triggeredAny = false;
  let newestGuid: string | null = null;

  if (parsed.ok) {
    newestGuid = parsed.entries[0]?.guid ?? null;
    for (const entry of parsed.entries) {
      // Entries without blyg:* on a blyg subscription are ignored (§3.2 step 2).
      if (!entry.blyg) continue;
      const local = await getImportedItem(db, sub.id, entry.blyg.id);
      const watermark = local ? local.version : 0;
      const stale = entry.blyg.version === undefined || entry.blyg.version > watermark;
      if (!stale) continue;
      triggeredAny = true;
      const itemUrl = entry.blyg.itemUrl || `${sub.origin}items/${entry.blyg.id}.json`;
      const r = await processItemCandidate(db, sub, fetchFn, entry.blyg.id, itemUrl, observedAt);
      if (r.processed) itemsFetched++;
    }
  }

  // Gap check + the other unconditional reconciliation triggers (§3.2 step 4).
  const gap = !!sub.newest_guid && parsed.ok && !parsed.entries.some((e) => e.guid === sub.newest_guid);
  const periodicOrFirstSync = !sub.last_index_sync_at || Date.now() - Date.parse(sub.last_index_sync_at) >= INDEX_SYNC_PERIOD_MS;
  const shouldReconcile = !parsed.ok || (gap && triggeredAny) || periodicOrFirstSync || wasDegraded;

  let reconciled = false;
  if (shouldReconcile) {
    const r = await reconcileIndex(db, sub, fetchFn);
    reconciled = r.ok;
    itemsFetched += r.changed;
  }

  await recordPollSuccess(db, sub.id, { etag, lastModified, newestGuid });
  return { outcome: "polled", itemsFetched, reconciled };
}
