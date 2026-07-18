// Task 5 acceptance: media round-trip through R2, type/size validation.
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiJson, BASE, createAndPublish, getPublic, login } from "./helpers.ts";

async function upload(cookie: string, file: File, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("file", file);
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  const res = await SELF.fetch(`${BASE}/api/media`, { method: "POST", headers: { cookie }, body: form });
  return { status: res.status, json: (await res.json().catch(() => null)) as any };
}

describe("media (§3.3)", () => {
  it("round-trips a png through R2", async () => {
    const cookie = await login();
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
    const { status, json } = await upload(cookie, new File([bytes], "pic.png", { type: "image/png" }), {
      alt: "a diagram",
    });
    expect(status).toBe(201);
    expect(json.url).toMatch(/^media\/[0-9abcdefghjkmnpqrstvwxyz]{8}\.png$/);

    const res = await getPublic(`/ygg/${json.url}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it("rejects non-image types and oversize files", async () => {
    const cookie = await login();
    const bad = await upload(cookie, new File(["hi"], "x.txt", { type: "text/plain" }));
    expect(bad.status).toBe(415);
    const big = await upload(
      cookie,
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }),
    );
    expect(big.status).toBe(413);
  });

  it("attached media appears in item JSON and feed description", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "fragment with image");
    const { json } = await upload(cookie, new File([new Uint8Array([1])], "p.png", { type: "image/png" }), {
      item_id: id,
      alt: "the alt text",
    });

    const item = await (await getPublic(`/ygg/items/${id}.json`)).json<any>();
    expect(item.media).toEqual([{ url: json.url, mime: "image/png", alt: "the alt text" }]);

    // Feed description must be self-contained: absolute media URL (§2.6).
    const xml = await (await getPublic("/ygg/feed.xml")).text();
    expect(xml).toContain(`https://example.com/ygg/${json.url}`);
  });

  it("rejects uploads against a nonexistent item", async () => {
    const cookie = await login();
    const res = await upload(cookie, new File([new Uint8Array([1])], "p.png", { type: "image/png" }), {
      item_id: "nope00000000000000000000000",
    });
    expect(res.status).toBe(404);
  });
});
