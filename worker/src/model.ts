// Data access + publish-flow semantics — v0.1-plan §3.1.

import { renderMarkdown } from "./markdown.ts";
import { resolveTransclusions, TransclusionResolveError } from "./transclusion.ts";
import type { ItemRow, MediaRow, Settings, VersionRow } from "./types.ts";
import { contentHash, newId, nowIso } from "./util.ts";

export { TransclusionResolveError };

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
    site_title: map.site_title ?? "blygg",
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

export async function createDraft(
  db: D1Database,
  contentMd: string,
  kind: "fragment" | "thread" = "fragment",
): Promise<ItemRow> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare("INSERT INTO items (id, kind, status, created, updated, version, content_md, dirty) VALUES (?, ?, 'draft', ?, ?, 0, ?, 1)")
    .bind(id, kind, now, now, contentMd)
    .run();
  return (await getItem(db, id))!;
}

/**
 * The item's authored kind — 'fragment' or 'thread' — independent of the
 * transient 'withdrawn' state a live item.kind carries after withdrawal.
 * For a withdrawn item, derived from the last real (non-endcap) version's
 * transclusions column, per §3.1 republish rules.
 */
export async function authoredKind(db: D1Database, item: ItemRow): Promise<"fragment" | "thread"> {
  if (item.kind === "fragment" || item.kind === "thread") return item.kind;
  const prev = await db
    .prepare("SELECT transclusions FROM versions WHERE item_id = ? AND version = ?")
    .bind(item.id, item.version - 1)
    .first<{ transclusions: string | null }>();
  return prev?.transclusions ? "thread" : "fragment";
}

/** Save the working copy. Does not touch `updated` for ever-published items — that field is publish-facing. */
export async function saveWorkingCopy(db: D1Database, id: string, contentMd: string): Promise<void> {
  await db
    .prepare("UPDATE items SET content_md = ?, dirty = 1, updated = CASE WHEN version = 0 THEN ? ELSE updated END WHERE id = ?")
    .bind(contentMd, nowIso(), id)
    .run();
}

/**
 * Publish the working copy as version N+1. Fragments render content_html
 * directly; threads resolve every `![[id]]` directive against currently
 * published local fragments and bake the snapshot into content_html, storing
 * provenance in transclusions (§2.9). Throws TransclusionResolveError,
 * without writing anything, if any directive fails to resolve.
 */
export async function publish(db: D1Database, item: ItemRow, note: string | null): Promise<number> {
  const now = nowIso();
  const version = item.version + 1;
  const kind = await authoredKind(db, item);
  let contentHtml: string;
  let transclusionsJson: string | null = null;
  if (kind === "thread") {
    const resolved = await resolveTransclusions(db, item.content_md);
    if (resolved.errors.length) throw new TransclusionResolveError(resolved.errors);
    contentHtml = resolved.html;
    transclusionsJson = JSON.stringify(resolved.transclusions);
  } else {
    contentHtml = renderMarkdown(item.content_md);
  }
  const hash = await contentHash(item.content_md);
  await db.batch([
    db.prepare(
      "INSERT INTO versions (item_id, version, content_md, content_html, content_hash, published_at, note, transclusions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(item.id, version, item.content_md, contentHtml, hash, now, note, transclusionsJson),
    db.prepare("UPDATE items SET status = 'public', kind = ?, version = ?, dirty = 0, updated = ? WHERE id = ?")
      .bind(kind, version, now, item.id),
  ]);
  return version;
}

/**
 * Withdraw a published item (v0.1-plan §2.3/§3.1, session-3 revision): publish
 * a permanent empty-content endcap — version bump, kind 'withdrawn', item file
 * stays 200 forever, one feed entry. Reversible via publish() (vN+1 restores
 * 'public'/'fragment'). The working copy is retained; dirty=1 because it now
 * differs from the published endcap. Pinned versions are untouched and remain
 * fetchable.
 */
export async function withdraw(db: D1Database, item: ItemRow, note: string | null): Promise<number> {
  const now = nowIso();
  const version = item.version + 1;
  const hash = await contentHash("");
  await db.batch([
    db.prepare("INSERT INTO versions (item_id, version, content_md, content_hash, published_at, note) VALUES (?, ?, '', ?, ?, ?)")
      .bind(item.id, version, hash, now, note),
    db.prepare("UPDATE items SET status = 'withdrawn', kind = 'withdrawn', version = ?, dirty = 1, updated = ? WHERE id = ?")
      .bind(version, now, item.id),
  ]);
  return version;
}

/** Hard-delete a never-published draft. Published items are withdrawn, never deleted. */
export async function discardDraft(db: D1Database, item: ItemRow): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM items WHERE id = ?").bind(item.id),
    db.prepare("DELETE FROM media WHERE item_id = ?").bind(item.id),
  ]);
}

/** Irrevocably pin a version (§2.8). Idempotent; never unset. */
export async function pinVersion(db: D1Database, itemId: string, version: number): Promise<void> {
  await db
    .prepare("UPDATE versions SET pinned = 1, pinned_at = COALESCE(pinned_at, ?) WHERE item_id = ? AND version = ?")
    .bind(nowIso(), itemId, version)
    .run();
}

export async function getVersion(db: D1Database, itemId: string, version: number): Promise<VersionRow | null> {
  return db
    .prepare("SELECT * FROM versions WHERE item_id = ? AND version = ?")
    .bind(itemId, version)
    .first<VersionRow>();
}

/** Published items + withdrawn endcaps, newest `updated` first (public surfaces). */
export async function listPublic(db: D1Database, limit?: number): Promise<ItemRow[]> {
  const sql = "SELECT * FROM items WHERE status IN ('public','withdrawn') ORDER BY updated DESC" + (limit ? " LIMIT ?" : "");
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

/** The published (latest-version) content of an item; the empty endcap row for withdrawn items. */
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
 * publish event; withdrawn items contribute only their withdrawal endcap
 * (their content is no longer published, so earlier events would be empty
 * noise — DEVLOG session 2 interpretation, carried over from tombstones).
 */
export async function feedEvents(db: D1Database, limit: number): Promise<FeedEvent[]> {
  const rows = await db
    .prepare(
      `SELECT v.item_id, v.version, v.content_md, v.content_hash, v.published_at, v.note, v.pinned, v.pinned_at
       FROM versions v JOIN items i ON i.id = v.item_id
       WHERE i.status = 'public' OR (i.status = 'withdrawn' AND v.version = i.version)
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
    .prepare("SELECT MAX(updated) AS m FROM items WHERE status IN ('public','withdrawn')")
    .first<{ m: string | null }>();
  return row?.m ?? nowIso();
}
