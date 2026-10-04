// Live-network crawler for the Blygger protocol (spec: docs/protocol-v0.3.md).
//
// Seeds from the blygger.com directory + seeds.json + blogrolls found while
// crawling, resolves each per §12.1, then fetches each blyg's surface (§4)
// and every cross-origin reference target. Writes out/crawl.json — the
// fixture corpus the checks (check.mjs) and other tools read.
//
// Read-only: GET and HEAD only. Never POSTs. See lib/http.mjs.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Http, parseJson, USER_AGENT } from "./lib/http.mjs";
import { linkTags, parseFeed, parseOpml, parseLinkHeader, resolveUrl } from "./lib/text.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export async function crawl(opts = {}) {
  const cfg = {
    directory: "https://blygger.com/",
    maxOrigins: 80,
    maxItems: Infinity,
    probesPerItem: 2,
    probesPerOrigin: 12,
    followBlogrolls: true,
    ...opts,
  };
  const log = cfg.quiet ? () => {} : (m) => process.stderr.write(m + "\n");
  const http = new Http({
    cacheDir: join(HERE, "cache"),
    ttlMs: cfg.ttlHours != null ? cfg.ttlHours * 3600e3 : 12 * 3600e3,
    perHost: cfg.perHost ?? 2,
    global: cfg.global ?? 8,
    timeoutMs: cfg.timeoutMs ?? 15000,
    offline: !!cfg.offline,
    log: cfg.verbose ? log : () => {},
  });

  const seedFile = parseJson(await readFile(join(HERE, "seeds.json"), "utf8")) || {};
  const seeds = [];
  const seen = new Set();
  const addSeed = (url, from) => {
    if (!url) return;
    let u;
    try { u = new URL(url).href; } catch { return; }
    const key = u.replace(/\/+$/, "");
    if (seen.has(key)) {
      const s = seeds.find((x) => x.url.replace(/\/+$/, "") === key);
      if (s && !s.from.includes(from)) s.from.push(from);
      return;
    }
    seen.add(key);
    seeds.push({ url: u, from: [from] });
  };

  // 1. Directory seeds.
  const directory = { url: cfg.directory, status: null, listings: [] };
  const dir = await http.get(cfg.directory);
  directory.status = dir.status;
  if (dir.status === 200) {
    const re = /<li><span class="mark( blyg)?"[^>]*>([^<]*)<\/span><a class="name" href="([^"]+)"[^>]*>([^<]*)<\/a>/g;
    let m;
    while ((m = re.exec(dir.body))) {
      directory.listings.push({ url: m[3], mark: m[2].trim(), name: m[4] });
      addSeed(m[3], "directory:" + m[2].trim());
    }
  }
  for (const u of seedFile.known || []) addSeed(u, "known");
  for (const u of seedFile.extra || []) addSeed(u, "seeds.json");

  const origins = {};
  const resolutions = [];

  // §12.1 resolution. Returns { outcome, step, identity, manifest_url, trail }.
  async function resolve(input) {
    const trail = [];
    const probed = new Set();
    const get = async (u, why) => {
      const r = await http.get(u);
      trail.push({ url: u, why, status: r.status, final_url: r.final_url || null });
      probed.add(u);
      return r;
    };
    const asManifest = (r) => {
      if (r.status !== 200) return null;
      const j = parseJson(r.body);
      return j && typeof j === "object" && !Array.isArray(j) && "blyg" in j ? j : null;
    };
    const identityOf = (finalUrl) => finalUrl.replace(/[^/]*$/, "");
    const done = (step, r, manifest) => ({
      outcome: "blyg", step, identity: identityOf(r.final_url || r.url),
      manifest_url: r.final_url || r.url, manifest, trail,
    });

    let u;
    try { u = new URL(input); } catch { return { outcome: "fail", step: null, trail, error: "bad url" }; }
    u.search = ""; u.hash = "";
    if (!u.pathname.endsWith("/")) u.pathname += "/";
    const candidate = u.href;

    // 2. Direct probe.
    let r = await get(candidate + "blyg.json", "2 direct probe");
    let man = asManifest(r);
    if (man) return done(2, r, man);

    // 3. Feed upgrade / 4. rel probe both read the input itself.
    const inp = await get(input, "3/4 fetch input");
    let l0 = null;
    const feed = inp.status === 200 ? parseFeed(inp.body) : null;
    if (feed) {
      if (feed.blyg_manifest) {
        r = await get(resolveUrl(feed.blyg_manifest, inp.final_url || input), "3 feed upgrade");
        man = asManifest(r);
        if (man) return done(3, r, man);
      }
      l0 = inp.final_url || input;
    } else if (inp.status === 200) {
      const rel = linkTags(inp.body).find((l) => l.tag === "link" && l.rel.includes("blyg") && l.href);
      if (rel) {
        let base = resolveUrl(rel.href, inp.final_url || input);
        if (base && !base.endsWith("/")) base += "/";
        const mu = base + "blyg.json";
        if (!probed.has(mu)) {
          r = await get(mu, "4 rel=blyg probe");
          man = asManifest(r);
          if (man) return done(4, r, man);
        }
      }
    }
    // 5. Conventional mounts.
    for (const p of ["/blyg/blyg.json", "/blyg.json"]) {
      const mu = u.origin + p;
      if (probed.has(mu)) continue;
      r = await get(mu, "5 conventional mount");
      man = asManifest(r);
      if (man) return done(5, r, man);
    }
    // 6. RSS fallback.
    if (!l0 && inp.status === 200 && !feed) {
      const alt = linkTags(inp.body).find((l) => l.tag === "link" && l.rel.includes("alternate")
        && /application\/(rss|atom)\+xml/.test(l.type) && l.href);
      if (alt) l0 = resolveUrl(alt.href, inp.final_url || input);
    }
    if (l0) return { outcome: "l0", step: 6, feed_url: l0, trail };
    const down = trail.every((t) => t.status === 0 || t.status >= 500);
    return { outcome: down ? "down" : "fail", step: null, trail };
  }

  function newOrigin(identity, res, input, full) {
    if (!origins[identity]) {
      origins[identity] = {
        identity, crawled: false, inputs: [], resolution: null,
        manifest_url: res.manifest_url, manifest: res.manifest, manifest_headers: null,
        front: null, index: null, feed: null, blogroll: null,
        items: {}, pins: {}, pin_pages: {}, unpinned_probes: {}, pages: {},
      };
    }
    const o = origins[identity];
    if (input) o.inputs.push(input);
    if (!o.resolution && res.step) o.resolution = { step: res.step, input, trail: res.trail };
    if (full) o.want_full = true;
    return o;
  }

  const abs = (o, rel) => resolveUrl(rel, o.identity);

  async function fetchItem(o, id) {
    if (o.items[id]) return o.items[id];
    const url = abs(o, `items/${id}.json`);
    const r = await http.get(url);
    const rec = { url, status: r.status, final_url: r.final_url || null,
      acao: r.headers?.["access-control-allow-origin"] ?? null,
      content_type: r.headers?.["content-type"] ?? null,
      doc: r.status === 200 ? parseJson(r.body) ?? null : null,
      parse_error: r.status === 200 && parseJson(r.body) === undefined };
    o.items[id] = rec;
    return rec;
  }

  async function fetchPin(o, id, n) {
    const k = `${id}/v${n}`;
    if (o.pins[k]) return o.pins[k];
    const url = abs(o, `items/${id}/v${n}.json`);
    const r = await http.get(url);
    o.pins[k] = { url, status: r.status, doc: r.status === 200 ? parseJson(r.body) ?? null : null };
    return o.pins[k];
  }

  function pageUrl(o, id, doc) {
    if (doc && typeof doc.page === "string") return { url: abs(o, doc.page), source: "page" };
    const kind = doc?.kind === "fragment" ? "f" : "t";
    return { url: abs(o, `${kind}/${id}/`), source: "convention" };
  }

  async function fetchPage(o, id, doc, keepHrefs) {
    if (o.pages[id]) return o.pages[id];
    const { url, source } = pageUrl(o, id, doc);
    const r = await http.get(url);
    const tags = r.status === 200 ? linkTags(r.body) : [];
    const base = r.final_url || url;
    const rec = {
      url, source, status: r.status, final_url: r.final_url || null,
      alt_json: tags.filter((t) => t.tag === "link" && t.rel.includes("alternate") && /json/.test(t.type) && t.href)
        .map((t) => resolveUrl(t.href, base)),
      webmention: tags.filter((t) => t.rel.includes("webmention") && t.href).map((t) => resolveUrl(t.href, base)),
      link_header_webmention: parseLinkHeader(r.headers?.link).filter((l) => l.rel.includes("webmention"))
        .map((l) => resolveUrl(l.href, base)),
      canonical: (tags.find((t) => t.tag === "link" && t.rel.includes("canonical")) || {}).href || null,
    };
    if (keepHrefs && r.status === 200) {
      rec.hrefs = [...new Set(tags.filter((t) => t.tag === "a" && t.href).map((t) => resolveUrl(t.href, base)).filter(Boolean))];
    }
    o.pages[id] = rec;
    return rec;
  }

  async function crawlOrigin(o) {
    if (o.crawled) return;
    o.crawled = true;
    log(`crawl ${o.identity}`);
    const mr = await http.get(o.manifest_url);
    o.manifest_headers = mr.headers || null;
    const m = o.manifest || {};

    // Front (feed) page — for rel=webmention / rel=blogroll.
    const fr = await http.get(o.identity);
    const ft = fr.status === 200 ? linkTags(fr.body) : [];
    o.front = { url: o.identity, status: fr.status,
      webmention: ft.filter((t) => t.rel.includes("webmention") && t.href).map((t) => resolveUrl(t.href, fr.final_url || o.identity)),
      link_header_webmention: parseLinkHeader(fr.headers?.link).filter((l) => l.rel.includes("webmention")).map((l) => resolveUrl(l.href, o.identity)),
      blogroll_link: (ft.find((t) => t.rel.includes("blogroll")) || {}).href || null,
      rel_blyg: (ft.find((t) => t.tag === "link" && t.rel.includes("blyg")) || {}).href || null };

    // Index.
    const ir = await http.get(abs(o, "items/index.json"));
    o.index = { url: abs(o, "items/index.json"), status: ir.status,
      acao: ir.headers?.["access-control-allow-origin"] ?? null,
      doc: ir.status === 200 ? parseJson(ir.body) ?? null : null };
    if (m.items && m.items !== "items/index.json") o.index.manifest_items_value = m.items;

    // Feed.
    const fu = abs(o, "feed.xml");
    const fd = await http.get(fu);
    o.feed = { url: fu, status: fd.status, acao: fd.headers?.["access-control-allow-origin"] ?? null,
      parsed: fd.status === 200 ? parseFeed(fd.body) : null,
      manifest_feed_value: m.feed ?? null };

    // Blogroll (probe even without the key; 404 is the correct "none").
    const bu = abs(o, "blogroll.opml");
    const br = await http.get(bu);
    o.blogroll = { url: bu, status: br.status, manifest_key: m.blogroll ?? null,
      entries: br.status === 200 ? parseOpml(br.body) : null };

    // Items.
    const ids = (o.index.doc?.items || []).map((x) => x && x.id).filter(Boolean);
    const limited = ids.slice(0, cfg.maxItems);
    if (ids.length > limited.length) o.items_truncated = { total: ids.length, fetched: limited.length };
    await Promise.all(limited.map((id) => fetchItem(o, id)));

    // Unpinned-version probes are chosen deterministically (index order) so
    // reruns and --offline hit the same cache entries.
    const probeList = [];
    for (const id of limited) {
      const d = o.items[id].doc;
      if (!d || typeof d.version !== "number") continue;
      const pinned = (d.changelog || []).filter((c) => c && c.pinned).map((c) => c.version);
      const cands = [];
      if (!pinned.includes(d.version)) cands.push(d.version);
      if (d.version > 1 && !pinned.includes(1)) cands.push(1);
      if (d.version > 2 && !pinned.includes(d.version - 1)) cands.push(d.version - 1);
      for (const n of cands.slice(0, cfg.probesPerItem)) if (probeList.length < cfg.probesPerOrigin) probeList.push([id, n, d.version]);
    }
    await Promise.all(probeList.map(async ([id, n, cur]) => {
      const url = abs(o, `items/${id}/v${n}.json`);
      const h = await http.head(url);
      o.unpinned_probes[`${id}/v${n}`] = { url, status: h.status, current_version: cur };
    }));

    await Promise.all(limited.map(async (id) => {
      const d = o.items[id].doc;
      if (!d) return;
      const keep = !!(d.forked_from || d.stub_of);
      await fetchPage(o, id, d, keep);
      const pinned = (d.changelog || []).filter((c) => c && c.pinned).map((c) => c.version);
      for (const n of pinned) {
        await fetchPin(o, id, n);
        const pu = pageUrl(o, id, d).url + `v${n}/`;
        const h = await http.head(pu);
        o.pin_pages[`${id}/v${n}`] = { url: pu, status: h.status };
      }
    }));
  }

  // 2. Resolve seeds, crawl blygs, follow blogrolls.
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    const res = await resolve(s.url);
    resolutions.push({ input: s.url, from: s.from, ...res, trail: res.trail });
    if (res.outcome !== "blyg") continue;
    if (Object.keys(origins).length >= cfg.maxOrigins && !origins[res.identity]) continue;
    const o = newOrigin(res.identity, res, s.url, true);
    o.from = [...new Set([...(o.from || []), ...s.from])];
    await crawlOrigin(o);
    if (cfg.followBlogrolls && o.blogroll?.entries) {
      for (const e of o.blogroll.entries) addSeed(e.xmlUrl || e.htmlUrl, "blogroll:" + o.identity);
    }
  }

  // 3. Reference targets (cross-origin and own), including off-network origins.
  const refs = [];
  for (const o of Object.values(origins)) {
    for (const [id, rec] of Object.entries(o.items)) {
      const d = rec.doc;
      if (!d) continue;
      if (d.forked_from) refs.push({ o, id, rel: "fork", ref: d.forked_from });
      if (d.stub_of && d.stub_of.id) refs.push({ o, id, rel: "stub", ref: d.stub_of });
      for (const t of d.transclusions || []) refs.push({ o, id, rel: "transclusion", ref: t });
      for (const g of d.generated || []) for (const s of g.sources || []) refs.push({ o, id, rel: "source", ref: s });
    }
  }
  const extOrigins = {};
  for (const { o, rel, ref } of refs) {
    if (!ref || !ref.id) continue;
    const tOrigin = ref.origin || o.identity;
    let t = origins[tOrigin];
    if (!t) {
      if (!(tOrigin in extOrigins)) {
        const res = await resolve(tOrigin);
        extOrigins[tOrigin] = res;
        resolutions.push({ input: tOrigin, from: ["reference"], ...res });
        if (res.outcome === "blyg") {
          t = newOrigin(res.identity, res, tOrigin, false);
          if (res.identity !== tOrigin) {
            // The reference names an origin that is not an identity origin.
            t.aliases = [...new Set([...(t.aliases || []), tOrigin])];
            origins[tOrigin] = origins[tOrigin] || { alias_of: res.identity, identity: tOrigin };
          }
        } else {
          origins[tOrigin] = { identity: tOrigin, crawled: false, unreachable: res.outcome,
            resolution: { step: null, input: tOrigin, trail: res.trail }, items: {}, pins: {}, pages: {},
            pin_pages: {}, unpinned_probes: {} };
        }
      }
      t = origins[tOrigin];
      if (t && t.alias_of) t = origins[t.alias_of];
    }
    if (!t || t.unreachable) continue;
    const item = await fetchItem(t, ref.id);
    if (typeof ref.version === "number") {
      const cur = item.doc?.version;
      if (rel === "fork" || cur !== ref.version) await fetchPin(t, ref.id, ref.version);
    }
    // Webmention discovery needs the target page when no manifest key exists.
    if (!t.crawled && item.doc) await fetchPage(t, ref.id, item.doc, false);
  }

  // Pages of forks keep their hrefs; make sure fork *sources'* pin pages are known.
  for (const o of Object.values(origins)) {
    if (o.alias_of || o.unreachable) continue;
    for (const [id, rec] of Object.entries(o.items)) {
      const f = rec.doc?.forked_from;
      if (!f) continue;
      const t = origins[f.origin] && (origins[f.origin].alias_of ? origins[origins[f.origin].alias_of] : origins[f.origin]);
      if (!t || t.unreachable) continue;
      const td = t.items[f.id]?.doc;
      const pu = pageUrl(t, f.id, td).url + `v${f.version}/`;
      if (!t.pin_pages[`${f.id}/v${f.version}`]) {
        const h = await http.head(pu);
        t.pin_pages[`${f.id}/v${f.version}`] = { url: pu, status: h.status };
      }
    }
  }

  for (const o of Object.values(origins)) delete o.want_full;
  const out = {
    generated_at: new Date().toISOString(),
    spec: "docs/protocol-v0.3.md",
    user_agent: USER_AGENT,
    config: { ...cfg, maxItems: cfg.maxItems === Infinity ? null : cfg.maxItems },
    http_stats: http.stats,
    directory,
    seeds,
    resolutions,
    origins,
  };
  await mkdir(join(HERE, "out"), { recursive: true });
  await writeFile(join(HERE, "out", "crawl.json"), JSON.stringify(out, null, 1));
  log(`crawl: ${Object.keys(origins).length} origins, network ${http.stats.network}, cached ${http.stats.cached}, errors ${http.stats.errors}`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { parseArgs } = await import("./lib/args.mjs");
  await crawl(parseArgs(process.argv.slice(2)));
}
