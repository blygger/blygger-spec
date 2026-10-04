// Boot blygger-studio in-process: esbuild its Worker, run it under Miniflare
// with D1 + R2, apply its own migrations, and expose a tiny authenticated
// client. Everything is loaded from the studio checkout itself (its own
// esbuild / miniflare), so nothing here pins a studio version.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { outboundService } from "./fake-remote.mjs";

export const STUDIO_ORIGIN = "https://studio.example/";

export async function bootStudio(studioDir) {
  const req = createRequire(join(studioDir, "package.json"));
  const imp = (name) => import(pathToFileURL(req.resolve(name)).href);
  const { build } = await imp("esbuild");
  const { Miniflare } = await imp("miniflare");
  const version = JSON.parse(readFileSync(join(studioDir, "package.json"), "utf8")).version;

  const out = await build({
    entryPoints: [join(studioDir, "src/index.ts")], absWorkingDir: studioDir, bundle: true, platform: "neutral",
    mainFields: ["module", "main"], format: "esm", target: "es2022", loader: { ".txt": "text" }, write: false, logLevel: "silent",
  });
  const mf = new Miniflare({
    modules: true, script: out.outputFiles[0].text, compatibilityDate: "2026-07-01",
    bindings: { OWNER_PASSWORD: "test-password", COOKIE_SECRET: "conformance-cookie-secret", MOUNT: "", AI_PROVIDER_KEY: "fake-key" },
    d1Databases: ["DB"], r2Buckets: ["MEDIA"], outboundService,
  });
  const db = await mf.getD1Database("DB");
  // Migrations, in filename order (no triggers in the studio's migrations, so
  // a statement splitter on `;` + newline is sufficient).
  const migDir = join(studioDir, "migrations");
  for (const f of readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(migDir, f), "utf8").split("\n").map((l) => { const i = l.indexOf("--"); return i >= 0 && !l.slice(0, i).includes("'") ? l.slice(0, i) : l; }).join("\n");
    const stmts = sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
    await db.batch(stmts.map((s) => db.prepare(s)));
  }
  await mf.ready;

  const base = STUDIO_ORIGIN.replace(/\/$/, "");
  const login = await mf.dispatchFetch(`${base}/studio/login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "password=test-password", redirect: "manual" });
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  if (!cookie) throw new Error(`studio login failed: ${login.status}`);

  async function api(method, path, body) {
    const init = { method, headers: { cookie } };
    if (body instanceof FormData) {
      // Serialize here: Miniflare's undici does not recognise Node's FormData.
      const r = new Response(body);
      init.headers["content-type"] = r.headers.get("content-type");
      init.body = new Uint8Array(await r.arrayBuffer());
    }
    else if (body !== undefined) { init.body = JSON.stringify(body); init.headers["content-type"] = "application/json"; }
    const r = await mf.dispatchFetch(`${base}/api${path}`, init);
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: r.status, json };
  }
  async function get(path) {
    const r = await mf.dispatchFetch(`${base}/${path.replace(/^\//, "")}`);
    return { status: r.status, text: await r.text(), type: r.headers.get("content-type") };
  }
  return { mf, db, api, get, version, dispose: () => mf.dispose() };
}
