// Every studio and public page ships hand-written JS inside a template
// literal. That is a parser hazard the rest of the suite cannot see: an
// assertion about the HTML passes whether or not the <script> it contains is
// valid JavaScript.
//
// Session 19 shipped a broken studio this way. A confirm() string was written
// with "\n" inside the TS template literal, so the emitted JS contained a real
// newline in the middle of a string literal — SyntaxError on load, every
// studio click handler dead, and 400 green tests.
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login, STUDIO } from "./helpers.ts";
import { SELF } from "cloudflare:test";

function scriptBodies(html: string): string[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/**
 * Parses without executing. `new Function` compiles its body, so a syntax
 * error throws here; nothing in the body runs.
 */
function assertParses(src: string, where: string) {
  expect(src.length, `${where}: empty script`).toBeGreaterThan(0);
  expect(() => new Function(src), where).not.toThrow();
}

describe("every inline script parses", () => {
  it("public pages that render an item", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "an item with versions");
    await apiJson(cookie, "POST", `/api/items/${id}/pin`, { version: 1 });
    const thread = (await apiJson(cookie, "POST", "/api/items", { content_md: "a thread", kind: "thread" })).json
      .id as string;
    await apiJson(cookie, "POST", `/api/items/${thread}/publish`, {});

    // Session 21 put the version-nav script on the permalink and thread pages
    // too, so all three need the parse check, not just the feed.
    for (const path of ["/blyg/", `/blyg/f/${id}/`, `/blyg/t/${thread}/`]) {
      const bodies = scriptBodies(await (await getPublic(path)).text());
      expect(bodies.length, path).toBeGreaterThan(0);
      bodies.forEach((b, i) => assertParses(b, `${path} script ${i}`));
    }
  });

  it("studio pages", async () => {
    const cookie = await login();
    const fragment = await createAndPublish(cookie, "a published fragment");
    const draft = (await apiJson(cookie, "POST", "/api/items", { content_md: "a draft" })).json.id as string;
    const thread = (await apiJson(cookie, "POST", "/api/items", { content_md: "a thread", kind: "thread" })).json
      .id as string;

    const pages = [
      STUDIO,
      `${STUDIO}/settings`,
      `${STUDIO}/subs`,
      `${STUDIO}/reading`,
      `${STUDIO}/hoppers`,
      `${STUDIO}/edit/${fragment}`,
      `${STUDIO}/edit/${draft}`,
      `${STUDIO}/edit/${thread}`,
    ];
    for (const path of pages) {
      const res = await SELF.fetch(`https://example.com${path}`, { headers: { cookie } });
      expect(res.status, path).toBe(200);
      const bodies = scriptBodies(await res.text());
      expect(bodies.length, `${path}: no inline script`).toBeGreaterThan(0);
      bodies.forEach((b, i) => assertParses(b, `${path} script ${i}`));
    }
  });
});
