// Reference reading of the §10.1 bracket grammar, written from the spec text
// alone (not from either implementation). Used by the semantic rules (to
// compare a published content_md against its transclusions[]) and to
// sanity-check the grammar fixtures' expectations.
//
//   - own-line `![[id]]` (surrounding whitespace allowed) = transclusion directive
//   - directive + immediately following `>` lines (no blank line) = partial (#49)
//   - `![[id@vN]]` own-line = reserved: publisher MUST reject
//   - `[[id]]` inline outside code = plain internal link (#32, #54)
//   - inside code spans / code blocks both forms are inert (#54)
//   - inside a TK scope `![[id]]` is a generation source, never a quote (#20)

export const ID = "[0-9abcdefghjkmnpqrstvwxyz]{26}";
const DIRECTIVE = new RegExp(`^[ \\t\\r\\f\\v\\u00a0\\ufeff]*!\\[\\[(${ID})\\]\\][ \\t\\r\\f\\v\\u00a0\\ufeff]*$`);
const RESERVED = new RegExp(`^\\s*!\\[\\[(${ID})@v\\d+\\]\\]\\s*$`);
const LINK = new RegExp(`(?<!!)\\[\\[(${ID})\\]\\]`, "g");
const SOURCE = new RegExp(`!\\[\\[(${ID})\\]\\]`, "g");
const QUOTE = /^\s*>/;

/** Character ranges [start, end) that CommonMark would render as code. Approximate but spec-shaped. */
export function codeRanges(md) {
  const ranges = [];
  const lines = md.split("\n");
  let off = 0;
  let fence = null; // {char, len, start}
  let prevBlank = true;
  const starts = [];
  for (const l of lines) { starts.push(off); off += l.length + 1; }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    const s = starts[i], e = s + lines[i].length;
    if (fence) {
      ranges.push([s, e + 1]);
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.len) fence = null;
      prevBlank = false;
      continue;
    }
    const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      fence = { char: open[1][0], len: open[1].length };
      ranges.push([s, e + 1]);
      prevBlank = false;
      continue;
    }
    if (prevBlank && /^( {4}|\t)/.test(line) && line.trim() !== "") {
      ranges.push([s, e + 1]);
      continue; // an indented code block continues while indented
    }
    prevBlank = line.trim() === "";
  }
  // inline code spans: matching backtick runs, outside block ranges
  const re = /(`+)/g;
  let m;
  const inBlock = (p) => ranges.some(([a, b]) => p >= a && p < b);
  const spans = [];
  while ((m = re.exec(md))) {
    if (inBlock(m.index)) continue;
    const run = m[1];
    const closeRe = new RegExp(`(?<!\`)${run}(?!\`)`, "g");
    closeRe.lastIndex = m.index + run.length;
    const c = closeRe.exec(md);
    if (!c) continue;
    // a code span may not cross a blank line
    const between = md.slice(m.index, c.index);
    if (/\n[ \t]*\n/.test(between)) continue;
    spans.push([m.index, c.index + run.length]);
    re.lastIndex = c.index + run.length;
  }
  return ranges.concat(spans);
}

export const inRanges = (ranges, p) => ranges.some(([a, b]) => p >= a && p < b);

export function tkScopes(md, code = codeRanges(md)) {
  const scopes = [];
  let i = 0;
  while (true) {
    const a = md.indexOf("[TK]", i);
    if (a < 0) break;
    if (inRanges(code, a)) { i = a + 4; continue; }
    const z = md.indexOf("[/TK]", a + 4);
    if (z < 0) break;
    const text = md.slice(a, z + 5);
    const sources = [...new Set([...text.matchAll(SOURCE)].map((m) => m[1]))];
    scopes.push({ start: a, end: z + 5, sources });
    i = z + 5;
  }
  return scopes;
}

/** Normalize a quote run's markdown to selection text, approximately as §10.2 describes. */
export function selectionOf(quoteLines) {
  const paras = [];
  let cur = [];
  for (const l of quoteLines) {
    if (l.trim() === "") { if (cur.length) paras.push(cur.join(" ")); cur = []; }
    else cur.push(l.trim());
  }
  if (cur.length) paras.push(cur.join(" "));
  return paras
    .map((p) => p.replace(/(\*\*|__|\*|_|`)/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Parse content_md per §10.1. Returns
 *   { transclusions:[{id, partial, exact?, line}], links:[id], reserved:[line], tk:[{sources:[id]}], inert:[id] }
 */
export function parse(md) {
  const code = codeRanges(md);
  const scopes = tkScopes(md, code);
  const inScope = (p) => scopes.some((s) => p >= s.start && p < s.end);
  const lines = md.split("\n");
  const starts = [];
  let off = 0;
  for (const l of lines) { starts.push(off); off += l.length + 1; }
  const out = { transclusions: [], links: [], reserved: [], tk: scopes.map((s) => ({ sources: s.sources })), inert: [] };
  const directiveLines = new Set();
  for (let i = 0; i < lines.length; i++) {
    const p = starts[i];
    const line = lines[i];
    const lineEnd = p + line.length;
    // a line is inert if any of it lies in code, or it lies in a TK scope
    const firstNonWs = p + (line.length - line.trimStart().length);
    if (inRanges(code, firstNonWs) || inScope(firstNonWs)) {
      if (DIRECTIVE.test(line) && inRanges(code, firstNonWs)) out.inert.push(line.match(DIRECTIVE)[1]);
      continue;
    }
    if (RESERVED.test(line)) { out.reserved.push(i); directiveLines.add(i); continue; }
    const m = DIRECTIVE.exec(line);
    if (!m) continue;
    directiveLines.add(i);
    const run = [];
    let j = i + 1;
    while (j < lines.length && QUOTE.test(lines[j])) {
      run.push(lines[j].replace(/^\s*>\s?/, "").replace(/\r$/, ""));
      directiveLines.add(j);
      j++;
    }
    const t = { id: m[1], partial: run.length > 0, line: i };
    if (run.length) t.exact = selectionOf(run);
    out.transclusions.push(t);
    i = j - 1;
    void lineEnd;
  }
  for (const m of md.matchAll(LINK)) {
    const p = m.index;
    if (inRanges(code, p)) { out.inert.push(m[1]); continue; }
    if (inScope(p)) continue;
    // line index of p
    let li = 0;
    while (li + 1 < starts.length && starts[li + 1] <= p) li++;
    if (directiveLines.has(li)) continue;
    out.links.push(m[1]);
  }
  return out;
}

/** True when content_md contains TK grammar outside code (must never reach the wire, §5.7). */
export function hasTkGrammar(md) {
  const code = codeRanges(md);
  for (const tok of ["[TK]", "[/TK]", "[=]"]) {
    let i = md.indexOf(tok);
    while (i >= 0) {
      if (!inRanges(code, i) && tok !== "[=]") return true;
      i = md.indexOf(tok, i + 1);
    }
  }
  return false;
}
