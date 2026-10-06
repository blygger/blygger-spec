# Blygger Devlog

Per-session development log. Non-skippable: every coding session appends an entry
(template and writing standard in [`CLAUDE.md`](CLAUDE.md)). Newest first.

> Renamed from `ygg` in session 6 (2026-07-24) — see `RENAME.md`. Entries below are
> historical and are **not** retroactively edited: sessions before 6 correctly say
> `ygg` because that was the name at the time.

## Session 37 — 2026-10-06 — The 304 sync bug; one stub action with an editor passage chooser; Kyle's D1 polling cache; spec seventh revision (0.30.1–0.32.1)

**Model:** Opus 5.5 · **Time:** ~08:45–16:15 PT · **Committed:** yes (blygger-studio, blygger-spec, blygger-org) · **Deployed:** 0.30.1, 0.31.0 and 0.32.1 to both nodes (migration 0024 first); three crons in `wrangler.private.jsonc`; spec 0.3 seventh revision to blygger.org. Released: v0.30.1, v0.31.0, v0.32.1 (v0.32.0 tagged with a broken migration; its run was force-cancelled and the tag deleted before it released).

**What & why:**

- **The Sachin Benny mystery was a 304, not a failed fetch.** `pollSubscription` returned on `304 Not Modified` before the daily index sync and manifest-name refresh. An origin that honours ETags answers every poll with 304, so a subscription whose first sync failed never synced again (`last_index_sync_at` NULL forever). Session 36's "follow-up fetches fail" was wrong: they were never made. Found by reading the live row (NULL sync, stored ETag) and sending the stored ETag by hand. Four venkateshrao subscriptions were stuck (Lightsong, Sachin Benny, AMMDI, florianlohse); all synced at the first post-deploy cron and Sachin's is now "Summer Lightning". Two existing tests had built their 304 fixtures on never-synced subscriptions and so encoded the bug. Shipped in 0.30.1 with the preview-budget fix. Duplicate subscriptions: none on either node.
- **Spec seventh revision (Opus under #58, Fable review pending):** §16.6c → §5.2 (`changelog[].generated`, G6) and §16.1a → §10.6 (`cited` on `{url}` stubs, G10), §5.9's site list and §10.2's plain-web sentence updated, both §16 numbers left as pointers recording the build's calls. Rendered with blygger.org's own markdown before publishing, which caught a fenced block inside a list item swallowing the next bullet (§5.2's example is now inline code). Listed in `fable-round-queue.md` §C.
- **One response action (0.31.0), Venkat's design.** `quote selection` was a stub with a passage under the quote, so it went, along with the reading-view pill. A stub is a 2×2 (words above or below × whole or passage) plus repost (no words); it always opens quoting the whole post (reversing 0.30.0's opening-passage prefill: "the first line is rarely the right one"). Passages are chosen in the stub editor, not the reader, because selecting before there is a draft was clumsy: *quote a passage instead* shows the post as the preview of a lone `![[id]]` (so selection is checked against the bytes publish bakes) in its own panel, never at the insertion point, and the selection becomes `>` lines (`src/ui/stub-quote.ts`, sharing `quoteLines` with the API). Mid-build Venkat pointed at his "Stubs are proto-response actions" thread (several partial quotes of one item): once a passage exists the chooser **adds** the next after the cursor and hides *quote whole post*. A "How stubs work" sheet opens on new stubs until dismissed (per-device `localStorage`). Checked visually at phone and desktop width, which caught the sheet opening scrolled to its bottom and a JSX-whitespace indent in its code block. The API keeps `selection` for other clients. Corrected an earlier claim to Venkat: a line typed directly under a quote is **not** swallowed, since `attachedQuote` takes only `>` lines.
- **Kyle Mathews' #40 (D1 polling cache) reviewed, merged, released as 0.32.x.** Studio polls `/api/changes` revision counters kept by 27 triggers (migration 0024); `feed.xml` is rendered into R2 and served stale-while-revalidate with ETags and 304s; a minute cron warms it. Reviewed: CORS kept, R2-cached feed not reachable through `/media/` (served only for D1-registered keys), conditional R2 writes. Full suites on the merged tree. Two fixes on top: (1) daily housekeeping moved to a new `0 0 * * *` cron that pre-0.32 configs (ours included) never fire, so the quarter-hour tick at 00:00 UTC now runs it too; (2) **0024 failed on remote D1** with `incomplete input`: every trigger opened with `SELECT CASE … END;`, and D1's remote executor ends a trigger at the first `END;`. Local apply (miniflare and `wrangler --local`) passed. Reproduced on a throwaway remote database (created and deleted in the personal account), guards rewritten as `SELECT RAISE … WHERE NOT EXISTS`, and `test/migration-remote-shape.test.ts` now rejects the pattern. Note posted to Kyle on #40.
- **Password reset: tabled at the recovery question.** A Worker cannot rewrite its own secret, so a studio-set password lives in D1 and must re-key the session HMAC and OAuth's credential cache. Options recorded in the carry-over.
- **Robert Peake (blygger-spec#2) is building Soapbox**, a WordPress plugin, the G9 client. His plan fits #51; replied in Venkat's voice, promised our reader side (M1–M4) now. His query-string-manifest question (WordPress Plain permalinks) is identity semantics: Fable queue item 15.
- **A blyg draft summarizing the session** is on venkateshrao (`4557xemndwty74r06etwt6rdtx`), unpublished, for Venkat to edit.

**State after:** blygger-studio 0.32.1 live on both nodes with migration 0024 and three crons; 1,387 Worker, 30+ UI, 277 browser tests. Spec 0.3 seventh revision published. Release v0.32.1 was still running at wrap-up.

**Open threads:** confirm the v0.32.1 Release run produced downloads. Build the templated-surface reader (G9, M1–M4) before Soapbox's staging origin appears. Fable round: queue items 1–15 plus the seventh-revision review. Password reset recovery anchor (Venkat). AI budget prototype (migration now 0025). Quoted lists lose bullets and the faithfulness check ignores list markers; a candidate for Fable if it matters. Kyle's PR left `models/d1-polling-cache/logs/` (TLA+ and docker logs) in the repo; harmless, could be trimmed.

## Session 36 — 2026-10-05 — Kyle's OAuth/MCP merged; four regressions from it found and fixed; picker search, subscription names, cosmetics (0.28.0–0.30.0)

**Model:** Opus 5.5 · **Time:** ~midday–16:30 PT · **Committed:** yes (blygger-studio, blygger-spec) · **Deployed:** 0.28.2 to both nodes (migrations 0021, 0022 first); 0.29.0 to venkateshrao, 0.28.3 hotfix to PI, then 0.29.0 to PI; 0.30.0 to both (migration 0023 first); owner API limits raised in `wrangler.private.jsonc`. Released: v0.28.2. v0.28.3 and v0.29.0 were tagged, failed `release:check`, and were deleted; v0.30.0 is tagged once main's CI is green.

**What & why:**

- **Kyle Mathews' studio#34 (OAuth, MCP, manual tokens, security pass) reviewed and merged** against decision #52's four invariants. All four held: one token model with per-grant and revoke-all, no host-root `.well-known` and nothing in `blyg.json`, read / draft / publish / manage scopes with no refresh-only scope, MCP generated from the same contract with the same scopes. Live token test on venkateshrao: read 200, write 403 with a read-only token, 401 after revoke.
- **Four regressions from it, each found in use, not by its tests:**
  1. **The allowlist sanitizer deleted unlisted tags with their content** (`<picture>` around an `<img>`, Substack's markup). 0.28.1 unwraps unlisted tags and drops only active, foreign and raw-text/RCDATA elements whole, since unwrapping those would revive markup.
  2. **The transclusion bake ran through the sanitizer**, changing a thread's published `content_html`, which other origins import. §5.2/§10.2 bake verbatim. 0.28.2 reverts the bake and sanitizes at every render; the editor preview sanitizes its own output. Footnote anchors in imported HTML are inert (`id` stripped); the id-prefix fix's problems are written up in studio#39 for Kyle (render-only, or it emits relative URLs into `content_html` against §5.2; blyg footnotes are already absolute; prefixes must be per rendered copy).
  3. **Feed polling and Webmentions stopped on both nodes for ~70 minutes.** `checkDestination` fetched DNS-over-HTTPS with `redirect: 'error'`, which the Workers runtime rejects outright. Every check threw. Tests mock `fetch` and accepted it. Found by probing from a remote-preview Worker. Fixed in 0.28.3 (`'manual'`, status must be 200); a new test refuses `'error'` the way the edge does. Subscriptions degraded by the outage recover via the new resync-all button.
  4. **The owner's write budget (120/min) throttled ordinary editing**: live preview is a `POST` on every pause in typing. Venkat hit "API budget exceeded" composing. Limits raised in the private config on both nodes (writes 2,000, reads 10,000); `fix/preview-budget` makes preview spend the read budget (0.30.1, not yet released).
  Also: the client-access page misstated password-reset semantics (fixed in 0.28.2); the default AI cap of 20 calls/day applied to the owner (interim 200 in the private config).
- **Aneesh Sathe:** #36 merged (its new test needed `?view=sources`). #35 (lineage glyph, hex view, action ring) **tabled and converted to a draft**: Studio is the reference client, minimal and "boring"; radical UI goes to an extension mechanism to be designed. Reply posted on the PR.
- **Picker (0.29.0).** `[[`/`![[` searched only a 70-character excerpt plus the id and rebuilt the whole candidate list on every keystroke. `/api/search` is now SQL word-search over full text with `source`, `sub`, `sort` and a total; the picker is a non-modal right panel (bottom dock on a phone). Where you type is the `picker_typing` setting (Settings → writing): *automatic* (editor with a mouse, the picker's search box on touch, full screen on a phone), *editor* or *picker*. Venkat chose this after trying both modes.
- **Subscription names follow their source (0.30.0, migration 0023).** The title was written once at subscribe. Blyg manifest titles now refresh with the daily index sync and RSS channel titles every poll; `title_auto` protects owner-given names (`PATCH title` sets it, `title: null` hands it back). Existing RSS subscriptions keep their names. Three renamed blygs found on venkateshrao.
- **Cosmetics (0.30.0):** a green "Draft discarded" toast replaces a red "not found" (the compose list refetched the deleted item); dismissable toasts with the ✕ drawn in CSS so message text is unchanged; resync all feeds (`POST /api/subscriptions/poll`, degraded included); long stubs quote their opening passage instead of an empty quote line (this reverses the plan's P7 choice: the prefill now publishes as-is); thread counter without the 1,000 limit; quote-only compose rows show what they quote.
- **Prototypes staged, not merged:** `proto/ai-integrations`. It holds an AI integrations page (spend dashboard, daily/weekly/monthly dollar caps, per-function cards), the `ai_usage` table (its migration must be renumbered from 0023 to 0024) and Anthropic list prices in `models.json`. Next to it, `docs/proposals/ai-extension-hooks.md` (⚠️ FABLE) proposes a change cursor and budgeted model calls for owner-registered extensions.
- **A blyg draft summarizing the session** was posted to venkateshrao by a draft-scoped token named "agent" (revoked); Venkat publishes it. Items have no per-item author field: agent bylines are decision #35's.

**State after:** blygger-studio 0.30.0 live on both nodes; 1,269 Worker, 23 UI, 273 browser tests. Picker typing defaults to automatic. Owner limits raised in the private config.

**Open threads:** Tag v0.30.0 when CI is green and check the Release run; release 0.30.1 (`fix/preview-budget`). For Sachin Benny's blyg the manifest and index fetches that follow a successful feed fetch fail on every poll, not just in resync-all's burst (checked at the 00:00 UTC cron after wrap-up), so its name has not refreshed. Isolated resync works; not the subrequest cap, DoH throttling or refetching. Cause unknown (carry-over). The `item-lifecycle` property test was flaking on the owner budget; the test environment now sets high limits. Note the budget regression on studio#39.

## Session 35 — 2026-10-04/05 — Studio 0.26.1–0.27.1: reading fixes, a feed-first reader, highlighted generated text with a robot that discloses; releases unbroken

**Model:** Opus 5.5 · **Time:** ~21:00–23:00 PT · **Committed:** yes (blygger-studio, blygger-spec) · **Deployed:** blygger-studio 0.27.0, 0.27.1, then 0.27.2 to both nodes; migration 0020 applied to both D1s first. Tags v0.26.1, v0.27.0, v0.27.1, v0.27.2; v0.27.1 and v0.27.2 released (v0.27.2 is latest).

**What & why:** A session of reading-interface fixes Venkat reported from his iPad and laptop, then two presentation features.

- **Subscribe hung on confirm (0.26.1).** Not a failure: `POST /subscriptions` with `confirm: true` ran `pollSubscription` before replying, and for a blyg the first poll reconciles the whole index and fetches every item. It now runs under `waitUntil`; a cut-short backfill self-heals because `last_poll_at` and `last_index_sync_at` stay null, so the next cron poll is due and reconciles. The sheet labels its busy buttons and closes without awaiting the refetch.
- **Duplicate subscriptions (0.26.1).** Nothing stopped a second subscription to the same source. Every item then imported twice, and `resolveTarget`'s ambiguity check refused stubs of them ("ambiguous id imported from multiple sources"). The route now 409s on both phases, matching origin, feed URL, or a blyg's feed added as plain RSS. **No unique index**: live nodes may already hold duplicates and a migration would fail on them; they are deleted by hand from the inspector.
- **Source URL on every card (0.26.1).** A citation line (`↗ host/path`, `displayUrl` as the ⋯ sheet shows it) between body and action bar, new tab, on every reading and hopper card. Placed outside the swipe zones and away from `stub ↗`, whose arrow means "respond" (#50).
- **Feed-first reading (0.26.1).** Venkat's proposal, built as given: Feed and Sources are peer tabs where `← sources` was; `/reading` is the all-feed and `?view=sources` the list. One `ReadingHead` (tabs, title + count, actions, ＋) on every screen under every lens; the placeholder lenses swap only the list, so nothing jumps. Alternatives offered and not taken: a feed-only reader with a sources drawer, and reopening the last place.
- **Smart Feed says "Coming soon."**
- **Highlight generated portions (0.27.0, migration 0020).** A settings default (off) and a per-item override shaped exactly like `responses_override` (0012). Presentation only, by construction: the default lives in `style.css` (the stylesheet is already per-settings because of themes) and an item's choice is a `gen-on`/`gen-off` class on its `<article>`, so pages render without reading settings and `content_html`, the item document and the feed are untouched. Every theme gained `genBg`/`genRule`.
- **The robot (0.27.0).** Venkat asked to copy Brady Dale's convention (bradydale.com/76.html): a bordered robot badge (Lucide `bot`) on the bottom-left edge of a generated block. Ours is theme-coloured (a CSS mask filled with `--ink-soft`, since a data-URI colour cannot follow the theme). Then: hover or tap it for what the author disclosed. Built as `GEN_INFO_SCRIPT`, which turns each span's robot into a button and opens one fixed-position box (a feed card's clip cannot cut it). **The details are version-level**, because §5.7 promises no span mapping; a span inside a quoted item defers to that item. The version carousel carries each version's `generated[]` as `data-generated` with its body. The pseudo-element robot stays as the no-script fallback.
- **A spec tension, flagged not resolved.** §5.7's last paragraph says the reference client "deliberately leaves it unstyled, because a visible tint would present self-asserted provenance as a verified authorship badge." 0.27.0 contradicts the sentence, though not the concern: off by default, and the box says "the author marked this … Self-reported, not verified." Presentation is the client's call (session 20). Queued for Fable in `fable-round-queue.md` §C.
- **Releases had failed on every tag since v0.21.2**, and nobody had noticed: the newest GitHub release was v0.20.2. Two plumbing causes, neither in shipped code: an e2e test screenshotting to a Claude scratchpad path (v0.21.2–v0.25.0), and `verify-oracle-mutations` copying `build/` without `models.json` (since 0.26.0). Fixed in 0.27.1 and redeployed, rather than moving the already-pushed v0.27.0 tag.

- **TK generate threw away the draft (0.27.2, after wrap-up).** Venkat reported that generating a scope in the editor left only the scope. Since the SPA rebuild (0.10.0, a38f64c) the editor replaced its whole draft with the route's `text`, which is the scope's output alone, then autosaved that over the working copy the server had spliced and saved correctly. The route now also returns `content_md` (the spliced copy, as saved) and the editor uses it. No browser test had ever pressed *generate*; one does now, and it fails on the old line. **Text lost this way is unrecoverable for unpublished drafts**: the studio keeps no history of draft saves.

**State after:** blygger-studio 0.27.2 live on both nodes; 863 Worker tests, 218 browser tests. Both highlight settings are off on both nodes. Kyle Mathews' OAuth/MCP PR ("Add scoped client access with OAuth and MCP") is open; **Venkat said not to merge it this session.**

**Open threads:** The v0.27.1 and v0.27.2 Release runs succeeded (v0.27.2 is the latest release, replacing v0.20.2), and `main`'s Check is green. Two blyg drafts were handed to Venkat to publish: the 0.27 announcement and the 0.27.2 generate-bug notice. Duplicate subscriptions already on the nodes need deleting by hand. Review Kyle's PR against #52's four invariants next session. Fable: the §5.7 sentence.

## Session 34 — 2026-10-04 — Seven releases (0.21.1–0.26.0): contributor PRs, the conformance report triaged, updates tab, public hoppers, reading scaffolding, multi-provider models

**Model:** Opus 5.5 · **Time:** ~11:40–15:00 PT · **Committed:** yes (blygger-studio, blygger-spec) · **Deployed:** blygger-studio 0.21.1 → 0.26.0 to both nodes (0.21.1 never ran alone; the first deploy carried 0.21.2). Migrations 0018 and 0019 applied to both D1s first. Tags v0.21.1–v0.26.0.

**What & why.**

1. **Triage.** New since session 33: blygger-studio #32 (Aneesh, phone redesign) and #33 (akashtattva, strict RSS readers); blygger-spec #11 (Aneesh, the conformance toolkit and first-round report) and #12 (msmsim, Glass Bead Game moves); studio issues #27–#31 filed from #11's report.
2. **#33 merged (0.21.1).** Feed render went from one D1 query per event to a fixed batch; live `feed.xml` ~4 s → ~0.5 s on both nodes. Follow-up: the PR re-implemented `loadFeedData`'s provenance queries, so both now call `loadProvenance()` (`src/public-feed.ts`): the feed and the HTML page cannot disagree about whose quote a blockquote is. **Auto mode refused `gh pr merge` and then every command in the studio repo** until Venkat approved them in `/permissions`; he has since added `Bash(gh pr merge:*)` to his user settings.
3. **#27–#31 fixed (0.21.2).** #27: any feed-window gap now reconciles; the v0.2 plan's "and the trigger set was non-empty" contradicted §13.2's normative text, which wins. #28: version agreement matches the stub's target on origin and id; the old comment cited #26 for id-only matching, but #26's local-first resolution is exactly what lets a local id shadow a remote target. #29: partiality of a fork's quote is read from the bake's `blyg-partial`, so a legacy whole quote keeps the author's own `>` lines. #30: a remote fork cites the pinned page when the origin serves it at fork time, else the JSON (§8.4 makes pages optional). #31: `dc:creator`.
4. **#32 merged (0.22.0)** after Venkat reviewed a live demo; conflicts were version and changelog only. The redesign covers desktop as well as phone (left rail ≥ 900 px, split editor).
5. **#11 reviewed, not merged.** The toolkit is the conformance runner (#48) the Opus queue had at item 13, and more. Review comment posted: `live/out/crawl.json` commits 5.7 MB of other blygs' post bodies to the spec repo, where a withdrawal can never reach them (against §13.4's spirit); ~160k of 196k lines are regenerable output; `.vscode/` and a workspace file sit at the repo root. Its findings are queued for Fable (below).
6. **Fable queue written:** `docs/fable-round-queue.md`, at Venkat's request. Five blocking items: §9.2 vs #20 (studio#5); §15.4 lets path-mounted blygs on one host verify mentions in each other's name (blocks `tn-3`); a pinned stub keeps verifying after withdrawal; #57 can republish withdrawn unpinned words (blocks the G11 promotion); #43's boundary test misses grammar that travels by fork. Seven non-blocking, plus Venkat's `ignyr` changelog directive (13) and public hoppers in `blyg.json` (14). Carry-overs corrected: since #58, G6/G10/G11 promotions are Opus's.
7. **0.23.0: stale quotes move to an *updates* tab** (Venkat: the compose banner read as a to-do list and invited a flood of trivial versions). Sorted by `behind`, the versions the stale quotes have missed, summed; the server sorts so a future maintenance agent reads the same queue. The page states the batching norm in Venkat's words.
8. **0.24.0: public hoppers made findable.** Aneesh's suggestion (public hoppers as pages, not on the feed) had existed since v0.2 under #12, but nothing linked to the pages. Collections on homepage and archive; the page gets `pageTop` and metadata; migration 0018 adds a description; the old Home link pointed at the host root, wrong on path mounts. Kyle's homepage query budget rose by exactly one (a fixed query), with a comment.
9. **0.25.0: reading scaffolding** (Venkat: telegraph the direction, defer the agent). Lenses on every reading screen; Background and Smart Feed are placeholders. Migration 0019's `interactions` table logs thumbs, hopper membership, and stubs/forks/quotes of other blygs' items: at the store or at publish (never on a click), keyed by origin + id, refreshes not counted, self-references dropped; backfilled (venkateshrao: 33 quotes, 28 stubs, 3 forks; PI: 10, 8, 1, 3 hopper adds, 1 thumb). A test runs the migration's backfill SQL on seeded rows. more → signals indexes it. Lens bar uses buttons, not router Links: a Link to `/reading` counts as current under every lens.
10. **0.26.0: a model per AI function.** `models.json` (providers, key secrets, models; checked against each provider's model page today) merged with a gitignored `models.local.json` at build, because `npm run upgrade` is a git merge and a hand-edited tracked file would conflict; releases build with the shipped list only. OpenAI Responses and Gemini generateContent adapters beside Anthropic, raw HTTP like the existing call (the Worker's small-dependency choice). The old `ai_model` is the fallback (no migration; both nodes resolve to `claude-sonnet-5-5`) and a write alias for one release. Smart feed prompt stored, unused. Authoring row reserved and disabled.

**Fable dependencies checked:** none blocking. Decisions #11/#12 ("AI, identity and editorial convenience are never in the protocol") and §13.7 (ordering is reader policy) put thumbs, the interaction log and smart-feed ordering client-side. `generated[].model` is free text (§5.7), so non-Anthropic model ids need no spec change.

**State after.** blygger-studio 0.26.0 live on both nodes; 856 Worker, 23 UI, 206 e2e tests. Open PRs: blygger-spec#11 (awaiting Aneesh's reply). No decisions ruled under #58 this session.

**Open threads.**
- **For the smart feed's agent design (deferred by Venkat):** feed items are untrusted input to the scoring model (a post can try to instruct it); §13.7's SHOULD that no origin can dominate the order applies to an AI sort; the interaction log and thumbs must stay off the wire; a threshold/mode setting was deliberately not added.
- **OpenAI and Gemini adapters are fixture-tested only.** No keys in `Code/.env.keys` for either; first live use is the real test.
- **#12 (Glass Bead Games) has no reply yet**; it is Fable queue item 12.
- **The 0.22.0 desktop reading list still shows the swipe hint** (mentioned on #32 as a follow-up).
- `ai_model` alias: drop it from the contract in a later release once Kyle's tools are checked.
- The Opus brief does not yet reflect that #11 largely delivers queue item 13 (conformance runner); Fable owns that file.

## Session 33 (parallel, Opus) — 2026-10-03 — Seven releases (0.17.0–0.21.0): the grammar's reach, lineage on import, forks flatten; G10 and G11 exercised

**Model:** Opus 5.5 · **Time:** ~19:00–21:00 PT · **Committed:** yes (blygger-studio, blygger-spec) · **Deployed:** blygger-studio 0.17.0 → 0.21.0 to both nodes; migration 0017 applied to both D1s first. Tags v0.17.0–v0.19.0 cut; v0.20.0 tagged on green CI.

Ran beside the Fable session above. Opus held off `blygger-spec/` until Fable had committed.

**What & why.**

1. **0.17.0: the bracket and TK grammar apply only where they should** (studio#3, #4, #5, #13, #14; all aneesh's).
   - `src/code-ranges.ts` finds code blocks with markdown-it's *own block parser*, so fences, `~~~`, indented code and fences inside list items are found exactly as the renderer sees them, plus code spans by the CommonMark backtick rule.
   - The directive walker, `extractDirectives`, the link resolver and the TK parser all skip code (#54).
   - The walker also skips generated output (#5, #20): inline spans by their existing markers, and provenance-free output by a new U+E004/E005 pair stripped after rendering.
   - `applyInternalLinks` never nests anchors (#13): inside link text a token becomes the label; inside an href or URL text, the author's `[[id]]`; inside tags or `<code>`, the literal.
   - `resolveBlockLinks` is shared by publish and both previews (#14).
   - Inline TK markers are dropped where a span cannot go, such as hrefs and alt text (#3).
   - 18 new tests; 12 fail on the old code, and the other 6 are controls.
2. **0.18.0: lineage survives import** (studio#12; migration 0017 adds `imported_items.stub_of_json` and `forked_from_json`, stored verbatim). **Finding:** the "`cited` on `{url}` stubs is not yet emitted" premise behind G10 was stale. Hostname-only `cited` had been on the wire since 0.4 (three live venkateshrao stubs). What was missing was the import half, plus a useful citation. The response action now freezes the feed's name and the entry title at creation (§5.9), and `parseStubOf` validates an author-supplied `cited`.
3. **0.19.0:** the composer autosaves (studio#23): the first save waits for a 3-second pause and at least 8 characters, then edits save like the editor's. Image alt text keeps escapes (studio#6: markdown-it 14's `text_special` tokens).
4. **0.20.0: forks flatten** (#57, Fable's ruling from the session above; `src/fork-flatten.ts`).
   - Own prose is copied byte-exact from the pinned `content_md`.
   - Each top-level directive, with a partial's attached quote, is replaced in order by its baked element as a plain blockquote plus a *quoted from* attribution line. Nested quotes nest, and the origin carries down the layers.
   - `blyg-tk-gen` is re-wrapped as `impyrt`, with the model from `generated[]` for own prose.
   - **Fallback:** when the directives and the bake disagree, or a generated span cannot be located in the markdown, the whole pinned HTML is converted. Byte-exactness yields before a disclosure does.
   - Fixes fragment forks dropping `generated[]`. A dependency-free HTML parser and converter covers the dialect this client renders.
   - The session-24 test asserting directives were kept was rewritten to the ruling.
5. **Gate G10 exercised:** PI stub `2ba4jjx71hnpatspwpa7a3kv4k` (a `{url}` stub of the living spec, full `cited`) imported onto venkateshrao with `stub_of_json` byte-identical. **Fable can promote §16.1a.**
6. **Gate G11 exercised as a draft:** PI thread `6ftb9x77qw3egm7wrbn5vnfzfr` (pinned v1, quoting venkateshrao `54pwr12zqvvaj37zqx0f8vdbhk`, which itself quotes `blyg.aneeshsathe.com`) forked on venkateshrao as draft `13386qxgds01zxq4q3qjzd2fjh`. No directive remains. Both layers arrived flattened with their attribution, so three origins were crossed. **Publishing the fork is Venkat's call**, since it is his node and his voice. Left as a draft.
7. Studio issues #3, #4, #5, #6, #12, #13, #14 and #23 closed with replies. #5 was reopened later in the session (point 8).
8. **0.20.1, Venkat's provisional ruling on the conflict below.** An own-line `![[id]]` left in TK output is a real transclusion at publish, per the Fable §9.2 reading, which reverts 0.17.0's #5 change. Code stays inert (#54). studio#5 is reopened with an explanation. The generate route's misleading "unresolvable source" for a valid imported or thread id now reads **"TK transcludes are not yet implemented"** (Venkat's wording). That restriction is the v0.1 `resolveFragment` rule, which still accepts only own published fragments. It hits **own threads** as well as imported items, and #44 / G8's R2 lifts both. Drafts, withdrawn items and unknown ids keep an "unresolvable source: <reason>" error.
9. **Gate G11 fully exercised:** Venkat had the fork published. venkateshrao `t/13386qxgds01zxq4q3qjzd2fjh` v1: `forked_from` = PI `6ftb9x77qw3egm7wrbn5vnfzfr` v1 (pinned), `transclusions: []`, no `blyg-transclusion`, both attribution lines present. **Fable can promote §16.6f into §5.6.**

10. **0.20.2, small fixes before wrap-up:**
    - **studio#15 parts 2–3.** `escapeXml` and `cdata` drop XML-1.0-invalid characters. One of them breaks a subscriber's *whole* feed in libxml2 readers, while our `fast-xml-parser` tolerates it. Publish strips them and the U+E000–E005 sentinels from published text.
    - **Grapheme-safe truncation.** `graphemePrefix` in the new dependency-free `src/text.ts` (it has to be importable by the Studio bundle, which `util.ts` is not) replaces `slice(0, n)` at five sites.
    - **studio#1.** The template assertions on `wrangler.jsonc` moved from `npm test` (which operators run on their own config) to the CI-only `npm run check:template`.
    - **studio#10.** `9000_`–`9999_` is reserved for operators' migrations, documented in the README and enforced by the same CI script. A first attempt put that check in a test, which would have repeated #1's mistake on operators' installs; it was caught before commit.
    - #1 and #10 are closed. #15 stays open for part 1, charset-aware imports.

11. **0.21.0: every changelog note is confirmed before a new version publishes** (Venkat's design). Publishing version 2 or later opens a *Version N / Change [editable] / Confirm / Cancel* dialog whenever there is a note to confirm: typed, from *draft note*, or drafted on the spot when the new `auto_change_notes` setting is on and the field was left empty. Version 1 never asks. An empty note with the setting off publishes as before. `note_generated` is sent only when the confirmed text equals the draft. One hook covers the full editor, quick edit and the list's publish/republish. The setting is **off on both our nodes**; turning it on is Venkat's call. **G6's reverse direction: Venkat ruled it unnecessary.** Fable can promote §16.6c on the one-direction exercise from session 32.

**State after.** blygger-studio 0.21.0 on both nodes, migrations through 0017. Suites: 823 Worker, 6 UI-state, 142 browser, all passing. Opus brief item 5 (fork flattening) is done; G8 is still deferred.

**Open threads.**
- **For Fable — a conflict to reconcile (provisionally settled by Venkat in 0.20.1, §9.2's way).** The session-33 Fable entry's §9.2 says an own-line `![[id]]` left in TK output is "at publish, a real transclusion", and calls that consistent. That describes the code before 0.17.0. Following decision #20 ("inside a TK scope every `![[id]]` is a source reference … never a blockquote; scopes cannot contain transclusions") and aneesh's #5, 0.17.0 makes such a line inert. The code follows #20; §9.2's note should change, or #20 should be revisited.
- Earlier imports have `stub_of_json` NULL until their origin's next version; no backfill was written.

## Session 33 (parallel, Fable) — 2026-10-03 — Forks flatten (#57); the TK-source questions were #44 all along

**Model:** Fable 5.1 · **Time:** ~19:05–20:05 PT · **Committed:** yes (blygger-spec, blygger-org) · **Deployed:** blygger.org (sixth revision of the 0.3 text). Run beside an Opus session; Fable touched `blygger-spec/` and the spec sync in `blygger-org/`.

**What & why.** Venkat opened a Fable session for two things he hit in the studio.

1. **Forking a thread with quotes** (screenshot: `fork of 5d1dee… v1`). The top level was
   editable; the quotes arrived as `![[id]]` directives, uneditable. He asked whether a
   fork should flatten the whole tree to fragment level, raised and set aside pin-closure
   (a thing may be pinned only if everything it quotes is pinned), and settled on
   recursive unrolling. **Ruled #57, agreeing, with the reason sharpened:** the current
   fork copies `content_md`, so it inherits a *composition* that re-resolves in the
   forker's context — different versions on an own-origin fork, publish failures and
   drift on a remote one, quote-mentions sent on the forker's behalf — which is not
   "the bytes anyone can still fetch" that `fork.ts` says a fork descends from.
   Pin-closure is wrong for a stronger reason than tedium: the thread's pin already
   freezes every baked quote in its `content_html`, so the fragments' pins add nothing.
   Shape: source quotes from the pinned `content_html`, own prose byte-exact from
   `content_md`, each quote an ordinary blockquote with an attribution line, recursive,
   no `blyg-transclusion` class, no inherited `transclusions[]`, re-cite by hand for a
   live quote, `blyg-tk-gen` re-wrapped as `impyrt`. The last point exposed that today's
   fork drops `generated[]` for a forked fragment as well — session 32's restore-leak
   class. Revision by #43; §16.6f now, §5.6 rule 6 after the build; gate **G11**; Opus
   queue item 5, ahead of remote generation sources. Reasoning: `v0.4-plan.md` §9.1.
2. **TK sources.** "`[TK] prompt ![[id]] [/TK]` says unresolvable for imported ids" —
   that is the v0.1 rule in `resolveFragment` (local, published, fragment-only), which
   #44 already widened; the build is G8, deferred at session 32 and left deferred. "What
   goes out" is not the scope: output as prose, `blyg-tk-gen`, `generated[]` by
   reference, a `source` mention at 0.4; the source's words are never carried as a quote
   (§5.7 rule 3), so "TK transclude" is a misnomer the docs should drop. `[[id]]`,
   `[text](url)` and bare URLs inside a scope are literal text — not retrieved, not
   disclosed — by the principle shared by #32 and #44, resting on the generator being
   network-free. One edge noted for the studio: a `![[id]]` left in the output becomes
   both a source and a real quote at publish. No ruling needed; recorded as plan §9.2.
3. **Recorded at once on "go":** §5.6 rule 6 pointer and new §16.6f in the spec, §17
   sixth-revision line, decision #57 and a carry-over in `CLAUDE.md`, plan §9, Opus
   queue item 5 with the rest renumbered, G11 in the Fable brief.
4. **Model routing re-gated on blast radius (#58).** Venkat: Opus 5.5 is out and said to be
   near Fable-grade; reduce the need for Fable rounds as far as feasible. The old rule
   routed by subject and made Fable the bottleneck for reversible work — of #52–#57,
   three needed no new principle and changed nothing on the wire, and today's TK
   questions were lookups. Opus 5.5's own record in sessions 30–32 (bugs found, a recorded
   choice held against a skill, the cost call deferred, gaps recorded not improvised) is
   the evidence that matters, not the capability claim, which is unverified and which the
   rule does not depend on. **The four-question test** (`CLAUDE.md` § Model routing):
   must a reader change (#43); is anything readers see added, removed or renamed; is a
   locked decision reinterpreted or the do-not-open list touched; can a settling principle
   be cited. All clear → Opus rules, records with a `Fable review pending` label, builds.
   §16 promotions after a gate (G6, G10, G11) move to Opus. Fable keeps G8, new wire
   surface, verification and identity, conflicts and reversals, and a batch review that
   opens every Fable round. Recorded in `CLAUDE.md` (routing section and #58), the
   roadmap's reading rule, and both briefs.

**State after.** Decisions through #58. 0.3 text at its sixth revision, **published**
(blygger.org via `deploy.sh`, cache-bust verified). G8 still deferred. The next Fable
round opens with a review of whatever Opus has ruled under #58. Opus session running in
parallel owns everything outside `blygger-spec/`.

**Open threads.**
- **#58 is untested.** The first Opus-ruled decision is the test of whether the four
  questions are sharp enough; the review step is where a wrong stop or a wrong rule shows.
- **The attribution line's form** is the build's call; G11 records it.
- **HTML-to-markdown for quotes** is bounded to the blyg dialect; images in quoted
  fragments become absolute `![]()` links to the origin's media. If the build finds a
  construct it cannot round-trip, record it as an open thread rather than improvising.

## Session 32 — 2026-10-03 — Opus queue items 1–4: six releases (0.11.1–0.16.0); G6 built and half-exercised; image and editor bugs

**Model:** Opus 5.5 · **Time:** ~10:57–12:20 PT · **Committed:** yes (blygger-studio, blygger-spec) · **Deployed:** blygger-studio 0.11.1 → 0.16.0 to both nodes; migrations 0014, 0015, 0016 applied to both D1s first. Tags v0.11.1–v0.15.0 cut; v0.16.0 tagged on green CI.

Continues session 31 after Venkat switched back from Fable; counted as its own session because the Fable part wrote its own entry.

**What & why.**

1. **0.11.1 deployed** (Kyle's #25). Live time to first byte on the homepage went from ~4.2s to ~0.35s on venkateshrao and from ~1.9s to ~0.3s on PI. That answers session 31's open thread: the `json_each` batch queries work on remote D1. D1 commands need `CLOUDFLARE_ACCOUNT_ID` per node under OAuth, which `deploy-protocol.md` already documents.
2. **0.12.0: stale quotes** (decision #33's direct check; #38 "detect always, refresh only on a decision"). `src/freshness.ts` reports each quote of a published thread against **what `resolveTarget` would bake now**, the same function publish calls, so the report cannot drift from publish. Remote quotes also probe `{origin}items/{id}.json`; a failed probe is inconclusive and never marks a quote stale. Statuses: current, refreshable, behind, passage-missing, unresolvable, retained. Only the direct relation counts (#45).
   - **Refresh** republishes through `publishAndNotify`, which is factored out of the publish handler so both share the fork check and error mapping. It resyncs a lagging subscription first through the importer's own `reconcileIndex`. The wire shows #38's distinguishing fact: same `content_hash`, new version.
   - **The finding:** refresh could not gate on `dirty`. "Discard changes" leaves `dirty = 1` on purpose, because a restore drops the positional TK provenance cache, and the parity suite asserts that. So refresh gates on *holds the published words*: the copy is clean, or it is byte-equal to the published version and that version disclosed no `generated[]`.
   - **The same hazard is live for any restore-then-publish:** republishing a restored version that disclosed generated text drops `generated[]`. Not fixed; recorded in the studio backlog.
3. **0.13.0: `[TK]impyrt=…[/TK]`** (#37). The provenance lives in the grammar (`TkScope.imported`), not the positional cache: `sources: []`, `model` only if the author wrote one, never `at`. So reordering scopes cannot move the disclosure. The editor gains *mark selection as generated*; generate refuses impyrt scopes; a `![[id]]` inside one declares no source.
4. **0.14.0: drafted changelog notes** (#40; migration 0015 adds `versions.note_generated`).
   - *Draft note* asks the configured model to describe the change. It runs before publish, never inside it, so publish stays network-free (#26).
   - **§5.2's depth rule is enforced mechanically:** over an unpinned prior version, a draft that reproduces a 6-word run found only in the old text gets a 422. The guard's first version missed runs wrapped in quote marks, because apostrophes counted as word characters; a test caught it.
   - `changelog[].generated: true` is emitted only when the note is published unedited.
   - Fixed on the way: the editor never cleared the note after publish, so a stale note rode along on the next publish.
   - The provider's HTTP call is factored into `complete()`. The claude-api skill wanted the SDK and `claude-opus-5-5`; the raw-fetch transport is a recorded choice for this Worker, so it stayed, and the model question went to Venkat (point 7).
5. **0.15.0: history for imported items** (#40, reader half). The changelog is read from the origin on demand. *See the change* is a dependency-free word diff (`src/word-diff.ts`: paragraphs aligned first, then words inside replaced paragraphs), offered only between public versions, meaning adjacent pins and last pin → current. The fetcher tries only `v{n}.json` and the item document. With 0.14.0 this is the whole build side of **gate G6**.
6. **G6 exercised in one direction.** PI item `4zss0yg5f5zbh48e22s4f87003` (labelled a conformance exercise; left up per the standing rule) got v2 with a note drafted by `claude-sonnet-5-5` and published unedited, so PI's changelog emits `"generated": true`. Venkateshrao's studio resynced, imported v2, and read that history through the new route; the unpinned v1 correctly returned 404. The reverse direction needs a publish in Venkat's own voice and is his call.
7. **AI model (Venkat):** both nodes set to `claude-sonnet-5-5` over the API, to save cost. The released package has **no built-in default** (0.16.0): with no model set, generation says so instead of choosing for the operator. Venkat's correction: this reaches only operators who set the `AI_PROVIDER_KEY` secret and left the model blank (until 0.15 they silently paid for Opus). Without a key, generation has never run. The changelog was narrowed to say exactly that.
8. **0.16.0: bugs.**
   - **Images** (Venkat's report and studio#24): every Studio upload is now inline (`media.inline`, migration 0016, backfilled where the item's text already references the image). An inline image shows only where its line is, so deleting the line removes it from the page, the feed and the item `media` list. Uploads from other tools are still appended. `DELETE /api/media/{id}` detaches when a published version still shows the bytes (§5.4) and deletes otherwise. The editor lists each attachment's state and offers *remove*.
   - **The upload stall did not reproduce** in Chromium or WebKit, locally or against live PI, including 3.2 MB files and a slow-network simulation. The explanation that fits all of Venkat's symptoms: navigating away mid-upload saves the placeholder into the draft, and the finished image is then appended at the bottom. Uploads now block navigation, and stale placeholders are stripped when the editor opens. **Unconfirmed**; Venkat to report node, browser and file type if it recurs.
   - **Editor viewport:** a fixed 18rem textarea sat inside a pane stretched to the preview's height. Panes are now flex columns sized to the window, and the textarea fills its pane.
   - **studio#2:** two string-replacement splices became function replacements.
   - **Closed with replies:** studio#24 and #2. studio#7 (media versioning, double uploads) is only partly addressed by removal and stays open.

**State after.** blygger-studio 0.16.0 is live on both nodes, with migrations through 0016. Suites: 790 Worker, 6 UI-state, 136 browser, all passing. Opus brief items 1–4 are done. Next in the brief are remote generation sources (gate G8), which Venkat deferred, and `cited` on `{url}` stubs (gate G10). Gate G6 is built and exercised PI → venkateshrao only.

**Open threads.**
- **G6's reverse direction:** a drafted note published unedited on venkateshrao, read from PI. Venkat to decide. Fable promotes §16.6c into §5.2 once the gate is judged open.
- **studio#4 / decision #54** (`[[id]]` and `![[id]]` inert in code): planned but not built. Detect code regions with markdown-it's block parser (fences, indented code, fences inside lists) plus a backtick-span scanner, and skip directives and links in them in `walk`, `extractDirectives` and `resolveInternalLinks`.
- **Restore-then-publish drops `generated[]`** for a version that disclosed generated text. The repair candidate is re-wrapping the restored spans as `impyrt`; the open question is locating them in markdown.
- **The upload stall is unconfirmed;** see point 8.
- **Refresh's resync branch** (`behind` → `reconcileIndex`) is unit-tested only. The test pool's outbound fetch is 503, so the first real "behind" refresh is its live test.
- **8 legacy attachments on venkateshrao** are still appended below their posts and are removable from each editor. 1 row on PI is the avatar.
- Typing in the note field while a draft request is in flight gets overwritten when the draft arrives. Minor; the e2e test had to wait for it.

## Session 31 — 2026-10-03 — Kyle's #25 merged (0.11.1); Fable triage: partial transclusion normative, #52–#56, nine issue replies

**Model:** Opus 5.5 (merge, triage list) → Fable 5.1 (rulings, recording) · **Time:** ~10:26–11:00 PT · **Committed:** yes (blygger-studio, blygger-spec, blygger-org) · **Deployed:** blygger.org (fifth revision of the 0.3 text). blygger-studio 0.11.1 is merged, **not** tagged or deployed.

**What & why.**

1. **Kyle Mathews' #25 merged as 0.11.1** (`e8eb334`). The public homepage went from ~300
   D1 queries for 100 cards (one each for content, pins, media and quoted sources) to 5,
   or 7 when a thread quotes another item, plus 2 for settings and the item list, by
   batching through `json_each` joins; migration **0014** adds four indexes and changes no
   data; pin links on the other public pages stop reading every version body. Reviewed
   against the old code path by path — order and tie-break preserved, withdrawn quoted
   items still resolve to their authored kind, frozen citations still beat the live join,
   the social image still falls back to the avatar. 743/743 locally with the private-config
   tests CI skips; both typechecks clean. One thing not checked here: the queries lean on
   SQLite's JSON functions inside D1, verified only against local D1. Deploy needs 0014
   applied to both D1s first — carried over.
2. **The Fable triage.** Opus wrote the triage list (Part 1 what unblocks work, Part 2
   gates, Part 3 public issues), Venkat switched models, Fable ruled. Rulings and reasoning
   in chat, one "go", then everything recorded at once (the session-27 cadence).
   - **#52 — Kyle's phase 3.** OAuth-style minting stays inside #31 because #31 fixed the
     token model, not the minting UX, and Micropub's own auth is IndieAuth (OAuth 2 with
     your own site as the authorization server). MCP is a transport for #39's contract, not
     a second one. **Kyle builds 2.9; Opus comes off it** and reviews against four
     invariants (one token model with a paste path; no `.well-known` — host-rooted, breaks
     path-mounted blygs — and no manifest key; a read scope and a distinct publish verb,
     no refresh-only scope; MCP = same operations and scopes with provenance recorded).
     What tipped it from refusal to constraint was the measured state: Blygger Desktop
     holds the owner password on a stock server and an unscoped `BLYG_OWNER_TOKEN` on an
     extended one — both the thing #31 exists to end — its author lists the scopes he
     needs in studio#11 and says he switches the day scoped tokens ship, and his docs
     already read Kyle's OAuth plan as upstream's direction. Two auth systems was the
     outcome of fighting it. Reasoning: `v0.4-plan.md` §8.1.
   - **#53 — `content_html` is self-contained**, every URL absolute (§5.2). The same bytes
     travel three ways with no origin to resolve against; §7 already required it for the
     description, which *is* `content_html`. `media[].url` unaffected. Revision by #43;
     built in 0.11.0, so straight into normative text.
   - **#54 — `[[id]]` inert in code** like the directive (§10.1; blygger-spec#4). A
     grammar correction. studio#4 now covers both forms.
   - **#55 — `cited` MAY sit on a `{url}` stub** (§16.1a; blygger-spec#7). #49's "plain-web
     targets get nothing" is about verification; `cited` promises no test and the frozen
     label matters *more* for a target with no versions. Same cap. Gate **G10** added.
   - **#56 — `page` SHOULD be stable** (§5.8; blygger-spec#9). Option A; a reader MUST
     re-read per version rejected as a new obligation that helps no link already outside
     the system.
   - **Parked with triggers** (plan §8.6): Unicode (blygger-spec#6) gets a round of its own,
     measured first — the NFC/NFD sensitivity of `content_hash` is a real defect; the
     variorum (blygger-spec#8 part 1) becomes `![[id@vN]]`'s named trigger, and
     fork-plus-prose is explicitly *not* the intended answer; a namespaced `meta` bag
     (blygger-spec#10) not opened — `author` is the one extension point by design.
     blygger-spec#8 part 2 asked for one sentence in §10.2 (the republication veto an
     unpinned remote quote hands a stranger; quote pins) and got it.
3. **Gate G7 closed.** Partial transclusion promoted from §16.4 into §10.1 (grammar), §10.2
   (faithfulness check and bake) and §10.3 (`selector`), with the build's P4 call recorded
   as the rule: the bake is the selection's plain text in paragraphs, not a carved HTML
   sub-range; emphasis in the source does not survive, and that is the visible cost.
   `blyg-partial` is the third wire-visible class in `css-contract.md` §1. §17 gains the
   fifth-revision line. **Published** via `blygger-org/deploy.sh`; verified live with a
   cache-bust. Not snapshotted (policy).
4. **Nine replies posted through `gh` in Venkat's voice**, at his instruction: #2
   (cyberscribe — the #51 ruling and the G9 gate, asking whether the WordPress side is being
   built), #5 (the conformance corpus is #48's reader half; stays open as tracking), #6
   (parked, with the method), #8 (both halves), #10 (Kyle — physics vs culture is the
   stance; no `meta` bag; the genre list is worth mining); #3, #4, #7, #9 closed with their
   answers; studio#4 extended to `[[id]]`. The drafts are in the session scratchpad.
5. **Both briefs rewritten.** `opus-brief.md`: 2.9 is Kyle's; the picker and partial
   transclusion are off the list; the queue leads with deploying 0.11.1, bulk re-pin,
   `impyrt`, generated notes, then remote generation sources, then `cited` on `{url}` stubs
   and the two small spec-driven fixes. `fable-brief.md`: gates G3/G5/G6/G8/G9 carried,
   **G10** added, G7 removed; Unicode as the one standing question; `.well-known` and the
   `meta` bag added to do-not-open.
6. **`DEVLOG.md` carried one literal NUL byte** (line 316, inside the note *about* NUL bytes
   in `src/review.ts` — the same escape mistake it described), which made `grep` treat the
   whole file as binary. Replaced with the two-character escape.

**State after.** 0.3 text at its fifth revision, live. Decisions through #56. Carry-overs:
G8 is the next build; Kyle's auth PR is reviewed against #52; 0.11.1 awaits migration 0014
and deploy. Open spec issues: #1 (v0 comments), #2 (awaiting cyberscribe), #5 (tracking),
#6 (parked), #8 (answered, left open for the variorum thread), #10 (discussion).

**Open threads.**
- **0.11.1 deploy** — migration 0014 on both D1s, then `deploy:vgr`/`deploy:pi`, then the
  `v0.11.1` tag. Live homepage timing unmeasured before and after; measure once.
- **The `json_each` queries are untested against remote D1.** Local D1 passed; the first
  deploy is the test. If a query fails live, the fallback is the pre-0.11.1 renderer, which
  the old tests still cover.
- Two more Unicode-adjacent client bugs (studio#15) sit beside spec#6 and should be fixed
  regardless of the spec round.

## Session 30 — 2026-10-02 — Kyle Mathews' Studio rebuild merged; blygger-studio 0.10.0 and 0.11.0; akash's site PR

**Model:** Opus 5.5 · **Time:** ~16:50–19:40 PT · **Committed:** yes (blygger-studio, blygger-org, blygger-spec) · **Deployed:** blygger-studio 0.10.0 then 0.11.0 to both nodes; blygger.org

**What & why**

Two outside contributors had open PRs. The session reviewed them, routed them, merged them,
and then shipped follow-ups that Venkat asked for once the merged Studio was live.

1. **Kyle Mathews' blygger-studio #21 + #22** (≈47k lines, stacked). #21 rebuilds `/api`
   as a documented contract: Zod → OpenAPI 3.1 → Hey API SDK, resource routes, strict
   validation, removed pre-0.9 routes with no aliases. #22 rebuilds the Studio as a React
   SPA (TanStack Router/DB, Base UI) and deletes the SSR Studio. **Routing: no Fable needed**
   for either. Nothing changes on the wire (protocol-output assertions were preserved 1:1,
   and `transclusion.ts` was touched only by a verbatim move to `directives.ts`). #31
   already ruled `/api` is the client's own contract, and neither PR changes auth. Three
   **Venkat calls** were needed and made:
   - (A) reverse v0.1-plan's "no client-side framework" rule for the Studio. Public pages
     stay server-rendered. This removes the template-literal/inline-script bug class.
   - (B) **releases cut from `v*` tags, not on every push to main.** Kyle's
     `release.yml` would have shown a failed run on every doc-only push and pushed every
     merge into strangers' update alerts. Changed in `2a6d75b`.
   - (C) accept the `/api` route break. Blygger Desktop calls removed routes, but it
     already needs a modified server (it sends bearer tokens and calls `tk-provenance`
     endpoints), so nothing that works against stock Studio broke.

   Merged #22 alone, since it contains #21, so no stray 0.9.0 release went out. Verified
   locally before pushing: 730 Worker, 6 UI-state and 118 Playwright tests.
   **Kyle's phase 3 (OAuth, then MCP) is ⚠️ FABLE before it starts** — see Open threads.
2. **akash's blygger-org #1** (mobile nav + Contents drawer). Merged with a follow-up
   (`1a06ad8`). The PR clipped page overflow, which would have cut off wide spec tables
   with no way to scroll, so `build.py` now wraps tables in a scroller. Tapping a section
   link no longer pulls focus back to the button. It also fixed a live bug: the talk page
   showed the literal text `{{SPEC_LINK}}`. Deployed with `./deploy.sh`.
3. **0.10.0 live, then exercised for real.** Applied migration 0013 by hand to both D1s,
   deployed per target, and drove both nodes over the API with the registry passwords:
   login, reading pages 1–2, upload, TK generation through the live provider, publish,
   edit and republish (two test posts). Venkat checked the Studio on his phone, the
   save-before-navigate behaviour and select-to-quote. Kyle's background code (mentions,
   importer, cron, `protocol.ts`) is untouched, and the cron was seen polling after the
   deploy.
4. **CI flake** (run 37085553974): Playwright gated readiness on port 8787, but the
   mounted-studio proxy on 8789 starts last. It now gates on the proxy. A second race, in
   quote-selection, was found by a local run (`8a65934`).
5. **0.11.0** (Venkat's asks, plus one bug found while answering a question):
   - **Feed thread cards show the thread** — the permalink's own HTML with provenance,
     clipped at 24rem with a fade, "THREAD · N quoted" as its own line. This
     *deliberately reverses* session 28's plain-text teaser. That teaser's later fixes
     existed because flattening HTML welded a quoted sentence onto the author's own; real
     HTML keeps the blockquote boundary. One-line surfaces (title, og, RSS headline,
     archive) keep the author's-own-words rule.
   - **Images anywhere while writing** — caret insertion, `/image` on its own line,
     paste, drop, with a placeholder holding the spot during upload. `/image` never
     reaches `content_md`, so there is no protocol question.
   - **Absolute URLs in `content_html`**, found by asking whether `/image` raised protocol
     issues. A PI image imported to venkateshrao resolved against the wrong host (404).
     §7 required absolute URLs in the RSS description, and the item document didn't have
     them. Fixed on four sides: publish, import, bake (a remote snapshot is resolved
     against *its* origin before entering our thread), and a bounded, idempotent cron
     repair (`repairImportedUrls`; GLOB, not LIKE, so `//host` can't starve it).
   - Operator docs: a CHANGELOG entry written for nodes on 0.8.x, and
     `docs/upgrading-to-0.11.md` (paths, migration table, the stale-`build/` trap,
     mounts, checks, rollback, and an old→new route table for tool authors).

**State after:** blygger-studio **0.11.0** is tagged and deployed to both nodes (735
Worker + 6 UI + 126 browser tests). Releases are cut from tags. blygger.org is deployed
with akash's drawer. The Studio checkout's `node_modules`, `build/` and `sdk/dist/` are
now Dropbox-ignored; `node_modules` never had been.

**Open threads**
- ⚠️ **FABLE: Kyle's phase 3** (`blygger-studio/docs/migration.md` §3). OAuth goes beyond
  #31's owner-minted bearer-token direction, and MCP is #39's agent contract. The ruling
  must also settle who builds the rest of 2.9 (Opus queue item 2), so that two auth systems
  don't get built. Added as a carry-over.
- ⚠️ **FABLE, one line:** must `content_html` in the item document carry absolute URLs?
  The spec is explicit for RSS (§7) and only implies it for the item document (§16.2's
  reason for absolute `[[id]]` hrefs). 0.11.0 is correct under either ruling.
- `opus-brief.md` predates the React Studio: queue items with UI halves now land in
  `src/ui/`. The studio backlog carries a note saying so. The brief is Fable-owned, so it
  was not edited.
- ~~Kyle's branch-era "Approved API and SDK migration" section in `blygger-studio/CLAUDE.md`~~ —
  removed at Venkat's request, end of session.
- ~~"Reader view doesn't roll up entries"~~ — dropped by Venkat as a mistaken diagnosis.
- Venkat posted the release announcement on his blyg.
- `/image` opening the file picker from a keystroke is verified in Chromium only. iOS
  Safari is untested.
- Test posts are live: PI `1pxtdtfzy2zcasa10qxrpvp32h` (v2). venkateshrao
  `2gj6y12ephczxkqsq95yxhpbpm` was withdrawn by Venkat.

## Session 29 (parallel, research) — 2026-09-29 — Five exploration docs, ten public issues, and a conformance-cost criterion

**Model:** Opus 5 · **Time:** ~07:50–09:30 PT · **Committed:** yes (`plans/` only) · **Deployed:** —

A **research-only** session, running beside the implementation session that built partial
transclusion. Wrote nothing in `src/`, touched no protocol text, deployed nothing. Output is
five docs in a new `plans/` directory and ten issues across the two public repos.

**What & why**

Venkat asked for four explorations in two rounds. Each produced a doc in `plans/` — a new
directory, chosen over `docs/` deliberately: these are exploratory, none is ruled, and a
separate directory keeps them from reading as plan docs of record. They are also the one
thing this session wrote into `blygger-spec`, so the parallel session's file ownership was
never in question.

1. **`unicode-support-proposal.md`** — the spec says nothing about Unicode beyond implying
   UTF-8, which settles none of the four things the protocol does with text (hash, compare,
   count, slice). Seven findings, all **measured in workerd** via a temporary
   `vitest-pool-workers` probe rather than reasoned about. Two are cross-implementation
   interop defects (`content_hash` is NFC/NFD-sensitive; §12.2's "two readers write the same
   origin string" is an artifact of the reference client's URL parser, not a requirement).
   Three are live client bugs (§below). Proposes four rules plus an optional manifest `lang`.
2. **`rich-editor-proposal.md`** — four options for a richer composer, costed.
3. **`pour-over-links-proposal.md`** — paste a URL, pour the source into the draft. Venkat
   defined the term this session; it appears nowhere prior in the four repos or this devlog.
4. **`publishing-patterns.md`** — 24 publishing genres the existing primitives support, with
   print and digital precedents, plus §4: the genres that are **blocked**.
5. **`inline-fragment-authoring.md`** — a `[[text]]` operator that tangles one document into
   a thread plus component fragments, and the three separate questions hiding inside
   "meaningfully named anchors for ids".

**The decision that reshaped two of the five.** Venkat ruled mid-session: *vendored options
are out for the reference client, and definitely out for anything touching the protocol.*
The first clause killed the editor doc's recommendation (CodeMirror 6) and its biggest win,
`[[id]]` as a readable chip; what survives is overlay highlighting — paint-only, so the
textarea keeps IME, undo, bidi and mobile from the platform — plus making the already-real
preview pane interactive.

The second clause is the sharper one and is recorded as **§0 of the Unicode doc**: at the
protocol level, "no vendored dependencies" means **a normative rule must be satisfiable from
a language's standard library**. JS has `Intl.Segmenter`, `String.normalize` and IDNA-via-`URL`
built in, which is exactly why the first draft did not notice that two of its four rules
were dependency-imposing for Python, Go and Rust implementers. Both were reformulated, and
the reformulation is better spec text: **state properties, not algorithms** ("the origin MUST
be ASCII" constrains the same set as "apply IDNA ToASCII" and costs nothing to check), and
**put correctness in the MUST, quality in the SHOULD** (never emit an unpaired surrogate is
free; never split a grapheme cluster needs a segmenter). Whether that criterion belongs in
§3 of the spec is an open thread below — it constrains every future construct, not just this
one.

**Three live client defects, all verified, now `blygger-studio#15`.** (a) `Response.text()`
in workerd **ignores the `charset` parameter**, and no code path anywhere sniffs encoding —
so every non-UTF-8 feed the L0 wrapper imports is mojibaked, and §10.2 then bakes that
permanently into any thread quoting it. `TextDecoder` supports the full WHATWG label set and
is unused. (b) `excerpt()` slices by UTF-16 code unit and emits a **lone high surrogate**
at odd boundaries, which becomes U+FFFD in every subscriber's feed title and inside
`cited.excerpt` on the wire. (c) `escapeXml()` passes C0 controls through; `fast-xml-parser`
tolerates them so our suite stays green while a strict subscriber's parse of the **whole
feed** fails.

**One finding handed directly to the implementation session:** the NFC gap lands on partial
transclusion's substring test — the NFC spelling of a phrase does not `.includes()` its NFD
spelling — so an author selecting visibly-correct text gets a publish error. One line, cheap
while the test is being written, expensive after.

**Routing the issues.** Venkat asked for the docs to be filed on the spec repo. The spec
repo's own `config.yml` says *"if no other client would have to change, it is a client bug,
not a protocol one"*, and by that rule most of this is client work — the editor is §16.6
territory ("never normative"), pour-over emits only ordinary markdown, tangling rewrites to
ordinary 0.3, and `page` slugs are already legal. Raised the conflict, Venkat chose the
split. Result: **4 on `blygger-spec`** (#6 Unicode, #7 `cited` on a `{url}` stub, #8 the
variorum + the unrepublishable book, #9 `page` stability) and **6 on `blygger-studio`**
(#15–#20). All cross-linked; decision numbers disambiguated from issue numbers so `#45`
does not silently become a link when a repo reaches 45 issues.

**Two findings worth more than their issues suggest.** The **variorum** is blocked by the
`![[id@vN]]` reservation, and the backlog's rationale ("snapshot semantics make the need
moot") holds for the common case but not for displaying two versions side by side under one
byline — which is what a critical edition is. And a thread quoting an **unpinned remote
item** can become permanently unrepublishable when a stranger withdraws: the mitigation
("quote pins if you want your work to survive") is currently an inference across three
sections and is probably the most actionable sentence available to anyone composing a
durable work here.

**State after**

`plans/` holds five exploratory docs, none ruled, none referenced from the document map yet
(see open threads). Ten issues open across the two public repos, each self-contained. No
source, spec text, migration or deployment touched by this session. The temporary Unicode
probe was deleted; `blygger-studio`'s working tree carries only the other session's changes.

**Open threads**

- **Is the conformance-cost criterion right, and does it belong in the spec?** Unicode doc
  §0 and issue #6 question 7. It is inferred from a ruling about client vendoring. If it
  holds, §3 is its home, and it would have caught two bad rule formulations before they were
  written.
- **May an explicit, author-triggered publish-time act rewrite the author's source?** Asked
  from two directions — `blygger-studio#16` Q3 (editor) and `#20` Q1 (tangling). **One
  ruling closes both**, and it is the highest-leverage decision among the ten issues.
- **Is the no-vendoring ruling client-side JS specifically, or dependencies generally?**
  Assumed the narrow reading throughout; the broad one reaches `markdown-it` and is a much
  larger conversation. `blygger-studio#16` Q2.
- **`docs/backlog.md` and the document map are not updated** for these five docs. Deliberate:
  the backlog says only a Fable round moves an idea out, and the document map is Fable-owned
  under the session-28 partition. The next Fable pass should file what survives and decide
  whether `plans/` earns a document-map row or folds into `docs/proposals/`.
- **Should the patterns catalogue be published?** `blygger.org` has three genres (spec,
  notes, talks); *patterns* would be the first aimed at publishers rather than implementers.
  Track 4; parked as `blygger-studio#18` question 3 rather than opening `blygger-org`'s
  first-ever issue on a speculative question.
- **The issue templates reference labels that do not exist** on either repo (`protocol`,
  `proposal`). Template-created issues cannot apply them. Two `gh label create` calls.
- **Ten public issues cite `plans/` paths**, so those docs are pushed with this entry —
  otherwise the citations dangle.

## Session 29 (continued, third block) — 2026-09-29 — Refinements across the client and both sites; the directory stops queueing

**Model:** Opus 5 · **Committed:** yes (studio, org, com) · **Deployed:** blygger-studio 0.8.2 and 0.8.3 to both nodes; blygger.org twice; blygger.com four times · **Released:** v0.8.2, v0.8.3

**What & why**

Venkat: "Refinements to studio and blygger.org and .com websites," then five
more items as the afternoon went. Grouped by what they turned out to be about.

**1. A thread was named in other people's words.** Reported as "the main public
display page still doesn't display thread cards properly"; the feed card was
only where it showed. A thread's `content_html` carries baked transclusions, so
flattening it to a one-line name attributes the quoted person's sentence to the
thread's author. Measured before fixing: **5 of 19 live threads opened with a
transclusion** — the shape `POST /api/stubs` prefills — so their browser tab,
search heading, social card, RSS headline and feed excerpt were all somebody
else's sentence. One derivation, `authorOwnHtml`, now feeds all four surfaces,
and the card gained a `⧉N` count to say why it is shorter than the item.

That is **three sessions running** in which a derivation was fixed on some
surfaces and not others (titles twice, now this). The helper's comment records
the count deliberately: the question to ask of any derived string is how many
surfaces run it.

**2. The directory stopped queueing, twice.** Automatic listing first, with
seven checks. Venkat on seeing the result: *"I'm not going to chase down
harmless failures personally. Hold back should be for confirmed security issues.
Others can be released with a warning."*

So the gate went three-valued — block, warn, clean — and the useful line turned
out to be **confirmed versus ambiguous, not severe versus mild**. A reviewer
cannot distinguish a homograph domain from a legitimate non-Latin one, or a
hijacked manifest from a site that moved; those warn. Only acts nobody performs
by accident block, and there are two: a credential in a public URL, and a
direction-override character in a display name.

**The rule that taught this lesson twice.** "Manifest asserts an origin that is
already listed here" survived about an hour as a block, on the reasoning that
mismatch *onto a neighbour* is checkable where bare mismatch is not. The first
real row it met was `[jdbb] studio blyg`, whose manifest claims
`jd-blyg.exe.xyz` — the operator's own previous address, listed here, because
they had moved hosts. Indistinguishable from impersonation by inspection,
overwhelmingly a move in fact. Blocking it would have meant the first
consequence of migrating a domain is being queued.

**3. Our own default was polluting the directory.** The first version of the
rules held a submission titled `blyg` as a name collision. Venkat: *"blyg as
name is people setting lazy defaults. We shouldn't use that as the
discriminator. Blyg name collisions are okay if different domains. There can be
2 'Joe's blyg' sites."*

Both halves right, and the second half is ours: `getSettings` returned the
literal `"blyg"` when no title was set, so every operator who skipped one
settings field published under the same name. Two unrelated live nodes were
doing it. The directory was being asked to disambiguate deployments by a name
none of their operators had chosen — our defect, surfacing as a stranger's
queue entry. The default is now derived from the deployment's own host
(`blyg.example.com` → `example.com`), `npm run init` writes `site_url` while it
has the domain in hand, and blygger.org carries an advisory for other client
authors. **The general form is the keeper:** a default identical across
installations destroys information, and the deployment usually already knows a
truer answer.

**4. Two hand-kept pointers, one bug.** blygger.org's nav linked `/spec/0.2/`
— a hardcoded literal, pointing at a superseded document for as long as 0.3 had
existed, on the front door of the site. And the ecosystem card printed
`projects.toml`'s literal version directly above an alert naming a different
one as current, because session 28 fixed the alert and not the card. Both now
derive. `deploy.sh` re-runs the census too, which is the structural half: that
page is generated *and committed*, so fixing its generator does not fix it —
and it had gone stale twice in one day.

**5. The version story disagreed with itself.** `npm run upgrade` merged
`upstream/main` while the studio's update alert compared against the releases
feed, so an operator could upgrade onto unreleased commits and still be told
they were current — and `CLIENT.version` on `main` between releases is the
*previous* release's number, so "what am I running" had no meaningful answer.
`upgrade` tracks `v*` tags now.

**State after**

- **blygger-studio 0.8.3** released, live on both nodes. 755 tests, `tsc` clean.
- **blygger.com**: listing is automatic, queue is **empty** (0 pending of 23),
  feed rows carry real names, and a recheck endpoint re-applies the rules to the
  queue whenever they change.
- **blygger.org**: nav derives the spec link, the latest spec page carries a
  living-text pointer to the canonical markdown on `main`, the census is
  self-consistent and refreshed on every deploy, and `/start/` carries the
  default-title advisory.

**Open threads**

- **Warnings have no feedback loop.** A listing warns, the operator sees it once
  at submission, and nothing ever tells them again — so a stale manifest or a
  plaintext link gets published and stays. Recorded as a TODO in
  `blygger-com/CLAUDE.md` with the four decisions it needs and the order: does a
  listing show its warnings publicly (decide first — it changes what the rest is
  for), re-check on a schedule, use the contact channel, and a per-listing page
  to send someone to.
- **`src/review.ts` briefly contained literal NUL and 0x1F bytes**, because
  `\0`-style escapes were written as the characters they denote. The regex
  behaved identically, `tsc` was happy, and no test could have caught it — but
  git and grep treated the file as binary, so a search for a string in it
  returned nothing. Worth remembering as a class: an invisible character in
  source is unreviewable in a diff.
- Three studio releases in one day (0.8.1, 0.8.2, 0.8.3) means operators saw
  three alerts. Releases are cheap here — no build artifact, the client ships as
  source — but the alert cadence is a real cost and nobody has decided what it
  should be.

## Session 29 (continued) — 2026-09-29 — Partial transclusion built and exercised; **gate G7 is open**

**Model:** Opus 5 · **Committed:** yes (studio) · **Deployed:** blygger-studio 0.8.1 to both nodes · **Released:** v0.8.1

**What & why**

`v0.4-plan.md` §7.3, tasks P1–P9 — decision #49, spec §16.4. The third
register of borrowing: quote a passage, where before you could only transclude
an item whole or fork from a pin. Built, released as 0.8.1 (a 0.3 revision, no
version bump, no migration), and exercised across both live nodes.

**The two things that carry the design.**

*Adjacency is the grammar.* A directive immediately followed, with no blank
line, by a run of `>` lines is a partial transclusion. A blank line detaches.
That is why there is no new sigil: transcluding an item whole and then quoting
a bit of it yourself has been writable since 0.1, and no existing draft may
change meaning. The lookahead happens **before** resolution, so a directive
whose target does not exist still consumes its quote rather than leaving it to
render as the author's own quotation.

*The normalizer is the whole faithfulness guarantee, so it is one function.*
`selectionText` in `markdown.ts`, with a second entry point
`normalizeSelection` for text that is already text (a browser selection). Its
non-obvious rule: whitespace *within* a block collapses, **including the raw
newlines markdown-it leaves inside a `<p>`**. Splitting the HTML on literal
newlines would make a match depend on where the author happened to press
return, which is not a property of the text. Two normalizers differing by one
space would be a construct that verifies on the node that published it and
fails on the node that received it — worse than not having the construct.

**P4 stands as written.** The bake is the selection's plain text in `<p>`s, not
a carved sub-range of the source's inline HTML. No reason emerged to reverse
it: the selection is defined on text, and cutting an HTML range faithfully
(reopening the tags a cut crosses) is a second project. Emphasis in the source
does not survive into the quote; that is the visible cost and the right one.

**The defect the suite could not see.** Exercised against a real imported item
on a local server, the published page rendered the passage with **no provenance
line at all**. `injectProvenance` tested the class attribute as a literal
string, `class="blyg-transclusion"`, and a partial's is `class="blyg-transclusion
blyg-partial"`. The missing line was the visible half. The dangerous half: an
unrecognised quote does not advance the provenance index, so a thread mixing
both forms mis-pairs every line after the first partial — **attributing one
origin's words to another's blyg**. Precisely the failure the depth-awareness in
that same function was written to prevent, reached from the other direction.
Fixed as a class-token match, pinned by a mixed-thread test. Third session
running in which every defect the suite missed was found by opening the page.

**A partial now says "excerpt of v1"** where a whole one says "snapshot of v1".
§16.4 puts the disclosure on the second class; this is its human half. Without
it an excerpt and a whole transclusion are the same blockquote to a reader,
differing only in being shorter — indistinguishable from the source being short.

**P9 — the cross-node exercise. All four parts pass.**

PI item `0180khm1xmrgpsqqe65v51bp4w` (thread, v1), a stub of venkateshrao
thread `54pwr12zqvvaj37zqx0f8vdbhk` v1, quoting one paragraph of it. Left up,
labelled as a conformance exercise.

- **(a)** PI's document carries `selector` — `exact`, plus `prefix`
  `"ay want to use aneesh's client. "` and `suffix` `"\nNew version of
  blygger-desktop "` (the `\n` is a block boundary, which is the normalizer
  working) — beside the `cited` entry from #30, and the bake carries
  `blyg-transclusion blyg-partial`.
- **(b)** venkateshrao's mentions view shows it **verified as `stub`**.
  `relationTo` never looked at `selector`, which is the point: §16.4 keeps it
  out of §15.4 so delivery never depends on the receiver's current text.
- **(c)** after a resync, venkateshrao's reading view renders the partial with
  both classes and all three `data-blyg-*` attributes intact through
  `sanitizeHtml`.
- **(d)** a deliberately wrong passage is refused — `400 {"error":"that passage
  is not in the version we hold of this item"}` — at *selection* time, before a
  draft exists.

And on PI's public page the provenance line reads `from Venkatesh Rao's Blyg ↗
· excerpt of v1`.

**State after**

- **blygger-studio 0.8.1 released and live on both nodes.** 733 tests, `tsc`
  clean. `PROTOCOL_VERSION` stays `"0.3"` — this implements 0.3, additively.
- **Gate G7 is open.** §7.3 P1–P7 and P9 are done; P8 — promoting §16.4's
  partial half into §10.1–§10.3 as a 0.3 revision, and the `css-contract.md`
  line for `blyg-partial` — is the Fable session's, and the build's P4 call
  (plain text, not inline HTML) is the rule to record with it.
- §7.2 (remote generation sources, R1–R8, the construct that opens the 0.4
  document and gate G8) is untouched and is the next build. §7.4 says this
  order deliberately.

**Open threads**

- **The wrong-quote error arrives at two different layers**, and only one of
  them has been seen by a human: `/api/stubs` refuses a bad selection with a
  sentence, and publish refuses one with `quoted passage not found in the
  target's version N`. The second is reachable by hand-editing the markdown
  after the prefill, and the editor renders it in the preview — but no live
  author has hit it, so its wording is untested against confusion.
- **`selector` is written but never read.** §16.4 says a reader MAY re-check
  the passage while the origin serves that version. Nothing does, and the
  read-side re-check is the natural next studio surface — it is why
  `selectionText` is exported rather than private.
- The static-export-vs-served-routes check in §7.4's definition of done has not
  been run for this release.

## Session 29 — 2026-09-29 — The pre-release queue, and 0.8.0

**Model:** Opus 5 · **Time:** ~07:54– PT · **Committed:** yes (studio, spec, org) · **Deployed:** blygger-studio 0.8.0 to both nodes (migration 0012 applied first); blygger.org rebuilt

**What & why**

The three items Venkat queued at the end of session 28 as the gate on the next
release — social cards, a proper top menu, a mobile pass — and then the
release itself.

**1. The social-card item was already built.** `PageMeta` has driven
`description`, `og:*` and `twitter:card` on every public page since `f4ac2c9`
(2026-09-13, shipped in 0.4.1), with `og:image` as the item's first attached
image falling back to the avatar. The queue entry was written from memory of
wanting it rather than from the code, which is the failure mode the standing
note about stale status notes describes; the check took one grep. What was
left were three real gaps, and the important one is the gap *the entry itself
predicted*: it said "`og:title` must be **derived** the way `<title>` already
is". That derivation was a 70-character excerpt of the rendered item, which
was right when nothing declared a title and became wrong the moment #46 made a
leading heading an item's title. A titled item unfurled as "On Protocols
Protocols are the thin layer…" — the heading, then the heading again as the
first words of the body. `itemHead()` now reads the declared heading and takes
the description from what follows it. The other two gaps: the pinned page and
the archive emitted no `og:image` (the pinned page now uses the blyg's avatar,
never the item's *current* attachments, because its whole promise is the bytes
from when it froze).

**2. A fourth naming surface.** Opening the archive at phone width showed the
same title-into-body defect in the **visible rows**, not just the head. #46's
"three surfaces now agree" (feed page, permalink, studio reader) had missed
the archive listing, which is the fourth place the client names an item. Same
helper, same fix. Worth recording as a class: every time a derivation gets a
special case, the question is how many surfaces run it, and the answer has now
been wrong twice.

**3. The nav became a menu, and the menu earned a marker.** Sections are a
list of real targets with a filled current tab; utilities are their own group.
Below 640px the bar collapses behind a hamburger — which is why this had to
come before the mobile pass rather than with it: a hamburger needs something
structured to collapse.

The part worth keeping is **why the collapse is gated on `html.js`, and why
the marker is in the `<head>`**. A stylesheet that hides navigation is only
safe if something can bring it back, so every hiding rule is qualified by a
class that only a scripted browser sets; with scripting off you get the full
row instead of a button that does nothing. And the marker goes in the head
rather than beside the menu because a marker set later means a phone paints an
expanded menu and then snaps it shut. The same pattern now gates the reading
sidebar. `test/top-menu.test.ts` pins the three-way wire rather than the
appearance: the button's `aria-controls` must name an element on the same
page, the script must move the class the stylesheet reveals on, and every
hiding rule must carry the marker.

**4. The mobile pass, done by opening the pages.** Every studio and public
page at 390px. Three real problems, and none of them was layout: horizontal
overflow (one pasted URL is an unbroken token, and one anywhere sets the
page's minimum width, so *every* page scrolls sideways — on a phone that also
breaks vertical scrolling near the edges), tap targets (studio action rows at
~26px, the public pages' version arrows at ~18px), and page gutters. There is
deliberately no separate mobile layout: every studio page is already a single
column, so the desktop structure survives the squeeze, and the two exceptions
(the editor split, the reading sidebar) keep their own breakpoints where they
are defined.

**Method note, since session 28 ended on exactly this point:** the browser
window would not resize below the OS minimum, so the phone-width check ran in
a 390px-wide iframe injected into a same-origin page — media queries evaluate
against the iframe's viewport, so that is a real narrow-viewport render rather
than a scaled screenshot. It found the archive defect that 677 green tests did
not.

**5. 0.8.0 cut.** `CLIENT.version` to 0.8.0 with a changelog entry covering
everything since the 0.7.0 tag. The release **carries migration 0012**, so
that is the changelog's first line — an operator deciding how careful an
upgrade has to be reads that before anything else — and the entry explains why
the backfill is conservative rather than just stating that it is.

**State after**

- **blygger-studio 0.8.0 is released.** Tagged, pushed, published as a GitHub
  release (which is what the update-check's feed reads), and live on both of
  Venkat's nodes — migration 0012 applied to each database *before* the deploy,
  since the column is additive and the old code ignores it. Both manifests
  report `blygger-studio/0.8.0`.
- 677 tests (was 652), `tsc` clean with `noUnusedLocals`.
- Nothing this session touched the wire. `PROTOCOL_VERSION` unchanged.
- The studio backlog's "Queued for the next version" block is fully checked
  off; the 0.4 construct work (`v0.4-plan.md` §7, partial transclusion first)
  is untouched and still the next build.

**Open threads**

- **blygger.org was advertising 0.4.0 as the current client** — found while
  checking what the release touched. `fc96c54` (session 28) fixed the *code*
  that had been hand-keeping the version, but `content/ecosystem/index.md` is
  generated and committed and was never regenerated, so the public directory
  kept telling five live nodes to install a build that was by then four
  releases old. Re-run and redeployed. **The general lesson is worth more than
  the fix:** a generated-and-committed artifact whose generator has been
  corrected is not corrected until it is re-run, and nothing in the release
  path re-runs this one. Same shape as the stale-status-note problem, one level
  down.
- **The client card on that page shows an observed generator, not the current
  one** (`blygger-studio/0.7.0` sitting directly above "rather than
  `blygger-studio/0.8.0`"), which reads as a contradiction. Not touched —
  it is blygger-org's presentation and worth a decision rather than a patch.
- **The backtick-in-a-template-literal hazard fired again**, once, in a CSS
  comment inside `STUDIO_STYLE` — the fourth occurrence across two sessions,
  and `tsc` caught it only because the wreckage happened to be a syntax error.
  The stack conventions warn about this for *scripts*; the stylesheets are the
  same literal and the note still does not say so.
- **`og:image:alt` is deliberately not emitted.** The honest alt text for an
  item's first attached image is not derivable, and a neutral placeholder
  would describe the wrong thing.
- Session 28's open threads are all still open — the eight Fable questions,
  the reader's missing `stub_of`, `init` unexercised against a real domain.

## Session 28 (parallel, Opus) — 2026-09-28 — Packaging, the two-pane reader, and eight questions back for Fable

**Model:** Opus 5 · **Time:** ~14:30– PT · **Committed:** yes (studio, org) · **Deployed:** blygger-studio 0.7.0 to both nodes; blygger.org twice

**What & why**

The half of the program that does not set semantics, running beside the Fable
round above. Still in progress; this entry exists now because it carries
questions the live Fable session can answer today.

**1. The client became a generic artifact.** Committed `wrangler.jsonc` named
two Cloudflare accounts, three D1 databases, bucket names, worker names, zone
names with route patterns, and — worst of the set — a comment describing the PI
org's live production API surface. A template copy would have carried all of
it. None of it is a credential and all of it is already in two public git
histories, so this removes nothing from the world; what it does is make the
artifact honest. Ours moved to gitignored `wrangler.private.jsonc` and
`deploy-targets.json`; `deploy-all.ts` prefers the private config when it
exists, which is the same rule that makes a self-hoster's own config work with
no flag. The manifest test split into an always-on half asserting the packaging
property and a live half that still cross-checks our real targets.

That conditional was wrong on the first attempt in the exact way the file
exists to prevent: `existsSync` returns **false** inside the Workers test pool
even for a file that is plainly there, so `describe.runIf` skipped the
incident-guarding half silently while the suite went green. `import.meta.glob`
fixed it. Worth remembering — `node:fs` is sandboxed in that pool and gives no
hint.

**2. `npm run init` and `npm run upgrade`** — the self-host plan's two unbuilt
halves. `init` picks the account explicitly even when there is one, provisions
idempotently, and never sees the owner password; COOKIE_SECRET is generated and
piped on stdin rather than asked for. `upgrade` shows what is coming, calls out
changed `migrations/`, keeps the user's `wrangler.jsonc` on conflict, and gates
on tsc + suite before offering to deploy. Not yet exercised end to end against a
real domain — that needs a throwaway zone and is Venkat's to run.

**3. Reader work.** Entries now show the item's address rather than an "open"
label (several origins stubbing one item were indistinguishable — the body is
what they share and the origin is what they do not); a two-pane layout with a
source sidebar, per-source filtering and "Add feed" at the top; and the
subscriptions tab left the nav while its page stayed, because it owns pause,
resume, resync, delete and blogroll membership.

**4. Update alerts, on by default** (§Studio only, no wire surface — #18d and
the session-26 directory-side ruling are both untouched). Drift is a semver
comparison of `CLIENT.version` against the public releases feed; nothing about
the deployment is sent. Default-on was Venkat's call, paid for with a notice
the operator can dismiss and a settings toggle. The census on blygger.org was
itself three releases stale — it read a hand-kept literal — and now derives the
version from the client's `package.json` and its aliases from that repo's tags.

**5. A titled thread now gets a linked title on the feed page** (#46's "studio
task"), which fragments already had. Presentation only; tests hold the wire
line.

**6. Five studio changes after the 0.7.0 tag**, all cosmetic or studio-local,
none touching the wire. A titled thread gets a linked title on the feed page
and in the reader — two surfaces that had each arrived at their own behaviour
separately, now three that agree (#46 calls this "a studio task" explicitly).
The entry actions split into composition (`stub`, `fork`, the new `link post`)
and not (`copy [[id]]`, `copy url`, the URL) — which is what resolved the #50
placement question: the copy control is back beside a permalink, where #50 put
it, and there is now literally a permalink beside it.

A **global default for showing responses**, overridable per item. The old
column was two-valued, so "off" and "no opinion" were the same row and a
default could never take effect; migration 0012 adds a nullable override. The
backfill was the careful part — an upgrade that newly exposed other people's
responses on someone's pages would be a bad day — so explicit opt-ins become
hard overrides and everything else inherits a default that is off, reproducing
today's behaviour exactly. Verified against a real database.

And a **timezone setting**, which closes a standing complaint: a Worker's clock
is UTC, so an evening post could show tomorrow's date. The picker is filled by
the browser rather than the server. `formatDateIn(iso, timeZone)` takes the
zone as a *required* parameter, which turned "find every date" into a compiler
task — it found 28 call sites across six files. The wire is unchanged and
tested: feed dates RFC-822 in GMT, item documents ISO-8601 UTC.

**State after**

- **blygger-studio 0.7.0** tagged, released, and live on both nodes.
- Everything after that tag is committed, pushed and **unreleased**: the
  two-pane reader, `link post`, thread and reader titles, the responses
  default, the timezone setting. 652 tests, `tsc` clean with `noUnusedLocals`
  on since this session. **The next release is cut tomorrow**, after three
  queued items recorded in the studio backlog: social cards, a proper top menu,
  and a mobile pass.
- `blygger.org/start/` rewritten: the real install path, and a "Which text to
  build against" section for client authors.
- Two documents written by an Opus subagent under the brief's item-9 ownership
  exception, **committed in 92a6e7c** — that commit's own message says they were
  left uncommitted, which is wrong: a `git add -A` swept them in alongside this
  entry. They have had no review pass beyond the subagent's own, so read them as
  a first draft rather than as settled text:
  `docs/notes/tn-3-groups-and-aggregation.md` and
  `docs/proposals/identity-practice-proposal.md`.

**Open threads — for the Fable session**

Writing tn-3 and the identity proposal surfaced eight questions. The first
three block: #35's own promotion gate is "one client emits a proof and a second
verifies it", and that gate is currently unreachable.

1. **#35's signature member has no name, format, or key-discovery story.** It
   says the signature is carried "in a conventional `author` member" but names
   no member, no signature encoding, no key encoding, and no way for a verifier
   to find the key. Two clients cannot interoperate on a convention with no
   spelling. Either name the member and encodings, or rule that the first
   implementer names it and the note records what they chose. Deliberately not
   invented by the writer — that would be designing, not writing up.
2. **#35 does not say which claim the signature makes, and the reader rules
   change with the answer.** A signature over `content_hash` alone is
   replayable: any origin can copy Alice's hash and signature into its own item
   and show a verified byline for text she wrote elsewhere. As *text
   authorship* that is correct; as *authorisation to publish at this origin* it
   is insufficient, and the signed payload would need the origin, probably id
   and version. Written as text-authorship, but the choice reads as unruled.
   Interacts with the cross-origin merge ban (§5.5).
3. **`rel="me"` collides with mount independence.** The strict form matches the
   `rel="me"` href against §12.2's identity origin, which for a path-mounted
   blyg is `example.com/blyg/` — and no real profile page links there; they
   link to `example.com`. That makes the reciprocal-link proof unusable for
   exactly the deployments #14 exists to support, and one of the three live
   third-party nodes is path-mounted. Alternatives are a same-registrable-domain
   match (weaker, and that distinction is already a known subtlety in the
   Webmention hardening) or accepting a link to the manifest's `site`. Not
   softened unilaterally.
4. **`operator` as a literal member name** (#38 via #35). Written as a literal
   member inside `author`, sitting in §5.5's private-grammar extension point so
   it breaks nothing — but it is the one concrete spelling put on a
   wire-adjacent surface, and two clients need the same one. Confirm or rename.
5. **#36's "who can withdraw" test does not cover the exit.** In shape A on a
   house-owned domain, a departing member cannot take their items (ids are
   origin-scoped) and the house is left holding irrevocable pin promises (#8)
   for someone else's work it can never stop serving. The consequence is stated
   in tn-3; the sentence "a house origin's pins outlive the membership" exists
   nowhere yet.
6. **The house blyg that stubs most of its members** sits on an unruled
   spectrum. #36 draws the line at content-free and #38 confirms a real
   respondent is legitimate however many stubs that is, but an editor who
   answers nearly every member item in one line is the hard case, and "brief"
   versus "empty" has no stated handle. May need no rule.
7. **Can a house that is only an index publish a blogroll?** §11 defines
   `blogroll.opml` as origin-relative under a blyg surface, advertised by a
   manifest key. A house origin with no items and no feed is not a blyg and has
   no `blyg.json` to advertise from, leaving the file discoverable only by
   conventional path or an HTML `rel`. #51 makes the manifest the thing that
   locates the surface, which sharpens this rather than settling it.
8. Verified, not a question: #36's spec changes are already in the published
   0.3 text (§10.6's warning paragraph, §13.5's aggregator bullet), so tn-3
   documents shipped text and implies no 0.3 edit.

**Open threads — studio**

- **Decision #50, one narrow adjacency.** The `copy [[id]]` control is back
  beside the permalink where #50 put it, and a second copy-permalink now sits
  beside it, so that condition is met exactly. But a new `link post` control —
  which starts a fragment containing `[[id]]`, an output #50 blesses in as many
  words ("a quiet response by fragment-plus-link is #32 working as intended") —
  does sit beside `stub ↗`, and #50's "not a peer of `stub ↗`" was written about
  the copy control. The capability is sanctioned; the adjacency is unruled.
  Confirm or rename.
- **The reader still cannot say "this responds to X".** `imported_items` stores
  `transclusions_json` but no `stub_of` — the importer discards it — so a
  restub chain renders as a wall of similar bodies. This is the real half of
  Venkat's "reader doesn't roll up" complaint; the other half was source
  ambiguity and is fixed. Needs schema + importer + render together.
- `init` has not been run end to end against a real domain.
- **Three backticks-in-a-template-literal mistakes in one session**, twice in a
  CSS comment and once in an inline script, each terminating the literal that
  held it. `tsc` caught all three only because the wreckage happened to be a
  syntax error rather than valid JavaScript — which is the session-19 hazard
  exactly, and the stack conventions warn about it for *scripts*. The
  stylesheet is the same hazard and the note does not mention it.
- Not a rule anyone set, but worth recording: every defect this session that
  the suite missed was found by opening the page. The elided-URL bug, the
  stale census version, and the reader's missing title all passed their tests.

## Session 28 — 2026-09-28 — 0.3 frozen and published; 0.4 defined

**Model:** Fable 5.1 · **Time:** ~14:33–16:05 PT · **Committed:** yes (blygger-spec, blygger-org, blygger-studio) · **Deployed:** blygger.org ×6 (0.3 published, snapshot, four §16 revisions)

**What & why**

Venkat opened with two instructions: freeze 0.3, since its gates had passed, and begin
specifying 0.4. Then, once the rulings were on the table, a third: record them and hand
the unblocked implementation queue to a parallel Opus session while the 0.4 discussion
continues here.

**1. The freeze was textual, and the list from session 27 was exact.** G1 and G2 were
true with live evidence, so `cited` moved from §16.1 into §5.9, `[[id]]` from §16.2 into
§10.1 — *replacing* the sentence that called it undefined, as the carry-over insisted —
and `generator_url` from §16.6a into §6.1 with §3.2 extended to cover it. Two sentences
that were false as written were corrected: §15.3's per-host rate limit is no longer
called sufficient on its own (the session-27 hardening had proved it was not; the text
now recommends the per-source, per-source-group, global shape without fixing numbers),
and §15.4 now says in so many words that verification ignores `cited`. §10.3 and §15.4
say a link produces no provenance and no relation. The promoted §16 subsections keep
their numbers as one-paragraph pointers, because third parties may already cite §16.1 —
the living document's numbers are part of its contract even when its text moves. One
wording choice worth recording: `cited` is "frozen at the moment the reference was
made", spelled out as publish time for a transclusion (republish re-resolves) and
creation time for `stub_of` and `forked_from`, which is exactly what the client does,
rather than a MUST NOT about later rewrites that no client has been tested against.

**2. Published, with the sequencing session 27 asked for.** The promotions landed in the
living text *before* the first snapshot, so the snapshot does not freeze §16 calling
three built constructs unbuilt. `sync_spec.py` registers 0.3 as living and flips 0.2 to
`("SUPERSEDED", "0.3")`; `/spec/0.2/` carries the forward banner live; the snapshot is
`/spec/0.3/2026-09-28/` paired with tag `spec/0.3/2026-09-28`. Two small lies on the
site went with it: the index's reference-implementation line claimed no release had
ever been tagged (it was looking for `ref-v*` tags in the spec repo; the client has had
its own repo and tagged releases for a day) and now points at blygger-studio's
releases; `/start/` linked `/spec/0.2/` and now links 0.3 with the #42 sentence. Track
4.4 was listed as Opus work; doing it here cost twenty minutes and avoided a second
handoff.

**3. The 0.4 definition turned on one rule that had never been written down (#43).**
The freeze made a question concrete: with pre-1.0 versions all drafts (#21) and the
living document receiving revisions (#23), what distinguishes a *revision* from the
start of the *next version*? The answer is a test — a revision adds what a conformant
reader already ignores safely without changing the meaning of what it displays; a new
version is needed when a reader or receiver must change what it *does*. Everything
promoted today was a revision by that test. A new mention relation, a quotation
selector, or a title field would not be. The rule also settles when the 0.4 document
opens: at the first built-and-exercised construct of the second kind, not before,
because two living drafts is one too many.

**4. Remote generation sources (#44): a source, not a quotation — and it notifies.**
The question posed in session 26 was disclosure. #20's line is about the authorial act
and does not move when the words come from another origin; a blockquote around
non-verbatim prose would be false. The tempting analogy was `[[id]]`'s silence, and it
cuts the other way: #32 kept links silent because a link carries none of the target's
words, and notification in this protocol tracks exactly that. A generation source
carries the target's words, transformed. Silence would make paraphrase-by-model the one
way to use a stranger's words without telling them. So: the §5.9 reference shape with
`origin` (and `cited`), resolution by #26's order (sources widen to any item a directive
may name, threads included, local snapshot only), direct-only disclosure as for
nesting, and a fourth mention relation `source`. The cost — an agent drawing on thirty
items sends thirty mentions — is accepted under #36's actual line, which is about
content-free stubbing. This is the one sanctioned inversion of #21: the wire could not
say this, so the shape had to come before the build; it becomes normative only after a
cross-node exercise, and that exercise opens the 0.4 document.

**5. Three closures that needed no construct.** Transitive staleness does not exist
(#45): if A baked B and B's source C moved without B republishing, A holds B's unchanged
bytes and republishing A re-bakes B's *current* version, still with the old C — A can do
nothing, only B can, and B sees C directly; every edge is its publisher's, so graph
freshness is the direct check at each origin. Titles stay off the wire (#46): the
RECOMMENDED feed derivation already begins with a leading heading, the "linked title"
wish is the reference client rendering its own pages, and the reader-side rule against
extracting titles stands because a reader inventing structure is the failure it
prevents. The two parked candidates were decided against (#47): pinned-content feed
entries help only a plain RSS reader nobody has spoken for, and a per-item responses
surface is a follower list by another name. The conformance partition (#48) is short:
MUST fails, SHOULD warns, MAY shape-checked when present; two suites because invariant 1
splits publisher from reader.

**6. Partial quotation is deliberately not ruled.** The brief said not to design it
without an authoring case, and none is on the table; the question is in
`v0.4-plan.md` §3. What is recorded ahead of the answer: the "new faithfulness
guarantee" framing is half right (whole-item transclusion is verifiable only while the
origin serves the version; a partial quote adds a substring test, and the genuinely new
problem is elision, which no protocol fixes), the lean is a W3C text-quote selector,
and character ranges are rejected in advance.

**7. The handoff.** `docs/opus-brief.md` is new — the Opus mirror of `fable-brief.md`,
wired into session-start step 4 — with an ordered eleven-item queue and the file
ownership rules that let two sessions edit one program at once (Opus owns the three
code repos and writes exactly two things into `blygger-spec`: its own devlog entry and
its own ticks). The remote-sources build task is in the studio backlog with its fixed
shape.

**8. Partial quotation, ruled once the case was on the table (#49) — and the rule from
§3 gave an answer I did not expect.** Venkat's case is the blogging norm: link an item
and quote a suitable block as the inspiration, with extensive quotation being commentary
or fork territory. That makes three registers of borrowing, two of which the protocol
had, so the missing rung reuses the whole form with a selector rather than adding a
construct: a directive immediately followed by a markdown blockquote, whose text must be
a substring of the target snapshot's text content at publish; a W3C text-quote
`selector` on the `transclusions[]` entry that verification ignores; a `blyg-partial`
class beside `blyg-transclusion`; no cap; `transclusion` relation and the same staleness
check. Plain-web `{url}` targets get an ordinary blockquote and nothing else, because
there is no versioned document to check against. The surprise: an hour earlier I had
named "a selector a reader must honour" as the paradigm of a new-version construct, and
by #43's own test it is a *revision* — readers never resolve, they display baked HTML,
and one that ignores `selector` changes nothing it does. So 0.4 opens on remote
generation sources alone, and partial transclusion ships into the living text as soon
as it is built. Recorded as a correction to #43's example, because a rule that only
confirms expectations is not doing any work.

**9. Raised from the parallel Opus session (#50): does a reader "link this" button
recreate the sibling #27 retired?** No. #27 forbade a *response* affordance that does
not declare itself; #32 made `[[id]]` declare nothing, so a link button is a different
act, citing without responding, and refusing it would leave a grammar construct
unreachable from where authors meet items. The condition is about shape, since shape is
semantics to a user: named for what it does, beside copy-permalink, never a peer of
`stub ↗`, never called respond. Answered within the hour, which is what the parallel
arrangement is for.

**10. A backlog, and the first public proposal adopted (#51).** Venkat asked where
unscheduled ideas such as encryption live; the answer was three places that had drifted
apart, so `docs/backlog.md` now consolidates them with what would schedule each, and the
ritual files ideas there. He also asked about the open issue on the repo:
blygger-spec#2, by cyberscribe, proposing that the manifest locate the rest of the
surface so WordPress and managed hosts can publish natively. The case is stronger than
the issue states — extension-based static handling intercepts `.json` before any CMS
routes it, so the largest CMS on the web could not conform. What #14's fixed-filename
rule actually protects is finding the manifest from a bare origin, which covers
`blyg.json` only; the ban on trusting `feed`/`items` values never did work. Adopted in a
reshaped form: authoritative `feed`/`items`, `item`/`pin` URI templates with today's
paths as defaults, discovery through the *existing* `rel="blyg"` link (fetch it; a
manifest is a manifest, else append the filename) rather than a new rel and media type,
identity as the manifest URL minus its last segment, `page` allowed absolute. A 0.4
construct by #43, because a reader that ignores the keys 404s. The gate is the right
kind: a client we did not write publishing through templates, and ours reading it. The
README's dead workers.dev links (issue #3) were fixed in passing.

**State after**

- `protocol-v0.3.md`: published living text, four revisions today, snapshot
  `2026-09-28` (the morning's state; the §16 revision is not snapshotted). `cited`,
  `[[id]]`, `generator_url` normative. §16 now carries: `changelog[].generated` (ruled,
  unbuilt), the write surface (never normative), remote generation sources (0.4, ruled
  in full), partial transclusion (ruled, a 0.3 revision once built), and the closures.
- `blygger.org/spec/`: 0.3 living, 0.2 and 0.1 superseded with banners, 0.3 snapshot
  listed. `/start/` links 0.3.
- Decisions #43–#51; `v0.4-plan.md` (with §7 implementation plan); `backlog.md`; `opus-brief.md`; roadmap-tracks 1.1, 1.3, 4.4 done
  or defined, 1.4's Fable half ruled; `roadmap.md` v0.4 re-scoped.
- Gates: G1 ✅ G2 ✅ G4 ✅. `fable-brief.md` rewritten as a gate table: G3, G5, G6
  carried; **G7** partial transclusion (promote into 0.3), **G8** remote generation
  sources (open `protocol-v0.4.md`), **G9** a templated third-party blyg (promote §16.6e).
- `v0.4-plan.md` §7: implementation plan (R1–R8, P1–P9, M1–M4) written against
  blygger-studio `f28c054`; no migrations for the first two, one for the third.
- `docs/backlog.md` and `docs/opus-brief.md` exist; the ritual and doc map know them.
- Parallel Opus session, same afternoon: shipped the `[[` picker in all three composers,
  the reader-side copy-`[[id]]` (#50, built within the hour of the ruling), a
  draft-kind switch, and four usability fixes — see its own entry above when it lands.
- One mislabeled commit in this repo (`7fc1e9c`, message says "Backlog", contains the
  #49/#50 decision entries) from a shell whose working directory reset between calls;
  corrected in the next commit's message. Absolute paths thereafter.

**Open threads**

- **Partial transclusion** (#49) enters §10 as a 0.3 revision when built and exercised (G7).
- **Issue #2 reply drafted, not posted** — Venkat's voice on the public repo; **issue #3
  fixed, not closed.** Both in the carry-overs.
- **The 0.4 document opens at G8**, and §16.6e (#51) becomes normative only at G9, which
  depends on a client we do not write.
- **The 0.4 document is not drafted, by rule** (#43); it opens when remote generation
  sources are built and exercised across both nodes.
- `changelog[].generated` enters §5.2 as a 0.3 revision when 2.12 ships (gate G6).
- **Session 24 still has no devlog entry** (unchanged since session 25).

## Session 27 (parallel, Opus) — 2026-09-28 — The endpoint hardened, a release channel invented, and the three constructs 0.3 was waiting on
**Model:** Opus 5 · **Time:** ~11:26–13:20 PT · **Committed:** yes (3 repos) · **Deployed:** blygger-studio ×4 releases to both nodes, blygger.com (D1 migration + worker)

**What & why**

This ran alongside the Fable round above, on the half of the program that does not
set semantics. Five pieces, in the order they were forced rather than the order
they were planned.

**1. Webmention hardening (2.5), and the propagation question it exposed.** The
three §9.1 gaps closed in `blygger-studio` 0.4.1: a registrable-domain cap
(120/h) *alongside* the per-host 60 rather than replacing it, a global cap of 300
accepted claims/hour, and a 30-day prune of `failed` rows. Two departures from the
session-23 plan are recorded in §9.1: the domain grouping is a curated heuristic
rather than the Public Suffix List (~230KB in a Worker for one rate limit), so it
can over-collect — which is exactly why it is the looser of the two caps — and the
global cap counts *accepted claims*, not "pending verifications" as §9.1 worded
it, because the cost is two fetches per claim and pending rows drain in seconds.

Then Venkat asked the question that reordered the session: **is the distribution
scaffolding in place to propagate this?** It was not, in any form — zero tags,
zero releases, no changelog, no `npm run upgrade`, and `blygger-com`'s submissions
table had no contact column, so the directory could identify every stale node and
reach none of them. Detection without delivery. Worse, the session-26 subtree
split means a node that cloned `blygger-spec` and works in `worker/` cannot
`git pull` to the new repo at all.

**2. So the release channel got invented before the fix shipped.** `CHANGELOG.md`
whose every entry states `Migrations:` explicitly, tags, GitHub releases, and a
README section written for the only node shape that exists in the wild — stood up
by hand off `/start/`, possibly from the pre-split repo. Plus an optional,
never-published operator `contact` on directory submissions (`blygger-com`
migration 0002), write-once so a stranger submitting someone else's blyg cannot
overwrite it. `listApproved` now names its columns and returns a `PublicRow`,
which is the structural version of "never publish this field".

**3. The endpoint became optional in the client (0.5.0), which the spec always
said it was.** Found while drafting the operator notice: §15 is OPTIONAL at every
level and §15.1 advertises an endpoint "only when mentions are accepted", but the
client served it unconditionally — the intent was even in the code, as a
`webmention: false` option no caller ever passed. `accept_mentions` is now a
setting, default on, and off means *withdrawn* rather than guarded: no manifest
key, no page advertisement, 404 on POST. A setting rather than an `Env` var
because a re-clone upgrade ports `wrangler.jsonc` by hand and a D1 row never
enters that path. This does not touch the session-23 ruling, which is about which
origins an endpoint accepts, not whether to run one.

**4. The three §16 constructs (0.6.0), which is what the freeze was waiting on.**
`cited` on `stub_of`, remote `transclusions[]` and `forked_from`, live and pinned;
`[[id]]` as a plain internal link; `generator_url`; `level` 1 → 2. Design notes
worth keeping: `cited` is stored where each reference already keeps its cite
(inside the entry for transclusions, in the 0008/0010 columns for the other two),
so the wire object *is* the stored object and a published citation cannot drift
from its document. Thirteen wire-shape assertions moved from `toEqual` to
`toMatchObject` — the honest edit, since those lines are about identity. The
stale-byline bug died with it: provenance had been rendered from a live
subscription join, so a rename rewrote what a published document said about its
source. `[[id]]`'s grammar sits beside the directive regexes because a negative
lookbehind is all that separates them, hrefs are absolute because `content_html`
travels to subscribers, and anchor text is a short quote of the target since items
are titleless.

**5. The gates, exercised live rather than in the suite.** Venkat's instruction
was to test over the API and pass what could be passed. PI published
`/t/4egjmrk5mmcvn15b92hnfgnksw/` — a remote transclusion carrying `cited`, plus an
inline `[[id]]` — and `venkateshrao.com` imported it with the `cited` object kept
byte-for-byte and the anchor intact. A second PI item stubs across origins, and
its Webmention landed on the other node as `verified`/`stub`, which tests in
production the rule most worth testing there: verification reads the bare
reference and ignores the citation. **G1 and G2 are true**, with the ids recorded
in the brief's gate table.

**6. And one freeze blocker found by reading the draft rather than the gate
table.** §15.2 said "the reference client records the target version per outbound
reference for this purpose" — it did not, so every republish reset every outbound
row to pending and re-notified every origin a thread quoted. The choice was to
weaken the sentence or make it true; 0.6.1 makes it true (migration 0011), with
withdrawal as the only caller allowed to force a re-send, because §15.7 owes a
mention precisely when the target has not changed.

**State after**

- **`blygger-studio` 0.4.1 → 0.6.1**, four tagged releases with notes, 531 tests,
  `tsc` clean. Both nodes deployed and verified at each step: `level: 2`,
  `generator_url`, migration 0011 applied to both databases.
- **blygger.com** carries an optional operator contact; 17 listings intact.
- **Gates:** G1 ✅, G2 ✅ with live evidence. G3–G6 untouched.
- **0.3 is not frozen.** Three promotions are now unlocked (§16.1 → §5.9,
  §16.2 → §10.1, **§16.6a → §6.1**, the last of which is not in the gate table),
  and two sentences in the draft are false as written: §15.3's "enough to keep a
  queue from filling" (disproved by the hardening) and §10.1's "`[[id]]` is not
  defined at 0.3", which the promotion must *replace* rather than append to.
- Notice to the three third-party operators: drafted, and Venkat is sending it.

**Open threads**

- **The `[[` picker does not exist.** Venkat hit this: the palette lives only in
  the thread editor and only triggers on `![[` at line start, while `[[id]]` is
  legal in fragments too. Wants the palette factored out of `threadEditPage` into
  all three composers, with the trigger distinguishing the two forms and the
  insertion matching.
- **Decision #33's staleness probe** needs migration 0011's fact for *imported*
  items; the bulk re-pin UI sits on it. Half the roadmap-1.7 pairing is still open.
- `cited` on `forked_from` is suite-tested but never exercised live; nothing reads
  an imported document's `cited` yet, by design — the second-degree view is its
  only consumer.
- The two exercise items on the PI blyg are public and staying (Venkat: "leave
  them").
- **Session 24 still has no devlog entry** (unchanged since session 25).

## Session 27 — 2026-09-28 — The Fable round: every open protocol question ruled, 0.3 drafted under strict #21

**Model:** Fable 5.1 · **Time:** ~11:02–12:40 PT · **Committed:** yes (blygger-spec, blygger-studio) · **Deployed:** nothing — 0.3 is drafted, not published

**What & why**

Venkat opened on Fable with one instruction — Fable-only work, leave webmention hardening
for the next Opus session — and the session-26 brief set the agenda: three triage
questions that blocked Opus, then the 0.3 freeze. All of it got ruled; the interesting
part is where the rulings came out differently from how the questions were posed.

**1. The write surface (T1 → decision #31): the protocol will never specify one.** The
question arrived as "protocol-normative, companion note, or each client's business?" and
the answer is the second, with the reason being the first invariant read carefully: the
protocol governs the public artifact and the studio is unconstrained *by design* — that
split is also the multi-tenancy escape hatch. A normative write API would make a
folder-on-a-laptop client non-conformant for a reason unrelated to publishing, and that
client is exactly the second implementation the 1.0 bar wants. So the roadmap's open
question "does the write surface belong to 0.4?" is answered no: it belongs to no
version. What Opus needed was narrower than the design and got ruled in full — bearer
tokens with coarse verb scopes, owner-minted and revoked, the password demoted to a root
credential no tool ever holds, revoke-all as the whole revocation story, password reset
leaving tokens standing but forced to offer revoke-all, CORS for token requests, and
endpoint discovery via an HTML `rel` link so the manifest stays clean. 2.9 is unblocked.

**2. `[[id]]` (T2 → decision #32): it exists, and it is silent.** The brief was right that
the decision was disclosure, not syntax. A transclusion is disclosed because it *copies*
the target's words at a version, so there is something for the target to verify; a link
asserts nothing on the target's behalf, so there is nothing. No `transclusions[]` entry,
no fourth relation, no mention. The affordance this preserves — citing without notifying,
in a medium where every other citation form notifies — is necessary rather than
accidental, and the ruling says so, so nobody later "fixes" it.

**3. Staleness (T3 → decision #33): confirmed, and sharper than asked.** Opus had assumed
the simple check needs nothing from the protocol, which is right — every reference
already carries the last version seen, and only the client's outbound-mention table
lacks it, so T3 and 1.7 are one fix. The sharpening: under snapshot independence,
staleness is *direct only*. If A bakes B and B's own source changes, A holds B's bytes at
B's version, unchanged, so A is not stale until B republishes. "Staleness over the DAG"
therefore lacks a definition, not an implementation, and 0.4 may find there is no such
thing. Recorded in the 0.3 text at §10.4 so it is not rediscovered.

**4. The citation's human half (F1 → decision #30): on the wire, additively.** The (a)
reading — the wire should not let a publisher assert a title, author, or excerpt for an
origin that never said them — is already breached by transclusion itself, which bakes
the target's *entire* content into the quoter's document, self-asserted. A label is
strictly weaker than the snapshot §10 already permits, and `author` inside it is #11's
opaque pass-through. The argument that actually decided it: a citation is as-of-retrieval
by nature, so the citing publisher's frozen label is *more* correct than a reader's later
lookup of the live target, not a fallback for when the link dies. `cited` is the client's
existing `StubCite` unchanged — `retrieved` required, the rest optional, the excerpt a
capped caption so it cannot become a second quotation channel — and it goes on all three
references, which also closes the session-23 stale-byline finding.

**5. The sequencing call, which was Venkat's: strict #21.** The brief had framed F1 as
"if additive, the 0.3 document must carry the member or it becomes a 0.4 change." That is
not what #23 says — 0.3 is the *living* document and receives revisions — so the real
choice was whether to write `cited` and `[[id]]` into normative text before any client
emits them. Venkat chose strict #21: the 0.3 draft carries only the built surface, and
the ruled-but-unbuilt constructs sit in its **§16 with their exact shapes**, entering the
normative sections in the revision after blygger-studio ships them. Third-party clients
see the shape immediately; the spec claims nothing untested; Opus builds against a
written target. The cost is a few days of latency and nothing else.

**6. `protocol-v0.3.md`, 1,628 lines.** A standalone superset of the 0.2 text with **0.2's
section numbers preserved** — new material went into §3.2, §5.6, §5.8, §5.9, §10.6, §15
and §16 rather than renumbering, because `css-contract.md`, the plan docs and the
webmention code all cite 0.2 by section. What it adds beyond the four decision records:
a `level`/`generator`-are-informative rule (§3.2, readers MUST NOT gate on either, and
`generator` is asked for in `name/version` form because it is the census); the feed
`<title>` derivation as prose, with items explicitly titleless (§5.3, §7); the reference
shape named once (§5.9) so the four constructs can converge on it; the remote-TK-source
restriction stated rather than implied (§5.7 rule 1) and a new rule 7 forbidding
`generated[]` for text the publisher did not generate; the endcap keeping `page` and
`forked_from` (§9); and a §14 that treats a Webmention endpoint as the fetch-on-demand
surface it is. Three documentation lies from the brief are corrected: the reference
implementation is `blygger/blygger-studio`, and the 0.1/0.2 texts that say `worker/` stay
wrong on purpose because superseded specs take no revisions.

**7. Found while drafting: the live nodes emit `"level": 1` at protocol 0.3.** Read off
`blyg.protocol-institute.org/blyg.json`, not recalled. 0.3's §3 defines L2 as this
specification, so `PROTOCOL_LEVEL` in the studio should be 2 — one line, filed in the
studio backlog. Not a spec matter, since §3.2 forbids readers from caring, but it would
have been embarrassing on a published page.

**8. The brief was rewritten for a round that may be a no-op.** With every open protocol
question ruled and nothing in the Opus queue waiting on Fable, the next Fable session has
work only once four gates open — `cited` built and exercised cross-node, `[[id]]` built,
token auth used by a third-party tool, 0.3 published. The brief says: if none is open,
say so in one line and stop. The 0.4 agenda is, verbatim, `protocol-v0.3.md` §16.

**9. Raised after the round closed — client source discovery (decision #34).** Venkat
asked whether the spec should require a client's origin URL or an "unmaintained"
declaration, since the census could locate source for only two of seven clients. Ruled
as an optional `generator_url` (SHOULD, never MUST) and no maintenance flag at all. The
decisive argument against the flag: the software that would have to say "I am
unmaintained" is by definition the software nobody updates, so that status is the
directory's to observe, not the wire's to assert. Against MUST: it would break five of
seven live clients for a non-publishing reason, readers may not act on it anyway (§3.2),
and it gains nothing over SHOULD because client authors *are* the spec's readers. The
hard requirement belongs to the registry at listing time. Venkat's framing: a nice-to-have
for discovery. Filed in the studio backlog beside the level fix. (An Opus session was
running in parallel on webmention hardening and the client's distribution model; nothing
here touches its files.)

**10. Identity, measured before argued (decision #35).** Venkat wanted technical
recommendations — OAuth, wallets — rather than pure agnosticism. Before answering I read
every live manifest and one item per blyg: all eleven, across all seven clients, emit
exactly `name` and `url` in `author`. Nobody has invented an authorspace grammar. The
roadmap's premise that six implementers were each inventing something was false, and the
thing they converged on unprompted is a URL. So the recommended practice's spine is the
fourth invariant extended to people — a person is a URL they control — with two proofs,
a reciprocal link and a signature over the `content_hash` the protocol already computes.
Every identity provider maps onto those rather than competing with them. #11 stands.
Proposal first, note after a client builds it.

**11. Groups, agents, and the line that turned out to matter (decisions #36, #38).** Two
early-user proposals for multi-author blygs both decomposed into existing constructs:
"separate folders" is N origins under a house blogroll, or one origin with bylines, and
the test between them is *who can withdraw*. "An agent that stubs everything" was
rejected — but the reason clarified itself when Venkat asked about agentic co-authors as
peers. The anti-pattern is content-free stubbing, whoever does it: a stub is a response,
a pipe is not, and an agent that actually answers each item is a critic, not a planet.
From there the protocol turned out to be agent-agnostic at all three levels already —
`generated[]` for spans, opaque `author` for items, the origin for whole blygs — and the
only thing worth writing is the byline convention (name the operator). Maintenance split
on the same line: detection is a cron, but anything that republishes is authorship,
because a snapshot refresh is a version bump, a feed entry, and a mention. One wire fact
fell out that I would not have found without the question: **a re-bake is distinguishable
from an edit** — same `content_hash`, new version — so a client can say "snapshots
refreshed" today and a narrower refresh scope is definable later.

**12. A correction to my own draft (decision #37).** Venkat's actual workflow — generate
elsewhere, paste into the composer — showed that the rule 7 I had written into §5.7 this
morning was wrong. It forbade marking pasted generated text as generated, on the theory
that `generated[]` claims *this studio* ran the model. It does not; the claim is that the
prose is machine-generated, and the wire never carried how it was asked for. A rule that
blocks honest disclosure is the opposite of the construct's purpose. Replaced in place:
imported text is an ordinary entry with `sources: []`, the grammar is studio-private, and
§8b's `impyrt` is closed rather than deferred. Worth recording that a decision made from
the abstract was corrected within hours by one sentence of real usage.

**13. The reference agent (decision #39).** Worth building — not as a bot spec but as a
contract-prover, a deliberately dumb chief-of-staff whose brain is pluggable so that
`mixture-of-vgrs` can be it. The contract is four things the protocol mostly already
has: #31's tokens to write, the public state plane as a ready-made RAG corpus to read,
signals to poll, and `generated[].sources` as the disclosure of what was retrieved. And
the answer to "is a blyg with an agent a two-author blyg by definition" is no: there are
no author folders on the wire, the studio is the shared stage, and a blyg is two-author
only when the agent signs items. The level — ghostwriter, byline, own origin — is an
attribution choice, the same one a human collaborator faces.

**14. Changelog notes (decision #40).** Venkat is lazy about notes and wants them generated
from diffs, richer for pinned versions. The heuristic turned out to be a rule: §5.2 forbids
diffs in the changelog, and a note that quotes withheld prior text is a diff by another
name, so note depth is bounded by what is public — full between pins, descriptive over
unpinned versions. Added to §5.2 as a clarification. The generator is a studio default
with one additive disclosure member (`changelog[].generated`, §16.6c until built), and the
"narrative of how a document changed" needs nothing from the wire: notes are a timeline,
pinned files are the content at each state, and diffs between consecutive pins are local.
Also corrected a mental model: NetNewsWire showing N copies of the *latest* text is §7
working as designed, not a canonical-URL artefact. One idea parked rather than opened:
pinned-event feed entries carrying pinned content, which would leak nothing.

**15. Discovery through stub chains (decision #41).** People are already stubbing stubs
and restubbing back and forth, and the reader shows one level. The answer was mostly "look
in your own database": nesting is nested blockquotes with origins in the baked attributes,
so the latest item of any chain carries every participant, offline. Four surfaces need no
spec change — chain view, the `stub_of` walk to the root, the conversation around you,
second-degree blogrolls — and the one direction that is closed, who responded to something
you read, is closed by #28 on purpose. The addition that would open it is recorded as a
0.4 candidate and not taken. One caution was checked rather than assumed: the importer's
sanitizer is allowlist-by-removal and keeps `data-blyg-*`, so the chain survives import.

**16. Which version to implement (decision #42).** Venkat read the 0.2/0.3 mix in the wild
as people choosing between the site and the unfrozen repo. The census says otherwise:
there was no 0.3 text anywhere until this session — the reference client shipped 0.3 on
2026-09-16 and the spec caught up today — so the 0.3 third parties built from the plan
doc and our code, and the 0.2 ones built from the spec and are conformant. Guidance now
lives in the spec header, the README, the plan doc's banner, and the site index prose:
implement the published living text, pin to a dated snapshot, never the plan docs or the
client. The decision underneath is a process one: #21 keeps prose behind the build, but
the *shape* of anything ruled goes into the living document's §16 at ruling time, so the
spec is the first place a shape is visible. Also corrected a stale note: a 0.2 snapshot
from 2026-09-16 exists; the doc map said none had been cut.

**Technical notes queued for Opus** (roadmap-tracks 1.6): `tn-3` groups and aggregation,
writable now; `tn-2` identity, as a proposal draft first; `tn-4` write surface and `tn-5`
agent contract, after their builds; `tn-6` version histories after the note generator.
Plus 2.10 the reference agent, 2.11 `impyrt` in the composer, 2.12 generated notes + the
history view.

**State after**

- `docs/protocol-v0.3.md` drafted, DRAFT status, **not published**. `protocol-v0.2.md`
  superseded in the text; the live flip is Track 4.4 (register 0.3 in `sync_spec.py`,
  flip 0.2), Opus, ~30 min, listed as a carry-over.
- Decisions **#30–#42** in `CLAUDE.md`; full reasoning in `v0.3-plan.md` **§8c**; every
  §8/§8b question marked ruled. roadmap-tracks 1.1, 1.2, 1.8, 1.9 struck through with
  their outcomes; 2.9 unblocked; the write-surface open question answered.
- blygger-studio `CLAUDE.md`: gating passages rewritten to say what is now buildable, and
  a four-item block of wire-adjacent tasks — emit `cited`, render `[[id]]`,
  `PROTOCOL_LEVEL` 2, store the target version per outbound mention — which are what
  promote §16.1/§16.2 to normative.
- `fable-brief.md` rewritten: gates G1–G4, then the 0.4 definition.

**Open threads**

- **Webmention hardening (2.5) is still open** and still the only item with other
  people's machines exposed. Deliberately untouched this session per Venkat; it is the
  next Opus session's first item.
- **0.3 is unpublished.** Until 4.4 runs, `blygger.org/spec/` presents 0.2 as the living
  document, which stopped being true this session. 4.4 should also cut the first 0.3
  snapshot and add the one-sentence guidance to `/start/` (#42).
- **`tn-2` numbering collision:** roadmap-tracks 1.6 reserved `tn-2` for identity
  practice and #31 wants a note for the write surface. Whichever is written first takes
  the number; the brief says so.
- **§8's implementation notes still cite `worker/src/…` paths.** Left as a historical
  record; the current paths are `blygger-studio/src/…`.
- **Session 24 still has no devlog entry** (noted sessions 25 and 26, unchanged).

## Session 26 — 2026-09-28 — The client gets its own repo and a name; four tracks; the ecosystem turns out to be nine projects

**Model:** Opus 5 · **Time:** ~09:37–11:40 PT · **Committed:** yes (4 repos) · **Deployed:** blygger.org Pages (×2), blygger.com D1 (directory approvals)

**What & why**

Venkat opened with a broad agenda — clear the directory queue, build a community-projects
directory, split the client into its own repo with a name and an update flow, write a
four-track roadmap, add issue scaffolding — and the session's shape was set by measuring
the situation before acting on it, which changed several of the answers.

**1. The queue, and why revalidating mattered.** Ten submissions had accumulated over
three days with no notice to anyone. Nine were approved after re-fetching each manifest;
one was held. `blyg.thoughtfolio.xyz` fails TLS from three independent local clients
(`ERR_SSL_WRONG_VERSION_NUMBER` on :443, and :80 redirects to a `safebrowse.io` warning
page) while the Worker resolver reached it as a conformant blyg two days earlier. A filter
on this vantage and a parked domain are indistinguishable from here, so it is held with
that reasoning in `admin_note` rather than guessed at either way. The directory now lists
11 blygs and 6 feeds. **This is the argument for Track 3.2:** a listing is resolved once,
at submission, and never again, and three days of drift was enough to make one approval
unverifiable.

**2. The census, which reframed the rest of the session.** Reading every live manifest
found **7 distinct client implementations across 11 blygs, 6 of them not ours**, and **4
nodes still on protocol 0.2**. Two corrections to session 25's record fell out of it, both
from reading artifacts instead of notes:

- `thinking.drwip.com` does **not** run our client. Its `generator` is the bare hostname,
  its protocol is 0.2, and its manifest `updated` is 2026-08-31 — three weeks *before* the
  talk. So the first independent implementation was never a self-host of ours, and "three
  strangers followed the start page" was true of two of them. The third read the spec.
- The §9.1 Webmention exposure is **narrower than recorded and still real**: only the five
  `blyg-ref` nodes advertise an endpoint, so the third-party subjects are three, not three
  of three. The six independent clients advertise none. Approving nine listings widened the
  exposed set by exactly one.

**3. The split, and the name.** Venkat's call: two repos, not one repo with enforced
labels. `worker/` left for `blygger/blygger-studio` via `git subtree split`, carrying all
59 of its commits; this repo is normative-only. The client was renamed `blyg-ref` →
**`blygger-studio`** — the name people were already using in public before we called it
anything (bricolage's own blyg says "I added an MCP server to Blygger Studio"). `CLIENT` in
`types.ts` is now the single source of truth for the client's name and version,
**deliberately decoupled from `BRAND`**, which is the protocol's vocabulary and not a
client's to own; conflating them is how a client rename would have read as a protocol
change. Client went to 0.4.0 while `PROTOCOL_VERSION` stayed "0.3" — the first release
where the two numbers differ, which is the point of separating them. Both user agents now
derive from `GENERATOR`; they had been hand-written and had drifted to `blyg-ref/0.2` and
`blyg-ref/0.3` on a 0.3.0 client, which nobody would ever have noticed because the only
readers of a user-agent string are other people's logs. Verified 508 tests + `tsc` clean
standalone **before** touching this repo.

**4. Discovery: the obvious mechanism is worthless here.** Venkat asked whether
auto-discovery was following forks. It is not, and testing that question changed the
design: **our three repos have zero forks between them.** Nobody forks; people read the
spec and write their own, or copy without forking. Measured yields — manifest census: all
7 clients; `blygger in:name,description,readme`: 6 external repos; `topic:blygger`: 3;
code search `blyg.json`: 1 more that both missed; **forks: 0**. So the census is primary,
because `generator` sits in a file the protocol *requires* to be public and five of the
seven clients have no locatable repo at all. GitHub search is demoted to locating the
source of a client already detected, and to catching artifacts that never produce a
manifest — tools and mods, which is why those must be submitted.

**5. The ecosystem directory,** live at `blygger.org/ecosystem/`, 11 entries generated by
`sync_ecosystem.py` from a curated `projects.toml` plus the live census. The field that
earned its keep immediately was **`generator_aliases`**: the first run credited all five of
our own nodes to an unidentified third-party client called `blyg-ref/0.3.0`, because no
node has upgraded yet. With aliases the join is correct and it prints the line the
version-alert work actually needs — *"5 of 5 live nodes run an older build"* — which is a
better argument for the directory-side alert design than the roadmap's prose was. Two
rendering bugs came from opening the artifact rather than trusting the build: a blyg titled
`[jdbb] studio blyg` turned its own link into literal text, and `--offline` was silently
dropping the uncurated-repo triage comment.

**6. `/start/` was lying in three places,** which matters more than anything else on that
site because it is the path every third-party node has actually followed. It said there was
exactly one reference implementation ("one implementation is not a protocol — it is a
program with a spec next to it"), pointed at this repo for the client, and pointed at
`worker/wrangler.jsonc`. All three fixed; the gap paragraph now says what is *still*
missing — a local-first client with no server in the publishing path, plus a conformance
checker — rather than something false.

**7. Issue scaffolding in three repos,** written *after* the split so the templates could
encode its answer. Every `config.yml` cross-links the siblings with the routing rule
("would another client have to change too?") and explicitly invites misfiling over not
filing. `blygger-studio`'s bug form asks whether the client has been modified, because with
no forks that question is the only channel there is.

**8. Venkat's point that reframed the protocol work.** Late in the session: *multiple
authoring clients may be publishing to the same blyg, so the publishing surface will become
a publishing target for many authoring clients.* Already true — three third-party tools
author into blygs today, and the only way in is `/api`: **30 endpoints behind one 30-day
HMAC cookie over a single shared `OWNER_PASSWORD`**, no scopes, no tokens, no revocation,
no audit, no CORS, no idempotency. Every authoring tool that works today does so by holding
the owner's master password. Recorded as roadmap item **1.8** and **not designed** — the
routing rule gates it on two counts, API-surface design *and* security. The strategic point
worth keeping: a documented write contract is what converts fork-pressure into
tool-building, which is most of 2.4's problem arriving early.

**9. Triaging the client issue list, where the product was the two non-bugs.** Venkat's ~20
issues split 10 studio / 6 wire. Two reported bugs are not bugs: `[[id]]` plain links "not
rendering" is a construct that was **never defined** (only `![[id]]` exists), and TK
generation "failing" on a remote transcluded item is `resolveFragment` doing exactly what
its own comment says — *a TK source is local, published, fragment-only*, the contrast
session 25 deliberately documented. In both cases the request is a spec change, and in both
cases **the wire cannot currently express the result** — most sharply for TK sources, where
`ScopeProvenance.sources` is `{id, version}` with no `origin` at all while `Transclusion`
has one. Two studio entries were filed with constraints rather than descriptions: the
password reset is sequenced *after* 1.8 so it is not built and immediately rebuilt around
tokens, and the timezone request carries an explicit wire boundary, because writing local
time into a feed would reintroduce the session-18 reading-list sort bug on every subscriber.

**10. `docs/fable-brief.md`,** a new and reusable artifact: the standing agenda for a Fable
round, partitioned as Venkat asked into **Part 1** triage that unblocks Opus, **Part 2** the
0.3 freeze, and **Part 3** four items explicitly parked for 0.4. The useful finding in
writing it: **only three questions block Opus, and only about four work items**. Almost the
whole Opus queue runs in parallel, so Part 1 is small on purpose. #21 does most of the
partitioning work — a construct that has not been built cannot enter 0.3, which bars all
four of Part 3 without further argument.

**State after**

- **Four repos, four tracks.** `blygger-spec` normative-only; `blygger/blygger-studio`
  public with 59 commits of history, 508 tests, `tsc` clean; `blygger-com` re-vendored;
  `blygger-org` deployed twice.
- **Directory:** 11 blygs + 6 feeds approved, 1 held with a recorded reason, queue
  otherwise empty.
- **Live:** `blygger.org/start/` corrected, `blygger.org/ecosystem/` new. Issue templates
  live in all three public repos.
- **Roadmap:** `roadmap-tracks.md` with 2.1, 2.2, 4.1, 4.2, 4.3 done and the remainder
  honestly marked open. `roadmap.md` untouched — still the protocol version ladder.
- **Not built, deliberately:** the update path (2.3), fork-friendliness engineering (2.4 —
  documented only), **webmention hardening (2.5)**, the directory alert and health cron
  (3.1/3.2). Opus queue parked behind the Fable round at Venkat's instruction.

**Open threads**

- **2.5 is still the only item where the exposure is on other people's machines** — three
  third-party nodes, ~1 hour of local work, blocked by nothing including the Fable round.
  It did not get done this session and should not wait on the spec.
- **A small pre-existing lie fixed in passing:** blygger.com had been introducing itself to
  strangers' servers as `blyg-ref/0.2`, a two-versions-stale blyg client, when it is a
  directory. Caught because the re-vendor broke `tsc` while **all 17 tests passed** — the
  same green-tests-prove-nothing-about-compilation blind spot already recorded for inline
  scripts.
- **`protocol-v0.1.md` and `protocol-v0.2.md` now both say something false** — "Reference
  implementation: same repository, `worker/`". Deliberately not edited: a superseded spec
  takes no revisions. 0.3 must say it correctly (brief F2.1).
- **Two uncurated repos flagged, not listed:** `chrisbodhi/newschematic` (the Hugo
  *deployment* of hugo-blyg) and `protocolvision/sig-p4b` (probably a false positive).
  Triage is Venkat's; the script reports and never adds.
- **The generated-summary path in `sync_ecosystem.py` is inert as shipped** — every current
  entry has either our one-liner or a GitHub description, so no summary was generated and
  the code is untested against a real thin README. It will fire on the first such
  submission.
- **Session 24 still has no devlog entry** (noted in session 25, unchanged).

## Session 25 — 2026-09-24/25 — Talk day: docs caught up to 0.3, one UI unification, and the first strangers

**Model:** Opus 5 · **Time:** ~09:30–12:30 PT (24th), ~09:00–10:30 PT (25th) · **Committed:** yes · **Deployed:** both live nodes (`75f74d9`), blygger.org Pages (×4), blygger.com admin actions

> **Gap in the record:** there is **no Session 24 entry**, though session 24 (2026-09-22)
> built `forked_from`, applied migration 0010, deployed both nodes, and did two rounds on
> the talk deck. Its substance survives in `CLAUDE.md` TODO entries and in git history, but
> not here, and this file is supposed to be the place a future agent onboards from. Not
> backfilled by this session on purpose — reconstructing another session's *rationale* from
> its artifacts is how a devlog turns into fiction. Venkat's call whether to write it.

**What & why**

Talk day. The work split three ways, and only the middle one was planned.

**1. The studio syntax page was lying, in the one place it costs most.** Its transclusion
section still described the v0.1 rule — own published *fragments* only, no nesting, nothing
remote — when all three widened at 0.3. So the page an author consults *while writing a
thread* would tell them a thread they can legally publish is invalid. Rewritten from
`resolveTarget()` rather than from the plan docs, which is the rule that should have applied
the first time: resolution order (own items of either kind, then imported non-L0 blyg items),
identity-not-address so a duplicate id is a publish error rather than a guess, local snapshot
never a live fetch, self/cycle refusals. The TK source rule was already correct and now reads
as the deliberate contrast it is: local, published, **fragment-only**, unchanged since v0.1.

Also added a **stub vs fork** section, because nothing documented the difference anywhere an
author would look, and Venkat asked for it directly after asking what the normal fork UX was.
The framing that section leads with: *a stub cites something you are writing **about**; a fork
records something you are writing **from**.* A stub's body is yours from the first keystroke;
a fork's body starts as someone else's bytes. Same `{origin, id, version}` citation shape for
both, deliberately — "a citation is absolute" is one rule, not two.

A late follow-up (Venkat: "threads too have the same id namespace right?") exposed that the
rewritten page still spelled out "either kind" for *local* items and left it implicit for
imported ones. It is not implicit in the code — `imported_items.kind` is `'fragment' | 'thread'`
and the imported branch filters on `l0` and liveness only — and `cross-client.test.ts` has
covered remote-thread nesting since 0.3. Now stated once, for both sides.

**2. Every public page now opens with the same bytes.** The feed page set the blyg's name in
display type inside a masthead; every other page set it as a small link in the header's left
slot, so clicking a permalink moved the name, changed its size, and shifted everything under
it. `pageTop()` is now the only thing any public page opens with. This widens session 19's
deliberate feed-page-only scope; the reason that scope no longer earns its keep is that it
was protecting the embed case, and a host embedding a feed page **already** had to hide
`.masthead` — so the rule is now uniform rather than per-page, which asks a host nothing new.
`.blyg-name` is gone. The test was rewritten to compare rendered tops for byte-equality rather
than checking each page for the fields separately, because that is the property actually wanted.

Measuring the fix in a browser found a second jump the first fix did not address: a short
permalink sat ~7px right of a long feed page, because one has a scrollbar and the other does
not. `scrollbar-gutter: stable`. Same complaint, different mechanism, and invisible until the
mastheads lined up.

**3. Then the talk happened, and strangers turned up.** Three third-party blygs now exist,
stood up from `blygger.org/start/` with no contact with us: `jd-blyg.exe.xyz`,
`blyg.aneeshsathe.com`, and `thinking.drwip.com`. All conformant `blyg 0.3` from
`blyg-ref/0.3.0`. drwip is **path-mounted at `/blyg/`** and was found through its
`<link rel="blyg">` — decision #14's mount independence exercised by someone we never spoke
to, which is the first outside evidence for it. All approved on blygger.com, which now lists
five blygs and three plain feeds.

**State after**

- **Docs:** `/studio/syntax` accurate to 0.3 on both live nodes, with a stub-vs-fork section.
- **Public pages:** one shared top on feed, permalinks, threads, pinned snapshots, archive and
  withdrawal endcaps. 508 tests green, `tsc` clean. CSS contract + both wireframes re-synced.
- **Directory:** 8 listings, queue empty. One rejection recorded with a reason — drwip was
  submitted twice, once resolving `blyg` and once resolving its root `rss.xml`, which would
  have listed one publication under two badges.
- **`self-host-plan.md` §9:** criterion 1 (a stranger stands up a blyg on a domain we do not
  control) is **met in the wild by the provisional start page, without the template existing**.
  Criterion 2 (their instance takes a new version via `npm run upgrade`) is unmet and is now
  the binding constraint.

**Open threads**

- **§9.1's Webmention hardening gate has fired**, and approving the listings is what fired it.
  The condition was "before the self-host template makes origins discoverable"; the template
  never shipped but the outcome arrived anyway. Three third-party nodes run the reference
  client, advertise an unhardened endpoint, and now have their origins on a public directory
  page — operated by people who followed a start page rather than choosing to run an endpoint.
  This is no longer a prerequisite for a future artifact; it is outstanding hardening on live
  deployments that are not ours.
- **Four post-launch items** from Venkat, in `CLAUDE.md` → TODO → Post-launch: packaged
  distribution + a version-alert path; an issue-tracker mechanism; separating protocol feedback
  from reference-client feedback (**sequence this before the issue templates** — the templates
  encode whichever answer wins); and a public decision log including a non-normative identity
  recommendation, precisely because #11 keeps identity out of the spec and three implementers
  now exist.
- **Deploying needs `wrangler login`, not the registry tokens.** Measured against the REST API:
  the two `CLOUDFLARE_API_TOKEN`s are **single-account**, and the personal one has **no D1
  scope**, so `deploy:all`'s migration preflight cannot run from either. One OAuth session
  reaches both accounts. `docs/deploy-protocol.md` implies otherwise and should say this.
- **`feed`-kind directory rows carry no title**, so plain feeds display as bare hostnames while
  blygs show their manifest title. Recorded in `blygger-com/status.md`.

## Session 23 (cont'd, 3) — 2026-09-20 — Public responses: a citation trail, not a comment section

**Model:** Opus 5 · **Committed:** yes · **Deployed:** both live nodes (migration 0009 + the responses list)

**What & why:** Phase B task 17, pulled forward because Venkat's session-22 ruling
allowed it if Phase A finished early — which it did, by four days. His call after
walking the options: **shape A (a list) plus a hide control, open to all origins.**

**A list, never a count.** The argument that decided it is not aesthetic. A count is
the one thing on a blyg page a stranger can move by publishing, and this medium has
deliberately refused every metric it could have had — no follower counts, no likes,
thumbs kept private as studio signals (#12, #13). A list has a different economics: a
row costs a real item, on a real origin, that passes structural verification. Which is
also why the endpoint stays **open to origins we don't subscribe to** — Venkat: "the
origin constrained to being a blyg doing proper stubs is enough spam control for me."
Closing it to subscribers would end the property the whole design exists for.

**The forcing argument for chrome-not-content, stated in a test.** Responses are
rendered from `mentions_in` at request time and reach no item document, no feed, no
hash, and no pinned page. That is not a style choice: a responses list *inside* a
versioned document would mean a stranger's publish changes the author's bytes, which
every subscriber's importer reads as a stealth edit (#18b) — and bumping `version`
instead would be worse, handing a third party the counter #19 made load-bearing and
emitting feed entries the author never wrote. `responses.test.ts` asserts the item
document is byte-identical before and after a stranger responds. The version counter
has to mean "the author published", or it means nothing.

**Editorial controls, and why hiding is not deleting.** `items.show_responses` is
off by default (migration 0009) — other people's names on your page is an editorial
act, so it is one you take per item. `mentions_in.hidden` takes one row off the page
and leaves it in the studio: "I don't want this on my page" and "this never happened"
are different claims, and the blocklist shape means nothing is pre-authorised
irrevocably, which was the gap in a bare per-item toggle.

**What a line can say is bounded by what a mention is.** We store no content of
theirs, so a row is: their self-asserted author name (clamped to 60 characters —
untrusted text bound for the author's page), the origin that actually authenticated,
the relation, the date. The origin is rendered as the load-bearing half because it is
the only part the protocol vouches for (#11: identity is never in the protocol; the
origin is the only authenticated entity).

**State after:** deployed to both nodes; the PI fragment `39nzxm7n…` has responses on
and shows venkateshrao's stub. 488 tests green. `docs/css-contract.md` documents
`.responses` alongside `.stub-cite` and `.provenance` as presentation.

**Open threads:** unchanged — the ⚠️ FABLE citation-on-the-wire question (plan §8),
subscription titles never refreshing, and `rel="webmention"` in static exports. Not
done and deliberately so: no rate-limit hardening (registrable-domain counting, a
global hourly cap, pruning `failed` rows). It is an hour's work and the risk is
nil while two nodes exist and nobody knows the endpoint — but it should land before
the self-host template makes origins discoverable. **Recorded as
`self-host-plan.md` §9.1, a prerequisite to that plan's task 1**, rather than only
in a TODO list: the note has to sit where someone will be reading at the moment it
matters.

**Sequencing for the next session, recorded so it isn't re-derived.** Phase B's six
remaining tasks were checked one by one against the wire, and **only task 11
(`forked_from`) touches it** — 12–16 are entirely studio-side and 17 (done) is page
chrome. So the plan's task 18 ("draft `protocol-v0.3.md` from the tested Phase A + B
shapes") does not in fact wait on all of Phase B: it waits on task 11. The efficient
order is therefore **one short Opus session for `forked_from`, then the Fable
round**, which would then have the complete, live-tested 0.3 wire surface in front of
it plus three questions implementation raised: the citation label (§8), whether a
stub may freeze its quote when its target withdraws (session-22 deferral, now with a
real stub stack to reason about), and spec language for both the open-endpoint policy
Venkat ruled on and the §2.3.3-vs-§4.1 re-send disagreement.

**One ruling put to Venkat and not yet made:** session 22 held the self-host artifact
behind "v0.3" because instances shipped before the cross-client semantics were settled
would become compatibility constraints on decisions Fable had not made. Those
decisions (#26–#29) are made and now live-tested, so the argument's condition is
satisfied — arguably without waiting for Phase B or the 0.3 document. If Venkat agrees,
`self-host-plan.md` §8 unblocks and becomes the largest remaining Opus job, and leg 1
of the release candidate.

## Session 23 (cont'd, 2) — 2026-09-20 — A stub cites what it answers, in a form that outlives the link

**Model:** Opus 5 · **Committed:** yes · **Deployed:** both live nodes (migration 0008 + citation rendering)

**What & why:** Venkat's ruling on the open thread from earlier today — a stub's own
page should say what it responds to, and the citation should survive the link going
dead: *conventional citation norms*.

**The design problem is that `stub_of` names an identity, not a work.** `{origin, id,
version}` is permanent and machine-checkable, and it is the right wire shape (decision
#27). But everything that turns it into a sentence a human can read is mutable or
mortal: the source's *name* comes from a subscription row that can be renamed or
deleted (the stale-byline finding from this morning is the same defect one layer
down), the origin can move, and the target itself can withdraw. Rendering the citation
live means a published citation can decay into "a response to [nothing]".

So migration 0008 adds `versions.stub_cite` and publish **freezes** the human half —
source, author, excerpt, URL, retrieval date — resolved once from local knowledge.
The page renders from that. Three consequences worth naming: a pinned version carries
the citation it froze rather than the live one; deleting the whole subscription leaves
the citation reading correctly (asserted in a test that deletes both tables); and the
URL is printed as **its own anchor text**, so a dead link still tells a reader who
said it, roughly what they said, which item and version, where it was, and when we
read it. That is a citation. "A response to [dead link]" is not.

**Deliberately not on the wire.** Adding `title`/`author`/`retrieved` members to
`stub_of` would be a protocol change, and #27 locked that shape — so `stub_cite` is a
client-side cache, never emitted in any item document. Another client reading our
document composes its own citation from the marker, which is the right division: our
labels are our local knowledge, not facts about their origin. If the wire ever should
carry a citation label, that is a Fable decision, and this implementation is exactly
the evidence it would be decided on.

**Where it renders.** Full form above the body on a thread permalink and on a pinned
version page; a one-line compact form on feed cards and **in the RSS description**,
where transclusion provenance has been injected since 0.1 — a citation belongs with
the work it travels with, and an RSS reader showing the response should show what it
answers.

**State after:** deployed to both nodes and the two live stubs republished, so
`venkateshrao.com/blyg/t/608ay1bz03z3wg58deg787kgvv/` now carries a full citation of
the PI fragment. 481 tests green, `tsc` clean. `docs/css-contract.md` documents
`.stub-cite` as presentation, alongside `.provenance`.

**Both of Venkat's remaining calls came back the same day.**

**The citation-on-the-wire question goes to Fable** ("note that decision for Fable's
review"), written up as `v0.3-plan.md` §8 with three readings rather than a
recommendation: correct as is (a citation label is a claim about *someone else*, and
putting it on the wire lets a publisher assert a title and an author name the origin
never said — the objection that keeps `author` opaque in #11); additive-and-optional
like `generated[]`'s self-asserted provenance (#20); or defer until a second
implementation makes the cost of *not* having it observable. The record names the
consequence plainly: a reader of our document gets `{origin, id, version}` and, if the
target is gone, an identity with no words. **It is one question with remote
transclusion bylines, not two** — same shape, same staleness, same fix or non-fix.
Carried into the roadmap's v0.3 section and the CLAUDE.md TODO so the
`protocol-v0.3.md` pass cannot miss it.

**The version key is bumped to `0.3`** (`blyg-ref/0.3.0`), which is what the wire has
actually carried since this morning: `page`, `stub_of`, `transclusions[].origin`. The
key runs ahead of the document deliberately and with precedent — `0.2` shipped at
session 13 and its document was drafted at session 20 — and #18d makes the key
informative, not a gate. The importer fixtures were deliberately **left** at `0.2`:
now that our own version differs from theirs, those tests exercise the
accept-any-`0.x` rule instead of comparing a constant to itself.

**Open threads:** subscription titles never refresh; static exports still advertise
`rel="webmention"` in page markup; and the Fable question above.

## Session 23 (cont'd) — 2026-09-20 — Phase A deployed; the stub crosses the network for real

**Model:** Opus 5 · **Time:** ~10:45–12:10 PT · **Committed:** yes · **Deployed:** **both live nodes** (migration 0007 + v0.3 code), `site_url` set on both

**What & why:** task 9, run for real. `npm run deploy:all -- --migrate` applied 0007
and deployed both nodes against their own accounts, with the cross-check and the
post-deploy verification the session-17 protocol exists to provide; all ten live
checks passed. Both manifests now carry `"webmention": "webmention"`, and both
endpoints answer 400 to an empty claim.

**`site_url` was empty on both nodes, exactly as flagged.** `siteOrigin()` had been
covering for it by falling back to the request origin, which works for every request
and not at all for the cron — so a mention enqueued by a scheduled drain would have
had no source URL to name. Set to each node's own origin before any publishing; the
manifests' `site` values are unchanged, because the fallback had been producing the
same string.

**The stack, end to end, across two Cloudflare accounts and two domains.** PI
published a fragment; venkateshrao resynced, stubbed it with one API call (the same
call the `stub ↗` button makes), and published. The item document carried
`stub_of: {origin, id, version}` and `transclusions: [{id, version, origin}]`, and the
mention arrived at `blyg.protocol-institute.org/webmention` and **verified as
`stub`** — source page → `rel="alternate"` → item document → origin check → relation
read out of `stub_of`. PI then stubbed the stub back: two levels of blockquote on a
page that fetches nothing at read time, because the outer quote is venkateshrao's
thread *including its own snapshot* of PI's fragment. venkateshrao's inbound row
verified as `stub` in the other direction. Both nodes' `/studio/mentions` show one
verified response each, with the target named by its opening words and the outbound
row marked `sent`.

**The republish re-send works, and so does snapshot independence.** Republishing S1
(v2) re-sent the mention; PI re-verified and moved `source_version` to 2 while PI's
own S2 still shows its v1 snapshot — which is 0.2 §10.4 behaving exactly as specified,
now across origins.

**A stale byline, and what it says about subscription titles.** The first render of
the remote quote read "from *blyg* ↗" — the PI node's *default* site title, captured
in `subscriptions.title` when venkateshrao subscribed on 2026-08-10 and never
refreshed since. Renaming the subscription fixed the demo. The general question is
open and deliberately not decided here: polling does not refresh a subscription's
title, and arguably should not (session 18 made the title editable precisely because
it is the reader's label, and an auto-overwrite would discard a rename) — but a
never-renamed subscription can then show a byline the origin abandoned months ago.
It is the *byline* case that makes it visible, because v0.3 puts that title on a
public page for the first time.

**Static export checked against the definition of done.** An export of the
venkateshrao node is byte-identical to the served routes for item documents, the
archive index and `feed.xml`; the manifest differs by exactly one key, `webmention`,
which is the single intended difference. **Open**: exported *pages* still carry
`<link rel="webmention">`, so a tree served somewhere with no worker behind it would
advertise an endpoint that isn't there — the same claim the manifest strip removes,
left in a second place. Flagged rather than fixed on deploy day; the fix is either
stripping it in `export.ts` or deciding the page link is the origin's business, not
the tree's.

**State after:** v0.3 Phase A is live on both nodes. The roadmap's v0.3 exit
criterion — the full see → stub → publish → *the other end finds out* loop — is
demonstrated between two independent deployments over real HTTP. Live artifacts:
`blyg.protocol-institute.org/t/5tt6adc88s2hacnh68h94t1vsf/` (the nested stack) and
`venkateshrao.com/blyg/t/608ay1bz03z3wg58deg787kgvv/` (the first cross-client stub).

**Open threads:** unchanged from the first half — the version key is still `0.2` and
wants a ruling before the talk; a stub's own page still doesn't say what it responds
to; plus the two found here (subscription-title refresh, `rel="webmention"` in static
exports). Task 10's remaining piece is the README's "on one screen" section and
whether the deck's slide 18 links the live stack, which is Venkat's call.

## Session 23 — 2026-09-16/17 — v0.3 Phase A built: tasks 1–8 in one session

**Model:** Opus 5 · **Time:** ~17:38 PT – 02:00 PT (past midnight; the session opened on the 16th) · **Committed:** yes (blygger-spec ×6, not pushed) · **Deployed:** — (local `wrangler dev` only)

**What & why:** the plan budgeted three sessions for Phase A (1–4, 5–8, 9–10). Tasks
1–8 landed in this one; what is left is the *deployed* half of task 9 and the record.
475 tests green, `tsc` clean. The design was locked enough that almost nothing needed
improvising — the notes below are the places where it did not quite reach.

**Widening the resolver found a defect that nesting would have shipped.**
`resolveFragment` split in two: the v0.1 rule (local, published, fragment-only) stays
untouched for TK source refs, which v0.3 explicitly leaves alone, and transclusion
targets go through a new `resolveTarget` implementing decision #26's order. While
wiring the baked wrapper it turned out `injectProvenance` paired quotes to provenance
lines with a **non-greedy regex** — the moment a transclusion nests, the inner
`</blockquote>` closes the outer match and every following provenance line lands on
the wrong quote. It also hardcoded `f/`, so a local *thread* target (legal from this
version) would have linked a 404. The injector is now depth-aware — only top-level
quotes get a line, which is exactly "provenance records direct transclusions only" —
and each source is resolved: local by authored kind, remote at its own declared
`page`, bylined with the blyg it came from.

**Two judgment calls, both recorded in code.** (1) The version-agreement rule matches
the baked transclusion to the citation **on id alone**, not id+origin: decision #26
makes an id an identity, and an ambiguous id is already a publish error, so origin
equality would be a redundant check with a worse failure mode. (2) `stub_of.id` is
**not** validated against this client's 26-char id spelling — a citation names another
origin's item, decision #2 fixes ids as 128-bit identifiers rather than one encoding,
and rejecting a conformant foreign id would be this client legislating for other
clients. It checks only that the id survives a round trip.

**The plan's outbound re-send rule has one reading the schema can express.** §2.3.3
says a republish re-sends "references that are new or whose target version changed",
while §4.1 says the `(item_id, target)` upsert *is* that rule. The specified schema
stores our version, not the target's, so "unchanged" is not distinguishable — the
upsert semantics were implemented (a republish sets every current reference back to
`pending`). Harmless and W3C-idiomatic, but it is a deviation from the stricter
reading and belongs in the 0.3 draft's text one way or the other.

**Sending needs a canonical origin, and the cron has no request to derive one from.**
`siteOrigin()` falls back to the request origin when `site_url` is empty, which the
scheduled worker cannot do — so a node with no `site_url` can enqueue mentions it can
never send. Rather than invent a URL, the publish path passes its request-derived
origin down for the immediate attempt, and `/studio/mentions` warns when the setting
is missing. **Both live nodes must have `site_url` set before the demo.**

**Driving it against a real instance found what the suite structurally cannot.**
The whole Phase A path was run on `wrangler dev`: fragment → thread quoting it →
thread quoting that thread as a stub → a real loopback Webmention, which returned 202,
fetched the page, followed `rel="alternate"` to the document, checked the origin and
recorded relation `stub`. Three findings. The first publish **500'd**: `wrangler dev`
does not apply migrations, so `versions.stub_of` did not exist — the same ordering
hazard as the session-16 grammar migration, and a reminder for task 9 that 0007 must
be applied per node *before* the code that needs it runs. The endpoint was inheriting
the public surface's 60s `Cache-Control` (now `no-store`). And the mentions page named
each target by its id, which answers "who responded to this" for nobody; it leads with
the item's opening words now.

**State after:** `worker/src/mentions/` is new (store, http, discover, send, receive,
studio); `transclusion.ts`, `model.ts`, `protocol.ts`, `pages.ts`, `api.ts`,
`studio.ts`, `importer/*` and `scripts/export.ts` all carry v0.3 changes. Migration
0007 is applied **locally only**. `respond ↗` no longer exists anywhere. Both live
nodes are untouched and still running the v0.2/TK code.

**Open threads:**
- **Task 9 is the whole remaining gate**, and it is outward: apply 0007 remotely to
  both D1s (correct account per node), `npm run deploy:all`, set `site_url` on both,
  then run the cross-node stack for real. Not started — waiting on Venkat.
- **The version key was deliberately not bumped.** The client now emits `page`,
  `stub_of` and `transclusions[].origin`, but the manifest still says `blyg: "0.2"`
  and `blyg-ref/0.2.0`. Decision #18d makes the key informative, and
  `protocol-v0.3.md` does not exist yet (Phase B task 18), so bumping now would point
  readers at an unpublished version. Venkat's or Fable's call, before the talk.
- **A stub's public page does not say what it responds to.** `stub_of` is on the wire
  and the body usually quotes the target, so the relationship is visible — but the
  page never states it. Plan §3.4 defers *others'* responses to Phase B; this is the
  cheaper mirror image (the author's own citation) and was not specified either way.
- Phase B is unchanged (tasks 11–18), and `self-host-plan.md` stays held behind v0.3.
- Carried: talk slot duration; `security-policy.md` rule 1; account-pinning
  generalisation (session 17).

## Session 22 — 2026-09-16 — The release-candidate gate ruled shut; the directory opens; v0.3 designed with a demo deadline

**Model:** Opus 5 (agenda, gate ruling, record) → Fable 5.1 (v0.3 design, decisions #26–#29), switched by Venkat per the model-switch convention · **Time:** ~12:30–17:30 PT, with breaks · **Committed:** yes (blygger-spec ×3, blygger-org ×1, blygger-com ×1, all pushed) · **Deployed:** — (blygger.com content change only, no code deploy)

**What & why:** the session opened on "what's next for Opus" and the honest answer
was a single question and a single click. Both are now closed.

**The release-candidate gate is ruled shut, and the reasoning is the record's point.**
Session 21 flagged that `roadmap.md`'s gate — "cross-blyg pubsub/subscribe
(**v0.2–v0.3**)" — reads two ways, and that on one reading the self-host artifact was
buildable immediately. Venkat's ruling: **it wants the v0.3 half.** v0.2's subscribe
side being live since session 13 does not open it. The argument that settles it is
about what the artifact *is*: the self-host template is what strangers stand their own
blygs up with, and every instance that exists before v0.3's cross-client semantics are
designed becomes a compatibility constraint on decisions Fable has not made. Shipping
it early would buy convenience now by spending design freedom on the part of the
protocol that is still open. So `self-host-plan.md` stays written-and-held: §8's tasks
1–8 do not start until the v0.3 pass lands. Recorded in three places (`roadmap.md`
"Release candidate", the `CLAUDE.md` TODO, and the plan's own §10) because the previous
state of this question — flagged in one place, ambiguous in another — is exactly how
the last three lapsed holds happened.

**The consequence worth stating plainly: there is no substantial Opus work queued.**
The self-host artifact was the only non-Fable-gated piece of real size, and it is now
behind v0.3 as well. Everything else in the backlog is either Fable's (webmention
mechanics, stub design, DAG semantics, `respond`-becomes-the-stub) or Venkat's (talk
slot duration, `security-policy.md` rule 1, template-repo default). That is a healthy
state, not a stalled one — but it means the v0.3 planning session is now the single
gate on the whole project, which it was not before this ruling.

**The directory opened.** The two pending submissions — Protocol Institute Blyg and
Venkatesh Rao's Blyg, both resolved `kind: "blyg"` with real manifest titles by the
vendored v0.2 resolver — are approved and listed publicly at `blygger.com`. The queue
is empty. This closes the last line of `self-host-plan.md` §9's definition of done that
did not depend on the unbuilt artifact itself. Worth noting the checks were made
against the live artifact in both directions: the queue was confirmed still pending
before approving (the record said so, but the record has been wrong about live state
seven times in this project), and the public home page was re-fetched after, cache-
busted, to confirm both entries actually list rather than merely returning `ok`.

**Two more stale records, making eight.** `blygger-org/status.md` still listed the
`/blyg` reference-client test deployment as upcoming work — superseded in session 11,
corrected in `blygger-com/status.md` in session 21, and missed in this copy, which is
the failure mode of correcting a duplicated claim in one of its two homes.
`blygger-com/status.md`'s Upcoming still read "stub landing page — the domain does not
currently resolve", two paragraphs below the session-21 note recording that it
resolves and serves a directory. Also fixed: a sentence in `blygger-org/status.md`
that said decision #14 changed the default mount "from `/blyg` to `/blyg`" — the
session-9 `blygg`→`blyg` rename had rewritten both spellings to the same token,
leaving a sentence asserting a path changed to itself. **The pattern now has a second
shape worth naming: a global rename can silently turn a true historical sentence into
a false one**, which no status check catches because nothing is stale — it is wrong.

**State after:** the gate is ruled and recorded; `self-host-plan.md` is held behind
v0.3; blygger.com lists both live nodes with an empty queue; four status-record
defects corrected across two repos. No code touched, no deploys, both live blyg nodes
untouched.

**Open threads (Opus half, superseded below):** **the v0.3 Fable pass is now the only gate on substantive work** —
webmention mechanics, stub design, DAG semantics, and the session-18
`respond`-becomes-the-stub question, after which self-host tasks 1–8 unblock. Venkat's
own: talk slot duration (22 slides, Thu 2026-09-24 23:00 UTC, cut points in
`brief.md`); `security-policy.md` rule 1 (print generated secrets to chat, or the
write-to-`.env.keys`-and-verify pattern used in session 21 — the rule wants amending
either way); template-repo public-or-private default and the directory's abuse story,
both from `self-host-plan.md` §10 and both now deferred with the plan. Still open since
session 17: account-pinning has not been generalised to the other Workers projects.

**— Fable half —**

**v0.3 designed, with the talk as the forcing function.** Venkat's brief: start the
v0.3 work and prioritise what makes a fuller demonstration possible at the symposium
on 2026-09-24 — "some early version of stubbing and webmentions." Eight days. The
answer is `docs/v0.3-plan.md`, split into **Phase A** (the smallest permanent wire
surface that lets a stub cross between the two live nodes and be verified on the far
side) and **Phase B** (the rest of the roadmap's v0.3). Nothing in Phase A is
provisional; the split is about *order*, not about shipping a sketch. Per #21, the
normative `protocol-v0.3.md` waits until Phase A has been live-tested — the same
sequence 0.2 took (plan session 12, build 13–19, draft 20).

**What made the demo cheap is that the hard rule was already locked.** "Remote
transclusion always operates on the local snapshot" (roadmap, session 3) does almost
all the work: publish never touches the network, quoting follows reading, and network
cycles are harmless because a snapshot is static bytes. Cross-client transclusion is
therefore a resolution-order change (local any-kind → imported non-L0 blyg item →
error) plus an optional `origin` on provenance — and *nesting* is just nesting
blockquotes. The one DAG rule worth having is a local closure check for the only
genuinely silly case (a thread quoting a thread that quotes it), which snapshot
semantics would permit as a finite, useless doubling; remote closures are not walked
because they are unknowable and harmless. Ambiguous ids (two imports, same
`remote_id`) are a publish error, not a guess: the directive names an identity, not an
origin, which is what lets threads move hosts without rewriting.

**Stubs are threads with `stub_of`, and `respond` dies.** Two shapes — `{origin, id,
version}` for blyg targets (origin REQUIRED even when own; a citation is absolute) and
`{url}` for the plain web — one target per stub, the body entirely the author's. The
protocol never requires the body to transclude the target; the marker is what readers
rely on. A version-agreement rule (if the body transcludes the target, `stub_of.version`
:= the baked version) means the quote and the citation can never disagree on a published
document. The session-18 question is answered: the reading feed's `respond ↗` becomes
`stub ↗` outright — no lighter sibling, because two overlapping "respond to this"
gestures with different semantics was the named bad outcome, and an L0 stub keeps
respond's copy-none-of-their-text discipline anyway. **Deviation from the frozen spec,
flagged:** the stub action does not hopper-add. The stub's own provenance is the ledger;
a side-effect hopper entry is a second ledger that drifts.

**Webmention mechanics, and the gap they exposed.** Endpoint at `{origin}webmention`
— inside the origin surface, because it is a protocol surface, unlike host-rooted
`/studio` and `/api`. Send on publish for every remote-origin reference; discovery via
the target manifest's `webmention` key first, W3C discovery second; retry 15m → 1h →
4h → 12h → 24h; fire-and-forget from the author's view. Receive: 202 then async
**structural verification** — source page → `rel="alternate" application/json` → item
document, whose `origin` MUST equal the final source URL's origin (0.2 §12.2 applied
inbound: a mirror or an impostor cannot speak in a real blyg's name), then the relation
read from `stub_of` / `transclusions[]` / `forked_from`. No content is ever stored — a
verified mention is a pointer. Signals only, never auto-published; public display is
per-item curation under §13.5 and Venkat's call. **The gap:** the reference client has
built remote permalinks as `f/{id}/`·`t/{id}/` since 0.2 (`blygItemUrl`), a convention
0.2 §4 explicitly calls presentation. Webmention needs a target URL and a way from a
W3C source *page* back to a document, so decision #29 adds an optional `page` field to
item documents and the `rel="alternate"` link to permalink pages — additive, optional
for conformance, required of the reference client. Not the first time building the
next thing has found a non-normative assumption the code had been living on.

**What was deliberately left out.** Plain (non-structural) webmentions from non-blyg
sources: spec MAY, held apart as a lower class, dropped by the reference client at 0.3
— link verification is exactly the check spam defeated. Softening
withdraw-rolls-to-null for a stub whose target has withdrawn (a "freeze at the withdrawn
version" affordance): it would be the first place withdrawal failed to roll to null,
so it is an open thread to decide on evidence, not a rule made today. Public
"responses" lists: one afternoon, no wire change, strongest visible demo of the whole
thing — and the first time others' engagement would appear on a public page without
the author writing anything, which the editorial-cost principle has so far refused.
Lean: opt-in per item, off by default, not before the talk unless Phase A finishes
early.

**State after (Fable half):** `docs/v0.3-plan.md` written (§2 is the wire delta the
0.3 draft folds in; §4 the schema and module map; §5 tasks 1–10 Phase A, 11–18 Phase
B; §7 four open decisions for Venkat). Decisions #26–#29 recorded in CLAUDE.md; roadmap
v0.3 carries a design-complete pointer; the session-18 `respond` TODO closed, hopper
composition scheduled to Phase B. No code touched. Both live nodes untouched.

**Open threads:** **Phase A is the next three Opus sessions, in order, with a day of
slack before the 24th** — tasks 1–4 (protocol plumbing) in one, 5–8 (studio + both
webmention halves) in another, 9–10 (deploy both nodes, run the live stack, record) in
a third. Venkat's four calls in `v0.3-plan.md` §7: hopper coupling of the stub action
(plan says no), the public responses list (plan says not before the talk), live demo
vs. screenshots, and confirming `respond ↗`'s outright retirement. Carried from the
Opus half: talk slot duration; `security-policy.md` rule 1; template-repo default and
directory abuse story (deferred with self-host); account-pinning generalisation
(session 17). Two remote-source questions for a later Fable pass, on evidence: whether
a stub may freeze its quote when the target withdraws, and whether `forked_from`'s
pinned-only rule bites in practice.

## Session 21 — 2026-09-16 — Opus backlog cleared; a talk deck; blygger.com ships as a directory; four stale records corrected

**Model:** Opus 5 · **Time:** ~10:48–12:25 PT · **Committed:** yes (blygger-spec ×3, blygger-org ×8, blygger-com ×3, all pushed) · **Deployed:** blygger.org ×4, **blygger.com ×1 (new)**

**What & why:** the session opened on "what Opus work is left before Fable v0.3" and
the honest answer was *almost none* — three small items from session 20's open threads.
It then turned into a talk, a new site, and an unusual amount of correcting the record.

**The export preflight, and why refuse-vs-warn is not symmetric.** Session 19 flagged
that a static export bakes absolute `og:url`/`canonical` from `siteOrigin()`, so an
export off `wrangler dev` ships `localhost`. Confirmed the hazard before fixing it —
the exported tree really does carry `og:url="http://localhost:8787/blyg/"`. `export.ts`
now checks the manifest's `site` **before writing a single file**, and the two failure
modes are deliberately treated differently: a **loopback origin refuses** (no host
exists on which that tree is correct; `--allow-local` for the dev-verification loop),
while **site ≠ `--base` only warns**, because that is precisely the supported
configuration `site_url` exists for — export from local, serve at production. The
original suggestion (compare against `canonical`) would have been weaker: the feed page
emits no canonical, and `site` is the value every absolute URL derives from anyway.

**The carousel, settled on consistency rather than comparison.** Decision #25 had
already made this presentation, so it was the client's call. What decided it was not
the comparison argument from session 19 but that the version line is *identical markup*
on feed, permalink and thread pages — shipping the enhancement on one gave the same
affordance two behaviours. Deliberately **not** extended to the withdrawn endcap (paging
pinned text into a page headed "This item was withdrawn" reads as a contradiction; the
frozen page wears its own banner) or to a pinned version's own page (one frozen version
by definition). `FEED_SCRIPT` → `VERSION_NAV_SCRIPT`, since the name had become false.

**And a real defect found by opening the page.** The carousel swapped the body but left
the *version note*, so v1's text displayed under v2's note ("tightened it") — the
editorial apparatus describing something other than what is on screen, live since
session 19. `v{n}.json` already carried a per-version `note`; it now travels with the
version and hides when absent. **Fourth session running in which the bug was invisible
to a green suite and obvious on the artifact.**

**A talk deck, and a format lesson.** Venkat asked for a symposium deck on
blygger.org, modelled on humboldt's. Ported `_build_talk` minus audio — which is not
mere deletion: humboldt gates its *entire player* on audio existing, because without a
clip nothing drives slide advance; here an operator drives it, so the gate had to be
inverted. **Everything in the stage is sized in `cqh` against a `container-type: size`
container**, so the embedded preview and the fullscreen presentation are one composition
at two scales. That was arrived at the hard way: `rem`/`vw` sizing left a *2-pixel*
screenshot on one slide and pushed two bullets off another, while fullscreen looked
fine. Two further CSS traps worth remembering: a percentage `max-height` against an
auto-height parent resolves to `none`, and a class rule `display: flex` outranks the
UA's `[hidden]`.

**The source format was rebuilt mid-session and the reason generalises.** It started as
`slides.yaml` + `track.md`, splitting "what is projected" from "what is said". Every
content edit touched two files and kept them aligned by hand — which is exactly how a
renumber produced two slides sharing an id and a deck that silently skipped a position.
Collapsed to a single `talk.md` with positional numbering, which makes that class of
error **unrepresentable rather than guarded against**; the duplicate-id check written an
hour earlier was deleted because nothing was left for it to catch.

**Four stale records corrected, which is the session's real theme.** `blygger-org` and
`blygger-com` both still described themselves as "one of the two initial cross-client
test instances" — overtaken in session 11. blygger.org's **front page** linked
`/spec/0.1/` (SUPERSEDED since session 20) and said 0.1 was "heading toward its first
deployments". The site nav pointed at 0.1 too. And `warnings-node.md` claimed only one
project in `Code/` used Node. This is now the *seventh* instance of recorded-status
decay in this project, and the pattern has a shape: **notes rot in the direction of the
past, and the front page rots as readily as a TODO.**

**The blygger.com claim I got wrong, and how.** I recorded the directory as "blocked on
DNS onboarding" because `curl https://blygger.com/` returned 000. Venkat corrected it:
the zone was long since active on the personal account. The error was not failing to
check — it was **testing one artifact and concluding about a different fact**. A failed
`curl` means nothing is serving; it says nothing about whether a zone exists. The
correct check was one API call, which I made only after being told. Worth recording
precisely because it is the inverse of the lesson the project keeps learning: checking
the artifact only helps if it is the artifact your claim is about.

**blygger.com ships as a directory, not a stub.** A submit box, a list of approved blygs
linking **home pages not feeds**, and an admin-gated queue. The part worth building is
validation: submissions are resolved by **this repo's own v0.2 resolver**, which points
the reference implementation at strangers' real sites — a test of the spec nothing else
performs. Verified against reality: both live nodes resolve as `blyg` with their real
manifest titles, simonwillison.net correctly resolves as a plain feed linking his home
page rather than his Atom URL. Approval gating is structural rather than a caller's
discipline: `listApproved()` bakes the status filter in, so no code path can list a
pending row. The resolver is **vendored** with `npm run sync-vendor` so drift is visible
in `git diff` — re-sync at v0.3.

**Environment.** `npm install` is broken on this machine for any *fresh* project
depending on vitest (`arborist` `edgesOut` TypeError), reproducible in an empty
directory; `--legacy-peer-deps` is the workaround. Existing projects install fine only
because a resolved lockfile skips that code path, so diagnosing by comparing them is a
dead end. Recorded in `warnings-node.md` along with the per-project
`com.dropbox.ignored` requirement.

**State after:** blygger.org carries the spec (0.2 tagged and snapshotted at
`spec/0.2/2026-09-16`), technical notes, a `/start/` page, and a 22-slide symposium deck
with real screenshots of both live nodes. blygger.com is live and holds two pending
submissions. `docs/self-host-plan.md` specifies the packaged self-host artifact —
template repo + `npm run init`, subdomain-only mounts, and an explicit upgrade path.
Worker code: 426/426 green, `tsc` clean; directory: 17/17, `tsc` clean. Both live blyg
nodes untouched all session.

**Open threads:** **v0.3 still needs a Fable planning session** and remains the gate on
all substantive protocol work — webmention mechanics, stub design, DAG semantics, and
the `respond`-becomes-the-stub question from session 18. **The release-candidate gate is
ambiguous and worth an explicit ruling:** it reads "pubsub/subscribe (v0.2–v0.3)" and
v0.2's subscribe has been live since session 13, so either the self-host artifact is
buildable now or it waits for v0.3 — flagged because holds in this project have three
times been found already lapsed. Smaller: the talk needs Venkat's slot *duration* (22
slides, cut points recorded in `brief.md`); two pending directory submissions need
approving; account-pinning still hasn't been generalised to the other Workers projects
(open since session 17); and `security-policy.md` rule 1 says print generated secrets to
chat, which I deliberately did not do — worth Venkat confirming which he wants.

## Session 20 — 2026-09-13 — Protocol 0.2 drafted and published; §8.4 recast (#25); a code-fence bug that had been leaking live markup into the published spec

**Model:** Fable 5 (0.2 draft + decision #25) → Opus 5 (publishing, CSS contract), switched by Venkat per the model-switch convention · **Time:** ~11:57–12:25 PT · **Committed:** yes (`blygger-spec` ×2, `blygger-org` ×1, all pushed) · **Deployed:** blygger.org ×1

**What & why:** The session's job was the ⚠️ FABLE item that had gated everything
since session 15 — draft `protocol-v0.2.md` — then publish it. Both done, plus the
CSS contract, plus a bug found by looking at the output.

**Decision #25, and why the ambiguity was resolvable rather than a coin flip.**
Session 19 shipped an in-situ pinned-version carousel and then noticed §8.4's
sentence "a public page's version display is an **indicator, not navigation**"
argues against it, leaving two readings and picking neither — with the explicit
instruction to settle it *before the sentence was copied forward*. The ruling is
reading (a): **the clause constrains routes and promises, not presentation.** What
settles it is not preference but the protocol's own charter — invariant 1 says the
protocol governs the published artifact and disclaims the studio; §8.4's own rule 2
says "page chrome is presentation"; §10.5 says the same of thread excerpting. A
normative clause dictating client UI was always out of character for this document.
Read historically it is clearer still: the sentence is session 5's *rationale for
refusing history routes*, written when JSON was the only pinned representation. When
decision #24 added pinned HTML pages, the clause's route content survived and its
presentation phrasing became a stranded overhang. **The invariant it actually
protects is that unpinned history is unreachable in every representation**, which is
what keeps withheld-by-default and withdrawal meaningful — and the carousel preserves
that structurally (positions are `data-pins` plus the live version; the only fetch is
an already-promised `v{n}.json`; JS-off degrades to plain links). So 0.2's §8.4 states
the bound directly — *every version a display exposes, by link or in place, must be one
the origin already promises forever; a display MUST NOT offer, imply, or hint at access
to unpinned versions* — and keeps "frozen citable artifacts of one identity, not pages
of one document" as design guidance about what pins are. The session-5 scrubber stays
impossible, for the structural reason rather than the stylistic one: its bytes are
never served.

**Companion ruling: `blyg-tk-gen` stays unstyled.** Tinting generated prose would
present self-asserted, unverifiable provenance as a *verified authorship badge* — a
claim the protocol refuses to make anywhere else (timestamps, `author`, `generated`
all carry the same honesty stance) — and after author review the author owns the text
(#20). So the class name is a permanent wire token and styling is any client's free
choice; this client declines. Note the asymmetry with `blyg-transclusion`, which *is*
styled: quotation is a visible authorial act on its face, and the blockquote asserts
nothing the wire cannot back.

**The 0.2 document.** Standalone-complete superset per #23, 15 sections. Beyond
carrying 0.1 forward it folds in: blogroll (§11), resolution (§12, #17 — checked
against the implemented `resolve.ts` step order rather than the plan text alone),
reader conformance with the importer invariants, curation/no-re-emission, and the L0
wrapper (§13), generation provenance (§5.7, matching the shipped
`{sources, model, at}`), the informative version-key policy (§3.1), the bare-counter
rationale (#19) in §5.2, and four new security bullets — generation provenance is
unverifiable *and its absence proves nothing*, resolution fetches attacker-suppliable
URLs so server-side readers need fetch hygiene, history rewriting is made loud rather
than prevented, and a blogroll reveals reading choices so absence from one carries no
information by construction. **One deliberate tightening:** `<blyg:manifest>` becomes
MUST. 0.1 only showed it in an example, but resolution step 3 and the
no-extensions-needed blogroll both load-bear on it — a plain OPML entry upgrades to a
blyg subscription *only* through that element. Both live nodes already emit it, so the
tightening costs nothing.

**A rendering bug that had been live since session 11, found by reading the output.**
Python-Markdown's `fenced_code` only recognizes a fence at column 0. An example
indented under a list item is therefore not code: its first line becomes inline code
and the remainder is parsed as markdown — which passes raw HTML straight through. So
`blygger.org/spec/0.1/` has been emitting a **live** `<blockquote class="blyg-transclusion">`
into the page instead of showing §10.2's example, for two years of session-time, and
0.2 inherited the flaw plus a worse instance: the OPML example injected
`<head><title>` into the document body. **Fixed in `build.py`, not in the prose, and
that choice is forced by the spec lifecycle** — a superseded document receives no
revisions and dated snapshots are immutable, so those pages can *only* be corrected in
the renderer. One preprocessor de-indents fences before conversion and fixes 0.1, its
2026-08-10 snapshot, 0.2, and every future document while leaving the frozen bytes
untouched. Blast radius verified by hashing `dist/` before and after: exactly the three
spec pages changed; overview, namespace and notes pages byte-identical. General lesson,
and the second session running to produce one of this shape: **the suite/tooling
asserts that a thing was produced, not that what it produced is what it claims to be** —
session 19's green tests could not see invalid JavaScript inside valid HTML, and
`sync_spec.py`'s idempotency check could not see valid markdown rendering as broken
HTML. Both were found by looking at the artifact.

**Publishing (§6).** `sync_spec.py` gained the superseded state as
`("SUPERSEDED", successor)`, which drives both the index row and a banner injected
under the superseded page's H1. Two changes beyond the task list, both forced by the
change itself: **latest mode now syncs every version**, because a supersession mutates
an *older* version's page and syncing only the newest would leave it stale; and
**snapshot mode refuses a superseded version**, since #23 freezes it — worth the guard
because the old `--version` default was `0.1`, so the habit it protects against is the
likely one. Two hardcoded `protocol-v0.1.md` references that would have mislabelled
0.2's provenance are gone.

**CSS contract.** Written by commitment level, which is the distinction that was
actually missing. §1 is the two classes baked into published `content_html`: they are
protocol surface binding *any* client that renders blyg content — including content
imported from someone else's origin — so the obligations are style freely, but never
hide, rename, strip, or let a sanitizer drop them, because each exists to disclose
something. §§2–4 are the reference client's own vocabulary, structure, tokens and theme
mechanism, documented so themes can rely on them while being explicitly *not* a
protocol promise. `div.item-content` is named as the load-bearing boundary: author's
published bytes inside, this client's apparatus outside. Every claim was verified
against `pages.ts` rather than written from session 19's summary, which caught an error
that would have shipped — `.provenance` is injected *inside* the transclusion
blockquote at render time into a copy, not rendered beside it.

**Stale TODO, third instance.** `spec-publishing-plan.md` §5 (notes publishing) was
recorded as unexecuted; it shipped in `blygger-org` `f974d8c` and `/notes/` + `/notes/tn-1/`
are live. Verified against the site rather than the note, per the standing lesson.

**Verification:** all four spec URL shapes plus `/notes/`, `/ns/0.1` and the root 200
live with cache-busting; index rows, 0.1 banner and 0.2's escaped examples checked in
the live HTML; snapshot markdown byte-identical (`shasum` before/after) and its page
confirmed to carry no banner.

**State after:** 0.2 is the living spec document and is published; 0.1 is superseded,
bannered, and frozen with its snapshot intact. The protocol surface v0.2 shipped in
sessions 13–16 is now fully specified in normative prose, so a third party could
implement the subscribe side from the document alone. No worker code changed this
session; both live nodes are untouched.

**Open threads:** **0.2 has no dated snapshot** — §6 task 3, deliberately left for
Venkat, since a snapshot mints a permanent git tag and immutable URL and asserts the
text is citable. **v0.3 needs a Fable planning session** before any implementation:
webmention mechanics and the stub design are ⚠️ FABLE and undesigned, and the
session-18 thread about whether the reading feed's `respond` *becomes* the v0.3 stub is
still open. Smaller Opus-safe leftovers: the static-export `canonical`/`og:url`
`localhost` warning, and generalizing account-pinning to the other Workers projects
(open since session 17). The **feed-page-only carousel** question from session 19 is
untouched and now has a clearer frame — #25 makes it purely a presentation choice, so
it can be decided on reading experience alone. Publishing `css-contract.md` to
blygger.org was considered and not done: it is reference-client documentation, and the
site currently publishes normative text and technical notes only.

## Session 19 — 2026-09-13 — Cosmetic pass becomes a design system; nine reader/studio features; a SyntaxError that 400 green tests could not see

**Model:** Opus 5 · **Time:** ~10:33–11:31 PT · **Committed:** yes (13 commits) · **Deployed:** both live nodes ×11 (identity/archive; meta+OG; typography; typography refinements; studio palette; blogroll+title links + carousel; theme; studio editing; SyntaxError fix; studio tests; discard-404 fix)

**What & why:** Venkat asked for "cosmetic updates that don't touch the protocol" before
triggering the ⚠️ FABLE 0.2 draft, then mid-session added nine concrete features. Nothing
here changes a wire shape; two things sit deliberately close to the line and are argued
below.

**The gate on the deferred UI refresh had lapsed, same as the scrubber's did.** The
"Full UI refresh" TODO was parked behind "TK-transclusion + subscribe/pubsub working end
to end" — closed in session 18. That is the second time in two sessions a hold condition
had quietly expired while the TODO still read as blocked.

**Site identity was published to machines and shown to no human.** `title`, `author.name`,
`author.bio`, `author.links` and the avatar were all in `blyg.json` and the feed channel;
the page rendered `site_title` into `<title>` and nothing else. A reader landing on either
node could not tell whose blyg it was. The feed page now carries a masthead. Written up mid-session as
**overriding** a rev-2 review note ("site identity lives in the manifest, feed channel, and
studio settings, not on this page"). **That framing was wrong, and checking the older
document at wrap-up settled it the other way:** `v0.1-plan.md` §4's public-page mockup
always showed `Venkat's blyg` / `bio line · links`. The masthead was specified from the
start; the rev-2 wireframe round removed it, and the rev-2 note then stated that removal as
a principle. So this session *restored the plan* rather than contradicting a decision — and
the rev-2 rationale still holds for its real case, an embedded `.blyg` block where a host
page supplies identity. Both live nodes are standalone, which that note acknowledged and
left unserved. Scoped to the feed page, so embedded pages are unchanged. General lesson,
and the second time this session: **check the oldest document that speaks to a question, not
just the most recent one** — the most recent note is the one most likely to be a
rationalisation of a change rather than a reasoned position.

**The header link was wrong in both directions, and nothing tested it.** It was a hardcoded
`Home → /`. On the root-mounted PI node `/` *is* the page, so it was a self-link; on
path-mounted venkateshrao `/` is the host site, so a reader on a permalink had no link back
to the blyg at all — the one destination the page can actually name. Now the blyg's own
title → `{mount}/`. Linking out to a host site became an author-configured `author_links`
entry, which is the honest place for it: only the author knows whether `/` is their
homepage, someone else's site, or nothing.

**A latent bug found by rendering a field nobody had rendered.** `/media/:file` matches on
the full `r2_key` (`media/{id}.{ext}`), but both the new masthead and — pre-existing —
`buildManifest()` emitted a bare `media/{id}`. The manifest's published `avatar` would have
404'd the first time anyone set one. Fixed in both; the field's *shape* is unchanged, so
this is a bugfix, not a wire change.

**Design: the editorial apparatus IS the design.** The stylesheet was the browser default
with a width limit, and every piece of metadata — `v2 · pinned: v1, v2`, Created/Most-recent,
transclusion provenance, the withdrawn endcap — rendered at one undifferentiated
`0.85rem / opacity 0.7`. But that apparatus is exactly what distinguishes a blyg from a blog:
every item wears its revision history in public. So it got its own face (system sans against
a serif body), one size, one colour, and the prose was left alone. The colour is an **editor's
blue pencil** — to blue-pencil a manuscript is to edit it, the same copy-desk world `[TK]`
comes from — so every editorial mark is blue. **No web fonts, deliberately:** a reference
client for a decentralised medium should not make every reader's page load phone a
third-party font host; self-hosted files that depend on someone else's CDN are not really
self-hosted. Both themes defined rather than inherited.

Three fixes came from looking at it live rather than from reasoning: the apparatus block was
taller than the content it annotated (three ~1rem gaps); the archive's `thread` marker became
its own flex column and knocked that row out of alignment; and a transcluded fragment's
headings rendered at full size and outshouted the thread quoting them (quoted material is
subordinate, so they step down a rank).

**The studio shares the palette but keeps its own type.** It is a dense working tool, not a
reading surface, and should not become one. What it did need: its colours were literals
scattered across four style blocks — `rgba(128,128,128,x)` at seven alphas for what are
really two rules, plus `#c00`/`#2a7` for state. Those two were a genuine dark-mode
legibility problem, not untidiness. Now tokens, defined per theme.

**Nine features (Venkat, mid-session).**

*(1) Blogroll on the public page.* Published as OPML, advertised with `rel="blogroll"`,
invisible to people — backwards for a list whose entire job is pointing readers elsewhere.
Rendered from the same `listBlogrollSubscriptions()` the OPML uses, so the two cannot
disagree. Native blygs are marked, since "this one you can subscribe to natively" is the
distinction the blogroll exists to make.

*(2) Pinned versions open in situ, with a `‹ ›` carousel.* Reading "what did this say
before?" is a comparison, and a comparison wants both texts in the same place; going to the
frozen page became its own explicit link. Three properties it is built to keep, all of which
constrained the design: **it is an enhancement, never a requirement** (the server renders the
same line with pin citations as real links; no-JS, cmd-click, and a failed fetch all still
reach the frozen page); **it works on a dumb file host** (the only thing fetched is
`items/{id}/v{n}.json`, which §2.8 already publishes and the export already writes — so an
exported tree keeps working, which is invariant 4's whole point); and **it never invents a
version** (positions are `data-pins` plus the live version and nothing else, so unpinned
history stays unreachable in every representation, which is what keeps withdrawal
meaningful). A pin *of* the live version is one position that happens to be pinned, not two.
Note this is only legitimate *because* of decision #24 — session 18 deleted a scrubber that
paged through all versions, which cannot exist; a carousel over pinned versions only is
paging through artifacts that do.

**⚠️ FABLE flag raised at wrap-up, after the feature shipped.** §8.4 of the normative spec —
and §2.8 of the plan — say a public page's version display is an "indicator, **not
navigation**", because "pins are a sequence of frozen citable artifacts of one identity,
**not pages of one document**." The carousel breaks no *rule* in that section (no route
serves unpinned history, nothing new is promised, every byte was already promised forever,
and JS-off degrades to plain links), but that rationale is a direct argument against the
affordance. The check made while building was the **route/promise** one — decision #24,
which the carousel passes — and **the presentation clause was simply missed**. Two readings
are open and this session picked neither: the clause constrains routes and promises (client
presentation of already-promised bytes is out of scope), or it constrains presentation (in
which case the reference client is out of conformance with prose it ships against, and
either the feature or the sentence goes). `protocol-v0.1.md` left unedited — this is Fable's
call, and it must be made **before the sentence is copied forward into `protocol-v0.2.md`**.

*(3) A leading `<h1>` links to the item's page.* The anchor wraps the rendered heading at
render time and never touches stored `content_html`, exactly like `injectProvenance`; a test
asserts the item JSON keeps the bare heading. Only a heading that *opens* the item counts —
one further down is a section head, and linking it would claim a structure the author did
not write.

*(4) Reading theme.* Repaints two surfaces: `--page` (the margins) and `--paper` (the block
the writing sits in); when they differ the block reads as a sheet on a desk, which is the
point of offering the pair. The palettes are **borrowed, not invented** — Solarized and Nord
have worked-out contrast, and the cream is the value long-form readers converged on; a
palette someone else already balanced beats one mixed here, and naming them lets an author
look up what they are picking. **`auto` is the default and is not a theme:** it means follow
the reader's system preference, the only setting that respects a choice the *reader* made.
A chosen theme deliberately overrides it — emitted into both the base and the `prefers-dark`
block — because an explicit authorial choice should not flip when the reader's OS does.
Served by appending to `style.css`, so one file themes every page and the export picks it up
by fetching the route. Public pages only: a tool that repaints when you change your site's
colours is a surprise. The key is local and never reaches the manifest (asserted).

*(5–9) Studio.* Always-open "Full Editor" (wanting the bigger editor is not detectable from
what you have typed). A fragment/thread radio replacing `+ new thread`, which read as a
separate feature rather than the other thing the same box makes — `PUT` cannot change kind,
so switching after a draft exists discards and recreates it, losing nothing because the text
lives in the textarea. **`save draft` keeps you in the box**: it used to create the item and
reload, pushing your words into the list below — saved, but no longer being edited, which is
the opposite of what saving a draft should mean. **Discard means two different things and
would be dangerous conflated**: never-published → DELETE the draft; dirty → discard the
*changes* by restoring the last published version, publishing nothing and rewinding nothing;
clean → no button, because leaving the public stream is withdraw. **Quick edit** opens a
fragment's working copy in the row. Fragments only: a thread's working copy carries
transclusion directives and TK scopes whose point is the live preview, the `![[` palette and
the scope panel, and a bare textarea would be a worse tool wearing the same name.

**The session's real lesson: a whole class of bug this suite cannot see.** The studio shipped
**broken** for one deploy. A `confirm()` string was written with a single-backslash `\n`
inside a TS template literal, so the emitted JavaScript carried a real newline inside a string
literal — SyntaxError on load, every `data-action` handler dead (quick edit, publish,
withdraw, pin, discard), **and 402 tests green**. Assertions about HTML pass whether or not
the `<script>` inside it is valid JavaScript. The file's older `confirm()` strings already
used the doubled escape, so the convention was right there and the new code simply lost it.
`test/inline-scripts.test.ts` now compiles every inline script the feed page and all eight
studio pages emit, via `new Function` (which parses without executing); verified against the
broken code, it fails with the same SyntaxError the browser reported.

Venkat then found a **second instance of the same blind spot**: discarding a draft from the
editor 404'd. The shared handler ends in `location.reload()`, right for every action that
leaves the item in place; discard deletes it, so it reloaded an editor URL for the thing you
had just deliberately deleted. The index discard never showed it because reloading the index
is correct. Both post-action navigation paths are now tested. General shape: **what a page
*renders* is well covered here; what its script *does* was not covered at all.**

**Carousel jitter, reported by Venkat, had two causes.** The frozen-version marker was a left
rule plus padding, which indented the prose on every step; and the version label's text
changes as you step (`v3` → `v1 · frozen`), shoving the pin citations along with it. The
marker is now a tint extended by `box-shadow` spread — box-shadow is not laid out, so it
paints "held, not live" *outside* the box and costs nothing in layout — and the label has a
reserved width. Measured across a step: nav, pins, prose left edge and content width all
shift by **0px**.

**A real ordering bug fixed in passing.** `listPublic`/`listAll` sorted by `updated DESC`
only, and `updated` has second precision — so items published inside one second ordered
nondeterministically, in the *public feed's own order*. Same `rowid DESC` tiebreaker session
11 added to `feedEvents()` for the identical reason. Found because a test I wrote kept
flaking; the flake was the code, not the test.

**Wireframes re-synced, and the hand-copy hazard named.** `public.html`/`thread.html` now
carry `STYLE_CSS` verbatim from `pages.ts` rather than a hand-typed copy, plus the session-19
markup; each says outright that the shipped file is the source of truth and any difference
means the wireframe is stale. The three studio wireframes still describe the right layout but
not the right palette, and are annotated rather than left silently wrong. Hand-copying is
what let them drift — the same lesson session 11 learned when `sync_spec.py` retired
hand-copying the spec into `blygger-org`.

**Verification:** 413 tests (was 376); `tsc` clean. Every chunk was deployed to both nodes as
it landed and checked in a real browser — which is how the two studio bugs and the three
typography fixes were found. **Static export re-verified twice** (after the typography pass
and again after all nine features): exported bytes identical to the live routes for the feed
page, archive, a permalink, a pinned version page, a thread, and `style.css` — invariant 4
holds through the whole change. The carousel was measured live in-browser rather than
eyeballed.

**State after:** Public pages have a real design system (tokens, two themes plus six author
themes, serif prose / sans apparatus, blue-pencil editorial marks) and four new reader
affordances (masthead, blogroll, title links, in-situ pinned versions). The studio shares the
palette, keeps its own type, and has the composer/editor/row editing affordances Venkat
asked for. Both nodes run this code; no migration (theme is a settings KV row). The
⚠️ FABLE `protocol-v0.2.md` draft remains the unblocked next session and is untouched.

**Open threads:** **The one item gating the next session: does the pinned-version carousel
conform to §8.4's "indicator, not navigation"?** Flagged at wrap-up, argued both ways above
and in `v0.1-plan.md` §2.8; it must be decided before that sentence is copied into
`protocol-v0.2.md`. The **feed-page masthead** is *not* an open question after all — the
v0.1 plan's own mockup specified it (see the correction above). The **CSS contract** is the
remaining half of the roadmap's v0.5 styling deliverable and the protocol-relevant half:
session 19 established the class vocabulary and token set in practice but wrote neither down,
and `blyg-transclusion`/`blyg-tk-gen` are *baked into published `content_html`*, so they are
already wire-visible and cannot be renamed — a third-party themer needs to know which classes
are load-bearing and which are this client's own presentation. `blyg-tk-gen` is deliberately **unstyled**: tinting generated prose would be
a visible claim about authorship, which is a decision-#20 question rather than a CSS one —
worth putting to Fable during the 0.2 pass. The carousel is **feed-page only**; the permalink
page still shows pin citations as links to the frozen pages, which may be right (one item,
one page) or may want the same treatment. Theme applies to public pages only; whether the
studio should follow is undecided and was deliberately not decided here. Static-export note:
`og:url`/`canonical` are absolute and derive from `siteOrigin`, so an export driven from a
local `wrangler dev` would bake `localhost` — `settings.site_url` is the existing fix, the
same as for the manifest's `site`, but nothing warns you. Account-pinning generalisation to
`venkateshrao-cloudflare/` and PI Workers projects still not done (from session 17). The
transient Cloudflare **7403** on the migration preflight recurred once at the session's first
deploy and cleared on a plain re-run, exactly as session 18 recorded — the recorded advice
held.

## Session 18 — 2026-09-12 — Studio backlog cleared; two mis-recorded root causes corrected; pinned-version pages (#24); v0.2 testing pass closed
**Model:** Opus 5 → Fable 5 (pinned-page design ruling) → Opus 5 (implementation + the rest), switched by Venkat per the model-switch convention · **Time:** ~15:20–16:50 PT · **Committed:** yes (8 commits) · **Deployed:** `blygger-spec` to both live nodes ×5 (backlog fixes + migration 0006; scrubber replacement; pinned-version pages; hopper cold-start; composer TK fixes); `blygger-org` ×1 (spec §8.4 resync)

**What & why:** Worked the session-17 studio/subscribe-side backlog, and started the
testing-pass item (c) convergence clock first so it would ripen during the work.

**The reading-list sort bug — the recorded root cause was wrong, and finding that mattered.**
Session 17 logged it as "`l0.ts` never reads the `pubDate` that `feed.ts` parses, so `updated`
is the import moment and the backfill sorts by fetch time." `l0.ts` line 120 does read it.
The real cause: feed dates were stored **raw**, and `buildReadingFeed()` compared them **as
strings**. RSS 2.0 `<pubDate>` is RFC-822, so descending lexicographic order sorts by
day-of-week *name* first, then day-of-month. That is not a hypothesis — it reproduces the
live order exactly: the observed Jul 1, Jul 28, Jul 9, Jul 12, Jul 5, May 30, May 30, May 23,
May 23, Jun 20, Jul 18 is precisely `Wed > Tue > Thu > Sun 12 > Sun 05 > Sat 30 > Sat 30 >
Sat 23 > Sat 23 > Sat 20 > Sat 18`. It also explains the *clustering by source* that the
fetch-time theory never did: digit-leading ISO strings and letter-leading RFC-822 strings can
never interleave, however recent either is. Worth noting the wrong diagnosis was plausible and
specific — it named a real field and a real call site — which is exactly why it went a whole
session unchallenged. Checking it against the live rendering took two minutes.

Fixed at three layers rather than one, because they answer different questions. `toIsoUtc()`
(in `util.ts`) normalizes foreign dates at the `feed.ts` **parse boundary** — that is where a
foreign format should die, and `ParsedFeedEntry.pubDate` is now documented as normalized, not
raw. `buildReadingFeed()` sorts on **parsed instants** instead of strings, which heals every
row already sitting in the two live DBs *without a migration* — the important property, since
unchanged content means the poll loop skips those rows forever. And `pollL0Subscription()`
repairs stored dates on that skip path so the data itself converges. Two traps there, both
caught before shipping: the repair must not bump `version` (at L0 that means "content changed
under the same guid" and drives the reader's edit signal), and it must let **only a
feed-stated date** correct `updated` — my first version re-derived from `observedAt`, which
would have re-stamped every dateless entry to the poll time on each cycle, reintroducing the
fetch-time drift the whole fix exists to end.

**Hopper rename, and a slug decision.** `PUT /api/hoppers/:id` took only `{public}`; it now
takes `name`. The open question was whether renaming re-slugs. Decided: **a slug freezes the
first time the hopper is made public, permanently** (migration 0006, `slug_frozen`, latching —
un-publishing never clears it). The reasoning is that hoppers have **no discovery surface** —
no manifest key, no index page, and `export.ts` names slugs explicitly on the command line —
so `/h/{slug}/` is not one address among several, it is the *only* way anyone reaches a public
hopper, and every visitor got there from a link the author shared. Re-slugging would break all
of them silently. This also matches the project's standing posture that published things are
promises (pins, withdraw-not-delete). A never-public hopper still re-slugs freely, so the
common "created it as *Untitled*" case gets a good URL; a rename and publish in the same
request freezes the *new* slug, not the old one.

**Hopper UI** (least-developed studio surface, predating session 17's preview work): list rows
now carry item + source counts, the live public URL, and a three-item peek built from
**rendered HTML** via `previewFromHtml` — the session-17 rule, so no markdown markers or `[TK]`
scopes leak. Detail page gets an inline rename form, the public toggle (previously it told you
to go back to the list), and per-item source attribution with origin link and added-date.

**Respond-to-a-reading-entry.** Reading entries now carry `respond ↗` → `?respond=<sub>:<remote>`,
which prefills the composer with a citation line — `[title](url)` and a blank line — and
**nothing else**. Decision #12 forbids re-emitting an imported item, so the link is the
citation and the words are the author's; the page states that in prose above the textarea, and
a test asserts the imported body text never appears in the response. The source URL comes from
`sourceTitleAndUrl()`: the embedded anchor for L0 (which `l0.ts` itself rendered), the
constructed origin permalink for blyg-native. That permalink shape was **duplicated** in
`importer/pages.ts` — extracted to `blygItemUrl()` and shared, rather than writing a second
copy, which is the exact drift that bit `resolve.ts`/`feed.ts` in session 16 and
`preview.ts`/`markdown.ts` in session 17. Third instance of the same hazard; it keeps recurring
because the second copy always looks like one harmless line.

**A TODO that turned out to be mis-scoped, not untested.** "Hopper-based thread generation is
untested — never exercised end-to-end" describes a feature that **does not exist**.
`v0.2-plan.md` defers it explicitly: "v0.2 hoppers hold **imported items only**; v0.3 extends
membership to own items when threads compose from hoppers." `hopper` appears in `src/studio.ts`
only as a nav entry. Recorded as v0.3 plan scope (it needs the own-items-as-hopper-members
schema change first) rather than quietly built mid-v0.2.

**Testing-pass item (c) closed — a real cron-convergence cycle, observed.** Published a marked
fragment on `venkateshrao.com/blyg/` at 22:24:28Z; it appeared in
`blyg.protocol-institute.org`'s reading feed at **22:49:12Z — ~24m45s, with no manual
resync**, correctly attributed to "Venkatesh Rao's Blyg". That closes the last
implementation-independent item of the testing pass. The TODO's "publish, wait 15 min"
**understated the window**: 15 min is the *cron* interval, but `schedule.ts` makes a
subscription due only every `POLL_INTERVAL_MS` = 30 min ± 5 min of deterministic per-sub
jitter, so worst-case convergence is ~45 min — the observed ~25 min sits inside that, and a
15-minute check would have read as a failure. Corrected in the TODO.

**Verification:** 363 tests (was 338); `tsc` clean. The sort fix was driven against local
`wrangler dev` subscribed to the **real Contraptions feed** — the one that exhibited the bug —
and the reading order came back strictly chronological with own and legacy entries
interleaved. Hopper freeze semantics driven live too: renamed while private (slug moved),
published (froze), renamed while public (slug held), and the public page still 200s at the
original slug while the new name's slug 404s. The three reading-sort regression tests were
checked against the pre-fix code and all three fail there.

**Deployed to both nodes** via `deploy:all -- --migrate` (migration 0006 applied remotely to
both D1s, accounts pinned, all 5 live checks green per target). Worth recording: the first
run **halted at the migration preflight** with a Cloudflare `7403 — account not authorized` on
the personal account's D1 query endpoint. That was **transient** — `wrangler d1 list` against
the same account succeeded immediately after, and the identical `migrations list` command then
succeeded too. The protocol behaved correctly by failing closed and deploying *nothing*
(neither node), rather than proceeding on a partial preflight. Do not "fix" a 7403 here by
re-authenticating or editing account config before re-running the plain command once; the
config was correct throughout.

**Live confirmation of the sort fix:** `venkateshrao.com/blyg/studio/reading` now runs
strictly reverse-chronological with all four sources fully interleaved (own items, blyg
imports from the PI node, Contraptions, Simon Willison, Interconnected) — the clustering is
gone. The stored-date repair will heal each L0 row on its next natural poll; the display was
already correct without it, which was the design intent.

**The public page's version controls — Venkat reported dead rewind/forward arrows.** Worth
separating two surfaces that had drifted apart. Session 17 redesigned the **studio index**'s
version controls (`N versions · 📌 v1, v3`) and that shipped; the **public item page** still
carried the rev-3 scrubber `|< < v2 of 2 > >|` with all four buttons hardcoded `disabled`,
untouched since session 4 — which is exactly why it looked unchanged *and* didn't work.

They could never have worked. §2.8's session-5 decision is that **no route ever serves an older
version as an HTML page**, so the arrows point at nothing that exists or will exist; they were
an affordance advertising a capability the protocol had already ruled out. §2.8 even names the
replacement in its own prose — "the public page's version display is an indicator, not
navigation ... the right presentation is discrete pin citations (e.g. 'v6 · pinned: v2, v4')
linking to the existing `v{n}.json` files" — so the page was out of conformance with the spec
text it implements, and the open TODO for it had been parked behind "hold until TK-transclusion
+ subscribe/pubsub land," a condition that has since lapsed.

`itemMeta()` now renders `v2 · pinned: v1, v2`, each pin an anchor to its permanent version
file. Three behaviour changes beyond deleting the arrows, all of them things the old early-return
structure hid: a **pinned single-version item** now shows its citation (it previously showed only
"Created", so a v1 pin was invisible); a **withdrawn item** now shows its pins, which is the case
that matters most — surviving withdrawal is the entire point of a pin, so the endcap page is
precisely where a reader needs to be told what is still citable, and it previously said nothing;
and "Most recent" is now suppressed for single-version items, where it was only ever restating
"Created". Wireframes `public.html`/`thread.html` updated to match; `studio.html` was also stale
(still drawing the scrubber) and was corrected to the studio's *own* session-17 shape rather than
the public page's — they are deliberately different surfaces.

Verified live on real data after deploying: venkateshrao's two-pin fragment renders
`v2 · pinned: v1, v2` with both files 200, its four-version item renders `v4 · pinned: v3`, and
the PI node's pinned **thread** renders correctly at root mount. Locally, withdrawing a two-pin
item was driven end to end — the endcap page keeps both citations and both `v{n}.json` files
still 200. Static export is unaffected by construction: it fetches the live routes and writes
the bytes, so byte-identity cannot drift from a rendering change.

**Pinned-version HTML pages — decision #24 (Fable ruling; the model switch happened here).**
Venkat clicked the new pin citations and landed on raw JSON. That was §2.8 behaving as
specified — and also the *exact trigger* the session-5 ruling reserved: "a pinned-only HTML
route ... can be added post-v0.1 purely additively if demand appears." The sharper argument
than surprise: **a pin exists to be cited, and a citation shown to a human wants a page, not a
JSON file** — JSON-only made pins citable by machines and awkward for people, backwards for an
authoring medium.

The ruling (spec §8.4 rewritten; decision #24 in CLAUDE.md): a publisher MAY serve
`f/{id}/v{n}/` and `t/{id}/v{n}/` — the live permalink plus a version segment. Route shape
deliberately mirrors the permalink rather than sitting at `items/{id}/v{n}/`: `items/` is the
machine plane, `f/`·`t/` the human plane, and a citation URL you can construct in your head
from the permalink is the ergonomic point. Rules: gated exactly like the JSON file (404 unless
pinned, 200 forever once pinned, survives withdrawal — unpinned history stays unreachable in
every representation, so the session-5 worry about gutting withheld-unless-pinned stays dead);
content is the version's publish-time `content_html` verbatim (threads get the live thread
page's provenance injection, from the pinned version's own `transclusions`); presentation adds
a frozen banner, `rel="canonical"` to the live permalink, and a link to the `v{n}.json` twin —
human citation and machine citation one hop apart, each pointing at the other. Not a publish
event: no feed/archive/index membership, no manifest vocabulary; readers MUST NOT require the
pages. One subtlety worth recording: the **authored kind of the pinned version** picks the
route (`transclusions !== null`), not `item.kind` — a withdrawn item's kind is `'withdrawn'`
but its pinned v1 was authored as one or the other, and the same care applied to the live
page's citation links via a caller-supplied `isThread`.

Pin citations everywhere now link the pages: public version line, studio index chips, studio
history badge (the studio links were plausibly the exact ones Venkat clicked). The static
export mirrors each pin as two artifacts; an exported page was byte-compared identical to the
live route, so invariant 4 extends to pin pages. Root mount covered by a new mount test — the
PI node runs `MOUNT=""`.

Live-verified after deploy on real data: venkateshrao's two-pin fragment serves both frozen
pages (v1 shows the original one-line wording, v2 the expanded Knuth text — visibly different
content, which is the whole point); the 4-version item serves v3 and correctly 404s unpinned
v1; the PI node's pinned *thread* serves its baked transclusion snapshot at root mount.

**State after:** four of the five session-17 backlog items closed and the fifth reclassified as
v0.3 scope; the long-parked public-page scrubber cleanup done; pinned-version pages designed,
specced, built, live, and published to `blygger.org`; two studio bugs found by real authoring
fixed. Both nodes on migration 0006 and running this code. **The entire v0.2/TK testing pass —
(a), (b), (c), (d) — is closed**, which was the gate on the 0.2 spec draft. 376 tests, up from
338 at session start; `tsc` clean; both repos pushed.

Pattern worth carrying forward: **three separate "known" facts turned out to be stale or wrong
this session** — the reading-sort root cause (named a real field and call site, and was
nonetheless incorrect), the "Venkat hasn't authored with TK yet" status note (true when
written, repeated for two sessions after it stopped being true), and "pins are JSON-only,
period" (a real decision whose own escape clause had been triggered). Each took one command to
check against the live artifact and would otherwise have driven work in the wrong direction.
Checking beats inheriting, especially for notes about what a *person* has done.

**"I don't see a way to make a single imported item public" — one design answer, one real bug.**

The design answer: **there is no per-item publicity, deliberately.**
`curation-discovery-generation-proposal.md` §1 (locked as decision #12) rules that "make-public
means curation display only … **Retweet becomes curation (a list you keep), not speech (a thing
you said)**." A per-item public toggle *is* the naked retweet that decision rejected — and the
schema agrees: `hopper_items` has no public column, only `hoppers` does. Featuring one item
means a hopper containing one item; the list is the editorial act, even a list of one. The
session-17 TODO wording ("make one imported item public in a hopper") invited exactly this
misreading and has been corrected.

The real bug, and the actual reason Venkat couldn't find it: **`hopperPicker()` returned `""`
when the owner had no hoppers.** venkateshrao has zero, so its reading feed offered thumbs and
respond and *no route into curation at all*. Hoppers are the unit of publicity, so that picker
is the entry point to the entire public-curation feature — and it was hidden precisely at the
moment you had never used it. A cold start with no door. The picker now always renders and
carries a `+ create your first hopper…` option that creates one inline and adds the item in the
same gesture, so the first hopper is reachable from the item that prompted wanting it. Worth
naming the general shape: an empty-state that renders *nothing* reads as "this feature does not
exist," which is the most expensive possible way to be empty.

**Testing-pass item (b) closed while investigating.** The PI node already had two hoppers Venkat
made while testing, one of them public: `blyg.protocol-institute.org/h/ai-insights/` is live and
verified — an imported Matt Webb item rendered from the local snapshot with source attribution
and origin link, off-feed as decision #12 requires. The other, "Biology thoughts," had been made
public and then taken private, which incidentally confirms the session-18 `slug_frozen` latch
working on real data: it still reports its frozen ex-URL. So (b) needed surface verification,
not more curation.

**Two composer bugs found by Venkat authoring for real — the value of (d) arriving late.** He
reported "the TK markup got lost" and "there is no generate button in the in-feed composer."
Both traced to one handler. The composer's publish did `POST /api/items` (creating the draft
with the typed text) and then `POST /publish`; an unresolved TK scope correctly rejects
(decision #20 — publish never triggers generation), but the handler then called
`location.reload()`, which wiped the composer and dropped an unexplained new draft into the
list. **The text was never lost** — the live node still held it verbatim in that draft — but
nothing said so, which is indistinguishable from data loss from the author's side. That is the
general shape worth remembering: *a recoverable failure that doesn't say where the work went is
experienced as an unrecoverable one.*

Fixed by navigating to the created draft's editor instead of reloading: it is where the text
lives, and where the scope can be generated. For the missing generate button, the composer
deliberately does **not** grow a generation panel — generation is an explicit, author-reviewed
act (#20), and a one-line quick-post box is the wrong place to read a paragraph of generated
prose. It offers the door instead: a `generate in editor →` button that appears only once the
text contains `[TK]`, saves, and lands on the editor's TK panel (anchored `#tk`). The
compose-help line had also been telling authors to go find the editor themselves.

**The loop then closed on real content, by Venkat, unaided:** respond → bare link fragment →
add a TK scope → generate → publish. `0vc3pxtn…` is now v2 with `claude-opus-5` provenance at
23:44:39Z, published `content_md` marker-free, the `blyg-tk-gen` wrapper baked into
`content_html`, and the source link preserved — the exact respond→editorial-via-TK path the
design intends, exercised end to end without agent involvement.

**Testing-pass item (d) closed — by auditing the nodes instead of re-asking Venkat.** Venkat
pushed back on the repeated framing that he had not yet authored "something real" with TK. He
was right, and the framing was mine to fix: session 16's note ("an agent-picked instruction on
an already-existing draft, not Venkat's own authored content") was true when written and got
repeated for two sessions after it stopped being true. Enumerating every published item on both
nodes settles it: TK generation in a **fragment** (venkateshrao `5w1fd72f…`, `claude-opus-5`,
2026-09-11); TK generation in a **thread with two scopes** (PI `5zq1kdfptt…`, both generated
2026-09-12, ~4h before this session); **`![[id]]` source refs inside TK scopes** on both of
those scopes — `sources: [{id, version}]` alongside `transclusions: []`, which is the
decision-#20 quote-vs-source rule exercised on real authored prose, and the subtlest thing in
the grammar; and **verbatim transclusion** of two fragments in a thread (venkateshrao
`1vgtgz0g…`). The authoring already produced a locked design change — the session-16 balanced
grammar respelling came out of Venkat reading the parser while using it. Residual, explicitly
not a gate: no single *authored* item yet combines verbatim transclusion with TK generation
(session 14 covered that combination agent-driven). **The whole v0.2/TK testing pass is now
closed, which unblocks the ⚠️ FABLE `protocol-v0.2.md` draft.** General lesson: a status note
about what a *person* has done decays the moment they keep working; verify it against the
artifact before repeating it.

**Spec republished the same session** (`blygger-org`, latest mode): `sync_spec.py` picked up the
§8.4 rewrite, full rebuild, deployed, verified on both `blygger.org` and the pages.dev URL.
Worth recording because it exercised the publishing model's central claim: the **2026-08-10
dated snapshot still serves the OLD §8.4**, unchanged, while `/spec/0.1/` carries the revision —
frozen citable artifacts alongside a living document, which is structurally the same thing pins
are for items. Decision #15's snapshot machinery and decision #24's pin pages are the same idea
at two scales. No new snapshot cut: 0.1 stays DRAFT and living per #21/#23, and a dated
snapshot is a deliberate citation act (git tag + immutable URL), Venkat's call, not a
side effect of a spec edit.

**Open threads:** **the v0.2/TK testing pass is fully closed — (a), (b), (c), (d) all done — so
the ⚠️ FABLE `protocol-v0.2.md` draft is unblocked** and is the natural next session (Fable;
decision #23 makes it a standalone superset of the 0.1 text, after which 0.1 flips to
SUPERSEDED, and `spec-publishing-plan.md` §6 follows it). Open ergonomic question raised by
Venkat this session, deliberately not decided: curating a single item requires creating a
hopper, since publicity is per-list by decision #12 — a default "Links"-style hopper would be
a studio convention with no protocol implication, but it is a convention call, not a bug. The new hopper UI and the freeze rule are
untested by a human — worth a look while doing (b), since making a hopper public is exactly
the action that latches `slug_frozen`. Account-pinning generalization to
`venkateshrao-cloudflare/` and PI Workers projects still not done (from the session-17
incident). A local-dev subscription to the real Contraptions feed was left in place — useful
fixture data, since it is the feed whose RFC-822 dates exposed this bug.

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
