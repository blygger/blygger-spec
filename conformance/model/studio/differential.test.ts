// Differential campaigns: the SAME fast-check command sequences drive the
// reference model and the real blygger-studio (node S). Results are POSTed to
// http://results.model/ (see vitest.config.mts) one JSON line per campaign.
import { it } from "vitest";
import type { Cmd } from "../src/model/world.ts";
import { CAMPAIGNS } from "../src/props/campaigns.ts";
import { SCENARIOS } from "../src/props/scenarios.ts";
import { runCampaign, replayCampaign } from "../src/props/harness.ts";
import { Studio } from "./adapter.ts";

declare const __STUDIO_RUNS__: number;
declare const __STUDIO_SEED__: number;
declare const __STUDIO_ONLY__: string[] | null;
/** Model counterexamples (shrunk command data), keyed by campaign id, injected at config time. */
declare const __MODEL_CEX__: Record<string, Cmd[]>;

const post = (x: unknown) => fetch("http://results.model/", { method: "POST", body: JSON.stringify(x) });
const studio = new Studio();

it("meta", async () => {
  await post({ meta: { studioVersion: studio.version, runs: __STUDIO_RUNS__, seed: __STUDIO_SEED__ } });
});

for (const s of SCENARIOS) {
  const c = CAMPAIGNS.find((x) => x.id === s.campaign)!;
  if (c.modelOnly) continue;
  if (__STUDIO_ONLY__ && !__STUDIO_ONLY__.includes(c.id)) continue;
  it(`scenario ${s.id}`, async () => {
    let r: any;
    try { r = await replayCampaign(c, s.cmds, `scenario:${s.id}`, studio); r.title = s.title; } catch (e) { r = { id: c.id, subject: "studio", status: "fail", replayOf: `scenario:${s.id}`, error: String((e as Error)?.stack ?? e) }; }
    await post({ result: r });
  });
}

for (const c of CAMPAIGNS) {
  if (c.modelOnly) continue;
  if (__STUDIO_ONLY__ && !__STUDIO_ONLY__.includes(c.id)) continue;
  it(`campaign ${c.id}`, async () => {
    // Differential campaigns assert their D-checks; property campaigns assert the
    // property against the studio's own observations (P1 reads its public surface).
    const runs = Math.max(5, Math.round(__STUDIO_RUNS__ * Math.min(c.runFactor ?? 1, 2)));
    let r;
    try {
      r = await runCampaign(c, { numRuns: runs, seed: __STUDIO_SEED__, studio });
    } catch (e) {
      r = { id: c.id, props: c.props, subject: "studio", status: "fail", numRuns: 0, seed: __STUDIO_SEED__, commandsExecuted: 0, hits: {}, ms: 0, error: String((e as Error)?.stack ?? e) };
    }
    await post({ result: r });
    // Directed run: the model's own shrunk counterexample, against the studio.
    // For the post-#57 fork property, the PRE-#57 model counterexamples are the
    // interesting inputs: the exact sequences that broke the old fork.
    const sources = [c.id, ...(c.id === "P6-post" ? ["P6-pre", "P6-pre-nopartial"] : [])];
    for (const src of sources) {
      const cex = __MODEL_CEX__[src];
      if (!cex) continue;
      let rr;
      try { rr = await replayCampaign(c, cex, `model:${src}`, studio); } catch (e) { rr = { id: c.id, subject: "studio", status: "fail", replayOf: `model:${src}`, error: String((e as Error)?.stack ?? e) }; }
      await post({ result: rr });
    }
  });
}
