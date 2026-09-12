// Pure helpers for the deploy protocol (scripts/deploy-all.ts). Kept free of
// fs/process/network so test/deploy-manifest.test.ts can exercise the
// safety-critical cross-check directly. No secret ever passes through here.

export interface VerifyCheck {
  path: string;
  status: number;
  contains?: string;
}

export interface DeployTarget {
  env: string;
  label: string;
  worker: string;
  account_id: string;
  account_label: string;
  base: string;
  credentials?: { registry?: string; worker_secrets?: string[]; note?: string };
  verify: VerifyCheck[];
}

export interface DeployManifest {
  targets: DeployTarget[];
}

/**
 * Strip `//` line comments from JSONC without corrupting string literals —
 * wrangler.jsonc is full of URLs, whose `//` must survive. Tracks in-string
 * state and backslash escapes rather than regex-replacing.
 */
export function stripJsonComments(src: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i++;
      continue;
    }
    out += ch;
  }
  return out;
}

export interface WranglerEnvConfig {
  name?: string;
  account_id?: string;
}

/** Pull one named environment's block out of a parsed wrangler config. */
export function wranglerEnv(config: unknown, env: string): WranglerEnvConfig | undefined {
  const envs = (config as { env?: Record<string, WranglerEnvConfig> } | null)?.env;
  return envs?.[env];
}

/**
 * Assert the manifest and wrangler.jsonc agree about what a target IS before
 * anything is deployed. The deliberate duplication of worker name and
 * account id across the two files exists so this check can exist: incident
 * 2026-09-12-01 was a deploy silently resolving to the wrong Cloudflare
 * account, which a comment in the config could describe but not prevent.
 * Returns a list of human-readable problems; empty means agreement.
 */
export function crossCheckTarget(target: DeployTarget, config: unknown): string[] {
  const problems: string[] = [];
  const envConfig = wranglerEnv(config, target.env);
  if (!envConfig) {
    problems.push(`wrangler.jsonc has no env "${target.env}" (manifest target "${target.label}")`);
    return problems;
  }
  if (envConfig.name !== target.worker) {
    problems.push(
      `worker name mismatch for env "${target.env}": manifest says "${target.worker}", wrangler.jsonc says "${envConfig.name ?? "(unset)"}"`,
    );
  }
  if (!envConfig.account_id) {
    problems.push(
      `env "${target.env}" has no account_id pinned in wrangler.jsonc — a bare deploy could resolve to the wrong Cloudflare account (incident 2026-09-12-01)`,
    );
  } else if (envConfig.account_id !== target.account_id) {
    problems.push(
      `account_id mismatch for env "${target.env}": manifest says ${target.account_id} (${target.account_label}), wrangler.jsonc says ${envConfig.account_id}`,
    );
  }
  return problems;
}

/** Absolute URL for one verification check, cache-busted (public surfaces send Cache-Control: 60). */
export function verifyUrl(base: string, check: VerifyCheck, nonce: string): string {
  const url = new URL(check.path, base);
  url.searchParams.set("_deploycheck", nonce);
  return url.toString();
}

/**
 * Read `wrangler d1 migrations list` output. Deliberately one-sided: only the
 * explicit "No migrations to apply!" sentinel counts as up to date, so an
 * unrecognised format (a wrangler upgrade changing the table, a warning) is
 * treated as PENDING and stops the deploy rather than silently skipping a
 * schema change. Fail-safe beats fail-quiet when the alternative is a worker
 * deployed against a database that lacks its columns.
 */
export function hasPendingMigrations(cliOutput: string): boolean {
  return !/No migrations to apply/i.test(cliOutput);
}

export function describeVerifyFailure(check: VerifyCheck, status: number, body: string): string | null {
  if (status !== check.status) return `${check.path}: expected ${check.status}, got ${status}`;
  if (check.contains && !body.includes(check.contains)) {
    return `${check.path}: ${check.status} OK but body missing ${JSON.stringify(check.contains)}`;
  }
  return null;
}
