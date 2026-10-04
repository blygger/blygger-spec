/*
 * blygger.als — Alloy 6 model of the Blygger protocol 0.3 publication and
 * quotation machinery: versions, pins, withdrawal, import, transclusion
 * (whole and partial), nesting, forks and stubs.
 *
 * Source text: docs/protocol-v0.3.md (the living spec). Every fact below is
 * tagged with the section and locked decision it encodes, and quotes the
 * sentence it is trying to say. Where the model had to pick a reading of an
 * ambiguous sentence, the comment says so with "READING:".
 *
 * Abstractions (what the model deliberately leaves out):
 *   - Text is a set of abstract Passage atoms. "Substring of the text
 *     content" (§10.2) becomes "member of the version's passage set". This
 *     is generous to the spec (a real substring test can only be stricter).
 *   - An item id IS the Item atom. Two origins never mint the same id here,
 *     so the "more than one imported match" error (#26) is not exercised in
 *     this file (mirrors live in mentions.als).
 *   - Every origin is both a publisher and a reader (a studio holds its own
 *     items and its imports). Every reader may poll every remote item: a
 *     subscription is "polled at least once".
 *   - Version atoms are static; the mutable set `published` says which ones
 *     exist on the wire yet. A Version's attributes (what it baked, what it
 *     cites) are fixed, and are constrained at the moment it is published
 *     to equal what the publishing studio's state resolved to then. Version
 *     atoms that are never published are scaffolding and are ignored.
 *   - A client's grammar level (does it know the 2026-10-03 partial
 *     transclusion grammar?) is a static property of its origin.
 */
module blygger

------------------------------------------------------------------------
-- Static vocabulary
------------------------------------------------------------------------

-- §10.1 (revision 2026-10-03, #49): a client either implements the partial
-- transclusion grammar or does not. A pre-revision 0.3 client (or any 0.2
-- client) reads "directive + attached blockquote" as a whole transclusion
-- followed by the author's own ordinary blockquote.
abstract sig Grammar {}
one sig PartialAware, WholeOnly extends Grammar {}

-- §5.3: "kind" is "fragment", "thread" (§10), or "withdrawn" (§9).
abstract sig Kind {}
one sig Fragment, Thread, Withdrawn extends Kind {}

-- §10.2 says the local closure is "walked via stored transclusions[]" but
-- not *whose* stored transclusions. Two readings, both modelled:
--   ItemLevel    — walk each local thread's CURRENT version's transclusions[]
--                  (what a studio DB with one row per item naturally holds);
--   VersionLevel — walk the transclusions[] of the versions actually baked,
--                  recursively (the data-blyg-* tree inside the snapshot).
abstract sig ClosureReading {}
one sig ItemLevel, VersionLevel extends ClosureReading {}
-- What "the forked content" of a THREAD is (§5.6 r6). Two rule sets:
--   CopyMd    — §5.6 as normative text alone: the fork copies the pinned
--               version's content_md, directives intact, and its studio
--               re-resolves them (§10.2) at publish.
--   Flatten57 — §5.6 + §16.6f (decision #57, ruled 2026-10-03, built in
--               blygger-studio 0.20.0): the fork descends from the pinned
--               document's content_html, flattened. Own prose byte-exact;
--               every baked quote becomes an ordinary blockquote (nested
--               ones nested, a partial keeps its passage) plus an
--               attribution line; no transclusions[], no quote-mentions;
--               "The blyg-transclusion class MUST NOT survive into the fork".
abstract sig ForkRule {}
one sig CopyMd, Flatten57 extends ForkRule {}

one sig Cfg { closure: one ClosureReading, fork: one ForkRule }

-- An origin: one blyg (publisher) and its studio (which is also a reader).
sig Origin {
  grammar: one Grammar,
  -- §13: the reader side of this origin's studio. held = the imported
  -- snapshot it stores for each remote item (at most one per item: the
  -- version it last adopted).
  var held: set Version,
  -- §13.4: remote items whose withdrawal endcap it has seen and rolled up
  -- to null.
  var gone: set Item
}

-- §5.1: "Ids are permanent identity". An Item is an id; `home` is the
-- origin that publishes it.
sig Item {
  home: one Origin,
  -- §10.6 r3: the stub_of value "set when the stub was created — what the
  -- author saw". Only meaningful for items that are stubs.
  cite0: lone Version
}

-- An abstract unit of text. Text content = a set of passages.
sig Passage {}

-- §10.1: a transclusion directive in content_md. `sel` is the attached
-- blockquote of a partial transclusion (#49), if any.
sig Directive { target: one Item, sel: lone Passage }

-- One baked blockquote in content_html (§10.2): the snapshot version it
-- baked (data-blyg-id / data-blyg-version / data-blyg-origin) and, for a
-- `blyg-partial` bake, the selection it carries instead of the whole body.
sig Bake { of: one Version, partial: lone Passage }

-- One published version of one item (§5.2). Static attributes:
sig Version {
  item: one Item,
  num: one Int,                 -- §5.2 "version"
  kind: one Kind,
  prose: set Passage,           -- the author's own words
  directives: set Directive,    -- content_md's directives (threads only)
  res: Directive -> lone Bake,  -- how each directive was resolved at publish
  bakes: set Bake,              -- what content_html contains (= transclusions[])
  stubOf: lone Version,         -- §10.6 stub_of {origin,id,version}
  forkedFrom: lone Version,     -- §5.6 forked_from {origin,id,version}
  -- #57: quoted text carried as ORDINARY markdown blockquotes (unverified,
  -- editable, no blyg-transclusion class). Only a #57 fork produces it.
  flat: set Passage,
  -- #57 attribution lines: the quoted versions each flattened quote names
  attrib: set Version
}

------------------------------------------------------------------------
-- Mutable state (Alloy 6 `var`)
------------------------------------------------------------------------

-- What each origin has published so far (all origins together).
var sig published in Version {}
-- §8: "A pin is the publisher's irrevocable hosting promise".
var sig pinned in Version {}
-- (The reader state `held` and `gone` is declared on Origin above.)

------------------------------------------------------------------------
-- Static well-formedness
------------------------------------------------------------------------

fact wellFormed {
  all v: Version {
    v.num > 0
    -- res is keyed by this version's own directives, and bakes are exactly
    -- the resolved directives (§10.3 "in directive order, ... naming the
    -- exact versions baked into this thread version").
    v.res.Bake in v.directives
    v.bakes = v.directives.(v.res)
    -- §5.3 fragments do not transclude; §10.6 "Threads only" for stubs.
    v.kind = Fragment implies (no v.directives and no v.stubOf)
    -- §9: an endcap has content_md = "" and "empties transclusions to []
    -- ... and omits stub_of".
    v.kind = Withdrawn implies (no v.prose and no v.directives and no v.stubOf
                                and no v.flat and no v.attrib)
    -- a stub of itself is not a thing
    v.stubOf.item != v.item
    v.forkedFrom.item != v.item
  }
}

------------------------------------------------------------------------
-- Derived notions
------------------------------------------------------------------------

-- The latest published version of its item.
pred isLatest[v: Version] {
  v in published
  no w: published | w.item = v.item and w.num > v.num
}
fun latestOf[i: Item]: set Version { { v: published | v.item = i and isLatest[v] } }
fun prevOf[v: Version]: set Version {
  { w: published | w.item = v.item and w.num = minus[v.num, 1] }
}

-- §4 + §8 + §8.4: what an origin serves. "Only the latest version's content
-- is served in the item document" and pinned files `items/{id}/v{n}.json`;
-- "No route ever serves an unpinned older version, in any representation."
-- [C-4-09, C-4-10, C-8-01, C-8.4-01, C-8.4-02]
fun served: set Version { { v: published | isLatest[v] } + pinned }

-- Whole-bake nesting (§10.2 "Nesting is nested blockquotes"): v's
-- content_html contains w's whole content_html.
fun wholeNest: Version -> Version {
  { v, w: Version | some b: v.bakes | b.of = w and no b.partial }
}
-- Any bake nesting, whole or partial.
fun nest: Version -> Version { { v, w: Version | w in v.bakes.of } }

-- A WholeOnly client renders the attached blockquote as an ordinary
-- markdown blockquote, i.e. as the author's own unverified words.
fun demoted[v: Version]: set Passage {
  v.item.home.grammar = WholeOnly => v.directives.sel else none
}

-- §10.2: "the target snapshot's text content — its content_html with tags
-- stripped". Own words, demoted blockquotes, whole quotes (recursively) and
-- partial quotes (their selection only).
fun text[v: Version]: set Passage {
  let n = v.*wholeNest |
    n.prose + n.flat + { p: Passage | some x: n | p in demoted[x] } + n.bakes.partial
}

-- §10.2 resolution order (#26), as seen from origin o's studio:
--   "1. a local, currently-published item with that id — fragment or thread;
--    2. otherwise an imported item ... whose local state is current — or
--       withdrawn with a pin-retained snapshot ...;
--    3. otherwise a publish error."
-- "Resolution snapshots the target's latest version as the publisher holds
--  it" — never a live fetch.
fun snap[o: Origin, t: Item]: set Version {
  t.home = o => { v: latestOf[t] | v.kind != Withdrawn }
             else (o.held & item.t)
}

-- §10.2 local closure: "walked via stored transclusions[]" of each local
-- thread's current version, local hops only ("Remote closures are not
-- walked").
fun lnext: Item -> Item {
  { x, y: Item | x.home = y.home and some lv: latestOf[x] | y in lv.bakes.of.item }
}
-- version-level local nesting: v baked w and both live at the same origin
fun lnestV: Version -> Version {
  { a, b: Version | b in a.bakes.of and b.item.home = a.item.home }
}

------------------------------------------------------------------------
-- Events
------------------------------------------------------------------------

pred frameReader { held' = held and gone' = gone }

-- §10.2: resolve every directive of thread version v at origin o. [C-10.2-01]
pred resolves[o: Origin, v: Version] {
  all d: v.directives | let s = snap[o, d.target] {
    -- "otherwise a publish error": a directive that resolves to nothing
    -- blocks the publish event entirely.
    one s
    one v.res[d]
    -- "The local snapshot is what gets baked — never a live fetch."
    v.res[d].of = s
    -- #49: a PartialAware client checks "the selection MUST be a substring
    -- of the target snapshot's text content ... at the version being baked;
    -- otherwise a publish error" [C-10.2-02] and bakes `blyg-partial`. A WholeOnly
    -- client bakes the whole target (the blockquote is demoted, above).
    (some d.sel and o.grammar = PartialAware)
      => (v.res[d].partial = d.sel and d.sel in text[s])
      else no v.res[d].partial
    -- §10.2: "A thread MUST NOT transclude a local thread whose transitive
    -- local transclusion closure ... contains the publishing thread's own id."
    -- [C-10.2-04]
    (s.item.home = o and s.kind = Thread) =>
      (Cfg.closure = ItemLevel => v.item not in s.item.*lnext
                               else v.item not in (s.*lnestV).item)
  }
}

-- §10.6 stubs, #27.
pred stubRules[o: Origin, v: Version] {
  some v.stubOf => {
    let t = v.stubOf.item {
      v.item.cite0.item = t
      -- READING: "the value set when the stub was created — what the author
      -- saw": any version of the target the studio held at some moment up to
      -- now (the stub draft may have been created earlier than this publish).
      (no w: published & item.(v.item) | some w.stubOf)
        => once (v.item.cite0 in snap[o, t])
      -- [C-10.6-03] r3 "Version agreement. At publish, if the body transcludes the stub's
      -- target, stub_of.version MUST equal the version actually baked;
      -- otherwise it keeps the value set when the stub was created".
      (t in v.bakes.of.item) => v.stubOf in v.bakes.of
                              else v.stubOf = v.item.cite0
    }
  }
  -- r1 "Exactly one target"; a stub stays a stub of the same thing.
  (some w: published & item.(v.item) | some w.stubOf) =>
    (some v.stubOf and v.stubOf.item = (published & item.(v.item)).stubOf.item)
}

-- §5.6 forks.
pred forkRules[o: Origin, v: Version] {
  (v.num = 1 and some v.forkedFrom) => {
    let s = v.forkedFrom {
      -- r2 "The referenced version MUST be pinned at its origin".
      s in pinned
      s.kind = v.kind
      -- r6 "A fork is a copy ...: the forked content becomes the new item's
      -- own content_md". We model an UNEDITED fork, to isolate what
      -- re-resolution alone does; edits can only make a fork differ more.
      no v.stubOf
      Cfg.fork = CopyMd => {
        -- [C-5.6-03] pinned source; r6 read as "copy content_md"
        v.directives = s.directives
        v.prose = s.prose
        v.flat = s.flat
        no v.attrib
      } else {
        -- #57 / §16.6f: "The thread's own prose is copied byte-exact from the
        -- pinned content_md. Each blyg-transclusion element in the pinned
        -- content_html replaces its directive as an ordinary markdown
        -- blockquote of that element's content, recursively ... A partial
        -- transclusion (blyg-partial) flattens the same way". Ordinary
        -- blockquotes already in the source's content_md (demoted, or an
        -- earlier fork's flattened quotes) are own prose and copy as such.
        no v.directives
        v.prose = s.prose + s.flat + demoted[s]
        v.flat = quoteText[s]
        v.attrib = s.^nest
      }
    }
  }
  -- only a #57 fork's first version introduces flattened quotes or
  -- attribution lines; a republish keeps them as the author's text
  (v.num = 1 and no v.forkedFrom) => (no v.flat and no v.attrib)
  v.num > 1 => (v.flat = prevOf[v].flat and v.attrib = prevOf[v].attrib)
  -- r3 "Lineage is fixed when the item is created and is immutable". [C-5.6-06]
  v.num > 1 => v.forkedFrom = prevOf[v].forkedFrom
}

-- The text inside a version's baked quotes, as its content_html shows it:
-- a partial bake contributes its passage, a whole bake the quoted
-- version's whole text content (recursively, nested quotes included).
fun quoteText[s: Version]: set Passage {
  s.bakes.partial + text[{ b: s.bakes | no b.partial }.of]
}

-- Publish a content version (first publish, edit, republish, return after
-- withdrawal). §5.2: "incremented by exactly 1 per publish event" (#19).
-- (No clause id: §5.2 states this without an RFC 2119 keyword.)
pred publish[o: Origin, v: Version] {
  v.item.home = o
  v not in published
  v.num = plus[#(published & item.(v.item)), 1]
  v.kind != Withdrawn
  -- an item keeps its authored kind (§9 "the item's authored kind")
  all w: published & item.(v.item) | w.kind in v.kind + Withdrawn
  -- stubs/forks reference versions that exist
  v.stubOf + v.forkedFrom in published
  v.kind = Thread => resolves[o, v]
  stubRules[o, v]
  forkRules[o, v]
  published' = published + v
  pinned' = pinned
  frameReader
}

-- §9 withdrawal: "a version bump ... kind withdrawn ... The endcap keeps page
-- and forked_from".
pred withdraw[o: Origin, e: Version] {
  e.item.home = o
  e not in published
  e.kind = Withdrawn
  some latestOf[e.item]
  latestOf[e.item].kind != Withdrawn
  e.num = plus[#(published & item.(e.item)), 1]
  e.forkedFrom = latestOf[e.item].forkedFrom
  published' = published + e
  pinned' = pinned
  frameReader
}

-- §8 r2: "Any published version with content MAY be pinned, including
-- retroactively ... Withdrawal endcaps MUST NOT be pinned". [C-8-02, C-8-03]
pred pin[v: Version] {
  v in published
  v.kind != Withdrawn
  v not in pinned
  pinned' = pinned + v
  published' = published
  frameReader
}

-- §13.2 "only the fetched document advances state"; §13.4 retention.
-- [C-13.1-01, C-13.1-03, C-13.4-01, C-13.4-02]
-- A poll fetches item t's document from its origin. Polls happen at
-- arbitrary times, so a reader may hold an old version for a while.
pred poll[r: Origin, t: Item] {
  t.home != r
  some latestOf[t]
  let L = latestOf[t] {
    L.kind != Withdrawn => {
      held' = held - r -> item.t + r -> L
      gone' = gone - r -> t
    } else {
      -- "rolls the item up to null ... Retention follows the origin's own
      -- serving surface: content corresponding to a version the origin has
      -- pinned MAY be retained ... Everything unpinned rolls to null."
      gone' = gone + r -> t
      held' = held - r -> (item.t - pinned)
    }
  }
  published' = published
  pinned' = pinned
}

pred skip { published' = published and pinned' = pinned and frameReader }

fact init { no published and no pinned and no held and no gone }

fact traces {
  always (
    skip
    or (some o: Origin, v: Version | publish[o, v] or withdraw[o, v])
    or (some v: Version | pin[v])
    or (some r: Origin, t: Item | poll[r, t])
  )
}

-- Event labels used by run.py to annotate traces.
fun evPublish: Origin -> Version { { o: Origin, v: Version | publish[o, v] } }
fun evWithdraw: Origin -> Version { { o: Origin, v: Version | withdraw[o, v] } }
fun evPin: set Version { { v: Version | pin[v] } }
fun evPoll: Origin -> Item { { r: Origin, t: Item | poll[r, t] } }

------------------------------------------------------------------------
-- Assertions
------------------------------------------------------------------------

-- 1a. The local closure check does what it says: no thread's baked HTML
-- contains (through local hops only) a quote of the same item. Whole quotes
-- only: a partial quote carries just its passage, not the nested tree.
-- Under the VersionLevel reading of the closure walk. Expected: holds.
assert NoLocalSelfContainment {
  Cfg.closure = VersionLevel =>
    always all v: published | v.item not in v.^(lnestV & wholeNest).item
}

-- 1a'. Same property under the ItemLevel reading. Expected: FAILS — an
-- intermediate thread's *current* transclusions[] can differ from what its
-- baked snapshot (an older version) contains.
assert NoLocalSelfContainment_ItemReading {
  Cfg.closure = ItemLevel =>
    always all v: published | v.item not in v.^(lnestV & wholeNest).item
}

-- 1b. ...but through a remote hop it can (expected: counterexample, by
-- design — §10.2 "Remote closures are not walked: harmless by snapshot").
assert NoSelfContainmentAnyPath {
  always all v: published | v.item not in v.^nest.item
}

-- 1c. What makes 1b harmless: the snapshot graph over *versions* is
-- well-founded — no version contains itself, so every baked document is
-- finite ("Network cycles are harmless").
assert SnapshotsWellFounded {
  always all v: published | v not in v.^nest
}

-- 2. ServedIsPromised: everything served is the live version or a pin, and
-- a pin, once made, is served forever — through withdrawal (§8 r1, §8.4, #8, #25).
assert ServedIsPromised {
  always all v: served | isLatest[v] or v in pinned
  always all v: pinned | always (v in pinned and v in served)
  always no v: pinned | v.kind = Withdrawn
}

-- 2b. Does withdrawal reach other origins' baked quotes? (expected: no, by
-- design — §10.4 "Withdrawal does not cascade"; §9 "remote copies, caches,
-- and snapshots survive withdrawal".)
assert QuotedContentStillServedByItsAuthor {
  always all v: served, w: v.^nest | w in served
}

-- 3. ReaderNeverHoldsUnserved (#18c): once a reader has seen the endcap,
-- everything it still holds of that item is something the origin serves.
assert ReaderNeverHoldsUnserved {
  always all r: Origin, v: r.held | v.item in r.gone => (v in pinned and v in served)
}

-- 3b. Between polls a reader may hold a version its origin no longer
-- serves (expected: counterexample; lag is not a violation — only
-- withdrawal bounds retention).
assert ReaderHoldsOnlyServed {
  always all r: Origin | r.held in served
}

-- 5. ForkFaithful: a fork's bakes equal the source pin's bakes (same
-- versions, same selections). Expected: FAILS — a fork re-resolves its
-- copied directives at the forker's studio.
assert ForkFaithful {
  Cfg.fork = CopyMd => always all v: published | (v.num = 1 and some v.forkedFrom) => {
    let s = v.forkedFrom {
      v.bakes.of = s.bakes.of
      all x: Version | (v.bakes & of.x).partial = (s.bakes & of.x).partial
    }
  }
}

-- 5b. The weaker property the spec can guarantee: a fork quotes the same
-- *items* (ids) as its source pin — identity survives, versions need not.
assert ForkSameTargets {
  Cfg.fork = CopyMd => always all v: published | (v.num = 1 and some v.forkedFrom) =>
    v.bakes.of.item = v.forkedFrom.bakes.of.item
}

-- 5c. A partial quote in the source stays partial in the fork. Expected:
-- FAILS when the forker's client lacks the #49 grammar.
assert ForkPreservesPartiality {
  Cfg.fork = CopyMd => always all v: published | (v.num = 1 and some v.forkedFrom) =>
    all b: v.forkedFrom.bakes | some b.partial =>
      some b2: v.bakes | b2.of.item = b.of.item and some b2.partial
}

-- 5d. Same, restricted to partial-aware forkers. Expected: holds.
assert ForkPreservesPartialityIfAware {
  Cfg.fork = CopyMd => always all v: published | (v.num = 1 and some v.forkedFrom and v.item.home.grammar = PartialAware) =>
    all b: v.forkedFrom.bakes | some b.partial =>
      some b2: v.bakes | b2.of.item = b.of.item and some b2.partial
}

-- 6a. QuoteIsVerbatim: every published partial quote was a substring of
-- the version it names (#49).
assert QuoteIsVerbatim {
  always all v: published, b: v.bakes | some b.partial => b.partial in text[b.of]
}

-- 6b. "Any reader MAY re-check by the same test while the origin serves
-- that version, live or pinned." Is the named version re-checkable at the
-- moment the quote is published? Expected: FAILS (stale import).
assert QuoteCheckableAtPublish {
  always all o: Origin, v: Version | publish[o, v] =>
    all b: v.bakes | some b.partial => b.of in served
}

-- 6c. ...and does it stay re-checkable? Expected: FAILS once the target is
-- republished and the quoted version was never pinned.
assert QuoteStaysCheckable {
  always all v: published, b: v.bakes | some b.partial => b.of in served
}

-- 8a. StubVersionAgreement (#27 r3): if the body transcludes the target,
-- stub_of names exactly the baked version.
assert StubVersionAgreement {
  always all v: published | (some v.stubOf and v.stubOf.item in v.bakes.of.item)
    => v.bakes.of & item.(v.stubOf.item) = v.stubOf
}

-- 8b. A stub's citation never moves backwards across the stub's own
-- versions. Expected: FAILS under the literal reading of r3 ("keeps the
-- value set when the stub was created").
assert StubCiteNeverRegresses {
  always all v: published | (some v.stubOf and some prevOf[v].stubOf)
    => v.stubOf.num >= prevOf[v].stubOf.num
}

-- 8c. A stub's version names a version the target's origin really
-- published (it came from the stubber's own reading).
assert StubCitesRealVersion {
  always all v: published | some v.stubOf => v.stubOf in published
}

-- 5e. The same faithfulness property, stated on TEXT so it can be compared
-- across both rule sets: a fork's whole text equals its pinned source's.
assert ForkTextEqualsPin_CopyMd {
  Cfg.fork = CopyMd => always all v: published | (v.num = 1 and some v.forkedFrom) =>
    text[v] = text[v.forkedFrom]
}
assert ForkTextEqualsPin_57 {
  Cfg.fork = Flatten57 => always all v: published | (v.num = 1 and some v.forkedFrom) =>
    text[v] = text[v.forkedFrom]
}

-- 5f. Under #57 the right property (orchestrator's wording): "the fork's
-- quoted text equals the pinned source's baked quote text, and nothing
-- re-resolves" — no bakes (so no transclusions[], no quote-mentions), the
-- flattened quotes are exactly the pin's quote text, partials keep their
-- passage, and every quoted layer (nested, cross-origin) is attributed.
assert ForkQuotesFaithful_57 {
  Cfg.fork = Flatten57 => always all v: published | (v.num = 1 and some v.forkedFrom) => {
    no v.bakes
    v.flat = quoteText[v.forkedFrom]
    v.forkedFrom.bakes.partial in v.flat
    v.attrib = v.forkedFrom.^nest
  }
}

-- 5g. Does a fork let a forker re-publish words it KNOWS were withdrawn and
-- never pinned? §10.2 refuses this for republish: "The protocol does not
-- offer 'freeze this quote at the withdrawn version': that would be the
-- first place withdrawal failed to roll to null". Checked at the moment of
-- the fork's publish, against what the forker's own store knows.
pred knowsWithdrawn[o: Origin, i: Item] {
  i in o.gone or (i.home = o and latestOf[i].kind = Withdrawn)
}
fun directQuoted[v: Version]: set Version {
  Cfg.fork = CopyMd => v.bakes.of else v.forkedFrom.bakes.of
}
assert ForkHonoursKnownWithdrawal_CopyMd {
  Cfg.fork = CopyMd => always all o: Origin, v: Version |
    (publish[o, v] and v.num = 1 and some v.forkedFrom) =>
      all w: directQuoted[v] | knowsWithdrawn[o, w.item] => w in pinned
}
assert ForkHonoursKnownWithdrawal_57 {
  Cfg.fork = Flatten57 => always all o: Origin, v: Version |
    (publish[o, v] and v.num = 1 and some v.forkedFrom) =>
      all w: directQuoted[v] | knowsWithdrawn[o, w.item] => w in pinned
}

-- Versions: +1 per publish event (#19), for every item, always.
assert VersionsContiguous {
  always all i: Item | all v: published & item.i |
    v.num = 1 or some w: published & item.i | w.num = minus[v.num, 1]
}

------------------------------------------------------------------------
-- Commands. Scopes are chosen so each command runs in well under two
-- minutes; "5 Int" = integers -16..15 (versions stay below 8). A scope of
-- "1 Origin" is used where the property only concerns one origin's own
-- items (no remote hop can be part of a local path).
------------------------------------------------------------------------

check NoLocalSelfContainment for 3 but 1 Origin, 3 Item, 6 Version, 3 Directive, 4 Bake, 1 Passage, 5 Int, 1..7 steps
check NoLocalSelfContainment_ItemReading for 3 but 1 Origin, 3 Item, 6 Version, 3 Directive, 4 Bake, 1 Passage, 5 Int, 1..7 steps
check NoSelfContainmentAnyPath for 3 but 2 Origin, 2 Item, 4 Version, 2 Directive, 3 Bake, 1 Passage, 5 Int, 1..8 steps
check SnapshotsWellFounded for 3 but 2 Origin, 3 Item, 5 Version, 3 Directive, 3 Bake, 1 Passage, 5 Int, 1..7 steps
check ServedIsPromised for 3 but 2 Origin, 2 Item, 5 Version, 1 Directive, 1 Bake, 1 Passage, 5 Int, 1..8 steps
check QuotedContentStillServedByItsAuthor for 3 but 2 Origin, 2 Item, 4 Version, 2 Directive, 2 Bake, 1 Passage, 5 Int, 1..8 steps
check ReaderNeverHoldsUnserved for 3 but 2 Origin, 2 Item, 5 Version, 1 Directive, 1 Bake, 1 Passage, 5 Int, 1..8 steps
check ReaderHoldsOnlyServed for 3 but 2 Origin, 2 Item, 4 Version, 1 Directive, 1 Bake, 1 Passage, 5 Int, 1..6 steps
check ForkTextEqualsPin_CopyMd for 3 but 3 Origin, 3 Item, 4 Version, 2 Directive, 3 Bake, 2 Passage, 5 Int, 1..8 steps
check ForkTextEqualsPin_57 for 3 but 3 Origin, 4 Item, 5 Version, 2 Directive, 3 Bake, 2 Passage, 5 Int, 1..8 steps
check ForkQuotesFaithful_57 for 3 but 3 Origin, 4 Item, 5 Version, 2 Directive, 3 Bake, 2 Passage, 5 Int, 1..8 steps
check ForkHonoursKnownWithdrawal_CopyMd for 3 but 2 Origin, 3 Item, 5 Version, 1 Directive, 2 Bake, 1 Passage, 5 Int, 1..8 steps
check ForkHonoursKnownWithdrawal_57 for 3 but 2 Origin, 3 Item, 5 Version, 1 Directive, 2 Bake, 1 Passage, 5 Int, 1..8 steps
check ForkFaithful for 3 but 3 Origin, 3 Item, 4 Version, 2 Directive, 3 Bake, 2 Passage, 5 Int, 1..8 steps
check ForkSameTargets for 3 but 3 Origin, 3 Item, 4 Version, 2 Directive, 3 Bake, 1 Passage, 5 Int, 1..7 steps
check ForkPreservesPartiality for 3 but 3 Origin, 3 Item, 4 Version, 2 Directive, 3 Bake, 2 Passage, 5 Int, 1..8 steps
check ForkPreservesPartialityIfAware for 3 but 3 Origin, 3 Item, 5 Version, 2 Directive, 3 Bake, 2 Passage, 5 Int, 1..8 steps
check QuoteIsVerbatim for 3 but 2 Origin, 3 Item, 5 Version, 3 Directive, 3 Bake, 2 Passage, 5 Int, 1..7 steps
check QuoteCheckableAtPublish for 3 but 2 Origin, 2 Item, 4 Version, 2 Directive, 2 Bake, 2 Passage, 5 Int, 1..8 steps
check QuoteStaysCheckable for 3 but 2 Origin, 2 Item, 4 Version, 2 Directive, 2 Bake, 2 Passage, 5 Int, 1..8 steps
check StubVersionAgreement for 3 but 2 Origin, 3 Item, 5 Version, 3 Directive, 3 Bake, 2 Passage, 5 Int, 1..7 steps
check StubCiteNeverRegresses for 3 but 1 Origin, 2 Item, 5 Version, 2 Directive, 3 Bake, 1 Passage, 5 Int, 1..7 steps
check StubCitesRealVersion for 3 but 2 Origin, 3 Item, 5 Version, 2 Directive, 3 Bake, 1 Passage, 5 Int, 1..7 steps
check VersionsContiguous for 3 but 2 Origin, 3 Item, 5 Version, 2 Directive, 2 Bake, 1 Passage, 5 Int, 1..8 steps

-- Non-vacuity runs: each shows that the situation a passing check talks
-- about actually occurs in the model.
run Vac_LocalNesting { Cfg.closure = VersionLevel
                        eventually (some v: published | some w: v.^lnestV | w.kind = Thread) }
  for 3 but 1 Origin, 3 Item, 4 Version, 2 Directive, 3 Bake, 1 Passage, 5 Int, 1..6 steps
run Vac_CrossOriginCycle { eventually some v: published | v.item in v.^nest.item }
  for 3 but 2 Origin, 2 Item, 4 Version, 2 Directive, 3 Bake, 1 Passage, 5 Int, 1..8 steps
run Vac_PinSurvivesWithdrawal { eventually some v: pinned | some e: published | e.item = v.item and e.kind = Withdrawn }
  for 3 but 2 Origin, 2 Item, 4 Version, 2 Directive, 2 Bake, 1 Passage, 5 Int, 1..6 steps
run Vac_ReaderRetainsPin { eventually some r: Origin | some r.held and r.held.item in r.gone }
  for 3 but 2 Origin, 2 Item, 4 Version, 2 Directive, 2 Bake, 1 Passage, 5 Int, 1..7 steps
run Vac_ForkWithQuotes { Cfg.fork = CopyMd
  eventually (some v: published | some v.forkedFrom and some v.bakes) }
  for 3 but 3 Origin, 3 Item, 4 Version, 2 Directive, 3 Bake, 1 Passage, 5 Int, 1..8 steps
run Vac_AwareForkOfPartial { Cfg.fork = CopyMd
  eventually (some v: published | some v.forkedFrom and some v.bakes.partial and v.item.home.grammar = PartialAware) }
  for 3 but 3 Origin, 3 Item, 4 Version, 2 Directive, 3 Bake, 2 Passage, 5 Int, 1..8 steps
run Vac_PartialQuote { eventually some v: published | some v.bakes.partial and v.bakes.of.item.home != v.item.home }
  for 3 but 2 Origin, 2 Item, 3 Version, 2 Directive, 2 Bake, 2 Passage, 5 Int, 1..6 steps
run Vac_StubQuotingTarget { eventually some v: published | some v.stubOf and v.stubOf in v.bakes.of }
  for 3 but 2 Origin, 2 Item, 3 Version, 2 Directive, 2 Bake, 2 Passage, 5 Int, 1..6 steps
run Vac_Republish { eventually some v: published | v.num = 3 }
  for 3 but 2 Origin, 2 Item, 4 Version, 2 Directive, 2 Bake, 1 Passage, 5 Int, 1..6 steps
run Vac_Fork57NestedRemotePartial {
  Cfg.fork = Flatten57
  eventually (some v: published | some v.forkedFrom and some v.flat
     and some v.forkedFrom.bakes.partial
     and some w: v.forkedFrom.^nest | w.item.home != v.forkedFrom.item.home) }
  for 3 but 3 Origin, 4 Item, 5 Version, 2 Directive, 3 Bake, 2 Passage, 5 Int, 1..8 steps
