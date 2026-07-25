# Blygger Roadmap

Full roadmap from v0.1 through post-1.0. Medium detail: enough to see the shape of every version and what gates it, without pre-writing each version's implementation plan (those get their own `docs/vX.Y-plan.md` as they come up; v0.1's exists).

**Reading this as an implementing agent:** items marked **⚠️ FABLE** are design/spec work involving protocol semantics, cross-client invariants, security/crypto, or API-surface design — they must be done (or their output reviewed) by Fable, not improvised by the implementing model. Unmarked work is implementable by Sonnet or Opus directly from the written plan docs. If a plan doc doesn't yet exist for the version you're asked to build, stop: the plan is Fable's job first.

## Cross-cutting invariants (hold at every version)

1. Every blygg feed is a valid RSS 2.0 feed; every item carries a self-contained HTML rendering. A plain RSS reader always sees a sensible microblog.
2. Clients ignore blygg constructs they don't understand. Levels are strict supersets. A vN client reading a vN+k feed degrades gracefully, never errors.
3. AI never enters the protocol. Generation is studio-side; the page publishes output + provenance. Readers need no models or keys.
4. The published `/blygg` artifact is always exportable as plain static files.
5. Backwards compatibility of the file contract: once v1.0 freezes, fields are only ever *added*, never renamed or repurposed. Pre-1.0, breaking changes are allowed but must bump the manifest's version and be recorded in DEVLOG.md.
6. Identity never enters the protocol. `author` is an optional, per-item, origin-scoped, client-asserted, **opaque** pass-through field — no guarantees or representations, never addressable, never verified. Feeds are single-**publisher** (one origin, one accountable client, DNS as the namespace), not necessarily single-author — a session-5 revision of the concept spec's single-author assumption; decision record in `docs/proposals/author-field-proposal.md`.

---

## v0.1 — Seed (publish side, both abstractions) ← CURRENT

**Goal:** a single-author client that publishes **fragments and local threads** to a conformant `/blygg` page. No imports, no AI, no cross-client features. Exit state: a working deployment whose feed reads normally in any RSS reader, exercising both core abstractions before anything is deployed to the network.

> **Session-3 restructure (2026-07-24, with Venkat):** the local thread abstraction moved
> here from v0.3, so the fragment/thread duality is tested in the first release — before
> v0.2 importers harden the network shapes. What moved is the *abstraction only*: threads
> composed from the author's own fragments. Everything requiring the subscribe side
> (stubs, shares, hopper-sourced threads, remote transclusion, detect-stubs) stays in v0.3.

**Protocol deliverables** (shapes defined in `docs/v0.1-plan.md`; normative spec written after they stabilize):
- ID scheme (128-bit random, base32) and per-version content hashes
- Item JSON schema for fragments + threads + withdrawn endcaps; changelog-as-metadata (no diffs); pinned version files (session-3 revision)
- Thread item schema with `transclusions` provenance; **`![[id]]` transclusion grammar** (locked session 3 — permanent protocol surface); snapshot-at-publish semantics; fragments-only nesting (thread-in-thread + DAG deferred to v0.3); no auto-pin (pins stay a deliberate act)
- `blygg.json` manifest, `items/index.json` archive index
- `feed.xml` RSS + `blygg:` namespace; per-version GUIDs so plain readers surface edits; thread entries carry full self-contained HTML
- Withdrawal semantics (withdraw endcap, reversible; supersedes tombstones — session 3) + pin semantics (irrevocable per-version hosting promise)

**Client deliverables:** CF Worker (TypeScript, D1, R2): studio (login, compose, edit with edit-notes, publish/withdraw/republish, pin, media upload, profile settings, thread editor with `![[id]]` insert) + public page (feed page, fragment permalinks `f/{id}/`, thread pages `t/{id}/`, feed.xml, manifest, item files, media). Static export script.

- **⚠️ FABLE (done, sessions 2–3):** the state-plane/notification-plane split, ID scheme, per-version GUID decision, withdraw/pin semantics, transclusion grammar + snapshot rules — all decided and recorded in `v0.1-plan.md`. Remaining v0.1 build work is Sonnet/Opus-safe.
- **⚠️ FABLE (after ship):** draft `docs/protocol-v0.1.md`, the normative spec, from the as-built shapes.

**Exit criteria:** deployed instance publishes/edits/withdraws/pins fragments **and threads**; a thread's transcluded snapshots survive edits and withdrawal of their source fragments; feed validates as RSS 2.0 and both kinds read correctly in a mainstream reader; item files + index enable full-state reconstruction with no feed; static export serves identically from a dumb file host.

## v0.2 — Roots (subscribe side)

**Goal:** the network exists. A client can follow other blygg pages and legacy RSS feeds, roll up remote edits (of both fragments and threads), and triage into hoppers. Exit state: two blygg clients following each other, plus a legacy blog feed, all readable in one merged feed.

**Protocol deliverables:**
- Autodiscovery convention (given a URL, find `/blygg/blygg.json` or fall back to plain RSS)
- Rollup rules: match by `blygg:id`, highest version wins, ties broken by `updated`; self-asserted timestamps ordered per-reader
- Backfill procedure from `items/index.json` for new/lagging subscribers
- L0 grandfathering: wrapper that turns any RSS item into a summary fragment + link

**Client deliverables:** subscription manager; cron-triggered poller; importer with rollup; merged reading feed (own + imported, reverse-chron by update); manual hoppers (create, add/remove, many-to-many); thumbs up/down stored as signals; hopper-add snapshots a local copy, later versions update it; imported items owner-only by default with a make-public ("retweet-like") action.

- **⚠️ FABLE:** rollup/conflict semantics and backfill edge cases (feed-window gaps, withdrawn-endcaps-vs-cached-copies, clock skew, malformed feeds) — Fable writes the v0.2 plan's importer state machine; Sonnet/Opus implements it.

**Exit criteria:** the two-client + legacy-feed scenario works through simulated outages (subscriber offline past the feed window catches up losslessly via backfill).

## v0.3 — Trunk (threads go cross-client, no AI yet)

**Goal:** the social layer over threads. Threads composed from hoppers (imported items), the share and stub actions, thread-in-thread nesting, and cross-client transclusion semantics. Exit state: the full soapbox-response loop — see, hopper, stub, publish — works without any AI. (The thread abstraction itself shipped locally in v0.1; this version makes it networked.)

**Protocol deliverables (L2):**
- Stub metadata (marks a thread as a stub of a target item)
- Thread-in-thread nesting + DAG rules (v0.1 restricts transclusion to fragments; nesting arrives here)
- Cross-client transclusion semantics (remote transclusion always operates on the local snapshot — the rule that makes network cycles harmless)
- Threads-tab presentation rules
- `forked_from: {id, version}` lineage implementation (shape reserved in v0.1 §2.3, session 3; MUST reference a pinned version)
- Imported and snapshotted items carry the source's `author` verbatim (pass-through per invariant 6; session-5 author decision). Byline display inside baked cross-client blockquotes is presentation, not protocol.

**Client deliverables:** thread composition from hoppers (v0.1's editor gains imported-item sources); share action (fragment linking a thread, editable summary); one-click stub action (hopper-add + stub thread + quote-like fragment); threads tab ordered by most-recently-updated; local DAG enforcement; "detect stubs" built-in filter (highlights remote stubs of local items; stubbable again for stacks).

- **⚠️ FABLE:** DAG semantics for nested threads; cross-client snapshot edge cases; detect-stubs matching rules. (The transclusion grammar itself was locked in v0.1, session 3.)

**Exit criteria:** stub stacks two levels deep across two clients render correctly on both ends; DAG violations are impossible locally and harmless across the network.

## v0.4 — Canopy (AI arrives)

**Goal:** the AI-native layer. TK-transclusion generation, staleness/regeneration, auto-hoppers, and the filter plugin API. No protocol change — AI is entirely studio-side.

**Client deliverables:** `[TK]…[/TK]` scopes generate contextual summaries of included fragments at save time (pure generation when empty; inert `TK` annotation stays non-AI); edits to transcluded sources mark dependent threads **stale** — no automatic cascade; owner regenerates on demand (cost control, no surprise API spend); auto-hoppers via AI relevance filters over inbound items; filter plugin interface (typed hooks over the import pipeline: score/route/transform; default filters ship as plugins, including detect-stubs retrofitted); configurable AI provider + key via wrangler secrets.

- **⚠️ FABLE:** the filter plugin API surface (a public extension contract — hard to change later); the TK generation contract (what context the model sees, how provenance is recorded, determinism/versioning of generated text); staleness dependency model over the DAG.
- Sonnet/Opus: all implementation once those three designs are written.

**Exit criteria:** editing a source fragment marks its dependent threads stale and one-click regeneration updates them with correct provenance; a third-party filter plugin can be written from the docs alone without touching core.

## v0.5 — Grove (RAG + presentation)

**Goal:** authoring intelligence and looks. Minimal local RAG over the client's own content, integrated into the thread editor; the styling system.

**Client deliverables:** embed local items (Workers AI or configurable provider) into a local vector store; editor hooks — related-fragment suggestions while writing, hopper-relevance suggestions; RAG stays optional and degradable per invariant 3; styling: default minimal theme + documented CSS contract (required classes/structure any custom theme must respect); docs polish for third-party implementers.

- **⚠️ FABLE:** review pass on the CSS contract (it's protocol-adjacent — presentation rules readers can rely on) and on the RAG plan. Light-touch otherwise.

**Exit criteria:** authoring a thread surfaces relevant own-corpus fragments unprompted; a restyled page passes the same conformance checks as the default theme.

## v1.0 — Freeze

**Goal:** the protocol L0–L2 is frozen; the reference client is stable; third parties can implement from spec alone.

**Deliverables:** final normative spec set (`protocol-1.0.md` superseding the pre-1.0 drafts); a conformance validator (script: point at a `/blygg` URL, get a level + violations report); spec-only reimplementation test (can an agent build a minimal conformant publisher from the spec without reading reference code?); versioning/deprecation policy for post-1.0 additions.

- **⚠️ FABLE:** final spec review and conformance-suite design. This is the highest-stakes Fable work in the roadmap: freeze mistakes are permanent.

**Exit criteria:** validator passes reference client at L2; a from-spec minimal publisher built by a non-Fable agent passes at L1.

## Post-1.0

In rough priority order; each gets its own plan when it comes up.

- **L3 privacy** — encrypted/permissioned feeds: shared-key access to private items, key rotation/revocation, roadmap-aware of FOAF-visibility and ZK approaches. **⚠️ FABLE, entirely** — crypto design; also revisits the deferred "privileged group" feature properly.
- **IPFS persistence** — pin item files + media (content hashes already exist per version); resolution fallback rules.
- **Multi-tenant overloads** — document (not build) the patterns: community studios publishing either one conformant feed per user, or a single **multiplayer feed** with per-item `author` bylines (session-5 author decision — single-publisher, not single-author). Either way: one origin, one accountable client, no shared namespace, no `user@server`, DNS remains the namespace.
- **Ecosystem** — grandfathering tools (Substack/WordPress→blygg wrappers), theme gallery, a "webring" convention if the blogroll topology wants one.

## Sequencing rationale & risks

Publish-before-subscribe: v0.2's importer needs real conformant feeds to eat, which v0.1 produces — and Venkat's personal deployment (in `Publishing/`) can start dogfooding at v0.1 with zero network features. Both-abstractions-before-network (session-3 restructure): the original plan locked the transclusion grammar in v0.3, *after* importers had already hardened the network shapes around fragments alone — testing fragments and threads together in v0.1, before anything is deployed, de-risks the protocol's load-bearing duality at the moment changes are still free. Local-threads-before-networked-threads keeps v0.1 free of DAG/conflict machinery (fragments-only nesting has no cycles by construction). Threads-before-AI still holds: the generation pipeline (v0.4) never shares a version with protocol churn. The remaining highest-risk item is the plugin API in v0.4 (public contract), Fable-gated; the transclusion grammar — the other one — was locked in v0.1 session 3 (`![[id]]`, snapshot-at-publish, no auto-pin). The devlog discipline (CLAUDE.md ritual) exists so that model-switching between sessions — Fable for design, Sonnet/Opus for build — doesn't shed context.
