// Stub metadata — v0.3-plan §2.2, decision #27. A stub is a thread that
// declares itself a response to exactly one target. The marker is what
// readers rely on; the body is the author's and is never inspected to
// decide whether something is a stub.

import type { StubOf, Transclusion } from "./types.ts";
import { ID_ALPHABET } from "./util.ts";

const ID_RE = new RegExp(`^[${ID_ALPHABET}]{26}$`);

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
  const origin = normalizeOrigin(r.origin);
  if (!origin) return { ok: false, reason: "stub_of.origin must be an absolute http(s) URL" };
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return { ok: false, reason: "stub_of.id must be a blyg item id" };
  if (typeof r.version !== "number" || !Number.isInteger(r.version) || r.version < 1) {
    return { ok: false, reason: "stub_of.version must be a positive integer" };
  }
  return { ok: true, stub: { origin, id: r.id, version: r.version } };
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
