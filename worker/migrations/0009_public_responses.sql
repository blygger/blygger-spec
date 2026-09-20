-- Public responses (v0.3-plan.md §3.4, Venkat's session-23 ruling: shape A —
-- a citation trail, no count — plus a hide control, open to all origins).
--
-- Both columns are the *author's* editorial controls over a view of other
-- people's items. Neither touches items/versions: a response list is page
-- chrome rendered from these tables at request time, never stored bytes and
-- never part of a versioned document — see the note in pages.responsesSection.
ALTER TABLE items ADD COLUMN show_responses INTEGER NOT NULL DEFAULT 0;  -- opt-in, per item, off by default
ALTER TABLE mentions_in ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;    -- author took this one off the page
