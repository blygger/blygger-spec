import MarkdownIt from "markdown-it";

// Safe mode: raw HTML in markdown is escaped, never passed through (§3).
const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

export function renderMarkdown(contentMd: string): string {
  return md.render(contentMd);
}

/** Plain text of rendered markdown, for feed titles and excerpts. */
export function plainText(contentMd: string): string {
  const html = md.render(contentMd);
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** First ~n chars of plain text, ellipsized. */
export function excerpt(contentMd: string, n = 60): string {
  const text = plainText(contentMd);
  return text.length <= n ? text : text.slice(0, n).trimEnd() + "…";
}

const BLOCK_BOUNDARY = /<\/(?:p|h[1-6]|li|blockquote|pre|div|tr|section|article)>|<br\s*\/?>/gi;

/** Decode the entities our renderer and feed pipeline actually emit. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" survives as the text "&lt;"
}

/**
 * Plain text from already-rendered HTML — used for thread content (which
 * stores baked content_html rather than independently re-renderable
 * markdown), for feed/page excerpts, and for studio list previews.
 *
 * The single implementation on purpose: a private copy in preview.ts is the
 * duplicated-detector drift that bit resolve.ts vs feed.ts in session 16.
 * Block ends become spaces so "…evil.</p><p>Next…" does not weld into
 * "evil.Next" — a real defect in the previous tag-strip-only version.
 */
export function plainTextFromHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(BLOCK_BOUNDARY, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** First ~n chars of already-rendered HTML's plain text, ellipsized. */
export function excerptFromHtml(html: string, n = 60): string {
  const text = plainTextFromHtml(html);
  return text.length <= n ? text : text.slice(0, n).trimEnd() + "…";
}
