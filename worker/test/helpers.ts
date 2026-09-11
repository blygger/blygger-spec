import { SELF } from "cloudflare:test";

export const BASE = "https://example.com";
/** Matches vitest.config.ts's default-worker MOUNT binding ("/blyg") — studio is nested under it since session 16. */
export const STUDIO = "/blyg/studio";

/** Log in as owner, return the Cookie header value. */
export async function login(password = "test-password"): Promise<string> {
  const res = await SELF.fetch(`${BASE}${STUDIO}/login`, {
    method: "POST",
    body: new URLSearchParams({ password }),
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error(`login failed: ${res.status}`);
  return setCookie.split(";")[0];
}

export async function apiJson(
  cookie: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: any }> {
  const res = await SELF.fetch(`${BASE}${path}`, {
    method,
    headers: { cookie, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

/** Create a draft with content and publish it; returns the item id. */
export async function createAndPublish(cookie: string, contentMd: string, note?: string): Promise<string> {
  const created = await apiJson(cookie, "POST", "/api/items", { content_md: contentMd });
  if (created.status !== 201) throw new Error(`create failed: ${created.status}`);
  const id = created.json.id as string;
  const pub = await apiJson(cookie, "POST", `/api/items/${id}/publish`, note ? { note } : {});
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.json)}`);
  return id;
}

export async function getPublic(path: string): Promise<Response> {
  return SELF.fetch(`${BASE}${path}`);
}
