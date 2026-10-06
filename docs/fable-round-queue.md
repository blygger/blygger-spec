# Fable round queue — what is waiting on a ruling

**Written:** session 34 (2026-10-04), by Opus 5.5, at Venkat's request, after triaging
blygger-spec#11 (Aneesh Sathe's conformance toolkit and first-round report) and #12.
**Read with** [`fable-brief.md`](fable-brief.md), which stays the standing agenda; this file
is the itemised queue for the next round. Delete an item once it is ruled; delete the file
when it is empty.

Each item says what it blocks, why it is Fable's under the four-question test (#58), and
where the evidence is. "Report F*n*" is finding *n* of
`conformance/reports/2026-10-03-first-round.html` in blygger-spec#11 (not merged as of
writing; read it on the PR branch).

## A. Blocking — rule these first

1. **§9.2 versus decision #20: an own-line `![[id]]` left in TK output.**
   Blocks: blygger-studio#5 (reopened) and report F18's grammar case, which stays marked
   ambiguous. Venkat provisionally took §9.2 in studio 0.20.1 (it transcludes at publish);
   #20 says every `![[id]]` in a scope is a source, never a blockquote. Fable's because it is
   a conflict between a locked decision and a later plan note. Either amend #20's text or
   reverse 0.20.1. Evidence: session 33 Opus devlog, open threads.
2. **§15.4: two blygs path-mounted on one host can verify mentions in each other's name.**
   Report F1, Alloy checks 7/7c. Step 2 compares scheme, host and port only, so
   `example.com/alice/` passes as `example.com/carol/`. Decision #14 makes path mounts
   first-class and #36's group shape is exactly this case. Blocks: `tn-3` (groups), which
   the Opus queue says is writable now. Fable's because it is verification semantics.
   The report's proposed fix, confirmed in its model: the source URL must sit inside the
   claimed origin's full base URL.
3. **A pinned copy of a stub keeps verifying after the stub is withdrawn.** Report F4,
   Alloy 7d/7e. The pin file still carries `stub_of`, against §9's "a withdrawn stub stops
   verifying". Proposed fix: verify against the live `items/{id}.json`. Verification
   semantics.
4. **#57 can republish withdrawn, unpinned words under a new id.** Report F6, Alloy 5g(b).
   A pinned thread quotes unpinned C, C is withdrawn, the thread is forked, and the flattened
   quote republishes C's words: the "freeze at the withdrawn version" §10.2 says is
   deliberately not offered. Accept it explicitly, or add a SHOULD to drop or mark such
   quotes. Blocks: the G11 promotion of §16.6f into §5.6, which should carry the answer.
   Fold in studio#29's question while here: should §16.6f say that a forker decides a
   quote's partiality from the pinned `content_html` (`blyg-partial`), as studio 0.21.2 now
   does? Fable's because it touches locked decision #57.
5. **#43's boundary test has a blind spot.** Report F7. #43 asks whether readers must
   change, but a forker re-parses another blyg's `content_md`, so grammar forms travel
   between clients; #49 was classed as a revision on reader grounds. #57 closes it for
   forks of threads, but the test itself should say so. Blocks: nothing built, but #58's
   question 1 is #43's test, so every Opus ruling inherits the gap. Fable's because it
   reinterprets a locked decision.

## B. Needs a ruling, blocks no build

6. **Partial quotes that cannot be re-checked from the moment they are published.** Report
   F2, Alloy 6b/6c, two live cases. A quote baked from a stale import names a version its
   origin no longer serves, so §10.2's "any reader MAY re-check" never applies. Bears on
   the intent "verifies that the quoted bit is actually part of the transcluded item".
7. **Which version the local closure check walks.** Report F3, Alloy 1a′ fails, 1a passes.
   Walking each local thread's current `transclusions[]` lets a thread contain itself;
   walking the versions actually baked is safe. §10.2 does not say which. #26's "snapshots
   are static bytes" may settle it; if so, this could have been Opus's.
8. **The watermark should outlive the stored copy.** Report F5, Alloy 4c. If a reader
   deletes both on withdrawal (§13.4 says it SHOULD delete the copy), a stale cache
   replaying v1 is adopted as the item coming back. Importer behaviour, so Fable's.
9. **Fork intents (Venkat's to state, Fable's to write).** Report F8: nothing requires a
   fork's page to show its lineage; four of five live forks do, Brady Dale's does not.
   Report F9: after #57 a fork's quotes are unverified, so custody runs one fork at a time.
   Is one hop the chain that was meant?
10. **No list of required members for an item document or manifest.** Report F14. The
    schemas had to infer them. Writing one could narrow what conforms, so Fable's.
11. **Grammar ambiguities, each with a test case already written** (report F17): what CRLF
    means in §10.1; whether a line after a partial quote without `>` still belongs to it;
    whether a target quoted twice gets one `transclusions[]` entry or two (§10.3); §10.6
    rule 3 read literally lets `stub_of.version` move backwards (Alloy 8b); whether a local
    draft with the same id falls through to the import (§10.2 step 1; the studio refuses);
    whether `stub_of` may name an RSS-wrapper id (one live stub does).
12. **blygger-spec#12, Glass Bead Game moves** (msmsim, 2026-10-04). Proposes a `game_of`
    field naming a brief, and letting `stub_of` name several parents (or, conservatively,
    treating a move's transclusions as its extra parents). New wire surface, and multiple
    parents reopen locked decision #27's citation shape. Check it against the do-not-open
    list's refusal of a general extension bag (blygger-spec#10). The issue has no reply yet.

13. **A reserved `ignyr` directive in a changelog note** (Venkat, session 34). It would
    tell feed consumers to move that version to a lower-priority queue: the wire half of
    the batching norm the studio's *updates* tab (0.23.0) sets for refreshing stale
    quotes. A refresh republish, or a batch of them, could carry it so readers are not
    flooded with trivial versions. A new reader-visible construct, so Fable's. Questions
    to settle: where it lives (changelog text versus a field), what a consumer that
    ignores it does (nothing, by §13.1), and whether a future maintenance agent's
    refreshes carry it by default.

14. **Listing public hoppers in `blyg.json`** (session 34). Studio 0.24.0 lists public
    hoppers under *Collections* on the homepage and archive, so people can find them;
    other blygs and the blygger.com directory still cannot. A manifest key naming
    each public hopper's page would let them. It adds a key readers see, so it is
    Fable's under #58. Weigh it against decision #12 (hoppers are curation display,
    never re-emitted on the feed): a list of links is not a re-emission, but it is
    the first time a hopper would be discoverable by machine.

## C. Review after the fact (#58 batch)

- **Two gate promotions, Opus 5.5, session 37 (2026-10-06): the seventh revision of
  `protocol-v0.3.md`.** G6: §16.6c → §5.2 (`changelog[].generated`, #40). G10: §16.1a →
  §10.6 (`cited` on a `{url}` stub, #55), with §5.9's list of sites and §10.2's
  "plain-web target gets nothing" sentence updated. Both §16 numbers are now pointers
  recording the build's calls: notes are marked generated only when published
  unchanged, and `excerpt` is the entry title. The text is not yet published to
  blygger.org. Check the wording, especially "absent means only 'not stated'" and
  "MUST NOT gate on it", which carry #40's text over unchanged.
- **No decision carries the `Fable review pending` label yet**, so #58's ruling half is
  still untested.
- **Session 34's studio fixes made four calls a reviewer may want to confirm.** None
  changes the wire or a reader. Details are in the 0.21.2 changelog.
  - studio#27 drops the v0.2 plan's "and the trigger set was non-empty" from the gap
    check, following §13.2's text.
  - studio#28 matches stub version agreement on origin as well as id. The old comment
    cited #26 for id-only matching.
  - studio#29 reads partiality from `blyg-partial`; see item 4.
  - studio#30 cites a remote pin's page when the origin serves one, else the JSON (§8.4).
- **Studio 0.27.0 styles `blyg-tk-gen`, which §5.7 says the reference client does not**
  (session 35, at Venkat's request). §5.7's last paragraph says the reference client
  "deliberately leaves it unstyled, because a visible tint would present self-asserted
  provenance as a verified authorship badge." 0.27.0 adds an opt-in tint, a robot
  badge (Brady Dale's convention) and an info box drawn from `generated[]`. It is off by
  default, overridable per post, and the box says "the author marked this … Self-reported,
  not verified." Presentation is the client's call (session 20), so nothing on the wire
  changes. But the 0.3 text now describes the reference client wrongly, and the rationale
  it gives is the one this design had to answer. Rule whether the next protocol document
  drops that sentence, keeps it as a caution, or turns the "not verified" wording into
  guidance for any client that styles the class.
- **Gate promotions G6, G10 and G11 are Opus's under #58** and arrive here for review once
  done. G6 and G10 are exercised and ready to promote. G11 should wait for item 4.

## Not for Fable

- Report F11, F12, F13 (adding keywords to existing rules), F15 and F16 are clerical spec
  fixes that Opus can do under #58. They are §8.1 cited three times and missing, modal
  strength mismatches, keyword-less rule sentences, undefined terms, and one-sided decision
  records.
- Report F10 (Webmention reach: 8 of 19 live blygs advertise an endpoint) works as
  specified. It is a registry or adoption question.
- Merging blygger-spec#11 waits on Aneesh's reply to the review posted 2026-10-04.

## Optional

- **Unicode on the wire** (blygger-spec#6), the standing question in the brief. Take it
  deliberately or when a cross-client hash disagreement appears.
