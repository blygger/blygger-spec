-- Session-3 restructure: local threads into v0.1. See docs/v0.1-plan.md §2.9/§3.1.
ALTER TABLE versions ADD COLUMN content_html TEXT NOT NULL DEFAULT '';
ALTER TABLE versions ADD COLUMN transclusions TEXT;
