// Renders out/report.html — a self-contained page (data inline; one script
// from cdnjs for the graph) from out/results.json.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// By default the page carries no item text: it is committed to git, and a
// copy of other people's words there could never be reached by a withdrawal
// at their origin (§13.4). withText adds the fork diffs and writes
// out/report-local.html instead, which is gitignored.
export async function report({ withText = false } = {}) {
  const r = JSON.parse(await readFile(join(HERE, "out", "results.json"), "utf8"));
  const census = r.results.filter((x) => x.check === "live.census").map((x) => ({ origin: x.origin, ...x.data }));
  const data = {
    summary: r.summary,
    graph: r.graph,
    grid: r.grid,
    forks: withText ? r.forks : r.forks.map(({ source_md, fork_md, ...f }) => ({ ...f, redacted: true })),
    census,
    issues: r.results.filter((x) => x.status === "fail" || x.status === "warn")
      .map(({ check, status, detail, origin, item }) => ({ check, status, detail, origin, item })),
    resolutions: r.crawl_meta.resolutions,
    crawl: { generated_at: r.crawl_meta.generated_at, http: r.crawl_meta.http_stats },
  };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const html = TEMPLATE.replace("__DATA__", json);
  await writeFile(join(HERE, "out", withText ? "report-local.html" : "report.html"), html);
  return html.length;
}

const TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blyg Network Conformance</title>
<style>
:root { --bg:#f6f4ef; --paper:#fff; --ink:#1d1d1b; --soft:#5b5a55; --rule:#dedad0; --accent:#2b5bab;
  --pass:#2f7a45; --warn:#a46a00; --fail:#a23b3b; --code:#f1efe9; --info:#5b5a55; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#17171a; --paper:#1f1f23; --ink:#e9e7e1; --soft:#a3a098; --rule:#34343a; --accent:#7ea2e6;
    --pass:#5cb57a; --warn:#d9a441; --fail:#e07070; --code:#26262b; --info:#a3a098; }
}
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
main { max-width:1180px; margin:0 auto; padding:24px 16px 80px; }
h1 { font-size:1.6rem; margin:0 0 4px; } h2 { font-size:1.15rem; margin:0 0 10px; }
.sub { color:var(--soft); margin:0 0 20px; }
.card { background:var(--paper); border:1px solid var(--rule); border-radius:10px; padding:16px; margin:0 0 18px; overflow:hidden; }
.kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin-bottom:18px; }
.kpi { background:var(--paper); border:1px solid var(--rule); border-radius:10px; padding:12px; }
.kpi b { display:block; font-size:1.5rem; font-variant-numeric:tabular-nums; } .kpi span { color:var(--soft); font-size:.85rem; }
.badge { display:inline-block; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em;
  padding:1px 7px; border-radius:999px; border:1px solid currentColor; }
.s-pass { color:var(--pass); } .s-warn { color:var(--warn); } .s-fail { color:var(--fail); } .s-info { color:var(--info); }
code, .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.85em; }
code { background:var(--code); padding:1px 4px; border-radius:4px; }
table { border-collapse:collapse; width:100%; font-size:.88rem; }
th, td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--rule); vertical-align:top; }
th { color:var(--soft); font-weight:600; font-size:.78rem; text-transform:uppercase; letter-spacing:.03em; }
.scroll { overflow-x:auto; }
.refs { color:var(--soft); font-size:.8rem; }
#cy { height:560px; border:1px solid var(--rule); border-radius:8px; background:var(--bg); }
.legend { display:flex; flex-wrap:wrap; gap:12px; font-size:.82rem; color:var(--soft); margin:8px 0; align-items:center; }
.sw { display:inline-block; width:22px; height:0; border-top:3px solid; vertical-align:middle; margin-right:4px; }
.dot { display:inline-block; width:10px; height:10px; border-radius:50%; vertical-align:middle; margin-right:4px; }
#edgeinfo { margin-top:10px; font-size:.86rem; }
#edgeinfo ul { margin:6px 0; padding-left:18px; }
.grid td.cell { text-align:center; font-variant-numeric:tabular-nums; min-width:34px; font-size:.78rem; }
.grid th.rot { writing-mode:vertical-rl; transform:rotate(180deg); white-space:nowrap; font-size:.72rem; padding:6px 2px; }
.grid td.o { white-space:nowrap; font-size:.8rem; }
.fork { border-top:1px solid var(--rule); padding-top:14px; margin-top:14px; }
.fork:first-of-type { border-top:0; margin-top:0; padding-top:0; }
.findings { margin:8px 0; padding-left:18px; font-size:.88rem; }
.diff { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
@media (max-width:760px) { .diff { grid-template-columns:1fr; } #cy { height:420px; } }
.pane { background:var(--code); border-radius:8px; padding:8px; overflow-x:auto; font-family:ui-monospace,Menlo,monospace; font-size:.76rem; line-height:1.45; }
.pane h4 { margin:0 0 6px; font-family:system-ui,sans-serif; font-size:.8rem; color:var(--soft); }
.ln { white-space:pre-wrap; word-break:break-word; padding:0 4px; border-left:3px solid transparent; }
.ln.del { background:color-mix(in srgb, var(--fail) 14%, transparent); }
.ln.ins { background:color-mix(in srgb, var(--pass) 14%, transparent); }
.ln.dir { border-left-color:var(--accent); font-weight:600; }
.ln.sel { border-left-color:var(--warn); }
.controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:8px; font-size:.85rem; }
select, input[type=search] { font:inherit; padding:4px 8px; border:1px solid var(--rule); border-radius:6px; background:var(--paper); color:var(--ink); max-width:100%; }
details summary { cursor:pointer; color:var(--accent); }
a { color:var(--accent); }
</style>
</head>
<body>
<main>
<h1>Blyg network conformance</h1>
<p class="sub" id="sub"></p>
<div class="kpis" id="kpis"></div>

<section class="card">
  <h2>Network</h2>
  <p class="refs">Nodes are origins (size = item count, colour = client). Edges are cross-origin references, arrow pointing at the target. Red = an invariant failed on that edge (unpinned fork target, selector not a substring, unreachable target, or no Webmention endpoint at the target). Click an edge for its instances, a node for its census row.</p>
  <div class="legend" id="legend"></div>
  <div class="controls">
    <label><input type="checkbox" id="showBlogroll"> show blogroll edges</label>
    <label><input type="checkbox" id="hideEndpoint"> don't count "no endpoint" as red</label>
  </div>
  <div id="cy"></div>
  <div id="edgeinfo" class="refs">Click an edge or a node.</div>
</section>

<section class="card">
  <h2>Checks</h2>
  <div class="scroll"><table id="checks"></table></div>
</section>

<section class="card">
  <h2>Origin × check</h2>
  <p class="refs">Each cell: failures / warnings (green ✓ = only passes, · = no instances). Click a cell to list its issues.</p>
  <div class="scroll"><table class="grid" id="grid"></table></div>
  <div id="gridinfo" class="refs"></div>
</section>

<section class="card">
  <h2>Census</h2>
  <div class="scroll"><table id="census"></table></div>
</section>

<section class="card">
  <h2>Fork lineage</h2>
  <p class="refs">This page carries no item text, so only the findings show. Run <code>node conformance/live/run.mjs --skip-crawl --with-text</code> for the side-by-side diffs, written to <code>out/report-local.html</code> (not committed). In that view: source pin (left) vs. the fork's first available version (right). Lines removed in the fork are tinted red, added green; transclusion directives carry a blue rule, partial-quote selections an amber one. A fork is a copy and may diverge freely (§5.6 r6) — what matters here is whether the <em>reference machinery</em> (directives, selectors, origins, baked versions) survived the copy.</p>
  <div id="forks"></div>
</section>

<section class="card">
  <h2>All warnings and failures</h2>
  <div class="controls"><select id="fcheck"><option value="">all checks</option></select>
  <select id="fstatus"><option value="">fail + warn</option><option>fail</option><option>warn</option></select>
  <input type="search" id="fq" placeholder="filter origin / text"></div>
  <div class="scroll"><table id="issues"></table></div>
</section>

<section class="card">
  <h2>Resolution trail</h2>
  <details><summary>Every seed and how §12.1 resolved it</summary><div class="scroll"><table id="res"></table></div></details>
</section>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.30.2/cytoscape.min.js"></script>
<script>
const D = __DATA__;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const host = (o) => String(o || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const badge = (s) => '<span class="badge s-' + s + '">' + s + "</span>";
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

$("#sub").innerHTML = "Crawled " + esc(D.crawl.generated_at) + " · checks " + esc(D.summary.generated_at) +
  " · " + D.crawl.http.network + " network requests, " + D.crawl.http.cached + " cached · spec <code>docs/protocol-v0.3.md</code>";

// KPIs
const tot = { pass:0, warn:0, fail:0 };
D.summary.checks.forEach((c) => { tot.pass += c.counts.pass; tot.warn += c.counts.warn; tot.fail += c.counts.fail; });
const forksWarn = D.forks.filter((f) => f.findings.some((x) => x.level === "warn" || x.level === "fail")).length;
const crossRefs = D.graph.edges.reduce((a, e) => a + e.count, 0);
const noEp = D.graph.edges.reduce((a, e) => a + e.instances.filter((i) => i.flags.includes("no-endpoint")).length, 0);
[["Live blygs", D.census.length], ["Cross-origin refs", crossRefs], ["…landing with no endpoint", noEp],
 ["Forks", D.forks.length + (forksWarn ? " (" + forksWarn + " ⚠)" : "")],
 ["Instance failures", '<span class="s-fail">' + tot.fail + "</span>"], ["Instance warnings", '<span class="s-warn">' + tot.warn + "</span>"]]
  .forEach(([k, v]) => $("#kpis").insertAdjacentHTML("beforeend", '<div class="kpi"><b>' + v + "</b><span>" + k + "</span></div>"));

// Checks table
$("#checks").innerHTML = "<tr><th>Status</th><th>Check</th><th>Result</th><th>Spec</th></tr>" + D.summary.checks.map((c) =>
  "<tr><td>" + badge(c.status) + "</td><td><b>" + esc(c.title) + "</b><br><span class='mono refs'>" + c.id + "</span></td><td>" + esc(c.detail) +
  "</td><td class='refs'>" + c.spec_refs.join(" ") + (c.decisions.length ? "<br>" + c.decisions.join(" ") : "") +
  (c.clauses && c.clauses.length ? "<br><span class='mono'>" + c.clauses.join(" ") + "</span>" : "") + "</td></tr>").join("");

// Graph
const clients = [...new Set(D.graph.nodes.map((n) => n.client))];
const PAL = ["#2b5bab","#c0622f","#2f7a45","#8a4fb3","#b0457a","#3a8f99","#8c7a2b","#5d6b80","#c94f4f","#4f9a5d","#7a5c3a","#3d5fd1","#a65e9f","#6e8f2f","#d08b2c","#4b4b8f"];
const colorOf = (c) => PAL[clients.indexOf(c) % PAL.length];
const EC = { stub:"#2b5bab", transclusion:"#3a8f99", fork:"#8a4fb3", source:"#8c7a2b", blogroll:"#9a978f" };
$("#legend").innerHTML = clients.map((c) => '<span><span class="dot" style="background:' + colorOf(c) + '"></span>' + esc(c) + "</span>").join("") +
  " &nbsp; " + Object.entries(EC).map(([k, v]) => '<span><span class="sw" style="border-color:' + v + (k === "blogroll" ? ";border-top-style:dotted" : k === "fork" ? ";border-top-style:dashed" : "") + '"></span>' + k + "</span>").join("") +
  '<span><span class="sw" style="border-color:' + css("--fail") + '"></span>failed invariant</span>';

let cy;
function edgeFailed(e) {
  const ignoreEp = $("#hideEndpoint").checked;
  return e.instances.some((i) => i.flags.some((f) => !(ignoreEp && f === "no-endpoint")));
}
function buildGraph() {
  if (!window.cytoscape) { $("#cy").innerHTML = "<p class='refs' style='padding:12px'>Graph library failed to load (offline?). The tables below carry the same data.</p>"; return; }
  const els = [];
  const ids = new Set();
  D.graph.nodes.forEach((n) => { ids.add(n.id); els.push({ data: { id: n.id, label: host(n.id), size: 18 + 6 * Math.sqrt(n.items || 1), color: n.unreachable ? "#888" : colorOf(n.client), n } }); });
  const add = (e, i, type) => {
    if (!ids.has(e.from) || !ids.has(e.to)) return;
    els.push({ data: { id: type + i, source: e.from, target: e.to, rel: e.rel, w: 1.5 + Math.log2(1 + (e.count || 1)) * 1.4,
      color: type === "ref" && edgeFailed(e) ? css("--fail") : EC[e.rel], style: e.rel === "fork" ? "dashed" : e.rel === "blogroll" ? "dotted" : "solid",
      label: e.count > 1 ? String(e.count) : "", e } });
  };
  D.graph.edges.forEach((e, i) => add(e, i, "ref"));
  if ($("#showBlogroll").checked) D.graph.blogroll.forEach((e, i) => add(e, i, "br"));
  if (cy) cy.destroy();
  cy = cytoscape({ container: $("#cy"), elements: els, wheelSensitivity: 0.3,
    layout: { name: "cose", animate: false, nodeRepulsion: 900000, idealEdgeLength: 140, padding: 30, randomize: false },
    style: [
      { selector: "node", style: { "background-color": "data(color)", width: "data(size)", height: "data(size)", label: "data(label)",
        color: css("--ink"), "font-size": 10, "text-valign": "bottom", "text-margin-y": 4, "text-outline-width": 2, "text-outline-color": css("--bg") } },
      { selector: "edge", style: { width: "data(w)", "line-color": "data(color)", "target-arrow-color": "data(color)", "target-arrow-shape": "triangle",
        "curve-style": "bezier", "line-style": "data(style)", label: "data(label)", "font-size": 9, color: css("--soft"), "text-background-color": css("--bg"), "text-background-opacity": 1, opacity: 0.85 } },
      { selector: ":selected", style: { "overlay-opacity": 0.15, "overlay-color": css("--accent") } },
    ] });
  cy.on("tap", "edge", (ev) => {
    const e = ev.target.data("e");
    if (!e.instances) { $("#edgeinfo").innerHTML = "<b>blogroll</b>: " + esc(host(e.from)) + " lists " + esc(host(e.to)); return; }
    $("#edgeinfo").innerHTML = "<b>" + esc(e.rel) + "</b> · " + esc(host(e.from)) + " → " + esc(host(e.to)) + " · " + e.count + " reference(s)<ul>" +
      e.instances.map((i) => "<li><a href='" + esc(e.from) + "items/" + esc(i.item) + ".json' target=_blank class=mono>" + esc(i.item) + "</a> → <a class=mono target=_blank href='" + esc(e.to) + "items/" + esc(i.target) + ".json'>" + esc(i.target) + "</a> v" + esc(i.version) +
        (i.flags.length ? " " + i.flags.map((f) => '<span class="badge s-fail">' + esc(f) + "</span>").join(" ") : "") +
        (i.notes && i.notes.length ? " <span class=refs>" + esc(i.notes.join("; ")) + "</span>" : "") +
        (i.endpoint ? " <span class=refs>endpoint " + esc(i.endpoint) + "</span>" : "") + "</li>").join("") + "</ul>";
  });
  cy.on("tap", "node", (ev) => {
    const n = ev.target.data("n");
    const c = D.census.find((x) => x.origin === n.id) || {};
    $("#edgeinfo").innerHTML = "<b><a href='" + esc(n.id) + "' target=_blank>" + esc(n.title) + "</a></b> · " + esc(n.generator || "?") + " · blyg " + esc(n.blyg ?? "?") +
      " · " + (n.items ?? "not crawled") + " items" + (n.unreachable ? " · <span class=s-fail>unreachable</span>" : "") +
      (c.webmention_manifest ? " · webmention " + esc(c.webmention_manifest) : n.crawled ? " · no webmention key" : "");
  });
}
$("#showBlogroll").onchange = buildGraph; $("#hideEndpoint").onchange = buildGraph;
addEventListener("load", buildGraph);

// Heat grid
const gridChecks = D.summary.checks.filter((c) => Object.values(D.grid).some((g) => g[c.id]) && c.id !== "live.census").map((c) => c.id);
const origins = Object.keys(D.grid).sort();
$("#grid").innerHTML = "<tr><th>origin</th>" + gridChecks.map((c) => "<th class=rot>" + c.replace("live.", "") + "</th>").join("") + "</tr>" +
  origins.map((o) => "<tr><td class=o>" + esc(host(o)) + "</td>" + gridChecks.map((c) => {
    const g = D.grid[o][c];
    if (!g) return "<td class=cell style='color:var(--rule)'>·</td>";
    const bad = g.fail + g.warn, tot = g.pass + g.fail + g.warn + g.info;
    const col = g.fail ? "--fail" : g.warn ? "--warn" : g.pass ? "--pass" : "--info";
    const a = g.fail ? Math.min(0.15 + 0.6 * g.fail / tot, 0.75) : g.warn ? Math.min(0.12 + 0.5 * g.warn / tot, 0.6) : 0.12;
    const txt = bad ? (g.fail ? g.fail : "") + (g.fail && g.warn ? "/" : "") + (g.warn ? g.warn : "") : g.pass ? "✓" : "i";
    return "<td class=cell data-o='" + esc(o) + "' data-c='" + c + "' title='" + c + ": " + g.pass + " pass, " + g.warn + " warn, " + g.fail + " fail' style='cursor:pointer;background:color-mix(in srgb, var(" + col + ") " + Math.round(a * 100) + "%, transparent)'>" + txt + "</td>";
  }).join("") + "</tr>").join("");
$("#grid").onclick = (ev) => {
  const td = ev.target.closest("td.cell[data-c]"); if (!td) return;
  const list = D.issues.filter((i) => i.origin === td.dataset.o && i.check === td.dataset.c);
  $("#gridinfo").innerHTML = "<b>" + esc(host(td.dataset.o)) + " · " + td.dataset.c + "</b>" + (list.length ? "<ul>" + list.slice(0, 40).map((i) => "<li>" + badge(i.status) + " <span class=mono>" + esc(i.item || "") + "</span> " + esc(i.detail) + "</li>").join("") + "</ul>" : " — no warnings or failures.");
};

// Census
$("#census").innerHTML = "<tr><th>Origin</th><th>Client</th><th>Protocol key</th><th>Level</th><th>Webmention</th><th>Items</th><th>Kinds</th><th>Blogroll</th><th>Found via</th><th>Updated</th></tr>" +
  D.census.sort((a, b) => b.items - a.items).map((c) => "<tr><td><a href='" + esc(c.origin) + "' target=_blank>" + esc(host(c.origin)) + "</a><br><span class=refs>" + esc(c.title || "") + "</span></td><td class=mono>" +
    (c.generator_url ? "<a href='" + esc(c.generator_url) + "' target=_blank>" + esc(c.generator || "?") + "</a>" : esc(c.generator || "?")) + "</td><td>" + esc(c.blyg) + "</td><td>" + esc(c.level ?? "—") + "</td><td>" +
    (c.webmention_manifest ? '<span class="s-pass">manifest</span>' : c.webmention_page ? '<span class="s-warn">page only</span>' : '<span class="s-info">none</span>') + "</td><td>" + c.items + "</td><td class=refs>" +
    Object.entries(c.kinds || {}).map(([k, v]) => k + " " + v).join(", ") + "</td><td>" + (c.blogroll || "—") + "</td><td class=refs>step " + esc(c.resolution_step) + "<br>" + esc((c.from || []).map((f) => f.replace(/^blogroll:https?:\/\//, "blogroll:")).slice(0, 3).join(", ")) + "</td><td class=refs>" + esc((c.updated || "").slice(0, 16)) + "</td></tr>").join("");

// Forks
function lcsDiff(a, b) {
  const n = a.length, m = b.length, t = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const L = [], R = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { L.push([a[i], ""]); R.push([b[j], ""]); i++; j++; } else if (t[i + 1][j] >= t[i][j + 1]) L.push([a[i++], "del"]); else R.push([b[j++], "ins"]); }
  while (i < n) L.push([a[i++], "del"]); while (j < m) R.push([b[j++], "ins"]);
  return [L, R];
}
function paneLines(lines) {
  let prevDir = false;
  return lines.map(([l, cls]) => {
    const dir = /^\s*!\[\[[0-9a-z]{26}(@v\d+)?\]\]\s*$/.test(l);
    const sel = !dir && prevDir && /^\s{0,3}>/.test(l);
    prevDir = dir || sel;
    return '<div class="ln ' + cls + (dir ? " dir" : "") + (sel ? " sel" : "") + '">' + (esc(l) || "&nbsp;") + "</div>";
  }).join("");
}
$("#forks").innerHTML = D.forks.map((f) => {
  if (f.redacted) return '<div class="fork"><div><b><a href="' + esc(f.page || f.origin) + '" target=_blank>' + esc(host(f.origin)) + " · " + esc(f.id) + "</a></b> forked from " + esc(host(f.source_origin)) + " · " + esc(f.source_id) + " v" + f.source_version + "</div>" +
    (f.findings.length ? "<ul class=refs>" + f.findings.map((x) => "<li>" + badge(x.level) + " " + esc(x.text) + "</li>").join("") + "</ul>" : "<p class=refs>No findings.</p>") + "</div>";
  const [L, R] = f.source_md != null ? lcsDiff(f.source_md.split("\n"), (f.fork_md || "").split("\n")) : [[], (f.fork_md || "").split("\n").map((l) => [l, ""])];
  return '<div class="fork"><div><b><a href="' + esc(f.page || f.origin) + '" target=_blank>' + esc(host(f.origin)) + " · " + esc(f.id) + "</a></b> forked from <a target=_blank href='" +
    esc(f.source_origin) + "items/" + esc(f.source_id) + "/v" + f.source_version + ".json'>" + esc(host(f.source_origin)) + " · " + esc(f.source_id) + " v" + f.source_version + "</a></div>" +
    '<ul class="findings">' + f.findings.map((x) => "<li>" + badge(x.level) + " " + esc(x.text) + "</li>").join("") +
    (f.lineage ? "<li>" + badge(f.lineage.status) + " lineage on page: " + esc(f.lineage.detail) + "</li>" : "") + "</ul>" +
    '<div class="diff"><div class="pane"><h4>source pin v' + f.source_version + (f.source_available ? "" : " (unavailable)") + "</h4>" + paneLines(L) + '</div><div class="pane"><h4>' + esc(f.fork_label) + "</h4>" + paneLines(R) + "</div></div></div>";
}).join("") || "<p class=refs>No forks found.</p>";

// Issues
const checksWithIssues = [...new Set(D.issues.map((i) => i.check))];
$("#fcheck").insertAdjacentHTML("beforeend", checksWithIssues.map((c) => "<option>" + c + "</option>").join(""));
function renderIssues() {
  const c = $("#fcheck").value, s = $("#fstatus").value, q = $("#fq").value.toLowerCase();
  const list = D.issues.filter((i) => (!c || i.check === c) && (!s || i.status === s) && (!q || (i.origin + " " + i.detail + " " + (i.item || "")).toLowerCase().includes(q)));
  $("#issues").innerHTML = "<tr><th></th><th>Check</th><th>Origin / item</th><th>Detail</th></tr>" + list.slice(0, 400).map((i) =>
    "<tr><td>" + badge(i.status) + "</td><td class=mono>" + i.check.replace("live.", "") + "</td><td><span class=refs>" + esc(host(i.origin)) + "</span><br>" +
    (i.item ? "<a class=mono target=_blank href='" + esc(i.origin) + "items/" + esc(i.item) + ".json'>" + esc(i.item) + "</a>" : "") + "</td><td>" + esc(i.detail) + "</td></tr>").join("") +
    (list.length > 400 ? "<tr><td colspan=4 class=refs>… " + (list.length - 400) + " more; narrow the filter</td></tr>" : "");
}
["#fcheck", "#fstatus", "#fq"].forEach((s) => $(s).addEventListener("input", renderIssues));
renderIssues();

// Resolutions
$("#res").innerHTML = "<tr><th>Input</th><th>From</th><th>Outcome</th><th>Step</th><th>Identity / feed</th></tr>" + D.resolutions.map((r) =>
  "<tr><td class=mono>" + esc(r.input) + "</td><td class=refs>" + esc(r.from.join(", ").replace(/blogroll:https?:\/\//g, "blogroll:")) + "</td><td>" +
  badge(r.outcome === "blyg" ? "pass" : r.outcome === "l0" ? "info" : "fail").replace(/>[a-z]+</, ">" + r.outcome + "<") + "</td><td>" + (r.step ?? "—") + "</td><td class=mono>" + esc(r.identity || r.feed_url || "") + "</td></tr>").join("");
</script>
</body>
</html>`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = await report({ withText: process.argv.includes("--with-text") });
  console.log(`report.html: ${(n / 1024).toFixed(0)} KB`);
}
