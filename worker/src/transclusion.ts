// Transclusion grammar & publish-time resolution — v0.1-plan §2.9. Grammar is
// locked protocol surface: do not modify without Fable + Venkat.

import { renderMarkdown } from "./markdown.ts";
import type { ImportedItemRow, ItemRow, Transclusion, VersionRow } from "./types.ts";
import { escapeHtml, ID_ALPHABET } from "./util.ts";

const DIRECTIVE_LINE = new RegExp(`^\\s*!\\[\\[([${ID_ALPHABET}]{26})\\]\\]\\s*$`);
const RESERVED_LINE = new RegExp(`^\\s*!\\[\\[([${ID_ALPHABET}]{26})@v\\d+\\]\\]\\s*$`);

export interface TransclusionRefError {
  directive: string;
  reason: string;
}

/**
 * Count and remove own-line `![[id]]` directives from a working copy —
 * for studio previews of unpublished drafts, which have no rendered HTML to
 * derive from yet. Lives here so the directive grammar has exactly one
 * regex: a private copy in preview.ts would be the same duplicated-detector
 * drift that bit resolve.ts vs feed.ts in session 16.
 */
export function extractDirectives(contentMd: string): { count: number; withoutDirectives: string } {
  const kept: string[] = [];
  let count = 0;
  for (const line of contentMd.split("\n")) {
    if (DIRECTIVE_LINE.test(line) || RESERVED_LINE.test(line)) {
      count++;
      continue;
    }
    kept.push(line);
  }
  return { count, withoutDirectives: kept.join("\n") };
}

export interface ResolveResult {
  html: string;
  transclusions: Transclusion[];
  errors: TransclusionRefError[];
}

/** Thrown by publish() when one or more `![[id]]` directives don't resolve. */
export class TransclusionResolveError extends Error {
  constructor(public readonly errors: TransclusionRefError[]) {
    super("transclusion resolution failed");
  }
}

/**
 * Resolve a local item id to a currently-published **fragment** (item + latest
 * version), or a reason it can't be used as a target. This is the v0.1 rule,
 * kept verbatim for TK source-ref resolution (tk-core-plan.md §2.3) — v0.3
 * explicitly leaves the generation hooks untouched (v0.3-plan §1 non-goals),
 * so a TK source is still local, published, fragment-only. Transclusion
 * targets go through resolveTarget below, which is the rule that widened.
 */
export async function resolveFragment(
  db: D1Database,
  id: string,
): Promise<{ ok: true; item: ItemRow; version: VersionRow } | { ok: false; reason: string }> {
  const item = await db.prepare("SELECT * FROM items WHERE id = ?").bind(id).first<ItemRow>();
  if (!item) return { ok: false, reason: "unknown item" };
  if (item.status === "draft") return { ok: false, reason: "item is a draft, not published" };
  if (item.kind === "withdrawn") return { ok: false, reason: "item is withdrawn" };
  if (item.kind === "thread") return { ok: false, reason: "cannot use a thread as a TK source" };
  const version = await db
    .prepare("SELECT * FROM versions WHERE item_id = ? AND version = ?")
    .bind(item.id, item.version)
    .first<VersionRow>();
  if (!version) return { ok: false, reason: "unknown item" };
  return { ok: true, item, version };
}

/** A resolved transclusion target: the bytes to bake plus the provenance to record. */
export interface ResolvedTarget {
  id: string;
  version: number;
  contentHtml: string;
  /** Identity origin for a remote (imported) source; omitted for own-origin — decision #26. */
  origin?: string;
}

/**
 * Every local thread id reachable from `startId` by walking stored
 * `transclusions[]`, following **local** entries only (a remote entry's
 * closure is unknowable in general, and harmless: it is static bytes we
 * already hold). Bounded by the visited set, so a pre-existing cycle in
 * stored data can't spin here.
 */
async function localClosure(db: D1Database, startId: string): Promise<Set<string>> {
  const seen = new Set<string>();
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const row = await db
      .prepare("SELECT v.transclusions AS t FROM items i JOIN versions v ON v.item_id = i.id AND v.version = i.version WHERE i.id = ?")
      .bind(id)
      .first<{ t: string | null }>();
    if (!row?.t) continue;
    for (const entry of JSON.parse(row.t) as Transclusion[]) {
      if (entry.origin) continue; // remote: not walked (decision #26)
      if (!seen.has(entry.id)) queue.push(entry.id);
    }
  }
  return seen;
}

/**
 * Resolve an own-line `![[id]]` directive to the snapshot that gets baked —
 * v0.3-plan §2.1, decision #26. Order: local published item of **any** kind
 * (nesting arrives here), then an imported non-L0 blyg item by `remote_id`,
 * then an error. The directive names an *identity*, not an origin, which is
 * why more than one imported match is a publish error rather than a guess.
 *
 * What gets baked is always the **local snapshot** — never a live fetch. That
 * is what makes publish network-independent and network cycles harmless: a
 * snapshot is static bytes, so no resolution recurses through it.
 *
 * `selfId` is the publishing thread, for the local DAG check: a thread may not
 * transclude itself, or a local thread whose transitive local closure contains
 * it. Remote closures are not walked.
 */
export async function resolveTarget(
  db: D1Database,
  id: string,
  selfId?: string,
): Promise<{ ok: true; target: ResolvedTarget } | { ok: false; reason: string }> {
  const item = await db.prepare("SELECT * FROM items WHERE id = ?").bind(id).first<ItemRow>();
  if (item) {
    if (item.status === "draft") return { ok: false, reason: "item is a draft, not published" };
    if (item.kind === "withdrawn") return { ok: false, reason: "item is withdrawn" };
    const version = await db
      .prepare("SELECT * FROM versions WHERE item_id = ? AND version = ?")
      .bind(item.id, item.version)
      .first<VersionRow>();
    if (!version) return { ok: false, reason: "unknown item" };
    if (selfId && item.kind === "thread") {
      if (item.id === selfId) return { ok: false, reason: "a thread cannot transclude itself" };
      if ((await localClosure(db, item.id)).has(selfId)) {
        return { ok: false, reason: "circular transclusion: that thread already quotes this one" };
      }
    }
    return { ok: true, target: { id: item.id, version: version.version, contentHtml: version.content_html } };
  }

  // Imported: identity is the subscription's own origin (0.2 §12.2 — the
  // post-redirect fetch origin), never the manifest's self-asserted `site`.
  const rows = await db
    .prepare(
      `SELECT ii.*, s.origin AS sub_origin
       FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id
       WHERE ii.remote_id = ?`,
    )
    .bind(id)
    .all<ImportedItemRow & { sub_origin: string }>();
  const candidates = rows.results.filter((r) => r.l0 !== 1);
  const usable = candidates.filter((r) => r.state === "current" || r.pinned_version_retained !== null);
  if (usable.length > 1) return { ok: false, reason: "ambiguous id: imported from more than one origin" };
  if (usable.length === 1) {
    const row = usable[0];
    // A retained tombstone's bytes are the *pinned* version's — 0.2 §13.4's
    // retention rule — so that, not the withdrawal version, is the provenance.
    const version = row.state === "tombstone" ? (row.pinned_version_retained as number) : row.version;
    return { ok: true, target: { id, version, contentHtml: row.content_html, origin: row.sub_origin } };
  }
  if (candidates.length) return { ok: false, reason: "source withdrawn by origin" };
  if (rows.results.length) return { ok: false, reason: "source is a plain RSS (L0) item, not a blyg item" };
  return { ok: false, reason: "unknown item" };
}

/**
 * Shared line-walker for both publish-time resolution and studio preview.
 * `onError` decides what (if anything) renders in place of a directive that
 * fails to resolve — the strict resolver omits it (publish aborts anyway);
 * the preview variant renders a visible placeholder.
 */
async function walk(
  db: D1Database,
  contentMd: string,
  onError: (err: TransclusionRefError) => string | null,
  selfId?: string,
): Promise<ResolveResult> {
  const errors: TransclusionRefError[] = [];
  const transclusions: Transclusion[] = [];
  const htmlParts: string[] = [];
  let prose: string[] = [];

  const flushProse = () => {
    if (prose.length) {
      htmlParts.push(renderMarkdown(prose.join("\n")));
      prose = [];
    }
  };
  const fail = (err: TransclusionRefError) => {
    errors.push(err);
    const placeholder = onError(err);
    if (placeholder) htmlParts.push(placeholder);
  };

  for (const line of contentMd.split("\n")) {
    const reserved = RESERVED_LINE.exec(line);
    if (reserved) {
      flushProse();
      fail({ directive: line.trim(), reason: "explicit-version references (@vN) are reserved, not supported in v0.1" });
      continue;
    }
    const m = DIRECTIVE_LINE.exec(line);
    if (!m) {
      prose.push(line);
      continue;
    }
    flushProse();
    const id = m[1];
    const resolved = await resolveTarget(db, id, selfId);
    if (!resolved.ok) {
      fail({ directive: line.trim(), reason: resolved.reason });
      continue;
    }
    const { target } = resolved;
    transclusions.push({ id: target.id, version: target.version, ...(target.origin ? { origin: target.origin } : {}) });
    // data-blyg-origin appears only for remote sources, so a baked own-origin
    // blockquote is byte-identical to the 0.2 shape (decision #26).
    const originAttr = target.origin ? ` data-blyg-origin="${escapeHtml(target.origin)}"` : "";
    htmlParts.push(
      `<blockquote class="blyg-transclusion" data-blyg-id="${target.id}" data-blyg-version="${target.version}"${originAttr}>\n${target.contentHtml}\n</blockquote>`,
    );
  }
  flushProse();
  return { html: htmlParts.join("\n"), transclusions, errors };
}

/**
 * Resolve every `![[id]]` directive in a thread's markdown against the local
 * snapshots currently available — published local items of either kind, or
 * imported blyg items (v0.3 §2.1) — baking each target's HTML into a
 * `blockquote.blyg-transclusion` snapshot (§2.9). Readers never resolve
 * anything — this runs only at publish time, called from model.publish().
 * `selfId` is the publishing thread's own id, for the local DAG check.
 */
export async function resolveTransclusions(db: D1Database, contentMd: string, selfId?: string): Promise<ResolveResult> {
  return walk(db, contentMd, () => null, selfId);
}

/**
 * Studio-only preview variant — never aborts; an unresolvable directive
 * renders as a visible red placeholder so the editor can show exactly what
 * publish will reject, before the author hits publish. Not used at publish
 * time (see resolveTransclusions above); not a protocol surface.
 */
export async function previewTransclusions(db: D1Database, contentMd: string, selfId?: string): Promise<ResolveResult> {
  return walk(
    db,
    contentMd,
    (err) => `<blockquote class="blyg-transclusion unresolved"><p>⚠ unresolvable: ${escapeHtml(err.reason)}</p></blockquote>`,
    selfId,
  );
}
