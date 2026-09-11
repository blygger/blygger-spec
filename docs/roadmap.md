# Blygger Roadmap

Full roadmap from v0.1 through post-1.0. Medium detail: enough to see the shape of every version and what gates it, without pre-writing each version's implementation plan (those get their own `docs/vX.Y-plan.md` as they come up; v0.1's exists).

**Reading this as an implementing agent:** items marked **⚠️ FABLE** are design/spec work involving protocol semantics, cross-client invariants, security/crypto, or API-surface design — they must be done (or their output reviewed) by Fable, not improvised by the implementing model. Unmarked work is implementable by Sonnet or Opus directly from the written plan docs. If a plan doc doesn't yet exist for the version you're asked to build, stop: the plan is Fable's job first.

## Development-phase strategy (session 12, 2026-08-10, Venkat — decision #21)

**Building the reference implementation *is* testing the protocol.** The
whole pre-1.0 development phase is a protocol-testing phase, and the spec is
expected to change in response to what testing discovers — discoveries flow
DEVLOG → Fable pass → spec revision, at any spec version below 1.0.

- **Spec versions < 1.0 are working drafts, all of them.** No pre-1.0 version
  is ever declared "stable" (this supersedes the earlier freeze-0.1-at-stable
  intent). The version sequence below is a build sequence, not a stability
  ladder.
- **v1.0 is the first version we stand behind** — the spec we publish to a
  larger audience at a deliberate release event. Until then, users of the
  spec and builders of implementations should assume **no promises**,
  including of the wire surface (cross-cutting invariant 5's pre-1.0 clause
  is the governing rule; the discipline of decisions #14/#16 about
  wire-permanent tokens is about keeping migration *costs* low and honest,
  not a stability guarantee to outsiders).
- **Testing cohort:** initially Venkat alone, on the live two-node network
  (`venkateshrao.com/blyg/` + `blyg.protocol-institute.org`); possibly a few
  invited testers before 1.0. No open beta pre-1.0.
- The session-11 **release-candidate bar** (stable spec + two reference
  implementations — this CF client plus a local/folder-based static-host
  implementation) stands as the gate *for* the 1.0 event; this strategy
  defines what pre-1.0 means on the way there.
- **Spec-doc lifecycle (session 15, 2026-09-11 — decision #23):** each
  protocol version gets its own standalone-complete document; the
  highest-numbered document is the living one where testing-driven revisions
  land; lower versions freeze as SUPERSEDED (banner + index status), staying
  citable with their snapshots. `protocol-v0.2.md` (0.1 text + subscribe
  side + TK wire members) is the pending first application — drafting is
  ⚠️ FABLE, publishing mechanics in `spec-publishing-plan.md` §6.

## Cross-cutting invariants (hold at every version)

1. Every blyg feed is a valid RSS 2.0 feed; every item carries a self-contained HTML rendering. A plain RSS reader always sees a sensible microblog.
2. Clients ignore blyg constructs they don't understand. Levels are strict supersets. A vN client reading a vN+k feed degrades gracefully, never errors.
3. AI never enters the protocol. Generation is studio-side; the page publishes output + provenance. Readers need no models or keys.
4. The published `/blyg` artifact is always exportable as plain static files.
5. Backwards compatibility of the file contract: once v1.0 freezes, fields are only ever *added*, never renamed or repurposed. Pre-1.0, breaking changes are allowed but must bump the manifest's version and be recorded in DEVLOG.md.
6. Identity never enters the protocol. `author` is an optional, per-item, origin-scoped, client-asserted, **opaque** pass-through field — no guarantees or representations, never addressable, never verified. Feeds are single-**publisher** (one origin, one accountable client, DNS as the namespace), not necessarily single-author — a session-5 revision of the concept spec's single-author assumption; decision record in `docs/proposals/author-field-proposal.md`.

---

## v0.1 — Seed (publish side, both abstractions) ← CURRENT

**Goal:** a single-author client that publishes **fragments and local threads** to a conformant `/blyg` page. No imports, no AI, no cross-client features. Exit state: a working deployment whose feed reads normally in any RSS reader, exercising both core abstractions before anything is deployed to the network.

> **Session-3 restructure (2026-07-24, with Venkat):** the local thread abstraction moved
> here from v0.3, so the fragment/thread duality is tested in the first release — before
> v0.2 importers harden the network shapes. What moved is the *abstraction only*: threads
> composed from the author's own fragments. Everything requiring the subscribe side
> (stubs, shares, hopper-sourced threads, remote transclusion, detect-stubs) stays in v0.3.

**Protocol deliverables** (shapes defined in `docs/v0.1-plan.md`; normative spec written after they stabilize):
- ID scheme (128-bit random, base32) and per-version content hashes
- Item JSON schema for fragments + threads + withdrawn endcaps; changelog-as-metadata (no diffs); pinned version files (session-3 revision)
- Thread item schema with `transclusions` provenance; **`![[id]]` transclusion grammar** (locked session 3 — permanent protocol surface); snapshot-at-publish semantics; fragments-only nesting (thread-in-thread + DAG deferred to v0.3); no auto-pin (pins stay a deliberate act)
- `blyg.json` manifest, `items/index.json` archive index
- `feed.xml` RSS + `blyg:` namespace; per-version GUIDs so plain readers surface edits; thread entries carry full self-contained HTML
- Withdrawal semantics (withdraw endcap, reversible; supersedes tombstones — session 3) + pin semantics (irrevocable per-version hosting promise)

**Client deliverables:** CF Worker (TypeScript, D1, R2): studio (login, compose, edit with edit-notes, publish/withdraw/republish, pin, media upload, profile settings, thread editor with `![[id]]` insert) + public page (feed page, fragment permalinks `f/{id}/`, thread pages `t/{id}/`, feed.xml, manifest, item files, media). Static export script.

- **⚠️ FABLE (done, sessions 2–3):** the state-plane/notification-plane split, ID scheme, per-version GUID decision, withdraw/pin semantics, transclusion grammar + snapshot rules — all decided and recorded in `v0.1-plan.md`. Remaining v0.1 build work is Sonnet/Opus-safe.
- **⚠️ FABLE (after ship):** draft `docs/protocol-v0.1.md`, the normative spec, from the as-built shapes.

**Exit criteria:** deployed instance publishes/edits/withdraws/pins fragments **and threads**; a thread's transcluded snapshots survive edits and withdrawal of their source fragments; feed validates as RSS 2.0 and both kinds read correctly in a mainstream reader; item files + index enable full-state reconstruction with no feed; static export serves identically from a dumb file host.

## v0.2 — Roots (subscribe side)

**Goal:** the network exists. A client can follow other blyg pages and legacy RSS feeds, roll up remote edits (of both fragments and threads), and triage into hoppers. Exit state: two blyg clients following each other, plus a legacy blog feed, all readable in one merged feed.

**Protocol deliverables:**
- Autodiscovery convention — **revised session 8 (decision #14); mechanics finalized session 12 (Fable, decision #17, `v0.2-plan.md` §2.1):** deterministic bounded resolution — normalize → direct `blyg.json` probe → feed-upgrade via `<blyg:manifest>` → one-hop `<link rel="blyg" href="{origin}">` → conventional-mount probes → RSS fallback. Subscription identity = final fetch origin, never self-asserted `site`. rel-value registration (microformats registry) is a post-ship errand.
- Rollup rules: match by `blyg:id`, highest version wins, ties broken by `updated`; self-asserted timestamps ordered per-reader
- Backfill procedure from `items/index.json` for new/lagging subscribers
- L0 grandfathering: wrapper that turns any RSS item into a summary fragment + link
- **Blogroll (L2, optional; session-7 decision):** OPML 2.0 at origin-relative `blogroll.opml` (a wire filename, fixed regardless of mount — decision #14), optional `"blogroll"` manifest key + `rel="blogroll"` page link. A *curated subset* of subscriptions — publishing it is a publishing act; no completeness claim, no follower graph. Decision record: `docs/proposals/curation-discovery-generation-proposal.md` §2.1.

**Client deliverables:** subscription manager; cron-triggered poller; importer with rollup; merged reading feed (own + imported, reverse-chron by update); manual hoppers (create, add/remove, many-to-many); thumbs up/down stored as signals; hopper-add snapshots a local copy, later versions update it; imported items owner-only by default with a **make-public action = curation display only** (session-7 decision, supersedes "retweet-like": the item appears on a public hopper page rendered from the local snapshot with source attribution — it is **never re-emitted as an item on the publisher's feed**; re-emission would collide with `blyg:id` rollup and the single-publisher invariant. Feed-speech about others' content costs editorial: that's the v0.3 stub. Decision record: `curation-discovery-generation-proposal.md` §1).

- **⚠️ FABLE — done session 12 (2026-08-10):** rollup/conflict semantics and backfill edge cases designed as the importer state machine in `v0.2-plan.md` §3 (decision #18: index-as-reconciliation-surface, no-silent-regression watermark, pinned-retention-past-withdrawal). Remaining v0.2 work is Sonnet/Opus-safe from the plan doc.

**Exit criteria:** the two-client + legacy-feed scenario works through simulated outages (subscriber offline past the feed window catches up losslessly via backfill).

- **Implementation done session 13 (2026-08-10, Sonnet):** all 14 tasks in `v0.2-plan.md` §5 built — resolution, importer state machine, poller, L0 wrapper, hoppers/signals (incl. the §3.4 withdrawal-pin-retention check), blogroll, merged reading feed, public hopper pages, static-export update. 163/163 tests green including a simulated-outage integration test that forces recovery through index reconciliation specifically (not just the feed window) — run against a real worker instance via `SELF.fetch`, not a fixture map. Static export byte-verified against a live `wrangler dev` instance.
- **Exit criterion met, same session:** migration 0004 deployed to both `venkateshrao.com/blyg/` and `blyg.protocol-institute.org`; the two subscribed to each other over real internet HTTP, protocol-institute's backfill correctly pulled venkateshrao's 5 live items, and a fresh publish + resync round-trip confirmed live convergence. **Partial:** the legacy-feed leg of the three-way scenario (blyg + blyg + one legacy RSS feed) isn't wired up yet, and ongoing cron-driven convergence (vs. this session's manual resync) hasn't been observed over a real interval yet. Details: DEVLOG session 13 (cont'd).

## v0.3 — Trunk (threads go cross-client, no AI yet)

**Goal:** the social layer over threads. Threads composed from hoppers (imported items), the share and stub actions, thread-in-thread nesting, and cross-client transclusion semantics. Exit state: the full soapbox-response loop — see, hopper, stub, publish — works without any AI. (The thread abstraction itself shipped locally in v0.1; this version makes it networked.)

**Protocol deliverables (L2):**
- Stub metadata (marks a thread as a stub of a target item)
- Thread-in-thread nesting + DAG rules (v0.1 restricts transclusion to fragments; nesting arrives here)
- Cross-client transclusion semantics (remote transclusion always operates on the local snapshot — the rule that makes network cycles harmless)
- Threads-tab presentation rules
- `forked_from: {id, version}` lineage implementation (shape reserved in v0.1 §2.3, session 3; MUST reference a pinned version)
- Imported and snapshotted items carry the source's `author` verbatim (pass-through per invariant 6; session-5 author decision). Byline display inside baked cross-client blockquotes is presentation, not protocol.
- **Webmention (L2, optional; session-7 decision):** reuse the W3C mechanism, don't invent. Receivers MAY advertise an endpoint (manifest key + standard `rel="webmention"` discovery); senders SHOULD mention when a published item's transclusions/stub/`forked_from` reference a remote item. **Structural verification** (receiver fetches source item JSON and checks it actually names the target id) kills the trackback spam hole. Verified mentions are studio signals feeding detect-stubs — never auto-published. This is the protocol's first dynamic surface, deliberately optional-at-L2; static-only deployments stay fully conformant. Decision record: `curation-discovery-generation-proposal.md` §2.2.

**Client deliverables:** thread composition from hoppers (v0.1's editor gains imported-item sources); share action (fragment linking a thread, editable summary); one-click stub action (hopper-add + stub thread + quote-like fragment); **stub templates** (saved editorial phrases in the stub composer — studio sugar, zero protocol bytes; session-7 §3); threads tab ordered by most-recently-updated; local DAG enforcement; "detect stubs" built-in filter (highlights remote stubs of local items; stubbable again for stacks), now fed by verified webmentions as well as subscribed feeds; webmention send-on-publish + receive/verify endpoint.

- **⚠️ FABLE:** DAG semantics for nested threads; cross-client snapshot edge cases; detect-stubs matching rules; webmention mechanics (retry, dedupe, endpoint shape, rate limits — the mechanism choice + verification principle are locked, session 7). (The transclusion grammar itself was locked in v0.1, session 3.)

**Exit criteria:** stub stacks two levels deep across two clients render correctly on both ends; DAG violations are impossible locally and harmless across the network.

## v0.4 — Canopy (AI arrives)

> **Session-12 amendment (2026-08-10, Fable + Venkat — amends the locked
> build order):** v0.4 is split. **TK-core** (thread + fragment TK scopes,
> generation contract, provider-call interface, generation provenance) is
> **pulled forward ahead of v0.3** — it depends only on v0.1 machinery, and
> Venkat's release bar (session 11) names TK + pubsub, not v0.3, as the
> gate. Design complete: `docs/tk-core-plan.md` (decision #20; resolves the
> §4 items 1/3/4/6 pre-records, incl. inline-vs-block — quote-vs-source
> split). **Build order is now: v0.2 → TK-core → v0.3 → v0.4-remainder**
> (filter plugin API needs v0.2's importer; staleness-over-DAG needs v0.3
> nesting; auto-hoppers need v0.2 signals).

**Goal:** the AI-native layer. TK-transclusion generation, staleness/regeneration, auto-hoppers, and the filter plugin API. No protocol change — AI is entirely studio-side.

**Client deliverables:** `[TK]…[/TK]` scopes generate contextual summaries of included fragments at save time (pure generation when empty; inert `TK` annotation stays non-AI); **fragment-level generate/regenerate hardpoint in the fragment editor** (session-7 addition — all generation hooks, fragment editor + thread TK scopes + import filters, share one provider-call interface); edits to transcluded sources mark dependent threads **stale** — no automatic cascade; owner regenerates on demand (cost control, no surprise API spend); auto-hoppers via AI relevance filters over inbound items; filter plugin interface (typed hooks over the import pipeline: score/route/transform; default filters ship as plugins, including detect-stubs retrofitted); configurable AI provider + key via wrangler secrets.

- **⚠️ FABLE — TK generation contract done session 12 (2026-08-10):** designed in `tk-core-plan.md` (decision #20) — two-layer split (TK grammar studio-private; wire gets marker-free `content_md` + `generated` provenance + `blyg-tk-gen` baked class, amending the §4 item-3 inert-markers lean), quote-vs-source rule for `![[id]]` in scopes, one provider-call interface, disclosure = SHOULD-record/reference-always. Remaining ⚠️ FABLE, still undesigned: the filter plugin API surface (a public extension contract — hard to change later; needs v0.2's importer) and the staleness dependency model over the DAG (needs v0.3 nesting).
- **TK-core implementation done session 14 (2026-08-10):** all 8 tasks from `tk-core-plan.md` §6 built (`worker/src/tk.ts`, `worker/src/ai/provider.ts` targeting the Anthropic Messages API, `worker/src/tk-generate.ts`, publish integration in `model.ts`, studio scope panel + preview highlighting). Verified against the real Anthropic API (not just fixtures) in a live `wrangler dev` loop, and the static export byte-compared identical including `generated` provenance and `blyg-tk-gen` HTML wrappers. `AI_PROVIDER_KEY` registered and set on both live nodes (`blyg-venkateshrao`, `blyg-protocol-institute`); **deployed to both live nodes session 15 (2026-09-11)** — migration 0005 + worker code, live-verified (manifests/feeds 200, `/generate` route auth-gated, archives intact). Only the auto-hopper filter-plugin and staleness-over-DAG pieces of v0.4 remain, both still gated as noted above.

**Exit criteria:** editing a source fragment marks its dependent threads stale and one-click regeneration updates them with correct provenance; a third-party filter plugin can be written from the docs alone without touching core.

## v0.5 — Grove (RAG + presentation)

**Goal:** authoring intelligence and looks. Minimal local RAG over the client's own content, integrated into the thread editor; the styling system.

**Client deliverables:** embed local items (Workers AI or configurable provider) into a local vector store; editor hooks — related-fragment suggestions while writing, hopper-relevance suggestions; RAG stays optional and degradable per invariant 3; styling: default minimal theme + documented CSS contract (required classes/structure any custom theme must respect); docs polish for third-party implementers; **full UI refresh** (session 11, 2026-08-09 — Venkat, hands-on testing of the venkateshrao.com node): studio + public-page UX polish incorporating accumulated hands-on-testing feedback, deliberately deferred by Venkat until rudimentary TK-transclusion (v0.4) and cross-blyg subscribe/pubsub (v0.2–v0.3) are working end to end, so polish isn't spent on surfaces that are still shifting under active feature work.

- **⚠️ FABLE:** review pass on the CSS contract (it's protocol-adjacent — presentation rules readers can rely on) and on the RAG plan. Light-touch otherwise.

**Exit criteria:** authoring a thread surfaces relevant own-corpus fragments unprompted; a restyled page passes the same conformance checks as the default theme.

## Release candidate — two reference implementations (session 11, 2026-08-09 — Venkat; gap noted, not designed)

Venkat's stated intent for what "blygger is ready to release" means, recorded
here so it isn't rediscovered later. Not a locked protocol decision (no Fable
pass yet) — a scope/sequencing note.

**Gate:** the Cloudflare reference client must be "sufficiently feature
complete" first — defined as functional TK-transclusion (v0.4) + working
cross-blyg pubsub/subscribe (v0.2–v0.3) + the deferred UI/styling refresh
(v0.5, session 11 item above). Nothing below starts before that gate closes.

Once gated, two deliverables, both currently just gaps (no design done):

1. **CF self-host release artifact** — a scaffolding script/template (not a
   docs-only guide, not a one-click deploy button — those were considered and
   explicitly deferred, session 11) that lets a third party stand up their own
   Cloudflare-hosted blyg: generates the named-environment `wrangler.jsonc`
   block, provisions D1/R2, runs migrations, prompts for the two secrets.
   Today this only exists as the hand-done `env.venkateshrao`-style pattern in
   `worker/wrangler.jsonc` — no tooling wraps it.
2. **Second reference implementation: local/laptop, folder-based, static-host
   deploy** (e.g. GitHub Pages, Netlify) — the architectural inverse of the CF
   client: the dynamic/code-heavy parts (studio authoring, auth, API) stay
   local on the author's device; only the protocol-governed static public
   surface (`blyg.json`, `items/*.json`, `feed.xml`, rendered pages) ships to
   the static host. Entirely undesigned — storage model, auth-free-since-local
   implications, and how publish-to-static-host works are all open.

**Release candidate for blygger** = a stable spec (v1.0 freeze work, above)
**plus** both reference implementations passing conformance. Not exit criteria
for v1.0 itself yet — v1.0's own exit bar (spec-only reimplementation by a
non-Fable agent) is a different, harder test than "the two reference clients
work."

## v1.0 — Freeze

**Goal:** the protocol L0–L2 is frozen; the reference client is stable; third parties can implement from spec alone.

**Deliverables:** final normative spec set (`protocol-1.0.md` superseding the pre-1.0 drafts); a conformance validator (script: point at a `/blyg` URL, get a level + violations report); spec-only reimplementation test (can an agent build a minimal conformant publisher from the spec without reading reference code?); versioning/deprecation policy for post-1.0 additions.

- **⚠️ FABLE:** final spec review and conformance-suite design. This is the highest-stakes Fable work in the roadmap: freeze mistakes are permanent.

**Exit criteria:** validator passes reference client at L2; a from-spec minimal publisher built by a non-Fable agent passes at L1.

## Post-1.0

In rough priority order; each gets its own plan when it comes up.

- **L3 privacy** — encrypted/permissioned feeds: shared-key access to private items, key rotation/revocation, roadmap-aware of FOAF-visibility and ZK approaches. **⚠️ FABLE, entirely** — crypto design; also revisits the deferred "privileged group" feature properly.
- **IPFS persistence** — pin item files + media (content hashes already exist per version); resolution fallback rules.
- **Multi-tenant overloads** — document (not build) the patterns: community studios publishing either one conformant feed per user, or a single **multiplayer feed** with per-item `author` bylines (session-5 author decision — single-publisher, not single-author). Either way: one origin, one accountable client, no shared namespace, no `user@server`, DNS remains the namespace.
- **Ecosystem** — grandfathering tools (Substack/WordPress→blyg wrappers), theme gallery, a "webring" convention if the blogroll topology wants one.

## Sequencing rationale & risks

Publish-before-subscribe: v0.2's importer needs real conformant feeds to eat, which v0.1 produces — and Venkat's personal deployment (in `Publishing/`) can start dogfooding at v0.1 with zero network features. Both-abstractions-before-network (session-3 restructure): the original plan locked the transclusion grammar in v0.3, *after* importers had already hardened the network shapes around fragments alone — testing fragments and threads together in v0.1, before anything is deployed, de-risks the protocol's load-bearing duality at the moment changes are still free. Local-threads-before-networked-threads keeps v0.1 free of DAG/conflict machinery (fragments-only nesting has no cycles by construction). Threads-before-AI still holds: the generation pipeline (v0.4) never shares a version with protocol churn. The remaining highest-risk item is the plugin API in v0.4 (public contract), Fable-gated; the transclusion grammar — the other one — was locked in v0.1 session 3 (`![[id]]`, snapshot-at-publish, no auto-pin). The devlog discipline (CLAUDE.md ritual) exists so that model-switching between sessions — Fable for design, Sonnet/Opus for build — doesn't shed context.
