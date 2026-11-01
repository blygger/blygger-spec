# Per-hopper feeds for public hoppers, with public hoppers in `blyg.json`

**Status:** RULED 2026-11-01 (session 56, Fable 5.1, decision #86) — accepted with the
recommended answer to all four questions, plus: identity is (origin, the feed's *resolved*
absolute URL); no item document ever names a hopper; a reader MAY show an entry once when it
already holds the linked item. The text lives in `protocol-v0.4.md` **§16.12 as a ruled
shape** (not inline, per #42) and is promoted when the gate there runs. Reasoning:
`v0.4-plan.md` §16.1. The rest of this file is the proposal as submitted.
**Raised:** 2026-10-22, by Aneesh Sathe (written up by Opus 5.5). It unparks
`fable-round-queue.md` item 14 (public hoppers in the manifest, parked session 43) and
adds per-hopper feeds next to it.
**Reference build:** a draft PR on blygger/blygger-studio (from the blygger-studio-61
session) implements the shapes below so the ruling can be checked against running code.
If the ruling changes a shape, the build changes to match.
**Spec text:** this PR also carries the proposed normative text in
`protocol-v0.4.md`, marked PROPOSED in §17 and not in force: *hopper* in §2, a §4 row,
the `hoppers` key in §6.1, §12.1 step 7 (hopper match), hopper-subscription identity in
§12.2, the §13.5 exception and a new §13.5a (hopper feeds). It takes the recommended
answer to every question below. Fable may rule a different answer and edit the text,
or refuse it, before merge.
**Touches:** #12 (curation display, never re-emitted), #13 (discovery), #17
(resolution), #43 (version boundary), #85 (no permalink construction); spec §6.1, §7,
§12.1, §13.5, §13.6.

---

## 1. The trigger

Item 14 was parked with a trigger (`backlog.md` §1): *a second client, or blygger.com,
asking to discover hoppers by machine.* That has now happened, though from a third
direction. **The World Machines blyg** (`blyg.worldmachines.org`, studio 0.46.1,
protocol `0.4`) runs a bridge: members submit their public hopper URL
(`{mount}/h/{slug}/`), and the bridge wants to subscribe to *those hoppers*, not to each
member's whole blyg. A member's hopper is the subset they chose to put in front of
the group. The whole blyg is everything they wrote.

Today a public hopper is HTML only (#12, §13.5), so the bridge has nothing to poll.

## 2. The proposal

1. **A feed per public hopper**, at `{mount}/h/{slug}/feed.xml` in the reference
   client (the path is presentation; discovery is item 3), plus
   `<link rel="alternate" type="application/rss+xml">` on the hopper page.
2. **Every entry is a curation entry**, never a repost. Each entry:
   - links to the item's page at its origin (the held snapshot's `page`; failing that,
     the origin's item document, per #85, and never a constructed permalink);
   - carries attribution: author, source blyg and the origin;
   - carries **no `blyg:` namespace at all**: no `blyg:id`, no `blyg:version`, and no
     `<blyg:manifest>` on the channel;
   - never presents the item as the hopper owner's own.
3. **The manifest gains an optional `hoppers` key** listing public hoppers only:
   `"hoppers": [{ "title": "…", "page": "h/{slug}/", "feed": "h/{slug}/feed.xml" }]`,
   with paths origin-relative like `blogroll`. A private hopper has no feed and no
   listing. This is item 14, now with a reason to exist.
4. **Entry identity and order:** one entry per membership. The guid is built from the
   hopper slug, the item's origin and the item's id. Public hopper slugs are already
   frozen, because the studio's `slug_frozen` latch is set once a hopper goes public.
   Entries are ordered newest-added first, and `pubDate` is the time the item was
   added to the hopper, not the item's own publication time.
5. **Subscribing: a public hopper's feed can be subscribed to.** Resolution
   recognises it through the manifest (question (b), option 1). The subscription
   imports entries as L0 rows (§13.6). Each entry's `<link>` points at the origin, so
   a blyg-aware reader can resolve the origin item itself.
6. **The feed is the whole list, not a window**, and a subscriber drops entries that
   disappear. Plain L0 feeds have no withdrawal, so without this a subscriber would
   keep excerpts of items the source has withdrawn, which §13.4 forbids for displayed
   copies.

## 3. Questions for Fable

### (a) Is a per-hopper feed a re-emission under #12?

**Proposed answer: no**, provided every entry is a curation entry (item 2 above).

**Precedent already in the text.** §13.5's aggregator paragraph lets a site that
displays curated imported content "serve a plain RSS digest *outside* the blyg surface:
excerpts and links to origin permalinks, no `blyg:` namespace". A hopper feed is that
digest, one per list. #12's stated reason for refusing re-emission is mechanical: it
"would collide with `blyg:id` rollup + single-publisher invariant". A feed with no
`blyg:` elements, kept out of `feed.xml`, `items/index.json` and `items/`, collides with
neither.

**What would change in the text.** §13.5 places the digest *outside* the blyg surface
and says curation display uses "no manifest vocabulary". Item 3 puts the hopper feed
inside the publisher's mount and names it in the manifest. So the honest framing is
not "this is already allowed". It is: **does #12's line sit at `blyg:` semantics
(rollup, identity) or at the manifest's vocabulary?** We think it sits at the
semantics, and that a manifest list of links (item 14's original wording: "a list of
links is not a re-emission") is consistent with the decision's reason. The conflict
with §13.5's sentence is still there and needs to be named and ruled.

**Own items in a hopper.** The first draft treated a hopper's own items (`~own`) as an
exception that could be ordinary entries. **This draft recommends against that.**
Every entry should take the same curation shape, with no `blyg:id` even for the
owner's own items. A hopper feed whose own entries carry `blyg:id` becomes a second
blyg feed for the same origin, and a reader that rolls up on `blyg:id` would see the
same item arrive from two feeds of one publisher. The owner's own items already reach
blyg-aware readers through `feed.xml`.

### (b) URL and discovery: the resolution gap (the main finding)

**As §12.1 is written, neither the hopper page URL nor the hopper feed URL resolves to
the hopper.** Take `https://venkateshrao.com/blyg/h/ai-insights/`:

- **The page URL:** step 2 probes `…/h/ai-insights/blyg.json` and gets a 404. Step 4
  finds no `rel="blyg"` (the studio does not emit one). Step 5's conventional-mount
  probe fetches `/blyg/blyg.json`, finds the manifest, and **resolves the whole blyg**.
  Step 6, the RSS autodiscovery that would find the hopper feed, is never reached.
- **The feed URL:** step 3 sees a feed with no `<blyg:manifest>`, holds it as the L0
  candidate and continues. Step 5 then finds `/blyg/blyg.json` and **resolves the
  whole blyg** again. For a root-mounted blyg such as `blyg.worldmachines.org`, the
  `/blyg.json` probe does the same.

So the L0 subscription in item 5 cannot be reached by a reader that follows §12. The
reference client follows it (`blygger-studio/src/importer/resolve.ts`), so the bridge
would subscribe to members' whole blygs, which is the thing it is trying to avoid.
This is why item 14 and the feeds belong together: **the manifest has to say which
feeds are hopper feeds** for a reader to tell one from a stray feed under the mount.

Options, all of them reader changes (#43 test 1), and so 0.4 constructs:

1. **Manifest-listed (recommended).** When resolution reaches a manifest by any step
   and the input URL (or the feed found on the input's HTML) equals a `hoppers[].feed`
   or `hoppers[].page` entry, the reader resolves to a **hopper subscription**
   `{ origin, hopper_feed }`. Subscription identity stays the origin (§12.2), plus the
   feed's path. The manifest is the authority, as with `feed` and `items` under #51.
2. **A channel marker.** The hopper feed carries something like
   `<blyg:hopper manifest="…"/>`. This is a new wire element, and a reader still has to
   check it against the manifest, or any feed could claim to be someone's hopper.
3. **Step reorder.** If step 3 found a plain feed, skip step 5. This changes
   subscription identity for existing legacy inputs, and is not recommended.

### (c) Entry identity, order and body

Identity and order as in item 4 above. **For the body, we recommend an excerpt, not
the full held snapshot.** That is §13.5's own word for the digest, and it fits #12: the
words stay at their origin, and the feed points there. The full snapshot would make
the hopper feed a mirror of other people's text, which is what the
"display, not re-emission" line protects against. Where the item carries `cited`, or
the hopper membership carries a curator's note, the note may be the body, with the
excerpt under it.

### (d) L0 or blyg-aware?

**L0 for the entries' content** (item 5), so a hopper subscription imports summaries
and links and never becomes a transclusion source (§13.6). Under option (b)1 the
*subscription* is blyg-aware: a reader knows it is a hopper of a resolved origin, can
show that, and can offer "subscribe to the whole blyg". A reader that wants an
entry's real item resolves the entry's `<link>` itself, which goes through §12 to the
origin.

## 4. What the reference build will do meanwhile

The studio draft PR builds the publish side (items 1–4 and 6, with own items in
curation shape per (a)) plus the manifest key, behind a setting that is off by default
until the ruling. The subscribe side (§12.1 step 7, §13.5a rules 5–7) may be built
against the proposed text in the same draft. It must not bypass §12 for a single URL,
because that would be a non-conforming subscribe.

## 5. If refused

The aggregator pattern stays the answer. The World Machines bridge would display
members' hoppers by scraping or by subscribing to whole blygs and filtering locally
(the filter would be client-local). Either way the item 14 tombstone stays in
`backlog.md`, with this proposal as its record.
