# Pending calls — items waiting on Venkat, with recommendations

**Reviewed by Opus 5.5 the same session**, after the switch: two items done, one stale, one
recommendation disputed (item 8). Opus notes are marked *Opus:*.
**Written:** session 38 (2026-10-06), by Fable 5.1, at Venkat's request, after the
conformance round (decisions #59–#64). Each item is one that nobody else can close: a
design intent, a scope decision, or a timing call. Each carries a recommendation and the
one thing needed from Venkat. Delete an item once it is decided; record the decision in
the usual place (`CLAUDE.md` decisions, `fable-round-queue.md`, or a carry-over) and note
here only if the recommendation was reversed, so the reasoning is not lost.

## A. Decide now — cheap, and someone is waiting

1. **Fork intents** (`fable-round-queue.md` item 9; Aneesh Sathe's findings F8 and F9).
   *Recommendation:* yes to both. A fork's page SHOULD show its lineage — that is what
   lineage is for, and four of five live forks already do. One hop per fork is the chain
   that was meant: each fork vouches for its own pin only, and a reader walks back a hop
   at a time. No wire change; a SHOULD and a sentence of intent in §5.6, a revision by
   #43. *Needed:* "yes", and the round that records it (Fable, since it is the author's
   intent being written down).
2. ~~**Glass Bead Game**~~ **Done session 38:** declined with the working pattern, reply
   posted in Venkat's voice, parked in `backlog.md` §1 with its trigger. Original entry kept:
   (`fable-round-queue.md` item 12; blygger-spec#12, msmsim,
   2026-10-04, unanswered). *Recommendation:* decline the protocol change, warmly, with
   the pattern that already works. Both halves fail tests already made: multiple parents
   reopen #27's single-target shape, and a `game_of` field is the extension bag
   blygger-spec#10 refused. Everything described is buildable today — stubs for moves, a
   house blyg publishing the brief, players' moves as stubs of the brief or of the prior
   move, transclusion for synthesis, a blogroll of players as the roster, curation display
   (§13.5) for the finished game. *Needed:* approval to post that reply in Venkat's voice;
   or a word if the Protocol Institute wants to host one, which changes the register of
   the reply but not the ruling.
3. ~~**Tell Aneesh his blocking findings were ruled**~~ **Done session 38** (posted on #11,
   naming studio 0.32.2 as the fix for F1/F4). Original entry: (blygger-spec#11). F1, F4, F6, F7 and
   F18 → decisions #60–#63; grammar case 24 is unambiguous (instruction = source, output =
   quote); items 6–14 of his report remain queued and are not blocked on him. Opus brief
   item f. *Recommendation:* post today; the report was written for exactly this loop.
   *Needed:* nothing but a go.

## B. Design calls — a short think each

4. **`ignyr` directive** (`fable-round-queue.md` item 13; Venkat's idea, session 34).
   *Recommendation:* yes, as an OPTIONAL boolean on the changelog entry, not a word in the
   note. A note is prose readers read and the source of the feed `<title>` (§7); a
   control token inside it puts grammar on the wire, which #20 forbids. A boolean beside
   `generated` is ignorable under §13.1 and a revision by #43. A consumer that ignores it
   does nothing, which is correct. *The one question only Venkat can answer:* whether a
   maintenance agent's refresh republishes carry it by default — recommended yes, since
   refreshes are the flood the flag exists for. *Needed:* the name (`ignyr` is the
   working spelling; `minor` says what it means), and the default for agents.
5. **Public hoppers in `blyg.json`** (`fable-round-queue.md` item 14). *Recommendation:*
   hold. It would be the first machine-discoverable hopper, and #12 drew the line at
   display. A list of links is harmless, but nothing asks for it yet — no second client,
   and the blygger.com directory has not requested it. Reopen when something does.
   *Needed:* agreement to park it with that trigger in `backlog.md`.
6. **Password reset and the recovery anchor** (carry-over, session 36). *Recommendation:*
   a recovery code shown once at setup, stored by the operator in `.env.keys` per the key
   policy, with the Cloudflare secret as the last resort it already is. Change-password
   through the login page writes a D1-held hash and re-keys the session HMAC and OAuth
   credential cache (the mechanics Opus recorded). No email path for a single-owner
   tool; passkeys as the second phase. *Needed:* yes/no on the recovery-code anchor.
   *Opus:* agree, with a sizing note — the D1-held hash, HMAC re-keying and OAuth cache
   invalidation are a full session, not a patch. The anchor decision is cheap; the build is not.
7. **Studio extension mechanism for UI experiments** (carry-over, session 36; Aneesh's
   #35 is the first candidate). *Recommendation:* decide the surface before more is
   built against the absence of one. Cheapest honest shape: a documented set of read-only
   `/api` endpoints (`GET /api/lineage` belongs there), a theme slot and a script slot,
   under one rule — an extension never changes the item document, the feed, or anything
   §13.5 calls re-emission. That keeps "the studio is boring" without refusing
   experiments. *Needed:* agreement on the rule; Opus can draft the surface from it.

## C. Timing calls

8. **Gate G8 — remote generation sources** (`v0.4-plan.md` §7.2, R1–R8; deferred since
   session 32). *Recommendation:* schedule it right after the §15.4 security fix ships.
   It is the build that opens the 0.4 document, nothing in the queue blocks it, and the
   Soapbox reader side (M1–M4) is small enough to run beside it. *Needed:* a date, or
"next".
   *Opus — disputed on order:* do **G9's reader side (M1–M4) before G8**. Robert Peake is
   building Soapbox now and was promised our reader side "now" on 2026-10-06; M1–M4 is
   smaller than R1–R8 and has an outside party waiting, and #61 has since added a
   verification step to M3. G8 has no one waiting. Both open 0.4 constructs, so the 0.4
   document opens on whichever exercises first; neither order wastes work.
9. **Merge blygger-spec#11** (the conformance toolkit). *Opus — stale premise:* Aneesh
   made all three review changes the same day (98af8da, 2026-10-04 23:47Z), so nothing waits
   on him. What remains is Venkat's own promised `intents.json` correction pass, then the
   merge. Original text: waiting on Aneesh's reply to the
   review posted 2026-10-04. *Recommendation:* if no reply within a week of that review,
   merge with your own edits — the toolkit found four real studio bugs and two spec
   contradictions in one pass, and blygger-com#1 is queued behind it. *Needed:* the
   `intents.json` pass (it is Venkat's reading of his own words, so only he can do it).
10. **AI spend budget prototype** (carry-over, session 36; branch `proto/ai-integrations`,
    migration renumbered to 0025). *Recommendation:* keep parked until the session-36/37
    merges settle, as already decided; the interim 200-call cap is holding. *Needed:*
    nothing now.

## D. Small and stale

11. **The unpublished blyg draft summarising session 37** on venkateshrao
    (`4557xemndwty74r06etwt6rdtx`) — edit and publish, or discard.
12. **Kyle's `models/d1-polling-cache/logs/`** (TLA+ and docker logs) in the studio repo
    — harmless; trim whenever.
13. **Quoted lists lose their bullets and the faithfulness check ignores list markers**
    (session 37 open thread) — leave it until someone quotes a list and minds.
