-- v0.3 "Trunk": cross-client threads, stubs, Webmention. See docs/v0.3-plan.md §4.1
-- (decisions #26–#29). Every column here is additive and nullable: a 0.2 row
-- stays valid, and no 0.2 item document is invalidated by the upgrade.

-- §2.2 stub metadata. The working copy carries the citation the author set when
-- the stub was created; publish() copies it onto the version with the
-- version-agreement rule, so a pinned version carries its own citation and a
-- withdrawal endcap (which writes no stub_of) stops verifying.
ALTER TABLE items    ADD COLUMN stub_of TEXT;      -- working copy, JSON
ALTER TABLE versions ADD COLUMN stub_of TEXT;      -- as published, JSON

-- §2.1: transclusions JSON entries may now carry "origin" for remote sources.
-- Omitted for own-origin, so no DDL change and no rewrite of stored rows.

-- §2.3.2: the item document's origin-relative permalink, stored as imported so
-- a mention's target URL is the origin's own, not our f/·t/ convention.
ALTER TABLE imported_items ADD COLUMN page TEXT;

-- §2.3.5 inbound mentions. A verified mention is a *pointer*: source identity,
-- relation and page URL, never any of the source's content.
CREATE TABLE mentions_in (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL, target TEXT NOT NULL,      -- as received, normalized
  target_item_id TEXT NOT NULL,
  status TEXT NOT NULL,                            -- 'pending' | 'verified' | 'failed' | 'gone'
  relation TEXT,                                   -- 'stub' | 'transclusion' | 'fork'
  source_origin TEXT, source_id TEXT, source_kind TEXT, source_version INTEGER,
  source_author_json TEXT, source_page TEXT,
  first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, verified_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0, error TEXT,
  UNIQUE (source, target)
);
CREATE INDEX mentions_in_target ON mentions_in (target_item_id, status);

-- §2.3.3/§2.3.4 outbound mentions. Keyed on (item_id, target) so a republish
-- upserts the existing row back to 'pending' rather than duplicating it —
-- "re-send only when new or changed" falls out of the upsert.
CREATE TABLE mentions_out (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL, version INTEGER NOT NULL,
  target TEXT NOT NULL, endpoint TEXT,
  status TEXT NOT NULL,                            -- 'pending' | 'sent' | 'failed' | 'no_endpoint'
  attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT, last_error TEXT,
  created TEXT NOT NULL,
  UNIQUE (item_id, target)
);
CREATE INDEX mentions_out_due ON mentions_out (status, next_attempt_at);
