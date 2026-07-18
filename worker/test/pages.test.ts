// Task 8 acceptance: public HTML renders the §4 wireframe structure;
// markdown escaping verified (no raw HTML passthrough).
import { describe, expect, it } from "vitest";
import { apiJson, createAndPublish, getPublic, login } from "./helpers.ts";

describe("public pages (§3.4)", () => {
  it("feed page shows header, fragment, byline, permalink, RSS link", async () => {
    const cookie = await login();
    await apiJson(cookie, "PUT", "/api/settings", {
      site_title: "Venkat's ygg",
      author_bio: "bio line",
      author_links: [{ label: "Home", url: "https://venkateshrao.com" }],
    });
    const id = await createAndPublish(cookie, "a *rendered* fragment");
    const html = await (await getPublic("/ygg/")).text();
    expect(html).toContain("Venkat&#39;s ygg");
    expect(html).toContain("bio line");
    expect(html).toContain("https://venkateshrao.com");
    expect(html).toContain("<em>rendered</em>");
    expect(html).toContain("v1");
    expect(html).toContain(`/ygg/f/${id}/`);
    expect(html).toContain("/ygg/feed.xml");
  });

  it("never passes raw HTML through markdown", async () => {
    const cookie = await login();
    await createAndPublish(cookie, '<script>alert(1)</script> and <img src=x onerror=y>');
    const html = await (await getPublic("/ygg/")).text();
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("onerror=y>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("edited fragments show version, 'edited', and the note", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "draft one");
    await apiJson(cookie, "PUT", `/api/items/${id}`, { content_md: "sharpened" });
    await apiJson(cookie, "POST", `/api/items/${id}/publish`, { note: "sharpened the claim" });
    const html = await (await getPublic(`/ygg/f/${id}/`)).text();
    expect(html).toContain("v2");
    expect(html).toContain("edited");
    expect(html).toContain("sharpened the claim");
  });

  it("tombstone permalinks return 200 with a deleted notice", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "to be deleted");
    await apiJson(cookie, "DELETE", `/api/items/${id}`);
    const res = await getPublic(`/ygg/f/${id}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("deleted");
    expect(html).not.toContain("to be deleted");
  });

  it("archive page lists items as excerpt/date links", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "an archived fragment");
    const html = await (await getPublic("/ygg/archive/")).text();
    expect(html).toContain("Archive");
    expect(html).toContain(`/ygg/f/${id}/`);
    expect(html).toContain("an archived fragment");
  });

  it("serves style.css and redirects /ygg to /ygg/", async () => {
    const css = await getPublic("/ygg/style.css");
    expect(css.headers.get("content-type")).toContain("text/css");
    expect(await css.text()).toContain("max-width: 65ch");
  });

  it("tombstones are excluded from the feed page but kept in the archive", async () => {
    const cookie = await login();
    const keep = await createAndPublish(cookie, "survivor fragment");
    const kill = await createAndPublish(cookie, "casualty fragment");
    await apiJson(cookie, "DELETE", `/api/items/${kill}`);
    const feed = await (await getPublic("/ygg/")).text();
    expect(feed).toContain("survivor fragment");
    expect(feed).not.toContain("casualty fragment");
    const archive = await (await getPublic("/ygg/archive/")).text();
    expect(archive).toContain("survivor fragment");
    expect(archive).toContain("deleted");
  });
});
