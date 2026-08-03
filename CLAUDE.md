# Blygger — Project Instructions

> Environment rules, keys & safety policies: see [`Code/CLAUDE.md`](../CLAUDE.md), `warnings.md`, `warnings-node.md`, `warnings-keys.md`, `security-policy.md` at the `Code/` level.

Blygger is an AI-native decentralized public writing medium — fragments + threads + TK-transclusion over static files + RSS. Public repo: `blygger/blygger-spec` (branch `main`), part of the `blygger` GitHub org alongside the `blygger-org` and `blygger-com` site repos (session 6 rename + scaffolding — see `../CLAUDE.md`). This folder is the **protocol + reference implementation** project. Venkat's *personal blygg deployment* will live separately in `Publishing/` once the reference client exists.

## Document map

| Doc | Role |
|---|---|
| [`docs/ygg-initial-spec.md`](docs/ygg-initial-spec.md) | Frozen v0 concept spec — never edit (deliberately keeps the historical `ygg` name + filename, banner note added session 6); open for public comment (issue #1) |
| [`RENAME.md`](RENAME.md) | Brand-rename record (session 6, `ygg`→`blygger`) + checklist for what's outside the `BRAND` constant |
| [`docs/roadmap.md`](docs/roadmap.md) | Full roadmap v0.1 → post-1.0, with model-routing annotations |
| [`docs/v0.1-plan.md`](docs/v0.1-plan.md) | Implementation plan for v0.1 "Seed" — the current work spec |
| [`docs/wireframes/`](docs/wireframes/) | HTML mockups, rev 3 (public, studio, edit, thread, thread-edit) — gate for tasks 9/15 |
| [`docs/proposals/retract-pin-fork-proposal.md`](docs/proposals/retract-pin-fork-proposal.md) | DRAFT — Sonnet's writeup of the retract/tombstone gap + Venkat's unpublish-endcap/Pinned/fork proposal, for Fable evaluation |
| [`docs/proposals/author-field-proposal.md`](docs/proposals/author-field-proposal.md) | ACCEPTED (session 5) — opaque per-item `author`, single-publisher invariant, minimalist multiplayer; decision record for locked decision #11 |
| [`docs/proposals/curation-discovery-generation-proposal.md`](docs/proposals/curation-discovery-generation-proposal.md) | §1–3 ACCEPTED (session 7) — make-public-as-curation, blogroll + webmention discovery (L2), follow-is-nothing; §4 = v0.4 generation-hardpoint pre-record. Decision record for locked decisions #12–13 |
| [`docs/protocol-v0.1.md`](docs/protocol-v0.1.md) | **DRAFT** normative L1 spec (session 7, Fable) — publishes at `blygger.org/spec/0.1/`; folds in the session-2 feed interpretations and the session 3/4/5 decisions. Canonical here; `blygger-org/content/spec/0.1/index.md` is the publish copy |
| [`docs/deploy-stub-sites-plan.md`](docs/deploy-stub-sites-plan.md) | PLAN, not executed (session 6) — architecture + task list for deploying stub sites + `/blygg` test clients to `blygger.org`/`blygger.com` |
| [`DEVLOG.md`](DEVLOG.md) | Per-session development log — **non-skippable**, see ritual below |
| `README.md` | Public face: idea, protocol on one screen, roadmap summary |

## Locked decisions (do not relitigate without Venkat)

1. **Protocol = static file contract** under `/blygg/`: `items/{id}.json` is the state plane (ground truth, full archive); `feed.xml` is the notification plane (lossy RSS, just a signal).
2. **IDs**: stable random 128-bit IDs for identity; per-version content hashes for integrity/IPFS. Never content-addressed IDs.
3. **Studio/page split**: every client = private studio (dynamic, unconstrained) + public page (the `/blygg` artifact, protocol-governed). The protocol governs *only* the page.
4. **Conformance levels** L0–L3, strict supersets; clients ignore unknown constructs; every blygg feed stays a valid RSS feed with self-contained HTML per item.
5. **AI is never in the protocol.** Generation is studio-side at authoring time; the page publishes output + provenance.
6. **Roadmap order** (restructured session 3, with Venkat): no-AI core first; both core abstractions in the first release (v0.1 publish: fragments + local threads → v0.2 subscribe → v0.3 threads-cross-client: stubs/nesting/DAG/`forked_from` → v0.4 AI/TK → v0.5 RAG/polish → v1.0 freeze).
7. Private content in v1 = never-published drafts (owner-only). Privileged-group access is deferred to L3.
8. **Withdraw + pin model** (session 3, supersedes tombstone/silent-unpublish): no permanent delete of published items — the single exit is *withdraw*, a permanent reversible endcap (`kind: "withdrawn"`, 200 forever, one feed entry, compliant clients roll up to null); *pins* are irrevocable per-version hosting promises (`items/{id}/v{n}.json`) that survive withdrawal; only pinned versions are exposed, pinning never forces a fork; `forked_from` is reserved for v0.3. Rationale: `docs/proposals/retract-pin-fork-proposal.md`.
9. **Transclusion grammar** (session 3): `![[id]]` on its own line, `![[id@vN]]` reserved; publish-time snapshot baked into self-contained HTML with `{id, version}` provenance; fragments-only nesting in v0.1; **no auto-pin** — pins remain a separate deliberate act; source withdrawal never cascades into thread snapshots. Spec: `docs/v0.1-plan.md` §2.9.
10. Licensing: MIT (code), CC-BY-4.0 (`docs/`).
11. **Author/identity model** (session 5): `author` is an optional, per-item, origin-scoped, client-asserted, *opaque* pass-through object (`name` recommended, `url` optional, all other members = the client's private authorspace grammar) — no protocol guarantees or representations about it; authors are never addressable; the only protocol-authenticated entity is the client/origin. **Identity, like AI, is never in the protocol.** Feed invariant narrowed from single-*author* to single-**publisher**: multiplayer clients may publish one conformant feed with per-item bylines (no shared namespace, no `user@server`, DNS remains the namespace). Decision record: `docs/proposals/author-field-proposal.md`.
12. **Response primitives & curation** (session 7): no reply primitive, ever (frozen-spec stance, reaffirmed); transclusion is the primitive, stub is the gesture; **make-public for imported items = curation display only** (public hopper page, local snapshot, source attribution) — imported items are **never re-emitted on the publisher's feed** (would collide with `blygg:id` rollup + single-publisher invariant); feed-speech about others' content costs editorial (stub or fork-from-pin). No tags, no canned phrases in protocol — hoppers are the taxonomy, stub templates are studio sugar. Third leg of the pattern: **editorial convenience, like AI and identity, is never in the protocol.** Decision record: `docs/proposals/curation-discovery-generation-proposal.md`.
13. **Discovery model** (session 7): two planes, both **L2 and optional** — static plane = curated OPML blogroll (`/blygg/blogroll.opml` + manifest key, ships v0.2; no completeness claim); notification plane = **Webmention** (W3C, reused not invented) with **structural verification** (receiver checks the source item JSON actually names the target), ships v0.3; verified mentions are studio signals feeding detect-stubs, never auto-published. "Follow" is deliberately nothing: subscription stays client-local and invisible; no follower lists/requests/objects ever — the public graph is blogrolls (outbound) + verified stubs (inbound). The Webmention receiver is the protocol's first dynamic surface, acknowledged as an amendment carve-out to decision #1: optional-at-L2, "just files" stays the L1 floor. ActivityPub/WebSub/directories rejected (records in the proposal doc).

## Model routing

Coding sessions are expected to run on **Sonnet or Opus** working from the written specs in `docs/`. **Fable** is reserved for protocol-semantics and design work. The rule:

- Tasks marked **⚠️ FABLE** in `docs/roadmap.md` involve cross-client invariants, protocol semantics, security/crypto, or API-surface design. If you are not Fable and the session's work touches one, **stop and tell Venkat** rather than improvising.
- Everything else: implement exactly what the plan doc specifies. If the spec is ambiguous or wrong, don't redesign — record the issue in DEVLOG.md open threads and flag it. Small local judgment calls (naming, file layout, error copy) are fine.

## Stack conventions

- Cloudflare Workers + D1 + R2, TypeScript, wrangler. Node: `/usr/local/bin/node` (see `warnings-node.md`; **no `node_modules/` synced by Dropbox** — follow the policy there).
- Server-rendered HTML + vanilla JS on the page; Hono allowed in the worker; no client-side framework.
- Secrets: wrangler secrets only; register every key in `Code/.env.keys` per `warnings-keys.md`. Never commit secrets.

---

## At Session Start (always, before any other work)

1. Run `date` — record as session start time. Do NOT ask Venkat for it.
2. Read the **latest DEVLOG.md entry** (especially *Open threads* and *State after*) and skim the current plan doc's task list.
3. Determine session number (last entry + 1).
4. Check model routing: if today's intended work hits a ⚠️ FABLE item and you aren't Fable, flag it now.
5. Give Venkat a one-line orientation: session number, where things stand, proposed focus.

## After Each Work Session

**Before starting wrap-up:** ask "Ready to wrap up, or is there more to do?" unless Venkat has explicitly said to wrap up. Never initiate the wrap-up ritual unilaterally.

1. **`DEVLOG.md` — append a session entry. NON-SKIPPABLE.** Every session gets an entry, however trivial; a two-line entry is acceptable for a trivial session, a missing entry never is.
2. `CLAUDE.md` — check off / add TODOs; update the document map if docs were added.
3. `docs/roadmap.md` — tick exit criteria if met; `docs/v0.1-plan.md` (or current plan doc) — tick completed tasks.
4. Git: `git add` relevant files, commit, push.
5. Claude memory — save anything non-obvious not already in the repo docs.
6. **Wrap-up report (never skip):** checklist table of items 1–5, ✅ done / ❌ skipped / n/a, one-line note each.

### DEVLOG.md entry template

```markdown
## Session N — YYYY-MM-DD — Short descriptive title
**Model:** <model> · **Time:** ~HH:MM–HH:MM PT · **Committed:** yes/no · **Deployed:** <what, or "—">

**What & why:** The problem or goal, the decisions made, and *why* — including
alternatives that were closed off. Write as if briefing a competent engineer who
needs to reconstruct design rationale from this alone.

**State after:** Name the current state of the subsystems touched.

**Open threads:** Loose ends, flagged ambiguities, next-session candidates.
```

**Writing standard** (inherited from ribbonfarm_site): the devlog is a load-bearing architectural reference, not a diary. Why over what; decisions that locked in a direction get named; a future agent should be able to onboard from DEVLOG.md + docs alone.

## TODO

- [x] **Venkat: brand decision** — session 6 (2026-07-24): renamed `ygg` → **blygger** (Yggdrasil mesh-network adjacency, session 3); default publish path `/blygg`; domains `blygger.org` (XML namespace, commons/spec) + `blygger.com` (protocol-adjacent commercial dev), both acquired.
- [x] Brand-name refactor (task 16) — executed session 6: `BRAND` constant in `types.ts`, full codebase + docs rename, `RENAME.md` checklist. Details in `docs/v0.1-plan.md` §5 task 16.
- [x] Namespace URI — resolved session 6: `https://blygger.org/ns/0.1` (was §7 open decision #1).
- [ ] **Deploy (task 11)** — D1 id, wrangler secrets + `.env.keys` registration, RSS-reader check. The only remaining v0.1 build task; no longer gated on anything.
- [ ] **Deploy stub sites to blygger.org + blygger.com** — plan written session 6 (`docs/deploy-stub-sites-plan.md`), not yet executed. DNS onboarding, D1/R2/secrets provisioning ×2, per-site Wrangler environments, landing-page content, Workers Routes wiring. Recommends doing task 11's workers.dev deploy first as a rehearsal.
- [x] Build v0.1 "Seed" tasks 1–8 + 10 (session 2)
- [x] **Venkat:** review **rev-3** wireframes in `docs/wireframes/` (session 4) — approved live in-browser, no changes needed; cleared tasks 9/15
- [x] Build threads (tasks 13–14: migration 0003, transclusion resolver, thread surfaces) — session 4
- [x] Build studio UI (tasks 9 + 15) — session 4: composer/list/fragment editor/settings, thread editor with `![[` palette + live preview + publish-error banner; also brought public pages forward to the rev-2/3 wireframe (task 8 had shipped against rev 1)
- [x] **Version-nav route gap** (found session 4) — **resolved session 5 (Fable + Venkat): indicator, not navigation.** No historical-version HTML route, ever, in v0.1 — pinned versions stay JSON-only; a pinned-only HTML route could be added post-v0.1 additively if real demand appears. Recorded in `v0.1-plan.md` §2.8.
- [ ] Sonnet-safe UI cleanup (fast-follow, rides with the feed-flake fix): replace the disabled rev-3 scrubber on `f/{id}/`/`t/{id}/` with plain version text + pin links per §2.8 ("v6 · pinned: v2, v4"); update the wireframes to match.
- [ ] Fast-follow, not urgent: `feed.test.ts` has a pre-existing timestamp-ordering flake (shared per-file D1 instance + second-precision timestamps + version-only tie-break can push a same-second event out of the 50-window non-deterministically). Fix: monotonic sequence/rowid tiebreaker in `feedEvents()`'s `ORDER BY`, or millisecond timestamps.
- [x] ~~After v0.1 ships:~~ draft `docs/protocol-v0.1.md` as the normative L1 spec (⚠️ FABLE) — **drafted session 7 (Fable), ahead of the v0.1 ship, marked DRAFT**; folds in the two session-2 feed interpretations (latest-content rendering; withdrawn-single-entry), the session-3 withdraw/pin model, session 4's provenance-link-is-presentation-only rule and `transclusions: []`-vs-omitted convention, and session 5's version-nav resolution + author-field record. Remaining: declare it stable when task 11 + the org/com deploys land, and freeze the `blygger.org/spec/0.1/` copy then.
- [ ] Session 7 decisions to carry into the v0.2/v0.3 plan docs when written: blogroll (v0.2), make-public-as-curation (v0.2), webmention mechanics (v0.3 ⚠️ FABLE), stub templates (v0.3), fragment-level generation hook + `content_md` lean (v0.4 ⚠️ FABLE) — all recorded in `docs/proposals/curation-discovery-generation-proposal.md` and already reflected in `docs/roadmap.md`.
