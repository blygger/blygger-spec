// Data access + publish-flow semantics — v0.1-plan §3.1.

import type { ItemRow, MediaRow, Settings, VersionRow } from "./types.ts";
import { contentHash, newId, nowIso } from "./util.ts";

export async function getSettings(db: D1Database): Promise<Settings> {
  const rows = await db.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  const map = Object.fromEntries(rows.results.map((r) => [r.key, r.value]));
  let links: Settings["author_links"] = [];
  try {
    const parsed = JSON.parse(map.author_links ?? "[]");
    if (Array.isArray(parsed)) links = parsed;
  } catch {
    // ignore malformed settings JSON; treat as no links
  }
  return {
    site_title: map.site_title ?? "ygg",
    author_name: map.author_name ?? "",
    author_bio: map.author_bio ?? "",
    author_links: links,
    site_url: map.site_url ?? "",
    avatar_media_id: map.avatar_media_id ?? "",
  };
}

export async function putSettings(db: D1Database, patch: Partial<Record<string, string>>): Promise<void> {
  const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  const batch = Object.entries(patch)
    .filter(([, v]) => typeof v === "string")
    .map(([k, v]) => stmt.bind(k, v));
  if (batch.length) await db.batch(batch);
}

export async function getItem(db: D1Database, id: string): Promise<ItemRow | null> {
  return db.prepare("SELECT * FROM items WHERE id = ?").bind(id).first<ItemRow>();
}

export async function createDraft(db: D1Database, contentMd: string): Promise<ItemRow> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare("INSERT INTO items (id, kind, status, created, updated, version, content_md, dirty) VALUES (?, 'fragment', 'draft', ?, ?, 0, ?, 1)")
    .bind(id, now, now, contentMd)
    .run();
  return (await getItem(db, id))!;
}

/** Save the working copy. Does not touch `updated` for ever-published items — that field is publish-facing. */
export async function saveWorkingCopy(db: D1Database, id: string, contentMd: string): Promise<void> {
  await db
    .prepare("UPDATE items SET content_md = ?, dirty = 1, updated = CASE WHEN version = 0 THEN ? ELSE updated END WHERE id = ?")
    .bind(contentMd, nowIso(), id)
    .run();
}

/** Publish the working copy as version N+1. */
export async function publish(db: D1Database, item: ItemRow, note: string | null): Promise<number> {
  const now = nowIso();
  const version = item.version + 1;
  const hash = await contentHash(item.content_md);
  await db.batch([
    db.prepare("INSERT INTO versions (item_id, version, content_md, content_hash, published_at, note) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(item.id, version, item.content_md, hash, now, note),
    db.prepare("UPDATE items SET status = 'public', kind = 'fragment', version = ?, dirty = 0, updated = ? WHERE id = ?")
      .bind(version, now, item.id),
  ]);
  return version;
}

/** Retract from all public surfaces; version history retained. */
export async function unpublish(db: D1Database, id: string): Promise<void> {
  await db.prepare("UPDATE items SET status = 'draft' WHERE id = ?").bind(id).run();
}

/**
 * Delete. Published items become permanent tombstones (version bump, empty
 * content, changelog retained). Never-published drafts are hard-deleted.
 */
export async function deleteItem(db: D1Database, item: ItemRow): Promise<"tombstoned" | "discarded"> {
  if (item.version === 0) {
    await db.batch([
      db.prepare("DELETE FROM items WHERE id = ?").bind(item.id),
      db.prepare("DELETE FROM media WHERE item_id = ?").bind(item.id),
    ]);
    return "discarded";
  }
  const now = nowIso();
  const version = item.version + 1;
  const hash = await contentHash("");
  await db.batch([
    db.prepare("INSERT INTO versions (item_id, version, content_md, content_hash, published_at, note) VALUES (?, ?, '', ?, ?, NULL)")
      .bind(item.id, version, hash, now),
    db.prepare("UPDATE items SET status = 'deleted', kind = 'tombstone', version = ?, content_md = '', dirty = 0, updated = ? WHERE id = ?")
      .bind(version, now, item.id),
  ]);
  return "tombstoned";
}

/** Published items + tombstones, newest `updated` first (public surfaces). */
export async function listPublic(db: D1Database, limit?: number): Promise<ItemRow[]> {
  const sql = "SELECT * FROM items WHERE status IN ('public','deleted') ORDER BY updated DESC" + (limit ? " LIMIT ?" : "");
  const stmt = limit ? db.prepare(sql).bind(limit) : db.prepare(sql);
  return (await stmt.all<ItemRow>()).results;
}

export async function listAll(db: D1Database): Promise<ItemRow[]> {
  return (await db.prepare("SELECT * FROM items ORDER BY updated DESC").all<ItemRow>()).results;
}

export async function listVersions(db: D1Database, itemId: string): Promise<VersionRow[]> {
  return (
    await db.prepare("SELECT * FROM versions WHERE item_id = ? ORDER BY version ASC").bind(itemId).all<VersionRow>()
  ).results;
}

/** The published (latest-version) content of an item; "" for tombstones. */
export async function publishedVersion(db: D1Database, item: ItemRow): Promise<VersionRow | null> {
  return db
    .prepare("SELECT * FROM versions WHERE item_id = ? AND version = ?")
    .bind(item.id, item.version)
    .first<VersionRow>();
}

export interface FeedEvent {
  item: ItemRow;
  version: VersionRow;
}

/**
 * Publish events for the feed window, newest first (§2.6). One entry per
 * publish event; items retracted to draft contribute nothing; tombstoned
 * items contribute only their tombstone event (their content is no longer
 * published, so earlier events would be empty noise).
 */
export async function feedEvents(db: D1Database, limit: number): Promise<FeedEvent[]> {
  const rows = await db
    .prepare(
      `SELECT v.item_id, v.version, v.content_md, v.content_hash, v.published_at, v.note
       FROM versions v JOIN items i ON i.id = v.item_id
       WHERE i.status = 'public' OR (i.status = 'deleted' AND v.version = i.version)
       ORDER BY v.published_at DESC, v.version DESC LIMIT ?`,
    )
    .bind(limit)
    .all<VersionRow>();
  const items = new Map<string, ItemRow>();
  const events: FeedEvent[] = [];
  for (const v of rows.results) {
    if (!items.has(v.item_id)) items.set(v.item_id, (await getItem(db, v.item_id))!);
    events.push({ item: items.get(v.item_id)!, version: v });
  }
  return events;
}

export async function insertMedia(
  db: D1Database,
  row: Omit<MediaRow, "created">,
): Promise<MediaRow> {
  const created = nowIso();
  await db
    .prepare("INSERT INTO media (id, item_id, r2_key, mime, alt, created) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(row.id, row.item_id, row.r2_key, row.mime, row.alt, created)
    .run();
  return { ...row, created };
}

export async function getMedia(db: D1Database, id: string): Promise<MediaRow | null> {
  return db.prepare("SELECT * FROM media WHERE id = ?").bind(id).first<MediaRow>();
}

export async function listMediaForItem(db: D1Database, itemId: string): Promise<MediaRow[]> {
  return (
    await db.prepare("SELECT * FROM media WHERE item_id = ? ORDER BY created ASC").bind(itemId).all<MediaRow>()
  ).results;
}

/** Latest public `updated` timestamp, for manifest/index/feed build dates. */
export async function lastUpdated(db: D1Database): Promise<string> {
  const row = await db
    .prepare("SELECT MAX(updated) AS m FROM items WHERE status IN ('public','deleted')")
    .first<{ m: string | null }>();
  return row?.m ?? nowIso();
}
