// The world the command sequences drive: two model blyg origins (A, B), one
// legacy RSS origin (L), a network, and the node under test "S" — a client
// that both publishes (its own origin) and subscribes to A, B and L.
//
// S always exists as a reference-model twin. In differential runs S ALSO
// exists as the real blygger-studio (a StudioAdapter): every command that
// touches S is applied to both, and the two observations are compared.
import { flattenFork } from "./flatten.ts";
import { L0Origin } from "./l0origin.ts";
import { type Fault, type ModelFetch, Network } from "./network.ts";
import { type BlygRef, type Capabilities, type Kind, Publisher, resetClock, type Served, type TRef } from "./publisher.ts";
import { Reader } from "./reader.ts";
import { IDS, textContent, words } from "./text.ts";

export const A_ORIGIN = "https://a.example/";
export const B_ORIGIN = "https://b.example/";
export const L_ORIGIN = "https://legacy.example/";
/** blygger-studio's own origin under its test config (MOUNT=/blyg). */
export const S_ORIGIN = "https://example.com/blyg/";

export type OriginName = "A" | "B" | "S";
/** Slot tables: which pool id and which kind each origin's slots carry. Collisions are deliberate. */
export const SLOTS: Record<OriginName, { id: number; kind: Kind }[]> = {
  A: [{ id: 0, kind: "fragment" }, { id: 1, kind: "fragment" }, { id: 2, kind: "thread" }, { id: 3, kind: "thread" }],
  B: [{ id: 2, kind: "fragment" }, { id: 3, kind: "fragment" }, { id: 4, kind: "thread" }, { id: 5, kind: "fragment" }],
  S: [{ id: 3, kind: "fragment" }, { id: 6, kind: "thread" }, { id: 7, kind: "thread" }, { id: 5, kind: "thread" }],
};
/** Pool ids reserved for forks made at S. */
export const FORK_IDS = [8, 9];

export interface Dir { id: number; partial?: { from: number; len: number } | "bogus" }
export type Cmd =
  | { t: "pub"; o: "A" | "B"; slot: number; w: number; dirs: Dir[] }
  | { t: "spub"; slot: number; w: number; dirs: Dir[]; stub?: { o: OriginName; id: number } }
  | { t: "withdraw"; o: OriginName; slot: number }
  | { t: "pin"; o: OriginName; slot: number; back: number }
  | { t: "poll"; o: "A" | "B" | "L"; fault: Fault }
  | { t: "reconcile"; o: "A" | "B" }
  | { t: "fork"; o: OriginName; slot: number; back: number; into: number }
  | { t: "rogue"; slot: number; mode: "rollback" | "stealth" }
  | { t: "l0post"; w: number }
  | { t: "l0edit"; k: number; w: number };

export interface TraceEvent { lane: "A" | "B" | "L" | "S" | "reader" | "network" | "studio"; to?: string; label: string; kind?: "act" | "fetch" | "fail" | "diverge" }

/** What a client publishing as S must expose, model or studio. */
export interface ObsItemVersion { version: number; kind: string; transclusions?: TRef[]; stub_of?: BlygRef; html: string; md: string }
export interface ObsS {
  imports: Record<string, Record<string, { state: string; version: number; hash: string; retained: number | null; hasContent: boolean }>>;
  l0: Record<string, number>;
  flags: Record<string, string[]>;
  own: Record<string, { versions: ObsItemVersion[]; pinned: number[]; forked_from?: BlygRef }>;
}
export type PublishResult = { ok: true; version: number } | { ok: false; errors: { id: string; reason: string }[] };

export interface StudioAdapter {
  reset(): Promise<void>;
  publish(id: string, kind: Kind, md: string, stubTarget?: BlygRef): Promise<PublishResult>;
  withdraw(id: string): Promise<number | null>;
  pin(id: string, n: number): Promise<boolean>;
  poll(origin: string, fetch: ModelFetch): Promise<void>;
  reconcile(origin: string, fetch: ModelFetch): Promise<void>;
  fork(ref: BlygRef, newId: string, fetch: ModelFetch): Promise<PublishResult | { ok: false; refused: string }>;
  observe(): Promise<ObsS>;
  serve(path: string): Promise<Served>;
  version: string;
}

export interface WorldOpts {
  /** How S forks a thread: pre-#57 copies content_md and re-resolves; post-#57 flattens the pinned HTML (§16.6f). */
  forkMode?: "pre57" | "post57";
  /** Origin A's client capabilities (e.g. a publisher without the partial grammar). */
  aCaps?: Capabilities;
}

export interface ForkRecord { ref: BlygRef; newId: string; published: boolean; reason?: string }

export class World {
  readonly A: Publisher;
  readonly B = new Publisher(B_ORIGIN);
  readonly L = new L0Origin(L_ORIGIN);
  readonly net = new Network();
  readonly S: Publisher;
  readonly reader = new Reader({ retain: true });
  readonly forks: ForkRecord[] = [];
  /** Fork ids already attempted (a failed fork still leaves a draft behind in a real client). */
  readonly forkIdsUsed = new Set<string>();
  /** Studio fork outcomes, when a studio twin is attached. */
  readonly studioForks: ForkRecord[] = [];
  /** Pins that succeeded, with the bytes first served (P1: never disappear, never change). */
  readonly pinLedger = new Map<string, string>();
  /** Thread version bytes as first observed (P5). */
  readonly bakedLedger = new Map<string, string>();
  /** Studio-side pin successes (they may differ from the model's). */
  readonly studioPins = new Set<string>();
  /** Last publish outcomes, for D2. */
  lastPublish?: { model: PublishResult; studio?: PublishResult | { ok: false; refused: string } };
  events: TraceEvent[] = [];
  step = 0;
  readonly stubFor = new Map<string, BlygRef | undefined>();

  constructor(readonly caps: Capabilities = { partial: true }, readonly studio?: StudioAdapter, readonly opts: WorldOpts = {}) {
    resetClock();
    this.A = new Publisher(A_ORIGIN, opts.aCaps ?? { partial: true });
    this.S = new Publisher(S_ORIGIN, caps, this.reader.importView());
    this.net.add(this.A);
    this.net.add(this.B);
    this.net.add(this.L);
    this.net.add(this.S);
    this.reader.subscribe(A_ORIGIN);
    this.reader.subscribe(B_ORIGIN);
    this.reader.subscribe(L_ORIGIN, "rss");
  }

  pub(o: OriginName): Publisher { return o === "A" ? this.A : o === "B" ? this.B : this.S; }
  origin(o: "A" | "B" | "L"): string { return o === "A" ? A_ORIGIN : o === "B" ? B_ORIGIN : L_ORIGIN; }

  /** Thread markdown: a prose line, then each directive (optionally with an attached quote). */
  buildMd(p: Publisher, selfId: string, w: number, dirs: Dir[]): string {
    const out = [words(w, 3)];
    for (const d of dirs) {
      const id = IDS[d.id];
      out.push("", `![[${id}]]`);
      if (d.partial === "bogus") out.push("> nothing like this appears anywhere");
      else if (d.partial) {
        const r = p.resolveDirective(id, selfId);
        const line = r.ok ? textContent(r.html).split("\n")[0] ?? "" : "";
        const ws = line.split(" ");
        const from = d.partial.from % Math.max(1, ws.length);
        const sel = ws.slice(from, from + 1 + (d.partial.len % 3)).join(" ");
        out.push(`> ${sel || "unresolvable target"}`);
      }
    }
    out.push("", `closing ${words(w + 7, 2)}`);
    return out.join("\n");
  }

  private ev(e: TraceEvent) { this.events.push(e); }

  async apply(cmd: Cmd): Promise<TraceEvent[]> {
    this.step++;
    this.events = [];
    const st = this.studio;
    this.lastPublish = undefined;
    switch (cmd.t) {
      case "pub": {
        const p = this.pub(cmd.o);
        const slot = SLOTS[cmd.o][cmd.slot % 4];
        const id = IDS[slot.id];
        const md = slot.kind === "thread" ? this.buildMd(p, id, cmd.w, cmd.dirs.map((d) => ({ ...d, id: SLOTS[cmd.o][d.id % 4].id }))) : `${words(cmd.w, 5)} n${cmd.w}`;
        const r = p.publish(id, slot.kind, md);
        this.ev({ lane: cmd.o, kind: r.ok ? "act" : "fail", label: r.ok ? `publish ${short(id)} v${r.version}` : `publish ${short(id)} refused (${r.errors.map((e) => e.reason).join(",")})` });
        break;
      }
      case "spub": {
        const slot = SLOTS.S[cmd.slot % 4];
        const id = IDS[slot.id];
        const md = slot.kind === "thread" ? this.buildMd(this.S, id, cmd.w, cmd.dirs) : `${words(cmd.w, 5)} s${cmd.w}`;
        let stubTarget: BlygRef | undefined;
        if (slot.kind === "thread" && !this.S.items.has(id)) {
          // The stub target is fixed when the item is created (first attempt), as a real draft keeps it.
          if (!this.stubFor.has(id)) this.stubFor.set(id, cmd.stub ? this.stubTarget(cmd.stub) : undefined);
          stubTarget = this.stubFor.get(id);
        }
        const r = this.S.publish(id, slot.kind, md, { stubTarget });
        const m: PublishResult = r.ok ? { ok: true, version: r.version } : r;
        this.ev({ lane: "S", kind: r.ok ? "act" : "fail", label: r.ok ? `publish ${short(id)} v${r.version}${stubTarget ? " (stub)" : ""}` : `publish ${short(id)} refused (${r.errors.map((e) => e.reason).join(",")})` });
        this.lastPublish = { model: m };
        if (st) {
          // Only send the stub target when the studio is also creating the item.
          const s = await st.publish(id, slot.kind, md, stubTarget);
          this.lastPublish.studio = s;
          this.ev({ lane: "studio", kind: s.ok ? "act" : "fail", label: s.ok ? `studio publish ${short(id)} v${s.version}` : `studio refused (${s.errors.map((e) => e.reason).join("; ").slice(0, 80)})` });
        }
        break;
      }
      case "withdraw": {
        const p = this.pub(cmd.o);
        const id = IDS[SLOTS[cmd.o][cmd.slot % 4].id];
        const v = p.withdraw(id);
        this.ev({ lane: cmd.o, kind: v ? "act" : "fail", label: v ? `withdraw ${short(id)} (endcap v${v})` : `withdraw ${short(id)}: n/a` });
        if (cmd.o === "S" && st) await st.withdraw(id);
        break;
      }
      case "pin": {
        const p = this.pub(cmd.o);
        const id = IDS[SLOTS[cmd.o][cmd.slot % 4].id];
        const latest = p.latest(id)?.version ?? 0;
        const n = latest - (cmd.back % Math.max(1, latest));
        if (n < 1) { this.ev({ lane: cmd.o, kind: "fail", label: `pin ${short(id)}: nothing published` }); if (cmd.o === "S" && st) await st.pin(id, 1); break; }
        const ok = p.pin(id, n);
        if (ok) { const key = `${p.origin}|${id}|${n}`; if (!this.pinLedger.has(key)) this.pinLedger.set(key, p.serve(`items/${id}/v${n}.json`).body); }
        this.ev({ lane: cmd.o, kind: ok ? "act" : "fail", label: ok ? `pin ${short(id)} v${n}` : `pin ${short(id)} v${n} refused (endcap)` });
        if (cmd.o === "S" && st) { const sok = await st.pin(id, n); if (sok) this.studioPins.add(`${id}|${n}`); }
        break;
      }
      case "poll": {
        const origin = this.origin(cmd.o);
        this.ev({ lane: "reader", to: cmd.o, kind: "fetch", label: `poll ${cmd.o}${cmd.fault.kind !== "none" ? ` [${faultLabel(cmd.fault)}]` : ""}` });
        await this.reader.poll(origin, this.netFetch("model", cmd.fault));
        if (st) await st.poll(origin, this.netFetch("studio", cmd.fault));
        break;
      }
      case "reconcile": {
        const origin = this.origin(cmd.o);
        this.ev({ lane: "reader", to: cmd.o, kind: "fetch", label: `index diff ${cmd.o} (clean)` });
        await this.reader.reconcile(origin, this.netFetch("model", { kind: "none" }));
        if (st) await st.reconcile(origin, this.netFetch("studio", { kind: "none" }));
        break;
      }
      case "fork": {
        const p = this.pub(cmd.o);
        const slot = SLOTS[cmd.o][cmd.slot % 4];
        const id = IDS[slot.id];
        const latest = p.latest(id)?.version ?? 0;
        // A fork names a pinned version (§5.6 rule 2); `back` picks among the pins, newest first.
        const pins = [...(p.items.get(id)?.pinned ?? [])].sort((a, b) => b - a);
        const n = pins.length ? pins[cmd.back % pins.length] : Math.max(1, latest);
        const newId = IDS[FORK_IDS[cmd.into % FORK_IDS.length]];
        if (this.forkIdsUsed.has(newId)) break;
        const ref: BlygRef = { origin: p.origin, id, version: n };
        const fetch = this.netFetch("model", { kind: "none" });
        const res = await fetch(`${p.origin}items/${id}/v${n}.json`);
        if (res.status !== 200) {
          this.ev({ lane: "S", to: cmd.o, kind: "fail", label: `fork ${short(id)}@v${n} refused (not pinned)` });
          if (st) await st.fork(ref, newId, this.netFetch("studio", { kind: "none" }));
          break;
        }
        this.forkIdsUsed.add(newId);
        const doc = JSON.parse(res.body);
        // pre-#57: copy content_md and re-resolve at the forker. post-#57 (§16.6f): flatten the pinned document.
        const flat = doc.kind === "thread" && this.opts.forkMode === "post57" ? flattenFork(doc.content_md, doc.content_html, p.origin) : null;
        const r = this.S.publish(newId, doc.kind as Kind, flat ? flat.md : doc.content_md, { forkedFrom: ref });
        this.forks.push({ ref, newId, published: r.ok, ...(r.ok ? {} : { reason: r.errors.map((e) => e.reason).join(",") }) });
        this.ev({ lane: "S", to: cmd.o, kind: r.ok ? "act" : "fail", label: r.ok ? `fork ${short(id)}@v${n} → ${short(newId)} published` : `fork ${short(id)}@v${n} unpublishable at S (${r.errors.map((e) => e.reason).join(",")})` });
        this.lastPublish = { model: r.ok ? { ok: true, version: r.version } : r };
        if (st) {
          const s = await st.fork(ref, newId, this.netFetch("studio", { kind: "none" }));
          this.lastPublish.studio = s;
          this.studioForks.push({ ref, newId, published: s.ok });
        }
        break;
      }
      case "rogue": {
        const id = IDS[SLOTS.A[cmd.slot % 4].id];
        const ok = this.A.rewrite(id, cmd.mode);
        this.ev({ lane: "A", kind: ok ? "fail" : "act", label: ok ? `ROGUE ${cmd.mode} ${short(id)} (now v${this.A.latest(id)?.version})` : `rogue ${cmd.mode}: n/a` });
        break;
      }
      case "l0post": {
        const g = this.L.post(words(cmd.w, 4));
        this.ev({ lane: "L", label: `post ${g.slice(L_ORIGIN.length)}` });
        break;
      }
      case "l0edit": {
        const g = this.L.edit(cmd.k, words(cmd.w, 4) + " edited");
        this.ev({ lane: "L", label: g ? `edit ${g.slice(L_ORIGIN.length)} (same guid)` : "edit: n/a" });
        break;
      }
    }
    this.recordBaked();
    return this.events;
  }

  private stubTarget(s: { o: OriginName; id: number }): BlygRef | undefined {
    const id = IDS[SLOTS[s.o][s.id % 4].id]; // stub targets are drawn from the named origin's own slots
    if (s.o === "S") { const v = this.S.latest(id); return v && v.kind !== "withdrawn" ? { origin: S_ORIGIN, id, version: v.version } : undefined; }
    const l = this.reader.subs.get(this.origin(s.o))!.items.get(id);
    return l?.state === "current" ? { origin: this.origin(s.o), id, version: l.version } : undefined;
  }

  netFetch(reader: string, fault: Fault): ModelFetch {
    const f = this.net.fetcher(reader, fault, IDS);
    return async (url) => {
      const r = await f(url);
      const o = url.startsWith(A_ORIGIN) ? "A" : url.startsWith(B_ORIGIN) ? "B" : url.startsWith(L_ORIGIN) ? "L" : "S";
      const last = this.net.log[this.net.log.length - 1];
      this.ev({ lane: "network", to: reader === "studio" ? "studio" : "reader", kind: "fetch", label: `${reader}: GET ${o}/${url.split("/").slice(3).join("/").replace(/zz0+/g, "#")} → ${r.status}${last?.note ? ` (${last.note})` : ""}` });
      return r;
    };
  }

  private recordBaked() {
    for (const p of [this.A, this.B, this.S])
      for (const it of p.items.values())
        for (const v of it.versions)
          if (v.kind === "thread") { const k = `${p.origin}|${it.id}|${v.version}`; if (!this.bakedLedger.has(k)) this.bakedLedger.set(k, v.content_html); }
  }

  /** The model twin's observation of S, in the shared shape. */
  observeModel(): ObsS {
    const imports: ObsS["imports"] = {};
    const flags: ObsS["flags"] = {};
    const l0: ObsS["l0"] = {};
    for (const sub of this.reader.subs.values()) {
      flags[sub.origin] = [...new Set(sub.flags.map((f) => f.type))].sort();
      if (sub.kind === "rss") { for (const x of sub.l0.values()) l0[x.link] = x.version; continue; }
      const m: ObsS["imports"][string] = {};
      for (const [id, l] of sub.items) m[id] = { state: l.state, version: l.version, hash: l.state === "current" ? l.content_hash : (l.retained?.content_hash ?? ""), retained: l.retained?.version ?? null, hasContent: l.state === "current" ? true : !!l.retained };
      imports[sub.origin] = m;
    }
    const own: ObsS["own"] = {};
    for (const it of this.S.items.values())
      own[it.id] = {
        versions: it.versions.map((v) => ({ version: v.version, kind: v.kind, ...(v.transclusions ? { transclusions: v.transclusions } : {}), ...(v.stub_of ? { stub_of: v.stub_of } : {}), html: v.content_html, md: v.content_md })),
        pinned: [...it.pinned].sort((a, b) => a - b),
        ...(it.forked_from ? { forked_from: it.forked_from } : {}),
      };
    return { imports, l0, flags, own };
  }
}

export function short(id: string): string { return "#" + id.replace(/^zz0+/, ""); }
export function faultLabel(f: Fault): string {
  switch (f.kind) {
    case "item5xx": return `5xx on item #${IDS[f.idx % IDS.length].slice(-1)}`;
    case "dropEntries": return `drop entries mask ${f.mask.toString(2)}`;
    case "reorder": return `reorder +${f.rot}`;
    default: return f.kind;
  }
}
export function describeCmd(c: Cmd): string {
  switch (c.t) {
    case "pub": return `${c.o}.publish(slot ${c.slot % 4} = ${short(IDS[SLOTS[c.o][c.slot % 4].id])}${SLOTS[c.o][c.slot % 4].kind === "thread" ? `, quotes [${c.dirs.map((d) => short(IDS[SLOTS[c.o][d.id % 4].id]) + (d.partial ? (d.partial === "bogus" ? " (bogus partial)" : " (partial)") : "")).join(", ")}]` : ""})`;
    case "spub": return `S.publish(${short(IDS[SLOTS.S[c.slot % 4].id])}${SLOTS.S[c.slot % 4].kind === "thread" ? `, quotes [${c.dirs.map((d) => short(IDS[d.id]) + (d.partial ? (d.partial === "bogus" ? " (bogus partial)" : " (partial)") : "")).join(", ")}]${c.stub ? `, stub_of ${c.stub.o}:${short(IDS[SLOTS[c.stub.o][c.stub.id % 4].id])}` : ""}` : ""})`;
    case "withdraw": return `${c.o}.withdraw(${short(IDS[SLOTS[c.o][c.slot % 4].id])})`;
    case "pin": return `${c.o}.pin(${short(IDS[SLOTS[c.o][c.slot % 4].id])}, latest-${c.back})`;
    case "poll": return `S polls ${c.o} [${faultLabel(c.fault)}]`;
    case "reconcile": return `S index-diffs ${c.o} (clean)`;
    case "fork": return `S forks ${c.o}:${short(IDS[SLOTS[c.o][c.slot % 4].id])} @ pin #${c.back} → ${short(IDS[FORK_IDS[c.into % 2]])}`;
    case "rogue": return `A ROGUE ${c.mode} ${short(IDS[SLOTS.A[c.slot % 4].id])}`;
    case "l0post": return `L posts`;
    case "l0edit": return `L edits entry ${c.k} under same guid`;
  }
}
