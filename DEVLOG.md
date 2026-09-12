# Blygger Devlog

Per-session development log. Non-skippable: every coding session appends an entry
(template and writing standard in [`CLAUDE.md`](CLAUDE.md)). Newest first.

> Renamed from `ygg` in session 6 (2026-07-24) — see `RENAME.md`. Entries below are
> historical and are **not** retroactively edited: sessions before 6 correctly say
> `ygg` because that was the name at the time.

## Session 17 — 2026-09-12 — Blogrolls on both nodes; a deploy protocol (after a wrong-account incident); studio UI made honest

**Model:** Sonnet 5 (blogrolls, syntax page, incident) → Opus 5 (switched at the deploy-protocol design point, per the model-switch convention) · **Time:** ~10:26–11:36 PT · **Committed:** yes (5 commits) · **Deployed:** both live nodes ×5 (syntax page, deploy-protocol validation ×2, studio UI ×2)

**What & why:** Picked up the v0.2/TK live-testing pass. Four threads, two of them unplanned.

**Testing-pass item (b), blogroll half — done.** Both nodes now publish `blogroll.opml` with the manifest `blogroll` key: Matt Webb (`interconnected.org`), Robin Sloan, Venkat's own Contraptions Substack, plus **each other** — the two test nodes are now mutually blogrolled. The cross-node subscriptions already existed from session 13's pub-sub test and only needed the `in_blogroll` flag; the three external blogs resolved cleanly through the §2.1 algorithm as `kind: "rss"` (L0). Discovered in passing that the PI node is **root-mounted** (`MOUNT=""`), so its studio is at `/studio`, not `/blyg/studio` — worth remembering when driving the two nodes with the same script. Still open from (b): making an imported item public in a hopper (curation is Venkat's call).

**Syntax cheat sheet** (Venkat's request, while starting to test TK): new `/studio/syntax` page covering transclusion (`![[id]]`, own-line, threads-only), the TK grammar, and the quote-vs-source rule — linked from the nav and from both composers' hint lines.

**Incident 2026-09-12-01 — a deploy landed in the wrong Cloudflare account.** Deploying the syntax page to the PI node, `wrangler deploy --env protocolInstitute` resolved to Venkat's *personal* account instead of the PI org account, auto-provisioned a stray empty R2 bucket there, and failed on the cross-account D1 lookup. No live impact (it failed before uploading the Worker), but the `wrangler.jsonc` comment warning about exactly this turned out to be **advisory only** — it could describe the mistake, not prevent it. This is a confirmed recurrence of a risk already in Claude memory from session 11. Recorded as `Code/incidents/2026-09-12-blygger-pi-wrong-account-deploy.md`; stray bucket deleted with Venkat's approval.

**Deploy protocol built in response** (`docs/deploy-protocol.md`, Venkat's ask; manual-trigger and blygger-spec-scoped, both his calls). Two independent guards: (1) `account_id` pinned per environment in `wrangler.jsonc` — this alone closes the root cause, verified by re-running the exact command that had failed, which now resolves correctly; (2) `worker/deploy-targets.json` + `npm run deploy:all`, which cross-checks the manifest against `wrangler.jsonc` and aborts the whole run on any disagreement (including an env with *no* `account_id` pinned), gates on tsc+vitest, preflights D1 migrations across **all** targets before deploying **any**, deploys each with its account pinned, then verifies live surfaces with cache-busting. Used for every deploy after it existed. **Secrets: pointers only** — Venkat flagged mid-build that a checked-in file must carry registry filename + key *names*, never values; a test asserts no secret-shaped strings. Account IDs are in the manifest deliberately: they are identifiers, not credentials, and the cross-check needs them. Migration detection is one-sided on purpose — only wrangler's literal `No migrations to apply!` counts as up to date, so an unrecognised format halts the deploy rather than silently skipping a schema change (both real output formats captured as fixtures by probing the live API).

**Studio UI — four things Venkat found while testing.** (i) **Index excerpts were derived from raw markdown**, so block syntax survived whitespace-collapsing as literal text (`# The famous blyg This is NOT…`) and dirty items leaked `[TK]` scopes from the working copy. Previews now come from *rendered HTML* (`src/preview.ts`): leading heading becomes a title line, TK scopes reduce via `previewStrip`, threads show a `⧉N` chip instead of stitched prose. (ii) **Reading tab**: L0 summaries kept paragraph structure instead of collapsing to one 2000-char wall, title links promoted out of the body, entries clamped by line-count (not truncated — no markup is cut) with a "more" toggle, and the feed paged at 25 (venkateshrao was rendering 96 entries / 63KB on one page). (iii) **Version history**: the index's five "previous version" arrows were **hardcoded `disabled`** — decoration implying navigation the studio never had. Replaced with a truthful `N versions · 📌 v1, v3` summary linking to pins' permanent files; the editor's flat changelog became a history panel where any version is readable (`content_html` was always retained but unreachable from the UI) plus **forward-only restore** — loads old content into the working copy to publish as vN+1, never rewinding the counter, so decision #19's +1 discipline and importer invariant #18b both hold; TK provenance is cleared on restore since it is positionally scope-aligned. (iv) **Studio chrome**: clicking any tab stranded you (no way back to the index), and navigation jumped. Added a `compose` nav link + current-section marker, and fixed three distinct causes of the jumping — pages alternated between a 65ch and 110ch body, there was no scrollbar gutter, and the title shared a line with the nav. Verified by *measuring* the first nav link's box across all six tabs plus an editor page in a real browser: identical at x=203 y=60 h=38 on every one.

**Two consolidations worth recording, both instances of the same standing hazard.** `preview.ts` initially grew its own `htmlToText`, duplicating `markdown.ts`'s `plainTextFromHtml` — merged into one implementation rather than shipping a second copy, the same drift that bit `resolve.ts` vs `feed.ts` in session 16. That merge also fixed a real pre-existing defect in it: tag-strip-only **welded words across block boundaries** (`evil.</p><p>Next` → `evil.Next`), which affected feed and page excerpts too (no hash impact — `content_hash` covers markdown, not excerpts). Separately, `stripTransclusionQuotes` shipped with a regex requiring `"` immediately after the class, so it matched **nothing** in production — the baked element carries `data-blyg-id`/`data-blyg-version`. **The live node caught it, the tests did not:** the fixture used a simplified shape. Replaced with a depth-aware scanner (which also handles a transcluded fragment containing its own blockquote, where a lazy regex stops at the inner close), and the tests now use the real baked markup.

**State after:** both nodes current and mutually blogrolled; every deploy this session went through `deploy:all` with account pinning and post-deploy verification. Tests 241 → 338. The studio index, reading feed, editor history, and chrome are all substantially reworked; nothing in this session touched protocol surface (all studio furniture per decision #3) — the one change that *would* have, giving pinned versions an HTML page, was deliberately not made and flagged for Fable/Venkat.

**Open threads:** Venkat confirmed TK generation works well (test thread on the PI node), partially satisfying testing-pass item (d). Remaining before the ⚠️ FABLE `protocol-v0.2.md` draft: (b)'s hopper half, (c) an observed cron-convergence cycle, (d) a fuller authoring pass. Five new UI/subscribe-side items in `CLAUDE.md` TODO, all from Venkat this session — the **reading-list sort bug has its root cause already located** (`l0.ts` never reads the `pubDate` that `feed.ts` parses, so `updated` is the import moment and the whole backfill sorts by fetch time). Generalizing the account-pinning fix to `venkateshrao-cloudflare/` and PI Workers projects is noted in the incident write-up, not done.

## Session 16 — 2026-09-11 — Legacy-RSS testing closes v0.2's exit criterion; studio nested under mount; TK grammar respelled to balanced tokens (decision #20 amended)

**Model:** Sonnet 5 (build/testing/implementation) → Fable 5 (TK grammar redesign ruling) → Sonnet 5 (implementation + migration resumed) · **Time:** ~11:15–13:20 PT · **Committed:** yes · **Deployed:** `blygger-org` (notes publishing, resync) ×2; `blygger-spec` worker to both live nodes ×5 (Atom fix, resolve fix, studio nesting, studioPath centralization, TK grammar respelling)

**What & why:** Picked up the v0.2/TK live-testing pass from session 15's TODO, plus two mid-session Venkat requests that became real design/implementation work of their own.

**Technical-notes publishing** (`spec-publishing-plan.md` §5, ungated Sonnet-safe work): `blygger-org/sync_spec.py` gained a notes pass (parses `docs/notes/tn-*.md` header lines for title/date/status, writes `content/notes/tn-{N}/index.md` + a generated index — no new CLI mode, runs every invocation) and `build.py` walks `content/notes/` the same depth-driven way it walks `content/spec/`. TN-1 is now live at `blygger.org/notes/`.

**Testing-pass item (a): legacy-RSS subscription — closes v0.2's three-way exit criterion, and found two real bugs doing it.** Subscribed `venkateshrao.com/blyg/` to Simon Willison's blog (Venkat's pick, from three candidates offered). It's Atom-only — no RSS 2.0 alternative — which `feed.ts` had never actually been asked to parse despite being designed for "any legacy RSS feed": `parseFeed()` only understood `<rss><channel><item>`. Extended it to also parse `<feed><entry>` (Atom's attribute-based `<link>`, possibly several per entry by `rel`; `<content>`/`<summary>` fallback; `<published>`/`<updated>` fallback), sharing the `blyg:*` extension extraction with RSS since blyg-native feeds are always RSS but the sharing costs nothing. 7 new tests, all 8 existing RSS tests unchanged, verified against the real live feed (30/30 entries parsed correctly) before touching production. Subscribing still failed after that fix — `resolve.ts`'s `extractFeedManifestUrl()` turned out to have its own independent, RSS-only copy of the same root-shape detection, never updated when `feed.ts` learned Atom. Replaced it with a call into the shared `parseFeed()` so the two can't drift apart again; added a regression test (direct fetch of an Atom URL resolves to `kind:"rss"`, not failure). Deployed, subscription created, backfill pulled 30 real entries into the merged reading feed. **Full three-way exit criterion (blyg + blyg + legacy feed) now met** — `roadmap.md` updated. Testing-pass items (b) (blogroll/hopper curation) and (c) (cron-convergence observation) remain open — both need Venkat's input/timing, not implementation.

**Studio nested under the mount** (Venkat's request, mid-session): `venkateshrao.com/studio` read oddly for a non-root deployment where `/blyg` is the whole public site — moved to `venkateshrao.com/blyg/studio`, matching the site it edits. No protocol conflict (studio is explicitly non-protocol client furniture, decision #3). Before touching the route shape, verified with a throwaway Hono reproduction that nesting studio under the mount doesn't reintroduce the cache-control leak the current host-rooted design was built to avoid (root-mount, non-root-mount-current, and non-root-mount-nested all checked — no leakage, old paths cleanly 404). `/api` deliberately stays host-rooted — it's plumbing the studio JS calls into, never a navigated URL, so nesting it would have meant threading a mount-aware base through every embedded `fetch()` call for no user-facing benefit. Root-mount `protocol-institute` node unaffected by construction (`mount + "/studio" === "/studio"` there); `venkateshrao` moves, old bookmarked `/studio` now 404s (Venkat's explicit "clean break, no redirect" call). Manually click-tested end-to-end against local `wrangler dev` before redeploying (login, item list, thread editor's live preview fetch, hoppers, hopper detail, subscriptions, logout).

**Self code-review of the day's changes** (5 findings from a `/code-review high` pass): fixed one real maintainability risk — `mount + "/studio"` had been hand-built independently at ~24 call sites across `index.ts`/`studio.ts`/`importer/studio.ts`, exactly the kind of thing that drifts the way `resolve.ts`'s duplicated detector just had. Centralized into `studioPath(mount)` in `util.ts`, migrated every site, added direct test coverage. Judged the other four findings not worth acting on: a narrowed feed-detection check in `resolve.ts` that the reviewer read as a regression is actually `resolve.ts` becoming *consistent* with `poll.ts`'s pre-existing strict check (poll.ts already required object-typed `<channel>`; the old leniency lived only in resolve.ts's own now-removed duplicate); a stale `wrangler.jsonc` route comment already covered by the clean-break decision above; two negligible per-request string-rebuild perf nits.

**Composer syntax hints** (Venkat's request): one-line muted hints above the in-feed fragment composer (markdown + `[TK...]`, no transclusion — fragments can't transclude) and the thread editor's markdown pane (markdown + `![[id]]` transclusion + `[TK...]`), matching exactly what each context actually supports.

**blygger.org staleness check** (Venkat asked): found the generated pages' provenance footer one commit stale (today's earlier commits landed after the last deploy; no spec/note text had actually changed) — resynced and redeployed. Also found and fixed a stale `CLAUDE.md` line claiming the custom-domain DNS was still pending, when `status.md` has recorded it as live since 2026-08-04 — the two files had drifted apart.

**TK grammar respelled to balanced tokens — decision #20 amended.** Venkat, reading the parser for the earlier Atom work, asked why `[TK` is unbalanced (no closing bracket) rather than `[TK]...[/TK]` or a self-closing `[TK.../]`. Explaining the session-15 "forced, not chosen" record surfaced that its actual scope was narrower than how it reads: what's forced is only that no token *terminating the instruction* may begin with `]` (a bare-`]` terminator mis-splits an instruction ending in a `![[id]]` source ref — `…![[abc]]][/TK]` cuts the ref). It never ruled out a balanced *opener*, since the opener's `]` sits before any instruction text exists. Venkat rejected the unbalanced spelling as unreadable and asked to evolve it — explicitly a Fable task per the model-routing rule (locked decision, design tradeoffs to re-derive), so switched models. Presented three real alternatives — balanced tags `[TK]…[=]…[/TK]` (minimal delta, same three-token linear scan), placeholder style `{{TK …}}…{{/TK}}` (prettiest ungenerated form, but costs close-tag-binding lookahead the fixed-order grammar structurally avoids), HTML-comment style (graceful degradation when pasted elsewhere, but the worst inline ergonomics of the three, undermining the whole point of the change) — Venkat locked in balanced tags. Recorded as an amendment to decision #20 in `CLAUDE.md`, with `tk-core-plan.md` §2.1 rewritten (two-revision grammar history) and a new §9 added: the complete Sonnet/Opus-safe implementation task list, explicit that no design latitude remained. Switched back to Sonnet for implementation.

**Grammar respelling implemented, migrated, and live-verified with a real generation, same session:** parser (`tk.ts` — both `indexOf("[TK"` scans become `indexOf("[TK]"`, instruction offset `tkIdx+3` → `tkIdx+4`; `[=]`/`[/TK]` unchanged), ~59 test-fixture literals across 4 files mechanically respelled plus 2 new cases (empty-instruction `[TK][/TK]` — the balanced opener makes this the journalism-placeholder convention, newly valid; the ref-directly-against-`[=]` regression case the whole grammar history is about), studio wrap-sugar + compose-help hints (which also fixed a pre-existing bug — the hint text `[TK an instruction]` was never valid under *either* grammar). 241/241 green, `tsc` clean, verified end-to-end against local `wrangler dev` (compose → wrap-sugar shape → live preview highlighting → publish → confirmed marker-free wire output) before redeploying. **Working-copy migration** (Venkat: migrate, don't discard, since nothing's released): wrote a one-off script (never committed — git-historical pre-respelling `tk.ts` copied in temporarily, deleted after use) that re-parses each node's drafts with the *old* grammar to find real scope boundaries — not a blind string replace, so no risk from coincidental `[TK ` in ordinary prose — and re-emits the new grammar through the same authenticated API the studio itself uses. Caught two of its own bugs via dry-run before they touched anything: wrong sequencing (data migration must happen *after* the parser deploy, not before — the reverse briefly leaves migrated content sitting on a server whose old parser misreads `[TK]` as an instruction starting with a stray `]`, confirmed by re-deriving the OLD parser's read of the new grammar) and a detection bug (`.includes("[TK")` can't distinguish `[TK` from `[TK]`'s own prefix — fixed to a negative-lookahead regex). One real scope migrated on `venkateshrao` (a snowclone fragment: "Premature ontogenic closure is the root of all prophetic evil."); `protocol-institute` had nothing to migrate. Deployed to both nodes, then **ran a real generation against the live Anthropic API** on the migrated scope to close the loop properly — `claude-opus-5` correctly identified and explained the actual Knuth quote the instruction asked for ("premature optimization is the root of all evil," 1974), the working copy spliced `[=]<output>` correctly, the TK panel flipped to "regenerate." Confirmed in passing: `AI_PROVIDER_KEY` is Venkat's regular personal `ANTHROPIC_API_KEY` (shared across `Publishing/`, `quadrantology/`, `vgr-library-code/`), already live on both nodes since session 14 — no studio-side configuration needed, the key is pure server-side Worker-secret plumbing the studio UI never touches.

**State after:** two-node network fully current on all fronts touched this session — v0.1/v0.2/TK-core deployed and live-verified, legacy-RSS leg of v0.2's exit criterion closed, studio UX improved (mount-nested + syntax hints), TK grammar redesigned and migrated with zero data loss. `blygger.org` serves the notes section and is provenance-current. Decision #20 now carries the balanced-token grammar as its authoritative spelling; the unbalanced `[TK` form is fully retired from code, tests, docs, and both live nodes' data.

**Open threads:** testing-pass items (b) (blogroll + public hopper curation) and (c) (one observed cron-convergence cycle) — both explicitly need Venkat's input/timing, not agent implementation; (d) (Venkat authoring something real with TK) is partially exercised by this session's live generation test but that used an agent-picked instruction on an already-existing draft, not Venkat's own authored content — still open in spirit. The `protocol-v0.2.md` draft (⚠️ FABLE, gated on the testing pass per decision #21's sequencing) is now unblocked except for (b)/(c). `spec-publishing-plan.md` §6 (SUPERSEDED-status mechanics) stays gated on that draft existing. `wrangler.jsonc`'s stale `/studio` and `/studio/*` Workers Routes on venkateshrao (harmless — they just route to the worker's own 404 now instead of falling through to the static site's) — noted by the code review, not fixed, since it's covered by the same clean-break call as the route-shape change itself.

## Session 15 — 2026-09-11 — TK-core deployed live; decisions #22 (ns permanence) + #23 (per-version living docs); TK grammar confirmed
**Model:** Opus 5 (deploy + site work) → Fable 5 (design rulings; switched at the design boundary per convention) · **Time:** ~10:35–11:30 PT · **Committed:** yes · **Deployed:** TK-core (migration 0005 + worker) to both live nodes; blygger.org (ns page + spec updates)

**What & why:** First session in a month. Baseline held: 228/228 tests, both
nodes serving `blyg: "0.2"` — and the PI manifest's `updated` timestamp was
ticking on the quarter-hour, meaning **the v0.2 cron poller has been running
unattended for a month**, which quietly retires session 13's
"cron convergence never observed over a real interval" thread (content-level
convergence verification still listed in the testing pass below).

**TK-core deployed to both live nodes** (Opus): migration 0005 applied
remote and workers redeployed, account ID pinned explicitly per node
(personal `7026b5…` / PI org `7e8c79…`). Live-verified: manifests/feeds 200,
`/api/items/:id/generate` returns 401 not 404 (route present, auth-gated),
venkateshrao's 12-entry feed and item index intact; PI's empty public
archive is correct (imports are never re-emitted, decision #12). TK is now
usable in both studios — remember the PI node's `AI_PROVIDER_KEY` is
Venkat's personal Anthropic key (session-14 billing crosscurrent).

**Found while verifying, worth knowing:** a Workers Route pattern with no
wildcard (`venkateshrao.com/blyg`, added because `/blyg/*` misses the bare
prefix) also **fails to match when a query string is present** — the request
falls through to the static Pages site and returns *its* 404 with a 200-page
body shape that looks like a broken deploy. Consequence beyond debugging: a
shared link with tracking params (`…/blyg?utm_source=…`) serves the static
404 today. Fix would be widening to `/blyg*` (which then shadows any future
same-prefix sibling path); deliberately not applied — Venkat's call.
Recorded in Claude memory alongside the session-13 cache-busting gotcha,
since the two interact (never cache-bust a bare mount path).

**`blygger.org/ns/0.1` page written and deployed.** The namespace URI —
the one URL in the system strangers dereference first — was serving the
*homepage* with HTTP 200 via the Pages fallback, worse than a 404. The new
page explains namespace-name-vs-location, tables the seven `blyg:` elements
(2 channel / 5 item), explains the per-version GUID scheme's dedupe
behavior for plain vs blyg-aware readers, and carries the versioning answer
below. Descriptive-not-normative on its face; `content/README.md` records
the re-check-against-spec-§7 rule.

**Decision #22 (Fable): the namespace URI is a permanent opaque token.**
Writing that page surfaced that nothing had ever locked whether
`…/ns/0.1` tracks the protocol version — #14/#16 froze every other wire
token but not the URI; `types.ts` asserted permanence in a comment whose
"once v0.2 ships importers" window closed silently at the session-13
deploys, leaving live feeds declaring `ns/0.1` under `blyg: "0.2"`
manifests. Ruled permanent, which makes that state correct rather than a
mismatch. Decisive argument beyond the Dublin-Core/Atom precedent: a
version-tracking URI would be a *stricter* version signal than the
deliberately informative manifest key (#18d) — incoherent — and would
break exactly the readers the ignore-unknown-`blyg:*` rule protects.
Renaming to a version-free `/ns` while pre-1.0 still allows it was
considered and rejected: post-deploy churn for a cosmetic gain, and the
page at the URI answers the confusion where it arises. Recorded in
CLAUDE.md #22, spec §7 (new bullet), the ns page, `types.ts`.

**TK grammar §2.1 confirmed (Fable), closing session 14's flag — and the
prose rule turns out to be forced, not merely chosen:** any closing token
beginning with `]` mis-splits an instruction *ending in a source ref*
(`…![[abc]]][/TK]` cuts the ref), and refs-in-instructions are the primary
case the grammar exists for (§2.2). So the canonical typed form is
`[TK instruction[=]output[/TK]` — no `]` terminates the instruction. The
plan's illustrated examples (§2.1/§2.2/§2.4) carried a spurious `]` and
were corrected with a note; `tk.ts` doc-comments fixed; `tk.test.ts` header
flag marked RESOLVED; decision #20's record amended. **No code change** —
session 14 implemented the correct reading, and `studio.ts`'s wrap-sugar
was already right; session 14's devlog entry showing `][/TK]` in the sugar
description was a prose typo, not a code bug (left as-is, historical).

**Decision #23 (Fable + Venkat): per-version spec documents, highest is
living.** The 0.1-doc/0.2-wire mismatch was a symptom: the subscribe side's
normative record is scattered across `v0.2-plan.md` and decisions #17/#18.
Resolution: each protocol version gets a standalone-complete document
(superset revision, never a delta — a `/spec/{version}/` URL hands an
implementor one document); testing-driven revisions (#21) land only in the
highest-numbered doc; on N+1's publication, N freezes as SUPERSEDED
(forward-linking banner, snapshots untouched — immutability outranks
supersession). Amends #15's structure; §2's "freezes at stable" language
formally retired (already dead under #21). Mechanics spec'd Sonnet-safe in
`spec-publishing-plan.md` §6; 0.1's status header now pre-announces its own
supersession.

**Sequencing ruling (Fable): the v0.2/TK live-testing pass comes BEFORE
drafting `protocol-v0.2.md`.** Per #21, testing precedes normative prose,
and the 0.2 doc would describe surfaces with zero operational hours: the L0
wrapper has never touched a real (messy) RSS feed — the unmet third leg of
v0.2's own exit criterion; blogroll and public hoppers are live but unused;
cron convergence inferred, never content-verified; TK never used by a real
author on a live node. Drafting first would invert #21 and buy only churn.
CLAUDE.md TODO now carries the testing pass as an explicit gate on the
draft.

**State after:** two-node network fully current — v0.1 + v0.2 + TK-core all
deployed and live-verified on both nodes. blygger.org serves the ns page and
the updated spec (§7 namespace bullet, lifecycle status header). Decisions
locked through #23. Next major work, in order: the testing pass (Sonnet/
Opus + Venkat-manual), then the ⚠️ FABLE `protocol-v0.2.md` draft, then
`spec-publishing-plan.md` §6 mechanics; §5 technical-notes publishing is
ungated and Sonnet-safe whenever.

**Open threads:** the testing-pass TODO (4 items, CLAUDE.md); §5
technical-notes publishing (TN-1 still unpublished); bare-path
route-vs-query-string behavior left unfixed (Venkat's call on `/blyg*`
widening); `wrangler.jsonc`'s inert top-level env block still carries the
orphaned rehearsal D1 id (harmless, annotated); blygger.com still dark —
no DNS records, scaffold repo only, no active role since the session-8
retargeting.

## Session 14 — 2026-08-10 — TK-core built end-to-end: instructed generation, all 8 tasks
**Model:** Sonnet 5 · **Time:** ~19:17–20:13 PT · **Committed:** no (pending Venkat's review) · **Deployed:** `AI_PROVIDER_KEY` secret set on both live nodes (`blyg-venkateshrao`, `blyg-protocol-institute`); worker code itself **not yet deployed** — pending explicit go-ahead

**What & why:** Implemented `docs/tk-core-plan.md` in full — all 8 ordered tasks,
from the scope parser through static-export verification — working straight
from the session-12 design doc per CLAUDE.md model routing. New code:
`worker/src/tk.ts` (grammar parser + publish-time HTML disclosure),
`worker/src/ai/provider.ts` (Anthropic Messages API client), `worker/src/tk-generate.ts`
(`/generate` endpoint logic), plus integration into `model.ts`'s `publish()`
and the studio editors. 228/228 tests green (63 new), `tsc --noEmit` clean.

**Grammar ambiguity found and resolved, not silently — flagged for Fable/Venkat.**
`tk-core-plan.md` §2.1 states the parser is a linear 3-token scan (`[TK` …
optional `[=]` … `[/TK]`) chosen specifically so `![[id]]` refs never need
escaping ("no bracket balancing"), but the same section's illustrated examples
write `[TK <instruction>][/TK]` — a literal `]` closing the instruction before
`[/TK]`, which would require exactly the bracket-tracking the prose says to
avoid. Implemented per the explicit, twice-stated prose rule (also the only
internally-consistent reading); the examples' `]` is a documentation artifact.
Recorded in `tk.test.ts`'s header and worth a one-line Fable/Venkat confirmation
that the reading is correct, since it's the actual byte-level syntax authors
will type.

**Block vs. inline classification (§3.2's "inline output" vs "block output"),
an implementation-level design call the plan didn't specify:** a scope is
**block** when it occupies a paragraph by itself — preceded and followed only
by a blank line or a document edge — and **inline** otherwise. Chosen because
it's CommonMark's own definition of "standalone paragraph," so it composes
correctly with markdown-it's own paragraph detection instead of fighting it.
Verified live in the browser: a whole-paragraph scope renders as
`<div class="blyg-tk-gen">`, a mid-sentence scope as `<span class="blyg-tk-gen">`
inline in the same `<p>`, and two scopes with no blank line between them (an
edge case the heuristic doesn't special-case) both fall out as inline —
documented behavior, not a bug.

**Rendering technique: Unicode Private Use Area sentinels, not a custom
markdown-it plugin.** Publish needs to (a) bake `blyg-tk-gen` wrappers around
generated spans and (b) — for threads — still run the existing transclusion
walker unchanged. Block spans are rendered independently
(`renderMarkdown(text)`) and spliced in via a unique opaque placeholder token
that's alone in its own paragraph (guaranteed by the block-position rule
above), so a multi-paragraph generated block never gets split by the
surrounding document's own rendering. Inline spans are sentinel-wrapped
*in place* (real text between two markers) so surrounding markdown constructs
— emphasis, links — still parse correctly across the span boundary; the
sentinels survive markdown-it's rendering (PUA chars aren't `&<>"'`, so
`html:false` never touches them) and get string-replaced for the real tags
afterward. This let `transclusion.ts`'s `walk()` stay **completely untouched**
for the thread path — TK spans are just inert text to it, since PUA sentinels
can never match the `![[id]]` directive regex. `resolveFragment()` was
factored out of `walk()` (pure refactor, all 11 `threads.test.ts` cases still
pass unchanged) so TK source resolution reuses the exact same
local/published/fragment-only rule the plan requires ("must resolve like
transclusion targets").

**Provenance-storage bridge, a real gap the plan didn't cover — flagged and
filled, not improvised silently:** §2.3 requires sources to resolve to "the
latest published version *at generation time*," with edits/withdrawals of the
source *after* generation never touching the already-generated output
(snapshot independence, same rule as §10.4). But the plan's only DB change is
`versions.generated_json` — written at *publish* time. Between a `/generate`
call and the next publish, something has to remember which sources/model/
timestamp produced each scope's current output, surviving further plain edits
to the working copy. Added `items.tk_provenance_json` (migration 0005,
alongside the plan's `versions.generated_json`) — a working-copy-side cache,
positionally aligned to scope order as of the last `/generate` call,
consumed at publish to build the wire `generated[]` array and decide which
spans get the `blyg-tk-gen` wrapper. A scope with output but no cached
provenance (hand-authored, never run through `/generate`) gets **no**
wrapper and **no** `generated[]` entry — nothing was actually generated, so
there's nothing to disclose. Known, documented limitation: reordering/adding/
removing scopes between generate calls can misattribute provenance by
position — the same class of fragility the plan's own index-based
`{scope: n}` API already has, not a new one introduced here.

**Fragment cap moved inside `publish()`, from `api.ts`'s pre-check:** the old
check compared the *raw working copy* (with `[TK…]` markup) against
`FRAGMENT_MAX_CHARS`, which is now wrong in either direction once TK is
involved — instructions can push the draft over 1000 chars while the
generated output stays short, or vice versa. `publish()` now checks the
*stripped* (published) length and throws `FragmentTooLongError`; `api.ts`
just catches it. Tested both directions explicitly.

**Provider implementation is raw `fetch`, not `@anthropic-ai/sdk`:** this
Worker has no `nodejs_compat` flag and a deliberately tiny dependency set
(hono, markdown-it, fast-xml-parser); the SDK is Node-oriented. Followed the
`claude-api` skill's model table (default `claude-opus-5`, confirmed via
`ant`-skill guidance, not memory) and the codebase's existing DI convention
(`importer/http.ts`'s `FetchLike`) for a `ProviderFetchLike` so
`provider.test.ts` and `tk-generate.test.ts` mock the request/response shape
with zero real network calls.

**Live-verified against the real Anthropic API, not just fixtures:** after
tests were green, ran a real `wrangler dev` loop — added `AI_PROVIDER_KEY` to
`.dev.vars` temporarily (removed after), published a source fragment, created
a thread with a block transclusion quote + an inline TK scope citing that
fragment as a source + a pure-instruction scope, called `/generate` on both
scopes against `claude-opus-5` for real, published, and diffed the live
`items/{id}.json` byte-for-byte against a fresh `scripts/export.ts` run —
identical, including the `generated` array and the baked HTML wrappers.
Confirms invariant 4 holds for TK content, matching session 13's precedent
for v0.2. Studio UI (task 6) also driven live in the browser: scope
highlighting (block div / inline span, exactly as designed), the
Generate/Regenerate panel, and the combined transclusion+TK preview all
render correctly; the publish-error banner and "generate whole fragment"
sugar (wraps the current draft as `[TK instr[=]existing][/TK]`) were built
but not independently re-verified live (code-reviewed against the same
pattern as the working transclusion-error banner).

**Secret + settings (task 7), with an explicit decision from Venkat:** asked
whether to mint a new dedicated Anthropic key for blyg or reuse the existing
personal `Code/.env.keys` `ANTHROPIC_API_KEY` (shared with Publishing/
quadrantology/vgr-library-code, "expires periodically"); Venkat chose reuse.
Registered the new consumer in `Code/.env.keys`'s comment and set it as
`AI_PROVIDER_KEY` via `wrangler secret put` on both live nodes, verifying the
account ID before each (`7026b5...` personal for `venkateshrao`,
`7e8c79...` PI org for `protocolInstitute`) per the standing multi-account
caution. **Billing crosscurrent flagged explicitly, not buried:** the PI
node's worker infra is org-billed, but this key is Venkat's personal
Anthropic account, so TK generation costs *on the PI node* land on Venkat
personally, not the org — recorded in both `protocol-institute/.env.keys`
and `admin/keys.md`'s registry table (not silently matching the existing
`owner: org` convention used for that worker's other secrets).

**Unrelated gap found and fixed while here:** `worker/.dev.vars` was
`.gitignore`d correctly but missing the Dropbox-ignore xattr required by
`Code/security-policy.md` Rule 6 — had been that way since it was created
(OWNER_PASSWORD/COOKIE_SECRET already in it). Applied `com.dropbox.ignored 1`
before adding the real Anthropic key to it for local testing, removed the key
afterward once the live-verification loop was done.

**State after:** TK-core is fully implemented, tested, and live-verified
against the real provider — fragments and threads can both carry `[TK]`
scopes, generate/regenerate through the studio or the API, and publish with
correct disclosure. `AI_PROVIDER_KEY` is provisioned and ready on both live
nodes. Migration 0005 and the new worker code are **not yet applied/deployed
to either live node** — this session built and verified locally + against
the real API, but did not touch the live Workers' code (only their secrets),
since that's a separate deploy decision. `docs/tk-core-plan.md` and
`docs/roadmap.md` updated to DONE; `CLAUDE.md` TODO checked off.

**Open threads:** deploy migration 0005 + the new worker code to both live
nodes when Venkat wants TK live (straightforward — same pattern as session
13's v0.2 deploy); confirm the §2.1 grammar reading with Fable/Venkat (cheap,
doesn't block anything since the reference implementation already commits to
one reading); the positional-provenance-realignment limitation is documented
but not engineered around — revisit if it ever bites in practice. Carried
over from session 13, still open: the legacy-RSS leg of the three-way exit
criterion, and nothing yet in either node's blogroll/public hoppers.

## Session 13 — 2026-08-10 — v0.2 "Roots" built end-to-end: subscribe side, all 14 tasks
**Model:** Sonnet 5 · **Time:** ~10:47–12:16 PT · **Committed:** yes (`cddf09b`, then a deploy-record follow-up commit) · **Deployed:** both live nodes — `blyg-venkateshrao` and `blyg-protocol-institute`, migration 0004 applied remotely, real bidirectional subscription confirmed converging

**What & why:** Implemented `docs/v0.2-plan.md` in full — all 14 ordered tasks, from
migration 0004 through the simulated-outage integration test — in one session, working
straight from the session-12 design doc per CLAUDE.md model routing (Sonnet-safe
throughout, no protocol redesign needed). New code lives under `worker/src/importer/`
(13 modules) with `worker/test/importer/` (14 test files, 90 new tests); the full suite
ends the session at 163/163 green, `tsc --noEmit` clean throughout.

**Resolution (`importer/resolve.ts`, §2.1) and transition (`importer/transition.ts`,
§3.3)** are both pure functions taking an injectable `FetchLike` (`importer/http.ts`) —
a deliberate implementation choice, not a protocol one: platform `fetch()`'s
`Response.url` is only meaningfully populated by a real network round-trip, so a
custom `FetchLike` (`{ok, status, url, headers, text()}`) decouples "final URL after
redirects" from that platform quirk and makes every importer module testable with
plain deterministic fixture stubs instead of a real HTTP layer or `MockAgent`
plumbing. `resolve()` implements the six-step algorithm exactly (direct probe →
feed-upgrade via a real XML parse, not just a regex → one-hop rel probe → conventional
mounts → RSS fallback), using `HTMLRewriter` (native to the Workers runtime) to extract
`<link>` tags instead of a hand-rolled regex or a DOM dependency. `transition()`
implements every table row from §3.3 plus the edge cells the table doesn't literally
name (e.g. a same-version re-fetch whose kind contradicts the local state) — per
CLAUDE.md's model-routing rule, those fall back to a safe ignore-and-flag
(`"unrecognized-transition"`) rather than inventing new protocol semantics; worth a
Fable pass if they ever prove reachable in practice, but they shouldn't be under an
honest origin (withdrawal is itself a version bump, so a same-version document can't
legitimately change kind).

**Index reconciler + poll cycle (`importer/poll.ts`, §3.2)** implements the full
gap-check/backoff/degrade machinery. One real gap found while implementing: the plan's
"import the full archive on first subscribe" was originally wired as a direct
`reconcileIndex()` call from the subscribe API — but that bypasses `pollSubscription()`'s
own bookkeeping (`newest_guid`, `etag`, `last_index_sync_at`), so the *next* real poll
would find `newest_guid` still null and never trigger gap detection correctly. Fixed by
having initial-subscribe call `pollSubscription()` itself: a fresh subscription's null
`last_index_sync_at` already makes that first call reconcile unconditionally, so it's
a strict simplification (one code path instead of two) that also fixes the bootstrap
bug. Caught this before it shipped, not after — no protocol impact, pure implementation
correctness.

**Hoppers' pin-retention integration (§3.4)** hooks into `poll.ts`'s `rollup-null`
handling: at withdrawal-processing time, if the item is in any hopper, one extra fetch
checks whether the origin still pins the last-known version; if so,
`imported_items.pinned_version_retained` is set and content survives, otherwise it's
wiped to the placeholder state. Scoped to hopper-tracked items only (the only place the
distinction is user-visible) to avoid a pin-check fetch on every withdrawal.

**Sanitization, not in the plan doc but required by §12:** `content_html` fetched from
a remote origin is untrusted HTML and §12/§3.3 both say it MUST be sanitized before
rendering. Added `importer/sanitize.ts` — an allowlist-by-removal sanitizer built on
`HTMLRewriter` (strips `script`/`style`/`iframe`/`object`/`embed`/`form`, `on*` handler
attributes, `javascript:` URLs), applied at render time in the reading feed and public
hopper pages, never at storage time (ground truth stays verbatim, per the spec's own
"sanitize at render, store verbatim" framing). L0 imports skip it structurally instead:
their `content_html` is always our own `renderMarkdown()` output (html:false), never
the origin's raw bytes, so there's nothing to sanitize.

**Version key bump:** landing the blogroll manifest key triggered §2.3's own rule —
`PROTOCOL_VERSION` and `GENERATOR` bumped from `0.1`/`blyg-ref/0.1.0` to
`0.2`/`blyg-ref/0.2.0` (package.json version too). `BRAND.nsUri` (the XML namespace)
was deliberately left at `ns/0.1` — namespaces are permanent identifiers per decision
#14/#16, not version trackers.

**Static export (task 13) verified live**, not just unit-tested: ran a real
`wrangler dev` instance, published content, subscribed it to itself over real loopback
HTTP (`resolve()` against `http://127.0.0.1:8787/blyg/` — genuine self-fetch, not a
sandbox trick), created a public hopper, then ran `scripts/export.ts` and byte-diffed
`blogroll.opml`, the hopper page, and the manifest against the live routes — all three
identical, confirming invariant 4 holds for the new v0.2 surfaces. `--hoppers` is a new
required-if-you-want-them CLI flag (comma-separated slugs): the protocol has no public
"list of public hoppers" surface by design (§4.2 only adds `blogroll.opml` and
`/h/{slug}/`), so the export script can't discover them itself — the operator names
which of their own public hoppers to mirror, the same way they already name `--base`.

**Simulated-outage integration test (task 12)** runs against the real worker via
`SELF.fetch` wrapped as a `FetchLike` — both "nodes" are the one worker under test (it
publishes its own content and subscribes to itself), but the HTTP path is real, not a
fixture map. The scenario is deliberately adversarial: a missed edit and a withdrawal
are both pushed completely out of the 50-entry feed window by unrelated churn on a
third item *before* the subscriber ever reconnects, so the test can only pass if index
reconciliation — not the feed trigger-set — is what recovers them. It does, item-by-item,
on the first run.

**Deployed to both live nodes and real cross-node pub-sub verified, same session
(cont'd):** after committing/pushing the implementation, Venkat asked to continue
straight into deployment rather than defer it. Applied migration 0004 remotely to
both D1s (`blyg-venkateshrao` under the personal CF account
`7026b5d7c1ad16cb808987576bb07ab2`, `blyg-protocol-institute` under the PI org account
`7e8c7969b2464d23795c555bc6a32af8` — verified against `Code/.env.keys` and
`protocol-institute/admin/keys.md` before touching either, per the standing
multi-account-risk caution), then `wrangler deploy` to both named environments — both
came up clean, cron trigger (`*/15 * * * *`) registered on both. Logged into both
studios (owner passwords pulled from the registered key stores) and set up **real**
bidirectional subscriptions: `venkateshrao.com/blyg/` ↔ `blyg.protocol-institute.org`,
each resolving and confirming the other over actual internet HTTP, not a test fixture.
protocol-institute's initial backfill correctly pulled all 5 of venkateshrao's real
published items (verified via its `/studio/reading` page — 5 entries, all attributed
to "Venkatesh Rao's Blyg"). Published a new fragment live on venkateshrao, triggered
`POST /api/subscriptions/{id}/resync` on protocol-institute's side, and watched it
land (`{"ok":true,"changed":1}`, content confirmed present in the reading feed) — the
actual multi-node pub-sub loop Venkat has wanted since session 11's release-bar framing.

One non-obvious hiccup, recorded for future curl-driven sessions: the owner passwords
for both nodes contain `+` and `/` characters (base64-ish, generated per
`security-policy.md`), and `curl -d "password=…"` does **not** URL-encode the value —
`+` silently becomes a space on the server's form-decode, so login failed with no
useful error until switching to `curl --data-urlencode`. Also hit Cloudflare's edge
cache (public routes carry `Cache-Control: public, max-age=60`) serving a stale
pre-deploy manifest for ~60s after each deploy — resolved by cache-busting with a
throwaway query param, not a real problem.

**State after:** v0.2 "Roots" is fully implemented, tested, deployed, and *proven live*
— both nodes running the new code, migration 0004 applied to both, subscribed to each
other, backfilled, and confirmed converging on a real publish + resync round-trip. The
roadmap's v0.2 exit criteria (two live nodes converging) is now actually met, not just
implemented — `docs/roadmap.md` updated accordingly. Cron will carry ongoing
convergence going forward at the registered 15-minute interval; not yet manually
observed (would require waiting out a real interval), but the underlying poll path is
identical to what `resync` just exercised successfully.

**Open threads:** the legacy-RSS leg of the roadmap's three-way exit criterion (blyg +
blyg + one legacy feed) isn't set up yet — pick a real external RSS feed and subscribe
one node to it when convenient; not blocking, the L0 path is already fully tested in
isolation (task 6). Neither node has anything in its blogroll or a public hopper yet
(the plumbing is live and tested, just unused) — worth flagging one item public on one
side as a demonstration when there's real content worth curating. The
`"unrecognized-transition"` fallback cells in `transition.ts` are still worth a quick
Fable sanity-check if they ever actually fire in production logs (they shouldn't,
under honest origins).

## Session 12 — 2026-08-10 — Snapshot №1 live; v0.2 + TK-core designed; decisions #17–#21
**Model:** Sonnet 5 (task 7 execution), then **Fable 5** via `/model` (all design work) · **Time:** ~10:00–10:50 PT · **Committed:** yes (both repos) · **Deployed:** `blygger-org.pages.dev` ×2 — snapshot №1 (`/spec/0.1/2026-08-10/`), then the revised spec status header

**Sonnet half — task 7 closed:** Session 11 held task 7 (first real snapshot) for explicit go-ahead; Venkat gave it at session open. Verified both repos already clean/pushed (session 11's push-hold had been cleared before this session — "push held" open-thread wording can outlive the actual push). `sync_spec.py snapshot` tagged + pushed `spec/0.1/2026-08-10`, wrote the dated page, regenerated latest's Previous-version link + `/spec/` index. **Deploy hiccup, caught:** first attempt used `./deploy.sh --no-build`, which correctly skips sync+rebuild — so it redeployed session 11's stale `dist/` without the snapshot. Caught via `dist/` mtimes, redone with plain `./deploy.sh`, all three URL shapes verified live. Lesson: `--no-build` is never right after `sync_spec.py snapshot` (which only touches `content/`).

**Fable half (post-`/model` switch), four design deliverables:**

**1. v0.2 "Roots" plan** (`docs/v0.2-plan.md`; decisions #17–#18) — both roadmap ⚠️ FABLE items resolved. Resolution algorithm (#17): deterministic bounded probe order (direct manifest → `<blyg:manifest>` feed-upgrade → one-hop `rel="blyg"` → conventional mounts → RSS/L0); **subscription identity = final fetch origin, never self-asserted `site`** (mirrors can't inherit identity). Importer (#18): **the archive index is the reconciliation surface, the feed a cheap trigger** — gaps/skew/malformed-feeds degrade to an index diff, never loss; **no-silent-regression watermark** (history rewrites are surfaced, user-reset only); **retention past withdrawal follows the origin's own serving surface** (pinned versions retainable, everything else rolls to null — settles hopper-copy-vs-withdrawal); blogroll = plain OPML 2.0, zero extensions (feed-upgrade makes standard OPML blyg-transparent). Transition function specced as a pure table-driven function; 14 Sonnet-safe tasks; exit = the two live nodes + a legacy feed converging through simulated outages.

**2. Versioning question closed (decision #19, TN-1):** Venkat proposed semver for future auto-pin heuristics. Rejected — the +1 discipline is load-bearing for #18's watermark; the counter is wire-permanent surface; semver encodes API semantics prose lacks. Counter-proposed an additive `edition` field; **Venkat rejected that too, on design-intent grounds: an edition bump is cheap talk; a pin is a costly signal** — publishers should think consciously in pins, not version-structure skeuomorphism. Auto-pin dissolves into pin-suggestion studio UX (fourth leg: significance markup, like AI/identity/editorial convenience, is never in the protocol). Recorded as `docs/notes/tn-1-versioning-and-pins.md` — the first **technical note**, a new genre (numbered, non-normative design-reasoning records, especially rejected designs); publishing pipeline to `blygger.org/notes/` planned as `spec-publishing-plan.md` §5 (Sonnet-safe, not executed).

**3. TK-core plan** (`docs/tk-core-plan.md`; decision #20; amends locked #6's build order with Venkat): Venkat wants usable TK + multi-node pub-sub ASAP. Pub-sub = v0.2's exit criterion, already next. TK's authoring core depends only on v0.1 machinery, so **v0.4 split and TK-core pulled ahead of v0.3** (build order now v0.2 → TK-core → v0.3 → v0.4-remainder; matches the session-11 release bar of TK + pubsub). The contract: **two-layer split** — TK grammar (`[TK instruction][=]output[/TK]`, inline or block, no nesting, both item kinds) is studio-private and never reaches the wire; published `content_md` is marker-free ordinary markdown (hash covers what readers read), provenance via item-doc `generated[]` + baked `blyg-tk-gen` class, mirroring transclusion's two-plane pattern (amends the session-7 §4 inert-markers lean). **Quote-vs-source rule resolves the session-11 inline question without touching #9:** own-line `![[id]]` outside scopes = transclusion (verbatim quote), any `![[id]]` inside a scope = generation source (woven, disclosed, never a blockquote); scopes compose with transclusion by exclusion. Publish with unresolved scopes errors; generation is always an explicit author-reviewed act. One provider-call interface for all hooks (reference targets Anthropic Messages API; implementing session loads the `claude-api` skill). 8 Sonnet-safe tasks.

**4. Development-phase strategy (decision #21, Venkat):** building the reference implementation **is** testing the protocol. Every spec version < 1.0 is a working draft — no pre-1.0 version is ever declared stable (supersedes freeze-0.1-at-stable; #15's "freezes at stable" amended). **v1.0 is the first version we stand behind**, published to a larger audience at a deliberate release event; until then spec users/builders should assume no promises, including the wire (the #14/#16 wire-permanence discipline manages *our* migration cost, it's not an outsider guarantee). Testing cohort: Venkat alone on the two nodes, possibly a few invited testers pre-1.0, no open beta. Documented in the spec's status header (public-facing, deployed this session), `roadmap.md` "Development-phase strategy," and #21.

**State after:** Snapshot №1 + revised status header live on blygger.org. Every Fable item designable at this point is designed: v0.2 and TK-core are implementation-ready plan docs; remaining ⚠️ FABLE gates are filter-plugin API (needs v0.2 built), webmention mechanics + DAG semantics (v0.3 plan), staleness-over-DAG (needs v0.3). Locked decisions now run #1–#21.

**Open threads:** Next sessions are Sonnet implementation work: `v0.2-plan.md` (14 tasks — gates pub-sub testing) and `tk-core-plan.md` (8 tasks — independent of v0.2, order per Venkat's preference), plus the small `spec-publishing-plan.md` §5 notes pipeline in `blygger-org`. Venkat will have TK/v0.2 design feedback only after trying the implementations — expect testing-driven spec revisions per #21. Open decisions parked in the plans: v0.2 §7 (poll interval, import depth, hopper-page timing), TK §8 (disclosure strength, `.blyg-tk-gen` styling, build order vs v0.2).

## Session 11 — 2026-08-09 — Route bugfix; PI org node deployed; spec publishing automated
**Model:** Sonnet 5 · **Time:** ~14:15–16:05 PT · **Committed:** yes (blygger-spec + blygger-org; push held for this wrap-up) · **Deployed:** `blyg.protocol-institute.org` (new); `blyg.vgr-702.workers.dev/blyg/` decommissioned

**What & why:** Venkat resumed testing the two nodes from session 10 and hit two bugs: `venkateshrao.com/blyg` (no trailing slash) 404'd, and the public page showed no login/nav link. The second was by design (decision #3 — studio deliberately unlinked from the public page — explained, not fixed). The first was real: Cloudflare's Workers Routes `/*` wildcard requires the literal trailing slash and doesn't match the bare prefix, so `/blyg` fell through to the underlying Pages site's 404 instead of ever reaching the worker. Fixed by adding exact-match route entries (`/blyg`, `/studio`, `/api`, no wildcard) alongside the existing wildcards in `wrangler.jsonc`'s `venkateshrao` env, redeployed, verified both forms 200/302 correctly.

**Protocol Q&A, recorded as input for the v0.4 Fable pass:** Venkat asked how transclusion syntax should support inline, instructed AI generation (e.g. "As Einstein said, ![[id]], instruction: simplify..."). Walked through why that's incompatible with the locked block-level `![[id]]` grammar (decision #9) and the frozen v0 spec's `[TK]...[/TK]` scope concept, then recorded the concrete tension — inline-vs-block-only TK scopes — as `docs/proposals/curation-discovery-generation-proposal.md` §4 item 6, flagged for Fable, not resolved here (routing rule: don't improvise protocol semantics as Sonnet).

**Release-scope conversation, also just recorded:** Venkat deferred all UI feedback until TK-transclusion + cross-blyg subscribe/pubsub work, and separately named the release bar for "blygger is ready to release" as a stable spec plus **two** reference implementations — this Cloudflare one, and a not-yet-designed local/laptop folder-based implementation deploying to static hosts (GitHub Pages, Netlify), gated on the CF client reaching TK+pubsub+UI-refresh "feature complete." Recorded in `docs/roadmap.md` (new "Release candidate" section between v0.5 and v1.0, plus a deferred UI-refresh bullet added to v0.5) and mirrored in `CLAUDE.md`'s TODO — explicitly marked as Venkat's scope/sequencing intent, not a locked Fable decision.

**Second two-node-network node — deployed to `blyg.protocol-institute.org`, not `protocol-institute.com`:** Venkat asked to mount the second test node on the existing `protocol-institute.org` Cloudflare zone (already onboarded, unlike `.com`) rather than continuing to wait on `.com` DNS. Investigation found `.org`'s root path space is taken by a live production API (member directory, symposium voting, admin — 25+ routes via Cloudflare Pages Functions at `/api/*`), and blyg's own `/studio`+`/api` routes are host-rooted regardless of `MOUNT` (by design, `index.ts`) — path-mounting there would have hijacked PI's real API. Proposed and got sign-off on a dedicated subdomain instead (`blyg.protocol-institute.org`, `MOUNT=""`), which has its own path space entirely. Provisioned under the **PI org Cloudflare account** (`7e8c7969b2464d23795c555bc6a32af8`), not Venkat's personal one — confirmed explicitly via `wrangler whoami` with the PI org token before touching anything, per Venkat's direct instruction to double check. D1 + R2 provisioned, 3 migrations applied remotely, `OWNER_PASSWORD`/`COOKIE_SECRET` generated and set, worker deployed. Registered new resources/secrets in `protocol-institute/admin/keys.md` + `protocol-institute/.env.keys` (not `Code/.env.keys` — PI's own convention, confirmed from that repo's `website/CLAUDE.md`).

DNS was the remaining gap: the PI API token has Workers Routes permissions but no DNS scope (confirmed both by a failed API call and by the zone's own token-permissions list) — Venkat added the record manually in the dashboard. One wrinkle along the way: Venkat saw a "custom domain" entry in the dashboard before any DNS record existed, which turned out to be the plain zone Route already created (confirmed via the Workers Routes API — the dashboard's per-worker triggers view doesn't clearly distinguish a Route from Cloudflare's separate, DNS-auto-provisioning "Custom Domains" feature, which had zero entries for this hostname via its own API). After the real DNS record went in, full server-side verification passed (manifest, feed.xml, studio login redirect) — resolution briefly appeared broken locally due to macOS's negative DNS cache, not the deployment; bypassed with `curl --resolve` to confirm the server side independently of the client cache.

**Decommissioned the workers.dev rehearsal instance:** with both real two-node-network nodes now live, Venkat asked to retire `blyg.vgr-702.workers.dev` (session 10's rehearsal deploy, never attached to a real domain). Checked it wasn't empty first (4 throwaway test items, R2 bucket empty) before confirming full-teardown scope with Venkat; deleted the Worker, D1 database, and R2 bucket from the personal Cloudflare account. `wrangler.jsonc`'s now-orphaned top-level block annotated so a future bare `wrangler deploy` doesn't silently attempt to reuse dead resource ids. Cleaned the matching `BLYG_REF_*` secrets out of `Code/.env.keys`.

**Fixed the `feed.test.ts` flake** (long-standing fast-follow item): `feedEvents()`'s `ORDER BY` only tiebroke on `version DESC` after `published_at DESC`, so same-second events with also-tied versions across different items could sort nondeterministically. Added `v.rowid DESC` as a third tiebreaker — monotonic with insertion/publish order, resolves ties correctly. Full suite green (67/67); `feed.test.ts` run 5× standalone to build confidence.

**Executed `docs/spec-publishing-plan.md` (tasks 1–6 of 7):** `blygger-org/sync_spec.py` (new, stdlib-only) is now the sole writer of `blygger-org/content/spec/` — latest mode surgically rewrites the This/Latest/Previous-version header bullets (via new `<!-- spec-links:begin/end -->` markers added to `docs/protocol-v0.1.md`, markers only per task 4) while passing every other header bullet through verbatim, adds a generated-file banner + footer provenance stamp (source commit sha, no wall-clock timestamp — kept idempotency clean), and also (re)generates `content/spec/index.md` (version/status table, snapshot list with GitHub compare links, reference-implementation section gated on a `ref-v*` tag existing). Snapshot mode refuses on a dirty or unpushed `blygger-spec` tree, refuses to overwrite an existing dated dir, tags+pushes `spec/{version}/{date}` in `blygger-spec`, and regenerates latest's Previous-version link. `blygger-org/build.py`'s previously fully-hardcoded two-page build replaced with a recursive walker over `content/spec/` (depth-driven title/description/rail derivation, since the tree shape — index / version / version+date — is fixed). `blygger-org/deploy.sh` fixed per task 1: no longer hardcodes the Cloudflare token/account id (already registered generically in `Code/.env.keys`), reads them with a clear failure if unset, runs `sync_spec.py` before `build.py`. Verified: idempotent latest-mode output (byte-identical across repeated runs), snapshot mode's dirty-tree refusal, full local build producing the correct `dist/` tree with correct titles/prompts. **Task 7 (cut the actual first snapshot) deliberately not done** — it requires pushing `blygger-spec`, pushing a public tag, and a live `blygger.org` deploy, which Venkat asked to hold for this wrap-up rather than doing mid-session.

**State after:** Two-node test network is `venkateshrao.com/blyg/` (personal account) + `blyg.protocol-institute.org` (PI org account) — the workers.dev rehearsal is gone. `feed.test.ts` flake fixed. Spec-publishing automation is code-complete and locally verified but not yet exercised live (no snapshot cut, no `blygger-org` deploy this session). Two protocol-semantics questions are recorded for the v0.4 Fable pass (inline-vs-block TK scopes) and a release-scope plan is recorded for later (two reference implementations). `blygger-spec` and `blygger-org` both have local commits not yet pushed.

**Open threads:** Push `blygger-spec` + `blygger-org`, then decide whether to also finish task 7 (cut snapshot №1, deploy `blygger-org` live) now or in a later session — it was held specifically because of the push-hold, not because anything is blocking it technically. `protocol-institute.org`'s `CLOUDFLARE_API_TOKEN` has a long-standing unresolved rotation flag (pasted in a chat 2026-05-30, noted in `protocol-institute/.env.keys`) — flagged in passing, not acted on, not blygger's call to make. v0.2/v0.4 protocol work remains Fable-gated as before; nothing in this session unblocked it.

## Session 10 — 2026-08-06 — Task 11: reference deploy to workers.dev, then venkateshrao.com
**Model:** Sonnet 5 · **Time:** ~13:15–14:45 PT · **Committed:** yes · **Deployed:** `blyg.vgr-702.workers.dev/blyg/` (new) + `venkateshrao.com/blyg/` (new)

**What & why:** First deploy of v0.1 — the last remaining build task. Started the session by backfilling session 9's skipped DEVLOG entry (see below), then executed task 11 per `docs/v0.1-plan.md`: provisioned D1 (`blyg`, id `f9fbfd23-c0b8-40bc-b0df-eb80b992b5a4`) and R2 (`blyg-media`) under the `Vgr@ribbonfarm.com` Cloudflare account (`7026b5d7c1ad16cb808987576bb07ab2` — same account already used for `blygger-org`/`blygger-com`, confirmed against `Code/.env.keys` before provisioning rather than guessing between the two CF accounts logged into wrangler), applied all three migrations remotely, generated `OWNER_PASSWORD`/`COOKIE_SECRET` (`openssl rand`) and set them via `wrangler secret put` (never written to a `.dev.vars` or committed file), then `wrangler deploy`. `wrangler.jsonc`'s placeholder `database_id` swapped for the real one.

**Verification:** server-side, not just deploy-succeeded — curled the manifest (`blyg.json`, correct fields), `feed.xml` (valid empty RSS 2.0 channel with the `blyg:` namespace on first check), then ran a full owner loop against the live instance: `studio/login` (cookie auth) → `POST /api/items` (draft) → `POST /api/items/:id/publish` → refetched `feed.xml` and confirmed the item appears with the correct `blyg:{id}:v{n}` GUID scheme, and its `f/{id}/` permalink returns 200. One transient `error code: 1042` on the very first manifest/feed fetch immediately post-deploy, gone on retry seconds later — read as workers.dev edge propagation lag, not a bug (confirmed by the identical request succeeding on retry with no code change). Ran `tsc --noEmit` + the local test suite before touching Cloudflare at all, to confirm the session-9 rename hadn't regressed anything: clean, 66/67 (the one failure is the pre-existing `feed.test.ts` flake, unrelated).

Not done, and can't be from here: the plan's actual exit criterion is subscribing to `blyg.vgr-702.workers.dev/blyg/feed.xml` in a real RSS reader (NetNewsWire/Reeder) — that needs Venkat's own client. Left open below rather than claiming the task fully closed.

**Same session, second deploy — `venkateshrao.com/blyg/` (the actual two-node test-network node, not just a rehearsal):** Venkat asked to put the reference client on `venkateshrao.com/blyg` directly, per session 8's decision that this domain (not the blygger.org/com stub pair) is the first two-node test target. Followed `docs/deploy-stub-sites-plan.md`'s architecture (Workers Routes over a Pages catch-all) rather than the org/com plan's DNS-onboarding-first path, since `venkateshrao.com` was already a Cloudflare zone (confirmed via `venkateshrao-cloudflare/`) — the one prerequisite that plan calls the "long pole" was already satisfied. Before touching anything: confirmed which of the two Cloudflare accounts logged into wrangler was correct (`Vgr@ribbonfarm.com`, matching `venkateshrao-cloudflare/.env`) and confirmed `/blyg`, `/studio`, `/api` all 404'd on the live static site first (no path collision) — asked Venkat to confirm before provisioning or deploying, since this touches routing on a live personal domain, not a disposable test property.

Provisioned an **independent** identity from the workers.dev instance — separate D1 (`blyg-venkateshrao`, id `c9342724-d1d9-4337-9737-b3850d27c15e`), separate R2 (`blyg-venkateshrao-media`), separate `OWNER_PASSWORD`/`COOKIE_SECRET` — matching the org/com plan's explicit reasoning that these are separate identities, not shared credentials. Added a named `env.venkateshrao` block to `wrangler.jsonc` (non-inheritable keys — `vars`, `d1_databases`, `r2_buckets`, `routes` — must be redeclared per environment, confirmed this isn't implicit) with three Workers Routes (`/blyg/*`, `/studio/*`, `/api/*` on the `venkateshrao.com` zone), matching the plan's route-split table exactly. Migrated the new D1 remotely, deployed via `wrangler deploy --env venkateshrao`.

**Verification:** manifest, feed.xml, studio login, and `/api/items` draft-create all confirmed working on `venkateshrao.com` directly (not workers.dev); deleted the verification draft afterward (never published, so no feed/public-page footprint) since this is a real node, not a throwaway. Re-confirmed the static Pages site is completely unaffected outside the three claimed path prefixes — homepage and `<title>` still correct post-deploy. Same transient edge-propagation glitch as the first deploy (one stale response on `/blyg/feed.xml` immediately post-deploy, resolved on retry) — now recognized as a pattern (first-request-after-deploy on workers.dev/Workers-Routes edges), not something to chase further.

**State after:** v0.1 "Seed" has **two** live instances: the workers.dev rehearsal (`blyg.vgr-702.workers.dev`, one test fragment left on it) and `venkateshrao.com/blyg/` — the actual first node of the protocol's two-node test network, fully independent identity/data. `venkateshrao-cloudflare/routes.md` and `status.md` updated (cross-project bookkeeping — that repo is the canonical route registry for the zone). Both sets of secrets registered in `Code/.env.keys`. `README.md`/`docs/v0.1-plan.md`/`CLAUDE.md` updated for the workers.dev deploy; venkateshrao.com deploy recorded here and in `docs/deploy-stub-sites-plan.md`'s amendment banner.

**Open threads:** Venkat is testing the venkateshrao.com instance directly (studio login from any browser, not just this machine — auth is a single shared password + signed cookie, not device-bound; confirmed no local file storage, everything lives in D1/R2) before any further work proceeds — explicitly paused here, nothing else touched pending that. Once confirmed: the RSS-reader exit check (either instance) is still open; `protocol-institute.com/blyg/` is the second test-network node and remains undeployed (DNS for that domain was flagged in session 8 as the likely long pole); `docs/spec-publishing-plan.md` execution is still queued and unaffected by this session's work.

## Session 9 — 2026-08-05 — Vocabulary rule: blyg/blygger, `blygg` retired (decision #16)
**Model:** Fable 5 · **Time:** ~12:30–13:00 PT (backfilled 2026-08-06 — entry was skipped at session close) · **Committed:** yes · **Deployed:** — (blygger-org site redeployed with the renamed lede, per its own repo)

**What & why:** Venkat + Fable settled the wire-vocabulary spelling left open by session 8's mount-independence decision: the noun is **blyg** (one g, as *blog* is to *blogger*), retiring the intermediate `blygg` spelling everywhere, including the wire — manifest filename (`blyg.json`), JSON version key (`"blyg"`), XML ns prefix and GUID scheme (`blyg:`, `blyg:{id}:v{n}`), transclusion CSS class (`blyg-transclusion`), reserved autodiscovery rel (`<link rel="blyg">`). Amends #14's token spellings without touching its architecture — the wire/mount split stands; mount default stays `/blyg`, so path and filename now happen to agree as a convention coincidence, not a protocol linkage. Cost was zero: nothing is deployed yet (task 11's D1 id is still a placeholder), so this would have been a breaking wire migration after first deploy — the rename window closes once task 11 ships. Spec stayed DRAFT so no version bump was needed; decision recorded as CLAUDE.md #16.

**Implementation:** single commit (`d9ee250`) swept `blygg`→`blyg` across the spec, docs, wireframes, and the full `worker/` reference implementation (types, protocol/pages/studio/transclusion source, all test files, `package.json`). Historical records (`DEVLOG.md`, `RENAME.md`, `docs/ygg-initial-spec.md`) deliberately left unrenamed, matching the precedent set for the `ygg`→`blygger` rename in session 6. Sibling repos followed same-day: `blygger-org` rewrote its landing-page lede for the new spelling and redeployed; `blygger-com`'s stub site was renamed to match.

**Verification (backfilled):** re-ran the suite this session (2026-08-06) to confirm the rename didn't regress anything — `tsc --noEmit` clean, 66/67 tests green, the one failure is the pre-existing `feed.test.ts` timestamp-ordering flake already on record (not caused by this rename).

**State after:** All three repos (`blygger-spec`, `blygger-org`, `blygger-com`) consistently use `blyg`/`blygger`; no `blygg` spelling remains outside intentionally-frozen historical records. v0.1 build status unchanged — task 11 (deploy) is still the only open build task.

**Open threads:** Process gap, not a protocol one — this session's DEVLOG entry was skipped at close, breaking the "non-skippable" rule for the first time since project inception; backfilled next session (10) after the fact. No content was lost (git commit + CLAUDE.md decision record both landed same-day), but the ritual failed silently rather than being caught at session end. Worth a standing reminder to run the wrap-up checklist even on short/single-decision sessions.

## Session 8 — 2026-08-04 — Mount independence (decision #14); /blyg default; spec-publishing model (#15)
**Model:** Fable 5 (orientation + two-node distance analysis ran on Opus 5 before Venkat switched via `/model`) · **Time:** ~12:24–13:25 PT · **Committed:** yes · **Deployed:** —

**What & why:** Venkat wants a two-node test deploy network ASAP —
`venkateshrao.com` + `protocol-institute.com` (typo correction: the site
agent is building blygger.**org**, not .net; .com held in reserve). That
reframed the session: distance-to-network analysis (milestone A: two
publishing nodes = task 11 twice, code-complete; milestone B: nodes following
each other = v0.2, no subscribe code exists), then two protocol questions —
configurable mount, root-domain serving — answered and implemented.

**Decision #14 — mount independence (locked):** origin = any absolute base
URL (root, path, subdomain); surface strictly origin-relative; readers MUST
NOT infer anything from the mount. **Wire vocabulary formally split from
deployment lexicon:** `blygg.json`, `"blygg"` version key, `blygg:`
GUID/XML elements are protocol-permanent; the mount is per-deployment config
with reference default **`/blyg`** (Venkat's call, reversing Fable-as-Opus's
earlier keep-`/blygg` recommendation — the path/wire asymmetry
`/blyg/blygg.json` is now deliberate signal that the path is the deployer's
and the filename is the protocol's; the fixed filename is the discovery
anchor). Root mount = empty mount, first-class. Consequence: v0.2
autodiscovery may not probe a fixed path — roadmap line rewritten
(treat-URL-as-origin + `<link rel="blygg">` + conventional-mount fallback;
mechanics stay ⚠️ FABLE in the v0.2 plan). Amended #1/#13's incidental
`/blygg/` mentions (blogroll is origin-relative `blogroll.opml`, same logic
as manifest).

**Implementation (task 17):** `Env.MOUNT` wrangler var; `normalizeMount()`
(unset → `/blyg`; `""`/`"/"` → root); memoized `makeApp(mount)` factory —
public surface is a mount-relative Hono sub-app; `/studio`/`/api` stay
host-rooted, registered *before* the sub-app so its cache middleware can't
wrap them at root mount. Mount threaded through pages/studio link generation
+ `siteOrigin` fallback; feed provenance links derive from the canonical
origin's own path (stays correct when `site_url` overrides the serving
mount). Retires task 16's slug-drives-path conflation (RENAME.md amended —
also kills the `ygg`-substring sed hazard for paths). ✓ `tsc` clean, 67/67
green (58 migrated to `/blyg` + new `mount.test.ts`: root + multi-segment
mounts via `app.request` with real pool bindings; old default 404s;
`normalizeMount` units). Spec §1/§2/§4 + examples updated; plan §2–3
reworded with task-16 history left verbatim; deploy-stub-sites-plan got an
amendment banner (mount `/blyg`, targets now venkateshrao.com +
protocol-institute.com; org/com pair superseded as first deploy).

**Decision #15 — spec publishing model (locked):** blygger.org spec is
published at semantic versioned URLs (`/spec/{v}/` latest + `/spec/{v}/{date}/`
immutable snapshots + `/spec/` index), each snapshot paired to a
`spec/{v}/{date}` git tag in this repo, pages footer-stamped with source
commit; ref-impl releases (`ref-v*`) loosely coupled via stable Releases
URLs. **Spec-as-blygg rejected** (semantic-vs-opaque URL contract; wrong
shape for fragment primitives; normative text must not depend on the
machinery it defines); announcements-blygg + ceremonial 1.0 pin deferred to
v0.2+. `docs/spec-publishing-plan.md` written for Sonnet/Opus execution
(local-first: blygger-org Pages is direct-upload via deploy.sh, not
git-connected, so CI would deploy nothing — recorded as upgrade path).
Finding en route: `blygger-org/deploy.sh` hardcodes a CF API token —
verified gitignored, never committed/pushed (no incident, no rotation), but
violates `warnings-keys.md`; fix is plan task 1. Blygger-org agent's re-sync
of the stale spec publish copy verified landed + deployed before wrap-up.

**State after:** All v0.1 build tasks done except deploy (task 11); mount
config makes the two-node deploy a per-environment `MOUNT` var. Spec draft
now carries the mounting language and `/blyg` examples; blygger.org serves a
current copy. Two plan docs queued for cheaper models: spec-publishing
(unblocked) and the amended stub-sites deploy plan.

**Open threads:** task 11 → two-node deploy (`venkateshrao.com/blyg/` +
`protocol-institute.com/blyg/`; DNS for protocol-institute.com is the long
pole — venkateshrao.com is already on Cloudflare); execute
spec-publishing-plan incl. deploy.sh token fix, then cut spec snapshot №1;
v0.2 plan doc (⚠️ FABLE: importer state machine + autodiscovery mechanics
per #14); Venkat's review of the L1 spec normativization calls still
pending; feed-flake + scrubber fast-follows unchanged.

## Session 7 — 2026-08-03 — Curation/discovery decisions; L1 spec drafted; blygger.org content
**Model:** Fable 5 (state check ran on Opus 4.8 before Venkat switched via `/model`) · **Time:** ~11:00–11:50 PT · **Committed:** yes (2 repos) · **Deployed:** —

**What & why:** Protocol-design session. Venkat wanted three things settled
before Opus builds further: what "make-public" means for imported items, the
discovery story, and where the AI-generation hardpoints live — all governed by
his named frame: **treat publishing the way GitHub treats code** (quiet
watching, public forks and citations, no comment threads).

**Decisions (locked #12–13; record in
`docs/proposals/curation-discovery-generation-proposal.md`):**
(1) **Make-public = curation display only** — supersedes the roadmap's
"retweet-like" wording: a made-public import appears on a public hopper page
from the local snapshot, **never re-emitted on the feed** (re-emission collides
with `blygg:id` rollup + the single-publisher invariant; and feed-speech about
others' content costs editorial — that's the stub). (2) **No tags, no canned
phrases in protocol** — hoppers are the taxonomy, stub templates are studio
sugar; third leg of the pattern: *editorial convenience, like AI and identity,
is never in the protocol*. (3) **Discovery = two planes, both L2 and
optional**: static plane = curated OPML blogroll (`blogroll.opml` + manifest
key, v0.2; explicitly no completeness claim — a blogroll is a publishing act,
not a follower-graph leak); notification plane = **Webmention** (W3C, reused
not invented; pingback/trackback rejected as dead-of-spam/legacy) with
**structural verification** — receiver fetches the source item JSON and checks
it actually names the target, which kills the trackback spam hole; verified
mentions are studio signals feeding detect-stubs, never auto-published. This
closes a real gap: without mentions, detect-stubs only sees stubs from feeds
you subscribe to — quietly reinventing mutual-follow. (4) **"Follow" is
deliberately nothing** — subscription stays client-local/invisible; the public
graph is blogrolls (outbound) + verified stubs (inbound). ActivityPub rejected
(actor model vs decisions #5/#11), WebSub orthogonal, directories
ecosystem-side. Acknowledged carve-out: the Webmention receiver is the
protocol's **first dynamic surface** — optional-at-L2, "just files" stays the
L1 floor. (5) **v0.4 pre-records (leans, not locked):** fragment-level
generate/regenerate hardpoint added (v0.4 was thread-centric); all generation
hooks share one provider-call interface; lean that generated text lands in
`content_md` (hash/pin must cover what readers read) with TK markers as inert
annotations; disclosure-of-generation left open for the v0.4 pass.

**L1 spec drafted (`docs/protocol-v0.1.md`, DRAFT)** — ahead of the "after
v0.1 ships" gate, deliberately: Venkat wants it publishable on the placeholder
site. Normative, RFC 2119, 13 sections; folds in everything the CLAUDE.md TODO
listed (session-2 feed interpretations, withdraw/pin, session-4 presentation
rules, session-5 version-nav + author). Normativization judgment calls flagged
to Venkat: feed window RECOMMENDED 50, fragment cap RECOMMENDED 2000 with
readers-MUST-NOT-reject, CORS as SHOULD, and §11 pulls the v0.2 rollup rules
forward as normative reader conformance. Freezes at `blygger.org/spec/0.1/`
only when the deploys land.

**blygger.org content:** `blygger-org/content/` created — `overview.md`
(landing-page overview: GitHub-precedent table, soapboxes-not-conversation,
mutable-by-default/immutable-by-choice, AI-native/AI-free-wire, discovery) +
`spec/0.1/index.md` (publish copy; canonical stays in `blygger-spec`, rule in
`content/README.md`). Roadmap v0.2/v0.3/v0.4 sections updated; CLAUDE.md
locked decisions #12–13 + doc map + TODOs updated.

**State after:** All protocol semantics through v0.3 discovery are now
decided-and-recorded; v0.4 has a pre-record. The spec exists as a publishable
draft. Build state unchanged: task 11 (deploy) still the only open v0.1 build
task; stub-site deploy plan still unexecuted — but blygger.org now has real
content waiting.

**Open threads:** Venkat to review the spec's normativization calls and the
overview's public voice ("No replies. Ever."; TK as flagship) before deploy;
webmention mechanics (retry/dedupe/endpoint shape/rate limits) are a v0.3
⚠️ FABLE item; blogroll OPML shape goes in the v0.2 plan doc; task 11 +
stub-site deploys unchanged; feed-flake + scrubber fast-follows unchanged.

## Session 6 — 2026-07-24 — Rename ygg → blygger; 3-repo container; stub-site deploy plan
*(Heading restored session 8 — the entry below was committed without it, visually merging into session 7's. Content untouched.)*

**Model:** Sonnet 5 · **Time:** ~17:30–18:00 PT · **Committed:** yes (3 repos) · **Deployed:** —

**What & why:** Venkat made the brand decision session 3 flagged: protocol renamed
`ygg` → **blygger**, default publish path `/ygg` → `/blygg`, domains `blygger.org`
(XML namespace, commons/spec-adjacent) and `blygger.com` (protocol-adjacent
commercial dev) acquired. This session executed the full chain that decision
gated: task 16 (brand refactor), the physical rename (folder + GitHub repo), new
scaffolding for the two site repos, and a deployment plan for both.

**Brand refactor (task 16, executed for real rather than left speculative):**
`worker/src/types.ts` gained a single `BRAND` constant (`{name: "blygger", slug:
"blygg", nsUri: "https://blygger.org/ns/0.1"}`) driving `GENERATOR` and, via a
case-sensitive blind sed pass across `worker/src`, `worker/test`,
`worker/scripts`, `wrangler.jsonc`, `package.json`, and living docs, everything
else: URL prefix, manifest filename, JSON version key, GUID scheme, XML
namespace + elements, cookie name, CSS class prefix. Real namespace URI resolved
`v0.1-plan.md` §7 open decision #1 (was a GitHub-URL placeholder). Renamed
`YGG_VERSION`/`YGG_LEVEL`/`YGG_NS` to `PROTOCOL_VERSION`/`PROTOCOL_LEVEL`/
`BRAND.nsUri` (only `protocol.ts` imported them). Verified: `tsc --noEmit`
clean, 57/58 tests green (the one failure reproduced as the pre-existing
`feed.test.ts` timestamp-ordering flake on a rerun with no code changes —
confirmed unrelated to the rename, not the rename itself).

**Scope trim, recorded not silent:** task 16's original acceptance check was "set
the brand constant to `zzz`, full suite still passes" — written when the name
was still speculative. Now that it's final, full constant-import purity in
`pages.ts`/`studio.ts`/`transclusion.ts` (~40 call sites with literal `/blygg/`
links and `blygg-transclusion`/`.blygg` CSS classes rather than importing
`BRAND.slug` at each site) wasn't worth doing. `RENAME.md` documents this and
gives the correct sed-based procedure if a rename ever happens again, including
a real gotcha hit mid-session: sed must run *before* any hand-written text
containing the new brand strings exists, since the new slug/name contain the old
one as a substring (`ygg` is inside `blygg`/`blygger`) — running it after
corrupts them. Also caught and fixed by hand: the blind sed pass mangled
**"Yggdrasil"** (the mythological tree, unrelated proper noun) into
"Blyggerdrasil" in three prose spots — fixed, and `README.md`'s "Named for
Yggdrasil" line extended to note the resemblance is literally what prompted this
rename.

**Docs:** `CLAUDE.md`, `README.md`, `docs/v0.1-plan.md`, `docs/roadmap.md`,
`docs/proposals/*.md`, `docs/wireframes/*.html` renamed throughout (path/machine
tokens → `blygg`, brand-name prose → `blygger`). Two deliberate exceptions,
each getting a banner/title note instead of a body rewrite:
`docs/ygg-initial-spec.md` (frozen v0 spec — keeps its historical name and
filename permanently) and `DEVLOG.md` (this file — session entries before 6 are
not retroactively edited; a log that lies about what was true when it was
written stops being a log). README's multi-tenancy paragraph also updated to
match the session-5 single-*publisher* (not single-author) invariant, which
predated this session's edits but was still phrased in the old terms.

**Physical rename:** `Code/ygg/` moved to `Code/blygger-protocol/blygger-spec/`
(git history intact, verified `tsc --noEmit` clean from the new path —
`worker/node_modules` is already Dropbox-ignored via `com.dropbox.ignored`
xattr, so the move didn't trigger a sync storm). GitHub: `vgururao/ygg` →
`gh repo rename` → `vgururao/blygger-spec` → `gh api .../transfer` (no `gh repo
transfer` subcommand exists in this CLI version) → `blygger/blygger-spec`,
confirmed via polling since the transfer API is asynchronous. Local remote
updated, pushed.

**New scaffolding:** `blygger-org/` and `blygger-com/` created as sibling repos
under `blygger-protocol/`, each following the `Code/_template/` new-project
convention (`CLAUDE.md`, `status.md`, `.gitignore`, `LICENSE`, `README.md`) —
currently pure stubs, no site content. Created as `blygger/blygger-org` and
`blygger/blygger-com` on GitHub, public, `main` default branch (hit and fixed
two small GitHub-CLI friction points: `git init` defaults to `master` locally
so both needed a branch rename to match `blygger-spec`'s convention; a failed
first `gh repo create` for `blygger-com` — run from the wrong directory,
`--remote=origin` collided with `blygger-org`'s existing remote — had already
created the GitHub repo before failing locally, so the retry had to detect and
reuse the existing empty remote rather than recreate it). `Code/CLAUDE.md`'s
project table updated to describe `blygger-protocol/` as a 3-repo container
(pattern borrowed from `worldmachines/`); `Code/status.md` got a Done entry.

**Deploy plan (not executed):** `docs/deploy-stub-sites-plan.md` — both domains
get a stub landing page (Cloudflare Pages, git-connected) plus a live `/blygg`
deployment of the *unmodified* reference worker (Workers Routes split:
`<domain>/blygg/*`+`/studio/*`+`/api/*` override a `<domain>/*` Pages
catch-all by path specificity — no code changes to `blygger-spec` needed). Two
new named Wrangler environments (`org`, `com`) in `wrangler.jsonc`, each with
independent D1/R2/secrets. The two live instances double as the protocol's
first real cross-client pair once v0.2 ships subscribe. Recommends running
task 11's workers.dev deploy first as a low-cost rehearsal of the same
`wrangler deploy` mechanics.

**State after:** v0.1 unchanged functionally — this was a naming/infra session,
zero protocol-semantics or behavior change. `blygger-protocol/` now holds three
repos (`blygger-spec` with full history, `blygger-org` and `blygger-com` as
fresh stubs) all under the `blygger` GitHub org. Task 11 (deploy) is the only
open v0.1 build task and is no longer gated on anything. Stub-site deploy plan
exists but is unexecuted.

**Open threads:** execute `docs/deploy-stub-sites-plan.md` (DNS onboarding is
the long pole — registrar nameserver changes aren't instant); task 11 deploy,
still open, now recommended as a rehearsal before the org/com deploys;
`warnings-node.md` at the `Code/` level is stale (says "only one project uses
Node," predating both `blygger-spec/worker` and the two new stub repos) — not
fixed this session, flagged for a future meta-admin pass; the feed-test flake
and scrubber-removal fast-follows from earlier sessions are unchanged and still
pending.

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
