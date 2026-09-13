// Public hopper pages + blogroll (§2.2/§4.2 task 11): OPML validates;
// non-public hopper 404s; blogroll 404s when empty; manifest carries the
// blogroll key only when non-empty.
import { XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { applyEffect, createHopper, createSubscription, setBlogrollFlag, setHopperPublic, addHopperItem } from "../../src/importer/store.ts";
import { transition } from "../../src/importer/transition.ts";
import { apiJson, getPublic, login } from "../helpers.ts";
import { env } from "cloudflare:test";
import { itemDocBody } from "./fixtures.ts";

describe("blogroll.opml (§2.2)", () => {
  it("404s when no subscription is flagged public", async () => {
    const res = await getPublic("/blyg/blogroll.opml");
    expect(res.status).toBe(404);
  });

  it("serves valid OPML 2.0 once a subscription is in the blogroll, and the manifest carries the key", async () => {
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://friend.example/", feedUrl: "https://friend.example/feed.xml", title: "Friend" });
    await setBlogrollFlag(env.DB, sub.id, true);

    const res = await getPublic("/blyg/blogroll.opml");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("opml");
    const xml = await res.text();
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(xml).toContain('xmlUrl="https://friend.example/feed.xml"');
    expect(xml).toContain('type="rss"');

    const manifest = await (await getPublic("/blyg/blyg.json")).json<any>();
    expect(manifest.blogroll).toBe("blogroll.opml");
  });

  it("a paused subscription drops out of the blogroll", async () => {
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://paused.example/", feedUrl: "https://paused.example/feed.xml", title: "Paused" });
    await setBlogrollFlag(env.DB, sub.id, true);
    const cookie = await login();
    await apiJson(cookie, "POST", `/api/subscriptions/${sub.id}/pause`);
    const xml = await (await getPublic("/blyg/blogroll.opml")).text().catch(() => "");
    expect(xml).not.toContain("paused.example");
  });
});

describe("public hopper page (§4.2 task 11)", () => {
  it("404s for an unknown slug", async () => {
    const res = await getPublic("/blyg/h/nope/");
    expect(res.status).toBe(404);
  });

  it("404s for a hopper that isn't public", async () => {
    const hopper = await createHopper(env.DB, "Private", "private-hopper");
    void hopper;
    const res = await getPublic("/blyg/h/private-hopper/");
    expect(res.status).toBe(404);
  });

  it("renders snapshots + source attribution for a public hopper", async () => {
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://curated-source.example/", feedUrl: "https://curated-source.example/feed.xml", title: "Curated Source" });
    const doc = await itemDocBody({ id: "curated-1", kind: "fragment", version: 1, content_md: "curated public content" });
    const tr = transition({ local: { status: "absent" }, doc: JSON.parse(doc) });
    await applyEffect(env.DB, sub.id, "curated-1", tr.effect, "2026-08-01T00:00:00Z");

    const hopper = await createHopper(env.DB, "Public Picks", "public-picks");
    await addHopperItem(env.DB, hopper.id, sub.id, "curated-1");
    await setHopperPublic(env.DB, hopper.id, true);

    const res = await getPublic("/blyg/h/public-picks/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("curated public content");
    expect(html).toContain("Curated Source");
    expect(html).toContain("https://curated-source.example/");
  });

  it("renders a withdrawn-unpinned item as a placeholder, never re-exposing content", async () => {
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://withdrawn-source.example/", feedUrl: "https://withdrawn-source.example/feed.xml", title: "W" });
    const doc = await itemDocBody({ id: "gone-1", kind: "fragment", version: 1, content_md: "should not survive withdrawal" });
    const importTr = transition({ local: { status: "absent" }, doc: JSON.parse(doc) });
    await applyEffect(env.DB, sub.id, "gone-1", importTr.effect, "2026-08-01T00:00:00Z");
    const hopper = await createHopper(env.DB, "Withdrawn Test", "withdrawn-test");
    await addHopperItem(env.DB, hopper.id, sub.id, "gone-1");
    await setHopperPublic(env.DB, hopper.id, true);
    const withdrawnDoc = await itemDocBody({ id: "gone-1", kind: "withdrawn", version: 2 });
    const withdrawTr = transition({ local: { status: "current", version: 1 }, doc: JSON.parse(withdrawnDoc) });
    await applyEffect(env.DB, sub.id, "gone-1", withdrawTr.effect, "2026-08-02T00:00:00Z");

    const res = await getPublic("/blyg/h/withdrawn-test/");
    const html = await res.text();
    expect(html).toContain("Withdrawn by origin");
    expect(html).not.toContain("should not survive withdrawal");
  });
});

describe("rel=\"blogroll\" on the HTML feed page (§2.2)", () => {
  it("is present once the blogroll is non-empty", async () => {
    // Note: tests in this file share one D1 instance, so an earlier test
    // may have already flagged a subscription into the blogroll — this
    // only asserts the positive case, not before/after isolation.
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://rel-check.example/", feedUrl: "https://rel-check.example/feed.xml", title: "Rel" });
    await setBlogrollFlag(env.DB, sub.id, true);
    const html = await (await getPublic("/blyg/")).text();
    expect(html).toContain('rel="blogroll" href="/blyg/blogroll.opml"');
  });

  it("also renders the blogroll for people, from the same source as the OPML", async () => {
    const blyg = await createSubscription(env.DB, { kind: "blyg", origin: "https://a-blyg.example/", feedUrl: "https://a-blyg.example/feed.xml", title: "A Blyg" });
    const rss = await createSubscription(env.DB, { kind: "rss", origin: "https://legacy.example/", feedUrl: "https://legacy.example/rss", title: "Legacy Blog" });
    await setBlogrollFlag(env.DB, blyg.id, true);
    await setBlogrollFlag(env.DB, rss.id, true);
    const html = await (await getPublic("/blyg/")).text();
    // The OPML was readable by feed readers and invisible to people, which is
    // backwards for a list whose whole job is pointing readers elsewhere.
    expect(html).toContain('<a href="https://a-blyg.example/">A Blyg</a>');
    expect(html).toContain('<a href="https://legacy.example/">Legacy Blog</a>');
    // A native blyg is marked as one; a plain feed is not.
    expect(html).toMatch(/<span class="blyg-mark"[^>]*>blyg<\/span> <a href="https:\/\/a-blyg.example\/">/);
    expect(html).not.toMatch(/blyg-mark[^>]*>blyg<\/span> <a href="https:\/\/legacy.example\/">/);
    expect(html).toContain('<a href="/blyg/blogroll.opml">blogroll.opml</a>');
  });

  it("omits the section entirely when nothing is flagged", async () => {
    // A separate page with no blogroll: the archive, which never carries one.
    const archive = await (await getPublic("/blyg/archive/")).text();
    expect(archive).not.toContain('class="blogroll"');
  });
});
