// Differential campaigns against blygger-studio. Spawns the studio's own vitest
// (STUDIO_DIR, default ~/Code/blygger-studio) with studio/vitest.config.mts, then
// collects the result lines into out/studio-results.json.
//   STUDIO_RUNS (default 1000), STUDIO_SEED (default 20261003), ONLY=D1-importer,P1
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const here = import.meta.dirname;
const root = path.join(here, "..");
const STUDIO_DIR = process.env.STUDIO_DIR ?? path.join(process.env.HOME ?? "", "Code/blygger-studio");
const RAW = path.join(root, "out", ".studio-raw.jsonl");
rmSync(RAW, { force: true });

const vitest = path.join(STUDIO_DIR, "node_modules", "vitest", "vitest.mjs");
const t0 = Date.now();
const r = spawnSync(process.execPath, [vitest, "run", "--config", path.join(here, "..", "studio", "vitest.config.mts")], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env: { ...process.env, STUDIO_DIR },
  maxBuffer: 256 * 1024 * 1024,
});
const tail = (r.stdout + r.stderr).split("\n").filter((l) => !l.startsWith("Sourcemap for")).slice(-25).join("\n");
console.log(tail);

const lines = existsSync(RAW) ? readFileSync(RAW, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const meta = lines.find((l) => l.meta)?.meta ?? {};
const results = lines.filter((l) => l.result).map((l) => l.result);
const pkg = JSON.parse(readFileSync(path.join(STUDIO_DIR, "package.json"), "utf8"));
writeFileSync(path.join(root, "out", "studio-results.json"), JSON.stringify({
  generated_at: new Date().toISOString(), studioDir: STUDIO_DIR, studioVersion: meta.studioVersion ?? pkg.version, packageVersion: pkg.version,
  runs: meta.runs, seed: meta.seed, ms: Date.now() - t0, vitestExit: r.status, results,
}, null, 1));
for (const x of results) console.log(`${x.status === "pass" ? "PASS" : "FAIL"} studio ${x.id.padEnd(14)}${x.replayOf ? " (replay of model cex)" : ""} runs=${x.numRuns} cmds=${x.commandsExecuted} ${x.failure ? `→ ${x.failure.prop}: ${String(x.failure.detail).slice(0, 220)} [${x.failure.commands.length} cmds]` : ""}${x.error ? ` ERROR ${String(x.error).slice(0, 300)}` : ""}`);
