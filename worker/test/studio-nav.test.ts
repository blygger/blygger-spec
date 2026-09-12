// Studio chrome (session 17): every page carries the same nav, so there is
// always a way back to compose — previously the studio index was reachable
// only from the editor breadcrumbs, so clicking "subscriptions" stranded you.

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, BASE, createAndPublish, login, STUDIO } from "./helpers.ts";

const SECTIONS = ["", "/subs", "/reading", "/hoppers", "/settings", "/syntax"];

async function page(cookie: string, path: string): Promise<string> {
  const res = await SELF.fetch(`${BASE}${STUDIO}${path}`, { headers: { cookie } });
  expect(res.status).toBe(200);
  return res.text();
}

describe("every studio page can get back to compose", () => {
  it.each(SECTIONS)("%s carries a compose link", async (path) => {
    const html = await page(await login(), path);
    expect(html).toContain(`<a href="${STUDIO}"`);
    expect(html).toContain(">compose</a>");
  });

  it.each(SECTIONS)("%s carries the full nav", async (path) => {
    const html = await page(await login(), path);
    for (const label of ["compose", "subscriptions", "reading", "hoppers", "settings", "syntax"]) {
      expect(html).toContain(`>${label}</a>`);
    }
  });

  it("editor pages carry the nav too, plus a breadcrumb back to compose", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "editing me");
    const html = await page(cookie, `/edit/${id}`);
    expect(html).toContain(">compose</a>");
    expect(html).toContain("← compose");
  });
});

describe("the nav marks where you are", () => {
  it.each([
    ["", "compose"],
    ["/subs", "subscriptions"],
    ["/reading", "reading"],
    ["/hoppers", "hoppers"],
    ["/settings", "settings"],
    ["/syntax", "syntax"],
  ])("%s marks %s as current", async (path, label) => {
    const html = await page(await login(), path);
    expect(html).toMatch(new RegExp(`<a href="[^"]*"[^>]*aria-current="page">${label}</a>`));
    // Exactly one current link, so the highlight is never ambiguous.
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("an editor page marks nothing current — it is not one of the tabs", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "x");
    expect(await page(cookie, `/edit/${id}`)).not.toContain('aria-current="page"');
  });

  it("a hopper detail page marks hoppers current", async () => {
    const cookie = await login();
    const created = await apiJson(cookie, "POST", "/api/hoppers", { name: "Reading list" });
    const html = await page(cookie, `/hoppers/${created.json.id}`);
    expect(html).toMatch(/aria-current="page">hoppers<\/a>/);
  });
});

describe("layout is stable across pages", () => {
  it("renders every page at one width — no wide/narrow body switch", async () => {
    const cookie = await login();
    for (const path of SECTIONS) {
      const html = await page(cookie, path);
      // The old layout toggled <body class="wide">, which moved the nav
      // sideways on every navigation.
      expect(html).not.toContain('<body class="wide">');
      expect(html).toContain("max-width: 100ch");
    }
  });

  it("reserves the scrollbar gutter so short and long pages align", async () => {
    expect(await page(await login(), "/settings")).toContain("scrollbar-gutter: stable");
  });
});
