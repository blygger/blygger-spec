// The one way the conformance toolkit starts blygger-studio.
//
// Used by reader/adapters/studio (the reader suite), schemas/adapters/
// blygger-studio.mjs (the sample scenario and grammar corpus) and
// model/studio/vitest.config.mts (the differential harness, which needs only
// the package resolver and the migration reader: it runs inside the studio's
// own vitest pool, see model/README.md).
//
// bootStudio() bundles the Worker from the studio checkout's own source with
// the checkout's own esbuild, runs it under the checkout's own Miniflare with
// D1 + R2, migrates it with the checkout's own migrations, and logs in as the
// owner. The callers then drive it only through its public HTTP surface: the
// owner REST contract (`src/contract/routes.ts`) to author and publish, and
// the wire documents to read what was published. No studio module is
// imported and no SQL is written here, so a refactor inside the studio cannot
// break the toolkit; only a change to the REST contract or the wire can.
//
// Outbound fetches (subscriptions, the AI provider) go to `outbound`, a
// function the caller supplies; nothing reaches the network.
//
// Studio-version facts this file absorbs, so no caller has to:
// - Miniflare 5 (studio 0.49.x) takes a new options shape and ships
//   convertV4MiniflareOptions for the old one; Miniflare 3/4 take the old
//   shape directly.
// - The bundle needs `cloudflare:*` and `node:*` external, the workerd
//   conditions, and `.sql` loaded as text (0.49.x imports SQL files and
//   `cloudflare:workers`, and its MCP server dependency imports node:process).
// - Migrations are split by the studio's own reader (readD1Migrations, from
//   @cloudflare/vitest-plugin since 0.49.x, @cloudflare/vitest-pool-workers
//   before), which understands the CREATE TRIGGER bodies added in 0024; a
//   naive `;` splitter breaks on them. The splitter is kept only as a
//   fallback for checkouts that ship neither package.
// - Mutations of an item are conditional since contract 5.0.0 (0.49.12):
//   `expectedRevision` must name the item's current revision. mutate() reads
//   it first.
// - Request and response members are camelCase since contract 5.0.0
//   (`contentMd`, `stubOf`, `subscriptionId`).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

/** The studio checkout: $STUDIO_DIR, else `fallback`. */
export const studioDirFrom = (fallback) => resolve(process.env.STUDIO_DIR || fallback);

export const studioVersion = (studioDir) => JSON.parse(readFileSync(join(studioDir, "package.json"), "utf8")).version;

/**
 * Import a package from the studio checkout's node_modules, ESM-only packages
 * included (require.resolve refuses an `exports` map with no `require`
 * condition). `sub` names a file inside the package instead of its entry.
 */
export function studioImport(studioDir, name, sub) {
  if (sub) return import(pathToFileURL(join(studioDir, "node_modules", name, sub)).href);
  const req = createRequire(join(studioDir, "package.json"));
  try { return import(pathToFileURL(req.resolve(name)).href); }
  catch {
    const dir = join(studioDir, "node_modules", name);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    let e = pkg.exports?.["."] ?? pkg.exports ?? pkg.module ?? pkg.main;
    while (e && typeof e === "object") e = e.import ?? e.default ?? e.node;
    return import(pathToFileURL(join(dir, e)).href);
  }
}

/** The studio's Workers test pool package: its name changed at 0.49.x. */
export function studioTestPool(studioDir) {
  for (const name of ["@cloudflare/vitest-plugin", "@cloudflare/vitest-pool-workers"]) {
    if (existsSync(join(studioDir, "node_modules", name, "package.json"))) return { name, load: () => studioImport(studioDir, name) };
  }
  return null;
}

/** The studio's migrations as [{ name, queries }], read the way its own tests read them. */
export async function studioMigrations(studioDir) {
  const migDir = join(studioDir, "migrations");
  const pool = studioTestPool(studioDir);
  if (pool) {
    const mod = await pool.load();
    if (mod.readD1Migrations) return mod.readD1Migrations(migDir);
  }
  return readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort().map((name) => ({
    name,
    queries: readFileSync(join(migDir, name), "utf8").split("\n")
      .map((l) => { const i = l.indexOf("--"); return i >= 0 && !l.slice(0, i).includes("'") ? l.slice(0, i) : l; }).join("\n")
      .split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean),
  }));
}

/**
 * Boot the studio. `origin` is the public origin it serves (its mount is the
 * root); `outbound` answers every outbound fetch; `bindings` add to or
 * override the Worker's bindings.
 * Returns { mf, api, mutate, revision, get, version, dispose }.
 */
export async function bootStudio(studioDir, { origin, outbound, bindings = {}, password = "conformance-password" }) {
  const { build } = await studioImport(studioDir, "esbuild");
  const { Miniflare, convertV4MiniflareOptions } = await studioImport(studioDir, "miniflare");
  const version = studioVersion(studioDir);
  if (existsSync(join(studioDir, "src", "ui")) && !existsSync(join(studioDir, "build", "studio-spa.txt"))) {
    throw new Error(`${studioDir}/build/ is missing: run \`npm ci && npm run build\` in the studio checkout first`);
  }

  const out = await build({
    entryPoints: [join(studioDir, "src/index.ts")], absWorkingDir: studioDir, bundle: true, platform: "neutral",
    mainFields: ["module", "main"], conditions: ["workerd", "worker", "browser"], format: "esm", target: "es2022",
    loader: { ".txt": "text", ".sql": "text" }, external: ["cloudflare:*", "node:*"], write: false, logLevel: "silent",
  });
  const options = {
    modules: [{ type: "ESModule", path: "worker.mjs", contents: out.outputFiles[0].text }],
    compatibilityDate: "2026-07-01", compatibilityFlags: ["nodejs_compat"],
    bindings: {
      OWNER_PASSWORD: password, COOKIE_SECRET: "conformance-cookie-secret", MOUNT: "", AI_PROVIDER_KEY: "fake-key",
      API_READ_LIMIT: "100000", API_WRITE_LIMIT: "100000",
      // The fake origins answer from `outbound`, not DNS; skip the studio's
      // DNS preflight of outbound destinations (outbound-policy.ts).
      ALLOW_PRIVATE_FETCH: "true",
      ...bindings,
    },
    d1Databases: ["DB"], r2Buckets: ["MEDIA"], outboundService: outbound,
  };
  const mf = new Miniflare(convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options);
  const db = await mf.getD1Database("DB");
  for (const m of await studioMigrations(studioDir)) if (m.queries.length) await db.batch(m.queries.map((s) => db.prepare(s)));
  await mf.ready;

  const base = origin.replace(/\/$/, "");
  const login = await mf.dispatchFetch(`${base}/studio/login`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: base },
    body: `password=${encodeURIComponent(password)}`,
  });
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  if (!cookie) throw new Error(`studio login failed: HTTP ${login.status} ${(await login.text()).slice(0, 200)}`);

  /** One owner REST call. A FormData body goes as multipart; anything else as JSON. */
  async function api(method, path, body) {
    const init = { method, headers: { cookie, origin: base, accept: "application/json" } };
    if (body instanceof FormData) {
      // Serialize here: Miniflare's undici does not recognise Node's FormData.
      const r = new Response(body);
      init.headers["content-type"] = r.headers.get("content-type");
      init.body = new Uint8Array(await r.arrayBuffer());
    } else if (body !== undefined) { init.body = JSON.stringify(body); init.headers["content-type"] = "application/json"; }
    const r = await mf.dispatchFetch(`${base}/api${path}`, init);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: r.status, json };
  }
  /** The item's current revision (contract 5.0.0); undefined on a contract without one. */
  const revision = async (id) => (await api("GET", `/items/${id}`)).json?.revision;
  /** A conditional item mutation: `body` plus the item's current expectedRevision. */
  async function mutate(method, path, id, body = {}) {
    const rev = await revision(id);
    return api(method, path, rev === undefined ? body : { ...body, expectedRevision: rev });
  }
  /** A public GET, as a subscriber would make it. */
  async function get(path) {
    const r = await mf.dispatchFetch(`${base}/${path.replace(/^\//, "")}`);
    return { status: r.status, text: await r.text(), type: r.headers.get("content-type") };
  }
  return { mf, api, mutate, revision, get, version, dispose: () => mf.dispose() };
}
