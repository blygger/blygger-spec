# The inventory of reasons, and the doctrine drawn from it

First sitting, session 73 (2026-11-16), Fable 5.2. Source: `protocol-v0.4.md` §1 to
§15 at its seventeenth revision, read in full. Method: every place the text gives a
reason for a rule was noted and sorted into one of five bins, by the rule Venkat set:

| Bin | Test | Goes to |
|---|---|---|
| **Principle** | the same reason is appealed to in two or more chapters of the new outline | Part I, explained once |
| **Note** | a reason used once | *Notes* under its rule |
| **Record** | when, by which decision, proven by which deployment | the history page |
| **Rejected design** | what was considered and refused | a technical note |
| **Client aside** | what the reference client does | its studio style |

This file is the working record. It is not part of the book.

## 1. Reasons that recur: the candidate doctrine

Seventeen survive the test. They fall into four families, which is a possible shape
for Part I. "Appealed to in" lists the 0.4 sections where I noted the reason on one full
reading; "Chapters" is how many chapters of the new outline those sections fall in. Both
are to be rechecked as each chapter is written, and a principle that turns out to be
cited from fewer than two chapters goes back to being a note.

### A. What the protocol is

| # | Principle | In a sentence | Appealed to in | Chapters |
|---|---|---|---|---|
| 1 | **Files, not a service** | A blyg is static files; anything that can serve files can publish one, and what is served does not depend on who asks. | §1, §4, §6.1, §15 intro, §15.7 | 5 |
| 2 | **The page, not the studio** | The protocol sees what is published and nothing of how it was made: no tool, no instruction, no authoring grammar, no intelligence, no write surface. | §1 (invariants 1, 3), §5.5, §5.7 (rules 2, 7), §10.1, §10.6 (rule 7), §13.5, §14 | 7 |
| 3 | **Truth in documents, news in the feed** | Item documents and the index are complete and authoritative; the feed only says something changed. | §1, §6.2, §7, §13.1, §13.2 | 4 |

### B. Whom it believes

| # | Principle | In a sentence | Appealed to in | Chapters |
|---|---|---|---|---|
| 4 | **The origin is the only party** | The one thing the protocol authenticates is where bytes were fetched from; everything learned is scoped to that origin. | §1 (invariant 4), §5.1, §5.5, §5.9, §10.3, §12.2, §13.1, §14, §15.4 | 8 |
| 5 | **Everything said is a claim** | Times, authors, provenance, citations, labels and notes are an origin's own word, shown as such and never as verified. | §3.2, §5.2, §5.5, §5.7 (rule 6), §5.9, §6.1, §10.1, §13.3, §13.7, §14 | 9 |
| 6 | **Honest promises** | The protocol promises only what it can deliver, and says where cooperation stands in for enforcement. | §9, §10.2, §13.3, §13.6, §14 | 5 |
| 7 | **Cost is the filter** | A signal worth acting on costs its sender something: a pin costs a hosting promise, a response costs a published item, a false mention costs a public document. | §5.2, §10.6, §13.5, §14, §15.5, §15.6 | 5 |

### C. How writing moves

| # | Principle | In a sentence | Appealed to in | Chapters |
|---|---|---|---|---|
| 8 | **Bake once, carry everything** | A publisher resolves at publish, from what it already holds; the result is self-contained bytes that travel with nothing beside them, and a reader never resolves. | §5.2, §5.7 (rule 8), §7, §10 intro, §10.2, §10.4, §13.5 | 6 |
| 9 | **Withheld unless pinned** | Only an item's latest version is served; history is the publisher's unless a version is pinned, and a pin is the only promise of permanence. | §5.2, §5.6 (rule 2), §7, §8, §8.4, §10.2, §13.4 | 7 |
| 10 | **Each origin answers for itself** | A publisher vouches for what it published and nothing further; nobody's edit, withdrawal, silence or outage reaches into another's page. | §5.6 (rules 2, 8), §9, §10.2, §10.4, §10.6, §15.2, §15.5, §15.7 | 6 |
| 11 | **Reading is private** | Subscribing leaves no trace; what a publisher reads, and who answered it, become public only by a deliberate act of curation. | §1, §11, §13.5, §14, §15.5 | 4 |

### D. How it stays small

| # | Principle | In a sentence | Appealed to in | Chapters |
|---|---|---|---|---|
| 12 | **Derived, never declared** | Whether something matters is worked out by whoever is reading from what the wire already carries; nothing on the wire says "important", "minor", "repost" or "popular". | §5.2, §6.1, §13.2, §13.7, §15.4, §15.5 | 6 |
| 13 | **Ignore what you do not know; add, never change** | A reader skips what it does not understand without rejecting the document; a publisher's old documents stay valid, absence means nothing was stated, and a name once published is permanent. | §3, §3.1, §5.2, §5.3, §5.7 (rule 4), §5.9, §6.1, §7, §10.1, §10.2, §10.3, §10.3a, §13.1 | 9 |
| 14 | **Borrow before inventing** | RSS, OPML, Webmention, URI templates, CommonMark, MathML, the double-bracket convention: where something received will do, it is used unchanged. | §1 (invariant 2), §5.2, §6.1, §7, §10.1, §10.3, §11, §15 intro, §15.3 | 7 |
| 15 | **Never guess, always bounded** | An ambiguity is an error and not a choice; every procedure that touches the network has a fixed order and a limit. | §5.8, §10.1, §10.2, §12 intro, §12.1, §13.5, §14, §15.2, §15.4 | 6 |
| 16 | **A standard library is enough** | A reader can meet every rule with what its language ships; a rule states a property and not an algorithm; correctness is required and quality is advised. | §3, §5.3, §12.2 | 3 |
| 17 | **The page is the client's** | How anything looks is the client's own, except where a rule protects someone other than the page's owner. The protocol holds no opinion where schemes compete: identity, payment, style. | §4, §5.5, §5.7, §7, §8.4, §10.2, §10.5, §13.7 | 7 |

### Candidates that did not become principles

| Candidate | Why not |
|---|---|
| "AI is never in the protocol" (§1 invariant 3) | An instance of 2 and 5 together: the studio is unseen, and "machine-written" is a claim. Part I says so by name, since readers will look for it. |
| "Identity is never in the protocol" (§1 invariant 4) | It is 4 stated negatively, with 17's "no opinion where schemes compete". Named in Part I for the same reason. |
| "Every feed is valid RSS 2.0" (§1 invariant 2) | A rule, and an instance of 14. |
| "Testing precedes prose" (§16 intro, preamble) | True of the project and not of the protocol. It explains how the text is made, so it belongs with version policy, outside the book. **Open with Venkat.** |
| Permanence of names (ids, `blyg.json`, wire tokens, the namespace URI) | Folded into 13 as its publisher half. Could stand alone; four chapters appeal to it. |
| "A network of soapboxes, not a conversation" (§1, §10.6, §16.8) | The image for 10 and 11 together. Part I should use it; it is not a separate principle. |

**The four §1 invariants do not survive as a list.** They are the best-known sentences
in the document, and two of them are negative statements of principles that have a
positive form. Part I should open on them and show where each went.

## 2. Reasons used once: notes

Sampled by chapter, to show the bin is real and what a note looks like. The full list
is made as each chapter is written, since a note's wording depends on its rule.

| 0.4 | Reason | Chapter |
|---|---|---|
| §4 | Managed hosts intercept `.json` and `.xml` paths, so fixed names shut out a class of publishers | The surface |
| §4 | A known manifest filename is what keeps free mounting discoverable | The surface |
| §5.1 | Ids are not content-addressed because editing changes content, not identity | The item document |
| §5.1 | A control character in `content_md` makes the whole feed unparseable | The item document |
| §5.3 | If a fragment could become a thread, a quoting thread would bake in words its author never chose | The item document |
| §5.6 | A copied directive would re-resolve in the forker's context, so the fork would descend from bytes nobody pinned | Forks and lineage |
| §5.7 | Span-level source mapping would be brittle across the author's later edits | Generation provenance |
| §5.8 | A slug is a promise the moment anyone links to it | The item document |
| §5.9 | A frozen label is more faithful to what was cited than a later lookup | The reference |
| §6.1 | Software that would need to say "unmaintained" is the software nobody updates | Manifest and index |
| §7 | Per-version GUIDs make edits resurface in plain RSS readers | The feed |
| §7 | An event the feed omits is content hidden from subscribers | The feed |
| §8 | Pinned documents carry no `media` array and rely on media immutability | Pins |
| §8 | `author` rides outside the pin because the hash covers `content_md` only | Pins |
| §10.1 | No origin spelling in the grammar, so a thread can be moved without rewriting its source | The grammar |
| §10.2 | A selection is defined on text because cutting an HTML range faithfully is a second project | Quotes and links |
| §10.2 | Remote closures are not walked: harmless by snapshot, unknowable in general | Resolution at publish |
| §12.1 | The query is stripped because a manifest's address must anchor relative references | From a URL to a subscription |
| §12.1 | `Content-Type` is not trusted because static hosts misreport it | From a URL to a subscription |
| §13.2 | One word can negate a sentence, so a small edit is queued and never dropped | Reconciliation |
| §13.3 | Without the watermark a rolled-back origin erases its history invisibly | Reconciliation |
| §15.3 | A wildcard DNS zone has unlimited hosts, so a per-host limit does not bound the queue | Mentions |
| §15.3 | 202 is the honest status since verification fetches the network | Mentions |
| §15.4 | A pinned document never verifies a mention, so a withdrawn stub stops verifying with no extra fetch | Mentions |

## 3. Records: to the history page

53 inline "(revision of *date*, decision #*n*)" markers; 31 "new in 0.3/0.4"; every
"promoted from §16.x"; "until this revision the text said…" (six, each a paragraph's
tail); "checked against all 22 live blygs"; the preamble's account of which deployment
exercised which construct. None carries a rule. All are already in §17 or the decision
list, so nothing is lost by deletion.

## 4. Rejected designs: to technical notes

| 0.4 | Design refused | Note |
|---|---|---|
| §5.2 | Semantic versioning, edition markers | TN-1 (exists) |
| §5.3 | A title field | new, or TN-1's neighbour |
| §6.1 | A maintained/unmaintained declaration | with the manifest's rationale |
| §10.2 | "Freeze this quote at the withdrawn version" | new: quotes and withdrawal |
| §10.2 | A cap on a selection's length | same |
| §10.4, §16.5 | Transitive staleness | new, short |
| §11 | Blyg-specific OPML attributes; a protocol "follow" | new: discovery |
| §15.2 | A target built from the permalink convention | with mentions' rationale |
| §15.6 | Plain mentions in the response signal | TN-6's neighbour |

Nine, of which one has a note already. Suggest one new technical note, **"Designs
refused, and why"**, in sections, which the book cites by short name from a chapter's
notes where a reader would otherwise ask "why not".

## 5. Client asides: to the studio style

Thirty mentions of the reference client in §2 to §15. By kind:

- **Conventions it chose** (go to the studio style): the `/blyg/` mount; `f/{id}/` and
  `t/{id}/` permalinks; `h/{slug}/`; `{origin}webmention`; the 1,000-character studio
  cap; `note — excerpt` feed titles; `min(claimed, observed)` ordering; the *ignyr*
  queue; styling `blyg-tk-gen` off by default; starting a stub with a quote of its
  target; grouping rate limits by registrable domain; `$…$` for mathematics.
- **Fallbacks that name its conventions** (stay, reworded without the name): resolution
  step 5's conventional-mount probes; a reader's `f/`, `t/` fallback for a missing
  `page`. These are in rules. They name paths, not a client, and the book calls them
  "the conventional paths".
- **Reports of what it emits** ("the reference client always emits `page`", "emits
  none"): deleted. A fact about one client at one date.

## 6. What the inventory found besides

- **Rules without keywords.** §9 is almost entirely keyword-less ("Withdrawal is
  reversible", "does not cascade", "the item document stays 200 forever") and so is
  §8.4's first sentence ("No route ever serves an unpinned older version"). The clause
  register does not see them. They are carried as definitions (editorial sheet §3) and
  listed in [`findings.md`](findings.md).
- **Rules stated twice.** `items/{id}/v{n}.json` returning 404 unless pinned is in §4
  and in §8 rule 1; a stub's endcap omitting `stub_of` is in §9, §10.6 rule 4 and
  §15.4. The book states each once. The clause map therefore has merges: several 0.4
  clauses pointing at one rule. The acceptance test in the plan is amended to allow
  them, listed.
- **The current register is 272 normative clauses** (139 MUST, 80 SHOULD, 53 MAY),
  extracted to a scratch copy from the seventeenth-revision text. The committed
  register is from 2026-11-01 and says 221. Rebuilding it is Opus's.
