# Fable brief — the standing agenda for the next Fable pass

**Rewritten:** session 73 (2026-11-16), by Fable 5.2, at Venkat's request, after a round
that ruled #107 and then turned into a change of direction. Earlier rewrites: sessions 38
and 60. **Rewrite this file each Fable round.** It is the one place a Fable session
starts.

## Session 78's quick round (2026-11-21, Fable 5.2) — ruled, so it is not reopened

Staged by Opus at Venkat's request and taken the same day ([`v0.4-plan.md`](v0.4-plan.md)
§28, the twentieth revision):

- **#114** a quoted list keeps its structure, taken from the target (§16.15, awaiting a
  build); a partial bake's text is its `selector.exact` (§10.2, stated now).
- **#115** a correction is not generation (§5.7 rule 10); no member for editing passes.
  blygger-spec#36 is answered and closed on Venkat's word.
- **#116** editorialized quotation, a direction: **RFC-8, Opus drafts, you edit and rule at
  its close.** The open questions are listed in §28.3.
- Background 4b's note half: confirmed against #96 with one amendment (a toggle for the
  disagreement default) and one hardening (the owner's instruction first in the state).
- TN-8 stands; v2 corrects rung 1's account of §16.8. **RFC-5 is promoted as tn-10.**

**Left for the next round:** **RFC-8, drafted** by Opus the same session
(`docs/rfcs/rfc-8-editorialized-quotation.md`, not published) for your edit; the 4b toggle and
hardening, **built** (studio 0.69.0); **review the §16.15 promotion**, done by Opus under #58 the
same day as the twenty-first revision after the gate ran (blyg.blygger.org baked `<ol start="2">`,
venkateshrao imported and showed it).

## This round's product: the spec as a book

**Read [`spec-refactor-plan.md`](spec-refactor-plan.md) in full before anything else.**
It is the task.

Venkat's goal, in his words: a 1.0 spec "that's not just comprehensive and thorough, but
also elegant and a pleasure to read as a design document even for humans, though mostly
agents will read it." It may go to print. At perhaps 50,000 words by 1.0 it is "a
book-length artifact and requires a book-like integrity". The substance of 0.4 does not
change. Level 3 gets a part of its own, and **he has said to assume RFC-6 and RFC-7 pass
largely unchanged**.

**Decided** (plan §3 and §4, decision #109): history leaves the text; a reason appealed
to repeatedly becomes an explained doctrinal principle and a one-off becomes a note;
**principles explain and do not bind**; **every rule has an opaque id** (`R-0001`); a
formal grammar as an annex; a draft to implementers; parts by major area; a manuscript
until 0.5 opens on an exercised Level 3 construct.

### Where it stands

**The first sitting is done** (session 73). In [`book/`](book/README.md): the editorial
sheet, the inventory of reasons with seventeen candidate principles in four families,
the disposition of all 272 clauses, the cast, the clause map and the findings, and
**two sample chapters, Pins and Withdrawal**.

**Waiting on Venkat's reading of the samples.** Until he has said the template works,
write no further chapter. What he is asked (plan §4, C and F to H):

1. Do the sample chapters read as he wants the book to read?
2. The doctrine: which of the seventeen stay, merge or go.
3. "Quote" for "transclusion" in the prose.
4. The outline, now that there is something to hold it against.

**Then, in order:** Part I, the doctrine, in full; Parts II to VII, a part to a sitting
or two, each ending with its clause map; Part VIII after 2026-11-28; annexes; a
read-through; the draft for comment.

### How to work

- **Obey [`book/editorial-sheet.md`](book/editorial-sheet.md).** Change the sheet
  before departing from it.
- **Substance is guarded by the clause map**, not by care. A 0.4 requirement with no
  keyword stays a definition and goes in [`book/findings.md`](book/findings.md).
- **Drift is the risk** (plan §9). Any 0.4 revision and its manuscript counterpart are
  made in the same sitting.
- **Write for someone who will read it from the first page.** Do not carry over a
  sentence because it exists; carry over what it requires.
- **Do not begin Part VIII before 2026-11-28.**

### Still to do from session 73

- **Queue item 31, the studio style** for the reference client
  (`blygger-studio/docs/studio-style.md`): **drafted in session 73** as "Studio style" (Venkat's name), for him to edit; Opus checks each entry against the code before it is linked from blygger.org. It receives what
  the book takes out about the reference client ([`book/reasons-inventory.md`](book/reasons-inventory.md)
  §5 lists it). Open with Venkat: its name.
- **Eight findings** in `book/findings.md`, each a possible 0.4 revision. F-1 and F-2
  matter most: withholding's most general statement and nearly all of withdrawal have
  no requirement keyword.

### For Opus, in parallel

Rebuild the clause register on the current text (ROADMAP row 122's follow-ups first);
report what `sync_spec.py` and the snapshot pages read from the document's structure;
later, the agent test's question set and the print build. The public responses count
(#107, `opus-brief.md` § session 73) is unaffected.

## Also standing

- **RFC-6 and RFC-7 close 2026-11-28.** Revise #106's rulings at the close and promote
  both as notes under #90. R8, the probe, still needs Venkat's word, and several of
  #106's open items wait on it.
- **tn-9** (Common Fabric) still waits for its edit.
- **A look at the public responses count** when Opus has built it: view a live page's
  source and confirm no document, feed or markup carries the number (#107).
- **The batch review of #102's tightened fixtures**, when Opus has built them: that
  they say what `v0.4-plan.md` §21.1 says, fixture 099's single entry above all.
- **Session 73 confirmed** the `@supports (overflow-clip-margin)` deviation on
  studio#149 (`v0.4-plan.md` §24.2). Nothing pending on mathematics.

> **Read after the plan:** `CLAUDE.md` locked decisions **#100–#107** →
> [`v0.4-plan.md`](v0.4-plan.md) **§21–§24** → [`v0.5-plan.md`](v0.5-plan.md) and RFC-6 →
> [`protocol-v0.4.md`](protocol-v0.4.md), all of it, as the source text →
> [`backlog.md`](backlog.md).

## Settled in sessions 64 to 69, so it is not reopened

**#98** `syndication` is an OPTIONAL item member awaiting its gate (§16.14). **#100** an
item's kind is fixed at its first publication. **#101, #104** Level 3's first feature is
sealed content with locks and grants (RFC-6); payments ride it with no wire construct
(RFC-7). **#102** the reader suite's nine choices and the sole statements, all
revisions; a directive line in a fragment is a publish error; a baked quote sits outside
the `blyg-tk-gen` wrapper while the span keeps one `generated[]` entry. **#103** Unicode:
the hash is over the bytes served, NFC a SHOULD, one ASCII spelling for an origin
string; and §3 states what conformance may cost a reader, a test to apply to every new
rule, sealed content included. **#105** mathematics is MathML and the protocol adds
nothing for it. **#106** RFC-6 and RFC-7 at the edit. **#110** a pull request is a
pattern over fork, stub and mention, with no construct and no merge. **#107** a public responses count
is presentation; no count in any document or feed (§16.8, unchanged).

## The dated item — RFC-5 closes 2026-12-03

[`docs/rfcs/rfc-5-enterprise-deployment.md`](rfcs/rfc-5-enterprise-deployment.md),
published on blyg.blygger.org on 2026-11-05 with an anchor issue on `blygger-spec` (both
linked in its header). F1–F5 are already ruled (#93); the comment period asks
implementers the questions in its §7. **At close:** Opus scans the stubs under the item and
the issue, as session 60's scan did for RFC-1 and RFC-2; Fable reads the originals,
revises or rules, and **promotes it as `tn-10` under #90** (renumbered session 78: tn-8
went to the contributor guide; RFC-6's "to become tn-8" line wants the same fix at its close) — v2 of the same blyg item,
pinned, a status line (*unbuilt*), a "Comments received" section. The issue stays open
for late comments.

## New from session 87 — document-level passes (Venkat; reopens part of #115)

Venkat, after studio#184 (he wrapped a whole pasted-from-ChatGPT post in `[TK]impyrt=…[/TK]`,
which nested the post's one real TK scope and failed): **marking a whole item as generated is
not what TK is for.** Two ways of using AI, two constructs:
- **TK scopes are atomic blocks**: an instruction, its sources, its output, inside the text.
- **Document scopes are passes over the whole item**, of various types, with **"first draft"
  as one type of pass** (a pasted model draft is a first-draft pass). They must not interfere
  with the TK scopes inside, and they're the construct blykker's planned editing passes need.
- **Nested TK scopes are cleanly refused**, as they are now, with an error that names the scope
  and *offers* (never applies by itself) the split: `impyrt` around the parts outside it.

The question for Fable: #115 declined any `edited[]` member (§16.8, #83: a per-version
record of passes is version-significance markup). A first-draft pass is generation under §5.7
("span or whole body"), so the disclosure half already exists in principle. What's new is a
whole-item shape that sits beside `generated[]` spans, and a typed list of passes that would
include non-generating ones. Rule which half, if either, reopens #115, and in what shape.
Until then the Studio refuses nesting and does not offer whole-item `impyrt` around scopes.

## Review first — decisions Opus ruled (#58)

**#120 (session 87, the twenty-fifth revision, [`v0.4-plan.md`](v0.4-plan.md) §32):** §15.4 step 1 now says the alternate link is located by HTML's attribute rules (quoted or unquoted), from Dylan Fitzgerald's blygger-spec#40; the issue's publisher-side SHOULD to quote was declined. Look at the decline.

Before that, nothing was pending. The fold by link (session 74, [`v0.4-plan.md`](v0.4-plan.md) §26) was
reviewed the same day: confirmed, with the test tightened from time to text (#112, the
eighteenth revision, §27). #95 was confirmed in session 61 (§18.10).

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
| **RFC-3 close** — ruled session 61 (#97), [`rfcs/rfc-3-pace-layered-order.md`](rfcs/rfc-3-pace-layered-order.md) §7; open for comment on blyg.blygger.org | 2026-12-10 has passed | Scan the stubs with Opus; revise or rule; promote it as a technical note under #90. Do not edit it before then (session 73: it is the model of an optional, named presentation convention). |
| **RFC-6 and RFC-7 close** (#101, #104, #106) | 2026-11-28 has passed | Scan the stubs and blygger-spec#34 and #35 with Opus; revise #106's rulings or let them stand; promote both as technical notes under #90. Venkat expects no dissent (session 73). Then Part VIII of the book is written from RFC-6 ([`spec-refactor-plan.md`](spec-refactor-plan.md) §10). The 0.5 document opens when the first construct is built and exercised. **R8, the probe, is not run** and needs Venkat's word. |
| **RFC-4 draft** | Opus has drafted RFC-4, responding from anywhere (#82; `opus-brief.md` item t, which now carries ksurya's non-blyg webmentions, #92 C5) | Edit and rule it; publish with a comment period; at close promote it under #90. |

The book is the standing work. If Venkat has not said to begin it, nothing is pending
review, no dated item is due and no gate is true when a Fable session opens, **say so in
one line and ask about the book**.

## Next round, on Venkat's word

1. **RFC-3 and RFC-4**, when drafted.
2. **Review Opus's `tn-9` draft** (`plans/tn-9-common-fabric-draft.md`, Common Fabric; Opus
   brief session 67 item 7) when it exists: that it holds the five lines named there and
   claims nothing about their system that was not verified.

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
- **A proposal marker or relation, proposal state on the wire, a merge into another
  origin's item, or lineage that names an unpinned version** — #110. A pull request is
  a pattern over fork, stub and mention.
- **A count in any document, feed or page markup, or any rule about what another
  client's page may show** — #107 and session 73: the wire is policed, pages are not.
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
- **In payments (#104):** a price, currency, rail or for-sale flag in any protocol
  document; a named or preferred rail; a rights vocabulary or machine-readable
  permissions; terms as a gate for readers or as a mention relation; a second key type
  for wallets or tokens; any enforcement of terms. Each reopens only through the RFCs'
  comment period.
- **In the Level 3 design (#101), before or after RFC-6:** a construct on the wire that
  claims to restrict use after delivery (an expiry time, a read count, metering — not
  rental as a business model, which #104 delivers by key choice, cooperation and terms); a per-author key, or any signing meaning on
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

Per gate: what was promoted, into which section, in which document. For the book: the
sitting's products, the clause map for what was touched, and any finding about a rule,
kept apart from the text. Continue `CLAUDE.md`'s locked decisions from **#111**, record
reasoning in `v0.4-plan.md` from §26 (0.4 matters) or `v0.5-plan.md` (Level 3), keep
`spec-refactor-plan.md` current, append the DEVLOG entry, file any new ideas in
`backlog.md`, prune `fable-round-queue.md`, and rewrite this brief.
