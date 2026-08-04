export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  OWNER_PASSWORD: string;
  COOKIE_SECRET: string;
  /**
   * Deployment mount path for the public surface (wrangler `vars`).
   * "" or "/" = domain root; otherwise a path like "/blyg". Unset falls back
   * to DEFAULT_MOUNT. Normalized by normalizeMount() (util.ts) before use —
   * session 8, locked decision #14: the mount is deployment config, never
   * protocol vocabulary.
   */
  MOUNT?: string;
}

export interface ItemRow {
  id: string;
  kind: "fragment" | "thread" | "withdrawn";
  status: "draft" | "public" | "withdrawn";
  created: string;
  updated: string;
  version: number;
  content_md: string;
  dirty: number;
}

export interface Transclusion {
  id: string;
  version: number;
}

export interface VersionRow {
  item_id: string;
  version: number;
  content_md: string;
  /** Publish-time rendering; for threads this holds the baked transclusion snapshots (migration 0003). */
  content_html: string;
  content_hash: string;
  published_at: string;
  note: string | null;
  /** JSON [{id,version}] for threads; null for fragments (migration 0003). */
  transclusions: string | null;
  pinned: number;
  pinned_at: string | null;
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
  /** Canonical origin (full base URL incl. any mount path, e.g. https://example.com/blyg/); empty = derive from request origin + MOUNT. */
  site_url: string;
  avatar_media_id: string;
}

/**
 * Single source of truth for the project's brand tokens (session 6 rename,
 * ygg -> blygger). `name` is the human-facing brand; `slug` is the
 * machine-facing *wire* token: manifest filename, JSON version key, GUID
 * scheme, XML namespace prefix + element names, cookie name, CSS class
 * prefix. These are protocol-permanent and never vary per deployment.
 *
 * Session 8 (locked decision #14) split the *mount* — where under a domain
 * the public surface lives — out of the slug: the mount is deployment config
 * (Env.MOUNT, default DEFAULT_MOUNT below), freely assignable including ""
 * (domain root). `/blyg/blygg.json` is the intended asymmetry: the path is
 * the deployer's, the filename is the protocol's. Config files that can't
 * import this (wrangler.jsonc, package.json) are listed in RENAME.md.
 */
export const BRAND = {
  name: "blygger",
  slug: "blygg",
  /** Protocol XML namespace URI. Permanent once v0.2 ships importers (v0.1-plan.md §7). */
  nsUri: "https://blygger.org/ns/0.1",
} as const;

/** Reference-client default mount when Env.MOUNT is unset. Deployment lexicon, not wire vocabulary — deliberately ≠ BRAND.slug. */
export const DEFAULT_MOUNT = "/blyg";

export const GENERATOR = `${BRAND.slug}-ref/0.1.0`;
export const PROTOCOL_VERSION = "0.1";
export const PROTOCOL_LEVEL = 1;
export const FRAGMENT_MAX_CHARS = 1000;
export const FEED_WINDOW = 50;
export const FEED_PAGE_SIZE = 100;
