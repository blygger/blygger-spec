import { describe, expect, it } from "vitest";
import { absolutizeHtml, cdata, contentHash, newId, newMediaId, rfc822 } from "../src/util.ts";

describe("ids (§2.1)", () => {
  it("is 26 chars of lowercase Crockford base32", () => {
    for (let i = 0; i < 100; i++) {
      expect(newId()).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{26}$/);
    }
  });

  it("never contains i, l, o, u", () => {
    for (let i = 0; i < 100; i++) {
      expect(newId()).not.toMatch(/[ilou]/);
    }
  });

  it("does not collide in a 1000-draw sample", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
  });

  it("media ids are 8 chars, same alphabet", () => {
    expect(newMediaId()).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{8}$/);
  });
});

describe("content hash (§2.2)", () => {
  it("matches known SHA-256 vectors", async () => {
    expect(await contentHash("test")).toBe(
      "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    );
    expect(await contentHash("hello world")).toBe(
      "sha256:b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    );
  });
});

describe("feed helpers", () => {
  it("formats RFC 822 dates", () => {
    expect(rfc822("2026-07-18T09:30:00Z")).toBe("Sat, 18 Jul 2026 09:30:00 GMT");
  });

  it("escapes ]]> inside CDATA", () => {
    expect(cdata("a]]>b")).toBe("<![CDATA[a]]]]><![CDATA[>b]]>");
  });

  it("absolutizes relative media URLs against the ygg base", () => {
    const base = "https://example.com/ygg/";
    expect(absolutizeHtml('<img src="media/x.png">', base)).toBe('<img src="https://example.com/ygg/media/x.png">');
    expect(absolutizeHtml('<a href="/ygg/f/abc/">x</a>', base)).toBe('<a href="https://example.com/ygg/f/abc/">x</a>');
    expect(absolutizeHtml('<a href="https://other.com/a">x</a>', base)).toBe('<a href="https://other.com/a">x</a>');
    expect(absolutizeHtml('<a href="#frag">x</a>', base)).toBe('<a href="#frag">x</a>');
  });
});
