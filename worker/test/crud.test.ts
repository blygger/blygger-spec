// Task 4 acceptance: draft→publish v1, edit→publish v2, unpublish hides
// everywhere, delete tombstones, draft-delete hard-removes.
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

describe("item lifecycle (§3.1)", () => {
  it("drafts are invisible on every public surface", async () => {
    const cookie = await login();
    const { status, json } = await apiJson(cookie, "POST", "/api/items", { content_md: "secret draft" });
    expect(status).toBe(201);
    const id = json.id;

    expect((await getPublic(`/ygg/items/${id}.json`)).status).toBe(404);
    expect((await getPublic(`/ygg/f/${id}/`)).status).toBe(404);
    const index = await (await getPublic("/ygg/items/index.json")).json<any>();
    expect(index.items.find((i: any) => i.id === id)).toBeUndefined();
    expect(await (await getPublic("/ygg/feed.xml")).text()).not.toContain(id);
  });

  it("publishes v1 with correct item JSON (§2.3)", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "hello *world*");
    const res = await getPublic(`/ygg/items/${id}.json`);
    expect(res.status).toBe(200);
    const item = await res.json<any>();
    expect(item.ygg).toBe("0.1");
    expect(item.id).toBe(id);
    expect(item.kind).toBe("fragment");
    expect(item.version).toBe(1);
    expect(item.content_md).toBe("hello *world*");
    expect(item.content_html).toContain("<em>world</em>");
    expect(item.content_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(item.origin).toBe("https://example.com/ygg/");
    expect(item.changelog).toEqual([{ version: 1, at: item.updated, note: null }]);
  });

  it("edit → publish bumps to v2 with note in changelog", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "first take");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "second take" });

    // Working copy is not public until published.
    let item = await (await getPublic(`/ygg/items/${id}.json`)).json<any>();
    expect(item.content_md).toBe("first take");

    const pub = await apiJson(cookie, "POST", `/api/items/${id}/publish`, { note: "typo" });
    expect(pub.json.version).toBe(2);
    item = await (await getPublic(`/ygg/items/${id}.json`)).json<any>();
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
    const xml = await (await getPublic("/ygg/feed.xml")).text();
    expect(xml).toContain(`ygg:${id}:v1`);
    expect(xml).toContain(`ygg:${id}:v2`);
  });

  it("unpublish hides the item everywhere but keeps history", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "now you see me");
    await apiJson(cookie, "POST", `/api/items/${id}/unpublish`, {});

    expect((await getPublic(`/ygg/items/${id}.json`)).status).toBe(404);
    expect((await getPublic(`/ygg/f/${id}/`)).status).toBe(404);
    const index = await (await getPublic("/ygg/items/index.json")).json<any>();
    expect(index.items.find((i: any) => i.id === id)).toBeUndefined();
    expect(await (await getPublic("/ygg/feed.xml")).text()).not.toContain(id);

    // Republish resumes the version sequence — history was retained.
    const pub = await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});
    expect(pub.json.version).toBe(2);
    const item = await (await getPublic(`/ygg/items/${id}.json`)).json<any>();
    expect(item.changelog.length).toBe(2);
  });

  it("deleting a published item leaves a permanent tombstone (§2.3)", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "doomed");
    const del = await apiJson(cookie, "DELETE", `/api/items/${id}`);
    expect(del.json.outcome).toBe("tombstoned");

    const res = await getPublic(`/ygg/items/${id}.json`);
    expect(res.status).toBe(200);
    const item = await res.json<any>();
    expect(item.kind).toBe("tombstone");
    expect(item.version).toBe(2);
    expect(item.content_md).toBe("");
    expect(item.content_html).toBe("");
    expect(item.media).toEqual([]);
    expect(item.changelog.length).toBe(2);

    const page = await getPublic(`/ygg/f/${id}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("deleted");

    const index = await (await getPublic("/ygg/items/index.json")).json<any>();
    expect(index.items.find((i: any) => i.id === id).kind).toBe("tombstone");

    const xml = await (await getPublic("/ygg/feed.xml")).text();
    expect(xml).toContain(`ygg:${id}:v2`);
    expect(xml).toContain("<title>deleted</title>");
    // Only the tombstone event remains in the feed for a deleted item.
    expect(xml).not.toContain(`ygg:${id}:v1`);

    // Tombstones cannot be edited, republished, or re-deleted.
    expect((await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "x" })).status).toBe(409);
    expect((await apiJson(cookie, "POST", `/api/items/${id}/publish`, {})).status).toBe(409);
    expect((await apiJson(cookie, "DELETE", `/api/items/${id}`)).status).toBe(409);
  });

  it("deleting a never-published draft hard-removes it", async () => {
    const cookie = await login();
    const { json } = await apiJson(cookie, "POST", "/api/items", { content_md: "scratch" });
    const del = await apiJson(cookie, "DELETE", `/api/items/${json.id}`);
    expect(del.json.outcome).toBe("discarded");
    expect((await apiJson(cookie, "PUT", `/api/items/${json.id}`, { content_md: "x" })).status).toBe(404);
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
