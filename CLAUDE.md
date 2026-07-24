# Ygg — Project Instructions

> Environment rules, keys & safety policies: see [`Code/CLAUDE.md`](../CLAUDE.md), `warnings.md`, `warnings-node.md`, `warnings-keys.md`, `security-policy.md` at the `Code/` level.

Ygg is an AI-native decentralized public writing medium — fragments + threads + TK-transclusion over static files + RSS. Public repo: `vgururao/ygg` (branch `main`). This folder is the **protocol + reference implementation** project. Venkat's *personal ygg deployment* will live separately in `Publishing/` once the reference client exists.

## Document map

| Doc | Role |
|---|---|
| [`docs/ygg-initial-spec.md`](docs/ygg-initial-spec.md) | Frozen v0 concept spec — never edit; open for public comment (issue #1) |
| [`docs/roadmap.md`](docs/roadmap.md) | Full roadmap v0.1 → post-1.0, with model-routing annotations |
| [`docs/v0.1-plan.md`](docs/v0.1-plan.md) | Implementation plan for v0.1 "Seed" — the current work spec |
| [`docs/wireframes/`](docs/wireframes/) | HTML mockups, rev 3 (public, studio, edit, thread, thread-edit) — gate for tasks 9/15 |
| [`docs/proposals/retract-pin-fork-proposal.md`](docs/proposals/retract-pin-fork-proposal.md) | DRAFT — Sonnet's writeup of the retract/tombstone gap + Venkat's unpublish-endcap/Pinned/fork proposal, for Fable evaluation |
| [`DEVLOG.md`](DEVLOG.md) | Per-session development log — **non-skippable**, see ritual below |
| `README.md` | Public face: idea, protocol on one screen, roadmap summary |

## Locked decisions (do not relitigate without Venkat)

1. **Protocol = static file contract** under `/ygg/`: `items/{id}.json` is the state plane (ground truth, full archive); `feed.xml` is the notification plane (lossy RSS, just a signal).
2. **IDs**: stable random 128-bit IDs for identity; per-version content hashes for integrity/IPFS. Never content-addressed IDs.
3. **Studio/page split**: every client = private studio (dynamic, unconstrained) + public page (the `/ygg` artifact, protocol-governed). The protocol governs *only* the page.
4. **Conformance levels** L0–L3, strict supersets; clients ignore unknown constructs; every ygg feed stays a valid RSS feed with self-contained HTML per item.
5. **AI is never in the protocol.** Generation is studio-side at authoring time; the page publishes output + provenance.
6. **Roadmap order** (restructured session 3, with Venkat): no-AI core first; both core abstractions in the first release (v0.1 publish: fragments + local threads → v0.2 subscribe → v0.3 threads-cross-client: stubs/nesting/DAG/`forked_from` → v0.4 AI/TK → v0.5 RAG/polish → v1.0 freeze).
7. Private content in v1 = never-published drafts (owner-only). Privileged-group access is deferred to L3.
8. **Withdraw + pin model** (session 3, supersedes tombstone/silent-unpublish): no permanent delete of published items — the single exit is *withdraw*, a permanent reversible endcap (`kind: "withdrawn"`, 200 forever, one feed entry, compliant clients roll up to null); *pins* are irrevocable per-version hosting promises (`items/{id}/v{n}.json`) that survive withdrawal; only pinned versions are exposed, pinning never forces a fork; `forked_from` is reserved for v0.3. Rationale: `docs/proposals/retract-pin-fork-proposal.md`.
9. **Transclusion grammar** (session 3): `![[id]]` on its own line, `![[id@vN]]` reserved; publish-time snapshot baked into self-contained HTML with `{id, version}` provenance; fragments-only nesting in v0.1; **no auto-pin** — pins remain a separate deliberate act; source withdrawal never cascades into thread snapshots. Spec: `docs/v0.1-plan.md` §2.9.
10. Licensing: MIT (code), CC-BY-4.0 (`docs/`).

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

- [ ] **Venkat: brand decision** — possible project rename (Yggdrasil mesh-network adjacency, session 3). Gates the domain purchase and deploy; does NOT gate any build work.
- [ ] Build the brand-name refactor (task 16 in `v0.1-plan.md`): single `BRAND` constant block + `RENAME.md` checklist so the rename is a constants edit. Sonnet-safe, runnable now; acceptance = tests pass with the constant set to `zzz`.
- [ ] Decide protocol XML namespace URI / dedicated domain **after the brand decision** (leading candidate pre-rename-question was `yggprotocol.org` — available as of 2026-07-24, .org preferred for commons governance). **Hard deadline: before v0.2 ships importers** (they match on the URI, which then becomes permanent). Recommended: settle before the first real deployment. Not a gate for task 11 (workers.dev suffices for the reference instance).
- [ ] **Deploy (task 11)** — D1 id, wrangler secrets + `.env.keys` registration, RSS-reader check. The only remaining v0.1 build task besides the brand refactor; both are gated on the brand decision above.
- [x] Build v0.1 "Seed" tasks 1–8 + 10 (session 2)
- [x] **Venkat:** review **rev-3** wireframes in `docs/wireframes/` (session 4) — approved live in-browser, no changes needed; cleared tasks 9/15
- [x] Build threads (tasks 13–14: migration 0003, transclusion resolver, thread surfaces) — session 4
- [x] Build studio UI (tasks 9 + 15) — session 4: composer/list/fragment editor/settings, thread editor with `![[` palette + live preview + publish-error banner; also brought public pages forward to the rev-2/3 wireframe (task 8 had shipped against rev 1)
- [ ] **Fable/Venkat: version-nav route gap** (found session 4) — the rev-2/3 public-page scrubber implies browsing to an older version's HTML, but no route serves one (§2.3 publishes only the latest version; pinned versions are JSON-only per §2.8). Shipped as display-only for now (not a Sonnet call to invent new API surface). Decide: add a historical-version HTML route, or keep the scrubber permanently inert — record the answer in `protocol-v0.1.md`.
- [ ] Fast-follow, not urgent: `feed.test.ts` has a pre-existing timestamp-ordering flake (shared per-file D1 instance + second-precision timestamps + version-only tie-break can push a same-second event out of the 50-window non-deterministically). Fix: monotonic sequence/rowid tiebreaker in `feedEvents()`'s `ORDER BY`, or millisecond timestamps.
- [ ] After v0.1 ships: draft `docs/protocol-v0.1.md` as the normative L1 spec (⚠️ FABLE) — fold in the two feed interpretations from DEVLOG session 2, the session-3 withdraw/pin decision record (proposal doc), and from session 4: the provenance-link-is-presentation-only rule (§2.9 content_html is bare blockquote + data attributes, no link), the withdrawn-thread `transclusions: []`-vs-omitted-for-fragments convention, and the version-nav route gap above.
