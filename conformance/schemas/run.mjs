#!/usr/bin/env node
// One command regenerates everything:
//   node run.mjs                  # adapters + live snapshot + validate + report
//   node run.mjs --offline        # skip the live snapshot (reuse samples/live-*)
//   node run.mjs --report-only    # reuse samples/ and the adapters' saved results; rebuild summary + report
//   node run.mjs --impl path/to/adapter.mjs [--impl …]   # add implementations (ADAPTERS.md)
//   node run.mjs --out DIR        # write results somewhere other than out/ (use it for third-party runs)
// Env: STUDIO_DIR (default ../blygger-studio next to this repo), IMPLS (extra adapter paths,
//      comma- or colon-separated), OUT_DIR, LIVE_ORIGIN (default https://venkateshrao.com/blyg/)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSite } from "./lib/check-site.mjs";
import { RULES } from "./lib/semantic.mjs";
import { selftest } from "./lib/selftest.mjs";
import { schemaTree, observedPaths } from "./lib/coverage.mjs";
import { adapterPaths, loadAdapters, leaves, dropped } from "./lib/adapters.mjs";
import { loadCases, subst, compare } from "./harness/grammar-common.mjs";
import { REMOTE, REMOTE_ITEMS, REMOTE_PINS, RA, RB, RC, remoteTargets } from "./harness/fake-remote.mjs";
import { renderReport } from "./lib/report.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const args = new Set(argv);
const argVal = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith(name + "="))?.slice(name.length + 1); };
const OUT = resolve(process.cwd(), argVal("--out") || process.env.OUT_DIR || join(root, "out"));
mkdirSync(OUT, { recursive: true });
const node = process.execPath;
const step = (label, file, a = []) => { console.log(`▸ ${label}`); execFileSync(node, [join(root, file), ...a], { stdio: "inherit", cwd: root }); };
const readOut = (f) => (existsSync(join(OUT, f)) ? JSON.parse(readFileSync(join(OUT, f), "utf8")) : null);
const writeOut = (f, v) => writeFileSync(join(OUT, f), JSON.stringify(v, null, 2));

// 0. the fake remote origin's own documents are a sample set too
{
  const dir = join(root, "samples", "fake-remote");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "items"), { recursive: true });
  const { outboundService } = await import("./harness/fake-remote.mjs");
  for (const p of ["blyg.json", "feed.xml", "items/index.json"]) writeFileSync(join(dir, p), await (await outboundService(new Request(REMOTE + p))).text());
  for (const [id, d] of Object.entries(REMOTE_ITEMS)) writeFileSync(join(dir, "items", `${id}.json`), JSON.stringify(d, null, 2));
  for (const [id, vs] of Object.entries(REMOTE_PINS)) for (const [n, d] of Object.entries(vs)) { mkdirSync(join(dir, "items", id), { recursive: true }); writeFileSync(join(dir, "items", id, `v${n}.json`), JSON.stringify(d, null, 2)); }
  writeFileSync(join(dir, "scenario.json"), JSON.stringify({ origin: REMOTE, note: "Hand-built 0.3 documents served to adapters as a remote blyg (harness/fake-remote.mjs)." }, null, 2));
}

// 1. implementations, through their adapters (ADAPTERS.md)
const adapters = await loadAdapters(adapterPaths(argv));
console.log(`adapters: ${adapters.map((a) => a.id).join(", ")}`);
const cases = loadCases();
const LOCAL = { content_md: "Local source fragment about gardens and paths.", content_html: "<p>Local source fragment about gardens and paths.</p>\n" };
const ctxFor = (a) => {
  const cacheDir = join(root, ".cache", a.id);
  mkdirSync(cacheDir, { recursive: true });
  return { root, outDir: OUT, cacheDir, samplesRoot: join(root, "samples"), local: LOCAL, subst, leaves, dropped,
    remote: { origin: REMOTE, ids: { RA, RB, RC }, targets: remoteTargets(), items: REMOTE_ITEMS, pins: REMOTE_PINS } };
};
/** Every sampled item document, as roundtrip() receives them. */
const sampledDocs = () => {
  const out = [];
  for (const set of readdirSync(join(root, "samples")).filter((d) => existsSync(join(root, "samples", d, "items"))).sort()) {
    const meta = existsSync(join(root, "samples", set, "scenario.json")) ? JSON.parse(readFileSync(join(root, "samples", set, "scenario.json"), "utf8")) : {};
    const idir = join(root, "samples", set, "items");
    for (const f of readdirSync(idir).filter((f) => /^[0-9a-z]{26}\.json$/.test(f)).sort()) {
      const json = readFileSync(join(idir, f), "utf8");
      out.push({ path: `${set}/items/${f}`, origin: JSON.parse(json).origin || meta.origin || "", id: f.slice(0, 26), json });
    }
  }
  return out;
};

if (!args.has("--report-only")) {
  for (const a of adapters) {
    const ctx = ctxFor(a);
    const version = await a.version(ctx);
    const label = `${a.name} ${version}`;
    console.log(`▸ ${label}`);
    if (a.samples) await a.samples(join(root, "samples", a.id), ctx);
    if (a.grammar) {
      const g = await a.grammar(cases, ctx);
      const byCase = Object.fromEntries(g.results.map((r) => [r.case, r]));
      const results = cases.map((c0) => {
        const c = subst(c0, g.localId);
        const actual = byCase[c0.id];
        if (!actual) return { case: c0.id, file: c0.file, ok: false, diffs: ["no result from the adapter"], parse: null };
        const v = compare(c.expect, actual, [RA, RB, RC, g.localId]);
        return { case: c0.id, file: c0.file, ok: v.ok, diffs: v.diffs, parse: v.parse };
      });
      writeOut(`grammar-${a.id}.json`, { implementation: g.implementation || label, version, local_id: g.localId, results });
      console.log(`  grammar: ${results.filter((r) => r.ok).length}/${results.length} as expected`);
    }
    if (a.staticFields) writeOut(`static-${a.id}.json`, { implementation: label, version, fields: await a.staticFields(ctx) });
    if (a.dispose && !a.roundtrip) await a.dispose(ctx);
  }
  if (!args.has("--offline")) step("live snapshot", "harness/live-fetch.mjs", [process.env.LIVE_ORIGIN || "https://venkateshrao.com/blyg/", "live-venkateshrao"]);
  for (const a of adapters.filter((a) => a.roundtrip)) {
    const ctx = ctxFor(a);
    const version = await a.version(ctx);
    const docs = sampledDocs();
    const r = await a.roundtrip(docs, ctx);
    writeOut(`roundtrip-${a.id}.json`, { implementation: r.implementation || `${a.name} ${version}`, version, documents: docs.length, parsed: r.parsed, failed: r.failed || [], dropped: r.dropped || [] });
    console.log(`  ${a.id} round trip: ${r.parsed}/${docs.length} parsed; ${(r.dropped || []).length} input paths dropped`);
    if (a.dispose) await a.dispose(ctx);
  }
}
const impls = []; // { id, name, version, label, grammar, roundtrip, static }
for (const a of adapters) {
  const g = readOut(`grammar-${a.id}.json`), rt = readOut(`roundtrip-${a.id}.json`), st = readOut(`static-${a.id}.json`);
  const version = g?.version ?? rt?.version ?? st?.version ?? (await a.version(ctxFor(a)));
  impls.push({ id: a.id, name: a.name, version, label: `${a.name} ${version}`, grammar: g, roundtrip: rt, static: st?.fields ?? null });
}

// 2. validate every sample set: the adapters' own, the live snapshot, the fake remote
const SETS = [
  ...impls.map((i) => [i.id, `${i.label} (adapter samples)`]),
  ...readdirSync(join(root, "samples")).filter((d) => d.startsWith("live-")).sort().map((d) => [d, d]),
  ["fake-remote", "fake remote origin (hand-built fixture)"],
].filter(([d]) => existsSync(join(root, "samples", d, "blyg.json")));
const sites = SETS.map(([dir, title]) => ({ dir, title, ...checkSite(join(root, "samples", dir)) }));
for (const s of sites) if (s.meta.title) s.title = s.meta.title;
for (const s of sites) if (s.dir.startsWith("live")) s.title = `${s.meta.origin} — ${s.meta.generator} (live, ${s.meta.items} items, fetched ${s.meta.fetched_at?.slice(0, 10)})`;

// 3. clause mapping for each rule / schema layer (ids from conformance/clauses/clauses.json)
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

// 4. checks for summary.json
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

// grammar differential: one result per adapter that ran the corpus
const GRAMMAR_CLAUSES = { "reserved-version": ["C-10.1-01"], "unknown-id": ["C-10.2-01"], "partial-not-in-target": ["C-10.2-02"] };
const gIndex = (g) => Object.fromEntries((g?.results || []).map((r) => [r.case, r]));
const gByImpl = impls.filter((i) => i.grammar).map((i) => ({ id: i.id, idx: gIndex(i.grammar) }));
for (const c of cases) {
  const bad = gByImpl.map(({ id, idx }) => (idx[c.id] && !idx[c.id].ok ? `${id}: ${idx[c.id].diffs.join("; ")}` : null)).filter(Boolean);
  const cl = GRAMMAR_CLAUSES[c.id] || (c.expect.transclusions.some((t) => t.partial) ? ["C-10.2-02", "C-10.3-01"] : c.expect.transclusions.length ? ["C-10.2-01"] : []);
  add({ id: `schemas.grammar.${c.id}`, title: `Grammar: ${c.title}`, status: bad.length ? "fail" : c.ambiguous ? "warn" : "pass",
    detail: (bad.length ? bad.join(" | ") : gByImpl.map(({ id, idx }) => `${id} ${idx[c.id] ? "✓" : "–"}`).join(" ")) + (c.ambiguous ? ` — spec ambiguity: ${c.ambiguous}` : ""), spec_refs: c.spec_refs, decisions: c.decisions, clauses: cl });
}

// round trip: what an implementation that stores imported item documents loses
for (const i of impls.filter((i) => i.roundtrip)) {
  const R = i.roundtrip;
  const rt = (key, title, re, status, spec_refs, decisions, clauses, why) => {
    const hit = R.dropped.filter((x) => re.test(x.path));
    add({ id: `schemas.${i.id}.roundtrip.${key}`, title: `${i.name} round trip: ${title}`, status: hit.length ? status : "pass", detail: hit.length ? `${why} Dropped: ${hit.map((h) => `${h.path} (${h.count} docs)`).join(", ")}` : "preserved", spec_refs, decisions, clauses });
  };
  rt("selector", "partial-transclusion selector", /(^|\.)selector(\.|$)/, "warn", ["§10.3"], ["#49"], ["C-10.3-01"], "The stored transclusion has no selector. Readers may ignore it (§10.3), so this is not a reader failure; but any re-emission or local re-check (§10.2 MAY) from the stored copy sees partial quotes as whole ones.");
  rt("cited", "cited on references", /^(stub_of|forked_from|transclusions\[\])\.cited/, "warn", ["§5.9"], ["#30"], ["C-5.9-03", "C-5.9-07"], "§5.9 says importers retain cited verbatim.");
  rt("generated", "generation provenance", /^generated/, "warn", ["§5.7"], ["#20", "#37"], ["C-5.7-01"], "No generated[]: imported machine-generated spans lose their disclosure.");
  rt("author", "opaque author members", /^author(\.|$)/, "fail", ["§5.5"], ["#11"], ["C-5.5-05"], "author is an opaque pass-through; clients that store item JSON MUST carry it verbatim.");
  rt("changelog-generated", "changelog[].generated", /changelog\[\]\.generated/, "warn", ["§16.6c"], ["#40"], [], "Ruled member not kept.");
  add({ id: `schemas.${i.id}.roundtrip.parse`, title: `${i.name} parses every sampled item document`, status: R.failed.length ? "fail" : "pass", detail: `${R.parsed}/${R.documents} parsed${R.failed.length ? `; failures: ${R.failed.map((f) => f.path).join(", ")}` : ""}`, spec_refs: ["§13.1", "§3"], decisions: [], clauses: ["C-3-01", "C-5.5-03"] });
}
// static field coverage: does the implementation's pinned-version type keep a pin's citations?
for (const i of impls.filter((i) => i.static?.pinned)) {
  const missing = ["transclusions", "stub_of", "forked_from", "generated"].filter((k) => !i.static.pinned[k]?.[0]);
  add({ id: `schemas.${i.id}.static.pinned-citations`, title: `${i.name} reads a pin's citations`, status: missing.length ? "warn" : "pass", detail: missing.length ? `Its pinned-version type has no ${missing.join(", ")} — §8 rule 5: "a pin carries its own citations".` : "ok", spec_refs: ["§8"], decisions: ["#27"], clauses: [] });
}

// self-test
const studio = sites.find((s) => s.docs.some((d) => d.label === "thread")); // the reference scenario's labelled documents
const pick = (label) => studio?.docs.find((d) => d.label === label)?.doc;
const st = studio ? selftest({ thread: pick("thread"), stub: studio.docs.find((d) => d.label === "stubPartial")?.doc, fragment: pick("pins"), fork: pick("forkRemoteThread"), generated: pick("generated"), pinned: studio.docs.find((d) => d.type === "pinned")?.doc }) : [];
for (const t of st) add({ id: `schemas.selftest.${t.id}`, title: `Self-test: checker catches ${t.title}`, status: t.caught ? "pass" : "fail", detail: t.caught ? `caught by ${t.by.join(" · ")}` : "NOT caught — the checker is too lenient here", spec_refs: [], decisions: ["#48"], clauses: t.clauses });

const summary = { area: "schemas", title: "JSON Schemas, semantic rules and grammar differential", generated_at: new Date().toISOString(), checks };
writeOut("summary.json", summary);

// coverage for the explorer: one "emits" column per sample set (fake remote excluded)
const raw = (dir, f) => (existsSync(join(root, "samples", dir, f)) ? [JSON.parse(readFileSync(join(root, "samples", dir, f), "utf8"))] : []);
const emitCols = sites.filter((s) => s.dir !== "fake-remote").map((s) => {
  const of = (type) => s.docs.filter((d) => d.type === type).map((d) => d.doc);
  return { label: `${s.dir} emits`, title: s.title, paths: {
    item: observedPaths(of("item")), pinned: observedPaths(of("pinned")),
    manifest: observedPaths(raw(s.dir, "blyg.json")), index: observedPaths(raw(s.dir, "items/index.json")),
  } };
});
const tree = schemaTree();
// Live snapshots are other people's published words; the committed report
// shows the verdicts but not the documents (a withdrawal at the origin could
// never reach a copy in git history, §13.4). Hand-built and adapter samples
// keep their raw view.
const reportSites = sites.map((s) => s.dir.startsWith("live-") ? { ...s, docs: s.docs.map((d) => ({ ...d, doc: null })) } : s);
writeFileSync(join(OUT, "report.html"), renderReport({ summary, sites: reportSites, tree, emitCols, impls, cases, selftest: st, rules: RULES }));
const tally = checks.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {});
console.log(`summary: ${checks.length} checks ${JSON.stringify(tally)} → ${join(OUT, "summary.json")}, ${join(OUT, "report.html")}`);
