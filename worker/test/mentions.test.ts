// v0.3 tasks 6–7 acceptance (plan §2.3, §4.3, decision #28): both halves of
// Webmention, in one process. Sending is driven against a fixture blyg that
// advertises an endpoint and records what arrives; receiving is driven
// against fixture source documents, including the whole negative table —
// because for an inbound mention the negatives are the feature. Structural
// verification exists to say no.
//
// Expect a few "uncaught exception … internal error" lines on stderr from this
// file: the publish and endpoint routes hand delivery and verification to
// waitUntil, and those background fetches are refused by the test runtime
// after the test itself has finished. Blocking them via a miniflare
// outboundService was tried and reverted — it took the suite from 14s to 520s.
import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { FetchLike, FetchInit } from "../src/importer/http.ts";
import { applyEffect, createSubscription } from "../src/importer/store.ts";
import { transition } from "../src/importer/transition.ts";
import { discoverEndpoint, endpointFromHtml, endpointFromLinkHeader } from "../src/mentions/discover.ts";
import { receiveMention, relationTo, verifyMention } from "../src/mentions/receive.ts";
import { drainOutbound } from "../src/mentions/send.ts";
import { getInbound, INBOUND_HOURLY_LIMIT, listOutbound, upsertInbound } from "../src/mentions/store.ts";
import { newId } from "../src/util.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, BASE, createAndPublish, getPublic, login, STUDIO } from "./helpers.ts";

const OURS = "https://example.com/blyg/";
const THEIRS = "https://friend.example/blyg/";

interface Recorded {
  url: string;
  init?: FetchInit;
}

/** A FetchLike over a fixed URL map that also records what was sent to it. */
function fixtureNet(map: Record<string, { status?: number; body?: string; headers?: Record<string, string> }>): {
  fetch: FetchLike;
  calls: Recorded[];
} {
  const calls: Recorded[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const entry = map[url];
    const status = entry?.status ?? (entry ? 200 : 404);
    return {
      ok: status >= 200 && status < 300,
      status,
      url,
      headers: new Headers(entry?.headers ?? {}),
      text: async () => entry?.body ?? "",
    };
  };
  return { fetch, calls };
}

async function importFrom(origin: string, doc: Parameters<typeof itemDocBody>[0], title = "Friend"): Promise<string> {
  const sub = await createSubscription(env.DB, { kind: "blyg", origin, feedUrl: `${origin}feed.xml`, title });
  const tr = transition({ local: { status: "absent" }, doc: JSON.parse(await itemDocBody(doc)) });
  await applyEffect(env.DB, sub.id, doc.id, tr.effect, new Date().toISOString());
  return sub.id;
}

describe("endpoint discovery (§2.3.4)", () => {
  it("reads a Link header, resolving it against the page", () => {
    expect(endpointFromLinkHeader('</wm>; rel="webmention"', "https://a.example/p/")).toBe("https://a.example/wm");
    expect(endpointFromLinkHeader('<https://a.example/x>; rel="self", </wm>; rel="webmention"', "https://a.example/")).toBe(
      "https://a.example/wm",
    );
    expect(endpointFromLinkHeader('</feed>; rel="alternate"', "https://a.example/")).toBeNull();
  });

  it("reads a link or anchor in the markup", () => {
    expect(endpointFromHtml('<link rel="webmention" href="/wm">', "https://a.example/p/")).toBe("https://a.example/wm");
    expect(endpointFromHtml('<a rel="webmention" href="wm">x</a>', "https://a.example/p/")).toBe("https://a.example/p/wm");
    expect(endpointFromHtml("<p>nothing here</p>", "https://a.example/")).toBeNull();
  });

  it("prefers a blyg target's manifest key over W3C discovery", async () => {
    const net = fixtureNet({
      [`${THEIRS}blyg.json`]: { body: JSON.stringify({ blyg: "0.3", site: THEIRS, webmention: "webmention" }) },
    });
    const found = await discoverEndpoint(`${THEIRS}f/abc/`, net.fetch, THEIRS);
    expect(found.endpoint).toBe(`${THEIRS}webmention`);
    // One fetch, of the manifest — the page itself is never touched.
    expect(net.calls).toHaveLength(1);
  });

  it("treats a manifest without the key as 'does not receive', and never retries it", async () => {
    const net = fixtureNet({ [`${THEIRS}blyg.json`]: { body: JSON.stringify({ blyg: "0.3", site: THEIRS }) } });
    const found = await discoverEndpoint(`${THEIRS}f/abc/`, net.fetch, THEIRS);
    expect(found.endpoint).toBeNull();
  });
});

describe("sending (§2.3.3)", () => {
  it("enqueues one mention per remote reference on publish, and delivers source + target", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: OURS });
    const remoteId = newId();
    await importFrom(THEIRS, { id: remoteId, kind: "fragment", version: 2, content_md: "their post", page: `f/${remoteId}/` });

    const stub = await apiJson(cookie, "POST", "/api/items", {
      kind: "thread",
      content_md: `![[${remoteId}]]\n\nMy response.`,
      stub_of: { origin: THEIRS, id: remoteId, version: 2 },
    });
    expect((await apiJson(cookie, "POST", `/api/items/${stub.json.id}/publish`, {})).status).toBe(200);

    const queued = (await listOutbound(env.DB)).filter((r) => r.item_id === stub.json.id);
    // The stub citation and the transclusion name the same item, so one
    // mention, not two.
    expect(queued).toHaveLength(1);
    expect(queued[0].target).toBe(`${THEIRS}f/${remoteId}/`);

    const net = fixtureNet({
      [`${THEIRS}blyg.json`]: { body: JSON.stringify({ blyg: "0.3", site: THEIRS, webmention: "webmention" }) },
      [`${THEIRS}webmention`]: { status: 202 },
    });
    await drainOutbound(env.DB, net.fetch, { origin: OURS });

    const post = net.calls.find((c) => c.init?.method === "POST");
    expect(post?.url).toBe(`${THEIRS}webmention`);
    const sent = new URLSearchParams(post!.init!.body);
    expect(sent.get("source")).toBe(`${OURS}t/${stub.json.id}/`);
    expect(sent.get("target")).toBe(`${THEIRS}f/${remoteId}/`);
    expect((await listOutbound(env.DB)).find((r) => r.id === queued[0].id)?.status).toBe("sent");
  });

  it("never sends for an own-origin reference", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: OURS });
    const mine = await createAndPublish(cookie, "my own fragment");
    const stub = await apiJson(cookie, "POST", "/api/items", {
      kind: "thread",
      content_md: `![[${mine}]]`,
      stub_of: { origin: OURS, id: mine, version: 1 },
    });
    await apiJson(cookie, "POST", `/api/items/${stub.json.id}/publish`, {});
    expect((await listOutbound(env.DB)).filter((r) => r.item_id === stub.json.id)).toHaveLength(0);
  });

  it("records no_endpoint without retrying, and backs off on a 5xx", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: OURS });
    const silent = newId();
    await importFrom("https://static.example/", { id: silent, kind: "fragment", version: 1, content_md: "static blyg" }, "Static");
    const a = await apiJson(cookie, "POST", "/api/items", {
      kind: "thread",
      content_md: `![[${silent}]]`,
      stub_of: { origin: "https://static.example/", id: silent, version: 1 },
    });
    await apiJson(cookie, "POST", `/api/items/${a.json.id}/publish`, {});

    // A static blyg: manifest present, no endpoint key. Conformant, unreachable.
    const quiet = fixtureNet({
      "https://static.example/blyg.json": { body: JSON.stringify({ blyg: "0.3", site: "https://static.example/" }) },
    });
    await drainOutbound(env.DB, quiet.fetch, { origin: OURS });
    let row = (await listOutbound(env.DB)).find((r) => r.item_id === a.json.id)!;
    expect(row.status).toBe("no_endpoint");

    const down = newId();
    await importFrom("https://down.example/", { id: down, kind: "fragment", version: 1, content_md: "down" }, "Down");
    const b = await apiJson(cookie, "POST", "/api/items", {
      kind: "thread",
      content_md: `![[${down}]]`,
      stub_of: { origin: "https://down.example/", id: down, version: 1 },
    });
    await apiJson(cookie, "POST", `/api/items/${b.json.id}/publish`, {});
    const broken = fixtureNet({
      "https://down.example/blyg.json": { body: JSON.stringify({ blyg: "0.3", site: "https://down.example/", webmention: "wm" }) },
      "https://down.example/wm": { status: 503 },
    });
    const now = Date.parse("2026-09-16T12:00:00Z");
    await drainOutbound(env.DB, broken.fetch, { origin: OURS, now });
    row = (await listOutbound(env.DB)).find((r) => r.item_id === b.json.id)!;
    expect(row.status).toBe("pending");
    expect(row.attempts).toBe(1);
    // First retry is 15 minutes out, not immediately.
    expect(Date.parse(row.next_attempt_at!) - now).toBe(15 * 60_000);
  });
});

describe("receiving and structural verification (§2.3.5)", () => {
  async function ourItem(): Promise<{ id: string; target: string; cookie: string }> {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: OURS });
    const id = await createAndPublish(cookie, "a fragment worth responding to");
    return { id, target: `${OURS}f/${id}/`, cookie };
  }

  /** A fixture blyg whose page points at its document, the §2.3.2 way. */
  function sourceFixture(opts: {
    origin?: string;
    docOrigin?: string;
    id?: string;
    stubTargetId?: string | null;
    transcludeId?: string | null;
    withdrawn?: boolean;
    pageHtml?: string;
  }) {
    const origin = opts.origin ?? THEIRS;
    const id = opts.id ?? newId();
    const page = `${origin}t/${id}/`;
    const docUrl = `${origin}items/${id}.json`;
    const doc: Record<string, unknown> = {
      blyg: "0.3",
      id,
      kind: opts.withdrawn ? "withdrawn" : "thread",
      origin: opts.docOrigin ?? origin,
      page: `t/${id}/`,
      author: { name: "Their Name", url: origin },
      version: 2,
      content_md: "their response",
      content_html: "<p>their response</p>",
      content_hash: "sha256:x",
      media: [],
      transclusions: opts.transcludeId ? [{ id: opts.transcludeId, version: 1, origin: OURS }] : [],
      ...(opts.stubTargetId ? { stub_of: { origin: OURS, id: opts.stubTargetId, version: 1 } } : {}),
    };
    return {
      id,
      page,
      map: {
        [page]: {
          body: opts.pageHtml ?? `<html><head><link rel="alternate" type="application/json" href="${docUrl}"></head><body>hi</body></html>`,
        },
        [docUrl]: { body: JSON.stringify(doc) },
      },
    };
  }

  it("verifies a stub: 202 on the claim, `stub` once the document is read", async () => {
    const { id, target } = await ourItem();
    const src = sourceFixture({ stubTargetId: id, transcludeId: id });
    const net = fixtureNet(src.map);

    const outcome = await receiveMention(env.DB, { source: src.page, target }, OURS);
    expect(outcome.status).toBe(202);
    const mentionId = (outcome as { mentionId: string }).mentionId;
    const result = await verifyMention(env.DB, mentionId, src.page, id, OURS, net.fetch);
    expect(result.status).toBe("verified");
    // stub_of outranks the transclusion of the same item.
    expect(result.relation).toBe("stub");

    const row = await getInbound(env.DB, mentionId);
    expect(row?.status).toBe("verified");
    expect(row?.source_origin).toBe(THEIRS);
    expect(row?.source_version).toBe(2);
    expect(JSON.parse(row!.source_author_json!).name).toBe("Their Name");
    // A verified mention is a pointer: none of their prose is stored.
    expect(JSON.stringify(row)).not.toContain("their response");
    // Two fetches, exactly: the page and the document it names.
    expect(net.calls).toHaveLength(2);
  });

  it("verifies a plain transclusion as `transclusion`", async () => {
    const { id, target } = await ourItem();
    const src = sourceFixture({ transcludeId: id });
    const net = fixtureNet(src.map);
    const outcome = await receiveMention(env.DB, { source: src.page, target }, OURS);
    const result = await verifyMention(env.DB, (outcome as { mentionId: string }).mentionId, src.page, id, OURS, net.fetch);
    expect(result.relation).toBe("transclusion");
  });

  it("accepts a source URL that is the document itself — one fetch", async () => {
    const { id, target } = await ourItem();
    const src = sourceFixture({ stubTargetId: id });
    const docUrl = `${THEIRS}items/${src.id}.json`;
    const net = fixtureNet(src.map);
    const outcome = await receiveMention(env.DB, { source: docUrl, target }, OURS);
    const result = await verifyMention(env.DB, (outcome as { mentionId: string }).mentionId, docUrl, id, OURS, net.fetch);
    expect(result.status).toBe("verified");
    expect(net.calls).toHaveLength(1);
  });

  it("the negative table", async () => {
    const { id, target } = await ourItem();

    // (a) A page on one host whose document claims another origin — a mirror
    // or an impostor trying to speak in a real blyg's name.
    const impostor = sourceFixture({ origin: "https://mirror.example/", docOrigin: THEIRS, stubTargetId: id });
    let net = fixtureNet(impostor.map);
    let out = await receiveMention(env.DB, { source: impostor.page, target }, OURS);
    let res = await verifyMention(env.DB, (out as { mentionId: string }).mentionId, impostor.page, id, OURS, net.fetch);
    expect(res.status).toBe("failed");
    expect(res.reason).toMatch(/origin mismatch/);

    // (b) A real blyg document that simply doesn't reference us.
    const unrelated = sourceFixture({});
    net = fixtureNet(unrelated.map);
    out = await receiveMention(env.DB, { source: unrelated.page, target }, OURS);
    res = await verifyMention(env.DB, (out as { mentionId: string }).mentionId, unrelated.page, id, OURS, net.fetch);
    expect(res.status).toBe("failed");
    expect(res.reason).toMatch(/does not reference/);

    // (c) A withdrawn source → gone, not failed: it verified once.
    const withdrawn = sourceFixture({ stubTargetId: id, withdrawn: true });
    net = fixtureNet(withdrawn.map);
    out = await receiveMention(env.DB, { source: withdrawn.page, target }, OURS);
    res = await verifyMention(env.DB, (out as { mentionId: string }).mentionId, withdrawn.page, id, OURS, net.fetch);
    expect(res.status).toBe("gone");

    // (d) An ordinary web page with no JSON alternate — a plain webmention,
    // which the reference client holds apart and drops at 0.3 (§2.3.7).
    const plain = sourceFixture({ stubTargetId: id, pageHtml: `<html><body><a href="${target}">look at this</a></body></html>` });
    net = fixtureNet(plain.map);
    out = await receiveMention(env.DB, { source: plain.page, target }, OURS);
    res = await verifyMention(env.DB, (out as { mentionId: string }).mentionId, plain.page, id, OURS, net.fetch);
    expect(res.status).toBe("failed");
    expect(res.reason).toMatch(/not a blyg item/);
  });

  it("rejects malformed claims syntactically, before any fetch", async () => {
    const { target } = await ourItem();
    const cases: [string, { source?: string; target?: string }][] = [
      ["no source", { target }],
      ["relative source", { source: "/x", target }],
      ["source equals target", { source: target, target }],
      ["target on another host", { source: `${THEIRS}t/x/`, target: "https://elsewhere.example/f/x/" }],
      ["target names no item", { source: `${THEIRS}t/x/`, target: `${OURS}f/${newId()}/` }],
      ["target is not an item URL", { source: `${THEIRS}t/x/`, target: `${OURS}archive/` }],
    ];
    for (const [label, form] of cases) {
      const res = await receiveMention(env.DB, form, OURS);
      expect(res.status, label).toBe(400);
    }
  });

  it("accepts a mention that targets a withdrawn item — people may respond to a withdrawal", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: OURS });
    const id = await createAndPublish(cookie, "soon withdrawn");
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    const res = await receiveMention(env.DB, { source: `${THEIRS}t/x/`, target: `${OURS}f/${id}/` }, OURS);
    expect(res.status).toBe(202);
  });

  it("rate-limits one source host at 60 an hour", async () => {
    const { id, target } = await ourItem();
    const now = Date.parse("2026-09-16T12:00:00Z");
    for (let i = 0; i < INBOUND_HOURLY_LIMIT; i++) {
      await upsertInbound(env.DB, `https://flood.example/t/${i}/`, target, id, new Date(now).toISOString());
    }
    const res = await receiveMention(env.DB, { source: "https://flood.example/t/last/", target }, OURS, now);
    expect(res.status).toBe(429);
    // A different host is unaffected — the limit is per source host.
    expect((await receiveMention(env.DB, { source: `${THEIRS}t/x/`, target }, OURS, now)).status).toBe(202);
  });

  it("re-verification of a source that stopped referencing us marks it gone, keeping the row", async () => {
    const { id, target } = await ourItem();
    const src = sourceFixture({ stubTargetId: id });
    let net = fixtureNet(src.map);
    const out = await receiveMention(env.DB, { source: src.page, target }, OURS);
    const mentionId = (out as { mentionId: string }).mentionId;
    await verifyMention(env.DB, mentionId, src.page, id, OURS, net.fetch);
    expect((await getInbound(env.DB, mentionId))?.status).toBe("verified");

    const gone = sourceFixture({ id: src.id, stubTargetId: id, withdrawn: true });
    net = fixtureNet(gone.map);
    const again = await receiveMention(env.DB, { source: src.page, target }, OURS);
    expect((again as { mentionId: string }).mentionId).toBe(mentionId);
    await verifyMention(env.DB, mentionId, src.page, id, OURS, net.fetch);
    const row = await getInbound(env.DB, mentionId);
    expect(row?.status).toBe("gone");
    // Kept, not deleted: a stubber who republishes is the same relationship.
    expect(row?.first_seen).toBeTruthy();
  });

  it("relationTo ignores a reference to some other item on our origin", () => {
    const ours = { origin: OURS, id: "target-id", version: 1 };
    expect(relationTo({ stub_of: ours }, OURS, "target-id")).toBe("stub");
    expect(relationTo({ stub_of: ours }, OURS, "different-id")).toBeNull();
    expect(relationTo({ stub_of: { url: "https://x.example/" } }, OURS, "target-id")).toBeNull();
  });
});

describe("the endpoint route (§2.3.1)", () => {
  it("is advertised in the manifest, in a page link, and in a Link header", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "an item");
    const manifest = await (await getPublic("/blyg/blyg.json")).json<any>();
    expect(manifest.webmention).toBe("webmention");

    const res = await getPublic(`/blyg/f/${id}/`);
    expect(res.headers.get("link")).toContain('rel="webmention"');
    expect(await res.text()).toContain('<link rel="webmention" href="https://example.com/blyg/webmention">');
    expect(await (await getPublic("/blyg/")).text()).toContain('rel="webmention"');
  });

  it("answers 202 on a well-formed claim and 400 on a bad one", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "a target item");
    const post = (body: Record<string, string>) =>
      SELF.fetch(`${BASE}/blyg/webmention`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });

    const ok = await post({ source: `${THEIRS}t/abc/`, target: `https://example.com/blyg/f/${id}/` });
    expect(ok.status).toBe(202);
    const bad = await post({ source: "not-a-url", target: `https://example.com/blyg/f/${id}/` });
    expect(bad.status).toBe(400);
  });
});

describe("detect stubs — /studio/mentions (§3.3)", () => {
  it("groups verified mentions by target, badges the relation, and offers stub-back only when we hold their item", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: OURS });
    const mine = await createAndPublish(cookie, "something people respond to");

    // Someone we subscribe to and have imported: stub-back is possible.
    const knownId = newId();
    await importFrom(THEIRS, { id: knownId, kind: "thread", version: 1, content_md: "their stub" }, "Friend Blyg");
    const known = await upsertInbound(env.DB, `${THEIRS}t/${knownId}/`, `${OURS}f/${mine}/`, mine);
    const net = fixtureNet({
      [`${THEIRS}t/${knownId}/`]: {
        body: JSON.stringify({
          blyg: "0.3",
          id: knownId,
          kind: "thread",
          origin: THEIRS,
          version: 1,
          author: { name: "Friend Author" },
          stub_of: { origin: OURS, id: mine, version: 1 },
          transclusions: [],
        }),
      },
    });
    await verifyMention(env.DB, known.id, `${THEIRS}t/${knownId}/`, mine, OURS, net.fetch);

    // A stranger we don't subscribe to: no stub-back, an invitation instead.
    const strangerId = newId();
    const stranger = await upsertInbound(env.DB, `https://stranger.example/t/${strangerId}/`, `${OURS}f/${mine}/`, mine);
    const strangerNet = fixtureNet({
      [`https://stranger.example/t/${strangerId}/`]: {
        body: JSON.stringify({
          blyg: "0.3",
          id: strangerId,
          kind: "thread",
          origin: "https://stranger.example/",
          version: 4,
          transclusions: [{ id: mine, version: 1, origin: OURS }],
        }),
      },
    });
    await verifyMention(env.DB, stranger.id, `https://stranger.example/t/${strangerId}/`, mine, OURS, strangerNet.fetch);

    const html = await (await SELF.fetch(`${BASE}${STUDIO}/mentions`, { headers: { cookie } })).text();
    // The group names the item by its opening words, not by its id.
    expect(html).toContain("something people respond to");
    expect(html).toContain("2 responses");
    expect(html).toContain(">stub<");
    expect(html).toContain(">transclusion<");
    expect(html).toContain("Friend Author");
    expect(html).toContain(`data-remote="${knownId}"`);
    expect(html).toContain("subscribe to https://stranger.example/");
    // A pointer, not a copy: none of their text is on this page.
    expect(html).not.toContain("their stub");
  });

  it("shows the outbound queue, and warns when no site URL is set", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: "" });
    const html = await (await SELF.fetch(`${BASE}${STUDIO}/mentions`, { headers: { cookie } })).text();
    expect(html).toContain("No <strong>site URL</strong> is set");

    await apiJson(cookie, "PUT", "/api/settings", { site_url: OURS });
    const remoteId = newId();
    await importFrom(THEIRS, { id: remoteId, kind: "fragment", version: 1, content_md: "theirs" });
    const stub = await apiJson(cookie, "POST", "/api/items", {
      kind: "thread",
      content_md: `![[${remoteId}]]`,
      stub_of: { origin: THEIRS, id: remoteId, version: 1 },
    });
    await apiJson(cookie, "POST", `/api/items/${stub.json.id}/publish`, {});

    const after = await (await SELF.fetch(`${BASE}${STUDIO}/mentions`, { headers: { cookie } })).text();
    expect(after).not.toContain("No <strong>site URL</strong> is set");
    expect(after).toContain(`${THEIRS}f/${remoteId}/`);
    expect(after).toContain(stub.json.id.slice(0, 8));
  });
});

describe("the stub stack (§4.3)", () => {
  it("A's fragment → B's stub → A's stub of the stub, nested two deep and verified", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: OURS });

    // A (us) publishes F.
    const f = await createAndPublish(cookie, "the original claim");

    // B stubs it: their thread quotes F and cites it. We import that.
    const s1 = newId();
    const s1Html = `<p>I disagree.</p>\n<blockquote class="blyg-transclusion" data-blyg-id="${f}" data-blyg-version="1" data-blyg-origin="${OURS}"><p>the original claim</p></blockquote>`;
    const subId = await importFrom(THEIRS, { id: s1, kind: "thread", version: 1, content_md: "I disagree.", content_html: s1Html }, "Friend Blyg");

    // Their mention of F verifies as a stub.
    const inbound = await upsertInbound(env.DB, `${THEIRS}t/${s1}/`, `${OURS}f/${f}/`, f);
    const net = fixtureNet({
      [`${THEIRS}t/${s1}/`]: {
        body: JSON.stringify({
          blyg: "0.3",
          id: s1,
          kind: "thread",
          origin: THEIRS,
          version: 1,
          stub_of: { origin: OURS, id: f, version: 1 },
          transclusions: [{ id: f, version: 1, origin: OURS }],
        }),
      },
    });
    expect((await verifyMention(env.DB, inbound.id, `${THEIRS}t/${s1}/`, f, OURS, net.fetch)).relation).toBe("stub");

    // A stubs the stub back, from the studio's own gesture.
    const created = await apiJson(cookie, "POST", "/api/stubs", { subscription_id: subId, remote_id: s1 });
    expect(created.status).toBe(201);
    const s2 = created.json.id as string;
    expect((await apiJson(cookie, "POST", `/api/items/${s2}/publish`, {})).status).toBe(200);

    const doc = await (await getPublic(`/blyg/items/${s2}.json`)).json<any>();
    expect(doc.stub_of).toEqual({ origin: THEIRS, id: s1, version: 1 });
    expect(doc.transclusions).toEqual([{ id: s1, version: 1, origin: THEIRS }]);
    // Two levels of blockquote: their thread, and our fragment inside it.
    expect((doc.content_html.match(/<blockquote class="blyg-transclusion"/g) ?? []).length).toBe(2);
    expect(doc.content_html).toContain(`data-blyg-id="${s1}"`);
    expect(doc.content_html).toContain(`data-blyg-id="${f}"`);
    expect(doc.content_html).toContain("the original claim");

    // And the mention we owe B is queued at their permalink.
    const queued = (await listOutbound(env.DB)).filter((r) => r.item_id === s2);
    expect(queued).toHaveLength(1);
    expect(queued[0].target).toBe(`${THEIRS}t/${s1}/`);
  });
});
