// The deploy protocol's safety net: deploy-targets.json and wrangler.jsonc must
// agree about which Cloudflare account each target deploys to. Incident
// 2026-09-12-01 was a deploy silently resolving to the wrong account, so these
// tests cover the real committed files, not just the pure functions.

import { describe, expect, it } from "vitest";
import manifest from "../deploy-targets.json";
import {
  crossCheckTarget,
  describeVerifyFailure,
  hasPendingMigrations,
  stripJsonComments,
  verifyUrl,
  wranglerEnv,
  type DeployTarget,
} from "../scripts/deploy-lib.ts";
import wranglerRaw from "../wrangler.jsonc?raw";

const wranglerConfig = JSON.parse(stripJsonComments(wranglerRaw));
const targets = manifest.targets as DeployTarget[];

describe("stripJsonComments", () => {
  it("strips line and block comments", () => {
    expect(JSON.parse(stripJsonComments('{ // hi\n "a": 1 /* there */ }'))).toEqual({ a: 1 });
  });

  it("does not corrupt the // inside string literals", () => {
    // The bug this guards: wrangler.jsonc is full of URLs and route patterns.
    const src = '{ "url": "https://example.com/blyg", "p": "a.com/x/*" }';
    expect(JSON.parse(stripJsonComments(src))).toEqual({ url: "https://example.com/blyg", p: "a.com/x/*" });
  });

  it("handles escaped quotes before a comment", () => {
    expect(JSON.parse(stripJsonComments('{ "a": "say \\"hi\\"" } // done'))).toEqual({ a: 'say "hi"' });
  });

  it("parses the real wrangler.jsonc", () => {
    expect(wranglerConfig.name).toBe("blyg");
  });
});

describe("the committed manifest agrees with the committed wrangler config", () => {
  it("lists at least the two live nodes", () => {
    expect(targets.map((t) => t.env).sort()).toEqual(["protocolInstitute", "venkateshrao"]);
  });

  it.each(targets.map((t) => [t.env, t] as const))("%s cross-checks clean", (_env, target) => {
    expect(crossCheckTarget(target, wranglerConfig)).toEqual([]);
  });

  it.each(targets.map((t) => [t.env, t] as const))("%s pins an account_id in wrangler.jsonc", (_env, target) => {
    expect(wranglerEnv(wranglerConfig, target.env)?.account_id).toBe(target.account_id);
  });

  it("keeps the two nodes on different Cloudflare accounts", () => {
    // Not a style preference: these two really are billed to different
    // accounts, which is what made the wrong-account deploy possible.
    expect(new Set(targets.map((t) => t.account_id)).size).toBe(targets.length);
  });

  it("stores no secret values, only pointers", () => {
    const serialized = JSON.stringify(manifest);
    for (const marker of ["PASSWORD=", "SECRET=", "sk-ant", "-----BEGIN"]) {
      expect(serialized).not.toContain(marker);
    }
    for (const t of targets) {
      expect(t.credentials?.registry).toBeTruthy();
      for (const name of t.credentials?.worker_secrets ?? []) {
        expect(name).toMatch(/^[A-Z0-9_]+$/);
      }
    }
  });
});

describe("crossCheckTarget catches real drift", () => {
  const base = targets[0];

  it("flags an unknown env", () => {
    expect(crossCheckTarget({ ...base, env: "nope" }, wranglerConfig)[0]).toMatch(/no env "nope"/);
  });

  it("flags a worker-name mismatch", () => {
    expect(crossCheckTarget({ ...base, worker: "wrong-name" }, wranglerConfig)[0]).toMatch(/worker name mismatch/);
  });

  it("flags an account-id mismatch — the incident's failure mode", () => {
    const drifted = { ...base, account_id: "0000000000000000000000000000000f" };
    expect(crossCheckTarget(drifted, wranglerConfig)[0]).toMatch(/account_id mismatch/);
  });

  it("flags an env with no account_id pinned at all", () => {
    const config = { env: { solo: { name: base.worker } } };
    expect(crossCheckTarget({ ...base, env: "solo" }, config)[0]).toMatch(/no account_id pinned/);
  });
});

describe("hasPendingMigrations", () => {
  // Both fixtures are real `wrangler d1 migrations list --remote` output,
  // captured against the venkateshrao node (wrangler 4.112.0).
  it("reads the up-to-date sentinel", () => {
    expect(hasPendingMigrations("Resource location: remote \n\n✅ No migrations to apply!\n")).toBe(false);
  });

  it("reads the pending-migrations table", () => {
    const out = [
      "Resource location: remote ",
      "",
      "Migrations to be applied:",
      "┌───────────────────────┐",
      "│ Name                  │",
      "├───────────────────────┤",
      "│ 9999_deploy_probe.sql │",
      "└───────────────────────┘",
    ].join("\n");
    expect(hasPendingMigrations(out)).toBe(true);
  });

  it("treats unrecognised output as pending, not as up to date", () => {
    // A wrangler upgrade that reworded the table must stop the deploy, not
    // silently skip a schema change.
    expect(hasPendingMigrations("some future wrangler format nobody predicted")).toBe(true);
    expect(hasPendingMigrations("")).toBe(true);
  });
});

describe("verification helpers", () => {
  it("resolves and cache-busts a check URL against the target base", () => {
    const url = verifyUrl("https://example.com/blyg/", { path: "blyg.json", status: 200 }, "42");
    expect(url).toBe("https://example.com/blyg/blyg.json?_deploycheck=42");
  });

  it("resolves against a root-mounted base too", () => {
    const url = verifyUrl("https://blyg.example.org/", { path: "feed.xml", status: 200 }, "7");
    expect(url).toBe("https://blyg.example.org/feed.xml?_deploycheck=7");
  });

  it("passes a matching status and body", () => {
    expect(describeVerifyFailure({ path: "a", status: 200, contains: "ok" }, 200, "it is ok")).toBeNull();
  });

  it("fails a wrong status", () => {
    expect(describeVerifyFailure({ path: "a", status: 200 }, 500, "")).toMatch(/expected 200, got 500/);
  });

  it("fails a right status with missing body content", () => {
    expect(describeVerifyFailure({ path: "a", status: 200, contains: "rss" }, 200, "nope")).toMatch(/missing/);
  });
});
