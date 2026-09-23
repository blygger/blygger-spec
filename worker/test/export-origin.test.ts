// The static export's origin preflight. The hazard it guards is silent: the
// exported tree's og:url / rel=canonical / manifest "site" all come from the
// serving instance, so an export taken from `wrangler dev` ships localhost URLs
// and nothing in the file tree looks wrong until a crawler follows one.

import { describe, expect, it } from "vitest";
import { checkExportOrigin, isLocalHost, normalizeBase, stripWebmentionLink } from "../scripts/export-lib.ts";

describe("normalizeBase", () => {
  it("adds the trailing slash a blyg origin always has", () => {
    expect(normalizeBase("https://example.com/blyg")).toBe("https://example.com/blyg/");
    expect(normalizeBase("https://example.com/blyg/")).toBe("https://example.com/blyg/");
  });
});

describe("isLocalHost", () => {
  it("catches the names a dev server actually serves on", () => {
    for (const h of ["localhost", "LOCALHOST", "127.0.0.1", "127.1.2.3", "0.0.0.0", "::1", "[::1]", "a.localhost"]) {
      expect(isLocalHost(h), h).toBe(true);
    }
  });

  it("does not catch public hosts", () => {
    for (const h of ["example.com", "blygger.org", "venkateshrao.com", "localhost.example.com", "127x.com"]) {
      expect(isLocalHost(h), h).toBe(false);
    }
  });
});

describe("checkExportOrigin", () => {
  it("passes cleanly when the instance's origin is where we fetched from", () => {
    const r = checkExportOrigin("https://venkateshrao.com/blyg/", "https://venkateshrao.com/blyg/", false);
    expect(r.refuse).toBeUndefined();
    expect(r.warn).toBeUndefined();
  });

  it("refuses a loopback origin — the tree is unpublishable on any host", () => {
    const r = checkExportOrigin("http://localhost:8787/blyg/", "http://localhost:8787/blyg/", false);
    expect(r.refuse).toContain("localhost");
    expect(r.refuse).toContain("site_url");
  });

  it("allows a loopback origin under --allow-local (the dev verification loop)", () => {
    const r = checkExportOrigin("http://localhost:8787/blyg/", "http://localhost:8787/blyg/", true);
    expect(r.refuse).toBeUndefined();
    expect(r.warn).toBeUndefined();
  });

  it("warns, not refuses, when site_url points elsewhere — that is the supported deploy-elsewhere config", () => {
    const r = checkExportOrigin("http://localhost:8787/blyg/", "https://example.com/blyg/", false);
    expect(r.refuse).toBeUndefined();
    expect(r.warn).toContain("https://example.com/blyg/");
    expect(r.warn).toContain("http://localhost:8787/blyg/");
  });

  it("compares origins normalized, so a missing trailing slash is not a mismatch", () => {
    expect(checkExportOrigin("https://example.com/blyg", "https://example.com/blyg/", false).warn).toBeUndefined();
  });

  it("treats a root-mounted origin and a path mount as different (decision #14)", () => {
    expect(checkExportOrigin("https://example.com/", "https://example.com/blyg/", false).warn).toBeDefined();
  });

  it("refuses a manifest with no site field", () => {
    expect(checkExportOrigin("https://example.com/blyg/", undefined, false).refuse).toContain("site");
  });

  it("refuses a site field that is not an absolute URL", () => {
    expect(checkExportOrigin("https://example.com/blyg/", "/blyg/", false).refuse).toContain("absolute");
  });
});

describe("stripWebmentionLink", () => {
  const page = (extra: string) =>
    `<head>\n<title>x</title>\n${extra}<link rel="alternate" type="application/json" href="https://example.com/blyg/items/a.json">\n</head>`;

  it("removes the endpoint advertisement a static tree cannot keep (§2.3.8)", () => {
    const out = stripWebmentionLink(page('<link rel="webmention" href="https://example.com/blyg/webmention">\n'));
    expect(out).not.toContain("webmention");
    // Everything else on the page is untouched — this is the second half of
    // the manifest's one intended served-vs-exported difference, not a third.
    expect(out).toBe(page(""));
  });

  it("leaves a page that never advertised one exactly as it was", () => {
    expect(stripWebmentionLink(page(""))).toBe(page(""));
  });

  it("does not mistake a link to the endpoint's documentation for the advertisement", () => {
    const body = '<p>we support <a href="https://example.com/blyg/webmention">webmention</a></p>';
    expect(stripWebmentionLink(body)).toBe(body);
  });
});
