// Sanitize fetched content_html before rendering in the reading UI (§12,
// §3.3 notes: "sanitize at render, store verbatim"). Imported item/media
// HTML is publisher-supplied and untrusted, unlike our own markdown-it
// output (html:false, escaped at source). Allowlist-by-removal via
// HTMLRewriter — native to the Workers runtime, no DOM/jsdom dependency.

const DISALLOWED_TAGS = new Set(["script", "style", "iframe", "object", "embed", "form", "link", "meta", "base"]);

function stripsJavascriptUrl(value: string): boolean {
  return /^\s*javascript:/i.test(value);
}

export async function sanitizeHtml(html: string): Promise<string> {
  const rewriter = new HTMLRewriter().on("*", {
    element(el) {
      if (DISALLOWED_TAGS.has(el.tagName)) {
        el.remove();
        return;
      }
      for (const [name] of [...el.attributes]) {
        if (name.toLowerCase().startsWith("on")) el.removeAttribute(name);
      }
      const href = el.getAttribute("href");
      if (href && stripsJavascriptUrl(href)) el.removeAttribute("href");
      const src = el.getAttribute("src");
      if (src && stripsJavascriptUrl(src)) el.removeAttribute("src");
    },
  });
  return await rewriter.transform(new Response(html)).text();
}
