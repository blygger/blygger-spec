import { describe, expect, it } from "vitest";
import { absolutizeHtml, cdata, contentHash, newId, newMediaId, rfc822, toIsoUtc } from "../src/util.ts";

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

  it("absolutizes relative media URLs against the blyg base", () => {
    const base = "https://example.com/blyg/";
    expect(absolutizeHtml('<img src="media/x.png">', base)).toBe('<img src="https://example.com/blyg/media/x.png">');
    expect(absolutizeHtml('<a href="/blyg/f/abc/">x</a>', base)).toBe('<a href="https://example.com/blyg/f/abc/">x</a>');
    expect(absolutizeHtml('<a href="https://other.com/a">x</a>', base)).toBe('<a href="https://other.com/a">x</a>');
    expect(absolutizeHtml('<a href="#frag">x</a>', base)).toBe('<a href="#frag">x</a>');
  });
});

describe("toIsoUtc() — foreign date normalization", () => {
  it("normalizes an RSS 2.0 RFC-822 pubDate to ISO-8601 UTC", () => {
    expect(toIsoUtc("Wed, 01 Jul 2026 12:00:00 GMT")).toBe("2026-07-01T12:00:00Z");
  });

  it("normalizes an offset date to UTC rather than keeping the offset", () => {
    expect(toIsoUtc("2026-07-01T12:00:00-07:00")).toBe("2026-07-01T19:00:00Z");
    expect(toIsoUtc("Wed, 01 Jul 2026 12:00:00 -0700")).toBe("2026-07-01T19:00:00Z");
  });

  it("leaves an already-normalized date unchanged (idempotent)", () => {
    expect(toIsoUtc("2026-07-01T12:00:00Z")).toBe("2026-07-01T12:00:00Z");
    expect(toIsoUtc(toIsoUtc("Wed, 01 Jul 2026 12:00:00 GMT"))).toBe("2026-07-01T12:00:00Z");
  });

  it("drops sub-second precision, matching nowIso()'s shape", () => {
    expect(toIsoUtc("2026-07-01T12:00:00.123Z")).toBe("2026-07-01T12:00:00Z");
  });

  it("returns undefined for absent or unparseable input", () => {
    expect(toIsoUtc(undefined)).toBeUndefined();
    expect(toIsoUtc(null)).toBeUndefined();
    expect(toIsoUtc("")).toBeUndefined();
    expect(toIsoUtc("last Tuesday")).toBeUndefined();
  });

  it("makes RFC-822 dates sort chronologically, which as text they do not", () => {
    // The live reading-feed bug: descending lexicographic order on RFC-822
    // sorts by day-of-week name first (Wed > Tue > Thu > Sun > Sat).
    const raw = [
      "Sun, 05 Jul 2026 00:00:00 GMT",
      "Wed, 01 Jul 2026 00:00:00 GMT",
      "Tue, 28 Jul 2026 00:00:00 GMT",
      "Thu, 09 Jul 2026 00:00:00 GMT",
    ];
    expect([...raw].sort().reverse()).toEqual([
      "Wed, 01 Jul 2026 00:00:00 GMT",
      "Tue, 28 Jul 2026 00:00:00 GMT",
      "Thu, 09 Jul 2026 00:00:00 GMT",
      "Sun, 05 Jul 2026 00:00:00 GMT",
    ]);
    expect(raw.map((r) => toIsoUtc(r)).sort().reverse()).toEqual([
      "2026-07-28T00:00:00Z",
      "2026-07-09T00:00:00Z",
      "2026-07-05T00:00:00Z",
      "2026-07-01T00:00:00Z",
    ]);
  });
});
