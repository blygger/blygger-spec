// Task 13/14 acceptance: transclusion resolution, bad-reference rejection,
// snapshot independence from source edits/withdrawal, republish re-snapshot,
// withdrawn-thread endcap, thread protocol surfaces (item JSON, t/{id}/ page,
// feed page excerpt card, feed.xml full HTML, pinned thread versions).
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

async function createThread(cookie: string, contentMd: string): Promise<string> {
  const created = await apiJson(cookie, "POST", "/api/items", { content_md: contentMd, kind: "thread" });
  expect(created.status).toBe(201);
  expect(created.json.kind).toBe("thread");
  return created.json.id as string;
}

describe("threads & transclusion (§2.9)", () => {
  it("publishes a thread with two transclusions, baking snapshots + provenance", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "first fragment");
    const f2 = await createAndPublish(cookie, "second fragment");
    const threadId = await createThread(cookie, `# A thread\n\nIntro.\n\n![[${f1}]]\n\nMiddle.\n\n![[${f2}]]\n\nOutro.`);
    const pub = await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, { note: "first cut" });
    expect(pub.status).toBe(200);
    expect(pub.json.version).toBe(1);

    const item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.kind).toBe("thread");
    expect(item.transclusions).toEqual([
      { id: f1, version: 1 },
      { id: f2, version: 1 },
    ]);
    expect(item.content_html).toContain('class="blyg-transclusion"');
    expect(item.content_html).toContain("first fragment");
    expect(item.content_html).toContain("second fragment");
    expect(item.content_md).toContain(`![[${f1}]]`);

    const page = await getPublic(`/blyg/t/${threadId}/`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("first fragment");
    expect(html).toContain("second fragment");
    expect(html).toContain("fragment ↗");
    expect(html).toContain(`/blyg/f/${f1}/`);

    // f/ route rejects a thread id; t/ route rejects a fragment id.
    expect((await getPublic(`/blyg/f/${threadId}/`)).status).toBe(404);
    expect((await getPublic(`/blyg/t/${f1}/`)).status).toBe(404);
  });

  it("rejects unresolvable transclusions: draft, withdrawn, thread, unknown", async () => {
    const cookie = await login();
    const draftFrag = (await apiJson(cookie, "POST", "/api/items", { content_md: "never published" })).json.id;
    const withdrawnFrag = await createAndPublish(cookie, "to be withdrawn");
    await apiJson(cookie, "POST", `/api/items/${withdrawnFrag}/withdraw`, {});
    const otherThread = await createThread(cookie, "some thread content");
    await apiJson(cookie, "POST", `/api/items/${otherThread}/publish`, {});

    const cases: [string, string][] = [
      ["draft", draftFrag],
      ["withdrawn", withdrawnFrag],
      ["thread", otherThread],
      ["unknown", "zzzzzzzzzzzzzzzzzzzzzzzzzz"],
    ];
    for (const [label, id] of cases) {
      const threadId = await createThread(cookie, `bad ref\n\n![[${id}]]`);
      const pub = await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
      expect(pub.status, label).toBe(400);
      expect(pub.json.errors.length, label).toBe(1);
    }
  });

  it("rejects @vN explicit-version directives (reserved)", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "fragment");
    const threadId = await createThread(cookie, `![[${f1}@v1]]`);
    const pub = await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    expect(pub.status).toBe(400);
    expect(pub.json.errors[0].reason).toMatch(/reserved/);
  });

  it("source edit/withdraw doesn't change the baked snapshot", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "original text");
    const threadId = await createThread(cookie, `![[${f1}]]`);
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    let item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.content_html).toContain("original text");

    await apiJson(cookie, "PUT", `/api/items/${f1}`, { content_md: "revised text" });
    await apiJson(cookie, "POST", `/api/items/${f1}/publish`, {});
    item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.content_html).toContain("original text");
    expect(item.content_html).not.toContain("revised text");

    await apiJson(cookie, "POST", `/api/items/${f1}/withdraw`, {});
    item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.content_html).toContain("original text");

    // Republishing re-resolves against current state — now fails since f1 is withdrawn.
    const rePub = await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    expect(rePub.status).toBe(400);
  });

  it("republish re-snapshots to the then-latest source version", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "v1 text");
    const threadId = await createThread(cookie, `![[${f1}]]`);
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    await apiJson(cookie, "PUT", `/api/items/${f1}`, { content_md: "v2 text" });
    await apiJson(cookie, "POST", `/api/items/${f1}/publish`, {});

    const rePub = await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    expect(rePub.status).toBe(200);
    expect(rePub.json.version).toBe(2);
    const item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.content_html).toContain("v2 text");
    expect(item.transclusions).toEqual([{ id: f1, version: 2 }]);
  });

  it("withdrawing a thread empties transclusions to [] alongside content; republish restores kind", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "fragment content");
    const threadId = await createThread(cookie, `![[${f1}]]`);
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    const wd = await apiJson(cookie, "POST", `/api/items/${threadId}/withdraw`, {});
    expect(wd.status).toBe(200);
    const item = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(item.kind).toBe("withdrawn");
    expect(item.transclusions).toEqual([]);
    expect(item.content_html).toBe("");

    const rePub = await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    expect(rePub.status).toBe(200);
    const restored = await (await getPublic(`/blyg/items/${threadId}.json`)).json<any>();
    expect(restored.kind).toBe("thread");
    expect(restored.transclusions).toEqual([{ id: f1, version: 1 }]);
  });

  it("threads have no fragment length cap", async () => {
    const cookie = await login();
    const threadId = await createThread(cookie, "x".repeat(5000));
    const pub = await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    expect(pub.status).toBe(200);
  });

  it("thread pinned version serves stored html + provenance, survives withdrawal", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "pinned fragment source");
    const threadId = await createThread(cookie, `![[${f1}]]`);
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    const pin = await apiJson(cookie, "POST", `/api/items/${threadId}/pin`, { version: 1 });
    expect(pin.status).toBe(200);

    const res = await getPublic(`/blyg/items/${threadId}/v1.json`);
    expect(res.status).toBe(200);
    const v1 = await res.json<any>();
    expect(v1.kind).toBe("thread");
    expect(v1.transclusions).toEqual([{ id: f1, version: 1 }]);
    expect(v1.content_html).toContain("pinned fragment source");

    await apiJson(cookie, "POST", `/api/items/${threadId}/withdraw`, {});
    expect((await getPublic(`/blyg/items/${threadId}/v1.json`)).status).toBe(200);
  });

  it("thread pinned-version PAGE serves the baked snapshot with provenance, on the t/ route", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "the quoted fragment");
    const threadId = await createThread(cookie, `Intro line.\n\n![[${f1}]]`);
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    await apiJson(cookie, "POST", `/api/items/${threadId}/pin`, { version: 1 });

    const res = await getPublic(`/blyg/t/${threadId}/v1/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("blyg-transclusion"); // the baked snapshot, verbatim
    expect(html).toContain("the quoted fragment");
    expect(html).toContain("snapshot of v1"); // provenance injection, same as the live thread page
    expect(html).toContain("Pinned v1");
    // A thread pin lives on the t/ route only — the authored kind of the
    // pinned version decides, even though item.kind may later be 'withdrawn'.
    expect((await getPublic(`/blyg/f/${threadId}/v1/`)).status).toBe(404);

    // And it survives withdrawal, on the same route.
    await apiJson(cookie, "POST", `/api/items/${threadId}/withdraw`, {});
    expect((await getPublic(`/blyg/t/${threadId}/v1/`)).status).toBe(200);
  });

  it("feed.xml carries thread entries with full baked HTML and a t/ link", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "quotable line");
    const threadId = await createThread(cookie, `intro\n\n![[${f1}]]`);
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, { note: "first cut" });
    const xml = await (await getPublic("/blyg/feed.xml")).text();
    expect(xml).toContain(`blyg:${threadId}:v1`);
    expect(xml).toContain(`t/${threadId}/`);
    expect(xml).toContain("quotable line");
    expect(xml).toContain("blyg-transclusion");
  });

  it("feed page renders threads as excerpt cards linking to t/{id}/", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "card source text");
    const threadId = await createThread(cookie, `intro text\n\n![[${f1}]]`);
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    const html = await (await getPublic("/blyg/")).text();
    expect(html).toContain("kind-chip");
    expect(html).toContain(`/blyg/t/${threadId}/`);
    expect(html).toContain("read the thread");
  });

  it("archive index carries kind: thread; withdrawn thread route rejects f/", async () => {
    const cookie = await login();
    const f1 = await createAndPublish(cookie, "archived source");
    const threadId = await createThread(cookie, `![[${f1}]]`);
    await apiJson(cookie, "POST", `/api/items/${threadId}/publish`, {});
    const index = await (await getPublic("/blyg/items/index.json")).json<any>();
    expect(index.items.find((i: any) => i.id === threadId).kind).toBe("thread");

    await apiJson(cookie, "POST", `/api/items/${threadId}/withdraw`, {});
    expect((await getPublic(`/blyg/t/${threadId}/`)).status).toBe(200);
    expect((await getPublic(`/blyg/f/${threadId}/`)).status).toBe(404);
  });
});
