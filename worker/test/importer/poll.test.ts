// Index reconciler + poll cycle (§3.2) acceptance: gap fixture recovers via
// index; 304 path does zero item fetches; failure path leaves state
// untouched.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { pollSubscription, reconcileIndex } from "../../src/importer/poll.ts";
import { applyEffect, createSubscription, getImportedItem, getSubscription } from "../../src/importer/store.ts";
import { feedBody, indexBody, itemDocBody, makeFixtureFetch } from "./fixtures.ts";

const ORIGIN = "https://a.example/blyg/";
const FEED_URL = `${ORIGIN}feed.xml`;

describe("poll cycle (§3.2)", () => {
  it("304 Not Modified does zero item fetches", async () => {
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: ORIGIN, feedUrl: FEED_URL, title: "A" });
    await env.DB.prepare("UPDATE subscriptions SET etag = ? WHERE id = ?").bind('"abc"', sub.id).run();
    const resub = (await getSubscription(env.DB, sub.id))!;

    const { fetch, calls } = makeFixtureFetch({ [FEED_URL]: { status: 304 } });
    const result = await pollSubscription(env.DB, resub, fetch);

    expect(result).toEqual({ outcome: "not-modified", itemsFetched: 0, reconciled: false });
    expect(calls).toEqual([FEED_URL]);
    const after = (await getSubscription(env.DB, sub.id))!;
    expect(after.fail_count).toBe(0);
  });

  it("a gap (newest-seen GUID scrolled out of the window) triggers index reconciliation, recovering a missed edit losslessly", async () => {
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: ORIGIN, feedUrl: FEED_URL, title: "A" });
    // Simulate a previous poll that saw "old-item" as the newest GUID, and a
    // sync so periodic/first-sync reconciliation doesn't also fire (which
    // would make this test pass for the wrong reason).
    await env.DB
      .prepare("UPDATE subscriptions SET newest_guid = ?, last_index_sync_at = ? WHERE id = ?")
      .bind("blyg:old-item:v1", new Date().toISOString(), sub.id)
      .run();
    const resub = (await getSubscription(env.DB, sub.id))!;

    // The gapped item was edited to v2 while we were "away" — the feed window
    // has scrolled past both the old newest_guid and the gapped item's entry
    // entirely; only a brand-new unrelated entry is visible now.
    const gappedDoc = await itemDocBody({ id: "gapped-item", kind: "fragment", version: 2, content_md: "recovered via index" });
    const newDoc = await itemDocBody({ id: "new-item", kind: "fragment", version: 1 });
    const { fetch, calls } = makeFixtureFetch({
      [FEED_URL]: {
        body: feedBody({ items: [{ id: "new-item", version: 1, itemUrl: `${ORIGIN}items/new-item.json` }] }),
      },
      [`${ORIGIN}items/new-item.json`]: { body: newDoc },
      [`${ORIGIN}items/index.json`]: {
        body: indexBody([
          { id: "gapped-item", kind: "fragment", version: 2 },
          { id: "new-item", kind: "fragment", version: 1 },
        ]),
      },
      [`${ORIGIN}items/gapped-item.json`]: { body: gappedDoc },
    });

    const result = await pollSubscription(env.DB, resub, fetch);
    expect(result.outcome).toBe("polled");
    expect(result.reconciled).toBe(true);
    expect(calls).toContain(`${ORIGIN}items/index.json`);
    expect(calls).toContain(`${ORIGIN}items/gapped-item.json`);

    const gapped = await getImportedItem(env.DB, sub.id, "gapped-item");
    expect(gapped).toMatchObject({ state: "current", version: 2, content_md: "recovered via index" });
    const fresh = await getImportedItem(env.DB, sub.id, "new-item");
    expect(fresh).toMatchObject({ state: "current", version: 1 });
  });

  it("a poll failure (network error) leaves imported_items completely untouched", async () => {
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: ORIGIN, feedUrl: FEED_URL, title: "A" });
    const preDoc = await itemDocBody({ id: "existing", kind: "fragment", version: 1, content_md: "before" });
    const preTransition = { local: { status: "absent" as const }, doc: JSON.parse(preDoc), storedContentHash: undefined };
    const { transition } = await import("../../src/importer/transition.ts");
    const tr = transition(preTransition);
    await applyEffect(env.DB, sub.id, "existing", tr.effect, "2026-08-01T00:00:00Z");
    const before = await getImportedItem(env.DB, sub.id, "existing");
    expect(before).toMatchObject({ version: 1, content_md: "before" });

    const resub = (await getSubscription(env.DB, sub.id))!;
    const { fetch } = makeFixtureFetch({}); // feed URL unmapped -> 404, treated as a failure (not ok)
    const result = await pollSubscription(env.DB, resub, fetch);

    expect(result.outcome).toBe("failed");
    const after = await getImportedItem(env.DB, sub.id, "existing");
    expect(after).toEqual(before);
    const subAfter = (await getSubscription(env.DB, sub.id))!;
    expect(subAfter.fail_count).toBe(1);
  });

  it("reconcileIndex flags lossy-mode on a 404 items/index.json without throwing", async () => {
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: ORIGIN, feedUrl: FEED_URL, title: "A" });
    const { fetch } = makeFixtureFetch({});
    const result = await reconcileIndex(env.DB, sub, fetch);
    expect(result).toEqual({ ok: false, changed: 0 });
    const after = (await getSubscription(env.DB, sub.id))!;
    const flags = JSON.parse(after.flags);
    expect(flags.some((f: { type: string }) => f.type === "lossy-mode")).toBe(true);
  });
});
