// out/report.html: one section per fixture group, one row per case.
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const GROUPS = {
  grammar: "Grammar (§10.1)", code: "Inert in code (§10.1, #54)", label: "Labels (§10.1, §10.2, #70, #81)", partial: "Partial transclusion (§10.1–§10.3, #49)",
  resolution: "Resolution and errors (§10.2)", urls: "Absolute URLs and pages (§5.2, §5.8)", disclosure: "Disclosure (§10.3, §10.3a)", generation: "Generation wrappers (§5.7)",
};

export function renderReport({ summary, fixtures, outcomes, results }) {
  const byId = Object.fromEntries(outcomes.map((o) => [o.id, o]));
  const c = summary.counts;
  const groups = [...new Set(fixtures.map((f) => f.group))];
  const pill = (s) => `<span class="b ${s}">${s}</span>`;
  const row = (fx) => {
    const o = byId[fx.id], r = results[fx.id] || {};
    const bad = o.checks.filter((k) => k.status !== "pass");
    const exp = fx.expect;
    return `<tr id="${esc(fx.id)}"><td>${pill(o.status)}</td><td><b>${esc(fx.title)}</b><div class="sub"><code>${esc(fx.id)}</code> · ${fx.spec_refs.map(esc).join(", ")}${fx.decisions.length ? " · " + fx.decisions.map(esc).join(", ") : ""}${fx.clauses.length ? " · " + fx.clauses.map(esc).join(", ") : ""}</div>
${bad.length ? `<ul class="probs">${bad.map((k) => `<li><b>${esc(k.name)}</b> ${pill(k.status)} ${esc(k.detail)}</li>`).join("")}</ul>` : ""}
${fx.ambiguous ? `<div class="amb"><b>Ambiguous text.</b> ${esc(fx.ambiguous)}</div>` : ""}
<details><summary>input and output</summary>
<div class="grid"><div><div class="sub">content_md (${esc(fx.kind)})</div><pre>${esc(fx.content_md)}</pre></div>
<div><div class="sub">expected ${exp.error === true ? "" : "content_html (normative parts compared)"}</div><pre>${exp.error === true ? "publish error" : esc(exp.content_html)}</pre></div>
<div><div class="sub">got</div><pre>${r.error ? "publish error: " + esc(r.error) : esc(r.content_html ?? "(nothing)")}</pre></div></div>
${exp.error === true ? "" : `<div class="sub">normative projection, expected</div><pre class="wide">${esc(JSON.stringify(exp.normative))}</pre>`}
${!r.error && exp.transclusions ? `<div class="sub">transclusions[] got</div><pre class="wide">${esc(JSON.stringify(r.transclusions))}</pre>` : ""}
${!r.error && exp.links ? `<div class="sub">links[] got</div><pre class="wide">${esc(JSON.stringify(r.links))}</pre>` : ""}
</details></td></tr>`;
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Blygger Reader Suite</title>
<style>
:root{--bg:#f6f4ef;--paper:#fff;--ink:#1d1d1b;--soft:#5b5a55;--rule:#dedad0;--accent:#2b5bab;--pass:#2f7a45;--warn:#a46a00;--fail:#a23b3b;--code:#f1efe9}
@media (prefers-color-scheme:dark){:root{--bg:#161614;--paper:#1f1f1c;--ink:#ecebe6;--soft:#a3a197;--rule:#3a3933;--accent:#8fb1ec;--pass:#6cc48a;--warn:#e0a83c;--fail:#ec7d7d;--code:#2a2a26}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:24px 16px 64px}h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 10px;border-bottom:1px solid var(--rule);padding-bottom:4px}
code,pre{font:12.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--code);border-radius:4px}code{padding:1px 4px}pre{padding:8px;margin:2px 0 8px;white-space:pre-wrap;word-break:break-word}
.sub{color:var(--soft);font-size:12.5px}.b{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}
.b.pass{color:var(--pass)}.b.warn{color:var(--warn)}.b.fail{color:var(--fail)}.b.skip,.b.info,.b.unreported{color:var(--soft)}
table{border-collapse:collapse;width:100%;font-size:13.5px;background:var(--paper)}td{border-bottom:1px solid var(--rule);padding:8px;vertical-align:top}td:first-child{width:56px}
.tiles{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.tile{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:10px 14px;min-width:120px}.tile b{display:block;font-size:22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:6px}.probs{margin:6px 0;padding-left:18px}.amb{color:var(--warn);font-size:13px;margin-top:4px}
summary{cursor:pointer;color:var(--accent);font-size:13px;margin-top:4px}
</style></head><body><main>
<h1>Reader suite: ${esc(summary.renderer)}</h1>
<div class="sub">${summary.fixtures} fixtures written from <b>${esc(summary.snapshot)}</b> (${esc(summary.text)}). Generated ${esc(summary.generated_at)}. Only the normative parts of <code>content_html</code> are compared: wire wrappers and their <code>data-blyg-*</code> attributes, anchors and hrefs, and absolute URLs (lib/html.mjs). A failing case whose text is ambiguous is a warning. A case that passed what was checked but whose renderer left out an expected array (<code>links[]</code>, <code>transclusions[]</code>, <code>generated[]</code>) is <i>unreported</i>, not a pass.</div>
<div class="tiles"><div class="tile"><b class="y">${c.pass}</b>pass</div><div class="tile"><b>${c.warn}</b>warn</div><div class="tile"><b>${c.fail}</b>fail</div><div class="tile"><b>${c.unreported ?? 0}</b>unreported</div></div>
${groups.map((g) => {
    const fs = fixtures.filter((f) => f.group === g);
    const n = (s) => fs.filter((f) => byId[f.id].status === s).length;
    return `<h2>${esc(GROUPS[g] || g)} <span class="sub">${n("pass")} pass · ${n("warn")} warn · ${n("fail")} fail · ${n("unreported")} unreported</span></h2><table>${fs.map(row).join("")}</table>`;
  }).join("\n")}
</main></body></html>
`;
}
