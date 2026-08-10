-- v0.2 "Roots" subscribe side. See docs/v0.2-plan.md §4.1.
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,                -- local random key
  kind TEXT NOT NULL,                 -- 'blyg' | 'rss'
  origin TEXT NOT NULL,               -- blyg: origin base URL; rss: feed URL
  feed_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'paused' | 'degraded'
  etag TEXT, last_modified TEXT,
  last_poll_at TEXT, newest_guid TEXT,
  fail_count INTEGER NOT NULL DEFAULT 0,
  last_index_sync_at TEXT,
  in_blogroll INTEGER NOT NULL DEFAULT 0,
  flags TEXT NOT NULL DEFAULT '[]',   -- JSON discrepancy log (regression, stealth edit, hash mismatch, site-vs-origin, lossy-mode)
  created TEXT NOT NULL
);
CREATE TABLE imported_items (
  subscription_id TEXT NOT NULL,
  remote_id TEXT NOT NULL,            -- blyg id, or synthetic l0 id
  kind TEXT NOT NULL,                 -- 'fragment' | 'thread'
  state TEXT NOT NULL,                -- 'current' | 'tombstone'
  version INTEGER NOT NULL,           -- watermark (highest ever observed)
  created TEXT, updated TEXT,         -- origin-asserted
  observed_at TEXT NOT NULL,          -- ours; display clamp input
  content_md TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  content_hash TEXT,
  author_json TEXT, media_json TEXT, transclusions_json TEXT,
  l0 INTEGER NOT NULL DEFAULT 0,
  pinned_version_retained INTEGER,    -- non-null: tombstone whose content survives via this pinned version
  PRIMARY KEY (subscription_id, remote_id)
);
CREATE TABLE hoppers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE,
  public INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL
);
CREATE TABLE hopper_items (
  hopper_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL, remote_id TEXT NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (hopper_id, subscription_id, remote_id)
);
CREATE TABLE signals (
  subscription_id TEXT NOT NULL, remote_id TEXT NOT NULL,
  thumb INTEGER NOT NULL,             -- 1 | -1
  at TEXT NOT NULL,
  PRIMARY KEY (subscription_id, remote_id)
);
