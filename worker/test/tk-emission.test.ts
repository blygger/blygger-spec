// Task 2 acceptance: versions.generated_json emission into the item doc and
// pinned version files; absent when NULL. Writes generated_json directly via
// the DB (the generate/publish pipeline that populates it for real lands in
// tasks 4/5) — this test only exercises the wire-emission half of task 2.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

async function setGenerated(itemId: string, version: number, generated: unknown): Promise<void> {
  await env.DB.prepare("UPDATE versions SET generated_json = ? WHERE item_id = ? AND version = ?")
    .bind(JSON.stringify(generated), itemId, version)
    .run();
}

describe("TK generation provenance emission (§3.1)", () => {
  it("item doc omits `generated` when the version had no generation", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "plain fragment, no TK");
    const item = await (await getPublic(`/blyg/items/${id}.json`)).json<any>();
    expect(item).not.toHaveProperty("generated");
  });

  it("item doc carries `generated` when the published version has it", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "fragment with generated text");
    const provenance = [{ sources: [{ id: "0123456789abcdefghjkmnpqra", version: 3 }], model: "claude-x", at: "2026-08-10T18:00:00Z" }];
    await setGenerated(id, 1, provenance);
    const item = await (await getPublic(`/blyg/items/${id}.json`)).json<any>();
    expect(item.generated).toEqual(provenance);
  });

  it("pinned version file carries its own version's `generated`, independent of the working copy", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "v1 text");
    await setGenerated(id, 1, [{ sources: [], model: "claude-x", at: "2026-08-10T18:00:00Z" }]);
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });

    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "v2 text" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});
    // v2 has no generated_json recorded — omitted on the live item doc.
    const live = await (await getPublic(`/blyg/items/${id}.json`)).json<any>();
    expect(live).not.toHaveProperty("generated");

    const pinned = await (await getPublic(`/blyg/items/${id}/v1.json`)).json<any>();
    expect(pinned.generated).toEqual([{ sources: [], model: "claude-x", at: "2026-08-10T18:00:00Z" }]);
  });

  it("withdrawal empties `generated` alongside content_md/content_html", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "will be withdrawn");
    await setGenerated(id, 1, [{ sources: [], model: "claude-x" }]);
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    const item = await (await getPublic(`/blyg/items/${id}.json`)).json<any>();
    expect(item.kind).toBe("withdrawn");
    expect(item).not.toHaveProperty("generated");
  });

  it("thread item doc also carries `generated` alongside `transclusions`", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "source fragment");
    const created = await apiJson(cookie, "POST", "/api/items", { content_md: `![[${f1}]]`, kind: "thread" });
    const threadId = created.json.id as string;
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    await setGenerated(threadId, 1, [{ sources: [{ id: f1, version: 1 }], model: "claude-x" }]);
    const item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.transclusions).toEqual([{ id: f1, version: 1 }]);
    expect(item.generated).toEqual([{ sources: [{ id: f1, version: 1 }], model: "claude-x" }]);
  });
});
