// Runs the differential harness INSIDE blygger-studio's own test runtime
// (workerd via the studio's Workers vitest pool, miniflare D1), without editing
// or copying anything in that repo. Every studio dependency — vitest, the pool,
// wrangler config, migrations — is resolved from STUDIO_DIR, and vitest's root
// is the studio checkout (so the pool finds `vitest/worker` there); `test.dir`
// points discovery back at this directory.
//
// The pool package and the migration reader come from conformance/lib/
// studio-boot.mjs, the toolkit's one way to start the studio (reader/ and
// schemas/ boot it with the same module; this harness needs the pool instead
// because it calls studio internals, see ../README.md). The pool is
// @cloudflare/vitest-plugin from studio 0.49.x, @cloudflare/vitest-pool-workers
// before.
//
// Results leave workerd through the outbound service: a POST to
// http://results.model/ is handled HERE, in the Node host process, and
// appended to out/.studio-raw.jsonl (workerd cannot write files, and
// console output from the pool is not reliably forwarded).
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
// @ts-ignore: a plain ES module shared by the toolkit's three studio harnesses
import { studioImport, studioMigrations, studioTestPool } from "../../lib/studio-boot.mjs";

const here = import.meta.dirname;
const STUDIO_DIR = process.env.STUDIO_DIR ?? path.join(process.env.HOME ?? "", "Code/blygger-studio");
const poolPkg = studioTestPool(STUDIO_DIR);
if (!poolPkg) throw new Error(`${STUDIO_DIR} has no Workers vitest pool (@cloudflare/vitest-plugin or @cloudflare/vitest-pool-workers): run npm ci there`);
const pool = await poolPkg.load();
const cloudflareTest = pool.cloudflareTest ?? pool.cloudflarePool;
const { defineConfig } = await studioImport(STUDIO_DIR, "vitest", "dist/config.js");
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
    cloudflareTest(async () => {
      const migrations = await studioMigrations(STUDIO_DIR);
      return {
        wrangler: { configPath: path.join(STUDIO_DIR, "wrangler.jsonc") },
        // As in the studio's own config: never proxy a remote binding (an
        // operator's Workers AI) from a test.
        remoteBindings: false,
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
            // The owner's per-minute API budget (0.28) is a production guard;
            // campaigns pin and withdraw far more often than 120 times a minute.
            API_READ_LIMIT: "100000",
            API_WRITE_LIMIT: "100000",
          },
        },
      };
    }),
  ],
  server: { fs: { allow: [STUDIO_DIR, path.join(here, "..", "..")] } },
  test: {
    dir: here,
    include: ["**/*.test.ts"],
    setupFiles: [path.join(here, "setup.ts")],
    testTimeout: 900_000,
  },
});
