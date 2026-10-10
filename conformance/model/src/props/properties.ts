// The properties, each a check run after EVERY command. A check returns null
// (holds) or a one-line description of the violation. Checks are written over
// the shared observation shape (ObsS), so the same check runs against the
// reference model's S and against the real blygger-studio's S.
import { elLines, ownProseLines, parse, quotesWithOrigin, topLevelQuotes } from "../model/flatten.ts";
import type { Served, TRef } from "../model/publisher.ts";
import { textContent } from "../model/text.ts";
import { type Cmd, type ObsS, S_ORIGIN, type World } from "../model/world.ts";

export interface Ctx {
  world: World;
  subject: "model" | "studio";
  obs: ObsS;
  prev: ObsS;
  /** The model twin's observation (equal to obs in model-only runs). */
  modelObs: ObsS;
  cmd: Cmd;
  serveS(path: string): Promise<Served>;
  /** Model reader regressions seen before / after this step. */
  regBefore: number;
  regAfter: number;
  /** Per-subject memory across steps of one run. */
  mem: { pinBodies: Map<string, string>; baked: Map<string, string> };
  /** Non-vacuous evaluations, for the coverage table. */
  hit(id: string): void;
}

export interface PropDef {
  id: string;
  title: string;
  spec_refs: string[];
  decisions: string[];
  /** Expected to FAIL (the property encodes an intent the spec does not guarantee). */
  expectFail?: boolean;
  /** Differential-only (needs a studio twin). */
  differential?: boolean;
  check(c: Ctx): Promise<string | null>;
}

const hashOf = (body: string) => { try { return JSON.parse(body).content_hash as string; } catch { return ""; } };

/** Transclusion entries compared on what the spec makes load-bearing: id, version, origin, selector.exact. */
export function normT(list: TRef[] | undefined, selfOrigin: string): string[] {
  return (list ?? []).map((t) => `${t.origin ?? selfOrigin}|${t.id}|v${t.version}${t.selector ? `|sel:${t.selector.exact}` : ""}`);
}

function originPub(w: World, origin: string) {
  return origin === w.A.origin ? w.A : origin === w.B.origin ? w.B : undefined;
}

async function serveAt(c: Ctx, origin: string, path: string): Promise<Served> {
  if (origin === S_ORIGIN) return c.serveS(path);
  return originPub(c.world, origin)?.serve(path) ?? { status: 404, body: "" };
}

export const PROPS: PropDef[] = [
  {
    id: "P1",
    title: "Served ⊆ live ∪ pinned; pins never disappear or change",
    spec_refs: ["§8", "§8.4", "§9", "§4"],
    decisions: ["#8", "#24", "#25"],
    async check(c) {
      for (const p of [c.world.A, c.world.B]) {
        for (const it of p.items.values()) {
          for (let n = 1; n <= it.versions.length + 1; n++) {
            const s = p.serve(`items/${it.id}/v${n}.json`);
            if (s.status === 200 && !it.pinned.has(n)) return `${p.origin} serves unpinned v${n} of ${it.id}`;
          }
        }
      }
      for (const [k, body] of c.world.pinLedger) {
        const [origin, id, n] = k.split("|");
        if (origin === S_ORIGIN && c.subject === "studio") continue;
        const s = await serveAt(c, origin, `items/${id}/v${n}.json`);
        c.hit("P1");
        if (s.status !== 200) return `pin ${origin} ${id} v${n} disappeared (${s.status})`;
        if (hashOf(s.body) !== hashOf(body)) return `pin ${origin} ${id} v${n} changed bytes`;
      }
      for (const [id, it] of Object.entries(c.obs.own)) {
        const latest = it.versions.length;
        const live = await c.serveS(`items/${id}.json`);
        if (latest && (live.status !== 200 || JSON.parse(live.body).version !== latest)) return `S live doc for ${id} is not v${latest} (${live.status})`;
        for (let n = 1; n <= latest + 1; n++) {
          const s = await c.serveS(`items/${id}/v${n}.json`);
          const pinned = it.pinned.includes(n);
          if (s.status === 200 && !pinned) return `S serves unpinned v${n} of ${id}`;
          if (pinned) {
            const k = `${id}|${n}`;
            c.hit("P1");
            if (s.status !== 200) return `S pin ${id} v${n} disappeared (${s.status})`;
            const prior = c.mem.pinBodies.get(k);
            if (prior === undefined) c.mem.pinBodies.set(k, hashOf(s.body));
            else if (prior !== hashOf(s.body)) return `S pin ${id} v${n} changed bytes`;
          }
        }
      }
      return null;
    },
  },
  {
    id: "P2",
    title: "Reader converges to the origin's index after a clean index diff",
    spec_refs: ["§13.2", "§6.2", "§13.1"],
    decisions: ["#18a"],
    async check(c) {
      if (c.cmd.t !== "reconcile") return null;
      return convergence(c, c.cmd.o);
    },
  },
  {
    id: "P2b",
    title: "Reader converges after a clean FEED poll (informative — the feed is lossy by design)",
    spec_refs: ["§13.2", "§7"],
    decisions: ["#18a"],
    expectFail: true,
    async check(c) {
      if (c.cmd.t !== "poll" || c.cmd.o === "L" || c.cmd.fault.kind !== "none") return null;
      return convergence(c, c.cmd.o);
    },
  },
  {
    id: "P3",
    title: "Watermark never silently regresses; a history rewrite is surfaced",
    spec_refs: ["§13.3", "§5.2"],
    decisions: ["#18b", "#19"],
    async check(c) {
      for (const [o, m] of Object.entries(c.prev.imports)) {
        for (const [id, l] of Object.entries(m)) {
          const now = c.obs.imports[o]?.[id];
          c.hit("P3");
          if (!now) return `${o} ${id} vanished from the reader (watermark lost)`;
          if (now.version < l.version) return `${o} ${id} watermark regressed v${l.version} → v${now.version}`;
        }
      }
      if (c.regAfter > c.regBefore) {
        const ev = c.world.reader.regressionsSeen.slice(c.regBefore);
        for (const e of ev) {
          c.hit("P3");
          if (!(c.obs.flags[e.origin] ?? []).includes("regression")) return `lower version v${e.got} < watermark v${e.watermark} for ${e.id} was not surfaced`;
        }
      }
      return null;
    },
  },
  {
    id: "P4",
    title: "Reader retains nothing past withdrawal that the origin does not serve",
    spec_refs: ["§13.4", "§8", "§9"],
    decisions: ["#18c", "#8"],
    async check(c) {
      for (const [o, m] of Object.entries(c.obs.imports)) {
        for (const [id, l] of Object.entries(m)) {
          if (l.state !== "tombstone") continue;
          if (!l.hasContent) continue;
          c.hit("P4");
          if (l.retained == null) return `${id} from ${o} is withdrawn but content is still held, with no pin named`;
          const s = await serveAt(c, o, `items/${id}/v${l.retained}.json`);
          if (s.status !== 200) return `${id} from ${o}: retained v${l.retained} but the origin serves ${s.status} for it`;
          if (l.hash && hashOf(s.body) !== l.hash) return `${id} from ${o}: retained bytes differ from the pinned v${l.retained}`;
        }
      }
      return null;
    },
  },
  {
    id: "P5",
    title: "Snapshot independence: a thread's published bytes never change",
    spec_refs: ["§10.4", "§10.2", "§9"],
    decisions: ["#9", "#26"],
    async check(c) {
      for (const [k, html] of c.world.bakedLedger) {
        if (k.startsWith(S_ORIGIN)) continue;
        const [origin, id, n] = k.split("|");
        const v = originPub(c.world, origin)?.items.get(id)?.versions[Number(n) - 1];
        if (v && v.content_html !== html) return `${origin} ${id} v${n} bytes changed after publish`;
      }
      for (const [id, it] of Object.entries(c.obs.own)) {
        for (const v of it.versions) {
          if (v.kind !== "thread") continue;
          const k = `${id}|${v.version}`;
          const prior = c.mem.baked.get(k);
          c.hit("P5");
          if (prior === undefined) c.mem.baked.set(k, v.html);
          else if (prior !== v.html) return `S thread ${id} v${v.version} bytes changed after publish`;
        }
      }
      return null;
    },
  },
  {
    id: "P6",
    title: "Pre-#57 fork faithfulness: a fork that copies content_md and re-resolves bakes the same quotes as the pinned source",
    spec_refs: ["§5.6", "§10.2", "§10.1"],
    decisions: ["#26", "#49"],
    expectFail: true,
    async check(c) {
      const forks = c.subject === "studio" ? c.world.studioForks : c.world.forks;
      for (const f of forks) {
        if (!f.published) continue;
        const mine = c.obs.own[f.newId]?.versions[0];
        if (!mine || mine.kind !== "thread") continue;
        const src = await serveAt(c, f.ref.origin, `items/${f.ref.id}/v${f.ref.version}.json`);
        if (src.status !== 200) continue;
        const doc = JSON.parse(src.body);
        c.hit("P6");
        const a = normT(doc.transclusions, f.ref.origin).join(" ; ");
        const b = normT(mine.transclusions, S_ORIGIN).join(" ; ");
        if (a !== b) return `fork ${f.newId} of ${f.ref.origin}${f.ref.id}@v${f.ref.version}: source pin baked [${a}] but the fork baked [${b}]`;
      }
      return null;
    },
  },
  {
    id: "P6post",
    title: "Post-#57 fork of a thread: quote text = the pin's baked text, nothing re-resolves, no wire token survives, own prose byte-exact",
    spec_refs: ["§16.6f", "§5.6", "§10.2"],
    decisions: ["#57", "#49"],
    async check(c) {
      const forks = c.subject === "studio" ? c.world.studioForks : c.world.forks;
      for (const f of forks) {
        if (!f.published) continue;
        const mine = c.obs.own[f.newId]?.versions[0];
        if (!mine || mine.kind !== "thread") continue;
        const src = await serveAt(c, f.ref.origin, `items/${f.ref.id}/v${f.ref.version}.json`);
        if (src.status !== 200) continue;
        const doc = JSON.parse(src.body);
        c.hit("P6post");
        const tag = `fork ${f.newId} of ${f.ref.origin}${f.ref.id}@v${f.ref.version}`;
        if (mine.transclusions?.length) return `${tag}: carries transclusions [${normT(mine.transclusions, S_ORIGIN).join(" ; ")}] — something re-resolved or was inherited`;
        if (/blyg-transclusion/.test(mine.html)) return `${tag}: the blyg-transclusion wire token survived into the fork`;
        const forkLines = textContent(mine.html).split("\n");
        let at = 0;
        for (const q of topLevelQuotes(parse(doc.content_html ?? ""))) {
          for (const line of elLines(q)) {
            const k = forkLines.indexOf(line, at);
            if (k < 0) return `${tag}: baked quote text "${line}" (of ${q.attrs["data-blyg-id"]} v${q.attrs["data-blyg-version"]}) is not in the fork, in order`;
            at = k + 1;
          }
        }
        // Attribution names origin AND id — for nested quotes, the effective origin.
        for (const { el, origin } of quotesWithOrigin(parse(doc.content_html ?? ""), f.ref.origin)) {
          const id = el.attrs["data-blyg-id"];
          if (!id) continue;
          if (!mine.md.includes(id)) return `${tag}: no attribution naming quoted item ${id}`;
          const re = new RegExp(origin.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "[^)\\s]*" + id);
          if (!re.test(mine.md)) return `${tag}: quoted item ${id} is not attributed to its origin ${origin}`;
        }
        const mdLines = mine.md.split("\n");
        let j = 0;
        for (const line of ownProseLines(doc.content_md ?? "", doc.content_html ?? "")) {
          const k = mdLines.indexOf(line, j);
          if (k < 0) return `${tag}: own prose line "${line}" of the pinned content_md is missing from the fork`;
          j = k + 1;
        }
      }
      return null;
    },
  },
  {
    id: "P7",
    title: "A partial transclusion stays verifiable while its target version is served",
    spec_refs: ["§10.2", "§10.3", "§8"],
    decisions: ["#49"],
    async check(c) {
      const threads: { origin: string; list: TRef[] }[] = [];
      for (const p of [c.world.A, c.world.B]) for (const it of p.items.values()) for (const v of it.versions) if (v.transclusions?.length) threads.push({ origin: p.origin, list: v.transclusions });
      for (const it of Object.values(c.obs.own)) for (const v of it.versions) if (v.transclusions?.length) threads.push({ origin: S_ORIGIN, list: v.transclusions });
      for (const t of threads) {
        for (const e of t.list) {
          if (!e.selector) continue;
          const o = e.origin ?? t.origin;
          let s = await serveAt(c, o, `items/${e.id}.json`);
          if (s.status !== 200 || JSON.parse(s.body).version !== e.version) s = await serveAt(c, o, `items/${e.id}/v${e.version}.json`);
          if (s.status !== 200) continue;
          c.hit("P7");
          if (!textContent(JSON.parse(s.body).content_html ?? "").includes(e.selector.exact)) return `selector "${e.selector.exact}" not found in ${o}${e.id} v${e.version} as served`;
        }
      }
      return null;
    },
  },
  {
    id: "P8",
    title: "The local transclusion graph stays acyclic (local closure check)",
    spec_refs: ["§10.2"],
    decisions: ["#26"],
    async check(c) {
      const edges = new Map<string, string[]>();
      for (const [id, it] of Object.entries(c.obs.own)) {
        const v = it.versions[it.versions.length - 1];
        edges.set(id, (v?.transclusions ?? []).filter((t) => !t.origin).map((t) => t.id));
      }
      const state = new Map<string, number>();
      const dfs = (n: string): boolean => {
        state.set(n, 1);
        for (const m of edges.get(n) ?? []) {
          if (state.get(m) === 1) return true;
          if (!state.get(m) && dfs(m)) return true;
        }
        state.set(n, 2);
        return false;
      };
      for (const n of edges.keys()) { if (edges.get(n)!.length) c.hit("P8"); if (!state.get(n) && dfs(n)) return `cycle through ${n}`; }
      return null;
    },
  },
  {
    id: "P9",
    title: "Stub version agreement: stub_of.version equals the version baked of the same target",
    spec_refs: ["§10.6"],
    decisions: ["#27"],
    async check(c) {
      for (const [id, it] of Object.entries(c.obs.own)) {
        for (const v of it.versions) {
          if (!v.stub_of) continue;
          const t = v.stub_of;
          const baked = (v.transclusions ?? []).filter((x) => x.id === t.id && (x.origin ?? S_ORIGIN) === t.origin);
          c.hit("P9");
          if (baked.length && !baked.some((b) => b.version === t.version)) return `${id} v${v.version}: stub_of ${t.origin}${t.id}@v${t.version} but baked v${baked.map((b) => b.version).join(",")}`;
          // Rule 3's other half: with no quote of the target, the creation-time value stands.
          // (Both twins were handed the same creation-time target, recorded on the model twin.)
          const created = c.world.S.items.get(id)?.stubTarget;
          if (!baked.length && created && created.origin === t.origin && created.id === t.id && created.version !== t.version) {
            const other = (v.transclusions ?? []).find((x) => x.id === t.id);
            return `${id} v${v.version}: body does not quote ${t.origin}${t.id}, yet stub_of moved v${created.version} → v${t.version}${other ? ` (copied from a same-id quote of ${other.origin ?? S_ORIGIN} — a different item)` : ""}`;
          }
        }
      }
      return null;
    },
  },
  {
    id: "P10",
    title: "L0 wrapper: entries are retained past the window; same-guid edits bump a local version",
    spec_refs: ["§13.6"],
    decisions: ["#18"],
    async check(c) {
      for (const [k, v] of Object.entries(c.prev.l0)) {
        c.hit("P10");
        if (c.obs.l0[k] === undefined) return `L0 entry ${k} dropped after scrolling out of the window`;
        if (c.obs.l0[k] < v) return `L0 entry ${k} version went backwards`;
      }
      return null;
    },
  },
  {
    id: "D1",
    title: "Differential: studio importer state equals the model reader's",
    spec_refs: ["§13.2", "§13.3", "§13.4", "§13.6"],
    decisions: ["#18"],
    differential: true,
    async check(c) {
      const a = JSON.stringify({ i: c.modelObs.imports, l: c.modelObs.l0 });
      const b = JSON.stringify({ i: c.obs.imports, l: c.obs.l0 });
      c.hit("D1");
      if (a !== b) return `importer state differs: ${firstDiff(c.modelObs, c.obs)}`;
      const fm = JSON.stringify(c.modelObs.flags), fs = JSON.stringify(c.obs.flags);
      if (fm !== fs) return `discrepancy flags differ: model ${fm} vs studio ${fs}`;
      return null;
    },
  },
  {
    id: "D2",
    title: "Differential: studio publish/fork outcome (accept vs refuse) equals the model's",
    spec_refs: ["§10.2", "§10.1", "§5.6"],
    decisions: ["#26", "#49"],
    differential: true,
    async check(c) {
      const lp = c.world.lastPublish;
      if (!lp?.studio) return null;
      c.hit("D2");
      if (lp.model.ok !== lp.studio.ok) {
        const why = (r: any) => (r.ok ? `accepted v${r.version}` : `refused: ${(r.errors ?? []).map((e: any) => e.reason).join("; ") || r.refused}`);
        return `model ${why(lp.model)} — studio ${why(lp.studio)}`;
      }
      return null;
    },
  },
  {
    id: "D3",
    title: "Differential: studio's published items (versions, provenance, stub_of, pins, lineage) equal the model's",
    spec_refs: ["§5", "§8", "§10.3", "§10.6", "§5.6"],
    decisions: ["#26", "#27", "#49"],
    differential: true,
    async check(c) {
      const shape = (o: ObsS) => JSON.stringify(Object.fromEntries(Object.entries(o.own).sort().map(([id, it]) => [id, {
        v: it.versions.map((x) => [x.version, x.kind, normT(x.transclusions, S_ORIGIN), x.stub_of ? `${x.stub_of.origin}|${x.stub_of.id}|v${x.stub_of.version}` : null]),
        pinned: it.pinned, fork: it.forked_from ? `${it.forked_from.origin}|${it.forked_from.id}|v${it.forked_from.version}` : null,
      }])));
      c.hit("D3");
      const a = shape(c.modelObs), b = shape(c.obs);
      return a === b ? null : `published state differs: model ${a.slice(0, 400)} — studio ${b.slice(0, 400)}`;
    },
  },
];

async function convergence(c: Ctx, o: "A" | "B"): Promise<string | null> {
  const p = o === "A" ? c.world.A : c.world.B;
  const local = c.obs.imports[p.origin] ?? {};
  const flags = c.obs.flags[p.origin] ?? [];
  const idx = p.index();
  for (const e of idx) {
    const l = local[e.id];
    const latest = p.latest(e.id)!;
    c.hit(c.cmd.t === "reconcile" ? "P2" : "P2b");
    if (!l) return `${o}:${e.id} v${e.version} is in the index but missing from the reader`;
    if (l.version < e.version) return `${o}:${e.id} reader at v${l.version}, index says v${e.version}`;
    if (l.version > e.version) { if (!flags.includes("regression")) return `${o}:${e.id} reader ahead of index (v${l.version} > v${e.version}) with no regression surfaced`; continue; }
    if ((l.state === "current") !== (e.kind !== "withdrawn")) return `${o}:${e.id} reader state ${l.state} but origin kind ${e.kind}`;
    if (l.state === "current" && l.hash !== latest.content_hash) return `${o}:${e.id} reader holds different content at v${l.version}${flags.includes("stealth-edit") ? "" : " (no stealth-edit surfaced)"}`;
  }
  for (const id of Object.keys(local)) if (!idx.some((e) => e.id === id)) return `${o}:${id} held by the reader but absent from the origin's index`;
  return null;
}

/**
 * Clause ids (conformance/clauses/clauses.json, the merged register) each check
 * tests. Section-level refs stay in spec_refs; these are the sentence-level ones.
 */
export const CLAUSES: Record<string, string[]> = {
  P1: ["C-4-09", "C-4-10", "C-8-01", "C-8-03"],
  P2: ["C-13.1-01", "C-13.1-02", "C-13.1-03", "C-13.1-06", "C-13.2-02"],
  P2b: ["C-13.1-01", "C-13.1-06", "C-7-01"],
  P3: ["C-13.3-01", "C-13.3-02", "C-13.2-02"],
  P4: ["C-13.4-01", "C-13.4-02", "C-8-01"],
  P5: ["C-10.2-01"],
  P6: ["C-5.6-03", "C-10.2-01"],
  P6post: ["P-16.6f-01", "C-5.6-02", "C-5.6-03"],
  P7: ["C-10.2-02", "C-10.2-03", "C-10.3-01"],
  P8: ["C-10.2-04"],
  P9: ["C-10.6-02", "C-10.6-03"],
  P10: ["C-13.6-01"],
  D1: ["C-13.1-01", "C-13.1-02", "C-13.1-03", "C-13.2-02", "C-13.3-01", "C-13.3-02", "C-13.3-03", "C-13.4-01", "C-13.4-02"],
  D2: ["C-10.1-01", "C-10.2-01", "C-10.2-02", "C-10.2-04"],
  D3: ["C-4-10", "C-5.6-02", "C-5.6-06", "C-8-03", "C-10.3-01", "C-10.3-03", "C-10.6-03"],
};

function firstDiff(a: ObsS, b: ObsS): string {
  const origins = new Set([...Object.keys(a.imports), ...Object.keys(b.imports)]);
  for (const o of origins) {
    const ids = new Set([...Object.keys(a.imports[o] ?? {}), ...Object.keys(b.imports[o] ?? {})]);
    for (const id of ids) {
      const x = JSON.stringify(a.imports[o]?.[id] ?? null), y = JSON.stringify(b.imports[o]?.[id] ?? null);
      if (x !== y) return `${o} ${id}: model ${x} vs studio ${y}`;
    }
  }
  const lk = new Set([...Object.keys(a.l0), ...Object.keys(b.l0)]);
  for (const k of lk) if (a.l0[k] !== b.l0[k]) return `L0 ${k}: model v${a.l0[k]} vs studio v${b.l0[k]}`;
  return "(order only)";
}
