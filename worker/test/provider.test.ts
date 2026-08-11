// Task 3 acceptance: request shape + error surfacing tested against a mocked
// ProviderFetchLike — no real network. See src/ai/provider.ts's DI pattern
// (mirrors importer/http.ts's FetchLike).
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { generate, ProviderError, SCOPE_MARK_START, type ProviderFetchLike } from "../src/ai/provider.ts";

function okResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

function fixture(handler: (url: string, body: unknown) => ReturnType<typeof okResponse>): {
  fetchImpl: ProviderFetchLike;
  calls: { url: string; init: { method: string; headers: Record<string, string>; body: string } }[];
} {
  const calls: { url: string; init: { method: string; headers: Record<string, string>; body: string } }[] = [];
  const fetchImpl: ProviderFetchLike = async (url, init) => {
    calls.push({ url, init });
    return handler(url, JSON.parse(init.body));
  };
  return { fetchImpl, calls };
}

describe("generate() — request shape (§4)", () => {
  it("throws when AI_PROVIDER_KEY is unset", async () => {
    const { fetchImpl } = fixture(() => okResponse({}));
    await expect(
      generate({ ...env, AI_PROVIDER_KEY: undefined }, { instruction: "x", currentText: null, sources: [], documentContext: "", stylePrompt: null }, fetchImpl),
    ).rejects.toThrow(ProviderError);
  });

  it("sends the API key, version header, and default model", async () => {
    const { fetchImpl, calls } = fixture(() =>
      okResponse({ model: "claude-opus-5", content: [{ type: "text", text: "generated span" }] }),
    );
    const result = await generate(
      { ...env, AI_PROVIDER_KEY: "sk-test-key" },
      { instruction: "write a haiku", currentText: null, sources: [], documentContext: "doc", stylePrompt: null },
      fetchImpl,
    );
    expect(result).toEqual({ text: "generated span", model: "claude-opus-5" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");
    expect(calls[0].init.headers["x-api-key"]).toBe("sk-test-key");
    expect(calls[0].init.headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(calls[0].init.body);
    expect(body.model).toBe("claude-opus-5");
    expect(body.messages[0].content).toContain("write a haiku");
  });

  it("includes instruction, sources, current text, and document context in the user message", async () => {
    const { fetchImpl, calls } = fixture(() => okResponse({ model: "claude-opus-5", content: [{ type: "text", text: "out" }] }));
    await generate(
      { ...env, AI_PROVIDER_KEY: "k" },
      {
        instruction: "simplify",
        currentText: "old draft",
        sources: [{ id: "src1", content_md: "source content" }],
        documentContext: `before ${SCOPE_MARK_START}scope`,
        stylePrompt: "Write like Hemingway.",
      },
      fetchImpl,
    );
    const content = JSON.parse(calls[0].init.body).messages[0].content as string;
    expect(content).toContain("simplify");
    expect(content).toContain("source content");
    expect(content).toContain("old draft");
    expect(content).toContain(SCOPE_MARK_START);
    const system = JSON.parse(calls[0].init.body).system as string;
    expect(system).toContain("Write like Hemingway.");
  });

  it("uses settings.ai_model when set, overriding the default", async () => {
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('ai_model', 'claude-sonnet-5') ON CONFLICT(key) DO UPDATE SET value = excluded.value").run();
    const { fetchImpl, calls } = fixture(() => okResponse({ model: "claude-sonnet-5", content: [{ type: "text", text: "out" }] }));
    await generate({ ...env, AI_PROVIDER_KEY: "k" }, { instruction: "x", currentText: null, sources: [], documentContext: "", stylePrompt: null }, fetchImpl);
    expect(JSON.parse(calls[0].init.body).model).toBe("claude-sonnet-5");
    await env.DB.prepare("DELETE FROM settings WHERE key = 'ai_model'").run();
  });
});

describe("generate() — error surfacing (§5 task 4 contract: verbatim, no retry)", () => {
  it("throws ProviderError with status + body on a non-2xx response", async () => {
    const { fetchImpl } = fixture(() => okResponse({ error: { message: "overloaded" } }, 529));
    await expect(
      generate({ ...env, AI_PROVIDER_KEY: "k" }, { instruction: "x", currentText: null, sources: [], documentContext: "", stylePrompt: null }, fetchImpl),
    ).rejects.toThrow(/529/);
  });

  it("throws on a refusal stop_reason, including the category when present", async () => {
    const { fetchImpl } = fixture(() => okResponse({ model: "claude-opus-5", stop_reason: "refusal", stop_details: { category: "cyber" }, content: [] }));
    await expect(
      generate({ ...env, AI_PROVIDER_KEY: "k" }, { instruction: "x", currentText: null, sources: [], documentContext: "", stylePrompt: null }, fetchImpl),
    ).rejects.toThrow(/refused|declined/);
  });

  it("throws when the response has no text content", async () => {
    const { fetchImpl } = fixture(() => okResponse({ model: "claude-opus-5", content: [] }));
    await expect(
      generate({ ...env, AI_PROVIDER_KEY: "k" }, { instruction: "x", currentText: null, sources: [], documentContext: "", stylePrompt: null }, fetchImpl),
    ).rejects.toThrow(ProviderError);
  });

  it("throws on malformed JSON in the response body", async () => {
    const fetchImpl: ProviderFetchLike = async () => ({ ok: true, status: 200, text: async () => "not json" });
    await expect(
      generate({ ...env, AI_PROVIDER_KEY: "k" }, { instruction: "x", currentText: null, sources: [], documentContext: "", stylePrompt: null }, fetchImpl),
    ).rejects.toThrow(ProviderError);
  });

  it("makes no real network call — fetchImpl is fully substituted", async () => {
    const { fetchImpl, calls } = fixture(() => okResponse({ model: "claude-opus-5", content: [{ type: "text", text: "ok" }] }));
    await generate({ ...env, AI_PROVIDER_KEY: "k" }, { instruction: "x", currentText: null, sources: [], documentContext: "", stylePrompt: null }, fetchImpl);
    expect(calls).toHaveLength(1);
  });
});
