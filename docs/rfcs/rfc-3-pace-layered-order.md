# RFC-3 — The pace-layered order: what keeps mattering stays near the top

**Request for comments · non-normative · OPEN FOR COMMENT until 2026-12-10 on
[blyg.blygger.org](https://blyg.blygger.org/t/28cm3qgpz1fa146yjvac97ba7c/) (#66); without a blyg, comment on [blygger-spec#29](https://github.com/blygger/blygger-spec/issues/29) ·
session 61, 2026-11-07.** Drafted by Opus 5.5 at Venkat Rao's request, from the reference client's
plan ([`blygger-studio/docs/pace-layered-feed.md`](https://github.com/blygger/blygger-studio/blob/main/docs/pace-layered-feed.md)),
its code (`src/feeds/pace-layered.ts`) and its fixtures (`test/fixtures/feeds/`). Ruled by
Fable 5.1 the same session (section 7, decision #97); publishes on blyg.blygger.org with a
comment period (#66, #73). Like a technical note, an RFC constrains nothing: a client that orders
its home page newest first is as conformant as one that does this. When the comment
period closes it becomes a technical note (#90). Written against protocol 0.4 at its
eleventh revision; no pre-1.0 version promises anything (#21).

Blygger Studio has shipped this order since 0.42.0 (2026-10-11) and uses it as the
default home page on a fresh install. This RFC describes it so another client can
implement the same order and check it against the same fixtures. Section 7 records the
four rulings, and section 8 asks implementers questions. Two of the rulings (R2, R3)
changed the reference; Blygger Studio 0.58.0 builds them, and the fixtures this RFC points
at are the ruled ones.

## Summary

Blygger keeps time two ways. The **synchronic** view is what is new now: newest first,
which every feed reader already shows. The **diachronic** view is how things change,
and this order is one way to show it. Items sink as new ones arrive. They sink more
slowly the more they have been pinned, and they climb a place each time they are
revised. In the limit, a heavily pinned item that keeps being revised holds the top: the
familiar "pinned post", reached by what the author did rather than declared by a flag.

- **It reads the wire, plus one judgement of the client's own.** Every input but one is in
  a blyg's public files: ids and withdrawal from the index and item documents, versions
  and pins from each item's `changelog`, and quotes from version documents. The one other
  input is whether a version was maintenance (R2), which the client derives, as §13.2 lets
  every reader. A reader can order someone else's blyg as its author's client does.
- **It is a function of the publishing history, not of the clock.** Time is counted in
  arrivals, not seconds, so the order is the same for every reader at any moment and
  changes only when the blyg publishes.
- **The model is the convention; the numbers are reference values.** A client claiming
  this order implements the model in section 2. It may tune the constants in section 3
  and should say so, because a fixture checks one set of constants.
- **It changes nothing on the wire.** One OPTIONAL member already ruled, `pinned_at`
  (§16.9), would refine it (section 5).

## 1. The question

A blyg is a set of living documents, not a stream of posts. Items are revised, and the
author pins the versions that matter: a pin is an irrevocable promise to serve that
version forever (§8), the medium's one costly signal of significance (#19, TN-1).
A newest-first home page uses none of this. It shows a blyg as a stream: last week's
fragment sits above the thread the author has revised for a year and pinned four times.

The question is what order shows a blyg as a body of work. Decision #73 answered it for
the reference client and asked for an RFC recommending the answer to other clients.

## 2. The model

**Ticks.** Time is counted in ticks, one each time a new item enters the order. A
revision is not a tick, and neither is a pin.

**Depth.** Every item in the order has a depth, and the order is shallowest first. A
new item enters at depth 0. On that tick, every item already in the order sinks by its
layer's speed.

**Layers.** An item's layer is its weight, floored and capped at the deepest layer.
Layer *n* sinks at `2^-n` depth per tick, so each layer down sinks at half the speed of
the one above. The reference uses six layers and gives them Stewart Brand's pace-layer
names, fastest first: fashion, commerce, infrastructure, governance, culture, nature.

**Weight.** An item's weight is the number of its own pinned versions, plus half the
weight of each item that quotes it in a pinned version, recursively, halving per hop.
A pin on a thread freezes what the thread quotes, so it is evidence that the quoted item
matters. **Weight flows from the quoting item to the quoted one and never back:** the
other direction would reward quoting popular things. Because the recursion is counted
over walks and bounded in hops, a cycle of quotes adds a little and then fades.

**Climbing.** A new version of an item already in the order moves it past the item
directly above it, once per climb. The reference climbs one place per version: a
revision moves an item up one place, not to the top. If the item is already at the top,
it stays there. **A maintenance version climbs zero** (R2): one the client judged to
change nothing worth resurfacing — the same text as the version before it (#77), or
under the client's near-sameness threshold (#83).

**Bursts.** Items published together as one act are one publication (spec §13.7): a
thread version and the own items it is the first to name whose first publication falls
within the burst window before it. A burst takes **one tick** (R3): everything else sinks
once, and its items enter at depth 0 together, the thread on top and its fragments
beneath it in publication order. A thread already in the order comes back to the top with
its burst, since the burst is a new publication and the thread is its entry. A withdrawn
thread is no entry to fold into, so its fragments take their own ticks.

**Withdrawal.** A withdrawn item leaves the order and takes no tick. Its pinned versions
still lend weight to what they quote, because pinned versions are served forever (§8)
and stay on the wire after the endcap.

**What it orders.** A home page or any other presentation of a blyg's own items. The feed,
the archive and every protocol surface are untouched: §7's feed stays an ordered list of
publish events, and nothing about this order is published.

### 2.1 The algorithm

Replay the blyg's history in publication order, one event per version.

```
visible  := items that are not withdrawn
bursts   := for each visible thread version, oldest first: the own items it is the
            first to name whose first version is within BURST_WINDOW before it
events   := every (item, version) pair, sorted by version.at
            (equal times keep listing order: the index's order, oldest first,
             and an item's own versions in sequence)
for each event (item, version), in order:
    if version is pinned:
        pins[item] += 1
        for each own-origin item q this version quotes, q != item:
            quoters[q] += {item}
        recompute every layer from the weights           -- layers change from here on
    if item is not visible: continue
    if item has no depth yet and belongs to a burst: continue   -- it enters with the thread
    if (item, version) is a thread version with a burst:          -- one tick for all of it
        for each other item o with a depth: depth[o] += 2^-layer[o]
        for each member m, latest-published first: depth[m] := 0; entered[m] := next tick number
        depth[item] := 0; entered[item] := next tick number
        continue
    if item has no depth yet:                            -- a tick
        for each other item o with a depth: depth[o] += 2^-layer[o]
        depth[item] := 0; entered[item] := next tick number
    else:                                                -- a revision
        repeat climbs(version) times:
            if item is first in the order: stop
            swap depth[item] with the depth of the item directly above
            if the two depths were equal: entered[item] := next tick number
order := items with a depth, by depth ascending,
         then by entered descending (at equal depth, the later entrant is on top)
```

Weights are recomputed at each pin, and each tick sinks an item at its layer **at that
tick**. A pin therefore slows an item from the moment it is counted and does not
rewrite the depth it already gained. The order depends on the history alone; it does
not depend on the order items are listed in when their times differ (the reference
tests this on every fixture).

### 2.2 A worked example

Fixture `02-pinned-item-sticks.json`. Item `a` is published with two pinned versions,
giving it weight 2, layer 2 and a quarter of the base sinking speed. Then `b` through
`f` arrive, one tick each. After the five ticks, `a` has sunk 1.25. `d`, two arrivals
from the end, has sunk 2, and `c` has sunk 3. The order is `f, e, a, d, c, b`: `a`
holds third place among six with nothing but two pins.

## 3. Reference constants

| Constant | Reference value | What it controls |
|---|---|---|
| Layers | 6 (Brand's names) | How deep pins can slow an item |
| Sinking speed of layer *n* | `2^-n` per tick | How much each layer down slows sinking |
| Weight passed per hop | ½ | How much a pinned quote counts toward the quoted item |
| Hops counted | 6 | How far a pin's weight travels up the quoting tree |
| Climb per version | 1 place; 0 for a maintenance version (R2) | How far a revision moves an item |
| Burst window | 15 minutes | How long before a thread its fragments may be published and still enter with it (R3) |

These are values, not rules. #73's reasoning: making them normative "would make the RFC
a specification of one client's taste". A client that tunes them still implements this
order. It no longer matches the fixtures, which check the reference values, and it should
say which values it uses.

## 4. Inputs: the wire, mapped

| Model input | Where it is on the wire |
|---|---|
| Item ids, kinds, listing order | `items/index.json` (§6.2) |
| Withdrawal | the item document's endcap, `kind: "withdrawn"` (§9) |
| Versions and their times | the item's `changelog[]`: `version`, `at` (§5.2) |
| Pins | `changelog[].pinned` (§5.2, §8) |
| Who quotes whom, per pinned version | `transclusions[]` in `items/{id}/v{n}.json`, entries with no `origin` (own items) |
| Bursts | the same `transclusions[]`, with `created` and the thread version's `at` (spec §13.7) |
| Maintenance (R2) | **not on the wire**: the client's own judgement, from the two texts it holds at reconciliation (same `content_hash`, #77; near-same, #83) |

The endcap is not a version for this purpose. Quotes of other origins' items are
ignored: they say nothing about this blyg's own items. Quotes in unpinned versions are
ignored too, because only a pin is a promise. A reader can fetch the pinned documents it
needs at the cost of one fetch per pinned version, which is the most expensive input.

The reference client builds this history from its own database (`src/feeds/history.ts`),
but the shape it builds is exactly the wire's, so the same code could order an imported
blyg. The contract is `FeedHistory` in `src/feeds/types.ts`, which is also the fixture
format.

## 5. What the wire does not say, and `pinned_at`

**When a version was pinned.** `changelog[].pinned` says that a version is pinned, not
when the promise was made, so the reference counts a pin from its version's publication.
An item pinned a year after it was written is treated as if it had been pinned at
once, and its early ticks are counted at a slower speed than the reader saw at the time.

Decision #73 ruled the missing fact as an OPTIONAL member, `changelog[].pinned_at`
(§16.9), self-asserted and present only beside `"pinned": true`; absent means unknown,
with the current fallback. **When it is present, a client should count the pin as an
event at `pinned_at`** rather than at the version's `at`. This is the one change the
model wants from the wire, and it is already ruled; it waits for a client to emit it
(the reference client stores the time and does not publish it yet) and another to read
it.

**Pins on other blygs.** A pin on another origin's thread that quotes this blyg is real
evidence, but it is not in this blyg's files. Mentions are private to the receiver (#28),
and a pin MAY re-send its mentions (§15.2, #73), but nothing requires it. The reference
leaves inbound pins out, and a client that counts them is running an extension of this
order, not the reference.

## 6. Conformance: the fixtures

Nine fixtures in [`blygger-spec/conformance/feeds/`](../../conformance/feeds/) (canonical,
R4; Blygger Studio keeps a CI-checked copy), each a JSON object with a `description`, a
`history` and the `expected` order, worked by hand; the directory's README gives the
format:

| Fixture | What it checks |
|---|---|
| `01-no-pins` | With no pins and no revisions every item sinks at one speed, so the order is newest first |
| `02-pinned-item-sticks` | Two pins put an item in layer 2; it holds third place as five newer items arrive |
| `03-versions-climb` | Each new version climbs past the item directly above; at the top it stays |
| `04-one-climb` | One revision moves an item one place, not to the top |
| `05-quoted-by-pinned-threads` | Two pinned threads each pass half a pin to the fragment they quote; at equal depth the later entrant is on top |
| `06-withdrawn` | A withdrawn item takes no tick, but its pinned versions still lend weight to what they quote |
| `07-maintenance-no-climb` | A maintenance version climbs zero (R2) |
| `08-burst-one-tick` | A burst takes one tick: thread on top, fragments beneath in order, everything else sinks once (R3) |
| `09-burst-window` | A fragment outside the burst window takes its own tick (R3) |

A client claiming the order passes all nine with the reference constants. The reference
suite (`test/feeds.test.ts`) also checks invariants the fixtures only sample: that the
order does not depend on listing order; that an item pinned and revised as often as
anything is published holds the top; that an unpinned item revised as often climbs only
one place each time; that weight halves per hop and flows only from quoter to quoted;
and that a cycle of quotes stays finite. A second client is invited to propose fixtures
of its own.

## 7. Rulings (Fable 5.1, session 61, 2026-11-07; decision #97)

The four-question test, applied: nothing here changes what a reader, receiver or
importer must do; nothing is added to the wire; `pinned_at` is #73's own ruled shape.
Four calls were Fable's because they say what the convention is. All four are ruled as
the draft recommended, with a mechanism added to R4:

- **R1, confirmed.** A client implements the pace-layered order when it implements the
  model in section 2; the constants are reference values; the fixtures check the reference
  values; a client that tunes the constants still implements the order and says which
  values it uses.
- **R2, confirmed.** A version the client treats as maintenance — the same `content_hash`
  as the version before it (#77), or under the client's own near-sameness threshold (#83)
  — **climbs zero**. Climbing a place is resurfacing in miniature, and #77 says SHOULD NOT
  resurface. `climbFor` is where it goes; one fixture.
- **R3, confirmed, and ruled together with the reader's burst rule**
  (`background-plan.md`): they are §13.7's one fold seen from two sides. A burst takes
  **one tick**: its items enter at depth 0 together, the thread first and its fragments
  beneath it in publication order; everything else sinks once. Two fixtures.
- **R4, confirmed, with a mechanism.** The canonical fixtures move to
  `blygger-spec/conformance/feeds/`. A client cannot read another repository at build
  time, so the reference client keeps a copy with a CI check that the two are identical,
  as `VOICE.md` is kept in two repositories.

The items as drafted, for the record:

- **R1. The model as the convention, constants as reference values** (#73). Confirm
  that a client "implements the pace-layered order" when it implements section 2, even
  with tuned constants, and that the fixtures check only the reference values.
- **R2. Maintenance versions do not climb?** #77 makes a same-hash republish
  maintenance, and #83 extends that to versions under a reader-local near-sameness
  threshold. The reference climbs on every version, so an agent's snapshot refresh moves
  an item up a place, and readers are told elsewhere to treat that version as nothing
  new. The draft recommends that **a version a client treats as maintenance climbs
  zero**, and that `climbFor`, the reference's stub for changelog-driven climbing, is
  where it goes. The two rulings point the same way; Fable should confirm it before the
  RFC recommends it.
- **R3. A burst is one tick?** §13.7 lets a reader fold items published together into
  one publication (#78). Under the reference, one authoring act that produces many items
  takes a tick for each: a client that chops a document into ten fragments (bradydale.com
  does this today) sinks everything else by ten arrivals at once, and tangling (the
  studio's planned `![[+ text]]`) would do the same for a thread and its fragments. The draft recommends that **a burst §13.7 would fold takes one
  tick**, with the thread entering and its fragments entering beneath it. This changes
  the reference, so it needs a ruling and new fixtures.
- **R4. Where the fixtures live.** They are in the studio repo today. A convention other
  clients run belongs where they can find it without reading a client: the draft
  suggests `blygger-spec/conformance/feeds/`, beside the reader suite, with the studio
  reading them from there.

## 8. Open questions for comment

1. **The constants.** Do six layers and halving speeds suit blygs that publish daily as
   well as ones that publish monthly? A tick-based model is indifferent to the calendar
   by design, but the number of layers sets how much a pin can matter.
2. **Changelog-driven climbing.** Should a major revision climb further? The wire carries
   no category (#19), so any classification is the reader's own, derived from the two
   versions it holds, as #77 and #83 derive maintenance. What would a client use?
3. **Pins on other blygs.** Would an ordering extension that counts inbound pins, from
   re-sent mentions, be worth building, given that a pin's mentions are only a MAY?
4. **The reading view.** ROADMAP row 69 asks for the same order on a reader's merged
   reading surface. Across origins, a tick is an arrival from any subscription, and
   timestamps are self-asserted (§13.7), so a future-dated origin could take ticks it
   should not. Is a per-origin order merged by recency enough, or does the model need a
   cross-origin form?
5. **Presentation.** Should a client show an item's layer, or the reason it sits where
   it does? The reference does neither. A visible layer is easy to read as a popularity
   score, which this order is not (no counts, #12, #13).

## 9. Rejected designs

- **Decay by the clock.** Sinking by elapsed time would bury a slow blyg's whole front
  page during a quiet month, and it would make the order depend on when it is read, so
  two readers would see different orders of the same files. Counting arrivals makes the
  order a function of the history.
- **Engagement signals.** Counts of readers, responses or subscriptions are not on the
  wire and must not be (#12, #13). Pins are the author's own costly signal, and they are
  public.
- **Weight flowing from the quoted to the quoter.** It would reward quoting popular
  items, not writing items worth quoting.
- **A declared "pinned post" or sticky flag.** That is significance markup on the wire,
  which #19 refuses. The order reaches the same place from pins and revisions.
- **Normative constants.** One client's taste, made a rule (#73).

## 10. Relation to other documents

- **Decision #73** (`v0.4-plan.md` §12.1) orders this RFC, rules `pinned_at` and lets a
  pin re-send its mentions.
- **Spec 0.4:** §5.2 and §8 (changelog and pins), §9 (withdrawal),
  §6.2 (the index), §13.2 and §13.7 (maintenance and bursts, for R2 and R3), §16.9 (`pinned_at`).
- **TN-1** (`tn-1-versioning-and-pins.md`): why pins, not version structure, carry
  significance. This order is one consumer of that design.
- **Reference implementation:** blygger-studio 0.42.0 and later, `src/feeds/`, with
  `feed_order: "pace-layered"` the default on fresh installs.
