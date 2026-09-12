// Plain-text previews for studio list surfaces (index rows, reading entries).
// Studio furniture, not protocol surface.
//
// The rule these exist to enforce: a preview is derived from RENDERED HTML,
// never from markdown source. Excerpting markdown directly is what put
// literal "#" and "*" markers and leaked "[TK]" scopes into the studio index
// — block syntax survives as text once whitespace is collapsed. Rendering
// first and then extracting text makes the markers structural, so they
// disappear for free.
//
// Text extraction itself lives in markdown.ts (plainTextFromHtml) — one
// implementation shared with the feed/page excerpts, not a private copy.

import { plainTextFromHtml } from "./markdown.ts";

/**
 * Remove baked transclusion blockquotes from a published thread's HTML. A
 * thread's quoted fragments are its substance, but they swamp a one-line
 * excerpt — the row shows the author's own prose plus a "⧉N" count instead.
 */
export function stripTransclusionQuotes(html: string): string {
  return html.replace(/<blockquote class="blyg-transclusion">[\s\S]*?<\/blockquote>/gi, " ");
}

/** Split a leading <h1>–<h6> off rendered HTML, so a titled item shows its title as a title. */
export function leadingHeading(html: string): { title: string | null; rest: string } {
  const m = /^\s*<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(html);
  if (!m) return { title: null, rest: html };
  const title = plainTextFromHtml(m[1]);
  return { title: title || null, rest: html.slice(m[0].length) };
}

export function clampText(text: string, n: number): string {
  const t = text.trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export interface HtmlPreview {
  title: string | null;
  body: string;
}

/** Title + clamped one-line body for a studio list row. */
export function previewFromHtml(html: string, bodyChars = 110): HtmlPreview {
  const { title, rest } = leadingHeading(html);
  return { title, body: clampText(plainTextFromHtml(rest), bodyChars) };
}

/**
 * Split L0 (legacy-RSS) reading content into its title link and summary body.
 * Safe to pattern-match because we generate this HTML ourselves — l0.ts
 * renders "[title](link)\n\nsummary" through our own markdown pipeline, so
 * the leading anchor paragraph is a stable shape, not arbitrary remote HTML.
 */
export function splitL0Content(html: string): { titleHtml: string | null; bodyHtml: string } {
  const m = /^\s*<p>\s*(<a\s[^>]*>[\s\S]*?<\/a>)\s*<\/p>/i.exec(html);
  if (!m) return { titleHtml: null, bodyHtml: html };
  return { titleHtml: m[1], bodyHtml: html.slice(m[0].length) };
}
