# Proposal: replace tombstone/retract with unpublish-as-endcap + pinned versions + fork

**Status:** ADOPTED WITH MODIFICATIONS — Fable, session 3 (2026-07-24). Decision record:

1. **§3 adopted.** No permanent delete exists. Unpublish and delete merge into **withdraw**:
   a permanent endcap (version bump, empty content, optional note, `kind: "withdrawn"`,
   item file 200 forever, one feed entry). Reversible by republish (vN+1, same id). The
   studio working copy survives withdrawal — it governs the public surface, not the studio.
2. **§4 adopted as option (a)** — a pin is an irrevocable *hosting promise*, not a mere
   citation label. Only explicitly pinned versions get per-version files
   (`items/{id}/v{n}.json`); exposing all versions was rejected because it would destroy
   withdrawal semantics and the session-2 history-withholding interpretation. §7 resolved:
   **pins survive withdrawal** — they are per-version records independent of the live
   stream's status. Media referenced by pinned versions must be retained forever.
3. **§6 modified:** pinning does **not** force a fork on further edit (deviation from
   Venkat's original framing — forced forks would break feed rollup and thread continuity
   for routine polish edits). The live stream continues under the same id; the pin
   guarantees only the citation. `forked_from: {id, version}` (MUST reference a pinned
   version) is reserved in the §2.3 spec now, implemented in v0.3 with threads. Full
   "enshrine" (close the id, successor forks) is notable as a future composite
   (pin + finalize-flavored endcap) if wanted — not built.
4. Pinning emits no feed event in v0.1; the changelog `pinned` flag is the signal.

Normative text lives in `docs/v0.1-plan.md` (§2.3, §2.8, §3.1, §3.3); this doc is
historical rationale from here on.

---

Original draft header: written by Sonnet from a
session-3 design conversation with Venkat (2026-07-24); origin was wireframe review of the
public byline, which surfaced a real gap in the retract/delete model.
**Touches:** locked decisions #2 (IDs/hashing) and the shipped v0.1 retract/delete
implementation (`worker/src/model.ts` `unpublish()`/`deleteItem()`, `worker/src/index.ts`
404 gating, `listPublic()`). Any of this landing means reopening tested v0.1 code, not just
docs.
**Overlaps:** v0.3 threads, v0.4 TK-transclusion (both already ⚠️ FABLE) — forking and
per-version citation are close to primitives those phases will need anyway.

## 1. The gap that started this

v0.1 shipped two withdrawal mechanisms (`v0.1-plan.md` §3.1, built session 2):

- **Unpublish (retract):** `items.status → 'draft'`. Every public surface (`feed.xml`,
  archive, permalink, `items/{id}.json`) 404s or drops the item immediately
  (`index.ts:61-62`, `listPublic()` filters to `status IN ('public','deleted')`). No trace
  survives at the canonical URL. Version history and `content_md` are retained internally
  but never exposed again unless republished.
- **Delete of a published item → tombstone:** permanent `status='deleted'`, `kind='tombstone'`,
  content emptied, version bumped, **200 forever** at the canonical URL (`index.ts:61-62`
  explicitly exempts tombstones from the draft-404 check). This is the only one of the two
  that gives future/backfilling subscribers a positive signal.

The problem: retract's silent 404 is indistinguishable, to a subscriber client, from "this id
never existed" or "the server is briefly down." A v0.2+ importer polling an id it previously
fetched has no way to tell "author pulled this back to draft, please forget it" apart from
transient failure. Only delete gets an honest signal; retract doesn't, even though retract is
the *more common*, non-destructive action.

## 2. First patch considered, and why it was rejected as insufficient

Initial idea: make retract publish a feed event a compliant client can act on, the way
tombstones already do. But for that to help a subscriber who backfills *after* the event
scrolls out of the 50-entry feed window (not just one watching live), the item's permanent
URL can't revert to 404 — it has to keep answering 200 with a marker, same as a tombstone.
At that point retract's wire representation **is** the tombstone mechanism: version bump,
emptied content, permanent 200, feed entry. The only surviving difference is reversibility
(retract expects a later republish; tombstone has no revival path today) — a real fork in
the state machine, not just a naming difference. This is a valid design, but it's a patch,
not a resolution — it papers over a conflation rather than naming it.

## 3. The conflation, named

Venkat's read: **tombstone is doing two unrelated jobs at once.**

1. **"No more changes will happen here"** — an end-of-mutation signal. This is really what
   retract wants too: "the live stream at this id has stopped being updated (for now or for
   good), stop expecting new versions, roll up to null and drop it from your archive if you
   respect the protocol."
2. **"This content is permanently gone and should never be seen again"** — an actual erasure
   claim, which the current design already half-admits is *not fully honest* (remote copies
   survive regardless — that was the original rationale for tombstones existing at all).

Proposal: **drop function 2 entirely.** There's no real "permanent delete" available in this
paradigm — anything published to the open web has already left the origin's control the
moment a reader fetches it. Pretending otherwise (a distinct "deleted forever" state) doesn't
buy honesty, it just adds a state. Fold delete into unpublish: **unpublish becomes the single,
permanent, non-404 endcap** — "this id's published stream has stopped; here's the record that
it did; compliant clients roll it up to null and remove it from their local archive." One
state, one signal, applies whether the author calls it "retract" or "delete" today.

## 4. Pinned: recovering the thing tombstone's job #1 was reaching for

Separately from "has this id stopped updating," there's a real, distinct need: **"is this
specific version safe to cite forever."** Today nothing in v0.1 answers that — even the
*live*, non-retracted latest version isn't guaranteed stable, since editing it bumps the
version and changes what the same permalink shows.

Proposed new concept: **Pinned** — marking a specific version of an item as a stable,
citable reference point. Practically this needs less new machinery than it sounds like it
does, because the data model already has almost everything:

- Every version already gets a `content_hash` (`model.ts:60`, `contentHash()`) — content-addressed,
  immutable, computed at publish time. This is already exactly IPFS's CID role (see §5).
  v0.1 just never exposed old versions at a fetchable URL — `content_md` for past versions
  is "kept in the DB but not published in v0.1" (`v0.1-plan.md` line 54).
- So "pinning" doesn't need a new flag so much as it needs **every version to get its own
  permanent, addressable URL** (e.g. by id+version, or by hash). Once that exists, citing a
  specific version *is* pinning it — same as citing a CID in IPFS doesn't require a separate
  "pinned" bit, because content-addressing already makes it permanent by construction.
- Open question for Fable: is "Pinned" (a) a **hosting/retention promise** ("the origin
  commits to keep serving this specific version forever, even past retraction of the live
  id"), or (b) a **reader-facing citation-stability label** on content that was already
  immutable the moment it was hashed? These are different guarantees with different failure
  modes — (a) can be broken if the origin goes down (the same honesty problem that motivated
  tombstones originally); (b) is just "we promise never to change what's at this URL," which
  a single-origin server can actually keep without new mechanism.

## 5. IPFS / IPNS mapping

The proposal lines up with a working, well-understood pattern more cleanly than it first
looks, because blyg's data model was already built with half of it in mind (locked decision #2
explicitly cites IPFS-friendliness as the reason for per-version hashes):

| blyg concept | IPFS/IPNS analog | Notes |
|---|---|---|
| item **id** (stable random 128-bit, mutable stream of versions) | **IPNS name** | A pointer that resolves to "whatever's current." Updated by whoever holds authorship. |
| per-version **`content_hash`** | **CID** | Already content-addressed, already immutable, already computed today — just not exposed as its own fetchable resource. |
| proposed **Pinned** version | citing/pinning a **CID** | In IPFS, "pin" = a hosting commitment, not a source of immutability — immutability is free from content-addressing. Worth deciding which of the two Venkat's "Pinned" is meant to be (see §4). |
| proposed **fork** | new IPNS name seeded from a CID | Git tag→branch is the closer everyday analogy: the pinned version is the tag (immutable), the fork is a new branch continuing from it. |
| unpublish-as-endcap | an IPNS record that stops being republished | Diverges from IPFS here: IPNS records have a TTL and expire without active republishing (DHT liveness). blyg's id has no such decay — it's centrally hosted, closer to a **DNS name pointing at one authoritative server** than a DHT record. Durability is "the origin stays up," not "the network keeps propagating the pointer." Don't over-import IPNS's expiry semantics. |

## 6. Fork: the genuinely new protocol surface

This is the part that isn't free. Locked decision #2 states identity is stable and *never*
content-addressed, specifically so editing preserves identity — forking deliberately breaks
that by minting a **new** id when continuing past a pinned version. That needs an actual new
field/relationship that doesn't exist anywhere today: a lineage pointer, e.g.
`forked_from: {id, version}`, and decisions about:

- Where it's exposed on the protocol surface (item JSON? a new manifest field? the feed?).
- Whether a fork is required, or just customary, once a version is pinned — i.e., can an
  author still edit *forward* past a pinned version under the same id (new vN+1, pin stays
  addressable at its own URL), or does pinning hard-force a fork?
- How this interacts with v0.3 threads and v0.4 TK-transclusion, which will likely want the
  same "reference a specific stable version of another item" primitive — this may be the
  same primitive arriving early, and worth designing once rather than twice.

## 7. Open question this proposal doesn't resolve

If unpublish absorbs delete's job as the permanent endcap, and pins are permanent
independent of that: **does retracting an id's live stream leave its already-pinned versions
fetchable, or does retraction take the whole id down, pins included?** Venkat's stated intent
("reliably referenced") argues pins should survive retraction of the live stream — which
means pins can't be modeled as a sub-state of the item's draft/published status; they need
their own permanent record per version, independent of what the "current" stream is doing.
This is a state-machine design call, not a naming one.

## 8. What changes in already-shipped code if this lands

Flagging scope, not deciding it:

- `worker/src/model.ts`: `unpublish()` needs to stop being a pure status flip — it needs a
  version bump + permanent marker, matching what `deleteItem()` does today. `deleteItem()`
  as a distinct "delete" path may be removable entirely per §3.
- `worker/src/index.ts:61-62`: the draft→404 gate needs to change to whatever the new
  permanent-endcap state is; a new route/shape is needed for fetching a specific pinned
  version.
- `listPublic()` / archive / `feed.xml`: need to decide whether retracted-but-endcapped items
  and pinned versions appear in archive listings, and how.
- D1 schema (`items`, `versions` tables): likely needs a `pinned` marker on `versions`, and
  possibly a `forked_from` column; `items.status` enum shrinks by one state (no more
  `'deleted'` distinct from retracted-endcap) or is redefined.
- `docs/v0.1-plan.md` §3.1 and the CLAUDE.md locked-decisions list would need updating once
  Fable settles the shape — this proposal deliberately doesn't edit those, to avoid a
  Sonnet-authored change to locked protocol semantics.

## 9. Recommendation

Sonnet's read: this is a better foundation than patching retract in place (§2) — it separates
two things v0.1 conflated into one ("is this id still live" vs. "is this version safe to
cite") — but it's real new protocol surface (fork/lineage), reopens tested v0.1 code, and
overlaps v0.3/v0.4 scope. Recommend Fable evaluate and, if adopted, redo the affected sections
of `v0.1-plan.md` (or spin a `v0.1.1` addendum) before task 9 (studio UI) build resumes, since
studio's item list already needs to render whatever the final withdrawal/pin states are.
