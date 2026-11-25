# Sealed content and private items in the reference client — build plan

**Plan of record for blygger-studio · session 81, 2026-11-22 · Opus 5.5 with Venkat.**
RFC-6 ([`docs/rfcs/rfc-6-sealed-content.md`](rfcs/rfc-6-sealed-content.md)) in the studio,
preceded by the owner-only private items of
[`plans/private-items-proposal.md`](../plans/private-items-proposal.md) §8. Like
[`mentions-build-plan.md`](mentions-build-plan.md), this is the build order and the
client's choices; the wire is RFC-6's, and where this plan needs a wire answer it says
which RFC item it waits on.

## 0. Gates and what Venkat decided

- **RFC-6 is open for comment until 2026-11-28.** v0.5-plan §0: nothing of it is built in
  the studio before the close, when Fable revises the rulings and promotes it as a note
  (#90). Phases 1–4 below start after that, and are re-read against the revised RFC first.
- **Venkat, session 81:** (1) run the **R8 probe now**, before the close, throwaway, so the
  suite (item 3) and padding (item 4) are ruled on measurements; (2) **start Phase 0 now**:
  private items are ruled (#94) and not gated by RFC-6; (3) this plan lives here.
- **Model routing (#58).** Phase 0 is client contract and Opus's. Phases 1–4 build ruled
  wire; any question the build raises about the wire goes to Fable as a finding, not a
  guess.

## 1. Phase 0 — private items (owner-only), buildable now

Venkat's model (private-items §8, memory of session 59): visibility is `private` (the
owner), `group` (later: it *is* a sealed item, §6 below) or `public`, **orthogonal to the
draft lifecycle**. A private item has versions, a working copy and pending changes; it is
never pinned; raising to public is a publish event whose first public version is **v1**
(#94); lowering is not offered (withdrawal is the only exit, #8).

**0a. The allow-list refactor — the gate.** Today the public surface refuses by deny-list:
about 70 status comparisons across 26 server files (`pages.ts`, `public-feed.ts`,
`read-api.ts`, `index.ts`, `front-page.ts`, `transclusion.ts`, `mentions/receive.ts`,
`syndication.ts`, `feeds/history.ts`, …; some test imported items' status and are out of
scope). Each own-item check on a public path becomes one predicate,
`servedPublicly(item)` (visibility `public` and status `public` or `withdrawn`), and the
SQL forms one shared fragment. Then a test that **enumerates the public routes** (pages,
pinned pages, item documents, pins, feed, index, hopper feeds, front page, mention
receipt's target check) and asserts a private item with versions 404s on every one, and
is absent from feed, index, search's public scope and sitemap-like lists. The enumeration
is the test's real value: a new public route that forgets the predicate fails it. Ships
alone, with no visible change.

**0b. Visibility: a status value, not a column** (Venkat, session 81; departs from
private-items §8.1). A privately published item has `status = 'private'`. About 25 public
queries are already allow-lists (`status = 'public'`, `IN ('public','withdrawn')`) and
exclude it unchanged; with §8.1's `visibility` column each would serve a private item
until it gained a second test. Only the six deny-lists (`status === 'draft'`: five routes
in `index.ts`, the transclusion resolver) can fail open, and 0a converts them. The
draft/visibility orthogonality of Venkat's model holds: a private item has versions, a
working copy and `dirty` pending changes; *draft* still means never published.
`items.status` has no `CHECK`, so no table rebuild; widening the TypeScript union makes
the compiler list every switch on status. A private version counter apart from the public
one (#94: private history is studio history; the public counter starts at 1).
Publish-privately, raise-to-public, no pins below public. *Group* never becomes a status:
it is a sealed item (§6), public on the wire.

*Built (session 81, branch `feat/private-items`, not yet merged):* private versions
live in their own table, `private_versions` (migration 0059), which no public query
names, so a route that forgot the status would still find nothing to serve. The public
counter is `items.version`, untouched by a private publish, so raising is an ordinary
publish and v1 falls out. The API is `POST /items/{id}/publish` with
`visibility: "private"` (private contract 6.4.0). A private publish resolves and
renders nothing, sends no mentions and publishes no tangled parts. Pins need a row in
`versions`, so a private item has nothing to pin. Discard deletes a private item with
its private versions. Venkat approved four laws (2026-11-22), now oracles: *public
surface*, *raise to public* and *publish block* (`test/private-items.oracle.test.ts`),
and the media-visibility law change ("media used only by private versions stays
private"). Left for 0d: the owner's search (`read-api.ts`, `status IN ('public','draft')`)
drops private items, and the compose list files them under *drafts* with their own dot.

*Also built (session 81, same branch, local commits `752e658`, `46edfdc`):* a
**default-visibility** setting (`default_visibility`, public or private), so a blyg can
be a private notebook that occasionally shares. An unpublished item's publish follows the
setting unless the API call names `visibility`. The editor shows a public/private radio
next to one **add version** button, and confirms before anything goes public. The
owner's own blyg appears in their reader's sources, with private items marked. Two more
approved laws became oracles: *default visibility* and *owner reader*. Private versions
are numbered apart from the public counter (p1, p2, …), and a list view of them is
proposed for 0.72.0. Shipping is planned as **0.72.0 alone**, after 0.71.0.

*Shipped (session 82, studio 0.72.0, merged #175, live on three nodes):* the above, plus
the p1/p2/… list (`GET /items/{id}/private-versions`, the history panel), *Publish mode*
and *Notebook mode* as the names of the two defaults, a **private** tab above compose in
Notebook mode (the reader's `private` source), the editor's *reader view* link for private
items, and private reader cards without public links. Oracles added: *private history*,
*private conflict* (409 on a raced private publish), and the publish block widened to
draft and withdrawn targets. 0d's owner search and compose-list items remain.

**0c. References.** Working copies (including a published item's pending changes) may name
a private item; **publishing them is blocked** while they do (private-items §3.4). TK may
draw on a private source only for private output.

**0d. Search, picker, tokens.** Private items are in the owner's own search and the
picker; a **private-read scope** distinct from draft access (§8.3, Opus's part); publishing
scopes imply private-write. Group-scoped tokens wait for Phase 3 (they name membership).

*Built (session 83, studio [#178](https://github.com/blygger/blygger-studio/pull/178), in review):* 0c's TK half (an own private item is a source for a caller that may see it; a public publish is refused while provenance names one); 0d's `owner:private` scope (owner:read does not imply it; tokens minted before lose private access, Venkat's call), a per-resource guard in the operation runner, private items left out of every list for tokens without it, compose search over private working copies (migration 0061); the hopper fix. Laws approved session 83: *private source*, *owner search* (draft, private or public items, private marked; corrected from a draft that also said withdrawn, which search never listed), *private scope*, *no leak*, *hopper visibility*. Left: the `[[` picker (ROADMAP row 157), and 0e's non-route surfaces as tests (mentions, `links[]`, Agentic editions, catch-up, exports), which read only public versions or imports today.

**0e. Leak tests** (private-items §4): feed, index, mentions sent, `links[]`,
`transclusions[]`, search, Agentic feed editions, catch-up, the MCP surface, exports and
backups' public half.

**0f. The laws as "For every" sentences** (session 85, 2026-11-24, after #178's
independent review found the session-83 laws held only where a test had been written
for them). These are the statements the oracles enumerate; each names its domain so a
new route, field or surface falls inside it by default. Venkat's session-84 rulings
(*private taint*, *hidden is not gone*) and session-85 rulings (Q1–Q3 below) are folded in.

*Terms.* A caller **sees private** when it is the owner's browser session or a token
holding `owner:private`; every other token is **restricted**. A working copy is
**tainted** when its server-written provenance names a private snapshot. For a
restricted caller, a **hidden item** is a private item, or a draft whose working copy is
tainted (it has no public version, so the working copy is the whole item); a **hidden
working copy** is the tainted working copy of a public or withdrawn item.

1. **Private scope.** For every restricted caller, every hidden item and every
   `/items/{id}` operation (REST and MCP), the answer equals the answer for an id that
   does not exist (status, error code and message), and no write takes effect.
2. **No leak.** For every response to a restricted caller (lists, counts, search,
   reader, hopper members and feeds, shelf, Agentic editions, catch-up, freshness,
   preview, MCP tool output, error bodies), no hidden item's id, title or text appears,
   no hidden working copy's text or provenance appears, and no message says an item is
   private: a reference to one reads as a reference to an unknown item. A public item
   with a hidden working copy stays visible as its latest public version (**Q2**,
   session 85: taint hides the working copy, not the item).
3. **Private source.** For every TK generation, a private snapshot is a source only if
   the caller sees private, and every output that drew on one is tainted.
4. **Taint is the server's.** For every working copy, only the server writes
   provenance `sources` and `private` (**Q1**, session 85). No client body (PATCH,
   publish, MCP), hand edit of the TK markers, raise or discard of the source, or
   regeneration from tainted input clears the mark; discarding the working copy removes
   it with the text. Client-supplied provenance never decides a refusal, so no answer
   differs between a private id and one that does not exist.
5. **Publish block.** For every tainted working copy, a public publish is refused with
   one answer whatever the source is; a draft may still be published privately.
6. **Owner search.** For every search by a caller who sees private, results cover draft,
   private and public items, private ones marked; for a restricted caller, hidden items
   and hidden working copies are absent.
7. **Hopper visibility.** For every hopper, a caller who sees private sees every member
   (draft, private, public), each marked; every action that makes an item public (raise,
   or publishing a draft) names the public hoppers it is in before it goes; for a
   restricted caller, hidden members are absent, and a membership cursor expires only
   when a member's visibility to that caller changes, not on an unrelated edit.
   The reader's hopper lens is a hopper view, so it shows draft members, marked
   (Venkat, session 85, studio#175/#178 V9); the reader's other lenses and *my blyg*
   stay draft-free, as the session-81 *owner reader* law says.

8. **Shelf and avatar** (Venkat, session 85, for Kyle's coverage follow-up on #178). The
   shelf has no product cap, only a technical ceiling of 1,000 entries on the stored list.
   For every replace by a restricted caller, the hidden entries it cannot see keep their
   places and any overflow past the ceiling comes off the end of its own list; the owner
   can always save back the list it reads. For every avatar choice, the medium must exist
   and be visible to the caller: a restricted caller naming a private item's medium gets
   the answer for a medium that does not exist, and the avatar does not change. The
   owner (or a token with `owner:private`) may choose such a medium deliberately, which
   publishes those bytes.

*Stated limit (**Q3**, session 85):* "hidden is not gone" stops at content. Revisions,
ETags, cursor expiry and `dirty` flags may change when the owner edits or shelves a
hidden item, so a restricted caller can learn *that* something changed, never what.
`docs/api.md` says so beside its absence-is-not-deletion text.

## 2. The R8 probe — now, throwaway

v0.5-plan §10 item 4, RFC-6 §9 items 3, 4 and 28. Read `Code/devops/security-policy.md`
first; probe keys are generated in memory and never written outside the probe directory.

- **What:** seal and open one item with a span and a nested span, two wraps on one entry,
  and a whole-item seal; HPKE grant to an X25519 key; the commitment check, including a
  crafted second key that must fail (item 2); the request MAC (item 28).
- **Where:** Chromium, WebKit and Firefox (WebCrypto, via Playwright), a Worker
  (`wrangler dev`), Go (stdlib, `crypto/hpke` from 1.26 if available), Python
  (`cryptography`). Cross-decrypt: each sealer's output opened by every other.
- **Measure:** document bytes per span by plaintext length and bucket; seal and open
  times; whether X25519 is in each WebCrypto without a flag.
- **Output:** `plans/l3/r8-probe.md` (findings, with numbers) and the probe code beside
  it; nothing in blygger-studio. Fable reads it at the close.

## 3. Phase 1 — spans and sealed items, keys handed over by hand

Starts after the close. This alone exercises a Level 3 construct and opens the 0.5
document (#21, #43; Fable's).

**Authoring.** A studio-private mark, rewritten before publish (#70, #20's two-layer
split). *Proposal:* the TK grammar's balanced form, `[SEAL lock]sealed words[=]cover[/SEAL]`,
inline or block, nesting allowed (TK forbids it; seals need it, §3.5). The whole-item seal
is an editor setting, not a mark. A composer chip shows the lock and the cover; the full
editor shows the sealed words and the cover side by side.

**Locks.** A `locks` table (id, name, epoch, home, key), keys encrypted at rest under a
new Worker secret registered per `security-policy.md`. Phase 1 homes nothing: `home` is
the owner's origin, unused until Phase 2. **Hand-over:** export a lock key at an epoch as
one string; a reader's studio imports it into `held_keys`. That is the whole of "by hand".

**Publish.** Per entry: plaintext object (§3.2), padding (§3.3), entry key, AAD, wraps,
commitment; bake `blyg-sealed`; selector for spans. **Carry-over (§3.6):** the studio
keeps, per item and entry, a private digest of the plaintext and description and the
entry's stored `nonce`, `ct`, `commit` and key, so an unchanged entry is re-emitted byte
for byte and re-wrapping is maintenance. References inside sealed text default to
*inside* for a span and *clear* for a sealed item (item 6, Fable's recommendation), with a
per-reference switch. Changelog notes: a warning when a note quotes sealed words (§3.7).

**Reading.** The importer stores `sealed` as received. At display, a held key that opens a
wrap decrypts in the Worker; the commitment is checked before anything shows (§4 step 6);
a mismatch shows an error, never content. Decrypted `content_html` goes through the
sanitizer like any import: **`sanitize.ts` must admit `blyg-sealed` and
`data-blyg-entry`**, or sealed spans vanish from thread displays (the sanitizer runs on
every thread display, reader and preview). Covers show for everything without a key.
Plaintext never enters public search, the Agentic feed's shared surfaces or any page.

**What the owner sees on their own public pages:** covers. Preview shows both.

## 4. Phases 2–4, after Phase 1 ships

2. **Origin key, home document, grant files** (§3.10): the manifest key, a static home
   document, grant files at derived paths; readers probe them.
3. **The request endpoint and the ladder** (§3.11): the uniform first answer, the
   `proof` MAC, pre-approved / automatic (OPML rosters) / exception queue for the owner or
   their delegate under §4's delegate rules. This is where **group** (private-items §8.3)
   arrives as a lock with a roster; group-scoped tokens with it.
4. **Lock-to-lock grants and epochs** (§3.12), rotation, lapse notices (§5).

RFC-7 (payments) rides on Phase 3's endpoint and adds no studio wire.

## 5. Open questions, for the build or the close

1. The authoring spelling (§3): `[SEAL …]` is a proposal; the picker and the composer
   need it settled before Phase 1's UI.
2. Encrypted media (§3.8) in Phase 1 or later? Recommended later: text first, media
   refused inside a seal until then.
3. TK over sealed sources (item 14, client policy): output is sealed under the same locks
   by default, or refused?
4. Whether a reader studio decrypts in the Worker (proposed: the owner's own Worker is the
   owner's machine) or also offers browser-only decryption for readers who distrust their
   host (§7's disclosure).

## 6. How the two halves meet

Private (owner-only) never reaches the wire, so it needs no cryptography: it is Phase 0.
Group visibility **is** a sealed item under a lock whose roster is the group, which is why
it waits for Phase 3 and is not built as a studio-only gate (#93: C2 refused, C3 is where
L3 starts). The allow-list predicate of Phase 0 is reused: a sealed item is
`servedPublicly`, and the leak tests grow a second question, "is any sealed plaintext on
this surface?"
