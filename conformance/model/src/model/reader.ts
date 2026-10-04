// The reader/importer half of the reference model — §13, decisions #18a–d.
import { contentHash } from "./sha256.ts";
import type { ModelFetch } from "./network.ts";
import type { ImportView, TRef } from "./publisher.ts";

export interface Local {
  state: "current" | "tombstone";
  /** §13.3: the watermark — highest version ever observed. */
  version: number;
  kind: string;
  content_md: string;
  content_html: string;
  content_hash: string;
  transclusions?: TRef[];
  /** §13.4: a pin-retained snapshot past withdrawal. */
  retained?: { version: number; content_html: string; content_hash: string };
}
export interface L0Local { version: number; content: string; link: string }
export type FlagType = "regression" | "stealth-edit" | "unparseable" | "unknown-kind" | "hash-mismatch" | "lossy-mode";
export interface Flag { type: FlagType; id?: string }

export interface Sub {
  origin: string;
  kind: "blyg" | "rss";
  items: Map<string, Local>;
  l0: Map<string, L0Local>;
  newestGuid?: string;
  /** Has a full index diff ever completed (first subscribe falls back to one, §13.2). */
  synced: boolean;
  flags: Flag[];
}

export interface ReaderPolicy {
  /** §13.4 MAY retain pinned content past withdrawal. */
  retain: boolean;
}

interface FeedEntry { guid?: string; link?: string; title?: string; description?: string; id?: string; version?: number; itemUrl?: string }

/** Lenient RSS item extraction; null = unparseable feed (§13.2 "skips the trigger"). */
export function parseFeedModel(xml: string): FeedEntry[] | null {
  if (!/<rss[\s>][\s\S]*<\/rss>\s*$/.test(xml.trim())) return null;
  const tag = (s: string, t: string) => { const m = new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`).exec(s); return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() : undefined; };
  return (xml.match(/<item>[\s\S]*?<\/item>/g) ?? []).map((s) => {
    const v = tag(s, "blyg:version");
    return { guid: tag(s, "guid"), link: tag(s, "link"), title: tag(s, "title"), description: tag(s, "description"), id: tag(s, "blyg:id"), version: v ? Number(v) : undefined, itemUrl: tag(s, "blyg:item") };
  });
}

const unescape = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

export class Reader {
  readonly subs = new Map<string, Sub>();
  /** Every lower-than-watermark document this reader was handed (for P3's "surfaced" half). */
  readonly regressionsSeen: { origin: string; id: string; got: number; watermark: number }[] = [];

  constructor(readonly policy: ReaderPolicy = { retain: true }) {}

  subscribe(origin: string, kind: "blyg" | "rss" = "blyg") {
    if (!this.subs.has(origin)) this.subs.set(origin, { origin, kind, items: new Map(), l0: new Map(), synced: false, flags: [] });
  }

  /** §13.3 + §13.4 — the item-document transition. Only a fetched document advances state (§13.2). */
  private async apply(sub: Sub, id: string, raw: unknown, fetch: ModelFetch) {
    const d = raw as Record<string, unknown>;
    if (!d || typeof d !== "object" || typeof d.version !== "number" || typeof d.id !== "string") { sub.flags.push({ type: "unparseable", id }); return; }
    if (d.kind !== "fragment" && d.kind !== "thread" && d.kind !== "withdrawn") { sub.flags.push({ type: "unknown-kind", id }); return; }
    const local = sub.items.get(id);
    const wm = local?.version ?? 0;
    const md = String(d.content_md ?? "");
    const hash = String(d.content_hash ?? "");
    if (hash && hash !== contentHash(md)) sub.flags.push({ type: "hash-mismatch", id });
    if (d.version < wm) {
      // §13.3 (C-13.3-01): MUST NOT silently adopt; SHOULD surface.
      this.regressionsSeen.push({ origin: sub.origin, id, got: d.version, watermark: wm });
      sub.flags.push({ type: "regression", id });
      return;
    }
    if (local && d.version === wm) {
      if ((local.state === "current") !== (d.kind !== "withdrawn")) return; // not a row the spec names; ignore
      if (hash === local.content_hash) return;
      // Stealth edit (C-13.3-02): adopt content, surface, watermark unchanged.
      sub.flags.push({ type: "stealth-edit", id });
      if (local.state === "current") Object.assign(local, { content_md: md, content_html: String(d.content_html ?? ""), content_hash: hash });
      return;
    }
    if (d.kind === "withdrawn") {
      // §13.4 (C-13.4-01, C-13.4-02): roll up to null; retention follows the origin's own serving surface.
      let retained: Local["retained"];
      if (local?.state === "current" && this.policy.retain) {
        const res = await fetch(`${sub.origin}items/${id}/v${local.version}.json`);
        if (res.status === 200) {
          const pin = JSON.parse(res.body);
          if (pin.content_hash === local.content_hash) retained = { version: local.version, content_html: local.content_html, content_hash: local.content_hash };
        }
      } else if (local?.state === "tombstone") retained = local.retained;
      sub.items.set(id, { state: "tombstone", version: d.version, kind: local?.kind ?? "fragment", content_md: "", content_html: "", content_hash: "", ...(retained ? { retained } : {}) });
      return;
    }
    sub.items.set(id, {
      state: "current", version: d.version, kind: d.kind, content_md: md, content_html: String(d.content_html ?? ""), content_hash: hash,
      ...(Array.isArray(d.transclusions) ? { transclusions: d.transclusions as TRef[] } : {}),
    });
  }

  private async processCandidate(sub: Sub, id: string, url: string, fetch: ModelFetch): Promise<boolean> {
    const res = await fetch(url);
    if (res.status !== 200) return false;
    let raw: unknown;
    try { raw = JSON.parse(res.body); } catch { sub.flags.push({ type: "unparseable", id }); return false; }
    await this.apply(sub, id, raw, fetch);
    return true;
  }

  /** §13.2 index diff: total reconciliation. Synced only when every candidate fetch succeeded. */
  async reconcile(origin: string, fetch: ModelFetch): Promise<boolean> {
    const sub = this.subs.get(origin)!;
    const res = await fetch(`${origin}items/index.json`);
    if (res.status !== 200) { if (res.status === 404) sub.flags.push({ type: "lossy-mode" }); return false; }
    let idx: { items?: { id: string; version: number }[] };
    try { idx = JSON.parse(res.body); } catch { return false; }
    let all = true;
    for (const e of idx.items ?? []) {
      if (typeof e?.id !== "string" || typeof e.version !== "number") continue;
      if (e.version > (sub.items.get(e.id)?.version ?? 0)) all = (await this.processCandidate(sub, e.id, `${origin}items/${e.id}.json`, fetch)) && all;
    }
    if (all) sub.synced = true;
    return all;
  }

  /** §13.2 poll: the feed is a cheap trigger; gaps and first subscribe fall back to the index. */
  async poll(origin: string, fetch: ModelFetch): Promise<void> {
    const sub = this.subs.get(origin)!;
    if (sub.kind === "rss") return this.pollL0(sub, fetch);
    const res = await fetch(`${origin}feed.xml`);
    if (res.status !== 200) return; // poll failures MUST NOT alter stored item state
    const entries = parseFeedModel(res.body);
    if (entries) {
      for (const e of entries) {
        if (!e.id) continue;
        if (e.version !== undefined && e.version <= (sub.items.get(e.id)?.version ?? 0)) continue;
        await this.processCandidate(sub, e.id, e.itemUrl ?? `${origin}items/${e.id}.json`, fetch);
      }
    }
    const gap = !!sub.newestGuid && !!entries && !entries.some((e) => e.guid === sub.newestGuid);
    if (!entries || gap || !sub.synced) await this.reconcile(origin, fetch);
    if (entries?.[0]?.guid) sub.newestGuid = entries[0].guid;
  }

  /** §13.6: summary + link, synthetic origin-scoped id, edit = local version bump, nothing ever removed. */
  private async pollL0(sub: Sub, fetch: ModelFetch) {
    const res = await fetch(`${sub.origin}feed.xml`);
    if (res.status !== 200) return;
    const entries = parseFeedModel(res.body);
    if (!entries) return;
    for (const e of entries) {
      const key = e.guid ?? e.link;
      if (!key) continue;
      const content = `${unescape(e.title ?? "")}|${unescape(e.description ?? "")}`;
      const local = sub.l0.get(key);
      if (local && local.content === content) continue;
      sub.l0.set(key, { version: (local?.version ?? 0) + 1, content, link: unescape(e.link ?? "") });
    }
  }

  /** §10.2 step 2 view for this reader's own publisher. L0 rows are never sources (§13.6). */
  importView(): ImportView {
    return {
      usable: (id) => {
        const out: { origin: string; version: number; html: string }[] = [];
        for (const sub of this.subs.values()) {
          if (sub.kind !== "blyg") continue;
          const l = sub.items.get(id);
          if (l?.state === "current") out.push({ origin: sub.origin, version: l.version, html: l.content_html });
          else if (l?.retained) out.push({ origin: sub.origin, version: l.retained.version, html: l.retained.content_html });
        }
        return out;
      },
      known: (id) => [...this.subs.values()].some((s) => s.kind === "blyg" && s.items.has(id)),
    };
  }
}
