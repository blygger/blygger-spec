// One command: crawl → check → report.
//   node conformance/live/run.mjs [--offline] [--refresh] [--skip-crawl] [...]
// See README.md for flags.
import { parseArgs } from "./lib/args.mjs";
import { crawl } from "./crawl.mjs";
import { check } from "./check.mjs";
import { report } from "./report.mjs";

const opts = parseArgs(process.argv.slice(2));
if (!opts.skipCrawl) await crawl(opts);
const out = await check();
const kb = (await report()) / 1024;
for (const c of out.summary.checks) console.log(`${c.status.padEnd(5)} ${c.id.padEnd(34)} ${c.detail}`);
console.log(`\nwrote out/crawl.json, out/results.json, out/summary.json, out/report.html (${kb.toFixed(0)} KB)`);
