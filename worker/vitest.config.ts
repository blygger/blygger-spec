import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
      return {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            OWNER_PASSWORD: "test-password",
            COOKIE_SECRET: "test-cookie-secret",
            // Pin the default mount explicitly (matches wrangler.jsonc vars);
            // mount.test.ts exercises other mounts via makeApp() directly.
            MOUNT: "/blyg",
          },
        },
      };
    }),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
