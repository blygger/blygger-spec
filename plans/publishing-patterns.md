# Exploration — publishing patterns available in Blygger

> **Reviewed session 67 (2026-11-12, Fable 5.2): no ruling needed.** The variorum (§4.1)
> keeps `![[id@vN]]` reserved, with blygger-spec#8 as its trigger. §4.4's sentence is in
> spec §10.2. **Stale since written:** `[[id]]` links disclose and notify as notices
> (#79), so §3.9's "silent link" holds only within one origin; hopper feeds (#86), moves
> (#88), `syndication` (#98) and fixed kinds (#100) post-date the catalogue. Publication
> is Venkat's call (`docs/pending-calls.md` 14). Notes: `docs/v0.4-plan.md` §22.1.

**Status:** DRAFT, exploratory. Written session 29 (2026-09-29) by a research-only Opus
session. **Nothing here is ruled.** This is a catalogue, not a proposal: it asks what
*genres* the existing primitives already support, which ones they support badly, and which
are blocked.

**Seeded by Venkat** with five patterns (thread-of-threads as a book; one thread with many
versions and pins as a portfolio of variants; a pinned thread forked repeatedly as
frontier exploration; no versions or pins as plain RSS; pin-everything as chain of
possession). Those are §3.1, §3.6, §3.13, §3.2 and §3.16 below. The rest are extrapolated
from the same primitives and checked against precedents in print and digital media.

**Why bother.** A protocol's primitives are not its genres. Movable type did not imply the
newspaper; HTTP did not imply the blog. The genre is a *convention* that some group
settles into, and it usually arrives years after the mechanism. Blygger has an unusually
legible primitive set, so the genres are unusually enumerable in advance — and knowing
them tells you three useful things: which client affordances are missing, which spec
constructs are load-bearing for reasons nobody wrote down, and which patterns the wire
silently forbids.

---

## 1. The instrument

Everything below is built from these, and nothing below adds to them.

| Primitive | Spec | The dial it turns |
|---|---|---|
| fragment / thread | §5.3, §10 | atom vs composition |
| `version` | §5.2 | how much a thing changes after publication |
| **pin** | §8 | how much of that change is promised permanent — irrevocable |
| changelog `note` | §5.2 | the visible account of change |
| transclusion `![[id]]` | §10.1 | verbatim quotation, baked, notifies |
| plain link `[[id]]` | §10.1 | citation that **does not** notify |
| `stub_of` | §10.6 | "this is a response", machine-readable, notifies |
| `forked_from` | §5.6 | lineage from a **pin** — the only thing lineage may point at |
| `generated[]` | §5.7 | disclosure of machine authorship |
| feed window / archive index | §7, §6.2 | lossy signal vs lossless record |
| `blogroll.opml` | §11 | published reading |
| curation display | §13.5 | showing others' work without re-emitting it |
| Webmention | §15 | inbound response signal, structurally verified |
| withdrawal | §9 | leaving, with a permanent tombstone |
| `page` | §5.8 | the human-readable address, free-form |

### The two dials that generate most of the catalogue

**Version frequency** (how often a published item changes) and **pin density** (what
fraction of those states are promised permanent) are orthogonal, and four of Venkat's five
seeds fall straight out of the 2×2:

|  | **few pins** | **many pins** |
|---|---|---|
| **few versions** | §3.2 **the plain blog** — publish once, move on. Recovers RSS exactly | §3.16 **the document of record** — stable text, every state notarized |
| **many versions** | §3.5 **the living document** — evergreen, history withheld | §3.6 **the portfolio of variants** — every state is an exhibit |

That grid is worth stating in the client's own onboarding. A new publisher's first real
decision is not "what do I write" but "how permanent am I promising to be", and the
protocol makes that a dial rather than a default.

---

## 2. How to read the catalogue

Each entry gives the **mechanism** (which primitives, in what arrangement), a **precedent**
(the form this already is, somewhere), and where useful the **strain** (where the protocol
resists). Entries marked **⛔** are blocked today — §4 collects them.

---

## 3. The catalogue

### Serial and periodic forms

**3.1 The book — a thread of threads** *(Venkat)*
**Mechanism.** Chapters are threads, each transcluding its own fragments; a spine thread
transcludes the chapters. Nesting is nested blockquotes (§10.2). Republish the spine to
re-bake.
**Precedent.** The codex itself; more exactly, the *part-work* — Dickens and Thackeray
issued novels in monthly numbers that were later bound. The blyg version binds
continuously.
**Strain, and it is real.** §10.2 bakes bytes, so the spine carries every chapter's full
text; a long book's spine document grows to the size of the book. And #45 ruled there is
no transitive staleness — so when a chapter changes, **the spine is not marked stale**, it
is simply out of date with no signal. The author must remember to republish the spine. For
a nine-chapter book that is fine. For a fifty-chapter reference work it is a footgun, and
the honest answer may be that the spine should hold `[[id]]` links (a table of contents)
rather than transclusions (a bound volume). Those are two different books and the protocol
supports both; nothing currently tells an author which they are choosing.

**3.2 The plain blog** *(Venkat)*
**Mechanism.** Fragments only. Publish once, never version, never pin, never thread.
**Precedent.** The weblog, 1999–2005; a plain RSS feed.
**Why it matters.** This is the protocol's honesty test. Every construct above is optional,
so a blyg that uses none of them is still a conforming blyg, and its feed is readable by
any RSS reader that has never heard of blygger. The pattern's existence is what makes the
rest of the catalogue voluntary rather than mandatory.

**3.3 The serial**
**Mechanism.** Fragments on a cadence, plus a thread that transcludes everything so far,
republished each installment. Readers can follow the feed or read the accumulating whole.
**Precedent.** Victorian serial fiction; the modern serialized newsletter.
**Strain.** Each republish of the spine is a feed event (§7), so a subscriber sees both the
new installment and the updated whole — arguably correct, arguably noise. The `<title>`
derivation (`note — excerpt`) is what makes it legible, so the changelog note carries more
weight here than anywhere else.

**3.4 The almanac / the annual**
**Mechanism.** One thread, republished on a fixed cycle, **pinned at each cycle**. The pins
are the editions.
**Precedent.** The Old Farmer's Almanac; any annual report; Whole Earth Catalog's editions.
**Note.** This is the cleanest demonstration that **pins are editions and the version
counter is printings**. §5.2 deliberately refuses semantic versioning and says the
machine-readable "this state matters" is the pin. An annual makes that mapping obvious in a
way an evergreen page does not.

### Mutability forms

**3.5 The living document**
**Mechanism.** One item, many versions, few pins, rich changelog notes. History stays
withheld (§5.2) except where pinned.
**Precedent.** Gwern's essays with their visible revision metadata; a Wikipedia article
without the public diff; an evergreen "what I believe about X" page.
**Strain.** The changelog is metadata only and MUST NOT reproduce withheld content (§5.2),
so the note has to *describe* a change it may not quote. That is a genuine writing skill
and the client should say so — an author who writes "changed the second paragraph" has
written a useless note, and one who pastes the old paragraph has broken the rule.

**3.6 The portfolio of variants** *(Venkat)*
**Mechanism.** One thread, high version churn, **pin the interesting states**. The pinned
set is the exhibit; the live item is the current best.
**Precedent.** The catalogue raisonné; a designer's process book; Oulipo's *Exercices de
style* — ninety-nine tellings of one trivial incident. arXiv's v1/v2/v3 is the same shape
with different manners.
**Why this is strong here.** Pinned versions are permanently addressable at
`items/{id}/v{n}.json` and each carries its own `content_hash`, so a variant set is
citable variant by variant, while the item id keeps naming "the work." That id/version
split is exactly the DOI-vs-versioned-DOI distinction, arrived at independently.

**3.7 The errata record**
**Mechanism.** Pin the version that shipped, correct, pin the correction. The pair brackets
the fix; §5.2 permits a fully descriptive note *between two pins*, because nothing is
withheld there.
**Precedent.** The errata slip; corrigenda in a journal; a retraction notice.
**Note.** This is the only place the spec relaxes the note rule, and it is easy to miss. It
means "pin before you correct" is a technique, not just a habit.

**3.8 The draft in public**
**Mechanism.** Publish deliberately early, version often, pin nothing, invite stubs.
**Precedent.** Working-in-public essays; the preprint; open drafts on a wiki.
**Strain.** None on the wire — but socially, a reader cannot tell a rough v1 from a settled
v9 without reading the changelog, because §5.2 refuses significance markers *on purpose*
(TN-1). The pattern therefore depends entirely on the author saying so in prose, which is
the design intent.

### Composition and quotation forms

**3.9 The commonplace book**
**Mechanism.** Fragments only, high volume, densely `[[id]]`-linked to each other. No
threads at all.
**Precedent.** Locke's indexed commonplace book; Luhmann's Zettelkasten; the linkroll.
**Why the silent link matters.** §10.1 makes `[[id]]` emit no mention and no
`transclusions[]` entry — "a link asserts nothing on the target's behalf." A dense personal
web of links is therefore *quiet*: it does not notify, does not create a response signal,
and does not look like engagement. That silence is what makes a commonplace book possible
in a medium where every other citation form notifies.

**3.10 The anthology**
**Mechanism.** A thread transcluding *other people's* items across origins, with editorial
apparatus between the quotes. Each remote quote sends a `transclusion` mention (§10.3).
**Precedent.** The Norton Anthology; the reader; the "best of the year" collection.
**Strain.** Nothing forbids it and §13.5 explicitly blesses the editorial-work version —
but an anthology of fifty items sends fifty mentions, and the line between "editor" and
"aggregator" is §10.6's anti-pattern paragraph. The distinguishing fact is whether there is
apparatus between the quotes. Worth a client warning, not a protocol rule.

**3.11 The commentary — the Talmud page**
**Mechanism.** Partial transclusion (#49, once built) of a passage, plus the commentator's
response; a second commentator stubs *that*, quoting a passage of the commentary. Nested
transclusion stacks the layers.
**Precedent.** The Vilna Talmud page — Mishnah at the core, Gemara around it, Rashi and
Tosafot in concentric margins, added over centuries by people who never met. Also
Hypothes.is and Genius, and Fermat's margin.
**Why this is the pattern the protocol is best at.** Every layer is on its own soapbox
(§10.6), under its own identity, in its own feed; the quote is baked so it survives the
source; and the response is machine-readable so the core text can show its commentary
tradition without anyone owning a comment section. This is the strongest argument for
finishing #49 that I can construct: **partial transclusion is what turns blygger from a
publishing format into a commentary medium.**

**3.12 The correspondence**
**Mechanism.** Two blygs stubbing each other alternately. Each stub is a thread on the
sender's own origin with `stub_of` naming the last letter; the exchange is reconstructible
by following the chain.
**Precedent.** The published letter collection; the Republic of Letters; blog-to-blog
argument circa 2003, which is what trackback was for and what §15.4 finally makes honest.
**Strain.** There is no conversation object and no thread-of-replies (§10.6's closing
paragraph is explicit). Reconstructing an exchange means walking `stub_of` links one at a
time. **A "chain view"** is already queued as client work (#41, Opus queue item 8) and this
is its best use case.

### Lineage forms

**3.13 The frontier — fork and modify repeatedly** *(Venkat)*
**Mechanism.** Pin a state, fork it, diverge; pin the fork, fork again. `forked_from` is
the lineage graph, and §8.7 makes a pin the *only* thing lineage may point at.
**Precedent.** Open-notebook science; the lab notebook; Git branching; and — closer than it
looks — *samizdat*, where a text propagated by being copied and quietly altered, each copy
its own artifact with its own lineage.
**Note.** §5.6 rule 6 is the sharp bit: a fork is a **copy**, not a transclusion, and
"readers MUST NOT infer that a fork still resembles its source." So the frontier pattern
produces genuinely independent works that merely declare where they started — which is the
correct semantics for exploration and the wrong one for versioning. Authors will confuse
the two.

**3.14 The translation**
**Mechanism.** Fork from a pin, replace the text, keep `forked_from` as the attribution.
**Precedent.** Every translated edition; and the samizdat point above.
**Strain.** The lineage marker cannot say *what kind* of derivation this is — translation,
adaptation, parody, correction all look identical on the wire. That is deliberate (no
significance markup) but it means a translation's relationship to its source lives entirely
in prose. Probably right; worth knowing.

**3.15 The remix / the variorum** ⛔
See §4.1. This is the most interesting blocked pattern.

### Permanence forms

**3.16 The chain of possession** *(Venkat)*
**Mechanism.** Pin every version, never withdraw. Each version is permanently fetchable
with its own `content_hash` over `content_md`; the archive index (§6.2) is the finding aid.
**Precedent.** The notarial protocol book; chain-of-custody documentation; legal deposit;
institutional repositories. Trusted-timestamping services, minus the third party.
**Honest limits, which the pattern should state up front.** The hash covers `content_md`
only — not media bytes, not `author`, not `content_html` (§5.1, §8.6). Timestamps are
self-asserted and nothing prevents backdating (§14). So this produces an *append-only
public record under one origin's control*, which is a real and useful thing, and **not**
proof of anything against the origin itself. A pattern doc should say that plainly, because
"chain of possession" invites exactly the wrong reading.

**3.17 The deposit copy**
**Mechanism.** §3.16 plus a second origin that subscribes and retains under §13.4's
pin-backed retention rule.
**Precedent.** Legal deposit libraries; LOCKSS.
**Note.** §13.4 lets a reader retain a withdrawn item *only* where a pin backs it. So
pinning is also what makes someone else's archive of you legitimate. Pin density is
therefore a decision about durability past your own participation — worth naming, because
authors will read pinning as being about citation only.

**3.18 The tombstone-honest ephemeral**
**Mechanism.** Publish, then withdraw on a schedule. The endcap is 200 forever (§9, §4).
**Precedent.** Stories and disappearing posts — except inverted.
**Why it is interesting.** Blygger **cannot do true ephemerality**. Withdrawal leaves a
permanent marker saying something was here and is gone, and baked quotes in other people's
threads survive by design (§10.4). So the available pattern is *announced* ephemerality —
which is a different and arguably more honest genre, and one no mainstream platform offers.

### Identity forms

**3.19 The heteronym**
**Mechanism.** Several blygs at several origins, with no protocol link between them.
Identity is not in the protocol (#11) and origins are scoped independently (§13.1).
**Precedent.** Pessoa's heteronyms — Caeiro, Campos, Reis, each with a biography, a style
and opinions that argued with the others. Pen names generally; Bourbaki.
**Note.** The protocol's refusal to model identity is what makes this free. The heteronyms
can even stub each other, and nothing on the wire says they are one person.

**3.20 The masthead**
**Mechanism.** Manifest `author` as the imprint, per-item `author` as the byline — §6.1
says this in as many words.
**Precedent.** The magazine; the zine; the group blog.
**Strain.** The single-publisher invariant (§5.5) means one origin, one publishing
authority. Contributors write *through* the masthead; they do not publish to it
independently. That is a workflow fact the write surface (#31) has to carry, not something
the wire will ever express.

**3.21 The artificial author**
**Mechanism.** A blyg whose items carry `generated[]`, published by an agent under its own
origin and byline.
**Precedent.** This project's own `humboldt`; the tradition of the automatic writer.
**Constraint.** §10.6's anti-pattern paragraph is aimed squarely here: an agent that stubs
every item some set of origins publishes is re-emitting, not responding. "An author, human
or otherwise, that reads each item and answers it under its own byline is stubbing
legitimately, however many stubs that is." The line is editorial work, not species.

### Reading-side forms

**3.22 The aggregator with a public face**
**Mechanism.** §13.5 describes this completely: display imported content as curation, publish
a blogroll so readers can subscribe to the members directly, optionally serve a plain RSS
digest *outside* the blyg surface. Never re-emit, never stub on members' behalf.
**Precedent.** Planet-style aggregators; the webring; the carnival.

**3.23 The syllabus**
**Mechanism.** The blogroll (§11) as curriculum, plus a thread that comments on why each
entry is there.
**Precedent.** The reading list; the course pack.
**Note.** §11 makes the blogroll a *publishing act* with no completeness claim — absence
carries no information. That is what makes it usable as a syllabus rather than as a
disclosure.

**3.24 The linked list**
**Mechanism.** High-frequency fragments, each a `{url}` stub or a link plus a sentence.
**Precedent.** Daring Fireball's linked list; Kottke; the tumblelog.
**The editorial choice the protocol forces.** Link (`[[id]]`, silent) or transclude
(notifies) or stub (`stub_of`, declares a response). Three different social acts with
three different costs, and the author picks one every time. Most media collapse these into
one gesture; here they are separate, and a linked-list publisher will feel the difference
daily.

---

## 4. Patterns that are blocked, and why

The useful half of a catalogue.

### 4.1 The variorum / citing a specific old version ⛔

**Want.** Quote *version 3* of an item while version 9 is live — a critical edition, a
"what this used to say" essay, a diff-commentary.
**Blocked by.** `![[id@vN]]` is reserved and 0.3 publishers MUST reject it (§10.1).
Transclusion always resolves to the publisher's latest local snapshot (§10.2).
**But note the near-miss:** pinned versions *are* permanently fetchable, and `forked_from`
already points at a pinned version. So the protocol can already *name* an old version — it
just cannot *quote* one. A fork gets you the text without the quotation semantics; a
`[[id]]` link gets you the pointer without the text.
**Worth reopening?** The backlog entry says snapshot semantics make most of the need moot,
which is true for the common case — a quote already freezes what it baked. It is *not* true
for the variorum, where the whole point is to display two versions side by side under one
byline. That is a real genre with a long history, and it is currently unexpressible.

### 4.2 A spine that knows its chapters moved ⛔

**Want.** A book's table of contents that shows a chapter has changed since binding.
**Blocked by.** #45: transitive staleness does not exist and will not be defined. §10.4's
staleness is direct-only.
**The available workaround** is to republish the spine on a schedule, which re-bakes
everything and produces a feed event each time. For a living book that is a lot of noise.
**Assessment.** #45's reasoning is sound for the general case (A holding B's unchanged bytes
is not stale — it is accurate). The book pattern is the one place the conclusion feels wrong
to an author, and that is a *client* problem: the studio holds every chapter locally and can
tell the author "three chapters have moved since you last bound the spine" without the wire
knowing anything. **That is probably the right answer and it is not built.**

### 4.3 Genuine co-authorship of one item ⛔

**Want.** Two people jointly editing one item, both with authority.
**Blocked by.** The single-publisher invariant (§5.5) and the whole "origin is the only
authenticated entity" stance (§12.2). `author` is an opaque per-item assertion with no
protocol semantics.
**Available instead:** the masthead (§3.20) — contributors publish through one origin — or
fork-and-diverge (§3.13). Both are real patterns; neither is co-authorship.

### 4.4 Quoting something that has been withdrawn ⛔

**Blocked by.** §10.2 explicitly: republishing a thread whose source was withdrawn and not
pin-retained is a publish error, and "the protocol does not offer 'freeze this quote at the
withdrawn version': that would be the first place withdrawal failed to roll to null."
**Consequence for the book pattern.** A book that quotes a stranger's fragment becomes
**unrepublishable** if that stranger withdraws. The author must edit the directive out. For
a long-lived work this is a real fragility, and the mitigation is social: quote from pins,
because §13.4 retention makes pin-backed snapshots still quotable.
**This deserves to be said loudly somewhere an author will read it.** "Quote pins if you
want your book to survive" is the single most actionable piece of advice in this document.

### 4.5 True ephemerality ⛔
See §3.18. Not a defect — a design choice — but authors arriving from platform media will
expect it.

---

## 5. Anti-patterns already ruled out

Collected so the catalogue does not read as an invitation. Each is refused in the spec.

- **Stub-spam** — emitting a stub per item of some origin set, with nothing to say (§10.6).
- **Re-emission** — republishing imported items into your own surfaces (§13.5).
- **Metrics of any kind** — no counts, no engagement signals (backlog §4).
- **Follower graphs, addressable authors, reply primitives** (backlog §4).
- **Significance markup on the version counter** — the pin is the only "this matters" (TN-1).

---

## 6. What the catalogue suggests

### For the client

1. **Ship the 2×2 as onboarding.** A new publisher choosing "how permanent am I" up front
   is better served than one discovering pins in a settings page two months in.
2. **Pattern templates** — the self-host work (§16.6e, gate G9) already contemplates a
   templated third-party blyg. These patterns are what the templates would be: *plain
   blog*, *commonplace book*, *book*, *document of record*. A template is a default pin
   policy, a default composer kind, and a default set of visible affordances.
3. **"Chapters have moved since you bound the spine"** (§4.2) — local, cheap, and it fixes
   the book pattern's only real defect without touching the wire.
4. **Warn on quoting unpinned remote items** (§4.4) — one line at publish: *this quote will
   block republication if the author withdraws it.*
5. **The chain view** (#41) — §3.12's correspondence pattern is its strongest use case.
6. **Say which book you are writing** (§3.1) — a spine of transclusions is a bound volume;
   a spine of `[[id]]` links is a table of contents. The composer could ask.

### For the spec

Nothing here demands a change. Two things are worth a Fable eye:

- **§4.1, the variorum.** The backlog's reasoning for keeping `![[id@vN]]` reserved covers
  the common case and not this genre. A century of critical editions is evidence the genre
  is real. Not a proposal — a request to re-read the reservation against a use case it may
  not have been tested against.
- **§4.4's fragility deserves a sentence in the spec**, not only in a client warning. §10.2
  states the rule and its rationale; it does not state the consequence for long-lived works
  that quote strangers. One line pointing at pins as the mitigation would be a service.

---

## 7. Open questions

1. **Is a pattern catalogue a thing this project publishes?** `blygger.org` already has
   three genres (spec text, technical notes, talks). A fourth — *patterns* — would be the
   first documentation aimed at publishers rather than implementers. It is also the kind of
   document that makes a medium legible to people deciding whether to adopt it.
2. **Which four patterns become templates?** My vote: plain blog, commonplace book, book,
   document of record — they span both dials and need no unbuilt constructs.
3. **Does the variorum case reopen `![[id@vN]]`?** (§4.1)
4. **Should §10.2 name the quote-a-pin mitigation?** (§4.4)
5. **Which of these patterns is Venkat's own blyg going to be?** The personal deployment is
   still unbuilt, and it will be the catalogue's first real test — a pattern nobody has
   actually lived in is a hypothesis.
