# Backlog — ideas not scheduled for a numbered version

**What this file is.** The one place an idea goes when it is neither ruled nor scheduled.
Created session 28 (2026-09-28) to consolidate lists that had drifted apart: the
roadmap's *Post-1.0* section (unchanged since session 3), the spec's §16.7 *Reserved*
list, the two candidates parked in §16.6c/§16.6d, and the *Open questions* of
`roadmap-tracks.md`. Those places now point here.

**What it is not.** Not the studio backlog (`blygger-studio/CLAUDE.md`, which holds
*scheduled* client tasks with fixed shapes), not the tracks page (scheduled program work),
not the spec's §16 (ruled shapes awaiting a build, and the refusals). An idea leaves this
file by being ruled (→ `CLAUDE.md` decision + spec §16), scheduled (→ a plan doc or the
studio backlog), or refused (→ spec §16.8 or a decision; a one-line tombstone stays here
so it is not re-proposed).

**How to file.** One entry: what it is, where it came from (session, issue, person), what
would make it worth scheduling, and which decisions it touches. Anyone may add an entry
here; only a Fable round moves one out. Opus sessions record ideas in their devlog open
threads, and the next Fable pass files them.

---

## 1. Protocol ideas (wire-facing; each is ⚠️ FABLE when it comes up)

| Idea | Origin | State | What would schedule it | Touches |
|---|---|---|---|---|
| **Manifest-located surface** — let the manifest name where `feed`, `items`, the item document and the pinned-version document live (RFC 6570 level-1 templates), with defaults equal to today's fixed paths; discover a manifest not named `blyg.json` from the site's HTML | [blygger-spec#2](https://github.com/blygger/blygger-spec/issues/2), cyberscribe, 2026-09-27 — the WordPress and managed-host case: `.json`/`.xml` paths are intercepted as static files before the CMS routes them | **Ruled session 28 — decision #51, a 0.4 construct.** Shape in spec §16.6e, plan `v0.4-plan.md` §2.3 and §7.5. Leaves this list; kept one cycle so the pointer resolves | Done: ruled the day after it was filed | #14 (fixed filenames), #16, #17 (resolution), §4, §5.8 (`page` origin-relative), §12.2 (identity = manifest URL minus `blyg.json`) |
| **Partial quotes check text, not structure** — §10.2 compares only the words, so a quote that re-numbers or re-bullets a quoted list still passes; the bake is plain text, so bullets are lost anyway | Session 37 (stub passage chooser, Opus) | Noted | A misrepresentation by structure turning up in practice, or the conformance toolkit asking for it | §10.2, #49 |
| **L3 privacy** — encrypted or permissioned feeds: shared-key access to private items, key rotation and revocation; FOAF-visibility and zero-knowledge approaches noted | Roadmap Post-1.0 (session 3); decision #7 deferred privileged-group access to L3; spec §16.7 | Reserved, after 1.0 | A real need for private circulation between named readers, and a full Fable crypto round; nothing before the 1.0 freeze | #1 (static files), #7, #11 (identity — keys imply identity), #13 |
| **IPFS persistence** — pin item files and media; resolution fallback rules | Roadmap Post-1.0 | Idea | A node wanting durability beyond its host; `content_hash` per version already exists (#2) | #2, §8 pins, §12 resolution |
| **`![[id@vN]]` version-explicit transclusion** | Spec §10.1, reserved since session 3 (#9) | Reserved; rejected at publish, tolerated on read | An author wanting to quote a *pinned* version rather than the latest. Snapshot semantics (§10.4) make most of the need moot — a quote already freezes what it baked. **Named trigger (session 31): the variorum** — [blygger-spec#8](https://github.com/blygger/blygger-spec/issues/8) shows that quoting v3 beside v9 *after* the revision happened is not expressible today; a pinned version can be named (`forked_from`, `v{n}.json`) but not quoted. Opens when someone wants to write one | #9, #26 |
| **Unicode on the wire** — NFC/NFD sensitivity of `content_hash`, origin-string serialization across URL parsers, what "characters" counts in the three caps, how the two truncations slice | [blygger-spec#6](https://github.com/blygger/blygger-spec/issues/6), 2026-09-30; parked session 31 (`v0.4-plan.md` §8.6) | **Needs a Fable round of its own**, corpus measured first (every live item, hashed both ways) | The next Fable round with no gate open, or the first cross-client hash disagreement in the wild | #2 (hashes), §5.1, §12.2, §5.3, §5.9, §7 |
| **Glass Bead Game moves** — a `game_of` membership field, and `stub_of` naming several parents | [blygger-spec#12](https://github.com/blygger/blygger-spec/issues/12) (msmsim, 2026-10-04) | **Declined session 38** (Venkat, on Fable's recommendation in `pending-calls.md`; reply posted): `game_of` is the extension bag #10 refused; several targets reopen #27 / §10.6 rule 1. The pattern works today — brief on a house blyg, moves as stubs, synthesis by transclusion (each a verified mention to its parent), pins to lock the game | A game actually played on blyg that the pattern cannot express | #10, #27, §10.6, §13.5 |
| **Plain (non-structural) mentions** — receivers MAY accept a Webmention whose source merely links | Spec §15.6, #28 | MAY, held apart; the reference client drops them | Unlikely ever: the whole value of §15 is structural verification | #28 |
| **Refresh scope on the re-bake identity** — a token scope that may republish snapshot refreshes but not edit, definable because a re-bake is same-`content_hash`-new-version | Decision #38 (session 27) | Idea, explicitly "definable later" | An agent deployment where "refresh only" is a real trust boundary the operator wants | #31, #38, #39 |
| **An announcements blyg** for the project, and a ceremonial 1.0 pin | Decision #15 (session 8), deferred not rejected | Idea | The 1.0 release event | #15 |
| **Pinned-content feed entries** — entries for pinned publish events carrying the pinned content instead of the latest | Session 27 (#40), decided against session 28 | **Parked (#47a)** — reopen only on a measured need from plain-RSS readers | Someone citing a pinned version *from an RSS reader* and being shown the wrong text | §7 |
| **Public hoppers in `blyg.json`** — a manifest key naming each public hopper's page, so other blygs and the directory can find collections | Session 34; `fable-round-queue.md` item 14 | **Parked session 43** (Venkat, on Fable's `pending-calls.md` #5 recommendation) | A second client, or blygger.com, asking to discover hoppers by machine | #12 (curation display, never re-emitted), §6.1 |
| **Per-item curated responses surface** — an OPTIONAL machine-readable list of verified responses, opt-in per item | Session 27 (#41), decided against session 28 | **Closed (#47b)** — reopen only if #41's four reader-side surfaces are built and found insufficient | See left | #12, #13, #28 |

## 2. Client ideas (reference client; Opus-buildable once a plan exists)

| Idea | Origin | State | What would schedule it |
|---|---|---|---|
| **Filter plugin API** — typed hooks over the import pipeline (score / route / transform), default filters shipped as plugins, detect-stubs retrofitted | Roadmap v0.4 (original "Canopy" list); ⚠️ FABLE as a public extension contract | Unscheduled since session 28 re-scoped 0.4 to the wire | A third party wanting to write a filter; until then filters stay internal |
| **Auto-hoppers** — AI relevance filters routing inbound items into hoppers | Roadmap v0.4 original list | Unscheduled; needs the plugin API | Same trigger as above |
| **Second reference implementation: local-first, folder-based, static-host deploy** | Roadmap § Release candidate (session 11); `/start/` names it as the real test of the static-files claim | Undesigned; the 1.0 bar wants it | A collaborator with the appetite; the Obsidian and Hugo integrations in the wild are the closest so far |
| **Platform wrappers** — Substack / WordPress → blyg; theme gallery; a webring convention over blogrolls | Roadmap Post-1.0 "Ecosystem" | Idea; the WordPress half is now issue #2 above | Each on its own demand |
| **Read-side faithfulness check for partial quotes** — re-run the §10.2 substring test against a target still serving the version | Decision #49 (session 28); partial transclusion normative since session 31 | Idea | A reader wanting to show "this quote still matches" on an imported partial |
| **`cited` on `{url}` stubs in the studio** — emit the §5.9 object on plain-web stubs (the pour-over-links affordance, studio#17, is the natural producer) | Decision #55 (session 31), spec §16.1a | Ruled; Opus-buildable | Opens gate G10 once an import across nodes retains it |

## 3. Program questions (not protocol; Venkat's or a tracks session's)

- **Known-latest table for other people's clients** (tracks § Open questions): publishing our own client's latest is a fact; publishing someone else's is a claim that can go stale. Options: opt-in only, from GitHub releases where a repo is known, or observed-version-only for third parties. Undecided.
- **Are mods listed as themselves or as versions of `blygger-studio`?** Bears on fork-friendliness (tracks 2.4): listed forks have an incentive to stay discoverable, which is also how we learn the upgrade path breaks them.
- **What the spec repo owns after the split** — normative text, the conformance suite (`conformance/`, decision #48), the decision log, notes. Mostly answered; `conformance/` is the part not yet built.
- **Public decision log** (tracks 1.5) — "Locked decisions" is agent-facing in a file nobody outside the checkout reads; publishing surface is Track 4 (4.5).

## 4. Refused — do not re-propose (pointers only)

Reply primitives; follower graphs or a follow object; addressable authors; AI constructs on
the wire beyond passive provenance; version-significance markup; content-addressed
identity; metrics of any kind; a mention relation for links (#32); a normative write API
(#31); a title field (#46); transitive staleness (#45); a maintained/unmaintained flag
(#34); freezing a quote at a withdrawn version (§10.2). The reasons are in spec §16.8 and
the decisions named.
