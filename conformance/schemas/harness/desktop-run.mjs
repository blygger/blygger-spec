// Drive blygger-desktop's crates through desktop-harness (a separate cargo
// project that depends on them by path):
//   1. the grammar corpus through blyg-render's render_preview (its studio preview, "as a blyg publishes it")
//   2. every sampled item document through blyg-core's public ItemDoc, re-serialized via its
//      ReadingItem / Lineage types, to measure what a round trip loses.
//   node harness/desktop-run.mjs [desktopDir]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { remoteTargets, RA, RB, RC } from "./fake-remote.mjs";
import { loadCases, subst, compare } from "./grammar-common.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const desktopDir = process.argv[2] || process.env.DESKTOP_DIR || join(process.env.HOME, "Code/blygger-desktop");
const hdir = join(root, "desktop-harness");
const target = join(hdir, "target");
const cache = join(root, ".cache");
mkdirSync(cache, { recursive: true });
mkdirSync(join(root, "out"), { recursive: true });

const ws = readFileSync(join(desktopDir, "Cargo.toml"), "utf8");
const version = (ws.match(/\[workspace\.package\][\s\S]*?version\s*=\s*"([^"]+)"/) || [])[1] || "?";
execFileSync("cargo", ["build", "--release", "--quiet", "--manifest-path", join(hdir, "Cargo.toml"), "--target-dir", target], { stdio: "inherit" });
const bin = join(target, "release", "blyg-conformance-harness");
const run = (mode, input) => {
  const f = join(cache, `desktop-${mode}-input.json`);
  writeFileSync(f, JSON.stringify(input));
  return JSON.parse(execFileSync(bin, [mode, f], { maxBuffer: 256 * 1024 * 1024 }).toString());
};

// ---- 1. grammar ----
const L = "00000000000000000000000001";
const targets = [...remoteTargets(), { id: L, origin: null, version: 1, kind: "fragment", content_html: "<p>Local source fragment about gardens and paths.</p>\n", page: null }];
const cases = loadCases().map((c) => subst(c, L));
const g = run("grammar", { targets, cases: cases.map((c) => ({ id: c.id, content_md: c.content_md })) });
const results = cases.map((c, i) => {
  const r = g.results[i];
  const actual = {
    error: r.unresolved.length > 0 || r.tk_errors.length > 0,
    errorText: [...r.unresolved.map((u) => `${u.directive}: ${u.reason}`), ...r.tk_errors].join("; "),
    html: r.html,
    transclusions: r.transclusions,
    tk_sources: r.tk_sources,
  };
  const v = compare(c.expect, actual, [RA, RB, RC, L]);
  return { case: c.id, file: c.file, ok: v.ok, diffs: v.diffs, parse: v.parse };
});
writeFileSync(join(root, "out", "grammar-desktop.json"), JSON.stringify({ implementation: `blygger-desktop ${version} (blyg-render render_preview)`, local_id: L, results }, null, 2));
console.log(`desktop ${version} grammar: ${results.filter((r) => r.ok).length}/${results.length} as expected`);

// ---- 2. document round trip ----
const sets = readdirSync(join(root, "samples")).filter((d) => existsSync(join(root, "samples", d, "items")));
const docsIn = [];
for (const set of sets) {
  const meta = existsSync(join(root, "samples", set, "scenario.json")) ? JSON.parse(readFileSync(join(root, "samples", set, "scenario.json"), "utf8")) : {};
  const idir = join(root, "samples", set, "items");
  for (const f of readdirSync(idir).filter((f) => /^[0-9a-z]{26}\.json$/.test(f))) {
    const json = readFileSync(join(idir, f), "utf8");
    docsIn.push({ path: `${set}/items/${f}`, origin: JSON.parse(json).origin || meta.origin || "", id: f.slice(0, 26), json });
  }
}
const d = run("docs", docsIn);

/** Leaf paths of a JSON value, arrays normalized to []. */
function leaves(v, p = "", out = new Set()) {
  if (Array.isArray(v)) { if (!v.length) out.add(p + "[]"); v.forEach((x) => leaves(x, p + "[]", out)); }
  else if (v && typeof v === "object") { const ks = Object.keys(v); if (!ks.length) out.add(p); for (const k of ks) leaves(v[k], p ? `${p}.${k}` : k, out); }
  else out.add(p);
  return out;
}
/** Where an input path would land in desktop's re-serialized output, if it survives. */
function mapPath(p) {
  const rules = [
    [/^id$/, "reading_item.remote_id"], [/^(kind|version|created|updated|content_md|content_html|page|origin)$/, "reading_item.$1"],
    [/^author\.(name|url)$/, "reading_item.author.$1"],
    [/^(stub_of|forked_from|transclusions)(.*)$/, "lineage.$1$2"],
    [/^changelog\[\]\.(version|at|note|pinned)$/, "versions[].$1"],
  ];
  for (const [re, to] of rules) if (re.test(p)) return p.replace(re, to);
  return null;
}
const loss = {}; // path -> {count, sets:Set}
let parsed = 0, failed = [];
d.results.forEach((r, i) => {
  if (!r.ok) { failed.push({ path: r.path, error: r.error }); return; }
  parsed++;
  const inLeaves = leaves(JSON.parse(docsIn[i].json));
  const outLeaves = leaves({ reading_item: r.reading_item, lineage: r.lineage, versions: r.versions });
  for (const p of inLeaves) {
    if (p === "changelog[].note" ) continue; // null notes are filtered by design
    const m = mapPath(p);
    if (m && outLeaves.has(m)) continue;
    const key = p;
    loss[key] ??= { count: 0, sets: new Set(), example: r.path };
    loss[key].count++;
    loss[key].sets.add(r.path.split("/")[0]);
  }
});
const lossList = Object.entries(loss).map(([path, v]) => ({ path, count: v.count, sets: [...v.sets], example: v.example })).sort((a, b) => b.count - a.count);
writeFileSync(join(root, "out", "desktop-roundtrip.json"), JSON.stringify({ implementation: `blygger-desktop ${version} (blyg-core api::public::ItemDoc → ReadingItem/Lineage)`, documents: docsIn.length, parsed, failed, dropped: lossList }, null, 2));
console.log(`desktop round trip: ${parsed}/${docsIn.length} parsed; ${lossList.length} input paths dropped`);
