#!/usr/bin/env python3
"""Build conformance/index.html: one page joining every tool's results to the intent ledger.

Reads conformance/intents.json and every conformance/<area>/out/summary.json,
joins each check to the intents it bears on (shared spec section or decision),
and writes a self-contained dashboard. Stdlib only. Run from anywhere:

    python3 conformance/build_dashboard.py
"""
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
AREAS = [
    ("clauses", "Clause register", "Every MUST/SHOULD/MAY in the spec, given an ID and linked to decisions and tests."),
    ("schemas", "Schemas & grammar", "Wire-document schemas and directive-grammar fixtures, run against blygger-studio and any implementation with an adapter."),
    ("live", "Live network", "A read-only crawl of every known blyg, checking invariants that span origins."),
    ("alloy", "Alloy model", "A formal model of the protocol's rules; the solver searches for counterexamples."),
    ("model", "Property tests", "Random action sequences run through a spec-derived model and the real blygger-studio importer."),
]
RANK = {"fail": 4, "warn": 3, "pass": 2, "info": 1}


def sec_key(ref):
    m = re.search(r"§\s*(\d+(?:\.\d+)*[a-z]?)", str(ref))
    return m.group(1) if m else None


def ref_matches(intent_ref, check_ref):
    a, b = sec_key(intent_ref), sec_key(check_ref)
    return bool(a and b) and (b == a or b.startswith(a + "."))


def load():
    intents = json.loads((ROOT / "intents.json").read_text())["intents"]
    areas = []
    for key, name, blurb in AREAS:
        p = ROOT / key / "out" / "summary.json"
        data = json.loads(p.read_text()) if p.exists() else None
        checks = (data or {}).get("checks", [])
        for c in checks:
            c["area"] = key
            c["status"] = c.get("status", "info")
        report = (ROOT / key / "out" / "report.html").exists()
        areas.append({"key": key, "name": name, "blurb": blurb, "present": data is not None,
                      "generated_at": (data or {}).get("generated_at"), "checks": checks, "report": report})
    return intents, areas


def join(intents, areas):
    allc = [c for a in areas for c in a["checks"]]
    for i in intents:
        ev = []
        for c in allc:
            if i.get("areas") and c["area"] in i["areas"] and not i["spec_refs"]:
                hit = True
            else:
                hit = any(ref_matches(r, cr) for r in i["spec_refs"] for cr in c.get("spec_refs", [])) \
                    or bool(set(i["decisions"]) & set(c.get("decisions", [])))
            if hit:
                ev.append(c)
        ev.sort(key=lambda c: -RANK.get(c["status"], 0))
        i["evidence"] = ev
        i["status"] = ev[0]["status"] if ev else "none"
    return allc


def main():
    intents, areas = load()
    allc = join(intents, areas)
    payload = {"intents": intents, "areas": areas,
               "built": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    data = json.dumps(payload).replace("</", "<\\/")
    out = TEMPLATE.replace("__DATA__", data)
    (ROOT / "index.html").write_text(out)
    counts = {s: sum(1 for c in allc if c["status"] == s) for s in RANK}
    print(f"wrote {ROOT / 'index.html'}: {len(allc)} checks {counts}, {len(intents)} intents")


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blygger Conformance Dashboard</title>
<style>
:root{--bg:#f6f4ef;--paper:#fff;--ink:#1d1d1b;--soft:#5b5a55;--rule:#dedad0;--accent:#2b5bab;--pass:#2f7a45;--warn:#a46a00;--fail:#a23b3b;--info:#5b5a55;--code:#f1efe9}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171716;--paper:#201f1d;--ink:#e9e6df;--soft:#a5a29a;--rule:#38362f;--accent:#7fa6ea;--pass:#6cc08a;--warn:#e0a84a;--fail:#e07a7a;--info:#a5a29a;--code:#2a2925}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:1040px;margin:0 auto;padding:32px 16px 240px}
h1{font-size:30px;margin:0 0 4px}h2{font-size:22px;margin:36px 0 6px}
.sub{color:var(--soft);margin:0 0 20px;max-width:760px}
a{color:var(--accent)}
.card{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:18px 20px;margin:0 0 16px}
.pill{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 9px;border-radius:99px;border:1px solid currentColor;white-space:nowrap}
.s-pass{color:var(--pass)}.s-warn{color:var(--warn)}.s-fail{color:var(--fail)}.s-info,.s-none{color:var(--info)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:18px 0}
.stat{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:12px 14px}
.stat b{display:block;font-size:28px;line-height:1.1}
.stat span{font-size:13px;color:var(--soft)}
.bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--rule);margin-top:8px}
.bar i{display:block}
.areas{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.areas .card{margin:0}
.areas h3{margin:0 0 4px;font-size:17px}
.muted{color:var(--soft);font-size:13px}
blockquote{margin:10px 0;padding:6px 12px;border-left:3px solid var(--accent);color:var(--ink);font-style:italic}
.gap,.reading{font-size:14px;background:var(--code);border-radius:8px;padding:8px 12px;margin:10px 0}
.intent h3{margin:0;font-size:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ev{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}
.ev td{border-top:1px solid var(--rule);padding:6px 6px;vertical-align:top}
.ev td:first-child{width:72px}
details summary{cursor:pointer;color:var(--accent);font-size:14px;margin-top:6px}
textarea{width:100%;min-height:56px;margin-top:12px;padding:10px;border:1px solid var(--rule);border-radius:8px;background:var(--bg);color:var(--ink);font:14px/1.4 inherit;resize:vertical}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px}
.filters input,.filters select{padding:7px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink);font:inherit;font-size:14px}
.filters input{flex:1;min-width:180px}
table.all{width:100%;border-collapse:collapse;font-size:14px;background:var(--paper);border:1px solid var(--rule);border-radius:10px;overflow:hidden}
table.all th,table.all td{padding:7px 9px;border-bottom:1px solid var(--rule);text-align:left;vertical-align:top}
table.all th{color:var(--soft);font-weight:600}
.tablewrap{overflow-x:auto}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em;background:var(--code);padding:1px 4px;border-radius:4px}
.float{position:fixed;right:16px;bottom:16px;width:min(340px,calc(100vw - 32px));background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:12px;box-shadow:0 6px 24px rgba(0,0,0,.18)}
.float textarea{margin-top:6px;min-height:60px}.float label{font-size:13px;font-weight:600}
button{margin-top:8px;width:100%;padding:9px;border:0;border-radius:8px;background:var(--accent);color:#fff;font-weight:600;cursor:pointer}
</style>
</head>
<body>
<main>
<h1>Blygger conformance dashboard</h1>
<p class="sub">Does the spec do what it is meant to do? Each intention below is linked to the spec sections and decisions meant to deliver it, and to the evidence from five independent tools. <b>A clause can pass while its intention fails</b>, and those are the cases this page is built to surface. Start with the <a href="reports/2026-10-03-first-round.html">first-round report</a>.</p>
<div id="stats" class="stats"></div>

<h2>Intent ledger</h2>
<p class="sub">Intentions are quoted from your posts, the decisions and the spec. An intention's status is the worst status among the checks that bear on it. Under each one, write whether it's what you meant and where the reading is wrong. The button at the bottom right copies every note you've written so you can paste them as a reply.</p>
<div id="intents"></div>

<h2>The five tools</h2>
<div id="areas" class="areas"></div>

<h2>All checks</h2>
<div class="filters">
  <input id="q" placeholder="Search checks, sections, decisions…">
  <select id="fs"><option value="">all statuses</option><option>fail</option><option>warn</option><option>pass</option><option>info</option></select>
  <select id="fa"><option value="">all tools</option></select>
</div>
<div class="tablewrap"><table class="all"><thead><tr><th>Status</th><th>Tool</th><th>Check</th><th>Spec</th><th>Decisions</th></tr></thead><tbody id="rows"></tbody></table></div>
<p class="muted" id="built"></p>
</main>

<div class="float">
<label for="general">General notes</label>
<textarea id="general" placeholder="Anything not tied to one intention…"></textarea>
<button id="copy">Copy all notes</button>
</div>

<script>
const D = __DATA__;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pill = s => `<span class="pill s-${s}">${s === "none" ? "no evidence" : s}</span>`;
const all = D.areas.flatMap(a => a.checks);
const cnt = s => all.filter(c => c.status === s).length;
const colors = {fail:"var(--fail)",warn:"var(--warn)",pass:"var(--pass)",info:"var(--info)"};
const bar = list => { const n = list.length || 1; return `<div class="bar">${["fail","warn","pass","info"].map(s => `<i style="width:${100*list.filter(c=>c.status===s).length/n}%;background:${colors[s]}"></i>`).join("")}</div>`; };

document.getElementById("stats").innerHTML = [
  ["Intentions", D.intents.length, D.intents.filter(i => i.status === "fail").length + " with failing evidence"],
  ["Checks", all.length, D.areas.filter(a => a.present).length + " of 5 tools reporting"],
  ["Failing", cnt("fail"), "MUST-level or counterexample"],
  ["Warnings", cnt("warn"), "SHOULD-level or untested"],
  ["Passing", cnt("pass"), "within the stated scope"],
].map(([k, v, s]) => `<div class="stat"><span>${k}</span><b>${v}</b><span>${s}</span></div>`).join("");

document.getElementById("intents").innerHTML = D.intents.map(i => `
<div class="card intent" data-topic="${esc(i.id + " " + i.title)}">
  <h3>${pill(i.status)} <span>${esc(i.id)} · ${esc(i.title)}</span></h3>
  <blockquote>${esc(i.quote)}</blockquote>
  <div class="muted">${esc(i.source)} · ${i.spec_refs.map(esc).join(", ") || "no spec section"} · ${i.decisions.map(esc).join(", ")}</div>
  ${i.suspected_gap ? `<div class="gap"><b>Suspected gap:</b> ${esc(i.suspected_gap)}</div>` : ""}
  ${i.reading ? `<div class="reading"><b>Reading confirmed:</b> ${esc(i.reading)}</div>` : ""}
  ${bar(i.evidence)}
  <details ${i.status === "fail" ? "open" : ""}><summary>${i.evidence.length} checks bear on this</summary>
  <table class="ev">${i.evidence.map(c => `<tr><td>${pill(c.status)}</td><td><b>${esc(c.title)}</b> <span class="muted">· ${esc(c.area)}${c.id ? " · " + esc(c.id) : ""}</span><br><span class="muted">${esc(c.detail)}</span></td></tr>`).join("") || "<tr><td></td><td class='muted'>No tool produced evidence for this intention yet.</td></tr>"}</table>
  </details>
  <textarea placeholder="Is this what you intended? Where is this reading wrong?"></textarea>
</div>`).join("");

document.getElementById("areas").innerHTML = D.areas.map(a => `
<div class="card"><h3>${esc(a.name)}</h3><div class="muted">${esc(a.blurb)}</div>
${a.present ? `${bar(a.checks)}<div class="muted" style="margin-top:6px">${a.checks.length} checks · ${["fail","warn","pass","info"].map(s => a.checks.filter(c=>c.status===s).length + " " + s).join(" · ")}</div>
${a.report ? `<p style="margin:8px 0 0"><a href="${a.key}/out/report.html">Open the full report →</a></p>` : ""}` : `<p class="muted">Not run yet.</p>`}</div>`).join("");

const fa = document.getElementById("fa");
D.areas.forEach(a => fa.insertAdjacentHTML("beforeend", `<option value="${a.key}">${esc(a.name)}</option>`));
function render() {
  const q = document.getElementById("q").value.toLowerCase(), s = document.getElementById("fs").value, a = fa.value;
  const rank = {fail:0,warn:1,pass:2,info:3};
  document.getElementById("rows").innerHTML = all
    .filter(c => (!s || c.status === s) && (!a || c.area === a) && (!q || JSON.stringify(c).toLowerCase().includes(q)))
    .sort((x, y) => rank[x.status] - rank[y.status])
    .map(c => `<tr><td>${pill(c.status)}</td><td>${esc(c.area)}</td><td><b>${esc(c.title)}</b><br><span class="muted">${esc(c.detail)}</span></td><td>${(c.spec_refs||[]).map(esc).join(", ")}</td><td>${(c.decisions||[]).map(esc).join(", ")}</td></tr>`).join("");
}
["q","fs","fa"].forEach(id => document.getElementById(id).addEventListener("input", render));
render();
document.getElementById("built").textContent = "Built " + D.built + ". Rebuild with: python3 conformance/build_dashboard.py";

document.getElementById("copy").addEventListener("click", async e => {
  const parts = [];
  document.querySelectorAll(".intent").forEach(s => { const t = s.querySelector("textarea").value.trim(); if (t) parts.push("## " + s.dataset.topic + "\n" + t); });
  const g = document.getElementById("general").value.trim(); if (g) parts.push("## General\n" + g);
  const text = parts.join("\n\n") || "(no notes)";
  try { await navigator.clipboard.writeText(text); } catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  e.target.textContent = "Copied ✓"; setTimeout(() => e.target.textContent = "Copy all notes", 1500);
});
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
