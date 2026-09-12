-- Hopper rename (session 18). The name becomes editable; the slug does not
-- follow it once the hopper has been public, because a public hopper's
-- /h/{slug}/ URL is the only way anyone reaches it — there is no discovery
-- surface for hoppers (no manifest key, no index, and the static export names
-- slugs explicitly), so every visitor arrived from a link the author shared.
-- Re-slugging would silently break all of them. slug_frozen latches to 1 the
-- first time a hopper is made public and never returns to 0, so the promise
-- survives the hopper being taken private and renamed later.
ALTER TABLE hoppers ADD COLUMN slug_frozen INTEGER NOT NULL DEFAULT 0;
UPDATE hoppers SET slug_frozen = 1 WHERE public = 1;
