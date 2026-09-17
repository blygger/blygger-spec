// v0.3 task 2 acceptance (plan §2.1, decision #26): transclusion resolves
// against imported items and local threads, bakes the *local snapshot* with
// origin provenance, nests, and rejects the four new failure cases with the
// reason each deserves. The 0.2 shape is asserted to be unchanged for
// own-origin sources — that is what keeps every 0.2 document a valid 0.3 one.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition } from "../src/importer/transition.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";
import { newId } from "../src/util.ts";

const ORIGIN = "https://friend.example/blyg/";

async function createThread(cookie: string, contentMd: string): Promise<string> {
  const created = await apiJson(cookie, "POST", "/api/items", { content_md: contentMd, kind: "thread" });
  expect(created.status).toBe(201);
  return created.json.id as string;
}

async function publishThread(cookie: string, id: string): Promise<{ status: number; json: any }> {
  return apiJson(cookie, "POST", `/api/items/${id}/publish`, {});
}

/** Import one blyg item from a fresh subscription, the way a real poll would. */
async function importItem(
  origin: string,
  doc: { id: string; kind?: "fragment" | "thread"; version?: number; content_md?: string; content_html?: string },
  opts: { l0?: boolean; title?: string } = {},
): Promise<string> {
  const sub = await createSubscription(env.DB, {
    kind: "blyg",
    origin,
    feedUrl: `${origin}feed.xml`,
    title: opts.title ?? "Friend",
  });
  const body = await itemDocBody({ kind: "fragment", version: 1, ...doc });
  const tr = transition({ local: { status: "absent" }, doc: JSON.parse(body) });
  await applyEffect(env.DB, sub.id, doc.id, tr.effect, new Date().toISOString(), { l0: opts.l0 });
  return sub.id;
}

describe("cross-client transclusion (§2.1)", () => {
  it("bakes an imported item's local snapshot with origin provenance", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "their words", content_html: "<p>their words</p>" });

    const threadId = await createThread(cookie, `Quoting a stranger:\n\n![[${remoteId}]]`);
    expect((await publishThread(cookie, threadId)).status).toBe(200);

    const item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.transclusions).toEqual([{ id: remoteId, version: 1, origin: ORIGIN }]);
    expect(item.content_html).toContain(`data-blyg-origin="${ORIGIN}"`);
    expect(item.content_html).toContain("their words");
  });

  it("own-origin transclusions stay byte-identical to the 0.2 shape", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "my own fragment");
    const threadId = await createThread(cookie, `![[${f1}]]`);
    expect((await publishThread(cookie, threadId)).status).toBe(200);

    const item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.transclusions).toEqual([{ id: f1, version: 1 }]);
    expect(item.transclusions[0]).not.toHaveProperty("origin");
    expect(item.content_html).not.toContain("data-blyg-origin");
  });

  it("nests: a thread transcluding a thread bakes nested blockquotes", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "innermost fragment");
    const inner = await createThread(cookie, `Inner thread.\n\n![[${f1}]]`);
    expect((await publishThread(cookie, inner)).status).toBe(200);
    const outer = await createThread(cookie, `Outer thread.\n\n![[${inner}]]`);
    expect((await publishThread(cookie, outer)).status).toBe(200);

    const item = await (await getPublic(`/blyg/items/${outer}.json`)).json<any>();
    // Provenance records *direct* transclusions only; the inner layer stays
    // inspectable in the baked data attributes.
    expect(item.transclusions).toEqual([{ id: inner, version: 1 }]);
    expect(item.content_html).toContain(`data-blyg-id="${inner}"`);
    expect(item.content_html).toContain(`data-blyg-id="${f1}"`);
    expect(item.content_html).toContain("innermost fragment");
    const opens = item.content_html.match(/<blockquote class="blyg-transclusion"/g) ?? [];
    expect(opens.length).toBe(2);
  });

  it("nests across origins: a remote thread's own quotes come along in the snapshot", async () => {
    const cookie = await login();
    const remoteThread = newId();
    const remoteInner = newId();
    await importItem(ORIGIN, {
      id: remoteThread,
      kind: "thread",
      content_md: "remote thread",
      content_html: `<p>remote thread</p>\n<blockquote class="blyg-transclusion" data-blyg-id="${remoteInner}" data-blyg-version="2"><p>quoted over there</p></blockquote>`,
    });

    const threadId = await createThread(cookie, `![[${remoteThread}]]`);
    expect((await publishThread(cookie, threadId)).status).toBe(200);
    const item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.transclusions).toEqual([{ id: remoteThread, version: 1, origin: ORIGIN }]);
    expect(item.content_html).toContain("quoted over there");
    expect(item.content_html).toContain(`data-blyg-id="${remoteInner}"`);
  });

  it("a retained tombstone is quotable, at the pinned version it retained", async () => {
    const cookie = await login();
    const remoteId = newId();
    const subId = await importItem(ORIGIN, { id: remoteId, version: 3, content_md: "pinned words", content_html: "<p>pinned words</p>" });
    // Origin withdraws at v4; we retain because v2 is pinned there (§13.4).
    await applyEffect(
      env.DB,
      subId,
      remoteId,
      { type: "rollup-null", version: 4, updated: new Date().toISOString() },
      new Date().toISOString(),
      { retainPinnedVersion: 2 },
    );

    const threadId = await createThread(cookie, `![[${remoteId}]]`);
    expect((await publishThread(cookie, threadId)).status).toBe(200);
    const item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.transclusions).toEqual([{ id: remoteId, version: 2, origin: ORIGIN }]);
    expect(item.content_html).toContain("pinned words");
  });
});

describe("cross-client resolution failures (§2.1)", () => {
  async function failureReason(cookie: string, id: string): Promise<string> {
    const threadId = await createThread(cookie, `![[${id}]]`);
    const pub = await publishThread(cookie, threadId);
    expect(pub.status).toBe(400);
    expect(pub.json.errors.length).toBe(1);
    return pub.json.errors[0].reason as string;
  }

  it("rejects an unretained tombstone as withdrawn by its origin", async () => {
    const cookie = await login();
    const remoteId = newId();
    const subId = await importItem(ORIGIN, { id: remoteId, content_md: "gone soon" });
    await applyEffect(
      env.DB,
      subId,
      remoteId,
      { type: "rollup-null", version: 2, updated: new Date().toISOString() },
      new Date().toISOString(),
    );
    expect(await failureReason(cookie, remoteId)).toMatch(/withdrawn by origin/);
  });

  it("rejects an L0 row: a wrapped RSS summary is not their item", async () => {
    const cookie = await login();
    // A real L0 id is `l0-<hex>` and can't match the directive grammar at all;
    // the guard is asserted directly so the rule holds if that ever changes.
    const remoteId = newId();
    await importItem("https://rss.example/", { id: remoteId, content_md: "summary" }, { l0: true, title: "Legacy" });
    expect(await failureReason(cookie, remoteId)).toMatch(/L0/);
  });

  it("rejects an id imported from two origins rather than guessing one", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem("https://one.example/", { id: remoteId, content_md: "theirs" }, { title: "One" });
    await importItem("https://two.example/", { id: remoteId, content_md: "also theirs" }, { title: "Two" });
    expect(await failureReason(cookie, remoteId)).toMatch(/ambiguous/);
  });

  it("rejects a thread transcluding itself", async () => {
    const cookie = await login();
    const threadId = await createThread(cookie, "seed");
    expect((await publishThread(cookie, threadId)).status).toBe(200);
    await apiJson(cookie, "PUT", `/api/items/${threadId}`, { content_md: `me again\n\n![[${threadId}]]` });
    const pub = await publishThread(cookie, threadId);
    expect(pub.status).toBe(400);
    expect(pub.json.errors[0].reason).toMatch(/cannot transclude itself/);
  });

  it("rejects a cycle through a local thread's transitive closure", async () => {
    const cookie = await login();
    const a = await createThread(cookie, "thread A");
    expect((await publishThread(cookie, a)).status).toBe(200);
    const b = await createThread(cookie, `thread B\n\n![[${a}]]`);
    expect((await publishThread(cookie, b)).status).toBe(200);
    const c = await createThread(cookie, `thread C\n\n![[${b}]]`);
    expect((await publishThread(cookie, c)).status).toBe(200);
    // A now tries to quote C, which transitively already quotes A.
    await apiJson(cookie, "PUT", `/api/items/${a}`, { content_md: `thread A\n\n![[${c}]]` });
    const pub = await publishThread(cookie, a);
    expect(pub.status).toBe(400);
    expect(pub.json.errors[0].reason).toMatch(/circular/);
  });

  it("a remote thread quoting us is not a cycle — remote closures aren't walked", async () => {
    const cookie = await login();
    const mine = await createThread(cookie, "my thread");
    expect((await publishThread(cookie, mine)).status).toBe(200);
    const theirs = newId();
    await importItem(ORIGIN, {
      id: theirs,
      kind: "thread",
      content_md: "their stub of me",
      content_html: `<blockquote class="blyg-transclusion" data-blyg-id="${mine}" data-blyg-version="1"><p>my thread</p></blockquote>`,
    });
    await apiJson(cookie, "PUT", `/api/items/${mine}`, { content_md: `my thread\n\n![[${theirs}]]` });
    expect((await publishThread(cookie, mine)).status).toBe(200);
  });
});

describe("the `![[` palette (§3.2)", () => {
  it("offers own fragments, own threads, and imported blyg items — with a source badge", async () => {
    const cookie = await login();
    const f = await createAndPublish(cookie, "an own fragment");
    const t = await createThread(cookie, "an own thread");
    expect((await publishThread(cookie, t)).status).toBe(200);
    const remoteId = newId();
    await importItem(ORIGIN, { id: remoteId, content_md: "a borrowed thought" }, { title: "Friend Blyg" });

    const res = await apiJson(cookie, "GET", "/blyg/studio/fragments/search?q=");
    const byId = new Map<string, any>(res.json.results.map((r: any) => [r.id, r]));
    expect(byId.get(f)?.badge).toBe("fragment");
    expect(byId.get(t)?.badge).toBe("thread");
    expect(byId.get(remoteId)?.badge).toBe("Friend Blyg");
  });

  it("never offers an L0 item or an unretained tombstone — what it offers, publish accepts", async () => {
    const cookie = await login();
    const l0Id = newId();
    await importItem("https://rss.example/", { id: l0Id, content_md: "rss summary" }, { l0: true, title: "Legacy" });
    const goneId = newId();
    const subId = await importItem("https://gone.example/", { id: goneId, content_md: "about to go" }, { title: "Gone" });
    await applyEffect(
      env.DB,
      subId,
      goneId,
      { type: "rollup-null", version: 2, updated: new Date().toISOString() },
      new Date().toISOString(),
    );

    const res = await apiJson(cookie, "GET", "/blyg/studio/fragments/search?q=");
    const ids = res.json.results.map((r: any) => r.id);
    expect(ids).not.toContain(l0Id);
    expect(ids).not.toContain(goneId);
  });
});
