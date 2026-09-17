// v0.3 task 4 acceptance (plan §2.3.2, decision #29): item documents declare
// their own permalink, permalink pages point back at the document, the
// importer stores what an origin declares, and the provenance line stops
// guessing — it links by kind locally and by the origin's own page remotely.
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { applyEffect, createSubscription, getImportedItem } from "../src/importer/store.ts";
import { transition } from "../src/importer/transition.ts";
import { itemDocBody } from "./importer/fixtures.ts";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";
import { newId } from "../src/util.ts";

const THEIRS = "https://friend.example/blyg/";

async function importItem(
  doc: { id: string; kind?: "fragment" | "thread"; page?: string; content_md?: string; content_html?: string },
  origin = THEIRS,
): Promise<string> {
  const sub = await createSubscription(env.DB, { kind: "blyg", origin, feedUrl: `${origin}feed.xml`, title: "Their Blyg" });
  const body = await itemDocBody({ kind: "fragment", version: 1, ...doc });
  const tr = transition({ local: { status: "absent" }, doc: JSON.parse(body) });
  await applyEffect(env.DB, sub.id, doc.id, tr.effect, new Date().toISOString());
  return sub.id;
}

describe("the page field (§2.3.2)", () => {
  it("item documents declare their own permalink, by kind", async () => {
    const cookie = await login();
    const f = await createAndPublish(cookie, "a fragment");
    const t = (await apiJson(cookie, "POST", "/api/items", { content_md: "a thread", kind: "thread" })).json.id;
    await apiJson(cookie, "POST", `/api/items/${t}/publish`, {});

    expect((await (await getPublic(`/blyg/items/${f}.json`)).json<any>()).page).toBe(`f/${f}/`);
    expect((await (await getPublic(`/blyg/items/${t}.json`)).json<any>()).page).toBe(`t/${t}/`);

    // A withdrawal endcap is 200 forever and still has a page — and it names
    // the authored kind, not "withdrawn".
    await apiJson(cookie, "POST", `/api/items/${t}/withdraw`, {});
    const endcap = await (await getPublic(`/blyg/items/${t}.json`)).json<any>();
    expect(endcap.kind).toBe("withdrawn");
    expect(endcap.page).toBe(`t/${t}/`);
  });

  it("permalink pages link back to the document — the verification hook", async () => {
    const cookie = await login();
    const f = await createAndPublish(cookie, "a fragment");
    const fragmentPage = await (await getPublic(`/blyg/f/${f}/`)).text();
    expect(fragmentPage).toContain(`<link rel="alternate" type="application/json" href="https://example.com/blyg/items/${f}.json">`);

    const t = (await apiJson(cookie, "POST", "/api/items", { content_md: "a thread", kind: "thread" })).json.id;
    await apiJson(cookie, "POST", `/api/items/${t}/publish`, {});
    const threadPage = await (await getPublic(`/blyg/t/${t}/`)).text();
    expect(threadPage).toContain(`href="https://example.com/blyg/items/${t}.json"`);

    // Withdrawn too: §2.3.6 keeps accepting mentions that target a withdrawal.
    await apiJson(cookie, "POST", `/api/items/${t}/withdraw`, {});
    expect(await (await getPublic(`/blyg/t/${t}/`)).text()).toContain(`href="https://example.com/blyg/items/${t}.json"`);
  });

  it("the importer stores an origin's declared page, and keeps it when a later document omits it", async () => {
    const remoteId = newId();
    const subId = await importItem({ id: remoteId, page: `posts/${remoteId}` });
    expect((await getImportedItem(env.DB, subId, remoteId))?.page).toBe(`posts/${remoteId}`);

    const v2 = await itemDocBody({ id: remoteId, kind: "fragment", version: 2, content_md: "edited" });
    const tr = transition({ local: { status: "current", version: 1 }, doc: JSON.parse(v2) });
    await applyEffect(env.DB, subId, remoteId, tr.effect, new Date().toISOString());
    const row = await getImportedItem(env.DB, subId, remoteId);
    expect(row?.version).toBe(2);
    expect(row?.page).toBe(`posts/${remoteId}`);
  });
});

describe("provenance lines (§2.1 presentation)", () => {
  it("links a remote source at its own declared page, named by its blyg", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem({ id: remoteId, page: `posts/${remoteId}`, content_md: "their words" });
    const threadId = (await apiJson(cookie, "POST", "/api/items", { content_md: `![[${remoteId}]]`, kind: "thread" })).json.id;
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});

    const html = await (await getPublic(`/blyg/t/${threadId}/`)).text();
    expect(html).toContain(`href="${THEIRS}posts/${remoteId}"`);
    expect(html).toContain("from <em>Their Blyg</em> ↗");
    expect(html).toContain("snapshot of v1");
  });

  it("falls back to the f/·t/ convention when a remote source declares no page", async () => {
    const cookie = await login();
    const remoteId = newId();
    await importItem({ id: remoteId, kind: "thread", content_md: "their thread" }, "https://other.example/");
    const threadId = (await apiJson(cookie, "POST", "/api/items", { content_md: `![[${remoteId}]]`, kind: "thread" })).json.id;
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});

    expect(await (await getPublic(`/blyg/t/${threadId}/`)).text()).toContain(`href="https://other.example/t/${remoteId}/"`);
  });

  it("links a local thread target as a thread, not as a 404 under f/", async () => {
    const cookie = await login();
    const inner = (await apiJson(cookie, "POST", "/api/items", { content_md: "inner", kind: "thread" })).json.id;
    await apiJson(cookie, "POST", `/api/items/${inner}/publish`, {});
    const outer = (await apiJson(cookie, "POST", "/api/items", { content_md: `![[${inner}]]`, kind: "thread" })).json.id;
    await apiJson(cookie, "POST", `/api/items/${outer}/publish`, {});

    const html = await (await getPublic(`/blyg/t/${outer}/`)).text();
    expect(html).toContain(`href="/blyg/t/${inner}/">thread ↗`);
    expect(html).not.toContain(`/blyg/f/${inner}/`);
  });

  it("injects one provenance line per direct quote, even when the quote nests", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "innermost");
    const inner = (await apiJson(cookie, "POST", "/api/items", { content_md: `![[${f1}]]`, kind: "thread" })).json.id;
    await apiJson(cookie, "POST", `/api/items/${inner}/publish`, {});
    const f2 = await createAndPublish(cookie, "a second fragment");
    const outer = (await apiJson(cookie, "POST", "/api/items", { content_md: `![[${inner}]]\n\nthen\n\n![[${f2}]]`, kind: "thread" }))
      .json.id;
    await apiJson(cookie, "POST", `/api/items/${outer}/publish`, {});

    const html = await (await getPublic(`/blyg/t/${outer}/`)).text();
    // Two direct quotes → two provenance lines; the nested one gets none.
    expect((html.match(/class="provenance"/g) ?? []).length).toBe(2);
    // ...and they are paired with the right quote: the misalignment a
    // non-greedy regex would produce puts the fragment's line on the thread.
    const thread = html.indexOf(`href="/blyg/t/${inner}/"`);
    const fragment = html.indexOf(`href="/blyg/f/${f2}/"`);
    expect(thread).toBeGreaterThan(-1);
    expect(fragment).toBeGreaterThan(thread);
    expect(html.indexOf("innermost")).toBeLessThan(thread);
  });
});
