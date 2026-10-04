// Campaigns: which commands a property is driven by, and how hard. A property
// gets the smallest command vocabulary that can reach its violations, which
// keeps shrunk counterexamples short and readable.
import fc from "fast-check";
import type { Fault } from "../model/network.ts";
import type { Capabilities } from "../model/publisher.ts";
import type { Cmd, Dir, WorldOpts } from "../model/world.ts";

const dir: fc.Arbitrary<Dir> = fc.record({
  id: fc.nat(9),
  partial: fc.oneof(
    { weight: 3, arbitrary: fc.constant(undefined) },
    { weight: 2, arbitrary: fc.record({ from: fc.nat(5), len: fc.nat(3) }) },
    { weight: 1, arbitrary: fc.constant("bogus" as const) },
  ),
}).map((d) => (d.partial === undefined ? { id: d.id } : d) as Dir);

const fault: fc.Arbitrary<Fault> = fc.oneof(
  { weight: 4, arbitrary: fc.constant({ kind: "none" } as Fault) },
  { weight: 1, arbitrary: fc.constant({ kind: "feed5xx" } as Fault) },
  { weight: 1, arbitrary: fc.constant({ kind: "index5xx" } as Fault) },
  { weight: 1, arbitrary: fc.nat(9).map((idx) => ({ kind: "item5xx", idx }) as Fault) },
  { weight: 2, arbitrary: fc.nat(15).map((mask) => ({ kind: "dropEntries", mask }) as Fault) },
  { weight: 1, arbitrary: fc.nat(3).map((rot) => ({ kind: "reorder", rot }) as Fault) },
  { weight: 1, arbitrary: fc.constant({ kind: "duplicate" } as Fault) },
  { weight: 1, arbitrary: fc.constant({ kind: "garbledFeed" } as Fault) },
  { weight: 1, arbitrary: fc.constant({ kind: "stale" } as Fault) },
);
const ab = fc.constantFrom("A" as const, "B" as const);

export const CMD: Record<string, fc.Arbitrary<Cmd>> = {
  pub: fc.record({ t: fc.constant("pub" as const), o: ab, slot: fc.nat(3), w: fc.nat(40), dirs: fc.array(dir, { maxLength: 2 }) }),
  spub: fc.record({
    t: fc.constant("spub" as const), slot: fc.nat(3), w: fc.nat(40), dirs: fc.array(dir, { minLength: 1, maxLength: 2 }),
    stub: fc.option(fc.record({ o: fc.constantFrom("A" as const, "B" as const, "S" as const), id: fc.nat(9) }), { nil: undefined }),
  }).map((c) => (c.stub === undefined ? { t: c.t, slot: c.slot, w: c.w, dirs: c.dirs } : c) as Cmd),
  withdrawAB: fc.record({ t: fc.constant("withdraw" as const), o: ab, slot: fc.nat(3) }),
  withdrawS: fc.record({ t: fc.constant("withdraw" as const), o: fc.constant("S" as const), slot: fc.nat(3) }),
  pinAB: fc.record({ t: fc.constant("pin" as const), o: ab, slot: fc.nat(3), back: fc.nat(2) }),
  pinS: fc.record({ t: fc.constant("pin" as const), o: fc.constant("S" as const), slot: fc.nat(3), back: fc.nat(2) }),
  pollClean: fc.record({ t: fc.constant("poll" as const), o: ab, fault: fc.constant({ kind: "none" } as Fault) }),
  pollFaulty: fc.record({ t: fc.constant("poll" as const), o: ab, fault }),
  reconcile: fc.record({ t: fc.constant("reconcile" as const), o: ab }),
  fork: fc.record({ t: fc.constant("fork" as const), o: fc.constantFrom("A" as const, "B" as const, "S" as const), slot: fc.constantFrom(2, 3), back: fc.nat(2), into: fc.nat(1) }),
  rogue: fc.record({ t: fc.constant("rogue" as const), slot: fc.nat(3), mode: fc.constantFrom("rollback" as const, "stealth" as const) }),
  l0post: fc.record({ t: fc.constant("l0post" as const), w: fc.nat(40) }),
  l0edit: fc.record({ t: fc.constant("l0edit" as const), k: fc.nat(5), w: fc.nat(40) }),
  pollL: fc.record({ t: fc.constant("poll" as const), o: fc.constant("L" as const), fault: fc.oneof(fc.constant({ kind: "none" } as Fault), fc.constant({ kind: "feed5xx" } as Fault)) }),
};

export interface Campaign {
  id: string;
  /** The property (or differential check) this campaign asserts. */
  props: string[];
  cmds: (keyof typeof CMD)[];
  maxCommands: number;
  /** Capabilities of the model twin of S (partial grammar, §10.2 step-1 reading). */
  caps?: Capabilities;
  /** World options: fork mode (pre/post #57), origin A's capabilities. */
  world?: WorldOpts;
  title?: string;
  modelOnly?: boolean;
  studioOnly?: boolean;
  /** Multiplier on the run budget, for properties whose violations need long specific sequences. */
  runFactor?: number;
}

// Repeats weight the uniform choice fc.commands makes among its arbitraries.
const ORIGINS: (keyof typeof CMD)[] = ["pub", "pub", "pub", "withdrawAB", "pinAB", "pinAB"];
const FORKING: (keyof typeof CMD)[] = [...ORIGINS, "pinAB", "pinAB", "reconcile", "reconcile", "spub", "pinS", "fork", "fork"];
/** blygger-studio's §10.2 step-1 reading, used where a campaign must look PAST that known divergence. */
const STUDIO_READING: Capabilities = { partial: true, resolution: "local-shadows" };
const POST57: WorldOpts = { forkMode: "post57" };

export const CAMPAIGNS: Campaign[] = [
  { id: "P1", props: ["P1"], cmds: [...ORIGINS, "spub", "withdrawS", "pinS", "reconcile"], maxCommands: 25 },
  { id: "P2", props: ["P2"], cmds: [...ORIGINS, "pollFaulty", "reconcile"], maxCommands: 30 },
  { id: "P2b", props: ["P2b"], cmds: [...ORIGINS, "pollFaulty", "pollClean"], maxCommands: 30 },
  { id: "P3", props: ["P3"], cmds: [...ORIGINS, "pollFaulty", "reconcile", "rogue"], maxCommands: 30 },
  { id: "P4", props: ["P4"], cmds: [...ORIGINS, "pollFaulty", "reconcile"], maxCommands: 30 },
  { id: "P5", props: ["P5"], cmds: [...ORIGINS, "reconcile", "spub", "withdrawS", "pinS"], maxCommands: 25 },
  { id: "P6-pre", title: "Pre-#57 fork (copy content_md, re-resolve at the forker)", props: ["P6"], cmds: FORKING, maxCommands: 35, runFactor: 10, world: { forkMode: "pre57" }, modelOnly: true },
  { id: "P6-pre-nopartial", title: "Pre-#57 fork when the forker lacks the partial grammar", props: ["P6"], cmds: FORKING, maxCommands: 35, runFactor: 10, caps: { partial: false }, world: { forkMode: "pre57" }, modelOnly: true },
  { id: "P6-post", title: "Post-#57 fork (flatten the pinned document, §16.6f)", props: ["P6post"], cmds: FORKING, maxCommands: 35, runFactor: 10, world: POST57 },
  { id: "P6-post-legacy", title: "Post-#57 fork of a thread published by a client WITHOUT the partial grammar", props: ["P6post"], cmds: FORKING, maxCommands: 35, runFactor: 10, world: { forkMode: "post57", aCaps: { partial: false } } },
  { id: "P7", props: ["P7"], cmds: [...ORIGINS, "reconcile", "reconcile", "spub", "spub", "withdrawS", "pinS"], maxCommands: 30 },
  { id: "P8", props: ["P8"], cmds: ["pub", "reconcile", "spub", "spub", "spub", "withdrawS"], maxCommands: 30 },
  { id: "P9", props: ["P9"], cmds: [...ORIGINS, "reconcile", "reconcile", "spub", "spub"], maxCommands: 30 },
  { id: "P10", props: ["P10"], cmds: ["l0post", "l0edit", "pollL"], maxCommands: 25 },
  { id: "D1-importer", title: "Importer differential (honest origins, faulty network)", props: ["D1"], cmds: [...ORIGINS, "pollFaulty", "reconcile"], maxCommands: 25, studioOnly: true },
  { id: "D1-clean", title: "Importer differential (honest origins, clean polls + index diffs only)", props: ["D1"], cmds: [...ORIGINS, "pollClean", "reconcile"], maxCommands: 25, studioOnly: true },
  { id: "D1-rogue", title: "Importer differential with a rogue origin (rollback / stealth edit)", props: ["D1"], cmds: [...ORIGINS, "reconcile", "pollClean", "rogue"], maxCommands: 25, studioOnly: true },
  { id: "D1-l0", title: "L0 wrapper differential", props: ["D1"], cmds: ["l0post", "l0edit", "pollL"], maxCommands: 20, studioOnly: true },
  { id: "D2", title: "Thread publish outcome differential, spec-letter §10.2 step 1", props: ["D2"], cmds: [...ORIGINS, "reconcile", "spub", "spub", "withdrawS"], maxCommands: 25, studioOnly: true },
  { id: "D2-shadow", title: "Thread publish outcome differential under studio's step-1 reading (looks past the D2 divergence)", props: ["D2"], cmds: [...ORIGINS, "reconcile", "spub", "spub", "withdrawS"], maxCommands: 25, caps: STUDIO_READING, studioOnly: true },
  { id: "D3", title: "Published-state differential (provenance, stubs, pins, post-#57 forks)", props: ["D2", "D3"], cmds: [...ORIGINS, "reconcile", "spub", "spub", "withdrawS", "pinS", "fork"], maxCommands: 25, caps: STUDIO_READING, world: POST57, studioOnly: true },
];

