// Endpoint discovery for outbound mentions — v0.3-plan §2.3.4, decision #28.
// A blyg says where to send in its manifest; everyone else says it the W3C
// way. Nothing found is a normal outcome, not a failure: a static blyg is
// fully conformant and simply unreachable this way.

import type { FetchLike } from "../importer/http.ts";
import { boundedText } from "./http.ts";

export type DiscoveryResult = { endpoint: string; reason?: undefined } | { endpoint: null; reason: string };

/** `rel="webmention"` in an HTTP Link header, per RFC 8288. */
export function endpointFromLinkHeader(header: string | null, base: string): string | null {
  if (!header) return null;
  // Split on commas that separate link-values, not on commas inside <…>.
  for (const part of header.split(/,(?=\s*<)/)) {
    const m = /^\s*<([^>]*)>\s*(.*)$/.exec(part);
    if (!m) continue;
    const rels = /rel\s*=\s*"?([^";]+)"?/i.exec(m[2]);
    if (!rels) continue;
    if (rels[1].toLowerCase().split(/\s+/).includes("webmention")) {
      try {
        return new URL(m[1], base).toString();
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** First `<link>`/`<a>` carrying `rel="webmention"`, resolved against the page. */
export function endpointFromHtml(html: string, base: string): string | null {
  const tag = /<(link|a)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    const rel = /\brel\s*=\s*["']?([^"'>]+)["']?/i.exec(m[0]);
    if (!rel || !rel[1].toLowerCase().split(/\s+/).includes("webmention")) continue;
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
 * Where to POST a mention about `target`.
 *
 * 1. A blyg target (we know its origin): its manifest's `webmention` key,
 *    origin-relative allowed. One conditional GET against a surface we
 *    already subscribe to.
 * 2. Otherwise W3C discovery on the target URL: `Link` header first (HEAD,
 *    then GET if the HEAD carried none), then the document's own markup.
 * 3. Nothing → `no_endpoint`, and the caller never retries.
 */
export async function discoverEndpoint(target: string, fetchFn: FetchLike, blygOrigin?: string): Promise<DiscoveryResult> {
  if (blygOrigin) {
    const manifestUrl = `${blygOrigin}blyg.json`;
    try {
      const res = await fetchFn(manifestUrl);
      if (res.ok) {
        const body = await boundedText(res);
        const manifest = body ? (JSON.parse(body) as Record<string, unknown>) : null;
        if (manifest && typeof manifest.webmention === "string" && manifest.webmention) {
          return { endpoint: new URL(manifest.webmention, manifestUrl).toString() };
        }
        // A manifest without the key is a publisher saying "I don't receive".
        return { endpoint: null, reason: "origin advertises no webmention endpoint" };
      }
    } catch {
      // Fall through to W3C discovery — an unreachable manifest is not proof.
    }
  }

  try {
    const head = await fetchFn(target, { method: "HEAD" });
    const fromHead = endpointFromLinkHeader(head.headers.get("link"), head.url);
    if (fromHead) return { endpoint: fromHead };

    const get = await fetchFn(target);
    const fromHeader = endpointFromLinkHeader(get.headers.get("link"), get.url);
    if (fromHeader) return { endpoint: fromHeader };
    if (!get.ok) return { endpoint: null, reason: `target fetch returned ${get.status}` };
    const html = await boundedText(get);
    const fromHtml = html ? endpointFromHtml(html, get.url) : null;
    if (fromHtml) return { endpoint: fromHtml };
  } catch (e) {
    return { endpoint: null, reason: `discovery failed: ${(e as Error).message}` };
  }
  return { endpoint: null, reason: "no webmention endpoint advertised" };
}
