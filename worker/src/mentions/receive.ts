// Inbound Webmention + structural verification — v0.3-plan §2.3.5,
// decision #28. The endpoint accepts a *claim*; verification decides whether
// the claim is true, by reading the source's own item document rather than
// scanning its page for our URL. Link-presence is the trackback-era check
// that spam defeated; a structural check asks a harder question: does the
// document that claims this origin actually reference us, in a field whose
// meaning is defined?
//
// No content of theirs is ever stored. A verified mention is a pointer.

import type { FetchLike } from "../importer/http.ts";
import { normalizeOrigin } from "../stub.ts";
import type { MentionRelation, Transclusion } from "../types.ts";
import { boundedText } from "./http.ts";
import {
  countRecentFromHost,
  hostOf,
  INBOUND_HOURLY_LIMIT,
  markInboundUnverified,
  markInboundVerified,
  upsertInbound,
} from "./store.ts";

export type ReceiveOutcome =
  | { status: 202; mentionId: string; source: string; target: string }
  | { status: 400 | 429; error: string };

/** Absolute http(s) only — a relative or non-web URL is a syntactic failure (§2.3.5 step 1). */
function absoluteWebUrl(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Which of our items a target URL names — by the `page` shape we publish
 * (`f/{id}/`, `t/{id}/`) or by the item document itself (`items/{id}.json`).
 * Returns null when the URL is ours but names nothing published; the caller
 * answers 400, not 404: the endpoint exists, the claim is bad.
 */
export async function targetItemId(db: D1Database, target: URL, ourOrigin: string): Promise<string | null> {
  const origin = new URL(ourOrigin);
  if (target.origin !== origin.origin) return null;
  const base = origin.pathname.replace(/\/$/, "");
  let path = target.pathname;
  if (base && path.startsWith(base)) path = path.slice(base.length);
  const m = /^\/(?:([ft])\/([^/]+)\/?|items\/([^/]+)\.json)$/.exec(path);
  const id = m?.[2] ?? m?.[3];
  if (!id) return null;
  const row = await db
    .prepare("SELECT id FROM items WHERE id = ? AND status IN ('public','withdrawn')")
    .bind(id)
    .first<{ id: string }>();
  return row?.id ?? null;
}

/**
 * The endpoint's synchronous half: validate, rate-limit, record the claim.
 * Verification is asynchronous (the caller hands it to waitUntil), which is
 * why the honest answer is 202 rather than the 200 W3C also permits — we
 * have accepted the claim, not yet believed it.
 */
export async function receiveMention(
  db: D1Database,
  form: { source?: string; target?: string },
  ourOrigin: string,
  now: number = Date.now(),
): Promise<ReceiveOutcome> {
  const source = absoluteWebUrl(form.source);
  const target = absoluteWebUrl(form.target);
  if (!source || !target) return { status: 400, error: "source and target must be absolute http(s) URLs" };
  if (source.toString() === target.toString()) return { status: 400, error: "source and target must differ" };

  const itemId = await targetItemId(db, target, ourOrigin);
  if (!itemId) return { status: 400, error: "target is not a published item on this blyg" };

  const host = hostOf(source.toString());
  if (host && (await countRecentFromHost(db, host, now)) >= INBOUND_HOURLY_LIMIT) {
    return { status: 429, error: "too many mentions from this host in the last hour" };
  }

  const row = await upsertInbound(db, source.toString(), target.toString(), itemId, new Date(now).toISOString());
  return { status: 202, mentionId: row.id, source: source.toString(), target: target.toString() };
}

type Doc = Record<string, unknown>;

function asItemDoc(body: string | null): Doc | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return "blyg" in (parsed as Doc) ? (parsed as Doc) : null;
  } catch {
    return null;
  }
}

/** The `<link rel="alternate" type="application/json">` hook decision #29 added for exactly this. */
export function alternateJsonHref(html: string, base: string): string | null {
  const tag = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    const rel = /\brel\s*=\s*["']?([^"'>]+)["']?/i.exec(m[0]);
    if (!rel || !rel[1].toLowerCase().split(/\s+/).includes("alternate")) continue;
    const type = /\btype\s*=\s*["']?([^"'>\s]+)["']?/i.exec(m[0]);
    if (!type || !type[1].toLowerCase().startsWith("application/json")) continue;
    const href = /\bhref\s*=\s*["']([^"']*)["']/i.exec(m[0]);
    if (!href) continue;
    try {
      return new URL(href[1], base).toString();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * How the source document references us, read out of its structure (§2.3.5).
 * `stub_of` outranks a transclusion: a stub is the stronger claim, and an
 * item that both stubs and quotes us is a stub.
 */
export function relationTo(doc: Doc, ourOrigin: string, targetId: string): MentionRelation | null {
  const stub = doc.stub_of as unknown;
  if (stub && typeof stub === "object") {
    const s = stub as Record<string, unknown>;
    // The {url} shape names no item, so it can never name *this* item.
    if (normalizeOrigin(s.origin) === ourOrigin && s.id === targetId) return "stub";
  }
  const transclusions = Array.isArray(doc.transclusions) ? (doc.transclusions as Transclusion[]) : [];
  if (transclusions.some((t) => t && normalizeOrigin(t.origin) === ourOrigin && t.id === targetId)) return "transclusion";
  if (forkedVersion(doc, ourOrigin, targetId) !== null) return "fork";
  return null;
}

/**
 * The version a source document's `forked_from` claims to descend from, when
 * it names this item on this origin — else null (§2.3.5, §2.4).
 *
 * Returned rather than folded into relationTo's verdict because the spec's
 * relation is "`forked_from` naming a **pinned** version of the target", and
 * only the target — us — knows which of our versions are pinned. That second
 * half is checked by the caller, which has the database; here we read the
 * claim, there we test it. Zero extra fetches: a claim about our own pins is
 * the one claim we never have to take anyone's word for.
 */
export function forkedVersion(doc: Doc, ourOrigin: string, targetId: string): number | null {
  const fork = doc.forked_from as unknown;
  if (!fork || typeof fork !== "object") return null;
  const f = fork as Record<string, unknown>;
  if (normalizeOrigin(f.origin) !== ourOrigin || f.id !== targetId) return null;
  return typeof f.version === "number" && Number.isInteger(f.version) && f.version > 0 ? f.version : null;
}

export interface VerifyResult {
  status: "verified" | "failed" | "gone";
  reason?: string;
  relation?: MentionRelation;
}

/**
 * Fetch the source, find its item document, and decide. Bounded to two
 * fetches (§2.3.5): the page, and the document its `rel="alternate"` names —
 * or one, when the source URL *is* the document.
 *
 * The identity rule is the load-bearing one: the document's asserted `origin`
 * must sit on the same host as the URL we actually fetched. That is 0.2
 * §12.2 applied inbound, and it is what stops a mirror or an impostor from
 * speaking in a real blyg's name.
 */
export async function verifyMention(
  db: D1Database,
  mentionId: string,
  source: string,
  targetItemId: string,
  ourOrigin: string,
  fetchFn: FetchLike,
): Promise<VerifyResult> {
  const fail = async (reason: string, status: "failed" | "gone" = "failed"): Promise<VerifyResult> => {
    await markInboundUnverified(db, mentionId, status, reason);
    return { status, reason };
  };

  let res;
  try {
    res = await fetchFn(source);
  } catch (e) {
    return fail(`source fetch failed: ${(e as Error).message}`);
  }
  if (!res.ok) return fail(`source fetch returned ${res.status}`);
  const body = await boundedText(res);
  if (body === null) return fail("source response too large");

  let finalUrl = res.url;
  let doc = asItemDoc(body);
  if (!doc) {
    const href = alternateJsonHref(body, res.url);
    if (!href) return fail("not a blyg item: source page declares no JSON alternate");
    let docRes;
    try {
      docRes = await fetchFn(href);
    } catch (e) {
      return fail(`item document fetch failed: ${(e as Error).message}`);
    }
    if (!docRes.ok) return fail(`item document fetch returned ${docRes.status}`);
    const docBody = await boundedText(docRes);
    doc = asItemDoc(docBody);
    if (!doc) return fail("not a blyg item: the JSON alternate is not an item document");
    finalUrl = docRes.url;
  }

  const asserted = normalizeOrigin(doc.origin);
  if (!asserted) return fail("item document declares no origin");
  if (new URL(asserted).origin !== new URL(finalUrl).origin) {
    return fail(`origin mismatch: document claims ${asserted} but was served from ${new URL(finalUrl).origin}`);
  }
  if (doc.kind === "withdrawn") return fail("source item is withdrawn", "gone");

  const relation = relationTo(doc, ourOrigin, targetItemId);
  if (!relation) return fail("source document does not reference this item");
  // A fork claims descent from a pinned version of ours (§2.3.5). We are the
  // only party who can say whether that version is in fact pinned, so we do —
  // a lineage pointer at an unpinned version names bytes this origin never
  // promised to keep serving, and verifying it would vouch for a claim we
  // know to be unsupported.
  if (relation === "fork") {
    const version = forkedVersion(doc, ourOrigin, targetItemId)!;
    const row = await db
      .prepare("SELECT pinned FROM versions WHERE item_id = ? AND version = ?")
      .bind(targetItemId, version)
      .first<{ pinned: number }>();
    if (!row) return fail(`forked_from names v${version}, which does not exist here`);
    if (row.pinned !== 1) return fail(`forked_from names v${version}, which is not pinned`);
  }

  await markInboundVerified(db, mentionId, {
    relation,
    sourceOrigin: asserted,
    sourceId: typeof doc.id === "string" ? doc.id : "",
    sourceKind: typeof doc.kind === "string" ? doc.kind : "",
    sourceVersion: typeof doc.version === "number" ? doc.version : 0,
    authorJson: doc.author ? JSON.stringify(doc.author) : null,
    sourcePage: source,
  });
  return { status: "verified", relation };
}
