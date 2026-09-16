// Task 8 acceptance: public HTML renders the §4 wireframe structure;
// markdown escaping verified (no raw HTML passthrough).
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, BASE, createAndPublish, getPublic, login } from "./helpers.ts";

describe("public pages (§3.4)", () => {
  it("feed page shows header, fragment, permalink, RSS link", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_title: "Venkat's blyg" });
    const id = await createAndPublish(cookie, "a *rendered* fragment");
    const html = await (await getPublic("/blyg/")).text();
    // Session 19: site identity now renders on the feed page too, not only in
    // <title>. The header's left slot is the blyg's own name linking to its
    // index (it used to be a hardcoded `Home` → `/`, which is a self-link on a
    // root-mounted node and leaves a path-mounted permalink with no way back).
    expect(html).toContain("<title>Venkat&#39;s blyg</title>");
    // On the feed page the name is the masthead, set at display size; the
    // one-line `.blyg-name` header is for every *other* page, so printing both
    // would just repeat it. Either way it links the blyg's own index, which
    // the old hardcoded `Home` → `/` did not.
    expect(html).toContain('<p class="site-name"><a href="/blyg/">Venkat&#39;s blyg</a></p>');
    expect(html).not.toContain('<a href="/">Home</a>');
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
    // The version line now carries the carousel's data attributes; without
    // JavaScript it still renders exactly the text it did before.
    expect(html).toContain(`data-live="2"`);
    expect(html).toContain(`<span class="vlabel">v2</span>`);
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
    expect(await css.text()).toContain("65ch");
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

describe("site identity on public pages (session 19)", () => {
  it("feed page renders author name, bio and links from settings", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", {
      site_title: "Field Notes",
      author_name: "A. Author",
      author_bio: "Writes about protocols.",
      author_links: [{ label: "Homepage", url: "https://example.org/" }],
    });
    await createAndPublish(cookie, "hello");
    const html = await (await getPublic("/blyg/")).text();
    expect(html).toContain('<p class="author-name">A. Author</p>');
    expect(html).toContain("Writes about protocols.");
    expect(html).toContain('<a href="https://example.org/" rel="me">Homepage</a>');
  });

  it("permalink, thread, archive and pinned pages stay lean — masthead is feed-page only", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", {
      site_title: "Field Notes",
      author_name: "A. Author",
      author_bio: "Writes about protocols.",
    });
    const id = await createAndPublish(cookie, "a fragment");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    for (const path of [`/blyg/f/${id}/`, `/blyg/f/${id}/v1/`, "/blyg/archive/"]) {
      const html = await (await getPublic(path)).text();
      expect(html, path).not.toContain("Writes about protocols.");
      // …but the name-as-way-back is on every page, which is the point.
      expect(html, path).toContain('<a class="blyg-name" href="/blyg/">Field Notes</a>');
    }
  });

  it("keeps the name but drops the author block when no author fields are set", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", {
      site_title: "Field Notes",
      author_name: "",
      author_bio: "",
      author_links: [],
    });
    await createAndPublish(cookie, "hello");
    const html = await (await getPublic("/blyg/")).text();
    expect(html).toContain('<p class="site-name"><a href="/blyg/">Field Notes</a></p>');
    expect(html).not.toContain('class="author-name"');
    expect(html).not.toContain('class="author-bio"');
    expect(html).not.toContain('class="author-links"');
  });
});

describe("archive rows (session 19)", () => {
  it("formats dates like the feed page and links withdrawn rows to their endcap", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "to be withdrawn");
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    const html = await (await getPublic("/blyg/archive/")).text();
    // Withdrawn rows used to be inert text; the endcap is a real permanent URL.
    expect(html).toContain(`<a href="/blyg/f/${id}/">withdrawn</a>`);
    // Human-formatted, not a raw ISO slice.
    expect(html).toMatch(/<span class="meta">[A-Z][a-z]{2} \d{1,2}, \d{4}/);
    expect(html).not.toMatch(/<span class="meta">\d{4}-\d{2}-\d{2}/);
  });
});

describe("social / meta tags (session 19)", () => {
  it("an item page describes the item, not the site, and titles itself distinctly", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_title: "Field Notes", site_url: "https://example.org/blyg/" });
    const id = await createAndPublish(cookie, "A note about stigmergy and traces.");
    const html = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(html).toContain("<title>A note about stigmergy and traces. — Field Notes</title>");
    expect(html).toContain('<meta name="description" content="A note about stigmergy and traces.">');
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain(`<meta property="og:url" content="https://example.org/blyg/f/${id}/">`);
    expect(html).toContain('<meta property="og:site_name" content="Field Notes">');
  });

  it("a pinned page describes the frozen bytes, not the live ones", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: "https://example.org/blyg/" });
    const id = await createAndPublish(cookie, "the original wording");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "the revised wording" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});
    const pinned = await (await getPublic(`/blyg/f/${id}/v1/`)).text();
    expect(pinned).toContain('<meta name="description" content="the original wording">');
    expect(pinned).not.toContain("the revised wording");
    // …while the live page moved on.
    const live = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(live).toContain('<meta name="description" content="the revised wording">');
  });

  it("uses the item's own image for og:image, falling back to the twitter text card", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_url: "https://example.org/blyg/", avatar_media_id: "" });
    const id = await createAndPublish(cookie, "an illustrated fragment");
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1])], "p.png", { type: "image/png" }));
    form.set("item_id", id);
    const up = (await (
      await SELF.fetch(`${BASE}/api/media`, { method: "POST", headers: { cookie }, body: form })
    ).json()) as any;
    const withImage = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(withImage).toContain(`<meta property="og:image" content="https://example.org/blyg/${up.url}">`);
    expect(withImage).toContain('<meta name="twitter:card" content="summary_large_image">');

    const plain = await createAndPublish(cookie, "no picture here");
    const noImage = await (await getPublic(`/blyg/f/${plain}/`)).text();
    expect(noImage).not.toContain("og:image");
    expect(noImage).toContain('<meta name="twitter:card" content="summary">');
  });

  it("a withdrawn item unfurls as a withdrawal, with no image and no stale text", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { site_title: "Field Notes" });
    const id = await createAndPublish(cookie, "words that will be pulled");
    await apiJson(cookie, "POST", `/api/items/${id}/withdraw`, {});
    const html = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(html).toContain('content="A withdrawn item on Field Notes.">');
    expect(html).not.toContain("words that will be pulled");
    expect(html).not.toContain("og:image");
  });

  it("falls back to the newest item when no bio is set, and to the bio when one is", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { author_bio: "" });
    await createAndPublish(cookie, "the most recently published thing");
    // Asserted against the top of the *rendered* feed rather than a named item:
    // `listPublic` orders by `updated DESC` at second precision, so items
    // published inside one second (which a test does routinely) tie.
    const noBio = await (await getPublic("/blyg/")).text();
    const topArticleText = (noBio.split('<article class="fragment"')[1] ?? "").replace(/<[^>]*>/g, "");
    const described = /<meta name="description" content="([^"]*)">/.exec(noBio)?.[1] ?? "";
    expect(described.length).toBeGreaterThan(0);
    expect(topArticleText).toContain(described.replace(/…$/, ""));

    await apiJson(cookie, "PUT", "/api/settings", { author_bio: "A blyg about protocols." });
    expect(await (await getPublic("/blyg/")).text()).toContain(
      '<meta name="description" content="A blyg about protocols.">',
    );
  });

  // The third case — no bio AND no items — is covered in
  // importer/public-surfaces.test.ts, which runs against a blyg with nothing
  // published and caught this path dereferencing a nonexistent item.
});

describe("titled items link to their own page (session 19)", () => {
  it("links a leading h1 on the feed page but not on the item's own page", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "# Shopping List\n\nEggs and spinach.");
    const feed = await (await getPublic("/blyg/")).text();
    expect(feed).toContain(`<h1><a class="item-title" href="/blyg/f/${id}/">Shopping List</a></h1>`);
    // On the item's own page the title would link to the page you are reading.
    const own = await (await getPublic(`/blyg/f/${id}/`)).text();
    expect(own).toContain("<h1>Shopping List</h1>");
    expect(own).not.toContain("item-title");
  });

  it("only a heading that opens the item counts as its title", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "Some opening prose.\n\n# A section head\n\nMore.");
    const feed = await (await getPublic("/blyg/")).text();
    expect(feed).toContain("<h1>A section head</h1>");
  });

  it("leaves a heading alone when the author already linked inside it", async () => {
    const cookie = await login();
    await createAndPublish(cookie, "# [Linked title](https://example.org/)\n\nBody.");
    const feed = await (await getPublic("/blyg/")).text();
    // Scoped to this heading: other items on the feed legitimately carry
    // item-title links, so a page-wide assertion would test the wrong thing.
    expect(feed).toContain('<h1><a href="https://example.org/">Linked title</a></h1>');
  });

  it("never writes the link into stored content_html", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "# Stored Title\n\nBody.");
    const json = (await (await getPublic(`/blyg/items/${id}.json`)).json()) as any;
    expect(json.content_html).toContain("<h1>Stored Title</h1>");
    expect(json.content_html).not.toContain("item-title");
  });
});

describe("pinned-version carousel (session 19)", () => {
  it("carries the carousel's data on the feed page and degrades to real links", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "version one text");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "version two text" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, {});

    const feed = await (await getPublic("/blyg/")).text();
    expect(feed).toContain(`data-item="${id}"`);
    expect(feed).toContain('data-pins="1"');
    expect(feed).toContain('data-kind="f"');
    // Without JavaScript the pin is still a real link to a real page — the
    // whole enhancement can fail and lose nothing.
    expect(feed).toContain(`<a href="/blyg/f/${id}/v1/"`);
    expect(await (await getPublic(`/blyg/f/${id}/v1/`)).status).toBe(200);
    // And the content it swaps in is a published surface, not a new endpoint.
    const vjson = (await (await getPublic(`/blyg/items/${id}/v1.json`)).json()) as any;
    expect(vjson.content_html).toContain("version one text");
  });

  it("wraps item content so a version can be swapped in place", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "swappable body");
    const feed = await (await getPublic("/blyg/")).text();
    expect(feed).toContain('<div class="item-content">');
    // The permalink page gets the wrapper too, so the markup is one shape.
    expect(await (await getPublic(`/blyg/f/${id}/`)).text()).toContain('<div class="item-content">');
  });

  // Session 21: the script moved from feed-only to every page that renders an
  // item. The version line was always identical across them, so shipping the
  // enhancement on one gave the same markup two behaviours — a pin citation
  // that swapped in place on the feed and navigated away on the permalink.
  it("ships the version-nav script on every page that renders an item", async () => {
    const cookie = await login();
    const fragment = await createAndPublish(cookie, "somewhere to look");
    const thread = (await apiJson(cookie, "POST", "/api/items", { content_md: "a thread body", kind: "thread" }))
      .json.id as string;
    await apiJson(cookie, "POST", `/api/items/${thread}/publish`, {});
    for (const path of ["/blyg/", `/blyg/f/${fragment}/`, `/blyg/t/${thread}/`]) {
      expect(await (await getPublic(path)).text(), path).toContain("version-line[data-item]");
    }
  });

  // Session 21: the carousel swaps the version note along with the body. The
  // data that makes that possible is the per-version note in v{n}.json — if
  // that ever stops being emitted, the note silently falls back to the live
  // version's and the apparatus starts describing the wrong version (which is
  // what it did between sessions 19 and 21).
  it("serves each pinned version's own note, which is what the swap reads", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "first cut");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "second cut" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, { note: "tightened it" });
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 2 });

    const v1 = (await (await getPublic(`/blyg/items/${id}/v1.json`)).json()) as any;
    const v2 = (await (await getPublic(`/blyg/items/${id}/v2.json`)).json()) as any;
    expect(v1.note).toBeNull();
    expect(v2.note).toBe("tightened it");
    // And the server-rendered note is the live version's, which is the state
    // the swap starts from and returns to.
    expect(await (await getPublic(`/blyg/f/${id}/`)).text()).toContain("tightened it");
  });

  it("does not ship it where no item content is rendered", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "an archived item");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    // The archive is a list of links, and a pinned-version page is one frozen
    // version by definition — neither has a carousel to drive. The pinned page
    // in particular must not offer to page away from the version it froze.
    for (const path of ["/blyg/archive/", `/blyg/f/${id}/v1/`]) {
      expect(await (await getPublic(path)).text(), path).not.toContain("version-line[data-item]");
    }
  });
});

describe("reading theme (session 19)", () => {
  it("defaults to auto, which adds nothing to the stylesheet", async () => {
    const css = await (await getPublic("/blyg/style.css")).text();
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).not.toContain("theme:");
  });

  it("an author's theme overrides the reader's light/dark rather than losing to it", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { theme: "solarized-dark" });
    const css = await (await getPublic("/blyg/style.css")).text();
    expect(css).toContain("theme: Solarized Dark");
    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("--paper: #002b36");
    // Defined in BOTH blocks: an explicit choice by the author must not flip
    // when the reader's OS does.
    const dark = css.slice(css.indexOf("theme: Solarized Dark"));
    expect(dark.match(/--paper: #002b36/g)?.length).toBe(2);
  });

  it("separates page from block only when the theme actually differs", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { theme: "slate" });
    const slate = await (await getPublic("/blyg/style.css")).text();
    expect(slate).toContain("--block-pad: 2rem");
    expect(slate).toContain("--page: #2f3538");
    expect(slate).toContain("--paper: #f5f7f7");

    await apiJson(cookie, "PUT", "/api/settings", { theme: "paper" });
    const paper = await (await getPublic("/blyg/style.css")).text();
    // Same colour on both surfaces: padding the block would draw a card edge
    // around nothing.
    expect(paper).toContain("--block-pad: 0rem");
  });

  it("ignores an unknown theme instead of emitting broken CSS", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { theme: "not-a-theme" });
    const css = await (await getPublic("/blyg/style.css")).text();
    expect(css).not.toContain("theme:");
    expect(css).toContain("prefers-color-scheme: dark");
  });

  it("is a local setting — it never reaches the manifest", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", { theme: "nord" });
    const manifest = (await (await getPublic("/blyg/blyg.json")).json()) as any;
    expect(JSON.stringify(manifest)).not.toContain("nord");
    await apiJson(cookie, "PUT", "/api/settings", { theme: "auto" });
  });
});

