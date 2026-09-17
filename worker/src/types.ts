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
  /** TK generation (tk-core-plan.md §4): Anthropic Messages API key. Wrangler secret, per security-policy.md — never in code or .dev.vars committed to git. */
  AI_PROVIDER_KEY?: string;
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
  /**
   * Working-copy-side cache of per-scope TK generation provenance (migration
   * 0005) — JSON array of `ScopeProvenance | null`, positionally aligned to
   * the scope order in `content_md` as of the last /generate call. Not a
   * wire artifact; see model.ts getTkProvenance/setTkProvenance.
   */
  tk_provenance_json: string | null;
  /**
   * Working-copy stub citation (migration 0007, v0.3-plan §2.2) — JSON `StubOf`
   * or null. Threads only. Carried onto the published version by publish(),
   * under the version-agreement rule; never re-derived from the body.
   */
  stub_of: string | null;
}

export interface Transclusion {
  id: string;
  version: number;
  /**
   * Identity origin of a remote source (v0.3-plan §2.1, decision #26) — the
   * subscription's post-redirect fetch origin per 0.2 §12.2, never the
   * manifest's self-asserted `site`. **Omitted for own-origin sources**, which
   * is what keeps every 0.2 document a valid 0.3 document unchanged.
   */
  origin?: string;
}

/**
 * A stub's single target (v0.3-plan §2.2, decision #27): a blyg citation, in
 * which `origin` is REQUIRED even when it is our own (a citation is absolute),
 * or a plain-web URL. Exactly one shape per stub, exactly one target per stub.
 */
export type StubOf = { origin: string; id: string; version: number } | { url: string };

/** Per-scope TK generation provenance (tk-core-plan.md §3.1/§4). */
export interface ScopeProvenance {
  sources: { id: string; version: number }[];
  model?: string;
  at?: string;
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
  /** JSON ScopeProvenance[] (migration 0005); null when this version involved no TK generation. */
  generated_json: string | null;
  /** JSON `StubOf` as published (migration 0007); null for non-stubs and for every withdrawal endcap. */
  stub_of: string | null;
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

// --- v0.2 "Roots" subscribe side (migration 0004, v0.2-plan.md §4.1) ---

export interface SubscriptionRow {
  id: string;
  kind: "blyg" | "rss";
  origin: string;
  feed_url: string;
  title: string;
  status: "active" | "paused" | "degraded";
  etag: string | null;
  last_modified: string | null;
  last_poll_at: string | null;
  newest_guid: string | null;
  fail_count: number;
  last_index_sync_at: string | null;
  in_blogroll: number;
  /** JSON array of ImporterFlag strings — the discrepancy log surfaced in the subs UI. */
  flags: string;
  created: string;
}

export interface ImportedItemRow {
  subscription_id: string;
  remote_id: string;
  kind: "fragment" | "thread";
  state: "current" | "tombstone";
  version: number;
  created: string | null;
  updated: string | null;
  observed_at: string;
  content_md: string;
  content_html: string;
  content_hash: string | null;
  author_json: string | null;
  media_json: string | null;
  transclusions_json: string | null;
  l0: number;
  pinned_version_retained: number | null;
  /** Origin-relative permalink as the origin itself declares it (item doc `page`, v0.3-plan §2.3.2); null when the origin omits it and the f/·t/ convention applies. */
  page: string | null;
}

export interface HopperRow {
  id: string;
  name: string;
  slug: string | null;
  public: number;
  created: string;
  /** Latches to 1 the first time the hopper is made public — see migration 0006. A frozen slug never re-derives from a rename. */
  slug_frozen: number;
}

export interface HopperItemRow {
  hopper_id: string;
  subscription_id: string;
  remote_id: string;
  added_at: string;
}

export interface SignalRow {
  subscription_id: string;
  remote_id: string;
  thumb: 1 | -1;
  at: string;
}

// --- v0.3 "Trunk" Webmention (migration 0007, v0.3-plan.md §4.1) ---

/** Why a mention relates to us — read out of the source document's own structure, never from body text (§2.3.5). */
export type MentionRelation = "stub" | "transclusion" | "fork";

/**
 * An inbound mention. `pending` → `verified` | `failed` | `gone`; a row that
 * verified once and stops verifying becomes `gone` rather than being deleted,
 * so a stubber who withdraws and republishes is recognized, not treated as new.
 * No source content is ever stored — this row is a pointer (§2.3.5).
 */
export interface MentionInRow {
  id: string;
  source: string;
  target: string;
  target_item_id: string;
  status: "pending" | "verified" | "failed" | "gone";
  relation: MentionRelation | null;
  source_origin: string | null;
  source_id: string | null;
  source_kind: string | null;
  source_version: number | null;
  source_author_json: string | null;
  source_page: string | null;
  first_seen: string;
  last_seen: string;
  verified_at: string | null;
  attempts: number;
  error: string | null;
}

/** An outbound mention. Fire-and-forget from the author's view: publish enqueues, the cron drains (§2.3.3/§2.3.4). */
export interface MentionOutRow {
  id: string;
  item_id: string;
  version: number;
  target: string;
  endpoint: string | null;
  status: "pending" | "sent" | "failed" | "no_endpoint";
  attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created: string;
}

/** Site settings with defaults applied. */
export interface Settings {
  site_title: string;
  /** Reading theme for the public pages — a key of THEMES, or "auto" to follow the reader's system preference. */
  theme: string;
  author_name: string;
  author_bio: string;
  author_links: AuthorLink[];
  /** Canonical origin (full base URL incl. any mount path, e.g. https://example.com/blyg/); empty = derive from request origin + MOUNT. */
  site_url: string;
  avatar_media_id: string;
  /** TK generation (tk-core-plan.md §4/§5): provider model id. Empty = provider default. */
  ai_model: string;
  /** TK generation: optional site-level style prompt appended to every generation request. */
  ai_style_prompt: string;
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
 * (domain root). `/blyg/blyg.json` is the intended asymmetry: the path is
 * the deployer's, the filename is the protocol's. Config files that can't
 * import this (wrangler.jsonc, package.json) are listed in RENAME.md.
 */
export const BRAND = {
  name: "blygger",
  slug: "blyg",
  /** Protocol XML namespace URI. Permanent opaque token (decision #22): never tracks the protocol version — the manifest "blyg" key is the version signal. */
  nsUri: "https://blygger.org/ns/0.1",
} as const;

/** Reference-client default mount when Env.MOUNT is unset. Deployment lexicon, not wire vocabulary — deliberately ≠ BRAND.slug. */
export const DEFAULT_MOUNT = "/blyg";

/** Origin-relative path of the reference client's Webmention endpoint (v0.3-plan §2.3.1) — inside the origin surface, because it is a protocol surface, unlike host-rooted /studio and /api. */
export const WEBMENTION_PATH = "webmention";

export const GENERATOR = `${BRAND.slug}-ref/0.2.0`;
/** Version key policy (v0.2-plan.md §2.3): the spec version this deployment implements — "0.2" once the blogroll key ships. Readers MUST accept any 0.x value. */
export const PROTOCOL_VERSION = "0.2";
export const PROTOCOL_LEVEL = 1;
export const FRAGMENT_MAX_CHARS = 1000;
export const FEED_WINDOW = 50;
export const FEED_PAGE_SIZE = 100;
