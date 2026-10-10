// The stateful property-based runner: fast-check `fc.commands` drives a World
// (and, in differential mode, the studio twin inside it); every property in a
// campaign is checked after every command; a failure is shrunk by fast-check
// and then REPLAYED here step by step to produce a trace for the report.
import fc from "fast-check";
import type { Capabilities, Served } from "../model/publisher.ts";
import { type Cmd, describeCmd, type ObsS, S_ORIGIN, type StudioAdapter, type TraceEvent, World, type WorldOpts } from "../model/world.ts";
import { type Campaign, CMD } from "./campaigns.ts";
import { type Ctx, PROPS } from "./properties.ts";

export class Violation extends Error {
  constructor(readonly prop: string, readonly step: number, readonly detail: string) { super(`${prop} @ step ${step}: ${detail}`); }
}

export interface StepTrace { n: number; cmd: Cmd; text: string; events: TraceEvent[]; violation?: string; model?: ObsS; studio?: ObsS }
export interface CampaignResult {
  id: string;
  title?: string;
  props: string[];
  subject: "model" | "studio";
  status: "pass" | "fail";
  numRuns: number;
  seed: number;
  path?: string;
  numShrinks?: number;
  commandsExecuted: number;
  hits: Record<string, number>;
  failure?: { prop: string; detail: string; step: number; commands: string[]; cmdData: Cmd[]; trace: StepTrace[] };
  /** Set when this result is a directed replay of another subject's counterexample. */
  replayOf?: string;
  /** Full trace of a directed replay that did NOT violate. */
  trace?: StepTrace[];
  transitions?: Record<string, { agree: number; disagree: number }>;
  error?: string;
  ms: number;
}

/** One live run: a world plus per-run memories, executing commands with checks. */
class Runner {
  world: World;
  executed = 0;
  private mem = { model: { pinBodies: new Map<string, string>(), baked: new Map<string, string>() }, studio: { pinBodies: new Map<string, string>(), baked: new Map<string, string>() } };
  private prevModel: ObsS;
  private prevStudio?: ObsS;
  trace: StepTrace[] = [];

  constructor(caps: Capabilities, readonly studio: StudioAdapter | undefined, readonly props: string[], readonly hits: Record<string, number>, readonly transitions: Record<string, { agree: number; disagree: number }>, readonly record: boolean, opts: WorldOpts = {}) {
    this.world = new World(caps, studio, opts);
    this.prevModel = this.world.observeModel();
  }

  async init() { if (this.studio) { await this.studio.reset(); this.prevStudio = await this.studio.observe(); } }

  async exec(cmd: Cmd) {
    const w = this.world;
    const regBefore = w.reader.regressionsSeen.length;
    const events = await w.apply(cmd);
    this.executed++;
    const modelObs = w.observeModel();
    const studioObs = this.studio ? await this.studio.observe() : undefined;
    const step: StepTrace = { n: w.step, cmd, text: describeCmd(cmd), events: [...events] };
    if (this.record) { step.model = modelObs; step.studio = studioObs; this.trace.push(step); }
    if (studioObs && this.prevStudio) tallyTransitions(this.prevModel, modelObs, this.prevStudio, studioObs, this.transitions);
    const subjects: { s: "model" | "studio"; obs: ObsS; prev: ObsS; serve: (p: string) => Promise<Served> }[] = this.studio
      ? [{ s: "studio", obs: studioObs!, prev: this.prevStudio!, serve: (p) => this.studio!.serve(p) }]
      : [{ s: "model", obs: modelObs, prev: this.prevModel, serve: async (p) => w.S.serve(p) }];
    try {
      for (const sub of subjects) {
        const ctx: Ctx = {
          world: w, subject: sub.s, obs: sub.obs, prev: sub.prev, modelObs, cmd, serveS: sub.serve, regBefore, regAfter: w.reader.regressionsSeen.length,
          mem: this.mem[sub.s], hit: (id) => { this.hits[id] = (this.hits[id] ?? 0) + 1; },
        };
        for (const id of this.props) {
          const p = PROPS.find((x) => x.id === id)!;
          if (p.differential && sub.s !== "studio") continue;
          const v = await p.check(ctx);
          if (v) {
            step.violation = `${id}: ${v}`;
            step.events.push({ lane: sub.s === "studio" ? "studio" : "S", kind: "diverge", label: `✗ ${id}` });
            throw new Violation(id, w.step, v);
          }
        }
      }
    } finally {
      this.prevModel = modelObs;
      if (studioObs) this.prevStudio = studioObs;
    }
  }
}

class WCmd implements fc.AsyncCommand<object, Runner> {
  constructor(readonly data: Cmd) {}
  check() { return true; }
  async run(_m: object, r: Runner) { await r.exec(this.data); }
  toString() { return describeCmd(this.data); }
}

export async function runCampaign(c: Campaign, opts: { numRuns: number; seed: number; studio?: StudioAdapter }): Promise<CampaignResult> {
  const t0 = Date.now();
  const hits: Record<string, number> = {};
  const transitions: Record<string, { agree: number; disagree: number }> = {};
  const caps = c.caps ?? { partial: true };
  const arb = fc.commands(c.cmds.map((k) => CMD[k].map((d) => new WCmd(d))), { maxCommands: c.maxCommands, size: "max" });
  let executed = 0;
  let lastViolation: Violation | undefined;
  const prop = fc.asyncProperty(arb, async (cmds) => {
    const r = new Runner(caps, opts.studio, c.props, hits, transitions, false, c.world);
    await r.init();
    try {
      await fc.asyncModelRun(() => ({ model: {}, real: r }), cmds);
    } catch (e) {
      if (e instanceof Violation) lastViolation = e;
      throw e;
    } finally {
      executed += r.executed;
    }
  });
  const out = await fc.check(prop, { numRuns: opts.numRuns, seed: opts.seed, endOnFailure: false });
  const base: CampaignResult = {
    id: c.id, title: c.title, props: c.props, subject: opts.studio ? "studio" : "model",
    status: out.failed ? "fail" : "pass", numRuns: out.numRuns, seed: out.seed, commandsExecuted: executed, hits, ms: 0,
    ...(opts.studio ? { transitions } : {}),
  };
  if (out.failed && out.counterexample) {
    base.path = out.counterexamplePath ?? undefined;
    base.numShrinks = out.numShrinks;
    // Replay the shrunk sequence on a fresh world, recording every step.
    const cmds = [...(out.counterexample[0] as Iterable<WCmd>)].map((w: any) => (w.cmd ?? w).data as Cmd).filter(Boolean);
    const rep = await replay(c, cmds, opts.studio);
    base.failure = rep.failure ?? {
      prop: lastViolation?.prop ?? "?", detail: lastViolation?.detail ?? String(out.errorInstance), step: -1,
      commands: cmds.map(describeCmd), cmdData: cmds, trace: rep.trace,
    };
    if (!rep.failure) base.error = `replay did not reproduce: ${rep.error ?? lastViolation?.message ?? String(out.errorInstance)}`;
  } else if (out.failed) {
    base.error = String(out.errorInstance);
  }
  base.ms = Date.now() - t0;
  return base;
}

/** Run one fixed command sequence with tracing; stops at the first violation. */
export async function replay(c: Campaign, cmds: Cmd[], studio?: StudioAdapter, hits: Record<string, number> = {}): Promise<{ failure?: NonNullable<CampaignResult["failure"]>; trace: StepTrace[]; error?: string }> {
  const r = new Runner(c.caps ?? { partial: true }, studio, c.props, hits, {}, true, c.world);
  await r.init();
  let v: Violation | undefined;
  let error: string | undefined;
  for (const cmd of cmds) {
    try { await r.exec(cmd); } catch (e) { if (e instanceof Violation) { v = e; break; } error = String((e as Error)?.stack ?? e); break; }
  }
  if (!v) return { trace: r.trace, error };
  const upto = cmds.slice(0, v.step);
  return { trace: r.trace, failure: { prop: v.prop, detail: v.detail, step: v.step, commands: upto.map(describeCmd), cmdData: upto, trace: r.trace } };
}

/** A directed run: replay another subject's counterexample against this subject. */
export async function replayCampaign(c: Campaign, cmds: Cmd[], of: string, studio?: StudioAdapter): Promise<CampaignResult> {
  const t0 = Date.now();
  const hits: Record<string, number> = {};
  const rep = await replay(c, cmds, studio, hits);
  return {
    id: c.id, title: c.title, props: c.props, subject: studio ? "studio" : "model", status: rep.failure ? "fail" : "pass",
    numRuns: 1, seed: 0, commandsExecuted: rep.trace.length, hits, ms: Date.now() - t0, replayOf: of,
    ...(rep.failure ? { failure: rep.failure } : { failure: undefined }),
    ...(rep.error ? { error: rep.error } : {}),
    ...(!rep.failure ? { trace: rep.trace } : {}),
  } as CampaignResult;
}

/**
 * §13 importer state per (origin, id) before/after one step, classified into the
 * transitions of the model's state machine; counts whether the studio took the
 * same transition for the same step.
 */
export function classify(prev: ObsS["imports"][string][string] | undefined, next: ObsS["imports"][string][string] | undefined, flagsAdded: string[]): string | null {
  const ps = prev ? (prev.state === "tombstone" ? (prev.retained != null ? "retained" : "tombstone") : "current") : "absent";
  const ns = next ? (next.state === "tombstone" ? (next.retained != null ? "retained" : "tombstone") : "current") : "absent";
  if (flagsAdded.includes("regression") && prev && next && next.version === prev.version) return `${ps}→${ns} (regression ignored)`;
  if (prev && next && prev.version === next.version && prev.hash !== next.hash) return `${ps}→${ns} (stealth adopted)`;
  if (prev && next && prev.version === next.version && ps === ns) return null;
  if (!prev && !next) return null;
  return `${ps}→${ns}`;
}

function tallyTransitions(pm: ObsS, nm: ObsS, ps: ObsS, ns: ObsS, out: Record<string, { agree: number; disagree: number }>) {
  const origins = new Set([...Object.keys(nm.imports), ...Object.keys(ns.imports)]);
  for (const o of origins) {
    const fm = (nm.flags[o] ?? []).filter((f) => !(pm.flags[o] ?? []).includes(f));
    const fs = (ns.flags[o] ?? []).filter((f) => !(ps.flags[o] ?? []).includes(f));
    const ids = new Set([...Object.keys(nm.imports[o] ?? {}), ...Object.keys(ns.imports[o] ?? {})]);
    for (const id of ids) {
      const a = classify(pm.imports[o]?.[id], nm.imports[o]?.[id], fm);
      const b = classify(ps.imports[o]?.[id], ns.imports[o]?.[id], fs);
      if (!a && !b) continue;
      const key = a ?? b!;
      out[key] ??= { agree: 0, disagree: 0 };
      if (a === b) out[key].agree++;
      else { out[key].disagree++; if (b && b !== key) { out[b] ??= { agree: 0, disagree: 0 }; out[b].disagree++; } }
    }
  }
}

export { S_ORIGIN };
