// Cross-origin invariant checks over a crawl corpus (out/crawl.json).
// Offline and deterministic: every network fact was gathered by crawl.mjs.
//
// Writes out/results.json (every instance + graph/census/fork data for the
// report) and out/summary.json (the toolkit's shared output contract).

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bakedTransclusions, directives, flatText, isAbsoluteUrl, normalizeLines,
  textContent, urlAttrs,
} from "./lib/text.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID_RE = /^[0-9abcdefghjkmnpqrstvwxyz]{26}$/;

// Check catalogue: id → metadata. `kind` = "invariant" (pass/warn/fail per
// instance) or "info" (census-style, never fails).
export const CHECKS = {
  "live.resolve": { title: "Every listed / discovered URL resolves per §12.1", spec_refs: ["§12.1"], decisions: ["#17"], clauses: ["C-4-02","C-4-03"], kind: "invariant" },
  "live.census": { title: "Client, version key and level census per origin", spec_refs: ["§3.1", "§3.2", "§6.1"], decisions: ["#18", "#34"], clauses: ["C-3.2-02","C-6.1-03"], kind: "info" },
  "live.identity": { title: "Item documents speak for the origin they are served from; manifest `site` agrees", spec_refs: ["§12.2", "§15.4"], decisions: ["#17", "#28"], clauses: ["C-15.4-03","C-12.2-01"], kind: "invariant" },
  "live.content-hash": { title: "`content_hash` = sha256(content_md) on item and pinned documents", spec_refs: ["§5.1"], decisions: ["#2"], clauses: ["C-5.1-03"], kind: "invariant" },
  "live.index-agree": { title: "Archive index agrees with item documents (versions, kinds, order)", spec_refs: ["§6.2"], decisions: ["#18"], clauses: ["C-4-03","C-4-09"], kind: "invariant" },
  "live.feed": { title: "Feed GUIDs are `blyg:{id}:v{n}` and agree with `blyg:id`/`blyg:version`; `<blyg:manifest>` present; withdrawn = one entry", spec_refs: ["§7"], decisions: ["#8"], clauses: ["C-7-03","C-7-05","C-7-09"], kind: "invariant" },
  "live.reference-target": { title: "Every reference names a reachable blyg identity origin and an existing item/version", spec_refs: ["§5.9", "§10.2", "§10.6"], decisions: ["#26", "#27"], clauses: ["C-5.1-01","C-5.9-01","C-10.2-01"], kind: "invariant" },
  "live.fork-pinned": { title: "Every `forked_from` targets a version pinned at its origin", spec_refs: ["§5.6", "§8"], decisions: ["#8", "#24"], clauses: ["C-5.6-02","C-5.6-03"], kind: "invariant" },
  "live.selector-substring": { title: "Partial transclusion: `selector.exact` is a substring of the target version's text content", spec_refs: ["§10.2", "§10.3"], decisions: ["#49"], clauses: ["C-10.2-02","C-10.2-03","C-10.3-01"], kind: "invariant" },
  "live.transclusion-correspondence": { title: "`transclusions[]` ⇔ directives in `content_md` ⇔ baked `blockquote.blyg-transclusion`", spec_refs: ["§10.1", "§10.2", "§10.3"], decisions: ["#9", "#26", "#49"], clauses: ["C-10.2-02","C-10.3-01"], kind: "invariant" },
  "live.reserved-directive": { title: "No published `![[id@vN]]` (reserved; publishers MUST reject)", spec_refs: ["§10.1"], decisions: ["#9"], clauses: ["C-10.1-01"], kind: "invariant" },
  "live.stub": { title: "`stub_of` ⇒ kind thread, origin present, version agrees with the baked target", spec_refs: ["§10.6"], decisions: ["#27"], clauses: ["C-10.6-01","C-10.6-02","C-10.6-03","C-5.9-01"], kind: "invariant" },
  "live.html-absolute": { title: "`content_html` contains no relative URLs", spec_refs: ["§5.2", "§7"], decisions: ["#53"], clauses: ["C-5.2-03","C-7-07"], kind: "invariant" },
  "live.page": { title: "`page` resolves (200)", spec_refs: ["§5.8"], decisions: ["#29", "#56"], clauses: ["C-5.8-01","C-5.8-04"], kind: "invariant" },
  "live.page-alt-json": { title: "Permalink page carries `rel=alternate type=application/json` to its item document", spec_refs: ["§5.8", "§15.4"], decisions: ["#29"], clauses: ["C-5.8-03"], kind: "invariant" },
  "live.withdrawn-endcap": { title: "Withdrawn items have the endcap shape", spec_refs: ["§9"], decisions: ["#8"], clauses: ["C-4-09","C-8-03"], kind: "invariant" },
  "live.pins-served": { title: "Every changelog `pinned: true` version is served at `items/{id}/v{n}.json` (incl. after withdrawal)", spec_refs: ["§8", "§9"], decisions: ["#8"], clauses: ["C-4-10","C-8-01"], kind: "invariant" },
  "live.pin-pages": { title: "Pinned-version HTML pages `{page}v{n}/` (MAY)", spec_refs: ["§8.4"], decisions: ["#24"], clauses: ["C-8.4-04"], kind: "info" },
  "live.unpinned-404": { title: "Unpinned historical versions are not served (404)", spec_refs: ["§4", "§8.4"], decisions: ["#24", "#25"], clauses: ["C-4-10","C-8.4-01"], kind: "invariant" },
  "live.cors": { title: "Public JSON/XML served with `Access-Control-Allow-Origin: *`", spec_refs: ["§4"], decisions: [], clauses: ["C-4-11"], kind: "invariant" },
  "live.webmention-advertised": { title: "Which origins advertise a Webmention endpoint (manifest key / rel=webmention)", spec_refs: ["§15.1"], decisions: ["#28"], clauses: ["C-6.1-02","C-15.1-01"], kind: "info" },
  "live.webmention-reachability": { title: "Cross-origin references whose sender would find an endpoint at the target", spec_refs: ["§15.1", "§15.2"], decisions: ["#28"], clauses: ["C-6.1-02","C-15.1-01","C-15.2-01"], kind: "info" },
  "live.generated-sources": { title: "`generated[].sources[]` stay own-origin at 0.3", spec_refs: ["§5.7", "§16.3"], decisions: ["#20", "#44"], clauses: ["C-5.7-02"], kind: "invariant" },
  "live.updated-changelog": { title: "`updated` equals the latest changelog entry's `at`", spec_refs: ["§5.2"], decisions: [], clauses: ["C-5.2-02"], kind: "invariant" },
  "live.fork-reresolution": { title: "Fork content vs. source pin: directives, selectors, baked versions, origins", spec_refs: ["§5.6", "§10.2"], decisions: ["#26", "#49"], clauses: ["C-10.2-01","C-5.6-08"], kind: "info" },
  "live.fork-lineage-visible": { title: "A fork's public page links its source (origin / pinned version)", spec_refs: ["§5.6"], decisions: [], clauses: [], kind: "info" },
};

const sha256 = (s) => "sha256:" + createHash("sha256").update(String(s ?? ""), "utf8").digest("hex");
const normO = (s) => {
  if (!s || typeof s !== "string") return null;
  try { const u = new URL(s); let h = u.href; if (!h.endsWith("/")) h += "/"; return h; } catch { return s; }
};
const sameOrigin = (a, b) => normO(a) === normO(b);
const short = (s, n = 140) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

export async function check(crawlPath = join(HERE, "out", "crawl.json")) {
  const crawl = JSON.parse(await readFile(crawlPath, "utf8"));
  const O = crawl.origins;
  const results = [];
  const add = (check, status, detail, extra = {}) => results.push({ check, status, detail, ...extra });

  const getOrigin = (s) => {
    const k = normO(s);
    let o = O[k] ?? O[s];
    if (o && o.alias_of) o = O[o.alias_of];
    return o || null;
  };
  const real = Object.values(O).filter((o) => !o.alias_of && !o.unreachable);
  const crawled = real.filter((o) => o.crawled);

  // ── live.resolve ─────────────────────────────────────────────────────
  for (const r of crawl.resolutions) {
    const listedBlyg = r.from.some((f) => f === "directory:blyg");
    const fromRef = r.from.includes("reference");
    let st = "pass", detail;
    if (r.outcome === "blyg") detail = `resolved as a blyg at step ${r.step} → ${r.identity}`;
    else if (r.outcome === "l0") { st = listedBlyg || fromRef ? "fail" : "pass"; detail = `resolved as legacy L0 feed ${r.feed_url}`; }
    else { st = listedBlyg || fromRef ? "fail" : "warn"; detail = `${r.outcome === "down" ? "unreachable" : "did not resolve"} (${r.trail.length} URLs tried: ${r.trail.map((t) => t.status).join(",")})`; }
    if (fromRef && r.outcome !== "blyg") detail += " — named as a reference origin";
    add("live.resolve", st, detail, { origin: r.identity || r.input, data: { input: r.input, from: r.from, step: r.step, outcome: r.outcome } });
  }

  // ── per-origin checks ────────────────────────────────────────────────
  for (const o of crawled) {
    const m = o.manifest || {};
    const items = Object.entries(o.items);
    const docs = items.filter(([, r]) => r.doc);
    const kinds = {};
    docs.forEach(([, r]) => (kinds[r.doc.kind] = (kinds[r.doc.kind] || 0) + 1));

    // census
    const wmManifest = m.webmention ? new URL(m.webmention, o.manifest_url).href : null;
    const wmPage = [...(o.front?.webmention || []), ...(o.front?.link_header_webmention || [])][0]
      || Object.values(o.pages).flatMap((p) => [...p.webmention, ...p.link_header_webmention])[0] || null;
    o._wm = { manifest: wmManifest, page: wmPage };
    add("live.census", "info", `${m.generator || "?"} · blyg ${m.blyg ?? "?"} · level ${m.level ?? "?"} · ${docs.length} items`, {
      origin: o.identity,
      data: {
        generator: m.generator ?? null, generator_url: m.generator_url ?? null, blyg: m.blyg ?? null,
        level: m.level ?? null, title: m.title ?? null, updated: m.updated ?? null,
        items: docs.length, kinds, webmention_manifest: wmManifest, webmention_page: wmPage,
        blogroll: o.blogroll?.entries ? o.blogroll.entries.length : 0,
        resolution_step: o.resolution?.step ?? null, from: o.from || [],
        feed_ns: o.feed?.parsed?.ns ?? null,
      },
    });

    // identity
    if (m.site && !sameOrigin(m.site, o.identity)) {
      add("live.identity", "warn", `manifest site ${m.site} ≠ fetch origin ${o.identity} (display-advisory; readers surface it)`, { origin: o.identity });
    }
    let idBad = 0;
    for (const [id, r] of docs) {
      if (!sameOrigin(r.doc.origin, o.identity)) {
        idBad++;
        if (idBad <= 5) add("live.identity", "fail", `item document origin ${JSON.stringify(r.doc.origin)} ≠ the origin it is served from — a mention from it cannot verify (§15.4 step 2)`, { origin: o.identity, item: id });
      }
      if (r.doc.id !== id) add("live.identity", "fail", `document id ${r.doc.id} served at items/${id}.json`, { origin: o.identity, item: id });
    }
    if (idBad > 5) add("live.identity", "fail", `…and ${idBad - 5} more items with a mismatched origin`, { origin: o.identity });
    if (!idBad && docs.length) add("live.identity", "pass", `all ${docs.length} documents carry origin ${o.identity}`, { origin: o.identity });

    // content-hash
    let hBad = 0, hOk = 0;
    const hashOne = (doc, label, id) => {
      if (!doc || typeof doc.content_md !== "string") return;
      if (doc.content_hash === sha256(doc.content_md)) { hOk++; return; }
      hBad++;
      if (hBad <= 8) add("live.content-hash", "fail", `${label}: content_hash ${short(doc.content_hash, 24)} ≠ sha256(content_md)`, { origin: o.identity, item: id });
    };
    docs.forEach(([id, r]) => hashOne(r.doc, "item", id));
    Object.entries(o.pins).forEach(([k, p]) => hashOne(p.doc, "pin " + k, k.split("/")[0]));
    if (hBad > 8) add("live.content-hash", "fail", `…and ${hBad - 8} more hash mismatches`, { origin: o.identity });
    if (hOk && !hBad) add("live.content-hash", "pass", `${hOk} documents hash correctly`, { origin: o.identity });

    // index-agree
    const idx = o.index?.doc?.items;
    if (!Array.isArray(idx)) {
      add("live.index-agree", "fail", `items/index.json ${o.index?.status} — not a valid archive index`, { origin: o.identity });
    } else {
      const probs = [];
      for (const e of idx) {
        const r = o.items[e.id];
        if (!r) continue;
        if (r.status !== 200 || !r.doc) { probs.push(`${e.id}: indexed but items/${e.id}.json → ${r.status}`); continue; }
        if (e.version !== r.doc.version) probs.push(`${e.id}: index v${e.version} ≠ document v${r.doc.version}`);
        if (e.kind !== r.doc.kind) probs.push(`${e.id}: index kind ${e.kind} ≠ document kind ${r.doc.kind}`);
      }
      let unordered = 0;
      for (let i = 1; i < idx.length; i++) if (String(idx[i - 1].updated) < String(idx[i].updated)) unordered++;
      if (probs.length) add("live.index-agree", "fail", `${probs.length} disagreement(s): ${probs.slice(0, 4).join("; ")}`, { origin: o.identity, data: { problems: probs } });
      if (unordered) add("live.index-agree", "warn", `index not ordered by updated descending (${unordered} inversions)`, { origin: o.identity });
      if (!probs.length && !unordered) add("live.index-agree", "pass", `${idx.length} index entries agree with their documents`, { origin: o.identity });
    }

    // feed
    const f = o.feed?.parsed;
    if (!f) add("live.feed", "fail", `feed.xml ${o.feed?.status} — no parseable RSS`, { origin: o.identity });
    else {
      const probs = [], warns = [];
      if (!f.blyg_manifest) probs.push("no <blyg:manifest> (MUST)");
      if (f.format !== "rss") probs.push("feed is " + f.format + ", not RSS 2.0");
      const perId = {};
      for (const e of f.items) {
        const g = String(e.guid || "").match(/^blyg:([0-9a-z]{26}):v(\d+)$/);
        if (!g) { probs.push(`guid ${JSON.stringify(short(e.guid, 50))} is not blyg:{id}:v{n}`); continue; }
        const [, gid, gv] = g;
        if (e.blyg_id && e.blyg_id !== gid) probs.push(`guid id ${gid} ≠ blyg:id ${e.blyg_id}`);
        if (e.blyg_version && Number(e.blyg_version) !== Number(gv)) probs.push(`guid v${gv} ≠ blyg:version ${e.blyg_version}`);
        (perId[gid] ||= []).push(Number(gv));
        const d = o.items[gid]?.doc;
        if (!d) { if (o.index?.doc) warns.push(`${gid} in feed but not in archive index`); continue; }
        if (Number(gv) > d.version) probs.push(`${gid} v${gv} in feed > document v${d.version}`);
      }
      for (const [gid, vs] of Object.entries(perId)) {
        const d = o.items[gid]?.doc;
        if (d?.kind === "withdrawn" && (vs.length !== 1 || vs[0] !== d.version)) probs.push(`withdrawn ${gid} contributes ${vs.length} entries (v${vs.join(",v")}); MUST be exactly its withdrawal event`);
      }
      if (probs.length) add("live.feed", "fail", `${probs.length} problem(s): ${probs.slice(0, 4).join("; ")}`, { origin: o.identity, data: { problems: probs } });
      if (warns.length) add("live.feed", "warn", warns.slice(0, 3).join("; "), { origin: o.identity });
      if (!probs.length) add("live.feed", "pass", `${f.items.length} entries, GUIDs well-formed, <blyg:manifest> present`, { origin: o.identity });
    }

    // cors
    const acaos = { manifest: o.manifest_headers?.["access-control-allow-origin"] ?? null,
      index: o.index?.acao ?? null, feed: o.feed?.acao ?? null,
      item: docs[0]?.[1].acao ?? null };
    const missing = Object.entries(acaos).filter(([k, v]) => v !== "*" && !(k === "item" && !docs.length));
    add("live.cors", missing.length ? "warn" : "pass",
      missing.length ? `no ACAO:* on ${missing.map(([k, v]) => `${k}${v ? ` (${v})` : ""}`).join(", ")}` : "manifest, index, feed and items all ACAO:*",
      { origin: o.identity, data: acaos });

    // webmention-advertised
    add("live.webmention-advertised", "info",
      wmManifest ? `manifest webmention → ${wmManifest}${wmPage ? "; pages advertise " + wmPage : "; pages do not advertise"}`
        : wmPage ? `no manifest key; pages advertise ${wmPage} (W3C discovery only)` : "no endpoint advertised — receives no mentions",
      { origin: o.identity, data: o._wm });

    // per-item checks
    let pinPagesOk = 0, pinPagesNo = 0, pinPagesOther = 0;
    for (const [id, r] of items) {
      const d = r.doc;
      if (r.status !== 200 || !d) continue;
      const at = { origin: o.identity, item: id };

      // html-absolute
      const rel = urlAttrs(d.content_html).filter((u) => !isAbsoluteUrl(u.value) && !u.value.startsWith("//"));
      const frag = rel.filter((u) => (u.value.startsWith("#") || u.value.trim() === ""));
      const bad = rel.filter((u) => !(u.value.startsWith("#") || u.value.trim() === ""));
      if (bad.length) add("live.html-absolute", "fail", `${bad.length} relative URL(s): ${bad.slice(0, 3).map((u) => `${u.attr}="${short(u.value, 50)}"`).join(", ")}`, { ...at, data: bad.slice(0, 10) });
      else if (frag.length) add("live.html-absolute", "warn", `${frag.length} fragment-only or empty href(s) (${frag.slice(0, 2).map((u) => JSON.stringify(u.value)).join(", ")}) — relative by URL rules`, at);
      else add("live.html-absolute", "pass", "all URLs absolute", at);

      // page
      const p = o.pages[id];
      if (p) {
        if (p.source === "convention") add("live.page", "warn", `no \`page\` field; reference convention ${p.url} → ${p.status}`, at);
        else if (p.status === 200) add("live.page", "pass", `${p.url} → 200${p.final_url && p.final_url !== p.url ? " (via redirect)" : ""}`, at);
        else add("live.page", "fail", `page ${p.url} → ${p.status || "network error"}`, at);
        if (p.status === 200) {
          const want = new URL(`items/${id}.json`, o.identity).href;
          if (p.alt_json.some((h) => h === want)) add("live.page-alt-json", "pass", "rel=alternate JSON → item document", at);
          else if (p.alt_json.length) add("live.page-alt-json", "warn", `rel=alternate JSON points at ${p.alt_json[0]}, not ${want}`, at);
          else add("live.page-alt-json", "warn", "no <link rel=alternate type=application/json> — a Webmention naming this page cannot be verified (§15.4 step 1)", at);
        }
      }

      // updated == latest changelog at
      const cl = Array.isArray(d.changelog) ? d.changelog : [];
      const last = cl.reduce((a, c) => (c && (!a || c.version > a.version) ? c : a), null);
      if (!last) add("live.updated-changelog", "fail", "no changelog", at);
      else if (last.at !== d.updated) add("live.updated-changelog", "fail", `updated ${d.updated} ≠ latest changelog at ${last.at} (v${last.version})`, at);
      else if (last.version !== d.version) add("live.updated-changelog", "fail", `latest changelog entry is v${last.version}, document is v${d.version}`, at);
      else add("live.updated-changelog", "pass", "updated = latest changelog at", at);

      // reserved directive
      for (const dv of directives(d.content_md)) {
        if (dv.reserved_version != null) add("live.reserved-directive", "fail", `published content_md contains ![[${dv.id}@v${dv.reserved_version}]] (line ${dv.line})`, at);
      }

      // withdrawn endcap
      if (d.kind === "withdrawn") {
        const pr = [];
        if (d.content_md !== "") pr.push("content_md not empty");
        if (d.content_html !== "") pr.push("content_html not empty");
        if (!Array.isArray(d.media)) pr.push("media missing");
        else if (d.media.length) pr.push("media not empty");
        if ("transclusions" in d && (d.transclusions || []).length) pr.push("transclusions not []");
        if (d.stub_of) pr.push("carries stub_of");
        if (d.generated) pr.push("carries generated");
        if (!d.page) pr.push("no page (endcap keeps page)");
        if ((d.changelog || []).some((c) => c && c.version === d.version && c.pinned)) pr.push("endcap version marked pinned (MUST NOT)");
        add("live.withdrawn-endcap", pr.length ? "fail" : "pass", pr.length ? pr.join("; ") : "endcap shape correct", at);
      }

      // pins served
      for (const c of (d.changelog || []).filter((c) => c && c.pinned)) {
        const k = `${id}/v${c.version}`;
        const pin = o.pins[k];
        if (!pin) continue;
        const w = d.kind === "withdrawn" ? " (item withdrawn)" : "";
        if (pin.status === 200 && pin.doc && pin.doc.version === c.version && pin.doc.id === id) add("live.pins-served", "pass", `v${c.version} served${w}`, at);
        else add("live.pins-served", "fail", `changelog says v${c.version} pinned but items/${k}.json → ${pin.status}${pin.doc ? ` (doc v${pin.doc.version})` : ""}${w}`, at);
        const pp = o.pin_pages[k];
        if (pp) { if (pp.status === 200) pinPagesOk++; else if (pp.status === 404) pinPagesNo++; else pinPagesOther++; }
      }

      // generated sources
      for (const g of d.generated || []) for (const s of g.sources || []) {
        if (s.origin && !sameOrigin(s.origin, o.identity)) add("live.generated-sources", "warn", `remote generation source ${s.origin} ${s.id} — a 0.4 construct (§16.3), not expressible at 0.3`, at);
        else if (s.origin) add("live.generated-sources", "warn", "own-origin source carries `origin` (0.3: no origin member)", at);
        else add("live.generated-sources", "pass", "own-origin source", at);
      }

      // stub
      if (d.stub_of) {
        const s = d.stub_of;
        const pr = [];
        if (d.kind !== "thread") pr.push(`stub_of on kind ${d.kind} (threads only)`);
        if (!s.url) {
          if (!s.origin) pr.push("blyg-target stub_of without origin (REQUIRED)");
          const match = (d.transclusions || []).find((t) => t.id === s.id && sameOrigin(t.origin || o.identity, s.origin));
          if (match && match.version !== s.version) pr.push(`body bakes target v${match.version} but stub_of.version = ${s.version} (#27 version agreement)`);
          if (s.id && !ID_RE.test(s.id)) pr.push(`stub_of.id ${JSON.stringify(s.id)} is not a 26-char protocol id`);
        }
        add("live.stub", pr.length ? "fail" : "pass", pr.length ? pr.join("; ") : (s.url ? `{url} stub → ${short(s.url, 70)}` : "thread, origin present, version agrees"), at);
      }

      // transclusion correspondence (threads, live documents)
      if (d.kind === "thread") {
        const pr = [], wr = [];
        if (!Array.isArray(d.transclusions)) pr.push("thread without a `transclusions` array (threads always carry it)");
        let T = [...(d.transclusions || [])];
        let D = directives(d.content_md).filter((x) => x.reserved_version == null);
        let B = bakedTransclusions(d.content_html).filter((b) => b.depth === 0);
        const firstById = (arr) => arr.filter((x, i) => arr.findIndex((y) => y.id === x.id) === i);
        const hasDup = firstById(D).length !== D.length;
        if (hasDup && T.length === firstById(D).length) {
          wr.push(`a target is transcluded more than once but listed once in transclusions[] — §10.3 ("in directive order") does not say whether repeats repeat (For Fable)`);
          D = firstById(D); B = firstById(B);
        } else if (T.length !== D.length) pr.push(`${T.length} transclusions[] entries vs ${D.length} directives in content_md`);
        const sortedEq = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
        if (T.length === D.length && sortedEq(T.map((t) => t.id), D.map((x) => x.id)) && T.some((t, i) => t.id !== D[i].id)) {
          pr.push(`transclusions[] not in directive order (§10.3): entries [${T.map((t) => t.id.slice(0, 6)).join(",")}] vs directives [${D.map((x) => x.id.slice(0, 6)).join(",")}]`);
          // compare by id instead of position for the remaining checks
          T.sort((a, b) => D.findIndex((x) => x.id === a.id) - D.findIndex((x) => x.id === b.id));
        }
        if (T.length !== B.length) pr.push(`${T.length} transclusions[] entries vs ${B.length} direct baked blockquotes`);
        const n = Math.min(T.length, Math.max(D.length, B.length));
        for (let i = 0; i < T.length; i++) {
          const t = T[i], dv = D[i], b = B[i];
          if (dv && dv.id !== t.id) pr.push(`#${i + 1}: directive ${dv.id} ≠ entry ${t.id}`);
          if (b) {
            if (b.id !== t.id) pr.push(`#${i + 1}: baked data-blyg-id ${b.id} ≠ entry ${t.id}`);
            if (b.version !== t.version) pr.push(`#${i + 1}: baked v${b.version} ≠ entry v${t.version}`);
            const tRemote = t.origin && !sameOrigin(t.origin, o.identity);
            if (tRemote && !sameOrigin(b.origin, t.origin)) pr.push(`#${i + 1}: entry origin ${t.origin} but baked data-blyg-origin ${b.origin ?? "absent"}`);
            if (!t.origin && b.origin && !sameOrigin(b.origin, o.identity)) pr.push(`#${i + 1}: own-origin entry but baked data-blyg-origin ${b.origin}`);
            if (t.origin && sameOrigin(t.origin, o.identity)) wr.push(`#${i + 1}: own-origin entry carries origin (SHOULD be omitted)`);
            if (b.origin && sameOrigin(b.origin, o.identity)) wr.push(`#${i + 1}: own-origin bake carries data-blyg-origin (0.2 byte-identity lost)`);
            const partial = [!!dv?.partial, !!t.selector, b.partial];
            if (partial.some(Boolean) && !partial.every(Boolean)) wr.push(`#${i + 1}: partial mismatch — directive ${partial[0] ? "has" : "lacks"} blockquote, entry ${partial[1] ? "has" : "lacks"} selector, bake ${partial[2] ? "has" : "lacks"} blyg-partial`);
          }
          if (dv?.partial && t.selector && normalizeLines(dv.selection) !== normalizeLines(t.selector.exact)) wr.push(`#${i + 1}: selector.exact differs from the content_md selection`);
        }
        void n;
        const st = pr.length ? "fail" : wr.length ? "warn" : "pass";
        if (T.length || D.length || B.length || pr.length) add("live.transclusion-correspondence", st, [...pr, ...wr].slice(0, 4).join("; ") || `${T.length} entries ⇔ directives ⇔ bakes`, { ...at, data: { problems: pr, warnings: wr } });
      }
    }
    const pinTotal = pinPagesOk + pinPagesNo + pinPagesOther;
    if (pinTotal) add("live.pin-pages", "info", `${pinPagesOk}/${pinTotal} pinned versions have an HTML page${pinPagesNo ? `, ${pinPagesNo} 404 (optional)` : ""}${pinPagesOther ? `, ${pinPagesOther} other` : ""}`, { origin: o.identity, data: { ok: pinPagesOk, missing: pinPagesNo, other: pinPagesOther } });

    // unpinned probes
    let u404 = 0;
    const leaks = [], odd = [];
    for (const [k, p] of Object.entries(o.unpinned_probes)) {
      if (p.status === 404) u404++;
      else if (p.status === 200) leaks.push(k);
      else odd.push(`${k}→${p.status}`);
    }
    if (leaks.length) add("live.unpinned-404", "fail", `unpinned version served: ${leaks.slice(0, 4).join(", ")}${leaks.length > 4 ? "…" : ""}`, { origin: o.identity, data: { leaks } });
    if (odd.length) add("live.unpinned-404", "warn", `non-404 answers for unpinned versions: ${odd.slice(0, 4).join(", ")}`, { origin: o.identity });
    if (u404 && !leaks.length) add("live.unpinned-404", "pass", `${u404} unpinned-version probes → 404`, { origin: o.identity });
  }

  // ── references (graph edges) ─────────────────────────────────────────
  const edges = {};
  const refInstances = [];
  const forks = [];
  for (const o of crawled) {
    for (const [id, r] of Object.entries(o.items)) {
      const d = r.doc;
      if (!d) continue;
      const refs = [];
      if (d.forked_from) refs.push(["fork", d.forked_from]); // lineage survives withdrawal (§5.6 r4)
      if (d.stub_of && !d.stub_of.url) refs.push(["stub", d.stub_of]);
      if (d.stub_of && d.stub_of.url) refs.push(["stub-url", d.stub_of]);
      for (const t of d.transclusions || []) refs.push(["transclusion", t]);
      for (const g of d.generated || []) for (const s of g.sources || []) refs.push(["source", s]);
      for (const [rel, ref] of refs) {
        if (rel === "stub-url") {
          refInstances.push({ from: o.identity, item: id, rel: "stub", url: ref.url, flags: ["url-target"] });
          continue;
        }
        const tOrigin = normO(ref.origin || o.identity);
        const cross = !sameOrigin(tOrigin, o.identity);
        const t = getOrigin(tOrigin);
        const inst = { from: o.identity, item: id, rel, to: tOrigin, target: ref.id, version: ref.version, cross, flags: [], notes: [] };
        const at = { origin: o.identity, item: id };

        // reference-target
        if (!t) {
          inst.flags.push("target-unreachable");
          add("live.reference-target", "fail", `${rel} → ${tOrigin} does not resolve as a blyg (${O[tOrigin]?.unreachable || "unknown"})${ref.id && !ID_RE.test(ref.id) ? `; id ${JSON.stringify(ref.id)} is not a protocol id` : ""}`, { ...at, data: { ref } });
        } else {
          if (!sameOrigin(t.identity, tOrigin)) {
            inst.flags.push("non-identity-origin");
            add("live.reference-target", "fail", `${rel} names origin ${tOrigin}, but that resolves to identity ${t.identity} (§5.9: origin is the identity origin)`, at);
          }
          const ti = t.items[ref.id];
          if (!ti || ti.status !== 200 || !ti.doc) {
            inst.flags.push("target-missing");
            add("live.reference-target", "fail", `${rel} → ${tOrigin}items/${ref.id}.json → ${ti?.status ?? "not fetched"}`, at);
          } else if (typeof ref.version === "number" && ref.version > ti.doc.version) {
            inst.flags.push("version-from-future");
            add("live.reference-target", "fail", `${rel} names v${ref.version} but target is at v${ti.doc.version}`, at);
          } else {
            inst.target_version = ti.doc.version;
            inst.target_kind = ti.doc.kind;
            if (ti.doc.kind === "withdrawn") inst.notes.push("target withdrawn");
            else if (ref.version < ti.doc.version) inst.notes.push(`stale: target now v${ti.doc.version}`);
            if (cross || rel === "fork") add("live.reference-target", "pass", `${rel} → ${tOrigin} ${ref.id} v${ref.version}${inst.notes.length ? " (" + inst.notes.join(", ") + ")" : ""}`, at);
          }
        }

        // webmention reachability (cross-origin only)
        if (cross && t) {
          const wm = t._wm || (() => {
            const man = t.manifest?.webmention ? new URL(t.manifest.webmention, t.manifest_url).href : null;
            const pg = t.pages[ref.id];
            const page = pg ? [...pg.webmention, ...pg.link_header_webmention][0] || null : null;
            return { manifest: man, page };
          })();
          let pageWm = null;
          if (t.pages[ref.id]) pageWm = [...t.pages[ref.id].webmention, ...t.pages[ref.id].link_header_webmention][0] || null;
          const ep = wm.manifest || pageWm || null;
          inst.endpoint = ep;
          if (!ep) inst.flags.push("no-endpoint");
          add("live.webmention-reachability", "info", ep ? `${rel} → ${tOrigin}: endpoint ${ep} (${wm.manifest ? "manifest" : "W3C"})` : `${rel} → ${tOrigin}: no endpoint — this reference can never notify its target`, { ...at, data: { rel, to: tOrigin, endpoint: ep } });
        } else if (cross && !t) inst.flags.push("no-endpoint");

        // fork pinned
        if (rel === "fork") {
          if (!ref.origin) add("live.fork-pinned", "fail", "forked_from without origin (REQUIRED, §5.6 r1)", at);
          const pin = t?.pins[`${ref.id}/v${ref.version}`];
          if (!t) { inst.flags.push("fork-unpinned"); add("live.fork-pinned", "fail", `source origin ${tOrigin} unreachable`, at); }
          else if (pin?.status === 200 && pin.doc?.version === ref.version) add("live.fork-pinned", "pass", `${tOrigin}items/${ref.id}/v${ref.version}.json → 200`, at);
          else {
            inst.flags.push("fork-unpinned");
            add("live.fork-pinned", pin && pin.status === 0 ? "warn" : "fail", `${tOrigin}items/${ref.id}/v${ref.version}.json → ${pin?.status ?? "not fetched"} — lineage points at an unpinned version`, at);
          }
          forks.push({ origin: o, id, d, ref, t });
        }

        // selector substring
        if (rel === "transclusion" && ref.selector) {
          const exact = normalizeLines(ref.selector.exact || "");
          let tgtDoc = null, via = null;
          if (t) {
            const pin = t.pins[`${ref.id}/v${ref.version}`];
            if (pin?.status === 200 && pin.doc) { tgtDoc = pin.doc; via = "pinned file"; }
            else if (t.items[ref.id]?.doc?.version === ref.version) { tgtDoc = t.items[ref.id].doc; via = "current document (same version)"; }
          }
          if (!tgtDoc) {
            inst.notes.push("selector unverifiable");
            add("live.selector-substring", "warn", `cannot re-check: v${ref.version} of ${ref.id} is neither pinned nor current at ${tOrigin} (§10.2: "while the origin serves that version")`, { ...at, data: { exact: short(exact, 200) } });
          } else {
            const txt = textContent(tgtDoc.content_html);
            const ctx = (ref.selector.prefix || "") + (ref.selector.exact || "") + (ref.selector.suffix || "");
            if (txt.includes(exact)) add("live.selector-substring", "pass", `substring of ${via} v${ref.version}${txt.includes(normalizeLines(ctx)) ? "" : " (prefix/suffix context does not match exactly)"}`, { ...at, data: { exact: short(exact, 200), via } });
            else if (flatText(txt).includes(flatText(exact))) {
              inst.notes.push("selector matches only when block boundaries are ignored");
              add("live.selector-substring", "warn", `matches only when block boundaries are collapsed — the §10.2 normalization is ambiguous for this case (${via})`, { ...at, data: { exact: short(exact, 200), via } });
            } else {
              inst.flags.push("selector-mismatch");
              add("live.selector-substring", "fail", `selector.exact (${exact.length} chars) is not a substring of ${tOrigin} ${ref.id} v${ref.version} text (${via})`, { ...at, data: { exact: short(exact, 300), via, target_text_sample: short(txt, 300) } });
            }
          }
        }

        refInstances.push(inst);
        if (cross) {
          const k = `${o.identity}|${tOrigin}|${rel}`;
          const e = (edges[k] ||= { from: o.identity, to: tOrigin, rel, count: 0, failed: false, instances: [] });
          e.count++;
          if (inst.flags.length) e.failed = true;
          e.instances.push(inst);
        }
      }
    }
  }
  const urlStubs = refInstances.filter((r) => r.url);
  add("live.webmention-reachability", "info", `${urlStubs.length} {url} stubs (plain-web targets; W3C discovery not probed by this crawler)`, { data: { urls: urlStubs.map((u) => u.url) } });

  // ── forks: re-resolution diff + lineage visibility ───────────────────
  const forkPanels = [];
  for (const { origin: o, id, d, ref, t } of forks) {
    const at = { origin: o.identity, item: id };
    const src = t?.pins[`${ref.id}/v${ref.version}`]?.doc || null;
    const forkFirstPin = (d.changelog || []).find((c) => c.pinned);
    const forkV1 = o.pins[`${id}/v1`]?.doc;
    const forkDoc = forkV1 || d;
    const forkLabel = forkV1 ? "fork v1 (pinned)" : `fork live v${d.version}`;
    const panel = { origin: o.identity, id, page: o.pages[id]?.url || null, source_origin: ref.origin, source_id: ref.id,
      source_version: ref.version, fork_label: forkLabel, fork_version: forkDoc.version,
      source_md: src?.content_md ?? null, fork_md: forkDoc.content_md, findings: [], source_available: !!src };
    void forkFirstPin;
    if (d.kind === "withdrawn" && !forkV1) {
      panel.withdrawn = true;
      panel.findings.push({ level: "info", text: "fork has been withdrawn and its v1 is not pinned — nothing left to compare; lineage survives on the endcap (§5.6 r4)" });
    } else if (!src) {
      panel.findings.push({ level: "fail", text: "source pin not available — nothing to compare against" });
    } else {
      const absOrigin = (e, doc) => normO(e.origin || doc.origin);
      const sd = directives(src.content_md), fd = directives(forkDoc.content_md);
      const sT = src.transclusions || [], fT = forkDoc.transclusions || [];
      const sB = bakedTransclusions(src.content_html).filter((b) => b.depth === 0);
      const fB = bakedTransclusions(forkDoc.content_html).filter((b) => b.depth === 0);
      const fdIds = fd.map((x) => x.id), sdIds = sd.map((x) => x.id);
      for (const x of sd) if (!fdIds.includes(x.id)) panel.findings.push({ level: "info", text: `directive ![[${x.id}]] removed in the fork (author's edit, or lost)` });
      for (const x of fd) if (!sdIds.includes(x.id)) panel.findings.push({ level: "info", text: `directive ![[${x.id}]] added in the fork` });
      for (const x of sd) {
        const y = fd.find((z) => z.id === x.id);
        if (!y) continue;
        if (x.partial && !y.partial) panel.findings.push({ level: "warn", text: `selector lost: source quotes a ${x.selection.length}-character passage under ![[${x.id}]]; the fork keeps the directive but not the selection — a partial quote silently became a whole one` });
        else if (x.partial && y.partial && normalizeLines(x.selection) !== normalizeLines(y.selection)) panel.findings.push({ level: "info", text: `selection under ![[${x.id}]] changed` });
        else if (!x.partial && y.partial) panel.findings.push({ level: "info", text: `selection added under ![[${x.id}]]` });
        const se = sT.find((e) => e.id === x.id), fe = fT.find((e) => e.id === x.id);
        if (se && fe) {
          const so = absOrigin(se, src), fo = absOrigin(fe, forkDoc);
          if (so !== fo) panel.findings.push({ level: "warn", text: `![[${x.id}]] re-resolved to a different origin: source baked ${so}, fork baked ${fo} — the directive names an identity, so the fork's studio picked another copy` });
          else if (!!se.origin !== !!fe.origin) panel.findings.push({ level: "info", text: `![[${x.id}]] origin member ${se.origin ? "dropped" : "added"} (${so}) — consistent: ${se.origin ? "remote for the source, own-origin for the fork" : "own-origin for the source, remote for the fork"}` });
          if (se.version !== fe.version) panel.findings.push({ level: "info", text: `![[${x.id}]] re-baked at v${fe.version} (source pin baked v${se.version}) — republish re-resolves (§10.2)` });
          if (se.selector && !fe.selector) panel.findings.push({ level: "warn", text: `transclusions[] selector for ${x.id} dropped in the fork` });
        }
        const sb = sB.find((b) => b.id === x.id), fb = fB.find((b) => b.id === x.id);
        if (sb && fb && sb.partial && !fb.partial) panel.findings.push({ level: "warn", text: `baked quote of ${x.id} lost class blyg-partial (whole target now baked)` });
      }
      if (src.stub_of && !forkDoc.stub_of) panel.findings.push({ level: "info", text: `source pin is a stub of ${src.stub_of.origin || src.stub_of.url} ${src.stub_of.id || ""}; the fork is not a stub` });
      if (!panel.findings.length) panel.findings.push({ level: "pass", text: "directives, selectors, origins and baked versions carried over unchanged" });
    }
    const worst = panel.findings.some((f) => f.level === "fail") ? "fail" : panel.findings.some((f) => f.level === "warn") ? "warn" : "info";
    add("live.fork-reresolution", worst, panel.findings.map((f) => f.text).join(" · "), { ...at, data: { source: `${ref.origin}${ref.id}/v${ref.version}` } });

    // lineage visibility
    const pg = o.pages[id];
    const srcOrigin = normO(ref.origin);
    let st = "warn", detail;
    if (!pg || pg.status !== 200) detail = `fork page ${pg?.url} → ${pg?.status}`;
    else {
      const hrefs = pg.hrefs || [];
      const toSrc = hrefs.filter((h) => h && srcOrigin && h.startsWith(srcOrigin));
      const toPin = toSrc.filter((h) => h.includes(ref.id) && (h.includes(`/v${ref.version}`) || h.includes(`v${ref.version}.json`)));
      if (toPin.length) { st = "pass"; detail = `page links the source pin: ${toPin[0]}`; }
      else if (toSrc.some((h) => h.includes(ref.id))) { st = "info"; detail = `page links the source item (${toSrc.find((h) => h.includes(ref.id))}) but not its pinned version`; }
      else if (toSrc.length) { st = "warn"; detail = `page links the source origin only (${toSrc[0]}) — a reader cannot reach the pin it descends from`; }
      else detail = "page shows no link to the source — a reader cannot compare the mod to its source";
      panel.lineage = { status: st, detail };
    }
    add("live.fork-lineage-visible", st, detail, at);
    forkPanels.push(panel);
  }

  // ── blogroll edges ───────────────────────────────────────────────────
  const blogrollEdges = [];
  for (const o of crawled) {
    for (const e of o.blogroll?.entries || []) {
      const res = crawl.resolutions.find((r) => r.input === e.xmlUrl || r.input === e.htmlUrl);
      if (res?.outcome === "blyg" && !sameOrigin(res.identity, o.identity)) blogrollEdges.push({ from: o.identity, to: normO(res.identity), rel: "blogroll" });
    }
  }

  // ── nodes + heat grid ───────────────────────────────────────────────
  const nodes = Object.values(O).filter((o) => !o.alias_of).map((o) => {
    const docs = Object.values(o.items || {}).filter((r) => r.doc);
    return {
      id: normO(o.identity), title: o.manifest?.title || o.identity, generator: o.manifest?.generator || null,
      client: (o.manifest?.generator || "unknown").split("/")[0].split(" ")[0],
      blyg: o.manifest?.blyg ?? null, items: o.crawled ? docs.length : null, crawled: !!o.crawled,
      unreachable: o.unreachable || null, webmention: !!(o._wm?.manifest || o._wm?.page),
      listed: (o.from || []).some((f) => f.startsWith("directory")),
    };
  });
  const grid = {};
  for (const r of results) {
    if (!r.origin) continue;
    const k = normO(r.origin);
    const g = ((grid[k] ||= {})[r.check] ||= { pass: 0, warn: 0, fail: 0, info: 0 });
    g[r.status]++;
  }

  // ── summary ─────────────────────────────────────────────────────────
  const order = { fail: 3, warn: 2, pass: 1, info: 0 };
  const checks = Object.entries(CHECKS).map(([id, c]) => {
    const rs = results.filter((r) => r.check === id);
    const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
    rs.forEach((r) => counts[r.status]++);
    let status = c.kind === "info" ? "info" : rs.reduce((s, r) => (order[r.status] > order[s] ? r.status : s), rs.length ? "pass" : "info");
    if (c.kind === "info" && counts.fail) status = "fail";
    else if (c.kind === "info" && counts.warn) status = "warn";
    const failingOrigins = [...new Set(rs.filter((r) => r.status === "fail").map((r) => r.origin))];
    let detail = `${rs.length} instance(s): ${counts.pass} pass, ${counts.warn} warn, ${counts.fail} fail${counts.info ? `, ${counts.info} info` : ""}`;
    if (failingOrigins.length) detail += ` · failing at ${failingOrigins.map((x) => (x || "").replace(/^https?:\/\//, "")).join(", ")}`;
    if (id === "live.webmention-reachability") {
      const cr = refInstances.filter((r) => r.cross);
      const no = cr.filter((r) => r.flags.includes("no-endpoint"));
      const stubsNo = no.filter((r) => r.rel === "stub");
      detail = `${cr.length} cross-origin references; ${no.length} land on an origin with no endpoint, of which ${stubsNo.length} are stubs that can never notify their target; ${urlStubs.length} {url} stubs not probed`;
    }
    if (id === "live.census") {
      const gens = {};
      crawled.forEach((o) => { const g = o.manifest?.generator || "?"; gens[g] = (gens[g] || 0) + 1; });
      const keys = {};
      crawled.forEach((o) => { const v = o.manifest?.blyg ?? "?"; keys[v] = (keys[v] || 0) + 1; });
      detail = `${crawled.length} live blygs · protocol keys ${Object.entries(keys).map(([k, v]) => `${k}×${v}`).join(", ")} · ${Object.keys(gens).length} distinct generators`;
    }
    return { id, title: c.title, status, detail, spec_refs: c.spec_refs, decisions: c.decisions, clauses: c.clauses, counts };
  });

  const summary = {
    area: "live",
    title: "Live network crawl — cross-origin invariants",
    generated_at: new Date().toISOString(),
    crawled_at: crawl.generated_at,
    origins: crawled.length,
    checks,
  };
  const out = { summary, results, graph: { nodes, edges: Object.values(edges), blogroll: blogrollEdges }, grid, forks: forkPanels,
    references: refInstances, crawl_meta: { generated_at: crawl.generated_at, http_stats: crawl.http_stats, directory: crawl.directory, resolutions: crawl.resolutions.map((r) => ({ input: r.input, from: r.from, outcome: r.outcome, step: r.step, identity: r.identity || null, feed_url: r.feed_url || null })) } };
  await writeFile(join(HERE, "out", "summary.json"), JSON.stringify(summary, null, 2));
  await writeFile(join(HERE, "out", "results.json"), JSON.stringify(out, null, 1));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await check(process.argv[2]);
  for (const c of out.summary.checks) console.log(`${c.status.padEnd(5)} ${c.id.padEnd(34)} ${c.detail}`);
}
