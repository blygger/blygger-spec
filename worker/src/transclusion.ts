// Transclusion grammar & publish-time resolution — v0.1-plan §2.9. Grammar is
// locked protocol surface: do not modify without Fable + Venkat.

import { renderMarkdown } from "./markdown.ts";
import type { ItemRow, Transclusion, VersionRow } from "./types.ts";
import { escapeHtml, ID_ALPHABET } from "./util.ts";

const DIRECTIVE_LINE = new RegExp(`^\\s*!\\[\\[([${ID_ALPHABET}]{26})\\]\\]\\s*$`);
const RESERVED_LINE = new RegExp(`^\\s*!\\[\\[([${ID_ALPHABET}]{26})@v\\d+\\]\\]\\s*$`);

export interface TransclusionRefError {
  directive: string;
  reason: string;
}

export interface ResolveResult {
  html: string;
  transclusions: Transclusion[];
  errors: TransclusionRefError[];
}

/** Thrown by publish() when one or more `![[id]]` directives don't resolve. */
export class TransclusionResolveError extends Error {
  constructor(public readonly errors: TransclusionRefError[]) {
    super("transclusion resolution failed");
  }
}

/**
 * Shared line-walker for both publish-time resolution and studio preview.
 * `onError` decides what (if anything) renders in place of a directive that
 * fails to resolve — the strict resolver omits it (publish aborts anyway);
 * the preview variant renders a visible placeholder.
 */
async function walk(
  db: D1Database,
  contentMd: string,
  onError: (err: TransclusionRefError) => string | null,
): Promise<ResolveResult> {
  const errors: TransclusionRefError[] = [];
  const transclusions: Transclusion[] = [];
  const htmlParts: string[] = [];
  let prose: string[] = [];

  const flushProse = () => {
    if (prose.length) {
      htmlParts.push(renderMarkdown(prose.join("\n")));
      prose = [];
    }
  };
  const fail = (err: TransclusionRefError) => {
    errors.push(err);
    const placeholder = onError(err);
    if (placeholder) htmlParts.push(placeholder);
  };

  for (const line of contentMd.split("\n")) {
    const reserved = RESERVED_LINE.exec(line);
    if (reserved) {
      flushProse();
      fail({ directive: line.trim(), reason: "explicit-version references (@vN) are reserved, not supported in v0.1" });
      continue;
    }
    const m = DIRECTIVE_LINE.exec(line);
    if (!m) {
      prose.push(line);
      continue;
    }
    flushProse();
    const id = m[1];
    const item = await db.prepare("SELECT * FROM items WHERE id = ?").bind(id).first<ItemRow>();
    if (!item) {
      fail({ directive: line.trim(), reason: "unknown item" });
      continue;
    }
    if (item.status === "draft") {
      fail({ directive: line.trim(), reason: "item is a draft, not published" });
      continue;
    }
    if (item.kind === "withdrawn") {
      fail({ directive: line.trim(), reason: "item is withdrawn" });
      continue;
    }
    if (item.kind === "thread") {
      fail({ directive: line.trim(), reason: "cannot transclude a thread (no nesting until v0.3)" });
      continue;
    }
    const version = await db
      .prepare("SELECT * FROM versions WHERE item_id = ? AND version = ?")
      .bind(item.id, item.version)
      .first<VersionRow>();
    if (!version) {
      fail({ directive: line.trim(), reason: "unknown item" });
      continue;
    }
    transclusions.push({ id: item.id, version: version.version });
    htmlParts.push(
      `<blockquote class="ygg-transclusion" data-ygg-id="${item.id}" data-ygg-version="${version.version}">\n${version.content_html}\n</blockquote>`,
    );
  }
  flushProse();
  return { html: htmlParts.join("\n"), transclusions, errors };
}

/**
 * Resolve every `![[id]]` directive in a thread's markdown against currently
 * published local fragments, baking each target's latest published HTML into
 * a `blockquote.ygg-transclusion` snapshot (§2.9). Readers never resolve
 * anything — this runs only at publish time, called from model.publish().
 */
export async function resolveTransclusions(db: D1Database, contentMd: string): Promise<ResolveResult> {
  return walk(db, contentMd, () => null);
}

/**
 * Studio-only preview variant — never aborts; an unresolvable directive
 * renders as a visible red placeholder so the editor can show exactly what
 * publish will reject, before the author hits publish. Not used at publish
 * time (see resolveTransclusions above); not a protocol surface.
 */
export async function previewTransclusions(db: D1Database, contentMd: string): Promise<ResolveResult> {
  return walk(
    db,
    contentMd,
    (err) => `<blockquote class="ygg-transclusion unresolved"><p>⚠ unresolvable: ${escapeHtml(err.reason)}</p></blockquote>`,
  );
}
