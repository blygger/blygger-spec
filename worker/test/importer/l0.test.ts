// L0 legacy RSS wrapper (§3.5): imports as summary fragments; a GUID
// reappearing with changed content bumps the local version.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { pollL0Subscription } from "../../src/importer/l0.ts";
import { createSubscription, listImportedItems } from "../../src/importer/store.ts";
import { makeFixtureFetch } from "./fixtures.ts";

const FEED_URL = "https://blog.example/rss.xml";

function legacyFeed(items: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>A Legacy Blog</title>
    <link>https://blog.example/</link>
    <description>plain old blog</description>
${items}
  </channel>
</rss>`;
}

function legacyItem(opts: { guid: string; link: string; title: string; description: string }): string {
  return `    <item>
      <guid>${opts.guid}</guid>
      <link>${opts.link}</link>
      <title>${opts.title}</title>
      <description><![CDATA[${opts.description}]]></description>
      <pubDate>Sat, 10 Aug 2026 00:00:00 GMT</pubDate>
    </item>`;
}

describe("pollL0Subscription() — §3.5", () => {
  it("imports legacy entries as summary fragment + link, tagged l0", async () => {
    const sub = await createSubscription(env.DB, { kind: "rss", origin: FEED_URL, feedUrl: FEED_URL, title: "Legacy" });
    const { fetch } = makeFixtureFetch({
      [FEED_URL]: {
        body: legacyFeed(
          legacyItem({ guid: "post-1", link: "https://blog.example/1", title: "First post", description: "<p>hello <b>world</b></p>" }),
        ),
      },
    });
    const result = await pollL0Subscription(env.DB, sub, fetch);
    expect(result).toEqual({ outcome: "polled", itemsChanged: 1 });

    const items = await listImportedItems(env.DB, sub.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "fragment", state: "current", version: 1, l0: 1 });
    expect(items[0].content_md).toContain("[First post](https://blog.example/1)");
    expect(items[0].content_md).toContain("hello world");
    expect(items[0].content_html).toContain("First post");
  });

  it("a GUID reappearing with changed content bumps the local version", async () => {
    const sub = await createSubscription(env.DB, { kind: "rss", origin: FEED_URL, feedUrl: FEED_URL, title: "Legacy" });
    const { fetch: fetch1 } = makeFixtureFetch({
      [FEED_URL]: { body: legacyFeed(legacyItem({ guid: "post-1", link: "https://blog.example/1", title: "v1 title", description: "v1 body" })) },
    });
    await pollL0Subscription(env.DB, sub, fetch1);
    let items = await listImportedItems(env.DB, sub.id);
    expect(items[0].version).toBe(1);

    const { fetch: fetch2 } = makeFixtureFetch({
      [FEED_URL]: { body: legacyFeed(legacyItem({ guid: "post-1", link: "https://blog.example/1", title: "v2 title (edited)", description: "v2 body" })) },
    });
    await pollL0Subscription(env.DB, sub, fetch2);
    items = await listImportedItems(env.DB, sub.id);
    expect(items).toHaveLength(1); // same synthetic id, not a duplicate
    expect(items[0].version).toBe(2);
    expect(items[0].content_md).toContain("v2 title (edited)");
  });

  it("re-polling identical content is a no-op (no version bump)", async () => {
    const sub = await createSubscription(env.DB, { kind: "rss", origin: FEED_URL, feedUrl: FEED_URL, title: "Legacy" });
    const feed = legacyFeed(legacyItem({ guid: "post-1", link: "https://blog.example/1", title: "stable", description: "unchanged" }));
    const { fetch: fetch1 } = makeFixtureFetch({ [FEED_URL]: { body: feed } });
    await pollL0Subscription(env.DB, sub, fetch1);
    const { fetch: fetch2 } = makeFixtureFetch({ [FEED_URL]: { body: feed } });
    const result = await pollL0Subscription(env.DB, sub, fetch2);
    expect(result.itemsChanged).toBe(0);
    const items = await listImportedItems(env.DB, sub.id);
    expect(items[0].version).toBe(1);
  });

  it("uses link as the synthetic-id key when an entry has no guid", async () => {
    const sub = await createSubscription(env.DB, { kind: "rss", origin: FEED_URL, feedUrl: FEED_URL, title: "Legacy" });
    const noGuidItem = `    <item>
      <link>https://blog.example/no-guid</link>
      <title>no guid here</title>
      <description>text</description>
    </item>`;
    const { fetch } = makeFixtureFetch({ [FEED_URL]: { body: legacyFeed(noGuidItem) } });
    const result = await pollL0Subscription(env.DB, sub, fetch);
    expect(result.itemsChanged).toBe(1);
  });

  it("304 Not Modified changes nothing", async () => {
    const sub = await createSubscription(env.DB, { kind: "rss", origin: FEED_URL, feedUrl: FEED_URL, title: "Legacy" });
    const { fetch } = makeFixtureFetch({ [FEED_URL]: { status: 304 } });
    const result = await pollL0Subscription(env.DB, sub, fetch);
    expect(result).toEqual({ outcome: "not-modified", itemsChanged: 0 });
  });
});
