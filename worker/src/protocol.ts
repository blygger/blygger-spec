// Protocol surface builders: item JSON, manifest, archive index, feed.xml
// — v0.1-plan §2.3–2.6. These shapes are protocol; do not change casually.

import { listBlogrollSubscriptions } from "./importer/store.ts";
import { excerpt, excerptFromHtml } from "./markdown.ts";
import { forkLineage, injectProvenance, stubCitation, transclusionProvenance } from "./pages.ts";
import { parseStoredFork, parseStoredStub } from "./stub.ts";
import {
  authoredKind,
  feedEvents,
  getMedia,
  lastUpdated,
  listMediaForItem,
  listPublic,
  listVersions,
  publishedVersion,
} from "./model.ts";
import type { ItemRow, ScopeProvenance, Settings, Transclusion, VersionRow } from "./types.ts";
import { BRAND, FEED_WINDOW, GENERATOR, PROTOCOL_LEVEL, PROTOCOL_VERSION, WEBMENTION_PATH } from "./types.ts";
import { absolutizeHtml, cdata, escapeXml, rfc822 } from "./util.ts";

/**
 * Canonical origin for this deployment — the blyg's base URL, always ending
 * in "/". settings.site_url wins when set; otherwise derived from the request
 * origin + the deployment mount (decision #14: "" mount = domain root).
 */
export function siteOrigin(settings: Settings, requestUrl: string, mount: string): string {
  if (settings.site_url) return settings.site_url.endsWith("/") ? settings.site_url : settings.site_url + "/";
  return new URL(requestUrl).origin + mount + "/";
}

function author(settings: Settings, origin: string) {
  return { name: settings.author_name, url: origin };
}

/** §2.3 item JSON. Only the latest published version's content is served. */
export async function buildItemJson(db: D1Database, settings: Settings, item: ItemRow, origin: string) {
  const isWithdrawn = item.kind === "withdrawn";
  const latest = await publishedVersion(db, item);
  const contentMd = isWithdrawn ? "" : (latest?.content_md ?? "");
  const contentHtml = isWithdrawn ? "" : (latest?.content_html ?? "");
  const media = isWithdrawn ? [] : await listMediaForItem(db, item.id);
  const changelog = (await listVersions(db, item.id)).map((v) => ({
    version: v.version,
    at: v.published_at,
    note: v.note,
    ...(v.pinned === 1 ? { pinned: true } : {}),
  }));
  // Thread items additionally carry transclusions provenance (§2.9); a
  // withdrawn thread's endcap empties it to [] alongside content_md/media.
  const isThread = isWithdrawn ? (await authoredKind(db, item)) === "thread" : item.kind === "thread";
  const transclusions: Transclusion[] | undefined = isThread
    ? isWithdrawn
      ? []
      : (JSON.parse(latest?.transclusions ?? "[]") as Transclusion[])
    : undefined;
  // TK generation provenance (tk-core-plan.md §3.1): optional, valid for
  // both kinds; withdrawal empties it alongside content_md/content_html,
  // same as the other content-linked fields.
  const generated: ScopeProvenance[] | undefined =
    !isWithdrawn && latest?.generated_json ? (JSON.parse(latest.generated_json) as ScopeProvenance[]) : undefined;
  // §2.2 stub citation: published on the version, so a withdrawal endcap —
  // which stores none — simply stops carrying it, and a withdrawn stub
  // stops verifying on the far side (§2.3.6). Threads only.
  const stubOf = isWithdrawn ? null : parseStoredStub(latest?.stub_of ?? null);
  // §2.4 lineage. Unlike every field above it, this one survives withdrawal:
  // the endcap empties what the item *said* (content, media, transclusions,
  // its stub citation), because those are the published work and the work is
  // being taken back. Where the item came from is not the work — it is a fact
  // about the item's origin, in the same class as `created` and `page`, which
  // the endcap also keeps. It costs nothing to keep and a withdrawn fork that
  // denied its parentage would be the protocol telling a small lie.
  const forkedFrom = parseStoredFork(item.forked_from);
  return {
    blyg: PROTOCOL_VERSION,
    id: item.id,
    kind: item.kind,
    origin,
    // §2.3.2 (decision #29): the origin-relative permalink, so a reader never
    // has to *infer* it from the f/·t/ convention this client happens to use.
    // Emitted for withdrawn items too — an endcap's page is 200 forever, and a
    // mention may legitimately target it.
    page: `${isThread ? "t" : "f"}/${item.id}/`,
    author: author(settings, origin),
    created: item.created,
    updated: item.updated,
    version: item.version,
    content_md: contentMd,
    content_html: contentHtml,
    content_hash: latest?.content_hash ?? "",
    media: media.map((m) => ({ url: m.r2_key, mime: m.mime, alt: m.alt ?? "" })),
    ...(transclusions !== undefined ? { transclusions } : {}),
    ...(stubOf ? { stub_of: stubOf } : {}),
    ...(forkedFrom ? { forked_from: forkedFrom } : {}),
    ...(generated !== undefined ? { generated } : {}),
    changelog,
  };
}

/** §2.8 pinned version file — permanent, survives edits and withdrawal. */
export function buildPinnedVersionJson(settings: Settings, item: ItemRow, row: VersionRow, origin: string) {
  const isThread = row.transclusions !== null;
  return {
    blyg: PROTOCOL_VERSION,
    id: item.id,
    kind: isThread ? "thread" : "fragment",
    version: row.version,
    at: row.published_at,
    note: row.note,
    pinned: true,
    origin,
    author: author(settings, origin),
    content_md: row.content_md,
    content_html: row.content_html,
    content_hash: row.content_hash,
    ...(isThread ? { transclusions: JSON.parse(row.transclusions as string) as Transclusion[] } : {}),
    // A pin carries its own citation (§2.2): the frozen artifact says what it
    // was responding to, at the version it was responding to.
    ...(parseStoredStub(row.stub_of) ? { stub_of: parseStoredStub(row.stub_of) } : {}),
    // Lineage travels with the pin too, and safely: `items.forked_from` is
    // written once at fork time and has no setter, so a frozen document can
    // never come to disagree with the live item about where it came from.
    ...(parseStoredFork(item.forked_from) ? { forked_from: parseStoredFork(item.forked_from) } : {}),
    ...(row.generated_json ? { generated: JSON.parse(row.generated_json) as ScopeProvenance[] } : {}),
  };
}

/** §2.4 manifest. */
export async function buildManifest(db: D1Database, settings: Settings, origin: string, opts: { webmention?: boolean } = {}) {
  // Relative media path, resolved to the row's `r2_key` (`media/{id}.{ext}`).
  // Emitting the bare id produced a manifest `avatar` that always 404s, since
  // `/media/:file` matches the full key including the extension (session 19).
  const avatarRow = settings.avatar_media_id ? await getMedia(db, settings.avatar_media_id) : null;
  const avatar = avatarRow?.r2_key;
  const hasBlogroll = (await listBlogrollSubscriptions(db)).length > 0;
  return {
    blyg: PROTOCOL_VERSION,
    level: PROTOCOL_LEVEL,
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
    // §2.2: OPTIONAL, origin-relative; present only when the blogroll is non-empty.
    ...(hasBlogroll ? { blogroll: "blogroll.opml" } : {}),
    // v0.3 §2.3.1: present only when this deployment can actually receive.
    // A static export omits it — the exported tree has no endpoint behind it,
    // and advertising one would promise delivery nothing could keep.
    ...(opts.webmention === false ? {} : { webmention: WEBMENTION_PATH }),
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
export function feedTitle(item: ItemRow, note: string | null, excerptText: string): string {
  if (item.kind === "withdrawn") return "withdrawn";
  return note ? `${note} — ${excerptText}` : excerptText;
}

function latestTransclusions(latest: VersionRow | null): Transclusion[] {
  if (!latest?.transclusions) return [];
  return JSON.parse(latest.transclusions) as Transclusion[];
}

/** §2.6 feed.xml: RSS 2.0 + blyg namespace, per-version GUIDs, 50-entry window. */
export async function buildFeedXml(db: D1Database, settings: Settings, origin: string): Promise<string> {
  const events = await feedEvents(db, FEED_WINDOW);
  const built = await lastUpdated(db);
  // Root-relative path of the canonical origin ("" for a root mount) — keeps
  // injected provenance links consistent with `origin` after absolutizeHtml.
  const originPath = new URL(origin).pathname.replace(/\/$/, "");
  const itemsXml: string[] = [];
  // Per §2.3, only the latest version's content is published — feed entries
  // for older publish events carry the event's version/note but render the
  // item's *latest* content (see DEVLOG session 2).
  for (const { item, version } of events) {
    const isWithdrawn = item.kind === "withdrawn";
    const latest = isWithdrawn ? null : await publishedVersion(db, item);
    const latestMd = latest?.content_md ?? "";
    const isThread = isWithdrawn ? (await authoredKind(db, item)) === "thread" : item.kind === "thread";
    const rawHtml = latest?.content_html ?? "";
    let html = isWithdrawn
      ? ""
      : absolutizeHtml(
          isThread ? injectProvenance(rawHtml, await transclusionProvenance(db, latestTransclusions(latest), originPath)) : rawHtml,
          origin,
        );
    if (!isWithdrawn) {
      for (const m of await listMediaForItem(db, item.id)) {
        html += `<p><img src="${origin}${m.r2_key}" alt="${escapeXml(m.alt ?? "")}"></p>`;
      }
    }
    // A citation travels with the work: an RSS reader showing this item should
    // show what it answers, in the same injected-presentation layer as
    // transclusion provenance (which has been in the description since 0.1).
    if (!isWithdrawn && isThread && latest?.stub_of) {
      html = absolutizeHtml(stubCitation(latest, { compact: true }), origin) + html;
    }
    // Lineage rides along for the same reason, and for both kinds — a fork is
    // a fragment as often as a thread.
    if (!isWithdrawn && item.forked_from) {
      html = absolutizeHtml(forkLineage(item, { compact: true }), origin) + html;
    }
    const excerptText = isWithdrawn ? "" : isThread ? excerptFromHtml(rawHtml, 60) : excerpt(latestMd, 60);
    itemsXml.push(
      `    <item>
      <guid isPermaLink="false">blyg:${item.id}:v${version.version}</guid>
      <link>${origin}${isThread ? "t" : "f"}/${item.id}/</link>
      <title>${escapeXml(feedTitle(item, version.note, excerptText))}</title>
      <description>${isWithdrawn ? "" : cdata(html)}</description>
      <pubDate>${rfc822(version.published_at)}</pubDate>
      <blyg:id>${item.id}</blyg:id>
      <blyg:kind>${item.kind}</blyg:kind>
      <blyg:version>${version.version}</blyg:version>
      <blyg:created>${item.created}</blyg:created>
      <blyg:item>${origin}items/${item.id}.json</blyg:item>
    </item>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:blyg="${BRAND.nsUri}">
  <channel>
    <title>${escapeXml(settings.site_title)}</title>
    <link>${origin}</link>
    <description>${escapeXml(settings.author_bio)}</description>
    <lastBuildDate>${rfc822(built)}</lastBuildDate>
    <blyg:level>${PROTOCOL_LEVEL}</blyg:level>
    <blyg:manifest>${origin}blyg.json</blyg:manifest>
${itemsXml.join("\n")}
  </channel>
</rss>
`;
}
