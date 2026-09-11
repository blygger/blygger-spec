// /studio/reading (§3.6) end-to-end: own + imported + l0 fixtures render in
// clamped order with kind/l0 badges and a withdrawn placeholder.
import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { applyEffect, createSubscription, upsertL0Item } from "../../src/importer/store.ts";
import { transition } from "../../src/importer/transition.ts";
import { BASE, createAndPublish, login, STUDIO } from "../helpers.ts";
import { itemDocBody } from "./fixtures.ts";

describe("GET /studio/reading — §3.6", () => {
  it("renders own, imported, and l0 entries in clamped reverse-chron order with badges", async () => {
    const cookie = await login();
    // Own item, published "now" (well after everything else below).
    await createAndPublish(cookie, "my own fragment");

    // An imported blyg fragment, observed a bit before the own item.
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://friend.example/", feedUrl: "https://friend.example/feed.xml", title: "Friend" });
    const doc = await itemDocBody({ id: "remote-1", kind: "fragment", version: 1, content_md: "a friend's fragment", updated: "2020-01-01T00:00:00Z" });
    const tr = transition({ local: { status: "absent" }, doc: JSON.parse(doc) });
    await applyEffect(env.DB, sub.id, "remote-1", tr.effect, "2020-01-02T00:00:00Z");

    // An L0 legacy import, oldest of all.
    const l0Sub = await createSubscription(env.DB, { kind: "rss", origin: "https://blog.example/", feedUrl: "https://blog.example/rss.xml", title: "Legacy Blog" });
    await upsertL0Item(env.DB, l0Sub.id, "l0-post-1", {
      version: 1,
      created: "2019-01-01T00:00:00Z",
      updated: "2019-01-01T00:00:00Z",
      observedAt: "2019-01-01T00:00:00Z",
      contentMd: "[an old post](https://blog.example/1)\n\nsummary text",
      contentHtml: "<p><a href=\"https://blog.example/1\">an old post</a></p><p>summary text</p>",
      contentHash: "sha256:whatever",
    });

    const res = await SELF.fetch(`${BASE}${STUDIO}/reading`, { headers: { cookie } });
    expect(res.status).toBe(200);
    const html = await res.text();

    const ownIdx = html.indexOf("my own fragment");
    const importedIdx = html.indexOf("a friend&#39;s fragment") !== -1 ? html.indexOf("a friend&#39;s fragment") : html.indexOf("a friend");
    const l0Idx = html.indexOf("an old post");
    expect(ownIdx).toBeGreaterThan(-1);
    expect(importedIdx).toBeGreaterThan(-1);
    expect(l0Idx).toBeGreaterThan(-1);
    // Reverse-chron: own (newest) before imported before l0 (oldest).
    expect(ownIdx).toBeLessThan(importedIdx);
    expect(importedIdx).toBeLessThan(l0Idx);
    expect(html).toContain("legacy rss");
    expect(html).toContain("Friend");
  });

  it("renders a withdrawn imported item as a placeholder, no content", async () => {
    const cookie = await login();
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://friend2.example/", feedUrl: "https://friend2.example/feed.xml", title: "Friend2" });
    const doc = await itemDocBody({ id: "remote-2", kind: "fragment", version: 1, content_md: "secret content should not show" });
    const importTr = transition({ local: { status: "absent" }, doc: JSON.parse(doc) });
    await applyEffect(env.DB, sub.id, "remote-2", importTr.effect, "2026-08-01T00:00:00Z");

    const withdrawnDoc = await itemDocBody({ id: "remote-2", kind: "withdrawn", version: 2 });
    const withdrawTr = transition({ local: { status: "current", version: 1 }, doc: JSON.parse(withdrawnDoc) });
    await applyEffect(env.DB, sub.id, "remote-2", withdrawTr.effect, "2026-08-02T00:00:00Z");

    const res = await SELF.fetch(`${BASE}${STUDIO}/reading`, { headers: { cookie } });
    const html = await res.text();
    expect(html).toContain("withdrawn by origin");
    expect(html).not.toContain("secret content should not show");
  });

  it("requires auth", async () => {
    const res = await SELF.fetch(`${BASE}${STUDIO}/reading`, { redirect: "manual" });
    expect(res.status).toBe(302);
  });
});
