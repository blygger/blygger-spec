// Self-contained report.html: headline findings, grammar differential matrix,
// schema explorer with implementation coverage, per-document validation,
// desktop round-trip loss, self-test, and For-Fable items.
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const badge = (st, txt) => `<span class="b ${esc(st)}">${esc(txt ?? st)}</span>`;
const SPEC = "https://github.com/blygger/blygger-spec/blob/main/docs/protocol-v0.3.md";
const secLink = (s) => `<a class="sec" href="${SPEC}" title="docs/protocol-v0.3.md ${esc(s)}">${esc(s)}</a>`;

const FABLE = [
  ["No required-member list for item documents or the manifest", "§5 gives an example and §5.1–§5.9 give rules, but nowhere lists which members an item document MUST carry (is `origin` required? `media`? `blyg`?). §6.1 is the same for the manifest. The schema had to infer: item requires id/kind/origin/created/updated/version/content_md/content_html/content_hash/changelog (each needed by some MUST); manifest requires blyg/feed/items. `blyg` on items and `media` are advisory because §3.1 says “carry” without a keyword and §9 implies `media` is always present.", ["§5", "§6.1", "§3.1"]],
  ["Forks copy directives that re-resolve at the forker's origin", "§5.6 rule 6 says the forked content becomes the new item's own `content_md`, “no wrapper and no transclusions entry”. But a forked thread's `content_md` still holds its `![[id]]` directives and `[[id]]` links, and on the fork's first publish they re-resolve by §10.2 at the *forker's* origin — to whatever version the forker holds, or to a publish error if the forker never imported the source. So a fork of a thread is not a copy of its pinned bytes; it is a re-bake. blygger-studio does exactly this (the fork of the remote pinned thread re-baked RA at the forker's import); two live forks on venkateshrao.com carry directives. Rule 6 should say which is intended — and whether a partial directive's selection must still verify against the forker's snapshot (the Blynger fork that lost its selector line is this case).", ["§5.6", "§10.2"]],
  ["What `forked_from.cited.url` should name", "§5.9: `url` is “the target's page as it stood”. For `forked_from` the target is a pinned version, whose page (if served) is `{page}v{n}/` (§8.4, #24). blygger-studio is inconsistent: a fork of its own pin cites the HTML page `t/{id}/v1/`; a fork of a remote pin cites the JSON document `items/{id}/v1.json` (it only fetched the JSON). The spec could say: the pinned page when the publisher knows it, else the item's `page`, never the JSON twin — or explicitly allow the JSON URL.", ["§5.9", "§8.4"]],
  ["`media[]` vs media actually in the text", "§4 says `media/…` are “media objects referenced by items” and §5.4 describes entries, but nothing says `media[]` must list only (or all) media the current `content_html` references. blygger-studio 0.17.0 keeps a deleted image in `media[]` after it is removed from the text (8 live items on venkateshrao.com show it). Desktop renders `media[]` as the version's images, so a deleted image reappears in its reading view.", ["§4", "§5.4"]],
  ["Line endings and lazy continuation in the bracket grammar", "§10.1 defines directives by *lines* but not what a line ending is (a trailing `\\r` is covered only by “surrounding whitespace”), and the partial form says “the blockquote's text is the selection” — in CommonMark a following non-`>` line is a lazy continuation inside that blockquote, while both implementations end the selection at the first line without `>`. Fixtures 08 and 22 encode the implementations' reading.", ["§10.1"]],
  ["`page` absolute vs origin-relative", "§5.8 defines `page` as origin-relative; #51 (0.4) permits absolute. A 0.3 checker can only warn on absolute values. Host-rooted values (`/f/…`) are failed here because they break a path-mounted origin (#14) — the spec does not say so explicitly.", ["§5.8", "§16.6e"]],
  ["Two ruled-but-not-normative members are already on the wire", "blygger-studio 0.17.0 emits `cited` on `{url}` stubs (§16.1a, #55 — gate G10) and `changelog[].generated` (§16.6c, #40 — gate G6). Both validate against the ruled shapes; they are evidence for promotion. blygger-desktop models neither.", ["§16.1a", "§16.6c"]],
  ["The reference client emits no `<dc:creator>`", "§7: when `author.name` is present the publisher SHOULD emit `<dc:creator>`. Neither the in-process studio nor the live node does (no `xmlns:dc` at all). A SHOULD, so a warning — but it is the reference client.", ["§7"]],
];

export function renderReport({ summary, sites, tree, emits, desktopStatic, roundtrip, gStudio, gDesktop, cases, selftest, rules }) {
  const checks = summary.checks;
  const tally = checks.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {});
  const nonPass = checks.filter((c) => c.status === "fail" || c.status === "warn");

  // ---- grammar matrix
  const gi = (g) => Object.fromEntries((g?.results || []).map((r) => [r.case, r]));
  const gs = gi(gStudio), gd = gi(gDesktop);
  const exp = (e) => e.error ? "publish error" : [
    ...e.transclusions.map((t) => (t.partial ? `partial ${t.id.slice(0, 4)}… “${t.exact.slice(0, 28)}${t.exact.length > 28 ? "…" : ""}”` : `whole ${t.id.slice(0, 4)}…`)),
    ...e.links.map((l) => `link ${l.slice(0, 4)}…`), ...e.tk_sources.map((s) => `TK sources [${s.map((x) => x.slice(0, 4) + "…").join(", ")}]`),
    ...(e.literal.length ? [`inert: ${e.literal.join(", ")}`] : []),
  ].join("; ") || "nothing";
  const cell = (r) => !r ? `<td class="na">–</td>` : r.ok ? `<td class="ok" title="as expected">ok</td>` : `<td class="diff"><details><summary>diff</summary>${r.diffs.map((d) => `<div>${esc(d)}</div>`).join("")}</details></td>`;
  const grammarRows = cases.map((c) => `<tr><td><code>${esc(c.file.replace(".json", ""))}</code>${c.ambiguous ? ` ${badge("warn", "ambiguous")}` : ""}<div class="sub">${esc(c.title)}</div><div class="sub">${c.spec_refs.map(secLink).join(" ")} ${c.decisions.join(" ")}</div></td><td><pre>${esc(c.content_md.replace(/\r/g, "␍"))}</pre></td><td class="sub">${esc(exp(c.expect))}</td>${cell(gs[c.id])}${cell(gd[c.id])}</tr>`).join("");

  // ---- schema explorer
  const dstat = (type, path) => {
    const t = desktopStatic[type] || {};
    const v = t[path] ?? t[path.replace(/\[\]$/, "")];
    if (!v) { const parent = path.split(".")[0]; const pv = t[parent]; return pv ? { reads: pv[0] ? "?" : false, keeps: pv[1] ? "?" : false, note: "not modelled field-by-field" } : { reads: false, keeps: false, note: "" }; }
    return { reads: v[0], keeps: v[1], note: v[2] };
  };
  const mark = (v) => v === true ? `<span class="y">✓</span>` : v === "?" ? `<span class="q">?</span>` : `<span class="n">✗</span>`;
  const explorer = Object.entries(tree).map(([type, rows]) => {
    const em = emits[type] || new Set();
    const trs = rows.map((r) => {
      const d = dstat(type, r.path);
      const e = em.has(r.path) || em.has(r.path + "[]");
      return `<tr class="d${r.depth}"><td style="padding-left:${8 + r.depth * 18}px"><code>${esc(r.path.split(".").pop())}</code></td><td class="sub">${esc(r.type)}</td><td>${badge(r.status === "required" ? "req" : r.status === "advisory" ? "warn" : "opt", r.status)}</td><td class="sub">${r.spec.map(secLink).join(" ")} ${esc(r.decisions.join(" "))}</td><td class="hm ${e ? "on" : "off"}">${e ? "✓" : "✗"}</td><td class="hm ${d.reads === true ? "on" : d.reads === "?" ? "mid" : "off"}">${mark(d.reads)}</td><td class="hm ${d.keeps === true ? "on" : d.keeps === "?" ? "mid" : "off"}">${mark(d.keeps)}</td><td class="sub desc">${esc(r.desc)}${d.note ? `<div class="dnote">desktop: ${esc(d.note)}</div>` : ""}</td></tr>`;
    }).join("");
    const label = { item: "Item document — items/{id}.json (§5, §9)", pinned: "Pinned version — items/{id}/v{n}.json (§8)", manifest: "Manifest — blyg.json (§6.1)", index: "Archive index — items/index.json (§6.2)" }[type];
    return `<details class="card" ${type === "item" ? "open" : ""}><summary><b>${esc(label)}</b> <span class="sub">${rows.length} fields</span></summary><div class="scroll"><table class="tree"><thead><tr><th>field</th><th>type</th><th>status</th><th>spec</th><th title="observed in blygger-studio output (in-process or live)">studio emits</th><th title="blygger-desktop's serde types read the field">desktop reads</th><th title="survives into desktop's stored ReadingItem/Lineage">desktop keeps</th><th>description</th></tr></thead><tbody>${trs}</tbody></table></div></details>`;
  }).join("");

  // ---- per-site validation
  const siteHtml = sites.map((s) => {
    const counts = s.docs.reduce((a, d) => ((a[d.verdict] = (a[d.verdict] || 0) + 1), a), {});
    const rowsH = s.docs.map((d) => {
      const msgs = [
        ...d.schema.fail.map((e) => `<li>${badge("fail", "schema")} <code>${esc(e.path)}</code> ${esc(e.message)}</li>`),
        ...d.schema.warn.map((e) => `<li>${badge("warn", "advisory")} <code>${esc(e.path)}</code> ${esc(e.message)}</li>`),
        ...d.rules.flatMap((r) => r.messages.map((m) => `<li>${badge(r.level, r.rule)} ${esc(m)} <span class="sub">${r.spec_refs.map(secLink).join(" ")} ${esc(r.decisions.join(" "))}</span></li>`)),
      ];
      return `<details class="doc"><summary>${badge(d.verdict)} <code>${esc(d.path)}</code> ${d.label ? `<b>${esc(d.label)}</b>` : ""} <span class="sub">${esc(d.type)}${d.kind ? " · " + esc(d.kind) : ""}${d.entries ? ` · ${d.entries} entries` : ""}</span></summary>${msgs.length ? `<ul>${msgs.join("")}</ul>` : `<p class="sub">schema valid; ${d.rules.length} semantic rule(s) held</p>`}${d.doc ? `<details class="raw"><summary class="sub">document</summary><pre>${esc(JSON.stringify(d.doc, null, 2).slice(0, 6000))}</pre></details>` : ""}</details>`;
    }).join("");
    return `<details class="card"><summary><b>${esc(s.title)}</b> ${Object.entries(counts).map(([k, v]) => badge(k, `${v} ${k}`)).join(" ")}</summary>${rowsH}</details>`;
  }).join("");

  const rt = roundtrip ? `<div class="card"><p>${esc(roundtrip.implementation)} — ${roundtrip.parsed}/${roundtrip.documents} item documents parsed. Input fields with no place in the re-serialized <code>ReadingItem</code>/<code>Lineage</code>:</p><div class="scroll"><table><thead><tr><th>input path</th><th>docs</th><th>sample sets</th></tr></thead><tbody>${roundtrip.dropped.map((x) => `<tr><td><code>${esc(x.path)}</code></td><td>${x.count}</td><td class="sub">${esc(x.sets.join(", "))}</td></tr>`).join("")}</tbody></table></div><p class="sub">Notes: <code>blyg</code>, <code>content_hash</code> and <code>media</code> are read for display or not needed by a reader and are listed for completeness. <code>transclusions[]</code> appears because an empty array is skipped on serialization, erasing the fragment-omits / thread-carries-[] distinction (§10.3).</p></div>` : "";
  const stH = `<div class="card scroll"><table><thead><tr><th>mutation</th><th>clauses</th><th>caught?</th><th>by</th></tr></thead><tbody>${selftest.map((t) => `<tr><td>${esc(t.title)}</td><td class="sub">${esc(t.clauses.join(" "))}</td><td>${badge(t.caught ? "pass" : "fail", t.caught ? "caught" : "missed")}</td><td class="sub">${esc(t.by.join(" · "))}</td></tr>`).join("")}</tbody></table></div>`;
  const findings = nonPass.sort((a, b) => (a.status === b.status ? 0 : a.status === "fail" ? -1 : 1)).map((c) => `<li>${badge(c.status)} <b>${esc(c.title)}</b><div class="sub">${esc(c.detail)}</div><div class="sub">${c.spec_refs.map(secLink).join(" ")} ${esc(c.decisions.join(" "))} ${c.clauses?.length ? "· " + esc(c.clauses.join(" ")) : ""} · <code>${esc(c.id)}</code></div></li>`).join("");
  const fable = FABLE.map(([t, b, s]) => `<li><b>${esc(t)}</b> <span class="sub">${s.map(secLink).join(" ")}</span><div>${esc(b).replace(/`([^`]+)`/g, "<code>$1</code>")}</div></li>`).join("");
  const ruleList = rules.map((r) => `<tr><td><code>${esc(r.id)}</code></td><td>${badge(r.level)}</td><td>${esc(r.title)}</td><td class="sub">${r.spec_refs.map(secLink).join(" ")} ${esc(r.decisions.join(" "))}</td></tr>`).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Blygger Schema Conformance</title>
<style>
:root{--bg:#f6f4ef;--paper:#fff;--ink:#1d1d1b;--soft:#5b5a55;--rule:#dedad0;--accent:#2b5bab;--pass:#2f7a45;--warn:#a46a00;--fail:#a23b3b;--code:#f1efe9}
@media (prefers-color-scheme:dark){:root{--bg:#161614;--paper:#1f1f1c;--ink:#ecebe6;--soft:#a3a197;--rule:#3a3933;--accent:#8fb1ec;--pass:#6cc48a;--warn:#e0a83c;--fail:#ec7d7d;--code:#2a2a26}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:24px 16px 64px}h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 10px;border-bottom:1px solid var(--rule);padding-bottom:4px}
.card{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:12px 14px;margin:10px 0}details>summary{cursor:pointer}
code,pre{font:12.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--code);border-radius:4px}code{padding:1px 4px}pre{padding:8px;margin:0;white-space:pre-wrap;word-break:break-word;max-width:360px}
.sub{color:var(--soft);font-size:12.5px}.b{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}
.b.pass{color:var(--pass)}.b.warn{color:var(--warn)}.b.fail{color:var(--fail)}.b.info,.b.opt{color:var(--soft)}.b.req{color:var(--accent)}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{border-bottom:1px solid var(--rule);padding:5px 8px;text-align:left;vertical-align:top}th{font-size:12px;color:var(--soft);font-weight:600}
.scroll{overflow-x:auto}td.ok{background:color-mix(in srgb,var(--pass) 18%,transparent);color:var(--pass);font-weight:600;text-align:center}td.diff{background:color-mix(in srgb,var(--fail) 18%,transparent);color:var(--fail);font-weight:600}td.na{color:var(--soft);text-align:center}
td.hm{text-align:center;font-weight:700}td.hm.on{background:color-mix(in srgb,var(--pass) 16%,transparent)}td.hm.off{background:color-mix(in srgb,var(--fail) 10%,transparent)}td.hm.mid{background:color-mix(in srgb,var(--warn) 16%,transparent)}
.y{color:var(--pass)}.n{color:var(--fail)}.q{color:var(--warn)}.desc{max-width:420px}.dnote{color:var(--warn);margin-top:2px}
.tiles{display:flex;gap:10px;flex-wrap:wrap}.tile{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:10px 14px;min-width:110px}.tile b{font-size:22px;display:block}
.doc{border-top:1px solid var(--rule);padding:6px 0}.doc ul{margin:6px 0 6px 18px;padding:0}ul.f{padding-left:18px}ul.f li{margin:8px 0}a{color:var(--accent)}a.sec{text-decoration:none;font-size:12px}
.raw pre{max-width:none;max-height:340px;overflow:auto}
</style></head><body><main>
<h1>Blygger Schema Conformance</h1>
<p class="sub">Protocol 0.3 (<code>docs/protocol-v0.3.md</code>) · generated ${esc(summary.generated_at)} · regenerate with <code>node conformance/schemas/run.mjs</code> · MUST fails, SHOULD warns, MAY is shape-checked when present (decision #48)</p>
<div class="tiles">${["pass", "warn", "fail", "info"].map((k) => `<div class="tile"><b style="color:var(--${k === "info" ? "soft" : k})">${tally[k] || 0}</b><span class="sub">${k}</span></div>`).join("")}<div class="tile"><b>${checks.length}</b><span class="sub">checks</span></div></div>

<h2>Findings (fail and warn)</h2><div class="card"><ul class="f">${findings || "<li>none</li>"}</ul></div>

<h2>For Fable — places the spec text is silent or ambiguous</h2><div class="card"><ul class="f">${fable}</ul></div>

<h2>Grammar differential (§10.1)</h2>
<p class="sub">Each case is run through blygger-studio's real publish path (create → generate TK scopes via a fake provider → publish → read <code>items/{id}.json</code>) and through blygger-desktop's <code>blyg_render::render_preview</code> with a resolver holding the same targets. Expected parses are written from the spec text. Ids: <code>7c9w…</code> RA, <code>1vgt…</code> RB (Devanagari), <code>4zss…</code> RC at the fake remote; <code>{{L}}</code> a local fragment.</p>
<div class="card scroll"><table><thead><tr><th>case</th><th>content_md</th><th>expected (from the spec)</th><th>${esc(gStudio?.implementation || "studio")}</th><th>${esc(gDesktop?.implementation || "desktop")}</th></tr></thead><tbody>${grammarRows}</tbody></table></div>

<h2>Schema explorer and implementation coverage</h2>
<p class="sub">Normative schemas: <code>schemas/{item,pinned,manifest,index}.schema.json</code> + <code>defs.schema.json</code>; SHOULD layer: <code>advisory.schema.json</code>. <b>studio emits</b> = the field appears in blygger-studio output (in-process harness or the live node). <b>desktop reads / keeps</b> = blygger-desktop's serde types (static reading, confirmed by the round-trip harness for item documents).</p>
${explorer}

<h2>Validation by sample document</h2>${siteHtml}

<h2>blygger-desktop round trip</h2>${rt}

<h2>Checker self-test (mutations)</h2>${stH}

<h2>Semantic rules</h2><div class="card scroll"><table><thead><tr><th>rule</th><th>level</th><th>what</th><th>spec</th></tr></thead><tbody>${ruleList}</tbody></table></div>
</main></body></html>`;
}
