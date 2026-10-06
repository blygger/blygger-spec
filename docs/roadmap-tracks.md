# Blygger Program Roadmap — Four Tracks

Written session 26 (2026-09-28). This is the **program** roadmap: who does what, in
which repo, in what order, now that Blygger is more than one implementation.

It does not replace [`roadmap.md`](roadmap.md), which is the **protocol version
ladder** (v0.1 → post-1.0) and remains the spine of Track 1. Read that for what each
protocol version means; read this for how the four workstreams sequence against each
other.

**Model routing** is unchanged and applies per item: **⚠️ FABLE** marks protocol
semantics, cross-client invariants, security, or API-surface design. Everything else is
Opus/Sonnet-safe from a written plan. Tracks 2–4 are mostly unmarked; Track 1 is mostly
marked.

---

## Why four tracks now

Through session 25 this project was one repo, two nodes Venkat controls, and one
implementation. All three of those stopped being true. Measured live on 2026-09-28,
against blygger.com's 11 approved blygs and GitHub search:

| Fact | Number |
|---|---|
| Live blygs in the directory | 11 (plus 6 plain feeds) |
| Distinct `generator` strings among them | **7** |
| Of those, ours (`blyg-ref/0.3.0`) | 5 — 2 ours, 3 strangers self-hosting |
| Independent implementations | **6** |
| Nodes still on protocol **0.2** | **4 of 11** |
| Community repos located on GitHub | **9** (4 named by Venkat, 5 found by search) |
| Clients in the wild with **no** locatable repo | **5 of 7** |

The clients in the wild, from their manifests:

| `generator` | Node | Protocol | Repo |
|---|---|---|---|
| `blyg-ref/0.3.0` | venkateshrao, protocol-institute, jd-blyg, aneeshsathe, bricolage | 0.3 | ours |
| `Blynger/0.8.2` | bradydale.com/blyg/ | 0.3 | not located |
| `sachin-blyg/0.1.0` | blyg.sachinbenny.xyz | 0.3 | not located |
| `caseyjr-blyg/0.1.0` | caseyjr.org/blyg/ | 0.2 | not located |
| `blyg-publisher/0.0.1` | lightsong.ink/blyg/ | 0.2 | `brndnpink/blyg-publisher` (Obsidian) |
| `goddinpotty-blyg/0.1` | ammdi.hyperphor.com/blyg/ | 0.2 | goddinpotty (Roam→static mod) |
| `thinking.drwip.com` | thinking.drwip.com/blyg/ | 0.2 | not located |

**Two corrections to the session-25 record**, both found by reading the live manifests
rather than the notes:

1. Session 25's devlog says all three third-party nodes served "conformant `blyg 0.3`
   from `blyg-ref/0.3.0`". Two did. **`thinking.drwip.com` runs its own client** — its
   `generator` is the bare hostname `thinking.drwip.com`, its protocol version is `0.2`,
   and its manifest `updated` is `2026-08-31`, which is three weeks *before* the talk.
   So the first independent implementation predates the talk and was never a self-host
   of ours. The story "strangers followed the start page" is true of jd-blyg and
   aneeshsathe; drwip read the spec.
2. The Webmention exposure in `self-host-plan.md` §9.1 is **narrower than recorded and
   still real**: exactly the five `blyg-ref` nodes advertise an endpoint, so the
   third-party subjects are **three** (jd-blyg, aneeshsathe, bricolage), not all
   third-party nodes. The six independent clients advertise no `webmention` key at all.
   Approving nine listings in session 26 widened the exposed set by **one** (bricolage).

Two consequences set the shape of everything below. First, `blygger-spec` can no longer
be both the normative text and one implementation of it — a stranger filing
"transclusion is broken" may mean either, and six implementers now exist to file it.
Second, **conformance stopped being self-evident.** While we were the only client,
"conformant" meant "what our tests pass". With six others and a 0.2/0.3 split across
live nodes, it has to mean something anyone can run.

---

## Decisions taken this session (Venkat)

- **The reference client is named `blygger-studio`.** Repo `blygger/blygger-studio`,
  package `@blygger/studio`, `generator` string `blygger-studio/0.4.0`. The name is
  what the community already uses unprompted — bricolage's own blyg says "I added an
  MCP server to Blygger Studio" — and it matches the existing `/studio/*` routes. It
  also leaves `blyg-ref` free as a generic conformance label, and stays clear of
  `Blynger`, a third-party client already in the wild. The `generator` string is
  informative per #18d, so the change is not a wire break; the five live `blyg-ref`
  nodes re-stamp whenever they next upgrade, and 0.3.0 nodes that never upgrade keep
  reporting `blyg-ref/0.3.0` truthfully.
- **Version alerts are directory-side and stay off the wire.** blygger.com's resolver
  already reads every node's `generator` on submission, so version data exists today
  with nobody opting in. The directory grows a known-latest table, shows an
  update-available note on its listing, and publishes `/updates.xml` for operators who
  want a feed. **The wire learns nothing about client versions** — #18d is about
  protocol version, and the instinct recorded in the session-25 TODO holds. This is the
  only option that reaches the six clients we do not ship and the forks we will never
  see.

---

## Track 1 — Core protocol

**Repo:** `blygger/blygger-spec` → normative-only after the Track 2 split.
**Spine:** [`roadmap.md`](roadmap.md). **Mostly ⚠️ FABLE.**

| # | Item | Notes |
|---|---|---|
| 1.1 | ~~**⚠️ FABLE — finalize v0.3**~~ (`protocol-v0.3.md`, Phase B task 18) | **Drafted session 27 (2026-09-28, Fable 5.1)** under strict #21: built surface only, session-27 rulings in its §16. **Published session 28 (2026-09-28, Fable 5.1)** at `blygger.org/spec/0.3/` with `cited`, `[[id]]` and `generator_url` promoted to normative text (G1/G2 true in the gate table); first snapshot `2026-09-28` cut the same day; 0.2 SUPERSEDED live. |
| 1.2 | ~~**⚠️ FABLE — should a citation's human half be on the wire?**~~ | **Ruled session 27: yes, additive and optional — decision #30** (`cited` inside any reference; `v0.3-plan.md` §8c). Normative once blygger-studio emits it — that emission is now a Track 2 task. |
| 1.3 | ~~**⚠️ FABLE — define v0.4**~~ | **Defined session 28 (2026-09-28, Fable 5.1): [`v0.4-plan.md`](v0.4-plan.md)** — decisions #43–#48. On the wire 0.4 is remote generation sources with a `source` mention relation, plus **the manifest-located surface (#51, from blygger-spec#2)** — templates for where the surface lives, so CMS-hosted sites can conform; partial quotation was ruled the same afternoon (#49) as a partial transclusion that is a **0.3 revision** by #43; everything else the old Canopy list named is Track 2. The 0.4 *document* opens when the first construct is built (#43). |
| 1.4 | **A conformance suite anyone can run** | New, and the biggest gap this session found. Six implementations, no shared definition of conformant, and 4 of 11 nodes on 0.2. Shape: a published fixture set + a checker that takes an origin and reports per-clause pass/fail per version. `blyg-ref` becomes the label it asserts against. Partly Fable (what is normative vs. advisory), mostly not (the runner). **Fable half ruled session 28 — decision #48:** MUST fails, SHOULD warns, MAY shape-checked when present; two suites (publisher-by-origin, reader-by-fixtures); the checker names its snapshot. The runner is Opus work in `blygger-spec/conformance/`. |
| 1.5 | **Public decision log** | "Locked decisions" is agent-facing in a file nobody outside the checkout reads. Wanted: what was decided and why, publicly. Publishing surface is Track 4. |
| 1.6 | **Technical notes `tn-2`–`tn-5`** (session 27, decisions #35–#39) | Non-normative, the `tn-1` genre, Opus-writable from the decisions. **`tn-2` identity practice** (#35: URL-you-control, `rel=me` + signature-over-`content_hash` proofs, provider mapping, reader rules, agent bylines with `operator`) — starts as `docs/proposals/identity-practice-proposal.md`, becomes a note after one client emits a proof and another verifies it. **`tn-3` groups and aggregation** (#36) — writable now, every construct it cites is built. **`tn-4` the write surface** (#31) — after tokens + one third-party tool. **`tn-5` the agent contract** (#38/#39) — after the reference agent runs. **`tn-6` version histories in practice** (#40: pin-bounded note depth, generate-on-blank, the `generated` flag, timeline + pin-diff views) — after 2.12 ships. Measured 2026-09-28: all 11 live blygs emit only `name`+`url`; nobody invented an authorspace grammar. |
| 1.10 | **The agent contract** (#39) | What a blyg offers an agentic co-author: write (#31 tokens), read (the public state plane as corpus; a read scope for studio-private material), signals (poll `/api` first), provenance (`generated[].sources` is the RAG disclosure). Proven by 2.10, written up as `tn-5`. |
| 1.7 | ~~**A republish re-sends every reference**~~ | ✅ **done session 27 (Opus), `blygger-studio` 0.6.1, migration 0011.** `mentions_out.target_version` plus a null-safe change test; withdrawal is the one caller that may force a re-send, because §15.7 owes a mention precisely when the target has *not* changed. Built for the freeze: §15.2 asserted the reference client already did this. Decision #33's staleness probe needs the same fact for imported items and is still open (2.6). |
| 1.8 | ~~**⚠️⚠️ FABLE — the authoring interface: a blyg as a publishing *target***~~ | **Ruled session 27 — decision #31:** never protocol-normative; a non-normative companion note (tn genre) after blygger-studio's surface is built with scoped, revocable bearer tokens and used by ≥1 third-party tool. Auth direction and the password-reset constraint are in `v0.3-plan.md` §8c. **2.9 is unblocked.** The write-up below stands as the evidence record. |
| 1.9 | ~~**⚠️ FABLE — six wire questions from the client issue list**~~ — **all ruled session 27** (`v0.3-plan.md` §8c): `[[id]]` exists and is wire-silent (#32); remote TK sources wait for 0.4 with shape pre-committed; partial quotation, `impyrt`, titles deferred to 0.4; staleness direct-only (#33). Original triage: | Triaged session 26 and written up in [`v0.3-plan.md`](v0.3-plan.md) §8b: whether `[[id]]` plain links exist and whether a link is disclosed/notifying (mention relations are exactly `stub\|transclusion\|fork`); whether a TK source may be remote (`ScopeProvenance.sources` has **no `origin`**, so the wire cannot express it); **partial quotation** (needs a selector + a faithfulness guarantee — probably the largest); `impyrt`, externally generated spans, and what `generated[]` is allowed to assert; and whether a leading `#` becomes a real title (items are deliberately titleless and `<title>` is a wire field). **Two were reported as bugs and are not bugs** — the client implements the spec in both cases. |

## Track 2 — Reference client (`blygger-studio`)

**Repo:** `blygger/blygger-studio` — new, split from `blygger-spec/worker/` with history.
**Opus/Sonnet-safe** throughout: this track implements semantics, it does not set them.

| # | Item | Priority |
|---|---|---|
| 2.1 | ✅ **Split the repo, with history — done session 26.** All 59 commits of `worker/` via `git subtree split`; `blygger/blygger-studio` created public; renamed via a new `CLIENT` constant decoupled from `BRAND`; both user agents re-derived (they had drifted to `blyg-ref/0.2` and `/0.3` on a 0.3.0 client); 508 tests + `tsc` verified standalone **before** the spec repo was touched. `blygger-com`'s `sync-vendor.sh` re-pointed. | ✅ done |
| 2.2 | ✅ **Issue scaffolding — done session 26.** `bug.yml` + `feature.yml` here, `protocol-bug.yml` + `proposal.yml` in the spec repo, `project.yml` + `site.yml` in `.org`; every `config.yml` cross-links the others with the routing rule ("would another client have to change?") and invites misfiling over not filing. The bug form asks whether the client was modified — the only channel there is, given zero forks. | ✅ done |
| 2.3 | **The update path.** `npm run upgrade` (designed in `self-host-plan.md` §5, never built) + **⚠️ partially done session 27:** a release channel now exists in its minimum form — tag `v0.4.1`, a GitHub release, `CHANGELOG.md` whose every entry states `Migrations:` explicitly, and a README § *Releases and upgrading* written for the only node shape that exists in the wild (stood up by hand, possibly from the pre-split `blygger-spec/worker/`, for which `git pull` does **not** work). **Built session 28–29:** `npm run upgrade` exists (shows what is coming, calls out changed migrations, keeps your `wrangler.jsonc` on conflict, gates on tsc + suite), `npm run init` provisions from scratch, and the studio *notifies* — an update alert comparing `CLIENT.version` against the public releases feed, on by default, nothing about the deployment sent. **Session 29 fixed the one place these disagreed:** `upgrade` merged `upstream/main` while the alert compared release tags, so an operator could upgrade onto unreleased commits and still be told they were current — and `CLIENT.version` on `main` between releases is the *previous* release's number. `upgrade` tracks `v*` tags now. Still unbuilt: `releases.json`. Feeds Track 3's known-latest table. | MEDIUM |
| 2.4 | **Fork-friendliness.** People are already modifying the client for custom needs — an MCP server bolted onto Studio is in the wild. An upgrade path must survive a fork: named extension points, a documented "what we will not rename", and an upgrade that rebases rather than overwrites. Design this *with* 2.3, not after. | **HIGH** |
| 2.5 | ~~**Webmention rate-limit hardening**~~ (`self-host-plan.md` §9.1) | ✅ **done session 27, shipped as `blygger-studio` 0.4.1.** Registrable-domain cap (120/h) *alongside* the per-host 60 — the domain grouping is a heuristic that can over-collect, so it is the looser of the two; global cap of **300 accepted claims/hour**, which is what bounds the fetch bill the plan's "pending verifications" wording was reaching for; `failed` rows pruned at 30 days on the cron. 512 tests, `tsc` clean, **no migration**. **Not yet on the three exposed nodes** — see 2.3 and 3.1. Followed by **0.5.0**, which makes the endpoint *optional in the client* as §15 always was — `accept_mentions`, default on, and off means no manifest key, no page advertisement, 404 on POST. Both our nodes are on 0.5.0. |
| 2.5a | ✅ **The three §16 constructs — done session 27 (Opus), 0.6.0.** `cited` on all three references (live + pinned, retained on import), `[[id]]` plain internal links, `generator_url`, and `level` 1 → 2. Exercised across both live nodes, which is what turned gates **G1** and **G2** true — evidence in [`fable-brief.md`](fable-brief.md). Also in 0.4.1/0.5.0: webmention hardening and an `accept_mentions` switch, since §15 is OPTIONAL and the client had no way to say so. | ✅ done |
| 2.6 | **The studio backlog** — Venkat's session-26 issue list, triaged: 10 items in [`blygger-studio`](https://github.com/blygger/blygger-studio/blob/main/CLAUDE.md)'s CLAUDE.md backlog. Plus the carry-overs: subscription titles never refresh, 1.7's republish behaviour, the studio/public theme split. Two entries carry constraints rather than just descriptions — the password reset is sequenced **after 1.8**, and the timezone request localizes rendering only and must never reach the wire. | MEDIUM |
| 2.7 | **v0.3 Phase B remainder** — tasks 12 (share), 13 (own items in hoppers), 14 (stub templates), 15 (threads tab), 16 (`stub_of` at import). | MEDIUM |
| 2.8 | **Packaged distribution** — `self-host-plan.md` §4 template repo + `npm run init`. The start page already does this job informally and has produced three nodes, so the template is now an improvement, not a prerequisite. | MEDIUM |
| 2.9 | **`/api` becomes a contract** — versioning, token auth, CORS, idempotency, and a written reference. Today it is 30 private endpoints behind one owner cookie. ~~Gated on 1.8~~ **Unblocked session 27 (#31): the contract is ours alone.** Direction: bearer tokens with coarse scopes, owner-minted/revoked, root password never held by a tool, revoke-all on reset, CORS for token requests, `rel`-link discovery. **Session 31 (#52): built by Kyle Mathews in his phase 3** (`blygger-studio/docs/migration.md` §3) — an OAuth-style minting flow plus mint-and-paste, under four invariants; Opus reviews, does not build. | **HIGH** |
| 2.10 | **Reference agent — `blygger/blygger-agent`** (#39, proposed repo) | A deliberately unintelligent chief-of-staff that proves 1.10: detects stale snapshots and withdrawn sources, drafts refreshes for a decision, files inbound mentions as tasks, authors under its own byline with `operator`, discloses everything through `generated[]`. Brain pluggable (Venkat: `mixture-of-vgrs`). First external client of the token model, which is the point. | after 2.9 |
| 2.11 | **`[TK]impyrt=…[/TK]` in the composer** (#37) | Studio-private grammar; wire is the existing `generated[]` with `sources: []`. Small; unblocked. | now |
| 2.12 | **Generated changelog notes + history view** (#40) | When the note is blank at publish, generate one from the locally held prior version, **pin-bounded** (full between pins, descriptive-only over unpinned), editable before publish; emit `changelog[].generated: true` on those entries (promotes spec §16.6c). Reader side: a history affordance on the rolled-up entry — notes as a timeline, local diffs between consecutive pinned versions. Works against any 0.2 blyg with pins. | **done** — built 0.14.0/0.15.0 (session 32); §16.6c promoted into §5.2 in the seventh revision (session 37, Fable review pending) |
| 2.13 | **Discovery surfaces from references** (#41) | Four, none touching the wire: chain view from nested `data-blyg-*` (every participant of a restub chain, zero fetches; subscribe per unknown origin); "responds to" walk over `stub_of` to the root; the conversation around you (inbound verified ∪ outbound — "responded to you, not subscribed" first); second-degree blogrolls + cited-origin aggregate, ordered locally. Parser carries origin context down nested layers (absent = baking layer's origin). Sanitizer verified to keep `data-blyg-*`. | now |

## Track 3 — Registry & discovery (blygger.com)

**Repo:** `blygger/blygger-com`. **Opus/Sonnet-safe.**

| # | Item | Priority |
|---|---|---|
| 3.1 | **Version surfacing + `/updates.xml`** — the decision above. Known-latest table, per-listing update note, operator-subscribable feed. Depends on 2.3 for what "latest" means for our own client. | **HIGH** |
| 3.2 | **Periodic re-resolution / health.** Every listing is resolved once, at submission, and never again. Three days of drift was enough to make one approval unverifiable this session. Wanted: a cron that re-resolves, records `generator` and protocol version over time, and flags a listing that stops resolving. This is also what makes 3.1 honest. **Session 29 gave this a second reason and a concrete first user:** listing is now automatic, and a submission that is merely *wrong* rather than hostile (stale manifest `site`, plain HTTP, unreachable host) is listed with a **warning** the operator sees once, at submission, and never again. Re-resolution is what would make those warnings true over time and make "fixed" observable. The four decisions it needs — chiefly whether a listing shows its warnings publicly, which changes what the rest is for — are written up in `blygger-com/CLAUDE.md`'s TODO. | **HIGH** |
| 3.3 | **`feed`-kind rows carry no title** — plain feeds display as bare hostnames while blygs show their manifest title. The resolver reads the channel title at submission and the row drops it. Six feed rows now show this. | MEDIUM |
| 3.4 | **Queue throughput.** Ten submissions accumulated in three days with no notice to anyone. Wanted: a submission notification, and a review path that does not require a D1 query from a laptop. **Session 27:** a submission can now carry an optional, never-published operator contact (migration 0002), collected because a security release had nowhere to go; the notification half is still unbuilt. | MEDIUM |
| 3.5 | **Protocol-version badge.** 4 of 11 nodes are on 0.2. The directory knows and does not say. | LOW |
| 3.6 | **Held listing: `blyg.thoughtfolio.xyz`** — TLS fails from three independent local clients (`ERR_SSL_WRONG_VERSION_NUMBER` on :443, and :80 302s to `safebrowse.io/warn.html`), while the Worker resolver reached it as a blyg on 2026-09-26. Either a filter on our vantage or a parked domain; indistinguishable from here. 3.2 resolves this class of question structurally. | LOW |

## Track 4 — Developer community (blygger.org)

**Repo:** `blygger/blygger-org` — static, Python `build.py` → Cloudflare Pages.
**Opus/Sonnet-safe.**

| # | Item | Priority |
|---|---|---|
| 4.1 | ✅ **Ecosystem directory — built and live session 26** at [blygger.org/ecosystem/](https://blygger.org/ecosystem/). 11 entries; `sync_ecosystem.py` + `ecosystem/projects.toml`; census-primary discovery; `generator_aliases` so a renamed client's own nodes aren't credited to a stranger. Already prints the update signal: *"5 of 5 live nodes run an older build"*. | ✅ done |
| 4.2 | ✅ **Submission path — done session 26.** `blygger-org/.github/ISSUE_TEMPLATE/project.yml`, linked from `/start/` and from the ecosystem page. Asks for category (client/tool/integration/mod) and a *distinctive* `generator`, and says why we must be told: a tool or mod is invisible to the census. | ✅ done |
| 4.3 | ✅ **Publish the split — done session 26, deployed.** `/start/` rewritten: client links and the `wrangler.jsonc` path moved to `blygger-studio`, the "exactly one reference implementation" paragraph replaced with the seven-client reality, and the remaining gap restated as a local-first client plus a conformance checker. Frozen `/spec/` snapshots deliberately untouched. | ✅ done |
| 4.4 | ✅ **Published session 28 (2026-09-28).** `sync_spec.py` registers 0.3 as living and flips 0.2 to `("SUPERSEDED", "0.3")`; snapshot `2026-09-28` paired with tag `spec/0.3/2026-09-28`; `/start/` links 0.3 and carries the implement-the-living-text sentence (#42); the index's reference-implementation line now points at `blygger-studio` releases. | ✅ done |
| 4.5 | **Publish the decision log** (Track 1.5) and `tn-2` (1.6). | Gated |
| 4.6 | **A conformance page** — what `blyg 0.3` requires, and the checker from 1.4 as something an implementer can point at. | Gated on 1.4 |

### 4.1 — how the ecosystem directory works

Static site, so everything resolves at build time, and the page is only as fresh as the
last build. Three parts:

1. **`content/ecosystem/projects.toml` — the curated list.** One entry per artifact:
   repo, category, and a human-checked one-liner. Curated, not automatic: listing is an
   editorial act, the same as the blyg directory.
2. **`sync_ecosystem.py` — the periodic check.** Per entry, hit the GitHub API for
   description, language, license, last push, archived state. Writes a generated cache;
   never edits the curated file.
3. **Generated summaries.** A short summary per project, written from the repo's README
   and refreshed when the repo changes, held in the cache with the commit it was
   generated from so a stale summary is detectable rather than silent. Clearly marked
   as generated, because a wrong summary of someone else's project is a small public
   insult. A client with no locatable repo gets no generated summary — there is nothing
   to read — so those entries are manifest facts only until someone tells us where the
   source lives.

### 4.1a — how discovery actually works (measured 2026-09-28)

Worth stating because the obvious answer is wrong. **Fork-following finds nothing:**
`blygger-spec`, `blygger-org` and `blygger-com` have **zero forks between them**. Nobody
is forking; people clone, copy, or read the spec and write their own client. So the
mechanism one reaches for first has no yield at all, and mods — the population Track 2.4
exists for — announce themselves nowhere by construction.

The four mechanisms tested, with their real yields:

| Mechanism | Found | Depends on |
|---|---|---|
| **Manifest `generator`, via blygger.com's resolver** | **all 7 clients** | the node being listed; nothing else |
| `blygger in:name,description,readme` | 6 external repos | the word appearing in the repo's own text |
| `topic:blygger` | 3 repos | the author opting in to a topic |
| code search `blyg.json` | 1 more (`chrisbodhi/newschematic`, the Hugo *deployment*) | GitHub having indexed the file |
| forks of our repos | **0** | — |

**Manifest-driven discovery is primary.** It is the only mechanism that sees all seven
clients, because the `generator` string is in a file the protocol *requires* to be
public, and it discovers a client by its **deployment** rather than its repo. Five of the
seven — `Blynger/0.8.2`, `sachin-blyg`, `caseyjr-blyg`, `goddinpotty-blyg`,
`thinking.drwip.com` — have no locatable GitHub repo, so every code-hosting search
misses them entirely.

GitHub search is therefore a **supplement with a narrower job**: locating the *source* of
a client we have already detected from a manifest, and catching artifacts that never
produce a manifest of their own — tools and integrations like `blygger-desktop` and
`drafts-blyg`, which author into someone else's blyg and so are invisible to mechanism
one. The searches are still worth running: today they turned up
`patwater/pioneering-spirit-blyg`, `protocolvision/sig-p4b` and `chrisbodhi/newschematic`
beyond the four Venkat named. They have disjoint coverage and none of them is sufficient.

This is also an argument for Track 3.2: the health cron that re-resolves listings is the
same machinery as the client census. One cron, two products.

**Taxonomy, from what actually exists.** The eight-plus known artifacts do not fit one
list:

- **Clients** — produce a blyg, carry a `generator`: `Blynger`, `sachin-blyg`,
  `caseyjr-blyg`, `thinking.drwip.com`, `blyg-publisher`, `goddinpotty-blyg`.
- **Tools** — author into an existing blyg, no `generator` of their own:
  `aneeshsathe/blygger-desktop` (Rust/GPUI macOS studio), `miguelito4/drafts-blyg`
  (one-tap fragments from Drafts).
- **Integrations** — teach an existing publishing system to emit a blyg:
  `chrisbodhi/hugo-blyg`, `brndnpink/blyg-publisher` (Obsidian).
- **Mods** — copies of `blygger-studio` carrying local changes. At least one exists (the
  MCP-server addition). These are the population Track 2.4 is for, and the hardest to
  enumerate: see 4.1a — our repos have **zero forks**, so there is no fork graph to walk,
  and a mod is visible only when its operator says so or its `generator` string changes.

A client with a live node should cross-link to its blygger.com listing, and a listing
should cross-link to its client — the two directories answer different questions about
the same population and currently cannot see each other.

---

## A blyg as a publishing target (item 1.8) — ⚠️⚠️ FABLE

Venkat, session 26: *multiple authoring clients may be publishing to the same blyg, so
the publishing surface will become a publishing target for many authoring clients.*

This is already happening, and it is not a future case. The taxonomy in 4.1 splits the
ecosystem into clients that *produce* a blyg and tools that *author into* one — and the
tools have no specified way to do it. Three of the nine located repos are in that second
category: `aneeshsathe/blygger-desktop` (a native macOS studio), `miguelito4/drafts-blyg`
(one-tap fragments from a phone), `brndnpink/blyg-publisher` (Obsidian). Aneesh both runs
`blyg-ref` at `blyg.aneeshsathe.com` **and** wrote a native studio, which means a second
authoring client is in all likelihood already writing to a `blyg-ref` node through an
interface we never designed as a contract.

**What that interface is today,** read off the code rather than the docs:

- **30 endpoints** across `src/api.ts` (14), `src/importer/api.ts` (14) and
  `src/mentions/api.ts` (2) — publish, withdraw, pin, restore, fork, generate, media
  upload, settings, subscriptions, hoppers, signals, stubs, responses.
- **One gate for all of them:** `app.use("/api/*")` → `verifySession`, a 30-day HMAC
  cookie issued by a single shared `OWNER_PASSWORD`. There is exactly one principal, and
  it is "the owner".
- **No token auth, no scopes, no revocation, no per-client identity, no audit.** An
  authoring tool that wants in must POST the owner's master password to `/studio/login`
  and hold the resulting cookie. That is what every one of these tools is either doing or
  working around.
- **`HttpOnly; Secure; SameSite=Lax`, and `/api` gets no CORS** — the permissive CORS
  headers are on the public JSON/XML surface only. So a browser-based authoring client
  cannot call it at all, by construction.
- **No idempotency keys and no rate limits on write.** A phone app retrying a one-tap
  publish on a flaky connection has no defined way to avoid publishing twice.

**The question for Fable** is not how to fix those individually — it is prior to that:
**does the protocol say how an authoring client writes to a blyg, or is that each
client's own business?**

- **If the protocol says nothing** (the status quo, and consistent with #11's refusal to
  specify identity), then every authoring tool must implement N different write APIs —
  ours, `blyg-publisher`'s, `caseyjr-blyg`'s — and N is now six and rising. The tools are
  the population that suffers, and they are the cheapest artifacts in the ecosystem to
  write and the most numerous.
- **If the protocol specifies a write surface,** the obvious prior art is **Micropub** —
  which pairs with Webmention, and Blygger already does Webmention, so the IndieWeb
  alignment is not a new dependency but an existing one made consistent. AtomPub and
  MetaWeblog are the older comparisons and both are cautionary. Blygger's own
  abstractions (fragments, threads, TK scopes, hoppers, stubs) do not map onto Micropub's
  h-entry vocabulary without loss, so this would be an adaptation, not an adoption.
- **A third reading:** a non-normative companion spec — the `tn-` genre — that describes
  *a* write surface without making it a conformance requirement. This has the advantage
  that a static-file client with no server (the folder-based second implementation in the
  release-candidate bar) simply has no write endpoint, and a normative write API would
  make that implementation non-conformant for a reason unrelated to publishing.

**The strategic point, which is why this outranks most of Track 2:** a documented
publishing target is what converts fork-pressure into tool-building. The one mod known to
exist added an MCP server *to the client* — because adding it to the client was the only
way in. With a stable write contract that is a separate tool, and the upgrade path in 2.3
stops having to survive it. 2.4's problem is partly 1.8's problem, arriving early.

**Do not improvise any of this.** Token auth is security surface and the write API is
API-surface design; the routing rule marks both for Fable explicitly. What Tracks 2–4 can
do meanwhile is stop making it worse: 2.9 is written to be gated, and the split (2.1) does
not touch `/api` semantics.

---

## Session 26 status

Done and live: **2.1, 2.2, 4.1, 4.2, 4.3**, plus the directory queue (9 of 10 pending
submissions approved after live revalidation; one held with its reason recorded) and
a small pre-existing fix in `blygger-com` — the directory had been announcing itself to
strangers' servers as `blyg-ref/0.2`, a two-version-stale blyg client, when it is a
directory.

Still open and unstarted: **2.3** (update path / `npm run upgrade` + release channel),
**2.4** (fork-friendliness — documented in the client's README and asked about in its
bug template, but not engineered), **2.5** (webmention hardening — still the only item
with other people's deployments exposed), **3.1/3.2** (the directory-side alert and the
health cron), **3.3–3.6**, **2.6–2.9**, and all of Track 1.

## Sequencing

```
NOW ─ 2.1 split ──┬─ 2.2 issue templates ──┬─ 4.2 submission path ─ 4.1 ecosystem directory
                  └─ 4.3 republish /start/  │
                                            └─ 2.3 update path ─ 3.1 version alerts ─ 3.2 health cron
      2.5 webmention hardening (independent, HIGH, ~1h)
      ────────────────────────────────────────────────────────────────────────
      then ⚠️ FABLE: 1.8 publishing target ─┐
                     1.2 citation question ─┴─ 1.1 finalize v0.3 → 4.4 publish → 1.3 v0.4
                                               └─ unblocks 2.9 /api contract
```

**The split goes first** because 2.2, 4.2 and 4.3 all encode where the client lives, and
doing them before the split means doing them twice.

**2.5 is independent and should not wait for any of it.** It is the only item on this
page where the exposure is on machines that are not ours, run by people who followed a
start page rather than choosing to operate an endpoint.

**1.8 should go into the Fable round alongside 1.2, and may outrank it.** Both are
questions about what belongs on the wire; 1.2 concerns a citation's human half, 1.8
concerns whether there is a write surface at all. 1.8 has more people waiting on it — the
tool authors — and unlike 1.2 it has no workaround in the field except handing an
authoring tool the owner's master password.

**Finalizing v0.3 is Fable's, not Opus's** — 1.1 and 1.2 both. Tracks 2–4 are the
Opus/Sonnet queue and can run to completion first; that ordering is also right on the
merits, because 1.2's answer is informed by how six independent clients handle the human
half of a citation, and that evidence is still arriving.

---

## Open questions

> Also tracked, with the rest of the unscheduled ideas, in [`backlog.md`](backlog.md) §3 (session 28).

- **What does the spec repo own after the split?** Normative text, the conformance suite
  (1.4), the decision log (1.5), notes. Proposed: `worker/` leaves entirely, and the
  spec repo gains `conformance/` as the thing that replaces "read our implementation".
- **Do we keep a known-latest table for other people's clients?** 3.1 says the directory
  tracks versions for all seven generators. For ours that is a fact we publish; for
  theirs it is a claim we maintain about someone else's software, and it can go stale or
  wrong. Options: only track clients whose authors opt in; track from GitHub releases
  where a repo is known; or show the observed version without a latest-known comparison
  for third parties. Undecided.
- ~~**Does the write surface belong to v0.4?**~~ **Answered session 27 (#31): no.** It belongs
  to no protocol version — a companion technical note, once built. (The argument that
  stapling an authoring API to "AI arrives" would make one version carry two unrelated
  arguments was right, and was only half of it: the surface is not the protocol's at all.)
- **Does a mod get listed as itself, or as a version of `blygger-studio`?** Bears on
  2.4: if forks are listed, they have an incentive to stay discoverable, which is also
  how we learn the upgrade path is breaking them.
