// Mount configurability (session 8, locked decision #14): the public surface
// mounts at any path — including "" = domain root — as pure deployment
// config. Wire filenames (blygg.json, feed.xml, items/…) never move relative
// to the origin. SELF-based suites cover the default /blyg mount (vitest
// config binding); here we build apps for other mounts via makeApp() and
// drive them with the real test env bindings.

import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { makeApp } from "../src/index.ts";
import { normalizeMount } from "../src/util.ts";

const HOST = "https://example.com";

function appEnv() {
  // Real DB/R2 bindings from the test pool; MOUNT is irrelevant to makeApp()
  // (the mount is the factory argument), only default-export fetch reads it.
  return env as unknown as Record<string, unknown>;
}

describe("normalizeMount", () => {
  it("defaults unset to /blyg and treats explicit empty as root", () => {
    expect(normalizeMount(undefined)).toBe("/blyg");
    expect(normalizeMount("")).toBe("");
    expect(normalizeMount("/")).toBe("");
  });

  it("normalizes slashes", () => {
    expect(normalizeMount("blyg")).toBe("/blyg");
    expect(normalizeMount("/blyg/")).toBe("/blyg");
    expect(normalizeMount("/a/b/")).toBe("/a/b");
    expect(normalizeMount(" /notes/ ")).toBe("/notes");
  });
});

describe("root mount", () => {
  const app = makeApp("");

  it("serves the manifest at the domain root with a root origin", async () => {
    const res = await app.request(`${HOST}/blygg.json`, {}, appEnv());
    expect(res.status).toBe(200);
    const manifest = (await res.json()) as { site: string };
    expect(manifest.site).toBe(`${HOST}/`);
  });

  it("serves the feed page at / instead of redirecting", async () => {
    const res = await app.request(`${HOST}/`, {}, appEnv());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain('href="/feed.xml"');
    expect(html).toContain('href="/style.css"');
  });

  it("serves feed.xml at the root with root-origin links", async () => {
    const res = await app.request(`${HOST}/feed.xml`, {}, appEnv());
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`<blygg:manifest>${HOST}/blygg.json</blygg:manifest>`);
  });

  it("keeps /studio reachable and uncached alongside the root-mounted surface", async () => {
    const res = await app.request(`${HOST}/studio`, { redirect: "manual" }, appEnv());
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/studio/login");
    expect(res.headers.get("cache-control")).toBeNull();
  });
});

describe("custom multi-segment mount", () => {
  const app = makeApp("/notes/b");

  it("serves the surface under the mount and 404s the old default", async () => {
    const res = await app.request(`${HOST}/notes/b/blygg.json`, {}, appEnv());
    expect(res.status).toBe(200);
    const manifest = (await res.json()) as { site: string };
    expect(manifest.site).toBe(`${HOST}/notes/b/`);
    expect((await app.request(`${HOST}/blyg/blygg.json`, {}, appEnv())).status).toBe(404);
  });

  it("redirects / to the mounted feed page", async () => {
    const res = await app.request(`${HOST}/`, { redirect: "manual" }, appEnv());
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/notes/b/");
  });

  it("renders page links relative to the mount", async () => {
    const res = await app.request(`${HOST}/notes/b/`, {}, appEnv());
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('href="/notes/b/style.css"');
    expect(html).toContain('href="/notes/b/feed.xml"');
  });
});
