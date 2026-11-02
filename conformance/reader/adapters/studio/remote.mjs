// Fake remote blygs, built from the fixtures' remote items and served to the
// studio through Miniflare's outboundService. Every document is a valid 0.4
// wire document with a real content_hash. Two phases: `live` serves each item
// as it stood before any withdrawal in its `history`, so the studio imports it
// (and its pin); `final` serves it as the fixture states it.
//
// The same handler fakes the Anthropic Messages endpoint: generate() calls
// answer with whatever the adapter queued, so a generated span's text is the
// text the fixture wrote.
import { createHash } from "node:crypto";

const sha = (s) => "sha256:" + createHash("sha256").update(s, "utf8").digest("hex");
const T = (n) => `2026-10-${String(10 + n).padStart(2, "0")}T10:00:00Z`;

function liveDoc(it) {
  const h = it.history?.[0];
  const version = h?.version ?? it.version;
  const md = h?.content_md ?? it.content_md, html = h?.content_html ?? it.content_html;
  const changelog = [];
  for (let v = 1; v <= version; v++) changelog.push({ version: v, at: T(v), note: null, ...((h ? h.pinned && v === version : it.pins?.[v]) ? { pinned: true } : {}) });
  const kind = h ? (it.kind === "withdrawn" ? "fragment" : it.kind) : it.kind;
  return doc(it, { kind, version, md, html, changelog });
}

function finalDoc(it) {
  if (!it.history) return liveDoc(it);
  const changelog = [];
  for (let v = 1; v <= it.version; v++) changelog.push({ version: v, at: T(v), note: v === it.version ? "withdrawn" : null, ...(it.pins?.[v] ? { pinned: true } : {}) });
  return doc(it, { kind: it.kind, version: it.version, md: it.content_md, html: it.content_html, changelog });
}

function doc(it, { kind, version, md, html, changelog }) {
  const d = {
    blyg: "0.4", id: it.id, kind, origin: it.origin, ...(it.page ? { page: it.page } : {}),
    author: { name: "Remote Author", url: it.origin }, created: T(1), updated: changelog[changelog.length - 1].at, version,
    content_md: md, content_html: html, content_hash: sha(md), media: [], changelog,
  };
  if (kind === "thread" || (kind === "withdrawn" && it.transclusions)) d.transclusions = kind === "withdrawn" ? [] : it.transclusions || [];
  if (it.links && kind !== "withdrawn") d.links = it.links;
  return d;
}

function pinDoc(it, v) {
  const p = it.pins[v];
  return { blyg: "0.4", id: it.id, kind: it.kind === "withdrawn" ? "fragment" : it.kind, version: Number(v), at: T(Number(v)), note: null, pinned: true, origin: it.origin, author: { name: "Remote Author", url: it.origin }, content_md: p.content_md, content_html: p.content_html, content_hash: sha(p.content_md) };
}

export function fakeRemotes(items) {
  const byOrigin = new Map();
  for (const it of items) {
    if (!byOrigin.has(it.origin)) byOrigin.set(it.origin, new Map());
    byOrigin.get(it.origin).set(it.id, it);
  }
  const state = { phase: "live", gen: [], log: [] };
  const json = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  const current = (it) => (state.phase === "live" ? liveDoc(it) : finalDoc(it));

  async function outbound(request) {
    const url = new URL(request.url);
    state.log.push(`${request.method} ${request.url}`);
    if (url.hostname === "api.anthropic.com") {
      const body = await request.json().catch(() => ({}));
      const text = state.gen.length ? state.gen.shift() : "Generated text from the fake provider.";
      return json({ id: "msg_fake", type: "message", role: "assistant", model: body.model || "fake-model", stop_reason: "end_turn", content: [{ type: "text", text }], usage: { input_tokens: 1, output_tokens: 1 } });
    }
    const origin = `${url.origin}/`;
    const set = byOrigin.get(origin);
    if (!set) return new Response("not found", { status: 404 });
    const p = url.pathname;
    const docs = [...set.values()].map(current);
    if (p === "/") return new Response(`<!doctype html><html><head><link rel="blyg" href="${origin}blyg.json"></head><body>fake</body></html>`, { headers: { "content-type": "text/html" } });
    if (p === "/blyg.json") return json({ blyg: "0.4", level: 2, generator: "reader-suite-fake/0.4", site: origin, title: `Fake ${url.hostname}`, author: { name: "Remote Author" }, feed: "feed.xml", items: "items/index.json", updated: T(9) });
    if (p === "/items/index.json") return json({ updated: T(9), items: docs.map((d) => ({ id: d.id, kind: d.kind, created: d.created, updated: d.updated, version: d.version })) });
    if (p === "/feed.xml") {
      const entries = docs.map((d) => `<item><guid isPermaLink="false">blyg:${d.id}:v${d.version}</guid><link>${d.page ? new URL(d.page, origin).href : `${origin}items/${d.id}.json`}</link><title>${d.kind}</title><description><![CDATA[${d.content_html}]]></description><pubDate>${new Date(d.updated).toUTCString()}</pubDate><blyg:id>${d.id}</blyg:id><blyg:kind>${d.kind}</blyg:kind><blyg:version>${d.version}</blyg:version><blyg:created>${d.created}</blyg:created><blyg:item>${origin}items/${d.id}.json</blyg:item></item>`).join("\n");
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:blyg="https://blygger.org/ns/0.1"><channel><title>Fake ${url.hostname}</title><link>${origin}</link><description>fake</description><blyg:level>2</blyg:level><blyg:manifest>${origin}blyg.json</blyg:manifest>\n${entries}\n</channel></rss>`, { headers: { "content-type": "application/rss+xml" } });
    }
    let m = p.match(/^\/items\/([0-9a-z]{26})\.json$/);
    if (m && set.has(m[1])) return json(current(set.get(m[1])));
    m = p.match(/^\/items\/([0-9a-z]{26})\/v(\d+)\.json$/);
    if (m && set.get(m[1])?.pins?.[m[2]]) return json(pinDoc(set.get(m[1]), m[2]));
    return new Response("not found", { status: 404 });
  }
  return { outbound, state, origins: [...byOrigin.keys()] };
}
