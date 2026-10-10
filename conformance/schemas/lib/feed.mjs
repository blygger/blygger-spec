// Lightweight checker for feed.xml's blyg: vocabulary (§7). A tiny tolerant
// XML reader — enough for RSS 2.0 as blyg publishers emit it; not a general
// XML parser.
const NS = "https://blygger.org/ns/0.1";
const ID = /^[0-9abcdefghjkmnpqrstvwxyz]{26}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const RFC822 = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}(:\d{2})? (GMT|UT|Z|[+-]\d{4}|[A-Z]{3})$/;

function text(s) {
  if (s == null) return null;
  const c = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  if (c) return c[1];
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
}
function el(xml, name) {
  const m = xml.match(new RegExp(`<${name}(\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? { attrs: m[1] || "", body: text(m[2]) } : xml.match(new RegExp(`<${name}(\\s[^>]*)?/>`)) ? { attrs: "", body: "" } : null;
}

export function parseFeed(xml) {
  const rss = xml.match(/<rss\b([^>]*)>/);
  const channel = (xml.match(/<channel>([\s\S]*)<\/channel>/) || [])[1] || "";
  const head = channel.split(/<item[\s>]/)[0];
  const items = [...channel.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const x = m[1];
    const g = el(x, "guid");
    return {
      guid: g && g.body, guidAttrs: g && g.attrs,
      title: el(x, "title")?.body ?? null, link: el(x, "link")?.body ?? null,
      description: el(x, "description")?.body ?? null, pubDate: el(x, "pubDate")?.body ?? null,
      id: el(x, "blyg:id")?.body ?? null, kind: el(x, "blyg:kind")?.body ?? null,
      version: el(x, "blyg:version")?.body ?? null, created: el(x, "blyg:created")?.body ?? null,
      item: el(x, "blyg:item")?.body ?? null, creator: el(x, "dc:creator")?.body ?? null,
    };
  });
  return {
    rssAttrs: rss ? rss[1] : null,
    manifest: el(head, "blyg:manifest")?.body ?? null,
    level: el(head, "blyg:level")?.body ?? null,
    lastBuildDate: el(head, "lastBuildDate")?.body ?? null,
    items,
  };
}

/** Returns rule results in the same shape as semantic.runRules. */
export function checkFeed(xml, { items = {}, origin } = {}) {
  const f = parseFeed(xml);
  const R = [];
  const add = (rule, title, level, spec_refs, decisions, messages) => R.push({ rule, title, level, spec_refs, decisions, messages });
  const a = f.rssAttrs || "";
  add("feed.rss2-namespace", "RSS 2.0 root declaring the permanent blyg namespace", "fail", ["§7"], ["#22"], [
    ...(/version="2\.0"/.test(a) ? [] : ["<rss> lacks version=\"2.0\""]),
    ...(a.includes(`xmlns:blyg="${NS}"`) ? [] : [`xmlns:blyg is not ${NS}`]),
  ]);
  add("feed.manifest-hook", "<blyg:manifest> present and absolute", "fail", ["§7", "§12.1"], ["#17"],
    !f.manifest ? ["no channel <blyg:manifest>"] : /^https?:\/\//.test(f.manifest) ? (origin && f.manifest !== origin + "blyg.json" ? [`blyg:manifest ${f.manifest} ≠ ${origin}blyg.json`] : []) : [`not absolute: ${f.manifest}`]);
  const per = [];
  const seenGuid = new Set();
  for (const [i, it] of f.items.entries()) {
    const tag = `entry ${i} (${it.id ?? "?"} v${it.version ?? "?"})`;
    if (!it.id || !ID.test(it.id)) per.push(`${tag}: blyg:id missing/invalid`);
    if (!["fragment", "thread", "withdrawn"].includes(it.kind)) per.push(`${tag}: blyg:kind ${it.kind}`);
    if (!/^[1-9]\d*$/.test(it.version || "")) per.push(`${tag}: blyg:version ${it.version}`);
    if (!UTC.test(it.created || "")) per.push(`${tag}: blyg:created not ISO UTC`);
    if (!/^https?:\/\//.test(it.item || "")) per.push(`${tag}: blyg:item not absolute`);
    if (it.guid !== `blyg:${it.id}:v${it.version}`) per.push(`${tag}: guid ${it.guid} ≠ blyg:{id}:v{n}`);
    if (!/isPermaLink="false"/.test(it.guidAttrs || "")) per.push(`${tag}: guid lacks isPermaLink="false"`);
    if (seenGuid.has(it.guid)) per.push(`${tag}: duplicate guid`);
    seenGuid.add(it.guid);
    if (it.title == null) per.push(`${tag}: no <title> (RSS requires one, §7 MUST)`);
    if (!/^https?:\/\//.test(it.link || "")) per.push(`${tag}: <link> not absolute`);
    if (it.pubDate && !RFC822.test(it.pubDate)) per.push(`${tag}: pubDate not RFC 822`);
  }
  add("feed.entry-vocabulary", "every entry carries well-formed blyg:id/kind/version/created/item and a per-version guid", "fail", ["§7"], ["#16"], per);

  const wd = [];
  for (const it of f.items.filter((x) => x.kind === "withdrawn")) {
    if (it.title !== "withdrawn") wd.push(`${it.id}: withdrawal title "${it.title}" (RECOMMENDED literal "withdrawn")`);
    if (it.description) wd.push(`${it.id}: withdrawal description not empty`);
    const others = f.items.filter((x) => x.id === it.id && x !== it);
    if (others.length) wd.push(`${it.id}: ${others.length} earlier publish event(s) still in the window (MUST be dropped)`);
  }
  add("feed.withdrawn-single-entry", "a withdrawn item contributes exactly one empty 'withdrawn' entry", "fail", ["§7", "§9"], ["#8"], wd);

  // §7 allows presentation injected into <description>: a prepended citation /
  // lineage line and the transclusion-provenance line. Remove any classed <p>
  // that is not itself part of content_html, then compare whitespace-normalized.
  const norm = (h) => h.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
  const latest = [];
  let injected = 0;
  for (const it of f.items) {
    const d = items[it.id];
    if (!d || it.kind === "withdrawn" || d.kind === "withdrawn") continue;
    const want = norm(d.content_html || "");
    let got = norm(it.description || "");
    if (got.includes(want)) continue;
    got = got.replace(/<p class="[^"]*">[\s\S]*?<\/p>/g, (p) => (want.includes(p) ? p : ""));
    if (got.includes(want)) { injected++; continue; }
    latest.push(`${it.id} v${it.version}: description does not carry the latest content_html (v${d.version})`);
  }
  if (injected) add("feed.injected-presentation", "descriptions carry injected presentation lines (permitted by §7)", "info", ["§7"], [], [`${injected} entr${injected === 1 ? "y carries" : "ies carry"} injected citation/provenance <p> elements inside or before content_html`]);
  add("feed.latest-content", "entries render the item's latest content_html", "fail", ["§7"], [], latest);

  const order = f.items.every((x, i) => !i || Date.parse(f.items[i - 1].pubDate) >= Date.parse(x.pubDate));
  add("feed.newest-first", "one entry per publish event, newest first", "warn", ["§7"], [], order ? [] : ["entries not in pubDate-descending order"]);
  add("feed.window", "window bounded (RECOMMENDED 50)", "warn", ["§7"], [], f.items.length > 50 ? [`${f.items.length} entries`] : []);
  const crIds = [...new Set(f.items.filter((it) => items[it.id]?.author?.name && it.kind !== "withdrawn" && !it.creator).map((it) => it.id))];
  const cr = crIds.length ? [`${crIds.length} item(s) with author.name have no <dc:creator> (xmlns:dc ${/xmlns:dc=/.test(a) ? "declared" : "not declared"})`] : [];
  add("feed.dc-creator", "dc:creator emitted when author.name present", "warn", ["§7"], ["#11"], cr);
  return { parsed: f, results: R };
}
