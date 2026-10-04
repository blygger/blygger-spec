// Validate a sampled blyg directory (blyg.json, feed.xml, items/index.json,
// items/{id}.json, items/{id}/v{n}.json): schema layer + semantic rules + feed.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateDoc } from "./validate.mjs";
import { runRules, indexRules } from "./semantic.mjs";
import { checkFeed } from "./feed.mjs";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** Summarize rule results into a document verdict. */
function verdict(schema, rules) {
  if (schema.fail.length || rules.some((r) => r.level === "fail" && r.messages.length)) return "fail";
  if (schema.warn.length || rules.some((r) => r.level === "warn" && r.messages.length)) return "warn";
  if (rules.some((r) => r.level === "info" && r.messages.length)) return "info";
  return "pass";
}

export function checkSite(dir) {
  const meta = existsSync(join(dir, "scenario.json")) ? readJson(join(dir, "scenario.json")) : {};
  const origin = meta.origin;
  const docs = [];
  const manifest = readJson(join(dir, "blyg.json"));
  const ms = validateDoc("manifest", manifest);
  docs.push({ path: "blyg.json", type: "manifest", schema: ms, rules: [], verdict: verdict(ms, []) });

  const index = readJson(join(dir, "items/index.json"));
  const is = validateDoc("index", index);
  const items = {};
  const itemDir = join(dir, "items");
  for (const f of readdirSync(itemDir).filter((f) => /^[0-9a-z]{26}\.json$/.test(f))) items[f.slice(0, 26)] = readJson(join(itemDir, f));
  const ir = indexRules(index, items);
  docs.push({ path: "items/index.json", type: "index", schema: is, rules: ir, verdict: verdict(is, ir) });

  for (const [id, d] of Object.entries(items)) {
    const pins = {};
    const pdir = join(itemDir, id);
    if (existsSync(pdir)) for (const f of readdirSync(pdir).filter((f) => /^v\d+\.json$/.test(f))) pins[Number(f.slice(1, -5))] = readJson(join(pdir, f));
    const s = validateDoc("item", d);
    const r = runRules("item", d, { urlId: id, origin, pins });
    docs.push({ path: `items/${id}.json`, type: "item", kind: d.kind, label: meta.labels?.[id], schema: s, rules: r, verdict: verdict(s, r), doc: d });
    for (const [n, p] of Object.entries(pins)) {
      const ps = validateDoc("pinned", p);
      const pr = runRules("pinned", p, { item: d, origin });
      docs.push({ path: `items/${id}/v${n}.json`, type: "pinned", kind: p.kind, label: meta.labels?.[id] && `${meta.labels[id]} v${n}`, schema: ps, rules: pr, verdict: verdict(ps, pr), doc: p });
    }
  }
  if (existsSync(join(dir, "feed.xml"))) {
    const { results, parsed } = checkFeed(readFileSync(join(dir, "feed.xml"), "utf8"), { items, origin });
    docs.push({ path: "feed.xml", type: "feed", schema: { fail: [], warn: [] }, rules: results, verdict: verdict({ fail: [], warn: [] }, results), entries: parsed.items.length });
  }
  return { meta, manifest, docs };
}
