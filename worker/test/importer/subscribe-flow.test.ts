// Full subscribe loop against a fixture blyg: resolve -> create subscription
// -> initial backfill via index reconciliation — the same pipeline
// POST /api/subscriptions?confirm=true runs (§2.1 + §3.1 "import the full
// archive on first subscribe", plan §7 open decision #2). Exercised here at
// the module level with an injected fixture fetch, since the HTTP route
// itself defaults to real network (see api.test.ts's header note).
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { reconcileIndex } from "../../src/importer/poll.ts";
import { resolve } from "../../src/importer/resolve.ts";
import { createSubscription, listImportedItems } from "../../src/importer/store.ts";
import { indexBody, itemDocBody, makeFixtureFetch, manifestBody } from "./fixtures.ts";

describe("full subscribe loop (fixture blyg)", () => {
  it("resolves a fixture blyg, creates the subscription, and backfills its full archive", async () => {
    const ORIGIN = "https://fixture.example/blyg/";
    const doc1 = await itemDocBody({ id: "frag-1", kind: "fragment", version: 2, content_md: "first fragment, v2" });
    const doc2 = await itemDocBody({ id: "frag-2", kind: "fragment", version: 1, content_md: "second fragment" });
    const withdrawnDoc = await itemDocBody({ id: "gone", kind: "withdrawn", version: 3 });

    const { fetch } = makeFixtureFetch({
      [`${ORIGIN}blyg.json`]: { body: manifestBody({ site: ORIGIN, title: "Fixture Blyg", feed: "feed.xml" }) },
      [`${ORIGIN}items/index.json`]: {
        body: indexBody([
          { id: "frag-1", kind: "fragment", version: 2 },
          { id: "frag-2", kind: "fragment", version: 1 },
          { id: "gone", kind: "withdrawn", version: 3 },
        ]),
      },
      [`${ORIGIN}items/frag-1.json`]: { body: doc1 },
      [`${ORIGIN}items/frag-2.json`]: { body: doc2 },
      [`${ORIGIN}items/gone.json`]: { body: withdrawnDoc },
    });

    // Phase 1: resolution (what POST /api/subscriptions without `confirm` does).
    const resolved = await resolve(ORIGIN, fetch);
    expect(resolved).toMatchObject({ kind: "blyg", origin: ORIGIN });
    if (resolved.kind !== "blyg") throw new Error("expected blyg");

    // Phase 2: create + backfill (what confirm: true does).
    const sub = await createSubscription(env.DB, {
      kind: "blyg",
      origin: resolved.origin,
      feedUrl: `${resolved.origin}feed.xml`,
      title: typeof resolved.manifest.title === "string" ? resolved.manifest.title : "Fixture",
    });
    const backfill = await reconcileIndex(env.DB, sub, fetch);
    expect(backfill).toEqual({ ok: true, changed: 3 });

    const imports = await listImportedItems(env.DB, sub.id);
    expect(imports).toHaveLength(3);
    const byId = Object.fromEntries(imports.map((i) => [i.remote_id, i]));
    expect(byId["frag-1"]).toMatchObject({ state: "current", version: 2, content_md: "first fragment, v2" });
    expect(byId["frag-2"]).toMatchObject({ state: "current", version: 1, content_md: "second fragment" });
    expect(byId["gone"]).toMatchObject({ state: "tombstone", version: 3, content_md: "" });
  });
});
