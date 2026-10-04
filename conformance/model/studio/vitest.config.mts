// Runs the differential harness INSIDE blygger-studio's own test runtime
// (workerd via @cloudflare/vitest-pool-workers, miniflare D1), without editing
// or copying anything in that repo. Every studio dependency — vitest, the pool,
// wrangler config, migrations — is resolved from STUDIO_DIR, and vitest's root
// is the studio checkout (so the pool finds `vitest/worker` there); `test.dir`
// points discovery back at this directory.
//
// Results leave workerd through the outbound service: a POST to
// http://results.model/ is handled HERE, in the Node host process, and
// appended to out/.studio-raw.jsonl (workerd cannot write files, and
// console output from the pool is not reliably forwarded).
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const here = import.meta.dirname;
const STUDIO_DIR = process.env.STUDIO_DIR ?? path.join(process.env.HOME ?? "", "Code/blygger-studio");
const nm = (p: string) => pathToFileURL(path.join(STUDIO_DIR, "node_modules", p)).href;
const pool = await import(nm("@cloudflare/vitest-pool-workers/dist/pool/index.mjs"));
const { defineConfig } = await import(nm("vitest/dist/config.js"));
const RAW = path.join(here, "..", "out", ".studio-raw.jsonl");
mkdirSync(path.dirname(RAW), { recursive: true });

// The model's shrunk counterexamples are replayed against the studio as
// directed runs; they are injected as a compile-time constant.
const MODEL_RESULTS = path.join(here, "..", "out", "model-results.json");
const cex: Record<string, unknown[]> = {};
if (existsSync(MODEL_RESULTS)) {
  for (const r of JSON.parse(readFileSync(MODEL_RESULTS, "utf8")).results) if (r.failure?.cmdData && !r.replayOf) cex[r.id] = r.failure.cmdData;
}

export default defineConfig({
  root: STUDIO_DIR,
  resolve: { alias: { "@studio": path.join(STUDIO_DIR, "src") } },
  define: {
    __MODEL_CEX__: JSON.stringify(cex),
    __STUDIO_ONLY__: JSON.stringify(process.env.ONLY ? process.env.ONLY.split(",") : null),
    __STUDIO_RUNS__: JSON.stringify(Number(process.env.STUDIO_RUNS ?? 1000)),
    __STUDIO_SEED__: JSON.stringify(Number(process.env.STUDIO_SEED ?? 20261003)),
  },
  plugins: [
    pool.cloudflareTest(async () => {
      const migrations = await pool.readD1Migrations(path.join(STUDIO_DIR, "migrations"));
      return {
        wrangler: { configPath: path.join(STUDIO_DIR, "wrangler.jsonc") },
        miniflare: {
          // The studio's own tests return 503 for every outbound fetch; we do
          // the same, except for the result channel.
          outboundService: async (req: Request) => {
            if (new URL(req.url).host === "results.model") {
              appendFileSync(RAW, (await req.text()) + "\n");
              return new Response("ok");
            }
            return new Response(null, { status: 503 });
          },
          bindings: {
            TEST_MIGRATIONS: migrations,
            OWNER_PASSWORD: "test-password",
            COOKIE_SECRET: "test-cookie-secret",
            MOUNT: "/blyg",
          },
        },
      };
    }),
  ],
  server: { fs: { allow: [STUDIO_DIR, path.join(here, "..")] } },
  test: {
    dir: here,
    include: ["**/*.test.ts"],
    setupFiles: [path.join(here, "setup.ts")],
    testTimeout: 900_000,
  },
});
