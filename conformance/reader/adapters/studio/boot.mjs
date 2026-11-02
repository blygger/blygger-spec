// Boot blygger-studio in process for the reader-suite adapter.
//
// The Worker is bundled from the studio checkout's own source with the
// checkout's own esbuild, run under the checkout's own Miniflare with D1 + R2,
// and migrated with the checkout's own migrations. The adapter then drives it
// only through its public HTTP surface: the owner REST contract
// (`src/contract/routes.ts`) to author and publish, and the wire documents
// (`items/{id}.json`) to read what was published. No studio module is imported
// and no SQL is written here, so a refactor inside the studio cannot break the
// adapter; only a change to the REST contract or to the wire can.
//
// Outbound fetches (subscriptions, the AI provider) go to `outbound`, a
// function the adapter supplies; nothing reaches the network.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

export async function bootStudio(studioDir, { origin, outbound }) {
  const req = createRequire(join(studioDir, "package.json"));
  // Resolve a package from the studio checkout, ESM-only packages included
  // (require.resolve refuses an `exports` map with no `require` condition).
  const imp = (name) => {
    try { return import(pathToFileURL(req.resolve(name)).href); }
    catch {
      const dir = join(studioDir, "node_modules", name);
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      let e = pkg.exports?.["."] ?? pkg.exports ?? pkg.module ?? pkg.main;
      while (e && typeof e === "object") e = e.import ?? e.default ?? e.node;
      return import(pathToFileURL(join(dir, e)).href);
    }
  };
  const { build } = await imp("esbuild");
  const { Miniflare, convertV4MiniflareOptions } = await imp("miniflare");
  const version = JSON.parse(readFileSync(join(studioDir, "package.json"), "utf8")).version;
  if (!existsSync(join(studioDir, "build", "studio-spa.txt"))) {
    throw new Error(`${studioDir}/build/ is missing: run \`npm ci && npm run build\` in the studio checkout first`);
  }

  const out = await build({
    entryPoints: [join(studioDir, "src/index.ts")], absWorkingDir: studioDir, bundle: true, platform: "neutral",
    mainFields: ["module", "main"], conditions: ["workerd", "worker", "browser"], format: "esm", target: "es2022",
    loader: { ".txt": "text", ".sql": "text" }, external: ["cloudflare:*", "node:*"], write: false, logLevel: "silent",
  });
  // Miniflare 5 (studio 0.49.x) takes a new options shape and ships
  // convertV4MiniflareOptions for the old one; Miniflare 3/4 take the old
  // shape directly. Use the converter when the checkout has it.
  const options = {
    modules: [{ type: "ESModule", path: "worker.mjs", contents: out.outputFiles[0].text }],
    compatibilityDate: "2026-07-01", compatibilityFlags: ["nodejs_compat"],
    bindings: {
      OWNER_PASSWORD: "reader-suite-password", COOKIE_SECRET: "reader-suite-cookie-secret", MOUNT: "", AI_PROVIDER_KEY: "fake-key",
      API_READ_LIMIT: "100000", API_WRITE_LIMIT: "100000",
      // The fake origins answer from outboundService, not DNS; skip the
      // studio's DNS preflight of outbound destinations (outbound-policy.ts).
      ALLOW_PRIVATE_FETCH: "true",
    },
    d1Databases: ["DB"], r2Buckets: ["MEDIA"], outboundService: outbound,
  };
  const mf = new Miniflare(convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options);
  const db = await mf.getD1Database("DB");
  // Migrations, split by the same reader the studio's own scripts use
  // (@cloudflare/vitest-plugin's readD1Migrations, which understands triggers);
  // a naive `;` splitter breaks on the CREATE TRIGGER bodies since 0024.
  const migDir = join(studioDir, "migrations");
  let migrations;
  try {
    const { readD1Migrations } = await imp("@cloudflare/vitest-plugin");
    migrations = (await readD1Migrations(migDir)).map((m) => m.queries);
  } catch {
    migrations = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort().map((f) =>
      readFileSync(join(migDir, f), "utf8").split("\n")
        .map((l) => { const i = l.indexOf("--"); return i >= 0 && !l.slice(0, i).includes("'") ? l.slice(0, i) : l; }).join("\n")
        .split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean));
  }
  for (const queries of migrations) if (queries.length) await db.batch(queries.map((s) => db.prepare(s)));
  await mf.ready;

  const base = origin.replace(/\/$/, "");
  const login = await mf.dispatchFetch(`${base}/studio/login`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: base },
    body: "password=reader-suite-password",
  });
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  if (!cookie) throw new Error(`studio login failed: HTTP ${login.status} ${(await login.text()).slice(0, 200)}`);

  async function api(method, path, body) {
    const init = { method, headers: { cookie, origin: base, accept: "application/json" } };
    if (body !== undefined) { init.body = JSON.stringify(body); init.headers["content-type"] = "application/json"; }
    const r = await mf.dispatchFetch(`${base}/api${path}`, init);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: r.status, json };
  }
  async function get(path) {
    const r = await mf.dispatchFetch(`${base}/${path.replace(/^\//, "")}`);
    return { status: r.status, text: await r.text() };
  }
  return { mf, api, get, version, dispose: () => mf.dispose() };
}
