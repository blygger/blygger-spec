// Task 1 acceptance: TK scope parser — inline/block/multiline scopes, refs in
// instructions, no-output scopes, nesting errors, strip-to-output, and the
// exclusion rule (a scoped own-line ![[id]] is a source, not a transclusion
// directive — verified here by checking it's captured as a source ref).
//
// Grammar: three tokens, balanced brackets, no bracket-balancing parser
// (tk-core-plan.md §2.1, decision #20 as amended §9, session 16). Scopes are
// "[TK]<instruction>[/TK]" (ungenerated) or "[TK]<instruction>[=]<output>[/TK]"
// (generated) — a linear scan for the three literal tokens "[TK]", "[=]",
// "[/TK]", so "![[id]]" refs never need escaping regardless of where they
// fall. (History: session 12 spelled the opener "[TK" with no closing
// bracket; session 15 confirmed no *closing* token may begin with "]" —
// forced, since it mis-splits an instruction ending in a source ref
// ("...![[abc]][/TK]"). Session 16 respelled the opener to balanced "[TK]":
// that constraint never actually ruled out a balanced *opener*, and Venkat
// rejected the unbalanced spelling as unreadable.)
import { describe, expect, it } from "vitest";
import { parseScopes, previewStrip, setScopeOutput, stripToOutput, unresolvedScopes } from "../src/tk.ts";

const ID_A = "0123456789abcdefghjkmnpqra"; // 26 chars, valid alphabet
const ID_B = "0123456789abcdefghjkmnpqrb";

describe("parseScopes — grammar (§2.1)", () => {
  it("parses a block scope with output, standalone paragraph", () => {
    const md = `Intro.\n\n[TK]summarize the intro[=]A short summary.[/TK]\n\nOutro.`;
    const { scopes, errors } = parseScopes(md);
    expect(errors).toEqual([]);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].instruction).toBe("summarize the intro");
    expect(scopes[0].output).toBe("A short summary.");
    expect(scopes[0].block).toBe(true);
  });

  it("parses an inline scope mid-sentence as non-block", () => {
    const md = `As Einstein said, [TK]simplify[=]things are relative[/TK], apparently.`;
    const { scopes } = parseScopes(md);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].block).toBe(false);
    expect(scopes[0].output).toBe("things are relative");
  });

  it("treats a scope at the very start or end of the document as block", () => {
    const start = parseScopes(`[TK]x[=]y[/TK]\n\nrest`).scopes[0];
    expect(start.block).toBe(true);
    const end = parseScopes(`rest\n\n[TK]x[=]y[/TK]`).scopes[0];
    expect(end.block).toBe(true);
  });

  it("a scope glued to adjacent prose on the same paragraph is inline, not block", () => {
    const md = `intro line\n[TK]x[=]y[/TK]\nmore text`;
    expect(parseScopes(md).scopes[0].block).toBe(false);
  });

  it("a scope may span multiple lines", () => {
    const md = `[TK]summarize\nthis whole\nparagraph[=]done[/TK]`;
    const { scopes } = parseScopes(md);
    expect(scopes[0].instruction).toBe("summarize\nthis whole\nparagraph");
  });

  it("ungenerated scope (no [=]) has null output", () => {
    const { scopes } = parseScopes(`[TK]write something[/TK]`);
    expect(scopes[0].output).toBeNull();
    expect(scopes[0].instruction).toBe("write something");
  });

  it("unresolvedScopes filters to scopes with no output", () => {
    const { scopes } = parseScopes(`[TK]a[/TK] and [TK]b[=]done[/TK]`);
    const unresolved = unresolvedScopes(scopes);
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].instruction).toBe("a");
  });

  it("parses multiple independent scopes in document order", () => {
    const md = `[TK]a[=]1[/TK] middle [TK]b[=]2[/TK]`;
    const { scopes } = parseScopes(md);
    expect(scopes.map((s) => s.output)).toEqual(["1", "2"]);
  });

  it("detects a nested scope as an error and skips the outer one", () => {
    const md = `[TK]outer [TK]inner[=]x[/TK] still outer[=]y[/TK] tail [TK]z[=]w[/TK]`;
    const { scopes, errors } = parseScopes(md);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/nested/);
    // Only the well-formed trailing scope survives.
    expect(scopes).toHaveLength(1);
    expect(scopes[0].instruction).toBe("z");
  });

  it("reports an unterminated scope (missing [/TK])", () => {
    const { scopes, errors } = parseScopes(`[TK]never closed`);
    expect(scopes).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/unterminated/);
  });

  it("no TK content yields no scopes and no errors", () => {
    expect(parseScopes("plain markdown, no TK here")).toEqual({ scopes: [], errors: [] });
  });

  it("an empty instruction is valid — the balanced-opener journalism-placeholder convention", () => {
    const ungenerated = parseScopes(`[TK][/TK]`).scopes[0];
    expect(ungenerated.instruction).toBe("");
    expect(ungenerated.output).toBeNull();

    const generated = parseScopes(`[TK][=]out[/TK]`).scopes[0];
    expect(generated.instruction).toBe("");
    expect(generated.output).toBe("out");
  });

  it("an instruction ending directly against [=] with no space still splits cleanly", () => {
    // The regression case the grammar history is about: a source ref's own
    // "]]" sits immediately before the "[=]" token, and the scanner must
    // still find the literal 3-char "[=]" sequence, not a bare "]".
    const md = `[TK]simplify: ![[${ID_A}]][=]output[/TK]`;
    const { scopes, errors } = parseScopes(md);
    expect(errors).toEqual([]);
    expect(scopes[0].instruction).toBe(`simplify: ![[${ID_A}]]`);
    expect(scopes[0].output).toBe("output");
    expect(scopes[0].sourceIds).toEqual([ID_A]);
  });
});

describe("source refs — quote-vs-source exclusion rule (§2.2)", () => {
  it("extracts a ![[id]] ref from the instruction as a source, in scope order", () => {
    const md = `[TK]simplify ![[${ID_A}]] for a lay reader[=]output here[/TK]`;
    const { scopes } = parseScopes(md);
    expect(scopes[0].sourceIds).toEqual([ID_A]);
  });

  it("an own-line ![[id]] inside a scope is captured as a source ref, not left for transclusion", () => {
    const md = `[TK]summarize\n![[${ID_A}]]\nplease[=]summary[/TK]`;
    const { scopes } = parseScopes(md);
    expect(scopes[0].sourceIds).toEqual([ID_A]);
    // Confirm it's inside the scope span (so a transclusion walker would
    // never see it as a standalone line once the scope is masked/stripped).
    const refIdx = md.indexOf(`![[${ID_A}]]`);
    expect(refIdx).toBeGreaterThan(scopes[0].start);
    expect(refIdx).toBeLessThan(scopes[0].end);
  });

  it("dedupes repeated refs, keeping first-occurrence order", () => {
    const md = `[TK]use ![[${ID_B}]] and ![[${ID_A}]] and ![[${ID_B}]] again[=]out[/TK]`;
    const { scopes } = parseScopes(md);
    expect(scopes[0].sourceIds).toEqual([ID_B, ID_A]);
  });

  it("scope with no source refs has an empty sourceIds array", () => {
    const { scopes } = parseScopes(`[TK]write a haiku about spring[=]blossoms fall[/TK]`);
    expect(scopes[0].sourceIds).toEqual([]);
  });

  it("does not match a reserved @vN reference as a source", () => {
    const md = `[TK]use ![[${ID_A}@v2]][=]out[/TK]`;
    const { scopes } = parseScopes(md);
    expect(scopes[0].sourceIds).toEqual([]);
  });
});

describe("stripToOutput — publish transform (§2.4)", () => {
  it("removes markers, keeps output in place, for a single block scope", () => {
    const md = `Intro.\n\n[TK]x[=]Generated text.[/TK]\n\nOutro.`;
    const { scopes } = parseScopes(md);
    const { text, spans } = stripToOutput(md, scopes);
    expect(text).toBe(`Intro.\n\nGenerated text.\n\nOutro.`);
    expect(spans).toHaveLength(1);
    expect(text.slice(spans[0].start, spans[0].end)).toBe("Generated text.");
    expect(spans[0].block).toBe(true);
  });

  it("strips multiple scopes and reports correct offsets for each", () => {
    const md = `[TK]a[=]ONE[/TK] and [TK]b[=]TWO[/TK]`;
    const { scopes } = parseScopes(md);
    const { text, spans } = stripToOutput(md, scopes);
    expect(text).toBe(`ONE and TWO`);
    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual(["ONE", "TWO"]);
  });

  it("carries sourceIds through onto the generated span", () => {
    const md = `[TK]use ![[${ID_A}]][=]woven output[/TK]`;
    const { scopes } = parseScopes(md);
    const { spans } = stripToOutput(md, scopes);
    expect(spans[0].sourceIds).toEqual([ID_A]);
  });

  it("throws if any scope is unresolved (caller must check unresolvedScopes first)", () => {
    const { scopes } = parseScopes(`[TK]a[/TK]`);
    expect(() => stripToOutput("[TK]a[/TK]", scopes)).toThrow();
  });

  it("no-op on markdown with no scopes", () => {
    const md = "just plain prose, ![[not-a-real-scope]] too";
    const { text, spans } = stripToOutput(md, []);
    expect(text).toBe(md);
    expect(spans).toEqual([]);
  });
});

describe("setScopeOutput — /generate working-copy edit (§5 task 4)", () => {
  it("replaces existing output, keeping the instruction and markers", () => {
    const md = `Intro.\n\n[TK]summarize[=]old output[/TK]\n\nOutro.`;
    const { scopes } = parseScopes(md);
    const updated = setScopeOutput(md, scopes[0], "new output");
    expect(updated).toBe(`Intro.\n\n[TK]summarize[=]new output[/TK]\n\nOutro.`);
    // Round-trips: re-parsing the edited doc yields the same instruction.
    expect(parseScopes(updated).scopes[0].instruction).toBe("summarize");
  });

  it("inserts [=] for a previously-ungenerated scope", () => {
    const md = `[TK]write a haiku[/TK]`;
    const { scopes } = parseScopes(md);
    expect(scopes[0].output).toBeNull();
    const updated = setScopeOutput(md, scopes[0], "blossoms fall");
    expect(updated).toBe(`[TK]write a haiku[=]blossoms fall[/TK]`);
    expect(parseScopes(updated).scopes[0].output).toBe("blossoms fall");
  });

  it("leaves other scopes and surrounding text untouched", () => {
    const md = `[TK]a[=]ONE[/TK] middle [TK]b[=]TWO[/TK] tail`;
    const { scopes } = parseScopes(md);
    const updated = setScopeOutput(md, scopes[1], "CHANGED");
    expect(updated).toBe(`[TK]a[=]ONE[/TK] middle [TK]b[=]CHANGED[/TK] tail`);
  });

  it("regeneration is idempotent-safe: applying twice with the same text is a no-op on content", () => {
    const md = `[TK]x[=]v1[/TK]`;
    const { scopes } = parseScopes(md);
    const once = setScopeOutput(md, scopes[0], "v2");
    const twice = setScopeOutput(once, parseScopes(once).scopes[0], "v2");
    expect(once).toBe(twice);
  });
});

describe("previewStrip — studio preview, non-throwing (task 6)", () => {
  it("behaves like stripToOutput when every scope has output", () => {
    const md = `[TK]a[=]ONE[/TK] and [TK]b[=]TWO[/TK]`;
    const { scopes } = parseScopes(md);
    expect(previewStrip(md, scopes)).toEqual(stripToOutput(md, scopes));
  });

  it("substitutes a visible placeholder for an ungenerated scope instead of throwing", () => {
    const md = `Intro.\n\n[TK]write a haiku[/TK]\n\nOutro.`;
    const { scopes } = parseScopes(md);
    const { text, spans } = previewStrip(md, scopes);
    expect(text).toContain("ungenerated");
    expect(text).toContain("write a haiku");
    expect(spans).toHaveLength(1);
    expect(text.slice(spans[0].start, spans[0].end)).toBe(text.trim().split("\n\n")[1]);
  });
});
