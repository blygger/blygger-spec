// Blogroll — v0.2-plan.md §2.2, mechanics for locked decision #13. Standard
// OPML 2.0, no extensions: a crawler resolving xmlUrl through §2.1 gets the
// blyg upgrade for free via the <blyg:manifest> feed element, so nothing
// blyg-specific is needed in the OPML itself.

import type { SubscriptionRow } from "../types.ts";
import { escapeXml } from "../util.ts";

export function buildBlogrollOpml(subs: SubscriptionRow[], siteTitle: string): string {
  const outlines = subs
    .map((s) => {
      const title = escapeXml(s.title || s.origin);
      // htmlUrl: the subscription's origin for a blyg; for L0/rss subscriptions
      // we only ever resolved a feed URL (no separately-known page URL per
      // §3.5), so origin === feed_url there and htmlUrl reuses it honestly
      // rather than guessing at a homepage.
      return `    <outline text="${title}" title="${title}" type="rss" xmlUrl="${escapeXml(s.feed_url)}" htmlUrl="${escapeXml(s.origin)}"/>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(siteTitle)} — blogroll</title>
  </head>
  <body>
${outlines}
  </body>
</opml>
`;
}
