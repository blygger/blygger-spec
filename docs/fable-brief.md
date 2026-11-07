# Fable brief — the standing agenda for the next Fable pass

**This round's product:** review every decision labelled `Fable review pending` (#58);
take the dated item below when its date has come; take the queued items in
[`fable-round-queue.md`](fable-round-queue.md) if chosen on purpose; otherwise nothing.
**Since #58, promotions are Opus's**; Fable reviews them after the fact.
**Written:** session 38 (2026-10-06), by Fable 5.1. **Rewritten:** session 60
(2026-11-05), by Fable 5.1, after a round in the middle of an Opus session that closed
RFC-1 and RFC-2 and promoted them as technical notes (#90–#92), ruled RFC-5's five items
and published it for comment (#93), and ruled the private-items numbering question (#94);
the tenth revision of 0.4 carries the text. Session 58's round (#89) and session 56's
(#86–#88) are summarised below so they are not reopened.
**Rewrite this file each Fable round.** It is the one place a Fable session starts.

> **Read first, in this order:** this brief → `CLAUDE.md` locked decisions **#90–#94**
> (session 60; #86–#89 sessions 56 and 58; #84–#85 session 52; #79–#83 session 50) →
> [`v0.4-plan.md`](v0.4-plan.md) **§18** (the reasoning) →
> [`protocol-v0.4.md`](protocol-v0.4.md) **§17** (tenth revision), §16.13 (`moved_from`,
> awaiting its gate), §16.9–§16.10 (older ruled shapes still awaiting builds) →
> [`fable-round-queue.md`](fable-round-queue.md) (**item 24 only**) →
> [`backlog.md`](backlog.md) → [`opus-brief.md`](opus-brief.md) § session 60.

## Ruled session 61 (2026-11-07, Fable 5.1) — studio#137, the Shelf; drop at the next rewrite

A quick check at Venkat's request, not a round. Client contract (#31), nothing on the
wire, so no numbered decision; reasoning in [`v0.4-plan.md`](v0.4-plan.md) **§18.6**.
Approved with one change: `expectedRevision` on `PUT /shelf` becomes **required** (the
item precedent, 0.49.12); and one doc sentence: the shelf is **private forever**, a
featured list being a separate presentation setting that may default from it. Its own
resource, not a hopper mode; quiet dropping and `owner:manage` stand. Opus carries it
out (`opus-brief.md` § session 61). Nothing for Fable to review here.

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

**Pending now: nothing.** Session 60's five decisions are Fable's own. Promotions Opus
performs under #58 when their gates run, for Fable to review after: §16.9 `pinned_at` →
§5.2 and §8 once the studio emits it and a second client reads it; §16.9 `cid` → the same
once any client emits it and a mirror reads it; §16.10 image size → §10.1 once emitted and
imported across two nodes; **§16.13 `moved_from`** → §6.1, §12.2, §15.3, §15.4 once
Florian's live case has run the gate. When reviewing that promotion, the thing to look at:
that the receiver's former-identity substitution is confined to origins the receiver
itself declares. **First builds of tn-6 or tn-7** (the studio's RFC-1 work, opus-brief
item e) are revision triggers under #90: Opus revises the note's status line and any
section the build contradicts, and Fable reviews the revision in batch.

## The gates

| Gate | What must be true | Then Fable does |
|---|---|---|
| **G3** | Kyle's token auth has shipped under #52's four invariants (it has, 0.28) and **at least one third-party tool** authenticates with a scoped token | Review **`tn-4` — the write surface** (non-normative, #31), which Opus drafts from the build. |
| **G5** | The reference agent (2.10) has run against a live node long enough to refresh a snapshot, answer a mention, and author under its own byline | Review `tn-5` for anything that wants a construct — the refresh scope on the re-bake identity (#38, backlog §1) is the candidate. |
| **RFC-3 draft** | Opus has drafted RFC-3 (pace-layered order) from `blygger-studio/docs/pace-layered-feed.md` and the fixtures (`opus-brief.md` item i) | Edit and rule it as #67/#68 were; publish on blyg.blygger.org with a comment period; at close promote it under #90. |
| **RFC-4 draft** | Opus has drafted RFC-4, responding from anywhere (#82; `opus-brief.md` item t, which now carries ksurya's non-blyg webmentions, #92 C5) | Edit and rule it; publish with a comment period; at close promote it under #90. |

If nothing is pending review, the dated item is not due and no gate is true when a Fable
session opens, **say so in one line and stop** — or take item 24 or the `plans/` review if
Venkat has decided to.

## Next round, on Venkat's word

0. **The four unreviewed session-29 explorations in `plans/`** (carry-over since session
   49): `unicode-support-proposal.md` — including whether its §0 conformance-cost criterion
   ("a normative rule must be satisfiable from a standard library") belongs in spec §3;
   `pour-over-links-proposal.md`; `rich-editor-proposal.md`; `publishing-patterns.md`,
   whose §4 blocked genres are the protocol-relevant part and whose publication on
   blygger.org as a fourth genre is an open question. File what survives in `backlog.md`.
1. **Item 24 — the nine choices the 0.4 text leaves open**, found by Aneesh's reader
   suite ([blygger-spec#22](https://github.com/blygger/blygger-spec/pull/22), merged), with
   the clause register's For-Fable findings in
   [blygger-spec#23](https://github.com/blygger/blygger-spec/issues/23). Each answer is a
   sentence in the living text that another client reads, so this is a round of its own,
   not a quick ruling; measure each choice against the live clients before ruling, as
   session 49's second round did with the member tables. The reader suite's studio run
   (72/28) is Opus's to reproduce first, so the round starts from a current report.
2. **RFC-3 and RFC-4**, when drafted.

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

- **`tn-2` identity** can be written now (#61, #64, #67 ruled); it keeps #35's gate (#90
  did not touch it). **`tn-3`** is revised. **tn-6 and tn-7** are published, unbuilt.
- **A technical note on IPFS** (CID profile, pin log) waits on a client emitting `cid`.
- **blygger-spec#12 (Glass Bead Game)** is declined (session 38); parked in `backlog.md`.
- **Kyle's PRs are not gates.** Opus reviews them against #52's four invariants.
- **The snapshot policy stands:** revisions land in the living text and are not
  snapshotted; a snapshot is cut at publication of a new version and thereafter as a
  deliberate act when a third party needs the text to hold still. The tenth revision was
  not snapshotted.
- **Opening 0.5** needs a construct of #43's second kind built and exercised. Step 7 (#86)
  and `moved_from` (#88) are 0.4 constructs landing in the living text; do not open 0.5
  for them.
- **The L3 round** opens when shape E has a named case (#93 F4); it starts from C3, and
  group visibility in the private-items proposal (§8.3) waits for it.

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
locked decisions from **#94**, record reasoning in `v0.4-plan.md` §18 (or a new section),
append the DEVLOG entry, file any new ideas in `backlog.md`, prune `fable-round-queue.md`,
and rewrite this brief.
