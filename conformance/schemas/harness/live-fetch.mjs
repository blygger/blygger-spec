// Snapshot a live blyg's public surface into samples/<name>/.
//   node harness/live-fetch.mjs https://venkateshrao.com/blyg/ live-venkateshrao [maxItems]
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [origin = "https://venkateshrao.com/blyg/", name = "live-venkateshrao", max = "200"] = process.argv.slice(2);
const dir = join(here, "..", "samples", name);
const get = async (p) => {
  const r = await fetch(new URL(p, origin), { headers: { "user-agent": "blygger-conformance/0.3 (schemas)" }, redirect: "follow" });
  return { status: r.status, text: await r.text(), url: r.url };
};
const m = await get("blyg.json");
if (m.status !== 200) { console.error(`manifest ${m.status}`); process.exit(1); }
rmSync(dir, { recursive: true, force: true });
const put = (p, t) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), t); };
put("blyg.json", m.text);
const fetchedOrigin = m.url.replace(/blyg\.json$/, "");
put("feed.xml", (await get("feed.xml")).text);
const idx = await get("items/index.json");
put("items/index.json", idx.text);
const index = JSON.parse(idx.text);
let n = 0;
for (const e of index.items.slice(0, Number(max))) {
  const d = await get(`items/${e.id}.json`);
  if (d.status !== 200) continue;
  put(`items/${e.id}.json`, d.text);
  n++;
  for (const c of JSON.parse(d.text).changelog || []) if (c.pinned) {
    const p = await get(`items/${e.id}/v${c.version}.json`);
    put(`items/${e.id}/v${c.version}.json.status`, String(p.status));
    if (p.status === 200) put(`items/${e.id}/v${c.version}.json`, p.text);
  }
}
put("scenario.json", JSON.stringify({ origin: fetchedOrigin, fetched_at: new Date().toISOString(), generator: JSON.parse(m.text).generator, items: n, index_total: index.items.length }, null, 2));
console.log(`${name}: ${n} items from ${fetchedOrigin} (${JSON.parse(m.text).generator})`);
