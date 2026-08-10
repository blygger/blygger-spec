// Item transition function — v0.2-plan.md §3.3, locked decision #18. Pure:
// (local, fetchedDoc) -> {next, effect, flags}, no I/O, so the full table is
// unit-testable without a network. Callers (the index reconciler / poll
// cycle, task 5) own persisting `effect` to D1 and appending `flags` to the
// subscription's discrepancy log.
//
// Note on scope: `content_hash` SHOULD also be verified against `content_md`
// on import (§3.3 notes) — that needs the async SHA-256 util and so is a
// caller-side check layered on top of this function's output, not one of
// the table rows below.

export type LocalState =
  | { status: "absent" }
  | { status: "current"; version: number }
  | { status: "tombstone"; version: number };

export interface NormalizedItemDoc {
  id: string;
  kind: "fragment" | "thread" | "withdrawn";
  version: number;
  created: string;
  updated: string;
  content_md: string;
  content_html: string;
  content_hash: string;
  author: unknown;
  media: unknown[];
  transclusions?: unknown[];
}

export type ImporterFlag =
  | "regression"
  | "stealth-edit"
  | "unparseable"
  | "unknown-kind"
  /** A version-immutability violation the §3.3 table doesn't name a row for (e.g. a re-fetch at an already-observed version claiming a different kind than that state implies). Per CLAUDE.md model routing: not ours to invent a new transition — ignore-and-flag is the safe fallback pending a Fable pass. */
  | "unrecognized-transition";

export type TransitionEffect =
  | { type: "import"; doc: NormalizedItemDoc }
  | { type: "record-tombstone"; version: number; updated: string }
  | { type: "update"; doc: NormalizedItemDoc }
  | { type: "rollup-null"; version: number; updated: string }
  | { type: "reimport"; doc: NormalizedItemDoc }
  | { type: "adopt-stealth"; doc: NormalizedItemDoc }
  | { type: "noop" }
  | { type: "ignore" };

export interface TransitionInput {
  local: LocalState;
  /** Raw fetched item document JSON, untrusted and schema-tolerant (§11.4/§11.5). */
  doc: unknown;
  /** content_hash currently stored locally, to detect same-version no-op vs. stealth edit; absent when `local.status === "absent"`. */
  storedContentHash?: string;
}

export interface TransitionResult {
  next: LocalState;
  effect: TransitionEffect;
  flags: ImporterFlag[];
}

type NormalizeResult = { ok: true; doc: NormalizedItemDoc } | { ok: false; reason: "unparseable" | "unknown-kind" };

function normalizeItemDoc(raw: unknown): NormalizeResult {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "unparseable" };
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return { ok: false, reason: "unparseable" };
  if (typeof r.version !== "number" || !Number.isInteger(r.version) || r.version < 1) {
    return { ok: false, reason: "unparseable" };
  }
  if (r.kind !== "fragment" && r.kind !== "thread" && r.kind !== "withdrawn") {
    return { ok: false, reason: "unknown-kind" };
  }
  return {
    ok: true,
    doc: {
      id: r.id,
      kind: r.kind,
      version: r.version,
      created: typeof r.created === "string" ? r.created : "",
      updated: typeof r.updated === "string" ? r.updated : "",
      content_md: typeof r.content_md === "string" ? r.content_md : "",
      content_html: typeof r.content_html === "string" ? r.content_html : "",
      content_hash: typeof r.content_hash === "string" ? r.content_hash : "",
      author: r.author,
      media: Array.isArray(r.media) ? r.media : [],
      transclusions: Array.isArray(r.transclusions) ? r.transclusions : undefined,
    },
  };
}

export function transition({ local, doc, storedContentHash }: TransitionInput): TransitionResult {
  const normalized = normalizeItemDoc(doc);
  if (!normalized.ok) {
    return { next: local, effect: { type: "ignore" }, flags: [normalized.reason] };
  }
  const d = normalized.doc;
  const watermark = local.status === "absent" ? 0 : local.version;

  // Invariant 2: the watermark never silently regresses.
  if (d.version < watermark) {
    return { next: local, effect: { type: "ignore" }, flags: ["regression"] };
  }

  if (d.version === watermark) {
    // Only reachable with local.status !== "absent" (watermark is 0 there, and versions are >=1).
    if (local.status === "current") {
      if (d.kind === "withdrawn") {
        // Table doesn't name this cell (withdrawal is itself a version bump, so a
        // same-version re-fetch should carry the same authored kind) — safe fallback.
        return { next: local, effect: { type: "ignore" }, flags: ["unrecognized-transition"] };
      }
      if (d.content_hash === storedContentHash) {
        return { next: local, effect: { type: "noop" }, flags: [] };
      }
      return { next: local, effect: { type: "adopt-stealth", doc: d }, flags: ["stealth-edit"] };
    }
    // local.status === "tombstone"
    if (d.kind !== "withdrawn") {
      return { next: local, effect: { type: "ignore" }, flags: ["unrecognized-transition"] };
    }
    if (d.content_hash === storedContentHash) {
      return { next: local, effect: { type: "noop" }, flags: [] };
    }
    return { next: local, effect: { type: "adopt-stealth", doc: d }, flags: ["stealth-edit"] };
  }

  // d.version > watermark
  if (local.status === "absent") {
    if (d.kind === "withdrawn") {
      return { next: { status: "tombstone", version: d.version }, effect: { type: "record-tombstone", version: d.version, updated: d.updated }, flags: [] };
    }
    return { next: { status: "current", version: d.version }, effect: { type: "import", doc: d }, flags: [] };
  }
  if (local.status === "current") {
    if (d.kind === "withdrawn") {
      return { next: { status: "tombstone", version: d.version }, effect: { type: "rollup-null", version: d.version, updated: d.updated }, flags: [] };
    }
    return { next: { status: "current", version: d.version }, effect: { type: "update", doc: d }, flags: [] };
  }
  // local.status === "tombstone"
  if (d.kind === "withdrawn") {
    // A second withdrawal endcap without an observed republish in between —
    // shouldn't happen under an honest origin (withdraw() requires 'public'
    // status), but advancing the watermark is still the safe move.
    return { next: { status: "tombstone", version: d.version }, effect: { type: "record-tombstone", version: d.version, updated: d.updated }, flags: [] };
  }
  return { next: { status: "current", version: d.version }, effect: { type: "reimport", doc: d }, flags: [] };
}
