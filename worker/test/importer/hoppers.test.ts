// Hoppers + signals CRUD (§3.4/§4.2) — membership, thumbs, and the
// withdrawal-processing pin-retention check: unpinned snapshot ->
// placeholder; pinned -> retained with pin link.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { pollSubscription } from "../../src/importer/poll.ts";
import {
  addHopperItem,
  applyEffect,
  createHopper,
  createSubscription,
  deleteHopper,
  getHopperBySlug,
  getImportedItem,
  getSignal,
  listHopperItems,
  removeHopperItem,
  setSignal,
} from "../../src/importer/store.ts";
import { transition } from "../../src/importer/transition.ts";
import { feedBody, itemDocBody, makeFixtureFetch } from "./fixtures.ts";

const ORIGIN = "https://a.example/blyg/";
const FEED_URL = `${ORIGIN}feed.xml`;

describe("hopper store CRUD", () => {
  it("creates, lists membership, and removes an item", async () => {
    const hopper = await createHopper(env.DB, "Faves", "faves");
    expect((await getHopperBySlug(env.DB, "faves"))?.id).toBe(hopper.id);
    await addHopperItem(env.DB, hopper.id, "sub1", "rid1");
    expect(await listHopperItems(env.DB, hopper.id)).toHaveLength(1);
    await removeHopperItem(env.DB, hopper.id, "sub1", "rid1");
    expect(await listHopperItems(env.DB, hopper.id)).toHaveLength(0);
  });

  it("deleting a hopper cascades its memberships", async () => {
    const hopper = await createHopper(env.DB, "Temp", "temp");
    await addHopperItem(env.DB, hopper.id, "sub1", "rid1");
    await deleteHopper(env.DB, hopper.id);
    expect(await listHopperItems(env.DB, hopper.id)).toHaveLength(0);
  });
});

describe("signals store CRUD", () => {
  it("sets and overwrites a thumb signal", async () => {
    await setSignal(env.DB, "sub1", "rid1", 1);
    expect((await getSignal(env.DB, "sub1", "rid1"))?.thumb).toBe(1);
    await setSignal(env.DB, "sub1", "rid1", -1);
    expect((await getSignal(env.DB, "sub1", "rid1"))?.thumb).toBe(-1);
  });
});

describe("withdrawal pin-retention (§3.4)", () => {
  let counter = 0;
  async function setupImportedHopperItem() {
    const n = counter++;
    const itemId = `hopped-item-${n}`;
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: ORIGIN, feedUrl: FEED_URL, title: "A" });
    const doc = await itemDocBody({ id: itemId, kind: "fragment", version: 1, content_md: "curated content" });
    const tr = transition({ local: { status: "absent" }, doc: JSON.parse(doc) });
    await applyEffect(env.DB, sub.id, itemId, tr.effect, "2026-08-01T00:00:00Z");
    const hopper = await createHopper(env.DB, "Curated", `curated-${n}`);
    await addHopperItem(env.DB, hopper.id, sub.id, itemId);
    return { sub, hopper, itemId };
  }

  it("an unpinned withdrawn snapshot downgrades to a placeholder (content cleared)", async () => {
    const { sub, itemId } = await setupImportedHopperItem();
    const withdrawnDoc = await itemDocBody({ id: itemId, kind: "withdrawn", version: 2 });
    const { fetch } = makeFixtureFetch({
      [FEED_URL]: { body: feedBody({ items: [{ id: itemId, version: 2, kind: "fragment", itemUrl: `${ORIGIN}items/${itemId}.json` }] }) },
      [`${ORIGIN}items/${itemId}.json`]: { body: withdrawnDoc },
      [`${ORIGIN}items/${itemId}/v1.json`]: { status: 404 }, // not pinned
    });
    await pollSubscription(env.DB, sub, fetch);
    const row = await getImportedItem(env.DB, sub.id, itemId);
    expect(row).toMatchObject({ state: "tombstone", version: 2, content_md: "", pinned_version_retained: null });
  });

  it("a pinned withdrawn snapshot retains content, marked with the pinned version", async () => {
    const { sub, itemId } = await setupImportedHopperItem();
    const withdrawnDoc = await itemDocBody({ id: itemId, kind: "withdrawn", version: 2 });
    const { fetch, calls } = makeFixtureFetch({
      [FEED_URL]: { body: feedBody({ items: [{ id: itemId, version: 2, kind: "fragment", itemUrl: `${ORIGIN}items/${itemId}.json` }] }) },
      [`${ORIGIN}items/${itemId}.json`]: { body: withdrawnDoc },
      [`${ORIGIN}items/${itemId}/v1.json`]: { body: "{}" }, // pinned (200)
    });
    await pollSubscription(env.DB, sub, fetch);
    expect(calls).toContain(`${ORIGIN}items/${itemId}/v1.json`);
    const row = await getImportedItem(env.DB, sub.id, itemId);
    expect(row).toMatchObject({ state: "tombstone", version: 2, pinned_version_retained: 1 });
    // Content is NOT cleared when the pin check retains it.
    expect(row?.content_md).toBe("curated content");
  });

  it("a non-hopper-tracked withdrawal never triggers a pin check", async () => {
    const sub = await createSubscription(env.DB, { kind: "blyg", origin: ORIGIN, feedUrl: FEED_URL, title: "A" });
    const doc = await itemDocBody({ id: "lone-item", kind: "fragment", version: 1 });
    const tr = transition({ local: { status: "absent" }, doc: JSON.parse(doc) });
    await applyEffect(env.DB, sub.id, "lone-item", tr.effect, "2026-08-01T00:00:00Z");
    const withdrawnDoc = await itemDocBody({ id: "lone-item", kind: "withdrawn", version: 2 });
    const { fetch, calls } = makeFixtureFetch({
      [FEED_URL]: { body: feedBody({ items: [{ id: "lone-item", version: 2, kind: "fragment", itemUrl: `${ORIGIN}items/lone-item.json` }] }) },
      [`${ORIGIN}items/lone-item.json`]: { body: withdrawnDoc },
    });
    await pollSubscription(env.DB, sub, fetch);
    expect(calls).not.toContain(`${ORIGIN}items/lone-item/v1.json`);
  });
});
