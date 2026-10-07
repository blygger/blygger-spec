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
- **d. Release announcements** go on the blyg, third-party clients' included (#66): one item
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
6a. **Templated-surface reader for Soapbox** (G9; `v0.4-plan.md` §7.5, M1–M4). M3 was
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
