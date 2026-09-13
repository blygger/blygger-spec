// Session-19 studio editing affordances: the composer's kind toggle and
// always-open Full Editor door, the editor's discard control, and in-row
// quick edit.
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, BASE, createAndPublish, login, STUDIO } from "./helpers.ts";

async function studioPage(cookie: string, path: string): Promise<string> {
  const res = await SELF.fetch(`${BASE}${path}`, { headers: { cookie } });
  expect(res.status, path).toBe(200);
  return res.text();
}

describe("composer", () => {
  it("offers a fragment/thread toggle with fragment default, not a separate new-thread link", async () => {
    const cookie = await login();
    const html = await studioPage(cookie, STUDIO);
    expect(html).toContain('<input type="radio" name="composer-kind" value="fragment" checked>');
    expect(html).toContain('<input type="radio" name="composer-kind" value="thread">');
    expect(html).not.toContain('data-action="new-thread"');
  });

  it("always offers the full editor, not only when the text contains a TK scope", async () => {
    const cookie = await login();
    const html = await studioPage(cookie, STUDIO);
    expect(html).toContain('id="composer-full"');
    // The generate door is still conditional — it is shown by script only once
    // a scope exists, so it ships hidden.
    expect(html).toContain('id="composer-generate" hidden');
  });
});

describe("editor discard", () => {
  it("a never-published draft discards the draft itself", async () => {
    const cookie = await login();
    const id = (await apiJson(cookie, "POST", "/api/items", { content_md: "unpublished" })).json.id as string;
    const html = await studioPage(cookie, `${STUDIO}/edit/${id}`);
    expect(html).toContain(`data-action="discard" data-id="${id}"`);
    // Asserted on the BUTTON, not the page: actionScript ships the handler for
    // every action to every studio page, so the handler name is always there.
    expect(html).not.toContain(`data-action="discard-changes" data-id="${id}"`);
  });

  it("a dirty published item discards the changes, not the item", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "published text");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "edited but unpublished" });
    const html = await studioPage(cookie, `${STUDIO}/edit/${id}`);
    expect(html).toContain(`data-action="discard-changes" data-id="${id}" data-version="1"`);
    // Deleting a published item must never be offered — withdraw is the exit.
    expect(html).not.toContain(`data-action="discard" data-id="${id}"`);
  });

  it("a clean published item offers no discard at all", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "clean and published");
    const html = await studioPage(cookie, `${STUDIO}/edit/${id}`);
    expect(html).not.toContain(`data-action="discard" data-id="${id}"`);
    expect(html).not.toContain(`data-action="discard-changes" data-id="${id}"`);
    // Leaving the public stream is withdraw, which is still offered.
    expect(html).toContain(`data-action="withdraw" data-id="${id}"`);
  });

  it("discarding changes restores the published text without publishing anything", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "the published wording");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "a draft that will be thrown away" });
    const restored = await apiJson(cookie, "POST", `/api/items/${id}/restore`, { version: 1 });
    expect(restored.status).toBe(200);
    // Still v1 in public: nothing was published and no version was rewound.
    const json = (await (await SELF.fetch(`${BASE}/blyg/items/${id}.json`)).json()) as any;
    expect(json.version).toBe(1);
    expect(json.content_html).toContain("the published wording");
  });
});

describe("quick edit", () => {
  it("every fragment row carries a box holding its working copy", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "a quick-editable fragment");
    const html = await studioPage(cookie, STUDIO);
    expect(html).toContain(`data-action="quick-edit" data-id="${id}"`);
    expect(html).toContain(`<div class="quick-edit" id="qe-${id}" hidden>`);
    expect(html).toContain("a quick-editable fragment");
  });

  it("threads keep to the full editor", async () => {
    const cookie = await login();
    const id = (await apiJson(cookie, "POST", "/api/items", { content_md: "a thread body", kind: "thread" })).json
      .id as string;
    const html = await studioPage(cookie, STUDIO);
    // A thread's working copy carries transclusion directives and TK scopes
    // whose point is the preview, the palette and the scope panel.
    expect(html).not.toContain(`data-action="quick-edit" data-id="${id}"`);
    expect(html).not.toContain(`id="qe-${id}"`);
  });

  it("shows the working copy, which may be ahead of what is published", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "published version");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "unpublished working copy" });
    const html = await studioPage(cookie, STUDIO);
    const box = html.slice(html.indexOf(`id="qe-${id}"`));
    expect(box.slice(0, 400)).toContain("unpublished working copy");
  });
});
