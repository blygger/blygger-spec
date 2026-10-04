// Model-only campaigns and directed scenarios, in plain Node. Writes out/model-results.json.
//   MODEL_RUNS (default 1000, multiplied by a campaign's runFactor), MODEL_SEED (default 20261003), ONLY=P6-pre,P7
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CAMPAIGNS } from "../src/props/campaigns.ts";
import { replayCampaign, runCampaign } from "../src/props/harness.ts";
import { SCENARIOS } from "../src/props/scenarios.ts";

const here = import.meta.dirname;
const runs = Number(process.env.MODEL_RUNS ?? 1000);
const seed = Number(process.env.MODEL_SEED ?? 20261003);
const only = process.env.ONLY?.split(",");
const results = [];
const line = (r: any) => `${r.status === "pass" ? "PASS" : "FAIL"} ${r.id.padEnd(16)}${r.replayOf ? ` [${r.replayOf}]` : ""} runs=${r.numRuns} cmds=${r.commandsExecuted} ${r.ms}ms hits=${JSON.stringify(r.hits)}${r.failure ? `  → ${r.failure.prop}: ${r.failure.detail.slice(0, 200)} [${r.failure.commands.length} cmds]` : ""}${r.error ? ` ERROR ${String(r.error).slice(0, 200)}` : ""}`;
for (const c of CAMPAIGNS) {
  if (c.studioOnly || (only && !only.includes(c.id))) continue;
  const r = await runCampaign(c, { numRuns: runs * (c.runFactor ?? 1), seed });
  results.push(r);
  console.log(line(r));
}
for (const s of SCENARIOS) {
  const c = CAMPAIGNS.find((x) => x.id === s.campaign)!;
  if (only && !only.includes(c.id)) continue;
  const r = await replayCampaign(c, s.cmds, `scenario:${s.id}`);
  r.title = s.title;
  results.push(r);
  console.log(line(r));
}
mkdirSync(path.join(here, "..", "out"), { recursive: true });
writeFileSync(path.join(here, "..", "out", "model-results.json"), JSON.stringify({ generated_at: new Date().toISOString(), runs, seed, results }, null, 1));
