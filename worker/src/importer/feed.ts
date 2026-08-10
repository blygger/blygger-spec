// Lenient feed parser — v0.2-plan.md §3.2 step 2 + §7's blyg:manifest
// feed-upgrade element. A feed that isn't well-formed XML (or has no
// `<rss><channel>`) reports parse failure as a whole — the caller (poll
// cycle, task 5) must leave all local state untouched and fall back to an
// index diff (§3.1: "malformed feeds degrade, not corrupt"). Within an
// otherwise well-formed feed, an individual `<item>` missing the fields
// needed to identify it (no guid, no link) is unsalvageable and skipped
// without failing the rest — the §11.4 ignore-unknown-constructs ethos
// applied to syntax. (A single genuinely non-well-formed `<item>` — e.g. an
// unclosed tag — breaks XML well-formedness for the whole document, so that
// case surfaces as a whole-feed parse failure, not a per-entry one; true
// per-entry salvage is for structurally-present-but-semantically-incomplete
// items.)

import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface ParsedFeedEntry {
  guid?: string;
  link?: string;
  title?: string;
  /** Raw description HTML — already CDATA-unwrapped by the XML parser. */
  description?: string;
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

function parseEntry(raw: unknown): ParsedFeedEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const guid = textOf(r.guid);
  const link = textOf(r.link);
  // A usable entry needs at least a guid or a link to identify it (guid for
  // blyg-aware rollup, link as the L0 fallback identity per §3.5).
  if (!guid && !link) return null;
  const blygId = textOf(r["blyg:id"]);
  const blyg = blygId
    ? {
        id: blygId,
        kind: textOf(r["blyg:kind"]),
        version: numberOf(r["blyg:version"]),
        created: textOf(r["blyg:created"]),
        itemUrl: textOf(r["blyg:item"]),
      }
    : undefined;
  return {
    guid,
    link,
    title: textOf(r.title),
    description: textOf(r.description),
    pubDate: textOf(r.pubDate),
    blyg,
  };
}

export function parseFeed(xml: string): ParsedFeed {
  if (XMLValidator.validate(xml) !== true) return { ok: false };
  let parsed: unknown;
  try {
    parsed = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === "item" }).parse(xml);
  } catch {
    return { ok: false };
  }
  const channel = (parsed as Record<string, any>)?.rss?.channel;
  if (!channel || typeof channel !== "object") return { ok: false };
  const manifestUrl = typeof channel["blyg:manifest"] === "string" ? channel["blyg:manifest"] : null;
  const rawItems: unknown[] = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
  const entries: ParsedFeedEntry[] = [];
  for (const raw of rawItems) {
    try {
      const entry = parseEntry(raw);
      if (entry) entries.push(entry);
    } catch {
      // Malformed individual entry — skip it, don't fail the whole feed.
    }
  }
  return { ok: true, manifestUrl, entries };
}
