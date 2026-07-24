// Protocol surface builders: item JSON, manifest, archive index, feed.xml
// — v0.1-plan §2.3–2.6. These shapes are protocol; do not change casually.

import { excerpt, renderMarkdown } from "./markdown.ts";
import {
  feedEvents,
  lastUpdated,
  listMediaForItem,
  listPublic,
  listVersions,
  publishedVersion,
} from "./model.ts";
import type { ItemRow, Settings, VersionRow } from "./types.ts";
import { FEED_WINDOW, GENERATOR, YGG_LEVEL, YGG_NS, YGG_VERSION } from "./types.ts";
import { absolutizeHtml, cdata, escapeXml, rfc822 } from "./util.ts";

/** Canonical origin for this deployment, always ending in /ygg/. */
export function siteOrigin(settings: Settings, requestUrl: string): string {
  if (settings.site_url) return settings.site_url.endsWith("/") ? settings.site_url : settings.site_url + "/";
  return new URL(requestUrl).origin + "/ygg/";
}

function author(settings: Settings, origin: string) {
  return { name: settings.author_name, url: origin };
}

/** §2.3 item JSON. Only the latest published version's content is served. */
export async function buildItemJson(db: D1Database, settings: Settings, item: ItemRow, origin: string) {
  const isWithdrawn = item.kind === "withdrawn";
  const latest = await publishedVersion(db, item);
  const contentMd = isWithdrawn ? "" : (latest?.content_md ?? "");
  const media = isWithdrawn ? [] : await listMediaForItem(db, item.id);
  const changelog = (await listVersions(db, item.id)).map((v) => ({
    version: v.version,
    at: v.published_at,
    note: v.note,
    ...(v.pinned === 1 ? { pinned: true } : {}),
  }));
  return {
    ygg: YGG_VERSION,
    id: item.id,
    kind: item.kind,
    origin,
    author: author(settings, origin),
    created: item.created,
    updated: item.updated,
    version: item.version,
    content_md: contentMd,
    content_html: isWithdrawn ? "" : renderMarkdown(contentMd),
    content_hash: latest?.content_hash ?? "",
    media: media.map((m) => ({ url: m.r2_key, mime: m.mime, alt: m.alt ?? "" })),
    changelog,
  };
}

/** §2.8 pinned version file — permanent, survives edits and withdrawal. */
export function buildPinnedVersionJson(settings: Settings, item: ItemRow, row: VersionRow, origin: string) {
  return {
    ygg: YGG_VERSION,
    id: item.id,
    kind: "fragment",
    version: row.version,
    at: row.published_at,
    note: row.note,
    pinned: true,
    origin,
    author: author(settings, origin),
    content_md: row.content_md,
    content_html: renderMarkdown(row.content_md),
    content_hash: row.content_hash,
  };
}

/** §2.4 manifest. */
export async function buildManifest(db: D1Database, settings: Settings, origin: string) {
  const avatar = settings.avatar_media_id ? `media/${settings.avatar_media_id}` : undefined;
  return {
    ygg: YGG_VERSION,
    level: YGG_LEVEL,
    generator: GENERATOR,
    site: origin,
    title: settings.site_title,
    author: {
      name: settings.author_name,
      bio: settings.author_bio,
      ...(avatar ? { avatar } : {}),
      links: settings.author_links,
    },
    feed: "feed.xml",
    items: "items/index.json",
    updated: await lastUpdated(db),
  };
}

/** §2.5 archive index — every published item + withdrawn endcap, no window. */
export async function buildArchiveIndex(db: D1Database) {
  const items = await listPublic(db);
  return {
    updated: await lastUpdated(db),
    items: items.map((i) => ({
      id: i.id,
      kind: i.kind,
      created: i.created,
      updated: i.updated,
      version: i.version,
    })),
  };
}

/** Feed entry title: edit note if present + ~60 chars of plain text; withdrawal events say "withdrawn". */
export function feedTitle(item: ItemRow, note: string | null, contentMd: string): string {
  if (item.kind === "withdrawn") return "withdrawn";
  const ex = excerpt(contentMd, 60);
  return note ? `${note} — ${ex}` : ex;
}

/** §2.6 feed.xml: RSS 2.0 + ygg namespace, per-version GUIDs, 50-entry window. */
export async function buildFeedXml(db: D1Database, settings: Settings, origin: string): Promise<string> {
  const events = await feedEvents(db, FEED_WINDOW);
  const built = await lastUpdated(db);
  const itemsXml: string[] = [];
  // Per §2.3, only the latest version's content is published — feed entries
  // for older publish events carry the event's version/note but render the
  // item's *latest* content (see DEVLOG session 2).
  for (const { item, version } of events) {
    const isWithdrawn = item.kind === "withdrawn";
    const latest = isWithdrawn ? null : await publishedVersion(db, item);
    const latestMd = latest?.content_md ?? "";
    let html = isWithdrawn ? "" : absolutizeHtml(renderMarkdown(latestMd), origin);
    if (!isWithdrawn) {
      for (const m of await listMediaForItem(db, item.id)) {
        html += `<p><img src="${origin}${m.r2_key}" alt="${escapeXml(m.alt ?? "")}"></p>`;
      }
    }
    itemsXml.push(
      `    <item>
      <guid isPermaLink="false">ygg:${item.id}:v${version.version}</guid>
      <link>${origin}f/${item.id}/</link>
      <title>${escapeXml(feedTitle(item, version.note, latestMd))}</title>
      <description>${isWithdrawn ? "" : cdata(html)}</description>
      <pubDate>${rfc822(version.published_at)}</pubDate>
      <ygg:id>${item.id}</ygg:id>
      <ygg:kind>${item.kind}</ygg:kind>
      <ygg:version>${version.version}</ygg:version>
      <ygg:created>${item.created}</ygg:created>
      <ygg:item>${origin}items/${item.id}.json</ygg:item>
    </item>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:ygg="${YGG_NS}">
  <channel>
    <title>${escapeXml(settings.site_title)}</title>
    <link>${origin}</link>
    <description>${escapeXml(settings.author_bio)}</description>
    <lastBuildDate>${rfc822(built)}</lastBuildDate>
    <ygg:level>${YGG_LEVEL}</ygg:level>
    <ygg:manifest>${origin}ygg.json</ygg:manifest>
${itemsXml.join("\n")}
  </channel>
</rss>
`;
}
