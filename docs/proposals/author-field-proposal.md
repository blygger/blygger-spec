# Proposal: the `author` field — minimalist multiplayer, identity out of protocol

**Status:** ACCEPTED — locked with Venkat, session 5, 2026-07-24 (CLAUDE.md locked decision #11). §9 edits applied same session.
**Scope:** semantic declaration only; ~zero v0.1 implementation delta.

## 1. Problem

The frozen concept spec assumes a single author per feed (items 33–34) and pushes
multi-tenancy to an "overload" pattern: one conformant single-author feed per user.
That posture conflates two constraints that should be separated:

- **One feed = one publisher** (one origin, one accountable client, DNS as the global
  namespace, no `user@server` two-level addressing) — this is load-bearing and stays.
- **One feed = one human author** — this is not load-bearing. A community studio, a
  masthead publication, or a household should be able to publish *one* conformant feed
  whose items carry different bylines, without ygg becoming a social protocol.

The goal is the most conservative possible relaxation: multiplayer *clients*, not
multiplayer *protocol*.

## 2. The design in one sentence

`author` is an **optional, per-item, origin-scoped, client-asserted, opaque** display
field — set at the client locus by whatever local machinery the client operator
chooses, passed through by the protocol, with **no guarantees or representations
made about it**. Identity, like AI, is never in the protocol.

## 3. What already exists

Item JSON (§2.3) and pinned version files (§2.8) already carry
`"author": { "name": …, "url": … }`, and the manifest (§2.4) carries a site-level
`author` profile. The reference implementation copies site settings into every item at
serve time. So this proposal is almost entirely a **reinterpretation of an existing
member**, not a new construct: today `author` implicitly means "the site owner";
after this change it means "whatever the origin asserts for this item."

No key is renamed, no shape changes, single-player output is byte-identical.

## 4. Semantics (the rules)

1. **Optional everywhere.** `author` MAY appear on any item of any kind, and on pinned
   version files. Absent means "no assertion" — readers fall back to feed-level
   identity for display, which is what plain RSS readers do anyway. Single-player
   clients are the degenerate case: an author-assertion that happens to be constant.

2. **Shape: open object.** If present, `author` is a JSON object. `name` (a display
   string) is RECOMMENDED; `url` is OPTIONAL; **any additional members are permitted
   and unspecified** — they are the client's private *authorspace grammar* (local user
   ids, OAuth subjects, Ethereum addresses, signatures, whatever). Readers MUST
   accept any object here and MUST NOT reject an item over its `author` contents.

3. **Assertion, not verification.** The value is asserted by the origin at publish
   time. The protocol makes **no representation** about its truth, uniqueness,
   stability, or consent. The only entity the protocol can hold accountable is the
   origin itself (the client at its domain). How the client decides what to write —
   local accounts, OAuth, wallet signatures, an editor typing a byline — is
   studio-side machinery, deliberately outside the protocol, exactly as AI generation
   is (locked decision #5). The studio/page split (locked decision #3) already gives
   this a home: authentication and permissions live in the unconstrained studio; the
   page publishes the resulting assertion.

4. **Origin-scoped.** Any interpretation of an author value is scoped to
   `(origin, value)`. Compliant clients MUST NOT treat equal author values from
   different origins as the same entity. Within one origin, grouping items by
   byte-equal author values is a permitted *display heuristic*, but no protocol
   semantics attach — the protocol does not promise that equal values are the same
   person or that one person keeps one value.

5. **Never addressable.** No protocol construct references an author. Transclusion
   (`![[id]]`) targets items; subscription targets feeds/origins; `forked_from`
   targets pinned versions. This holds at **all conformance levels, permanently**:
   ygg is an addressable *content* system, not a social system. There will never be a
   protocol-level author registry, author index file, per-author feed requirement,
   author-mention syntax, or follow-an-author construct.

6. **Pass-through.** Clients that store, snapshot, or re-emit item JSON (v0.2
   importers, v0.3 cross-client threads) MUST carry `author` verbatim — never
   synthesized, merged, translated, or rewritten by intermediaries. Dropping it
   wholesale when a local archive chooses not to store it is acceptable; mutating it
   is not.

7. **Outside the integrity promise.** `content_hash` covers `content_md` only
   (§2.2), so `author` is metadata riding outside the hash — the pin promise (§2.8)
   covers *content* immutability and never extended to `author`. A pinned version
   file SHOULD carry the assertion as published with that version, but no
   cryptographic or hosting promise attaches to the author bytes themselves. Clients
   that want verifiable authorship put a signature *inside* their authorspace grammar
   (an unspecified member per rule 2) — their business, not the protocol's.

8. **Feed presentation (lossy, optional).** When `author.name` is present, the
   publisher SHOULD emit `<dc:creator>` (namespace
   `http://purl.org/dc/elements/1.1/`) with the display name on the feed item — the
   standard RSS byline convention, so L0 readers show bylines. The opaque object
   itself never appears in the XML; the state plane (item JSON) is ground truth, the
   feed is a signal (locked decision #1).

9. **Manifest `author` regloss.** The manifest's site-level `author` becomes the
   **publication identity** — a person, a collective, a masthead. Key and shape
   unchanged. Per-item `author`, when present, is the byline; the manifest is the
   imprint.

## 5. Tunneled social networking (non-normative)

If you trust a particular origin *and* know its authorspace grammar, you can parse
the opaque members and build richer semantics on top — per-author views, verified
bylines, cross-origin identity linking via signatures. That is a private arrangement
between consenting clients, tunneled through a pass-through field. The protocol
neither enables nor forbids it, and will never standardize it. Any such system
degrades gracefully to "items with byline strings" for everyone else.

## 6. Relation to the frozen spec (deviation record)

Frozen-spec items 33–34 assume single-author feeds and one-feed-per-user
multi-tenancy. This proposal **revises that stance** (the spec itself stays frozen;
this doc is the decision record, as the retract-pin-fork proposal was for tombstones):
the invariant is narrowed from *single-author* to **single-publisher**. Everything
item 34 actually protects survives intact — no server/instance abstraction, no shared
namespace, no two-level `user@server` addressing, DNS remains the global namespace.
What changes: a multiplayer client may now publish **one** conformant feed with
per-item bylines, instead of being forced into one-feed-per-user. One-feed-per-user
remains a valid overload pattern; it is no longer the only one.

## 7. What this deliberately does NOT do (anti-commitments)

- No identity verification, no signatures, no key management in the protocol — ever.
- No author registry or `authors.json`; no per-author feed requirement.
- No author-based addressing or author-mention grammar.
- No uniqueness or stability claims, even within an origin.
- No moderation/consent semantics — a client attributing words to someone is an
  origin-trust problem, same as an origin publishing anything else false.
- No new conformance level or level gate — `author` is optional at every level.
- No plugin API specification — "arbitrary plugin module at the client locus" is a
  description of where the machinery lives (the studio), not a protocol interface.

## 8. Reference-implementation note (not a v0.1 gate)

The reference worker derives `author` from live settings at serve time — correct for
the degenerate single-player case (a byline spelling fix should propagate). A
*multiplayer* client would instead capture the assertion at publish time
(per-version column). If we ever want the reference impl to demonstrate this,
it is one nullable `versions.author` JSON column + fallback to settings — a small
Sonnet-safe task, **not** proposed for v0.1. Record in `protocol-v0.1.md` that both
serve-time and publish-time assertion strategies are conformant (rule 7 makes this
consistent: no stability promise attaches).

## 9. Edit plan (on approval)

1. **`docs/v0.1-plan.md`** — §2.3: gloss `author` as optional/per-item/opaque per
   rules 1–5, 7; §2.4: publication-identity regloss (rule 9); §2.6: optional
   `dc:creator` line (rule 8); §2.8: author-outside-the-pin-promise note (rule 7).
   No task-list changes; no v0.1 build work.
2. **`docs/roadmap.md`** — add cross-cutting invariant: "`author` is opaque,
   origin-scoped, client-asserted, never addressable; identity is never in the
   protocol." Update post-1.0 *Multi-tenant overloads* bullet per §6 (single-publisher
   multiplayer feeds now conformant; one-feed-per-user no longer mandated). Note in
   v0.3 that cross-client thread snapshots carry source `author` verbatim (rule 6)
   and byline display in baked blockquotes is presentation, not protocol.
3. **`CLAUDE.md`** — new locked decision #11 (the one-sentence design from §2 +
   single-publisher invariant); extend the `protocol-v0.1.md` TODO bullet to fold
   this decision record in.
4. **`DEVLOG.md`** — session 5 entry at wrap-up.
5. **Frozen spec** — untouched; this doc is the deviation record.
