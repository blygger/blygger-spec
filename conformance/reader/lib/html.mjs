// A small HTML parser and the reader suite's normative projection.
//
// No dependencies, on purpose: the runner must work with a bare Node. The
// parser is forgiving rather than complete (HTML5's tree-construction rules
// are not reproduced); it is good enough for the fragment-shaped HTML a
// markdown renderer emits, which is all `content_html` is.
//
// The projection is what the suite compares. It keeps only what the spec
// makes normative in `content_html` and throws the rest away:
//
//   - wire-visible wrappers (§10.2, §5.7, css-contract §1): an element whose
//     class list holds `blyg-transclusion` or `blyg-tk-gen`, with its tag, its
//     wire classes, every `data-blyg-*` attribute, its normalized text
//     content, and, for a partial transclusion, its lines: the text of each
//     block and the lists that block sits in (§10.2: "one block per line";
//     a line MAY be an `<li>` in a list like the target's, #114);
//   - anchors (§10.1, §5.2): every `<a href>`, with its href and its text.
//     Whether the text is normative is the fixture's call (a label is; a
//     publisher's choice of anchor text is not);
//   - nesting: wrappers and anchors keep their tree position relative to each
//     other, so a quote inside a quote, or a link inside a generated span, is
//     compared as such.
//
// Everything else (paragraph structure, emphasis, entity spelling, attribute
// order, whitespace, extra non-wire classes) is presentation.

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title"]);
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", hellip: "…", mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "�";
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Parse an HTML fragment into { tag: "#root", children } with element nodes { tag, attrs, children } and text nodes { text }. */
export function parse(html) {
  const root = { tag: "#root", attrs: {}, children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const re = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>|<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/gi;
  let last = 0, m;
  const text = (t) => { if (t) top().children.push({ text: decodeEntities(t) }); };
  while ((m = re.exec(html))) {
    text(html.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) {
      const name = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === name) { stack.length = i; break; }
    } else if (m[2]) {
      const name = m[2].toLowerCase();
      const attrs = {};
      for (const a of (m[3] || "").matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
        attrs[a[1].toLowerCase()] = decodeEntities(a[2] ?? a[3] ?? a[4] ?? "");
      }
      // An implied </p>: a block start closes an open paragraph, as HTML does.
      if (/^(p|div|blockquote|ul|ol|pre|h[1-6]|table|hr|figure)$/.test(name)) {
        for (let i = stack.length - 1; i > 0; i--) { if (stack[i].tag === "p") { stack.length = i; break; } if (stack[i].tag !== "a" && stack[i].tag !== "span" && stack[i].tag !== "em" && stack[i].tag !== "strong") break; }
      }
      const el = { tag: name, attrs, children: [] };
      top().children.push(el);
      if (RAW.has(name)) {
        const close = new RegExp(`</${name}\\s*>`, "ig");
        close.lastIndex = last;
        const c = close.exec(html);
        el.children.push({ text: html.slice(last, c ? c.index : html.length) });
        last = re.lastIndex = c ? close.lastIndex : html.length;
      } else if (!VOID.has(name) && !m[4]) stack.push(el);
    }
  }
  text(html.slice(last));
  return root;
}

// Spec §2 "Text content" (decision #118): a boundary at the start and end tag of each, and at every br and hr.
const BLOCK = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "dl", "dt", "dd", "blockquote", "pre", "div", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "figure", "figcaption", "section", "article", "aside", "header", "footer", "details", "summary", "hr", "br"]);

/** Text content with tags stripped, whitespace collapsed; block boundaries become a single space (`blocks: false`) or "\n" (`blocks: true`, the §2 "text content" rule). */
export function textContent(node, { blocks = false } = {}) {
  const parts = [];
  const walk = (n) => {
    if (n.text !== undefined) { parts.push(n.text); return; }
    if (RAW.has(n.tag) && n.tag !== "title") return;
    const b = BLOCK.has(n.tag);
    if (b) parts.push("\u0000");
    for (const c of n.children) walk(c);
    if (b) parts.push("\u0000");
  };
  walk(node);
  const joined = parts.join("");
  const lines = joined.split("\u0000").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  return lines.join(blocks ? "\n" : " ");
}

/**
 * The lines of a partial bake (§10.2): one entry per block, in order, with the
 * lists the block sits in, outermost first. `ordinal` is the item's number in
 * its list, an `ol`'s `start` counted in. A `<p>` outside any list has
 * `lists: []`. The texts joined by "\n" are the bake's text content (§2).
 */
export function bakeLines(node) {
  const lines = [];
  const stack = []; // open lists: { tag, next, ordinal }
  let buf = "", at = null;
  const flush = () => {
    const text = buf.replace(/\s+/g, " ").trim();
    if (text) lines.push({ text, lists: at });
    buf = ""; at = null;
  };
  const walk = (n) => {
    if (n.text !== undefined) {
      if (at === null && n.text.trim()) at = stack.filter((l) => l.ordinal !== undefined).map((l) => ({ tag: l.tag, ordinal: l.ordinal }));
      buf += n.text;
      return;
    }
    if (RAW.has(n.tag) && n.tag !== "title") return;
    const b = BLOCK.has(n.tag);
    if (b) flush();
    if (n.tag === "ul" || n.tag === "ol") {
      const start = n.tag === "ol" && /^-?\d+$/.test(n.attrs.start ?? "") ? Number(n.attrs.start) : 1;
      stack.push({ tag: n.tag, next: start, ordinal: undefined });
      for (const c of n.children) walk(c);
      flush();
      stack.pop();
    } else if (n.tag === "li" && stack.length) {
      const list = stack[stack.length - 1];
      const outer = list.ordinal;
      list.ordinal = list.next++;
      for (const c of n.children) walk(c);
      flush();
      list.ordinal = outer;
    } else {
      for (const c of n.children) walk(c);
    }
    if (b) flush();
  };
  for (const c of node.children) walk(c);
  flush();
  return lines;
}

export const WIRE_CLASSES = ["blyg-transclusion", "blyg-partial", "blyg-tk-gen"];
const classes = (el) => (el.attrs.class || "").split(/\s+/).filter(Boolean);
const isWrapper = (el) => classes(el).some((c) => c === "blyg-transclusion" || c === "blyg-tk-gen");

/**
 * The normative projection of an HTML fragment: a list of nodes in document
 * order, wrappers nesting their own. Fixture-authoring markers (attributes
 * named `data-x-*`, used only by fixtures/_source.mjs) refine what an anchor
 * promises and are never present in real output:
 *   data-x-presentation-text  the anchor's text is the publisher's choice
 *   data-x-absolute-only      the href must be absolute; its exact value is not fixed
 */
export function project(html) {
  const out = [];
  const walk = (n, into, inWrapper) => {
    if (n.text !== undefined) return;
    if (n.tag !== "#root" && isWrapper(n)) {
      const cls = classes(n);
      const data = {};
      for (const [k, v] of Object.entries(n.attrs)) if (k.startsWith("data-blyg-")) data[k] = v;
      const node = { wrapper: n.tag, classes: WIRE_CLASSES.filter((c) => cls.includes(c)), data, text: textContent(n) };
      if (cls.includes("blyg-partial")) node.lines = bakeLines(n);
      else {
        // A whole bake is the target's HTML verbatim; an `ol`'s integer `start`
        // is the one attribute of it a reader's sanitizer SHOULD keep (§10.2).
        const starts = [];
        const find = (c) => { if (c.text !== undefined) return; if (c.tag === "ol" && /^-?\d+$/.test(c.attrs.start ?? "")) starts.push(Number(c.attrs.start)); c.children.forEach(find); };
        n.children.forEach(find);
        if (starts.length) node.starts = starts;
      }
      node.children = [];
      for (const c of n.children) walk(c, node.children, true);
      if (!node.children.length) delete node.children;
      into.push(node);
      return;
    }
    if (n.tag === "a" && n.attrs.href !== undefined) {
      const a = { a: "data-x-absolute-only" in n.attrs ? "(absolute)" : n.attrs.href };
      if (!("data-x-presentation-text" in n.attrs) || inWrapper) a.text = textContent(n);
      into.push(a);
      // Anchors cannot nest; a wrapper inside an anchor is still projected.
      for (const c of n.children) walk(c, into, inWrapper);
      return;
    }
    for (const c of n.children) walk(c, into, inWrapper);
  };
  walk(parse(html), out, false);
  return out;
}

/** Every URL-bearing attribute value in the fragment: [{ tag, attr, value }]. */
export function urls(html) {
  const found = [];
  const walk = (n) => {
    if (n.text !== undefined) return;
    for (const attr of ["href", "src", "cite", "poster", "action", "formaction", "data", "background"]) {
      if (n.attrs[attr] !== undefined && !attr.startsWith("data-")) found.push({ tag: n.tag, attr, value: n.attrs[attr] });
    }
    if (n.attrs.srcset) for (const part of n.attrs.srcset.split(",")) { const v = part.trim().split(/\s+/)[0]; if (v) found.push({ tag: n.tag, attr: "srcset", value: v }); }
    n.children.forEach(walk);
  };
  walk(parse(html));
  return found;
}

/** §5.2: absolute means it carries a scheme. A bare `#fragment` is reported separately. */
export function classifyUrl(v) {
  const s = v.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return "absolute";
  if (s.startsWith("#")) return "fragment";
  return "relative";
}
