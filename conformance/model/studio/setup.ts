// Same as blygger-studio's test/apply-migrations.ts: a fresh miniflare D1 with
// the studio's own migrations applied.
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations((env as any).DB, (env as any).TEST_MIGRATIONS);
