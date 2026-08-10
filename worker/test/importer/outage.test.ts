// Simulated-outage integration test (§4.3/§6): scripted publish sequence on
// node A, subscriber B offline past the feed window, reconnect, assert
// lossless convergence via index reconciliation — item-by-item.
//
// Both "nodes" are the one worker under test (it plays publisher for its
// own content and subscriber for anything it tracks); the FetchLike below
// routes through SELF.fetch so the subscribe-side machinery exercises real
// HTTP-shaped requests against the actual public routes, not a hand-rolled
// fixture map.
//
// The scenario is deliberately built so recovery CANNOT come from the feed
// window alone: item A's one missed edit and item C's withdrawal both get
// pushed out of the 50-entry window by unrelated churn on item D before the
// subscriber ever reconnects, so only an index diff can find them.
import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { FetchLike, FetchResult } from "../../src/importer/http.ts";
import { pollSubscription } from "../../src/importer/poll.ts";
import { createSubscription, getSubscription, listImportedItems } from "../../src/importer/store.ts";
import { FEED_WINDOW } from "../../src/types.ts";
import { apiJson, BASE, createAndPublish, getPublic, login } from "../helpers.ts";

const selfFetch: FetchLike = async (url, init) => {
  const res = await SELF.fetch(url, { headers: init?.headers });
  const result: FetchResult = { ok: res.ok, status: res.status, url: res.url || url, headers: res.headers, text: () => res.text() };
  return result;
};

describe("simulated outage — lossless convergence (§4.3/§6)", () => {
  it("a subscriber offline past the feed window recovers every item losslessly via index reconciliation", async () => {
    const cookie = await login();

    // --- Node A: publish a small starting archive. ---
    const idA = await createAndPublish(cookie, "item A, v1");
    const idB = await createAndPublish(cookie, "item B, churn generator");
    const idC = await createAndPublish(cookie, "item C, v1 — will be withdrawn during the outage");

    // --- Node B (subscriber): subscribe (initial backfill via pollSubscription's first-sync reconciliation). ---
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: `${BASE}/blyg/`, feedUrl: `${BASE}/blyg/feed.xml`, title: "Node A" });
    const initial = await pollSubscription(env.DB, sub, selfFetch);
    expect(initial.outcome).toBe("polled");
    expect(await listImportedItems(env.DB, sub.id)).toHaveLength(3);

    // --- Outage: node A publishes; the subscriber never polls. ---
    // The two events we actually care about recovering, published first so
    // later churn pushes them out of the window entirely:
    await apiJson(cookie, "PUT", `/api/items/${idA}`, { content_md: "item A, v2 (missed edit)" });
    await apiJson(cookie, "POST", `/api/items/${idA}/publish`, {});
    await apiJson(cookie, "POST", `/api/items/${idC}/withdraw`, {});
    // Pure churn on a third item — enough to scroll both events above
    // completely out of the FEED_WINDOW-entry feed.
    for (let i = 0; i < FEED_WINDOW + 5; i++) {
      await apiJson(cookie, "PUT", `/api/items/${idB}`, { content_md: `item B, churn ${i}` });
      await apiJson(cookie, "POST", `/api/items/${idB}/publish`, {});
    }

    // Sanity check on the scenario itself: A's and C's events are indeed gone from the feed window.
    const feedXml = await (await getPublic("/blyg/feed.xml")).text();
    expect(feedXml).not.toContain(`blyg:${idA}:v2`);
    expect(feedXml).not.toContain(`blyg:${idC}:v2`);

    // --- Reconnect. ---
    const reconnect = await pollSubscription(env.DB, sub, selfFetch);
    expect(reconnect.outcome).toBe("polled");
    expect(reconnect.reconciled).toBe(true);

    // --- Assert lossless, item-by-item, against node A's own archive index. ---
    const index = await (await getPublic("/blyg/items/index.json")).json<{ items: { id: string; kind: string; version: number }[] }>();
    expect(index.items).toHaveLength(3);

    const imports = await listImportedItems(env.DB, sub.id);
    expect(imports).toHaveLength(3);
    const byId = Object.fromEntries(imports.map((i) => [i.remote_id, i]));

    for (const entry of index.items) {
      const imported = byId[entry.id];
      expect(imported, `missing import for ${entry.id}`).toBeDefined();
      expect(imported.version).toBe(entry.version);
      expect(imported.state).toBe(entry.kind === "withdrawn" ? "tombstone" : "current");
    }

    expect(byId[idA]).toMatchObject({ version: 2, content_md: "item A, v2 (missed edit)", state: "current" });
    expect(byId[idB]).toMatchObject({ version: FEED_WINDOW + 6, content_md: `item B, churn ${FEED_WINDOW + 4}` });
    expect(byId[idC]).toMatchObject({ version: 2, state: "tombstone", content_md: "" });

    // The subscription itself should show clean bookkeeping, not a degraded/lossy state.
    const finalSub = await getSubscription(env.DB, sub.id);
    expect(finalSub?.status).toBe("active");
    const flags = JSON.parse(finalSub?.flags ?? "[]");
    expect(flags.find((f: { type: string }) => f.type === "lossy-mode")).toBeUndefined();
  });
});
