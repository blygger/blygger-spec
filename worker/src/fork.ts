// Fork lineage — v0.3-plan §2.4, the Phase B half of the shape 0.1 §5.6
// reserved. A fork takes a **pinned** version as its starting text and says so
// permanently: `forked_from: {origin, id, version}`, origin REQUIRED, matching
// `stub_of`'s citation shape (#27).
//
// Pinned-only is not a formality. A pin is the only irrevocable hosting
// promise in the protocol (#8/#19), so it is the only version a lineage
// pointer can name and still be resolvable years later — every other version
// is withheld the moment it stops being the latest. That is also why the fork
// action reads content from the pinned *file*, not from the live item: the
// bytes a fork descends from must be the bytes anyone else can still fetch.

import { boundedText } from "./mentions/http.ts";
import type { FetchLike } from "./importer/http.ts";
import { excerptFromHtml } from "./markdown.ts";
import type { ForkedFrom, StubCite } from "./types.ts";

/** Where a pinned version lives, on any conformant blyg (§2.8). */
export function pinnedVersionUrl(ref: ForkedFrom): string {
  return `${ref.origin}items/${ref.id}/v${ref.version}.json`;
}

export interface ForkSource {
  kind: "fragment" | "thread";
  contentMd: string;
  cite: StubCite;
}

export type ForkResolve = { ok: true; source: ForkSource } | { ok: false; reason: string };

/**
 * Load the content a fork starts from, and freeze the citation that names it.
 *
 * Both halves happen here, at fork time, on purpose: we already hold the
 * document, so composing the human half costs nothing extra, and freezing it
 * now is the session-23 ruling applied to the same problem — the subscription
 * that supplies a source's name can be renamed or deleted, the origin can
 * move, the target can withdraw, and a lineage line that decays into "forked
 * from [dead link]" has stopped being a citation.
 */
export async function resolveForkSource(
  db: D1Database,
  ref: ForkedFrom,
  ourOrigin: string,
  ourTitle: string,
  fetchFn: FetchLike,
  now: string,
): Promise<ForkResolve> {
  if (ourOrigin && ref.origin === ourOrigin) return resolveOwnFork(db, ref, ourOrigin, ourTitle, now);
  return resolveRemoteFork(db, ref, fetchFn, now);
}

async function resolveOwnFork(
  db: D1Database,
  ref: ForkedFrom,
  ourOrigin: string,
  ourTitle: string,
  now: string,
): Promise<ForkResolve> {
  const row = await db
    .prepare(
      `SELECT v.content_md AS content_md, v.content_html AS content_html, v.transclusions AS transclusions, v.pinned AS pinned
       FROM versions v WHERE v.item_id = ? AND v.version = ?`,
    )
    .bind(ref.id, ref.version)
    .first<{ content_md: string; content_html: string; transclusions: string | null; pinned: number }>();
  if (!row) return { ok: false, reason: `no v${ref.version} of ${ref.id} on this blyg` };
  if (row.pinned !== 1) return { ok: false, reason: `v${ref.version} is not pinned — only pinned versions can be forked` };
  const kind = row.transclusions !== null ? "thread" : "fragment";
  return {
    ok: true,
    source: {
      kind,
      contentMd: row.content_md,
      cite: {
        source: ourTitle || hostOf(ourOrigin),
        ...(row.content_html ? { excerpt: excerptFromHtml(row.content_html, 80) } : {}),
        url: `${ourOrigin}${kind === "thread" ? "t" : "f"}/${ref.id}/v${ref.version}/`,
        retrieved: now,
      },
    },
  };
}

type Doc = Record<string, unknown>;

async function resolveRemoteFork(db: D1Database, ref: ForkedFrom, fetchFn: FetchLike, now: string): Promise<ForkResolve> {
  const url = pinnedVersionUrl(ref);
  let res;
  try {
    res = await fetchFn(url);
  } catch (e) {
    return { ok: false, reason: `could not fetch ${url}: ${(e as Error).message}` };
  }
  if (!res.ok) {
    // A 404 here is the origin saying the version is not pinned — which is
    // exactly the condition that makes it unforkable, so the message says so
    // rather than reporting a bare status.
    return {
      ok: false,
      reason: res.status === 404 ? `${ref.origin} does not serve v${ref.version} of that item — it is not pinned` : `${url} returned ${res.status}`,
    };
  }
  const body = await boundedText(res);
  const doc = asDoc(body);
  if (!doc) return { ok: false, reason: `${url} is not a blyg pinned-version document` };
  if (doc.id !== ref.id || doc.version !== ref.version) return { ok: false, reason: `${url} describes a different item or version` };
  if (doc.pinned !== true) return { ok: false, reason: `${ref.origin} does not declare that version pinned` };
  const contentMd = typeof doc.content_md === "string" ? doc.content_md : "";
  if (!contentMd) return { ok: false, reason: "that version has no content to fork" };
  const sub = await db
    .prepare("SELECT title FROM subscriptions WHERE origin = ?")
    .bind(ref.origin)
    .first<{ title: string }>();
  const author = authorName(doc.author);
  const contentHtml = typeof doc.content_html === "string" ? doc.content_html : "";
  return {
    ok: true,
    source: {
      kind: doc.kind === "thread" ? "thread" : "fragment",
      contentMd,
      cite: {
        source: sub?.title || hostOf(ref.origin),
        ...(author ? { author } : {}),
        ...(contentHtml ? { excerpt: excerptFromHtml(contentHtml, 80) } : {}),
        url,
        retrieved: now,
      },
    },
  };
}

/**
 * The publish-time check (§2.4): the referenced version must still be
 * fetchable as `{origin}items/{id}/v{n}.json`. A local pin needs no fetch —
 * we are the origin, so the database is the authority.
 *
 * The two negative cases are deliberately not treated alike, for the same
 * reason the static-export origin preflight distinguishes them (session 21):
 *
 *  - A **definite** negative — 4xx, or a 200 that isn't that pinned version —
 *    is evidence the promise is not being kept, and the lineage claim would be
 *    false. Publish fails.
 *  - An **inconclusive** one — a network error, a timeout, a 5xx — is evidence
 *    of nothing at all, and refusing to publish the author's own words because
 *    a stranger's host blipped would hand a third party a veto over this
 *    blyg's output. Publish proceeds; the reason is returned so the caller can
 *    say so. Nothing on the wire depends on the check having succeeded.
 */
export type ForkCheck = { ok: true; skipped?: string } | { ok: false; reason: string };

export async function checkForkTarget(
  db: D1Database,
  ref: ForkedFrom,
  ourOrigin: string,
  fetchFn: FetchLike,
): Promise<ForkCheck> {
  if (ourOrigin && ref.origin === ourOrigin) {
    const row = await db
      .prepare("SELECT pinned FROM versions WHERE item_id = ? AND version = ?")
      .bind(ref.id, ref.version)
      .first<{ pinned: number }>();
    if (!row) return { ok: false, reason: `forked_from names v${ref.version} of ${ref.id}, which does not exist on this blyg` };
    if (row.pinned !== 1) return { ok: false, reason: `forked_from names v${ref.version} of ${ref.id}, which is not pinned` };
    return { ok: true };
  }
  const url = pinnedVersionUrl(ref);
  let res;
  try {
    res = await fetchFn(url);
  } catch (e) {
    return { ok: true, skipped: `could not reach ${url} (${(e as Error).message}); lineage not re-checked` };
  }
  if (res.status >= 500) return { ok: true, skipped: `${url} returned ${res.status}; lineage not re-checked` };
  if (!res.ok) return { ok: false, reason: `forked_from names ${url}, which the origin no longer serves (${res.status})` };
  const doc = asDoc(await boundedText(res));
  if (!doc || doc.id !== ref.id || doc.version !== ref.version) {
    return { ok: false, reason: `forked_from names ${url}, which no longer describes that version` };
  }
  return { ok: true };
}

function asDoc(body: string | null): Doc | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return "blyg" in (parsed as Doc) ? (parsed as Doc) : null;
  } catch {
    return null;
  }
}

/** Author names are pass-through (invariant 6) — read, never interpreted. */
function authorName(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const name = (raw as Record<string, unknown>).name;
  return typeof name === "string" && name ? name : undefined;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
