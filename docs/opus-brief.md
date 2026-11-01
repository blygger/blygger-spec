# Opus brief — the standing queue for an implementation session

**Written:** session 31 (2026-10-03), by Fable 5.1, replacing the session-28 brief after
Kyle Mathews' phase 3 was ruled (#52) and two queue items shipped. **Session 33** (same
day, Fable) inserted item 5, fork flattening (#57); items 1–4 shipped in session 32.
**Session 40** (2026-10-07, Fable) added the official-blyg section below (#66–#68). **Rewrite this file when the queue changes materially.** It is where an Opus or Sonnet
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

## New from session 56 (2026-11-01) — three rulings, do these before the queue below

Decisions #86–#88 (`CLAUDE.md`), reasoning `v0.4-plan.md` §16, text in the spec's seventh
0.4 revision (§16.12, §16.13 ruled shapes; §4/§6.1/§12.1/§12.2/§15.4 for #87). Each has
a build gate; when the gate has run, promote under #58 (move the text, fix cross-references,
add the §17 line, record the build's calls) and Fable reviews in batch.

- **w. Hopper feeds (#86, ROADMAP row 96).** Review Aneesh's draft
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
  affordance to any page before then.

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
- **i. Draft RFC-3, the pace-layered order** (#73), from
  `blygger-studio/docs/pace-layered-feed.md` and `test/fixtures/feeds/*.json`, in the
  shape of `docs/rfcs/rfc-1-*.md` and `rfc-2-*.md`: model, wire inputs, reference
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
- **e. Studio work from RFC-1 is gated on its comment period closing** (#67 ruling 1c). Record
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
