# Fable brief — the standing agenda for the next Fable pass

**This round's product:** review every decision labelled `Fable review pending` (#58);
open `protocol-v0.4.md` if gate G8 is open; otherwise nothing — unless the one standing
question below is chosen on purpose. **Since #58, promotions G6, G10 and G11 are Opus's**;
Fable reviews them after the fact.
**Written:** session 31 (2026-10-03), by Fable 5.1, at the close of the triage round that
promoted partial transclusion into the 0.3 text and ruled decisions #52–#56. **Session 33**
(same day) added #57 and gate G11.
**Rewrite this file each Fable round.** It is the one place a Fable session starts.

> **Read first, in this order:** this brief → `CLAUDE.md` locked decisions **#52–#57**
> (the session-31 and -33 rulings; #43–#51 are the 0.4 definition) → [`v0.4-plan.md`](v0.4-plan.md)
> §8–§9 (the reasoning behind #52–#57) and §7 (the implementation plan Opus builds from) →
> [`protocol-v0.3.md`](protocol-v0.3.md) **§16** (ruled shapes awaiting builds) →
> [`backlog.md`](backlog.md) → [`opus-brief.md`](opus-brief.md) (the Opus queue).

## What the last round settled, so it is not reopened

Session 31 closed **G7**: partial transclusion is normative in §10.1–§10.3 with the build's
P4 call recorded (the bake is the selection's plain text in paragraphs), `blyg-partial` is
in `css-contract.md` §1, and the fifth revision is published. Five rulings: **Kyle Mathews'
OAuth and MCP proceed inside #31/#39 under four invariants, and he builds 2.9** (#52);
**`content_html` is self-contained, every URL absolute** (#53, §5.2); **`[[id]]` is inert in
code** like the directive (#54, §10.1); **`cited` MAY sit on a `{url}` stub** (#55, a ruled
shape in §16.1a); **`page` SHOULD be stable** for the life of an item (#56, §5.8). Parked
with triggers (plan §8.6): Unicode (blygger-spec#6, a round of its own), the variorum
(blygger-spec#8, now the named trigger for `![[id@vN]]`), a namespaced `meta` bag
(blygger-spec#10, not opened).

Session 33 (Fable, beside an Opus session) ruled **#57: a fork of a thread descends from
the pinned document** — baked quotes flattened into ordinary blockquotes with attribution,
no `blyg-transclusion` class, no inherited `transclusions[]`; pin-closure rejected because
the thread's pin already freezes its quotes (§16.6f; plan §9.1; gate **G11**). It also
confirmed, without a ruling, that the TK-source questions Venkat hit are #44 as ruled with
the build missing (G8, still deferred), that `[[id]]` and URLs inside a scope are literal
text by #32's principle, and that "TK transclude" is a misnomer (plan §9.2). **There are no
open protocol questions** apart from the Unicode round, which is optional and
self-contained.

## Review first — decisions Opus ruled (#58)

Decision #58 (session 33) routes by blast radius: Opus rules reversible questions under
the four-question test in `CLAUDE.md` § Model routing, records them in the decisions
list with a `Fable review pending` label, and builds. **A Fable round begins by reading
every pending entry**, in order: confirm (strike the label), amend (edit the entry, note
the amendment with the date), or reverse (a new numbered decision that says why; the
cost is one studio release, since nothing in the tier reached the wire). Check each
against the four questions as well as on its merits — an entry that should have stopped
is the finding that matters most.

## The gates

**#21 is the whole agenda.** Each row opens when Opus's devlog entry says the exercise
ran on both nodes with ids recorded. **Rows marked *Opus* are promotions Opus performs
under #58; Fable reviews them.**

| Gate | What must be true | Then Fable does |
|---|---|---|
| **G3** | Kyle's token auth has shipped under #52's four invariants and **at least one third-party tool** (Blygger Desktop is the obvious first) authenticates with a scoped token | Review **`tn-4` — the write surface** (non-normative, #31), which Opus drafts from the build. |
| **G5** | The reference agent (2.10) has run against a live node long enough to refresh a snapshot, answer a mention, and author under its own byline | Review `tn-5` for anything that wants a construct — the refresh scope on the re-bake identity (#38, backlog §1) is the candidate. |
| **G6** | The studio emits `changelog[].generated` and the history view has been used across two nodes (2.12) | *Opus:* promote §16.6c into §5.2 — a 0.3 revision. Small. Fable reviews. |
| **G8** | **Remote generation sources** built (`v0.4-plan.md` §7.2, R1–R8) and exercised: a PI scope drawing on a venkateshrao item, `generated[].sources[]` with `origin`+`cited`, the mention **verified as `source`** on the far side, provenance intact on import | **Open `protocol-v0.4.md`**: a standalone superset of the 0.3 text, 0.3 section numbers preserved, §16.3 promoted into §5.7 and §15.4 (relation set gains `source`), §16.6e carried as a ruled shape until G9, §16.1a carried until G10. Register 0.4 in `sync_spec.py`, flip 0.3 to `("SUPERSEDED", "0.4")`, publish, cut the first snapshot the same day — in that order (#42). Rewrite this brief. |
| **G9** | A client **not written by this project** publishes through `item`/`pin` templates (the WordPress case, blygger-spec#2) and the studio (§7.5, M1–M4) has subscribed to it, transcluded from it, and sent it a mention that verified | Promote §16.6e into §4, §6.1, §12.1 step 4, §12.2 and §5.8 of the living document (0.4 if G8 has opened it; otherwise it waits, because it is a 0.4 construct by #43). |
| **G10** | The studio emits `cited` on a `{url}` stub (the pour-over-links affordance, studio#17, is the natural producer) and an import across nodes retains it verbatim | *Opus:* promote §16.1a into §10.6 — a 0.3 revision by #43 (or into the 0.4 text if it is open). One paragraph. Fable reviews. |
| **G11** | The studio forks a thread from the pinned document per #57 (Opus queue item 5) and the exercise ran: on one node, a fork of a thread on the other that quotes a third item, quotes flattened with attribution, `generated[]` carried, no `transclusions[]`, no quote-mentions sent | *Opus:* promote §16.6f into §5.6 rule 6 — a 0.3 revision by #43 (or into the 0.4 text if it is open). Record the build's call on the attribution line's form. Fable reviews. |

If nothing is pending review and neither G8 nor G9 is true when a Fable session opens,
**say so in one line and stop** — or take the standing question below, deliberately.

## The one standing question — Unicode on the wire (blygger-spec#6)

Not a gate; it opens on choice. The issue is real and already measured in the reference
runtime: `content_hash` differs between NFC and NFD spellings of the same visible text,
the same visible origin serializes to two different strings, three caps say "characters"
without a unit, and two truncations say nothing about where they may cut. Take it only
when no gate is open, or when the first cross-client hash disagreement appears in the
wild. **Measure first:** hash every live item both ways, serialize every live origin
through WHATWG, Python's `urllib` and Go's `net/url`, and count what the caps actually
count in each live client. The likely shape is a §5.1 normalization rule for hashing, a
§12.2 serialization rule for origins, and one sentence defining the counting unit — but
nothing here is pre-decided.

## Sequencing notes

- **G8 opens 0.4; G10 and G11 are 0.3 revisions** and may land at any time. If both arrive
  together, do G10 into the 0.3 text first, then draft 0.4 from that, so the 0.4 document
  inherits it as normative rather than as a §16 item — the same order G7-before-G8 had.
- **G9 depends on someone else.** The reply on issue #2 was posted session 31 (2026-10-03)
  with the ruling and the gate; if cyberscribe confirms the WordPress side is being built,
  the studio's reader side (§7.5) should land before it ships.
- **Kyle's auth PR is not a gate.** Opus reviews it against #52's four invariants
  (`blygger-studio/CLAUDE.md`). Fable is needed only if the PR wants something outside them.
- **The snapshot policy stands:** revisions land in the living text and are not
  snapshotted; a snapshot is cut at publication of a new version and thereafter as a
  deliberate act when a third party needs the text to hold still.

## Do not open

- **#11 identity, #12 metrics** — load-bearing refusals.
- **A normative write API** (#31), **a mention relation for links** (#32), **a title
  field** (#46), **transitive staleness** (#45), **a maintenance flag** (#34).
- **The two declined candidates** (#47) unless the trigger named in `backlog.md` §1
  occurs.
- **`![[id@vN]]`** — still reserved; the variorum (blygger-spec#8) is its named trigger,
  and it opens when someone wants to write one, not before.
- **A second discovery vocabulary** for manifests — #51 chose to extend the existing link.
- **`.well-known` discovery for auth, or any auth key in the manifest** (#52).
- **A general `meta` extension bag on the item document** (blygger-spec#10) — `author` is
  the one opaque extension point, by design.

## Hand back

Per gate: what was promoted, into which section, in which document. Continue `CLAUDE.md`'s
locked decisions from **#56**, record reasoning in `v0.4-plan.md` §8, append the DEVLOG
entry, file any new ideas in `backlog.md`, and rewrite this brief.
