-- Fork lineage (v0.3-plan.md §2.4 / §4.1, Phase B task 11; shape reserved
-- since 0.1 §5.6 and amended additively with a REQUIRED `origin` by #27's
-- citation shape).
--
-- Lineage belongs to the **item**, not to a version: a fork's origin story is
-- fixed the moment the draft is made and can never be edited afterwards, so
-- unlike `stub_of` (which rides `versions` and is re-decided at every publish
-- under the version-agreement rule) there is exactly one row to carry it.
ALTER TABLE items ADD COLUMN forked_from TEXT;  -- JSON ForkedFrom {origin,id,version}, set at fork, immutable
-- The human half, frozen at fork time for the same reason stub_cite is frozen
-- at publish (migration 0008, Venkat's session-23 ruling): every source of the
-- sentence is mutable or mortal, and a lineage line that decays into "forked
-- from [dead link]" has stopped being a citation. Never on the wire.
ALTER TABLE items ADD COLUMN fork_cite TEXT;    -- JSON StubCite
