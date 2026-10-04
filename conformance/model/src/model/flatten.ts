// Post-#57 fork of a thread (spec §16.6f, ruled 2026-10-03): the fork descends
// from the PINNED DOCUMENT, flattened — not from its content_md re-resolved.
// Written from the §16.6f text:
//   - own prose copied byte-exact from the pinned content_md;
//   - each blyg-transclusion element replaces its directive as an ordinary
//     markdown blockquote of that element's content, recursively, followed by
//     an attribution line naming origin and id (wording is the client's);
//   - a partial flattens the same way, from its baked paragraphs;
//   - no blyg-transclusion survives; no transclusions[] are inherited.
// One judgment call, flagged "For Fable" in the README: a directive's attached
// blockquote is consumed with it ONLY when the baked element is a partial
// (`blyg-partial`). A thread published by a client without the 2026-10-03
// partial grammar baked a WHOLE quote there and the `>` lines were the
// author's own prose, which "copied byte-exact" must keep.
import { escapeHtml } from "./text.ts";

type El = { tag: string; attrs: Record<string, string>; children: (El | string)[] };

export function parse(html: string): (El | string)[] {
  const root: El = { tag: "#root", attrs: {}, children: [] };
  const stack: El[] = [root];
  for (const m of html.matchAll(/<\/([a-z0-9]+)\s*>|<([a-z0-9]+)((?:\s+[a-z-]+="[^"]*")*)\s*>|[^<]+/gi)) {
    const top = stack[stack.length - 1];
    if (m[1]) { const at = stack.map((e) => e.tag).lastIndexOf(m[1].toLowerCase()); if (at > 0) stack.length = at; continue; }
    if (m[2]) {
      const attrs: Record<string, string> = {};
      for (const a of (m[3] ?? "").matchAll(/([a-z-]+)="([^"]*)"/gi)) attrs[a[1].toLowerCase()] = a[2];
      const el: El = { tag: m[2].toLowerCase(), attrs, children: [] };
      top.children.push(el);
      stack.push(el);
      continue;
    }
    top.children.push(m[0]);
  }
  return root.children;
}

const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
export const isQuote = (n: El | string): boolean => typeof n !== "string" && (n.attrs.class ?? "").split(/\s+/).includes("blyg-transclusion");
const isPartial = (n: El) => (n.attrs.class ?? "").split(/\s+/).includes("blyg-partial");
const text = (n: El | string): string => (typeof n === "string" ? unesc(n) : n.children.map(text).join(""));

export function topLevelQuotes(nodes: (El | string)[]): El[] {
  const out: El[] = [];
  for (const n of nodes) { if (typeof n === "string") continue; if (isQuote(n)) out.push(n); else out.push(...topLevelQuotes(n.children)); }
  return out;
}
export function allQuotes(nodes: (El | string)[]): El[] {
  const out: El[] = [];
  for (const n of nodes) { if (typeof n === "string") continue; if (isQuote(n)) out.push(n); out.push(...allQuotes(n.children)); }
  return out;
}

const quoteMd = (md: string) => md.split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n");

function blocks(nodes: (El | string)[], origin: string): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (typeof n === "string") { if (n.trim()) out.push(unesc(n).trim()); continue; }
    if (isQuote(n)) out.push(flattenQuote(n as El, origin));
    else if (n.tag === "blockquote") out.push(quoteMd(blocks(n.children, origin).join("\n\n")));
    else if (n.tag === "p") out.push(text(n).trim());
    else out.push(...blocks(n.children, origin));
  }
  return out.filter(Boolean);
}

/** One baked quote: an ordinary blockquote + attribution line; nested quotes nest. */
export function flattenQuote(el: El, ctxOrigin: string): string {
  const origin = el.attrs["data-blyg-origin"] || ctxOrigin; // absent = same origin as the layer that baked it (#41)
  const id = el.attrs["data-blyg-id"] ?? "";
  const v = el.attrs["data-blyg-version"];
  const body = blocks(el.children, origin).join("\n\n");
  return quoteMd(`${body}\n\n— quoted from ${origin} ${id}${v ? ` v${v}` : ""} (${origin}items/${id}.json)`);
}

const DIRECTIVE = /^\s*!\[\[([0-9a-hjkmnp-tv-z]{26})\]\]\s*$/;

/** §16.6f flatten. `exact` false = the directives and the bake did not line up; whole-HTML fallback. */
export function flattenFork(contentMd: string, contentHtml: string, origin: string): { md: string; exact: boolean } {
  const quotes = topLevelQuotes(parse(contentHtml));
  const lines = contentMd.split("\n");
  const out: string[] = [];
  let q = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!DIRECTIVE.test(lines[i])) { out.push(lines[i]); continue; }
    const el = quotes[q++];
    if (!el) return { md: blocks(parse(contentHtml), origin).join("\n\n"), exact: false };
    out.push(flattenQuote(el, origin));
    if (isPartial(el)) while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) i++;
  }
  if (q !== quotes.length) return { md: blocks(parse(contentHtml), origin).join("\n\n"), exact: false };
  return { md: out.join("\n"), exact: true };
}

/** Lines of own prose the fork must keep byte-exact (same partial-only consumption rule). */
export function ownProseLines(contentMd: string, contentHtml: string): string[] {
  const quotes = topLevelQuotes(parse(contentHtml));
  const lines = contentMd.split("\n");
  const own: string[] = [];
  let q = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!DIRECTIVE.test(lines[i])) { if (lines[i].trim()) own.push(lines[i]); continue; }
    const el = quotes[q++];
    if (el && isPartial(el)) while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) i++;
  }
  return own;
}

/** Every baked quote with its EFFECTIVE origin: an absent data-blyg-origin means the origin of the layer that baked it (#41). */
export function quotesWithOrigin(nodes: (El | string)[], origin: string): { el: El; origin: string }[] {
  const out: { el: El; origin: string }[] = [];
  for (const n of nodes) {
    if (typeof n === "string") continue;
    if (isQuote(n)) { const o = n.attrs["data-blyg-origin"] || origin; out.push({ el: n, origin: o }); out.push(...quotesWithOrigin(n.children, o)); }
    else out.push(...quotesWithOrigin(n.children, origin));
  }
  return out;
}

/** Text lines of one baked quote (every <p>, nested quotes included), whitespace-normalized. */
export function elLines(el: El): string[] {
  const out: string[] = [];
  const walk = (n: El | string) => {
    if (typeof n === "string") return;
    if (n.tag === "p") { const t = text(n).replace(/\s+/g, " ").trim(); if (t) out.push(t); return; }
    n.children.forEach(walk);
  };
  walk(el);
  return out;
}

export { escapeHtml };
