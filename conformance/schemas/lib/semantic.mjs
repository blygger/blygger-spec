// Semantic rules: the cross-field constraints JSON Schema cannot express.
// Each rule is tagged with its spec section(s), decisions, and a level:
// "fail" (a MUST), "warn" (a SHOULD, or a reading the spec leaves open),
// "info" (an observation the spec is silent on — a For-Fable item).
import { createHash } from "node:crypto";
import { parse, hasTkGrammar, codeRanges, inRanges } from "./grammar.mjs";

const sha = (s) => "sha256:" + createHash("sha256").update(s, "utf8").digest("hex");

/** URL-bearing attributes in an HTML string. */
export function htmlUrls(html) {
  const out = [];
  const re = /\s(href|src|cite|poster|action|data|srcset)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html))) {
    const attr = m[1].toLowerCase();
    const v = m[3] ?? m[4] ?? m[5] ?? "";
    if (attr === "srcset") for (const part of v.split(",")) { const u = part.trim().split(/\s+/)[0]; if (u) out.push({ attr, url: u }); }
    else out.push({ attr, url: v });
  }
  return out;
}
const isAbsolute = (u) => /^[a-z][a-z0-9+.-]*:/i.test(u);

/** Top-level (non-nested) baked transclusion wrappers, in order. */
export function bakedWrappers(html) {
  const out = [];
  const re = /<(\/?)blockquote\b([^>]*)>/gi;
  let depth = 0, m;
  const stack = [];
  while ((m = re.exec(html))) {
    if (m[1]) { const top = stack.pop(); if (top && top.depth === 0 && top.baked) { top.inner = html.slice(top.innerStart, m.index); out.push(top); } depth = Math.max(0, depth - 1); continue; }
    const attrs = m[2];
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || "";
    const baked = /\bblyg-transclusion\b/.test(cls);
    const entry = {
      depth: stack.filter((s) => s.baked).length,
      baked,
      partial: /\bblyg-partial\b/.test(cls),
      id: (attrs.match(/data-blyg-id="([^"]*)"/) || [])[1],
      version: Number((attrs.match(/data-blyg-version="([^"]*)"/) || [])[1]),
      origin: (attrs.match(/data-blyg-origin="([^"]*)"/) || [])[1],
      innerStart: re.lastIndex,
    };
    stack.push(entry);
    depth++;
  }
  return out;
}

const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

export const RULES = [];
const rule = (id, title, spec_refs, decisions, level, fn, scope = "item") => RULES.push({ id, title, spec_refs, decisions, level, fn, scope });

// ---------------- item-level rules ----------------
rule("hash.matches-content_md", "content_hash = sha256 of content_md", ["§5.1"], ["#2"], "fail", (d) =>
  d.content_hash && typeof d.content_md === "string" && sha(d.content_md) !== d.content_hash ? [`content_hash ${d.content_hash.slice(0, 18)}… ≠ sha256(content_md) ${sha(d.content_md).slice(0, 18)}…`] : []);

rule("updated.equals-last-changelog", "updated equals the latest changelog entry's at", ["§5.2"], [], "fail", (d) => {
  if (!Array.isArray(d.changelog) || !d.changelog.length) return [];
  const last = d.changelog.reduce((a, b) => (b.version > a.version ? b : a));
  return last.at !== d.updated ? [`updated ${d.updated} ≠ changelog v${last.version}.at ${last.at}`] : [];
});

rule("changelog.contiguous", "changelog covers versions 1..version, +1 each", ["§5.2"], ["#19"], "fail", (d) => {
  if (!Array.isArray(d.changelog)) return [];
  const vs = d.changelog.map((c) => c.version);
  const sorted = [...vs].sort((a, b) => a - b);
  const errs = [];
  if (sorted.some((v, i) => v !== i + 1)) errs.push(`changelog versions [${vs.join(",")}] are not 1..${vs.length} contiguous`);
  if (sorted.length && sorted[sorted.length - 1] !== d.version) errs.push(`last changelog version ${sorted[sorted.length - 1]} ≠ version ${d.version}`);
  return errs;
});

rule("changelog.at-monotonic", "changelog timestamps non-decreasing with version", ["§5.2", "§13.7"], [], "warn", (d) => {
  if (!Array.isArray(d.changelog)) return [];
  const s = [...d.changelog].sort((a, b) => a.version - b.version);
  return s.some((c, i) => i && c.at < s[i - 1].at) ? ["changelog `at` goes backwards"] : [];
});

rule("html.absolute-urls", "every URL in content_html is absolute", ["§5.2", "§7"], ["#53"], "fail", (d) =>
  htmlUrls(d.content_html || "").filter((u) => !isAbsolute(u.url) && !u.url.startsWith("#")).map((u) => `relative ${u.attr}="${u.url}"`));

rule("md.no-tk-grammar", "no TK authoring grammar reaches the wire", ["§5.7"], ["#20"], "fail", (d) =>
  d.content_md && hasTkGrammar(d.content_md) ? ["content_md contains [TK]/[/TK] outside code"] : []);

rule("md.no-reserved-directive", "no reserved ![[id@vN]] in published content_md", ["§10.1"], ["#9"], "fail", (d) => {
  const p = parse(d.content_md || "");
  return p.reserved.length ? [`reserved directive on line(s) ${p.reserved.map((x) => x + 1).join(",")}`] : [];
});

rule("transclusions.match-directives", "transclusions[] matches the directives in content_md, in order", ["§10.3", "§10.1"], ["#26", "#49"], "fail", (d) => {
  if (d.kind !== "thread") return [];
  const p = parse(d.content_md || "");
  const t = d.transclusions || [];
  const errs = [];
  if (p.transclusions.length !== t.length) errs.push(`content_md has ${p.transclusions.length} directive(s), transclusions[] has ${t.length}`);
  p.transclusions.forEach((x, i) => {
    const e = t[i];
    if (!e) return;
    if (e.id !== x.id) errs.push(`#${i}: directive ${x.id} ≠ entry ${e.id}`);
    if (x.partial !== !!e.selector) errs.push(`#${i} ${x.id}: ${x.partial ? "partial directive but no selector" : "selector on a whole directive"}`);
  });
  return errs;
});

rule("transclusions.baked-wrappers", "each entry has a matching baked blockquote (classes, data attributes)", ["§10.2", "§10.3"], ["#26", "#49"], "fail", (d) => {
  if (d.kind !== "thread") return [];
  const w = bakedWrappers(d.content_html || "");
  const t = d.transclusions || [];
  const errs = [];
  if (w.length !== t.length) errs.push(`${t.length} entries vs ${w.length} top-level baked blockquotes`);
  t.forEach((e, i) => {
    const b = w[i];
    if (!b) return;
    if (b.id !== e.id) errs.push(`#${i}: data-blyg-id ${b.id} ≠ ${e.id}`);
    if (b.version !== e.version) errs.push(`#${i}: data-blyg-version ${b.version} ≠ ${e.version}`);
    if ((b.origin || undefined) !== (e.origin || undefined)) errs.push(`#${i}: data-blyg-origin ${b.origin ?? "∅"} ≠ origin ${e.origin ?? "∅"}`);
    if (b.partial !== !!e.selector) errs.push(`#${i}: blyg-partial class ${b.partial} but selector ${!!e.selector}`);
  });
  return errs;
});

rule("selector.matches-bake", "a partial's baked <p> lines equal selector.exact", ["§10.2"], ["#49"], "warn", (d) => {
  if (d.kind !== "thread") return [];
  const w = bakedWrappers(d.content_html || "");
  const errs = [];
  (d.transclusions || []).forEach((e, i) => {
    if (!e.selector || !w[i]) return;
    const paras = [...w[i].inner.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => decode(m[1]));
    if (paras.join("\n") !== e.selector.exact) errs.push(`#${i}: baked text ≠ selector.exact`);
  });
  return errs;
});

rule("transclusions.own-origin-omitted", "own-origin entries omit origin", ["§10.3"], ["#26"], "warn", (d) =>
  (d.transclusions || []).filter((e) => e.origin && e.origin === d.origin).map((e) => `entry ${e.id} names its own origin (omission is the 0.3 form)`));

rule("stub_of.version-agreement", "stub_of.version equals the baked version when the body quotes the target", ["§10.6"], ["#27"], "fail", (d) => {
  const s = d.stub_of;
  if (!s || !s.id) return [];
  const hit = (d.transclusions || []).find((e) => e.id === s.id && (e.origin || d.origin) === s.origin);
  return hit && hit.version !== s.version ? [`stub_of v${s.version} but body bakes v${hit.version}`] : [];
});

rule("forked_from.cited-url-is-page", "forked_from.cited.url names a human page, not the v{n}.json document", ["§5.9", "§8.4"], ["#24", "#30"], "warn", (d) => {
  const u = d.forked_from && d.forked_from.cited && d.forked_from.cited.url;
  return u && /\.json($|\?)/.test(u) ? [`cited.url = ${u} — §5.9 says "the target's page as it stood"; for a pin that is {page}v{n}/ (#24)`] : [];
});

rule("fork.carries-directives", "a fork's content_md carries the source's directives, which re-resolve at the forker", ["§5.6"], ["#26"], "info", (d) => {
  if (!d.forked_from) return [];
  const p = parse(d.content_md || "");
  const n = p.transclusions.length + p.links.length;
  return n ? [`fork content_md holds ${p.transclusions.length} directive(s) and ${p.links.length} link(s); §5.6 rule 6 is silent on re-resolution at the forker's origin`] : [];
});

rule("page.origin-relative", "page is origin-relative (no scheme, no leading /)", ["§5.8"], ["#29", "#14", "#51"], "fail", (d) => {
  if (d.page === undefined) return [];
  if (d.page.startsWith("/")) return [`page "${d.page}" is host-rooted; it would break a path-mounted origin (#14)`];
  return [];
});
rule("page.not-absolute-at-0.3", "absolute page is a 0.4 construct", ["§5.8", "§16.6e"], ["#51"], "warn", (d) =>
  d.page && isAbsolute(d.page) ? [`page is absolute (${d.page}); 0.3 says origin-relative, #51 permits absolute at 0.4`] : []);

rule("generated.wrappers", "generated spans are wrapped in blyg-tk-gen", ["§5.7"], ["#20", "#25"], "fail", (d) => {
  if (!d.generated) return [];
  // count wrappers outside baked transclusions
  const stripped = (d.content_html || "").replace(/<blockquote class="blyg-transclusion[\s\S]*?<\/blockquote>/g, "");
  const n = (stripped.match(/class="[^"]*\bblyg-tk-gen\b/g) || []).length;
  return n < d.generated.length ? [`${d.generated.length} generated entries, ${n} blyg-tk-gen wrappers`] : [];
});

rule("generated.disjoint-from-transclusions", "generation sources never appear in transclusions[]", ["§5.7"], ["#20"], "warn", (d) => {
  if (!d.generated || !d.transclusions) return [];
  const t = new Set(d.transclusions.filter((e) => !e.origin).map((e) => e.id));
  return d.generated.flatMap((g) => g.sources.filter((s) => t.has(s.id)).map((s) => `source ${s.id} is also transcluded`));
});

rule("links.rendered-absolute", "[[id]] links render as anchors with absolute hrefs", ["§10.1"], ["#32", "#53", "#54"], "warn", (d) => {
  const p = parse(d.content_md || "");
  const hrefs = htmlUrls(d.content_html || "").filter((u) => u.attr === "href").map((u) => u.url);
  return [...new Set(p.links)].filter((id) => !hrefs.some((h) => h.includes(id) && isAbsolute(h))).map((id) => `[[${id}]] has no absolute anchor in content_html`);
});

rule("code.inert", "directive/link syntax inside code is left literal", ["§10.1"], ["#54"], "fail", (d) => {
  const p = parse(d.content_md || "");
  const errs = [];
  for (const id of new Set(p.inert)) {
    const t = (d.transclusions || []).some((e) => e.id === id) && !p.transclusions.some((x) => x.id === id);
    if (t) errs.push(`${id} appears only inside code but has a transclusions[] entry`);
  }
  return errs;
});

rule("media.referenced", "every media[] entry is referenced by content_html", ["§5.4", "§4"], [], "warn", (d) => {
  const html = d.content_html || "";
  return (d.media || []).filter((m) => !html.includes(m.url.replace(/^\.?\//, ""))).map((m) => `media ${m.url} not referenced by content_html`);
});

rule("withdrawn.keeps-page", "an endcap keeps page", ["§9", "§5.8"], ["#29"], "warn", (d) => (d.kind === "withdrawn" && !d.page ? ["endcap has no page"] : []));

// ---------------- context rules (need the fetch context) ----------------
rule("id.matches-url", "document id equals the id in its URL", ["§4", "§5.1"], [], "fail", (d, ctx) => (ctx.urlId && d.id !== ctx.urlId ? [`id ${d.id} served at items/${ctx.urlId}.json`] : []));
rule("origin.matches-fetch", "document origin equals the origin it was fetched from", ["§12.2", "§15.4"], ["#17", "#28"], "fail", (d, ctx) =>
  ctx.origin && d.origin !== ctx.origin ? [`origin ${d.origin} ≠ fetched-from ${ctx.origin}`] : []);
rule("pins.served", "every changelog pinned:true version is served as v{n}.json and nothing else is", ["§8", "§8.4"], ["#8"], "fail", (d, ctx) => {
  if (!ctx.pins) return [];
  const flagged = (d.changelog || []).filter((c) => c.pinned).map((c) => c.version);
  const errs = [];
  for (const n of flagged) if (!ctx.pins[n]) errs.push(`v${n} flagged pinned but items/${d.id}/v${n}.json not served`);
  for (const n of Object.keys(ctx.pins)) if (!flagged.includes(Number(n))) errs.push(`v${n}.json served but not flagged pinned`);
  return errs;
});

// pinned-document rules
rule("pinned.hash", "pinned content_hash = sha256(content_md)", ["§8", "§5.1"], [], "fail", (d) => (d.content_hash && sha(d.content_md || "") !== d.content_hash ? ["content_hash mismatch"] : []), "pinned");
rule("pinned.at-matches-changelog", "pinned at/note match the item's changelog entry", ["§8"], [], "warn", (d, ctx) => {
  const c = ctx.item && (ctx.item.changelog || []).find((x) => x.version === d.version);
  if (!c) return ctx.item ? [`item changelog has no v${d.version}`] : [];
  const e = [];
  if (c.at !== d.at) e.push(`at ${d.at} ≠ changelog ${c.at}`);
  if ((c.note ?? null) !== (d.note ?? null)) e.push(`note differs from changelog`);
  return e;
}, "pinned");
rule("pinned.forked_from-immutable", "a pin of a forked item carries the same forked_from", ["§5.6", "§8"], [], "fail", (d, ctx) => {
  if (!ctx.item || !ctx.item.forked_from) return [];
  const a = ctx.item.forked_from, b = d.forked_from;
  return !b || a.origin !== b.origin || a.id !== b.id || a.version !== b.version ? ["pinned version's forked_from differs from (or omits) the item's lineage"] : [];
}, "pinned");
for (const r of RULES.filter((r) => ["html.absolute-urls", "md.no-tk-grammar", "transclusions.match-directives", "transclusions.baked-wrappers", "stub_of.version-agreement", "forked_from.cited-url-is-page"].includes(r.id))) {
  RULES.push({ ...r, id: "pinned." + r.id, scope: "pinned" });
}

export function runRules(scope, doc, ctx = {}) {
  return RULES.filter((r) => r.scope === scope).map((r) => {
    let msgs;
    try { msgs = r.fn(doc, ctx) || []; } catch (e) { msgs = [`rule crashed: ${e.message}`]; }
    return { rule: r.id, title: r.title, level: r.level, spec_refs: r.spec_refs, decisions: r.decisions, messages: msgs };
  });
}

// ---------------- index rules ----------------
export function indexRules(index, items) {
  const out = [];
  const list = index.items || [];
  const ordered = list.every((e, i) => !i || list[i - 1].updated >= e.updated);
  out.push({ rule: "index.order", title: "index ordered by updated descending", level: "warn", spec_refs: ["§6.2"], decisions: [], messages: ordered ? [] : ["not ordered by updated desc"] });
  const mism = [];
  for (const e of list) {
    const d = items[e.id];
    if (!d) continue;
    if (d.version !== e.version) mism.push(`${e.id}: index v${e.version} ≠ doc v${d.version}`);
    if (d.kind !== e.kind) mism.push(`${e.id}: index kind ${e.kind} ≠ doc ${d.kind}`);
    if (d.updated !== e.updated) mism.push(`${e.id}: index updated ≠ doc updated`);
  }
  out.push({ rule: "index.agrees-with-docs", title: "index entries agree with item documents", level: "fail", spec_refs: ["§6.2", "§13.2"], decisions: ["#18"], messages: mism });
  return out;
}

export { codeRanges, inRanges };
