// Task 6 acceptance: manifest, archive index, CORS, 404/200 semantics
// shape-asserted against the §2.3–2.5 examples.
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

describe("manifest (§2.4)", () => {
  it("has the exact manifest shape", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", {
      site_title: "Venkat's ygg",
      author_name: "Venkatesh Rao",
      author_bio: "test bio",
      author_links: [{ label: "Home", url: "https://venkateshrao.com" }],
    });
    const res = await getPublic("/ygg/ygg.json");
    expect(res.status).toBe(200);
    const m = await res.json<any>();
    expect(m.ygg).toBe("0.1");
    expect(m.level).toBe(1);
    expect(m.generator).toBe("ygg-ref/0.1.0");
    expect(m.site).toBe("https://example.com/ygg/");
    expect(m.title).toBe("Venkat's ygg");
    expect(m.author.name).toBe("Venkatesh Rao");
    expect(m.author.bio).toBe("test bio");
    expect(m.author.links).toEqual([{ label: "Home", url: "https://venkateshrao.com" }]);
    expect(m.feed).toBe("feed.xml");
    expect(m.items).toBe("items/index.json");
    expect(m.updated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});

describe("archive index (§2.5)", () => {
  it("lists every published item + tombstone ordered by updated desc, no window", async () => {
    const cookie = await login();
    const a = await createAndPublish(cookie, "first");
    const b = await createAndPublish(cookie, "second");
    const c = await createAndPublish(cookie, "third, then deleted");
    await apiJson(cookie, "DELETE", `/api/items/${c}`);

    const index = await (await getPublic("/ygg/items/index.json")).json<any>();
    expect(index.updated).toMatch(/Z$/);
    const ids = index.items.map((i: any) => i.id);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
    expect(ids).toContain(c);
    for (const entry of index.items) {
      expect(Object.keys(entry).sort()).toEqual(["created", "id", "kind", "updated", "version"]);
    }
    const updates = index.items.map((i: any) => i.updated);
    expect([...updates].sort().reverse()).toEqual(updates);
  });
});

describe("CORS + timestamps", () => {
  it("serves permissive CORS on all public JSON/XML surfaces", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "cors check");
    for (const path of ["/ygg/ygg.json", "/ygg/items/index.json", "/ygg/feed.xml", `/ygg/items/${id}.json`]) {
      const res = await getPublic(path);
      expect(res.headers.get("access-control-allow-origin"), path).toBe("*");
    }
  });

  it("uses ISO 8601 Z timestamps in item JSON", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "time check");
    const item = await (await getPublic(`/ygg/items/${id}.json`)).json<any>();
    for (const ts of [item.created, item.updated, item.changelog[0].at]) {
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    }
  });

  it("404s unknown ids and non-json item paths", async () => {
    expect((await getPublic("/ygg/items/doesnotexist00000000000000.json")).status).toBe(404);
    expect((await getPublic("/ygg/items/whatever.txt")).status).toBe(404);
  });

  it("public routes carry cache headers", async () => {
    const res = await getPublic("/ygg/ygg.json");
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
  });
});
