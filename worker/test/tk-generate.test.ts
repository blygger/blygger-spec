// Task 4 acceptance: source resolution (bad source, nested, bad index),
// working-copy update, and provenance recording. Runs runGenerateScope
// directly with an injected fixture ProviderFetchLike — the same pattern
// subscribe-flow.test.ts uses for the importer's network-dependent pipeline
// (see its header note); the real HTTP route only gets network-free coverage
// in tk-generate-api.test.ts.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ProviderFetchLike } from "../src/ai/provider.ts";
import { createAndPublish, login } from "./helpers.ts";
import { createDraft, getItem, getTkProvenance, publish, withdraw } from "../src/model.ts";
import { runGenerateScope } from "../src/tk-generate.ts";

function fixture(text: string, model = "claude-opus-5") {
  const calls: unknown[] = [];
  const fetchImpl: ProviderFetchLike = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return { ok: true, status: 200, text: async () => JSON.stringify({ model, content: [{ type: "text", text }] }) };
  };
  return { fetchImpl, calls };
}

describe("runGenerateScope — success path (§5)", () => {
  it("generates output for a pure-instruction scope (no sources), updates the working copy, and records provenance", async () => {
    const item = await createDraft(env.DB, "Intro.\n\n[TK write a haiku about spring[/TK]\n\nOutro.");
    const { fetchImpl } = fixture("blossoms in the rain");

    const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, item, 0, fetchImpl);
    expect(result).toMatchObject({ ok: true, text: "blossoms in the rain", model: "claude-opus-5" });

    const updated = await getItem(env.DB, item.id);
    expect(updated!.content_md).toBe("Intro.\n\n[TK write a haiku about spring[=]blossoms in the rain[/TK]\n\nOutro.");
    expect(updated!.dirty).toBe(1);

    const provenance = getTkProvenance(updated!);
    expect(provenance).toEqual([{ sources: [], model: "claude-opus-5", at: expect.any(String) }]);
  });

  it("resolves ![[id]] source refs and feeds their content_md to the provider", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "source fragment text");
    const item = await createDraft(env.DB, `[TK summarize ![[${f1}]][/TK]`);
    const { fetchImpl, calls } = fixture("summary");

    const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, item, 0, fetchImpl);
    expect(result).toMatchObject({ ok: true, text: "summary" });
    expect((calls[0] as any).messages[0].content).toContain("source fragment text");

    const updated = await getItem(env.DB, item.id);
    const provenance = getTkProvenance(updated!);
    expect(provenance[0]).toMatchObject({ sources: [{ id: f1, version: 1 }], model: "claude-opus-5" });
  });

  it("regenerate: passes the prior output as currentText and replaces it in place", async () => {
    const item0 = await createDraft(env.DB, "[TK improve this[=]rough draft[/TK]");
    const { fetchImpl: fetch1 } = fixture("polished draft v1");
    await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, item0, 0, fetch1);
    const afterFirst = (await getItem(env.DB, item0.id))!;
    expect(afterFirst.content_md).toBe("[TK improve this[=]polished draft v1[/TK]");

    const { fetchImpl: fetch2, calls } = fixture("polished draft v2");
    const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, afterFirst, 0, fetch2);
    expect(result).toMatchObject({ ok: true, text: "polished draft v2" });
    expect((calls[0] as any).messages[0].content).toContain("polished draft v1");
    const afterSecond = (await getItem(env.DB, item0.id))!;
    expect(afterSecond.content_md).toBe("[TK improve this[=]polished draft v2[/TK]");
  });
});

describe("runGenerateScope — error cases (§5/§6 task 4)", () => {
  it("unresolvable source: unknown id", async () => {
    const item = await createDraft(env.DB, `[TK use ![[zzzzzzzzzzzzzzzzzzzzzzzzzz]][/TK]`);
    const { fetchImpl, calls } = fixture("unused");
    const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, item, 0, fetchImpl);
    expect(result).toMatchObject({ ok: false, status: 400, body: { error: "unresolvable source", id: "zzzzzzzzzzzzzzzzzzzzzzzzzz" } });
    expect(calls).toHaveLength(0); // never reaches the provider
  });

  it("unresolvable source: draft, withdrawn, thread", async () => {
    const cookie = await login();
    const draftFrag = await createDraft(env.DB, "never published");
    const withdrawnId = await createAndPublish(cookie, "to withdraw");
    await withdraw(env.DB, (await getItem(env.DB, withdrawnId))!, null);
    const threadItem = await createDraft(env.DB, "some thread", "thread");
    await publish(env.DB, threadItem, null);

    for (const badId of [draftFrag.id, withdrawnId, threadItem.id]) {
      const item = await createDraft(env.DB, `[TK use ![[${badId}]][/TK]`);
      const { fetchImpl } = fixture("unused");
      const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, item, 0, fetchImpl);
      expect(result.ok, badId).toBe(false);
      if (!result.ok) expect(result.body.error).toBe("unresolvable source");
    }
  });

  it("nested scopes: reports the parse error, never calls the provider", async () => {
    const item = await createDraft(env.DB, "[TK outer [TK inner[=]x[/TK] still outer[=]y[/TK]");
    const { fetchImpl, calls } = fixture("unused");
    const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, item, 0, fetchImpl);
    expect(result).toMatchObject({ ok: false, status: 400 });
    if (!result.ok) expect(result.body.error as string).toMatch(/malformed/);
    expect(calls).toHaveLength(0);
  });

  it("unknown scope index", async () => {
    const item = await createDraft(env.DB, "[TK a[/TK]");
    const { fetchImpl } = fixture("unused");
    const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, item, 5, fetchImpl);
    expect(result).toEqual({ ok: false, status: 400, body: { error: "unknown scope index" } });
  });

  it("provider failure surfaces verbatim, no retry (only one fetch call)", async () => {
    const item = await createDraft(env.DB, "[TK x[/TK]");
    let calls = 0;
    const fetchImpl: ProviderFetchLike = async () => {
      calls++;
      return { ok: false, status: 529, text: async () => "overloaded" };
    };
    const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, item, 0, fetchImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.body.error as string).toContain("529");
    }
    expect(calls).toBe(1);
  });
});
