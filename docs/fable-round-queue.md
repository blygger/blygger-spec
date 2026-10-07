# Fable round queue — what is waiting on a ruling

**Written:** session 34 (2026-10-04), by Opus 5.5, at Venkat's request, after triaging
blygger-spec#11 (Aneesh Sathe's conformance toolkit and first-round report) and #12.
**Pruned:** session 38 (2026-10-06), Fable 5.1 — items 1–5 and 15 ruled (decisions
#59–#64, reasoning `v0.4-plan.md` §10), the seventh revision reviewed, the 0.27.0 styling
question ruled (#59). Numbers are kept so earlier references resolve.
**Read with** [`fable-brief.md`](fable-brief.md), which stays the standing agenda; this file
is the itemised queue for the next round. Delete an item once it is ruled; delete the file
when it is empty.

Each item says what it blocks, why it is Fable's under the four-question test (#58), and
where the evidence is. "Report F*n*" is finding *n* of
`conformance/reports/2026-10-03-first-round.html` in blygger-spec#11 (not merged as of
writing; read it on the PR branch — `gh api` with the URL quoted, zsh globs the `?`).

## A. Blocking — none

Items 1–5 were ruled in session 38: #60 (§9.2 vs #20), #61 (path-mounted verification
and withdrawn stubs, one test), #62 (#57 against F6, partiality from the bake), #63
(#43's third party). G11's promotion is unblocked.

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
9. *Decided session 38: Venkat said yes to both; Opus wrote it as decision #65 (§5.6 rules 7–8,
   ninth revision), Fable review pending — see section C.*
10. **No list of required members for an item document or manifest.** Report F14. The
    schemas had to infer them. Writing one could narrow what conforms, so Fable's.
11. **Grammar ambiguities, each with a test case already written** (report F17): what CRLF
    means in §10.1; whether a line after a partial quote without `>` still belongs to it;
    whether a target quoted twice gets one `transclusions[]` entry or two (§10.3); §10.6
    rule 3 read literally lets `stub_of.version` move backwards (Alloy 8b); whether a local
    draft with the same id falls through to the import (§10.2 step 1; the studio refuses);
    whether `stub_of` may name an RSS-wrapper id (one live stub does).
12. *Decided session 38 by Venkat on the `pending-calls.md` recommendation: declined, with the
    working pattern; reply posted on blygger-spec#12; parked in `backlog.md` §1.*

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

## B2. RFC drafts to edit before publishing (Venkat, session 40)

Venkat's route for conventions other clients will copy: Opus drafts, then Fable edits.
The edited draft is published for a comment period on the official blyg at
`blyg.blygger.org` (decision #66). Only after that does any client build it, because
the reference client shipping a convention reads as a blessing. Drafts live in
`docs/rfcs/`, **not** `docs/notes/`: `sync_spec.py` publishes every
`docs/notes/tn-*.md` on the next blygger.org deploy. The official blyg is not built
yet.

16. **RFC-1 — mentions across identifier schemes**
    ([`rfcs/rfc-1-mentions-and-identifier-schemes.md`](rfcs/rfc-1-mentions-and-identifier-schemes.md)).
    It covers multi-author bylines and an address book of petnames. The full identifiers
    travel as an h-card in `content_html`, built from the web, ActivityPub, ATProto,
    DID and Ethereum schemes. Edit freely. Section 10 holds five questions:
    - Q1: the sequencing route;
    - Q2: may a mention send a plain Webmention, given §16.8 and #32?
    - Q3: `rel="me"` versus an acknowledgement on group origins;
    - Q4: whether the spec should say anything about preserving microformats;
    - Q5: `ids` as a member of `author`.

    Q2 and Q3 touch identity semantics, so they are Fable's under #58.
17. **RFC-2 — client comments sections**
    ([`rfcs/rfc-2-comments-sections.md`](rfcs/rfc-2-comments-sections.md)). It is a
    Recommendation for clients that want comments; the studio will not build it. It
    depends on RFC-1. Its questions are in its last section.
18. **The official blyg, decision #66** (Venkat, session 40). Venkat has decided:
    `blyg.blygger.org` carries RFCs, releases (third-party clients' included),
    ported technical notes and any other fitting content. The spec and static pages
    stay on blygger.org. For Fable:
    - (a) Confirm that #15's refusal covers only normative text, not non-normative
      records or invitations to respond.
    - (b) Bylines. Most notes and RFCs are written by Opus or Fable. Should those
      items carry #38's agent byline (the model as author, Venkat as `operator`) and a
      whole-item `generated[]` span? The official blyg is where the project models its
      own practice, and a human byline on machine-written text is the undisclosed
      generation that §5.7 exists to prevent.
    - (c) Does porting a technical note change its status? The spec cites
      `blygger.org/notes/`. Recommendation: the git file stays the source, the
      `/notes/tn-N/` URL keeps resolving (as a redirect or a stub page), and later
      revisions become new versions of the item.

## C. Review after the fact (#58 batch)

- **Session 34's studio fixes made four calls a reviewer may want to confirm.** None
  changes the wire or a reader. Details are in the 0.21.2 changelog. Two were taken up in
  session 38 (#29 → decision #62; #30 is consistent with §8.4); the other two stand on
  the text they cite.
  - studio#27 drops the v0.2 plan's "and the trigger set was non-empty" from the gap
    check, following §13.2's text.
  - studio#28 matches stub version agreement on origin as well as id. The old comment
    cited #26 for id-only matching.
- **Decision #65** (Opus, session 38): fork intents, §5.6 rules 7–8, ninth revision. Check
  rule 8's wording — the first explicit statement that verification does not compose across
  forks.
- **G11 promotion** (Opus, session 39): eleventh revision, §16.6f → §5.6 rule 6. Builds' calls
  to check: links are matched to the bake's anchors by href, so a target with its own `page`
  sends the fork down the whole-HTML rebuild; the parenthesis on forking a quoted fragment
  moved ahead of the list (a trailing paragraph broke blygger.org's renderer).

## Not for Fable

- Report F11, F12, F15 and F16 were **done session 38** (Opus): the spec's tenth revision
  plus back-references on decisions #9, #14, #43 and a corrected section number in #22.
  **F13 is partly done:** the two rules it named as stated only in prose gained their MUST.
  The other ~56 keyword-less sentences need Aneesh's full list (`conformance/clauses/out/
  analysis.json`, gitignored; run `clauses/analyze.py` on the PR branch) and a pass that
  separates restatements from sole statements. Opus's, once #11 is merged.
- Report F10 (Webmention reach: 8 of 19 live blygs advertise an endpoint) works as
  specified. It is a registry or adoption question.
- Merging blygger-spec#11: Aneesh made all three review changes on 2026-10-04 (98af8da). It waits only on Venkat's `intents.json` correction pass.

## Optional

- **Unicode on the wire** (blygger-spec#6), the standing question in the brief. Take it
  deliberately or when a cross-client hash disagreement appears.
