# Background and Foreground — implementation plan for the reader

**Status:** plan of record, not started. Written session 61 (2026-11-07) by Opus 5.5 with
Venkat, who answered the four open questions (§0). It **supersedes §3 of
[`tangling-plan.md`](tangling-plan.md)** (the reader-side classifier) and builds that
section's five reasons, adds the rules and controls Venkat asked for, and gives them a
Settings section. The publish side of tangling (`tangling-plan.md` §1–2) is unchanged and
still lands after this.

**Nothing here touches the wire.** Every rule is reader behaviour on data the reader already
holds, under the rulings that send things to a low-priority queue: #77 (same hash is
maintenance), #80 (wordless stubs are notices), #83 (near-sameness is derived, never
declared; no word in a note has meaning), §13.2 and §13.7 (readers MAY queue low and fold
bursts, and MUST still import everything). **One input waits on Fable:** whether another
blyg's changelog note may count — staged as `v0.4-plan.md` §18.8. Everything else is
Opus-tier under #58.

**Where it stands today.** Background is the withdrawn items only: `state = 'tombstone'` for
imported items and `kind = 'withdrawn'` for own ones (`src/reading-data.ts`, `identitySql`).
Reasons, settings and manual controls do not exist.

---

## 0. Choices Venkat made (session 61)

| Question | Choice |
|---|---|
| What "versions very close in time" bumps | **Older items of the same blyg**: when a blyg publishes a new item within *N* minutes of its previous one, the previous one moves to Background (bumped sideways, not sunk) |
| What "move to Foreground" does on an item the rules put in Background | **Pins it to Foreground**, across later versions, until moved back |
| Own items | **Same rules** as imported items, with the private change classifier for "minor" |
| A model for other blygs' minor changes | **An opt-in setting now**: the decision model (Clef, Jev) judges each imported new version's change |

The Background/Foreground split is **the reader only**. Public pages, feeds and the archive
are unaffected.

---

## 1. The model

Each reading entry has a set of automatic **reasons** and may have an **explicit placement**.

> An entry is in **Background** when its item placement is `background`, **or** it has no item
> placement **and** (its blyg is placed in Background **or** any **enabled** reason applies).
> An item placement of `foreground` keeps it in the main lenses whatever else holds.

Precedence: **your choice on the item → your choice on the blyg → the rules.**

Reasons are stored as facts; Settings decide at query time which of them count. Turning a
rule off moves its items back at once, with nothing recomputed, and turning it on again
restores them.

The Background lens lists every entry in Background; every other lens leaves them out. Read
state is untouched: Background is a lens, not "mark read" (tangling plan §3.5).

---

## 2. The rules

All computed **at import** (imported items, in `src/importer/poll.ts` after `transition()`)
or **at publish** (own items), because that is the one moment both the held version and the
new one are in hand: the importer keeps only the latest state.

| Reason | Fires when | Recomputed | Ruling |
|---|---|---|---|
| `withdrawn` | as today; always on | — | row 92 |
| `maintenance` | the new version's `content_hash` equals the held one's | each version | #77, §13.2 |
| `near-same` | changed ≤ 2 % of the text and ≤ 40 characters, on `content_md` | each version | #83, §13.2 |
| `minor` | the change classifier calls the version `typo`, `minor` or `refresh` (§3) | each version | #83; §18.8 for the note |
| `superseded` | the same blyg published a newer item within the **superseded window** after this item's latest activity | when a sibling arrives; cleared by a new version of this item | §13.7 ¶1: ordering is the reader's own; no text needed, and not recommended to other clients (a 15-minute window is one client's taste, #73's logic) — Fable, session 61 |
| `burst` | a fragment from blyg O named in the `transclusions[]` of a thread from O whose publishing version falls within the **burst window** after the fragment's `created` | when the thread arrives; cleared by a later version of the fragment | #78, §13.7 |
| `wordless` | `content_md` with every directive line, attached `>` selection, label and whitespace stripped is empty | each version | #80, §13.2 |

**Constants** are reader-local (#83: never on the wire, never in a public API). Two are
settings because Venkat wants to tune them: the **superseded window** (default 15 minutes)
and the **burst window** (default 15 minutes). The near-same threshold stays a documented
constant; one word can negate a sentence, so it stays small.

**Times are clamped.** `superseded` and `burst` compare publishers' own timestamps, which
are self-asserted (§5.2, §13.7). Each is clamped to `min(asserted, first observed here)`, as
the reading order already does, so a future-dated item cannot push a blyg's whole history
into Background.

**The thread of a burst stays in the main lenses** with a "+N fragments" control listing
them in place; its fragments are queued, never omitted (§13.1, §13.7). This is the tangle
filter: it has to exist before the publish side of tangling can emit bursts. Until tangling
lands, a burst is built by hand in tests (three fragments and a thread naming them, published
within a minute) and from live clients that already chop documents into fragments.

**Reasons on own items.** Computed at publish into `items.bg_reasons`, by the same function,
with the private classifier's category for `minor` (§3). Withdrawal stays as it is.

---

## 3. The changelog signal: `minor`

Two halves, because the inputs differ.

1. **Own items.** The studio's change classifier (`ai_model_classify`, `src/change-class.ts`)
   already labels each new own version `typo`, `minor`, `major` or `refresh`, privately. A
   label of `typo`, `minor` or `refresh` sets `minor`. With no decision model configured,
   the label comes from the text-model path the backlog already describes ("the changelog
   AI judges the change"), drafted with the note. No ruling needed.
2. **Imported items, measured — ruled down (Fable, session 61).** A ≤ 10 % rule is too wide
   to be on by default: §13.2 permits a reader-local threshold but says keep it small, since
   one word can negate a sentence. The measured rule for imported items is `near-same` (≤ 2 %,
   ≤ 40 characters) and nothing wider; the wider "minor" judgement is the decision model's
   job, opt-in (step 3).
3. **Imported items, by model — opt-in (Venkat's choice).** A setting,
   `bg_model_imported` (off by default), runs the decision model on each imported new
   version that is not already `maintenance` or `near-same`, with the held text and the new
   text as input, and takes its label. Cost: one call per imported new version across every
   subscription, so it runs in the scheduled poll under the existing AI budget
   (`AI_DAILY_CALL_LIMIT`); over budget, it falls back to the measured rule for that version
   and says so in the reason's detail. Settings show the cost plainly. **§14 applies** (Fable,
   session 61): both texts and the note are fetched text fed to a model, so the prompt frames
   them as data, and the model is a **decision** model with a fixed label set, never a text
   model — an injected instruction can then at most mislabel one version, which the owner
   moves back.
4. **The note — ruled, decision #96 (Fable, session 61).** The client MUST NOT route on a
   note of its own accord, in either direction; Opus's "raise only" is withdrawn, since a
   shipped asymmetric rule is still a shipped rule. **The owner may delegate**: a free-text
   **routing instruction** for Background, beside the model setting, **empty by default** (no
   shipped default, template or checkbox names a note word; the placeholder may show an
   example). The decision model receives the instruction with the two texts **and the note**
   and returns a label and a one-line reason. Four conditions keep #83 intact: no shipped
   rule; reading only (nothing the client publishes or sends routes on another blyg's note);
   visible and revocable — the chip reads "by your instruction: note says minor", and the
   owner can move the item back or edit the instruction; the wire gains nothing.
   **Disagreement is the error-handling half** (Venkat's "flag and escalate"): when the
   note's claim and the measured change disagree — the note says minor, 40 % of the text
   changed — the entry stays in the Foreground with a chip saying why, and the Background
   settings list the disagreements. That is the agent's behaviour when the instruction says
   nothing; the owner's instruction can override it. The publish side is symmetric: the
   owner's instructions to their own client about what a note says are honoured as written
   and checked only against the depth rule (§5.2).

Later, a system-1 classifier (Jev) can replace the measured rule in step 2 wholesale. The
function boundary is one place — `classifyChange(held, next, opts)` returning a label and
its source — so the swap is local.

---

## 4. Manual controls

| Control | Where | Effect |
|---|---|---|
| **move to Background** | an entry's ⋯ menu, every lens but Background | item placement `background` |
| **move to Foreground** | an entry's ⋯ menu in the Background tab | item placement `foreground` (pins it, overriding every rule, across versions) |
| **clear my choice** | ⋯ menu, when a placement is set | removes the item placement; rules decide again |
| **move this blyg to Background** | an entry's ⋯ menu and the source inspector | blyg placement on |
| **move this blyg to Foreground** | the same places, from the Background tab | blyg placement off |

Each Background entry shows **why** in a small chip: "you moved this", "blyg in Background",
"minor change", "minor change (model)", "same text", "small edit", "superseded within 15
min", "part of a burst", "no words of its own", "withdrawn". Several reasons show the first
by the precedence above.

Explicit placements are not interactions in the signals log: they are a view preference,
like a lens, not a judgement of the item. (Hopper adds are logged because hoppers are
curation; this is not.)

---

## 5. Settings — a **Background** section

Under the reader settings, one card:

- A toggle per rule: maintenance, near-same, minor change, superseded, burst, wordless (all on
  by default); withdrawn shown as always on.
- **Superseded window**, minutes (default 15). **Burst window**, minutes (default 15).
- **Judge other blygs' changes with the decision model** (`bg_model_imported`, off), with the
  model named from Settings → AI → change classifier and the cost stated: one call per new
  version of anything you read.
- A line saying Background never marks anything read and never changes what you publish.

---

## 6. Storage and API

**Migration** (number taken at build time; 0044 and 0045 are claimed by the Shelf and the
changelog summaries):

- `imported_items.bg_reasons TEXT` — JSON array of reason codes, null for none.
- `imported_items.bg_detail TEXT` — JSON object for chips (e.g. the burst's thread id, the
  model's label, a budget fallback); studio-private.
- `items.bg_reasons TEXT`, `items.bg_detail TEXT` — the same for own items.
- `reading_placement(source TEXT, sub TEXT, id TEXT, placement TEXT CHECK (placement IN
  ('background','foreground')), at TEXT, PRIMARY KEY (source, sub, id))` — `sub` is `''` for
  own items.
- `subscriptions.background INTEGER NOT NULL DEFAULT 0`.
- Change-state triggers: the reading counters must move when any of these change, or the
  polling cache will not refresh the lenses (`docs/d1-polling-cache-operations.md`). The
  0024 triggers list columns explicitly, so the new columns need triggers of their own, in
  the remote-safe shape (`SELECT RAISE … WHERE`, no `CASE … END;`), **proven on a throwaway
  remote D1** before any deploy.

**Settings keys:** `bg_rules` (JSON: which rules count), `bg_superseded_minutes`,
`bg_burst_minutes`, `bg_model_imported`.

**Query.** `identitySql` gains the predicate in §1. Enabled reasons bind as one JSON array:
`EXISTS (SELECT 1 FROM json_each(ii.bg_reasons) WHERE value IN (SELECT value FROM json_each(?)))`.
The same predicate drives `/reading/summary` counts and the sources list's counts.

**Contract (private, additive):**
- `ReadingEntry` gains `background: { reasons: string[], placement: 'background' |
  'foreground' | null, blyg: boolean, detail?: object }` so the Background tab can explain
  itself.
- `PUT /reading/placement` `{ source, sub?, id, placement: 'background' | 'foreground' | null }`
  (`owner:manage`, like subscriptions).
- `PATCH /subscriptions/{id}` gains `background: boolean`.
- Settings fields for §5.

**Backfill.** `superseded` and `burst` can be computed for items already held, from stored
`created`, `updated` and `transclusions_json`, once, by a cron batch like the mentions
backfill. `maintenance`, `near-same`, `minor` and `wordless` apply from each item's next
version (`wordless` can also be backfilled, from the held `content_md`).

---

## 7. Build order and acceptance

Each phase is a PR, releasable on its own.

1. **Foundation.** Migration, query predicate, reasons field on entries, the Settings card
   (toggles inert until phase 2 except withdrawn), item and blyg placement with their ⋯
   actions and the source inspector toggle, reason chips, counts.
   - *Accept:* moving an entry to Background removes it from All and lists it in Background
     with "you moved this"; moving it to Foreground from there returns it and survives a new
     version; a blyg moved to Background takes all its entries, and one of them pinned to
     Foreground stays; counts in the sources list agree with the lenses; nothing is marked
     read; the polling cache refreshes the lenses after each action.
2. **Measured rules.** `maintenance`, `near-same`, `wordless`, `superseded` at import and at
   publish, the superseded backfill, and the measured `minor`.
   - *Accept:* on two local nodes, from node A: a same-hash republish, a one-character edit,
     a wordless stub, a three-word fix and two items ten minutes apart all land as expected in
     node B's Background with the right chips; a stub that gains a paragraph moves back; each
     rule's toggle moves its items at once; a future-dated item does not supersede anything.
3. **The tangle filter.** `burst` and "+N fragments" on the thread.
   - *Accept:* three fragments and a thread naming them, published by hand within a minute,
     show as one entry with "+3 fragments" on node B, the fragments in Background with "part
     of a burst"; a fragment edited later leaves Background.
4. **The changelog signal.** Own items' classifier labels; the opt-in model for imported
   versions under the AI budget, with the budget fallback; the note only after §18.8 is
   ruled.
   - *Accept:* with Clef configured, an own typo fix lands in Background as "minor change";
     with `bg_model_imported` on, an imported rewrite labelled `major` stays in the main lens
     and a typo goes back; over the daily budget, the measured rule decides and the chip says
     so; the note is not sent to the model.

**Dependencies.** The changelog-display branch (`feat/changelog-display`, decision #95)
touches the same reader components (`ChangeLead`); merge it before phase 1 starts. Phase 4's
imported half needs the §18.8 ruling only for the note; the model on texts does not.

## 8. Not in this plan

- Anything on the wire, any public-page change, any change to the feed.
- Ordering inside Background (it uses the reading order).
- Folding `links[]` placeholders (`[[+ text]]`), which needs §13.7 extended (tangling plan
  §6; Fable's).
- A Smart Feed score: the feed prompt (Settings → AI → smart feed) is a different signal and
  may later read these reasons, not replace them.
