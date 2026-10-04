// The network between origins and readers. It never invents content: every
// fault is something real HTTP + caches + lossy feeds do (§13.2 lists them):
// dropped/reordered/duplicated feed entries, 5xx, a garbled feed, and a stale
// CDN cache serving an earlier body for the same URL.
import type { Served } from "./publisher.ts";

export interface Origin { origin: string; serve(path: string): Served }

export type Fault =
  | { kind: "none" }
  | { kind: "feed5xx" }
  | { kind: "index5xx" }
  | { kind: "item5xx"; idx: number }
  | { kind: "dropEntries"; mask: number }
  | { kind: "reorder"; rot: number }
  | { kind: "duplicate" }
  | { kind: "garbledFeed" }
  | { kind: "stale" };

export interface FetchEvent { reader: string; url: string; status: number; note?: string }
export type ModelFetch = (url: string) => Promise<Served>;

export class Network {
  readonly origins = new Map<string, Origin>();
  /** Per-reader cache of the last body served per URL (what a stale CDN would replay). */
  private cache = new Map<string, Map<string, string>>();
  log: FetchEvent[] = [];

  add(o: Origin) { this.origins.set(o.origin, o); }

  private route(url: string): { o: Origin; path: string } | null {
    for (const [base, o] of this.origins) if (url.startsWith(base)) return { o, path: url.slice(base.length) };
    return null;
  }

  /**
   * A fetch function for one reader under one fault. `itemIds` lets the item5xx
   * fault target one id from the pool deterministically, so the model reader and
   * the studio importer see exactly the same responses for the same command.
   */
  fetcher(reader: string, fault: Fault, itemIds: readonly string[]): ModelFetch {
    let cache = this.cache.get(reader);
    if (!cache) this.cache.set(reader, (cache = new Map()));
    const c = cache;
    return async (url: string) => {
      const r = this.route(url);
      let res: Served = r ? r.o.serve(r.path) : { status: 404, body: "" };
      let note: string | undefined;
      const path = r?.path ?? "";
      const isFeed = path === "feed.xml";
      if (fault.kind === "feed5xx" && isFeed) { res = { status: 503, body: "" }; note = "5xx"; }
      else if (fault.kind === "index5xx" && path === "items/index.json") { res = { status: 503, body: "" }; note = "5xx"; }
      else if (fault.kind === "item5xx" && path.startsWith(`items/${itemIds[fault.idx % itemIds.length]}`)) { res = { status: 503, body: "" }; note = "5xx"; }
      else if (fault.kind === "garbledFeed" && isFeed) { res = { status: 200, body: "<rss><channel><item>" }; note = "garbled"; }
      else if (fault.kind === "stale" && res.status === 200 && c.has(url)) { res = { status: 200, body: c.get(url)! }; note = "stale cache"; }
      else if (isFeed && res.status === 200 && (fault.kind === "dropEntries" || fault.kind === "reorder" || fault.kind === "duplicate")) {
        const { body, n } = rewriteFeed(res.body, fault);
        res = { status: 200, body };
        note = `${fault.kind}${n !== undefined ? ` (${n})` : ""}`;
      }
      if (res.status === 200 && note !== "stale cache" && note !== "garbled") c.set(url, res.body);
      this.log.push({ reader, url, status: res.status, ...(note ? { note } : {}) });
      return res;
    };
  }
}

function rewriteFeed(xml: string, fault: Fault): { body: string; n?: number } {
  const items: string[] = xml.match(/ {4}<item>[\s\S]*?<\/item>/g) ?? [];
  if (!items.length) return { body: xml };
  const head = xml.slice(0, xml.indexOf(items[0]));
  const tail = xml.slice(xml.lastIndexOf(items[items.length - 1]) + items[items.length - 1].length);
  let out: string[] = [...items];
  if (fault.kind === "dropEntries") out = items.filter((_, i) => ((fault.mask >> i) & 1) === 0);
  if (fault.kind === "reorder") { const k = fault.rot % items.length; out = [...items.slice(k), ...items.slice(0, k)]; }
  if (fault.kind === "duplicate") out = items.flatMap((x) => [x, x]);
  return { body: head + out.join("\n") + tail, n: items.length - out.length };
}
