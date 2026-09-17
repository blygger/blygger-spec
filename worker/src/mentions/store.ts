// D1 access for Webmention — v0.3-plan §2.3/§4.1, decision #28. Two queues
// that never mix: `mentions_out` is what we told other people, `mentions_in`
// is what other people told us. An inbound row is a *pointer* — source
// identity, relation, and where to find it — never any of their content.

import type { MentionInRow, MentionOutRow, MentionRelation } from "../types.ts";
import { newId, nowIso } from "../util.ts";

// §2.3.4. After the last step a row is `failed`; 4xx (except 429) skips
// straight there, and a missing endpoint never retries at all.
export const RETRY_SCHEDULE_MS = [15 * 60_000, 60 * 60_000, 4 * 60 * 60_000, 12 * 60 * 60_000, 24 * 60 * 60_000];

/** Rate limit (§2.3.5): at most this many mentions from one source host per hour, whatever their status. */
export const INBOUND_HOURLY_LIMIT = 60;

export function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * Queue one outbound mention. Keyed on (item_id, target): a republish updates
 * the row back to `pending` at the new version rather than duplicating it,
 * which is how §2.3.3's "re-send when new or changed" is implemented.
 */
export async function enqueueOutbound(db: D1Database, itemId: string, version: number, target: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO mentions_out (id, item_id, version, target, endpoint, status, attempts, next_attempt_at, last_error, created)
       VALUES (?, ?, ?, ?, NULL, 'pending', 0, NULL, NULL, ?)
       ON CONFLICT (item_id, target) DO UPDATE SET
         version = excluded.version, status = 'pending', attempts = 0, next_attempt_at = NULL, last_error = NULL`,
    )
    .bind(newId(), itemId, version, target, nowIso())
    .run();
}

/** Pending rows whose next attempt is due (or which have never been attempted). */
export async function dueOutbound(db: D1Database, now: string = nowIso(), limit = 50): Promise<MentionOutRow[]> {
  const rows = await db
    .prepare(
      `SELECT * FROM mentions_out
       WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
       ORDER BY created LIMIT ?`,
    )
    .bind(now, limit)
    .all<MentionOutRow>();
  return rows.results;
}

export async function markOutbound(
  db: D1Database,
  id: string,
  patch: { status: MentionOutRow["status"]; endpoint?: string | null; attempts?: number; nextAttemptAt?: string | null; error?: string | null },
): Promise<void> {
  await db
    .prepare(
      `UPDATE mentions_out SET status = ?, endpoint = COALESCE(?, endpoint), attempts = COALESCE(?, attempts),
       next_attempt_at = ?, last_error = ? WHERE id = ?`,
    )
    .bind(patch.status, patch.endpoint ?? null, patch.attempts ?? null, patch.nextAttemptAt ?? null, patch.error ?? null, id)
    .run();
}

export async function listOutbound(db: D1Database, limit = 100): Promise<MentionOutRow[]> {
  const rows = await db.prepare("SELECT * FROM mentions_out ORDER BY created DESC LIMIT ?").bind(limit).all<MentionOutRow>();
  return rows.results;
}

/**
 * Record an inbound claim as `pending` (§2.3.5 step 3). A re-sent mention
 * re-verifies rather than duplicating: the row is keyed (source, target), and
 * `first_seen` is preserved so "they have been pointing here since…" survives.
 */
export async function upsertInbound(
  db: D1Database,
  source: string,
  target: string,
  targetItemId: string,
  now: string = nowIso(),
): Promise<MentionInRow> {
  await db
    .prepare(
      `INSERT INTO mentions_in (id, source, target, target_item_id, status, first_seen, last_seen, attempts)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, 0)
       ON CONFLICT (source, target) DO UPDATE SET
         status = 'pending', last_seen = excluded.last_seen, target_item_id = excluded.target_item_id,
         attempts = mentions_in.attempts + 1, error = NULL`,
    )
    .bind(newId(), source, target, targetItemId, now, now)
    .run();
  return (await db.prepare("SELECT * FROM mentions_in WHERE source = ? AND target = ?").bind(source, target).first<MentionInRow>())!;
}

export async function markInboundVerified(
  db: D1Database,
  id: string,
  found: {
    relation: MentionRelation;
    sourceOrigin: string;
    sourceId: string;
    sourceKind: string;
    sourceVersion: number;
    authorJson: string | null;
    sourcePage: string;
  },
  now: string = nowIso(),
): Promise<void> {
  await db
    .prepare(
      `UPDATE mentions_in SET status = 'verified', relation = ?, source_origin = ?, source_id = ?, source_kind = ?,
       source_version = ?, source_author_json = ?, source_page = ?, verified_at = ?, error = NULL WHERE id = ?`,
    )
    .bind(found.relation, found.sourceOrigin, found.sourceId, found.sourceKind, found.sourceVersion, found.authorJson, found.sourcePage, now, id)
    .run();
}

/**
 * A claim that does not verify. `gone` is deliberately not a delete (W3C
 * suggests one): keeping the row means a stubber who withdraws and later
 * republishes is recognized as the same relationship rather than as new.
 */
export async function markInboundUnverified(
  db: D1Database,
  id: string,
  status: "failed" | "gone",
  error: string,
): Promise<void> {
  await db.prepare("UPDATE mentions_in SET status = ?, error = ? WHERE id = ?").bind(status, error, id).run();
}

/** Verified inbound mentions, newest first — the detect-stubs feed (§3.3). */
export async function listVerifiedInbound(db: D1Database, limit = 200): Promise<MentionInRow[]> {
  const rows = await db
    .prepare("SELECT * FROM mentions_in WHERE status IN ('verified','gone') ORDER BY verified_at DESC, last_seen DESC LIMIT ?")
    .bind(limit)
    .all<MentionInRow>();
  return rows.results;
}

export async function getInbound(db: D1Database, id: string): Promise<MentionInRow | null> {
  return db.prepare("SELECT * FROM mentions_in WHERE id = ?").bind(id).first<MentionInRow>();
}

/** Mentions seen from one source host in the last hour — the §2.3.5 rate-limit input. */
export async function countRecentFromHost(db: D1Database, host: string, now: number = Date.now()): Promise<number> {
  const cutoff = new Date(now - 60 * 60_000).toISOString();
  const rows = await db.prepare("SELECT source FROM mentions_in WHERE last_seen >= ?").bind(cutoff).all<{ source: string }>();
  return rows.results.filter((r) => hostOf(r.source) === host).length;
}
