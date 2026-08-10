// Lenient feed parser — malformed-entry salvage, whole-feed failure,
// blyg:manifest upgrade detection.
import { describe, expect, it } from "vitest";
import { parseFeed } from "../../src/importer/feed.ts";

const GOOD_ITEM = `    <item>
      <guid isPermaLink="false">blyg:abc123:v3</guid>
      <link>https://a.example/blyg/f/abc123/</link>
      <title>a title</title>
      <description><![CDATA[<p>hello</p>]]></description>
      <pubDate>Sat, 10 Aug 2026 00:00:00 GMT</pubDate>
      <blyg:id>abc123</blyg:id>
      <blyg:kind>fragment</blyg:kind>
      <blyg:version>3</blyg:version>
      <blyg:created>2026-08-01T00:00:00Z</blyg:created>
      <blyg:item>https://a.example/blyg/items/abc123.json</blyg:item>
    </item>`;

function feedXml(items: string, opts: { manifest?: string } = {}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:blyg="https://blygger.org/ns/0.1">
  <channel>
    <title>Example</title>
    <link>https://a.example/blyg/</link>
    <description></description>
    <lastBuildDate>Sat, 10 Aug 2026 00:00:00 GMT</lastBuildDate>
    <blyg:level>1</blyg:level>
    ${opts.manifest ? `<blyg:manifest>${opts.manifest}</blyg:manifest>` : ""}
${items}
  </channel>
</rss>`;
}

describe("parseFeed() — §3.2/§7", () => {
  it("parses a well-formed feed's entries and blyg extensions", () => {
    const result = parseFeed(feedXml(GOOD_ITEM, { manifest: "https://a.example/blyg/blyg.json" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifestUrl).toBe("https://a.example/blyg/blyg.json");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      guid: "blyg:abc123:v3",
      link: "https://a.example/blyg/f/abc123/",
      title: "a title",
      description: "<p>hello</p>",
      blyg: { id: "abc123", kind: "fragment", version: 3, itemUrl: "https://a.example/blyg/items/abc123.json" },
    });
  });

  it("manifestUrl is null when the channel carries no <blyg:manifest>", () => {
    const result = parseFeed(feedXml(GOOD_ITEM));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.manifestUrl).toBeNull();
  });

  it("entries without blyg:id parse as plain L0 entries (no blyg field)", () => {
    const l0Item = `    <item>
      <guid>https://blog.example/posts/1</guid>
      <link>https://blog.example/posts/1</link>
      <title>a legacy post</title>
      <description>plain summary</description>
      <pubDate>Sat, 10 Aug 2026 00:00:00 GMT</pubDate>
    </item>`;
    const result = parseFeed(feedXml(l0Item));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].blyg).toBeUndefined();
    expect(result.entries[0].guid).toBe("https://blog.example/posts/1");
  });

  it("salvages a well-formed feed with one unidentifiable entry (no guid, no link)", () => {
    const badItem = `    <item>
      <title>orphan, no guid or link</title>
    </item>`;
    const result = parseFeed(feedXml(`${GOOD_ITEM}\n${badItem}`));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].guid).toBe("blyg:abc123:v3");
  });

  it("degrades a garbage blyg:version to undefined without dropping the entry", () => {
    const weirdItem = `    <item>
      <guid isPermaLink="false">blyg:zzz:vX</guid>
      <link>https://a.example/blyg/f/zzz/</link>
      <blyg:id>zzz</blyg:id>
      <blyg:version>not-a-number</blyg:version>
    </item>`;
    const result = parseFeed(feedXml(weirdItem));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].blyg?.id).toBe("zzz");
    expect(result.entries[0].blyg?.version).toBeUndefined();
  });

  it("reports failure for non-well-formed XML, without throwing", () => {
    expect(parseFeed("<rss><channel><item><guid>unclosed").ok).toBe(false);
    expect(parseFeed("not xml at all").ok).toBe(false);
  });

  it("reports failure for well-formed XML that isn't an RSS channel", () => {
    expect(parseFeed(`<?xml version="1.0"?><urlset><url><loc>x</loc></url></urlset>`).ok).toBe(false);
  });

  it("an empty channel (no items) parses fine with an empty entries array", () => {
    const result = parseFeed(feedXml(""));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entries).toEqual([]);
  });
});
