// Task 5 acceptance (tk-core-plan.md §2.4/§3): publish-error on unresolved
// scopes; published content_md is marker-free; generated provenance matches
// scopes in order; hash covers exactly the stripped content_md; wrappers
// present in content_html; hand-authored (ungenerated-via-/generate) output
// gets no disclosure wrapper; the §7 definition-of-done scenario end to end.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ProviderFetchLike } from "../src/ai/provider.ts";
import { contentHash } from "../src/util.ts";
import { createDraft, FragmentTooLongError, getItem, publish, saveWorkingCopy, TkPublishError, TransclusionResolveError } from "../src/model.ts";
import { runGenerateScope } from "../src/tk-generate.ts";
import { parseScopes, setScopeOutput } from "../src/tk.ts";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

function fixture(text: string, model = "claude-opus-5"): ProviderFetchLike {
  return async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ model, content: [{ type: "text", text }] }) });
}

async function generateVia(itemId: string, scope: number, outputText: string) {
  const item = (await getItem(env.DB, itemId))!;
  const result = await runGenerateScope({ ...env, AI_PROVIDER_KEY: "k" }, item, scope, fixture(outputText));
  if (!result.ok) throw new Error(`generate failed: ${JSON.stringify(result.body)}`);
  return result;
}

describe("publish() — TK integration (§2.4/§3)", () => {
  it("publish errors on an unresolved scope, writes nothing", async () => {
    const item = await createDraft(env.DB, "[TK]write something[/TK]");
    await expect(publish(env.DB, item, null)).rejects.toThrow(TkPublishError);
    const after = await getItem(env.DB, item.id);
    expect(after!.status).toBe("draft");
    expect(after!.version).toBe(0);
  });

  it("publish errors on malformed grammar (nested scope)", async () => {
    const item = await createDraft(env.DB, "[TK]outer [TK]inner[=]x[/TK] still outer[=]y[/TK]");
    await expect(publish(env.DB, item, null)).rejects.toThrow(TkPublishError);
  });

  it("block scope: content_md is marker-free, content_html carries a div.blyg-tk-gen wrapper", async () => {
    const item = await createDraft(env.DB, "Intro.\n\n[TK]write a haiku[/TK]\n\nOutro.");
    await generateVia(item.id, 0, "blossoms fall softly");
    const draft = (await getItem(env.DB, item.id))!;
    const version = await publish(env.DB, draft, null);
    expect(version).toBe(1);

    const row = (await env.DB.prepare("SELECT content_md, content_html FROM versions WHERE item_id = ? AND version = 1").bind(item.id).first()) as {
      content_md: string;
      content_html: string;
    };
    expect(row.content_md).not.toMatch(/\[TK\]|\[=\]|\[\/TK\]/);
    expect(row.content_md).toBe("Intro.\n\nblossoms fall softly\n\nOutro.");
    expect(row.content_html).toContain('<div class="blyg-tk-gen">');
    expect(row.content_html).toContain("blossoms fall softly");
  });

  it("inline scope: content_html carries a span.blyg-tk-gen wrapper within the flowing paragraph", async () => {
    const item = await createDraft(env.DB, "As Einstein said, [TK]simplify[/TK], apparently.");
    await generateVia(item.id, 0, "it's all relative");
    const draft = (await getItem(env.DB, item.id))!;
    await publish(env.DB, draft, null);

    const row = (await env.DB.prepare("SELECT content_md, content_html FROM versions WHERE item_id = ? AND version = 1").bind(item.id).first()) as {
      content_md: string;
      content_html: string;
    };
    expect(row.content_md).toBe("As Einstein said, it's all relative, apparently.");
    expect(row.content_html).toContain('<span class="blyg-tk-gen">it\'s all relative</span>');
  });

  it("hash covers exactly the stripped content_md", async () => {
    const item = await createDraft(env.DB, "[TK]x[/TK] tail");
    await generateVia(item.id, 0, "HEAD");
    const draft = (await getItem(env.DB, item.id))!;
    await publish(env.DB, draft, null);
    const row = (await env.DB.prepare("SELECT content_md, content_hash FROM versions WHERE item_id = ? AND version = 1").bind(item.id).first()) as {
      content_md: string;
      content_hash: string;
    };
    expect(row.content_md).toBe("HEAD tail");
    expect(row.content_hash).toBe(await contentHash(row.content_md));
  });

  it("hand-authored output (no /generate call) publishes as plain text, no wrapper, no generated[] entry", async () => {
    const item = await createDraft(env.DB, "[TK]never called[=]I typed this myself[/TK]");
    await publish(env.DB, item, null);
    const row = (await env.DB.prepare("SELECT content_md, content_html, generated_json FROM versions WHERE item_id = ? AND version = 1").bind(item.id).first()) as {
      content_md: string;
      content_html: string;
      generated_json: string | null;
    };
    expect(row.content_md).toBe("I typed this myself");
    expect(row.content_html).not.toContain("blyg-tk-gen");
    expect(row.generated_json).toBeNull();
  });

  it("fragment cap applies to the published (stripped) length, not the raw working copy", async () => {
    const longInstruction = "x".repeat(2000);
    const item = await createDraft(env.DB, `[TK]${longInstruction}[/TK]`);
    // Working copy is well over FRAGMENT_MAX_CHARS, but the generated output is short.
    await generateVia(item.id, 0, "short");
    const draft = (await getItem(env.DB, item.id))!;
    expect(draft.content_md.length).toBeGreaterThan(1000);
    await expect(publish(env.DB, draft, null)).resolves.toBe(1);

    // Inverse: short working copy, output that blows the cap.
    const item2 = await createDraft(env.DB, "[TK]x[/TK]");
    await generateVia(item2.id, 0, "y".repeat(1500));
    const draft2 = (await getItem(env.DB, item2.id))!;
    await expect(publish(env.DB, draft2, null)).rejects.toThrow(FragmentTooLongError);
  });

  it("thread: quote (own-line ![[id]] outside scope) vs source (inside scope) resolve to different provenance keys", async () => {
    const cookie = await login();
    const quoted = await createAndPublish(cookie, "quoted verbatim text");
    const sourced = await createAndPublish(cookie, "source material for generation");
    const threadItem = await createDraft(
      env.DB,
      `Quote:\n\n![[${quoted}]]\n\nGenerated:\n\n[TK]weave in ![[${sourced}]][/TK]`,
      "thread",
    );
    await generateVia(threadItem.id, 0, "a woven paraphrase");
    const draft = (await getItem(env.DB, threadItem.id))!;
    await publish(env.DB, draft, null);

    const row = (await env.DB.prepare("SELECT transclusions, generated_json, content_html FROM versions WHERE item_id = ? AND version = 1").bind(threadItem.id).first()) as {
      transclusions: string;
      generated_json: string;
      content_html: string;
    };
    expect(JSON.parse(row.transclusions)).toEqual([{ id: quoted, version: 1 }]);
    expect(JSON.parse(row.generated_json)).toEqual([{ sources: [{ id: sourced, version: 1 }], model: "claude-opus-5", at: expect.any(String) }]);
    expect(row.content_html).toContain('class="blyg-transclusion"');
    expect(row.content_html).toContain('class="blyg-tk-gen"');
    expect(row.content_html).toContain("quoted verbatim text");
    expect(row.content_html).toContain("a woven paraphrase");
    // The source's raw content never gets quoted verbatim in the baked HTML.
    expect(row.content_html).not.toContain("source material for generation");
  });

  it("thread: still rejects an unresolved transclusion outside any scope", async () => {
    const item = await createDraft(env.DB, `![[zzzzzzzzzzzzzzzzzzzzzzzzzz]]`, "thread");
    await expect(publish(env.DB, item, null)).rejects.toThrow(TransclusionResolveError);
  });

  it("regenerate + republish bumps the version with fresh provenance", async () => {
    const item = await createDraft(env.DB, "[TK]x[/TK]");
    await generateVia(item.id, 0, "v1 output");
    let draft = (await getItem(env.DB, item.id))!;
    const v1 = await publish(env.DB, draft, null);
    expect(v1).toBe(1);

    await generateVia(item.id, 0, "v2 output");
    draft = (await getItem(env.DB, item.id))!;
    const v2 = await publish(env.DB, draft, null);
    expect(v2).toBe(2);

    const row = (await env.DB.prepare("SELECT content_md, generated_json FROM versions WHERE item_id = ? AND version = 2").bind(item.id).first()) as {
      content_md: string;
      generated_json: string;
    };
    expect(row.content_md).toBe("v2 output");
    expect(JSON.parse(row.generated_json)[0].sources).toEqual([]);
  });
});

describe("definition of done (tk-core-plan.md §7)", () => {
  it("thread with a quote, an inline TK source-scope, and a pure-instruction scope; generate, hand-edit, publish", async () => {
    const cookie = await login();
    const quoted = await createAndPublish(cookie, "the quoted fragment");
    const source = await createAndPublish(cookie, "einstein's original words");

    const threadItem = await createDraft(
      env.DB,
      `A block quote:\n\n![[${quoted}]]\n\n` + `As Einstein said, [TK]simplify ![[${source}]] for a lay reader[/TK], apparently.\n\n` + `And separately: [TK]write one word[/TK].`,
      "thread",
    );

    // Generate both scopes.
    await generateVia(threadItem.id, 0, "things are relative");
    await generateVia(threadItem.id, 1, "wordish");
    // Hand-edit one output in place (still working-copy text, per §2.3).
    let draft = (await getItem(env.DB, threadItem.id))!;
    const scopes = parseScopes(draft.content_md).scopes;
    const editedMd = setScopeOutput(draft.content_md, scopes[0], "everything is relative");
    await saveWorkingCopy(env.DB, threadItem.id, editedMd);

    draft = (await getItem(env.DB, threadItem.id))!;
    const version = await publish(env.DB, draft, "definition of done");
    expect(version).toBe(1);

    const item = await (await getPublic(`/blyg/items/${threadItem.id}.json`)).json<any>();
    expect(item.content_md).not.toMatch(/\[TK\]|\[=\]|\[\/TK\]/);
    expect(item.transclusions).toEqual([{ id: quoted, version: 1 }]);
    expect(item.generated).toEqual([
      { sources: [{ id: source, version: 1 }], model: "claude-opus-5", at: expect.any(String) },
      { sources: [], model: "claude-opus-5", at: expect.any(String) },
    ]);
    expect(item.content_html).toContain('class="blyg-transclusion"');
    expect(item.content_html).toContain('class="blyg-tk-gen"');
    expect(item.content_html).toContain("everything is relative");
    expect(item.content_html).toContain("wordish");
    expect(item.content_hash).toBe(await contentHash(item.content_md));

    // Regenerate + republish bumps the version with fresh provenance.
    await generateVia(threadItem.id, 0, "relativity, roughly");
    draft = (await getItem(env.DB, threadItem.id))!;
    const version2 = await publish(env.DB, draft, null);
    expect(version2).toBe(2);
    const item2 = await (await getPublic(`/blyg/items/${threadItem.id}.json`)).json<any>();
    expect(item2.version).toBe(2);
    expect(item2.content_md).toContain("relativity, roughly");

    // Full owner loop confirms the publish endpoint itself carries the same behavior.
    const republish = await apiJson(cookie, "POST", `/api/items/${threadItem.id}/publish`, {});
    // No working-copy changes since last publish — republish still succeeds (v3).
    expect(republish.status).toBe(200);
    expect(republish.json.version).toBe(3);
  });
});
