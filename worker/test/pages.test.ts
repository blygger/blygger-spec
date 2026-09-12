// Task 8 acceptance: public HTML renders the §4 wireframe structure;
// markdown escaping verified (no raw HTML passthrough).
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

describe("public pages (§3.4)", () => {
  it("feed page shows header, fragment, permalink, RSS link", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_title: "Venkat's blyg" });
    const id = await createAndPublish(cookie, "a *rendered* fragment");
    const html = await (await getPublic("/blyg/")).text();
    // Title tag carries site identity; the embeddable page body itself is
    // deliberately minimal (bare Home+RSS header, no title/bio/links) per
    // the rev-2/3 wireframe review (docs/wireframes/public.html).
    expect(html).toContain("<title>Venkat&#39;s blyg</title>");
    expect(html).toContain("<em>rendered</em>");
    expect(html).toContain("Created:");
    expect(html).toContain(`/blyg/f/${id}/`);
    expect(html).toContain("/blyg/feed.xml");
  });

  it("never passes raw HTML through markdown", async () => {
    const cookie = await login();
    await createAndPublish(cookie, '<script>alert(1)</script> and <img src=x onerror=y>');
    const html = await (await getPublic("/blyg/")).text();
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("onerror=y>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("edited fragments show the version line, 'Most recent', and the note", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "draft one");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "sharpened" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, { note: "sharpened the claim" });
    const html = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(html).toContain(`<p class="version-line">v2</p>`);
    expect(html).toContain("Most recent");
    expect(html).toContain("sharpened the claim");
    // §2.8: no historical-version HTML route exists, so the page must not
    // draw paging affordances for it. The rev-3 scrubber is gone for good.
    expect(html).not.toContain("version-nav");
    expect(html).not.toContain("v2 of 2");
  });

  it("shows pinned versions as citations linking to their frozen pages", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "first cut");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "second cut" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 2 });

    const html = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(html).toContain("pinned:");
    expect(html).toContain(`href="/blyg/f/${id}/v1/"`);
    expect(html).toContain(`href="/blyg/f/${id}/v2/"`);
    // Those URLs are the promise, so they had better resolve — as pages.
    expect((await getPublic(`/blyg/f/${id}/v1/`)).status).toBe(200);
    expect((await getPublic(`/blyg/f/${id}/v2/`)).status).toBe(200);
  });

  it("a pinned single-version item still shows its citation", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "only ever one");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    const html = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(html).toContain(`href="/blyg/f/${id}/v1/"`);
    expect(html).not.toContain("Most recent"); // one version — nothing to compare against
  });

  it("a withdrawn item still shows what remains citable", async () => {
    // §2.8: a pin survives withdrawal of the live stream, so the endcap page
    // is precisely where a reader needs to be told the pin is still good.
    const cookie = await login();
    const id = await createAndPublish(cookie, "will be pulled");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    const html = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(html).toContain("withdrawn");
    expect(html).toContain(`href="/blyg/f/${id}/v1/"`);
    expect((await getPublic(`/blyg/f/${id}/v1/`)).status).toBe(200);
  });

  it("pinned-version pages render the frozen content with banner, canonical, and JSON twin", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "the **original** wording");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "the revised wording" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});

    const res = await getPublic(`/blyg/f/${id}/v1/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    // Frozen content = v1's stored publish-time rendering, not the live v2.
    expect(html).toContain("<strong>original</strong>");
    expect(html).not.toContain("revised wording");
    // Presentation: banner so it can't be mistaken for the live item,
    // canonical pointing at the live permalink, and the machine-citable twin.
    expect(html).toContain("Pinned v1");
    expect(html).toContain(`rel="canonical"`);
    expect(html).toContain(`f/${id}/"`);
    expect(html).toContain(`href="/blyg/items/${id}/v1.json"`);
  });

  it("pinned-version pages 404 for unpinned versions, unknown ids, and bad segments", async () => {
    // Withheld-unless-pinned (§2.8): the HTML route must be gated exactly
    // like the JSON route, or it would expose history withdrawal withholds.
    const cookie = await login();
    const id = await createAndPublish(cookie, "v1 text");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "v2 text" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 2 });

    expect((await getPublic(`/blyg/f/${id}/v1/`)).status).toBe(404); // unpinned
    expect((await getPublic(`/blyg/f/${id}/v3/`)).status).toBe(404); // nonexistent
    expect((await getPublic(`/blyg/f/${id}/vX/`)).status).toBe(404); // malformed
    expect((await getPublic(`/blyg/f/unknownid00000000000000000/v1/`)).status).toBe(404);
    expect((await getPublic(`/blyg/t/${id}/v2/`)).status).toBe(404); // wrong kind route
    expect((await getPublic(`/blyg/f/${id}/v2/`)).status).toBe(200); // the pinned one
  });

  it("a pinned-version page survives withdrawal of the item", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "citable forever");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    const res = await getPublic(`/blyg/f/${id}/v1/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("citable forever");
  });

  it("withdrawn permalinks return 200 with a withdrawn notice", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "to be pulled back");
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    const res = await getPublic(`/blyg/f/${id}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("withdrawn");
    expect(html).not.toContain("to be pulled back");
  });

  it("archive page lists items as excerpt/date links", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "an archived fragment");
    const html = await (await getPublic("/blyg/archive/")).text();
    expect(html).toContain("Archive");
    expect(html).toContain(`/blyg/f/${id}/`);
    expect(html).toContain("an archived fragment");
  });

  it("serves style.css", async () => {
    const css = await getPublic("/blyg/style.css");
    expect(css.headers.get("content-type")).toContain("text/css");
    expect(await css.text()).toContain("max-width: 65ch");
  });

  it("withdrawn items are excluded from the feed page but kept in the archive", async () => {
    const cookie = await login();
    const keep = await createAndPublish(cookie, "survivor fragment");
    const pulled = await createAndPublish(cookie, "retracted fragment");
    await apiJson(cookie, "POST", `/api/items/${pulled}/withdraw`, {});
    const feed = await (await getPublic("/blyg/")).text();
    expect(feed).toContain("survivor fragment");
    expect(feed).not.toContain("retracted fragment");
    const archive = await (await getPublic("/blyg/archive/")).text();
    expect(archive).toContain("survivor fragment");
    expect(archive).toContain("withdrawn");
  });
});
