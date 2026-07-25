// Task 4 + task 12 acceptance: draft→publish v1, edit→publish v2, withdraw
// endcaps (permanent 200, one feed entry, reversible), pins survive
// withdrawal, draft-delete hard-removes, published-delete rejected.
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

describe("item lifecycle (§3.1)", () => {
  it("drafts are invisible on every public surface", async () => {
    const cookie = await login();
    const { status, json } = await apiJson(cookie, "POST", "/api/items", { content_md: "secret draft" });
    expect(status).toBe(201);
    const id = json.id;

    expect((await getPublic(`/blygg/items/${id}.json`)).status).toBe(404);
    expect((await getPublic(`/blygg/f/${id}/`)).status).toBe(404);
    const index = await (await getPublic("/blygg/items/index.json")).json<any>();
    expect(index.items.find((i: any) => i.id === id)).toBeUndefined();
    expect(await (await getPublic("/blygg/feed.xml")).text()).not.toContain(id);
  });

  it("publishes v1 with correct item JSON (§2.3)", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "hello *world*");
    const res = await getPublic(`/blygg/items/${id}.json`);
    expect(res.status).toBe(200);
    const item = await res.json<any>();
    expect(item.blygg).toBe("0.1");
    expect(item.id).toBe(id);
    expect(item.kind).toBe("fragment");
    expect(item.version).toBe(1);
    expect(item.content_md).toBe("hello *world*");
    expect(item.content_html).toContain("<em>world</em>");
    expect(item.content_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(item.origin).toBe("https://example.com/blygg/");
    expect(item.changelog).toEqual([{ version: 1, at: item.updated, note: null }]);
  });

  it("edit → publish bumps to v2 with note in changelog", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "first take");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "second take" });

    // Working copy is not public until published.
    let item = await (await getPublic(`/blygg/items/${id}.json`)).json<any>();
    expect(item.content_md).toBe("first take");

    const pub = await apiJson(cookie, "POST", `/api/items/${id}/publish`, { note: "typo" });
    expect(pub.json.version).toBe(2);
    item = await (await getPublic(`/blygg/items/${id}.json`)).json<any>();
    expect(item.version).toBe(2);
    expect(item.content_md).toBe("second take");
    expect(item.changelog.length).toBe(2);
    expect(item.changelog[1].note).toBe("typo");
  });

  it("feed carries per-version GUIDs for both publish events", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "v1 content");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "v2 content" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});
    const xml = await (await getPublic("/blygg/feed.xml")).text();
    expect(xml).toContain(`blygg:${id}:v1`);
    expect(xml).toContain(`blygg:${id}:v2`);
  });

  it("withdraw publishes a permanent endcap: 200 forever, one feed entry (§2.3)", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "now you see me");
    const wd = await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, { note: "second thoughts" });
    expect(wd.status).toBe(200);
    expect(wd.json.version).toBe(2);

    const res = await getPublic(`/blygg/items/${id}.json`);
    expect(res.status).toBe(200);
    const item = await res.json<any>();
    expect(item.kind).toBe("withdrawn");
    expect(item.version).toBe(2);
    expect(item.content_md).toBe("");
    expect(item.content_html).toBe("");
    expect(item.media).toEqual([]);
    expect(item.changelog.length).toBe(2);
    expect(item.changelog[1].note).toBe("second thoughts");

    const page = await getPublic(`/blygg/f/${id}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("withdrawn");

    const index = await (await getPublic("/blygg/items/index.json")).json<any>();
    expect(index.items.find((i: any) => i.id === id).kind).toBe("withdrawn");

    const xml = await (await getPublic("/blygg/feed.xml")).text();
    expect(xml).toContain(`blygg:${id}:v2`);
    expect(xml).toContain("<title>withdrawn</title>");
    // Only the withdrawal event remains in the feed for a withdrawn item.
    expect(xml).not.toContain(`blygg:${id}:v1`);

    // Cannot re-withdraw.
    expect((await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {})).status).toBe(409);
  });

  it("withdrawal is reversible: working copy survives, republish restores (§3.1)", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "phoenix v1");
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});

    // Working copy retained and editable after withdrawal.
    expect((await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "phoenix v3" })).status).toBe(200);
    const pub = await apiJson(cookie, "POST", `/api/items/${id}/publish`, { note: "returned" });
    expect(pub.json.version).toBe(3);

    const item = await (await getPublic(`/blygg/items/${id}.json`)).json<any>();
    expect(item.kind).toBe("fragment");
    expect(item.content_md).toBe("phoenix v3");
    expect(item.changelog.length).toBe(3);
    const xml = await (await getPublic("/blygg/feed.xml")).text();
    expect(xml).toContain(`blygg:${id}:v3`);
  });

  it("pinned versions are served at items/{id}/v{n}.json and survive withdrawal (§2.8)", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "citable *claim*");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "revised claim" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});

    // Unpinned versions are withheld.
    expect((await getPublic(`/blygg/items/${id}/v1.json`)).status).toBe(404);

    const pin = await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    expect(pin.status).toBe(200);
    // Idempotent re-pin.
    expect((await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 })).json.already).toBe(true);

    const res = await getPublic(`/blygg/items/${id}/v1.json`);
    expect(res.status).toBe(200);
    const v1 = await res.json<any>();
    expect(v1.version).toBe(1);
    expect(v1.pinned).toBe(true);
    expect(v1.content_md).toBe("citable *claim*");
    expect(v1.content_html).toContain("<em>claim</em>");
    expect(v1.content_hash).toMatch(/^sha256:[0-9a-f]{64}$/);

    // Changelog advertises the pin; v2 stays unpinned.
    const item = await (await getPublic(`/blygg/items/${id}.json`)).json<any>();
    expect(item.changelog[0].pinned).toBe(true);
    expect(item.changelog[1].pinned).toBeUndefined();
    expect((await getPublic(`/blygg/items/${id}/v2.json`)).status).toBe(404);

    // The pin survives withdrawal of the live stream.
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    expect((await getPublic(`/blygg/items/${id}/v1.json`)).status).toBe(200);

    // Endcap versions cannot be pinned.
    expect((await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 3 })).status).toBe(409);
  });

  it("discarding a never-published draft hard-removes it; published delete is rejected", async () => {
    const cookie = await login();
    const { json } = await apiJson(cookie, "POST", "/api/items", { content_md: "scratch" });
    const del = await apiJson(cookie, "DELETE", `/api/items/${json.id}`);
    expect(del.json.outcome).toBe("discarded");
    expect((await apiJson(cookie, "PUT", `/api/items/${json.id}`, { content_md: "x" })).status).toBe(404);

    const id = await createAndPublish(cookie, "not deletable");
    expect((await apiJson(cookie, "DELETE", `/api/items/${id}`)).status).toBe(409);
  });

  it("enforces the 1,000-char fragment cap at publish (§2.7)", async () => {
    const cookie = await login();
    const { json } = await apiJson(cookie, "POST", "/api/items", { content_md: "x".repeat(1001) });
    const pub = await apiJson(cookie, "POST", `/api/items/${json.id}/publish`, {});
    expect(pub.status).toBe(400);
    // Exactly at the cap is fine.
    await apiJson(cookie, "PUT", `/api/items/${json.id}`, { content_md: "x".repeat(1000) });
    expect((await apiJson(cookie, "POST", `/api/items/${json.id}/publish`, {})).status).toBe(200);
  });
});
