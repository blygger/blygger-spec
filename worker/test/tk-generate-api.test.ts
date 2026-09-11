// POST /api/items/{id}/generate route contract — network-free paths only
// (missing item, missing/invalid scope index, auth). The full pipeline
// (source resolution through the provider call) is exercised at the
// runGenerateScope level in tk-generate.test.ts, which injects a fixture
// fetch — see api.test.ts's header note (importer) for the same convention.
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, BASE, login } from "./helpers.ts";

describe("POST /api/items/:id/generate — route contract", () => {
  it("requires auth", async () => {
    const res = await SELF.fetch(`${BASE}/api/items/zzzzzzzzzzzzzzzzzzzzzzzzzz/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: 0 }),
    });
    expect(res.status).toBe(401);
  });

  it("404s for an unknown item", async () => {
    const cookie = await login();
    const { status, json } = await apiJson(cookie, "POST", "/api/items/zzzzzzzzzzzzzzzzzzzzzzzzzz/generate", { scope: 0 });
    expect(status).toBe(404);
    expect(json.error).toMatch(/not found/);
  });

  it("400s without a scope index", async () => {
    const cookie = await login();
    const created = await apiJson(cookie, "POST", "/api/items", { content_md: "[TK]x[/TK]" });
    const { status, json } = await apiJson(cookie, "POST", `/api/items/${created.json.id}/generate`, {});
    expect(status).toBe(400);
    expect(json.error).toMatch(/scope/);
  });

  it("400s on an out-of-range scope index, without touching AI_PROVIDER_KEY (unset in test env)", async () => {
    const cookie = await login();
    const created = await apiJson(cookie, "POST", "/api/items", { content_md: "[TK]x[/TK]" });
    const { status, json } = await apiJson(cookie, "POST", `/api/items/${created.json.id}/generate`, { scope: 3 });
    expect(status).toBe(400);
    expect(json.error).toBe("unknown scope index");
  });

  it("400s on malformed TK grammar before ever needing the provider", async () => {
    const cookie = await login();
    const created = await apiJson(cookie, "POST", "/api/items", { content_md: "[TK]a[/TK] [TK]never closed" });
    const { status, json } = await apiJson(cookie, "POST", `/api/items/${created.json.id}/generate`, { scope: 0 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/malformed/);
  });
});
