# Opus brief — the standing queue for an implementation session

**Written:** session 31 (2026-10-03), by Fable 5.1, replacing the session-28 brief after
Kyle Mathews' phase 3 was ruled (#52) and two queue items shipped. **Session 33** (same
day, Fable) inserted item 5, fork flattening (#57); items 1–4 shipped in session 32.
**Session 40** (2026-10-07, Fable) added the official-blyg section below (#66–#68).
**Session 58** (2026-11-03, Fable) added the mods-mechanism section (#89). **Session 60**
(2026-11-05, Fable) added the RFC-close section (#90–#94) and unblocked session 40's item e. **Session 61** (2026-11-07, Fable) added the Shelf section (studio#137). **Session 74** (2026-11-18, Fable 5.2) added the `/changes` and fold-by-link section (#111, #112). **Session 78** (2026-11-21, Fable 5.2) added #114–#116, which is first. **Session 64** (2026-11-09, Fable 5.2) added the tn-4 and `syndication` section (#98) and the pointer to the Level 3 research brief (#99). **Rewrite this file when the queue changes materially.** It is where an Opus or Sonnet
session starts (`CLAUDE.md` → At Session Start, step 4).

> **Read first:** this brief → `CLAUDE.md` locked decisions **#52–#57** (sessions 31, 33) and
> **#30–#51** (dense; the reasoning is in `v0.3-plan.md` §8c and `v0.4-plan.md`) → the
> latest `DEVLOG.md` entries → [`blygger-studio/CLAUDE.md`](../../blygger-studio/CLAUDE.md)
> backlog, which carries every build task below with its fixed shape. **The Studio is a
> React SPA since 0.10.0**: a queue item's UI half lands in `src/ui/` over an SDK route,
> adding to `src/contract/` when the route is new (`npm run sdk:generate`; CI fails on drift).

## Running beside a Fable session — file ownership

Two sessions may be editing this program at once. The partition that worked in session 27:

- **Opus owns** `blygger-studio/`, `blygger-com/`, `blygger-org/` — code, their
  `CLAUDE.md`s, `CHANGELOG.md`, releases, deploys.
- **Fable owns** `blygger-spec/` during a Fable round: `docs/protocol-v0.3.md`,
  `docs/v0.4-plan.md`, `docs/fable-brief.md`, this file, `CLAUDE.md`'s locked decisions
  and doc map. **Do not edit those while a round is live.**
- **Opus writes into `blygger-spec/` exactly two things**, pulling first each time: its
  own `DEVLOG.md` entry, titled `## Session N (parallel, Opus) — …` and placed above the
  Fable entry of the same session; and ticks on its own items in `CLAUDE.md`'s TODO and
  carry-over lists. Nothing else.
- If a build finds the spec wrong or silent, **run the four-question test** in
  `CLAUDE.md` § Model routing (decision #58). Reversible and settled by a citable
  principle: rule it yourself, record it as the next numbered decision with the
  `Fable review pending` label and the reasoning in `v0.4-plan.md`'s rulings section,
  and build. Otherwise record it in your devlog entry's open threads and, if it blocks,
  stop and tell Venkat — a Fable round can rule the same afternoon. **During a live
  Fable round, add decisions only by appending**; the list is the one shared surface.
- Deploys authenticate with `wrangler login`, not the registry tokens
  (`docs/deploy-protocol.md` § Authentication); unset `CLOUDFLARE_API_TOKEN` first.
  `deploy:all` is blocked in auto mode — use `deploy:vgr` / `deploy:pi` and verify
  each node by hand. Migrations: apply by hand before a dev-server smoke test.

## Not yours: the write surface (2.9)

**Kyle Mathews builds token auth, OAuth-style minting and the MCP server** in his phase 3
(`blygger-studio/docs/migration.md` §3), ruled session 31 (#52). Do not start tokens,
scopes, CORS or discovery. **Your part is review:** when his PR lands, check it against
the four invariants in `blygger-studio/CLAUDE.md` § `/api` (one token model with a
mint-and-paste path; no `.well-known`, no manifest key; a read scope and a distinct publish
verb, no refresh-only scope; MCP = same operations and scopes, provenance recorded). Merge
when it passes; flag to Venkat if it wants something outside them. `tn-4` is yours to
draft from his build once gate G3 opens.

## New from session 78 (2026-11-21, Fable 5.2) — #114, #115, #116; do these first

Rulings and reasoning: `CLAUDE.md` #114–#116, [`v0.4-plan.md`](v0.4-plan.md) §28, spec
§5.7 rule 10, §10.2 and §16.15 (the twentieth revision).

- **a. The list bake (#114, ROADMAP row 136; studio `src/transclusion.ts`).** In the
  partial branch, map each line of `selector.exact` to the block of the target's
  `content_html` it lies in. A line inside an `<li>` bakes as `<li>` in a `<ul>` or `<ol>`
  like the target's; consecutive lines from one list share one container; nesting is kept
  when both lines are in the selection; an `<ol>` whose first baked item is not the list's
  first carries `start`. Everything else stays `<p>`. Text stays plain and escaped. The
  structure comes from the target only: do not read the quoter's markers, and a mismatch
  is not an error. **Assert the invariant in a test:** `selectionText(bake) ===
  selector.exact`, for list and paragraph bakes alike. Preview, `fork-flatten.ts` (a baked
  `<li>` flattens as a markdown list item in the blockquote) and `stub-quote.ts` follow.
  **Sanitizer:** admit an integer `start` on `ol` in `src/importer/sanitize.ts`; it is
  dropped today, which misnumbers whole quotes too. Update the reader-suite fixtures that
  assert the `<p>` shape with Aneesh (`conformance/reader/`), keeping a `<p>` fixture: the
  list shape is a MAY. **Gate for promoting §16.15** (yours under #58, Fable reviews): one
  node bakes a list quote, a second imports and shows it. Then §5.6's "from its baked
  paragraphs" becomes "from its baked content".
- **b. Corrections and the spellcheck extension (#115; studio#155, #156, #159).** A
  correction the author accepts goes into the text bare: no `impyrt`, no `generated[]`
  entry. The AI proofread may offer **only corrections** (prompt it so, and refuse a
  suggestion that changes more than the corrected words: a rephrase is composition and
  must go through `[TK]impyrt` or the generate endpoint). Offer a line for the changelog
  note ("Proofread with {model}; {n} corrections accepted"), drafted, editable, never
  required, and in words only. Revise `docs/mods.md` "Model text is disclosed" and the
  #113 MUST to the same boundary: text a model *composes* is disclosed; corrections are
  not model text. No `edited` member anywhere, in any spelling, including under `ext`.
  Reply on blygger-spec#36 with the ruling and close it on Venkat's word.
- **c. RFC-8 draft, editorialized quotation (#116).** `docs/rfcs/rfc-8-editorialized-quotation.md`,
  not `docs/notes/`. Hold the three conditions of #116 exactly; work Venkat's Cato example
  through, including the unmarked "Carthago" that condition 2 refuses. Propose answers to
  §28.3's open questions (marker name and element, marks across block boundaries,
  machine-written marks against #102, §5.6 flattening, the grammar an author types and a
  source that itself contains brackets or an ellipsis). Measure first: how many live
  blygs bake partial quotes, and what their bakes look like. Hand to Fable to edit before
  it publishes (`rfc-publish-sequence`).
- **d. Background 4b's two fixes** (`background-plan.md` §7.2, review outcome): the toggle
  that lets the owner turn off the disagreement default (a `bg_rules`-style boolean, on by
  default, shown only under a written instruction; off, the model's label decides and no
  disagreement is recorded), and the owner's instruction placed first and delimited in
  `instructedState`. Then the Settings list of disagreements when its read route is worth
  adding.
- **e. TN-8 v2** is in `docs/notes/`; republish with `publish_blyg.py --only` (dry run
  first) and redeploy blygger.org. RFC-5 is promoted as **tn-10**.

## New from session 74 (2026-11-18, Fable 5.2) — `/changes` deprecated (#111), the fold by link (#112); do these first

Decisions #111 and #112, reasoning in `v0.4-plan.md` §27, the eighteenth revision (§13.7).
Already done in the ruling session: the reader's text test for imported items (studio
`2a6d2cc`, pushed, **not deployed**), the reply to Kyle on studio#152 with the five
conditions, and one test-only commit on studio#88 (`87e2091`).

**a. Deploy and release 0.63.0.** The order is fixed by #111's condition 5: main ships
first, Kyle renumbers behind it.

1. Deploy `2a6d2cc` to venkateshrao (`npm run deploy:vgr`; no migration beyond 0048, which
   is applied there).
2. Release prep: contract 5.12.0, SDK 0.18.0, CHANGELOG with **Migrations 0047 and 0048**
   named. Run `release:check` before tagging; check the Release run after the tag.
3. Roll out to PI and blygger.org (migrations 0047, 0048, then deploy). New Nature is its
   own project's. The syntax page and `docs/` already describe `![[+ text]]` and
   `[[+ text]]`; the CHANGELOG entry says that a placeholder folds only when it says no
   more than its link (#112).

**b. tn-4, a dated revision under #90.** §3's "Polling, not webhooks" paragraph names
`GET {mount}/api/changes`. Revise it to: a tool polls the resources it needs with
`If-None-Match` and reloads on a `200`; `/changes` is deprecated and goes two releases
after the release that ships conditional reads. **Do this when #152 merges, not before**:
until then `/changes` is the only mechanism a released studio has. Fable reviews in batch.
The same trigger covers #89's wording in `CLAUDE.md` ("polling `/api/changes`" becomes
"polling the resources") and `blykker/CLAUDE.md` line 68.

**c. Review studio#152 against #111's five conditions** when Kyle has revised it. They are
the checklist, as #52's four were for the OAuth PR: (1) `/changes` and `getChanges` answer
unchanged, deprecated in OpenAPI and the SDK; (2) a minor contract bump, 6.0.0 kept for
the removal; (3) docs say validators are opaque and `conditionalReads` is optional; (4)
`docs/mods.md`, `docs/where-does-it-go.md` and CHANGELOG updated; (5) renumbered behind
0.63.0 and rebased on main. Then record the removal as a dated ROADMAP row: two releases
after the one that ships #152. Anything the PR does beyond the conditions that touches
the contract's shape comes back to Fable.

**d. Review studio#151** (oracle suites onto `@tanstack/oracles`, +43k lines) after 0.63.0
is cut, as a tooling change. Three things to settle, the first two Opus's own under #58:
whether a dependency pinned to a GitHub commit is acceptable in the dev toolchain (the
no-vendoring ruling covers client-side JavaScript only, pending-calls #15); that
`npm test` stays what an operator runs on their own install, with repository guards in CI
(`check:template`'s rule); and, before the merge, that nothing of Venkat's still calls the
host-root `venkateshrao.com/api` alias the PR removes. The removal itself needs no ruling
(its window ran out two releases after 0.49.12) and wants its own CHANGELOG line.

**e. studio#88** (Shannon). CI on `87e2091` was running at hand-off. Green: it is ready
for Venkat's merge call. The `mobile-webkit` project was removed because WebKit never got
past login on the suite's plain-http server; the cause (the Secure owner cookie) is
inferred, not confirmed. If Shannon's phone test shows the toast staying up after a tap
on Safari, the fix is in `src/ui/sheets.tsx`'s `ToastHost` (Base UI's viewport pauses on
`mouseenter`; ignore the compatibility mouse events that follow a touch), and a WebKit
project needs the suite served over https first.

**f. The conformance clause register is stale.** `conformance/clauses/build.py` rewrote
`decisions.json`, `ids.lock.json` and `out/` by several thousand lines when run for the
eighteenth revision, far more than one revision accounts for; the run was discarded. Find
the last revision it was built for, rebuild, read the diff for ids that moved (the lock
exists so they do not), and commit it by itself. Two override strings match nothing
("it MUST NOT silently convert the subscription", "import the entries as L0 wrapper
rows"): fix or drop them. §13.7 gains one MAY and one SHOULD in this revision.

**g. Carried from the session-74 list, unchanged:** the notices view (row 77's remainder:
`link` notices shown apart from responses in Signals); tangling leftovers (plan §2.4's
notice naming a part whose directive was deleted, the stub-quote edge, plan §4.4
conformance fixtures, a two-node check that a tangle and a placeholder fold on a
subscriber and that a seconds-apart chapter does not); record the reader suite's 100 of
100 in `conformance/reader/out/`; the blygger-org deploy (Soapbox 0.1.6, the spec's
seventeenth and eighteenth revisions, ROADMAP rows).

## New from session 73 — a starter guide for developers: where does my change belong? (hackathon, week of 2026-11-23)

**Venkat's ask.** New developers arrive at a hackathon next week. They need one
starter document that makes them disciplined about *where* a change goes: a local
change re-applied at each upgrade, a pull request to the Studio, an extension, a proper
mod like blykker, or a request for a spec ruling, **with a test for picking each**.

**What exists, so it is not rewritten.** `blygger-studio/docs/mods.md` (three surfaces,
the bar a hook must clear, how blykker's five hooks fared, two promises),
`docs/extensions.md` (slots, writing one, security model), `docs/extension-vendoring.md`,
`docs/client-access.md` and `docs/api.md`; blykker's `README.md` and `PLAN.md`; the
spec's `proposal.yml`. **What is missing:** one page that covers every route and tells
a newcomer which to take; any `CONTRIBUTING.md` in either repository; anything on
local changes; a first-hour path.

**Deliver** (studio repo, by 2026-11-20 so Venkat can read it before the event):

1. `docs/where-does-it-go.md` (name is yours), 1,500 to 2,000 words, written for
   someone who has never seen the code. It links to the documents above and does not
   repeat them.
2. A short `CONTRIBUTING.md` in `blygger-studio` and in `blygger-spec` that opens with
   the decision list and points there.
3. Links from the README and from the top of `mods.md`.

**The ladder, cheapest first.** Each rung with its test, an example that exists, what
it costs the developer, and what it costs everyone else. Put the tests as questions a
developer answers in order, stopping at the first yes:

| # | Question | Then it is | Goes to |
|---|---|---|---|
| 1 | Would it change bytes another blyg or reader receives (an item document, the feed, `blyg.json`, `content_html`), or would another client have to change to work with it? | **A spec question.** Nothing is built until it is ruled | An issue on `blygger-spec` (`proposal.yml`); Venkat routes it to a Fable round |
| 2 | Is it a bug, or something every blyg would want with no setting? | **A pull request to the Studio** | `blygger-studio` |
| 3 | Can it be done from outside, on a token, through `{mount}/api` and Settings, with no code inside the Studio? | **A tool or configuration** (mod surface 1) | Your own repository |
| 4 | Is it interface for one owner, in the browser, in a slot that exists? | **An extension** | In-repo, or your repository and vendored |
| 5 | Does it need a slot or setting the Studio lacks, in a form any blyg could use? | **A hook, proposed upstream** | A pull request, against the bar in `mods.md` |
| 6 | Is it several of 3 to 5 together, making a kind of blyg (a book, a course, a lab notebook)? | **A mod**, like blykker | Its own repository |
| 7 | Does it only make sense on your node (your branding, your infrastructure) and have no general form? | **A local change** | Your deployment; see below |
| 8 | Does it need to change what the Studio is? | **Another client** | A fork, under the README's fork section |

Points each rung must cover:

- **Rung 1 is first on purpose.** Most hackathon ideas that sound like features are
  wire changes (a reaction, a tag, a reply, a count, a new field). Say so plainly, list
  the refusals people will hit in the first hour (`protocol-v0.4.md` §16.8; no metrics
  and no identity on the wire), and say that a well-argued case is welcome and several
  have won. **What a page looks like is not a spec question** (#108): it is a theme, a
  mod or the Studio's own style (`docs/studio-style.md`, draft).
- **Rung 2: "the Studio should be boring."** It is the reference client. A pull
  request that adds an opinion gets asked to become an extension. Say what review
  looks like, that a PR description may carry instructions for the reviewer, and that
  `npm test` and `check:template` must pass.
- **Rungs 3 to 5** restate `mods.md` in two sentences each and link. Add the three-part
  bar for a hook as a checklist: general, wire-silent, reads only on the server.
- **Rung 6: what makes something a mod and not a pile of settings.** Use blykker: a
  config file and a tool first, extensions second, hooks proposed upstream third, and
  the two promises (the generator string stays the Studio's; not forking is the mod's
  own promise).
- **Rung 7, local changes: make the existing practice easy** (Venkat, session 73:
  "People seem to be doing random patches anyway and procrastinating on upgrading to
  save rework. I'd like some simple hygiene rules that make it easy to upgrade
  versions without losing harmless local patches"). See the section after this list.
- **Rung 8** is two sentences and a link. Becoming another client is fine.

**Also in the page:**

- **A first hour.** Clone, install, run locally, publish an item, turn on the
  `example` extension. Include the traps this machine has taught us: apply D1
  migrations by hand before `wrangler dev`; fresh installs may need
  `--legacy-peer-deps`; e2e on its own ports. Verify every command on a clean
  checkout; do not write it from memory.
- **Never develop against a live blyg.** A scratch database and local dev. Extension
  code runs in the owner's session and can publish and mint tokens, which is why
  nothing loads at run time.
- **A ready hackathon idea for rung 4: suggested edits** (decision #110, `v0.4-plan.md`
  §25, `backlog.md` §2). The protocol needs nothing new: an extension offers "suggest
  an edit" (fork and edit, or a stub with quoted passages) and a view that shows
  incoming `fork` mentions as diffs against the owner's own pin. It is also the best
  worked example of rung 1 answered "no": it sounds like a wire change and is not.
- **Five or six starter ideas, one per rung,** so people can see the ladder applied:
  for example a tool that imports a folder of notes (3), a reading-view extension (4),
  an owner stylesheet hook if it is still open (5), a wire idea written up as an issue
  and not built (1).
- **Working with an AI agent:** point it at `AGENTS.md` and this page; the same ladder
  applies to what an agent proposes.
- **Where to ask**, and how an accepted idea gets a ROADMAP row.

### Local patches: the hygiene rules, and the small tooling behind them

**The fact to build on.** A source installation's `npm run upgrade` already merges the
newest release tag into the operator's checkout and keeps `wrangler.jsonc` on conflict
(README, "Upgrade a source installation"). So a patch kept as a commit already
survives an upgrade unless it conflicts. Nothing new has to be invented; the practice
has to be named, made visible and made cheap. A Worker-archive installation has no
source and cannot carry a patch: say so, and say that moving to a source install is
the first step for anyone who wants one.

**The rules for the page** (seven, short; reword freely, keep the substance):

1. **Try the places that are not patches first.** Settings, a theme, the `.local`
   files (`extensions.local.json`, `models.local.json`, `wrangler.private.jsonc`), an
   extension. They survive every upgrade by construction.
2. **One patch, one commit, on your own branch,** with a message that starts `local:`
   and says why in a line. Never uncommitted, never a stash: a stash is how a patch
   is lost.
3. **Add, don't edit, where you can.** A new file never conflicts. An edit to a shared
   file should be as few lines as possible, with no reformatting around it.
4. **Harmless means three things.** It does not change what the blyg serves to others
   (item documents, the feed, `blyg.json`, `content_html`). It adds no migration and
   changes no table. It does not rename the client (`generator`). A patch that fails
   one of these is not a local patch: the first is a spec question (rung 1), the
   second will collide with the next upstream migration number, the third breaks the
   census and update notices.
5. **Every patch names its exit:** the upstream issue or pull request it is waiting
   for, or one line on why it will never be general. A patch with an exit is a bridge;
   one without is a fork in slow motion.
6. **Upgrade often.** Each release merged is a small conflict or none; five at once is
   an afternoon. Security fixes arrive only by upgrading.
7. **Tell us what you patched.** One standing issue on `blygger-studio` where
   operators list their local patches. The program adds hooks on measured need (#89),
   and this is the measurement: the same patch on three nodes is a hook.

**Tooling, small, in this order. Stop when the hackathon date arrives.**

- **`npm run patches`**: list the local commits since the installed release tag (the
  `local:` ones and any others, which it flags as unlabelled), each with the files it
  touches. Read-only.
- **A warning, not a refusal**, on any local commit that touches the paths rule 4
  names: `migrations/`, the bake and the feed and manifest emitters, the generator
  string, `src/contract/`. Name the paths in one list in the script. Warn and carry
  on: the operator may know better, and a guard that blocks gets bypassed.
- **In `npm run upgrade`**: before the merge, print that list; after it, say which
  local commits conflicted and in which files, and stop for the operator to resolve.
  Today it says only "commit or stash local changes first".
- **Stretch, only if cheap:** a `patches:check` that exports a fixture blyg with and
  without the local commits and compares the published bytes, which turns "harmless"
  from a path list into a proof. `scripts/export.ts` and the feed fixtures are most of
  it. Do not hold the page for this.

**Not a `patches/` directory of diff files.** Diffs rot against a moving tree and are
harder to carry than commits, and the upgrade is already a merge.

**A patched Studio says so, in the Studio and not on the wire** (Venkat, session 73).
`generator` stays `blygger-studio/x.y.z`: the census and update notices parse it, and
rule 4 forbids renaming. The Studio's own Settings page shows the count of local
patches ("3 local patches", from the same list `npm run patches` prints, baked at
build), and the bug-report template (`.github/ISSUE_TEMPLATE/bug.yml`) asks for it.
Nothing about patches appears in `blyg.json`, a feed or any public page.

**Not in scope:** new extension slots, a registry (#89 stands), any change to
`mods.md`'s rulings.

**Fable's part:** none needed to write it. The ladder is from #58, #89 and #108, and
the patch rules are studio practice. Bring back only what turns out to reach the wire.

## New from session 73 (2026-11-16, Fable 5.2) — the public responses count (#107)

Read `CLAUDE.md` #107 and `v0.4-plan.md` §24.1 first. A studio build, with the
studio-private counts and the Responses tab, which were already yours (§13.7). No
migration is expected and no contract change for the public half: it is page chrome.
**Only point 2's first half is protocol** (no count in a document or feed, §16.8). The
rest is the studio's own style (#107, #108): build it as the default, and do not write
it up anywhere as a rule for other clients. Each point with the test that proves it:

1. **The count is the length of the list the page renders.** Compute it from the same
   query that draws the public responses list (verified, unhidden, the item's list
   switched on), never from a second query. *Tests:* list off, no count anywhere; three
   responses with one hidden shows 2; hide another and it shows 1; hide the last and
   the count is gone (no "0 responses").
2. **Text for people, never data.** The count appears as visible text only. *Test:* for
   an item with responses, the number is absent from the item document, the pinned
   version document, `blyg.json`, `items.json`, the feed and every hopper feed; the
   page carries no `data-` attribute, microformat class, JSON-LD or meta tag holding
   it. Add the check to `check:template` or the page tests so a later theme change
   cannot add one.
3. **Nothing public is ordered or selected by it.** No sort, filter, badge or section
   on a public page keyed on the count. Nothing to build; say so in a comment where the
   count is rendered, since that is where someone will be tempted.
4. **No totals, no tallies.** No sum on the front page or the about page, no count
   beside a responder's name.

**Where it shows:** the item's page (beside the responses heading or its anchor link),
and any list on the same origin that shows the item: front page, archive, a thread
quoting it. **Not** on a curation display of an imported item (§13.5, #41). Wording is
yours; "3 responses" linking to the list is the plain form. An owner's theme or mod
may do what the default does not.

**Studio side** (no ruling needed, recorded so the two halves agree): own posts count
verified responses plus local ones; others' posts count responses among the blygs the
owner reads. The two numbers may differ from the public one and from each other. Do
not label them alike if they sit near a public preview.

**Hand back:** the release note, and one look by Fable at a live page's source against
point 2. Reply on nothing: there is no issue for this; add ROADMAP row 127's
version when it ships.

**Also confirmed this round (§24.2):** your `@supports (overflow-clip-margin)` deviation
on studio#149. Nothing to change.

## New from session 56 (2026-11-01) — three rulings, do these before the queue below

Decisions #86–#88 (`CLAUDE.md`), reasoning `v0.4-plan.md` §16, text in the spec's seventh
0.4 revision (§16.12, §16.13 ruled shapes; §4/§6.1/§12.1/§12.2/§15.4 for #87). Each has
a build gate; when the gate has run, promote under #58 (move the text, fix cross-references,
add the §17 line, record the build's calls) and Fable reviews in batch.

- **w. Hopper feeds (#86, ROADMAP row 96).** *Done session 57: studio#84 merged and released as 0.50.0, gate run venkateshrao → protocol-institute, §16.12 promoted (eighth revision). Left: tell the World Machines bridge.* Review Aneesh's draft
  [studio#84](https://github.com/blygger/blygger-studio/pull/84) against 0.4 **§16.12**, not
  against the proposal: the differences are identity = (origin, the feed's *resolved absolute
  URL*); no item document ever names a hopper (check nothing writes membership into an item
  document or its `author`); a reader MAY show an entry once when it already holds the
  linked item; everything else is as he proposed. Ship behind the `hopper_feeds` setting,
  off by default. **Gate:** one node emits a hopper feed, a second node subscribes to it by
  pasting the hopper page URL (step 7 through the studio's resolver), an entry disappears
  when a member is removed, and a whole-blyg subscription to the same origin is unaffected.
  Then promote §16.12 into §2, §4, §6.1, §12.1 step 7, §12.2 and §13.5 (the "no manifest
  vocabulary" sentence becomes "no protocol surface beyond the `hoppers` list and a hopper
  feed"). Reply on spec#18 and studio#84 when shipped; tell the World Machines bridge.
- **x. The fixed name at every identity (#87, row 97).** No studio change (it serves
  `blyg.json`). Conformance toolkit: the fixed-name probe at the identity origin is a MUST
  clause at the next clause build (item f). blygger-com's vendored resolver already probes
  it. The reply on spec#21 is Fable's; close it once blygger.org has redeployed.
- **y. Origin succession (#88, row 98).** Three parts, in this order. (1) **Receiver:** a
  `moved_from` array in the manifest (settings: "this blyg moved from…", origin strings,
  validated as §12.2 identities); `targetItemId` and `relationTo` in `src/mentions/` accept
  a target or reference origin that is one of the node's own former identities, matching the
  target after substituting the node's identity for the former prefix. (2) **Reader:** on
  each manifest poll, when the final fetch URL's identity differs from the subscription's
  and the response was a 301/308 chain, record a move candidate; if the manifest fetched
  there lists the subscription's identity in `moved_from`, show "X now lives at Y — follow?"
  on the subscription in Sources (Florian's shape); *follow* re-keys the subscription to the
  new identity and carries hopper memberships, signals, read state and browsing history for
  every item the new origin serves (`deleteSubscription` today deletes `hopper_items` and
  `signals`, which is what session 55's manual D1 fix for Venkat's thread worked around);
  items only the old origin served stay with the old identity under a closed subscription
  or go — your call, record it. Without the acknowledgement, show the discrepancy only.
  Never adopt silently. (3) **Sender:** nothing required; MAY re-send a thread's mentions
  after a follow. **Gate:** Florian's node declares `moved_from`, Venkat's stub of
  `2dnhvp468rf1j2szn3968vtdgn` verifies at `blyg.florianlohse.com` (it currently fails
  400), and one reader is offered the follow. Then promote §16.13 into §6.1, §12.2, §15.3
  and §15.4. Reply on studio#102 when shipped. **blygger.com:** the directory lists
  Florian's old and new origins as two blygs (both in `blygs.opml` on 2026-11-01); the
  same two signals — the old manifest's permanent redirect plus `moved_from` on the new —
  should fold them into one listing under the new origin; file it on blygger-com.

## New from session 52 (2026-10-20) — one small item, do it with the next studio release

Decision #84 on [blygger-spec#17](https://github.com/blygger/blygger-spec/issues/17)
(Robert Peake): §15.3 step 1 now says a mention target MUST resolve, by the receiver's own
published data, to one of its items — its `page`, its item document or a pinned version's
document or page — and that location is not the test. Text in `protocol-v0.4.md` at its
fifth revision (committed; deploy when Venkat says), reasoning in `v0.4-plan.md` §15.

- **u. Mention targets by membership** (#84, ROADMAP row 88). In
  `src/mentions/receive.ts`, `targetItemId` accepts `f/{id}/`, `t/{id}/` and
  `items/{id}.json` under the mount; add the pinned-version document
  (`items/{id}/v{n}.json`) and, if the studio serves §8.4 pinned pages, that page shape
  (`f/{id}/v{n}/`, `t/{id}/v{n}/`), each resolving to the item id — the mention is
  recorded against the item, never a version. Rewrite the comment above the prefix check:
  it cites §15.3 step 1 as "the target lies within our full origin", which is no longer
  what the clause says; the prefix check is this client's membership test only because the
  studio never relocates its surface or emits an absolute `page`, and a client that does
  either must resolve against its own `page`, `item` and `pin` values instead. In
  `blygger-spec/conformance/alloy/checks.py`, the `fable` text of check 7 says §15.3's
  target check "has the same scheme/host/port shape and should be read the same way" —
  amend it to say the target side was ruled membership, not location (#84). C-15.3-01
  re-extracts at the next clause build (item f). *Acceptance:* a Webmention naming
  `{origin}items/{id}/v1.json` for a pinned own item is 202 and verifies against the item;
  one naming an unpinned `v3` or an unknown id is 400; one naming another blyg's page is
  400; `test/mentions.test.ts` pins all three. Reply on #17 when the revision is live
  (version, commit, behaviour change) and close it. *Built session 52: studio 0.48.1.*
- **v. Sender fallback target is the item document** (#85, ROADMAP row 88; Robert Peake's
  follow-up on #17). `remotePermalink` in `src/mentions/send.ts` builds `f/{id}/` or
  `t/{id}/` via `blygItemUrl` when it lacks `page`, assuming "fragment" when the kind is
  unknown — which a 0.48.1 receiver now refuses for a thread, and which Soapbox refuses
  always. Spec §15.2 (sixth revision): `page` when held, else the target's item document
  through the target origin's `item` template (default `items/{id}.json`); never the
  convention. The studio holds a subscription's manifest (check where `item` templates are
  stored for the importer — `resolve.ts`/`subscriptions`); for a target with no stored
  manifest, fetch `{origin}blyg.json` once (endpoint discovery does this anyway) and
  default when absent. Receiver unchanged. *Acceptance:* a mention to an imported item with
  `page` still targets the page; one to an item whose import has no `page` targets
  `{origin}items/{id}.json` (or the templated address when the origin's manifest has
  `item`); no code path emits `f/`/`t/` for a target without `page`;
  `test/mention-delivery.oracle.test.ts` or `mentions.test.ts` pins both. Release as
  0.48.2 (no migration) and deploy with 0.48.1 in one `deploy:all`; then close #17 naming
  both versions.

## New from the session-50 Fable round (2026-10-19) — do these before the queue below

Decisions #79–#83, text in `protocol-v0.4.md` at its fourth revision (committed, not
deployed), reasoning in `v0.4-plan.md` §14. Letters continue CLAUDE.md's TODO list.

- **n. Drop the `ignyr` token rigging** (#83). No word in a changelog note has wire
  meaning, and the studio must neither write one at readers nor parse one. If Venkat wants
  the author-side lever now, build **held revisions**: an edit to a published item that the
  author marks as not worth an event stays a visible pending draft until the next publish.
  Zero protocol bytes.
- **o. Disclosed links** (#79, row 77). At publish, each resolved `[[id]]` produces a
  `links[]` entry `{id, origin?}` (origin only when remote; no version). Outbound: remote
  entries join `remoteReferences()` in `mentions/send.ts` with `targetVersion: null`.
  Inbound: `mentions/receive.ts` derives `link` after `source`, and stores the class.
  Signals UI: notices (links, reposts) never appear in the responses list; a separate
  "linked from / reposted by" section or filter, low priority. The markdown link
  `[text](url)` stays silent and must not be scanned. *Acceptance:* a fragment with one
  remote `[[id]]` publishes with `links[0].origin` set, the far node records a verified
  `link` held apart from responses, and a markdown link to the same page produces nothing.
- **p. Repost classification** (#80, row 78). After the relation is found, strip
  directive lines, attached `>` selections, labels and whitespace from the fetched
  `content_md`; empty means repost, class notice, relation unchanged. The repost action's
  help text says the target sees a repost, not a response. *Acceptance:* a lone
  `![[id]]` stub verifies as `stub` on the far side and lands with notices; add one
  sentence and republish, and it moves to responses.
- **q. `data-blyg-label`** (#81, row 79). Bake the directive's label as an attribute on
  the `blyg-transclusion` blockquote (HTML-escaped, verbatim); the page renderer, the
  imported-item renderer and `fork-flatten.ts` use it as the attribution anchor text when
  present, host · v{n} otherwise. Never as the target's title anywhere. *Acceptance:* a
  labelled directive bakes the attribute, the far node's reading view shows the label in
  its attribution line, a fork of the thread flattens to `— quoted from [label](page)`.
- **r. Near-sameness** (#83, row 82). In the importer, before overwriting a row, measure
  the change between the held `content_md` and the new one; under the studio's threshold,
  route to ignyr exactly as same-hash does. Threshold in the studio docs, small, never on
  the wire or in the API. *Acceptance:* a one-character typo fix on the far node arrives
  in ignyr; a rewritten paragraph arrives as new.
- **s. Stub from anywhere** (#82, row 80). Plan first, build after Venkat sees the plan:
  a one-off snapshot store (`imported_items` is keyed on `subscription_id`; nothing polls
  one-offs, so retention is yours to design), a deep link that takes a URL, resolves it
  (`importer/resolve.ts` for the origin, the page's JSON alternate for the item), stores
  the snapshot and opens the stub composer; `{url}` stub with `cited` for the plain web;
  a Web Share Target in the manifest; a bookmarklet in Settings. Protocol §10.2 step 2
  already permits it. Do **not** add a "stub this" link to public pages — that half is an
  RFC (row 81), item t.
- **t. Draft RFC-4 — responding from anywhere** (#82, row 81; Venkat reassigned it from
  Fable, session 50). Source: spec §16.11, plan §14.4, the session-50 devlog. What it has
  to settle: how a "stub this" link on any blyg page reaches the reader's own studio with
  no shared server — the received pattern is a registered `web+blyg:` handler
  (`navigator.registerProtocolHandler`, which permits `web+` schemes) that the studio
  registers on login, carrying the item's page URL; a Mastodon-style remote-interaction
  dialog ("enter your studio address") as the fallback where no handler is registered;
  what the deep link's query carries (the URL only — the studio resolves it; never an id,
  never content); and what a page shows when it offers the affordance (not "respond",
  per #27/#50 — `stub ↗` is the one word). Survey what Mastodon, Bluesky and the IndieWeb
  web-actions effort did and why web actions failed. Write it in `docs/rfcs/` as RFC-1 and
  RFC-2 are written, with reference constants where there are any. Hand to Fable to edit
  and rule before it publishes on blyg.blygger.org with a comment period; do not add the
  affordance to any page before then. **Add the case ksurya raised on blygger-spec#15
  (2026-11-02, forwarded by #92 C5):** accepting webmentions from places that are not
  blygs, such as replies to a post on Twitter — §15.6's trackback class is the constraint
  the RFC has to answer.

## New from session 69 (2026-11-13, Fable 5.2) — mathematics (#105, sixteenth revision)

Read `CLAUDE.md` #105 and `v0.4-plan.md` §23 first. A studio build, on a branch from
`main`, for 0.59.0. **Fable reviews the `src/importer/sanitize.ts` diff before it
ships**; say so in the PR. The invariants, each with the test that proves it:

1. **Syntax is pandoc's `tex_math_dollars`, and nothing else.** `$…$` inline: the opening
   `$` has a non-space character right after it, the closing `$` a non-space right before
   it and no digit right after it; `\$` is a dollar sign. `$$…$$` displayed, on its own
   lines or inline. No `\(…\)`, no `\[…\]`, no fenced `math` block. Inert inside code
   spans, code blocks and link destinations, by markdown's own rules. **It renders in
   generated output like any other text** (amended, `v0.4-plan.md` §23.4: the earlier
   "inert in generated output" was wrong). *Test:* "$5 and $10", "costs $5", "a $ b $ c" and
   `` `$x$` `` publish byte-identical HTML to today's.
2. **Output is temml's MathML with `annotate: true`, `trust: false`, `throwOnError:
   true`.** A formula that does not parse is a publish error naming the formula, like an
   unresolvable directive; preview shows the error in place. Never KaTeX HTML, never a
   stylesheet link, never a font. `temml` is a Worker-side npm package, beside
   `markdown-it`: it renders at publish and in the server's preview route, and **must not
   enter the browser bundle** (session 29's no-vendoring ruling, narrow reading). That
   reading is pending call #15 in `pending-calls.md`; if Venkat rules the broad one, stop
   and bring it back. *Test:* a published item's
   `content_html` contains `<math` and `application/x-tex`, and no `class="katex"`.
3. **`content_md` is untouched.** The dollars stay as typed; `content_hash` is over them.
   *Test:* publish, fetch the item document, compare `content_md` to the input.
4. **The sanitizer redraws** (amended, `v0.4-plan.md` §23.4; replaces "keeps by
   allowlist", which `HTMLRewriter` cannot do safely). `math` stays out of the kept
   tags: every `math` element is discarded whole and replaced by a fresh rendering of
   its first `application/x-tex` annotation. Four properties, each with a test:
   - *Nothing inside the element is copied.* Only the decoded text of that annotation
     and whether the start tag has `display="block"`. A formula with no such annotation
     is dropped. *Test:* the mXSS corpus cases (the `<math><mtext><table><mglyph><style>`
     family, `annotation-xml encoding="text/html"`, `<mi xlink:href="javascript:…">`,
     CDATA, a comment in `mtext`, a nested `math`, an unclosed `math`) each sanitize to
     output containing no element or attribute that the input's `math` subtree had and
     the renderer did not produce; assert on the **parsed DOM in the browser suite**
     (`e2e/imported-html-security.spec.ts`), not on strings.
   - *The replacement stands where the parser saw the element.* Suggested mechanics, two
     rewriter passes when the input contains `<math`: pass one mutates nothing but adds a
     per-call random marker attribute to each top-level `math` and collects its
     annotation text and display flag; pass two is the sanitizer, which replaces a marked
     `math` with a per-call random text token (`el.replace`, as text) and removes an
     unmarked one; then substitute tokens in the output. The token must be unguessable
     and must not occur in the input (check, and draw again). Any mechanism is fine that
     never substitutes into a position the rewriter did not itself create. *Test:* an
     input that carries a guessed token in an attribute value and in a comment is not
     substituted there.
   - *Rendering is bounded.* At most 4,000 characters of TeX per formula and 1,000
     formulas per document; temml's `maxExpand` and `maxSize` left at their defaults.
     Over a cap or on any error: the TeX, escaped, in `<code class="math-source">`.
     Memoize renders per isolate (bounded), since every display of a thread redraws.
   - *The renderer's output is checked.* Before use, every element name in it is one of
     `math semantics annotation mrow mi mn mo ms mtext mspace mfrac msqrt mroot mstyle
     merror mpadded mphantom msub msup msubsup munder mover munderover mmultiscripts
     mprescripts mtable mtr mtd`, and every attribute name one of `display displaystyle
     scriptlevel mathvariant stretchy fence separator lspace rspace movablelimits accent
     accentunder form largeop symmetric minsize maxsize linethickness columnalign
     rowalign columnspan rowspan width height depth voffset encoding class`; else the
     fallback. If temml legitimately emits a name not listed, bring the name back to
     Fable; do not add it. *Test:* a stubbed renderer returning `<math><mi href="x">`
     yields the fallback.
   **Ruled on the `menclose` gap** (`v0.4-plan.md` §23.5): `menclose` and `notation` stay
   off the lists. In the shared render function, before the allowlist check:
   `\overline` and `\underline` become `mover`/`munder` with a stretchy bar `mo`
   (`accent="true"` / `accentunder="true"`); `\boxed` and `\fbox` lose the box and keep
   their content; `\cancel`, `\bcancel`, `\xcancel`, `\sout`, `\angl`, `\phase` and
   `\longdiv` are refused with a message naming the command ("…needs a stylesheet most
   readers will not have"). *Tests:* a browser test that `$\overline{AB}$` on a public
   page differs in pixels from `$AB$` and has a bar element of non-zero width; a publish
   test for each refused command; `\boxed{x}` publishes and contains no `menclose`.
   Check `\widehat` and `\overrightarrow` after the style strip and add `accent` if they
   shrank. The syntax page's list of what does not survive follows these three groups.
   **Fable reviews this diff before release.**
5. **Text content is unchanged.** `selectionText` and `plainTextFromHtml` in
   `src/markdown.ts` get no special case for `math` where they implement §2 (the partial
   quote check). Presentation text is free: excerpts, `og:description`, feed titles,
   link labels and search snippets show a formula as its TeX source in `$…$`, taken from
   the annotation. **The studio refuses a partial-quote selection that includes any part
   of a formula's text**, at selection time, with a message saying to quote the whole
   item or the prose either side. *Test:* the §2 normalizer's fixtures are byte-identical
   before and after; a stub-quote selection across a formula is refused.
6. **No `style` on a formula, at publish or at display** (amended, §23.4). One function
   wraps temml for both paths and removes every `style` attribute from its output;
   `tml-*` classes stay (inert without temml's stylesheet, which is never shipped).
   `display="block"` alone must make a displayed formula a block: check it in the
   browser suite on a public page, and add a rule to the public and reading stylesheets
   only if a supported browser needs one. Report which common commands lose something
   visible (`\color`, `\boxed`, `\cancel`, `\rule` are the likely ones) in the PR and
   in the syntax page's Mathematics entry. *Test:* a fragment and a thread quoting it
   show byte-identical markup for the same formula.

**Fable's review of studio#149 (2026-11-14): the redraw is approved; four changes before
merge.** The two-pass mechanism was read and probed with hostile spellings (a formula
in an attribute value, a comment, a `textarea`, an `svg`; upper-case tags; an unclosed
formula; HTML that breaks out of `math`; CDATA): in every case the output held only
what the renderer drew or nothing, and tokens landed only where the rewriter saw an
element. `allowedMath` fails closed on anything tag-shaped. Required:

- **R1. Error markup must never be published.** `$a [[id]] b$`, `$x [[id | y]]$` and
  `$a [TK]impyrt=b[/TK] c$` publish today (200) with `<code class="math-error" …>` in
  `content_html`, a link or generated span inside it, and a private marker character in
  its `title` (studio#3). Cause: `mathErrors` checks the text before the link and TK
  sentinels go in, and the real render fails after. Ruled: **a formula cannot contain a
  link, a mention or a generated span; publish refuses it**, like any formula that does
  not parse. Decide it on what is actually rendered: have the render rule record each
  failure in the markdown-it `env`, thread an `env` through every render that feeds
  `content_html` (body, generated blocks, a thread's prose parts), and throw
  `MathPublishError` if any recorded one. Do not detect it by searching the HTML for
  `math-error`: a thread bakes other origins' HTML verbatim, and one of them could carry
  that string. *Tests:* the three inputs above return 400; a thread quoting an item whose
  HTML contains `<code class="math-error">` still publishes.
- **R2. Bound the lengths a formula can set.** `\raisebox{-30em}{x}` gives
  `voffset="-30em"` and `\hspace{9999em}` a 9,999em `mspace`: a quoted formula can lay
  its text over another author's paragraph or blow the page's width, which is what
  stripping `style` was for. In `allowedMath`, every value of `width height depth
  voffset lspace rspace minsize maxsize linethickness` must be a number with `em`, `ex`,
  `px`, `pt` or `%` (or the literal `-1width` temml emits for `\llap`), no greater than
  20em or its rough equivalent (320px, 240pt, 100%), and no less than −2em (−32px,
  −24pt); else the fallback. *Tests:* both commands above are refused at publish and
  shown as TeX in the reader; `\quad`, `\!`, `\hspace{3em}`, `\smash`, `\llap` and a
  `\genfrac` with a 2pt rule still draw.
- **R3. Two new regexes are quadratic on hostile HTML.** `mathAsTex` and
  `selectionTouchesMath` in `src/markdown.ts` use `<math\b…[\s\S]*?</math>` globally;
  with unclosed `<math>` repeated, 160 KB takes 0.7 s and 1 MB about half a minute, on
  the import and excerpt paths. Scan once with `indexOf`: find `<math`, find the next
  `</math>`, and stop at the first opener with no closer. The existing
  `<(script|style)…>` strip in `plainTextFromHtml` has the same shape (0.55 s at
  160 KB); fix it the same way while there. *Test:* 20,000 unclosed openers of each
  kind in under 50 ms.
- **R4. A TeX budget per document.** 1,000 formulas of 4,000 characters is 4 MB of TeX
  and about three seconds of rendering on every display. Add a budget of 100,000
  characters of TeX drawn per document; past it, formulas are their TeX as text.
  *Test:* a document over the budget draws the first formulas and shows the rest as text.

Smaller, same pass: compare `encoding` and `display` values case-insensitively (a
formula with `encoding="APPLICATION/X-TEX"` is dropped today); stop `mathAt`'s scan for
a closing dollar after `TEX_MAX` characters, since a longer formula is not drawn anyway
and the scan is otherwise quadratic in a paragraph of lone dollars.

**Fable's look at the R1–R4 diff (`ffd7aae`), session 70, 2026-11-14: not yet. Five
changes, then merge without another review** unless one of them cannot be built as
written. R4, the dollar scan, the case-insensitive `encoding`/`display` and the
per-request failure store are approved as built. Reasoning for R2a/R2b:
`v0.4-plan.md` §23.6.

- **R1a. Refuse on the placeholder, not on the failure.** `$x % [[id]]$`,
  `$x % [[id | y]]$` and `$a % [TK]impyrt=b[/TK]$` publish (200) with `<a href>` or
  `<span class="blyg-tk-gen">` inside the formula's `<annotation>`: TeX drops the rest
  of a line after `%`, so the formula parses and no failure is recorded. In the
  `math_inline` render rule, note a failure whenever `SENTINEL.test(token.content)`,
  whether or not `renderTex` returned an error. *Tests:* the three inputs return 400
  and write nothing; a displayed formula with the link on a commented line too.
- **R3a. `replaceElements` slices the original with positions from a lowercased copy,
  and `İ` (U+0130) lowercases to two code units.** `İ<script>SECRET</script>tail` gives
  the §2 text `İ< ail`; an item with an `İ` and a formula gets a mangled excerpt. Never
  search a copy whose length can differ: lower ASCII only
  (`replace(/[A-Z]/g, …)`), or search the original with sticky case-insensitive
  literals. *Tests:* for `İ<script>x</script>tail`, `İİİİ<p>a</p><style>b{}</style><p>c</p>`
  and an `İ` before a formula, `selectionText`, `plainTextFromHtml` and
  `selectionTouchesMath` equal what the old regex gave; put `İ`, `ẞ` and a surrogate
  pair in the fuzz alphabet and run it again.
- **R3b. The scanner is quadratic with two names.** 20,000 `<script></script>` pairs
  followed by one `<style></style>` take 3.8 s at 340 KB and 34 s at 1 MB (the old
  regex was linear there): each step searches for the far `<style` again. Keep each
  name's next position and search again only once `pos` has passed it. *Test:* that
  input, and its mirror, in under 50 ms.
- **R2a. Containment is a paint rule** (§23.6). `math { overflow: clip }` in the
  public, reading and preview stylesheets. *Tests, browser suite:* on a public thread
  page, for `\raisebox{20em}{W}`… (refused at publish after R2b, so plant the HTML as an
  imported item whose formula the redraw accepts, or use `\smash` over a forty-row
  array, which publishes), no leaf of the formula is hit by `elementFromPoint` outside
  its paragraph's box; for a corpus of ordinary formulas (fractions, sums with limits,
  accents, `\overline`, a displayed integral, a matrix) a screenshot with the rule
  equals one without it. Add `overflow-clip-margin` only if that second test needs it,
  and then no more than 0.5em. Say in the PR which engines the suite ran.
- **R2b. `voffset` within ±2em, and the absolute `voffset` values in one formula sum
  to at most 4em**, in `allowedMath`; the other lengths keep R2's bounds. *Tests:*
  `\raisebox{20em}{x}` and `\raisebox{-2em}` nested three deep are refused at publish
  and shown as TeX in the reader; `\raisebox{0.5em}{x}` and `\genfrac` still draw.

Smaller, same pass: R4's budget charges a formula's whole length even when it is over
`TEX_MAX` and never drawn, so one oversized formula turns the rest of a thread to
text; charge only what is drawn. And the syntax page's list of what does not survive
gains negative space (`\!`, `\hspace{-…}`, kerns draw as no space: temml emits them as
a `style`).

Not this PR, to file as studio issues: (a) the sanitizer keeps any `class` value, so
imported HTML can wear the Studio's own classes, several of which are `position: fixed`
(`.toast`, the sheet, the save bar); restrict `class` on import to the `blyg-` wire
classes and what the reader styles. (b) the composer's local preview shows a formula as
`$…$` text, since the browser bundle has no renderer; fine, but say so in the help.

Also: the editor toolbar gets a formula button and the syntax page a Mathematics entry,
beside the structure buttons and the Markdown section that session 69 added on branch
`feat/editor-markdown`. `PROTOCOL_VERSION` stays `"0.4"`. No migration. The fragment
cap counts `content_md`, dollars included.

## New from session 67 (2026-11-12, Fable 5.2) — item 24 ruled (#102, fourteenth revision)

Read `CLAUDE.md` #102 and `v0.4-plan.md` §21 first.

1. **Reader fixtures** (`conformance/reader/fixtures/`): remove `ambiguous` from 009, 015,
   016, 036, 065, 078, 079, 082 and 099 and tighten each to the ruled reading — 015 a
   publish error only; 078 the item document only; 079 resolved against the origin; 099
   the quote outside `div.blyg-tk-gen`, the wrapper on both sides of it, one `generated[]`
   entry; 065 the retained version, and also accept a publish error from a renderer that
   declares it retained nothing. 066 and 071 were never among the nine; leave them.
2. **Clause register**: rebuild against the fourteenth revision. S1–S10, S12–S14 and S16
   now carry keywords; S11 and S15 were reworded as description and should classify as
   not-a-rule. C-10.2-04's definition is inside its MUST.
3. **Studio, three publisher changes** (one release, after the fixtures so the suite shows
   them): (a) publishing a fragment whose `content_md` has a directive line outside code
   is an error, with a message offering a thread or a code span; (b) a `[[id]]` link to an
   item with no held `page` renders its item document's URL through the target's `item`
   template — `remotePermalink`'s convention guess must not reach `content_html`; (c) the
   `blyg-tk-gen` div closes before a baked quote and reopens after, with one `generated[]`
   entry (studio#105). Also (d), not a conformance matter: write media links
   origin-relative (`media/x.png`), not host-rooted with the mount in them.
4. **Replies, on Venkat's word**: **Done 2026-11-12 (Opus, admin pass):** #23 answered with the table and closed; Aneesh told there; blyxt told in rpasetes/blyxt#1. Pioneeringspirit not contacted. blygger-spec#23 with the table from `v0.4-plan.md`
   §21.2, then close it; tell Aneesh that (1) catches one of his own fragments
   (`4qybzpn2…`) and pioneeringspirit's `2f3ets03…`; tell blyxt's author about (9).
5. **#103, Unicode (fifteenth revision; `v0.4-plan.md` §22).** Conformance: a publisher
   check that every origin string written anywhere has the §12.2 spelling (fail), that
   `content_md` has no C0 control but tab, LF and CR and no unpaired surrogate (fail),
   and that it is NFC (warn). Studio, checking first what `src/text.ts` and the two
   `http.ts` files already do: NFC on save; normalize a typed selection before the
   partial-quote substring test; caps in code points and surrogate-safe truncation;
   bidi isolation on attributed strings and baked quotes; a `lang` setting replacing the
   hardcoded `en` on public pages (modelled on the timezone setting; no manifest key,
   which is parked); show an internationalized host readably with its A-label available.
   Reply on blygger-spec#6 with the rulings and close it, on Venkat's word.
6. **The four `plans/` documents are reviewed** (each has a note at its head). Pour-over
   (ROADMAP 40) should be built on #82's one-off snapshot, not subscribe-then-import. If
   Venkat says yes to `pending-calls.md` 14, revise `publishing-patterns.md` for
   publication on the official blyg.
7. **Research Common Fabric and write `tn-9`, a technical note for people who want to
   experiment with it and Blygger together** (Venkat, session 67; ROADMAP row 120).

   *What it is.* [commonfabric/labs](https://github.com/commonfabric/labs) is a runtime
   in which software is untrusted and policy travels with the data: values carry
   confidentiality and integrity labels, derived values inherit them, a flow checker
   refuses code that would break one, and relaxing a rule is an explicit, recorded
   release at a boundary. Identity is DIDs; shared "spaces" have access control. It is
   0BSD, one implementation, early by its own account, and its attestation layer
   (`docs/specs/verifiable-execution/`) is specified and not built.

   *What Fable's first pass found* (session 67, from `docs/why.md`, most of
   `docs/how.md` and the spec listing; no code was read or run, so treat every item as
   a hypothesis to confirm or correct):
   - The two meet at the studio/page split (#3). Common Fabric can be a studio or a
     reader; the blyg stays static files. Nothing here is a spec matter.
   - **A blyg reader inside Common Fabric** looks like the cheapest experiment. Item
     documents arrive with the provenance an integrity label wants (origin, id, version,
     `content_hash`), and §13's reader rules — drop withdrawn content unless pinned
     (§13.4), never re-emit an import (§13.5), never auto-publish a verified mention
     (§15.5) — are cooperation today and might be expressible as labels the runtime
     enforces.
   - **A Common Fabric studio or authoring agent.** Publishing to a blyg is their
     "release at a boundary"; a scoped publish token (#31, #52) is the kind of secret
     their token example labels; #39's agent contract and `generated[]` disclosure
     (§5.7) are what such an agent must meet.
   - **Level 3, later.** #101 keeps a lock's approval ladder private, so "the requester
     is an attested runtime" could be one more ground for a grant with no wire text. It
     waits on their attestation and on RFC-6.

   *Research to do, bounded to about a session.* Read `docs/how.md` in full,
   `docs/inverting-the-physics-of-trust.md`, the tutorial's identity and security
   chapter, `docs/specs/verifiable-execution/` (foundations, receipts, CFC and trust),
   `docs/specs/webhook-ingress/`, the label and declassification specs
   (`cfc-persisted-declassification.md`, `cfc-value-level-provenance.md`,
   `cfc-exchange-rules-authoring.md`) and `connectors/`. Answer, with file paths:
   (a) how a pattern fetches from the open web, and what label fetched public data gets;
   (b) whether a label can express "delete when the source says withdrawn, unless the
   source still serves a pinned version", "never publish this outward" and "never send
   automatically" — write each §13 rule as the label or policy it would be, or say why
   it cannot be written; (c) how a secret such as a bearer token is held and bound to
   one destination; (d) what a release to "public" looks like and who may make it;
   (e) what a receipt will be able to claim, and to whom; (f) how principals are named
   (DIDs, `mailto`) and whether an origin or a `did:web` can be one; (g) which of this
   runs today and which is planned — their own docs say, so quote them.
   If the repo builds in a few minutes, try a minimal pattern that fetches one
   `items/{id}.json` from a live node and shows its label; if it does not, say so and
   move on. Do not install anything outside a throwaway directory, and nothing global.

   *The note.* tn-1's genre: non-normative, reasoning first, for implementers. Suggested
   shape: what each system is in two paragraphs, in its own terms; where they meet and
   why it is the client; the three experiments, each with what to build, which spec
   sections it must satisfy, what it would show and what is unknown; what stays off the
   wire and why; status and dates of what was read (pin the commit of their repo). Write
   for someone on either side: a Common Fabric developer who has not read our spec, and
   a blyg client author who has not read theirs. Describe their system from their
   documents with links, and do not characterise what you did not verify.

   *Lines the note must hold* (each is a locked decision; state it, do not argue it):
   no policy that restricts use after delivery on the wire (#101's refusal); no rule
   that asks a reader for more than a standard library (§3, #103); provenance stays
   self-asserted and no receipt becomes a verified badge on the wire (#59, §5.7 rule
   6); no auth or identity key in the manifest or `.well-known` (#52, #11); a Common
   Fabric client is a separate client, as enterprise is, and the studio stays boring.
   The note is not an endorsement and says so: one vendor, one implementation, early.

   *Process.* Draft at `plans/tn-9-common-fabric-draft.md`, **not** in `docs/notes/`,
   which publishes on the next site build. It is `tn-9` because tn-8 was reserved for
   RFC-5's promotion (session 78: tn-8 is now the contributor guide, RFC-5 becomes tn-10);
   tn-2 and tn-5 stay reserved. Fable reviews the draft (batch, #58).
   Then, on Venkat's word: move it to `docs/notes/tn-9-common-fabric.md`, add it to the
   notes index and the doc map, publish to blygger.org and to blyg.blygger.org with
   `publish_blyg.py` (run `--dry-run` first; it publishes every changed entry), byline
   Venkat with one whole-item `generated[]` span (#66b). Consider opening an issue or a
   discussion on their repo pointing at the note only if Venkat asks. If the research
   shows the first experiment is not possible as described, write that as the note's
   finding; a short honest note is the right result.
8. **RFC-7, payments, and the amended RFC-6** (#104; `v0.5-plan.md`, amended the same
   session). This changes item 1 of the session-66 list below: **draft both RFCs, RFC-6
   first.**
   - *RFC-6 gains five things*, each in the plan: an optional `about` on a sealed entry
     and the commitment's scope (§3.1); the pass as a third grant recipient (§3.6); HTTP
     challenges at the request endpoint with a uniform first answer (§3.7); lock epochs
     (§3.8); the terms reference (§3.9). §9 has seven new items to state with options, a
     proposal and a test (18–24). §12 is a worked example; start from it, and settle its
     three marked guesses as proposals.
   - *RFC-7* goes at `docs/rfcs/rfc-7-payments.md`, from the plan's §8 and task 6 in its
     §10, which lists the sections. **It proposes no wire construct.** If the draft finds
     it needs one, stop and write that up as a finding against RFC-6. It is a
     recommendation for homes and readers, and it will become a technical note at close.
     **It opens with its assumptions** (plan §8.1, thirteen of them, agent-first buying the
     first), each with what changes if it is wrong, and asks commenters to challenge them.
   - *Re-verify before writing.* R1 was read on 2026-11-12 and both specs move. Check
     x402's header names and flows at `x402-foundation/x402`, MPP's draft name and
     Datatracker status (R1's header has Fable's correction), and whether `payment` is a
     registered link relation at IANA — Fable cited it from memory. Quote, date, link.
   - *Lines to hold*, each from #101 or #104: no price, currency, rail or for-sale flag
     in any protocol document; no construct that claims to restrict use after delivery
     (expiry, read counts, metering); terms are a citation
     with no rights vocabulary; a pass is the same key type as an origin's, and wallets
     and tokens are evidence for the ladder; no preferred rail; spending limits and the
     ladder stay private.
   - *Rent and purchase* (plan §8.3): the wire does not choose. Write up both subscription
     modes (holding, on demand) with the trade-off and recommend neither; draft §9 item
     15 as a proposal (a lapsed grant is a retention event, cooperation, with a signal at
     the grant path); say plainly what purchase does and does not give, with "pin what
     you sell" and free corrections as recommendations.
   - *Not yours:* the rulings. Mark every choice you make as a proposal. Fable edits both
     drafts, then Venkat says when they publish, together.
   - When RFC-4 is drafted (queue item t), give its handler a `redeem` verb beside "stub
     this" (plan §8.4).
9. **Outward actions Venkat left for you (session 67), each on his word as usual:** **Done 2026-11-12 (Opus, admin pass, on Venkat's "do all")**, except as noted: spec pushed; blygger.org deployed (fifteenth revision, tn-4, ROADMAP, ecosystem); #6 answered and closed; #30 merged with its status line, #32 answered and labelled; studio#143 and #144 merged. Not done: studio#88 (waits on Shannon's e2e), 0.59.0 (waits on Aneesh's #137), R8. Original text: push
   `blygger-spec` `main` (sessions 66 and 67 are local); the blygger.org deploy, which now
   carries the fifteenth revision with tn-4 and ROADMAP; the replies in items 4 and 5; and the
   rest of the session-66 list below. Run S5b and S5c at your next start: session 67 did
   not.

## New from session 66 (2026-11-12, Fable 5.2) — RFC-6, and kind is fixed (#100, #101)

1. **Draft RFC-6, sealed content and permissions**, at `docs/rfcs/rfc-6-sealed-content.md`,
   from [`v0.5-plan.md`](v0.5-plan.md); its §10 is your task list and its §9 the items to
   state with options, a proposal and a test. No spec text, no studio build, no
   publishing: Fable edits first and Venkat says when. A probe only on Venkat's word.
   While drafting, re-read #35 and tn-3 against the plan's §7, and #52 against its §9
   item 10; say what you find.
2. **Tangling now mints threads** (#100; `tangling-plan.md` revised, `background-plan.md`
   `burst` row widened). Nothing was built, so nothing to migrate; build from the revised
   plan when row 45's turn comes.
3. **#100 needs no studio change**: `updateItemOperation` already refuses a kind change
   on a published item. If the conformance suites want a clause, it is §5.3's MUST NOT.
4. **Census, session 66:** **Done 2026-11-12:** both listed (blyg-atlas as a reader, rsthornton/blyg as bespoke); the census then found nothing uncurated. two repos found and not curated, `Allethrin/blyg-atlas` and
   `rsthornton/blyg`; add or `skip` in `blygger-org/ecosystem/projects.toml` by the
   listing rule. 11 of 17 studio nodes are behind 0.58.1. Two listings since session 64:
   nedshed.dev and Shingai Thornton.
5. **A correction to session 65's record:** MPP's Internet-Draft is not expired. The
   older name is; `draft-httpauth-payment-01` is active to 2027-03-13, an individual
   submission. R1's header carries the note.
6. **Outward actions left for you by Venkat (session 66), each on his word as usual:** **Done 2026-11-12** with session 67's item 9.
   push `blygger-spec` `main` (session 66's commits are local); merge blygger-spec#30 as
   an exploration and post the reply (session 64's section below); the blygger.org deploy,
   which now also carries the thirteenth revision, tn-4 and ROADMAP; studio#143 and #144
   (green, unmerged); studio#88 once Shannon's e2e fixes land. R8, the probe, still needs
   his word before it runs.

## New from session 64 (2026-11-09, Fable 5.2) — tn-4 and `syndication` (#98)

Reasoning in `v0.4-plan.md` §19. None of it blocks 0.59.0.

- **0. Outward actions Venkat left to Opus (session 64); ask him before the first one.** **Done 2026-11-12** (#30 merged, status line added, #32 answered and labelled).
  Push `blygger-spec` main (the session-64 commit is local). Merge blygger-spec#30 as an
  exploration, then add a status line to `plans/syndication-proposal.md` and its
  `backlog.md` row pointing at spec §16.14 and #98. Reply on blygger-spec#32 in Venkat's
  voice with the ruling: the two changes (in place, no version; no specified fold, with
  the stranger's-critical-cast case), the smaller answers, the gate, and the question
  whether blygcaster can put the entry in the publishing version since a cast hash is
  computed before sending. Add the `roadmap` label to #32 (ROADMAP row 118).
- **L3 research (decision #99): its own brief.** Version 0.5 is Level 3. The fact-finding
  for the design round is [`l3-research-brief.md`](l3-research-brief.md), tasks R1–R8,
  findings into `plans/l3/`. Start with R4 (the spec audit). Facts with dated primary
  sources, no design, nothing built in the studio; R8 only on Venkat's word. It does not
  block and is not blocked by 0.59.0.
- **a. Publish tn-4.** The note is at `docs/notes/tn-4-the-write-surface.md`, reviewed.
  It reaches blygger.org/notes/tn-4/ on the next `blygger-org/sync_spec.py` and deploy,
  which also carries the twelfth spec revision and ROADMAP rows 36 and 118. Build and look
  at the page before deploying (`spec-nested-list-render`). Whether it also goes on
  blyg.blygger.org is Venkat's call (`publish_blyg.py` publishes every changed entry:
  `--dry-run` first).
- **b. `syndication` in the studio is a reader task only, and waits for an emitter.** The
  studio does not cross-post and need not emit. When a live blyg emits the member
  (blygcaster is expected first), the importer keeps `syndication` from the fetched item
  document and the reader shows each entry as a plain link marked as the publisher's
  claim, `https:` only, with no fetch of the copy. That run is the second half of #98's
  gate. Do not build a fold, a count, or a network icon keyed on the host (spec §16.14
  rule 5). After the gate, promotion into §5's member table and a new §5.10 is yours
  under #58.
- **c. If a studio fork or extension asks to emit it:** the entry is written into the
  item document in place, with no version bump and no feed entry, the way a pin updates
  `changelog[].pinned`. A PR that republishes to record an entry does not meet §16.14
  rule 3.

## New from session 61 (2026-11-07, Fable 5.1) — the Shelf, studio#137; do these first

Reasoning in `v0.4-plan.md` §18.6; no numbered decision, because the shelf is the
client's own contract (#31). In order:

- **a. Reply on #137** in Venkat's voice via `gh` (he has authorized this once drafted):
  approved as its own resource; two changes before merge — (1) `expectedRevision` on
  `PUT /shelf` becomes **required** (`z.number().int().nonnegative()`, no `.optional()`),
  matching `updateItem`; a client reads the shelf first, and the 409's `details.current`
  is the retry path; (2) one sentence in `docs/api.md` and the route's `describe()`: the
  shelf is private and never gains a public mode; a featured list, if ever built, is a
  separate presentation setting that may default from it. Then the typecheck failure:
  six TS errors in `src/ui/shelf.tsx:60–75` (a two-argument call where one is expected,
  fields read off `{}`), from drift against main — his to fix, with a rebase or a merge
  of main. Quiet dropping, `owner:manage`/`owner:read` and the name stand; say so, so
  he does not revisit them. Note the AGENTS.md API-surface gate is satisfied by the PR's
  own contract bump (5.8.0, SDK 0.14.0), which the release commit may re-bump.
- **b. Review the revised PR** against the two changes and the usual contract rules
  (`openapi.json` regenerated, SDK drift clean, `test/rest-permissions.oracle.test.ts`
  and the MCP oracle updated — the PR body says they are). Merge when CI is green.
- **c. Before any deploy carrying 0044**, prove its triggers on a throwaway remote D1
  (`d1-remote-trigger-end-splitter` lesson; the migration already uses `SELECT RAISE …
  WHERE`, so this is a confirmation, not a fix). Then `migrate` on venkateshrao and PI
  before the deploy, as always; New Nature is deployed only from its own project.
- **d. Release.** If #133 and 0.57.0 are not yet out when this lands, the shelf goes in
  **0.58.0** on its own (a migration and a contract bump want their own entry), never
  folded into 0.57.0's "no migration" release. `CHANGELOG.md` names the required
  `expectedRevision` as a Burrow-facing note, since Burrow is moving onto the API.
- **e. Tell Burrow's maintainer** (a comment on #135 after merge): the API is live, the
  revision is required, ids that no longer resolve are dropped and the response is the
  stored list.
- **f. Background and Foreground** — [`background-plan.md`](background-plan.md). **Sequenced
  (Venkat, session 61): 1 + 4a → 2 → 4b → 3** — own items' classifier labels with the
  foundation; the imported half of the changelog signal after the measured rules. Merge
  `feat/changelog-display` (#95, **confirmed by Fable**, §18.10 — roll it out to the other
  nodes) before phase 1. §18.8 is ruled as **#96**: the note may be an input only under the
  owner's own routing instruction (empty by default), with the four conditions and the
  disagreement chip in the plan's §3.4; the measured "minor" is ruled down to near-same.

## New from session 60 (2026-11-05, Fable 5.1) — the RFC close, RFC-5, private items (#90–#94); do these before the lists below

Decisions #90–#94 in `CLAUDE.md`, reasoning `v0.4-plan.md` §18, text in the spec's tenth
0.4 revision (§4, §14, §16.8). RFC-1 and RFC-2 are now `docs/notes/tn-6-…` and `tn-7-…`,
published as v2 of their blyg items. Item e of the session-40 section is unblocked. In order:

- **a. Done 0.56.0 (studio#134), as a lens in Reading.** Aneesh has not been told yet. Was: **The found-mentions list** (#91 B4; studio, off the Mentions surface). A reading
  client MAY list for its owner the mentions found in items it already holds: h-cards in
  imported `content_html` matched against the owner's own member record (`url`, `ids`),
  **quotes excluded** (a baked quote's h-cards are the quoted author's speech), labelled
  as a reading-side find and kept apart from verified mentions, **no count**. Nothing is
  sent. Feeds the owner does not read are refused — do not crawl, do not query anyone.
  Tell Aneesh on his RFC-1 stub when it ships.
- **b. RFC-5's comment period** runs to **2026-12-03** (published session 60 on
  blyg.blygger.org, anchor issue in the RFC header). Nothing to build; at close, scan the
  stubs and the issue the way session 60's scan did for RFC-1/RFC-2 (`fable-brief.md`) and
  hand the scan to Fable, who promotes it as `tn-10` under #90 (it was to be tn-8; session 78
  gave tn-8 to the contributor guide by mistake, and notes are never renumbered).
- **c. Private items** (`plans/private-items-proposal.md`): #94 rules the public counter
  starts at v1 and private history is studio history; when built, do not dress private
  versions in public "vN" chrome. Group visibility (§8.3) stays closed until the L3 round.

## New from session 58 (2026-11-03, Fable 5.1) — the mods mechanism (#89); do these before the lists below

Decision #89 in `CLAUDE.md`, reasoning `v0.4-plan.md` §17.1. No spec text changed for it;
the ninth revision (§10.1, §13.7, §13.2) came from the batch review, §17.2, and needs no
build — studio#106 already implements the §10.1 sentence. In order:

- **a. `blygger-studio/docs/mods.md`** — the published principles. Contents, from §17.1:
  the three surfaces in cost order (owner-API configuration on a scoped token; compiled-in
  extensions per `docs/extensions.md`; hooks proposed upstream); the bar a hook must clear
  (general — named for what it does; wire-silent — nothing in the bake, `feed.xml`, item
  documents or manifest, presentation of the publisher's own pages open; reads-only on the
  server — writes through `client` in the browser or a scoped token polling
  `/api/changes`); "a mod keeps the studio's generator string"; "the no-fork promise is the
  mod's own, not the program's". Link it from `docs/extensions.md` and the README's
  extensions line; one short paragraph on blygger.org's ecosystem page may say the studio
  takes mods and point at it (observation, not endorsement).
- **b. Re-scope studio#59 with Aneesh.** Venkat's reply is drafted in session 58's DEVLOG
  entry; once posted, the ask is: keep `ext:add`/`update`/`remove` taking a repository URL
  at a pinned commit, the tree hash, the import-boundary and browser-only checks, the
  review prompt and the build's refuse-if-edited; drop `registry/index.json`,
  `registry:check`, `registry:site` and the hosting question. The vendored path stays
  browser-only as a hard rule (`openapi.json` is a function of the repository). Review
  the re-scoped PR against `docs/extensions.md` as any PR; merge when it holds.
- **c. blykker's accepted hooks, in their general forms**, when blykker asks for them
  (its PLAN.md § Upstream hooks; it runs from `Publishing/newnature/` sessions): an owner
  stylesheet or page-template setting for public pages; a label on a links-section entry
  as a setting; per-thread hiding of feed apparatus as presentation. Each is a settings
  change or a slot named for what it does; none touches the bake or the feed. The two
  refused hooks (a `feed.xml` filter; a server hook on publish) need no reply beyond
  pointing blykker at the feed-order slot and `/api/changes`.
- **d. Carry-over line in `CLAUDE.md`** drops item 22 when the queue file is pruned (done
  session 58); item 24 is the one Fable item left, and it is a round of its own.

## New from the session-49 Fable round (2026-10-17) — do these before the queue below

Decisions #70–#72 (`CLAUDE.md`), reasoning `v0.4-plan.md` §11, text in `protocol-v0.4.md`
(the living document since this round; `protocol-v0.3.md` is frozen). Venkat's rule for
this list: whatever Opus can do more cheaply than a Fable round is Opus's. In order:

- **a. The label — `[[id | text]]` and `![[id | text]]`** (#70, ROADMAP row 66, 0.4 §10.1;
  Venkat is waiting on this). Grammar: id first (26 Crockford chars right after the
  brackets), then optional `\s*\|` and a label running to `]]` — the label may contain a
  pipe, so split on the *first* pipe after the id; trim; empty label = none; no escape.
  Three regexes to extend, all built from `ID_ALPHABET`: `DIRECTIVE_LINE` in
  `src/directives.ts` and `src/transclusion.ts` (and `RESERVED_LINE` stays as is),
  `LINK_INLINE` in `src/transclusion.ts` and `src/fork-flatten.ts`. On a link the label
  replaces `anchorText()`'s output in the bake (escaped); on a directive it is dropped
  before resolution and never reaches the bake, `transclusions[]` or provenance. The
  partial-transclusion adjacency rule is unchanged: the blockquote attaches to the
  directive line whether or not it carries a label. Palette (`src/palette.ts`) and *copy
  ID* emit the long form `[[id | <heading or excerpt>]]` — the same text `anchorText()`
  would have chosen, so the author sees what they would get and can edit it. Fork
  flattening (#63): the flattened markdown link keeps the baked anchor text, which is now
  the label; the own-prose path must recognise the labelled form or it falls through to
  the whole-HTML rebuild on every labelled link. Tests: grammar table (label with pipe,
  label with `]]`-less brackets, empty label, whitespace variants, labelled directive +
  attached blockquote, labelled form inside code is inert, #54), bake assertions for link
  and directive, fork-flatten of a labelled link, palette output. `Migrations: none`.
  **Reply on blygger-spec#16 when it ships** (Ned Twigg was told *copy ID* would emit it).
- **b. TK grammar strip** (ROADMAP row 67; Fable confirmed the second option, §11.4): keep
  generation from emitting `[[…]]`/`![[…]]` — say so in the prompt and strip any bracket
  form that survives in the output before it is inserted, leaving the text. Generated
  output stays non-grammar (studio#5, #60). Test with the live example on row 67.
- **c. The day's roundup on `blyg.blygger.org`** (Venkat, session 49, end of day). The
  0.4 announcement fragment is published (`3jz4v4nrbxhpatwk7c6g0616w9`, 18:16 PT), as are
  the 0.46.3 and 0.47.0 release threads. **Still to publish: one thread rounding up the
  whole day**, human byline + whole-item `generated[]` span as the TK pattern requires,
  quoting the 0.4 fragment with a `![[3jz4v4nrbxhpatwk7c6g0616w9]]` directive. Venkat's
  paragraph, to carry verbatim or lightly edited, with links added:

  > Protocol 0.4 opened and was published with its first snapshot, then took two
  > revisions the same evening. Nine decisions were recorded, #70 through #78: the
  > `[[id | text]]` label, received conventions over taste, the 0.4 opening, the
  > pace-layered RFC with `pinned_at`, `cid` on pins, image sizing, the conformance
  > clarifications with member tables measured against all 22 live blygs, `ignyr` as a
  > derived reader-side queue, and inline fragment authoring. Three pending Opus rulings
  > were confirmed. Five GitHub threads were answered and one closed. The Fable queue went
  > from seventeen items to one.

  Facts to link from it: `https://blygger.org/spec/0.4/` and the snapshot
  `/spec/0.4/2026-10-18/`; §17's three revision lines; decisions #70–#78 in
  `CLAUDE.md` (link the GitHub blob); blygger-spec#2 (closed, Robert Peake to switch
  Soapbox to `"0.4"`), #13 (`cid` ruled), #16 (label ruled); studio#20 (tangling), #37
  (image size); the roadmap page for rows 13, 24, 39, 45, 46, 62, 66, 67; Studio 0.47.0
  as the first client emitting the label. Write it for the ecosystem, not for us
  (`VOICE.md`): what changed for someone running a blyg or writing a client, and what
  is now a ruled shape they could build (`pinned_at`, `cid`, `{width=…}`). Record the
  item id in the devlog and in `docs/blyg-published.json` if the publisher writes there.
- **d. Studio docs and strings that cite 0.3 section numbers that moved**: `grep -rn
  "§16.3\|§16.6e\|16\.6e\|0\.3" src docs README.md CHANGELOG.md` — §16.3 is now §5.7
  rules 8–9 and §15.4; §16.6e is §4/§6.1/§12/§15.4 step 2. Comments only; no behaviour
  change. `PROTOCOL_VERSION` is already `"0.4"` (0.41.0).
- **e. blygger-com's vendored resolver** (`npm run sync-vendor`, its `CLAUDE.md`): the
  directory validates submissions with the resolver, and 0.4 makes `rel="blyg"` able to
  point at a manifest directly and lets `feed`/`items` be authoritative. Check the vendored
  copy handles a Soapbox-shaped submission (manifest under `/wp-json/…`, templated `item`),
  and re-sync if the studio's resolver is ahead of it.
- **f. Conformance toolkit against 0.4**: once blygger-spec#11 merges, re-run
  `conformance/clauses/analyze.py` against `protocol-v0.4.md` and tell Aneesh the
  section map (a, d above). The F13 keyword-less-sentence pass is still Opus's.
- **g. Close the loop on blygger-spec#2**: Fable closes it at publication with a note to
  Robert Peake to switch Soapbox's key to `"0.4"`. When his manifest reports `"0.4"`,
  re-run the census (`sync_ecosystem.py`) and note it in the devlog.

- **h. Emit `changelog[].pinned_at`** (#73; 0.4 §16.9, a ruled shape). The `versions`
  table has stored `pinned_at` since migration 0002, so this is one line in the item
  document and pin file emitters plus the importer keeping it on imported changelogs.
  `Migrations: none`. Once a second client reads it (the pace-layered order over
  subscriptions, ROADMAP row 69, is the natural reader), Opus promotes it into §5.2 and §8
  under #58 and Fable reviews.
- **i. Drafted and ruled session 61 (2026-11-07, #97):** `docs/rfcs/rfc-3-pace-layered-order.md` §7. **Before it publishes (Venkat's word), build R2 and R3 in the studio** — `climbFor` returns 0 for a same-hash or near-same version; a burst (§13.7's fold) takes one tick, thread first, fragments beneath — with their fixtures, and R4: move `test/fixtures/feeds/` to `blygger-spec/conformance/feeds/` with a CI identity check on the studio's copy. Was: **Draft RFC-3, the pace-layered order** (#73), from
  `blygger-studio/docs/pace-layered-feed.md` and `test/fixtures/feeds/*.json`, in the
  shape of RFC-1 and RFC-2 (now `docs/notes/tn-6-*.md` and `tn-7-*.md`, promoted session
  60, #90): model, wire inputs, reference
  constants (reference values, not normative), the fixtures as a conformance check,
  `pinned_at` as the one wire fact it wants. Hand to Fable to edit before it publishes.
- **j. Author-sized images** (#75; §16.10): markdown-it-attrs or a small post-processor —
  `{width=N}`, `{width=N%}`, `{height=…}` after an image, nothing else; bake `width` and
  `height` onto `<img>`; `placedIn` in `src/util.ts` must still match the media path; a
  size picker (small / medium / full) on the inserted image; a `max-height` cap in the
  theme today regardless. Reply on studio#37 when shipped.
- **k. Refuse a `stub_of` that names an L0 wrapper id** (#76), offering the `{url}` stub
  on the entry's link instead; one live stub does this. And confirm the closure check
  walks baked versions (`transclusions[]` of the version named, from the local versions
  table), not current documents (#76, F3) — add the Alloy 1a′ case as a test either way.
- **l. The *ignyr* queue** (#77): in the updates tab, an imported version whose
  `content_hash` equals the previous version's is a maintenance republish and goes to a
  low-priority queue by default; show the count, never resurface it as new writing. Agent
  refreshes land there by construction.
- **m. Optional: re-send a version's remote mentions when it is pinned** (#73, MAY). Only
  if cheap; nothing reads it yet.

**Found by the deploy, not a task:** this round's `blygger-org/deploy.sh` run built the
tree as it stood, which included the parallel Opus session's uncommitted `build.py`,
`templates/page.html` and `content/glossary/`. Check that what went live is what that
session intended, and commit or revert them.

## New from the session-38 Fable round (2026-10-06) — do these before the queue below

Decisions #59–#64 (`CLAUDE.md`), reasoning `v0.4-plan.md` §10, text in the eighth revision
of `protocol-v0.3.md`. In order:

- **a. Done session 38: 0.32.2, deployed to both nodes; all 47 stored verified mentions recheck clean.** Was: **Security fix, ships first: §15.4 step 2** (#61). `src/mentions/receive.ts` compares
  `new URL(asserted).origin` to the final URL's — host only. The rule is now: the item
  document's final URL MUST equal `{origin}items/{id}.json` for the document's own `origin`
  and `id` (case-insensitive scheme/host, default port dropped, trailing slash of `origin`
  normalized). This also makes a pinned file's URL fail, which is intended (F4). §15.3 step 1:
  `target` lies within the full identity origin, not merely the host. Tests: a path-mounted
  impostor on the same host; a source that resolves to a pin; a legitimate page → alternate
  → live document. Re-verify stored mentions on both nodes after deploy; any that flip to
  gone or failed are findings, record them.
- **b. Published** — the eighth revision went live at the end of session 38 (render checked, blygger-org commit pushed). Nothing to do.
- **c. Done session 38 in 0.32.2; studio#5 closed.** Was: **TK sources from the instruction only** (#60): `extractSourceIds(contentMd.slice(tkIdx,
  end))` in `src/tk.ts` scans the whole scope; scan the instruction. Keep 0.20.1's behaviour
  (an own-line directive in output transcludes). **The warning was never shipped** (checked
  session 38 against 0.32.1: no such check in `src/`): warn at publish, and in the editor, when
  a scope's output contains a `![[id]]` its instruction does not. Then comment on studio#5 (a comment is posted; add the version) and close it.
- **d. Done session 39:** eleventh revision (§5.6 rule 6, Fable review pending) and studio
  0.32.3 (inherited `[[id]]` links flattened). Was: **G11 promotion** (#57, #62, #63): move §16.6f into §5.6 rule 6, carrying its three
  session-38 bullets (partiality from `blyg-partial`; withdrawn quotes copied as pinned;
  inherited `[[id]]` links flattened). Record the attribution line's form as the build's call.
  **Build first:** `fork.ts` copies a fragment's `content_md` with its `[[id]]` links intact;
  flatten them to absolute markdown links from the pinned `content_html` (#63). Add the §17
  line; publish. Label `Fable review pending`.
- **e. Done session 38:** `tn-3` revised and republished. Was: **`tn-3` revision** (groups): the group shape is now sound — #61 is its exact case. Say
  so, cite the eighth revision, and note that receivers on older studio versions are the
  remaining hole until they upgrade.
- **f. Done session 38** (posted on #11). Was: **Tell Aneesh** on blygger-spec#11: grammar case 24 is unambiguous (instruction = source,
  output = quote, #60); F1/F4/F6/F7/F18 ruled (#60–#63); items 6–14 of his report remain
  queued and are not blocked on him. Merging #11 still waits on his reply to the review.

## New from session 40 (2026-10-07) — the official blyg and the RFCs; do these before the queue below

Decisions #66 (official blyg, with its Fable review inline), #67 (RFC-1) and #68 (RFC-2) in
`CLAUDE.md`; reasoning in the RFCs' own last sections and `v0.4-plan.md` §10.10–10.11.
`https://blyg.blygger.org/` is live, empty, on Venkat's personal Cloudflare account. In order:

- **a. Done session 40 (Opus):** `blygger-org/publish_blyg.py` + `docs/blyg-published.json`. One deviation: it signs in with the owner password (`BLYG_BLYGGER_ORG_OWNER_PASSWORD`) rather than a scoped token; minting a publish-only token is still worth doing. Disclosure uses whole-item `impyrt` spans, which produce the same `generated[]`. Original item: **A publishing sync for the blyg.** Each `docs/rfcs/rfc-N-*.md` and, when ported,
  `docs/notes/tn-N-*.md` is published as a **thread** on `blyg.blygger.org` through the studio
  API with a scoped publish token (mint it on the blyg, register as `BLYG_BLYGGER_ORG_*` in
  `.env.keys`). The git file is the single source; a change republishes as a new version,
  never a hand-edited copy (#66). Keep the file→item-id map committed in `blygger-spec`
  (e.g. `docs/rfcs/published.json`). Every item records a whole-item `generated[]` span
  naming the drafting and editing models, under Venkat's byline (#66 review (b)); the
  API's provenance path (#52 invariant 4) is how. For an RFC: pin the version under comment,
  put the close date and the `blygger-spec` comment-anchor issue link in the text. Fragment
  caps do not apply to threads. Where to put the script is yours (`blygger-org/` beside
  `sync_spec.py` is the obvious home; it already parses `docs/notes/`).
- **b. Done session 40 (Opus):** both published 2026-10-07 as pinned v1 threads, closing 2026-11-04 (Venkat said publish without dates, so the recommended four weeks), anchors blygger-spec#14 and #15. Original item: **Publish RFC-1, then RFC-2**, once Venkat gives the close dates (four weeks recommended,
  #67 ruling 1). One `blygger-spec` issue per RFC for people without a blyg. Public responses
  are already on, so stubs show under each item.
- **c. Done session 40 (Opus):** notes index and `/notes/tn-N/` pages link their blyg items (`sync_spec.py` reads `docs/blyg-published.json`); blygger.org nav links the blyg and every page carries `<link rel="blyg">` to it; blygger.com's nav links it and its directory lists it (Venkat asked for both). Original item: **blygger.org follows #66.** The notes index and each `/notes/tn-N/` page keep serving the
  text and gain a link to the blyg item once ported (#66 review (c)); the front page and nav
  link `blyg.blygger.org`; the stale "RFC section" idea does not get built. Whether the blyg
  self-lists on blygger.com is Venkat's call — ask.
- **d. Done session 41 (Opus/Sonnet):** `blygger-org/publish_releases.py` announces tagged studio releases from `CHANGELOG.md`, map in `docs/blyg-releases.json` (0.35.1, 0.36.0, 0.36.1 live); third-party clients' releases by hand. `roadmap-tracks.md` 3.1 (`/updates.xml` vs the blyg's feed) left for Fable/Venkat to tick or strike. Original item: **Release announcements** go on the blyg, third-party clients' included (#66): one item
  per release, same byline and `generated[]` rule as (a). The format is yours; the
  `Release` workflow could post it, or a sync from `CHANGELOG.md`. Then check
  `roadmap-tracks.md` 3.1: the generic `/updates.xml` is likely redundant with the blyg's
  feed (the per-node "you are behind" notice is not) — tick or strike.
- **e. Mostly done session 60; member roster and wider schemes remain** (`docs/mentions-build-plan.md`). Unblocked session 60 (#91 B5): RFC-1's comment period closed 2026-11-04 and it is
  now `tn-6`; the studio work may begin. Its spec is tn-6 with #91's changes: **B2** —
  `@handle` is resolved by the publishing server on every write path (editor, API, tools),
  published `content_md` never carries one, unresolved `@word`s come back as warnings to
  every client and stay literal prose, never a rejection; **B4** — the found-mentions list
  (session 60 item a below). Was: **Studio work from RFC-1 is gated on its comment period closing** (#67 ruling 1c). Record
  it now in `blygger-studio/CLAUDE.md`'s backlog as gated, build later: sanitizer keeps
  `<data value>`; member roster with per-token bylines; address book with `@handle`
  consumed at publish; agent members per RFC-1 §5.6 (`operator`/`model` on the roster,
  scope decides the byline, resolver-only provenance, no pin/withdraw scopes by default).
  RFC-2 produces no studio work at all (#68).
- **f. `tn-2`** (identity), when written, absorbs #67 rulings 3 (shared-origin proof via the
  member's page under the origin) and 5 (`ids`), and cites RFC-1 for the rest.

## The queue, in order

Everything here is unblocked. Semantics are fixed by the decisions cited; implement
them. Where a build raises a question the decisions do not answer, apply the
four-question test (#58) before stopping: most studio-side questions are yours to rule. Priorities follow `roadmap-tracks.md`. Ship each as its own release with a
`CHANGELOG.md` entry stating `Migrations:`.

*Pruned session 38 (Opus, after the Fable round): items 1–5 and 7 of the old list are done
(0.11.1, re-pin, `impyrt`, 2.12/G6, fork flattening/G11, `cited` on `{url}` stubs/G10), and
studio#4 from item 8 closed. Remaining items keep their old numbers so references resolve.*

- **Kyle's three PRs: done session 39** — #41 and #42 in 0.33.0 (both nodes), #43 in 0.34.0
  (venkateshrao; PI after Venkat's click-through). **Aneesh's #44/#45 (read state)** are
  reviewed and wait on his rebase onto #43 with 0025+0026 folded — remote-apply the folded
  migration on a throwaway D1, then merge both as one release.
6. **Remote generation sources** (#44, the first 0.4 construct; **implementation plan:
   `v0.4-plan.md` §7.2**, tasks R1–R8 with acceptance checks). Exercise it across both
   live nodes (R8) and record the ids: that opens gate G8 and the 0.4 document.
6a. **Done** (0.35.0/0.35.1, session 40; M4 confirmed by Robert Peake session 42, so G9 is true).
   **Templated-surface reader for Soapbox** (G9; `v0.4-plan.md` §7.5, M1–M4). M3 was
   amended session 38 for #61: the receiver's verifier, not only `targetItemId`, changes.
   Land before Robert Peake posts a staging origin on blygger-spec#2.
8. **Done session 38** (0.32.2): `page` stability test (#56).
9. **2.13 — discovery surfaces from references** (#41): chain view first.
10. **Technical notes** (tracks 1.6): `tn-3` is written and was revised session 38 for #61.
   `tn-2` identity practice starts as `docs/proposals/identity-practice-proposal.md` (#35);
   #61 and #64 are ruled, so it can start. It is a `blygger-spec/docs/` file — the one
   ownership exception, since technical notes are Opus-written by decision; tell the Fable
   session when you open one.
11. **2.4 fork-friendliness, then 3.1 / 3.2** — version surfacing and the health cron. (2.3,
    the update path, shipped in 0.8.0 and was corrected in 0.8.3.) The exposed
    third-party nodes are still on pre-0.8 code.
12. **Phase B remainder** (`v0.3-plan.md` tasks 12–16): share, own items in hoppers,
    stub templates, threads tab, `stub_of` at import (studio#12 is the field report).
13. **The conformance runner** (#48): `blygger-spec/conformance/` — a publisher suite
    that takes an origin and a reader suite of fixtures. New directory, Opus-owned.
    blygger-spec#5 is the tracking issue; its author has fixtures generated from a
    running Worker to seed the reader half.

Shipped since the session-28 brief, so no longer here: the `[[` picker in all three
composers (0.7.0, #50 reader end included) and partial transclusion (0.8.1, promoted to
normative text session 31).

## Hand back

Studio backlog ticks with what was built and what it found; `CHANGELOG.md` entries
stating `Migrations:`; tagged releases; both nodes deployed and verified; your
`(parallel, Opus)` devlog entry; any decisions you ruled under #58, numbered and
labelled `Fable review pending`; gate promotions you performed (G6 and G10 are done and reviewed; G11 is yours now — move the §16 text, fix cross-references, add the §17
line, publish via `blygger-org/deploy.sh`); and anything outside the test that the
spec should say, as an open thread — not as a spec edit. Ideas you have that are neither ruled nor scheduled
go in that open-threads list too; the next Fable pass files them in `docs/backlog.md`.
