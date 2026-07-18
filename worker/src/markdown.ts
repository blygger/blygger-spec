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
