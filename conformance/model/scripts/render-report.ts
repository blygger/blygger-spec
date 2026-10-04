// Renders out/summary.json (the toolkit output contract) and a self-contained
// out/report.html from out/model-results.json + out/studio-results.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CAMPAIGNS } from "../src/props/campaigns.ts";
import { CLAUSES, PROPS } from "../src/props/properties.ts";
import { SCENARIOS } from "../src/props/scenarios.ts";

const out = path.join(import.meta.dirname, "..", "out");
const load = (f: string) => (existsSync(path.join(out, f)) ? JSON.parse(readFileSync(path.join(out, f), "utf8")) : { results: [] });
const M = load("model-results.json");
const S = load("studio-results.json");
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type R = any;
const mainOf = (set: R, id: string) => set.results.find((r: R) => r.id === id && !r.replayOf);
const replaysOf = (set: R, id: string) => set.results.filter((r: R) => r.id === id && r.replayOf);

/**
 * Interpretation of each campaign's FAILURE, written after reading the shrunk
 * counterexamples (README "Findings"). Applied only when the campaign actually
 * fails; a campaign that starts passing falls back to plain pass.
 */
const VERDICT: Record<string, { status: "warn" | "fail" | "info"; kind: string; note: string }> = {
  "P2b": { status: "info", kind: "expected", note: "The feed is lossy by design (§7, §13.2): a feed-only poll misses entries the window never showed. Convergence is the index's job (P2), which holds. Model and studio agree." },
  "P6-pre": { status: "info", kind: "expected (pre-#57)", note: "The pre-#57 fork copied content_md and re-resolved at the forker, so it baked whatever version the forker held. This is the failure decision #57 / §16.6f fixed." },
  "P6-pre-nopartial": { status: "info", kind: "expected (pre-#57)", note: "Pre-#57, a forker without the partial grammar turned a partial into a whole quote: the selector was lost." },
  "P6-post-legacy": { status: "warn", kind: "spec ambiguity — For Fable", note: "blygger-studio's flattenFork consumes the `>` lines after every directive as part of it. For a pinned thread whose publisher predates the 2026-10-03 partial grammar (#49) those lines are the author's own blockquote — the bake shows a WHOLE quote — and the fork silently drops them, breaking §16.6f's \"own prose copied byte-exact\". The bake carries the answer (no `blyg-partial` class), so the fix is to consume the attached quote only when the baked element is partial. §16.6f should say which." },
  "P9": { status: "fail", kind: "studio bug (edge)", note: "§10.6 rule 3 is about the stub's TARGET, an (origin, id) pair. blygger-studio's applyVersionAgreement matches baked quotes by id only, so a body quoting a DIFFERENT item that shares the id (own item vs. imported target) rewrites stub_of.version. Unreachable with random 128-bit ids (§5.1), reachable with copied or colliding ids; one-line fix (compare origin too)." },
  "D1-importer": { status: "warn", kind: "studio deviation (SHOULD)", note: "§13.2: \"Any suspected gap — the previously newest-seen entry no longer in the window — falls back to an index diff.\" blygger-studio reconciles on a gap only if some feed entry also triggered a fetch (`gap && triggeredAny`, poll.ts). A window in which the newest-seen entry vanished but every visible entry is already known (e.g. a truncated feed) leaves a newer version unfetched until the 24 h periodic index sync. The model follows the sentence; no loss is permanent." },
  "D2": { status: "warn", kind: "spec ambiguity — For Fable", note: "§10.2 step 1 is \"a local, currently-published item\"; step 2 is \"otherwise an imported item\". Read literally, a local DRAFT or WITHDRAWN item with the same id falls through to the import. blygger-studio stops at any local row (\"item is a draft\" / \"item is withdrawn\"). Only reachable with id collisions, which §5.1 calls not a real case — but the order is normative text and the two readings differ. D2-shadow and D3 run under the studio's reading to look past it." },
  "D2-shadow": { status: "warn", kind: "edge", note: "Under the studio's step-1 reading the remaining divergence is a thread quoting an imported item that has the thread's OWN id." },
};

function statusOf(id: string, m: R, s: R): { status: string; kind?: string; note?: string } {
  const failed = (m && m.status === "fail") || (s && s.status === "fail");
  if (!failed) return { status: m || s ? "pass" : "info", note: m || s ? undefined : "not run" };
  return VERDICT[id] ?? { status: "fail", kind: "unclassified", note: "A new failure: read the counterexample." };
}

// ---------- summary.json ----------
const checks: R[] = [];
for (const c of CAMPAIGNS) {
  const m = mainOf(M, c.id), s = mainOf(S, c.id);
  const props = c.props.map((p) => PROPS.find((x) => x.id === p)!);
  const v = statusOf(c.id, m, s);
  const part = (r: R, who: string) => (r ? `${who}: ${r.status} (${r.numRuns} runs, seed ${r.seed}${r.path ? `, path ${r.path}` : ""}, ${r.commandsExecuted} commands)${r.failure ? ` — ${r.failure.prop}: ${r.failure.detail}` : ""}` : `${who}: not run`);
  checks.push({
    id: `model.${c.id}`,
    title: c.title ?? props.map((p) => p.title).join(" + "),
    status: v.status,
    detail: [v.kind ? `[${v.kind}] ${v.note}` : v.note, part(m, "model"), part(s, `studio ${S.studioVersion ?? "?"}`)].filter(Boolean).join(" | "),
    spec_refs: [...new Set(props.flatMap((p) => p.spec_refs))],
    decisions: [...new Set(props.flatMap((p) => p.decisions))],
    clauses: [...new Set(c.props.flatMap((p) => CLAUSES[p] ?? []))],
  });
}
for (const sc of SCENARIOS) {
  const rs = [...M.results, ...S.results].filter((r: R) => r.replayOf === `scenario:${sc.id}`);
  const m = M.results.find((r: R) => r.replayOf === `scenario:${sc.id}`), s = S.results.find((r: R) => r.replayOf === `scenario:${sc.id}`);
  const c = CAMPAIGNS.find((x) => x.id === sc.campaign)!;
  const props = c.props.map((p) => PROPS.find((x) => x.id === p)!);
  const expected = c.id.startsWith("P6-pre");
  const anyFail = rs.some((r: R) => r.status === "fail");
  checks.push({
    id: `model.scenario.${sc.id}`,
    title: `Scenario: ${sc.title}`,
    status: anyFail ? (expected ? "info" : (VERDICT[c.id]?.status ?? "fail")) : "pass",
    detail: `${m ? `model ${m.status}` : "model not run"}${m?.failure ? ` (${m.failure.detail})` : ""}; ${s ? `studio ${s.status}` : "studio not run"}${s?.failure ? ` (${s.failure.detail})` : ""}`,
    spec_refs: [...new Set(props.flatMap((p) => p.spec_refs))],
    decisions: [...new Set(props.flatMap((p) => p.decisions))],
    clauses: [...new Set(c.props.flatMap((p) => CLAUSES[p] ?? []))],
  });
}
const summary = {
  area: "model",
  title: "Stateful property tests: reference model + blygger-studio differential",
  generated_at: new Date().toISOString(),
  studio_version: S.studioVersion ?? null,
  seeds: { model: M.seed, studio: S.seed },
  runs: { model_base: M.runs, studio_base: S.runs },
  checks,
};
writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));

// ---------- report.html ----------
const LANES = ["A", "B", "L", "S", "reader", "studio"] as const;
const LANE_LABEL: Record<string, string> = { A: "origin A", B: "origin B", L: "legacy RSS L", S: "S publishes (model)", reader: "S reads (model)", studio: "S = blygger-studio" };

function swimlane(trace: R[], violStep: number): string {
  if (!trace?.length) return "";
  const colW = 128, laneH = 44, left = 132, top = 26;
  const W = left + trace.length * colW + 10, H = top + LANES.length * laneH + 10;
  const y = (l: string) => top + LANES.indexOf(l as any) * laneH + laneH / 2;
  const parts: string[] = [];
  LANES.forEach((l, i) => {
    parts.push(`<rect x="0" y="${top + i * laneH}" width="${W}" height="${laneH}" class="${i % 2 ? "lane-b" : "lane-a"}"/>`);
    parts.push(`<text x="8" y="${y(l) + 4}" class="lane-t">${esc(LANE_LABEL[l])}</text>`);
  });
  trace.forEach((st: R, k: number) => {
    const x0 = left + k * colW;
    const viol = st.n === violStep || !!st.violation;
    if (viol) parts.push(`<rect x="${x0 + 2}" y="${top - 4}" width="${colW - 4}" height="${LANES.length * laneH + 8}" class="viol"/>`);
    parts.push(`<text x="${x0 + colW / 2}" y="16" class="step-t" text-anchor="middle">${viol ? "✗ " : ""}step ${st.n}</text>`);
    const fetches = st.events.filter((e: R) => e.lane === "network");
    fetches.forEach((e: R, j: number) => {
      const m = /GET ([ABLS])\//.exec(e.label);
      if (!m) return;
      const from = e.to === "studio" ? "studio" : "reader";
      const to = m[1];
      const x = x0 + 12 + ((j * 13) % (colW - 24));
      const bad = !/→ 200/.test(e.label) || /\(/.test(e.label);
      parts.push(`<line x1="${x}" y1="${y(from)}" x2="${x}" y2="${y(to)}" class="${bad ? "arrow bad" : "arrow"}" marker-end="url(#ah)"><title>${esc(e.label)}</title></line>`);
    });
    const acts = st.events.filter((e: R) => e.lane !== "network");
    const perLane: Record<string, R[]> = {};
    for (const e of acts) (perLane[e.lane] ??= []).push(e);
    for (const [l, es] of Object.entries(perLane)) {
      if (!LANES.includes(l as any)) continue;
      const e = es[es.length - 1];
      const cls = e.kind === "diverge" ? "chip diverge" : e.kind === "fail" ? "chip failc" : e.kind === "fetch" ? "chip fetch" : "chip";
      const label = es.map((x: R) => x.label).join(" · ");
      const short = label.length > 19 ? label.slice(0, 18) + "…" : label;
      parts.push(`<g><title>${esc(label)}</title><rect x="${x0 + 6}" y="${y(l) - 11}" width="${colW - 12}" height="22" rx="5" class="${cls}"/><text x="${x0 + colW / 2}" y="${y(l) + 4}" text-anchor="middle" class="chip-t">${esc(short)}</text></g>`);
    }
  });
  return `<div class="scroll"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="swimlane of the shrunk counterexample"><defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" class="ah"/></marker></defs>${parts.join("")}</svg></div>`;
}

function stepList(trace: R[]): string {
  return `<ol class="steps">${trace.map((st: R) => `<li class="${st.violation ? "bad" : ""}"><b>${esc(st.text)}</b>${st.events.length ? `<div class="evs">${st.events.map((e: R) => `<span class="ev ${e.kind ?? ""}">${esc(e.label)}</span>`).join("")}</div>` : ""}${st.violation ? `<div class="vio">✗ ${esc(st.violation)}</div>` : ""}</li>`).join("")}</ol>`;
}

function diffObs(a: R, b: R, pre = ""): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys.flatMap((k) => diffObs(a[k], b[k], pre ? `${pre}.${k}` : k));
  }
  return [`<tr><td><code>${esc(pre)}</code></td><td><code>${esc(JSON.stringify(a)?.slice(0, 600))}</code></td><td><code>${esc(JSON.stringify(b)?.slice(0, 600))}</code></td></tr>`];
}

function stateAt(trace: R[]): string {
  const st = trace.find((s: R) => s.violation) ?? trace[trace.length - 1];
  if (!st) return "";
  if (st.studio) {
    const strip = (o: R) => ({ imports: o.imports, l0: o.l0, flags: o.flags, own: Object.fromEntries(Object.entries(o.own).map(([k, v]: any) => [k, { pinned: v.pinned, forked_from: v.forked_from, versions: v.versions.map((x: R) => ({ version: x.version, kind: x.kind, transclusions: x.transclusions, stub_of: x.stub_of, md: x.md })) }])) });
    const rows = diffObs(strip(st.model), strip(st.studio));
    return rows.length ? `<details open><summary>State diff at step ${st.n}: model vs studio (${rows.length} paths)</summary><div class="scroll"><table class="diff"><tr><th>path</th><th>model</th><th>studio</th></tr>${rows.slice(0, 40).join("")}</table></div></details>` : `<p class="soft">Model and studio observations are identical at step ${st.n}; the violation is in what both did.</p>`;
  }
  const own = st.model?.own ?? {};
  const forkIds = Object.keys(own).filter((k) => own[k].forked_from);
  const pick = forkIds.length ? Object.fromEntries(forkIds.map((k) => [k, own[k]])) : { imports: st.model?.imports };
  return `<details><summary>Model state at step ${st.n}</summary><pre class="code">${esc(JSON.stringify(pick, null, 1).slice(0, 4000))}</pre></details>`;
}

const badge = (s: string) => `<span class="badge ${s}">${s}</span>`;
function resultBlock(r: R, who: string): string {
  if (!r) return `<div class="sub"><h4>${who}</h4><p class="soft">not run</p></div>`;
  const head = `<h4>${who} ${badge(r.status)}</h4><p class="meta">${r.replayOf ? `directed replay of <code>${esc(r.replayOf)}</code>` : `${r.numRuns} runs · seed <code>${r.seed}</code>${r.path ? ` · path <code>${esc(r.path)}</code>` : ""}${r.numShrinks !== undefined ? ` · ${r.numShrinks} shrinks` : ""}`} · ${r.commandsExecuted} commands · ${Object.entries(r.hits ?? {}).map(([k, v]) => `${k}: ${v} non-vacuous checks`).join(", ") || "—"}</p>`;
  if (r.error && !r.failure) return `<div class="sub">${head}<pre class="code">${esc(String(r.error).slice(0, 1500))}</pre></div>`;
  if (!r.failure) return `<div class="sub">${head}${r.trace ? `<details><summary>trace (${r.trace.length} steps)</summary>${swimlane(r.trace, -1)}${stepList(r.trace)}</details>` : ""}</div>`;
  return `<div class="sub">${head}<p class="vio">✗ ${esc(r.failure.prop)} — ${esc(r.failure.detail)}</p><p class="meta">Minimal sequence (${r.failure.commands.length} commands):</p>${swimlane(r.failure.trace, r.failure.step)}${stepList(r.failure.trace)}${stateAt(r.failure.trace)}</div>`;
}

const cards = CAMPAIGNS.map((c) => {
  const m = mainOf(M, c.id), s = mainOf(S, c.id);
  const v = statusOf(c.id, m, s);
  const props = c.props.map((p) => PROPS.find((x) => x.id === p)!);
  const reps = [...replaysOf(M, c.id), ...replaysOf(S, c.id)].filter((r: R) => !String(r.replayOf).startsWith("scenario:"));
  return `<section class="card" id="c-${esc(c.id)}"><div class="card-h"><h3>${esc(c.id)} — ${esc(c.title ?? props[0].title)}</h3>${badge(v.status)}</div>
  <p class="meta">${props.map((p) => `<b>${esc(p.id)}</b> ${esc(p.title)}`).join("<br>")}<br>Spec ${props.flatMap((p) => p.spec_refs).map(esc).join(", ")} · decisions ${props.flatMap((p) => p.decisions).map(esc).join(", ")} · clauses ${[...new Set(c.props.flatMap((p) => CLAUSES[p] ?? []))].map((x) => `<code>${x}</code>`).join(" ")}<br>Commands: ${[...new Set(c.cmds)].map((x) => `<code>${x}</code>`).join(" ")} · ≤ ${c.maxCommands} per run${c.world?.forkMode ? ` · fork mode <code>${c.world.forkMode}</code>` : ""}${c.caps?.resolution ? ` · §10.2 step-1 reading <code>${c.caps.resolution}</code>` : ""}${c.world?.aCaps ? " · origin A lacks the partial grammar" : ""}</p>
  ${v.note && v.status !== "pass" ? `<div class="verdict ${v.status}"><b>${esc(v.kind ?? "")}</b> ${esc(v.note)}</div>` : ""}
  <div class="two">${c.studioOnly ? "" : resultBlock(m, "Reference model")}${c.modelOnly ? "" : resultBlock(s, `blygger-studio ${esc(S.studioVersion ?? "")}`)}</div>
  ${reps.map((r: R) => resultBlock(r, `${r.subject === "studio" ? "studio" : "model"}: replay of the ${esc(r.replayOf)} counterexample`)).join("")}
  </section>`;
}).join("\n");

const scenarioCards = SCENARIOS.map((sc) => {
  const m = M.results.find((r: R) => r.replayOf === `scenario:${sc.id}`), s = S.results.find((r: R) => r.replayOf === `scenario:${sc.id}`);
  const c = CAMPAIGNS.find((x) => x.id === sc.campaign)!;
  const fails = [m, s].some((r) => r?.status === "fail");
  const st = fails ? (c.id.startsWith("P6-pre") ? "info" : VERDICT[c.id]?.status ?? "fail") : "pass";
  // Show the fork's flattened markdown when there is one: the thing §16.6f is about.
  const forkMd = (r: R, who: "model" | "studio") => {
    const tr = r?.failure?.trace ?? r?.trace;
    const last = tr?.[tr.length - 1];
    const obs = who === "studio" ? last?.studio : last?.model;
    const ids = obs ? Object.keys(obs.own).filter((k) => obs.own[k].forked_from) : [];
    return ids.map((k) => `<p class="meta">${who} fork <code>${esc(k)}</code> content_md:</p><pre class="code">${esc(obs.own[k].versions[0]?.md ?? "")}</pre>`).join("");
  };
  return `<section class="card"><div class="card-h"><h3>${esc(sc.title)}</h3>${badge(st)}</div><p class="meta">scenario <code>${esc(sc.id)}</code> under ${esc(c.id)} · ${sc.cmds.length} commands</p>
  <div class="two">${resultBlock(m, "Reference model")}${c.modelOnly ? "" : resultBlock(s, `blygger-studio ${esc(S.studioVersion ?? "")}`)}</div>
  <div class="two"><div>${forkMd(m, "model")}</div><div>${c.modelOnly ? "" : forkMd(s, "studio")}</div></div></section>`;
}).join("\n");

// Pre vs post #57 side by side.
const prePost = (() => {
  const row = (label: string, id: string) => {
    const m = mainOf(M, id), s = mainOf(S, id);
    const cell = (r: R) => (r ? `${badge(r.status)} <span class="meta">${r.numRuns} runs${r.failure ? ` — ${esc(r.failure.detail.slice(0, 220))}` : ""}</span>` : `<span class="soft">n/a</span>`);
    return `<tr><td>${label}</td><td>${cell(m)}</td><td>${cell(s)}</td></tr>`;
  };
  const rep = S.results.filter((r: R) => r.id === "P6-post" && String(r.replayOf).startsWith("model:P6-pre"));
  return `<table class="cov"><tr><th>Fork semantics</th><th>Reference model</th><th>blygger-studio ${esc(S.studioVersion ?? "")}</th></tr>
  ${row("<b>pre-#57</b>: copy content_md, re-resolve at the forker (P6)", "P6-pre")}
  ${row("pre-#57, forker without the partial grammar (P6)", "P6-pre-nopartial")}
  ${row("<b>post-#57</b> (§16.6f): flatten the pinned document (P6post)", "P6-post")}
  ${row("post-#57, source published without the partial grammar (P6post)", "P6-post-legacy")}
  ${rep.map((r: R) => `<tr><td>post-#57 studio fork driven by the <code>${esc(r.replayOf)}</code> counterexample</td><td class="soft">—</td><td>${badge(r.status)}${r.failure ? ` ${esc(r.failure.detail)}` : ' <span class="meta">the sequence that broke the old fork is faithful under #57</span>'}</td></tr>`).join("")}
  </table>`;
})();

// §13 importer state machine, transitions coloured by studio agreement.
const tallies: Record<string, { agree: number; disagree: number }> = {};
for (const r of S.results) for (const [k, v] of Object.entries((r.transitions ?? {}) as Record<string, { agree: number; disagree: number }>)) { tallies[k] ??= { agree: 0, disagree: 0 }; tallies[k].agree += v.agree; tallies[k].disagree += v.disagree; }
function sm(): string {
  const P: Record<string, [number, number]> = { absent: [90, 150], current: [330, 70], tombstone: [330, 250], retained: [580, 250] };
  const box = (n: string, label: string) => `<g><rect x="${P[n][0] - 62}" y="${P[n][1] - 22}" width="124" height="44" rx="10" class="st"/><text x="${P[n][0]}" y="${P[n][1] + 5}" text-anchor="middle" class="st-t">${label}</text></g>`;
  const edges: [string, string, string, string, number?][] = [
    ["absent", "current", "import (v > wm)", "§13.2"],
    ["absent", "tombstone", "first seen withdrawn", "§13.4"],
    ["current", "current", "update (v > wm)", "§13.1", 1],
    ["current", "tombstone", "endcap, nothing pinned", "§13.4"],
    ["current", "retained", "endcap, held version pinned", "§13.4"],
    ["tombstone", "current", "item returns", "§9"],
    ["retained", "current", "item returns", "§9"],
  ];
  const col = (k: string) => { const t = tallies[k]; if (!t) return "unseen"; if (t.disagree === 0) return "agree"; if (t.agree === 0) return "disagree"; return "mixed"; };
  const out: string[] = [];
  edges.forEach(([a, b, lab, sec, self]) => {
    const k = `${a}→${b}`;
    const t = tallies[k];
    const tip = `${k}: ${lab} (${sec}) — studio agreed ${t?.agree ?? 0}×, disagreed ${t?.disagree ?? 0}×`;
    if (self) {
      const [x, y] = P[a];
      out.push(`<g><title>${esc(tip)}</title><path d="M${x - 30},${y - 22} C${x - 50},${y - 70} ${x + 50},${y - 70} ${x + 30},${y - 22}" class="ed ${col(k)}" marker-end="url(#sm-ah)"/><text x="${x}" y="${y - 62}" text-anchor="middle" class="ed-t">${esc(lab)} ${sec}</text></g>`);
      return;
    }
    const [x1, y1] = P[a], [x2, y2] = P[b];
    const back = (a === "tombstone" || a === "retained") && b === "current";
    const mx = (x1 + x2) / 2 + (back ? 40 : -10), my = (y1 + y2) / 2 + (back ? 0 : -14);
    out.push(`<g><title>${esc(tip)}</title><path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" class="ed ${col(k)}" marker-end="url(#sm-ah)"/><text x="${mx}" y="${my + (back ? 14 : -4)}" text-anchor="middle" class="ed-t">${esc(lab)} ${sec}</text></g>`);
  });
  const extras = [
    ["(any)→same (regression ignored)", "lower version than the watermark: ignored, surfaced as regression — §13.3"],
    ["current→current (stealth adopted)", "same version, different hash: content adopted, surfaced — §13.3"],
  ].map(([k, lab]) => {
    const keys = Object.keys(tallies).filter((x) => x.includes(k.includes("regression") ? "regression" : "stealth"));
    const t = keys.reduce((acc, x) => ({ agree: acc.agree + tallies[x].agree, disagree: acc.disagree + tallies[x].disagree }), { agree: 0, disagree: 0 });
    const c = !keys.length ? "unseen" : t.disagree === 0 ? "agree" : t.agree === 0 ? "disagree" : "mixed";
    return `<li><span class="dot ${c}"></span>${esc(lab)} — studio agreed ${t.agree}×, disagreed ${t.disagree}×</li>`;
  });
  return `<div class="scroll"><svg width="680" height="310" viewBox="0 0 680 310" role="img" aria-label="§13 importer state machine"><defs><marker id="sm-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" class="ah"/></marker></defs>${out.join("")}${box("absent", "absent")}${box("current", "current")}${box("tombstone", "tombstone (null)")}${box("retained", "tombstone + pin")}</svg></div>
  <ul class="legend"><li><span class="dot agree"></span>studio took the same transition at the same step, every time</li><li><span class="dot mixed"></span>mostly agreed, some divergence</li><li><span class="dot disagree"></span>never agreed</li><li><span class="dot unseen"></span>not observed in differential runs</li>${extras.join("")}</ul>
  <p class="meta">Every edge is guarded by the watermark (§13.3): only a fetched item document with a higher version advances state (§13.2); a feed entry never does. Counts are over all differential campaigns (${Object.values(tallies).reduce((a, t) => a + t.agree + t.disagree, 0)} item-level transitions).</p>`;
}

const cov = (() => {
  const rows = PROPS.map((p) => {
    const cs = CAMPAIGNS.filter((c) => c.props.includes(p.id));
    const sumOf = (set: R) => cs.map((c) => mainOf(set, c.id)).filter(Boolean).reduce((a: R, r: R) => ({ runs: a.runs + r.numRuns, cmds: a.cmds + r.commandsExecuted, hits: a.hits + (r.hits?.[p.id] ?? 0) }), { runs: 0, cmds: 0, hits: 0 });
    const m = sumOf(M), s = sumOf(S);
    return `<tr><td><b>${p.id}</b><br><span class="meta">${esc(p.title)}</span></td><td>${(CLAUSES[p.id] ?? []).map((x) => `<code>${x}</code>`).join(" ")}<br><span class="meta">${p.spec_refs.join(" ")} · ${p.decisions.join(" ")}</span></td><td>${p.differential ? "—" : `${m.runs} runs<br>${m.cmds} cmds<br>${m.hits} checks`}</td><td>${s.runs} runs<br>${s.cmds} cmds<br>${s.hits} checks</td></tr>`;
  });
  return `<div class="scroll"><table class="cov"><tr><th>Property</th><th>Clauses / spec / decisions</th><th>Model</th><th>Studio</th></tr>${rows.join("")}</table></div><p class="meta">"checks" counts non-vacuous evaluations — a convergence check after an index diff, a pinned file actually re-read, a partial selector actually re-verified — not merely commands executed.</p>`;
})();

const findings = Object.entries(VERDICT).filter(([id]) => {
  const m = mainOf(M, id), s = mainOf(S, id);
  return (m?.status === "fail" || s?.status === "fail") && VERDICT[id].status !== "info";
}).map(([id, v]) => `<li><a href="#c-${id}">${id}</a> ${badge(v.status)} <b>${esc(v.kind)}</b> — ${esc(v.note)}</li>`).join("");

const counts = checks.reduce((a: R, c: R) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }), {});
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Protocol State Machines</title>
<style>
:root{--bg:#f6f4ef;--paper:#fff;--ink:#1d1d1b;--soft:#5b5a55;--rule:#dedad0;--accent:#2b5bab;--pass:#2f7a45;--warn:#a46a00;--fail:#a23b3b;--code:#f1efe9}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171715;--paper:#20201d;--ink:#ecebe6;--soft:#a5a39b;--rule:#3a3934;--accent:#7ea6e8;--pass:#6fbf86;--warn:#e0a73a;--fail:#e07a7a;--code:#2a2a26}}
:root[data-theme="dark"]{--bg:#171715;--paper:#20201d;--ink:#ecebe6;--soft:#a5a39b;--rule:#3a3934;--accent:#7ea6e8;--pass:#6fbf86;--warn:#e0a73a;--fail:#e07a7a;--code:#2a2a26}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1100px;margin:0 auto;padding:20px 16px 60px}h1{font-size:1.6rem;margin:.2em 0}h2{margin-top:2em;border-bottom:1px solid var(--rule);padding-bottom:.2em}h3{margin:0;font-size:1.05rem}h4{margin:.2em 0}
.card{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:14px 16px;margin:14px 0}.card-h{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.sub{border-top:1px dashed var(--rule);padding-top:8px;margin-top:8px;min-width:0}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media (max-width:760px){.two{grid-template-columns:1fr}}
.meta{color:var(--soft);font-size:.86rem}.soft{color:var(--soft)}code{background:var(--code);padding:0 4px;border-radius:4px;font-size:.85em;overflow-wrap:anywhere}
.badge{display:inline-block;border-radius:999px;padding:1px 9px;font-size:.78rem;font-weight:600;color:#fff;white-space:nowrap}.badge.pass{background:var(--pass)}.badge.warn{background:var(--warn)}.badge.fail{background:var(--fail)}.badge.info{background:var(--accent)}
.verdict{border-left:4px solid var(--accent);background:var(--code);padding:8px 10px;border-radius:6px;margin:8px 0;font-size:.92rem}.verdict.warn{border-color:var(--warn)}.verdict.fail{border-color:var(--fail)}
.vio{color:var(--fail);font-weight:600}.scroll{overflow-x:auto;max-width:100%}pre.code{background:var(--code);padding:8px;border-radius:6px;overflow-x:auto;font-size:.8rem;white-space:pre-wrap}
ol.steps{padding-left:22px;font-size:.88rem}ol.steps li{margin:4px 0}ol.steps li.bad{background:color-mix(in srgb,var(--fail) 12%,transparent);border-radius:6px}
.evs{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}.ev{font-size:.75rem;background:var(--code);border-radius:4px;padding:0 5px;color:var(--soft)}.ev.fail{color:var(--warn)}.ev.diverge{color:var(--fail);font-weight:700}
svg text{fill:var(--ink);font-family:system-ui,sans-serif}.lane-a{fill:var(--paper)}.lane-b{fill:var(--code)}.lane-t{font-size:11px;fill:var(--soft)}.step-t{font-size:11px;fill:var(--soft)}
.viol{fill:color-mix(in srgb,var(--fail) 14%,transparent);stroke:var(--fail);stroke-width:1.5}.chip{fill:var(--paper);stroke:var(--accent)}.chip.failc{stroke:var(--warn)}.chip.diverge{stroke:var(--fail);stroke-width:2}.chip.fetch{stroke:var(--soft)}.chip-t{font-size:10px}
.arrow{stroke:var(--soft);stroke-width:1.2;opacity:.7}.arrow.bad{stroke:var(--warn)}.ah{fill:var(--soft)}
.st{fill:var(--paper);stroke:var(--ink)}.st-t{font-size:12px;font-weight:600}.ed{fill:none;stroke-width:2.2}.ed.agree{stroke:var(--pass)}.ed.mixed{stroke:var(--warn)}.ed.disagree{stroke:var(--fail)}.ed.unseen{stroke:var(--rule);stroke-dasharray:4 3}.ed-t{font-size:10px;fill:var(--soft)}
.legend{list-style:none;padding:0;font-size:.86rem}.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}.dot.agree{background:var(--pass)}.dot.mixed{background:var(--warn)}.dot.disagree{background:var(--fail)}.dot.unseen{background:var(--rule)}
table.cov,table.diff{border-collapse:collapse;width:100%;font-size:.86rem}table.cov td,table.cov th,table.diff td,table.diff th{border-bottom:1px solid var(--rule);padding:6px;text-align:left;vertical-align:top}
.kpi{display:flex;gap:10px;flex-wrap:wrap}.kpi div{background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:8px 12px}
summary{cursor:pointer;color:var(--accent)}
</style></head><body><main>
<h1>Protocol state machines, run</h1>
<p class="meta">Stateful property-based tests (fast-check <code>fc.commands</code>) of the Blygger 0.3 protocol: an executable reference model written from <code>docs/protocol-v0.3.md</code>, and the same command sequences driven through <b>blygger-studio ${esc(S.studioVersion ?? "(not run)")}</b> (D1 in miniflare, imported from <code>${esc(S.studioDir ?? "")}</code>). Generated ${esc(summary.generated_at)} · model seed <code>${M.seed}</code> × ${M.runs} base runs · studio seed <code>${S.seed}</code> × ${S.runs} base runs. Regenerate: <code>cd conformance/model &amp;&amp; npm run report</code>.</p>
<div class="kpi">${["pass", "warn", "fail", "info"].map((k) => `<div>${badge(k)} <b>${counts[k] ?? 0}</b></div>`).join("")}</div>
<h2>Findings</h2>
<ul>${findings || "<li>None.</li>"}</ul>
<p class="meta">Expected failures (the feed-only convergence and the pre-#57 fork) are listed under their cards as <span class="badge info">info</span>: they show the property the spec does <i>not</i> promise, with the shortest counterexample.</p>
<h2>Forks before and after decision #57</h2>
${prePost}
<h2>Directed scenarios (§16.6f)</h2>
${scenarioCards}
<h2>The §13 importer, as modelled</h2>
${sm()}
<h2>Properties</h2>
${cards}
<h2>Coverage</h2>
${cov}
</main></body></html>`;
writeFileSync(path.join(out, "report.html"), html);
console.log(`wrote ${path.join(out, "summary.json")} (${checks.length} checks: ${JSON.stringify(counts)}) and report.html`);
