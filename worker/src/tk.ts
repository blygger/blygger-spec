// TK (instructed generation) authoring grammar — tk-core-plan.md §2, decision #20.
// Studio-private: this grammar never reaches the wire. Publish strips every
// scope to its bare output (see stripToOutput); the wire never sees "[TK".

import { renderMarkdown } from "./markdown.ts";
import { ID_ALPHABET } from "./util.ts";

const SOURCE_REF = new RegExp(`!\\[\\[([${ID_ALPHABET}]{26})\\]\\]`, "g");

export interface TkScope {
  /** Index of the opening "[TK" token in the source string. */
  start: number;
  /** Index just after the closing "[/TK]" token. */
  end: number;
  instruction: string;
  /** Text between "[=]" and "[/TK]"; null when the scope has not been generated yet. */
  output: string | null;
  /** Deduplicated `![[id]]` refs found anywhere in the scope (instruction or output), first-occurrence order. */
  sourceIds: string[];
  /** Index in the source string right after "[=]", i.e. where `output` begins; null when the scope has no "[=]" yet. */
  outputStart: number | null;
  /**
   * True when the scope occupies a paragraph by itself (preceded and
   * followed only by a blank line or a document edge) — renders as a
   * `<div class="blyg-tk-gen">`. False renders as an inline `<span>`.
   */
  block: boolean;
}

export interface TkParseError {
  at: number;
  reason: string;
}

function extractSourceIds(scopeText: string): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const m of scopeText.matchAll(SOURCE_REF)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ids.push(m[1]);
    }
  }
  return ids;
}

const BLANK_BEFORE = /(^|\n[ \t]*\n)[ \t]*$/;
const BLANK_AFTER = /^[ \t]*(\n[ \t]*\n|$)/;

function isBlockPosition(contentMd: string, start: number, end: number): boolean {
  return BLANK_BEFORE.test(contentMd.slice(0, start)) && BLANK_AFTER.test(contentMd.slice(end));
}

/**
 * Linear token scan for `[TK <instruction>[=]<output>[/TK]` — no bracket
 * balancing, matching tk-core-plan.md §2.1: the scanner only looks for the
 * three literal tokens, so `![[id]]` refs are safe to write inside an
 * instruction or output. No nesting: a second "[TK" found before the
 * enclosing scope's "[/TK]" is a parse error and the outer scope is skipped
 * (scanning resumes after its close) rather than partially recovered.
 */
export function parseScopes(contentMd: string): { scopes: TkScope[]; errors: TkParseError[] } {
  const scopes: TkScope[] = [];
  const errors: TkParseError[] = [];
  let i = 0;
  while (true) {
    const tkIdx = contentMd.indexOf("[TK", i);
    if (tkIdx === -1) break;
    const closeIdx = contentMd.indexOf("[/TK]", tkIdx + 3);
    if (closeIdx === -1) {
      errors.push({ at: tkIdx, reason: "unterminated scope (missing [/TK])" });
      break;
    }
    const nestedIdx = contentMd.indexOf("[TK", tkIdx + 3);
    if (nestedIdx !== -1 && nestedIdx < closeIdx) {
      errors.push({ at: nestedIdx, reason: "nested TK scopes are not supported" });
      i = closeIdx + 5;
      continue;
    }
    const eqIdx = contentMd.indexOf("[=]", tkIdx + 3);
    const hasEq = eqIdx !== -1 && eqIdx < closeIdx;
    const instrEnd = hasEq ? eqIdx : closeIdx;
    const instruction = contentMd.slice(tkIdx + 3, instrEnd).trim();
    const output = hasEq ? contentMd.slice(eqIdx + 3, closeIdx) : null;
    const end = closeIdx + 5;
    scopes.push({
      start: tkIdx,
      end,
      instruction,
      output,
      sourceIds: extractSourceIds(contentMd.slice(tkIdx, end)),
      outputStart: hasEq ? eqIdx + 3 : null,
      block: isBlockPosition(contentMd, tkIdx, end),
    });
    i = end;
  }
  return { scopes, errors };
}

/** Scopes with no output yet — publishing with any of these present is a publish error (§2.4). */
export function unresolvedScopes(scopes: TkScope[]): TkScope[] {
  return scopes.filter((s) => s.output === null);
}

export interface TkPublishIssue {
  at: number;
  reason: string;
}

/** Thrown by model.publish() when the working copy isn't publish-ready: malformed grammar or an unresolved scope. */
export class TkPublishError extends Error {
  constructor(public readonly issues: TkPublishIssue[]) {
    super("TK scopes are not publish-ready");
  }
}

export interface GeneratedSpan {
  /** Offset of the output text within the *stripped* string returned alongside this span. */
  start: number;
  end: number;
  block: boolean;
  sourceIds: string[];
}

/**
 * Strip every scope down to its bare output (`[TK …[=]` and `[/TK]`
 * removed, output text kept in place) — the wire `content_md` transform of
 * §2.4. Every scope MUST have output; check via unresolvedScopes() first.
 * Returns the generated-text spans' offsets in the *stripped* string, for
 * HTML disclosure wrapping at render time.
 */
export function stripToOutput(contentMd: string, scopes: TkScope[]): { text: string; spans: GeneratedSpan[] } {
  let out = "";
  let last = 0;
  const spans: GeneratedSpan[] = [];
  for (const s of scopes) {
    if (s.output === null) {
      throw new Error("stripToOutput: scope has no output — call unresolvedScopes() first");
    }
    out += contentMd.slice(last, s.start);
    const spanStart = out.length;
    out += s.output;
    spans.push({ start: spanStart, end: spanStart + s.output.length, block: s.block, sourceIds: s.sourceIds });
    last = s.end;
  }
  out += contentMd.slice(last);
  return { text: out, spans };
}

/**
 * Studio-preview variant of stripToOutput — never throws. An ungenerated
 * scope substitutes a visible placeholder instead of aborting, so the studio
 * preview (task 6) can show authors what publish will reject before they hit
 * publish, matching previewTransclusions's pattern for bad `![[id]]` refs.
 */
export function previewStrip(contentMd: string, scopes: TkScope[]): { text: string; spans: GeneratedSpan[] } {
  let out = "";
  let last = 0;
  const spans: GeneratedSpan[] = [];
  for (const s of scopes) {
    out += contentMd.slice(last, s.start);
    const spanStart = out.length;
    const text = s.output !== null ? s.output : `⚠ ungenerated — ${s.instruction || "(no instruction)"}`;
    out += text;
    spans.push({ start: spanStart, end: spanStart + text.length, block: s.block, sourceIds: s.sourceIds });
    last = s.end;
  }
  out += contentMd.slice(last);
  return { text: out, spans };
}

/**
 * Working-copy edit for the /generate endpoint (§5): replace one scope's
 * output with `newOutput`, inserting "[=]" first if the scope had none yet.
 * The instruction and every other scope are untouched.
 */
export function setScopeOutput(contentMd: string, scope: TkScope, newOutput: string): string {
  const closeIdx = scope.end - 5; // start of "[/TK]"
  if (scope.outputStart !== null) {
    return contentMd.slice(0, scope.outputStart) + newOutput + contentMd.slice(closeIdx);
  }
  return contentMd.slice(0, closeIdx) + "[=]" + newOutput + contentMd.slice(closeIdx);
}

// --- Publish-time HTML disclosure (§3.2) ---
//
// Block spans are rendered independently (renderMarkdown on just that span)
// and spliced back in as a <div>, so a multi-paragraph generated block never
// gets split across the surrounding document's own markdown rendering. Inline
// spans stay inside the flowing text (sentinel-wrapped, not replaced) so
// surrounding markdown constructs — emphasis, links — still parse across the
// span boundary. Both use Unicode Private Use Area sentinels: never produced
// by normal authoring or by markdown-it's own output, so a plain string
// find/replace after rendering is safe. A scope with no recorded provenance
// (hand-authored output, never generated) gets no wrapper — see model.ts.

// U+E000/E001/E002 (Private Use Area) via fromCharCode, not literal glyphs —
// avoids relying on non-ASCII source bytes surviving every tool/editor layer
// unmangled. Never produced by normal authoring or by markdown-it's output.
const BLOCK_SENTINEL = String.fromCharCode(0xe000);
const INLINE_OPEN = String.fromCharCode(0xe001);
const INLINE_CLOSE = String.fromCharCode(0xe002);

export interface AnnotatedDocument {
  /** Ready for renderMarkdown() (fragments) or resolveTransclusions() (threads). */
  text: string;
  /** Unique per-span token -> its independently-rendered `<div class="blyg-tk-gen">` replacement. */
  blockReplacements: Map<string, string>;
  hasInline: boolean;
}

/**
 * Prepare stripped content_md for rendering: provenanced block spans become
 * opaque single-line placeholder tokens (alone in their own paragraph, per
 * stripToOutput's block-position guarantee); provenanced inline spans are
 * sentinel-wrapped in place; spans with no provenance are left as plain text.
 */
export function annotateGenerated(strippedMd: string, spans: GeneratedSpan[], hasProvenance: boolean[]): AnnotatedDocument {
  let out = "";
  let last = 0;
  const blockReplacements = new Map<string, string>();
  let hasInline = false;
  spans.forEach((span, i) => {
    out += strippedMd.slice(last, span.start);
    const text = strippedMd.slice(span.start, span.end);
    if (!hasProvenance[i]) {
      out += text;
    } else if (span.block) {
      const token = `${BLOCK_SENTINEL}${i}${BLOCK_SENTINEL}`;
      blockReplacements.set(token, `<div class="blyg-tk-gen">${renderMarkdown(text)}</div>`);
      out += token;
    } else {
      hasInline = true;
      out += INLINE_OPEN + text + INLINE_CLOSE;
    }
    last = span.end;
  });
  out += strippedMd.slice(last);
  return { text: out, blockReplacements, hasInline };
}

/** Splice annotateGenerated()'s placeholders/sentinels into already-rendered HTML. */
export function applyGeneratedWrappers(html: string, doc: AnnotatedDocument): string {
  let out = html;
  for (const [token, blockHtml] of doc.blockReplacements) {
    out = out.replace(`<p>${token}</p>`, blockHtml);
  }
  if (doc.hasInline) {
    out = out.split(INLINE_OPEN).join('<span class="blyg-tk-gen">').split(INLINE_CLOSE).join("</span>");
  }
  return out;
}
