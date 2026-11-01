# Fable brief — the standing agenda for the next Fable pass

**This round's product:** review every decision labelled `Fable review pending` (#58);
take the queued items in [`fable-round-queue.md`](fable-round-queue.md) if chosen on
purpose; otherwise nothing. **Since #58, promotions are Opus's**; Fable reviews them after
the fact.
**Written:** session 38 (2026-10-06), by Fable 5.1. **Rewritten:** session 49
(2026-10-17), by Fable 5.1, after two rounds in one day: the first opened
`protocol-v0.4.md` (#72), reviewed #65, the G11 promotion and #69, and ruled #70–#71;
the second ruled the rest of the queue, #73–#77, in the 0.4 text's second revision.
A third round ruled inline fragment authoring (#78, third revision): tangling is a
studio act, a multi-item publish is one event per item with the thread last, readers MAY
fold a burst; `ignyr` (#77) does not fire on new fragments, so folding is a second derived
input to the same queue.
**Rewrite this file each Fable round.** It is the one place a Fable session starts.

> **Read first, in this order:** this brief → `CLAUDE.md` locked decisions **#70–#77**
> (session 49; #59–#69 the two rounds before; #43–#51 the 0.4 definition) →
> [`v0.4-plan.md`](v0.4-plan.md) **§11–§12** (the reasoning) →
> [`protocol-v0.4.md`](protocol-v0.4.md) **§16.9–§16.10** (ruled shapes awaiting
> builds: `pinned_at`, `cid`, author-sized images) and §16.6 (the write surface) →
> [`fable-round-queue.md`](fable-round-queue.md) (**item 22 only**) →
> [`backlog.md`](backlog.md) → [`opus-brief.md`](opus-brief.md) § session 49.

**Session 52 (2026-10-20), one ruling outside a round:** #84 on blygger-spec#17 — a
mention target is known by **membership** (resolves, by the receiver's own data, to its
`page`, item document or a pinned version's address), not by location; #61's source-side
location test is unchanged. Plan §15; fifth revision of 0.4. **#85**, the same afternoon
on Robert's follow-up: a sender without the target's `page` names the item document
through the target's `item` template, never the permalink convention (§4 called those
paths presentation all along; a page-less blyg has nothing to guess). Plan §15.1; sixth
revision. Do not reopen either.

## Session 55 additions (2026-11-01, written by Sonnet 5.5 for a Fable pass Venkat starts elsewhere)

Nothing is `Fable review pending` (checked: the only hits for the label in `CLAUDE.md`
are the routing text itself). Four items arrived since session 52 that fail the
four-question test, plus the standing ones below. **Suggested order: 1, 2, 3, then 5 (it has a
date), then 4 and 6 if Venkat chooses.** Recommendations are Sonnet's reading of the
threads, not rulings; check them.

1. **Hopper feeds — [blygger-spec#18](https://github.com/blygger/blygger-spec/pull/18)
   (PR, Aneesh Sathe, 2026-10-23) and its reference build
   [blygger-studio#84](https://github.com/blygger/blygger-studio/pull/84) (draft, off by
   default behind `hopper_feeds`).** Both held "do not merge before ruling". Unparks
   queue item 14 (trigger met: the World Machines bridge wants to subscribe to a member's
   public hopper, not the whole blyg). The PR's four questions, with its recommended
   answers: (a) a hopper feed is **not** a re-emission under #12 (§13.5's aggregator
   digest is the precedent) — but §13.5's "no manifest vocabulary" must be ruled on;
   (b) resolution through the manifest, a new §12.1 **step 7** (the PR's finding: under
   §12.1 as written no hopper URL can resolve to the hopper, because step 2 or 5 finds
   the member's manifest first); (c) entries are excerpts with RSS `<source>`, not
   snapshots; (d) entries import as L0 rows under a hopper-aware subscription, identity
   (origin, feed), dropped hopper ends the subscription rather than converting it. New
   manifest key `hoppers: [{title, page, feed}]` (§6.1). Read
   `docs/proposals/hopper-feeds-proposal.md` on the branch first. Fable's on questions 1
   and 2 (new manifest key; reader and resolution change). Note it is the first
   machine-discoverable hopper, which #12 drew the line at; the PR argues display-only
   was the line, not discoverability.
2. **A relocated manifest — [blygger-spec#21](https://github.com/blygger/blygger-spec/issues/21)
   (chrisbodhi, 2026-10-29).** §4 says the manifest is `blyg.json` at the origin; §12.1
   step 4 and §12.2 (the `/wp-json/blyg/v1/manifest` example) let it live elsewhere;
   §15.3 and §5.6 rule 2 assume `{origin}blyg.json`. Anyone who did not resolve the origin
   holds only the identity from a `{origin, id, version}` reference, so they probe
   `{origin}blyg.json` and fail. Tested live: Studio 0.48.2 forks from such an origin using
   the surface it stored at resolution; **blygd** (a Go backend) refuses the fork and
   names the missing file. Reporter's proposal: step 4 gains "the same manifest MUST also
   be served at `{identity}blyg.json`, as a copy or a redirect that leaves the identity
   unchanged". Alternatives he names: an optional `manifest` URL beside `origin` in §5.9
   references (changes every reference shape), or stating that such an origin is readable
   only by its subscribers. This sits on #51 and #84/#85 and is a **MUST on publishers
   that new manifest-located blygs (Soapbox, WordPress) may not be able to meet**, which
   is the thing to weigh; the `rel="blyg"` link is the discovery route #51 chose. Reader
   change by construction (question 1).
3. **Origin succession — [blygger-studio#102](https://github.com/blygger/blygger-studio/issues/102)
   (Florian Lohse, 2026-11-01, with a live case that involves Venkat's own thread).**
   Florian moved from `https://florianlohse.com/blyg/` to `https://blyg.florianlohse.com/`
   on 2026-10-25; the old origin keeps its item documents and redirects the manifest, feed
   and pages. Subscribers keep reading (identity stays the old origin per §12.2), but are
   never told, though §12.2 says a reader SHOULD surface a `site` disagreement. The
   damage: Venkat's thread `venkateshrao.com/blyg/t/7et3x8eykq9b3z0ffr0jwhmf8p/` stubs
   Florian's fragment `2dnhvp468rf1j2szn3968vtdgn`, with `stub_of` and `transclusions[]`
   naming it under the **old** origin, but the item exists only at the new one, so
   Florian's Studio cannot verify the mention (`targetItemId` refuses a target outside its
   own origin, 400, no row kept; `relationTo` compares to its own origin) — replies and
   quotes from pre-move readers are lost silently on both sides. The reader-side fix
   (offer to follow, keep hopper memberships and signals, since `deleteSubscription` today
   deletes both) is studio work and Opus's once the protocol half is ruled. **The protocol
   question:** is there any wire statement of succession (a `moved`/`successor` manifest
   key on the old origin, a `rel="successor"`), or is a move a social act and nothing
   more? Note #84 ("target known by membership") does not help here, because the new
   Studio does not hold the old identity's items as its own. Identity semantics, so
   Fable's; check against #11/#12 (do not open) and #35 (a person is a URL they control).
   Reply to Florian after the ruling.
4. **Extension registry — [studio#59](https://github.com/blygger/blygger-studio/pull/59)**
   (item 22, draft). **Only if Venkat says so.** Kyle Mathews commented against it on
   2026-10-26 and 10-27; read those comments with Aneesh's `docs/extension-registry.md`.
   Open since the brief's session-49 note, unchanged otherwise.
5. **RFC-1 and RFC-2 comment periods close 2026-11-04** (anchors
   [blygger-spec#14](https://github.com/blygger/blygger-spec/issues/14) and
   [#15](https://github.com/blygger/blygger-spec/issues/15), both with **zero** issue
   comments at 2026-11-01). The comments proper are stubs under the items on
   `blyg.blygger.org` (RFC-1 and RFC-2 ids are in `docs/blyg-published.json`); read the
   responses there, revise or rule, then gate RFC-1's studio work (`opus-brief.md` item e).
   If there are no stubs either, say so and rule that the drafts stand.
6. **The four session-29 explorations in `plans/`** (carry-over since session 49,
   unchanged): unicode, pour-over links, rich editor, publishing patterns.

**Opus-tier, not Fable's — listed so a Fable session does not take them by habit.**
- [blygger-spec#19](https://github.com/blygger/blygger-spec/issues/19) (rafaeldavid, "fetched
  text is data, never instructions"): one SHOULD bullet in §14, no wire change, no
  reader obligation beyond SHOULD, citing §14's existing sanitization rule and #38's
  agent-agnosticism. Passes the four-question test on its face (no on 1–3, #38/§14 for 4).
  Opus may rule it and Fable confirms in batch; the one thing to look at is whether a
  SHOULD in a conformance document should say anything about language models at all,
  given the §0 "satisfiable from a standard library" criterion Fable is already weighing
  in the Unicode exploration.
- [blygger-spec#20](https://github.com/blygger/blygger-spec/issues/20) (same reporter, publish the
  conformance JSON Schemas at their `$id` URLs): `blygger-org` build copies
  `conformance/schemas/schemas/*.json` to `/conformance/{version}/`, one informative
  line in §3, `$id` bumped to `/0.4/`. Depends on
  [blygger-org#4](https://github.com/blygger/blygger-org/issues/4) (unknown paths return
  200 HTML, so the `$id`s currently resolve to the catch-all page). No ruling needed.
- **Kyle's API-cleanup stack, [blygger-studio#92](https://github.com/blygger/blygger-studio/issues/92)
  (PRs #90, #91, #93–#101, ten stacked branches; private API breaks, public protocol
  bytes preserved by his own statement).** Routed to Opus; **merged to `main` by Sonnet
  on 2026-11-01** at Venkat's instruction (`f630359`, after #89, #94 and #90 were
  squash-merged; the squash broke the other ten branches, so the head, #101, was merged
  with `-X theirs`, its tree verified identical to #101's plus #89's line, CI green on
  #101). **Not deployed.** Reviewed by diff on the public surface only (`src/index.ts`,
  `protocol.ts`, `pages.ts`, `mentions/`, `public-feed.ts`, the migrations), not
  line by line: no item-document, manifest, feed-element, mention-relation or
  `content_html` change. Nothing for a ruling, but three public-HTTP changes a Fable pass
  should know about, none touching the spec text: **(1)** wire reads (`*.json`, `*.xml`,
  `*.opml`, `/media/*`) now send `Access-Control-Allow-Origin: *`; **(2)** JSON, RSS,
  OPML and CSS responses now send `Cache-Control: no-cache` with validators (ETag, 304)
  where they sent `public, max-age=60`, so a browser revalidates every time (the edge
  cache of #41 is separate); **(3)** new media uploads get digest URLs
  `media/{id}/{sha256}.{ext}` with `immutable` caching when a published version retains
  them (consistent with §5.4's same-bytes rule; old URLs keep serving). Also
  `GET /webmention` now answers 405 with `Allow: POST`. **Operational, for Venkat:** the
  owner API moves from host-rooted `/api` to `{mount}/api` with **no alias**, so the
  venkateshrao node's API is at `/blyg/api` (blyg.blygger.org and protocol-institute
  are root-mounted and unchanged); the private contract is 5.0.0, SDK 0.6.0; three
  migrations (0034 version kind, 0035 item revision, 0036 cursor generations) and a
  **resumable `normalize-import-dates` repair that must run before deploying**
  (`deploy:all` and the updater do it); the AI-budget prototype's migration collides
  at 0034 and needs renumbering to 0037. A hard-cutover note on anything calling
  `/api` on the venkateshrao node (Blygger Desktop, scripts) belongs in the release
  announcement.

**Reading list for this pass:** this brief → `CLAUDE.md` decisions #78–#85 (the last
Fable rounds; #84 and #85 are the two nearest to items 2 and 3) → `v0.4-plan.md` §13–§15 →
`protocol-v0.4.md` §4, §6.1, §12.1–§12.2, §13.5, §15.2–§15.3 (the sections items 1–3 touch)
→ the three issues and PR #18's proposal file.

## What session 49 settled, so it is not reopened

**0.4 is the living text**: remote generation sources (§5.7, `source` in §15.4) and the
manifest-located surface (§4, §6.1, §12, §15) are normative; 0.3 is SUPERSEDED, first
snapshot `2026-10-18` (UTC date). **The label** `[[id | text]]`, `![[id | text]]`
(#70), id first under **#71, received conventions trump cosmetic preference**; any other
bracketed text literal; tangling gets no construct. **The second revision**: member
tables for the item document and manifest, measured against all 22 live blygs (#76); the
conformance clarifications F2, F3, F5, F17 (#76); a same-hash republish is maintenance
and readers MAY queue it low — `ignyr` is a reader-side queue, not a flag (#77, the one
ruling that ran against a shape Venkat had assumed; he said record it); a pin MAY re-send
its mentions (#73); `pinned_at` and `cid` are ruled shapes on pinned changelog entries
(#73, #74, §16.9); author-sized images take Pandoc's `{width=…}` (#75, §16.10); the
pace-layered order becomes **RFC-3** with reference constants (#73).

## Review first — decisions Opus ruled (#58)

A Fable round begins by reading every entry labelled `Fable review pending`, in order:
confirm (strike the label), amend (edit the entry, note the amendment with the date), or
reverse (a new numbered decision that says why). Check each against the four questions as
well as on its merits — an entry that should have stopped is the finding that matters most.
**Pending now: nothing.** Opus's builds from session 49 (label, TK strip, `pinned_at`,
image size, L0 `stub_of` refusal, the *ignyr* queue) are implementation of ruled text.
**Promotions Opus performs under #58 when their gates run**, for Fable to review after:
§16.9 `pinned_at` → §5.2 and §8 once the studio emits it and a second client reads it;
§16.9 `cid` → the same once any client emits it and a mirror reads it; §16.10 image size
→ §10.1 once emitted and imported across two nodes.

## The gates

| Gate | What must be true | Then Fable does |
|---|---|---|
| **G3** | Kyle's token auth has shipped under #52's four invariants (it has, 0.28) and **at least one third-party tool** authenticates with a scoped token | Review **`tn-4` — the write surface** (non-normative, #31), which Opus drafts from the build. |
| **G5** | The reference agent (2.10) has run against a live node long enough to refresh a snapshot, answer a mention, and author under its own byline | Review `tn-5` for anything that wants a construct — the refresh scope on the re-bake identity (#38, backlog §1) is the candidate. |
| **RFC-4 draft** | Opus has drafted RFC-4, responding from anywhere (#82; `opus-brief.md` item t) | Edit and rule it as RFC-3; publish on blyg.blygger.org with a comment period as RFC-1 and RFC-2 had |
| **RFC-3 draft** | Opus has drafted RFC-3 (pace-layered order) from `blygger-studio/docs/pace-layered-feed.md` and the fixtures (`opus-brief.md` item i) | Edit and rule it as #67/#68 were; publish on blyg.blygger.org with a comment period. |

If nothing is pending review and no gate is true when a Fable session opens, **say so in
one line and stop** — or take item 22 if Venkat has decided to.

## Next round

0. **The four unreviewed session-29 explorations in `plans/`** (Venkat, session 49):
   `unicode-support-proposal.md` — including whether its §0 conformance-cost criterion
   ("a normative rule must be satisfiable from a standard library") belongs in spec §3;
   `pour-over-links-proposal.md`; `rich-editor-proposal.md`; `publishing-patterns.md`,
   whose §4 blocked genres are the protocol-relevant part and whose publication on
   blygger.org as a fourth genre is an open question. File what survives in `backlog.md`.
   `inline-fragment-authoring.md` was ruled in session 49 (#78, plan §13).
1. **Item 22 — Aneesh's extension registry** ([studio#59](https://github.com/blygger/blygger-studio/pull/59)),
   **only when Venkat says so** — he is thinking about it (session 49). Promised to Aneesh
   as "the round after 0.4 opens". To rule: whether a registry belongs to the program or
   a third party; who reviews an entry and what review promises; browser-only as a hard
   rule; whether blygger.org hosts the index. Read `docs/extension-registry.md` on the PR
   branch first.
2. **RFC-3**, when drafted.
3. **The RFC-1 and RFC-2 comment periods close 2026-11-04**: read the stubs under each on
   `blyg.blygger.org` and the two issues (blygger-spec#14, #15), revise or rule, then gate
   RFC-1's studio work.

## The one standing question — Unicode on the wire (blygger-spec#6)

Not a gate; it opens on choice. `content_hash` differs between NFC and NFD spellings of the
same visible text, the same visible origin serializes to two different strings, three caps
say "characters" without a unit, and two truncations say nothing about where they may cut.
#76 settled line endings for the grammar (LF or CRLF) but not for the hash. Take it only
when no gate is open, or when the first cross-client hash disagreement appears in the
wild. **Measure first:** hash every live item both ways, serialize every live origin
through WHATWG, Python's `urllib` and Go's `net/url`, and count what the caps actually count
in each live client. Nothing here is pre-decided.

## Sequencing notes

- **`tn-2` identity** can be written now (#61, #64, #67 ruled). **`tn-3`** is revised.
- **A technical note on IPFS** (CID profile, pin log) waits on a client emitting `cid`.
- **blygger-spec#12 (Glass Bead Game)** is declined (session 38); parked in `backlog.md`.
- **Kyle's PRs are not gates.** Opus reviews them against #52's four invariants.
- **The snapshot policy stands:** revisions land in the living text and are not
  snapshotted; a snapshot is cut at publication of a new version and thereafter as a
  deliberate act when a third party needs the text to hold still. The second revision was
  not snapshotted.
- **Opening 0.5** needs a construct of #43's second kind built and exercised; none is
  ruled. Do not open 0.5 for a revision.

## Do not open

- **#11 identity, #12 metrics** — load-bearing refusals.
- **A normative write API** (#31), **a mention relation for links** (#32), **a title
  field** (#46), **transitive staleness** (#45), **a maintenance flag** (#34, and now
  #77: a same-hash republish is detected, never declared).
- **Version-significance markup in either direction** — #19, TN-1, #77.
- **The two declined candidates** (#47) unless the trigger named in `backlog.md` §1 occurs.
- **`![[id@vN]]`** — reserved; the variorum (blygger-spec#8) is its named trigger.
- **A second discovery vocabulary** for manifests — #51 chose to extend the existing link.
- **`.well-known` discovery for auth, or any auth key in the manifest** (#52).
- **A general `meta` extension bag on the item document** (blygger-spec#10).
- **Softening #57 for withdrawn quotes** — ruled explicitly in #62.
- **A query-string manifest** — out of scope by #64.
- **Label-first brackets, an escape for `]]`, a wire meaning for `[[text]]`** — #70, #71.
- **A bundle CID, or any media addressing on the wire** — #74 named the document only.
- **Image attributes beyond `width` and `height`** — #75.

## Hand back

Per gate: what was promoted, into which section, in which document. Continue `CLAUDE.md`'s
locked decisions from **#77**, record reasoning in `v0.4-plan.md` §13 (or a new section),
append the DEVLOG entry, file any new ideas in `backlog.md`, prune `fable-round-queue.md`,
and rewrite this brief.
