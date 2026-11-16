# Findings

Things the rewrite turned up about the 0.4 text. **Nothing here is changed in the
book.** Each is for a ruling; a ruling lands in 0.4 as a revision first, and the book
then carries it (`../spec-refactor-plan.md` §8).

Status: `open` until ruled.

## From Pins and Withdrawal (session 73)

| # | Finding | Where | Status |
|---|---|---|---|
| F-1 | **"No route ever serves an unpinned older version, in any representation" has no keyword.** It is the most general statement of withholding and the clause register cannot see it. The 404 rule for pinned documents (C-4-10) covers JSON at one address only. Candidate: a MUST NOT on the publisher. | §8.4, first sentence | open |
| F-2 | **Withdrawal is almost entirely keyword-less.** "Withdrawing is the only exit", "there is no delete", "withdrawal is reversible", "withdrawal does not cascade, in either direction", and the endcap's whole shape (`kind`, empty content, empty `media`, empty `transclusions`, kept `page` and `forked_from`) are stated as fact. Two clauses carry the chapter. Candidates: the endcap's shape as MUSTs on the publisher; "does not cascade" stays description, since it follows from other rules. | §9 | open |
| F-3 | **A pinned document has no member table.** §8 gives an example and prose. Which members are required is not said (`origin`? `author`? `at` and `note` at the top level, where an item document has them only in `changelog`). §5 and §6.1 gained tables in an earlier revision; this is the same gap. | §8 | open |
| F-4 | **The conditions on a pinned version's page have no keyword.** "Gated exactly like the JSON file" and "the page's content is that version's publish-time `content_html`, verbatim" read as requirements on a publisher that serves such pages. | §8.4 rules 1, 2 | open |
| F-5 | **Nothing says outright that pinning creates no version.** It follows from "incremented by exactly 1 per publish event" and "pinning emits no feed event", and the book says it as a definition. Whether pinning changes the item document's `updated` is not said either. | §5.2, §7 | open |
| F-6 | **"Pinning emits no feed event" and "a withdrawn item contributes exactly one entry" are split in force**: the first has no keyword, the second has one for its second half only. Noted for the Feed chapter. | §7 | open |
| F-7 | **Whether an endcap carries `author` is not said.** It "keeps the REQUIRED members", and `author` is optional. The book's example omits it and the chapter says nothing. | §9, §5 | open |
| F-8 | **One 0.4 sentence, two requirements** (C-4-10: 404 unless pinned, 200 permanently once pinned). The book states them as two rules. No ruling needed; noted because the clause map splits a clause. | §4 | no action |

## Standing observations

- **Rules stated twice in 0.4** are merged in the book and marked in the clause map.
  So far: the pinned document's 200 (§4 and §8 rule 1).
- **The committed clause register is behind the text** (221 clauses on 2026-11-01; 272
  now). Opus's to rebuild.
