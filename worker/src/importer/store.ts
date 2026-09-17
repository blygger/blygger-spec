// D1 access for the subscribe side (migration 0004) — the importer-side
// counterpart to ../model.ts, which owns the publish side's items/versions.

import type { HopperItemRow, HopperRow, ImportedItemRow, SignalRow, SubscriptionRow } from "../types.ts";
import { newId, nowIso } from "../util.ts";
import type { LocalState, TransitionEffect } from "./transition.ts";

const FLAG_LOG_CAP = 20;

export async function createSubscription(
  db: D1Database,
  row: { kind: "blyg" | "rss"; origin: string; feedUrl: string; title: string },
): Promise<SubscriptionRow> {
  const id = newId();
  const created = nowIso();
  await db
    .prepare(
      "INSERT INTO subscriptions (id, kind, origin, feed_url, title, status, fail_count, in_blogroll, flags, created) VALUES (?, ?, ?, ?, ?, 'active', 0, 0, '[]', ?)",
    )
    .bind(id, row.kind, row.origin, row.feedUrl, row.title, created)
    .run();
  return (await getSubscription(db, id))!;
}

export async function getSubscription(db: D1Database, id: string): Promise<SubscriptionRow | null> {
  return db.prepare("SELECT * FROM subscriptions WHERE id = ?").bind(id).first<SubscriptionRow>();
}

export async function listSubscriptions(db: D1Database): Promise<SubscriptionRow[]> {
  return (await db.prepare("SELECT * FROM subscriptions ORDER BY created ASC").all<SubscriptionRow>()).results;
}

/** Subscriptions flagged for the public blogroll (§2.2), active only. */
export async function listBlogrollSubscriptions(db: D1Database): Promise<SubscriptionRow[]> {
  return (
    await db
      .prepare("SELECT * FROM subscriptions WHERE in_blogroll = 1 AND status != 'paused' ORDER BY title ASC")
      .all<SubscriptionRow>()
  ).results;
}

/** Cascades imports, hopper memberships, and signals — local data only, nothing was ever re-emitted publicly (§4.1). */
export async function deleteSubscription(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM hopper_items WHERE subscription_id = ?").bind(id),
    db.prepare("DELETE FROM signals WHERE subscription_id = ?").bind(id),
    db.prepare("DELETE FROM imported_items WHERE subscription_id = ?").bind(id),
    db.prepare("DELETE FROM subscriptions WHERE id = ?").bind(id),
  ]);
}

export async function setSubscriptionStatus(db: D1Database, id: string, status: "active" | "paused" | "degraded"): Promise<void> {
  await db.prepare("UPDATE subscriptions SET status = ? WHERE id = ?").bind(status, id).run();
}

export async function setBlogrollFlag(db: D1Database, id: string, inBlogroll: boolean): Promise<void> {
  await db.prepare("UPDATE subscriptions SET in_blogroll = ? WHERE id = ?").bind(inBlogroll ? 1 : 0, id).run();
}

export async function setSubscriptionTitle(db: D1Database, id: string, title: string): Promise<void> {
  await db.prepare("UPDATE subscriptions SET title = ? WHERE id = ?").bind(title, id).run();
}

/** A successful poll (including 304): resets failure state, un-degrades. */
export async function recordPollSuccess(
  db: D1Database,
  id: string,
  patch: { etag?: string | null; lastModified?: string | null; newestGuid?: string | null },
): Promise<void> {
  await db
    .prepare(
      "UPDATE subscriptions SET last_poll_at = ?, etag = ?, last_modified = ?, newest_guid = COALESCE(?, newest_guid), fail_count = 0, status = CASE WHEN status = 'degraded' THEN 'active' ELSE status END WHERE id = ?",
    )
    .bind(nowIso(), patch.etag ?? null, patch.lastModified ?? null, patch.newestGuid ?? null, id)
    .run();
}

/**
 * A failed poll (network/HTTP error): exponential backoff is the scheduler's
 * job (computed from fail_count + last_poll_at, §3.2) — this just advances
 * the counter and, past DEGRADE_THRESHOLD, marks the subscription degraded.
 * Never touches imported_items.
 */
export const DEGRADE_THRESHOLD = 5;

export async function recordPollFailure(db: D1Database, id: string): Promise<number> {
  const row = await db.prepare("UPDATE subscriptions SET last_poll_at = ?, fail_count = fail_count + 1 WHERE id = ? RETURNING fail_count")
    .bind(nowIso(), id)
    .first<{ fail_count: number }>();
  const failCount = row?.fail_count ?? 1;
  if (failCount >= DEGRADE_THRESHOLD) await setSubscriptionStatus(db, id, "degraded");
  return failCount;
}

export async function recordIndexSync(db: D1Database, id: string): Promise<void> {
  await db.prepare("UPDATE subscriptions SET last_index_sync_at = ? WHERE id = ?").bind(nowIso(), id).run();
}

export interface FlagEntry {
  type: string;
  at: string;
  detail?: string;
}

/** Append a discrepancy-log entry (subs UI, §4.2), deduping immediate repeats and capping log length. */
export async function appendFlag(db: D1Database, id: string, type: string, detail?: string): Promise<void> {
  const sub = await getSubscription(db, id);
  if (!sub) return;
  let flags: FlagEntry[];
  try {
    flags = JSON.parse(sub.flags);
    if (!Array.isArray(flags)) flags = [];
  } catch {
    flags = [];
  }
  const last = flags[flags.length - 1];
  if (last && last.type === type && last.detail === detail) return;
  flags.push({ type, at: nowIso(), detail });
  if (flags.length > FLAG_LOG_CAP) flags = flags.slice(flags.length - FLAG_LOG_CAP);
  await db.prepare("UPDATE subscriptions SET flags = ? WHERE id = ?").bind(JSON.stringify(flags), id).run();
}

export async function getImportedItem(db: D1Database, subscriptionId: string, remoteId: string): Promise<ImportedItemRow | null> {
  return db
    .prepare("SELECT * FROM imported_items WHERE subscription_id = ? AND remote_id = ?")
    .bind(subscriptionId, remoteId)
    .first<ImportedItemRow>();
}

export async function listImportedItems(db: D1Database, subscriptionId: string): Promise<ImportedItemRow[]> {
  return (
    await db
      .prepare("SELECT * FROM imported_items WHERE subscription_id = ? ORDER BY observed_at DESC")
      .bind(subscriptionId)
      .all<ImportedItemRow>()
  ).results;
}

/** Every import across every subscription — the merged reading feed's raw material (§3.6). */
export async function listAllImportedItems(db: D1Database): Promise<ImportedItemRow[]> {
  return (await db.prepare("SELECT * FROM imported_items ORDER BY observed_at DESC").all<ImportedItemRow>()).results;
}

/** Local reconciliation state for one remote item, as the pure transition() function expects it. */
export function toLocalState(row: ImportedItemRow | null): LocalState {
  if (!row) return { status: "absent" };
  return row.state === "tombstone" ? { status: "tombstone", version: row.version } : { status: "current", version: row.version };
}

/**
 * Apply a transition() effect to imported_items. `retainPinnedVersion`
 * (task 10, §3.4) overrides a plain rollup-null's content wipe when the
 * withdrawn version is confirmed pinned on the origin — the caller does
 * that pin check itself (a separate fetch) before calling this.
 */
export async function applyEffect(
  db: D1Database,
  subscriptionId: string,
  remoteId: string,
  effect: TransitionEffect,
  observedAt: string,
  opts: { l0?: boolean; retainPinnedVersion?: number } = {},
): Promise<void> {
  const l0 = opts.l0 ? 1 : 0;
  switch (effect.type) {
    case "import": {
      const d = effect.doc;
      await db
        .prepare(
          `INSERT INTO imported_items
           (subscription_id, remote_id, kind, state, version, created, updated, observed_at, content_md, content_html, content_hash, author_json, media_json, transclusions_json, l0, pinned_version_retained, page)
           VALUES (?, ?, ?, 'current', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
        )
        .bind(
          subscriptionId, remoteId, d.kind, d.version, d.created, d.updated, observedAt,
          d.content_md, d.content_html, d.content_hash,
          JSON.stringify(d.author ?? null), JSON.stringify(d.media ?? []),
          d.transclusions ? JSON.stringify(d.transclusions) : null, l0,
          d.page ?? null,
        )
        .run();
      return;
    }
    case "record-tombstone": {
      // Authored kind is unknowable from a withdrawal endcap alone (§9 carries
      // no memory of it) when this is the first time we've ever seen the
      // item — 'fragment' is a harmless display default; content is empty
      // either way, and a later return (reimport) corrects it for real.
      await db
        .prepare(
          `INSERT INTO imported_items
           (subscription_id, remote_id, kind, state, version, created, updated, observed_at, content_md, content_html, content_hash, author_json, media_json, transclusions_json, l0, pinned_version_retained)
           VALUES (?, ?, 'fragment', 'tombstone', ?, NULL, ?, ?, '', '', NULL, NULL, NULL, NULL, ?, NULL)
           ON CONFLICT (subscription_id, remote_id) DO UPDATE SET
             state = 'tombstone', version = excluded.version, updated = excluded.updated, observed_at = excluded.observed_at,
             content_md = '', content_html = '', content_hash = NULL, author_json = NULL, media_json = NULL, transclusions_json = NULL,
             pinned_version_retained = NULL`,
        )
        .bind(subscriptionId, remoteId, effect.version, effect.updated, observedAt, l0)
        .run();
      return;
    }
    case "update": {
      const d = effect.doc;
      await db
        .prepare(
          `UPDATE imported_items SET kind = ?, version = ?, updated = ?, observed_at = ?,
           content_md = ?, content_html = ?, content_hash = ?, author_json = ?, media_json = ?, transclusions_json = ?,
           page = COALESCE(?, page)
           WHERE subscription_id = ? AND remote_id = ?`,
        )
        .bind(
          d.kind, d.version, d.updated, observedAt,
          d.content_md, d.content_html, d.content_hash,
          JSON.stringify(d.author ?? null), JSON.stringify(d.media ?? []),
          d.transclusions ? JSON.stringify(d.transclusions) : null,
          d.page ?? null,
          subscriptionId, remoteId,
        )
        .run();
      return;
    }
    case "rollup-null": {
      if (opts.retainPinnedVersion !== undefined) {
        await db
          .prepare(
            "UPDATE imported_items SET state = 'tombstone', version = ?, updated = ?, observed_at = ?, pinned_version_retained = ? WHERE subscription_id = ? AND remote_id = ?",
          )
          .bind(effect.version, effect.updated, observedAt, opts.retainPinnedVersion, subscriptionId, remoteId)
          .run();
        return;
      }
      await db
        .prepare(
          `UPDATE imported_items SET state = 'tombstone', version = ?, updated = ?, observed_at = ?,
           content_md = '', content_html = '', content_hash = NULL, author_json = NULL, media_json = NULL, transclusions_json = NULL, pinned_version_retained = NULL
           WHERE subscription_id = ? AND remote_id = ?`,
        )
        .bind(effect.version, effect.updated, observedAt, subscriptionId, remoteId)
        .run();
      return;
    }
    case "reimport": {
      const d = effect.doc;
      await db
        .prepare(
          `UPDATE imported_items SET state = 'current', kind = ?, version = ?, updated = ?, observed_at = ?,
           content_md = ?, content_html = ?, content_hash = ?, author_json = ?, media_json = ?, transclusions_json = ?, pinned_version_retained = NULL,
           page = COALESCE(?, page)
           WHERE subscription_id = ? AND remote_id = ?`,
        )
        .bind(
          d.kind, d.version, d.updated, observedAt,
          d.content_md, d.content_html, d.content_hash,
          JSON.stringify(d.author ?? null), JSON.stringify(d.media ?? []),
          d.transclusions ? JSON.stringify(d.transclusions) : null,
          d.page ?? null,
          subscriptionId, remoteId,
        )
        .run();
      return;
    }
    case "adopt-stealth": {
      const d = effect.doc;
      await db
        .prepare(
          `UPDATE imported_items SET content_md = ?, content_html = ?, content_hash = ?, author_json = ?, media_json = ?, transclusions_json = ?, observed_at = ?,
           page = COALESCE(?, page)
           WHERE subscription_id = ? AND remote_id = ?`,
        )
        .bind(
          d.content_md, d.content_html, d.content_hash,
          JSON.stringify(d.author ?? null), JSON.stringify(d.media ?? []),
          d.transclusions ? JSON.stringify(d.transclusions) : null,
          observedAt, d.page ?? null, subscriptionId, remoteId,
        )
        .run();
      return;
    }
    case "noop":
    case "ignore":
      return;
  }
}

/** Insert-or-update an L0 (legacy RSS) synthetic item (§3.5) — always kind='fragment', state='current', l0=1. */
export async function upsertL0Item(
  db: D1Database,
  subscriptionId: string,
  remoteId: string,
  row: { version: number; created: string; updated: string; observedAt: string; contentMd: string; contentHtml: string; contentHash: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO imported_items
       (subscription_id, remote_id, kind, state, version, created, updated, observed_at, content_md, content_html, content_hash, author_json, media_json, transclusions_json, l0, pinned_version_retained)
       VALUES (?, ?, 'fragment', 'current', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 1, NULL)
       ON CONFLICT (subscription_id, remote_id) DO UPDATE SET
         version = excluded.version, updated = excluded.updated, observed_at = excluded.observed_at,
         content_md = excluded.content_md, content_html = excluded.content_html, content_hash = excluded.content_hash`,
    )
    .bind(subscriptionId, remoteId, row.version, row.created, row.updated, row.observedAt, row.contentMd, row.contentHtml, row.contentHash)
    .run();
}

/**
 * Rewrite an L0 item's `created`/`updated` in place — no version bump, no
 * `observed_at` bump. Used to heal rows stored before feed dates were
 * normalized: their content is unchanged (so the poll loop skips them and
 * they would otherwise keep their origin's raw date format forever), and a
 * date-format repair is not an edit the subscriber made or we observed.
 */
export async function repairL0ItemDates(
  db: D1Database,
  subscriptionId: string,
  remoteId: string,
  dates: { created: string | null; updated: string | null },
): Promise<void> {
  await db
    .prepare("UPDATE imported_items SET created = ?, updated = ? WHERE subscription_id = ? AND remote_id = ?")
    .bind(dates.created, dates.updated, subscriptionId, remoteId)
    .run();
}

// --- Hoppers (task 10 CRUD lands later; store primitives live here alongside the rest of the D1 access layer) ---

export async function createHopper(db: D1Database, name: string, slug: string | null): Promise<HopperRow> {
  const id = newId();
  const created = nowIso();
  await db.prepare("INSERT INTO hoppers (id, name, slug, public, created) VALUES (?, ?, ?, 0, ?)").bind(id, name, slug, created).run();
  return (await getHopper(db, id))!;
}

export async function getHopper(db: D1Database, id: string): Promise<HopperRow | null> {
  return db.prepare("SELECT * FROM hoppers WHERE id = ?").bind(id).first<HopperRow>();
}

export async function getHopperBySlug(db: D1Database, slug: string): Promise<HopperRow | null> {
  return db.prepare("SELECT * FROM hoppers WHERE slug = ?").bind(slug).first<HopperRow>();
}

export async function listHoppers(db: D1Database): Promise<HopperRow[]> {
  return (await db.prepare("SELECT * FROM hoppers ORDER BY created ASC").all<HopperRow>()).results;
}

export async function setHopperPublic(db: D1Database, id: string, isPublic: boolean): Promise<void> {
  // Publishing latches slug_frozen; un-publishing never clears it. Once a
  // /h/{slug}/ URL has existed, it stays the hopper's address (migration 0006).
  await db
    .prepare("UPDATE hoppers SET public = ?, slug_frozen = MAX(slug_frozen, ?) WHERE id = ?")
    .bind(isPublic ? 1 : 0, isPublic ? 1 : 0, id)
    .run();
}

/** Rename a hopper, optionally re-deriving its slug (callers must honour slug_frozen — see the API layer). */
export async function renameHopper(db: D1Database, id: string, name: string, slug: string | null): Promise<void> {
  await db.prepare("UPDATE hoppers SET name = ?, slug = ? WHERE id = ?").bind(name, slug, id).run();
}

export async function deleteHopper(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM hopper_items WHERE hopper_id = ?").bind(id),
    db.prepare("DELETE FROM hoppers WHERE id = ?").bind(id),
  ]);
}

export async function addHopperItem(db: D1Database, hopperId: string, subscriptionId: string, remoteId: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO hopper_items (hopper_id, subscription_id, remote_id, added_at) VALUES (?, ?, ?, ?)")
    .bind(hopperId, subscriptionId, remoteId, nowIso())
    .run();
}

export async function removeHopperItem(db: D1Database, hopperId: string, subscriptionId: string, remoteId: string): Promise<void> {
  await db
    .prepare("DELETE FROM hopper_items WHERE hopper_id = ? AND subscription_id = ? AND remote_id = ?")
    .bind(hopperId, subscriptionId, remoteId)
    .run();
}

export async function listHopperItems(db: D1Database, hopperId: string): Promise<HopperItemRow[]> {
  return (
    await db.prepare("SELECT * FROM hopper_items WHERE hopper_id = ? ORDER BY added_at DESC").bind(hopperId).all<HopperItemRow>()
  ).results;
}

/** Every hopper (id, name, slug) a given imported item belongs to. */
export async function listHoppersForItem(db: D1Database, subscriptionId: string, remoteId: string): Promise<HopperRow[]> {
  return (
    await db
      .prepare(
        `SELECT h.* FROM hoppers h
         JOIN hopper_items hi ON hi.hopper_id = h.id
         WHERE hi.subscription_id = ? AND hi.remote_id = ?`,
      )
      .bind(subscriptionId, remoteId)
      .all<HopperRow>()
  ).results;
}

export async function setSignal(db: D1Database, subscriptionId: string, remoteId: string, thumb: 1 | -1): Promise<void> {
  await db
    .prepare(
      "INSERT INTO signals (subscription_id, remote_id, thumb, at) VALUES (?, ?, ?, ?) ON CONFLICT(subscription_id, remote_id) DO UPDATE SET thumb = excluded.thumb, at = excluded.at",
    )
    .bind(subscriptionId, remoteId, thumb, nowIso())
    .run();
}

export async function getSignal(db: D1Database, subscriptionId: string, remoteId: string): Promise<SignalRow | null> {
  return db
    .prepare("SELECT * FROM signals WHERE subscription_id = ? AND remote_id = ?")
    .bind(subscriptionId, remoteId)
    .first<SignalRow>();
}

export async function deleteSignal(db: D1Database, subscriptionId: string, remoteId: string): Promise<void> {
  await db.prepare("DELETE FROM signals WHERE subscription_id = ? AND remote_id = ?").bind(subscriptionId, remoteId).run();
}
