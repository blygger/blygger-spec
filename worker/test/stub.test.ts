// v0.3 task 3 acceptance (plan §2.2, decision #27): a stub is a thread with
// `stub_of` — both shapes, the version-agreement rule, the citation on pins,
// and the endcap that omits it (which is what makes a withdrawn stub stop
// verifying on the far side).
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition } from "../src/importer/transition.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";
import { newId } from "../src/util.ts";

const OURS = "https://example.com/blyg/";
const THEIRS = "https://friend.example/blyg/";

async function importItem(id: string): Promise<void> {
  const sub = await createSubscription(env.DB, { kind: "blyg", origin: THEIRS, feedUrl: `${THEIRS}feed.xml`, title: "Friend" });
  const doc = await itemDocBody({ id, kind: "fragment", version: 4, content_md: "their post" });
  const tr = transition({ local: { status: "absent" }, doc: JSON.parse(doc) });
  await applyEffect(env.DB, sub.id, id, tr.effect, new Date().toISOString());
}

async function createStub(cookie: string, contentMd: string, stubOf: unknown): Promise<string> {
  const created = await apiJson(cookie, "POST", "/api/items", { content_md: contentMd, kind: "thread", stub_of: stubOf });
  expect(created.status).toBe(201);
  return created.json.id as string;
}

async function itemJson(id: string): Promise<any> {
  return (await getPublic(`/blyg/items/${id}.json`)).json<any>();
}

describe("stub_of (§2.2)", () => {
  it("publishes a blyg-target stub, quoting it, with the citation agreeing on version", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(remoteId);
    // The author saw v4 when they hit stub; the import is at v4 too.
    const stubId = await createStub(cookie, `Worth reading:\n\n![[${remoteId}]]\n\nMy take.`, {
      origin: THEIRS,
      id: remoteId,
      version: 4,
    });
    expect((await apiJson(cookie, "POST", `/api/items/${stubId}/publish`, {})).status).toBe(200);

    const doc = await itemJson(stubId);
    expect(doc.kind).toBe("thread");
    expect(doc.stub_of).toEqual({ origin: THEIRS, id: remoteId, version: 4 });
    expect(doc.transclusions).toEqual([{ id: remoteId, version: 4, origin: THEIRS }]);
  });

  it("the version-agreement rule moves the citation to the version actually baked", async () => {
    const cookie = await login();
    const target = await createAndPublish(cookie, "first cut");
    await apiJson(cookie, "PUT", `/api/items/${target}`, { content_md: "second cut" });
    expect((await apiJson(cookie, "POST", `/api/items/${target}/publish`, {})).status).toBe(200);

    // Citation created against v1; the body bakes whatever is current (v2).
    const stubId = await createStub(cookie, `![[${target}]]`, { origin: OURS, id: target, version: 1 });
    expect((await apiJson(cookie, "POST", `/api/items/${stubId}/publish`, {})).status).toBe(200);

    const doc = await itemJson(stubId);
    expect(doc.stub_of).toEqual({ origin: OURS, id: target, version: 2 });
    expect(doc.transclusions).toEqual([{ id: target, version: 2 }]);
  });

  it("a body that doesn't quote the target keeps the version the author saw", async () => {
    const cookie = await login();
    const target = await createAndPublish(cookie, "v1 text");
    await apiJson(cookie, "PUT", `/api/items/${target}`, { content_md: "v2 text" });
    await apiJson(cookie, "POST", `/api/items/${target}/publish`, {});

    const stubId = await createStub(cookie, "A response by link alone.", { origin: OURS, id: target, version: 1 });
    expect((await apiJson(cookie, "POST", `/api/items/${stubId}/publish`, {})).status).toBe(200);

    const doc = await itemJson(stubId);
    expect(doc.stub_of).toEqual({ origin: OURS, id: target, version: 1 });
    expect(doc.transclusions).toEqual([]);
  });

  it("carries a plain-web {url} target verbatim", async () => {
    const cookie = await login();
    const url = "https://simonwillison.net/2026/Sep/10/some-post/";
    const stubId = await createStub(cookie, "Responding to a post out on the open web.", { url });
    expect((await apiJson(cookie, "POST", `/api/items/${stubId}/publish`, {})).status).toBe(200);
    expect((await itemJson(stubId)).stub_of).toEqual({ url });
  });

  it("a pinned version carries its own citation; the withdrawal endcap carries none", async () => {
    const cookie = await login();
    const target = await createAndPublish(cookie, "the target");
    const stubId = await createStub(cookie, `![[${target}]]`, { origin: OURS, id: target, version: 1 });
    await apiJson(cookie, "POST", `/api/items/${stubId}/publish`, {});
    expect((await apiJson(cookie, "POST", `/api/items/${stubId}/pin`, { version: 1 })).status).toBe(200);

    const pinned = await (await getPublic(`/blyg/items/${stubId}/v1.json`)).json<any>();
    expect(pinned.stub_of).toEqual({ origin: OURS, id: target, version: 1 });

    expect((await apiJson(cookie, "POST", `/api/items/${stubId}/withdraw`, {})).status).toBe(200);
    const endcap = await itemJson(stubId);
    expect(endcap.kind).toBe("withdrawn");
    expect(endcap.stub_of).toBeUndefined();
    // The pin is untouched — it is the citation that survives withdrawal.
    expect((await (await getPublic(`/blyg/items/${stubId}/v1.json`)).json<any>()).stub_of).toEqual({
      origin: OURS,
      id: target,
      version: 1,
    });

    // Republishing restores it: the working copy kept the citation.
    expect((await apiJson(cookie, "POST", `/api/items/${stubId}/publish`, {})).status).toBe(200);
    expect((await itemJson(stubId)).stub_of).toEqual({ origin: OURS, id: target, version: 1 });
  });

  it("clearing the citation leaves a thread that merely quotes", async () => {
    const cookie = await login();
    const target = await createAndPublish(cookie, "the target");
    const stubId = await createStub(cookie, `![[${target}]]`, { origin: OURS, id: target, version: 1 });
    expect((await apiJson(cookie, "PUT", `/api/items/${stubId}`, { stub_of: null })).status).toBe(200);
    await apiJson(cookie, "POST", `/api/items/${stubId}/publish`, {});

    const doc = await itemJson(stubId);
    expect(doc.stub_of).toBeUndefined();
    expect(doc.transclusions).toEqual([{ id: target, version: 1 }]);
  });

  it("rejects a stub on a fragment, and every malformed citation", async () => {
    const cookie = await login();
    const target = await createAndPublish(cookie, "the target");
    const onFragment = await apiJson(cookie, "POST", "/api/items", { content_md: "x", stub_of: { url: "https://a.example/" } });
    expect(onFragment.status).toBe(400);

    const bad: unknown[] = [
      { origin: THEIRS, id: target }, // no version
      { origin: "not a url", id: target, version: 1 },
      { origin: THEIRS, id: "has a space", version: 1 },
      { origin: THEIRS, id: target, version: 0 },
      { url: "ftp://example.com/x" },
      { url: "https://a.example/", origin: THEIRS, id: target, version: 1 }, // both shapes
      "a string",
    ];
    for (const stub of bad) {
      const res = await apiJson(cookie, "POST", "/api/items", { content_md: "x", kind: "thread", stub_of: stub });
      expect(res.status, JSON.stringify(stub)).toBe(400);
    }
  });

  it("normalizes a citation origin to one spelling, so comparisons can be string equality", async () => {
    const cookie = await login();
    const target = await createAndPublish(cookie, "the target");
    const stubId = await createStub(cookie, "no quote", { origin: "https://example.com/blyg", id: target, version: 1 });
    await apiJson(cookie, "POST", `/api/items/${stubId}/publish`, {});
    expect((await itemJson(stubId)).stub_of.origin).toBe(OURS);
  });
});
