// Text and markup helpers shared by the crawler and the checks.
// Deliberately small, regex-level parsers: the documents involved are
// publisher-generated and the checks only need tags, attributes and lines.

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(cp); } catch { return m; }
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}

const BLOCK = "p|div|h[1-6]|li|ul|ol|blockquote|pre|tr|table|thead|tbody|section|article|header|footer|figure|figcaption|dd|dt|dl|hr|br|aside|details|summary";

// §10.2 / decision #49: content_html with tags stripped, whitespace collapsed
// within a block, block boundaries kept as line breaks.
export function textContent(html) {
  let s = String(html || "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  s = s.replace(new RegExp(`<\\/?(?:${BLOCK})\\b[^>]*>`, "gi"), "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  return normalizeLines(s);
}

// Collapse whitespace within each line, drop empty lines.
export function normalizeLines(s) {
  return String(s)
    .split(/\n/)
    .map((l) => l.replace(/[\s ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// Everything on one line — the lenient reading.
export function flatText(s) {
  return String(s).replace(/[\s ]+/g, " ").trim();
}

export function parseAttrs(tag) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  const inner = tag.replace(/^<\/?[a-zA-Z0-9]+/, "").replace(/\/?>$/, "");
  let m;
  while ((m = re.exec(inner))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return attrs;
}

// All blyg-transclusion blockquotes, with their nesting depth among
// blyg-transclusion blockquotes (0 = direct, baked by this document).
export function bakedTransclusions(html) {
  const out = [];
  const stack = [];
  const re = /<\/?blockquote\b[^>]*>/gi;
  let m;
  while ((m = re.exec(String(html || "")))) {
    const tag = m[0];
    if (tag[1] === "/") { stack.pop(); continue; }
    const a = parseAttrs(tag);
    const classes = (a.class || "").split(/\s+/);
    const isT = classes.includes("blyg-transclusion");
    if (isT) {
      const depth = stack.filter(Boolean).length;
      out.push({
        depth,
        id: a["data-blyg-id"] ?? null,
        version: a["data-blyg-version"] != null ? Number(a["data-blyg-version"]) : null,
        origin: a["data-blyg-origin"] ?? null,
        partial: classes.includes("blyg-partial"),
        classes: classes.filter(Boolean),
      });
    }
    stack.push(isT);
  }
  return out;
}

const ID = "[0-9abcdefghjkmnpqrstvwxyz]{26}";

// Transclusion directives in content_md (§10.1), skipping fenced code.
export function directives(md) {
  const lines = String(md || "").split(/\r?\n/);
  const out = [];
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const f = l.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    const m = l.match(new RegExp(`^\\s*!\\[\\[(${ID})(@v(\\d+))?\\]\\]\\s*$`));
    if (!m) continue;
    const d = { line: i + 1, id: m[1], reserved_version: m[3] ? Number(m[3]) : null,
      partial: false, selection: null };
    // Partial: immediately followed (no blank line) by a blockquote.
    const sel = [];
    let j = i + 1;
    while (j < lines.length && /^\s{0,3}>/.test(lines[j])) {
      sel.push(lines[j].replace(/^\s{0,3}>\s?/, ""));
      j++;
    }
    if (sel.length) {
      d.partial = true;
      d.selection = sel.join("\n");
    }
    out.push(d);
  }
  return out;
}

// Plain internal links [[id]] outside code (§10.1).
export function plainLinks(md) {
  const s = String(md || "")
    .replace(/(^|\n)\s{0,3}(`{3,}|~{3,})[\s\S]*?\n\s{0,3}\2[^\n]*/g, "$1")
    .replace(/`[^`\n]*`/g, "");
  return [...s.matchAll(new RegExp(`(?<!!)\\[\\[(${ID})\\]\\]`, "g"))].map((m) => m[1]);
}

// href / src / srcset / poster values in an HTML string.
export function urlAttrs(html) {
  const out = [];
  const re = /\s(href|src|srcset|poster|cite|action)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  let m;
  while ((m = re.exec(String(html || "")))) {
    const name = m[1].toLowerCase();
    const raw = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
    if (name === "srcset") {
      for (const part of raw.split(",")) {
        const u = part.trim().split(/\s+/)[0];
        if (u) out.push({ attr: name, value: u });
      }
    } else out.push({ attr: name, value: raw });
  }
  return out;
}

export function isAbsoluteUrl(u) {
  return /^[a-z][a-z0-9+.-]*:/i.test(u);
}

// <link> and <a> rel scanning for W3C-style discovery.
export function linkTags(html) {
  const out = [];
  const re = /<(link|a)\b[^>]*>/gi;
  let m;
  while ((m = re.exec(String(html || "")))) {
    const a = parseAttrs(m[0]);
    out.push({ tag: m[1].toLowerCase(), rel: (a.rel || "").toLowerCase().split(/\s+/).filter(Boolean),
      href: a.href ?? null, type: (a.type || "").toLowerCase() });
  }
  return out;
}

export function parseLinkHeader(h) {
  const out = [];
  if (!h) return out;
  for (const part of h.split(/,(?=\s*<)/)) {
    const m = part.match(/<([^>]*)>(.*)/);
    if (!m) continue;
    const rel = (m[2].match(/rel\s*=\s*"?([^";]+)"?/i) || [])[1] || "";
    out.push({ href: m[1], rel: rel.toLowerCase().split(/\s+/) });
  }
  return out;
}

export function resolveUrl(href, base) {
  try { return new URL(href, base).href; } catch { return null; }
}

// Minimal RSS/Atom item reader for the bits the checks need.
export function parseFeed(xml) {
  const s = String(xml || "");
  const isRss = /<rss\b/i.test(s);
  const isAtom = !isRss && /<feed\b[^>]*xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/i.test(s);
  if (!isRss && !isAtom) return null;
  const tag = (body, name) => {
    const m = body.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (!m) return null;
    return decodeEntities(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim());
  };
  const channelHead = s.split(/<item\b|<entry\b/i)[0];
  const items = [];
  const re = isRss ? /<item\b[\s\S]*?<\/item>/gi : /<entry\b[\s\S]*?<\/entry>/gi;
  let m;
  while ((m = re.exec(s))) {
    const b = m[0];
    const desc = tag(b, "description") || "";
    items.push({
      guid: tag(b, "guid") ?? tag(b, "id"),
      link: tag(b, "link"),
      title: tag(b, "title"),
      pubDate: tag(b, "pubDate"),
      blyg_id: tag(b, "blyg:id"),
      blyg_kind: tag(b, "blyg:kind"),
      blyg_version: tag(b, "blyg:version"),
      blyg_item: tag(b, "blyg:item"),
      description_len: desc.length,
    });
  }
  return {
    format: isRss ? "rss" : "atom",
    title: tag(channelHead, "title"),
    blyg_manifest: tag(channelHead, "blyg:manifest"),
    blyg_level: tag(channelHead, "blyg:level"),
    ns: (s.match(/xmlns:blyg="([^"]*)"/) || [])[1] || null,
    items,
  };
}

export function parseOpml(xml) {
  const s = String(xml || "");
  if (!/<opml\b/i.test(s)) return null;
  const out = [];
  const re = /<outline\b[^>]*>/gi;
  let m;
  while ((m = re.exec(s))) {
    const a = parseAttrs(m[0]);
    if (a.xmlurl || a.htmlurl) {
      out.push({ text: a.text || a.title || null, type: a.type || null,
        xmlUrl: a.xmlurl || null, htmlUrl: a.htmlurl || null });
    }
  }
  return out;
}
