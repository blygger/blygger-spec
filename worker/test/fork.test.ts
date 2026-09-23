// v0.3 Phase B task 11 acceptance (plan §2.4, §2.3.3, §2.3.5; shape reserved
// since 0.1 §5.6): `forked_from` end to end — the pinned-only rule at fork
// time, at publish time, and on the receiving side, where the target is the
// only party who can say whether the version a stranger claims descent from
// is actually pinned.
//
// The remote half is driven at the module boundary with a fixture FetchLike,
// the same split the importer uses: route-level tests go over the local path
// (where the database is the authority and no fetch happens at all), and the
// network logic is tested where it can be injected.
import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { checkForkTarget, resolveForkSource } from "../src/fork.ts";
import type { FetchLike } from "../src/importer/http.ts";
import { createSubscription } from "../src/importer/store.ts";
import { forkedVersion, relationTo, upsertAndVerify } from "./fork-helpers.ts";
import { createFork } from "../src/model.ts";
import { listOutbound } from "../src/mentions/store.ts";
import { apiJson, BASE, createAndPublish, getPublic, login, STUDIO } from "./helpers.ts";
import { newId } from "../src/util.ts";

const OURS = "https://example.com/blyg/";
const THEIRS = "https://friend.example/blyg/";

function net(map: Record<string, { status?: number; body?: string }>): { fetch: FetchLike; calls: string[] } {
  const calls: string[] = [];
  const fetch: FetchLike = async (url) => {
    calls.push(url);
    const entry = map[url];
    const status = entry?.status ?? (entry ? 200 : 404);
    return { ok: status >= 200 && status < 300, status, url, headers: new Headers(), text: async () => entry?.body ?? "" };
  };
  return { fetch, calls };
}

/** What a conformant blyg serves at items/{id}/v{n}.json (§2.8). */
function pinnedDoc(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    blyg: "0.3",
    id: "remote-item",
    kind: "fragment",
    version: 2,
    at: "2026-09-01T10:00:00Z",
    note: null,
    pinned: true,
    origin: THEIRS,
    author: { name: "Friend", url: THEIRS },
    content_md: "their pinned words",
    content_html: "<p>their pinned words</p>",
    content_hash: "sha256:x",
    ...over,
  });
}

async function itemJson(id: string): Promise<any> {
  return (await getPublic(`/blyg/items/${id}.json`)).json<any>();
}

/** Publish, pin v1, and hand back the item id — the only state a fork can start from. */
async function publishAndPin(cookie: string, md: string): Promise<string> {
  const id = await createAndPublish(cookie, md);
  expect((await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 })).status).toBe(200);
  return id;
}

describe("forking a pinned version of our own (§2.4)", () => {
  it("copies the pinned text into a new draft and records the lineage permanently", async () => {
    const cookie = await login();
    const parent = await publishAndPin(cookie, "the original text");

    const forked = await apiJson(cookie, "POST", "/api/fork", { origin: OURS, id: parent, version: 1 });
    expect(forked.status).toBe(201);
    const id = forked.json.id as string;

    const edit = await SELF.fetch(`${BASE}${STUDIO}/edit/${id}`, { headers: { cookie } });
    expect(await edit.text()).toContain("the original text");

    expect((await apiJson(cookie, "POST", `/api/items/${id}/publish`, {})).status).toBe(200);
    const doc = await itemJson(id);
    expect(doc.forked_from).toEqual({ origin: OURS, id: parent, version: 1 });
  });

  it("refuses a version that is not pinned — the whole basis of the claim", async () => {
    const cookie = await login();
    const parent = await createAndPublish(cookie, "never pinned");
    const res = await apiJson(cookie, "POST", "/api/fork", { origin: OURS, id: parent, version: 1 });
    expect(res.status).toBe(400);
    expect(res.json.error).toContain("not pinned");
  });

  it("refuses a malformed reference rather than coercing one", async () => {
    const cookie = await login();
    // `origin` is REQUIRED even for our own item (#27: a citation is absolute).
    expect((await apiJson(cookie, "POST", "/api/fork", { id: "x", version: 1 })).status).toBe(400);
    expect((await apiJson(cookie, "POST", "/api/fork", { origin: OURS, id: "x", version: 0 })).status).toBe(400);
  });

  it("forks a thread as a thread, keeping the directives rather than the baked HTML", async () => {
    const cookie = await login();
    const quoted = await createAndPublish(cookie, "a fragment to quote");
    const created = await apiJson(cookie, "POST", "/api/items", { content_md: `intro\n\n![[${quoted}]]`, kind: "thread" });
    const threadId = created.json.id as string;
    expect((await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {})).status).toBe(200);
    expect((await apiJson(cookie, "POST", `/api/items/${threadId}/pin`, { version: 1 })).status).toBe(200);

    const forked = await apiJson(cookie, "POST", "/api/fork", { origin: OURS, id: threadId, version: 1 });
    expect(forked.status).toBe(201);
    expect(forked.json.kind).toBe("thread");
    // content_md, not content_html: a fork is a working copy, so it inherits
    // the source the author can edit, and re-resolves its own transclusions.
    const edit = await SELF.fetch(`${BASE}${STUDIO}/edit/${forked.json.id}`, { headers: { cookie } });
    expect(await edit.text()).toContain(`![[${quoted}]]`);
  });
});

describe("lineage on the wire and on the page", () => {
  it("rides the pinned version document too, and cannot drift from the live item", async () => {
    const cookie = await login();
    const parent = await publishAndPin(cookie, "ancestor");
    const forked = await apiJson(cookie, "POST", "/api/fork", { origin: OURS, id: parent, version: 1 });
    const id = forked.json.id as string;
    expect((await apiJson(cookie, "POST", `/api/items/${id}/publish`, {})).status).toBe(200);
    expect((await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 })).status).toBe(200);

    const pinned = await (await getPublic(`/blyg/items/${id}/v1.json`)).json<any>();
    expect(pinned.forked_from).toEqual({ origin: OURS, id: parent, version: 1 });
  });

  it("survives withdrawal — the endcap empties the work, not where the work came from", async () => {
    const cookie = await login();
    const parent = await publishAndPin(cookie, "ancestor");
    const forked = await apiJson(cookie, "POST", "/api/fork", { origin: OURS, id: parent, version: 1 });
    const id = forked.json.id as string;
    expect((await apiJson(cookie, "POST", `/api/items/${id}/publish`, {})).status).toBe(200);
    expect((await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {})).status).toBe(200);

    const doc = await itemJson(id);
    expect(doc.kind).toBe("withdrawn");
    expect(doc.content_md).toBe("");
    expect(doc.forked_from).toEqual({ origin: OURS, id: parent, version: 1 });
  });

  it("states the lineage on the item's own page, citing the pinned version page", async () => {
    const cookie = await login();
    const parent = await publishAndPin(cookie, "ancestor text");
    const forked = await apiJson(cookie, "POST", "/api/fork", { origin: OURS, id: parent, version: 1 });
    const id = forked.json.id as string;
    expect((await apiJson(cookie, "POST", `/api/items/${id}/publish`, {})).status).toBe(200);

    const html = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(html).toContain("Forked from");
    expect(html).toContain(`${OURS}f/${parent}/v1/`);
    // The excerpt was frozen at fork time, from the pinned bytes.
    expect(html).toContain("ancestor text");
  });
});

describe("the publish-time check (§2.4)", () => {
  it("blocks publishing when a local lineage target turns out not to be pinned", async () => {
    const cookie = await login();
    const parent = await publishAndPin(cookie, "ancestor");
    const forked = await apiJson(cookie, "POST", "/api/fork", { origin: OURS, id: parent, version: 1 });
    const id = forked.json.id as string;
    // Pins are irrevocable through every supported path, so the only way to
    // reach this state is to corrupt it directly — which is exactly the state
    // the check exists to catch.
    await env.DB.prepare("UPDATE versions SET pinned = 0 WHERE item_id = ? AND version = 1").bind(parent).run();

    const res = await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});
    expect(res.status).toBe(400);
    expect(res.json.error).toContain("not pinned");
  });

  it("does not let an unreachable origin veto the author's publish", async () => {
    const cookie = await login();
    // A fork of a remote pin, created directly: the route's own fetch is the
    // production one, and friend.example does not answer in the test runtime —
    // which is precisely the inconclusive case.
    const item = await createFork(
      env.DB,
      "forked text",
      "fragment",
      { origin: THEIRS, id: "remote-item", version: 2 },
      { source: "Friend", url: `${THEIRS}items/remote-item/v2.json`, retrieved: new Date().toISOString() },
    );
    const res = await apiJson(cookie, "POST", `/api/items/${item.id}/publish`, {});
    expect(res.status).toBe(200);
    expect(res.json.warning).toContain("not re-checked");
    expect((await itemJson(item.id)).forked_from).toEqual({ origin: THEIRS, id: "remote-item", version: 2 });
  });

  it("enqueues a mention to the remote origin, like any other remote reference (§2.3.3)", async () => {
    const cookie = await login();
    await createSubscription(env.DB, { kind: "blyg", origin: THEIRS, feedUrl: `${THEIRS}feed.xml`, title: "Friend" });
    const item = await createFork(
      env.DB,
      "forked text",
      "fragment",
      { origin: THEIRS, id: "remote-item", version: 2 },
      { source: "Friend", url: `${THEIRS}items/remote-item/v2.json`, retrieved: new Date().toISOString() },
    );
    expect((await apiJson(cookie, "POST", `/api/items/${item.id}/publish`, {})).status).toBe(200);
    // The mention targets the live permalink, not the pinned file: a receiver
    // verifies against the item a `target` names.
    expect((await listOutbound(env.DB)).map((r) => r.target)).toContain(`${THEIRS}f/remote-item/`);
  });
});

describe("resolving a remote pinned version (fork.ts, fixture network)", () => {
  const ref = { origin: THEIRS, id: "remote-item", version: 2 };
  const url = `${THEIRS}items/remote-item/v2.json`;

  it("reads content and freezes the citation from the pinned document itself", async () => {
    // A subscribed origin, on its own host: tests in a file share one D1, and
    // the whole point of this assertion is which row supplies the name.
    const known = "https://subscribed.example/blyg/";
    const knownUrl = `${known}items/remote-item/v2.json`;
    await createSubscription(env.DB, { kind: "blyg", origin: known, feedUrl: `${known}feed.xml`, title: "Friend's blyg" });
    const { fetch, calls } = net({ [knownUrl]: { body: pinnedDoc({ origin: known }) } });
    const res = await resolveForkSource(env.DB, { ...ref, origin: known }, OURS, "Mine", fetch, "2026-09-22T00:00:00Z");
    expect(calls).toEqual([knownUrl]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.source.kind).toBe("fragment");
    expect(res.source.contentMd).toBe("their pinned words");
    expect(res.source.cite).toMatchObject({ source: "Friend's blyg", author: "Friend", url: knownUrl, retrieved: "2026-09-22T00:00:00Z" });
    expect(res.source.cite.excerpt).toContain("their pinned words");
  });

  it("names the host when we hold no subscription — forking is not limited to what we follow", async () => {
    const stranger = "https://stranger.example/blyg/";
    const strangerUrl = `${stranger}items/remote-item/v2.json`;
    const { fetch } = net({ [strangerUrl]: { body: pinnedDoc({ origin: stranger }) } });
    const res = await resolveForkSource(env.DB, { ...ref, origin: stranger }, OURS, "Mine", fetch, "2026-09-22T00:00:00Z");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.source.cite.source).toBe("stranger.example");
  });

  it("reads a 404 as 'not pinned', because that is what it means", async () => {
    const { fetch } = net({});
    const res = await resolveForkSource(env.DB, ref, OURS, "Mine", fetch, "now");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("not pinned");
  });

  it("refuses a document that does not declare itself pinned, or names something else", async () => {
    const notPinned = net({ [url]: { body: pinnedDoc({ pinned: false }) } });
    expect((await resolveForkSource(env.DB, ref, OURS, "Mine", notPinned.fetch, "now")).ok).toBe(false);
    const wrongVersion = net({ [url]: { body: pinnedDoc({ version: 7 }) } });
    expect((await resolveForkSource(env.DB, ref, OURS, "Mine", wrongVersion.fetch, "now")).ok).toBe(false);
    const notBlyg = net({ [url]: { body: JSON.stringify({ hello: "world" }) } });
    expect((await resolveForkSource(env.DB, ref, OURS, "Mine", notBlyg.fetch, "now")).ok).toBe(false);
  });

  it("separates evidence from silence at publish time", async () => {
    // 404 is evidence the promise is not kept → the claim is false.
    expect((await checkForkTarget(env.DB, ref, OURS, net({}).fetch)).ok).toBe(false);
    // 5xx and a dead socket are evidence of nothing → the author still publishes.
    const down = await checkForkTarget(env.DB, ref, OURS, net({ [url]: { status: 503 } }).fetch);
    expect(down).toEqual({ ok: true, skipped: expect.stringContaining("503") });
    const thrower: FetchLike = async () => {
      throw new Error("ECONNREFUSED");
    };
    expect((await checkForkTarget(env.DB, ref, OURS, thrower)).ok).toBe(true);
    // A live, correct pinned file passes with no complaint.
    expect(await checkForkTarget(env.DB, ref, OURS, net({ [url]: { body: pinnedDoc() } }).fetch)).toEqual({ ok: true });
  });
});

describe("inbound: a fork mention verifies only against a real pin (§2.3.5)", () => {
  it("reads the claim from forked_from and ranks below stub and transclusion", () => {
    const doc = { forked_from: { origin: OURS, id: "target-id", version: 3 } };
    expect(relationTo(doc, OURS, "target-id")).toBe("fork");
    expect(relationTo(doc, OURS, "other-id")).toBeNull();
    expect(relationTo({ forked_from: { origin: THEIRS, id: "target-id", version: 3 } }, OURS, "target-id")).toBeNull();
    expect(forkedVersion(doc, OURS, "target-id")).toBe(3);
    // An item that both quotes us and descends from us is a transclusion: the
    // stronger, more specific claim wins (§2.3.5's ordering).
    expect(relationTo({ ...doc, transclusions: [{ origin: OURS, id: "target-id", version: 1 }] }, OURS, "target-id")).toBe("transclusion");
  });

  it("verifies a fork of a pinned version and refuses one that names an unpinned version", async () => {
    const cookie = await login();
    const pinnedTarget = await publishAndPin(cookie, "worth forking");
    const unpinnedTarget = await createAndPublish(cookie, "not pinned");

    const sourcePage = `${THEIRS}f/${newId()}/`;
    const good = await upsertAndVerify(env.DB, sourcePage, `${OURS}f/${pinnedTarget}/`, pinnedTarget, OURS, {
      [sourcePage]: JSON.stringify({ blyg: "0.3", id: "src", kind: "fragment", origin: THEIRS, version: 1, forked_from: { origin: OURS, id: pinnedTarget, version: 1 } }),
    });
    expect(good).toMatchObject({ status: "verified", relation: "fork" });

    const badPage = `${THEIRS}f/${newId()}/`;
    const bad = await upsertAndVerify(env.DB, badPage, `${OURS}f/${unpinnedTarget}/`, unpinnedTarget, OURS, {
      [badPage]: JSON.stringify({ blyg: "0.3", id: "src2", kind: "fragment", origin: THEIRS, version: 1, forked_from: { origin: OURS, id: unpinnedTarget, version: 1 } }),
    });
    expect(bad.status).toBe("failed");
    expect(bad.reason).toContain("not pinned");
  });
});
