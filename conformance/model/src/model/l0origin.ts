// A plain-RSS origin (no blyg vocabulary), for §13.6's L0 wrapper.
import { escapeXml, rfc822 } from "./text.ts";
import type { Served } from "./publisher.ts";

export interface L0Entry { guid: string; link: string; title: string; summary: string; at: number }

export class L0Origin {
  entries: L0Entry[] = [];
  window = 3;
  private seq = 0;
  constructor(readonly origin: string) {}

  post(summary: string): string {
    const n = ++this.seq;
    const guid = `${this.origin}posts/${n}`;
    this.entries.unshift({ guid, link: guid, title: `post ${n}`, summary, at: n });
    return guid;
  }
  /** RSS has no versions: the same GUID reappearing with changed content (§13.6). */
  edit(k: number, summary: string): string | null {
    const e = this.entries[k % Math.max(1, this.entries.length)];
    if (!e) return null;
    e.summary = summary;
    return e.guid;
  }
  serve(path: string): Served {
    if (path !== "feed.xml") return { status: 404, body: "" };
    const items = this.entries.slice(0, this.window).map((e) => `    <item>
      <guid>${escapeXml(e.guid)}</guid>
      <link>${escapeXml(e.link)}</link>
      <title>${escapeXml(e.title)}</title>
      <description>${escapeXml(e.summary)}</description>
      <pubDate>${rfc822(e.at)}</pubDate>
    </item>`);
    return { status: 200, body: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>legacy</title><link>${escapeXml(this.origin)}</link><description></description>
${items.join("\n")}
</channel></rss>` };
  }
}
