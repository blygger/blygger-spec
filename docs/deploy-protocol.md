# Deploy protocol

**Status:** built and in use (session 17, 2026-09-12). Operational tooling, not protocol surface — nothing here is normative for the spec.

One command pushes the current codebase to every live deployment this repo is responsible for, each against its own Cloudflare account, with a gate before and verification after.

```bash
cd worker
npm run deploy:all                      # gate → deploy every target → verify
npm run deploy:all -- --dry-run         # validate the plan, change nothing
npm run deploy:all -- --only venkateshrao
npm run deploy:all -- --migrate         # also apply pending D1 migrations
npm run deploy:all -- --skip-tests      # skip the tsc+vitest gate (not advised)
```

## Why this exists

Incident [`2026-09-12-01`](../../../incidents/2026-09-12-blygger-pi-wrong-account-deploy.md): a routine deploy of the PI node silently resolved to Venkat's **personal** Cloudflare account instead of the Protocol Institute org account, auto-provisioned a stray R2 bucket there, and failed on the cross-account D1 lookup. The `wrangler.jsonc` comment warning about exactly this was advisory — it could describe the mistake but not prevent it.

Deploying by hand also meant the two nodes could silently drift apart: nothing enforced that both got the same commit, and post-deploy verification was whatever the operator remembered to curl.

## The pieces

| File | Role |
|---|---|
| [`worker/deploy-targets.json`](../worker/deploy-targets.json) | The manifest — every live deployment, its account, public base URL, credential pointers, and verification checks |
| [`worker/scripts/deploy-all.ts`](../worker/scripts/deploy-all.ts) | The driver (CLI, `node --experimental-strip-types`, no dependencies) |
| [`worker/scripts/deploy-lib.ts`](../worker/scripts/deploy-lib.ts) | Pure helpers — cross-check, JSONC parse, migration reading, verification |
| [`worker/test/deploy-manifest.test.ts`](../worker/test/deploy-manifest.test.ts) | Tests the safety-critical parts against the **real committed files** |
| `worker/wrangler.jsonc` | Per-env `account_id` pins (added session 17) |

## Secrets: pointers only, never values

`deploy-targets.json` is committed. It records **where** each target's secrets are registered and **what they are called** — never a value:

```json
"credentials": {
  "registry": "Code/.env.keys",
  "worker_secrets": ["BLYG_VENKATESHRAO_OWNER_PASSWORD", "..."]
}
```

The deploy script never reads, prints, or transmits a secret. Worker secrets are set out-of-band with `wrangler secret put`, exactly as before. A test asserts the manifest contains no secret-shaped strings.

Account IDs *are* in the manifest. They are identifiers, not credentials (they appear in dashboard URLs, and were already in the committed config), and they need to be there for the cross-check below to work.

## Two independent guards against the wrong account

1. **`account_id` pinned per environment in `wrangler.jsonc`.** This alone fixes the incident: the exact command that failed (`wrangler deploy --env protocolInstitute`, no env var) now resolves to the correct account even run by hand, outside this tooling. Verified by re-running it.
2. **Cross-check before anything deploys.** The manifest and `wrangler.jsonc` each independently state the worker name and account id for every target; `crossCheckTarget()` asserts they agree and aborts the whole run on any mismatch — including an env with *no* `account_id` pinned at all. The duplication is deliberate: it is what makes the disagreement detectable.

Belt and braces: the script also exports `CLOUDFLARE_ACCOUNT_ID` per target when it shells out.

## Run order

1. **Load + cross-check** manifest against `wrangler.jsonc`. Any disagreement aborts before a single target is touched. Reports the commit, and warns if the working tree is dirty.
2. **Gate** — `tsc --noEmit`, then `vitest run`. Runs once, not per target. Failure aborts everything.
3. **Migration preflight for every target, before any deploy.** Pending migrations abort the run unless `--migrate` is passed. Checked up front so a schema change can't half-land across the network.
4. **Per target:** apply migrations (only with `--migrate`), deploy, then verify.
5. **Verify** each target's live surfaces — status code plus optional body substring, cache-busted (public surfaces send `Cache-Control: 60`, so an uncached check can read stale bytes). A deploy that succeeds but fails verification is reported as a failure.
6. **Summary** table; non-zero exit if any target failed.

## Design notes

**Migration detection is deliberately one-sided.** Only wrangler's explicit `No migrations to apply!` sentinel counts as up to date; *any* unrecognised output is treated as pending and stops the deploy. A future wrangler release that rewords its table should halt the run, not silently skip a schema change. Both real output formats are captured as test fixtures.

**The JSONC parser tracks string state.** `wrangler.jsonc` is full of URLs and route patterns (`venkateshrao.com/blyg/*`), so a regex that strips `//` would corrupt the config it is trying to read. Tested against that exact case.

**Verification paths are base-relative,** so the same check list works for a path-mounted node (`venkateshrao.com/blyg/`) and a root-mounted one (`blyg.protocol-institute.org/`) without special-casing the mount — consistent with decision #14's origin-relativity.

## Adding a target

1. Add the environment to `wrangler.jsonc` **including `account_id`**.
2. Add a matching entry to `deploy-targets.json` (same worker name and account id, plus base URL, credential pointers, verification checks).
3. Register its secrets in the appropriate registry file and set them with `wrangler secret put`.
4. `npm run deploy:all -- --dry-run` — the cross-check will name any disagreement.

The test suite will fail if the two files disagree, so a half-added target cannot be committed quietly.

## Scope

Deliberately scoped to this repo's two nodes. `Code/`-wide generalization (the same wrong-account risk exists in `venkateshrao-cloudflare/` and PI Workers projects) is noted as a candidate in the incident write-up, not built here.
