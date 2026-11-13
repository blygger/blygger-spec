# Fable round queue — what is waiting on a ruling

**Written:** session 34 (2026-10-04), by Opus 5.5, at Venkat's request, after triaging
blygger-spec#11 (Aneesh Sathe's conformance toolkit and first-round report) and #12.
**Pruned:** session 38 (2026-10-06), Fable 5.1 — items 1–5 and 15 ruled (decisions
#59–#64, reasoning `v0.4-plan.md` §10), the seventh revision reviewed, the 0.27.0 styling
question ruled (#59). Numbers are kept so earlier references resolve.
**Added to:** session 48 (2026-10-13), Opus 5.5, at Venkat's request before a Fable round:
items 17–21, the roadmap rows marked *needs ruling* that are Fable's under #58, and decision
#69 in section C. Venkat asked for 17 by name and is holding its build for the ruling.
**Pruned:** session 49 (2026-10-17), Fable 5.1 — items 17, 19 and 21 ruled (decision #70,
the label; tangling no construct; item 21 confirmed as prompt-plus-strip, Opus builds);
section C's three entries reviewed and confirmed (#65, the G11 promotion, #69); the 0.4
document opened (#72). Items 18, 20 and 22 deliberately left for the next round.
**Pruned again:** session 49, second round (2026-10-17), Fable 5.1 — items 6–8, 10–11, 13,
15–16, 18 and 20 ruled (decisions #73–#77, reasoning `v0.4-plan.md` §12, text in the 0.4
second revision). **Only item 22 remains**, and Venkat is thinking about it before it is taken.
**Added to:** 2026-10-22 — item 14 unparked with per-hopper feeds (Aneesh Sathe; proposal PR). **Pruned:** session 56 (2026-11-01), Fable 5.1 — item 14 ruled (#86). Only item 22 remains.
**Added to:** session 57 (2026-11-01), Opus 5.5, at Venkat's request: item 24 (the reader suite's nine open choices, blygger-spec#22) and a section-C entry (studio#106's directive-ends-quote reading).
**Pruned:** session 58 (2026-11-03), Fable 5.1 — item 22 ruled (#89, the studio mods mechanism; reasoning `v0.4-plan.md` §17.1), section C's three entries confirmed and written as the ninth revision.
**Added to:** session 59 (2026-11-04), Opus 5.5: items 25 (private items' numbering) and 26 (RFC-5).
**Pruned:** session 60 (2026-11-05), Fable 5.1 — items 25 and 26 ruled (#94, #93; reasoning `v0.4-plan.md` §18). **Only item 24 remains.**
**Added to:** session 63 (2026-11-09), Opus 5.5, at Venkat's request: item 27 (`syndication`, blygger-spec#30).
**Pruned:** session 64 (2026-11-09), Fable 5.2 — item 27 ruled (#98; reasoning `v0.4-plan.md` §19.2). **Only item 24 remains.**
**Added to:** session 65 (2026-11-12), Opus 5.5, at Venkat's request: item 28 (the Level 3 design round; research R1–R7 written).
**Pruned:** session 66 (2026-11-12), Fable 5.2 — item 28 taken (#101; plan `v0.5-plan.md`); #100 ruled in passing (kind is fixed). **Only item 24 remains.**
**Pruned:** session 67 (2026-11-12), Fable 5.2 — item 24 ruled (#102; reasoning `v0.4-plan.md` §21). **The queue is empty.** The file is kept because other documents cite its item numbers.
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

Items 6–8, 10–11, 13, 15–21 are ruled; numbers kept so references resolve.

6. *Ruled session 49 (#76): the re-check window closes when the origin stops serving the version; the promised check is the publisher's at publish. 0.4 §10.2.*
7. *Ruled session 49 (#76): the closure walks the baked versions. 0.4 §10.2.*
8. *Ruled session 49 (#76): the watermark survives withdrawal; the endcap is the highest version. 0.4 §13.4.*
9. *Decided session 38; #65, confirmed session 49.*
10. *Ruled session 49 (#76): member tables in §5 and §6.1, measured against all 22 live blygs.*
11. *Ruled session 49 (#76): LF or CRLF; CommonMark blockquote extent; one entry per directive; monotonic `stub_of.version`; local ids never fall through; no `stub_of` on an L0 wrapper id.*
12. *Declined session 38.*
13. *Ruled session 49 (#77): no wire member — a same-hash republish is maintenance (§13.2); `ignyr` is the studio's queue name; agent refreshes land there by construction.*
14. *Ruled session 56 (#86): hopper feeds and the `hoppers` key, a ruled shape in 0.4 §16.12; blygger-spec#18 merged and reshaped, studio#84 reviewed against it by Opus.*
15. *Ruled session 49 (#73): RFC-3 with reference constants; `pinned_at` a ruled shape in §16.9.*
16. *Ruled session 49 (#73): a pin MAY re-send its mentions (§15.2).*
17. *Ruled session 49 (#70).*
18. *Ruled session 49 (#75): Pandoc attribute form, `width`/`height` only; §16.10.*
19. *Ruled session 49 with 17 (#70).*
20. *Ruled session 49 (#74): `cid` names the pinned document's bytes; §16.9.*
21. *Confirmed session 49.*
22. *Ruled session 58 (#89): the studio mods mechanism — three surfaces, a hook bar, no program-hosted registry now, principles in `blygger-studio/docs/mods.md`; blykker released. Plan `v0.4-plan.md` §17.1.*
24. *Ruled session 67 (#102): the nine choices and #23's sixteen sole statements, all revisions; text in the 0.4 fourteenth revision, reasoning and the session-64 measurements in `v0.4-plan.md` §21.*
25. *Ruled session 60 (#94): a private item's first public version is v1; private history is studio history, the two counters never meet. Plan `v0.4-plan.md` §18.5.*
27. *Ruled session 64 (#98): `syndication` opens as an OPTIONAL item member, written in place like the pin flag and never worth a version; no specified fold; `https:` only; endcaps and pinned files omit it. A ruled shape in 0.4 §16.14 awaiting its gate. Plan `v0.4-plan.md` §19.2.*

26. *Ruled session 60 (#93): RFC-5's F1–F5 — F1 and F5 as sentences in 0.4 §4 and §14 (tenth revision), F2 and F3 no text, F4 with the gate shapes C1–C3 classified; RFC-5 edited and published for comment to 2026-12-03. Reasoning RFC-5 §10, plan §18.4.*

28. *Taken session 66 (#101): Level 3's first feature is sealed content with locks and grants, a design direction that goes to RFC-6 (Opus drafts from `v0.5-plan.md`, Fable edits and rules); payments follow as RFC-7. Research reviewed; R8 not run.*

## C. Review after the fact (#58 batch)

Session 58 (2026-11-03, Fable 5.1) reviewed and confirmed the three entries session 57 queued — studio#106's reading, the tangling plan's two wording fixes, the §16.12 promotion — and wrote them as the ninth revision (§10.1, §13.7, §13.2); `v0.4-plan.md` §17.2. Nothing pending.

Before session 57: nothing pending. Session 49 reviewed and confirmed #65 (§5.6 rules 7–8), the G11
promotion (§5.6 rule 6) and #69 (static front page; citation corrected to §8.4 rule 3,
sentence added to the 0.4 text) — `v0.4-plan.md` §11.1. Session 34's four studio calls
stand as noted in session 38.

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

23. *Reassigned to Opus by Venkat, session 50 (2026-10-19): Opus drafts RFC-4, responding
    from anywhere (#82), from spec §16.11 and plan §14.4; Fable edits and rules it before
    it publishes, as RFC-3. Fable's part is the gate in `fable-brief.md`.*
