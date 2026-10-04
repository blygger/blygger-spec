# Opus brief — the standing queue for an implementation session

**Written:** session 31 (2026-10-03), by Fable 5.1, replacing the session-28 brief after
Kyle Mathews' phase 3 was ruled (#52) and two queue items shipped. **Session 33** (same
day, Fable) inserted item 5, fork flattening (#57); items 1–4 shipped in session 32.
**Rewrite this file when the queue changes materially.** It is where an Opus or Sonnet
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

## The queue, in order

Everything here is unblocked. Semantics are fixed by the decisions cited; implement
them. Where a build raises a question the decisions do not answer, apply the
four-question test (#58) before stopping: most studio-side questions are yours to rule. Priorities follow `roadmap-tracks.md`. Ship each as its own release with a
`CHANGELOG.md` entry stating `Migrations:`.

1. **Deploy 0.11.1** (Kyle's #25, merged session 31): apply `0014_public_page_indexes.sql`
   to both D1s first — the new code assumes the indexes — then `deploy:vgr`, `deploy:pi`,
   verify, and push the `v0.11.1` tag. Response time on the live homepage is unmeasured;
   measure it once before and after.
2. **Bulk re-pin against the direct freshness check** (#33, the second half of migration
   0011's fact): for imported items, fetch `{origin}items/{id}.json`, compare `version`
   to each reference's; a studio surface to refresh a thread's stale snapshots as one
   authoring act (a refresh is a republish — version bump, feed entry, mentions; #38 says
   never silently).
3. **`[TK]impyrt=…[/TK]` in the composer** (#37): output is the pasted text verbatim,
   wrapped `blyg-tk-gen`, `generated[]` entry with `sources: []`, `model`/`at` only if
   supplied. Small.
4. **2.12 — generated changelog notes + history view** (#40): note from the local diff
   when the author leaves it blank, **pin-bounded** (full between pins, descriptive over
   unpinned), editable before publish; emit `changelog[].generated: true`. Record in your
   devlog when both nodes have exercised it — that opens gate G6.
5. **A fork of a thread flattens its quotes** (#57, spec §16.6f, reasoning `v0.4-plan.md`
   §9.1): `resolveForkSource` builds the draft from the pinned file, `content_md` for the
   thread's own prose byte-exact and `content_html` for the quotes — each `blyg-transclusion`
   element replaced by an ordinary markdown blockquote of its content (recursive; `blyg-partial`
   from its paragraphs) plus an attribution line (origin, id, link to `page` where known, else
   the item document). No `blyg-transclusion` class survives; no inherited `transclusions[]`;
   no quote-mentions. `blyg-tk-gen` spans in own prose and in quotes are re-wrapped as `impyrt`
   so `generated[]` survives — today's fork drops it for a forked fragment too, the restore
   leak's class. HTML-to-markdown for the blyg dialect only. Update the stub-vs-fork section
   of `/studio/syntax`. **Exercise:** on one node, fork a thread from the other that quotes a
   third item; record the ids — that opens gate **G11**. Same item: warn when a generated
   output contains a `![[id]]` the instruction did not (it becomes a real quote at publish).
6. **Remote generation sources** (#44, the first 0.4 construct; **implementation plan:
   `v0.4-plan.md` §7.2**, tasks R1–R8 with acceptance checks). Exercise it across both
   live nodes (R8) and record the ids: that opens gate G8 and the 0.4 document.
7. **`cited` on `{url}` stubs** (#55, spec §16.1a): emit the §5.9 object when a stub
   targets a plain URL — `retrieved` always, `source`/`author`/`excerpt`/`url` when the
   page offers them; the pour-over-links affordance (studio#17) is the natural producer.
   Assert an import across nodes retains it verbatim; record it — that opens gate G10.
8. **Two small spec-driven fixes** from session 31: `[[id]]` inert inside code spans and
   blocks, as `![[id]]` already should be (#54; studio#4 now covers both forms); and a
   `page` that never changes across versions for the same item (#56 — the client already
   does this; add the assertion so slugs (studio#19) cannot break it later).
9. **2.13 — discovery surfaces from references** (#41): chain view first.
10. **Technical notes** (tracks 1.6): `tn-3` groups and aggregation is writable now
   (#36); `tn-2` identity practice starts as `docs/proposals/identity-practice-proposal.md`
   (#35). Both are `blygger-spec/docs/` files — the one ownership exception, since they
   are Opus-written by decision; tell the Fable session when you open one.
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
labelled `Fable review pending`; gate promotions you performed (G6, G10, G11 are yours
once their exercise has run — move the §16 text, fix cross-references, add the §17
line, publish via `blygger-org/deploy.sh`); and anything outside the test that the
spec should say, as an open thread — not as a spec edit. Ideas you have that are neither ruled nor scheduled
go in that open-threads list too; the next Fable pass files them in `docs/backlog.md`.
