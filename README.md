# Blygger

**An AI-native, decentralized public writing medium — blogs × wikis × Twitter × git changelogs, built on static files and RSS.**

Named for Yggdrasil, the world-tree — the resemblance is what prompted the session-6 rename to `blygger`, so the new name still nods to the old one.

> **Status: v0 — initial spec open for comments.** Read [`docs/ygg-initial-spec.md`](docs/ygg-initial-spec.md) and comment via [Issues](../../issues) or [Discussions](../../discussions). Quote the section and clause you're responding to.

## The idea

Blygger is a network of single-author pages. Each author publishes a `/blyg` directory on their own domain (e.g. `example.com/blyg`). It hosts two kinds of writing: tweet-sized atomic **fragments**, and essay-like **threads** composed out of fragments — partly by hand, partly by an AI summarization-transclusion operator. Everything is editable forever; the feed is effectively a changelog, with items resurfacing when they're updated, always presented as rolled-up latest versions rather than diffs.

Readers are other blyg clients. You subscribe to other people's feeds over RSS, triage what arrives into private **hoppers**, and respond — if you respond at all — by **stubbing**: publishing your own derived thread that points at the original. There are no replies, no public likes, no discovery layer, no servers, no instances. It's a network of soapboxes, traversed like old-school blogrolls.

If nobody uses the novel features, a blyg page degrades cleanly into an ordinary microblog with an RSS feed — and that's by design.

## Core objects

| Object | What it is |
|---|---|
| **Fragment** | Length-constrained atomic post (links/media allowed). Editable forever. Stable global ID. |
| **Thread** | Longform document composed from fragments and other threads. Evolves wiki-style; readers always see the latest rolled-up version. Published to the feed only via a linking fragment. |
| **Hopper** | Private named collection of fragments (own + imported), tag-like, many-to-many. Raw material for threads. Can be automated with filters. |
| **TK-transclusion** | The one AI-native operator: a marked scope in a thread where included fragments are summarized/transformed *for that destination context* at authoring time. Regenerates on the author's command when sources change. |
| **Stub** | The only response primitive. One click: add a fragment to a hopper, create a minimal derived thread quoting it, and publish a quote-like fragment linking to that thread. Stubs can be stubbed, giving tall stacks without ever being "replies." |

## The protocol, on one screen

The normative protocol is a **static file contract** — anything that can serve these files is a conformant blyg publisher. The directory mounts anywhere: any path (`/blyg/` is the reference default), a subdomain, or the domain root — the file names inside it never change:

```
example.com/blyg/
  index.html        the feed page (human-readable)
  feed.xml          RSS 2.0 + blyg namespace — the notification plane
  blyg.json          manifest: protocol level, generator, author profile, archive index
  items/{id}.json   canonical item state — the data plane; one file per item, full archive
  items/index.json  archive index — every item ever, no window; the backfill/reconciliation surface
  f/{id}/           fragment permalink page
  t/{id}/           thread permalink page
  media/            attachments
  blogroll.opml     OPTIONAL — curated subset of subscriptions, standard OPML 2.0, no extensions
  h/{slug}/         OPTIONAL — a public hopper: curated snapshots + source attribution, never re-emitted content
```

Two planes, deliberately separated:

- **State plane** — `items/{id}.json` is ground truth. Stable random IDs (globally unique, domain-independent), per-version content hashes (IPFS-friendly), full history always retrievable. New subscribers backfill from here; lagging subscribers never lose edits.
- **Notification plane** — `feed.xml` is plain RSS carrying "item X changed" plus a readable rendering. Lossy, window-limited, and that's fine — it's only a signal: `items/index.json` is what makes a subscriber that missed the window (or just subscribed for the first time) recover losslessly by diffing against local state instead of trusting the feed to have caught everything.

**Subscribing** (v0.2 "Roots"): a client is handed any URL and resolves it — direct
manifest probe, RSS feed-upgrade via a `<blyg:manifest>` element, one-hop `<link
rel="blyg">`, conventional-mount fallback, or plain RSS as a last resort (grandfathered
in as a summary-fragment-and-link wrapper). Subscription identity is always the final
fetch origin, never a manifest's self-asserted `site` — a mirror can't inherit another
origin's identity. Polling is a cheap conditional `GET feed.xml` for low-latency
pickup; the archive index is the real reconciliation surface, so any gap — a missed
poll, a scrolled-out feed window, clock skew, a malformed feed — degrades to an index
diff instead of lost history. Imported items triage into private **hoppers**; making
one public renders a curation page (local snapshot + source attribution) — it is never
re-published on the subscriber's own feed, which would collide with the single-publisher
invariant.

Three compatibility rules keep the client ecology forgiving:

1. **Every blyg feed is a valid RSS feed**, and every item carries a self-contained HTML rendering. A plain RSS reader sees a normal microblog feed.
2. **Clients ignore what they don't understand.** Protocol levels are strict supersets; a lagging client reading an advanced feed sees sensible content, always.
3. **AI is never in the protocol.** TK generation happens author-side at composition time; the published page carries only output plus provenance links. Readers need no models and no keys.

### Conformance levels

| Level | Capability |
|---|---|
| **L0** | Any plain RSS feed, grandfathered in via a thin wrapper (summary fragment + link) |
| **L1** | Blygger identity: stable IDs, edit/rollup semantics, canonical item files, backfillable archive |
| **L2** | Threads, transclusion provenance, stubbing markup |
| **L3** | *(future)* Encrypted/permissioned content, key rotation, FOAF-style visibility |

## Roadmap

| Version | Name | What lands |
|---|---|---|
| **v0.1** | Seed | Publishing: compose fragments, edit with rollup, `/blyg` page, RSS out, stable IDs, item files + manifest. Protocol L1 (publish side). |
| **v0.2** | Roots | Subscribing: import blyg and legacy RSS feeds, remote-edit rollup, manual hoppers, thumbs signals, private drafts, backfill. Protocol L1 complete. |
| **v0.3** | Trunk | Threads: `[[]]` composer, literal (non-AI) transclusion, share and stub actions. Protocol L2. |
| **v0.4** | Canopy | AI: TK-transclusion generation, staleness + regeneration, auto-hoppers, filter plugin API. No protocol change — AI is studio-side. |
| **v0.5** | Grove | Local RAG hooks in authoring, styling system, polish. |
| **v1.0** | — | Protocol freeze at L0–L2. |
| post-1.0 | — | L3 privacy (encryption, key rotation, FOAF/ZK), IPFS pinning, multi-tenant overloaded clients. |

## Reference implementation

A Cloudflare Worker (with D1 for the database, R2 for media), split into two halves:

- **Studio** (private, owner-only): composing, hoppers, subscriptions, signals, AI calls. Implementation-defined — the protocol doesn't constrain it.
- **Page** (public): the `/blyg` artifact above, servable by the worker directly or exportable to any static host.

This split is also the multi-tenancy escape hatch: the core spec is single-*publisher* (one origin, one accountable client), not single-author — an overloaded studio can publish one conformant feed per user, or a single multiplayer feed with per-item bylines (identity is an opaque, client-asserted pass-through, never part of the protocol).

**Live test instance** (task 11, session 10, 2026-08-06): [`blyg.vgr-702.workers.dev/blyg/`](https://blyg.vgr-702.workers.dev/blyg/) — a workers.dev reference deploy, feed at [`/blyg/feed.xml`](https://blyg.vgr-702.workers.dev/blyg/feed.xml). This is a rehearsal instance for the two-node deploy (`venkateshrao.com/blyg/` + `protocol-institute.com/blyg/`), not the permanent home.

## Repo layout

```
docs/ygg-initial-spec.md   the v0 concept spec, verbatim — open for comments
docs/roadmap.md            full roadmap v0.1 → post-1.0
docs/v0.1-plan.md          implementation plan for v0.1 "Seed"
DEVLOG.md                  per-session development log
CLAUDE.md                  agent instructions: session rituals, model routing
```

## License

Code: [MIT](LICENSE). Spec documents in `docs/`: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).
