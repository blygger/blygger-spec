// Reading-tab formatting + paging (session 17): L0 summaries kept their
// paragraph structure instead of collapsing to one wall of text, and the
// merged feed is paged rather than rendering every entry on one page.

import { describe, expect, it } from "vitest";
import { plainTextFromAny } from "../src/importer/l0.ts";
import { readingPage, READING_PAGE_SIZE } from "../src/importer/studio.ts";

describe("plainTextFromAny keeps structure", () => {
  it("turns paragraph boundaries into blank lines, not spaces", () => {
    // The defect: everything collapsed to one line, so a 2000-char summary
    // rendered as a single unbroken paragraph.
    expect(plainTextFromAny("<p>one</p><p>two</p>")).toBe("one\n\ntwo");
  });

  it("keeps <br> as a single newline", () => {
    expect(plainTextFromAny("a<br>b")).toBe("a\nb");
  });

  it("collapses runs of blank lines rather than accumulating them", () => {
    expect(plainTextFromAny("<p>a</p><div></div><div></div><p>b</p>")).toBe("a\n\nb");
  });

  it("still strips all tags — content_html is never the origin's markup", () => {
    const out = plainTextFromAny('<p>hi <a href="https://x.test">there</a></p><script>alert(1)</script>');
    expect(out).not.toContain("<");
    expect(out).not.toContain("alert");
    expect(out).toBe("hi there");
  });

  it("decodes the entities feeds actually carry", () => {
    expect(plainTextFromAny("<p>a &amp; b &quot;q&quot; &#39;s&#39;</p>")).toBe('a & b "q" \'s\'');
  });

  it("handles empty/missing input", () => {
    expect(plainTextFromAny(undefined)).toBe("");
    expect(plainTextFromAny("")).toBe("");
  });
});

describe("readingPage", () => {
  it("defaults to page 1", () => {
    expect(readingPage(undefined, 100)).toEqual({ page: 1, pages: 4, start: 0 });
  });

  it("computes the slice offset", () => {
    expect(readingPage("3", 100)).toEqual({ page: 3, pages: 4, start: 2 * READING_PAGE_SIZE });
  });

  it("clamps junk and out-of-range pages to 1 rather than showing nothing", () => {
    for (const bad of ["0", "-2", "abc", "1.5", "999"]) {
      expect(readingPage(bad, 100).page).toBe(1);
    }
  });

  it("reports one page when the feed fits, and when it is empty", () => {
    expect(readingPage(undefined, 10)).toEqual({ page: 1, pages: 1, start: 0 });
    expect(readingPage(undefined, 0)).toEqual({ page: 1, pages: 1, start: 0 });
  });

  it("does not create a trailing empty page at an exact multiple", () => {
    expect(readingPage(undefined, READING_PAGE_SIZE).pages).toBe(1);
    expect(readingPage(undefined, READING_PAGE_SIZE + 1).pages).toBe(2);
  });
});
