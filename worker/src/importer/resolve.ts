// Resolution algorithm — v0.2-plan.md §2.1, locked decision #17. Given any
// URL found out-of-band, deterministically and boundedly (<=6 fetches)
// determine what to subscribe to: normalize -> direct manifest probe ->
// feed-upgrade -> one-hop rel="blyg" probe -> conventional-mount probes ->
// RSS fallback. Subscription identity is always the final fetch origin,
// never the manifest's self-asserted `site` — a mirror must not inherit
// another origin's identity (§11.7).

import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { FetchLike, FetchResult } from "./http.ts";
import { platformFetch } from "./http.ts";

export type BlygManifestLike = Record<string, unknown> & { blyg: unknown };

export type ResolveResult =
  | { kind: "blyg"; origin: string; manifest: BlygManifestLike; siteMismatch?: { asserted: string; actual: string } }
  | { kind: "rss"; feedUrl: string }
  | { kind: "failure"; tried: string[] };

interface LinkTag {
  rel: string;
  href: string;
  type: string;
}

/** Step 1: strip query/fragment, ensure a trailing "/". */
function normalizeOrigin(raw: string): string {
  const u = new URL(raw);
  u.search = "";
  u.hash = "";
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return u.toString();
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isManifestLike(v: unknown): v is BlygManifestLike {
  return !!v && typeof v === "object" && "blyg" in (v as Record<string, unknown>);
}

/**
 * Fetch `{originUrl}blyg.json` and test parse-success — never Content-Type
 * (§2.1 step 2: dumb static hosts misreport it). Skips (no fetch) a URL
 * already recorded in `tried`, so callers get the "skip already-probed
 * URLs" rule (step 5) for free.
 */
async function probeManifest(
  originUrl: string,
  fetchFn: FetchLike,
  tried: string[],
): Promise<{ origin: string; manifest: BlygManifestLike } | null> {
  const url = originUrl + "blyg.json";
  if (tried.includes(url)) return null;
  tried.push(url);
  let res: FetchResult;
  try {
    res = await fetchFn(url);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const parsed = safeJsonParse(await res.text());
  if (!isManifestLike(parsed)) return null;
  // Identity = final fetch origin, i.e. the manifest URL actually reached, minus the filename.
  const finalUrl = new URL(res.url || url);
  finalUrl.pathname = finalUrl.pathname.replace(/blyg\.json$/, "");
  finalUrl.search = "";
  finalUrl.hash = "";
  return { origin: finalUrl.toString(), manifest: parsed };
}

/** Compare the manifest's self-asserted `site` to resolved identity; never adopt it, only flag disagreement. */
function finalizeBlyg({ origin, manifest }: { origin: string; manifest: BlygManifestLike }): ResolveResult {
  const result: ResolveResult = { kind: "blyg", origin, manifest };
  const asserted = typeof manifest.site === "string" ? manifest.site : undefined;
  if (asserted) {
    let normalizedAsserted: string | null;
    try {
      normalizedAsserted = normalizeOrigin(asserted);
    } catch {
      normalizedAsserted = null;
    }
    if (normalizedAsserted !== origin) {
      result.siteMismatch = { asserted, actual: origin };
    }
  }
  return result;
}

/** Does `xml` parse as an RSS feed, and if so, does its channel carry `<blyg:manifest>` (§7 feed-upgrade)? */
function extractFeedManifestUrl(xml: string): { isFeed: boolean; manifestUrl: string | null } {
  if (XMLValidator.validate(xml) !== true) return { isFeed: false, manifestUrl: null };
  let parsed: unknown;
  try {
    parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  } catch {
    return { isFeed: false, manifestUrl: null };
  }
  const channel = (parsed as Record<string, any>)?.rss?.channel;
  if (!channel) return { isFeed: false, manifestUrl: null };
  const manifestUrl = typeof channel["blyg:manifest"] === "string" ? channel["blyg:manifest"] : null;
  return { isFeed: true, manifestUrl };
}

/** `<link>` tags of an HTML document, via HTMLRewriter (no DOM dependency). */
async function extractLinkTags(html: string): Promise<LinkTag[]> {
  const found: LinkTag[] = [];
  const rewriter = new HTMLRewriter().on("link", {
    element(el) {
      found.push({
        rel: el.getAttribute("rel") ?? "",
        href: el.getAttribute("href") ?? "",
        type: el.getAttribute("type") ?? "",
      });
    },
  });
  await rewriter.transform(new Response(html)).text();
  return found;
}

function hasRelToken(rel: string, token: string): boolean {
  return rel.toLowerCase().split(/\s+/).includes(token);
}

export async function resolve(inputUrl: string, fetchFn: FetchLike = platformFetch): Promise<ResolveResult> {
  const tried: string[] = [];

  // Step 1: normalize.
  let candidate: string;
  try {
    candidate = normalizeOrigin(inputUrl);
  } catch {
    return { kind: "failure", tried };
  }

  // Step 2: direct probe.
  const direct = await probeManifest(candidate, fetchFn, tried);
  if (direct) return finalizeBlyg(direct);

  // Steps 3/4: fetch the input URL itself once; branch on what it parses as.
  let l0FeedUrl: string | null = null;
  if (!tried.includes(inputUrl)) {
    let res: FetchResult | null = null;
    try {
      res = await fetchFn(inputUrl);
    } catch {
      res = null;
    }
    tried.push(inputUrl);
    if (res && res.ok) {
      const finalUrl = res.url || inputUrl;
      const bodyText = await res.text().catch(() => "");
      const feedProbe = extractFeedManifestUrl(bodyText);
      if (feedProbe.isFeed) {
        // Step 3: feed upgrade.
        if (feedProbe.manifestUrl) {
          const abs = new URL(feedProbe.manifestUrl, finalUrl).toString();
          if (!tried.includes(abs)) {
            tried.push(abs);
            try {
              const res2 = await fetchFn(abs);
              if (res2.ok) {
                const parsed = safeJsonParse(await res2.text());
                if (isManifestLike(parsed)) {
                  const url = new URL(res2.url || abs);
                  url.pathname = url.pathname.replace(/blyg\.json$/, "");
                  url.search = "";
                  url.hash = "";
                  return finalizeBlyg({ origin: url.toString(), manifest: parsed });
                }
              }
            } catch {
              // fall through — held as the L0 candidate below
            }
          }
        }
        // No manifest link, or the upgrade fetch failed — hold as the L0 candidate, keep going.
        l0FeedUrl = finalUrl;
      } else {
        // Step 4: HTML rel probe. One hop only — the rel target's own HTML is never scanned.
        const links = await extractLinkTags(bodyText);
        const relBlyg = links.find((l) => hasRelToken(l.rel, "blyg") && l.href);
        if (relBlyg) {
          let hrefOrigin: string | null = null;
          try {
            hrefOrigin = normalizeOrigin(new URL(relBlyg.href, finalUrl).toString());
          } catch {
            hrefOrigin = null;
          }
          if (hrefOrigin) {
            const relResult = await probeManifest(hrefOrigin, fetchFn, tried);
            if (relResult) return finalizeBlyg(relResult);
          }
        }
        // Step 6 prep: standard RSS/Atom autodiscovery on this HTML.
        const relRss = links.find((l) => hasRelToken(l.rel, "alternate") && /rss|atom/.test(l.type) && l.href);
        if (relRss) {
          try {
            l0FeedUrl = new URL(relRss.href, finalUrl).toString();
          } catch {
            l0FeedUrl = null;
          }
        }
      }
    }
  }

  // Step 5: conventional-mount probes — courtesy fallback only (decision #14: the mount is free).
  const hostOrigin = new URL(candidate).origin;
  for (const base of [`${hostOrigin}/blyg/`, `${hostOrigin}/`]) {
    const r = await probeManifest(base, fetchFn, tried);
    if (r) return finalizeBlyg(r);
  }

  // Step 6: RSS fallback.
  if (l0FeedUrl) return { kind: "rss", feedUrl: l0FeedUrl };
  return { kind: "failure", tried };
}
