// Directed scenarios: fixed command sequences for cases random generation
// reaches rarely but §16.6f names explicitly (nested cross-origin quotes,
// partials, legacy adjacency). Each runs under a campaign's property and world
// options, against the model and against the studio, with a full trace.
import type { Cmd } from "../model/world.ts";

export interface Scenario { id: string; campaign: string; title: string; cmds: Cmd[] }

const fragA: Cmd = { t: "pub", o: "A", slot: 0, w: 1, dirs: [] };
const fragA2: Cmd = { t: "pub", o: "A", slot: 1, w: 2, dirs: [] };
// A's thread (slot 2) quoting A's fragment whole and A's other fragment partially.
const threadA: Cmd = { t: "pub", o: "A", slot: 2, w: 3, dirs: [{ id: 0 }, { id: 1, partial: { from: 1, len: 1 } }] };
const pinThreadA: Cmd = { t: "pin", o: "A", slot: 2, back: 0 };
const syncA: Cmd = { t: "reconcile", o: "A" };
// S's thread (slot 1, id #7) quoting A's THREAD (#3: nested cross-origin) and A's fragment partially.
const threadS: Cmd = { t: "spub", slot: 1, w: 4, dirs: [{ id: 2 }, { id: 0, partial: { from: 0, len: 2 } }] };
const pinThreadS: Cmd = { t: "pin", o: "S", slot: 1, back: 0 };

export const SCENARIOS: Scenario[] = [
  {
    id: "fork-remote-thread-with-partial",
    campaign: "P6-post",
    title: "S forks A's pinned thread (one whole quote, one partial)",
    cmds: [fragA, fragA2, threadA, pinThreadA, syncA, { t: "fork", o: "A", slot: 2, back: 0, into: 0 }],
  },
  {
    id: "fork-own-thread-nested-cross-origin",
    campaign: "P6-post",
    title: "S forks its OWN pinned thread, which quotes A's thread (which quotes A's fragments): nested cross-origin quotes",
    cmds: [fragA, fragA2, threadA, syncA, threadS, pinThreadS, { t: "fork", o: "S", slot: 1, back: 0, into: 0 }],
  },
  {
    id: "fork-after-source-drift",
    campaign: "P6-post",
    title: "A's quoted fragment moves on after the pin; S has imported the newer version, then forks the pin",
    cmds: [fragA, fragA2, threadA, pinThreadA, { t: "pub", o: "A", slot: 0, w: 9, dirs: [] }, syncA, { t: "fork", o: "A", slot: 2, back: 0, into: 0 }],
  },
  {
    id: "fork-legacy-adjacency",
    campaign: "P6-post-legacy",
    title: "S forks a thread from a publisher WITHOUT the partial grammar, whose `>` lines after a directive are the author's own prose",
    cmds: [fragA, fragA2, threadA, pinThreadA, syncA, { t: "fork", o: "A", slot: 2, back: 0, into: 0 }],
  },
  {
    id: "pre57-drift",
    campaign: "P6-pre",
    title: "Same drift sequence under the PRE-#57 fork (copy content_md, re-resolve)",
    cmds: [fragA, fragA2, threadA, pinThreadA, { t: "pub", o: "A", slot: 0, w: 9, dirs: [] }, syncA, { t: "fork", o: "A", slot: 2, back: 0, into: 0 }],
  },
];
