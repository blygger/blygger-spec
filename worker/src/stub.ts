// Stub metadata — v0.3-plan §2.2, decision #27. A stub is a thread that
// declares itself a response to exactly one target. The marker is what
// readers rely on; the body is the author's and is never inspected to
// decide whether something is a stub.

import { blygItemUrl } from "./importer/util.ts";
import { excerptFromHtml } from "./markdown.ts";
import type { ForkedFrom, StubCite, StubOf, Transclusion } from "./types.ts";

/**
 * A citation names *another origin's* item id, so it is deliberately not
 * checked against this client's own 26-char spelling: decision #2 fixes ids as
 * stable random 128-bit identifiers, not as one encoding, and rejecting a
 * conformant foreign id would be this client legislating for other clients.
 * What is checked is that the id can survive a round trip — non-empty, no
 * whitespace or control characters, bounded.
 */
const ID_RE = /^[^\s\u0000-\u001f]{1,256}$/;

/**
 * Origins are compared as strings all over v0.3 (version agreement here,
 * inbound verification in the Webmention receiver), so they are stored in one
 * spelling: absolute, http(s), trailing slash. Returns null for anything else.
 */
export function normalizeOrigin(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const path = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
  return url.origin + path;
}

/**
 * Validate the `{origin, id, version}` citation shape shared by `stub_of`'s
 * blyg form and by `forked_from` (§2.2, §2.4). One validator, because the two
 * are deliberately the same shape — "a citation is absolute" is one rule, not
 * two — and a divergence here would be a divergence on the wire.
 */
export function parseBlygRef(raw: unknown, field: string): { ok: true; ref: ForkedFrom } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: `${field} must be an object` };
  const r = raw as Record<string, unknown>;
  const origin = normalizeOrigin(r.origin);
  if (!origin) return { ok: false, reason: `${field}.origin must be an absolute http(s) URL` };
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return { ok: false, reason: `${field}.id must be a non-empty item id` };
  if (typeof r.version !== "number" || !Number.isInteger(r.version) || r.version < 1) {
    return { ok: false, reason: `${field}.version must be a positive integer` };
  }
  return { ok: true, ref: { origin, id: r.id, version: r.version } };
}

export function parseForkedFrom(raw: unknown): { ok: true; ref: ForkedFrom } | { ok: false; reason: string } {
  return parseBlygRef(raw, "forked_from");
}

export function parseStoredFork(json: string | null): ForkedFrom | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ForkedFrom;
  } catch {
    return null;
  }
}

/**
 * Validate a client-supplied `stub_of` into one of the two locked shapes:
 * `{origin, id, version}` for a blyg target — `origin` REQUIRED even when it
 * is our own, because a citation is absolute — or `{url}` for the plain web.
 * Anything else is rejected rather than coerced; this object ends up on the
 * wire and is what a receiver verifies against.
 */
export function parseStubOf(raw: unknown): { ok: true; stub: StubOf } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "stub_of must be an object" };
  const r = raw as Record<string, unknown>;
  if ("url" in r && r.url !== undefined) {
    if ("origin" in r || "id" in r) return { ok: false, reason: "stub_of is either a {url} or an {origin,id,version}, never both" };
    if (typeof r.url !== "string") return { ok: false, reason: "stub_of.url must be a string" };
    let url: URL;
    try {
      url = new URL(r.url);
    } catch {
      return { ok: false, reason: "stub_of.url must be an absolute URL" };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "stub_of.url must be http(s)" };
    return { ok: true, stub: { url: url.toString() } };
  }
  const parsed = parseBlygRef(r, "stub_of");
  return parsed.ok ? { ok: true, stub: parsed.ref } : parsed;
}

export function isBlygStub(stub: StubOf): stub is { origin: string; id: string; version: number } {
  return "id" in stub;
}

/**
 * Version-agreement rule (§2.2): if the published body transcludes the stub
 * target, the citation takes the version actually baked; otherwise it keeps
 * the value the author saw when the stub was created. The two can never
 * disagree on a published document.
 *
 * Matching is on **id alone**, deliberately: decision #26's rule is that a
 * directive names an identity, not an origin — so an id that resolved is the
 * same item the citation names, and a resolution that was ambiguous never
 * reaches publish (it is an error).
 */
export function applyVersionAgreement(stub: StubOf, transclusions: Transclusion[]): StubOf {
  if (!isBlygStub(stub)) return stub;
  const baked = transclusions.find((t) => t.id === stub.id);
  return baked ? { ...stub, version: baked.version } : stub;
}

export function parseStoredStub(json: string | null): StubOf | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as StubOf;
  } catch {
    return null;
  }
}

/**
 * Compose the citation's human half from what we hold locally, at publish
 * time (§2.2 + Venkat's session-23 ruling: conventional citation norms).
 *
 * Everything here is resolved **once** and frozen, because every source of it
 * is mutable or mortal: a subscription can be deleted or renamed, an origin
 * can move, and the target itself can be withdrawn. `stub_of` keeps the
 * identity; this keeps the sentence a reader needs when the link no longer
 * answers.
 */
export async function composeStubCite(
  db: D1Database,
  stub: StubOf,
  ourOrigin: string,
  ourTitle: string,
  now: string,
): Promise<StubCite> {
  if (!isBlygStub(stub)) {
    return { source: safeHost(stub.url), url: stub.url, retrieved: now };
  }
  const url = await citedUrl(db, stub, ourOrigin);
  if (stub.origin === ourOrigin) {
    const own = await db
      .prepare(
        `SELECT v.content_html AS html FROM items i JOIN versions v ON v.item_id = i.id AND v.version = ?
         WHERE i.id = ?`,
      )
      .bind(stub.version, stub.id)
      .first<{ html: string }>();
    return {
      source: ourTitle || safeHost(ourOrigin),
      ...(own?.html ? { excerpt: excerptFromHtml(own.html, 80) } : {}),
      url,
      retrieved: now,
    };
  }
  const row = await db
    .prepare(
      `SELECT ii.content_html AS html, ii.author_json AS author_json, s.title AS title
       FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id
       WHERE ii.remote_id = ? AND s.origin = ?`,
    )
    .bind(stub.id, stub.origin)
    .first<{ html: string; author_json: string | null; title: string }>();
  let author: string | undefined;
  if (row?.author_json) {
    try {
      const parsed = JSON.parse(row.author_json) as { name?: string } | null;
      if (parsed?.name) author = parsed.name;
    } catch {
      // A malformed author object is the origin's problem, not a publish error.
    }
  }
  return {
    source: row?.title || safeHost(stub.origin),
    ...(author ? { author } : {}),
    ...(row?.html ? { excerpt: excerptFromHtml(row.html, 80) } : {}),
    url,
    retrieved: now,
  };
}

/** The cited item's URL: its origin's own declared `page` when we hold one, the convention otherwise. */
async function citedUrl(db: D1Database, stub: { origin: string; id: string }, ourOrigin: string): Promise<string> {
  if (stub.origin === ourOrigin) {
    const own = await db.prepare("SELECT kind FROM items WHERE id = ?").bind(stub.id).first<{ kind: string }>();
    return `${ourOrigin}${own?.kind === "thread" ? "t" : "f"}/${stub.id}/`;
  }
  const row = await db
    .prepare(
      `SELECT ii.kind AS kind, ii.page AS page FROM imported_items ii JOIN subscriptions s ON s.id = ii.subscription_id
       WHERE ii.remote_id = ? AND s.origin = ?`,
    )
    .bind(stub.id, stub.origin)
    .first<{ kind: string; page: string | null }>();
  return blygItemUrl(stub.origin, row?.kind ?? "fragment", stub.id, row?.page ?? null);
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function parseStoredCite(json: string | null): StubCite | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as StubCite;
  } catch {
    return null;
  }
}
