// Lenient feed parser — malformed-entry salvage, whole-feed failure,
// blyg:manifest upgrade detection, and (session 16) Atom 1.0 alongside RSS 2.0.
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

function atomXml(entries: string, opts: { manifest?: string } = {}): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:blyg="https://blygger.org/ns/0.1">
  <title>Example</title>
  <link href="https://a.example/" rel="alternate"/>
  <updated>2026-08-10T00:00:00Z</updated>
  ${opts.manifest ? `<blyg:manifest>${opts.manifest}</blyg:manifest>` : ""}
${entries}
</feed>`;
}

describe("parseFeed() — Atom 1.0 (session 16)", () => {
  it("parses a well-formed Atom entry, preferring rel=alternate for the link", () => {
    const entry = `  <entry>
    <id>tag:a.example,2026:1</id>
    <title>a title</title>
    <link href="https://a.example/2026/1/" rel="alternate"/>
    <link href="https://a.example/2026/1/comments" rel="replies"/>
    <published>2026-08-09T00:00:00Z</published>
    <updated>2026-08-10T00:00:00Z</updated>
    <summary>plain summary</summary>
  </entry>`;
    const result = parseFeed(atomXml(entry));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      guid: "tag:a.example,2026:1",
      link: "https://a.example/2026/1/",
      title: "a title",
      description: "plain summary",
      pubDate: "2026-08-09T00:00:00Z",
    });
    expect(result.entries[0].blyg).toBeUndefined();
  });

  it("prefers <content> over <summary>, and falls back to <updated> when <published> is absent", () => {
    const entry = `  <entry>
    <id>tag:a.example,2026:2</id>
    <link href="https://a.example/2026/2/"/>
    <updated>2026-08-11T00:00:00Z</updated>
    <summary>short</summary>
    <content type="html">full &lt;b&gt;body&lt;/b&gt;</content>
  </entry>`;
    const result = parseFeed(atomXml(entry));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries[0].description).toBe("full <b>body</b>");
    expect(result.entries[0].pubDate).toBe("2026-08-11T00:00:00Z");
  });

  it("falls back to the link when there's no rel=alternate and no unmarked link", () => {
    const entry = `  <entry>
    <id>tag:a.example,2026:3</id>
    <link href="https://a.example/2026/3/self" rel="self"/>
  </entry>`;
    const result = parseFeed(atomXml(entry));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries[0].link).toBe("https://a.example/2026/3/self");
  });

  it("falls back to the link as guid when <id> is missing", () => {
    const entry = `  <entry>
    <title>no id</title>
    <link href="https://a.example/2026/4/" rel="alternate"/>
  </entry>`;
    const result = parseFeed(atomXml(entry));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries[0].guid).toBe("https://a.example/2026/4/");
  });

  it("salvages a well-formed Atom feed with one unidentifiable entry (no id, no link)", () => {
    const good = `  <entry>
    <id>tag:a.example,2026:5</id>
    <link href="https://a.example/2026/5/" rel="alternate"/>
  </entry>`;
    const orphan = `  <entry>
    <title>orphan, no id or link</title>
  </entry>`;
    const result = parseFeed(atomXml(`${good}\n${orphan}`));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].guid).toBe("tag:a.example,2026:5");
  });

  it("an empty feed (no entries) parses fine with an empty entries array", () => {
    const result = parseFeed(atomXml(""));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entries).toEqual([]);
  });

  it("reads blyg:manifest off the Atom feed root when present", () => {
    const result = parseFeed(atomXml("", { manifest: "https://a.example/blyg/blyg.json" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.manifestUrl).toBe("https://a.example/blyg/blyg.json");
  });
});
