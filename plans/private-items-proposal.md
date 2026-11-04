# Proposal — private items

**Status:** DRAFT, exploratory. Written session 59 (2026-11-04) by a research-only Opus
session. **Venkat answered §7 the same day; §8 records the answers and supersedes §2.1's
model (visibility is a property of publishing, orthogonal to drafts).** **Nothing here is ruled.** It awaits Venkat's answers to §7 and a Fable review of
the parts tagged **⚠️ FABLE** (all in §5, plus one optional item in §4.4). Everything else
is marked **Opus-buildable** under the four-question test (`CLAUDE.md` → *Model routing*,
decision #58). If Venkat takes it up, those parts get recorded as decisions with the
`Fable review pending` label.

**The request, as Venkat gave it:** a separate **private** status for items, alongside
*draft*. A private item is finished, but its author hasn't decided whether to publish it or
keep it private.

- A private item has a stable id and can be referenced (`![[id]]`, `[[id]]`, a TK source)
  from drafts and from other private items.
- Publishing an item that references a private item is blocked unless (a) the reference is
  removed, (b) the referenced item is made public first, or (c) "something like a
  paywall/permissioned-access gate condition is met".

**Short answer.** (a) and (b) are studio-only. The spec already makes an unpublished
target a publish error, so they reach nothing on the wire and are Opus-buildable today.
(c) cannot be done without reopening decision #7, and every serious form of it is L3. My
recommendation is to build (a) and (b) now, and defer (c) behind an explicit question to
Venkat about whether its backlog trigger has occurred.

---

## 1. What "private" is, in this codebase and in the protocol's terms

**In the protocol, a private item is a never-published draft, and nothing more.** The spec
says so in three places, so the feature needs no new wire rule:

- §4: `items/{id}.json` MUST 404 for "unknown ids and never-published drafts".
- §5.2: "Draft saves are invisible to the protocol."
- §10.2 step 3: "Drafts, unknown ids, withdrawn items with nothing retained, and L0 rows
  are publish errors." It also says a local id, "a draft or a published item", never falls
  through to the imported lookup.

Decision #7 ("Private content in v1 = never-published drafts (owner-only)") reads as if
written for this request. Requirement (b), "publish blocked unless the target is public",
is exactly what §10.2 already enforces. What the studio lacks is the *authoring-side*
half: a way to say "this draft is finished, let other working copies use it", and a
preview that renders it.

**So "private" is purely studio-side state.** No part of it reaches the wire. Once a private
item is published it is an ordinary item at v1, and every directive that names it bakes
its v1 snapshot by §10.2's ordinary rules (#9, #26). Before then its id appears in no feed,
index, item document, `links[]`, `transclusions[]`, `generated[].sources` or mention.

**How private differs from draft (the studio's distinction, not the protocol's):**

| | draft | private |
|---|---|---|
| Meaning | work in progress | finished; publish decision pending |
| On the wire | never | never |
| Referenceable from working copies (preview, picker) | no (preview placeholder, as today) | **yes** |
| Publishable | yes | yes (private → public is just *publish*) |
| A published item may reference it | no (§10.2) | no (§10.2), which is the block in requirement (b) |
| Discard | hard delete | hard delete, warning about working copies that reference it |

**Naming hazard (open question Q1).** "Private" is also the backlog's and roadmap's word
for L3: "encrypted or permissioned feeds: shared-key access to private items". If the
studio ships a "private" status now, a later L3 "private item" would mean something
different, namely readable by a group. One option: keep "private" in the UI and use a
neutral name in code and the `/api` contract (`held`, `sealed`). Another: use the neutral
word everywhere.

---

## 2. Data model and state machine — **Opus-buildable**

### 2.1 A flag, not a status value (recommended)

The studio distinguishes drafts in two ways: `items.status = 'draft'` and `version = 0`.
That second test appears in `rowDot` in `src/ui/authoring.tsx` and in the summary count in
`src/read-api.ts`. Every route that keeps unpublished items off the public surface tests
`status === "draft"`:

- `src/index.ts` (5 routes: the item JSON, pinned versions, page routes)
- `resolveTarget` in `src/transclusion.ts:189`

Feed, index and search queries all whitelist `status IN ('public','withdrawn')`.

**A new status value `'private'` would fail open.** Every `status === "draft"` check would
let a private item through. `GET items/{id}.json` would serve it, and `resolveTarget` would
try to bake it, then fail only because it has no `versions` row, with the misleading
reason "unknown item". Every check would need finding and changing, and a missed one leaks
an item the author chose not to publish.

**A flag fails closed.** Keep `status = 'draft'`, `version = 0`, and add one column:

```sql
-- migrations/0042_private.sql (0037 stays reserved)
ALTER TABLE items ADD COLUMN private INTEGER NOT NULL DEFAULT 0;
```

Every existing check then keeps refusing a private item, because it is still a draft. The
feature becomes purely additive: one studio-side resolver accepts it (§3.2) and the UI
shows it. An invariant `private = 1 ⇒ version = 0` is worth enforcing. Use a trigger in
the `SELECT RAISE … WHERE` form, and prove it on a throwaway remote D1, because `CASE … END`
breaks remote apply. Alternatively, clear the flag in `publish()`'s own `UPDATE`, which is
simpler. Publishing sets `private = 0` in the same batch statement.

**`/api` contract.** Add `private: boolean` to `ItemSchema`, a filter on `listItems`, and
one mutation, `setItemPrivate`, or fold it into the existing update. All of this is
additive. Bump the private contract minor version and regenerate the SDK. Third-party
tools, such as the Drafts action and the Obsidian plugin, see a private item as a draft,
which is safe. That is the client's contract, not the protocol's (#31).

### 2.2 Transitions

```
            mark private               publish (v1, one event)
  draft  ───────────────▶  private  ─────────────────────────▶  public ⇄ withdrawn
    ▲                         │                                   (unchanged, #8)
    └──────── reopen ─────────┘
  (both)  ── discard ──▶  gone (hard delete; nothing was ever public, §9)
```

- **draft → private:** a label. No content freeze. It is editable, and preview always
  shows the current working copy, because nothing is baked until the referrer publishes.
  (Q3 asks whether editing a private item should drop it back to draft.)
- **private → draft:** allowed. Working copies that quote it go back to a preview
  placeholder. The studio warns, listing them (§3.5).
- **private → public:** ordinary `publish()`, v1, one feed event. **Irreversible as an
  id.** From then on `items/{id}.json` is 200 forever (§4), and the only exit is
  withdrawal (#8).
- **public/withdrawn → private: not offered.** A published id can't be un-published, and
  offering "private" there would read as a promise the protocol doesn't make: remote
  copies and snapshots survive withdrawal (§9). If Venkat wants "withdraw, but keep it
  referenceable in my studio", that's a different feature (Q6).

### 2.3 Ids, pins, forks, withdrawal

- **Ids.** Minted at creation as today (§5.1). They are stable through draft ⇄ private →
  public, so a reference written while the target was private stays valid when it goes
  public. That is the point of the feature.
- **Pins.** A private item has no versions, so nothing can be pinned. Publishing it never
  pins automatically (#9). Pinning stays a separate act.
- **Forks.** `forked_from` names a pinned version (§5.6), which a private item never has.
  "Fork" is unavailable on a private item. A *duplicate* (a copy with no lineage) is fine.
- **Withdrawal.** Doesn't apply to an item that was never published. A *public* item that
  a private item quotes can withdraw as usual, and the private item's referrers hit the
  ordinary republish error when they publish (§10.2, unchanged).

---

## 3. Reference rules — **Opus-buildable** (except §3.4's optional relaxation)

### 3.1 Which constructs may name a private item, from a working copy

| Construct | In a working copy | At publish of the referrer | Notes |
|---|---|---|---|
| `![[id]]` transclusion (whole or partial) | yes; preview renders the private item's working copy | **blocked** while the target is private | partial selection is checked against the snapshot at publish, after the target is public |
| `[[id]]` link | yes; preview renders an anchor marked private | **blocked** | otherwise `links[]` (#79) would disclose an id whose document 404s |
| TK source (`![[id]]` inside a scope, #20) | yes; generation may read it (§3.3) | **blocked** | provenance needs a positive version (§5.7) |
| `stub_of` naming a local private item | no | n/a | stubs answer other people's items. Self-stubs aren't a studio action today, so don't add one |
| fork source | no (§2.3) | n/a | |
| `[text](url)` to the private item's future page URL | not inspected (the silent citation, #79) | not blocked; the link 404s until the item publishes | the studio MAY warn when the URL matches an own unpublished id |

**Which working copies may refer.** Venkat named drafts and other private items. A
published item's *pending changes* are also a working copy. I recommend allowing
references there too, since the block at publish is the same everywhere (Q2).

### 3.2 Where enforcement lives

- **`resolveTarget` stays as it is: the publish-time resolver.** It already refuses a
  private item, because the item is a draft. Change only its failure shape: a structured
  `code: "private"` (and `"draft"`) beside the `reason` string, so publish can tell "this
  is yours and private" from "unknown". This is the one change on the publish path.
- **A new `resolveForAuthoring(db, id, selfId)`.** It is `resolveTarget`, and on a local
  private hit it returns the working copy: rendered `content_md`, `version: 0`,
  `private: true`. Only preview (`src/preview.ts`, the `walk` placeholder path), the
  picker and TK generation call it. Publish never calls it. Keeping the two resolvers
  separate is what guarantees the block. A test pins it: publish with a private reference
  fails even though preview rendered it.
- **Nested private references in preview.** Render recursively through working copies,
  with a depth cap and a visited set. Working copies aren't baked, so §10.2's closure check
  (which walks baked versions) doesn't apply. A cycle between working copies renders a
  placeholder rather than recursing.
- **Hopper membership** has to refuse unpublished items. Verify it does, and add a test.

### 3.3 TK sources

Today, generation resolves sources through `resolveTarget` (`src/tk-generate.ts:57`). A
private source fails before the model is called. If private items are to be TK sources
(Venkat listed this), generation uses `resolveForAuthoring` and records
`{id, version: 0, private_hash}` in `tk_provenance_json`. That is studio-private
working-copy state, and it never reaches the wire as-is. At the referrer's publish:

- If the source is still private, publish is blocked, like any other private reference.
- If the source has since published, and its v1 `content_hash` equals the hash recorded
  at generation, rewrite the provenance entry to `{id, version: 1}`. That claim is
  literally true: the model read exactly v1's bytes.
- If the hashes differ, publish is blocked until the author regenerates. The provenance
  can't truthfully name a version the model didn't read.

This is #20/#44's rule ("sources are the versions actually drawn on") applied, not a new
rule. **Opus-buildable**, citing #20 and §5.7. Fable's batch review should check the
hash-equality rewrite specifically.

### 3.4 Publishing: the blocking error and its UX

At publish, collect every private reference before the first error. Publish already
gathers `errors[]` per directive. Refuse with a single structured error:

> **This item uses 2 private items. Published items can only use published items.**
> • `![[7c9w…]]` (quote): "Notes on stigmergy…" [Remove quote] [Publish it first]
> • `[[k2m4…]]` (link): "Draft essay on…" [Unlink, keep text] [Publish it first]
> [Publish all 3] [Cancel]

- **Remove reference** edits the working copy. A quote's directive line goes, along with
  any attached partial blockquote. A link `[[id | label]]` becomes `label`, or `[[id]]`
  becomes nothing. A TK source is dropped from its scope and the scope is marked as
  needing regeneration. The author sees the edit before publishing again. Nothing is
  rewritten silently: this is the explicit, visible rewrite #78 allows.
- **Publish it first** opens that item, or publishes it after a confirmation that names it.
- **Publish all** publishes the *dependency closure* of private items, dependencies
  first, then the referrer. Each item is its own publish event (no quiet publish). This is
  #78's multi-item publish rule ("one event per item … no quiet publish"), reused. The
  confirmation must list every item that becomes public, and say plainly that their ids
  will be served forever. This is the one irreversible act in the feature, and it must
  never be a side effect of the first click.
- **Transitive cases.** Private A quotes private B. Publishing A requires B public first.
  No exception and no "bake B's working copy into A": a baked snapshot needs
  `{id, version}` provenance (§10.3) with a version readers can fetch (§10.2, #26). The
  closure walk follows every private reference transitively, and also refuses any draft
  (non-private) reference, which is blocked as today.
- **Cycles.** Mutual *transclusion* between threads is already refused by the closure
  check. Mutual *links* aren't, and two private items that `[[link]]` each other are
  **deadlocked**. Neither can publish first, because each one's link needs the other
  public. The Opus-buildable answer is to detect the cycle, say so, and offer "unlink in
  one of them; re-add after both are public" (A at v2).
  **⚠️ FABLE (optional):** letting a multi-item publish resolve `[[id]]` against items
  published in the *same act* would remove the deadlock. Four-question test: Q1 no; Q2 no;
  **Q3 yes**, because it reinterprets §10.2 step 1's "currently-published" and #78's
  ordering. Not needed for a first build.

### 3.5 Preview and the picker: reconciling the picker's invariant

The search route (`src/read-api.ts`) is deliberately "exactly what `resolveTarget` will
accept at publish, so the picker never offers something the author then can't publish".
Private items break that invariant on purpose. Reconcile by **scoping**, not by widening
the default:

- The default picker stays as it is: published and resolvable imported items only.
- An explicit **private** scope (a tab, or `source=private`) lists private items. Each
  carries a badge, *private — blocks publish until published*. The new invariant is: *the
  default scope offers exactly what can be published; the private scope offers what can
  be previewed, and says so*. The search work's opt-in drafts scope (described to me as
  `docs/search.md`, which isn't in `blygger-studio/docs/` as of this writing) is the same
  shape. Private should be one of its scopes, not a second mechanism.
- Inline, the editor marks each private reference as *blocks publish*, before the author
  reaches the publish button. This parallels the §10.2 SHOULD to warn about unpinned
  remote quotes.
- **Referrers list.** On a private item: "used by 3 working copies". Use `instr()`, not
  `LIKE`, over `items.content_md` (D1's 50-byte cap). It shows when reopening to draft or
  discarding.

### 3.6 Four-question test for §§2–3

1. Does a reader, receiver or importer have to change? **No.** Nothing new reaches them.
   A private item is a §4/§10.2 draft.
2. Is anything readers see added, removed or renamed? **No.**
3. Does it narrow, widen or reinterpret a locked decision? **No.** It is a label on a
   subset of #7's never-published drafts. The publish block *is* §10.2 step 3. The
   multi-item publish reuses #78. The TK rewrite applies #20. (Exception: §3.4's
   optional same-act resolution, tagged above.)
4. Is there a citable principle? **Yes.** #3 (the studio is unconstrained, the protocol
   governs only the page), #7, §10.2 step 3, #78, #20.

→ **Opus rules and builds**, recorded with `Fable review pending`.

---

## 4. What can leak, and the tests that pin it — **Opus-buildable**

The flag design keeps every existing refusal, but these must stay closed, each with a
test:

- **Public routes** (`src/index.ts`): item JSON, pinned version JSON, item pages under
  every kind prefix, `feed.xml`, `items/index.json`, hopper feeds, the front page, and the
  manifest's counts if any. A private item gives 404 or is absent.
- **Publish path:** a published `content_html`, `transclusions[]`, `links[]`,
  `generated[].sources` and `stub_of` never contain a private id. Test it with a fixture
  that mixes a private reference with a valid one.
- **Mentions:** none sent for a private item's own outbound references until it publishes.
  Sending already happens only at publish. Pin it with a test anyway.
- **`/api` and MCP:** owner and delegated-token reads see private items exactly as they
  see drafts today. Check the scope that read tokens get (`src/auth-scopes.ts`), and
  decide whether a private item should need the same scope as a draft (Q5).
- **AI providers:** TK generation with a private source sends its text to the configured
  provider. That already happens to the item's own draft text. Say so in the UI. It is
  the owner's call.

---

## 5. Option (c): a paywall or permissioned gate — **⚠️ FABLE**

Requirement (c) means a published item that references a private item could publish
anyway, with the private part visible to *some* readers. That is privileged-group access,
which **decision #7 defers to L3**. Spec §3 lists L3 as "*(future)* Encrypted/permissioned
content", §16.7 reserves it, and the backlog's L3 row gives its trigger: *"a real need for
private circulation between named readers, and a full Fable crypto round; nothing before
the 1.0 freeze"*. Its listed decisions: #1, #7, #11 ("keys imply identity"), #13.

Three shapes, from least to most wire:

### C1. Studio-only gate: two renditions, a redacted wire

At publish, an explicit, visible rewrite (as #78 allows) replaces each gated reference
with ordinary markdown, for example *"[a passage for subscribers]"*, or nothing. The
redacted text is what reaches the wire. It's hashed and published normally. The full
rendition is served by the studio, outside the mount, to readers who pass a studio-side
check: a login, a paid token, a list of invited emails.

- *For:* nothing new on the wire. Readers, importers and receivers are unchanged (#43).
- *Against:* it is privileged-group access in v1, which **narrows #7**. It needs a studio
  notion of *readers* with credentials. Today's studio auth is owner plus delegated tool
  tokens (#31's direction, #52), and readers are a new auth population. **One id would
  have two contents.** #20's principle that "the hash covers exactly what readers read"
  then holds only for the public reader, and a member who quotes the gated passage is
  quoting bytes no `content_hash` covers, so §10.2's partial-quote check can't verify it.
  Membership is also identity-adjacent: not protocol identity (#11 stays untouched), but
  the first time the studio has to know *who a reader is*.
- *Four-question test:* Q1 no. Q2 no. **Q3 yes: it reinterprets #7.** Q4: no principle
  settles it, because #7 is the principle and it says *defer*. → **⚠️ FABLE.**
- *Touches:* #7, #3 (is a members' rendition "studio" or "page"?), #20, #31/#52 (reader
  auth), #11/#35 by adjacency; spec §5.1 (`content_hash`), §10.2 (partial quotes), §14.

### C2. A protocol construct for gated references or gated items

A wire marker such as a baked `blyg-gated` placeholder class, a `gated[]` member, an item
document that answers 200 with a gate descriptor instead of content, or a 401/402 on
`items/{id}.json`.

- *Against, structurally:* #1 is a *static* file contract, and a gate that depends on
  who asks is not static. §4's 404/200 rules have no third answer. A `transclusions[]` or
  `links[]` entry naming an unreadable target breaks §15.4's structural verification. Q1
  yes: readers must render something, and receivers must verify against what they can't
  fetch. Q2 yes. Q3 yes (#7, #11, #35: "who is permitted" is identity). This is a **new
  protocol version by #43**, and backlog §1 says nothing before 1.0.
- *Touches:* #1, #7, #11, #35, #43; spec §3 (L3 row), §4, §5 member table, §10.2,
  §10.3, §10.3a, §13, §15.4, §16.7. → **⚠️ FABLE, entirely; this is L3.**

### C3. L3 proper: encrypted static content

Encrypted bytes under the ordinary static paths, with keys distributed outside the
protocol. Of the three, this fits #1 best (static files stay static) and is the shape the
roadmap anticipated ("shared-key access to private items, key rotation and revocation").
It's a crypto design and a full Fable round: roadmap Post-1.0, ⚠️ FABLE entirely.

### Not an option: a gated page over an open JSON

Hiding part of the HTML page while `items/{id}.json` carries the full text gates nothing.
It's mentioned only so nobody builds it.

### Recommendation for (c)

**Defer, with one question to Venkat (Q4).** Build (a) and (b) now. They cover "finished
but undecided" completely. If a real case exists today, for example a paid tier for a
newsletter-sized audience, it is the backlog L3 row's trigger ("a real need for private
circulation between named readers"), and the honest next step is to put **C1 versus C3**
before Fable as a question about #7. C1 is shippable in a studio and hard to retract once
readers pay. C3 is principled and post-1.0.

---

## 6. Phased build plan

**Phase 1 — private as a label, the publish block, and the error UX (Opus, one studio
minor release)**

- Migration `0042_private.sql` (flag column; invariant enforced in `publish()`, and
  optionally a trigger proved on a throwaway remote D1).
- `ItemRow`, `ItemSchema`, a `listItems` filter, a `setItemPrivate` mutation; bump the
  contract minor version and run `npm run sdk:generate`.
- `resolveTarget` failure codes (`private`, `draft`); collect *all* private references
  before refusing; the structured publish error.
- UI: a **private** filter in the compose list (all / drafts / private / changes / public
  / withdrawn), so the drafts count excludes private ones; a row dot; a mark-private /
  reopen action; the referrers list; discard and reopen warnings; the catalog wording.
- Tests: every leak path in §4, plus *preview renders and publish refuses the same
  reference*, the referrers lookup, and reopen and discard warnings.

**Phase 2 — authoring resolution (Opus)**

- `resolveForAuthoring` for preview (nested, cycle-safe) and the picker's private scope
  with its badge. Coordinate with the search work's scopes, not a second endpoint.
- Remove-reference actions; **Publish all** over the dependency closure (one event per
  item, dependencies first, with an explicit confirmation listing ids); detecting and
  explaining a link cycle.
- Tests: closure order, the cycle message, "publish all" refusing when any member fails
  validation (pre-flight everything before the first publish, which is the atomicity
  lesson recorded for tangling), and no publish starting from a single click.

**Phase 3 — private TK sources (Opus, Fable batch review of §3.3's rewrite)**

- Generation via `resolveForAuthoring`, `private_hash` in `tk_provenance_json`, and the
  publish-time hash-equality rewrite or the regenerate block.

**Phase 4 — the gate (⚠️ FABLE; not scheduled)**

- Only if Q4 says the trigger has occurred. Then a Fable round on C1 versus C3 against #7.

**Waits on Fable:** §3.4's same-act resolution (optional) and everything in §5. **Nothing
in Phases 1–3 waits.**

---

## 7. Open questions for Venkat

1. **Name.** "Private" in the UI, given that L3 will later use the word for group-readable
   items? Or a neutral name (`held`, `sealed`, `undecided`) in code and `/api`, or
   everywhere?
2. **Which working copies may refer to a private item:** only drafts and private items, as
   stated, or also a published item's pending changes? I lean to all working copies, since
   the block is at publish either way.
3. **Does editing a private item drop it back to draft?** "Finished" suggests a light
   freeze. I lean to *no*: a label, freely editable, with preview always current.
4. **Option (c): is there a concrete case now** (who would pay, or who would be let in)?
   If yes, that's the L3 backlog trigger, and §5 goes to Fable as C1 versus C3. If no,
   (c) is deferred and recorded in the backlog row as requested again.
5. **Delegated tokens:** should a tool holding a read scope see private items as it sees
   drafts, or should private items need a separate scope?
6. **Withdraw-but-keep-referenceable:** do you also want an already-published item to be
   usable in your own working copies after withdrawal? That's a separate feature. It
   isn't "private", and nothing here builds it.

---

## 8. Venkat's answers (session 59, 2026-11-04) and what they change

He answered §7 the same day. Where an answer departs from §§2–3, the answer wins, and this
section says what changes.

1. **Names: a Unix-style hierarchy, *user* / *group* / *others*.** The levels are
   **private** (the owner only), **group** (a named set of readers) and **public**
   (everyone, the wire as it is). "Private" is the owner-only level; "group" is the level
   L3 will need. The word "private" is not saved for later.
2. **A published item's pending changes may reference a private item.** Publishing those
   changes hits the same block as any other publish (§3.4).
3. **Draft is orthogonal to visibility.** Private/public is a property of *publishing*,
   not a kind of draft. A private item has versions, a working copy and pending changes,
   like a public one. **This replaces §2.1's model** (private = a draft with a flag).
   Pins make no sense below public, since a pin is a public hosting promise (§8), so
   private and group items can't be pinned.
4. **Paywall/gate: not yet, but getting closer.** Enterprise deployments are under
   discussion. Option (c) stays deferred. Enterprise is the concrete case that will open
   L3 (§5's C1–C3).
5. **Tokens must evolve to match the visibility hierarchy.** Scopes need to tell
   private, group and public apart (for example, reading private items is not the same
   scope as reading drafts).

### 8.1 The revised model

Each item has two independent axes:

- **Lifecycle**, as today: never published, or published at version *n*, with
  `dirty` working-copy changes. "Publish" makes a version.
- **Visibility**, new: `private` | `group` | `public`, stored as a `visibility` column.
  Only `public` reaches the wire. `withdrawn` stays a public-only state (#8).

So "publish privately" creates a `versions` row that no public route serves. Raising
visibility (private → public) is a publish event on the wire. Lowering it (public →
private) is not offered, for §2.2's reason: withdrawal is the only exit from public.

**This brings back the fail-open risk that §2.1 avoided.** A private item now has versions
and a non-draft lifecycle, so any route that refuses only `status === 'draft'` would serve
it. The build therefore starts by changing every public-surface check from a deny-list to
an allow-list. That means one predicate, `servedPublicly(item)` (visibility `public`,
status `public` or `withdrawn`), used by every route in `src/index.ts`, by `resolveTarget`'s
publish path, and by the feed, index and search queries. A test enumerates the public
routes and asserts that a private item with versions 404s on each one. Opus-buildable; it
is the gating task.

### 8.2 The one new spec question — **⚠️ FABLE (small)**

**What version number does a private item's first public version carry?** A private item
may reach version 3 before it goes public. On the wire, `version` is a bare counter, +1 per
publish event (#19), and the changelog has one entry per version (§5.2). The options:

- **(a) Public numbering starts at 1.** Private versions are studio history, like a draft's
  saves, and the public changelog begins at the first public version.
  **Recommended:** nothing on the wire changes, and no private note leaks into a public
  changelog.
- **(b) Public numbering continues (v4).** Then either the changelog lists v1–v3, which
  leaks private notes, or it omits them and the counter skips, which no reader expects
  under #18's watermark.

Option (a) needs the studio to keep two counters: a private one in the studio and the
public one on the wire. Question 3 of the four-question test (does this reinterpret a
locked decision?) comes out as a *maybe*, on #19 ("+1 per publish event": is a private
publish a publish event?). So it goes to Fable for one sentence, either confirming (a)
under #19 or ruling otherwise.

### 8.3 Group and tokens — **⚠️ FABLE when enterprise lands**

**Group** is L3 (§5, C1–C3). It needs:

- reader identity (#11, #35: identity is never in the protocol);
- either a gated rendition or encrypted content on the wire (#1, #7);
- a rule for what a group item's reference does to a public referrer (§3.4's block
  applies until then).

Build nothing at group level now. The enterprise deployment is the measured need that
opens the Fable round.

**Tokens:**
- **Opus-buildable now, within #31/#52's invariants (the token model is the client's
  contract):** a private-read scope distinct from draft access, and private-write implied
  by publishing scopes.
- **⚠️ FABLE with group:** group-scoped tokens, because they name group membership, which
  is identity.

### 8.4 Revised phase order

1. The allow-list refactor and its route-enumeration test (§8.1). This is the gate: nothing
   private exists until every public route refuses it.
2. `visibility` column (migration), publish-privately, raise-to-public, and the
   publish-time block for references to private items (§3.4, now applying to pending
   changes of published items too). No pins below public.
3. Fable's sentence on §8.2. Raise-to-public waits on it if the ruling is (b).
4. Search and picker scopes: private items are in the compose search's *this blyg only*
   (blygger-studio `docs/search.md`); the picker offers them only to working copies
   that can't publish them without the block.
5. The token scope split (§8.3, Opus part).
6. Group: deferred to the L3 round, triggered by enterprise.
