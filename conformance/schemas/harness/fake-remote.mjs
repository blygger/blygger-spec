// A fake remote blyg at https://source.example/ (served to the studio through
// Miniflare's outboundService), plus a fake Anthropic Messages endpoint so
// TK generation runs without a network. Documents are built here with real
// hashes so they are themselves schema-valid 0.3 documents.
import { createHash } from "node:crypto";

export const REMOTE = "https://source.example/";
export const RA = "7c9wk2mhq0v3xj8tn5rzfd41bg"; // fragment, v2 (v1 pinned)
export const RB = "1vgtgz0gq5b2c9k7d3m8r4n6xy"; // fragment, Devanagari
export const RC = "4zss0yg5f5zbh48e22s4f87003"; // thread, v1 pinned, partial-quotes RA and links RB

const sha = (s) => "sha256:" + createHash("sha256").update(s, "utf8").digest("hex");
const T0 = "2026-09-01T10:00:00Z", T1 = "2026-09-02T10:00:00Z", T2 = "2026-09-03T10:00:00Z";
const author = { name: "Source Author", url: REMOTE, bio_hint: "opaque member kept verbatim (§5.5)" };

const RA1_MD = "Stigmergy is what a protocol looks like from inside, and the reason it looks like nothing at all is the point.";
const RA2_MD = RA1_MD + "\n\nA second paragraph about *emphasis* and traces left in the environment.";
const RA1_HTML = `<p>${RA1_MD}</p>\n`;
const RA2_HTML = RA1_HTML + "<p>A second paragraph about <em>emphasis</em> and traces left in the environment.</p>\n";
const RB_MD = "धर्म और कर्म — यह माध्यम ही संदेश है। The medium is the message.";
const RB_HTML = `<p>${RB_MD}</p>\n`;
const RC_MD = `Opening line of a remote thread.\n\n![[${RA}]]\n> Stigmergy is what a protocol looks like from inside\n\nClosing line with a link to [[${RB}]].`;
const RC_HTML =
  `<p>Opening line of a remote thread.</p>\n<blockquote class="blyg-transclusion blyg-partial" data-blyg-id="${RA}" data-blyg-version="2">\n<p>Stigmergy is what a protocol looks like from inside</p>\n</blockquote>\n` +
  `<p>Closing line with a link to <a href="${REMOTE}f/${RB}/">“धर्म और कर्म”</a>.</p>\n`;

export const REMOTE_ITEMS = {
  [RA]: {
    blyg: "0.3", id: RA, kind: "fragment", origin: REMOTE, page: `f/${RA}/`, author,
    created: T0, updated: T1, version: 2, content_md: RA2_MD, content_html: RA2_HTML, content_hash: sha(RA2_MD), media: [],
    changelog: [{ version: 1, at: T0, note: null, pinned: true }, { version: 2, at: T1, note: "second paragraph" }],
  },
  [RB]: {
    blyg: "0.3", id: RB, kind: "fragment", origin: REMOTE, page: `f/${RB}/`, author,
    created: T0, updated: T0, version: 1, content_md: RB_MD, content_html: RB_HTML, content_hash: sha(RB_MD), media: [],
    changelog: [{ version: 1, at: T0, note: null }],
  },
  [RC]: {
    blyg: "0.3", id: RC, kind: "thread", origin: REMOTE, page: `t/${RC}/`, author,
    created: T2, updated: T2, version: 1, content_md: RC_MD, content_html: RC_HTML, content_hash: sha(RC_MD), media: [],
    transclusions: [{ id: RA, version: 2, selector: { exact: "Stigmergy is what a protocol looks like from inside", suffix: ", and the reason it looks like noth" } }],
    changelog: [{ version: 1, at: T2, note: null, pinned: true }],
  },
};
export const REMOTE_PINS = {
  [RA]: { 1: { blyg: "0.3", id: RA, kind: "fragment", version: 1, at: T0, note: null, pinned: true, origin: REMOTE, author, content_md: RA1_MD, content_html: RA1_HTML, content_hash: sha(RA1_MD) } },
  [RC]: { 1: { blyg: "0.3", id: RC, kind: "thread", version: 1, at: T2, note: null, pinned: true, origin: REMOTE, author, content_md: RC_MD, content_html: RC_HTML, content_hash: sha(RC_MD), transclusions: REMOTE_ITEMS[RC].transclusions } },
};

const manifest = { blyg: "0.3", level: 2, generator: "conformance-fake/0.3", generator_url: "https://github.com/blygger/blygger-spec", site: REMOTE, title: "Fake Source Blyg", author: { name: "Source Author" }, feed: "feed.xml", items: "items/index.json", updated: T2 };
const rfc = (iso) => new Date(iso).toUTCString();
function feed() {
  const events = [];
  for (const d of Object.values(REMOTE_ITEMS)) for (const c of d.changelog) events.push({ d, c });
  events.sort((a, b) => b.c.at.localeCompare(a.c.at));
  const items = events.map(({ d, c }) => `<item><guid isPermaLink="false">blyg:${d.id}:v${c.version}</guid><link>${REMOTE}${d.page}</link><title>${c.note ?? "item"}</title><description><![CDATA[${d.content_html}]]></description><pubDate>${rfc(c.at)}</pubDate><dc:creator>${d.author.name}</dc:creator><blyg:id>${d.id}</blyg:id><blyg:kind>${d.kind}</blyg:kind><blyg:version>${c.version}</blyg:version><blyg:created>${d.created}</blyg:created><blyg:item>${REMOTE}items/${d.id}.json</blyg:item></item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:blyg="https://blygger.org/ns/0.1" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Fake Source Blyg</title><link>${REMOTE}</link><description>fake</description><lastBuildDate>${rfc(T2)}</lastBuildDate><blyg:level>2</blyg:level><blyg:manifest>${REMOTE}blyg.json</blyg:manifest>\n${items}\n</channel></rss>`;
}
const index = () => ({ updated: T2, items: Object.values(REMOTE_ITEMS).sort((a, b) => b.updated.localeCompare(a.updated)).map((d) => ({ id: d.id, kind: d.kind, created: d.created, updated: d.updated, version: d.version })) });

export const outbound = { log: [] };
const json = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });

/** Miniflare outboundService handler. */
export async function outboundService(request) {
  const url = new URL(request.url);
  outbound.log.push(`${request.method} ${request.url}`);
  if (url.hostname === "api.anthropic.com") {
    const body = await request.json().catch(() => ({}));
    return json({ id: "msg_fake", type: "message", role: "assistant", model: body.model || "fake-model", stop_reason: "end_turn", content: [{ type: "text", text: "Generated summary sentence from the fake provider." }] });
  }
  if (url.origin + "/" !== REMOTE) return new Response("not found", { status: 404 });
  const p = url.pathname;
  if (p === "/" || p === "") return new Response(`<html><head><link rel="blyg" href="${REMOTE}"></head><body>fake</body></html>`, { headers: { "content-type": "text/html" } });
  if (p === "/blyg.json") return json(manifest);
  if (p === "/feed.xml") return new Response(feed(), { headers: { "content-type": "application/rss+xml" } });
  if (p === "/items/index.json") return json(index());
  let m = p.match(/^\/items\/([0-9a-z]{26})\.json$/);
  if (m && REMOTE_ITEMS[m[1]]) return json(REMOTE_ITEMS[m[1]]);
  m = p.match(/^\/items\/([0-9a-z]{26})\/v(\d+)\.json$/);
  if (m && REMOTE_PINS[m[1]]?.[m[2]]) return json(REMOTE_PINS[m[1]][m[2]]);
  return new Response("not found", { status: 404 });
}

/** Targets as a resolver sees them (for the desktop grammar harness). */
export function remoteTargets() {
  return Object.values(REMOTE_ITEMS).map((d) => ({ id: d.id, origin: REMOTE, version: d.version, kind: d.kind, content_html: d.content_html, page: d.page }));
}
