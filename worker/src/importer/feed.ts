// Lenient feed parser — v0.2-plan.md §3.2 step 2 + §7's blyg:manifest
// feed-upgrade element. Understands both RSS 2.0 (`<rss><channel><item>`)
// and Atom 1.0 (`<feed><entry>`) — added session 16 (2026-09-11) when the
// v0.2 live-testing pass hit a real-world legacy feed (Atom-only, no RSS
// alternative) that the RSS-only parser rejected outright. blyg-native
// feeds are always RSS (v0.1-plan §3.3); Atom is purely an L0-legacy-feed
// shape, so Atom entries are never expected to carry `blyg:*` extensions,
// but the extraction is shared with RSS anyway (harmless if absent, and one
// fewer code path to keep in sync). A feed that isn't well-formed XML (or
// matches neither shape) reports parse failure as a whole — the caller (poll
// cycle, task 5) must leave all local state untouched and fall back to an
// index diff (§3.1: "malformed feeds degrade, not corrupt"). Within an
// otherwise well-formed feed, an individual entry missing the fields needed
// to identify it (no guid/id, no link) is unsalvageable and skipped without
// failing the rest — the §11.4 ignore-unknown-constructs ethos applied to
// syntax. (A single genuinely non-well-formed entry — e.g. an unclosed tag —
// breaks XML well-formedness for the whole document, so that case surfaces
// as a whole-feed parse failure, not a per-entry one; true per-entry salvage
// is for structurally-present-but-semantically-incomplete entries.)

import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface ParsedFeedEntry {
  /** RSS `<guid>` or Atom `<id>`. */
  guid?: string;
  /** RSS `<link>` text, or an Atom `<link href>` (rel="alternate" preferred, else the first link). */
  link?: string;
  title?: string;
  /** Raw description HTML — RSS `<description>`, or Atom `<content>`/`<summary>`; already CDATA-unwrapped by the XML parser. */
  description?: string;
  /** RSS `<pubDate>`, or Atom `<published>`/`<updated>`. */
  pubDate?: string;
  /** Present only when the entry carries `blyg:id` (§7) — absent on a plain RSS/L0 entry. */
  blyg?: {
    id: string;
    kind?: string;
    version?: number;
    created?: string;
    /** `blyg:item` — absolute item-document URL, when the publisher emitted it. */
    itemUrl?: string;
  };
}

export type ParsedFeed = { ok: true; manifestUrl: string | null; entries: ParsedFeedEntry[] } | { ok: false };

function textOf(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v && typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
    const t = (v as Record<string, unknown>)["#text"];
    if (typeof t === "string") return t;
    return t !== undefined && t !== null ? String(t) : undefined;
  }
  return undefined;
}

function numberOf(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = textOf(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Shared `blyg:*` extension extraction (§7) — same five item-level elements regardless of feed format. */
function blygExtension(r: Record<string, unknown>): ParsedFeedEntry["blyg"] {
  const blygId = textOf(r["blyg:id"]);
  if (!blygId) return undefined;
  return {
    id: blygId,
    kind: textOf(r["blyg:kind"]),
    version: numberOf(r["blyg:version"]),
    created: textOf(r["blyg:created"]),
    itemUrl: textOf(r["blyg:item"]),
  };
}

function parseEntry(raw: unknown): ParsedFeedEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const guid = textOf(r.guid);
  const link = textOf(r.link);
  // A usable entry needs at least a guid or a link to identify it (guid for
  // blyg-aware rollup, link as the L0 fallback identity per §3.5).
  if (!guid && !link) return null;
  return {
    guid,
    link,
    title: textOf(r.title),
    description: textOf(r.description),
    pubDate: textOf(r.pubDate),
    blyg: blygExtension(r),
  };
}

/**
 * Atom `<link>` is attribute-based and an entry may carry several (rel
 * "alternate", "self", "replies", ...) — `isArray` (below) forces it to
 * always parse as an array regardless of count. Prefer rel="alternate" (the
 * entry's own permalink) or an unmarked link (Atom's implied default); fall
 * back to the first link with an href so a feed using an unrecognized rel
 * vocabulary still resolves to something.
 */
function linkFromAtomLinks(v: unknown): string | undefined {
  const candidates = Array.isArray(v) ? v : v !== undefined ? [v] : [];
  let first: string | undefined;
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const href = (c as Record<string, unknown>)["@_href"];
    if (typeof href !== "string") continue;
    if (first === undefined) first = href;
    const rel = (c as Record<string, unknown>)["@_rel"];
    if (rel === undefined || rel === "alternate") return href;
  }
  return first;
}

function parseAtomEntry(raw: unknown): ParsedFeedEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const link = linkFromAtomLinks(r.link);
  const guid = textOf(r.id) ?? link;
  if (!guid && !link) return null;
  return {
    guid,
    link,
    title: textOf(r.title),
    // `<content>` is the full entry body when present, `<summary>` the fallback.
    description: textOf(r.content) ?? textOf(r.summary),
    pubDate: textOf(r.published) ?? textOf(r.updated),
    blyg: blygExtension(r),
  };
}

/** Normalize a possibly-singular, possibly-array, possibly-absent raw node into a list, parsing and dropping unsalvageable entries as it goes. */
function collectEntries<T>(raw: unknown, parseOne: (raw: unknown) => T | null): T[] {
  const list = Array.isArray(raw) ? raw : raw !== undefined && raw !== null ? [raw] : [];
  const out: T[] = [];
  for (const item of list) {
    try {
      const entry = parseOne(item);
      if (entry) out.push(entry);
    } catch {
      // Malformed individual entry — skip it, don't fail the whole feed.
    }
  }
  return out;
}

export function parseFeed(xml: string): ParsedFeed {
  if (XMLValidator.validate(xml) !== true) return { ok: false };
  let parsed: unknown;
  try {
    parsed = new XMLParser({
      ignoreAttributes: false,
      isArray: (name, jpath) =>
        name === "item" || name === "entry" || (name === "link" && typeof jpath === "string" && jpath.endsWith("entry.link")),
    }).parse(xml);
  } catch {
    return { ok: false };
  }

  const channel = (parsed as Record<string, any>)?.rss?.channel;
  if (channel && typeof channel === "object") {
    const manifestUrl = textOf(channel["blyg:manifest"]) ?? null;
    return { ok: true, manifestUrl, entries: collectEntries(channel.item, parseEntry) };
  }

  const feed = (parsed as Record<string, any>)?.feed;
  if (feed && typeof feed === "object") {
    const manifestUrl = textOf(feed["blyg:manifest"]) ?? null;
    return { ok: true, manifestUrl, entries: collectEntries(feed.entry, parseAtomEntry) };
  }

  return { ok: false };
}
