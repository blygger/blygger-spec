#!/usr/bin/env python3
"""Render out/report.html from the register, the graph and the analyses.

One self-contained page: data is inlined as JSON; the only external script is
cytoscape.js from cdnjs (the graph degrades to a notice without it).

Stdlib only:  python3 conformance/clauses/report.py
"""
from __future__ import annotations

import html
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"


def main() -> int:
    reg = json.loads((HERE / "clauses.json").read_text())
    decs = json.loads((HERE / "decisions.json").read_text())["decisions"]
    graph = json.loads((OUT / "graph.json").read_text())
    ana = json.loads((OUT / "analysis.json").read_text())
    summ = json.loads((OUT / "summary.json").read_text())

    data = {
        "spec": reg["source"],
        "generated_at": summ["generated_at"],
        "clauses": [{k: c.get(k) for k in ("id", "section", "heading", "level", "status", "side", "text", "label",
                                           "line", "decisions", "decisions_nearby", "refs", "keywords", "coverage",
                                           "excluded")}
                    for c in reg["clauses"]],
        "sections": [{k: s.get(k) for k in ("id", "heading", "line", "n_lines", "counts", "mode")} for s in reg["sections"]],
        "invariants": reg["invariants"],
        "pending": reg["pending_shapes"],
        "decisions": [{"number": d["number"], "title": d["title"], "session": d["session"],
                       "inferred": d["session_inferred"], "text": d["text"],
                       **{k: ana["decisions"][str(d["number"])][k] for k in
                          ("grounding", "class", "direct_clauses", "nearby_clauses", "section_clauses", "spec_sections")}}
                      for d in decs],
        "graph": graph,
        "matrix": ana["matrix"],
        "relations": ana["relations"],
        "checks": summ["checks"],
        "lowercase": ana["lowercase_modals"],
        "absolutes": ana["absolutes"],
        "tests": ana["tests"],
    }
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = TEMPLATE.replace("__DATA__", blob).replace("__SPEC__", html.escape(reg["source"]))
    (OUT / "report.html").write_text(page, encoding="utf-8")
    print(f"wrote {OUT / 'report.html'} ({len(page) // 1024} KB)")
    return 0


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clause Register</title>
<style>
:root{--bg:#f6f4ef;--paper:#fff;--ink:#1d1d1b;--soft:#5b5a55;--rule:#dedad0;--accent:#2b5bab;--pass:#2f7a45;--warn:#a46a00;--fail:#a23b3b;--code:#f1efe9;
  --may:#5f6fa3;--sec:#8a877d;--inv:#1d1d1b;--test:#7a4fa0}
@media (prefers-color-scheme: dark){:root{--bg:#161614;--paper:#1f1f1c;--ink:#ecebe6;--soft:#a6a49b;--rule:#3a3934;--accent:#7fa6e8;--pass:#6cc189;--warn:#e0a640;--fail:#e07a7a;--code:#2a2a26;
  --may:#9aa8e0;--sec:#8f8c82;--inv:#ecebe6;--test:#c39be6}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1200px;margin:0 auto;padding:20px 16px 80px}
h1{font-size:1.6rem;margin:.2rem 0}h2{font-size:1.15rem;margin:0 0 .4rem}
.sub{color:var(--soft);margin:0 0 1rem}
.card{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:16px;margin:0 0 18px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px}
.tile{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:10px 12px}
.tile b{display:block;font-size:1.5rem;font-variant-numeric:tabular-nums}.tile span{color:var(--soft);font-size:.85rem}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86em}
code{background:var(--code);padding:0 .25em;border-radius:3px}
.lv{display:inline-block;font-size:.72rem;font-weight:600;padding:1px 6px;border-radius:9px;color:#fff;letter-spacing:.02em}
.lv.MUST{background:var(--fail)}.lv.SHOULD{background:var(--warn)}.lv.MAY{background:var(--may)}.lv.pending{background:var(--sec)}
.st{display:inline-block;font-size:.72rem;font-weight:600;padding:1px 7px;border-radius:9px;border:1px solid currentColor}
.st.pass{color:var(--pass)}.st.warn{color:var(--warn)}.st.fail{color:var(--fail)}.st.info{color:var(--soft)}
.controls{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:8px 0;font-size:.9rem}
.controls label{display:inline-flex;gap:4px;align-items:center;white-space:nowrap}
select,input[type=search]{font:inherit;background:var(--paper);color:var(--ink);border:1px solid var(--rule);border-radius:6px;padding:4px 8px}
input[type=search]{min-width:min(320px,100%)}
button{font:inherit;background:var(--paper);color:var(--ink);border:1px solid var(--rule);border-radius:6px;padding:3px 10px;cursor:pointer}
button:hover{border-color:var(--accent)}
.graphwrap{display:grid;grid-template-columns:1fr 320px;gap:12px}
#cy{height:620px;border:1px solid var(--rule);border-radius:8px;background:var(--bg)}
#detail{border:1px solid var(--rule);border-radius:8px;padding:10px;max-height:620px;overflow:auto;font-size:.9rem}
#detail h3{margin:.1rem 0 .4rem;font-size:1rem}
.legend{display:flex;flex-wrap:wrap;gap:10px;font-size:.8rem;color:var(--soft)}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:-1px}
table{border-collapse:collapse;width:100%;font-size:.88rem}
th,td{text-align:left;padding:5px 7px;border-bottom:1px solid var(--rule);vertical-align:top}
th{position:sticky;top:0;background:var(--paper);font-weight:600;z-index:1}
.scroll{max-height:560px;overflow:auto;border:1px solid var(--rule);border-radius:8px}
.matrix td.cell{text-align:center;cursor:pointer;font-variant-numeric:tabular-nums;min-width:62px}
.matrix td.cell.empty{color:var(--rule);cursor:default}
.matrix td.cell:not(.empty):hover{outline:2px solid var(--accent)}
.bar{height:6px;border-radius:3px;background:var(--rule);margin-top:3px;overflow:hidden}.bar i{display:block;height:100%;background:var(--pass)}
#timeline{width:100%;overflow-x:auto}
#timeline svg{display:block}
.tl-dot{cursor:pointer}.tl-dot:hover{stroke:var(--ink);stroke-width:2}
.muted{color:var(--soft)}.small{font-size:.82rem}
.checks details{border-bottom:1px solid var(--rule);padding:6px 0}.checks summary{cursor:pointer}
.checks .det{margin:.3rem 0 .2rem 1.2rem;color:var(--soft);font-size:.88rem}
.pill{display:inline-block;padding:0 6px;border-radius:8px;background:var(--code);font-size:.78rem;margin:1px 2px}
a{color:var(--accent)}
.hl{background:color-mix(in srgb,var(--accent) 12%,transparent)}
@media (max-width:820px){.graphwrap{grid-template-columns:1fr}#cy{height:440px}#detail{max-height:none}}
</style>
</head>
<body>
<main>
<h1>Clause register &amp; traceability</h1>
<p class="sub">Every RFC 2119 sentence in <code>__SPEC__</code>, the 56 locked decisions, the four §1 invariants, and how they connect. Generated <span id="gen"></span>.</p>

<div class="tiles" id="tiles"></div>

<section class="card">
  <h2>Traceability graph</h2>
  <p class="muted small">Invariants → decisions → sections → clauses. Click a node to read it; double-click to focus on its neighbourhood. Clause colour follows decision #48: MUST fails, SHOULD warns, MAY is shape-checked.</p>
  <div class="controls">
    <label><input type="checkbox" class="flv" value="MUST" checked>MUST</label>
    <label><input type="checkbox" class="flv" value="SHOULD" checked>SHOULD</label>
    <label><input type="checkbox" class="flv" value="MAY" checked>MAY</label>
    <label><input type="checkbox" class="flv" value="pending" checked>§16 pending</label>
    <label>Decision <select id="fdec"><option value="">all</option></select></label>
    <label>Section <select id="fsec"><option value="">all</option></select></label>
    <label><input type="checkbox" id="ftok">token links</label>
    <label><input type="checkbox" id="fsecref">clause→§ refs</label>
    <label>Layout <select id="flay"><option>cose</option><option>concentric</option><option>breadthfirst</option></select></label>
    <button id="freset">Reset</button>
  </div>
  <div class="legend">
    <span><i class="dot" style="background:var(--inv)"></i>invariant</span>
    <span><i class="dot" style="background:var(--accent)"></i>decision</span>
    <span><i class="dot" style="background:var(--sec)"></i>section</span>
    <span><i class="dot" style="background:var(--fail)"></i>MUST</span>
    <span><i class="dot" style="background:var(--warn)"></i>SHOULD</span>
    <span><i class="dot" style="background:var(--may)"></i>MAY</span>
    <span><i class="dot" style="background:var(--test)"></i>test</span>
    <span>hollow clause = untested</span>
  </div>
  <div class="graphwrap">
    <div id="cy"></div>
    <div id="detail"><p class="muted">Select a node.</p></div>
  </div>
</section>

<section class="card">
  <h2>Coverage matrix</h2>
  <p class="muted small">Sections × level. The number is the clause count; the bar is the share with a clause-level test (from other toolkit areas' <code>summary.json</code>). Click a cell to list its clauses below.</p>
  <div class="scroll"><table class="matrix" id="matrix"></table></div>
</section>

<section class="card">
  <h2>Decision timeline</h2>
  <p class="muted small">Session on the x-axis; one dot per decision, coloured by how it reaches the spec. Arcs are amend / supersede / refine / resolve edges (dashed = hand-curated). Sessions for #1–#5, #7 and #10 are inferred upper bounds. Click a dot to open it in the graph.</p>
  <div class="legend" id="tl-legend"></div>
  <div id="timeline"></div>
</section>

<section class="card checks">
  <h2>Checks</h2>
  <div class="controls">
    <label><input type="checkbox" class="fst" value="fail" checked>fail</label>
    <label><input type="checkbox" class="fst" value="warn" checked>warn</label>
    <label><input type="checkbox" class="fst" value="info" checked>info</label>
    <label><input type="checkbox" class="fst" value="pass">pass</label>
    <label><input type="checkbox" id="fcov">per-section MUST coverage</label>
  </div>
  <div id="checks"></div>
</section>

<section class="card">
  <h2>Clauses</h2>
  <div class="controls">
    <input type="search" id="q" placeholder="Search text, id, §, #decision…">
    <select id="qlv"><option value="">any level</option><option>MUST</option><option>SHOULD</option><option>MAY</option></select>
    <select id="qside"><option value="">any side</option></select>
    <select id="qst"><option value="">normative + pending</option><option value="normative">normative</option><option value="pending">pending (§16)</option></select>
    <span class="muted small" id="qn"></span>
  </div>
  <div class="scroll"><table id="ctable"><thead><tr><th>id</th><th>level</th><th>side</th><th>text</th><th>links</th></tr></thead><tbody></tbody></table></div>
</section>

<section class="card">
  <h2>Prose that sounds normative</h2>
  <p class="muted small">Sentences in normative sections with no RFC 2119 keyword: lowercase <em>must/should/required</em> (likely misses), then absolutes (<em>never</em>, <em>always</em>, <em>publish error</em>) a test suite cannot see.</p>
  <div class="scroll"><table id="prose"><thead><tr><th>§</th><th>kind</th><th>sentence</th></tr></thead><tbody></tbody></table></div>
</section>
</main>

<script id="data" type="application/json">__DATA__</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.30.2/cytoscape.min.js"></script>
<script>
(function(){
const D = JSON.parse(document.getElementById('data').textContent);
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const md = s => esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>');
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const secKey = s => s.split(/[.]/).flatMap(p => p.match(/\d+|[a-z]+/g)).map(p => /\d/.test(p) ? p.padStart(4,'0') : p).join('.');
$('#gen').textContent = D.generated_at.replace('T',' ').replace('+00:00',' UTC');

const live = D.clauses.filter(c => !c.excluded);
const norm = live.filter(c => c.status === 'normative');
const byId = Object.fromEntries(live.map(c => [c.id, c]));
const decBy = Object.fromEntries(D.decisions.map(d => [d.number, d]));
const secBy = Object.fromEntries(D.sections.map(s => [s.id, s]));
const cnt = (a, f) => a.filter(f).length;
const stc = s => cnt(D.checks, c => c.status === s);

// ---------- tiles
const tiles = [
  [norm.length, 'normative clauses'],
  [cnt(norm, c => c.level==='MUST'), 'MUST / REQUIRED'],
  [cnt(norm, c => c.level==='SHOULD'), 'SHOULD / RECOMMENDED'],
  [cnt(norm, c => c.level==='MAY'), 'MAY / OPTIONAL'],
  [cnt(live, c => c.status==='pending'), '§16 pending sentences'],
  [cnt(norm, c => c.level==='MUST' && c.coverage==='exact') + ' / ' + cnt(norm, c => c.level==='MUST'), 'MUSTs with a test'],
  [D.decisions.length, 'locked decisions'],
  [`${stc('fail')} · ${stc('warn')} · ${stc('info')}`, 'checks fail · warn · info'],
];
$('#tiles').innerHTML = tiles.map(([b, s]) => `<div class="tile"><b>${b}</b><span>${s}</span></div>`).join('');

// ---------- detail panel
function detail(id){
  const [t, k] = [id.split(':')[0], id.slice(id.indexOf(':')+1)];
  let h = '';
  if (t === 'cl'){
    const c = byId[k];
    h = `<h3><span class="lv ${c.status==='pending'?'pending':c.level}">${c.status==='pending'?'pending '+c.level:c.level}</span> ${c.id}</h3>
      <p class="small muted">§${c.section} ${md(c.heading)} · line ${c.line} · side <b>${c.side}</b> · test: ${c.coverage}</p>
      ${c.label?`<p class="small"><b>${md(c.label)}</b></p>`:''}<p>${md(c.text)}</p>
      ${c.refs.length?`<p class="small">refs: ${c.refs.map(r=>`<a href="#" data-n="sec:${r}">§${r}</a>`).join(' ')}</p>`:''}
      ${(c.decisions.concat(c.decisions_nearby||[])).length?`<p class="small">decisions: ${c.decisions.concat(c.decisions_nearby||[]).map(n=>`<a href="#" data-n="dec:${n}">#${n}</a>`).join(' ')}</p>`:''}`;
  } else if (t === 'dec'){
    const d = decBy[+k];
    h = `<h3>#${d.number} ${md(d.title)}</h3><p class="small muted">session ${d.session}${d.inferred?' (inferred)':''} · grounding <b>${d.grounding}</b>${d.class?' · class '+d.class:''}</p>
      <p class="small">spec §: ${d.spec_sections.map(r=>`<a href="#" data-n="sec:${r.section}">§${r.section}</a><span class="muted">(${r.via})</span>`).join(' ')||'—'}</p>
      <p class="small">${md(d.text)}</p>`;
  } else if (t === 'sec'){
    const s = secBy[k];
    const cs = live.filter(c => c.section === k);
    h = `<h3>§${s.id} ${md(s.heading)}</h3><p class="small muted">line ${s.line} · ${s.n_lines} lines · ${s.mode}</p>
      ${cs.map(c=>`<p class="small"><a href="#" data-n="cl:${c.id}">${c.id}</a> <span class="lv ${c.level}">${c.level}</span> ${md(c.text.slice(0,140))}${c.text.length>140?'…':''}</p>`).join('')||'<p class="muted small">No keyword sentences.</p>'}`;
  } else if (t === 'inv'){
    const i = D.invariants.find(x => x.id === k);
    h = `<h3>Invariant ${i.id}</h3><p>${md(i.text)}</p>`;
  } else if (t === 'test'){
    const tt = D.tests.find(x => x.id === k);
    h = `<h3>${esc(tt.id)}</h3><p><span class="st ${tt.status}">${tt.status}</span> ${esc(tt.title)}</p>`;
  }
  $('#detail').innerHTML = h;
}
$('#detail').addEventListener('click', e => { const n = e.target.dataset.n; if (n){ e.preventDefault(); focusNode(n, false); }});

// ---------- graph
let cy = null;
const G = D.graph;
function colorOf(n){
  if (n.type==='invariant') return css('--inv');
  if (n.type==='decision') return css('--accent');
  if (n.type==='section') return css('--sec');
  if (n.type==='test') return css('--test');
  if (n.status==='pending') return css('--sec');
  return css({MUST:'--fail',SHOULD:'--warn',MAY:'--may'}[n.level]);
}
function buildGraph(){
  if (!window.cytoscape){ $('#cy').innerHTML = '<p style="padding:12px" class="muted">cytoscape.js did not load (offline?). The matrix, timeline and tables below still work.</p>'; return; }
  const nodes = G.nodes.map(n => ({data:{...n, id:n.id, label:n.label, color:colorOf(n),
     size: n.type==='invariant'?34:n.type==='decision'?22:n.type==='section'?18:n.type==='test'?12:10}}));
  const ids = new Set(G.nodes.map(n=>n.id));
  const edges = G.edges.filter(e => ids.has(e.source) && ids.has(e.target)).map((e,i) => ({data:{id:'e'+i, ...e}}));
  cy = cytoscape({container: $('#cy'), elements: nodes.concat(edges), wheelSensitivity: .25,
    style: [
      {selector:'node', style:{'background-color':'data(color)', width:'data(size)', height:'data(size)', label:'data(label)', 'font-size':8, color:css('--soft'), 'text-valign':'bottom', 'text-margin-y':2, 'min-zoomed-font-size':7}},
      {selector:'node[type="clause"][coverage="none"]', style:{'background-opacity':.15, 'border-width':2, 'border-color':'data(color)'}},
      {selector:'node[type="decision"]', style:{'font-size':10, color:css('--accent'), 'font-weight':600}},
      {selector:'node[type="invariant"]', style:{'font-size':11, color:css('--ink'), 'font-weight':700, shape:'diamond'}},
      {selector:'node[type="section"]', style:{shape:'round-rectangle', 'font-size':9}},
      {selector:'edge', style:{width:1, 'line-color':css('--rule'), 'curve-style':'bezier', opacity:.8}},
      {selector:'edge[type="cites"],edge[type="cites-nearby"]', style:{'line-color':css('--accent'), width:1.5}},
      {selector:'edge[type="names"]', style:{'line-color':css('--accent'), opacity:.45}},
      {selector:'edge[type="shares-token"]', style:{'line-style':'dotted', 'line-color':css('--accent'), opacity:.35}},
      {selector:'edge[type="amends"],edge[type="supersedes"],edge[type="corrects"],edge[type="refines"],edge[type="resolves"],edge[type="extends"]',
        style:{'line-color':css('--fail'), width:2, 'target-arrow-shape':'triangle', 'target-arrow-color':css('--fail'), label:'data(type)', 'font-size':7, color:css('--fail')}},
      {selector:'edge[type="states"]', style:{'line-color':css('--ink'), width:2}},
      {selector:'edge[type^="tests"]', style:{'line-color':css('--test')}},
      {selector:'.faded', style:{opacity:.07}},
      {selector:':selected', style:{'border-width':3, 'border-color':css('--ink')}},
    ]});
  cy.on('tap','node', e => detail(e.target.id()));
  cy.on('dbltap','node', e => focusNode(e.target.id(), true));
  applyFilters();
}
function layout(){
  if (!cy) return;
  const name = $('#flay').value, vis = cy.elements(':visible');
  const opts = {name, animate:false, fit:true, padding:20};
  if (name==='cose') Object.assign(opts,{nodeRepulsion:6000, idealEdgeLength:45, numIter:1200, randomize:true});
  if (name==='concentric') Object.assign(opts,{concentric:n=>({invariant:5,decision:4,section:3,clause:1,test:0})[n.data('type')]??0, levelWidth:()=>1, minNodeSpacing:6});
  if (name==='breadthfirst') Object.assign(opts,{directed:false, roots: cy.nodes('[type="invariant"]:visible'), spacingFactor:.9});
  vis.layout(opts).run();
}
function applyFilters(){
  if (!cy) return;
  const lv = new Set($$('.flv:checked').map(x=>x.value));
  const dsel = $('#fdec').value, ssel = $('#fsec').value;
  cy.batch(() => {
    cy.elements().style('display','element').removeClass('faded');
    cy.nodes('[type="clause"]').forEach(n => {
      const ok = n.data('status')==='pending' ? lv.has('pending') : lv.has(n.data('level'));
      if (!ok) n.style('display','none');
    });
    if (!$('#ftok').checked) cy.edges('[type="shares-token"]').style('display','none');
    if (!$('#fsecref').checked) cy.edges('[type="refs"]').style('display','none');
    let keep = null;
    if (dsel){
      const d = cy.$id('dec:'+dsel);
      keep = d.closedNeighborhood();
      keep = keep.union(keep.nodes('[type="section"]').neighborhood('node[type="clause"]'));
    }
    if (ssel){
      const s = cy.$id('sec:'+ssel);
      const sub = cy.nodes('[type="section"]').filter(n => n.id()==='sec:'+ssel || n.id().startsWith('sec:'+ssel+'.'));
      const k2 = sub.union(sub.neighborhood());
      keep = keep ? keep.intersection(k2).union(cy.$id('dec:'+dsel)).union(s) : k2;
    }
    if (keep){
      cy.nodes().not(keep).style('display','none');
    }
  });
  layout();
}
function focusNode(id, isolate){
  detail(id);
  if (!cy) return;
  const n = cy.$id(id);
  if (!n.length) return;
  if (isolate){
    cy.elements().addClass('faded');
    n.closedNeighborhood().removeClass('faded');
  }
  cy.$(':selected').unselect(); n.select();
  if (n.visible()) cy.animate({center:{eles:n}, zoom:Math.max(cy.zoom(),1.2)}, {duration:300});
  $('#cy').scrollIntoView({behavior:'smooth', block:'center'});
}
for (const d of D.decisions) $('#fdec').insertAdjacentHTML('beforeend', `<option value="${d.number}">#${d.number} ${esc(d.title.slice(0,50))}</option>`);
for (const s of D.sections.filter(s => s.id!=='0' && s.id.indexOf('.')<0)) $('#fsec').insertAdjacentHTML('beforeend', `<option value="${s.id}">§${s.id} ${esc(s.heading.slice(0,40))}</option>`);
$$('.flv,#fdec,#fsec,#ftok,#fsecref').forEach(x => x.addEventListener('change', applyFilters));
$('#flay').addEventListener('change', layout);
$('#freset').addEventListener('click', () => { $$('.flv').forEach(x=>x.checked=true); $('#fdec').value=''; $('#fsec').value=''; $('#ftok').checked=false; $("#fsecref").checked=false; applyFilters(); });

// ---------- matrix
(function(){
  const t = $('#matrix');
  let h = '<thead><tr><th>§</th><th>section</th><th>MUST</th><th>SHOULD</th><th>MAY</th></tr></thead><tbody>';
  const maxN = Math.max(...D.matrix.flatMap(r => ['MUST','SHOULD','MAY'].map(L => r[L].n)));
  for (const r of D.matrix){
    h += `<tr><td class="mono">§${r.section}</td><td>${md(r.heading)}${r.mode==='pending'?' <span class="lv pending">§16</span>':''}</td>`;
    for (const L of ['MUST','SHOULD','MAY']){
      const c = r[L];
      if (!c.n){ h += '<td class="cell empty">·</td>'; continue; }
      const a = (0.10 + 0.45 * c.n / maxN).toFixed(2);
      const v = {MUST:'--fail',SHOULD:'--warn',MAY:'--may'}[L];
      const pct = Math.round(100 * c.exact / c.n);
      h += `<td class="cell" data-sec="${r.section}" data-lv="${L}" style="background:color-mix(in srgb,var(${v}) ${Math.round(a*100)}%,transparent)" title="${c.exact} tested, ${c.section} section-level, ${c.n-c.exact-c.section} untested">
        <b>${c.n}</b><div class="bar"><i style="width:${pct}%"></i></div></td>`;
    }
    h += '</tr>';
  }
  t.innerHTML = h + '</tbody>';
  t.addEventListener('click', e => { const td = e.target.closest('td.cell'); if (!td || !td.dataset.sec) return;
    $('#q').value = '§'+td.dataset.sec+' '; $('#qlv').value = td.dataset.lv; renderTable(); $('#ctable').scrollIntoView({behavior:'smooth'}); });
})();

// ---------- timeline
(function(){
  const gcol = {normative:'--pass', pending:'--warn', 'token-only':'--may', none:'--sec'};
  $('#tl-legend').innerHTML = Object.entries(gcol).map(([k,v]) => `<span><i class="dot" style="background:var(${v})"></i>${k}</span>`).join('') + '<span><i class="dot" style="background:var(--fail)"></i>relation arc</span>';
  const sess = D.decisions.map(d => d.session||0), maxS = Math.max(...sess)+1, minS = Math.min(...sess)-1;
  const W = Math.max(760, (maxS-minS)*30), H = 340, pad = 30, base = H-40;
  const x = s => pad + (s-minS)/(maxS-minS)*(W-2*pad);
  const stack = {}, pos = {};
  for (const d of D.decisions){ const k = d.session; stack[k] = (stack[k]||0)+1; pos[d.number] = [x(k), base - stack[k]*18]; }
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Decision timeline">`;
  s += `<line x1="${pad}" x2="${W-pad}" y1="${base+10}" y2="${base+10}" stroke="var(--rule)"/>`;
  for (let k = minS+1; k < maxS; k++) if (stack[k] || k % 5 === 0) s += `<text x="${x(k)}" y="${base+26}" font-size="10" text-anchor="middle" fill="var(--soft)">${k}</text>`;
  s += `<text x="${W-pad}" y="${H-2}" font-size="10" text-anchor="end" fill="var(--soft)">session →</text>`;
  for (const r of D.relations){
    const a = pos[r.from], b = pos[r.to]; if (!a || !b) continue;
    const mx = (a[0]+b[0])/2, my = Math.min(a[1],b[1]) - 20 - Math.abs(a[0]-b[0])*.25;
    s += `<path d="M${a[0]},${a[1]} Q${mx},${Math.max(my,6)} ${b[0]},${b[1]}" fill="none" stroke="var(--fail)" stroke-width="1.4" opacity=".7" ${r.source==='curated'?'stroke-dasharray="4 3"':''}><title>#${r.from} ${r.type} #${r.to}${r.why?' — '+esc(r.why):''}</title></path>`;
  }
  for (const d of D.decisions){
    const [cx, cy_] = pos[d.number];
    s += `<g class="tl-dot" data-n="${d.number}"><circle cx="${cx}" cy="${cy_}" r="8" fill="var(${gcol[d.grounding]})" ${d.inferred?'fill-opacity=".45"':''}/><text x="${cx}" y="${cy_+3}" font-size="7.5" text-anchor="middle" fill="#fff" pointer-events="none">${d.number}</text><title>#${d.number} ${esc(d.title)} (session ${d.session}${d.inferred?', inferred':''}; ${d.grounding}${d.class?', '+d.class:''})</title></g>`;
  }
  $('#timeline').innerHTML = s + '</svg>';
  $('#timeline').addEventListener('click', e => { const g = e.target.closest('.tl-dot'); if (g){ $('#fdec').value = g.dataset.n; applyFilters(); focusNode('dec:'+g.dataset.n, false); }});
})();

// ---------- checks
function renderChecks(){
  const on = new Set($$('.fst:checked').map(x=>x.value)), cov = $('#fcov').checked;
  const order = {fail:0, warn:1, info:2, pass:3};
  const cs = D.checks.filter(c => on.has(c.status) && (cov || !c.id.startsWith('coverage.must.'))).sort((a,b)=>order[a.status]-order[b.status]);
  $('#checks').innerHTML = cs.map(c => `<details><summary><span class="st ${c.status}">${c.status}</span> ${md(c.title)} <span class="muted small mono">${esc(c.id)}</span></summary>
    <div class="det">${md(c.detail).replace(/\b([CP]-[\d.]+[a-z]?-\d{2})\b/g,'<a href="#" data-n="cl:$1">$1</a>')}
    ${c.spec_refs.length?'<br>'+c.spec_refs.map(r=>`<span class="pill">${r}</span>`).join(''):''}${c.decisions.length?' '+c.decisions.map(r=>`<span class="pill">${r}</span>`).join(''):''}</div></details>`).join('') || '<p class="muted">Nothing to show.</p>';
}
$$('.fst,#fcov').forEach(x => x.addEventListener('change', renderChecks));
$('#checks').addEventListener('click', e => { const n = e.target.dataset.n; if (n){ e.preventDefault(); focusNode(n, true); }});
renderChecks();

// ---------- clause table
for (const s of [...new Set(live.map(c=>c.side))].sort()) $('#qside').insertAdjacentHTML('beforeend', `<option>${s}</option>`);
function renderTable(){
  const q = $('#q').value.trim().toLowerCase(), lv = $('#qlv').value, sd = $('#qside').value, st = $('#qst').value;
  const terms = q.split(/\s+/).filter(Boolean);
  const rows = live.filter(c => (!lv || c.level===lv) && (!sd || c.side===sd) && (!st || c.status===st) &&
    terms.every(t => {
      if (t.startsWith('§')) return c.section === t.slice(1) || c.section.startsWith(t.slice(1)+'.') || c.refs.includes(t.slice(1));
      if (/^#\d+$/.test(t)) return c.decisions.concat(c.decisions_nearby||[]).includes(+t.slice(1)) || (decBy[+t.slice(1)]?.section_clauses||[]).includes(c.id);
      return (c.id+' '+c.text+' '+c.heading+' '+c.side).toLowerCase().includes(t);
    }));
  $('#qn').textContent = rows.length + ' of ' + live.length;
  $('#ctable tbody').innerHTML = rows.map(c => `<tr>
    <td class="mono"><a href="#" data-n="cl:${c.id}">${c.id}</a><div class="muted small">line ${c.line}</div></td>
    <td><span class="lv ${c.status==='pending'?'pending':c.level}">${c.level}</span>${c.coverage!=='none'?'<div class="small" style="color:var(--pass)">'+c.coverage+'</div>':''}</td>
    <td class="small">${c.side}</td>
    <td>${c.label?'<b>'+md(c.label)+'</b> ':''}${md(c.text)}<div class="muted small">§${c.section} ${md(c.heading)}</div></td>
    <td class="small">${c.refs.map(r=>'§'+r).join(' ')} ${c.decisions.concat(c.decisions_nearby||[]).map(n=>'#'+n).join(' ')}</td></tr>`).join('');
}
$$('#q,#qlv,#qside,#qst').forEach(x => x.addEventListener('input', renderTable));
$('#ctable').addEventListener('click', e => { const n = e.target.dataset.n; if (n){ e.preventDefault(); focusNode(n, true); }});
renderTable();

// ---------- prose
$('#prose tbody').innerHTML = D.lowercase.map(s => `<tr><td class="mono">§${s.section}</td><td><span class="st warn">${esc(s.word)}</span></td><td>${md(s.text)}<div class="muted small">line ~${s.line}</div></td></tr>`).join('')
  + D.absolutes.map(s => `<tr><td class="mono">§${s.section}</td><td><span class="st info">absolute</span></td><td>${md(s.text)}<div class="muted small">line ~${s.line}</div></td></tr>`).join('');

buildGraph();
})();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    sys.exit(main())
