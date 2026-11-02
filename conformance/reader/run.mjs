#!/usr/bin/env node
// The reader suite runner. Hands every fixture to a renderer command and
// compares what comes back against the fixture's normative expectation.
//
//   node run.mjs --cmd "<command>"           one process per case
//   node run.mjs --cmd "<command>" --batch   one process for all cases
//   node run.mjs --adapter studio            the bundled blygger-studio adapter (batch)
//   node run.mjs --self-check                the fixtures against themselves
//
// Options: --only <group|id>[,…]  --out <dir>  --name <label>  --no-report
//
// No dependencies. See README.md for the renderer protocol.
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compareCase } from "./lib/compare.mjs";
import { renderReport } from "./lib/report.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const flag = (name) => argv.includes(name);

if (flag("--help") || flag("-h")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 13).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(0);
}

// ── Load and validate the corpus ────────────────────────────────────────────
export function loadFixtures(dir = join(here, "fixtures")) {
  const fixtures = readdirSync(dir).filter((f) => /^\d+-.*\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
  const ids = new Set(), items = new Map();
  for (const fx of fixtures) {
    if (ids.has(fx.id)) throw new Error(`duplicate fixture id ${fx.id}`);
    ids.add(fx.id);
    for (const it of fx.items) {
      const key = `${it.origin}${it.id}`;
      const s = JSON.stringify(it);
      if (items.has(key) && items.get(key) !== s) throw new Error(`fixture ${fx.id}: item ${key} differs from another fixture's copy`);
      items.set(key, s);
    }
  }
  return fixtures;
}

/** What a renderer receives for one case: the fixture minus its expectation. */
export const caseInput = (fx) => ({ id: fx.id, kind: fx.kind, notation: fx.notation, self: fx.self, content_md: fx.content_md, items: fx.items });

let fixtures = loadFixtures();
const only = opt("--only");
if (only) {
  const want = new Set(only.split(","));
  fixtures = fixtures.filter((f) => want.has(f.id) || want.has(f.group));
}

// ── Run the renderer ────────────────────────────────────────────────────────
function runCommand(cmd, input) {
  return new Promise((res) => {
    const p = spawn(cmd, { shell: true, stdio: ["pipe", "pipe", "inherit"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", (code) => res({ code, out }));
    p.stdin.end(JSON.stringify(input));
  });
}

/** Stdout is either JSON ({content_html, …} or {error}) or bare HTML. A non-zero exit is a publish error. */
function parseOne(code, out) {
  const s = out.trim();
  if (s.startsWith("{")) { try { return JSON.parse(s); } catch { /* fall through: HTML that starts with "{" */ } }
  if (code !== 0) return { error: s || `exit ${code}` };
  return { content_html: out };
}

let renderer = { name: opt("--name", "renderer"), version: "" };
let results = {};
if (flag("--self-check")) {
  renderer = { name: "self-check", version: "fixtures" };
  for (const fx of fixtures) {
    const e = fx.expect;
    results[fx.id] = e.error === true ? { error: "expected publish error" } : { content_html: e.content_html, transclusions: e.transclusions, links: e.links, generated: e.generated };
  }
} else {
  let cmd = opt("--cmd");
  let batch = flag("--batch");
  const adapter = opt("--adapter");
  if (adapter) {
    cmd = `"${process.execPath}" "${join(here, "adapters", adapter, "adapter.mjs")}"`;
    batch = true;
    renderer.name = adapter;
  }
  if (!cmd) { console.error("give --cmd <command>, --adapter <name> or --self-check (see --help)"); process.exit(2); }
  if (batch) {
    const { code, out } = await runCommand(cmd, { cases: fixtures.map(caseInput) });
    let parsed;
    try { parsed = JSON.parse(out); } catch { console.error(`batch renderer did not print JSON (exit ${code}):\n${out.slice(0, 2000)}`); process.exit(1); }
    if (parsed.renderer) renderer = { ...renderer, ...parsed.renderer };
    for (const r of parsed.results || []) results[r.id] = r;
  } else {
    for (const fx of fixtures) {
      const { code, out } = await runCommand(cmd, caseInput(fx));
      results[fx.id] = parseOne(code, out);
    }
  }
}

// ── Compare and write ───────────────────────────────────────────────────────
const outcomes = fixtures.map((fx) => {
  const r = results[fx.id];
  if (!r) return { id: fx.id, status: "fail", checks: [{ name: "outcome", status: "fail", detail: "no result from the renderer" }] };
  return compareCase(fx, r);
});
const counts = { pass: 0, warn: 0, fail: 0 };
for (const o of outcomes) counts[o.status]++;

const outDir = resolve(opt("--out", join(here, "out")));
mkdirSync(outDir, { recursive: true });
const label = `${renderer.name}${renderer.version ? " " + renderer.version : ""}`;
const slug = renderer.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
const snapshot = fixtures[0] ? { snapshot: fixtures[0].snapshot, text: fixtures[0].text } : {};
const byId = Object.fromEntries(fixtures.map((f) => [f.id, f]));

const summary = {
  area: "reader",
  title: "Reader suite: content_md → content_html fixtures",
  generated_at: new Date().toISOString(),
  renderer: label,
  ...snapshot,
  fixtures: fixtures.length,
  counts,
  checks: [
    {
      id: `reader.${slug}.census`, title: `${label}: ${fixtures.length} fixtures against ${snapshot.snapshot || "the living text"}`,
      status: "info", detail: `${counts.pass} pass, ${counts.warn} warn (ambiguous text or fragment-only URLs), ${counts.fail} fail`,
      spec_refs: ["§10.1", "§10.2", "§10.3", "§10.3a", "§5.2", "§5.7"], decisions: ["#48"],
      counts: { pass: counts.pass, warn: counts.warn, fail: counts.fail, info: 0 },
    },
    ...outcomes.map((o) => {
      const fx = byId[o.id];
      const bad = o.checks.filter((c) => c.status === "fail" || c.status === "warn");
      return {
        id: `reader.${slug}.${o.id}`, title: `${label}: ${fx.title}`, status: o.status,
        detail: bad.length ? bad.map((c) => `${c.name}: ${c.detail}`).join(" · ") : o.checks.map((c) => `${c.name}: ${c.detail}`).join(" · "),
        spec_refs: fx.spec_refs, decisions: fx.decisions, clauses: fx.clauses, group: fx.group,
        ...(fx.ambiguous ? { ambiguous: true } : {}),
      };
    }),
  ],
};
writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
writeFileSync(join(outDir, "results.json"), JSON.stringify({ renderer, results }, null, 2) + "\n");
if (!flag("--no-report")) writeFileSync(join(outDir, "report.html"), renderReport({ summary, fixtures, outcomes, results }));
console.log(`${label}: ${counts.pass} pass, ${counts.warn} warn, ${counts.fail} fail of ${fixtures.length} → ${outDir}`);
for (const o of outcomes) if (o.status !== "pass") console.log(`  ${o.status.padEnd(4)} ${o.id}: ${o.checks.filter((c) => c.status === "fail" || c.status === "warn").map((c) => `${c.name}: ${c.detail}`).join(" · ").slice(0, 300)}`);
process.exitCode = counts.fail ? 1 : 0;
