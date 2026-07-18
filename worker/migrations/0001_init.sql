-- Ygg v0.1 schema, per docs/v0.1-plan.md §3.1.
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'fragment',       -- 'fragment' | 'tombstone'
  status TEXT NOT NULL DEFAULT 'draft',        -- 'draft' | 'public' | 'deleted'
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,          -- last published version; 0 = never published
  content_md TEXT NOT NULL DEFAULT '',         -- working copy (may be ahead of last published)
  dirty INTEGER NOT NULL DEFAULT 0             -- working copy differs from last published version
);

CREATE TABLE versions (
  item_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content_md TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  published_at TEXT NOT NULL,
  note TEXT,
  PRIMARY KEY (item_id, version)
);

CREATE TABLE media (
  id TEXT PRIMARY KEY,                          -- short random key, 8 chars ygg alphabet
  item_id TEXT,
  r2_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  alt TEXT,
  created TEXT NOT NULL
);

CREATE TABLE settings ( key TEXT PRIMARY KEY, value TEXT NOT NULL );
-- settings keys: site_title, author_name, author_bio, author_links (JSON), site_url, avatar_media_id
