-- A stub's citation, as text that outlives the link (session 23, Venkat's
-- ruling: conventional citation norms). `stub_of` on the wire is permanent
-- but names an identity, not a work: origin, id, version. The human-readable
-- half — whose blyg it was, what it said, when we resolved it — is composed
-- from local knowledge at publish time and frozen here, so the citation still
-- reads correctly years later when the subscription is gone, the origin has
-- moved, or the target 404s. Client-side presentation cache, never emitted in
-- any item document: adding members to `stub_of` would be a wire change, and
-- decision #27 locked that shape.
ALTER TABLE versions ADD COLUMN stub_cite TEXT;
