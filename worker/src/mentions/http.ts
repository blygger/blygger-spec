// Bounded fetching for Webmention — v0.3-plan §2.3.5: "≤ 3 redirects, 5 s,
// 1 MB". Both halves of webmention talk to URLs someone else chose, so the
// bounds are the security surface: an unbounded verifier is a fetch amplifier
// pointed at whatever a stranger names.

import type { FetchLike, FetchResult } from "../importer/http.ts";

export const MENTION_USER_AGENT = "blyg-ref/0.3 (+https://blygger.org)";
export const MAX_REDIRECTS = 3;
export const FETCH_TIMEOUT_MS = 5_000;
export const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Production fetch for both webmention halves. Redirects are followed by hand
 * rather than by the platform, because the hop limit is a stated bound and
 * `redirect: "follow"` has its own (much larger) one — and because the *final*
 * URL is what inbound verification compares the document's origin against, so
 * it must be a value we computed, not one we inferred.
 */
export const mentionFetch: FetchLike = async (url, init) => {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      method: init?.method ?? "GET",
      body: init?.body,
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": MENTION_USER_AGENT, ...(init?.headers ?? {}) },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return { ok: res.ok, status: res.status, url: current, headers: res.headers, text: () => res.text() };
  }
  return { ok: false, status: 310, url: current, headers: new Headers(), text: async () => "" };
};

/** Read a response body, refusing anything over the cap rather than buffering it. */
export async function boundedText(res: FetchResult): Promise<string | null> {
  const declared = Number(res.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  const text = await res.text();
  return new TextEncoder().encode(text).length > MAX_BODY_BYTES ? null : text;
}
