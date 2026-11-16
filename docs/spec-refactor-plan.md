# The spec as a book — the refactor toward 1.0

**Written:** session 73 (2026-11-16), Fable 5.2, with Venkat. First as a quick sizing
pass, then rewritten the same session once he had set the goal and answered most of the
open questions. **The first sitting is done** (same session): the working papers and two sample
chapters are in [`book/`](book/README.md), waiting for Venkat to read. Queue item 33; ROADMAP row 129.

## 1. The goal

Venkat, session 73: the current spec "is starting to feel a little overwrought and
unwieldy" as Level 3 and 0.5 begin. The aim is **a 1.0 specification that is not only
comprehensive and thorough but elegant, and a pleasure to read as a design document**,
for people as well as for the agents who will be most of its readers. It may be
published in print. At 20,000 to 30,000 words now and perhaps 50,000 at 1.0, it is a
book-length work and **needs a book's integrity**.

So this is not a tidying. It is the writing of the book the protocol will be read from,
done once, with the substance of 0.4 carried over unchanged and Level 3 given its place.

**What "a book's integrity" is taken to mean here**, so it can be checked:

- **One voice.** The same tense, the same person, the same way of stating a rule on
  page 5 and page 150.
- **One vocabulary.** A term means one thing and one thing has one term. The glossary
  is part of the book and the text obeys it.
- **One argument.** The doctrine in Part I is what the rules in the later parts follow
  from, and a reader can see that they do. A rule that follows from nothing stated is
  either missing its principle or is detail that does not belong.
- **One cast.** A single running example, the same few blygs and items from the first
  chapter to the last, so that each construct is shown doing something to things the
  reader already knows.
- **A shape a reader can hold.** Parts and chapters with one template, each chapter
  readable alone once Part I and Part II are read, each saying what it depends on.
- **Nothing in it that is not the book's.** No history, no decision numbers, no client
  names, no record of how the text came to be.

## 2. What was measured

`docs/protocol-v0.4.md` at its sixteenth revision: 3,364 lines, about 31,100 words.

| Part | Words | Share | Normative? |
|---|---|---|---|
| Preamble (status, versions, where the text lives) | 855 | 3% | no |
| §1 Introduction | 612 | 2% | no |
| §2–§15, the body | 22,980 | 74% | yes |
| §16 Ruled, deferred and reserved | 4,362 | 14% | no |
| §17 Revision history | 2,316 | 7% | no |

- A quarter of the document is apparatus. Eleven of §16's twenty subsections are stubs
  for constructs already promoted, kept so old citations resolve.
- §5 (the item document, 5,400 words) and §10 (threads and transclusion, 4,570) hold a
  third of everything. The rules for how one item refers to another are split between
  them.
- The body carries its own history: 53 inline "(revision of *date*, decision #*n*)"
  markers, 31 "new in 0.3/0.4", about 200 decision citations, 30 asides about the
  reference client.
- A few ideas are re-argued wherever they apply: "self-asserted" 16 times, the ignore
  rule about 30, "presentation" 29.
- Rule and reason share a sentence. Three voices run in one stream: **the rule**, **the
  reason**, and **the record**.

## 3. Decided (Venkat, session 73)

1. **History leaves the text.** Revision history and version policy become their own
   pages. No dates, decision numbers or "new in" markers in the body.
2. **Reasons go one of two places.** A reason **appealed to repeatedly becomes a
   doctrinal principle**, stated once in Part I. A reason used once is **a note under
   its rule**. Nothing else: a rejected design goes to a technical note, a record to the
   history.
3. **Principles are explained**, not listed. Part I is prose: each principle with what
   it means, why the protocol holds it, what it costs, and what it rules out.
4. **A formal grammar** for directives and links is added as an annex. The prose rules
   where the two disagree.
5. **A draft goes to implementers for comment** on blyg.blygger.org (#66) before it
   replaces anything.
6. **Organised into parts by major area, philosophy apart from rules.** His direction;
   section 5 is the proposed outline, which he has seen and not yet confirmed.
7. **Assume RFC-6 and RFC-7 pass largely unchanged** (he expects no dissent). Level 3
   is designed into the structure now and not bolted on later.

## 4. Decided after the first cut, and what is still open

Answered by Venkat when the work began (session 73, decision #109):

| # | Question | Answer |
|---|---|---|
| A | Are principles normative? | **No. They explain.** Every MUST stays a rule of its own that cites its principle. Reason in section 8. |
| B | Stable rule ids | **Yes, opaque**: `R-` and four digits, assigned in the order rules are written, carrying no meaning, never reused. Not name-based: a name can go stale. |
| D | When the book becomes the living text | **When 0.5 opens under the existing rule**: the first Level 3 construct built and exercised. Until then it is a manuscript. |
| — | Queue items 30 to 32 | **Go on all three.** 30 and 32 are done (the seventeenth revision is the book's baseline). 31, the studio style, is to be drafted. |

Still open:

| # | Question | Working assumption |
|---|---|---|
| C | The outline in section 5 | As proposed, open to change now that the sample chapters exist. |
| E | Print | Designed for, not scheduled. Nothing in the text may depend on a hyperlink for its meaning. |
| F | The doctrine: seventeen principles in four families ([`book/reasons-inventory.md`](book/reasons-inventory.md)) | To be cut or merged by Venkat on reading; "testing precedes prose" is left out as process. |
| G | "Quote" for "transclusion" in the prose | Used in the sample chapters; reversible in one pass. |
| H | Rulings on [`book/findings.md`](book/findings.md) | None needed to continue; each is a 0.4 revision when taken. |

## 5. The proposed outline

| Part | Chapters | Normative? | Now (words) | At 1.0 (est.) |
|---|---|---|---|---|
| Front matter | Status in a paragraph; how to read this book; reading paths | no | 1,470 | 800 |
| **I. Foundations** | What Blygger is. The doctrine: the principles, each explained. What will never appear, and why | no | 600 | 5,000 |
| **II. The model** | Terms. Origins and identity. Items, versions, kinds. Conformance levels | yes | 2,300 | 2,500 |
| **III. Publishing** | The surface. The item document. Manifest and index. The feed. Pins. Withdrawal. The blogroll. Hopper feeds | yes | 6,500 | 6,000 |
| **IV. Composition** | The reference. The grammar. Resolution at publish. Quotes and links. Stubs. Forks and lineage. Generation provenance | yes | 8,000 | 7,000 |
| **V. Reading** | From a URL to a subscription. Reconciliation. Retention. Legacy RSS. Ordering. The duties of display | yes | 3,800 | 4,500 |
| **VI. Between blygs** | Mentions: advertising, sending, receiving, verifying, the two classes | yes | 2,600 | 2,500 |
| **VII. Security and privacy** | As now, regrouped under the principles it applies | yes | 1,300 | 2,000 |
| **VIII. Sealed content** (Level 3) | From RFC-6: entries, locks, grants, the home, what a reader that does not decrypt does | yes, once exercised | 0 | 9,000 |
| **Annexes** | A. Formal grammar. B. Ruled shapes awaiting a build. C. Reserved names. D. Section map from 0.4. E. The running example in full. Glossary. Index | mixed | 4,400 | 6,000 |

About 45,000 words at 1.0 on these estimates. They are budgets to write against, taken
from the counts in section 2 and from RFC-6's present length, and will move.

Three things about the shape:

- **Composition is its own part.** It is the protocol's most distinctive area and has
  no single home today.
- **The duties of display are gathered in Part V.** Session 73 found that every display
  rule the spec keeps protects someone other than the page's owner. Stated together
  they draw the line between the protocol and any client's style
  (queue items 30 to 32).
- **Level 3 is a part, not a thread.** A Level 2 reader can stop at the end of Part VII
  and has read a complete protocol.

**Outside the book:** revision history; version policy and snapshots (one page shared
by every version); rejected designs (technical notes); what the reference client does
(its studio style and docs, queue item 31); payments (RFC-7 is a recommendation and
becomes a note, with no wire text of its own).

## 6. The chapter template

Every chapter in Parts II to VIII has the same four movements, in this order.

1. **What it is.** One or two paragraphs in plain prose, with the running example. A
   reader who stops here knows what the construct is for.
2. **The shape.** The document or member, as a table and one worked example.
3. **The rules.** Numbered, each with its id, each one sentence where it can be, each
   naming who acts (a publisher, a reader, a receiver) and carrying one requirement
   keyword. A rule that follows from a principle says which.
4. **Notes.** One-off reasons, edge cases, and what a rule deliberately does not say.
   Short. A note never contains a rule.

Part I has no rules and Parts II to VIII have no philosophy beyond a citation.

## 7. The doctrine: a first cut

To be derived properly in the first sitting (section 10, step 1) from an inventory of
every reason in the 0.4 body. What recurs on a quick pass:

- **P1** The item document is the truth; the feed is a signal.
- **P2** Everything a blyg says is its own claim, scoped to its origin, unverified.
- **P3** Ignore what you do not understand, and never reject for it.
- **P4** A publisher bakes at publish; a reader never resolves.
- **P5** Signals are derived, never declared: no significance markup, no metrics.
- **P6** History is withheld unless pinned; a pin is the only promise.
- **P7** Presentation is the client's, except where another party is protected.
- **P8** Conformance is satisfiable from a standard library.
- **P9** The protocol holds no opinion where schemes compete: identity, payment, and
  the style of a page. It polices the wire and nothing else.
- **P10** Testing precedes prose: nothing is normative until two parties have run it.

P9 is session 73's own conclusion and wants Venkat's wording. Whether P10 is doctrine
or process is a question for the inventory. The test for admission: **appealed to in
two or more chapters.** A candidate that fails it is a note.

## 8. What keeps the substance unchanged

- **The clause map** ([`book/clause-map.md`](book/clause-map.md)). The conformance
  toolkit's clause register extracts every normative sentence. Acceptance: every
  clause in the 0.4 register maps to exactly one rule in the book, same keyword and
  same subject, and the book has no rule in Parts II to VII that maps to nothing.
  **Merges and splits are allowed and listed**: where 0.4 states a rule twice, both
  clauses map to one rule; where one 0.4 sentence holds two requirements, it maps to
  two. Checked in CI once Opus has rebuilt the register.
- **0.4's requirements without a keyword stay without one.** The first sitting found
  whole passages (withdrawal, above all) that state requirements as fact. The book
  carries them as definitions, with the force they had, and lists each in
  [`book/findings.md`](book/findings.md) for a ruling. Promoting them silently would
  be a change the clause map cannot see.
- **The fixtures do not change.** Reader suite, feed order, the Alloy model: all pass
  untouched.
- **Why principles are not normative** (assumption A). A principle stated generally
  covers cases its local rules did not. Made binding, it would change the protocol
  under the name of tidying, and the clause map could not see it. So a principle never
  becomes the only statement of a rule.
- **A rule found wrong or unclear is not fixed in the book.** It is written down as a
  finding, ruled separately, and lands in 0.4 as a revision first; the book then
  carries it.
- **Examples are tested.** Every example document in the book is a file the
  conformance suite validates, so the book cannot show something the protocol refuses.

## 9. How it lands, and the risk in the meantime

**Section numbers are load-bearing**: 73 files in the studio's source cite them, the
clause ids are built from them, and so are the locked decisions, the notes, the RFCs
and public issues. So the book cannot be a revision of 0.4. It is a new document at a
version boundary, and 0.5 is the one coming.

**The existing rule on opening a version stands** (#21, #43; `fable-brief.md`
sequencing notes): 0.5 opens when the first Level 3 construct is built and exercised,
not when its design is ruled. Under assumption D:

1. The book is written as a **manuscript** (`docs/book/`, one file per chapter), not as
   `protocol-v0.5.md`. Parts I to VII carry 0.4's substance. Part VIII is written from
   RFC-6 after its close on 2026-11-28 and is labelled ruled, not yet normative.
2. The manuscript goes to implementers for comment.
3. When the first Level 3 construct has been exercised, the manuscript becomes the 0.5
   document, 0.4 freezes with its numbers intact, and Annex D maps one to the other.

**The risk is drift.** 0.4 has taken sixteen revisions in five weeks and will take
more while the manuscript is written. Every one must be applied to both texts. The
rule: **a 0.4 revision and its manuscript counterpart are made in the same sitting**,
and the clause map is rerun. If the Level 3 build runs long, the window in which two
texts must agree runs long with it. The alternative is for Venkat to rule that a
restructure may open a version on its own, so the book replaces 0.4 as soon as its
comment period closes. That is question D, and it is his.

## 10. The work, in order

**Before any chapter (Opus, in parallel with the first Fable sitting):**

- Rebuild the clause register against the current text. ROADMAP row 122's follow-ups
  (fixtures still carrying `ambiguous`, the register not rebuilt since #102) come
  first: the baseline has to be current to be a baseline.
- Report what the site builder (`sync_spec.py`, the snapshot and diff pages) reads from
  the document's structure, before any heading moves.

**Before the baseline is cut (Fable, on Venkat's go):** queue items 30 and 32, so that
0.4's seventeenth revision (§8.4's page advice lowered to description) is in the text
the book is measured against.

**First sitting — no rule is rewritten.** Its products are what Venkat reviews before
the bulk begins:

1. **The inventory of reasons.** Every reason in §2 to §15, classified: principle
   (appealed to in two or more places), note (one-off), record (history), rejected
   design (technical note), reference-client aside (studio style). The doctrine in
   section 7 is revised from it.
2. **The disposition table.** Every 0.4 section and every clause in the register, with
   its destination chapter and its new id.
3. **The editorial sheet.** Voice, tense, person; how a rule sentence is built; the
   controlled vocabulary, reconciled with the glossary on blygger.org; what a note may
   contain; how examples are set.
4. **The cast.** The running example: a small set of blygs and items that can carry
   every construct through Part VIII (publish, revise, pin, quote, respond, fork,
   withdraw, move, seal).
5. **One sample chapter, written in full: Pins and Withdrawal.** Small (about 1,100
   words today), self-contained, and it exercises the principle on withheld history. It
   is the proof of the template, read by Venkat as a reader and not as a reviewer of
   rules.

**Then, on his word:**

6. **Part I**, the doctrine, in full. It is the part most unlike what exists and the
   one the rest leans on.
7. **Parts II to VII**, a part to a sitting or two, in order. Each sitting ends with
   the clause map for the chapters it touched.
8. **Part VIII**, after RFC-6 closes and is promoted, from its ruled text.
9. **Annexes**, the glossary, the index, the front matter and its reading paths (an
   implementer of a publisher; of a reader; an agent answering one question).
10. **A read-through** of the whole for voice and vocabulary, start to finish in one
    sitting, changing no rule.
11. **The draft for comment**, with the section map, to implementers by name: Soapbox,
    the conformance toolkit, the API stack.

## 11. Acceptance

The book is done when all of these hold.

1. The clause map is total in both directions for Parts II to VII (section 8).
2. Every fixture passes untouched.
3. Part I contains no requirement keyword. Parts II to VIII contain no date, no
   decision number, no client's name, and no reason longer than a note.
4. Every reason in the inventory has a destination, and every principle is cited by
   rules in at least two chapters.
5. Every chapter follows the template and states what it depends on.
6. Every example validates in the conformance suite.
7. **The reader test.** Venkat reads Part I and one chapter straight through and would
   put his name on them.
8. **The agent test.** A fresh agent given Parts I and II and one chapter, and nothing
   else, answers a set of implementation questions drawn from the reader suite as well
   as one given the whole of 0.4. Opus builds the question set.
9. Implementers have had their comment period, and what they found is answered.

## 12. Not in scope

- Any change to a rule (section 8).
- The reference client's style (queue item 31), which receives what leaves the text.
- RFC-7's content, which is a note.
- Renumbering or editing 0.4 or 0.3. Both stay citable as they are.
- The print edition itself. The text is written so that one is possible.
