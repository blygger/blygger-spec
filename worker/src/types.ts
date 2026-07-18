export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  OWNER_PASSWORD: string;
  COOKIE_SECRET: string;
}

export interface ItemRow {
  id: string;
  kind: "fragment" | "tombstone";
  status: "draft" | "public" | "deleted";
  created: string;
  updated: string;
  version: number;
  content_md: string;
  dirty: number;
}

export interface VersionRow {
  item_id: string;
  version: number;
  content_md: string;
  content_hash: string;
  published_at: string;
  note: string | null;
}

export interface MediaRow {
  id: string;
  item_id: string | null;
  r2_key: string;
  mime: string;
  alt: string | null;
  created: string;
}

export interface AuthorLink {
  label: string;
  url: string;
}

/** Site settings with defaults applied. */
export interface Settings {
  site_title: string;
  author_name: string;
  author_bio: string;
  author_links: AuthorLink[];
  /** Canonical site URL ending in /ygg/ ; empty = derive from request origin. */
  site_url: string;
  avatar_media_id: string;
}

export const GENERATOR = "ygg-ref/0.1.0";
export const YGG_VERSION = "0.1";
export const YGG_LEVEL = 1;
export const YGG_NS = "https://github.com/vgururao/ygg/ns/0.1";
export const FRAGMENT_MAX_CHARS = 1000;
export const FEED_WINDOW = 50;
export const FEED_PAGE_SIZE = 100;
