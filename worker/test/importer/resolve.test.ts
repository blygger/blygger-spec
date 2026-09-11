// Resolution algorithm (§2.1, decision #17) — every ordered step, one-hop
// rel, redirect identity, site-vs-origin discrepancy, bounded probe count,
// failure trail.
import { describe, expect, it } from "vitest";
import { resolve } from "../../src/importer/resolve.ts";
import { atomFeedBody, feedBody, makeFixtureFetch, manifestBody } from "./fixtures.ts";

describe("resolve() — §2.1", () => {
  it("step 2: direct probe resolves a blyg", async () => {
    const { fetch } = makeFixtureFetch({
      "https://a.example/blyg.json": { body: manifestBody({ site: "https://a.example/" }) },
    });
    const result = await resolve("https://a.example/", fetch);
    expect(result).toMatchObject({ kind: "blyg", origin: "https://a.example/" });
  });

  it("normalizes a bare path (no trailing slash) before the direct probe", async () => {
    const { fetch, calls } = makeFixtureFetch({
      "https://a.example/sub/blyg.json": { body: manifestBody({ site: "https://a.example/sub/" }) },
      "https://a.example/sub": { status: 404 },
    });
    const result = await resolve("https://a.example/sub", fetch);
    expect(result).toMatchObject({ kind: "blyg", origin: "https://a.example/sub/" });
    expect(calls[0]).toBe("https://a.example/sub/blyg.json");
  });

  it("step 3: feed upgrade via <blyg:manifest> resolves a blyg", async () => {
    const { fetch } = makeFixtureFetch({
      "https://a.example/blyg.json": { status: 404 },
      "https://a.example/feed.xml": { body: feedBody({ manifestUrl: "https://a.example/blyg/blyg.json" }) },
      "https://a.example/blyg/blyg.json": { body: manifestBody({ site: "https://a.example/blyg/" }) },
    });
    const result = await resolve("https://a.example/feed.xml", fetch);
    expect(result).toMatchObject({ kind: "blyg", origin: "https://a.example/blyg/" });
  });

  it("step 3: a feed with no <blyg:manifest> becomes the L0 candidate, not an immediate failure", async () => {
    const { fetch } = makeFixtureFetch({
      "https://a.example/feed.xml": { body: feedBody() },
      "https://a.example/blyg/blyg.json": { status: 404 },
      "https://a.example/blyg.json": { status: 404 },
    });
    const result = await resolve("https://a.example/feed.xml", fetch);
    expect(result).toEqual({ kind: "rss", feedUrl: "https://a.example/feed.xml" });
  });

  it("step 3: an Atom-only feed (no <rss><channel>) becomes the L0 candidate — not a failure (session 16)", async () => {
    // Regression test: extractFeedManifestUrl() used to re-detect the RSS
    // root itself instead of delegating to feed.ts's parseFeed(), so a
    // direct fetch of an Atom-only feed URL was never recognized as a feed
    // at all and resolution failed outright, even though feed.ts could
    // already parse it once a subscription existed.
    const { fetch } = makeFixtureFetch({
      "https://a.example/atom.xml": { body: atomFeedBody() },
      "https://a.example/blyg/blyg.json": { status: 404 },
      "https://a.example/blyg.json": { status: 404 },
    });
    const result = await resolve("https://a.example/atom.xml", fetch);
    expect(result).toEqual({ kind: "rss", feedUrl: "https://a.example/atom.xml" });
  });

  it("step 4: one-hop rel=\"blyg\" probe resolves, and never scans the rel target's own HTML", async () => {
    const html = `<html><head><link rel="blyg" href="https://b.example/blyg/"></head></html>`;
    // b.example's HTML (never fetched) would itself point past blyg.json failure to c.example —
    // if resolve() incorrectly recursed, it would find c.example's manifest.
    const targetHtml = `<html><head><link rel="blyg" href="https://c.example/"></head></html>`;
    const { fetch, calls } = makeFixtureFetch({
      "https://a.example/blyg.json": { status: 404 },
      "https://a.example/": { body: html },
      "https://b.example/blyg/blyg.json": { status: 404 },
      "https://b.example/": { body: targetHtml },
      "https://c.example/blyg.json": { body: manifestBody({ site: "https://c.example/" }) },
      "https://a.example/blyg/blyg.json": { status: 404 },
    });
    const result = await resolve("https://a.example/", fetch);
    expect(result).toEqual({ kind: "failure", tried: expect.any(Array) });
    expect(calls).not.toContain("https://b.example/");
    expect(calls).not.toContain("https://c.example/blyg.json");
  });

  it("step 5: conventional-mount probes as a courtesy fallback", async () => {
    const { fetch } = makeFixtureFetch({
      "https://a.example/blyg.json": { status: 404 },
      "https://a.example/": { body: "<html></html>" },
      "https://a.example/blyg/blyg.json": { body: manifestBody({ site: "https://a.example/blyg/" }) },
    });
    const result = await resolve("https://a.example/", fetch);
    expect(result).toMatchObject({ kind: "blyg", origin: "https://a.example/blyg/" });
  });

  it("step 5 skips a mount probe URL already tried in step 2", async () => {
    // candidate === host root, so step 2 already probed https://a.example/blyg.json;
    // step 5's second probe (`/blyg.json`) is the same URL and must not be re-fetched.
    const { fetch, calls } = makeFixtureFetch({
      "https://a.example/blyg.json": { status: 404 },
      "https://a.example/": { body: "<html></html>" },
      "https://a.example/blyg/blyg.json": { status: 404 },
    });
    await resolve("https://a.example/", fetch);
    expect(calls.filter((u) => u === "https://a.example/blyg.json")).toHaveLength(1);
  });

  it("step 6: standard RSS rel=alternate autodiscovery, when nothing else resolves", async () => {
    const html = `<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head></html>`;
    const { fetch } = makeFixtureFetch({
      "https://a.example/blyg.json": { status: 404 },
      "https://a.example/": { body: html },
      "https://a.example/blyg/blyg.json": { status: 404 },
    });
    const result = await resolve("https://a.example/", fetch);
    expect(result).toEqual({ kind: "rss", feedUrl: "https://a.example/feed.xml" });
  });

  it("resolution fails with a trail of every URL tried, when nothing resolves", async () => {
    const { fetch } = makeFixtureFetch({
      "https://a.example/blyg.json": { status: 404 },
      "https://a.example/": { status: 404 },
      "https://a.example/blyg/blyg.json": { status: 404 },
    });
    const result = await resolve("https://a.example/", fetch);
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.tried.length).toBeGreaterThan(0);
      expect(result.tried.length).toBeLessThanOrEqual(6);
      expect(result.tried).toContain("https://a.example/blyg.json");
      expect(result.tried).toContain("https://a.example/blyg/blyg.json");
    }
  });

  it("bounds total fetches to <=6 even in the fullest branch (feed-upgrade fetch fails, falls through)", async () => {
    const { fetch, calls } = makeFixtureFetch({
      "https://a.example/blyg.json": { status: 404 },
      "https://a.example/": { body: feedBody({ manifestUrl: "https://a.example/blyg.json" }) },
      "https://a.example/blyg/blyg.json": { status: 404 },
    });
    await resolve("https://a.example/", fetch);
    expect(calls.length).toBeLessThanOrEqual(6);
  });

  it("subscription identity = final fetch origin after a redirect, never the input origin", async () => {
    const { fetch } = makeFixtureFetch({
      "https://old.example/blyg.json": { redirectTo: "https://new.example/blyg.json" },
      "https://new.example/blyg.json": { body: manifestBody({ site: "https://old.example/" }) },
    });
    const result = await resolve("https://old.example/", fetch);
    expect(result).toMatchObject({ kind: "blyg", origin: "https://new.example/" });
    if (result.kind === "blyg") {
      expect(result.siteMismatch).toEqual({ asserted: "https://old.example/", actual: "https://new.example/" });
    }
  });

  it("no siteMismatch when the manifest's site agrees with resolved origin", async () => {
    const { fetch } = makeFixtureFetch({
      "https://a.example/blyg.json": { body: manifestBody({ site: "https://a.example/" }) },
    });
    const result = await resolve("https://a.example/", fetch);
    expect(result).toMatchObject({ kind: "blyg" });
    if (result.kind === "blyg") expect(result.siteMismatch).toBeUndefined();
  });

  it("resolution failure for a totally invalid input URL", async () => {
    const { fetch } = makeFixtureFetch({});
    const result = await resolve("not a url", fetch);
    expect(result).toEqual({ kind: "failure", tried: [] });
  });
});
