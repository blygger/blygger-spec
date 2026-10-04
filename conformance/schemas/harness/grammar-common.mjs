// Shared by every grammar harness: load the corpus, substitute {{L}}, and
// reduce an implementation's output to the comparable "parse".
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bakedWrappers } from "../lib/semantic.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const GRAMMAR_DIR = join(here, "..", "grammar");

export function loadCases() {
  return readdirSync(GRAMMAR_DIR).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, ...JSON.parse(readFileSync(join(GRAMMAR_DIR, f), "utf8")) }));
}

export const subst = (v, L) => JSON.parse(JSON.stringify(v).replaceAll("{{L}}", L));

/** Remove top-level baked transclusion blockquotes (their inner HTML is the target's, not ours). */
export function stripBaked(html) {
  let out = html;
  for (const w of bakedWrappers(html).reverse()) {
    const open = out.lastIndexOf("<blockquote", w.innerStart);
    const close = out.indexOf("</blockquote>", w.innerStart + w.inner.length);
    if (open >= 0 && close >= 0) out = out.slice(0, open) + out.slice(close + "</blockquote>".length);
  }
  return out;
}

const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/**
 * actual = { error, transclusions:[{id,partial,exact?}], html, tk_sources:[[id]] }
 * returns the comparable parse + a verdict against expect.
 */
export function compare(expect, actual, knownIds) {
  const prose = stripBaked(actual.html || "");
  const anchors = [...prose.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => decode(m[1]));
  const links = [];
  for (const h of anchors) for (const id of knownIds) if (h.includes(id) && !links.includes(id)) links.push(id);
  const parse = {
    error: !!actual.error,
    transclusions: (actual.transclusions || []).map((t) => ({ id: t.id, partial: !!t.partial, ...(t.partial ? { exact: t.exact } : {}) })),
    links,
    tk_sources: actual.tk_sources || [],
    literal: (expect.literal || []).filter((s) => decode(prose).includes(s)),
  };
  const diffs = [];
  if (parse.error !== expect.error) diffs.push(`error: expected ${expect.error}, got ${parse.error}${actual.errorText ? ` (${actual.errorText})` : ""}`);
  if (!expect.error && !parse.error) {
    const exT = JSON.stringify(expect.transclusions.map((t) => ({ id: t.id, partial: t.partial, ...(t.partial ? { exact: t.exact } : {}) })));
    if (JSON.stringify(parse.transclusions) !== exT) diffs.push(`transclusions: expected ${exT}, got ${JSON.stringify(parse.transclusions)}`);
    if (JSON.stringify([...parse.links].sort()) !== JSON.stringify([...expect.links].sort())) diffs.push(`links: expected ${JSON.stringify(expect.links)}, got ${JSON.stringify(parse.links)}`);
    if (JSON.stringify(parse.tk_sources) !== JSON.stringify(expect.tk_sources)) diffs.push(`tk_sources: expected ${JSON.stringify(expect.tk_sources)}, got ${JSON.stringify(parse.tk_sources)}`);
    const missing = (expect.literal || []).filter((s) => !parse.literal.includes(s));
    if (missing.length) diffs.push(`literal text missing from output: ${missing.join(", ")}`);
  }
  return { parse, ok: diffs.length === 0, diffs };
}
