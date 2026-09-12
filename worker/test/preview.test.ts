// Studio preview/excerpt derivation — the fix for raw "#"/"*" markers and
// leaked "[TK]" scopes in the studio index (session 17).

import { describe, expect, it } from "vitest";
import { decodeEntities, plainTextFromHtml, renderMarkdown } from "../src/markdown.ts";
import { clampText, leadingHeading, previewFromHtml, splitL0Content, stripTransclusionQuotes } from "../src/preview.ts";
import { extractDirectives } from "../src/transclusion.ts";

describe("plainTextFromHtml", () => {
  it("does not weld words across block boundaries", () => {
    // The defect: tag-strip-only turned this into "evil.Next".
    expect(plainTextFromHtml("<p>evil.</p><p>Next</p>")).toBe("evil. Next");
    expect(plainTextFromHtml("a<br>b")).toBe("a b");
    expect(plainTextFromHtml("<li>one</li><li>two</li>")).toBe("one two");
  });

  it("drops script/style content rather than inlining it as text", () => {
    expect(plainTextFromHtml("<p>hi</p><script>alert(1)</script>")).toBe("hi");
    expect(plainTextFromHtml("<style>p{color:red}</style><p>hi</p>")).toBe("hi");
  });

  it("decodes entities, with &amp; resolved last", () => {
    expect(plainTextFromHtml("<p>a &amp; b</p>")).toBe("a & b");
    // "&amp;lt;" is the *text* "&lt;", not a nested escape to re-decode.
    expect(decodeEntities("&amp;lt;")).toBe("&lt;");
    expect(plainTextFromHtml("<p>x &hellip; y &mdash; z</p>")).toBe("x … y — z");
  });
});

describe("markdown block syntax never reaches a preview", () => {
  it.each([
    ["# The famous blyg\n\nThis is NOT the most famous blyg ever", "The famous blyg", "This is NOT the most famous blyg ever"],
    ["## Heading test\n\nQuick brown fox", "Heading test", "Quick brown fox"],
  ])("renders %j into title + clean body", (md, title, body) => {
    const p = previewFromHtml(renderMarkdown(md));
    expect(p.title).toBe(title);
    expect(p.body).toBe(body);
  });

  it("strips list markers instead of showing them literally", () => {
    const p = previewFromHtml(renderMarkdown("intro\n\n* one\n* two"));
    expect(p.body).toBe("intro one two");
    expect(p.body).not.toContain("*");
  });

  it("keeps emphasis as text, not as asterisks", () => {
    expect(previewFromHtml(renderMarkdown("a **bold** word")).body).toBe("a bold word");
  });
});

describe("leadingHeading", () => {
  it("returns no title when the document does not start with a heading", () => {
    expect(leadingHeading("<p>body</p>")).toEqual({ title: null, rest: "<p>body</p>" });
  });

  it("only takes a heading in leading position", () => {
    expect(leadingHeading("<p>intro</p><h2>later</h2>").title).toBeNull();
  });

  it("takes the heading text and leaves the rest", () => {
    const r = leadingHeading("<h1>Title</h1>\n<p>body</p>");
    expect(r.title).toBe("Title");
    expect(r.rest.trim()).toBe("<p>body</p>");
  });
});

describe("clampText", () => {
  it("leaves short text alone", () => {
    expect(clampText("short", 40)).toBe("short");
  });

  it("clamps on a word boundary when there is a reasonable one", () => {
    expect(clampText("alpha beta gamma delta", 14)).toBe("alpha beta…");
  });

  it("hard-clamps when a single word exceeds the budget", () => {
    expect(clampText("a".repeat(30), 10)).toBe("a".repeat(10) + "…");
  });
});

describe("stripTransclusionQuotes", () => {
  it("removes baked transclusion quotes so a thread excerpt shows the author's prose", () => {
    const html = '<p>my point</p><blockquote class="blyg-transclusion"><p>quoted</p></blockquote><p>more</p>';
    const text = plainTextFromHtml(stripTransclusionQuotes(html));
    expect(text).toBe("my point more");
    expect(text).not.toContain("quoted");
  });

  it("removes several quotes", () => {
    const q = '<blockquote class="blyg-transclusion"><p>q</p></blockquote>';
    expect(plainTextFromHtml(stripTransclusionQuotes(`<p>a</p>${q}<p>b</p>${q}`))).toBe("a b");
  });

  it("leaves ordinary blockquotes alone", () => {
    const html = "<blockquote><p>ordinary</p></blockquote>";
    expect(plainTextFromHtml(stripTransclusionQuotes(html))).toBe("ordinary");
  });
});

describe("extractDirectives", () => {
  const id = "7c9wk2n4h6q1x8v0z3m5rjy2ke";

  it("counts and removes own-line transclusion directives", () => {
    const r = extractDirectives(`intro\n![[${id}]]\noutro`);
    expect(r.count).toBe(1);
    expect(r.withoutDirectives).toBe("intro\noutro");
  });

  it("counts reserved @vN directives too — they are still directives, just unsupported", () => {
    expect(extractDirectives(`![[${id}@v3]]`).count).toBe(1);
  });

  it("leaves inline references alone (they are not own-line directives)", () => {
    const md = `see ![[${id}]] inline`;
    expect(extractDirectives(md)).toEqual({ count: 0, withoutDirectives: md });
  });
});

describe("splitL0Content", () => {
  it("promotes the leading title link out of the body", () => {
    const html = '<p><a href="https://x.test/p">A Title</a></p>\n<p>summary text</p>\n';
    const r = splitL0Content(html);
    expect(r.titleHtml).toBe('<a href="https://x.test/p">A Title</a>');
    expect(plainTextFromHtml(r.bodyHtml)).toBe("summary text");
  });

  it("leaves content alone when the first paragraph is not a bare link", () => {
    const html = "<p>just prose</p>";
    expect(splitL0Content(html)).toEqual({ titleHtml: null, bodyHtml: html });
  });

  it("does not treat a paragraph with a link plus text as a title", () => {
    const html = '<p>see <a href="https://x.test">this</a> now</p>';
    expect(splitL0Content(html).titleHtml).toBeNull();
  });

  it("handles a title with no body", () => {
    const r = splitL0Content('<p><a href="https://x.test">Only</a></p>');
    expect(r.titleHtml).toContain("Only");
    expect(r.bodyHtml.trim()).toBe("");
  });
});
