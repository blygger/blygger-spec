#!/usr/bin/env node
// One command regenerates everything:
//   node run.mjs                  # studio harness + live snapshot + desktop harness + validate + report
//   node run.mjs --offline        # skip the live snapshot (reuse samples/live-*)
//   node run.mjs --report-only    # reuse samples/ and out/*.json, rebuild summary + report
// Env: STUDIO_DIR (default ~/Code/blygger-studio), DESKTOP_DIR (default ~/Code/blygger-desktop),
//      LIVE_ORIGIN (default https://venkateshrao.com/blyg/)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSite } from "./lib/check-site.mjs";
import { RULES } from "./lib/semantic.mjs";
import { selftest } from "./lib/selftest.mjs";
import { schemaTree, observedPaths, DESKTOP_STATIC } from "./lib/coverage.mjs";
import { loadCases } from "./harness/grammar-common.mjs";
import { REMOTE, REMOTE_ITEMS, REMOTE_PINS } from "./harness/fake-remote.mjs";
import { renderReport } from "./lib/report.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const node = process.execPath;
const step = (label, file, a = []) => { console.log(`▸ ${label}`); execFileSync(node, [join(root, file), ...a], { stdio: "inherit", cwd: root }); };

// 0. the fake remote origin's own documents are a sample set too
{
  const dir = join(root, "samples", "fake-remote");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "items"), { recursive: true });
  const { outboundService } = await import("./harness/fake-remote.mjs");
  for (const p of ["blyg.json", "feed.xml", "items/index.json"]) writeFileSync(join(dir, p), await (await outboundService(new Request(REMOTE + p))).text());
  for (const [id, d] of Object.entries(REMOTE_ITEMS)) writeFileSync(join(dir, "items", `${id}.json`), JSON.stringify(d, null, 2));
  for (const [id, vs] of Object.entries(REMOTE_PINS)) for (const [n, d] of Object.entries(vs)) { mkdirSync(join(dir, "items", id), { recursive: true }); writeFileSync(join(dir, "items", id, `v${n}.json`), JSON.stringify(d, null, 2)); }
  writeFileSync(join(dir, "scenario.json"), JSON.stringify({ origin: REMOTE, note: "Hand-built 0.3 documents served to the studio harness as a remote blyg (harness/fake-remote.mjs)." }, null, 2));
}
if (!args.has("--report-only")) {
  step("blygger-studio in-process harness", "harness/studio-run.mjs", process.env.STUDIO_DIR ? [process.env.STUDIO_DIR] : []);
  if (!args.has("--offline")) step("live snapshot", "harness/live-fetch.mjs", [process.env.LIVE_ORIGIN || "https://venkateshrao.com/blyg/", "live-venkateshrao"]);
  step("blygger-desktop harness", "harness/desktop-run.mjs", process.env.DESKTOP_DIR ? [process.env.DESKTOP_DIR] : []);
}

const readOut = (f) => (existsSync(join(root, "out", f)) ? JSON.parse(readFileSync(join(root, "out", f), "utf8")) : null);
const gStudio = readOut("grammar-studio.json");
const gDesktop = readOut("grammar-desktop.json");
const roundtrip = readOut("desktop-roundtrip.json");

// 1. validate every sample set
const SETS = [
  ["studio", "blygger-studio (in-process harness)"],
  ["live-venkateshrao", "venkateshrao.com/blyg/ (live)"],
  ["fake-remote", "fake remote origin (hand-built fixture)"],
].filter(([d]) => existsSync(join(root, "samples", d, "blyg.json")));
const sites = SETS.map(([dir, title]) => ({ dir, title, ...checkSite(join(root, "samples", dir)) }));
for (const s of sites) if (s.dir === "studio") s.title = `blygger-studio ${s.meta.studio_version} (in-process harness)`;
for (const s of sites) if (s.dir.startsWith("live")) s.title = `${s.meta.origin} — ${s.meta.generator} (live, ${s.meta.items} items, fetched ${s.meta.fetched_at?.slice(0, 10)})`;

// 2. clause mapping for each rule / schema layer (ids from conformance/clauses/clauses.json)
const RULE_CLAUSES = {
  "hash.matches-content_md": ["C-5.1-03"], "updated.equals-last-changelog": ["C-5.2-02"], "changelog.contiguous": [], "changelog.at-monotonic": [],
  "html.absolute-urls": ["C-5.2-03", "C-7-07"], "md.no-tk-grammar": [], "md.no-reserved-directive": ["C-10.1-01"],
  "transclusions.match-directives": ["C-10.2-01"], "transclusions.baked-wrappers": ["C-10.2-02", "C-10.3-01"], "selector.matches-bake": ["C-10.2-02"],
  "transclusions.own-origin-omitted": ["C-5.9-01"], "stub_of.version-agreement": ["C-10.6-03"], "forked_from.cited-url-is-page": ["C-5.9-05"],
  "fork.carries-directives": [], "page.origin-relative": ["C-5.8-01"], "page.not-absolute-at-0.3": ["C-5.8-01"], "generated.wrappers": ["C-5.7-07"],
  "generated.disjoint-from-transclusions": [], "links.rendered-absolute": ["C-5.2-03"], "code.inert": [], "media.referenced": [], "withdrawn.keeps-page": [],
  "id.matches-url": ["C-5.1-02"], "origin.matches-fetch": [], "pins.served": ["C-4-10", "C-8-01"], "pinned.hash": ["C-5.1-03"], "pinned.at-matches-changelog": [],
  "pinned.forked_from-immutable": ["C-5.6-06"], "index.order": [], "index.agrees-with-docs": [],
  "feed.rss2-namespace": [], "feed.manifest-hook": ["C-7-09"], "feed.entry-vocabulary": ["C-7-03"], "feed.withdrawn-single-entry": ["C-7-05"],
  "feed.latest-content": ["C-7-02"], "feed.injected-presentation": ["C-7-06"], "feed.newest-first": [], "feed.window": ["C-7-01"], "feed.dc-creator": ["C-7-08"],
};
const clausesFor = (rule) => RULE_CLAUSES[rule] ?? RULE_CLAUSES[rule.replace(/^pinned\./, "")] ?? [];
const SCHEMA_CLAUSES = {
  item: ["C-5.1-01", "C-4-12", "C-5.5-01", "C-5.6-02", "C-5.9-01", "C-5.9-02", "C-5.9-04", "C-10.6-02", "C-10.3-01", "C-5.7-05"],
  pinned: ["C-5.1-01", "C-4-12", "C-8-03", "C-5.6-02", "C-10.6-02"],
  manifest: ["C-6.1-03"], index: ["C-4-12"],
};
const ADVISORY_CLAUSES = { item: ["C-5.4-01", "C-5.3-02", "C-5.7-03", "C-5.5-02", "C-5.9-05"], pinned: ["C-8-05", "C-5.7-03"], manifest: ["C-3.2-02", "C-4-02", "C-6.1-03"] };

// 3. checks for summary.json
const checks = [];
const add = (c) => checks.push({ spec_refs: [], decisions: [], ...c });
for (const s of sites) {
  for (const type of ["manifest", "index", "item", "pinned"]) {
    const docs = s.docs.filter((d) => d.type === type);
    if (!docs.length) continue;
    const f = docs.filter((d) => d.schema.fail.length), w = docs.filter((d) => d.schema.warn.length);
    const first = (arr, k) => arr.slice(0, 4).map((d) => `${d.label || d.path}: ${d.schema[k][0].path} ${d.schema[k][0].message}`).join("; ");
    add({ id: `schemas.${s.dir}.schema.${type}`, title: `${s.title}: ${type} documents against ${type}.schema.json`, status: f.length ? "fail" : "pass",
      detail: f.length ? `${f.length}/${docs.length} fail: ${first(f, "fail")}` : `${docs.length}/${docs.length} valid`, spec_refs: { item: ["§5", "§9"], pinned: ["§8"], manifest: ["§6.1"], index: ["§6.2"] }[type], decisions: ["#48"], clauses: SCHEMA_CLAUSES[type] });
    if (ADVISORY_CLAUSES[type]) add({ id: `schemas.${s.dir}.advisory.${type}`, title: `${s.title}: ${type} documents against the advisory (SHOULD) layer`, status: w.length ? "warn" : "pass",
      detail: w.length ? `${w.length}/${docs.length} warn: ${first(w, "warn")}` : `no advisory warnings`, spec_refs: { item: ["§5.3", "§5.4", "§5.5", "§5.7", "§5.9"], pinned: ["§8"], manifest: ["§3.2", "§6.1"] }[type], decisions: ["#48"], clauses: ADVISORY_CLAUSES[type] });
  }
  const byRule = {};
  for (const d of s.docs) for (const r of d.rules) {
    const k = r.rule;
    byRule[k] ??= { ...r, applied: 0, msgs: [] };
    byRule[k].applied++;
    for (const m of r.messages) byRule[k].msgs.push(`${d.label || d.path}: ${m}`);
  }
  for (const [k, r] of Object.entries(byRule)) {
    const status = r.msgs.length ? r.level : "pass";
    add({ id: `schemas.${s.dir}.rule.${k}`, title: `${s.title}: ${r.title}`, status, detail: r.msgs.length ? `${r.msgs.length} finding(s): ${r.msgs.slice(0, 4).join(" · ")}${r.msgs.length > 4 ? " …" : ""}` : `held on ${r.applied} document(s)`, spec_refs: r.spec_refs, decisions: r.decisions, clauses: clausesFor(k) });
  }
}

// grammar differential
const GRAMMAR_CLAUSES = { "reserved-version": ["C-10.1-01"], "unknown-id": ["C-10.2-01"], "partial-not-in-target": ["C-10.2-02"] };
const cases = loadCases();
const gIndex = (g) => Object.fromEntries((g?.results || []).map((r) => [r.case, r]));
const gs = gIndex(gStudio), gd = gIndex(gDesktop);
for (const c of cases) {
  const st = gs[c.id], dk = gd[c.id];
  const bad = [st && !st.ok ? `studio: ${st.diffs.join("; ")}` : null, dk && !dk.ok ? `desktop: ${dk.diffs.join("; ")}` : null].filter(Boolean);
  const cl = GRAMMAR_CLAUSES[c.id] || (c.expect.transclusions.some((t) => t.partial) ? ["C-10.2-02", "C-10.3-01"] : c.expect.transclusions.length ? ["C-10.2-01"] : []);
  add({ id: `schemas.grammar.${c.id}`, title: `Grammar: ${c.title}`, status: bad.length ? "fail" : c.ambiguous ? "warn" : "pass",
    detail: (bad.length ? bad.join(" | ") : `studio ${st ? "✓" : "–"} desktop ${dk ? "✓" : "–"}`) + (c.ambiguous ? ` — spec ambiguity: ${c.ambiguous}` : ""), spec_refs: c.spec_refs, decisions: c.decisions, clauses: cl });
}

// desktop round trip
if (roundtrip) {
  const D = roundtrip.dropped.map((x) => x.path);
  const has = (re) => roundtrip.dropped.filter((x) => re.test(x.path));
  const rt = (id, title, re, status, spec_refs, decisions, clauses, why) => {
    const hit = has(re);
    add({ id: `schemas.desktop.roundtrip.${id}`, title: `blygger-desktop round trip: ${title}`, status: hit.length ? status : "pass", detail: hit.length ? `${why} Dropped: ${hit.map((h) => `${h.path} (${h.count} docs)`).join(", ")}` : "preserved", spec_refs, decisions, clauses });
  };
  rt("selector", "partial-transclusion selector", /selector/, "warn", ["§10.3"], ["#49"], ["C-10.3-01"], "TransclusionRef has no selector. Readers may ignore it (§10.3), so this is not a reader failure; but desktop stores imported lineage, and any re-emission or local re-check (§10.2 MAY) from that store sees partial quotes as whole ones — the shape of the loss seen on the Blynger fork.");
  rt("cited", "cited on stub_of / forked_from", /^(stub_of|forked_from)\.cited/, "warn", ["§5.9"], ["#30"], ["C-5.9-03", "C-5.9-07"], "StubOf and RemoteRef have no cited; §5.9 says importers retain it verbatim.");
  rt("generated", "generation provenance", /^generated/, "warn", ["§5.7"], ["#20", "#37"], ["C-5.7-01"], "ItemDoc has no generated[]: imported machine-generated spans lose their disclosure.");
  rt("author", "opaque author members", /^author\.(?!name$|url$)/, "fail", ["§5.5"], ["#11"], ["C-5.5-05"], "Author{name,url} drops every other member; clients that store item JSON MUST carry author verbatim.");
  rt("changelog-generated", "changelog[].generated", /changelog\[\]\.generated/, "warn", ["§16.6c"], ["#40"], [], "Ruled member not modelled.");
  add({ id: "schemas.desktop.roundtrip.parse", title: "blygger-desktop parses every sampled item document", status: roundtrip.failed.length ? "fail" : "pass", detail: `${roundtrip.parsed}/${roundtrip.documents} parsed${roundtrip.failed.length ? `; failures: ${roundtrip.failed.map((f) => f.path).join(", ")}` : ""}`, spec_refs: ["§13.1", "§3"], decisions: [], clauses: ["C-3-01", "C-5.5-03"] });
  void D;
}
// desktop static: pinned docs
const pinMissing = Object.entries(DESKTOP_STATIC.pinned).filter(([k, v]) => !v[0] && ["transclusions", "stub_of", "forked_from", "generated"].includes(k)).map(([k]) => k);
add({ id: "schemas.desktop.static.pinned-citations", title: "blygger-desktop PinDoc carries a pin's citations", status: pinMissing.length ? "warn" : "pass", detail: pinMissing.length ? `PinDoc (blyg-core api/public.rs:226) has no ${pinMissing.join(", ")} — §8 rule 5: "a pin carries its own citations".` : "ok", spec_refs: ["§8"], decisions: ["#27"], clauses: [] });

// self-test
const studio = sites.find((s) => s.dir === "studio");
const pick = (label) => studio?.docs.find((d) => d.label === label)?.doc;
const st = studio ? selftest({ thread: pick("thread"), stub: studio.docs.find((d) => d.label === "stubPartial")?.doc, fragment: pick("pins"), fork: pick("forkRemoteThread"), generated: pick("generated"), pinned: studio.docs.find((d) => d.type === "pinned")?.doc }) : [];
for (const t of st) add({ id: `schemas.selftest.${t.id}`, title: `Self-test: checker catches ${t.title}`, status: t.caught ? "pass" : "fail", detail: t.caught ? `caught by ${t.by.join(" · ")}` : "NOT caught — the checker is too lenient here", spec_refs: [], decisions: ["#48"], clauses: t.clauses });

const summary = { area: "schemas", title: "JSON Schemas, semantic rules and grammar differential", generated_at: new Date().toISOString(), checks };
mkdirSync(join(root, "out"), { recursive: true });
writeFileSync(join(root, "out", "summary.json"), JSON.stringify(summary, null, 2));

// coverage for the explorer
const studioDocs = (s, type) => (s ? s.docs.filter((d) => d.type === type).map((d) => d.doc) : []);
const live = sites.find((s) => s.dir.startsWith("live"));
const raw = (dir, f) => JSON.parse(readFileSync(join(root, "samples", dir, f), "utf8"));
const emits = {
  item: observedPaths([...studioDocs(studio, "item"), ...studioDocs(live, "item")]),
  pinned: observedPaths([...studioDocs(studio, "pinned"), ...studioDocs(live, "pinned")]),
  manifest: observedPaths([raw("studio", "blyg.json"), ...(live ? [raw(live.dir, "blyg.json")] : [])]),
  index: observedPaths([raw("studio", "items/index.json")]),
};
const tree = schemaTree();
writeFileSync(join(root, "out", "report.html"), renderReport({ summary, sites, tree, emits, desktopStatic: DESKTOP_STATIC, roundtrip, gStudio, gDesktop, cases, selftest: st, rules: RULES }));
const tally = checks.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {});
console.log(`summary: ${checks.length} checks ${JSON.stringify(tally)} → out/summary.json, out/report.html`);
