// Task 7 acceptance: feed.xml validates as RSS 2.0 and follows §2.6 exactly.
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

async function fetchFeed(): Promise<string> {
  const res = await getPublic("/ygg/feed.xml");
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("application/rss+xml");
  return res.text();
}

function parse(xml: string) {
  expect(XMLValidator.validate(xml)).toBe(true);
  return new XMLParser({ ignoreAttributes: false, isArray: (name) => name === "item" }).parse(xml);
}

describe("feed.xml (§2.6)", () => {
  it("is valid RSS 2.0 with the ygg namespace and channel metadata", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_title: "Venkat's ygg", author_bio: "a bio" });
    await createAndPublish(cookie, "a fragment");

    const doc = parse(await fetchFeed());
    expect(doc.rss["@_version"]).toBe("2.0");
    expect(doc.rss["@_xmlns:ygg"]).toBe("https://github.com/vgururao/ygg/ns/0.1");
    const ch = doc.rss.channel;
    expect(ch.title).toBe("Venkat's ygg");
    expect(ch.link).toBe("https://example.com/ygg/");
    expect(ch.description).toBe("a bio");
    expect(new Date(ch.lastBuildDate).toString()).not.toBe("Invalid Date");
    expect(ch["ygg:level"]).toBe(1);
    expect(ch["ygg:manifest"]).toBe("https://example.com/ygg/ygg.json");
  });

  it("item entries carry guid, link, title, pubDate, and ygg extensions", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "some **bold** text for the feed", "first note");
    const doc = parse(await fetchFeed());
    const item = doc.rss.channel.item.find((i: any) => i["ygg:id"] === id);
    expect(item).toBeDefined();
    expect(item.guid["#text"]).toBe(`ygg:${id}:v1`);
    expect(item.guid["@_isPermaLink"]).toBe("false");
    expect(item.link).toBe(`https://example.com/ygg/f/${id}/`);
    expect(item.title).toBe("first note — some bold text for the feed");
    expect(new Date(item.pubDate).toString()).not.toBe("Invalid Date");
    expect(item.description).toContain("<strong>bold</strong>");
    expect(item["ygg:kind"]).toBe("fragment");
    expect(item["ygg:version"]).toBe(1);
    expect(String(item["ygg:created"])).toMatch(/Z$/);
    expect(item["ygg:item"]).toBe(`https://example.com/ygg/items/${id}.json`);
  });

  it("windows to the latest 50 publish events", async () => {
    const cookie = await login();
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) ids.push(await createAndPublish(cookie, `fragment number ${i}`));
    // Republish some items to exceed 50 events total: 12 + 4*10 = 52.
    for (let round = 0; round < 10; round++) {
      for (const id of ids.slice(0, 4)) {
        await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: `round ${round}` });
        await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});
      }
    }
    const doc = parse(await fetchFeed());
    expect(doc.rss.channel.item.length).toBe(50);
  });

  it("survives hostile content: ]]> and XML metacharacters", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, 'a ]]> b & <angle> "quotes"', 'note & <tag>');
    const xml = await fetchFeed();
    const doc = parse(xml);
    const item = doc.rss.channel.item.find((i: any) => i["ygg:id"] === id);
    expect(item.title).toContain("note & <tag>");
    expect(item.description).toContain("]]&gt;");
  });

  it("truncates long titles to ~60 chars of plain text", async () => {
    const cookie = await login();
    const long = "word ".repeat(50).trim();
    const id = await createAndPublish(cookie, long);
    const doc = parse(await fetchFeed());
    const item = doc.rss.channel.item.find((i: any) => i["ygg:id"] === id);
    expect(item.title.length).toBeLessThanOrEqual(62);
    expect(item.title.endsWith("…")).toBe(true);
  });
});
