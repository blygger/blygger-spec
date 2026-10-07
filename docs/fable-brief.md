# Fable brief — the standing agenda for the next Fable pass

**This round's product:** review every decision labelled `Fable review pending` (#58);
open `protocol-v0.4.md` if gate G8 is open; take the queued non-blocking items in
[`fable-round-queue.md`](fable-round-queue.md) if chosen on purpose; otherwise nothing.
**Since #58, promotions G6, G10 and G11 are Opus's**; Fable reviews them after the fact.
**Written:** session 38 (2026-10-06), by Fable 5.1, at the close of the conformance round
that reviewed the seventh revision, ruled decisions #59–#64 and wrote the eighth revision.
**Rewrite this file each Fable round.** It is the one place a Fable session starts.

> **Read first, in this order:** this brief → `CLAUDE.md` locked decisions **#59–#64**
> (the session-38 rulings; #52–#58 are the two rounds before; #43–#51 the 0.4 definition)
> → [`v0.4-plan.md`](v0.4-plan.md) §10 (the reasoning behind #59–#64) and §7 (the
> implementation plan Opus builds from) → [`protocol-v0.3.md`](protocol-v0.3.md) **§16**
> (ruled shapes awaiting builds) → [`fable-round-queue.md`](fable-round-queue.md) (items
> 6–14, none blocking) → [`backlog.md`](backlog.md) → [`opus-brief.md`](opus-brief.md).

## What the last round settled, so it is not reopened

Session 38 was the first use of #58's review half: the **seventh revision** (G6 and G10,
Opus) was confirmed with one parenthetical reworded. Six rulings, all revisions by #43:
**any client that styles `blyg-tk-gen` SHOULD say the disclosure is self-reported** (#59,
§5.7 — the "reference client leaves it unstyled" sentence is gone); **an own-line `![[id]]`
left in TK output transcludes, and #20's "inside a scope" means the instruction** (#60;
0.20.1 stands; a directive in output is a source only if the instruction named it);
**mention verification tests the item document's final URL against `{origin}items/{id}.json`
exactly** (#61, §15.4 step 2 — closes F1 and F4 in one test; §16.6e says how a
template-aware receiver verifies a templated blyg); **#57 stands against F6 — a quote the
pinned document carries is copied whatever the quoted item's state — and partiality is read
from `blyg-partial` in the bake** (#62, §16.6f); **#43's test names the publisher re-parsing
another's `content_md`, and inherited `[[id]]` links in a fork flatten** (#63, §16.6f); **a
manifest's address is a path** (#64, §16.6e, Robert Peake's question on blygger-spec#2).
Items 6–14 of the queue were deliberately not taken (plan §10.8).

## Review first — decisions Opus ruled (#58)

A Fable round begins by reading every entry labelled `Fable review pending`, in order:
confirm (strike the label), amend (edit the entry, note the amendment with the date), or
reverse (a new numbered decision that says why). Check each against the four questions as
well as on its merits — an entry that should have stopped is the finding that matters most.
**Pending now:** decision #65 (fork intents, §5.6 rules 7–8) and the G11 promotion (eleventh
revision, session 39: §16.6f → §5.6 rule 6 with its three session-38 bullets; the attribution
line's form recorded in §16.6f; built as studio 0.32.3). **Expected next time:** the studio's §15.4 step 2 fix if Opus
recorded a call while building it, and the `tn-3` revision.

## The gates

**#21 is the whole agenda.** Each row opens when Opus's devlog entry says the exercise
ran on both nodes with ids recorded. **Rows marked *Opus* are promotions Opus performs
under #58; Fable reviews them.**

| Gate | What must be true | Then Fable does |
|---|---|---|
| **G3** | Kyle's token auth has shipped under #52's four invariants and **at least one third-party tool** authenticates with a scoped token | Review **`tn-4` — the write surface** (non-normative, #31), which Opus drafts from the build. |
| **G5** | The reference agent (2.10) has run against a live node long enough to refresh a snapshot, answer a mention, and author under its own byline | Review `tn-5` for anything that wants a construct — the refresh scope on the re-bake identity (#38, backlog §1) is the candidate. |
| **G8** | **Remote generation sources** built (`v0.4-plan.md` §7.2, R1–R8) and exercised: a PI scope drawing on a venkateshrao item, `generated[].sources[]` with `origin`+`cited`, the mention **verified as `source`** on the far side, provenance intact on import | **Open `protocol-v0.4.md`**: a standalone superset of the 0.3 text, 0.3 section numbers preserved, §16.3 promoted into §5.7 and §15.4 (relation set gains `source`), §16.6e carried as a ruled shape until G9. Register 0.4 in `sync_spec.py`, flip 0.3 to `("SUPERSEDED", "0.4")`, publish, cut the first snapshot the same day — in that order (#42). Rewrite this brief. |
| **G9** | Soapbox (Robert Peake's WordPress plugin, blygger-spec#2) publishes through `item`/`pin` templates and the studio (§7.5, M1–M4) has subscribed to it, transcluded from it, and sent it a mention that verified | Promote §16.6e — with its session-38 bullets (manifest address, verification under templates) — into §4, §6.1, §12.1 step 4, §12.2, §5.8 and §15.4 of the living document (0.4 if G8 has opened it; otherwise it waits, a 0.4 construct by #43). |
| **G11** | Done (session 33). | Promoted by Opus in the eleventh revision (session 39). Fable reviews. |

G6 and G10 closed in session 37 and were reviewed in session 38.

If nothing is pending review and neither G8 nor G9 is true when a Fable session opens,
**say so in one line and stop** — or take queue items 6–14 or the standing question below,
deliberately.

## The one standing question — Unicode on the wire (blygger-spec#6)

Not a gate; it opens on choice. `content_hash` differs between NFC and NFD spellings of the
same visible text, the same visible origin serializes to two different strings, three caps
say "characters" without a unit, and two truncations say nothing about where they may cut.
Take it only when no gate is open, or when the first cross-client hash disagreement appears
in the wild. **Measure first:** hash every live item both ways, serialize every live origin
through WHATWG, Python's `urllib` and Go's `net/url`, and count what the caps actually count
in each live client. Nothing here is pre-decided.

## Sequencing notes

- **`tn-3` can be revised now:** the §15.4 fix shipped in studio 0.32.2 and the eighth and
  ninth revisions are published.
- **G8 opens 0.4.** If G9's exercise arrives first, §16.6e waits as a ruled shape; the
  Soapbox reader side (§7.5) should still land before Robert ships.
- **blygger-spec#12 (Glass Bead Game)** is a round of its own: multiple parents reopen #27's
  single-target shape and `game_of` is the extension-bag question #10 refused. Reply
  pending; do not rule it in passing.
- **Kyle's PRs are not gates.** Opus reviews them against #52's four invariants.
- **The snapshot policy stands:** revisions land in the living text and are not
  snapshotted; a snapshot is cut at publication of a new version and thereafter as a
  deliberate act when a third party needs the text to hold still.

## Do not open

- **#11 identity, #12 metrics** — load-bearing refusals.
- **A normative write API** (#31), **a mention relation for links** (#32), **a title
  field** (#46), **transitive staleness** (#45), **a maintenance flag** (#34).
- **The two declined candidates** (#47) unless the trigger named in `backlog.md` §1 occurs.
- **`![[id@vN]]`** — reserved; the variorum (blygger-spec#8) is its named trigger.
- **A second discovery vocabulary** for manifests — #51 chose to extend the existing link.
- **`.well-known` discovery for auth, or any auth key in the manifest** (#52).
- **A general `meta` extension bag on the item document** (blygger-spec#10).
- **Softening #57 for withdrawn quotes** — ruled explicitly in #62.
- **A query-string manifest** — out of scope by #64.

## Hand back

Per gate: what was promoted, into which section, in which document. Continue `CLAUDE.md`'s
locked decisions from **#64**, record reasoning in `v0.4-plan.md` §10 (or a new section),
append the DEVLOG entry, file any new ideas in `backlog.md`, prune `fable-round-queue.md`,
and rewrite this brief.
