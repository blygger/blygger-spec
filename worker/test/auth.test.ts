import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { verifySession } from "../src/auth.ts";
import { BASE, login, STUDIO } from "./helpers.ts";

describe("auth (§3.2)", () => {
  it("rejects a wrong password without setting a cookie", async () => {
    const res = await SELF.fetch(`${BASE}${STUDIO}/login`, {
      method: "POST",
      body: new URLSearchParams({ password: "wrong" }),
      redirect: "manual",
    });
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("issues a session cookie on correct password", async () => {
    const cookie = await login();
    expect(cookie).toMatch(/^blyg_session=\d+\.[0-9a-f]{64}$/);
    const studio = await SELF.fetch(`${BASE}${STUDIO}`, { headers: { cookie }, redirect: "manual" });
    expect(studio.status).toBe(200);
  });

  it("sets HttpOnly, Secure, SameSite=Lax attributes", async () => {
    const res = await SELF.fetch(`${BASE}${STUDIO}/login`, {
      method: "POST",
      body: new URLSearchParams({ password: "test-password" }),
      redirect: "manual",
    });
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
  });

  it("redirects unauthenticated /studio to login", async () => {
    const res = await SELF.fetch(`${BASE}${STUDIO}`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain(`${STUDIO}/login`);
  });

  it("rejects a tampered cookie", async () => {
    const cookie = await login();
    const [name, value] = cookie.split("=");
    const [expiry] = value.split(".");
    const forged = `${name}=${Number(expiry) + 9999}.${value.split(".")[1]}`;
    const res = await SELF.fetch(`${BASE}${STUDIO}`, { headers: { cookie: forged }, redirect: "manual" });
    expect(res.status).toBe(302);
  });

  it("verifies statelessly via HMAC (survives restarts — no server-side session store)", async () => {
    const cookie = await login();
    expect(await verifySession(env, cookie)).toBe(true);
    expect(await verifySession(env, "blyg_session=123.deadbeef")).toBe(false);
    expect(await verifySession(env, undefined)).toBe(false);
  });

  it("guards /api with 401 JSON", async () => {
    const res = await SELF.fetch(`${BASE}/api/items`, { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
  });

  it("logout clears the cookie", async () => {
    const res = await SELF.fetch(`${BASE}${STUDIO}/logout`, { method: "POST", redirect: "manual" });
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
