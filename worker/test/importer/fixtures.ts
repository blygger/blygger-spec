// Deterministic offline fetch fixtures for importer unit tests — see
// src/importer/http.ts's FetchLike for why these don't go over real HTTP.
import { contentHash } from "../../src/util.ts";
import type { FetchLike } from "../../src/importer/http.ts";

export interface FixtureResponse {
  status?: number;
  body?: string;
  redirectTo?: string;
}

export interface FixtureFetch {
  fetch: FetchLike;
  /** URLs requested, in order (one entry per fetchFn call, not per redirect hop). */
  calls: string[];
}

/** Build a FetchLike backed by a URL->response map; `redirectTo` chains simulate real redirects. */
export function makeFixtureFetch(map: Record<string, FixtureResponse>): FixtureFetch {
  const calls: string[] = [];
  const fetch: FetchLike = async (url) => {
    calls.push(url);
    let current = url;
    for (let hops = 0; hops < 10; hops++) {
      const entry = map[current];
      if (!entry) {
        return { ok: false, status: 404, url: current, headers: new Headers(), text: async () => "" };
      }
      if (entry.redirectTo) {
        current = entry.redirectTo;
        continue;
      }
      const status = entry.status ?? 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        url: current,
        headers: new Headers(),
        text: async () => entry.body ?? "",
      };
    }
    throw new Error("fixture redirect loop");
  };
  return { fetch, calls };
}

export function manifestBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    blyg: "0.2",
    level: 1,
    generator: "blyg-ref/0.2.0",
    site: "https://example.com/blyg/",
    title: "Example",
    author: { name: "", bio: "", links: [] },
    feed: "feed.xml",
    items: "items/index.json",
    updated: "2026-08-10T00:00:00Z",
    ...overrides,
  });
}

export interface FeedItemSpec {
  id: string;
  version: number;
  kind?: "fragment" | "thread";
  itemUrl: string;
  guid?: string;
}

export function feedItemXml(spec: FeedItemSpec): string {
  const guid = spec.guid ?? `blyg:${spec.id}:v${spec.version}`;
  return `    <item>
      <guid isPermaLink="false">${guid}</guid>
      <link>https://example.com/blyg/f/${spec.id}/</link>
      <title>a title</title>
      <description><![CDATA[<p>content</p>]]></description>
      <pubDate>Sat, 10 Aug 2026 00:00:00 GMT</pubDate>
      <blyg:id>${spec.id}</blyg:id>
      <blyg:kind>${spec.kind ?? "fragment"}</blyg:kind>
      <blyg:version>${spec.version}</blyg:version>
      <blyg:created>2026-08-01T00:00:00Z</blyg:created>
      <blyg:item>${spec.itemUrl}</blyg:item>
    </item>`;
}

export function feedBody(opts: { manifestUrl?: string; items?: FeedItemSpec[] } = {}): string {
  const itemsXml = (opts.items ?? []).map(feedItemXml).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:blyg="https://blygger.org/ns/0.1">
  <channel>
    <title>Example</title>
    <link>https://example.com/blyg/</link>
    <description></description>
    <lastBuildDate>Sat, 10 Aug 2026 00:00:00 GMT</lastBuildDate>
    <blyg:level>1</blyg:level>
    ${opts.manifestUrl ? `<blyg:manifest>${opts.manifestUrl}</blyg:manifest>` : ""}
${itemsXml}
  </channel>
</rss>`;
}

export async function itemDocBody(opts: {
  id: string;
  kind: "fragment" | "thread" | "withdrawn";
  version: number;
  content_md?: string;
  content_hash?: string;
  created?: string;
  updated?: string;
}): Promise<string> {
  const contentMd = opts.kind === "withdrawn" ? "" : (opts.content_md ?? "hello");
  return JSON.stringify({
    blyg: "0.2",
    id: opts.id,
    kind: opts.kind,
    origin: "https://example.com/blyg/",
    author: null,
    created: opts.created ?? "2026-08-01T00:00:00Z",
    updated: opts.updated ?? "2026-08-01T00:00:00Z",
    version: opts.version,
    content_md: contentMd,
    content_html: opts.kind === "withdrawn" ? "" : `<p>${contentMd}</p>`,
    content_hash: opts.content_hash ?? (await contentHash(contentMd)),
    media: [],
    changelog: [],
  });
}

export function indexBody(items: { id: string; kind: string; version: number; updated?: string }[]): string {
  return JSON.stringify({
    updated: "2026-08-01T00:00:00Z",
    items: items.map((i) => ({ id: i.id, kind: i.kind, created: "2026-08-01T00:00:00Z", updated: i.updated ?? "2026-08-01T00:00:00Z", version: i.version })),
  });
}
