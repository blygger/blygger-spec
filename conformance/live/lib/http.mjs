// Polite, cached, read-only HTTP for the live crawler.
//
// - GET and HEAD only. There is deliberately no other method in this module:
//   the crawler never POSTs (in particular never sends a Webmention).
// - At most `perHost` requests in flight per host, `global` overall.
// - Every response is cached on disk under conformance/live/cache/ keyed by
//   method + URL, so reruns are cheap and offline-repeatable.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const USER_AGENT =
  "blygger-conformance-crawler (+https://github.com/blygger/blygger-spec)";

const KEEP_HEADERS = [
  "content-type",
  "link",
  "access-control-allow-origin",
  "last-modified",
  "etag",
];

export class Http {
  constructor({ cacheDir, ttlMs = 12 * 3600e3, perHost = 2, global = 8,
    timeoutMs = 15000, maxBytes = 2_000_000, offline = false, log = () => {} }) {
    this.cacheDir = cacheDir;
    this.ttlMs = ttlMs;
    this.perHost = perHost;
    this.global = global;
    this.timeoutMs = timeoutMs;
    this.maxBytes = maxBytes;
    this.offline = offline;
    this.log = log;
    this.hostActive = new Map();
    this.active = 0;
    this.waiters = [];
    this.stats = { network: 0, cached: 0, errors: 0 };
    this.inflight = new Map();
  }

  key(method, url) {
    return createHash("sha1").update(method + " " + url).digest("hex");
  }

  async readCache(k) {
    try {
      const j = JSON.parse(await readFile(join(this.cacheDir, k + ".json"), "utf8"));
      if (this.offline || Date.now() - Date.parse(j.fetched_at) < this.ttlMs) return j;
    } catch {}
    return null;
  }

  async acquire(host) {
    for (;;) {
      const h = this.hostActive.get(host) || 0;
      if (h < this.perHost && this.active < this.global) {
        this.hostActive.set(host, h + 1);
        this.active++;
        return;
      }
      await new Promise((r) => this.waiters.push(r));
    }
  }

  release(host) {
    this.hostActive.set(host, (this.hostActive.get(host) || 1) - 1);
    this.active--;
    const w = this.waiters.splice(0);
    w.forEach((r) => r());
  }

  get(url) { return this.request("GET", url); }
  head(url) { return this.request("HEAD", url); }

  // Returns { url, method, status, final_url, redirected, headers, body,
  //           error, fetched_at, from_cache }. status 0 = network failure.
  async request(method, url) {
    if (method !== "GET" && method !== "HEAD") throw new Error("read-only crawler: " + method);
    const k = this.key(method, url);
    if (this.inflight.has(k)) return this.inflight.get(k);
    const p = this._request(method, url, k);
    this.inflight.set(k, p);
    return p;
  }

  async _request(method, url, k) {
    const cached = await this.readCache(k);
    if (cached) { this.stats.cached++; return { ...cached, from_cache: true }; }
    if (this.offline) {
      return { url, method, status: 0, error: "offline: not in cache", headers: {}, body: "" };
    }
    let host;
    try { host = new URL(url).host; } catch {
      return { url, method, status: 0, error: "bad url", headers: {}, body: "" };
    }
    await this.acquire(host);
    let out;
    try {
      out = await this._fetchOnce(method, url);
      if (out.status === 0) out = await this._fetchOnce(method, url); // one retry
    } finally {
      this.release(host);
    }
    this.stats.network++;
    if (out.status === 0) this.stats.errors++;
    this.log(`${method} ${out.status || "ERR"} ${url}`);
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(join(this.cacheDir, k + ".json"), JSON.stringify(out));
    return { ...out, from_cache: false };
  }

  async _fetchOnce(method, url) {
    const fetched_at = new Date().toISOString();
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        headers: { "user-agent": USER_AGENT, accept: "*/*" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const headers = {};
      for (const h of KEEP_HEADERS) {
        const v = res.headers.get(h);
        if (v != null) headers[h] = v;
      }
      let body = "";
      if (method === "GET") {
        const buf = new Uint8Array(await res.arrayBuffer());
        body = new TextDecoder().decode(buf.subarray(0, this.maxBytes));
      }
      return { url, method, status: res.status, final_url: res.url,
        redirected: res.redirected, headers, body, fetched_at };
    } catch (e) {
      return { url, method, status: 0, error: String(e && (e.cause?.code || e.message || e)),
        headers: {}, body: "", fetched_at };
    }
  }
}

export function parseJson(body) {
  try { return JSON.parse(body); } catch { return undefined; }
}
