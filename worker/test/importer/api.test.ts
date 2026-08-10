// Subscription API route contract (§4.2) — validation, confirm-flow shape,
// and the pause/resume/resync/delete/blogroll-toggle lifecycle. Routes that
// would need real network (resolving a live URL) are covered by the
// fixture-driven pipeline test in subscribe-flow.test.ts instead; here we
// only exercise paths that are network-free (malformed input) or that
// operate on a subscription created directly via the store.
import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createHopper, createSubscription, getSubscription } from "../../src/importer/store.ts";
import { apiJson, BASE, login } from "../helpers.ts";

describe("subscription API (§4.2)", () => {
  it("400s without a url", async () => {
    const cookie = await login();
    const { status, json } = await apiJson(cookie, "POST", "/api/subscriptions", {});
    expect(status).toBe(400);
    expect(json.error).toMatch(/url/);
  });

  it("422s with the probe trail for an unresolvable URL", async () => {
    const cookie = await login();
    const { status, json } = await apiJson(cookie, "POST", "/api/subscriptions", { url: "not a url" });
    expect(status).toBe(422);
    expect(json.tried).toEqual([]);
  });

  it("requires auth", async () => {
    const res = await SELF.fetch(`${BASE}/api/subscriptions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://a.example/" }),
    });
    expect(res.status).toBe(401);
  });

  it("PUT toggles the blogroll flag and title override on an existing subscription", async () => {
    const cookie = await login();
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://a.example/", feedUrl: "https://a.example/feed.xml", title: "A" });
    const put = await apiJson(cookie, "PUT", `/api/subscriptions/${sub.id}`, { in_blogroll: true, title: "Renamed" });
    expect(put.status).toBe(200);
    const after = await getSubscription(env.DB, sub.id);
    expect(after).toMatchObject({ in_blogroll: 1, title: "Renamed" });
  });

  it("pause/resume/resync/delete lifecycle on an existing subscription", async () => {
    const cookie = await login();
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://b.example/", feedUrl: "https://b.example/feed.xml", title: "B" });

    const pause = await apiJson(cookie, "POST", `/api/subscriptions/${sub.id}/pause`);
    expect(pause.status).toBe(200);
    expect((await getSubscription(env.DB, sub.id))?.status).toBe("paused");

    const resume = await apiJson(cookie, "POST", `/api/subscriptions/${sub.id}/resume`);
    expect(resume.status).toBe(200);
    expect((await getSubscription(env.DB, sub.id))?.status).toBe("active");

    const del = await apiJson(cookie, "DELETE", `/api/subscriptions/${sub.id}`);
    expect(del.status).toBe(200);
    expect(await getSubscription(env.DB, sub.id)).toBeNull();
    const delAgain = await apiJson(cookie, "DELETE", `/api/subscriptions/${sub.id}`);
    expect(delAgain.status).toBe(404);
  });

  it("404s pause/resume/resync/put/delete for an unknown id", async () => {
    const cookie = await login();
    for (const [method, path] of [
      ["PUT", "/api/subscriptions/nope"],
      ["POST", "/api/subscriptions/nope/pause"],
      ["POST", "/api/subscriptions/nope/resume"],
      ["POST", "/api/subscriptions/nope/resync"],
      ["DELETE", "/api/subscriptions/nope"],
    ] as const) {
      const { status } = await apiJson(cookie, method, path, method === "PUT" ? {} : undefined);
      expect(status).toBe(404);
    }
  });
});

describe("studio subs page", () => {
  it("renders 200 with the add-by-url form and lists existing subscriptions", async () => {
    const cookie = await login();
    await createSubscription(env.DB, { kind: "blyg", origin: "https://c.example/", feedUrl: "https://c.example/feed.xml", title: "C" });
    const res = await SELF.fetch(`${BASE}/studio/subs`, { headers: { cookie } });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("add-sub-form");
    expect(html).toContain("C");
    expect(html).toContain("https://c.example/");
  });

  it("redirects to login when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE}/studio/subs`, { redirect: "manual" });
    expect(res.status).toBe(302);
  });
});

describe("hopper + signal API routes", () => {
  it("full CRUD: create, add item, remove item, delete", async () => {
    const cookie = await login();
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://d.example/", feedUrl: "https://d.example/feed.xml", title: "D" });

    const created = await apiJson(cookie, "POST", "/api/hoppers", { name: "My Hopper" });
    expect(created.status).toBe(201);
    expect(created.json.slug).toBe("my-hopper");
    const hopperId = created.json.id;

    const add = await apiJson(cookie, "PUT", `/api/hoppers/${hopperId}/items/${sub.id}/remote-1`);
    expect(add.status).toBe(200);

    const togglePublic = await apiJson(cookie, "PUT", `/api/hoppers/${hopperId}`, { public: true });
    expect(togglePublic.status).toBe(200);

    const remove = await apiJson(cookie, "DELETE", `/api/hoppers/${hopperId}/items/${sub.id}/remote-1`);
    expect(remove.status).toBe(200);

    const del = await apiJson(cookie, "DELETE", `/api/hoppers/${hopperId}`);
    expect(del.status).toBe(200);
  });

  it("slugs collide-safely on duplicate names", async () => {
    const cookie = await login();
    const first = await apiJson(cookie, "POST", "/api/hoppers", { name: "Dup" });
    const second = await apiJson(cookie, "POST", "/api/hoppers", { name: "Dup" });
    expect(first.json.slug).toBe("dup");
    expect(second.json.slug).toBe("dup-2");
  });

  it("PUT /api/signals sets a thumb; rejects an invalid value", async () => {
    const cookie = await login();
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: "https://e.example/", feedUrl: "https://e.example/feed.xml", title: "E" });
    const ok = await apiJson(cookie, "PUT", `/api/signals/${sub.id}/remote-1`, { thumb: 1 });
    expect(ok.status).toBe(200);
    const bad = await apiJson(cookie, "PUT", `/api/signals/${sub.id}/remote-1`, { thumb: 0 });
    expect(bad.status).toBe(400);
  });
});

describe("studio hoppers pages", () => {
  it("GET /studio/hoppers lists hoppers and renders the create form", async () => {
    const cookie = await login();
    await createHopper(env.DB, "Visible Hopper", "visible-hopper");
    const res = await SELF.fetch(`${BASE}/studio/hoppers`, { headers: { cookie } });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Visible Hopper");
    expect(html).toContain("new-hopper-form");
  });

  it("GET /studio/hoppers/:id 404s for an unknown hopper", async () => {
    const cookie = await login();
    const res = await SELF.fetch(`${BASE}/studio/hoppers/nope`, { headers: { cookie } });
    expect(res.status).toBe(404);
  });
});
