// Small pure-TS text utilities shared by the reference model. No Node or
// Workers APIs: the model runs in both (plain Node for model-only campaigns,
// workerd for the differential campaign against blygger-studio).

/** §5.1 Crockford base32 alphabet; ids are 26 characters of it. */
export const ID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

/**
 * The id pool. Deliberately tiny and SHARED across origins, so that the
 * generators can produce the cases §5.1 calls "not a real case" but the
 * resolution rules (§10.2) still have to answer: the same id at two imported
 * origins (ambiguous), and an own item with the same id as an imported one.
 */
export const IDS: readonly string[] = Array.from({ length: 10 }, (_, i) => `zz${"0".repeat(23)}${ID_ALPHABET[i + 1]}`);

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function escapeXml(s: string): string {
  return escapeHtml(s).replace(/'/g, "&apos;");
}

/** Minimal "markdown": blank-line-separated paragraphs, each one <p>. */
export function renderParagraphs(md: string): string {
  // Blockquotes are the one block construct the model needs (flattened forks, §16.6f).
  const out: string[] = [];
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    if (/^\s*>/.test(lines[i])) {
      const run: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) run.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>\n${renderParagraphs(run.join("\n"))}\n</blockquote>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*>/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${escapeHtml(para.join(" ").replace(/\s+/g, " ").trim())}</p>`);
  }
  return out.join("\n");
}

/**
 * §10.2's text-content rule for partial transclusion: the snapshot's
 * `content_html` with tags stripped, whitespace collapsed within a block,
 * block boundaries kept as line breaks.
 */
export function textContent(html: string): string {
  return html
    .replace(/<\/(p|blockquote|li|div|h[1-6])\s*>/gi, "\n")
    .replace(/<(p|blockquote|li|div|h[1-6])(\s[^>]*)?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** The selection a partial's attached blockquote denotes, normalized by the same rule. */
export function selectionOf(quoteLines: string[]): string {
  return quoteLines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

const WORDS = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu"];
export function words(seed: number, n: number): string {
  const out: string[] = [];
  let x = (seed * 2654435761) >>> 0;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    out.push(WORDS[(x >>> 8) % WORDS.length]);
  }
  return out.join(" ");
}

export function rfc822(seq: number): string {
  return new Date(Date.UTC(2026, 9, 1, 0, 0, seq)).toUTCString();
}
export function iso(seq: number): string {
  return new Date(Date.UTC(2026, 9, 1, 0, 0, seq)).toISOString().replace(".000", "");
}
