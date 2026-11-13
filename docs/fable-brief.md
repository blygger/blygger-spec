# Fable brief — the standing agenda for the next Fable pass

**This round's product:** review every decision labelled `Fable review pending` (#58);
take the dated item below when its date has come; otherwise nothing. The queue
([`fable-round-queue.md`](fable-round-queue.md)) is empty since session 67.
**Since #58, promotions are Opus's**; Fable reviews them after the fact.
**Written:** session 38 (2026-10-06), by Fable 5.1. **Rewritten:** session 60
(2026-11-05), by Fable 5.1, after a round in the middle of an Opus session that closed
RFC-1 and RFC-2 and promoted them as technical notes (#90–#92), ruled RFC-5's five items
and published it for comment (#93), and ruled the private-items numbering question (#94);
the tenth revision of 0.4 carries the text. Session 58's round (#89) and session 56's
(#86–#88) are summarised below so they are not reopened.
**Session 61** (2026-11-07, Fable 5.1, mid-session): #95 confirmed, #96 and #97 ruled, the eleventh revision; summarised below.
**Session 64** (2026-11-09, Fable 5.2): tn-4 reviewed (G3 closed), #98 ruled (`syndication`), the twelfth revision; summarised below.
**Session 66** (2026-11-12, Fable 5.2): the Level 3 round — research reviewed, #100 (kind is fixed) and the thirteenth revision, #101 (sealed content goes to RFC-6); summarised below.
**Session 67** (2026-11-12, Fable 5.2): item 24 — the reader suite's nine choices and #23's sole statements, #102, the fourteenth revision; summarised below. **The queue is empty.** Then the four `plans/` reviews and Unicode on the wire, #103, the fifteenth revision: **nothing standing remains.**
**Rewrite this file each Fable round.** It is the one place a Fable session starts.

> **Read first, in this order:** this brief → `CLAUDE.md` locked decisions **#90–#94**
> (session 60; #86–#89 sessions 56 and 58; #84–#85 session 52; #79–#83 session 50) →
> [`v0.4-plan.md`](v0.4-plan.md) **§18** (the reasoning) →
> [`protocol-v0.4.md`](protocol-v0.4.md) **§17** (tenth revision), §16.13 (`moved_from`,
> awaiting its gate), §16.9–§16.10 (older ruled shapes still awaiting builds) →
> [`backlog.md`](backlog.md) → [`opus-brief.md`](opus-brief.md) § session 60.
>
> **Session 64 took session 63's immediate agenda** (next section): read `CLAUDE.md`
> **#98** and `v0.4-plan.md` **§19** with the above. Session 67 emptied the queue: read
> **#102** and `v0.4-plan.md` **§21**.

## Ruled session 67 (2026-11-12, Fable 5.2) — drop at the next rewrite

**#102, item 24.** The nine `ambiguous` fixtures and the sixteen sole statements are
ruled, all as revisions (fourteenth). The two that were decisions and not readings: a
directive line in a fragment is a publish error (#60, #100), and a baked quote sits
outside the `blyg-tk-gen` wrapper while the span keeps **one** `generated[]` entry. S11
and S15 were declined and reworded as description. Opus has the fixtures, the clause
register and three studio changes; when it has done them, **review in batch** that the
tightened fixtures say what §21.1 says, 099's single entry above all.

**#103, the `plans/` reviews and Unicode.** Three explorations needed no ruling. Unicode
(blygger-spec#6) is ruled: the hash is over the bytes served; NFC a publisher SHOULD;
one ASCII spelling for an origin string, a MUST; caps count code points; `content_md`
carries no C0 controls or unpaired surrogates; two §14 bullets; manifest `lang` parked;
and §3 now states what conformance may cost a reader. Reasoning `v0.4-plan.md` §22.
**Apply §3's test to every new rule from here on**, RFC-6's items included: sealed
content will ask readers for cryptography, and whether that is in a standard library
is one of the things to say when ruling it.

## Ruled session 66 (2026-11-12, Fable 5.2) — drop at the next rewrite

Venkat opened the round on the Level 3 research. Read `CLAUDE.md` **#100 and #101**,
`v0.4-plan.md` **§20** and [`v0.5-plan.md`](v0.5-plan.md) with the list above.

1. **Research R1–R7 reviewed.** Fit to design from. One error corrected in R1's header
   (MPP's draft is an active individual submission under a new name, not expired). The
   closing "own view" sections agree with each other because one agent wrote all seven;
   they are one opinion. Five gaps were named and are answered by, or listed in,
   `v0.5-plan.md`.
2. **#100 — an item's kind is fixed at its first publication**, and clients that create
   items for an author create threads (§20; spec §5.3, §13.3, §13.7, thirteenth
   revision). `tangling-plan.md` revised to match.
3. **#101 — Level 3's first feature is sealed content with locks and grants**, a design
   direction taken to RFC-6; payments follow as RFC-7. Question D was answered by a
   layering: entries and locks on the wire, grant files as the static path, a request
   endpoint as an optional dynamic one, the ladder private. The plan lists seventeen
   items the RFC must settle.

**From session 64, still current:** #98 `syndication` awaits its gate (§16.14); tn-4 is
reviewed and publishes at the next `sync_spec`.

## The dated item — RFC-5 closes 2026-12-03

[`docs/rfcs/rfc-5-enterprise-deployment.md`](rfcs/rfc-5-enterprise-deployment.md),
published on blyg.blygger.org on 2026-11-05 with an anchor issue on `blygger-spec` (both
linked in its header). F1–F5 are already ruled (#93); the comment period asks
implementers the questions in its §7. **At close:** Opus scans the stubs under the item and
the issue, as session 60's scan did for RFC-1 and RFC-2; Fable reads the originals,
revises or rules, and **promotes it as `tn-8` under #90** — v2 of the same blyg item,
pinned, a status line (*unbuilt*), a "Comments received" section. The issue stays open
for late comments.

## Review first — decisions Opus ruled (#58)

**Pending now: nothing.** #95 was confirmed in session 61 (§18.10).

Session 60's five decisions are Fable's own. Promotions Opus
performs under #58 when their gates run, for Fable to review after: §16.9 `pinned_at` →
§5.2 and §8 once the studio emits it and a second client reads it; §16.9 `cid` → the same
once any client emits it and a mirror reads it; §16.10 image size → §10.1 once emitted and
imported across two nodes; **§16.13 `moved_from`** → §6.1, §12.2, §15.3, §15.4 once
Florian's live case has run the gate; **§16.14 `syndication`** → §5's member table and a
new §5.10 once one client emits an entry without spending a version and a second shows
it from an import (#98). When reviewing the `moved_from` promotion, the thing to look at:
that the receiver's former-identity substitution is confined to origins the receiver
itself declares. **First builds of tn-6 or tn-7** (the studio's RFC-1 work, opus-brief
item e) are revision triggers under #90: Opus revises the note's status line and any
section the build contradicts, and Fable reviews the revision in batch.

## The gates

| Gate | What must be true | Then Fable does |
|---|---|---|
| **G5** | The reference agent (2.10) has run against a live node long enough to refresh a snapshot, answer a mention, and author under its own byline | Review `tn-5` for anything that wants a construct — the refresh scope on the re-bake identity (#38, backlog §1) is the candidate. |
| **RFC-3 close** — **ruled session 61 (#97)**, [`rfcs/rfc-3-pace-layered-order.md`](rfcs/rfc-3-pace-layered-order.md) §7; publishes on blyg.blygger.org once the studio builds R2 and R3 (`opus-brief.md` item i) and Venkat says | Its comment period has closed (four weeks from publication) | Scan the stubs with Opus; revise or rule; promote it as a technical note under #90. |
| **RFC-6 draft** — sealed content and permissions (#101) | Opus has drafted `docs/rfcs/rfc-6-sealed-content.md` from [`v0.5-plan.md`](v0.5-plan.md), each of the plan's §9 items stated with options, a proposal and a test, and R7's dispositions filled in as proposals | Edit and rule it. Rule first: the second hash and what maintenance means for each audience; key commitment; the two #11 conditions on the origin key (re-read #35 and tn-3 against plan §7); whether the request endpoint is a carve-out like #13 and whether a home URL in the entry stays clear of #52. Then publish on Venkat's word with a comment period; at close promote it under #90. The 0.5 document opens when the first construct is built and exercised, which is after the close. Research: `plans/l3/` R1–R7 (what each could not verify is in its own header; R1 carries a correction). **R8, the probe, is not run** and needs Venkat's word. |
| **RFC-7** — payments | RFC-6 has closed, and Venkat says | Design from `v0.5-plan.md` §8 and R1: payment as one more ground for a grant. Not started. |
| **RFC-4 draft** | Opus has drafted RFC-4, responding from anywhere (#82; `opus-brief.md` item t, which now carries ksurya's non-blyg webmentions, #92 C5) | Edit and rule it; publish with a comment period; at close promote it under #90. |

If nothing is pending review, the dated item is not due and no gate is true when a Fable
session opens, **say so in one line and stop**. Nothing optional is left to take.

## Next round, on Venkat's word

1. **RFC-3 and RFC-4**, when drafted.

**Opus-tier, not Fable's — listed so a Fable session does not take them by habit.**
[blygger-spec#19](https://github.com/blygger/blygger-spec/issues/19) (fetched text is data,
one SHOULD in §14; Opus may rule under #58, the one question being whether a conformance
document should mention language models at all given the §0 criterion above);
[blygger-spec#20](https://github.com/blygger/blygger-spec/issues/20) (publish the
conformance schemas at their `$id` URLs; depends on blygger-org#4); studio#88 (shannonbux,
component primitives, unreviewed); the re-scope of studio#59 and `docs/mods.md` under #89;
blykker's hooks in their general forms; blygger.com's two listings for Florian's blyg
(opus-brief item y); the studio's RFC-1 work and the found-mentions list (opus-brief
§ session 60).

## What session 60 settled, so it is not reopened

**#90**: an RFC becomes a technical note when its comment period closes; the first build
is a revision trigger, not the promotion gate; tn-2's own gate (#35) is untouched; RFC-1 →
tn-6, RFC-2 → tn-7, tn-2/4/5 reserved; the note is v2 of the same blyg item, pinned.
**#91** (tn-6): a mention is silent because its wire form is the markdown link #79 kept
silent and its target is a person, whom no relation can name; `@handle` is resolved by the
publishing server on every write path and never survives into `content_md`, unmatched
`@word`s are literal prose with a warning; a reading client MAY list found mentions in
items it already holds (owner's member record, quotes excluded, apart from verified
mentions, no count), and nothing beyond what it holds. **#92** (tn-7): reply notification
for signed-in commenters as house behaviour off the wire, refused for anonymous ones (an
address reverses the anonymity) with a browser-token MAY; one install SHOULD run both
origins; no typed stubs on the wire — display sections are presentation; a notice is never
a response. **#93** (RFC-5): what an origin serves does not depend on who asks (§4);
split-horizon is L3 by the back door; an allowlisted intended fetch is not a probe; the
boundary rule is client policy; enterprise needs no L3 to start; C2 refused, C3 is where
L3 starts, C1 is client territory under one invariant; a compelled removal is a 404 with no
marker and a compelled retention stays off every governed surface (§14). **#94**: a private
item's first public version is v1; private history is studio history.

## What sessions 56 and 58 settled

**#89** (session 58): the studio has three mod surfaces — owner-API configuration,
compiled-in extensions, hooks upstream — and a hook must be general, wire-silent and
reads-only on the server; no program-hosted extension registry now; the feed filter and
the server write hook blykker proposed are refused; principles in
`blygger-studio/docs/mods.md`. The day a second mod with browser code exists is the day to
count demand again. **#86**: a hopper feed is not re-emission; no `blyg:` in a hopper feed;
no item document ever names a hopper. **#87**: `{identity}blyg.json` MUST serve the
manifest; a `manifest` URL in references and "subscribers only" were refused. **#88**: a
move's two statements are the old manifest's permanent redirect and the successor's
`moved_from`; readers offer and adopt only on confirmation; no `moved_to` key.

## Sequencing notes

- **`tn-2` identity** can be written now (#61, #64, #67 ruled); it keeps #35's gate (#90
  did not touch it). **`tn-3`** is revised. **tn-4** is reviewed (session 64) and publishes
  at the next `sync_spec`. **tn-6 and tn-7** are published, unbuilt.
- **A technical note on IPFS** (CID profile, pin log) waits on a client emitting `cid`.
- **blygger-spec#12 (Glass Bead Game)** is declined (session 38); parked in `backlog.md`.
- **Kyle's PRs are not gates.** Opus reviews them against #52's four invariants.
- **The snapshot policy stands:** revisions land in the living text and are not
  snapshotted; a snapshot is cut at publication of a new version and thereafter as a
  deliberate act when a third party needs the text to hold still. The tenth revision was
  not snapshotted.
- **Opening 0.5** needs a construct of #43's second kind built and exercised, and #99
  names it: Level 3. The document opens when the first L3 construct is built, not when
  the design is ruled (#21, #43). Step 7 (#86), `moved_from` (#88) and `syndication`
  (#98) are 0.4 constructs; do not open 0.5 for them.
- **Level 3 is two RFCs** (#101): RFC-6, sealed content and permissions, then RFC-7,
  payments. Until RFC-6 is ruled, #93's classification and the two do-not-open entries on
  split-horizon origins and C2 stand; group visibility in the private-items proposal
  (§8.3) is answered by RFC-6's locks.

## Do not open

- **#11 identity, #12 metrics** — load-bearing refusals. (#88 touches neither: origins,
  not people.)
- **A normative write API** (#31), **a relation that names a person** (§16.8; #79 added
  the `link` relation, #91 re-grounded a mention's silence), **a title field** (#46),
  **transitive staleness** (#45), **a maintenance flag** (#34, and #77: a same-hash
  republish is detected, never declared).
- **Version-significance markup in either direction** — #19, TN-1, #77.
- **Public numbering that continues a private count** — #94.
- **The two declined candidates** (#47) unless the trigger named in `backlog.md` §1 occurs.
- **`![[id@vN]]`** — reserved; the variorum (blygger-spec#8) is its named trigger.
- **A second discovery vocabulary** for manifests — #51 chose to extend the existing link.
- **`.well-known` discovery for auth, or any auth key in the manifest** (#52).
- **A general `meta` extension bag on the item document** (blygger-spec#10), **or a typed
  stub on the wire** — #92 C4; display sections are presentation.
- **A specified fold for `syndication`, a version spent to record an entry, a
  network-native identifier or a network name in an entry, counts in an entry, or any
  rule about what a reader fetches or shows from the other network** — #98. The first
  reopens only with a test that a stranger's post cannot pass; the identifier reopens if
  a second reader shows URL parsing failing. **In-place change is the pin flag's class,
  not a general channel**: a proposal citing #98 for a member readers act on is refused.
- **A change of kind, or a kind that describes only the current version** — #100. A
  fragment that must grow is quoted by a new thread.
- **A directive that is inert in a fragment, a rendered label, a `generated[]` entry per
  wrapper, or a permalink-convention URL in published bytes** — #102. The first reopens
  only if a second client shows authors need a fragment to display the grammar outside
  code.
- **A hash over normalized text, NFC as a MUST, a reader that normalizes an import, a
  per-item `lang` or a `dir` rule, or any rule that asks a reader for a package** —
  #103. Manifest `lang` is parked, not refused: its trigger is in `backlog.md` §1.
- **In the Level 3 design (#101), before or after RFC-6:** a restriction on use after
  delivery (rentals, read counts, metering); a per-author key, or any signing meaning on
  the origin's key; a group name, roster, price or rail in any protocol document; new
  markup in `content_md` for sealed spans; per-reader bytes on the surface. Each reopens
  only through RFC-6's comment period.
- **A removal marker** (a 410 with a reason, a tombstone, any delete signal) — #93 F5; a
  compelled removal is a 404 with no marker.
- **Reader-side mention notification beyond what the reader holds** — #91 B4; telling is
  what #67 ruling 2 refuses, crawling is a search engine's job.
- **Split-horizon origins, or a 401/403 on chosen documents within a readable origin** —
  #93 F1, F4 (C2).
- **Softening #57 for withdrawn quotes** — ruled explicitly in #62.
- **A query-string manifest** — out of scope by #64.
- **Label-first brackets, an escape for `]]`, a wire meaning for `[[text]]`** — #70, #71.
- **A bundle CID, or any media addressing on the wire** — #74 named the document only.
- **Image attributes beyond `width` and `height`** — #75.
- **A filtered blyg feed** (per-hopper `feed.xml` with `blyg:id`, or a publisher-side
  filter that drops marked items) — #86, #89.
- **A program-hosted extension registry, or any extension listing under the `blygger`
  org that reads as endorsement** — #89; the trigger to count again is a second mod with
  browser code.
- **A server-side write hook in the studio** — #89.
- **A `moved_to` key, or any succession claim a reader acts on without the old origin's
  redirect** — #88.
- **A `manifest` locator inside references** — #87.

## Hand back

Per gate: what was promoted, into which section, in which document. Continue `CLAUDE.md`'s
locked decisions from **#104**, record reasoning in `v0.4-plan.md` §23 (0.4 matters) or
`v0.5-plan.md` (Level 3),
append the DEVLOG entry, file any new ideas in `backlog.md`, prune `fable-round-queue.md`,
and rewrite this brief.
