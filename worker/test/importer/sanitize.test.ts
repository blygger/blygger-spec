// §12/§3.3: fetched content_html must be sanitized before rendering.
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../../src/importer/sanitize.ts";

describe("sanitizeHtml()", () => {
  it("removes <script> tags and their content", async () => {
    const out = await sanitizeHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>hi</p>");
  });

  it("strips inline event-handler attributes", async () => {
    const out = await sanitizeHtml('<img src="x.png" onerror="alert(1)">');
    expect(out).not.toContain("onerror");
    expect(out).toContain('src="x.png"');
  });

  it("strips javascript: URLs from href/src", async () => {
    const out = await sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain("javascript:");
  });

  it("removes iframe/object/embed/form", async () => {
    const out = await sanitizeHtml('<iframe src="evil"></iframe><object></object><embed><form></form>');
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("<object");
    expect(out).not.toContain("<embed");
    expect(out).not.toContain("<form");
  });

  it("leaves ordinary safe markup untouched", async () => {
    const out = await sanitizeHtml('<p>hello <strong>world</strong> <a href="https://example.com">link</a></p>');
    expect(out).toContain("<strong>world</strong>");
    expect(out).toContain('<a href="https://example.com">link</a>');
  });
});
