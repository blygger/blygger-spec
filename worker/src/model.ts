// Data access + publish-flow semantics — v0.1-plan §3.1.

import { renderMarkdown } from "./markdown.ts";
import { annotateGenerated, applyGeneratedWrappers, parseScopes, stripToOutput, TkPublishError, unresolvedScopes } from "./tk.ts";
import { applyVersionAgreement, composeStubCite, parseStoredStub } from "./stub.ts";
import { resolveTransclusions, TransclusionResolveError } from "./transclusion.ts";
import type { ForkedFrom, ItemRow, MediaRow, ScopeProvenance, Settings, StubCite, StubOf, Transclusion, VersionRow } from "./types.ts";
import { FRAGMENT_MAX_CHARS } from "./types.ts";
import { contentHash, newId, nowIso } from "./util.ts";

export { TkPublishError, TransclusionResolveError };

/** Thrown by publish() when the *published* (TK-stripped) fragment length exceeds the studio cap (§2.7). */
export class FragmentTooLongError extends Error {
  constructor(
    public readonly length: number,
    public readonly max: number,
  ) {
    super(`fragment exceeds ${max} characters`);
  }
}

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
    site_title: map.site_title ?? "blyg",
    theme: map.theme ?? "auto",
    author_name: map.author_name ?? "",
    author_bio: map.author_bio ?? "",
    author_links: links,
    site_url: map.site_url ?? "",
    avatar_media_id: map.avatar_media_id ?? "",
    ai_model: map.ai_model ?? "",
    ai_style_prompt: map.ai_style_prompt ?? "",
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
 * Create a draft that descends from a pinned version (§2.4). Separate from
 * createDraft() because lineage is written exactly once, here: there is no
 * setter, no PUT field, and no way to retarget or clear it afterwards — an
 * item either came from somewhere or it didn't, and a mutable lineage pointer
 * would be a claim that could quietly become false after a pinned version
 * document had already emitted it.
 */
export async function createFork(
  db: D1Database,
  contentMd: string,
  kind: "fragment" | "thread",
  ref: ForkedFrom,
  cite: StubCite,
): Promise<ItemRow> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO items (id, kind, status, created, updated, version, content_md, dirty, forked_from, fork_cite)
       VALUES (?, ?, 'draft', ?, ?, 0, ?, 1, ?, ?)`,
    )
    .bind(id, kind, now, now, contentMd, JSON.stringify(ref), JSON.stringify(cite))
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
 * Set or clear the working copy's stub citation (§2.2). Kept separate from
 * saveWorkingCopy because the two are independent: retargeting a stub is not
 * an edit of the prose, and clearing it leaves the body exactly as written —
 * a former stub is just a thread that quotes something.
 */
export async function setStubOf(db: D1Database, id: string, stub: StubOf | null): Promise<void> {
  await db
    .prepare("UPDATE items SET stub_of = ?, dirty = 1 WHERE id = ?")
    .bind(stub ? JSON.stringify(stub) : null, id)
    .run();
}

/**
 * Working-copy-side TK generation provenance (tk-core-plan.md §4/§5, migration
 * 0005) — a cache of per-scope {sources,model,at}, positionally aligned to
 * scope order as of the last /generate call. This is NOT the wire artifact
 * (that's versions.generated_json, emitted at publish); it's the bridge that
 * lets provenance survive from generate-time through to the next publish,
 * since sources resolve to "the latest published version at generation time"
 * (§2.3) rather than being re-resolved at publish like transclusions.
 * Known limitation, documented rather than engineered around: if scopes are
 * reordered/added/removed between generate calls, positional realignment can
 * misattribute provenance to the wrong scope — the same class of fragility
 * the /generate API's own index-based `{scope: n}` addressing already has.
 */
export function getTkProvenance(item: ItemRow): (ScopeProvenance | null)[] {
  if (!item.tk_provenance_json) return [];
  try {
    const parsed = JSON.parse(item.tk_provenance_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Record scope `index`'s provenance, resizing the cache to `scopeCount` (current scope count). */
export async function setTkProvenance(
  db: D1Database,
  itemId: string,
  index: number,
  scopeCount: number,
  provenance: ScopeProvenance,
): Promise<void> {
  const item = await getItem(db, itemId);
  const arr = getTkProvenance(item!);
  while (arr.length < scopeCount) arr.push(null);
  arr.length = scopeCount;
  arr[index] = provenance;
  await db.prepare("UPDATE items SET tk_provenance_json = ? WHERE id = ?").bind(JSON.stringify(arr), itemId).run();
}

/**
 * Publish the working copy as version N+1. First strips every TK scope (§2.4)
 * down to its bare output — content_md and the hash cover exactly that
 * stripped text, never the studio grammar (decision #20). Fragments then
 * render content_html directly; threads resolve every `![[id]]` directive
 * against currently published local fragments and bake the snapshot into
 * content_html, storing provenance in transclusions (§2.9). Generated spans
 * with recorded provenance (model.getTkProvenance) get a `blyg-tk-gen`
 * disclosure wrapper and an entry in `generated_json` (§3.1/§3.2); spans with
 * no provenance (hand-authored output) are plain text, no disclosure.
 * Throws TkPublishError for malformed/unresolved TK scopes, FragmentTooLongError
 * if the published fragment exceeds the studio cap, or TransclusionResolveError
 * if a thread directive fails to resolve — nothing is written in any case.
 */
export async function publish(db: D1Database, item: ItemRow, note: string | null, ourOrigin?: string): Promise<number> {
  const now = nowIso();
  const version = item.version + 1;
  const kind = await authoredKind(db, item);

  const { scopes, errors: parseErrors } = parseScopes(item.content_md);
  const unresolved = unresolvedScopes(scopes);
  if (parseErrors.length || unresolved.length) {
    throw new TkPublishError([
      ...parseErrors,
      ...unresolved.map((s) => ({ at: s.start, reason: "scope has no output (never generated)" })),
    ]);
  }

  const { text: strippedMd, spans } = stripToOutput(item.content_md, scopes);
  if (kind === "fragment" && strippedMd.length > FRAGMENT_MAX_CHARS) {
    throw new FragmentTooLongError(strippedMd.length, FRAGMENT_MAX_CHARS);
  }

  const provenanceCache = getTkProvenance(item);
  const hasProvenance = scopes.map((_, i) => provenanceCache[i] != null);
  const annotated = annotateGenerated(strippedMd, spans, hasProvenance);

  let contentHtml: string;
  let transclusionsJson: string | null = null;
  if (kind === "thread") {
    const resolved = await resolveTransclusions(db, annotated.text, item.id);
    if (resolved.errors.length) throw new TransclusionResolveError(resolved.errors);
    contentHtml = applyGeneratedWrappers(resolved.html, annotated);
    transclusionsJson = JSON.stringify(resolved.transclusions);
  } else {
    contentHtml = applyGeneratedWrappers(renderMarkdown(annotated.text), annotated);
  }

  const generated: ScopeProvenance[] = scopes.map((_, i) => provenanceCache[i]).filter((p): p is ScopeProvenance => p != null);
  const generatedJson = generated.length ? JSON.stringify(generated) : null;

  // §2.2 version agreement: a stub's citation takes the version actually
  // baked when the body quotes its target, so the quote and the citation can
  // never disagree on a published document. Threads only — the working copy
  // of a fragment never carries a stub (the API refuses to set one).
  const stub = kind === "thread" ? parseStoredStub(item.stub_of) : null;
  const agreed = stub ? applyVersionAgreement(stub, transclusionsJson ? (JSON.parse(transclusionsJson) as Transclusion[]) : []) : null;
  const stubJson = agreed ? JSON.stringify(agreed) : null;
  // The citation's human half is resolved once and frozen (migration 0008):
  // the subscription that supplies the source's name can be renamed or
  // deleted, and the target can withdraw, but a published citation must keep
  // reading correctly. Not on the wire — see StubCite.
  const settings = await getSettings(db);
  const origin = ourOrigin ?? settings.site_url;
  const citeJson = agreed ? JSON.stringify(await composeStubCite(db, agreed, normalizedOrigin(origin), settings.site_title, now)) : null;

  const hash = await contentHash(strippedMd);
  await db.batch([
    db.prepare(
      "INSERT INTO versions (item_id, version, content_md, content_html, content_hash, published_at, note, transclusions, generated_json, stub_of, stub_cite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(item.id, version, strippedMd, contentHtml, hash, now, note, transclusionsJson, generatedJson, stubJson, citeJson),
    db.prepare("UPDATE items SET status = 'public', kind = ?, version = ?, dirty = 0, updated = ? WHERE id = ?")
      .bind(kind, version, now, item.id),
  ]);
  return version;
}

/** Origins are compared and built as strings everywhere; an empty site_url leaves us with no absolute base to offer. */
function normalizedOrigin(raw: string): string {
  if (!raw) return "";
  return raw.endsWith("/") ? raw : raw + "/";
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

/** Thrown by restoreVersion() when the target version can't serve as a working copy. */
export class RestoreVersionError extends Error {}

/**
 * Load a past version's content back into the working copy as an unpublished
 * draft (studio furniture — decision #3). **Forward-only:** this does not
 * rewind anything. The restored text becomes the working copy, which the
 * author then publishes as v(current+1), so the version counter keeps its
 * strict +1 discipline (decision #19) and no subscriber ever sees a version
 * number go backwards (importer invariant #18b, which would read a regression
 * as a suspected history rewrite).
 *
 * `tk_provenance_json` is cleared, not carried: published `content_md` is
 * TK-stripped (publish() writes the bare output), so a restored copy has zero
 * scopes, and the provenance cache is positionally aligned to scope order —
 * keeping it would misattribute generation records to scopes that no longer
 * exist.
 */
export async function restoreVersion(db: D1Database, item: ItemRow, version: number): Promise<void> {
  const row = await getVersion(db, item.id, version);
  if (!row) throw new RestoreVersionError(`item has no version ${version}`);
  if (!row.content_md) {
    throw new RestoreVersionError(`v${version} is a withdrawal endcap and has no content to restore`);
  }
  await db
    .prepare("UPDATE items SET content_md = ?, tk_provenance_json = NULL, dirty = 1 WHERE id = ?")
    .bind(row.content_md, item.id)
    .run();
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
  // `rowid DESC` is the tiebreaker, exactly as in feedEvents() (session 11):
  // `updated` has only second precision, so two items published inside the
  // same second sorted nondeterministically — the public feed's own order.
  // rowid is monotonic with insertion, so it resolves ties by actual order.
  const sql =
    "SELECT * FROM items WHERE status IN ('public','withdrawn') ORDER BY updated DESC, rowid DESC" +
    (limit ? " LIMIT ?" : "");
  const stmt = limit ? db.prepare(sql).bind(limit) : db.prepare(sql);
  return (await stmt.all<ItemRow>()).results;
}

export async function listAll(db: D1Database): Promise<ItemRow[]> {
  return (await db.prepare("SELECT * FROM items ORDER BY updated DESC, rowid DESC").all<ItemRow>()).results;
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
      // rowid tiebreak: published_at has only second precision, so two
      // events in the same second otherwise sort nondeterministically —
      // rowid is monotonic with insertion (hence publish) order, so it
      // resolves ties to the correct chronological order every time.
      `SELECT v.item_id, v.version, v.content_md, v.content_hash, v.published_at, v.note, v.pinned, v.pinned_at
       FROM versions v JOIN items i ON i.id = v.item_id
       WHERE i.status = 'public' OR (i.status = 'withdrawn' AND v.version = i.version)
       ORDER BY v.published_at DESC, v.version DESC, v.rowid DESC LIMIT ?`,
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
