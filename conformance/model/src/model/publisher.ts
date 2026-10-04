// The publisher half of the reference model, written from docs/protocol-v0.3.md
// (not from blygger-studio's code). One Publisher = one origin's state plane
// (§5, §6.2, §8, §9) plus its notification plane (§7), served as files (§4).
import { contentHash } from "./sha256.ts";
import { escapeHtml, escapeXml, iso, renderParagraphs, rfc822, selectionOf, textContent } from "./text.ts";

export type Kind = "fragment" | "thread";
export interface Selector { exact: string }
/** §5.9 reference shape, as it appears in `transclusions[]` (§10.3). */
export interface TRef { id: string; version: number; origin?: string; selector?: Selector }
/** §10.6 / §5.6 — origin REQUIRED. */
export interface BlygRef { origin: string; id: string; version: number }

export interface VersionRec {
  version: number;
  kind: Kind | "withdrawn";
  content_md: string;
  content_html: string;
  content_hash: string;
  transclusions?: TRef[];
  stub_of?: BlygRef;
  at: number;
}
export interface ItemRec {
  id: string;
  authored: Kind;
  versions: VersionRec[];
  pinned: Set<number>;
  forked_from?: BlygRef;
  /** Creation-time stub target (§10.6 rule 3 "keeps the value set when the stub was created"). */
  stubTarget?: BlygRef;
}
export interface Served { status: number; body: string }

/** What a thread publish may resolve against (§10.2 step 2): the publisher's own imports. */
export interface ImportView {
  /** Usable imported rows for an id: current, or withdrawn with a pin-retained snapshot; never L0. */
  usable(id: string): { origin: string; version: number; html: string }[];
  /** Any non-L0 imported row at all (for error reasons only). */
  known(id: string): boolean;
}
export interface Capabilities {
  /** Understands the 2026-10-03 partial-transclusion grammar (§10.1, #49). */
  partial: boolean;
  /**
   * §10.2 step 1 reading. "spec-letter" (default): only a local *currently-
   * published* item stops resolution; a local draft or withdrawn item falls
   * through to imports ("otherwise an imported item"). "local-shadows": any
   * local item with that id (draft, withdrawn) is a publish error —
   * blygger-studio's reading.
   */
  resolution?: "spec-letter" | "local-shadows";
}

export type ResolveOutcome =
  | { ok: true; html: string; transclusions: TRef[] }
  | { ok: false; errors: { id: string; reason: string }[] };

let SEQ = 0;
export function resetClock() { SEQ = 0; }
function tick() { return ++SEQ; }

const DIRECTIVE = /^\s*!\[\[([0-9a-hjkmnp-tv-z]{26})\]\]\s*$/;
const QUOTE = /^\s*>/;

export class Publisher {
  readonly items = new Map<string, ItemRec>();
  /** Items whose first publish failed: a real client keeps them as drafts. */
  readonly drafts = new Set<string>();
  /** Window of feed entries (§7 RECOMMENDS 50; kept small so generators reach gaps). */
  feedWindow = 4;
  /** Rogue mode: fault injection of the origin's OWN dishonesty (#18b) — never used by honest-origin properties. */
  rewrites = 0;

  constructor(readonly origin: string, readonly caps: Capabilities = { partial: true }, public imports?: ImportView) {}

  latest(id: string): VersionRec | undefined {
    const it = this.items.get(id);
    return it?.versions[it.versions.length - 1];
  }

  /** §10.2 step 1: a local, currently-published item (fragment or thread). */
  private localPublished(id: string): VersionRec | undefined {
    const v = this.latest(id);
    return v && v.kind !== "withdrawn" ? v : undefined;
  }

  /** §10.2 local closure: ids reachable via stored transclusions[] of current versions, local entries only. */
  localClosure(start: string): Set<string> {
    const seen = new Set<string>();
    const q = [start];
    while (q.length) {
      const id = q.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const t of this.latest(id)?.transclusions ?? []) if (!t.origin && !seen.has(t.id)) q.push(t.id);
    }
    return seen;
  }

  /** §10.2 resolution order for one directive (C-10.2-01; closure check C-10.2-04). */
  resolveDirective(id: string, selfId: string): { ok: true; version: number; html: string; origin?: string } | { ok: false; reason: string } {
    const local = this.localPublished(id);
    if (local) {
      if (local.kind === "thread" && this.localClosure(id).has(selfId)) return { ok: false, reason: "closure" };
      return { ok: true, version: local.version, html: local.content_html };
    }
    // (Under "local-shadows" the publishing thread itself is a local draft too.)
    if (this.caps.resolution === "local-shadows" && (this.items.has(id) || this.drafts.has(id) || id === selfId)) return { ok: false, reason: this.items.has(id) ? "local-withdrawn" : "local-draft" };
    // Step 2 — "otherwise" an imported item. Note the spec's letter: a LOCAL item
    // that is a draft or withdrawn is not "currently-published", so resolution
    // falls through to imports rather than failing (see README, "For Fable").
    const usable = this.imports?.usable(id) ?? [];
    if (usable.length > 1) return { ok: false, reason: "ambiguous" };
    if (usable.length === 1) return { ok: true, version: usable[0].version, html: usable[0].html, origin: usable[0].origin };
    if (this.items.has(id)) return { ok: false, reason: "local-withdrawn" };
    return { ok: false, reason: this.imports?.known(id) ? "withdrawn-unretained" : "unknown" };
  }

  /** §10.1 + §10.2: walk the thread's markdown, bake snapshots, build provenance. */
  resolveThread(md: string, selfId: string): ResolveOutcome {
    const lines = md.split("\n");
    const parts: string[] = [];
    const trans: TRef[] = [];
    const errors: { id: string; reason: string }[] = [];
    let prose: string[] = [];
    const flush = () => { if (prose.length) { const h = renderParagraphs(prose.join("\n")); if (h) parts.push(h); prose = []; } };
    for (let i = 0; i < lines.length; i++) {
      const m = DIRECTIVE.exec(lines[i]);
      if (!m) { prose.push(lines[i]); continue; }
      flush();
      const id = m[1];
      let quote: string[] | null = null;
      if (this.caps.partial) {
        // §10.1: a directive immediately followed (no blank line) by a blockquote is partial.
        const run: string[] = [];
        while (i + 1 < lines.length && QUOTE.test(lines[i + 1])) run.push(lines[++i].replace(/^\s*>\s?/, ""));
        if (run.length) quote = run;
      }
      const r = this.resolveDirective(id, selfId);
      if (!r.ok) { errors.push({ id, reason: r.reason }); continue; }
      const originAttr = r.origin ? ` data-blyg-origin="${escapeHtml(r.origin)}"` : "";
      if (quote) {
        const exact = selectionOf(quote);
        // §10.2 (C-10.2-02): the selection MUST be a substring of the snapshot's text content.
        if (!exact || !textContent(r.html).includes(exact)) { errors.push({ id, reason: "selection-not-found" }); continue; }
        trans.push({ id, version: r.version, ...(r.origin ? { origin: r.origin } : {}), selector: { exact } });
        const body = exact.split("\n").map((l) => `<p>${escapeHtml(l)}</p>`).join("\n");
        parts.push(`<blockquote class="blyg-transclusion blyg-partial" data-blyg-id="${id}" data-blyg-version="${r.version}"${originAttr}>\n${body}\n</blockquote>`);
      } else {
        trans.push({ id, version: r.version, ...(r.origin ? { origin: r.origin } : {}) });
        parts.push(`<blockquote class="blyg-transclusion" data-blyg-id="${id}" data-blyg-version="${r.version}"${originAttr}>\n${r.html}\n</blockquote>`);
      }
    }
    flush();
    return errors.length ? { ok: false, errors } : { ok: true, html: parts.join("\n"), transclusions: trans };
  }

  /** §5.2 publish event: version +1, never on failure. */
  publish(id: string, kind: Kind, md: string, opts: { stubTarget?: BlygRef; forkedFrom?: BlygRef } = {}): { ok: true; version: number; rec: VersionRec } | { ok: false; errors: { id: string; reason: string }[] } {
    let item = this.items.get(id);
    const authored = item?.authored ?? kind;
    let html: string;
    let transclusions: TRef[] | undefined;
    if (authored === "thread") {
      const r = this.resolveThread(md, id);
      if (!r.ok) { if (!item) this.drafts.add(id); return r; }
      html = r.html;
      transclusions = r.transclusions;
    } else {
      html = renderParagraphs(md);
    }
    if (!item) {
      item = { id, authored, versions: [], pinned: new Set(), ...(opts.forkedFrom ? { forked_from: opts.forkedFrom } : {}), ...(opts.stubTarget ? { stubTarget: opts.stubTarget } : {}) };
      this.items.set(id, item);
    }
    let stub_of: BlygRef | undefined;
    if (authored === "thread" && item.stubTarget) {
      // §10.6 rule 3 (C-10.6-03), version agreement: the TARGET is (origin, id).
      const t = item.stubTarget;
      const baked = transclusions!.find((x) => x.id === t.id && (x.origin ?? this.origin) === t.origin);
      stub_of = baked ? { ...t, version: baked.version } : { ...t };
    }
    const rec: VersionRec = {
      version: item.versions.length + 1,
      kind: authored,
      content_md: md,
      content_html: html,
      content_hash: contentHash(md),
      ...(transclusions ? { transclusions } : {}),
      ...(stub_of ? { stub_of } : {}),
      at: tick(),
    };
    item.versions.push(rec);
    return { ok: true, version: rec.version, rec };
  }

  /** §9: the endcap. Only a published, not-already-withdrawn item. */
  withdraw(id: string): number | null {
    const item = this.items.get(id);
    const last = this.latest(id);
    if (!item || !last || last.kind === "withdrawn") return null;
    const rec: VersionRec = {
      version: last.version + 1, kind: "withdrawn", content_md: "", content_html: "", content_hash: contentHash(""),
      ...(item.authored === "thread" ? { transclusions: [] } : {}), at: tick(),
    };
    item.versions.push(rec);
    return rec.version;
  }

  /** §8 rule 2 (C-8-02, C-8-03; irrevocable C-8-01): any published version with content; never an endcap. Idempotent and irrevocable. */
  pin(id: string, n: number): boolean {
    const item = this.items.get(id);
    const v = item?.versions[n - 1];
    if (!item || !v || v.kind === "withdrawn") return false;
    item.pinned.add(n);
    return true;
  }

  /** ROGUE (#18b fault): roll the item back one version, or edit content without a bump. */
  rewrite(id: string, mode: "rollback" | "stealth"): boolean {
    const item = this.items.get(id);
    const last = this.latest(id);
    if (!item || !last) return false;
    this.rewrites++;
    if (mode === "rollback") {
      if (item.versions.length < 2) return false;
      item.versions.pop();
      for (const n of [...item.pinned]) if (n > item.versions.length) item.pinned.delete(n);
      return true;
    }
    if (last.kind === "withdrawn") return false;
    const md = last.content_md + " (stealth)";
    item.versions[item.versions.length - 1] = { ...last, content_md: md, content_html: renderParagraphs(md), content_hash: contentHash(md) };
    return true;
  }

  // ---------------- serving (§4) ----------------

  page(item: ItemRec): string { return `${item.authored === "thread" ? "t" : "f"}/${item.id}/`; }

  itemDoc(item: ItemRec): Record<string, unknown> {
    const v = item.versions[item.versions.length - 1];
    return {
      blyg: "0.3", id: item.id, kind: v.kind, origin: this.origin, page: this.page(item),
      created: iso(item.versions[0].at), updated: iso(v.at), version: v.version,
      content_md: v.content_md, content_html: v.content_html, content_hash: v.content_hash, media: [],
      changelog: item.versions.map((x) => ({ version: x.version, at: iso(x.at), note: null, ...(item.pinned.has(x.version) ? { pinned: true } : {}) })),
      ...(v.transclusions ? { transclusions: v.transclusions } : {}),
      ...(v.stub_of ? { stub_of: v.stub_of } : {}),
      ...(item.forked_from ? { forked_from: item.forked_from } : {}),
    };
  }

  pinDoc(item: ItemRec, n: number): Record<string, unknown> {
    const v = item.versions[n - 1];
    return {
      blyg: "0.3", id: item.id, kind: v.kind, version: n, at: iso(v.at), note: null, pinned: true, origin: this.origin,
      content_md: v.content_md, content_html: v.content_html, content_hash: v.content_hash,
      ...(v.transclusions ? { transclusions: v.transclusions } : {}),
      ...(v.stub_of ? { stub_of: v.stub_of } : {}),
      ...(item.forked_from ? { forked_from: item.forked_from } : {}),
    };
  }

  /** §6.2: complete by construction. */
  index(): { id: string; kind: string; version: number }[] {
    return [...this.items.values()].filter((i) => i.versions.length).map((i) => {
      const v = i.versions[i.versions.length - 1];
      return { id: i.id, kind: v.kind, version: v.version };
    });
  }

  /** §7: one entry per publish event, newest first; withdrawn items contribute only the endcap; pins emit nothing. */
  feedEvents(): { item: ItemRec; v: VersionRec }[] {
    const ev: { item: ItemRec; v: VersionRec }[] = [];
    for (const item of this.items.values()) {
      const last = item.versions[item.versions.length - 1];
      if (!last) continue;
      if (last.kind === "withdrawn") ev.push({ item, v: last });
      else for (const v of item.versions) if (v.kind !== "withdrawn") ev.push({ item, v });
    }
    return ev.sort((a, b) => b.v.at - a.v.at).slice(0, this.feedWindow);
  }

  feedXml(events = this.feedEvents()): string {
    const entries = events.map(({ item, v }) => {
      const latest = item.versions[item.versions.length - 1];
      return `    <item>
      <guid isPermaLink="false">blyg:${item.id}:v${v.version}</guid>
      <link>${escapeXml(this.origin + this.page(item))}</link>
      <title>${v.kind === "withdrawn" ? "withdrawn" : "entry"}</title>
      <description><![CDATA[${latest.content_html}]]></description>
      <pubDate>${rfc822(v.at)}</pubDate>
      <blyg:id>${item.id}</blyg:id>
      <blyg:kind>${v.kind}</blyg:kind>
      <blyg:version>${v.version}</blyg:version>
      <blyg:created>${iso(item.versions[0].at)}</blyg:created>
      <blyg:item>${escapeXml(this.origin)}items/${item.id}.json</blyg:item>
    </item>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:blyg="https://blygger.org/ns/0.1">
  <channel>
    <title>${escapeXml(this.origin)}</title>
    <link>${escapeXml(this.origin)}</link>
    <description></description>
    <blyg:manifest>${escapeXml(this.origin)}blyg.json</blyg:manifest>
${entries.join("\n")}
  </channel>
</rss>`;
  }

  /** §4 / §8.4: serve one origin-relative path. Unpinned history: 404 in every representation. */
  serve(path: string): Served {
    if (path === "feed.xml") return { status: 200, body: this.feedXml() };
    if (path === "items/index.json") return { status: 200, body: JSON.stringify({ updated: iso(SEQ), items: this.index() }) };
    if (path === "blyg.json") return { status: 200, body: JSON.stringify({ blyg: "0.3", site: this.origin, feed: "feed.xml", items: "items/index.json" }) };
    let m = /^items\/([0-9a-z]{26})\.json$/.exec(path);
    if (m) {
      const item = this.items.get(m[1]);
      return item?.versions.length ? { status: 200, body: JSON.stringify(this.itemDoc(item)) } : { status: 404, body: "" };
    }
    m = /^items\/([0-9a-z]{26})\/v(\d+)\.json$/.exec(path);
    if (m) {
      const item = this.items.get(m[1]);
      const n = Number(m[2]);
      return item && item.pinned.has(n) && item.versions[n - 1] ? { status: 200, body: JSON.stringify(this.pinDoc(item, n)) } : { status: 404, body: "" };
    }
    return { status: 404, body: "" };
  }
}
