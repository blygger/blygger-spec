// Deploy protocol — push the current codebase to every live deployment listed
// in deploy-targets.json, each against its own pinned Cloudflare account.
//
//   npm run deploy:all                 # gate, deploy every target, verify
//   npm run deploy:all -- --dry-run    # show the plan, change nothing
//   npm run deploy:all -- --only venkateshrao
//   npm run deploy:all -- --migrate    # also apply pending D1 migrations
//   npm run deploy:all -- --skip-tests # skip the tsc+vitest gate (not advised)
//
// Secrets: this script never reads, prints, or transmits one. Worker secrets
// are set out-of-band (`wrangler secret put`); deploy-targets.json records
// only their names and which registry file holds them.
//
// Runs under `node --experimental-strip-types` (Node 22+); no dependencies.

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  crossCheckTarget,
  describeVerifyFailure,
  hasPendingMigrations,
  stripJsonComments,
  verifyUrl,
  type DeployManifest,
  type DeployTarget,
} from "./deploy-lib.ts";

const root = path.join(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const migrate = process.argv.includes("--migrate");
const skipTests = process.argv.includes("--skip-tests");
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : undefined;

function run(cmd: string, args: string[], env?: Record<string, string>) {
  return spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

function runInherit(cmd: string, args: string[], env?: Record<string, string>) {
  return spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function die(msg: string): never {
  console.error(`\n✘ ${msg}`);
  process.exit(1);
}

// --- Load manifest + wrangler config, and make them agree ---

const manifest = JSON.parse(await readFile(path.join(root, "deploy-targets.json"), "utf8")) as DeployManifest;
const wranglerConfig = JSON.parse(stripJsonComments(await readFile(path.join(root, "wrangler.jsonc"), "utf8")));

let targets: DeployTarget[] = manifest.targets;
if (only) {
  targets = targets.filter((t) => t.env === only);
  if (!targets.length) die(`--only ${only}: no such target. Known: ${manifest.targets.map((t) => t.env).join(", ")}`);
}

const problems = targets.flatMap((t) => crossCheckTarget(t, wranglerConfig));
if (problems.length) {
  die(`deploy-targets.json and wrangler.jsonc disagree:\n  - ${problems.join("\n  - ")}`);
}

const commit = run("git", ["rev-parse", "--short", "HEAD"]).stdout?.trim() || "(unknown)";
const dirty = (run("git", ["status", "--porcelain"]).stdout ?? "").trim().length > 0;

console.log(`\nblyg deploy protocol — ${targets.length} target(s), commit ${commit}${dirty ? " (working tree DIRTY)" : ""}`);
for (const t of targets) {
  console.log(`  • ${t.env.padEnd(18)} ${t.worker.padEnd(26)} ${t.account_label}`);
  console.log(`    ${t.base}`);
}
if (dirty) console.log("\n  ! Working tree has uncommitted changes — deploying code that is not committed.");

// --- Gate: typecheck + tests, once, before any target is touched ---

if (!skipTests && !dryRun) {
  console.log("\n— gate: tsc --noEmit");
  if (runInherit("npx", ["tsc", "--noEmit"]).status !== 0) die("typecheck failed — nothing deployed.");
  console.log("\n— gate: vitest run");
  if (runInherit("npx", ["vitest", "run"]).status !== 0) die("tests failed — nothing deployed.");
} else if (skipTests) {
  console.log("\n  ! --skip-tests: deploying without the typecheck/test gate.");
}

// --- Migration preflight across ALL targets before ANY deploy ---
// A half-deployed network is worse than an undeployed one, so pending
// migrations are surfaced for every target up front rather than discovered
// midway through the loop.

console.log("\n— migration preflight");
const pending = new Map<string, string>();
for (const t of targets) {
  const res = run("npx", ["wrangler", "d1", "migrations", "list", "DB", "--remote", "--env", t.env], {
    CLOUDFLARE_ACCOUNT_ID: t.account_id,
  });
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  if (res.status !== 0) die(`could not list migrations for ${t.env}:\n${out}`);
  const hasPending = hasPendingMigrations(out);
  console.log(`  ${t.env.padEnd(18)} ${hasPending ? "PENDING migrations" : "up to date"}`);
  if (hasPending) pending.set(t.env, out.trim());
}
if (pending.size && !migrate) {
  die(
    `pending D1 migrations on: ${[...pending.keys()].join(", ")}\n` +
      `Re-run with --migrate to apply them as part of the deploy, or apply them by hand first.\n` +
      `Nothing has been deployed.`,
  );
}

if (dryRun) {
  console.log("\n--dry-run: plan validated, nothing deployed.");
  process.exit(0);
}

// --- Deploy + verify, per target ---

const results: { env: string; ok: boolean; detail: string }[] = [];

for (const t of targets) {
  console.log(`\n=== ${t.env} — ${t.label} ===`);

  if (migrate && pending.has(t.env)) {
    console.log(`— applying migrations (${t.account_label})`);
    const res = runInherit(
      "npx",
      ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--env", t.env],
      { CLOUDFLARE_ACCOUNT_ID: t.account_id },
    );
    if (res.status !== 0) {
      results.push({ env: t.env, ok: false, detail: "migration failed — worker NOT deployed" });
      continue;
    }
  }

  console.log(`— deploying to ${t.account_label}`);
  // CLOUDFLARE_ACCOUNT_ID is pinned here in addition to wrangler.jsonc's
  // account_id: belt and braces against the wrong-account deploy of
  // incident 2026-09-12-01.
  const deployed = runInherit("npx", ["wrangler", "deploy", "--env", t.env], {
    CLOUDFLARE_ACCOUNT_ID: t.account_id,
  });
  if (deployed.status !== 0) {
    results.push({ env: t.env, ok: false, detail: "wrangler deploy failed" });
    continue;
  }

  console.log("— verifying live surfaces");
  const nonce = `${Date.now()}`;
  const failures: string[] = [];
  for (const check of t.verify) {
    const url = verifyUrl(t.base, check, nonce);
    try {
      const res = await fetch(url, { redirect: "manual" });
      const body = check.contains ? await res.text() : "";
      const failure = describeVerifyFailure(check, res.status, body);
      console.log(`  ${failure ? "✘" : "✓"} ${check.path} → ${res.status}`);
      if (failure) failures.push(failure);
    } catch (err) {
      const msg = `${check.path}: fetch failed (${err instanceof Error ? err.message : String(err)})`;
      console.log(`  ✘ ${msg}`);
      failures.push(msg);
    }
  }
  results.push(
    failures.length
      ? { env: t.env, ok: false, detail: `deployed, but verification failed:\n      ${failures.join("\n      ")}` }
      : { env: t.env, ok: true, detail: `deployed and verified (${t.verify.length} checks)` },
  );
}

// --- Summary ---

console.log(`\n${"=".repeat(60)}\ndeploy summary — commit ${commit}`);
for (const r of results) console.log(`  ${r.ok ? "✓" : "✘"} ${r.env.padEnd(18)} ${r.detail}`);
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n${failed.length} of ${results.length} target(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} target(s) deployed and verified.`);
