// Mount configurability (session 8, locked decision #14): the public surface
// mounts at any path — including "" = domain root — as pure deployment
// config. Wire filenames (blyg.json, feed.xml, items/…) never move relative
// to the origin. SELF-based suites cover the default /blyg mount (vitest
// config binding); here we build apps for other mounts via makeApp() and
// drive them with the real test env bindings.

import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { makeApp } from "../src/index.ts";
import { normalizeMount, studioPath } from "../src/util.ts";

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

describe("studioPath (session 16)", () => {
  it("nests under a non-root mount", () => {
    expect(studioPath("/blyg")).toBe("/blyg/studio");
    expect(studioPath("/a/b")).toBe("/a/b/studio");
  });

  it("collapses to the bare path at root mount", () => {
    expect(studioPath("")).toBe("/studio");
  });
});

describe("root mount", () => {
  const app = makeApp("");

  it("serves the manifest at the domain root with a root origin", async () => {
    const res = await app.request(`${HOST}/blyg.json`, {}, appEnv());
    expect(res.status).toBe(200);
    const manifest = (await res.json()) as { site: string };
    expect(manifest.site).toBe(`${HOST}/`);
  });

  it("serves pinned-version pages at the root mount (session-18 route)", async () => {
    // The PI node is root-mounted, so the route must work with mount="".
    // Create + publish + pin through the app's own API (root-mounted studio).
    const login = await app.request(`${HOST}/studio/login`, {
      method: "POST",
      body: new URLSearchParams({ password: "test-password" }),
    }, appEnv());
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
    const created = await app.request(`${HOST}/api/items`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ content_md: "root-mounted pin" }),
    }, appEnv());
    const { id } = (await created.json()) as { id: string };
    await app.request(`${HOST}/api/items/${id}/publish`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{}" }, appEnv());
    await app.request(`${HOST}/api/items/${id}/pin`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ version: 1 }) }, appEnv());

    const page = await app.request(`${HOST}/f/${id}/v1/`, {}, appEnv());
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("root-mounted pin");
    expect(html).toContain("Pinned v1");
    expect(html).toContain(`href="/items/${id}/v1.json"`); // root-mounted twin link
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
    expect(await res.text()).toContain(`<blyg:manifest>${HOST}/blyg.json</blyg:manifest>`);
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
    const res = await app.request(`${HOST}/notes/b/blyg.json`, {}, appEnv());
    expect(res.status).toBe(200);
    const manifest = (await res.json()) as { site: string };
    expect(manifest.site).toBe(`${HOST}/notes/b/`);
    expect((await app.request(`${HOST}/blyg/blyg.json`, {}, appEnv())).status).toBe(404);
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

  it("nests studio under the mount (session 16) and 404s both the old host-rooted path and the root-mount path", async () => {
    const res = await app.request(`${HOST}/notes/b/studio`, { redirect: "manual" }, appEnv());
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/notes/b/studio/login");
    expect(res.headers.get("cache-control")).toBeNull();
    expect((await app.request(`${HOST}/studio`, {}, appEnv())).status).toBe(404);
    expect((await app.request(`${HOST}/studio/login`, {}, appEnv())).status).toBe(404);
  });
});
