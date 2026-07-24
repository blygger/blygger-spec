-- Session-3 protocol revision: tombstone/unpublish → withdraw + pinned versions.
-- See docs/v0.1-plan.md §2.3/§2.8/§3.1 and docs/proposals/retract-pin-fork-proposal.md.
ALTER TABLE versions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE versions ADD COLUMN pinned_at TEXT;
-- Rename the old states. No deployment exists yet; local dev DBs may carry them.
UPDATE items SET status = 'withdrawn' WHERE status = 'deleted';
UPDATE items SET kind = 'withdrawn' WHERE kind = 'tombstone';
