# Ygg Roadmap

Full roadmap from v0.1 through post-1.0. Medium detail: enough to see the shape of every version and what gates it, without pre-writing each version's implementation plan (those get their own `docs/vX.Y-plan.md` as they come up; v0.1's exists).

**Reading this as an implementing agent:** items marked **⚠️ FABLE** are design/spec work involving protocol semantics, cross-client invariants, security/crypto, or API-surface design — they must be done (or their output reviewed) by Fable, not improvised by the implementing model. Unmarked work is implementable by Sonnet or Opus directly from the written plan docs. If a plan doc doesn't yet exist for the version you're asked to build, stop: the plan is Fable's job first.

## Cross-cutting invariants (hold at every version)

1. Every ygg feed is a valid RSS 2.0 feed; every item carries a self-contained HTML rendering. A plain RSS reader always sees a sensible microblog.
2. Clients ignore ygg constructs they don't understand. Levels are strict supersets. A vN client reading a vN+k feed degrades gracefully, never errors.
3. AI never enters the protocol. Generation is studio-side; the page publishes output + provenance. Readers need no models or keys.
4. The published `/ygg` artifact is always exportable as plain static files.
5. Backwards compatibility of the file contract: once v1.0 freezes, fields are only ever *added*, never renamed or repurposed. Pre-1.0, breaking changes are allowed but must bump the manifest's version and be recorded in DEVLOG.md.

---

## v0.1 — Seed (publish side) ← CURRENT

**Goal:** a single-author client that publishes fragments to a conformant `/ygg` page. No imports, no threads, no AI. Exit state: a working deployment whose feed reads normally in any RSS reader.

**Protocol deliverables** (shapes defined in `docs/v0.1-plan.md`; normative spec written after they stabilize):
- ID scheme (128-bit random, base32) and per-version content hashes
- Item JSON schema for fragments + tombstones; changelog-as-metadata (no diffs)
- `ygg.json` manifest, `items/index.json` archive index
- `feed.xml` RSS + `ygg:` namespace; per-version GUIDs so plain readers surface edits
- Deletion semantics (tombstones)

**Client deliverables:** CF Worker (TypeScript, D1, R2): studio (login, compose, edit with edit-notes, publish/unpublish, tombstone, media upload, profile settings) + public page (feed page, permalinks, feed.xml, manifest, item files, media). Static export script.

- **⚠️ FABLE (done, this session):** the state-plane/notification-plane split, ID scheme, per-version GUID decision, tombstone semantics — all decided and recorded in `v0.1-plan.md`. Remaining v0.1 build work is Sonnet/Opus-safe.
- **⚠️ FABLE (after ship):** draft `docs/protocol-v0.1.md`, the normative L1 spec, from the as-built shapes.

**Exit criteria:** deployed instance publishes/edits/deletes fragments; feed validates as RSS 2.0 and reads correctly in a mainstream reader; item files + index enable full-state reconstruction with no feed; static export serves identically from a dumb file host.

## v0.2 — Roots (subscribe side)

**Goal:** the network exists. A client can follow other ygg pages and legacy RSS feeds, roll up remote edits, and triage into hoppers. Exit state: two ygg clients following each other, plus a legacy blog feed, all readable in one merged feed.

**Protocol deliverables:**
- Autodiscovery convention (given a URL, find `/ygg/ygg.json` or fall back to plain RSS)
- Rollup rules: match by `ygg:id`, highest version wins, ties broken by `updated`; self-asserted timestamps ordered per-reader
- Backfill procedure from `items/index.json` for new/lagging subscribers
- L0 grandfathering: wrapper that turns any RSS item into a summary fragment + link

**Client deliverables:** subscription manager; cron-triggered poller; importer with rollup; merged reading feed (own + imported, reverse-chron by update); manual hoppers (create, add/remove, many-to-many); thumbs up/down stored as signals; hopper-add snapshots a local copy, later versions update it; imported items owner-only by default with a make-public ("retweet-like") action.

- **⚠️ FABLE:** rollup/conflict semantics and backfill edge cases (feed-window gaps, tombstones-vs-cached-copies, clock skew, malformed feeds) — Fable writes the v0.2 plan's importer state machine; Sonnet/Opus implements it.

**Exit criteria:** the two-client + legacy-feed scenario works through simulated outages (subscriber offline past the feed window catches up losslessly via backfill).

## v0.3 — Trunk (threads, no AI yet)

**Goal:** longform. Threads composed from hoppers with *literal* (verbatim, non-AI) transclusion, plus the share and stub actions. Exit state: the full soapbox-response loop — see, hopper, stub, publish — works without any AI.

**Protocol deliverables (L2):**
- Thread item schema; transclusion provenance markup (which fragments, which versions)
- Stub metadata (marks a thread as a stub of a target item)
- Threads-tab presentation rules; thread pages at `t/{id}/`

**Client deliverables:** thread editor (markdown, `[[]]` fragment search-and-insert, autosave); literal transclusion rendering with provenance links; share action (fragment linking a thread, editable summary); one-click stub action (hopper-add + stub thread + quote-like fragment); threads tab ordered by most-recently-updated; local DAG enforcement; "detect stubs" built-in filter (highlights remote stubs of local items; stubbable again for stacks).

- **⚠️ FABLE:** the transclusion markup grammar inside `content_md` (this becomes permanent protocol surface); DAG + snapshot semantics across clients (remote transclusion always operates on the local snapshot — the rule that makes network cycles harmless); detect-stubs matching rules.

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

**Deliverables:** final normative spec set (`protocol-1.0.md` superseding the pre-1.0 drafts); a conformance validator (script: point at a `/ygg` URL, get a level + violations report); spec-only reimplementation test (can an agent build a minimal conformant publisher from the spec without reading reference code?); versioning/deprecation policy for post-1.0 additions.

- **⚠️ FABLE:** final spec review and conformance-suite design. This is the highest-stakes Fable work in the roadmap: freeze mistakes are permanent.

**Exit criteria:** validator passes reference client at L2; a from-spec minimal publisher built by a non-Fable agent passes at L1.

## Post-1.0

In rough priority order; each gets its own plan when it comes up.

- **L3 privacy** — encrypted/permissioned feeds: shared-key access to private items, key rotation/revocation, roadmap-aware of FOAF-visibility and ZK approaches. **⚠️ FABLE, entirely** — crypto design; also revisits the deferred "privileged group" feature properly.
- **IPFS persistence** — pin item files + media (content hashes already exist per version); resolution fallback rules.
- **Multi-tenant overloads** — document (not build) the pattern: community studios publishing one conformant single-author feed per user; no shared namespace, DNS remains the namespace.
- **Ecosystem** — grandfathering tools (Substack/WordPress→ygg wrappers), theme gallery, a "webring" convention if the blogroll topology wants one.

## Sequencing rationale & risks

Publish-before-subscribe: v0.2's importer needs real conformant feeds to eat, which v0.1 produces — and Venkat's personal deployment (in `Publishing/`) can start dogfooding at v0.1 with zero network features. Threads-before-AI isolates the hardest protocol surface (transclusion markup, v0.3) from the hardest engineering (generation pipeline, v0.4), so protocol churn and AI churn never happen in the same version. The two highest-risk items in the plan are both Fable-gated by design: the transclusion grammar in v0.3 (permanent protocol surface, easy to get subtly wrong) and the plugin API in v0.4 (public contract). The devlog discipline (CLAUDE.md ritual) exists so that model-switching between sessions — Fable for design, Sonnet/Opus for build — doesn't shed context.
