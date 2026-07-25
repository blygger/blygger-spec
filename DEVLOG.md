# Ygg Devlog

Per-session development log. Non-skippable: every coding session appends an entry
(template and writing standard in [`CLAUDE.md`](CLAUDE.md)). Newest first.

## Session 5 — 2026-07-24 — Author field (minimalist multiplayer); version-nav gap resolved
**Model:** Fable 5 · **Time:** ~17:10–17:30 PT · **Committed:** yes · **Deployed:** —

**What & why:** Pure protocol-semantics session, no build. Two decisions locked with Venkat.

**1. Author/identity model (locked decision #11; `docs/proposals/author-field-proposal.md`, ACCEPTED).**
Venkat wanted conservative multiplayer-client support without ygg becoming a social
protocol. The design separates two constraints the frozen spec (items 33–34) had fused:
one feed = one **publisher** (load-bearing: one origin, one accountable client, DNS as
namespace, no `user@server`) survives; one feed = one *author* is dropped. The mechanism
is a reinterpretation of the **already-existing** per-item `author` member — optional,
client-asserted, opaque (open object: `name` recommended, `url` optional, all other
members = the client's private *authorspace grammar* — local ids, OAuth subjects, wallet
sigs, whatever), origin-scoped (`(origin, value)`; no cross-origin equating), **never
addressable** (permanent anti-commitment: no registry, no author-mention grammar, no
per-author feed requirement, no verification), pass-through verbatim by importers.
Governing symmetry, worth remembering as the design generator: **identity, like AI, is
never in the protocol** — auth machinery lives in the unconstrained studio, the page
publishes the resulting assertion. Structural freebie found during design: `content_hash`
covers `content_md` only, so `author` was already outside the pin-integrity promise —
serve-time (ref impl, settings) and publish-time (multiplayer, per-version) assertion
strategies are both conformant. Feed side: optional `<dc:creator>` byline for L0 readers;
the opaque object never enters XML. Zero rename, zero shape change, zero v0.1 build work;
single-player is the degenerate case (constant author-assertion). Edits landed in
`v0.1-plan.md` §§2.3/2.4/2.6/2.8, roadmap (new cross-cutting invariant 6, v0.3
pass-through deliverable, post-1.0 multi-tenant rewrite), CLAUDE.md decision #11.

**2. Version-nav gap → indicator, not navigation (`v0.1-plan.md` §2.8).** Session 4's
flag resolved as option 3 of 3 (full history browsing rejected — guts
withheld-unless-pinned; pinned-only HTML route rejected — a forever-URL for an
undemonstrated need, addable post-v0.1 purely additively): **no historical-version HTML
route ever in v0.1**; pins stay JSON-only; the rev-3 scrubber is dropped outright in
favor of discrete pin citations ("v6 · pinned: v2, v4" linking existing `v{n}.json`).
Conceptual grounding that decided the UI form, per discussion: pins are *not* fork points
(decision #8 — they're the only *eligible* fork sources once `forked_from` lands in
v0.3); browsing pins is browsing a sequence of frozen citable artifacts of one identity,
not paging one document — so links-to-citations, not arrows. Also clarified for the
record (already implied by §2.3 but easy to misread): what's withheld is unpinned
*content*; the changelog — versions, timestamps, edit notes — is public permanent
metadata. Retention has three layers: live content (latest only), history-as-metadata
(full, forever), history-as-content (pinned only).

**State after:** v0.1 unchanged functionally and still complete; spec docs now carry the
author semantics and the version-nav resolution. Both session-4 Fable flags cleared.
Ship remains gated only on the brand decision.

**Open threads:** Venkat's brand decision (→ task 16 → domain/namespace → task 11
deploy). Sonnet-safe fast-follows: feed-flake tiebreaker; scrubber removal + pin-links UI
+ wireframe update (new TODO). `protocol-v0.1.md` fold-in list grew: author decision
record, version-nav resolution.

## Session 4 — 2026-07-24 — Threads shipped (tasks 13–15); studio UI built; public pages brought to rev-3
**Model:** Sonnet 5 · **Time:** ~13:34–14:40 PT · **Committed:** yes · **Deployed:** — (task 11 still pending)

**What & why:** Opened by re-checking the rev-3 wireframes from session 3 (withdraw/pin +
threads) against `v0.1-plan.md` — they already matched the new spec, so Venkat reviewed
the existing set live in-browser rather than a rebuild, and approved it. That cleared the
task-9/15 gate, so this session built the full remainder of v0.1: threads end-to-end and
the studio UI, plus the rev-2/3 public-page changes that task 8 had shipped against the
rev-1 mockup only.

**Threads (tasks 13–14), §2.9:** migration 0003 adds `versions.content_html` and
`versions.transclusions`. New `src/transclusion.ts` implements the locked `![[id]]`
grammar as a line-walker shared between two callers: `resolveTransclusions()` (strict,
used by `model.publish()` — throws `TransclusionResolveError` listing every bad reference
if any directive fails, aborting the whole publish) and `previewTransclusions()`
(studio-only, never aborts — renders a red "unresolvable" placeholder per bad directive
instead, so the editor can show what publish will reject before the author hits publish).
`model.ts` gained `authoredKind()` — an item's real kind ('fragment'/'thread') independent
of the transient `'withdrawn'` state; for a withdrawn item it's derived from the last
real (non-endcap) version's `transclusions` column, since `items.kind` itself is
overwritten to `'withdrawn'` and can't be trusted. `publish()` now resolves transclusions
and bakes the snapshot into `content_html` for threads, and (as a side effect of storing
`content_html` at publish time for *every* version, not just threads) fragments' rendered
HTML is now precomputed at publish rather than re-rendered per request — pinned
fragment/thread version files now serve the stored value directly. `f/{id}/` and `t/{id}/`
routes now 404 on kind mismatch (via `authoredKind`), so a thread id never resolves at the
fragment permalink or vice versa.

**Protocol-locked vs. presentation, a decision worth recording:** §2.9 only specifies the
`blockquote.ygg-transclusion` + `data-ygg-id`/`data-ygg-version` wrapper as baked
`content_html` — no provenance link. The wireframe's "fragment ↗ · snapshot of vN" line is
therefore presentation, not protocol: `pages.ts`'s `injectProvenance()` adds it after the
fact (root-relative link, matching every other HTML link in this codebase) for the thread
page and, pre-`absolutizeHtml`, for feed.xml's self-contained thread entries — but never
touches the stored `content_html` itself. Item JSON's `content_html` field for threads is
the bare baked blockquote, no provenance.

**A withdrawn thread's `transclusions` field:** implemented as present-but-`[]` (matching
the "empties `content_md`/`content_html`/`media`" pattern for the endcap), while withdrawn
*fragments* carry no `transclusions` field at all — matching §2.3's "thread items
additionally carry" framing. Distinguishing withdrawn-thread from withdrawn-fragment
required `authoredKind()`, since `item.kind` alone is just `'withdrawn'` at that point.

**Studio UI (task 9) + thread editor (task 15):** built directly against
`docs/wireframes/studio.html`/`edit.html`/`thread-edit.html` — server-rendered HTML +
vanilla JS calling the existing `/api/*` endpoints (no client framework, per CLAUDE.md).
Composer (quick-post, creates-then-optionally-publishes), item list with state dot/dirty
flag/kind chip/pin+withdraw+republish actions, fragment editor (textarea + live preview via
a new studio-only `POST /studio/preview`), settings page. Thread editor adds: live preview
via `POST /studio/preview-thread` (the `previewTransclusions` placeholder variant), a
`![[` fragment-search palette (`GET /studio/fragments/search`, arrow-key/click select,
inserts `![[id]]` on the current line), and a publish error banner rendering each bad
reference by directive + reason. These three studio-only routes are authoring-tool
internals, not protocol surfaces — consistent with the studio/page split (studio side is
unconstrained). "Attach image" (both editors) uploads via the existing `/api/media` and
reloads; the composer's attach button implicitly creates the draft first so it has an id to
attach to.

**Public pages brought forward to rev-2/3 (folds in the debt task 8 left, per CLAUDE.md
TODO):** `pages.ts` rewritten for the reviewed wireframe conventions — embeddable
`.ygg`-scoped block with a bare Home+RSS header (session-3 review: "the public page's
header is presumed content, not real navigation," deliberately dropping the inline
site-title/bio/author-links display that rev-1 had; that identity now lives only in the
manifest, feed channel, `<title>` tag, and studio settings), Created/Most-recent timestamp
lines, a version-nav scrubber, and a plain "Permalink" text link (dropping the ∞ glyph).
Feed page renders threads as excerpt cards (~300 chars of plain text) linking to `t/{id}/`;
fragments render in full as before.

**Real gap found and flagged, not silently fixed:** the version-nav scrubber implies
browsing to an older version's HTML, but §2.3 only publishes the *latest* version's content
(older content is withheld unless pinned, and pinned versions are JSON-only per §2.8 — there
is no route that serves a historical version as an HTML page). Implemented the scrubber as
display-only (all buttons disabled, showing "vN of N") rather than inventing a new route
un-reviewed — adding one (e.g. `GET /ygg/f/{id}/v{n}/`) is API-surface design, ⚠️ FABLE
territory per CLAUDE.md model routing, not a Sonnet call. Flagged below for Venkat/Fable.

**Second gap found, pre-existing, not caused this session:** `feed.test.ts`'s tests share
one D1 instance per file; second-precision timestamps plus `ORDER BY published_at DESC,
version DESC` (which only breaks ties *within* one item, not across different items sharing
a timestamp) can non-deterministically push a same-second single-version event outside the
50-entry window when an earlier test in the file has published many higher-versioned events.
Reproduced by rerunning `feed.test.ts` alone several times — different subtests fail each
run. Not touched (out of scope for tasks 13–15, and it's already-shipped session-2 core);
flagged as a fast-follow: add a monotonic sequence/rowid tiebreaker to `feedEvents()`'s
`ORDER BY`, or move to millisecond timestamps.

**Verification:** 58 tests (47 prior + 11 new thread tests), full suite green except the
pre-existing flake above; `tsc --noEmit` clean. Full owner loop driven live against
`wrangler dev` for both fragments and threads — compose/save/publish/pin/withdraw/republish,
settings save, palette search, bad-reference publish rejection with the error banner, and
discard — all verified in the browser-equivalent (curl) path, not just tests. Static export
re-run against the live instance and byte-compared: every surface matched exactly,
including the new `t/{id}/` thread page and pinned thread version files (invariant 4 holds
with threads included).

**State after:** v0.1 "Seed" is functionally complete — tasks 1–10 and 12–15 done; only
task 11 (deploy) and task 16 (brand refactor) remain, both already gated on Venkat's brand
decision. 12 tasks' worth of protocol + UI shipped and tested in one session.

**Open threads:** version-nav route gap (needs a Fable API-surface decision: add a
historical-version HTML route, or leave v0.1's scrubber display-only permanently — record
whichever in `protocol-v0.1.md`); the feed-test timestamp-ordering flake (fast-follow, not
urgent); brand decision still gates task 16 → domain/namespace → task 11 deploy, unchanged
from session 3.

## Session 3 — 2026-07-24 — Withdraw/pin protocol revision; threads into v0.1; rename question
**Model:** Sonnet 5 (wireframe feedback, proposal drafting) → Fable 5 (protocol decisions + implementation) · **Time:** ~12:15–13:30 PT · **Committed:** yes · **Deployed:** — (task 11 pending, now also gated on brand decision)

**What & why:** Started as wireframe review, became the biggest protocol session since inception. Venkat's rev-2 feedback (embeddable no-navbar public page, Created/Most-recent timestamps, |< < > >| version scrubber, dirty-state red flag, drop the ∞ glyph) led to "what does the tombstone do?" → discovery of a real gap: **silent unpublish-to-404 is indistinguishable from transient failure or never-existed** for any future subscriber. Sonnet wrote the analysis up as `docs/proposals/retract-pin-fork-proposal.md`; after a model switch, Fable adopted it with modifications (decision record in the proposal doc, locked as CLAUDE.md decisions #8–9):

1. **Withdraw replaces tombstone + unpublish** — no permanent delete of published items exists; the single exit is a permanent, *reversible* endcap (`kind: "withdrawn"`, empty content, 200 forever, one feed entry, compliant clients roll up to null). Working copy survives withdrawal (it governs the public surface, not the studio); republish = vN+1 same id. Draft discard stays a hard delete.
2. **Pins** — irrevocable per-version *hosting promises*: `items/{id}/v{n}.json` served forever, surviving edits and withdrawal. Only pinned versions are exposed (exposing all history would gut withdrawal); pins survive withdrawal by design ("reliably referenced"). IPFS mapping recorded in the proposal: item id ≈ IPNS name, content_hash ≈ CID, ygg inverts IPFS's default (mutable by default, immutable by explicit act) because it's an authoring medium. Media referenced by pinned versions must persist forever.
3. **Deviation from Venkat's original framing, flagged and accepted:** pinning does *not* force a fork. `forked_from: {id, version}` (must reference a pinned version) reserved in §2.3, lands v0.3.

Implemented same session: migration 0002, `withdraw()`/`discardDraft()`/`pinVersion()`, pin/withdraw API routes, per-version route, protocol/pages/feed/export updates. 47/47 tests; full loop driven against live `wrangler dev`; export byte-identical including pinned files. Gotcha for the record: `wrangler dev` doesn't auto-apply new migrations to the local dev DB (tests do) — `wrangler d1 migrations apply ygg --local`.

**Roadmap restructure** (reopening locked decision #6, with Venkat): **local threads moved from v0.3 into v0.1** so both core abstractions are tested in the first release — the transclusion grammar was one of the two highest-risk permanent surfaces and was previously scheduled *after* v0.2 importers hardened the network shapes. v0.3 is now "threads go cross-client" (stubs, nesting+DAG, remote snapshot semantics, forked_from). Three choices locked with Venkat: **fragments-only transclusion** in v0.1 (no cycles by construction), **`![[id]]` grammar** (own-line directives; `@vN` reserved; inline occurrences inert), **no auto-pin** (snapshot baked into self-contained HTML as `blockquote.ygg-transclusion` with `{id, version}` provenance; source withdrawal never cascades). Spec: new §2.9; schema delta specced as migration 0003 (`versions.content_html` — publish-time rendering so pinned thread versions serve historical snapshots — and `versions.transclusions` JSON); tasks 13–15 added (13–14 Sonnet-safe now; 15 rides the task-9 gate).

**Rev-3 wireframes** delivered: rev-2 set updated for withdraw/pin + two new views (`thread.html` public thread page — no title field in schema, authors use markdown H1; `thread-edit.html` — source/preview, `![[` search palette, unresolvable-reference error state).

**Rename question:** domain discussion (namespace URI is the load-bearing role, not downloads; .org preferred for commons governance; `ygg.org` taken since 2003, `yggprotocol.org`/`ygg-protocol.org` available as of today) surfaced the **Yggdrasil mesh-network adjacency** → Venkat may rename the project. Task 16 defined: brand-name refactor — single `BRAND` constant block driving URL prefix, manifest filename, JSON version key, GUID scheme, XML ns prefix/elements, generator, cookie, CSS classes; acceptance = suite passes with the constant set to `zzz`; `RENAME.md` checklist for non-importable config (wrangler.jsonc, package.json, repo/folder names). New gate order: **brand decision → rename (constants edit) → domain/namespace → deploy.**

**State after:** Worker implements the full withdraw/pin protocol, tested and live-verified; threads specced (§2.9) but unbuilt; wireframes at rev 3 awaiting review; plan doc carries tasks 13–16; nothing deployed.

**Open threads:** Venkat: rev-3 wireframe review (gates tasks 9/15) and brand decision (gates domain + deploy). Buildable now, Sonnet-safe: tasks 13–14 (threads backend), task 16 (brand refactor). `protocol-v0.1.md` (⚠️ FABLE, post-ship) must fold in: session-2 feed interpretations, session-3 withdraw/pin decision record, §2.9 grammar. Namespace URI decision now downstream of rename. Deferred design noted in proposal doc: "finalize" endcap flavor (enshrine = pin + close-the-id) if Venkat wants it later.

## Session 2 — 2026-07-18 — v0.1 build: tasks 1–8 + 10, studio gated, wireframes delivered
**Model:** Fable 5 · **Time:** ~12:14–12:40 PT · **Committed:** yes · **Deployed:** — (task 11 pending)

**What & why:** Built the v0.1 "Seed" worker per `docs/v0.1-plan.md`: scaffold, ID/hash utils, HMAC-cookie auth, item CRUD with full publish-flow semantics (draft→v1, edit→vN+1, unpublish-retract, tombstone, draft hard-delete), media upload to R2, all four protocol surfaces (item JSON, manifest, archive index, feed.xml with per-version GUIDs and 50-entry window), public HTML pages, and the static export script. 46 tests (vitest workers pool) exercise every acceptance check in the plan; verified live via `wrangler dev` with a full curl-driven owner loop; export output byte-compared identical to worker responses (invariant 4 proven). Task 9 (studio UI) deliberately **not built** — the gate holds; `/studio` serves a login-gated placeholder and the full owner API carries the load. Wireframe mockups for the review round delivered to Venkat (`docs/wireframes/`: public, studio, edit).

Two protocol interpretations made this session (Fable, on the record): (1) **feed entries for older publish events render the item's *latest* content** — §2.3's "only the latest version is published" wins over serving per-event historical content; the older entry keeps its own version number and note, only the description is latest. The alternative (serving each version's own content) would have leaked history v0.1 explicitly withholds. (2) **Tombstoned items contribute exactly one feed entry (the tombstone event)** — their earlier publish events are dropped from the window, since with content withheld they'd render as empty noise under interpretation (1). Neither is in the plan text; both should fold into `protocol-v0.1.md` when it's drafted.

Toolchain deviations from plan assumptions, for future CF sessions: `@cloudflare/vitest-pool-workers` 0.18+ dropped the `/config` subpath and `defineWorkersConfig` — it's now a Vite plugin (`cloudflareTest()` from the package root, requires vitest 4, `@cloudflare/workers-types` v5, test env types augment global `Cloudflare.Env` instead of `ProvidedEnv`). Hono `strict:false` requires routes registered *without* trailing slash (registering `/ygg/` 404s; `/ygg` matches both forms). Neither affects protocol shapes.

**State after:** `worker/` is a complete, tested publish-side client minus studio UI and deployment. Local dev works end to end (`npm run dev`, `.dev.vars` gitignored). Wireframes committed and in Venkat's hands.

**Open threads:** Venkat reviews `docs/wireframes/` before next session → clears task 9. Task 11 (deploy) needs: real D1 database ID in `wrangler.jsonc`, `OWNER_PASSWORD`/`COOKIE_SECRET` as wrangler secrets registered in `Code/.env.keys`, then the RSS-reader exit check. Still open from session 1: namespace URI/domain decision (must precede v0.2), fragment-cap sign-off (1,000 enforced this session as planned). The two feed interpretations above want explicit blessing when `protocol-v0.1.md` is drafted.

## Session 1 — 2026-07-17 — Bootstrap: spec assessment, repo, protocol decisions, project docs
**Model:** Fable 5 · **Time:** ~11:30–12:00 PT · **Committed:** yes · **Deployed:** repo published to github.com/vgururao/ygg

**What & why:** Project inception from Venkat's initial concept spec (`docs/ygg-initial-spec.md`, now frozen as the v0 reference). Critical assessment concluded the spec was ~80% complete on social/UX design but ~40% on the distribution layer; the load-bearing gap was treating RSS as the data layer (lossy, window-limited — missed edits would be lost forever, new subscribers couldn't backfill). Four decisions locked with Venkat, all now recorded in CLAUDE.md: (1) the normative protocol is a **static file contract** under `/ygg/` with `items/{id}.json` as ground truth and RSS demoted to a notification plane — this closed off the RSS-extension-only design and simultaneously solved backfill, lagging clients, and IPFS-friendliness; (2) **no-AI core first** roadmap (protocol hardens before AI touches it); (3) public repo from day one; (4) MIT + CC-BY-4.0. Two further design reframes with consequences: stable random IDs with per-version content hashes (content-addressed IDs were rejected because they can't survive editing), and the **studio/page split** (the protocol governs only the public artifact; the dynamic authoring side is unconstrained — which is also the multi-tenancy escape hatch). Privileged-group private content was deferred to L3 because it requires auth on a static page. Repo was created in `Publishing/ygg`, then moved to `Code/ygg` (it's a software project, not a publishing project); Venkat's personal deployment will later live in `Publishing/`. Session rituals (this devlog, start/close checklists) adapted from ribbonfarm_site, simplified to a single DEVLOG.md.

**State after:** Public repo live with README (protocol on one screen, roadmap table), frozen v0 spec with comment banner, issue #1 as comment anchor, Discussions enabled. `docs/roadmap.md` (full roadmap with FABLE annotations) and `docs/v0.1-plan.md` (implementable v0.1 spec for Sonnet/Opus) written this session. No code yet.

Three v0.1 protocol-shaped calls made while writing the plan, for the record: **per-version RSS GUIDs** (`ygg:{id}:v{n}`) so plain L0 readers resurface edits as new entries — closed off the same-guid alternative, which would have hidden all evolution from dumb readers; **tombstones** (deleted published items keep their item file forever as a positive deletion signal, honest that remote copies survive); **fragment cap** 1,000 chars studio-enforced / 2,000 protocol-recommended, reader enforcement forbidden.

**State after (docs):** CLAUDE.md carries session rituals (start/close, non-skippable devlog, wrap-up checklist) adapted from ribbonfarm_site, plus model routing: Sonnet/Opus build from plan docs, Fable does protocol/design work; ⚠️ FABLE annotations live in `docs/roadmap.md`. `docs/v0.1-plan.md` is a complete build spec (schemas with examples, D1 DDL, routes, auth, 11 ordered tasks with acceptance checks). Task 9 (studio UI) is gated on an HTML wireframe review round with Venkat.

**Open threads:** XML namespace URI / dedicated-domain question (v0.1 plan, Open decisions) — must settle before v0.2 importers match on it. Fragment length default needs Venkat's sign-off (plan proposes 1,000 chars). Wireframe review round for public page + studio before studio UI implementation (natural next Fable session). Normative `protocol-v0.1.md` to be drafted by Fable after v0.1 ships and stabilizes the shapes. Build tasks 1–8 are ready for a Sonnet/Opus session anytime.
