# The Blygger Protocol — Version 0.4

**Status: DRAFT.** This document specifies protocol version 0.4 at conformance
Level 2 — the publish side, the subscribe side, and the cross-client
constructs that let one blyg quote, answer, and descend from another. **Every
spec version numbered below 1.0 is a working draft**: the
reference-implementation development phase is a testing phase for the
protocol itself, and the spec changes in response to what testing discovers.
Version 1.0 will be the first version its authors stand behind as stable and
publish to a larger audience; until then, users of this spec and builders of
implementations should assume **no promises** — including of the wire surface.
Breaking changes are permitted pre-1.0 but must bump the manifest version and
be recorded in the
[project devlog](https://github.com/blygger/blygger-spec/blob/main/DEVLOG.md).

Each protocol version has its own standalone-complete document, and the
highest-numbered document is the living one. **This document supersedes
version 0.3**: it carries the full 0.3 text forward, revised, with its section
numbers, and adds the constructs the 0.3 text held in §16 as ruled shapes
until they were built and exercised — **remote generation sources**, which
make a generation source a reference that notifies its origin (§5.7, and the
fourth mention relation `source` in §15.4); **the manifest-located surface**,
which lets a manifest say where its files live, so that software that cannot
serve fixed `.json` paths can publish a blyg (§4, §6.1, §12); and the
**author's label `[[id | text]]`** on links and directives (§10.1); from its
fourth revision, **disclosed links** — `links[]` (§10.3a) and the mention
relation `link` — and the **notice** class of verified mention (§15.5). Version
0.3 stops receiving revisions when this document is published, and stays
citable with its snapshots intact.

**What this document adds, and why now.** Every normative construct below
was built and exercised between two independent deployments before it was
written down here. The two constructs that open this version were ruled on
2026-09-28 as shapes in the 0.3 text's §16 — buildable, not yet normative —
and each crossed the line the project draws for a new version: a construct
that changes what a reader or receiver must *do* to be correct, rather than
one a conformant reader already ignores safely. Remote generation sources
shipped in blygger-studio 0.41.0 and were exercised between the
protocol-institute and venkateshrao nodes on 2026-10-10; the manifest-located
surface was published through templates by Soapbox, a WordPress plugin not
written by this project, and the reference client subscribed to it, quoted
it, and sent it a mention that verified on 2026-10-07. Constructs that have
been *decided* but not yet built are described in §16 with their ruled shapes
and enter the normative text in a later revision, once a client emits them.
That sequencing is the project's rule, not an oversight.

<!-- spec-links:begin -->
- **This version:** `https://blygger.org/spec/0.4/`
- **Supersedes:** `https://blygger.org/spec/0.3/`
- **XML namespace:** `https://blygger.org/ns/0.1`
- **Source of truth:** [`blygger/blygger-spec`](https://github.com/blygger/blygger-spec) — `docs/protocol-v0.4.md`
- **Reference implementation:** [`blygger/blygger-studio`](https://github.com/blygger/blygger-studio) (a separate repository since 2026-09-28)
- **License:** CC-BY-4.0
<!-- spec-links:end -->

**Which version to implement.** Implement against the highest-numbered
document published at `https://blygger.org/spec/` — that is the living one,
and this is it. The three places a version of this text can be found are
not interchangeable:

- **`blygger.org/spec/{version}/`** is the published living text. It changes
  when testing changes it, and each change is listed in the revision history
  at the end of this document.
- **`blygger.org/spec/{version}/{date}/`** is a dated snapshot, with a diff
  link to the previous one. **Cite and pin to a snapshot** when you need the
  text not to move under you; then read the diffs to move forward.
- **`docs/protocol-v{version}.md` on the repository's `main` branch** is the
  source of the published text and may run ahead of the site by hours or
  days. It is the same document, not a different version.

**What is not the spec:** the plan documents (`docs/v0.4-plan.md` and its
siblings) and the reference client's source. Both have carried wire shapes
before the spec did — the 0.3 constructs shipped in the reference client
twelve days before the 0.3 document existed — and several independent clients
were built from them in that window. That was a lag in this project's
process, not a stable arrangement. Since 0.3, a construct that
has been *ruled* but not yet built appears in §16 of the living document
with its exact shape and an explicit "not yet normative" label, so that the
spec is always the first place a shape is visible.

**The risk of the living text** is that it moves: pre-1.0, every version is
a draft and no wire promise is made (§3.1's version key is informative for
the same reason). **The risk of a superseded text** is only that it is
incomplete: levels are strict supersets and every 0.3 document is a valid
0.4 document, so a client built to 0.3 remains conformant and simply does
not emit or understand the 0.4 constructs. Declare what you implement in
the `blyg` key, and readers will treat the rest under the ignore rules.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY are to be
interpreted as described in RFC 2119.

---

## 1. Introduction (non-normative)

Blygger is a decentralized public writing medium built on static files and RSS.
A **blyg** is a directory of files — mounted anywhere on the publisher's own
domain, at a path (conventionally `/blyg/`) or at the domain root — containing
versioned items of writing, a manifest, an archive index, and an RSS feed.
Anything that can serve files can serve a blyg; anything that can read RSS can
follow one.

Four design invariants shape everything below:

1. **The protocol is a static file contract.** It governs only the published
   artifact — the *page*. How the publisher composes, edits, imports, or
   generates content (the *studio*) is entirely out of scope. This includes
   how an authoring tool writes *into* a blyg: the protocol specifies no
   write surface, at this version or any version foreseen (§16).
2. **Every blyg feed is a valid RSS 2.0 feed** whose items carry self-contained
   HTML. A plain RSS reader always sees a sensible microblog.
3. **AI is never in the protocol.** Generation, if any, happens in the studio at
   authoring time; the page publishes output plus provenance (§5.7). Readers
   need no models or keys. This constrains the wire and the reader side, never
   the writer: a blyg written, maintained, or entirely operated by a software
   agent is a blyg like any other, and the protocol cannot and does not tell.
4. **Identity is never in the protocol.** The only authenticated entity is the
   publishing client at its domain (the *origin*). DNS is the namespace.

The protocol has two planes. The **state plane** — canonical item files and the
archive index — is ground truth and losslessly complete. The **notification
plane** — the RSS feed — is a lossy, windowed signal that something changed.
Readers reconstruct state from the state plane; they never treat the feed as
authoritative.

Version 0.2 specified the reading path built on that split: a reader handed
any URL **resolves** it (§12) to a blyg origin or a legacy feed, subscribes,
and polls; the archive index heals every gap (§13). Subscription is
deliberately invisible: no follow object, no follower list, and the only
public trace of anyone's reading is the curated blogroll they choose to
publish (§11).

Version 0.3 makes threads cross-client. A thread may quote any item a reader
has imported, from any origin, by the same `![[id]]` directive it uses for
its own fragments — and the quote is always the reader's local snapshot,
never a live fetch (§10). A thread may declare itself a **stub**: a response
to exactly one target (§10.6). An item may declare **lineage** from a pinned
version of another item (§5.6). And an origin that has been quoted, stubbed,
or forked can find out, reliably and verifiably, without subscribing to the
quoter: **Webmention with structural verification** (§15), the notification
half of the discovery model whose static half is the blogroll. None of this
adds a reply primitive. This remains a network of soapboxes: public speech
that cites, and citations that can be checked.

Version 0.4 adds two things the 0.3 text had ruled but not yet built. A
generator may be fed another origin's words, and that is disclosed as a
**source** — a reference that notifies its origin as a quotation does (§5.7,
§15) — because in a medium whose premise is citations that can be checked,
paraphrase by model must not be the one way to use a stranger's words without
telling them. And the manifest may say where the surface lives (§6.1), so
that a blyg can be published by software that cannot serve fixed `.json`
paths; the one fixed filename is the manifest's own. Neither changes what a
0.3 publisher emits.

## 2. Terminology

- **Origin** — a blyg's base URL (e.g. `https://example.com/blyg/`). The unit
  of identity, trust, and subscription. May be a domain root, any path under a
  domain, or a subdomain — the protocol never constrains where a blyg mounts
  (§4).
- **Item** — the unit of publication. Carries a permanent id and a version
  history. Current kinds: `fragment`, `thread`, `withdrawn`.
- **Fragment** — a short-form item (microblog-post-sized).
- **Thread** — a long-form item that *transcludes* other items (§10).
- **Version** — one published state of an item, numbered from 1. Publishing an
  edit creates version N+1.
- **Publish event** — the act that creates a version; what the feed announces.
- **Withdrawal** — the only exit for a published item: a permanent, reversible
  endcap version with empty content (§9).
- **Pin** — an irrevocable promise to serve one specific version forever (§8).
- **Transclusion** — publish-time inclusion of an item's content, by
  snapshot, into a thread (§10). From 0.3 the source may be a thread, and may
  belong to another origin.
- **Reference** — the citation shape `{ origin, id, version }` that names one
  published version of one item at one origin (§5.9). Used by `stub_of`,
  `forked_from`, `transclusions[]` and, from 0.4, `generated[].sources[]`.
- **Stub** — a thread that declares itself a response to exactly one target,
  via `stub_of` (§10.6).
- **Lineage** — an item's declaration, via `forked_from`, that it began as a
  copy of a pinned version of another item (§5.6).
- **Page** — an item's human-readable permalink, declared by the item document
  itself (§5.8).
- **Mention** — a Webmention (§15): a notification from a source page to a
  target page that the source references the target. A **verified mention**
  is one whose source item document structurally names the target.
- **Generation provenance** — the optional `generated` array disclosing
  machine-generated spans in a version (§5.7).
- **Resolution** — the deterministic procedure that turns any URL into a
  subscription target (§12).
- **Subscription** — a reader's persistent relationship to one origin (blyg)
  or one feed URL (legacy L0). Its identity is the final fetch origin (§12.2).
- **Watermark** — the highest version a reader has ever observed for an
  imported item; monotonic (§13.3).
- **Blogroll** — an optional published OPML list of the subscriptions a
  publisher chose to show (§11).
- **Hopper** — a publisher's curated list of items, its own or imported; a
  client construct. A **public hopper** is one the publisher displays under
  §13.5 and lists in the manifest's `hoppers` key; it MAY have a **hopper
  feed** (§13.5a), which readers can subscribe to (§12.1). New in 0.4.
- **L0 wrapper** — reader-side grandfathering of a plain RSS feed as summary
  items (§13.6).
- **Remote reference** — a reference (§5.9) whose `origin` is not the
  publisher's own: a cross-origin `stub_of`, `transclusions[]` entry,
  `forked_from` or, from 0.4, `generated[].sources[]` entry — and, from the
  fourth revision, a `links[]` entry carrying an `origin` (§10.3a). Each
  SHOULD send a mention (§15.2).
- **Surface template** — a manifest's `item` or `pin` value (§6.1): where an
  origin serves its item documents and pinned-version documents when not at
  the default paths. New in 0.4.
- **Maintenance republish** — a version whose `content_hash` equals the
  version before it: a snapshot refresh or re-bake, no new words (§13.2).
  From the fourth revision, also a version that differs from its
  predecessor by less than a reader-local threshold.
- **Notice** — a verified mention that is not a response: relation `link`,
  or a repost (§15.4, §15.5). Held apart from responses. New in 0.4.
- **Repost** — a stub or transclusion whose source document has no words of
  its own; classified by the receiver, never declared (§15.4). New in 0.4.
- **Label** — the optional `| text` after the id inside `[[…]]` or
  `![[…]]` (§10.1): the author's label for the target, ignored by resolution;
  anchor text on a link, `data-blyg-label` on a baked transclusion (§10.2).
  New in 0.4.
- **Text content** — an item's `content_html` with tags stripped, whitespace
  collapsed within a block and block boundaries kept as line breaks; what a
  partial transclusion's selection is checked against (§10.2).
- **Identity change** — a reader adopting a new origin for an existing
  subscription, which MUST be user-confirmed (§12.2).
- **Per-item curation** — a publisher's public display of the verified
  mentions of one of its items, under the curation rules of §13.5 (§15.5).
- **Provenance shadow** — what generation leaves on the wire: the
  `generated` array and the `blyg-tk-gen` class, never the instruction
  (§5.7).
- **Static discovery plane** — the blogroll (§11): the outbound, curated
  half of the public graph, as against verified mentions, its dynamic
  inbound half (§15).
- **Conformance level** — L0–L3, strict supersets (§3).

## 3. Conformance levels

| Level | Meaning |
|---|---|
| **L0** | Any plain RSS feed, grandfathered via a reader-side wrapper (summary fragment + link, §13.6). No blyg constructs. |
| **L1** | The single-origin protocol, as specified at version 0.2 and carried forward here unchanged in substance. Publish side: stable ids, versioned items, canonical item files, manifest, archive index, rollup semantics, withdrawal, pins, threads and same-origin transclusion, generation provenance. Subscribe side: resolution, importer conformance, lossless recovery, the optional blogroll. |
| **L2** | **This specification.** Everything in L1 plus the cross-client constructs: transclusion across origins and thread nesting (§10), stubs (§10.6), lineage (§5.6), the `page` field (§5.8), Webmention (§15), and from 0.4 remote generation sources (§5.7) and the manifest-located surface (§6.1). |
| **L3** | *(future)* Encrypted/permissioned content. |

Levels are strict supersets. A conforming reader at any level MUST ignore
constructs it does not understand rather than reject the document containing
them (this is what lets levels and versions advance without breaking anyone).

A **publisher** conforms at L1 by serving the surfaces in §4 with the
semantics in §§5–11, and at L2 by additionally following §10's cross-client
rules and §5.6, §5.8 and §10.6 for any lineage, `page`, or `stub_of` it
emits. **Every L2 construct is additive and optional to emit**: a valid 0.3
document is a valid 0.4 document unchanged, and a publisher that never
quotes another origin, never stubs, never forks, never draws on another
origin's items in generation, keeps the default paths, and receives no
mentions is fully conformant at L2 by doing nothing new. Webmention in particular is
optional at every level; a static-only deployment advertises no endpoint
and remains conformant (§15.7). A **reader** conforms at L1 by following the
rules in §§12–13, and at L2 by additionally honouring the cross-origin
provenance rules of §10.3.

### 3.1 The protocol version key

Manifests and item documents carry a `"blyg"` key naming the spec version
their publisher implements (a deployment serving the 0.4 surfaces emits
`"blyg": "0.4"`). The key is **informative, not a negotiation**: readers MUST
accept any `0.x` value and apply the standing ignore-unknown rules (§13.1) to
whatever they find. Vocabulary evolves inside one namespace under those
ignore rules; a breaking change, if one ever happens, gets a major version
bump and its own migration story — never this mechanism.

### 3.2 The `level`, `generator` and `generator_url` keys are informative

The manifest's `level` (§6.1) is the conformance level the publisher claims,
`generator` is the name and version of the software that produced the blyg,
and `generator_url` is where that software's source or home page lives. All
three are self-descriptions. **Readers MUST NOT gate any behaviour on any of
them** — not parsing, not feature selection, not trust. A reader
decides what a document contains by reading the document, under the
ignore-unknown rules; a reader that would render, verify, or import
differently because of a `generator` string is treating an unverified label
as a capability, and would break the moment a client renamed itself.

`generator` nonetheless carries real weight, which is why publishers SHOULD
emit it in the form `name/version` (e.g. `blygger-studio/0.4.0`): the
manifest is a file the protocol requires to be public, so `generator` is the
only census of the ecosystem that exists without anyone registering
anything. A client with no other public trace is counted by this key alone.
It is the client's name, never the protocol's: a client rename is not a
protocol change and MUST NOT be read as one.

## 4. The publication surface

A blyg is the following file tree under its origin. The origin's location is
the publisher's free choice — a domain root (`https://example.com/`), any path
(`https://example.com/blyg/`, `https://example.com/notes/b/`), or a subdomain.
The surface is strictly origin-relative: no protocol construct may assume any
particular path component, and readers MUST NOT infer anything from the mount
path. One file name within the surface is protocol-fixed: the manifest,
`blyg.json`, at the origin — a known manifest filename at an arbitrary origin
is what keeps free mounting discoverable (a reader handed any base URL fetches
`blyg.json` relative to it). Every other path below is the **default**, and
the manifest MAY relocate it (§6.1; new in 0.4, promoted from the 0.3 text's
§16.6e): `feed` and `items` name the feed and the archive index, and the
`item` and `pin` templates say where item documents and pinned-version
documents live. A blyg that omits those keys uses the defaults, and every
path in this document is written in its default form. **Wherever this
document writes `{origin}items/{id}.json` or `{origin}items/{id}/v{n}.json`,
a reader expands the origin's `item` or `pin` template instead when the
manifest carries one** — the literal is the default. At 0.3 every name was
fixed. That rule was written for filesystem-shaped deployments, and it
excluded a large class of publishers for a reason unrelated to publishing:
managed hosts intercept `.json` and `.xml` paths as static files before a
CMS routes them, so a WordPress site, for one, could not serve
`items/{id}.json` without rewrite rules that shared hosting often forbids.
`/blyg/` is the reference client's default mount and the convention used
in examples throughout this document; it carries no protocol meaning.

Publishers MUST serve:

| Default path (relative to origin) | Content | Spec |
|---|---|---|
| `blyg.json` | Manifest | §6 |
| `feed.xml` | RSS 2.0 feed | §7 |
| `items/index.json` | Archive index | §6.2 |
| `items/{id}.json` | Canonical item document | §5 |
| `items/{id}/v{n}.json` | Pinned version document (only for pinned versions) | §8 |
| `media/…` | Media objects referenced by items | §5.4 |

Publishers MAY additionally serve:

| Default path (relative to origin) | Content | Spec |
|---|---|---|
| `blogroll.opml` | Curated blogroll (OPTIONAL) | §11 |
| *(the paths named by the manifest's `hoppers` key)* | Public hopper pages and hopper feeds (OPTIONAL) | §13.5a |
| *(the URL named by the manifest's `webmention` key)* | Webmention endpoint (OPTIONAL; the protocol's only dynamic surface) | §15 |

Publishers SHOULD additionally serve human-readable HTML (a feed page, item
permalink pages); their form is presentation, not protocol, except where noted
(§5.8, §8.4, §10.5, §15.1). The reference client's permalink paths —
`f/{id}/` for fragments, `t/{id}/` for threads — are a convention, not a
requirement: an item's permalink is whatever its document's `page` field says
(§5.8).

Requirements:

- The entire surface MUST be servable as plain static files. A conforming blyg
  can live on a dumb file host; dynamic serving is an implementation detail.
  The Webmention endpoint is the one exception, and it is optional precisely
  so that this rule survives (§15.7). Whatever the manifest names, this holds:
  a template expands to static paths, and the defaults are the 0.3 paths.
  Mount independence stands, and the manifest-located surface is its
  completion, not its reversal — the manifest filename is the protocol's,
  everything else is the deployer's, and the manifest says where.
- `items/{id}.json` MUST return 404 for unknown ids and never-published drafts,
  and MUST return 200 permanently once the item has ever been published —
  including after withdrawal.
- `items/{id}/v{n}.json` MUST return 404 unless version n of item id is pinned,
  and MUST return 200 permanently once it is (§8).
- Public JSON and XML responses SHOULD be served with permissive CORS
  (`Access-Control-Allow-Origin: *`); cross-origin reading by other clients
  depends on it.
- All protocol timestamps are ISO 8601 UTC (`…Z`), except RSS-mandated RFC 822
  dates inside `feed.xml`. A publisher MUST NOT write local time into any
  protocol surface; time-zone display is a presentation concern of each
  client.

## 5. The item document — `items/{id}.json`

Ground truth for one item. Example (a fragment):

```json
{
  "blyg": "0.3",
  "id": "7c9wk2mhq0v3xj8tn5rzfd41bg",
  "kind": "fragment",
  "origin": "https://example.com/blyg/",
  "page": "f/7c9wk2mhq0v3xj8tn5rzfd41bg/",
  "author": { "name": "Venkatesh Rao", "url": "https://example.com/blyg/" },
  "created": "2026-07-17T18:00:00Z",
  "updated": "2026-07-18T09:30:00Z",
  "version": 3,
  "content_md": "Markdown source of the *latest* version.",
  "content_html": "<p>Markdown source of the <em>latest</em> version.</p>",
  "content_hash": "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "media": [
    { "url": "media/x7f2.png", "mime": "image/png", "alt": "a diagram" }
  ],
  "changelog": [
    { "version": 1, "at": "2026-07-17T18:00:00Z", "note": null },
    { "version": 2, "at": "2026-07-17T21:12:00Z", "note": "typo", "pinned": true },
    { "version": 3, "at": "2026-07-18T09:30:00Z", "note": "sharpened the claim" }
  ]
}
```

Threads additionally carry `transclusions` (§10.3) and MAY carry `stub_of`
(§10.6). Any item MAY carry `forked_from` (§5.6), `generated` (§5.7) and `links`
(§10.3a).

**Members** (revision of 2026-10-17, decision #76 — the first explicit
list, drawn from the sections below and checked against one document from
every live blyg, all 22 of which already conform):

| Member | Status | Where |
|---|---|---|
| `blyg`, `id`, `kind`, `origin`, `version`, `created`, `updated`, `content_md`, `content_html`, `content_hash`, `changelog` | REQUIRED | §3.1, §5.1, §5.2, §5.3 |
| `media` | REQUIRED; an array, MAY be empty | §5.4 |
| `page` | RECOMMENDED | §5.8 |
| `author` | OPTIONAL; absent means no assertion | §5.5 |
| `transclusions` | REQUIRED for threads, absent for fragments | §10.3 |
| `stub_of`, `forked_from`, `generated` | OPTIONAL, present when the construct is | §10.6, §5.6, §5.7 |
| `links` | OPTIONAL; present when the version resolved at least one `[[id]]` (fourth revision) | §10.3a |

A withdrawal endcap (§9) keeps the REQUIRED members with empty content. Any
other member is unknown and ignored (§13.1 rule 4).

### 5.1 Identity

- `id` MUST be 128 random bits encoded as 26 characters of lowercase Crockford
  base32 (alphabet `0123456789abcdefghjkmnpqrstvwxyz`, no padding), generated
  from a cryptographically strong source.
- Ids are permanent identity: they MUST NOT change across versions, withdrawal,
  or return. Ids are never content-addressed — editing changes content, not
  identity. Integrity is the hash's job:
- `content_hash` MUST be `"sha256:" + hex(SHA-256(content_md as UTF-8))`,
  computed per published version. It covers `content_md` **only** — not
  `author`, not media bytes, not `content_html`.
- An id names an item, not an origin. Ids are generated with enough entropy
  that two origins producing the same id is not a real case; readers
  nonetheless scope every id to the origin it was learned from (§13.1), and a
  publisher that finds the same id at two imported origins treats it as
  ambiguous rather than picking one (§10.2).

### 5.2 Versioning and rollup presentation

- `version` is a positive integer, incremented by exactly 1 per publish event.
  Draft saves are invisible to the protocol.
- The counter is deliberately bare: no semantic versioning, no edition or
  significance markers, at any level, ever. The protocol's machine-readable
  "this state matters" is the **pin** (§8) — a costly, irrevocable hosting
  promise — not cheap markup on the counter. (Rationale: technical note
  [TN-1](https://blygger.org/notes/), `blygger-spec` `docs/notes/tn-1-versioning-and-pins.md`.)
- Only the **latest** version's content is served in the item document. Older
  content is withheld — the publisher's history stays private by default —
  unless a version is pinned (§8). The `changelog` is metadata (version, time,
  optional note, optional `"pinned": true`, optional `"generated": true`),
  never diffs or content.
  **A note describes a change; it never reproduces withheld content.** A
  note that quotes the prior version's text is a diff by another name and
  leaks exactly what withholding protects, so where the prior version is
  unpinned a note MUST NOT reproduce it. Between two pinned versions nothing
  is withheld — any reader can fetch both files — and a note may be as full
  as the author likes. Notes are the publisher's description, and like the
  feed `<title>` derived from them (§7) they may be machine-written.
  **No word in a note has wire meaning** (revision of 2026-10-19, decision
  #83): a note is prose, and clients MUST NOT treat any token in it — a
  conventional word, a bracketed tag — as a marker of the version's
  significance in either direction. Whether a version matters *less* is
  derived by readers from what the wire already carries (§13.2); whether it
  matters *more* is the pin.
- **A changelog entry MAY carry `"generated": true`** (revision of
  2026-10-06, decision #40), meaning the publisher's client wrote the note,
  typically from the local diff between versions, rather than the author.
  It is self-asserted and unverifiable like `generated[]` (§5.7 rule 6).
  Absent means only "not stated", never "the author wrote this". Readers
  MUST NOT gate on it, and a reader that ignores it stays conformant. It
  exists because a note is prose that readers read and the source of the
  feed `<title>`, so a reader reconstructing an item's history from its
  notes can tell the author's words from a machine's summary. The depth rule
  above binds generated notes exactly as it binds authored ones. An entry
  then reads `{ "version": 3, "at": "2026-07-18T09:30:00Z", "note":
  "Sharpened the second paragraph's claim.", "generated": true }`.
- Two further members on a **pinned** entry — `pinned_at`, when the promise
  was made, and `cid`, an IPFS address of the pinned document's bytes — are
  ruled shapes awaiting a build (§16.9), not yet normative.
- `updated` MUST equal the latest changelog entry's `at`. All timestamps are
  self-asserted by the origin; readers order events per their own policy
  (§13.7).
- **`content_html` is self-contained** (revision of 2026-10-03, decision
  #53): every URL in it — media, links, the anchors `[[id]]` renders to,
  anything an `href` or `src` can carry — MUST be absolute. The same bytes
  travel three ways with no origin to resolve against: as the feed
  `<description>` (§7), into an importer's store (§13), and baked verbatim
  into other origins' threads (§10.2). Readers MAY resolve a relative URL
  against the document's origin on import as a defensive measure and MUST
  NOT depend on one being present. `media[].url` (§5.4) is unaffected: it is
  a structured field readers resolve.

### 5.3 Kinds

- `"kind"` is `"fragment"`, `"thread"` (§10), or `"withdrawn"` (§9) in this
  version. Readers MUST treat unknown kinds as unknown constructs: ignore the
  item, don't reject the feed or archive containing it.
- Fragments: publishers SHOULD cap `content_md` at 2,000 characters
  (RECOMMENDED studio-enforced cap: 1,000). Enforcement is publisher-side only —
  readers MUST NOT reject long fragments.
- Threads additionally carry `transclusions` (§10.3).
- **Items are titleless.** No kind carries a title field, and none is
  reserved. The feed's `<title>` element is derived (§7); a leading markdown
  heading in `content_md` is content, not a title, and readers MUST NOT
  extract one. (A title field was considered for 0.4 and closed — §16.4: the
  derived feed title already begins with a leading heading, and the rest is
  presentation.)

### 5.4 Media

- `media` entries carry `url` (relative to the origin or absolute), `mime`, and
  SHOULD carry `alt`. Media objects are immutable once published: a media URL
  MUST always serve the same bytes. Changing an image means publishing a new
  media object in a new version.

### 5.5 The `author` field

`author` is OPTIONAL, per-item, **client-asserted, and opaque**:

- If present it is a JSON object. `name` (display string) is RECOMMENDED, `url`
  OPTIONAL; **any additional members are permitted and unspecified** — they are
  the client's private authorspace grammar (local ids, OAuth subjects, wallet
  signatures, …). Readers MUST accept any object here and MUST NOT reject an
  item over its `author` contents.
- The value is an unverified assertion by the origin. It is scoped to
  `(origin, value)`: equal values from different origins MUST NOT be treated as
  the same entity. Within one origin, grouping byte-equal values is a display
  heuristic with no protocol semantics.
- Authors are **never addressable**: no protocol construct references an author,
  at any level, permanently. Transclusion targets items; subscription targets
  origins; lineage targets pinned versions; stubs target items or URLs.
- Clients that store or re-emit item JSON MUST carry `author` verbatim, never
  synthesized or rewritten. This applies to baked transclusion snapshots
  (§10.2): a byline shown inside a quoted block is the source's own `author`
  passed through, or nothing.
- A feed is single-**publisher** (one origin, one accountable client), not
  necessarily single-author: a multiplayer client may publish one conformant
  feed with per-item bylines. There is no shared namespace and no
  `user@server`; DNS remains the namespace.
- **An author need not be a person.** A software agent that writes items is
  a valid `author` value like any other, asserted by the origin and
  accountable to it. What discloses that its prose is machine-generated is
  `generated` (§5.7), not the byline: the byline says who, the provenance
  says how, and the two are independent. Recommended byline conventions for
  agents — including naming the operator who answers for one — are practice,
  not protocol (§16.6b).

### 5.6 Lineage — `forked_from`

*(Reserved at 0.1 and 0.2; defined at 0.3.)* An item MAY carry a top-level
`forked_from`: a reference (§5.9) to the **pinned** version of another item
from which this item's first draft was copied.

```json
"forked_from": { "origin": "https://blyg.protocol-institute.org/",
                 "id": "1vgtgz0gq5b2c9k7d3m8r4n6xy", "version": 2 }
```

Rules:

1. `origin` is REQUIRED, even when it is the publisher's own — a citation is
   absolute. (The 0.1 reservation's two-field form `{id, version}` is amended
   additively; nothing ever emitted it.)
2. The referenced version MUST be pinned at its origin, i.e. fetchable as
   `{origin}items/{id}/v{n}.json`. A pin is the only version anyone can
   promise a lineage still points at (§8 rule 1). Publishers SHOULD check this at
   publish time with one conditional fetch, and SHOULD refuse to publish on
   **evidence** that the promise is not kept — a 4xx, or a 200 that is not
   that pinned version. A network failure, timeout, or 5xx is evidence of
   nothing; refusing to publish an author's own words because a stranger's
   host is down would hand third parties a veto, so publishers SHOULD proceed
   with a warning instead.
3. Lineage is fixed when the item is created and is **immutable**: it never
   changes across versions, and a client MUST NOT offer a way to add,
   retarget, or clear it after the fact. An item either came from somewhere
   or it did not. This immutability is what lets pinned documents (§8) and
   withdrawal endcaps (§9) carry it without any risk of drift.
4. Lineage survives withdrawal: the endcap keeps `forked_from` (§9). Where an
   item came from is not the work being taken back.
5. Lineage across origins is a remote reference and SHOULD send a mention
   (§15.2), whose relation is `fork`.
6. A fork is a *copy*, not a transclusion: the forked content becomes the new
   item's own `content_md`, with no wrapper and no `transclusions` entry. The
   lineage marker is the only trace. Readers MUST NOT infer that a fork still
   resembles its source. **What is copied is the pinned *document*, not its
   composition** (decision #57; promoted from §16.6f in the eleventh
   revision): a `![[id]]` directive or `[[id]]` link copied as written would
   re-resolve at publish in the forker's context (§10.2) — a later version,
   or a failure for an origin the forker has not imported — and a fork would
   then descend from bytes nobody pinned. (Forking a quoted fragment
   directly, naming the fragment's own pin, remains the way to take one
   passage with its own lineage.) A forking client SHOULD build the new
   `content_md` as follows:

    - The source's own prose is copied byte-exact from the pinned
      `content_md`.
    - Each `blyg-transclusion` element in the pinned `content_html` (§10.2)
      replaces its directive as an **ordinary markdown blockquote** of that
      element's content, recursively — nested quotes become nested
      blockquotes — followed by a visible attribution line naming the quoted
      item's origin and id and linking to its page (§5.8) where the publisher
      can compute it, else to its item document. The line's wording is the
      client's. A partial transclusion flattens the same way, from its baked
      paragraphs. **Partiality is read from the `blyg-partial` class in the
      pinned bake, never from `>` lines in `content_md`** (decision #62): a
      bake from a client that predates the partial grammar carries none, and
      the lines after its directive are the author's prose.
    - **A quote the pinned document carries is copied whatever the quoted
      item's current state** (decision #62). The pinned source serves those
      bytes forever (§8, §10.4), so the fork adds a place the words can be
      fetched from, not a disclosure; the attribution line points at an id
      whose live document says what the quoted item's state now is. A client
      MAY note that state beside the quote when it holds it, and MUST NOT
      need the network at publish to decide.
    - **Each inherited `[[id]]` link becomes an ordinary markdown link** to
      the absolute page the pinned `content_html` rendered for it (decision
      #63), in a forked fragment as in a forked thread — the same register as
      the quotes.
    - The `blyg-transclusion` class MUST NOT survive into the fork: the
      forking publisher baked nothing and verified nothing. A flattened quote
      is in the plain-web register of §10.2 — a quotation with a link,
      editable, unverified — and `forked_from` is the way back to the
      verifiable original (rule 8). The fork sends no `transclusion` mention
      for a quote it inherited; an author who wants a live quote writes a
      directive, which resolves and notifies as any directive does.
    - Generated spans (`blyg-tk-gen`, §5.7) in the pinned document — the
      source's own and its quotes' — are disclosed in the fork through the
      existing construct (§5.7 rule 7: `sources` empty, `model` if known),
      so a fork cannot launder a disclosure away.

7. **A fork's page SHOULD show its lineage** (revision of 2026-10-06,
   decision #65): a publisher that renders an HTML page for a fork SHOULD
   show on it that the item was forked, linking the pinned version it names
   (its page where the origin serves one, else its pinned file). Lineage
   exists so that a reader can compare a fork with its source; on the wire
   alone, only machines can.
8. **Custody runs one hop per fork** (decision #65). A fork vouches only for
   the pinned bytes it copied: its flattened quotes (rule 6) are unverified,
   and the way to verify one is to follow `forked_from` to the pinned
   source, where the quote is still a verified transclusion — and, for a
   fork of a fork, to repeat that one hop at a time. Nothing carries
   verification through a chain of forks, by design: each fork can only
   honestly assert what it copied.

### 5.7 Generation provenance — the `generated` array

Invariant 3 stands: AI is never in the protocol. Generation, if any, is a
studio act at authoring time, and the published `content_md` is ordinary
markdown — no markers, no instructions, no authoring grammar of any kind
reaches the wire. The hash covers exactly what readers read. What the wire
gains is generation's **provenance shadow**: a publisher whose version
contains machine-generated prose SHOULD disclose it via an OPTIONAL top-level
`"generated"` array, parallel to `transclusions`, one entry per generated
span in document order:

```json
"generated": [
  { "sources": [ { "id": "7c9wk2mhq0v3xj8tn5rzfd41bg", "version": 3 },
                 { "origin": "https://blyg.protocol-institute.org/",
                   "id": "1vgtgz0gq5b2c9k7d3m8r4n6xy", "version": 1,
                   "cited": { "source": "Protocol Institute Blyg",
                              "retrieved": "2026-10-10T17:40:00Z" } } ],
    "model": "claude-opus-5",
    "at": "2026-10-10T17:40:00Z" }
]
```

Rules:

1. `sources` names the exact published versions of the items whose content
   was **drawn on** by the generator for that span — the same disclosure
   whether the generator was handed them by an author or retrieved them
   itself from the archive. Each entry is a reference (§5.9): `origin`
   omitted for the publisher's own items and present for another origin's
   (new in 0.4; promoted from the 0.3 text's §16.3, where a source was
   own-origin by construction), exactly as `transclusions[]` does, and it
   MAY carry `cited`. The array MAY be empty, meaning **no sources
   declared**: pure instructed generation, or generation whose sources the
   publisher cannot name. `model` and `at` are RECOMMENDED. A span MAY be
   the whole body.
2. The array MUST NOT carry instruction text or any other pre-generation
   authoring state — instructions are studio-private, permanently. Disclosure
   covers what was produced and from what, never how it was asked for.
3. **A source is not a transclusion.** Drawn-upon material is woven into new
   prose, not quoted: source references never appear in `transclusions` and
   never produce a `blyg-transclusion` blockquote. Verbatim, visible, cited
   quotation remains exclusively transclusion (§10). The two disclosures are
   disjoint by construction.
4. The key is omitted entirely when the version involved no generation, and a
   withdrawal endcap (§9) never carries it. Readers ignore the unknown key
   (§13.1) — the construct is fully backward compatible.
5. Pinned version files (§8) carry the pinned version's `generated` array,
   like `transclusions` — a citation includes its provenance.
6. Like all provenance in this protocol, `generated` is **self-asserted and
   unverifiable** — the same honesty stance as timestamps and `author`. The
   protocol does not pretend to verify what it cannot.
7. **Where the generation ran is not part of the claim.** `generated[]`
   says *this prose is machine-generated*, and, when known, by what model,
   from what, and when. Text generated outside the publishing studio and
   brought into an item — pasted from another tool, produced by an external
   agent — is disclosed the same way: an entry with `sources` empty or
   naming what is known, `model` and `at` if known. There is no marker for
   "generated elsewhere", because no reader could verify it and none would
   act on it. A publisher that knows a span is machine-generated SHOULD
   disclose it regardless of who ran the model; the construct exists so that
   disclosure is always possible.
8. **A source resolves like a directive** (new in 0.4). A source is resolved
   at generation time by §10.2's order — a local published item, else an
   imported item whose local state is current or withdrawn with a
   pin-retained snapshot, else an error, and more than one imported match is
   an error — so a source may be any item a directive may name, a thread
   included. What is fed to the generator is the publisher's **local
   snapshot**, never a live fetch: generating follows reading, as quoting
   does. Disclosure is **direct only**, as §10.3 is for transclusion: a
   thread fed to a generator is disclosed as that thread, and the words it
   had itself baked are inspectable through it.
9. **A remote source notifies** (new in 0.4). A `sources[]` entry carrying an
   `origin` is a remote reference and SHOULD send a mention (§15.2) whose
   relation is `source` (§15.4). A link carries none of the target's words
   and notifies only as a notice (§10.1, §15.5, fourth revision); a
   generation source carries them, transformed, and is a response: in this
   protocol the class of a notification tracks whether the target's words
   are carried. An agent that draws on many remote items
   sends many mentions, and that is legitimate: each says that a model at
   this origin used those words, and the item it points at has content
   (§10.6's anti-pattern is content-free stubbing, not disclosure). Nothing
   in `content_html` marks a remote source beyond the `blyg-tk-gen` wrapper
   below; span-level source mapping remains deliberately unpromised.

Publishers additionally disclose generated spans in the rendered HTML: the
renderer MUST wrap each generated span in `content_html` as
`<span class="blyg-tk-gen">…</span>` (inline output) or
`<div class="blyg-tk-gen">…</div>` (block output). The class name
`blyg-tk-gen` is a **permanent wire token** — it is baked into published
`content_html`, like `blyg-transclusion` (§10.2), and cannot be renamed. No
data attributes are REQUIRED: span-level source mapping is deliberately not
promised (the JSON provenance is version-level and robust; span-level claims
would be brittle across the author's post-generation edits). Styling the
class is presentation, any client's free choice. A client that makes
generated spans visible SHOULD say, wherever it explains the mark, that the
disclosure is the publisher's own and unverified (rule 6); a tint that reads
as a verified authorship badge makes a claim the protocol refuses to make
(revision of 2026-10-06, decision #59; until then this paragraph said the
reference client left the class unstyled for that reason — it has styled it,
off by default and with that disclaimer, since blygger-studio 0.27.0).

### 5.8 The `page` field

*(New in 0.3.)* An item document MAY carry `"page"`: the **URL of the item's
human-readable permalink**, origin-relative and resolved against the origin
(`"page": "t/7c9wk2mhq0v3xj8tn5rzfd41bg/"`) or, from 0.4, absolute.

- The field closes a gap the 0.2 text left open: it called permalink paths
  presentation, and readers that built links to remote items had to guess at
  a convention. Readers SHOULD use `page` when present, and MAY fall back to
  the reference convention (`f/{id}/` for fragments, `t/{id}/` for threads)
  when it is absent.
- The reference client always emits it. It is optional for conformance —
  a blyg with no HTML pages at all is still a blyg.
- `page` is emitted for withdrawn items too (§9): the endcap's page is 200
  forever, and a mention aimed at a withdrawn item still needs a target.
- **`page` MAY be absolute** (new in 0.4; promoted from the 0.3 text's
  §16.6e). A publisher whose permalinks live outside the surface's mount — a
  CMS permalink beside a manifest under an API path — writes the absolute
  URL. Readers resolve a relative value against the origin and take an
  absolute one as given, as they already do for media URLs (§5.4).
- A permalink page SHOULD carry
  `<link rel="alternate" type="application/json" href="{origin}items/{id}.json">`.
  This is the way back: from a page, which is what a Webmention names, to the
  document, which is what a receiver verifies (§15.4).
- **`page` SHOULD be stable for the life of the item** (revision of
  2026-10-03, decision #56). A slug is a promise the moment anyone links to
  it: a reader holds the `page` it imported, `cited.url` (§5.9) is frozen at
  the moment a reference was made, and a Webmention's target is a URL
  (§15.2) — none of them signals a rename, and `version` says only that
  something changed. A publisher that must move a page SHOULD serve a
  redirect from the old path. Readers MAY refresh `page` from the item
  document on any fetch (the staleness check fetches it anyway), and a
  frozen `cited.url` naming the old path remains correct: it names what was
  seen.

### 5.9 The reference shape

Four constructs in this version name a version of an item at an origin —
`forked_from` (§5.6), `stub_of` (§10.6), `transclusions[]` (§10.3) and, from
0.4, `generated[].sources[]` (§5.7) — and all four use one shape:

```json
{ "origin": "https://blyg.protocol-institute.org/",
  "id": "1vgtgz0gq5b2c9k7d3m8r4n6xy",
  "version": 1 }
```

- `origin` is the target's **identity origin** as §12.2 defines it — the
  post-redirect URL the target's manifest was fetched from, minus
  `blyg.json` — never the target manifest's self-asserted `site`. It is
  REQUIRED in `forked_from` and `stub_of` (a citation is absolute) and
  OPTIONAL in `transclusions[]` and `generated[].sources[]`, where omission
  means own-origin, so that every 0.2 thread document and every 0.3
  generated span stays valid unchanged.
- `version` is the version the publisher actually saw and, for a
  transclusion, actually baked. It is the *last version we saw of the thing
  we point at*, and it is the whole of what a reader needs to check whether
  a reference has gone stale: fetch `{origin}items/{id}.json` and compare.
  No protocol construct beyond this is needed for direct staleness, and none
  is defined.
- The three members above are the whole of a reference's **machine-readable
  identity**, and they are the only members anything in this protocol
  verifies or compares. A reference MAY additionally carry the human half of
  a citation, `cited`, defined next — and nothing else.

**The human half of a citation — `cited` (new in 0.3).** A reference names a
version and carries no words, so a reader of a document whose target has
since disappeared would hold an identity and nothing to show. A reference
MAY therefore carry an OPTIONAL `cited` object: the label the citing
publisher saw when it made the reference.

```json
"stub_of": { "origin": "https://blyg.protocol-institute.org/",
             "id": "1vgtgz0gq5b2c9k7d3m8r4n6xy", "version": 1,
             "cited": { "source": "Protocol Institute Blyg",
                        "author": "Editor",
                        "excerpt": "Stigmergy is what a protocol looks like from inside…",
                        "url": "https://blyg.protocol-institute.org/f/1vgtgz0gq5b2c9k7d3m8r4n6xy/",
                        "retrieved": "2026-09-16T20:11:00Z" } }
```

- `retrieved` is REQUIRED whenever `cited` is present — a citation without a
  date is not a citation. `source` (the target blyg's title as seen),
  `author` (the target's own `author.name`, passed through under §5.5),
  `excerpt` (a short caption; publishers SHOULD cap it near 200 characters)
  and `url` (the target's page as it stood) are OPTIONAL.
- It is **self-asserted and never authoritative**, like every other
  provenance member in this protocol, and it is **frozen at the moment the
  reference was made** — publish time for a transclusion, which is
  re-resolved at every publish (§10.2); creation time for `stub_of` and
  `forked_from`. That is what makes it a citation rather than a lookup.
- **Verification ignores it.** Mention verification (§15.4) reads the three
  identity members alone and MUST NOT consult `cited`. Readers MUST NOT
  present it as verified or as the target's current state, MUST NOT bake it
  into `content_html`, and a reader that ignores it entirely remains
  conformant. Importers retain it verbatim as part of the document.
- **The excerpt is a caption, not a quotation.** Verbatim quotation of
  another item is exclusively transclusion (§10); the length cap is what
  keeps `cited` from becoming a second quotation channel.
- The same object is permitted in `forked_from`, `stub_of` (including a
  plain-web `{url}` target, §10.6), every `transclusions[]` entry and every
  `generated[].sources[]` entry, and pinned version files (§8) carry each
  reference's `cited` as they carry the reference itself.

Why it is on the wire at all: a transclusion already bakes the target's
*entire* content into the quoter's document, self-asserted, so a label is
strictly weaker than what §10 permits; and a citation is as-of-retrieval by
nature, so the citing publisher's frozen label is *more* faithful to what
was cited than a reader's later lookup of the live target — not a fallback
for when the link dies.

## 6. Manifest and archive index

### 6.1 Manifest — `blyg.json`

```json
{
  "blyg": "0.4",
  "level": 2,
  "generator": "blygger-studio/0.46.3",
  "generator_url": "https://github.com/blygger/blygger-studio",
  "site": "https://example.com/blyg/",
  "title": "Venkat's blyg",
  "author": { "name": "Venkatesh Rao", "bio": "…", "avatar": "media/avatar.png",
              "links": [{ "label": "Home", "url": "https://venkateshrao.com" }] },
  "feed": "feed.xml",
  "items": "items/index.json",
  "blogroll": "blogroll.opml",
  "webmention": "webmention",
  "updated": "2026-07-18T09:30:00Z"
}
```

The manifest `author` is the **publication identity** — a person, a collective,
a masthead: the imprint, where per-item `author` (§5.5) is the byline. When an
item carries no `author`, no assertion is made; readers fall back to this
site-level identity for display.

The `blogroll` key is OPTIONAL: an origin-relative path, canonically
`"blogroll.opml"`, present only when the publisher serves a non-empty
blogroll (§11). The `webmention` key (new in 0.3) is OPTIONAL: the URL of the
publisher's Webmention endpoint, origin-relative allowed, present only when
the publisher receives mentions (§15.1); a static export omits it. The `site`
value is self-asserted and display-advisory only; it never establishes
identity (§12.2). `level` and `generator` are informative (§3.2), and so is
**`generator_url`** (new in 0.3): OPTIONAL, one absolute URL to the client
software's canonical source repository or home page, baked in by the
client's author beside `generator` (the precedent is Atom's generator
`uri`). Publishers SHOULD emit it; readers MUST NOT gate on it; its absence
means only that nothing was stated. It is a SHOULD and will never be a MUST —
a required field that readers may not act on would be a conformance rule
serving a directory's convenience, and most existing clients would fail it
for a reason unrelated to publishing. **There is deliberately no
maintained/unmaintained declaration**: the software that would need to say
"I am unmaintained" is exactly the software nobody is updating, so
maintenance status is a fact for directories to observe, never for the wire
to assert. A registry MAY require a client source as a condition of
*listing*; that is its business, not conformance.

**Members** (revision of 2026-10-17, decision #76; checked against all 22
live manifests, which conform): REQUIRED `blyg`, `title`, `updated`;
RECOMMENDED `level`, `generator`, `generator_url`, `site`, `author`;
OPTIONAL `feed`, `items`, `item`, `pin` (defaults below), `blogroll`,
`webmention`, `hoppers`. Unknown members are ignored (§13.1).

The `hoppers` key (new in 0.4) is OPTIONAL: an array listing the
publisher's **public** hoppers, present only when there is at least one.
Each entry is an object with `title` (REQUIRED, a string), `page`
(REQUIRED, the hopper's human-readable page) and `feed` (OPTIONAL, its
hopper feed, §13.5a), both origin-relative or absolute URLs:

```json
"hoppers": [
  { "title": "AI insights", "page": "h/ai-insights/",
    "feed": "h/ai-insights/feed.xml" }
]
```

The paths are presentation, like `page` (§5.8); the reference client's
`h/{slug}/` is a convention. A hopper that is not public MUST NOT be
listed. The list is the publisher's authority for which feeds under its
origin are hopper feeds: resolution (§12.1) believes a hopper feed only
because the manifest names it.

**The manifest locates the surface** (new in 0.4; promoted from the 0.3
text's §16.6e, adopted in a reshaped form from a public proposal,
[blygger-spec#2](https://github.com/blygger/blygger-spec/issues/2)). `feed`
and `items` are **authoritative**: origin-relative or absolute URLs,
defaulting to `feed.xml` and `items/index.json` when absent, and readers use
the manifest's value. Two further OPTIONAL keys, in
[RFC 6570](https://www.rfc-editor.org/rfc/rfc6570) level-1 form, say where
documents live: **`item`**, with the variable `id` (default
`items/{id}.json`), and **`pin`**, with the variables `id` and `n` (default
`items/{id}/v{n}.json`). Readers MUST expand them wherever this document
says `{origin}items/{id}.json` or `{origin}items/{id}/v{n}.json` (§4). All
four values MAY carry a query string, because they are expanded or fetched,
never resolved against. A blyg that omits them is unchanged, and the
reference client emits none: absent means default, and emitting defaults
would only make every manifest longer. A manifest that relocates its
surface looks like this — the one fixed name is still its own (§12.1):

```json
{
  "blyg": "0.4",
  "level": 2,
  "generator": "soapbox/1.0.0",
  "site": "https://example.com/",
  "feed": "https://example.com/feed/blyg/",
  "items": "https://example.com/wp-json/blyg/v1/items",
  "item": "https://example.com/wp-json/blyg/v1/items/{id}",
  "pin": "https://example.com/wp-json/blyg/v1/items/{id}/v{n}",
  "updated": "2026-10-07T22:44:00Z"
}
```

The cost is one cached manifest per unknown origin: following a reference
needs the target origin's manifest to expand `item`, and subscribed readers
hold it already, receivers own theirs, so the only new fetch is on a
staleness check against an origin a reader has never read (§15.4 raises its
bound by one for the same reason).

### 6.2 Archive index — `items/index.json`

Every item ever published — including withdrawn items — with no window, ordered
by `updated` descending:

```json
{
  "updated": "2026-07-18T09:30:00Z",
  "items": [
    { "id": "7c9wk2…", "kind": "fragment", "created": "…", "updated": "…", "version": 3 }
  ]
}
```

The index is what makes new and lagging subscribers lossless: any reader can
enumerate it and fetch item documents, regardless of how much feed window it
missed. On the subscribe side it is the **reconciliation surface** (§13.2) —
complete by construction, so diffing it against local state is total recovery.

## 7. The feed — `feed.xml`

RSS 2.0 with the `blyg:` namespace (`https://blygger.org/ns/0.1`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:blyg="https://blygger.org/ns/0.1">
  <channel>
    <title>Venkat's blyg</title>
    <link>https://example.com/blyg/</link>
    <description>…</description>
    <lastBuildDate>Sat, 18 Jul 2026 09:30:00 GMT</lastBuildDate>
    <blyg:level>2</blyg:level>
    <blyg:manifest>https://example.com/blyg/blyg.json</blyg:manifest>
    <item>
      <guid isPermaLink="false">blyg:7c9wk2mhq0v3xj8tn5rzfd41bg:v3</guid>
      <link>https://example.com/blyg/f/7c9wk2mhq0v3xj8tn5rzfd41bg/</link>
      <title>Sharpened the claim — Markdown source of the latest…</title>
      <description><![CDATA[<p>rendered HTML of latest version</p>]]></description>
      <pubDate>Sat, 18 Jul 2026 09:30:00 GMT</pubDate>
      <blyg:id>7c9wk2mhq0v3xj8tn5rzfd41bg</blyg:id>
      <blyg:kind>fragment</blyg:kind>
      <blyg:version>3</blyg:version>
      <blyg:created>2026-07-17T18:00:00Z</blyg:created>
      <blyg:item>https://example.com/blyg/items/7c9wk2mhq0v3xj8tn5rzfd41bg.json</blyg:item>
    </item>
  </channel>
</rss>
```

Rules:

- **One `<item>` per publish event**, newest first. The window SHOULD be bounded
  (RECOMMENDED: 50 entries). An item edited twice recently may appear twice at
  different versions; that is correct. The feed is lossy by design — the archive
  index (§6.2) is the lossless surface. A publisher that mints several items in
  one authoring act — a document tangled into a thread and the fragments it
  quotes, a draft chopped into fragments — publishes each as its own event;
  there is no quiet publish, because an event the feed omits is content hidden
  from subscribers, which the feed exists to prevent. A publisher SHOULD publish
  the thread last, so that it is the newest entry, and readers MAY fold the
  burst (§13.7; revision of 2026-10-17, decision #78).
- **GUIDs are per-version**: `blyg:{id}:v{n}`, `isPermaLink="false"`. Plain RSS
  readers dedupe by guid, so per-version GUIDs make edits resurface as new
  entries — matching reverse-chron-by-update presentation. Blyg-aware readers
  roll up by `blyg:id` instead and see no duplicates.
- **Entries render the item's latest content.** A feed entry for an older
  publish event keeps its own `blyg:version` and note, but its `<description>`
  MUST carry the *latest* version's HTML. (Serving each event's own historical
  content would leak history that §5.2 withholds.)
- **`<title>` is derived, because items are titleless (§5.3).** RSS requires
  the element, so publishers MUST emit one, and it MUST NOT be read back as
  an item field. The RECOMMENDED derivation, which the reference client
  uses, is the publish event's changelog note followed by an em-dash and a
  short excerpt of the content (`note — excerpt`), or the excerpt alone when
  there is no note; a withdrawal entry's title is the literal `withdrawn`.
  This derivation is documented so that the same item reads the same in
  different plain-RSS readers; a client that derives differently is
  conformant, and is choosing to make its items read differently
  elsewhere.
- **`<link>` is the item's page** (§5.8), absolute.
- **A withdrawn item contributes exactly one entry** — its withdrawal event,
  with title `withdrawn` and empty description. Its earlier publish events MUST
  be dropped from the window (with content withheld they would render as empty
  noise under the previous rule).
- **Pinning emits no feed event.** A pin is a promise change, not a content
  change; the changelog `pinned` flag is the signal.
- **Stubs and lineage add no feed vocabulary.** A stub is a thread and appears
  as one; a fork is an item and appears as one. A reader that wants the
  `stub_of` or `forked_from` marker fetches the item document, which §13.1
  already requires for content. A publisher MAY prepend a rendered citation
  or lineage line to `<description>` so that plain RSS readers see what the
  item answers or descends from; that line is presentation, exactly like the
  injected transclusion-provenance line, and is not part of `content_html`.
- `<description>` HTML MUST be self-contained — which `content_html` already
  is (§5.2: every URL absolute) — with no dependence on the origin's
  stylesheets or scripts. (Baked transclusion and
  generation wrappers, §10.2/§5.7, ride along automatically — they are part of
  `content_html`.)
- When an item's `author.name` is present, the publisher SHOULD emit
  `<dc:creator>` (`xmlns:dc="http://purl.org/dc/elements/1.1/"`) with the
  display name — the standard RSS byline. The opaque `author` object itself
  never appears in the XML: the state plane is ground truth, the feed is a
  signal.
- `pubDate`/`lastBuildDate` use RFC 822 format; `blyg:*` timestamps stay
  ISO 8601.
- **`<blyg:manifest>` is the feed's upgrade hook**: it is what lets a plain
  feed URL found anywhere — a feed reader's subscription list, an OPML file, a
  `rel="alternate"` link — resolve to a full blyg subscription (§12 step 3).
  Publishers MUST emit it.
- **The namespace URI is permanent** — an opaque wire token like `blyg.json`
  and the `blyg:` prefix itself. It never tracks the protocol version: the
  `0.1` inside it is part of the spelling, not a version claim, and it stays
  unchanged across protocol versions. Later versions add elements to this
  same namespace under the reader ignore rule (§13.1); the protocol version
  signal is the manifest's `blyg` key (§3.1), never the namespace.

## 8. Pins — `items/{id}/v{n}.json`

A **pin** is the publisher's irrevocable hosting promise for one specific
published version: *this exact content stays fetchable at this URL forever* —
surviving later edits and withdrawal. Only pinned versions get per-version
files; unpinned history stays withheld. (Analogy: the item id plays the
IPNS-name role — a mutable pointer; a pinned version plays the CID role —
immutable and citable. Blygger inverts IPFS's default because it is an authoring
medium: mutable by default, immutable by explicit act.)

```json
{
  "blyg": "0.3",
  "id": "7c9wk2mhq0v3xj8tn5rzfd41bg",
  "kind": "fragment",
  "version": 2,
  "at": "2026-07-17T21:12:00Z",
  "note": "typo",
  "pinned": true,
  "origin": "https://example.com/blyg/",
  "author": { "name": "Venkatesh Rao", "url": "https://example.com/blyg/" },
  "content_md": "…that version's markdown…",
  "content_html": "<p>…that version's HTML…</p>",
  "content_hash": "sha256:…"
}
```

Rules:

1. **Irrevocable.** Once pinned, the file MUST return 200 forever — including
   after the item is withdrawn. Unpinned versions and unknown ids: 404.
2. Any published version with content MAY be pinned, including retroactively
   (exposing withheld history is the publisher's right). Withdrawal endcaps
   (§9) MUST NOT be pinned — there is nothing to cite.
3. Pinning does not freeze the id: the live stream continues under the same
   identity; the pin guarantees only the citation.
4. **Media referenced by any pinned version MUST be retained forever.** Pinned
   documents carry no `media` array; their `content_html` references media
   directly, relying on media immutability (§5.4).
5. Threads are pinnable like fragments: a pinned thread version serves its
   publish-time `content_html` (baked snapshots included, cross-origin ones
   too) and its `transclusions` provenance, with `"kind": "thread"`. A pinned
   version that involved generation carries its `generated` array (§5.7).
   **A pin carries its own citations**: a pinned stub version carries the
   `stub_of` it was published with (§10.6), and a pinned version of a forked
   item carries `forked_from` (§5.6) — the frozen artifact says what it
   answered and where it came from, at the version it said so.
6. **`author` rides outside the pin promise.** `content_hash` covers
   `content_md` only, so the pin's immutability guarantee covers *content*,
   never the author bytes. A pinned file SHOULD carry the assertion as
   published with that version, but both serve-time and publish-time assertion
   strategies are conformant. Verifiable authorship, if wanted, is a signature
   *inside* an authorspace grammar (§5.5), not a protocol feature.
7. **A pin is the only thing lineage may point at** (§5.6), and the only thing
   a reader may retain past withdrawal (§13.4). Pins are therefore the
   protocol's whole answer to "how do I make sure this stays citable": ask
   the author to pin it.

### 8.4 Historical versions: pinned-only, JSON promised, HTML optional

No route ever serves an **unpinned** older version, in any representation — a
general historical route would gut withheld-unless-pinned. The same rule
bounds what a public page's version display may offer: every version it
exposes — as a link, or presented in place — MUST be one the origin already
promises forever, i.e. the live version and pinned versions, nothing else. A
version display MUST NOT offer, imply, or hint at access to unpinned history.

Within that bound, presentation is the client's. The floor is discrete pin
citations (e.g. "v6 · pinned: v2, v4"); a page MAY additionally present the
pinned artifacts themselves in place (the reference client pages among them
with each shown version visibly marked frozen). The design intent to honor,
whatever the presentation: **pins are a sequence of frozen citable artifacts
of one identity, not pages of one document.** Keep each pinned version
discrete, visibly frozen, and individually citable; a presentation cannot
reconstruct a continuous edit history, because the bytes for one are never
served.

The pin's *promise* is the JSON file (§8 rule 1). Additionally, a publisher **MAY**
serve a rendered page for each pinned version at the item's permalink path
plus a version segment:

```
GET {origin}{page}v{n}/     e.g. {origin}f/{id}/v{n}/ or {origin}t/{id}/v{n}/
```

Rules, for publishers that serve these pages:

1. **Gated exactly like the JSON file**: 404 unless that exact version is
   pinned; 200 forever once it is, surviving withdrawal. The route exposes
   only bytes already promised forever — never unpinned history.
2. The page's content is that version's **publish-time `content_html`,
   verbatim** (baked transclusion snapshots included for threads). Page
   chrome (banner, links) is presentation and may evolve; the content is
   what is promised.
3. The page SHOULD carry `rel="canonical"` pointing at the live permalink,
   SHOULD be visibly marked as a frozen snapshot, and SHOULD link its
   `v{n}.json` twin — the page is the human citation, the JSON the machine
   citation. Nothing in this protocol reads `rel="canonical"`: readers use
   `page` (§5.8) and mentions target it (§15.2), so the link is for
   indexers, and its job is that they index the live page rather than its
   frozen copies. A publisher that serves one item at more than one live
   address — a front page at the mount root, for instance — names whichever
   it wants indexed, and `page` is unaffected (decision #69, 2026-10-12).
4. Pinned pages are **not** publish events: they MUST NOT appear in
   `feed.xml`, the archive index, or `items/index.json`, and they add no
   manifest vocabulary. Discovery is the live page's pin citations.
5. Readers MUST NOT require these pages — the subscribe side works entirely
   from the JSON surfaces.

## 9. Withdrawal

Withdrawing is the only exit for a published item. There is no delete: no
permanent-delete state exists in the protocol. (Discarding a never-published
draft is a hard delete — nothing was ever public.)

Withdrawing publishes a permanent **endcap**: a version bump with
`content_md` = `""`, `content_html` = `""`, `media` = `[]`, an optional note,
`"kind": "withdrawn"`, `updated` set, and the changelog retained plus the endcap
entry. For threads, the endcap also empties `transclusions` to `[]` (§10.4)
and omits `stub_of` (§10.6); an endcap never carries a `generated` array
(§5.7). **The endcap keeps `page` and `forked_from`**: the endcap empties
what the item *said*, and where an item lives and where it came from are
not what it said.

- The item document stays **200 forever** (§4). Pinned versions of the item
  remain fetchable forever (§8).
- Conforming readers roll the item up to null and drop it from their local
  archive (§13.4). The protocol is honest that this is cooperation, not
  cryptography: remote copies, caches, and snapshots survive withdrawal.
- Withdrawal is **reversible**: a later publish event (vN+1 with the item's
  authored kind) is the item returning under the same id; readers that dropped
  it simply re-import it.
- **Withdrawal does not cascade, in either direction.** A thread that baked
  the withdrawn item keeps its snapshot (§10.4). A stub of a withdrawn item
  is the stubber's speech and stays published; a withdrawn item's document
  keeps accepting mentions (§15.6). A withdrawn stub stops *verifying* as a
  stub, because its endcap omits `stub_of`, and SHOULD re-send its mention
  once so the target learns this (§15.2).

## 10. Threads and transclusion

A thread is an item with `"kind": "thread"`: long-form markdown that
**transcludes** other items. Threads use the same identity, versioning,
changelog, withdrawal, and pin machinery as fragments. At 0.2, transclusion
was same-origin and fragments-only. **At 0.3 both restrictions are lifted**:
a thread may transclude fragments or threads, of its own origin or of any
origin its publisher has imported — and the rule that makes this safe is
that the quote is always the publisher's **local snapshot**, never a live
fetch.

### 10.1 Grammar (permanent protocol surface)

- A line consisting solely of `![[` + a 26-character item id + `]]`
  (surrounding whitespace allowed; a label allowed after the id, below)
  is a **transclusion directive**: `![[7c9wk2mhq0v3xj8tn5rzfd41bg]]`. The
  grammar is line-based, and a line ends at LF or CRLF alike (revision of
  2026-10-17, decision #76).
- A transclusion directive immediately followed, with no blank line, by a
  markdown blockquote is a **partial transclusion** (revision of 2026-10-03,
  decision #49): the blockquote's text is the **selection**, and §10.2 says
  what is checked and what is baked. The blockquote's extent is
  CommonMark's, lazy continuation included: a line that follows a `>` line
  with no blank line between belongs to the selection even without its own
  `>` (decision #76). A blank line detaches the blockquote, so a whole
  transclusion followed by the author's own quotation stays writable:

  ```
  ![[7c9wk2mhq0v3xj8tn5rzfd41bg]]
  > Stigmergy is what a protocol looks like from inside, and the
  > reason it looks like nothing at all is the point.

  Commentary begins after a blank line.
  ```

- Anywhere else — inline, inside code spans and code blocks — the directive
  sequence is inert text.
- `![[id@vN]]` (explicit version) is **reserved**: publishers at this
  version MUST reject it at publish time; readers MUST tolerate it as an
  unknown construct.
- The directive names an **identity**, not an origin: there is no origin
  spelling in the grammar, and none is planned. That is what lets a thread be
  moved, mirrored, or re-hosted without rewriting its source; which origin a
  directive resolved to is recorded in provenance (§10.3), not in the text.
- The unprefixed inline form `[[` + id + `]]`, anywhere in `content_md`
  outside code, is a **plain internal link** (new in 0.3; *outside code*
  added 2026-10-03, decision #54: inside code spans and code blocks the link
  form is inert text exactly as the directive is — one rule for both forms,
  so the grammar can be quoted). It resolves at publish time by the
  same order as a directive (§10.2) and renders in `content_html` as an
  ordinary anchor whose `href` is the **absolute** URL of the target's page
  (§5.8) — absolute because `content_html` travels to subscribers (§7); the
  anchor text is the label when the author wrote one (below), else the
  publisher's choice. It is **disclosed on the wire**
  (revision of 2026-10-19, decision #79, which reverses #32): each resolved
  link produces one `links[]` entry (§10.3a) and, when the target is remote,
  SHOULD send a mention (§15.2) whose relation is `link` — a **notice**, the
  lowest class of verified mention, never a response (§15.5). An
  unresolvable link MUST be a publish error, like an unresolvable directive.
  **The one way to cite without notifying is the ordinary markdown link**,
  `[text](absolute page URL)`: it renders to the same anchor, produces no
  `links[]` entry and no mention, and the protocol never inspects it. The
  author chooses by spelling — the bracket form is this protocol's citation
  and discloses; the plain URL is the web's and does not. Until this revision
  the bracket form was silent (#32); a reader built on that reading loses
  nothing, since it ignores an unknown member (§13.1).
- **The label** (new in 0.4, decision #70). In either form the id MAY be
  followed by `|` and text:
  `[[7c9wk2mhq0v3xj8tn5rzfd41bg | the opening fragment]]`,
  `![[7c9wk2mhq0v3xj8tn5rzfd41bg | the opening fragment]]`. The id comes
  first and the label after the pipe, which is the received double-bracket
  convention — `[[Page|label]]` in MediaWiki, `[[note|alias]]` in Obsidian,
  whose `![[…]]` embed this grammar already borrowed — and the order of
  every other bracket form here; the project departs from a widely used
  convention only for a technical reason, and there is none (decision #71). The id is the 26 characters after the opening brackets,
  the pipe after it separates, and the label is everything after that pipe
  up to `]]`, so a label may itself contain a pipe. Whitespace around the
  pipe is optional and trimmed; an empty label is no label. The label is
  the **author's label for the target, and resolution ignores it**: the id
  alone names the target, and a publisher that does not know the form sees
  literal text, not a link. On a **link** the label is the anchor text the
  publisher renders into `content_html`. On a **directive** it is the
  author's name for the quoted item (revision of 2026-10-19, decision #81;
  until then a comment that reached nothing): the publisher bakes it as the
  `data-blyg-label` attribute of the transclusion's blockquote (§10.2), so
  that any renderer — the publisher's own page, a subscriber, a fork
  flattener — MAY use it as the anchor text of its attribution line. It
  reaches nothing else: not `transclusions[]`, not the target. A reader MUST
  NOT present it as the target item's title, or as anything but the quoter's
  words (§5.3, decision #46). There is no escape: a label cannot contain `]]`, and one that
  would is rewritten. A client MAY tell the author when a label no longer
  resembles its target, as a courtesy; the protocol checks nothing, because
  a label is the author's words, not a claim about the target (compare
  `cited`, §5.9, frozen at the moment of reference for the same reason). The label changes
  nothing about notification: a labelled link discloses exactly as an
  unlabelled one, a labelled directive quotes and discloses exactly as
  without one.
- **Any other bracketed text is literal.** The two forms above, with or
  without a label, are the whole of the bracket grammar: brackets whose
  first 26 characters are not an id — alone, or before a pipe — enclose
  ordinary text, and clients MUST NOT give it a meaning on the wire. A
  client-private authoring form inside brackets — a span to be minted as its
  own fragment, an alias to be resolved to an id — MUST be rewritten before
  publish so that it never reaches `content_md`, by the same principle that
  keeps generation instructions off the wire (§5.7): no authoring grammar of
  any kind reaches readers.

### 10.2 Publish-time resolution

Resolution happens in the studio at publish time; **readers never resolve
anything**.

**Resolution order.** Each directive MUST resolve, in this order, to:

1. a **local**, currently-published item with that id — fragment or thread;
2. otherwise an **imported** item with that id — a snapshot the publisher
   holds, fetched from the item's identity origin by §12's rules, whether it
   arrived by subscription polling or by a one-off fetch of one item
   (revision of 2026-10-19, decision #82: subscription is a client-local
   notion, §10.6 rule 7, and never a condition on the wire) — whose local
   state is current — or withdrawn with a pin-retained snapshot
   (§13.4 retention is exactly what makes such a snapshot still quotable) —
   and which is a blyg item, not an L0 wrapper (§13.6: an L0 row is a wrapper
   around someone's RSS summary, not their item);
3. otherwise a **publish error**. Drafts, unknown ids, withdrawn items with
   nothing retained, and L0 rows are publish errors. **More than one imported
   match MUST be a publish error**, never a guess — the directive names an
   identity, and the publisher does not pick an origin on the author's
   behalf. A **local** id — a draft or a published item — never falls
   through to step 2: an imported document with the same id as a local item
   is the ambiguity §5.1 describes, and a directive naming it is a publish
   error (decision #76).

**The local snapshot is what gets baked — never a live fetch.** Resolution
snapshots the target's latest version *as the publisher holds it*: its
rendered HTML is baked into the thread's `content_html`, wrapped as

```html
<blockquote class="blyg-transclusion"
            data-blyg-id="{id}"
            data-blyg-version="{n}">…item html…</blockquote>
```

for own-origin sources, and for remote sources additionally

```html
<blockquote class="blyg-transclusion"
            data-blyg-id="{id}"
            data-blyg-version="{n}"
            data-blyg-origin="https://blyg.protocol-institute.org/">…item html…</blockquote>
```

`data-blyg-origin` appears **only** for remote sources, so a baked own-origin
quote is byte-identical to its 0.2 form. A directive that carries a label
(§10.1) additionally bakes `data-blyg-label="{label}"`, the label verbatim
and HTML-escaped (revision of 2026-10-19, decision #81); a renderer MAY use it
in its attribution line and MUST NOT give it any other meaning. The wrapper is a bare blockquote
plus data attributes — **no link inside**; any provenance link or byline
shown on an HTML page is presentation, not part of the published
`content_html` (a byline, if shown, is the source's own `author` passed
through, §5.5). The class name `blyg-transclusion` is a **permanent wire
token**, baked into published `content_html`; its styling is presentation.

**Partial transclusion** (revision of 2026-10-03, decision #49). A directive
with an attached blockquote (§10.1) resolves exactly as a whole directive —
same order, same snapshot rule — and adds one check: at publish, the
selection MUST be a substring of the target snapshot's **text content** —
its `content_html` with tags stripped, whitespace collapsed within a block,
block boundaries kept as line breaks — at the version being baked; otherwise
a publish error, as for an unresolvable directive. Any reader MAY re-check
by the same test while the origin serves that version, live or pinned. That
window closes when the origin stops serving the version — a quote baked from
a stale import can name one it never will again — and the quote then has
the standing §14 gives every baked snapshot: the quoter's assertion. The
check this protocol promises is the publisher's, at publish, against the
snapshot it holds, and the way to keep a quote checkable is to quote a
pinned version (decision #76, conformance finding F2).
Misrepresentation by elision is not fixed by this and is not claimed to be;
the second class below is what discloses that a quote is partial. There is
**no cap** on a selection's length: a substring test does not care, and a
cap would be editorial convenience in the protocol. The bake is

```html
<blockquote class="blyg-transclusion blyg-partial"
            data-blyg-id="{id}"
            data-blyg-version="{n}">
  <p>…one line of the selection's plain text…</p>
</blockquote>
```

with `data-blyg-origin` for remote sources exactly as above. The content is
the selection's **plain text, one `<p>` per line of it**, escaped — not a
carved sub-range of the source's inline HTML: the selection is defined on
text, and cutting an HTML range faithfully is a second project. Emphasis in
the source does not survive into the quote; that is the visible cost.
`blyg-partial` is a **permanent wire token** beside `blyg-transclusion`, so
partiality is visible to any reader and survives import. A **plain-web
target gets nothing**: quoting an ordinary web page under a `{url}` stub
(§10.6) is an ordinary markdown blockquote, because there is no versioned
document to verify against. The stub may still carry a frozen `cited`
label (§10.6), which promises no test.

Consequences of the snapshot rule, all deliberate:

- **Publish never depends on the network.** A publisher can only transclude
  what it has already read — quoting follows reading — and a thread publishes
  identically with the network down.
- **Network cycles are harmless.** A snapshot is static bytes; nothing
  recurses at publish, and nothing resolves at read. Two blygs quoting each
  other in a loop produce finite, stale, self-contained documents, which is
  correct.
- **Nesting is nested blockquotes.** A thread target's `content_html` already
  contains its own baked `blyg-transclusion` elements; transcluding it
  nests them. Provenance (§10.3) records **direct** transclusions only;
  deeper layers are inspectable in the baked HTML's data attributes.
- **One local closure check.** A thread MUST NOT transclude a local thread
  whose transitive *local* transclusion closure contains the publishing
  thread's own id. The closure is walked through the **versions actually
  baked** — from each `transclusions[]` entry to that version's own
  `transclusions[]`, which the publisher holds, since it holds its own
  history — never through the targets' current documents, which would let a
  thread contain itself once a quoted thread has republished without the
  quote (decision #76, conformance finding F3). This is cheap
  and it stops the only genuinely silly case — a thread quoting a thread that
  quotes it — which snapshot semantics would otherwise permit as a finite
  but useless doubling. **Remote closures are not walked**: harmless by
  snapshot, unknowable in general.

`content_md` keeps the directives — it is the authoring source of truth.
**Republishing a thread re-resolves every directive** to the then-current
local snapshot. A source that has since been withdrawn at its origin, and
not pin-retained, is a publish error on republish — exactly as a withdrawn
local fragment is — and the author removes the directive or leaves the
thread at its current version. The protocol does not offer "freeze this
quote at the withdrawn version": that would be the first place withdrawal
failed to roll to null, and it is deliberately not offered here. The
consequence for a long-lived composed work — a book as a thread of threads,
a serial republished for years — is that every unpinned remote quote is a
veto held by a stranger: one withdrawal and the work cannot be republished
until the directive is removed. The mitigation is already in the rules and
is stated here so an author meets it where it matters: **quote pinned
versions if you want your work to survive** — a pinned snapshot is retained
(§13.4) and stays quotable through withdrawal (step 2 above). A studio
SHOULD say at publish when a directive resolves to an unpinned remote item.

### 10.3 Provenance

Thread item documents carry a top-level `"transclusions"` array, in directive
order, of references (§5.9) naming the exact versions baked into this thread
version:

```json
"transclusions": [
  { "id": "7c9wk2mhq0v3xj8tn5rzfd41bg", "version": 3 },
  { "id": "1vgtgz0gq5b2c9k7d3m8r4n6xy", "version": 1,
    "origin": "https://blyg.protocol-institute.org/" }
]
```

- `origin` is **omitted for own-origin sources** — every 0.2 thread document
  is therefore a valid 0.3 document unchanged — and for remote sources is the
  source's identity origin (§12.2), never the source manifest's
  self-asserted `site`.
- **One entry per directive**, in directive order: a target quoted twice has
  two entries, and the array maps onto the directives (decision #76).
- A partial transclusion's entry (§10.1, §10.2) additionally carries an
  OPTIONAL `selector` (revision of 2026-10-03, decision #49): `exact`
  REQUIRED — the selection, normalized by §10.2's text-content rule —
  `prefix` and `suffix` OPTIONAL and short; the W3C Web Annotation
  text-quote shape.

  ```json
  { "id": "1vgtgz0gq5b2c9k7d3m8r4n6xy", "version": 1,
    "origin": "https://blyg.protocol-institute.org/",
    "selector": { "exact": "Stigmergy is what a protocol looks like from inside",
                  "prefix": "is the whole point. ", "suffix": ", and the reason" } }
  ```

  Mention verification (§15.4) ignores it, as it ignores `cited`; a reader
  that ignores it entirely remains conformant, because readers display baked
  HTML and never resolve. The relation is `transclusion` and staleness is
  §5.9's check, unchanged — which is why this entered the 0.3 text as a
  revision rather than opening 0.4 (§16.4).
- Fragments omit the key entirely; threads always carry it (a withdrawn
  thread's endcap carries `[]`). Generation sources are disclosed separately
  and never appear here (§5.7), and a plain internal link (§10.1) produces
  no entry here but one in `links[]` (§10.3a): this array discloses copied
  words.
- A remote entry is a **remote reference** and SHOULD send a mention to its
  origin (§15.2), whose relation is `transclusion`.
- Readers at L2 MUST scope a transclusion's `id` to its `origin` when
  present, and to the document's own origin when absent, before doing
  anything with it — the same origin-scoping rule as everywhere else
  (§13.1).

### 10.3a Links — `links[]`

*(New in 0.4; revision of 2026-10-19, decision #79.)* An item document whose
`content_md` resolved at least one plain internal link (§10.1) carries a
top-level `"links"` array, in document order, one entry per link:

```json
"links": [
  { "id": "7c9wk2mhq0v3xj8tn5rzfd41bg" },
  { "id": "1vgtgz0gq5b2c9k7d3m8r4n6xy",
    "origin": "https://blyg.protocol-institute.org/" }
]
```

- An entry is **not a reference** (§5.9): a link names a page, not a version.
  It has `id`, `origin` under §10.3's rule — omitted for own-origin, else the
  target's identity origin — and nothing else: no `version`, no `cited`, no
  `selector`. A label is already in `content_md`.
- Fragments and threads alike carry it when they have links; an item with
  none omits the key, and an empty array is equivalent. A withdrawal endcap
  omits it.
- A remote entry is a **remote reference** for §15.2 and SHOULD send a
  mention, whose relation is `link` (§15.4): a notice, never a response
  (§15.5). Same-origin entries never generate mentions.
- A markdown link to a blyg page is not an entry (§10.1): the array records
  the bracket grammar and nothing else, and a publisher MUST NOT populate it
  by inspecting HTML. The silent citation is a feature, not a gap.
- Readers MUST scope `id` to `origin` as §13.1 requires, and MAY ignore the
  array entirely; a 0.3 reader does.
- A fork flattens the bracket form to a markdown link (§5.6 rule 6), so a
  fork carries no entry for an inherited link: custody runs one hop
  (decision #65), here as everywhere.

### 10.4 Snapshot independence

The rule that makes network cycles harmless, applied at every origin:

- Later edits, withdrawal, or pinning of a source do **not** change a thread's
  baked snapshot. Withdrawal does not cascade — content published into a
  thread stays in the thread, the same honesty rule as remote caches.
- **No auto-pin:** `transclusions[].version` is provenance metadata and may
  name a version with no fetchable per-version file. Pinning stays a separate
  deliberate act; the self-contained baked HTML carries the content.
- A thread rendered against an older source version is legible by design: its
  provenance names exactly which version it baked.
- **Staleness is a direct relation.** A thread's reference is stale when the
  named target has a newer version at its origin, which any client can
  check from the reference alone (§5.9). It is *not* stale because a target
  that has not itself republished holds a stale quote of something else: the
  thread baked that target's bytes at that target's version, and those bytes
  have not changed. There is no transitive notion of staleness (§16.5): every
  edge of the quotation graph is owned by the publisher who baked it, and only
  that publisher can refresh it, so freshness over the whole graph is nothing
  more than the direct check applied at each origin.

### 10.5 Feed and presentation

Feed entries for threads carry the full baked self-contained HTML (automatic,
given the snapshot rule). Threads have no length cap. How an HTML feed page
excerpts threads is presentation, not protocol.

### 10.6 Stubs — `stub_of`

*(New in 0.3.)* A **stub** is a thread that declares itself a response to
**exactly one** target. Threads only — the frozen v0 concept's own framing
("stubs are threads, so a stack always looks like a link to a local
thread"), and what makes stubs stackable: threads can be transcluded, so a
stub of a stub is nesting, not a new construct.

A thread document MAY carry a top-level `"stub_of"`, in one of two shapes:

```json
"stub_of": { "origin": "https://blyg.protocol-institute.org/",
             "id": "1vgtgz0gq5b2c9k7d3m8r4n6xy", "version": 1 }
```

for a blyg target — a reference (§5.9), `origin` REQUIRED even when it is the
publisher's own, because a citation is absolute — or

```json
"stub_of": { "url": "https://simonwillison.net/2026/Sep/10/some-post/" }
```

for a plain-web target: an L0 subscription's entry, or anything with a URL.
An L0 wrapper's id (§13.6) is a reader-local name for someone's RSS entry,
not an item at an origin, and the blyg-target shape MUST NOT name one; a
response to an L0 entry is a `{url}` stub naming the entry's link (decision
#76).

Either shape MAY carry the `cited` object of §5.9 — the blyg-target shape
since §5.9 named `stub_of` as a site, the `{url}` shape by the revision of
2026-10-06 (decision #55) — under that section's rules unchanged: `retrieved` REQUIRED,
self-asserted, frozen when the stub was created, ignored by verification,
never baked, ignorable by any reader, and `excerpt` a caption capped near
200 characters. On a `{url}` target the frozen label matters more than
anywhere else, because a plain-web page has no version to re-fetch and the
label is the only record of what was read:

```json
"stub_of": { "url": "https://simonwillison.net/2026/Sep/10/some-post/",
             "cited": { "source": "Simon Willison's Weblog",
                        "excerpt": "Some post",
                        "url": "https://simonwillison.net/2026/Sep/10/some-post/",
                        "retrieved": "2026-09-16T20:11:00Z" } }
```

A plain-web target gets nothing else: no `selector`, because there is no
versioned document to check a quotation against (§10.2). It is quoted with
an ordinary markdown blockquote, which is why the caption cap stands.

Rules:

1. **Exactly one target.** A stub responds to one thing. Other transclusions
   in the body are quotes, not additional targets. A response to two things
   is two stubs.
2. **The body is the author's.** The protocol never requires the body to
   transclude the target. `stub_of` is the machine-readable response marker,
   and readers rely on it, never on body inspection. A stub whose body
   contains no quote of its target is a *response by link*, which is
   legitimate and verifies as a stub (§15.4). (The reference client's stub
   action always starts the body with `![[id]]` for a blyg target, because a
   stub without the quote is not a stub in the medium's own aesthetic; an
   author who deletes the directive has still published a stub.)
3. **Version agreement.** At publish, if the body transcludes the stub's
   target, `stub_of.version` MUST equal the version actually baked
   (§10.3); otherwise it keeps the value it last had — at creation, what the
   author saw; after a version that quoted the target, the version baked
   then. The value is monotonic and never moves backwards (decision #76,
   conformance finding F17). The two can never disagree on a published
   document.
4. `stub_of` lives on **versions**, like `transclusions`: a pinned version of
   a stub carries its own citation (§8), the live document reflects the
   latest, and a withdrawn stub's endcap omits it (§9) — which is precisely
   what makes a withdrawn stub stop verifying as a stub.
5. A blyg-target stub is a **remote reference** when its origin is not the
   publisher's own, and SHOULD send a mention (§15.2), whose relation is
   `stub`. A `{url}` stub SHOULD send an ordinary W3C Webmention to that
   URL if the target advertises an endpoint; most will not.
6. **No feed vocabulary** (§7). A stub is a thread and appears as one.
7. Stubs are not coupled to any studio construct — not to hoppers, not to
   subscriptions. The marker is the whole of the protocol's knowledge that a
   response happened.

What a stub is *not*: a reply. There is no thread of replies, no
conversation object, no notification to anyone but the target's origin, and
nothing a target can do about being stubbed except read it. The stub is on
the stubber's soapbox, under the stubber's identity, in the stubber's feed.

**A stub is a response, and a stub emitted without one is a misuse.** An
aggregator, script, or agent that emits a stub for every item some set of
origins publishes — with nothing to say about any of them — is not
responding: it is re-emitting other people's content through a construct
whose cost is supposed to be editorial work (§13.5), and it fills every
target's response signal with non-responses (§15.5). The honest shape for
"one place to follow a group" is a blogroll plus curation (§11, §13.5). An
author, human or otherwise, that reads each item and answers it under its
own byline is stubbing legitimately, however many stubs that is.

## 11. The blogroll — `blogroll.opml`

*(OPTIONAL at every level.)* The blogroll is the protocol's **static
discovery plane**: a curated, published list of subscriptions the publisher
chose to show. It is a publishing act, not an export — the outbound half of
the public graph. From 0.3 the inbound half exists too, and is dynamic:
verified mentions (§15).

- The file is **standard OPML 2.0 with no extensions**, served at
  origin-relative `blogroll.opml` (a protocol-fixed filename, like every name
  in §4). Each entry is one `<outline>` with `type="rss"`, `xmlUrl` = the
  subscription's feed URL, `htmlUrl` = its origin (or page URL for a legacy
  feed), and `text`/`title` = a display title:

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <opml version="2.0">
    <head><title>Venkat's blogroll</title></head>
    <body>
      <outline type="rss" text="Interconnected"
               xmlUrl="https://interconnected.org/home/feed"
               htmlUrl="https://interconnected.org/home/" />
      <outline type="rss" text="Another blyg"
               xmlUrl="https://example.org/blyg/feed.xml"
               htmlUrl="https://example.org/blyg/" />
    </body>
  </opml>
  ```

- **No blyg-specific OPML attributes exist, deliberately.** A consumer
  resolving any entry's `xmlUrl` through §12 gets the blyg upgrade for free
  via the feed's `<blyg:manifest>` element (§7); plain OPML tooling keeps
  working untouched. The wire already carries the upgrade path — nothing
  custom is needed.
- The manifest advertises the file via the OPTIONAL `blogroll` key (§6.1).
  Publishers SHOULD also emit `<link rel="blogroll" href="…">` on the HTML
  feed page.
- **The blogroll is curated, and claims no completeness — ever.** It is
  whatever subset of their reading the publisher chose to publish; readers
  and crawlers MUST NOT treat it as a statement of everything the publisher
  follows. Clients SHOULD treat inclusion as opt-in per subscription,
  defaulting to excluded — publishing a reading choice is a deliberate act.
- A blyg with nothing to show serves no `blogroll.opml` (404) and omits the
  manifest key.
- **There is no protocol "follow."** Subscribing is invisible, client-local
  state: no follower lists, no follow requests, no follow objects, at any
  level, ever. The public graph is blogrolls — outbound and curated — plus
  whatever verified inbound mentions a publisher chooses to display (§15.5).

## 12. Resolution — from URL to subscription

Resolution turns a URL found out-of-band — a link someone shared, a blogroll
entry, an address bar — into a subscription target. It is **deterministic,
ordered, and bounded** (at most 6 fetches), so that any two conforming
readers handed the same URL arrive at the same subscription identity.
Readers that subscribe MUST implement the following procedure in this
order. Output: a blyg subscription `{ origin, manifest }`, a hopper
subscription `{ origin, manifest, hopper_feed }` (new in 0.4, step 7), a
legacy feed subscription `{ feed_url }` (L0), or failure with the list of
URLs tried.

### 12.1 The algorithm

1. **Normalize.** Parse the URL; strip query and fragment. If the path does
   not end in `/`, append `/`. Call this the *candidate origin*. HTTPS is
   expected; readers MAY permit `http:` (local development) but SHOULD warn.
   The query is stripped because **a manifest's address is a path**
   (decision #64, 2026-10-06): a URL with a query string cannot anchor
   origin-relative references — resolving `items/x.json` against
   `/?rest_route=…` drops the query — so it has no surface and no identity
   prefix, and a manifest served only at such a URL is out of scope.
2. **Direct probe.** `GET {candidate}blyg.json`. If the body parses as a
   manifest — a JSON object with a `"blyg"` version key — the URL is
   **resolved as a blyg**. Do not trust `Content-Type` (static hosts
   misreport); parse-success is the test.
3. **Feed upgrade.** If the input URL itself returns XML that parses as RSS
   or Atom: if the channel carries `<blyg:manifest>` (§7), fetch that
   manifest → **resolved as a blyg**. Otherwise hold the feed as the **L0
   candidate** and continue — a later step may still find a manifest.
4. **rel probe.** If the input returned HTML, look for
   `<link rel="blyg" href="…">`. Resolve the `href` against the document URL
   and fetch it. **If the body parses as a manifest, that *is* the manifest**
   (new in 0.4; promoted from the 0.3 text's §16.6e): a publisher whose
   manifest cannot live at `blyg.json` under its origin names it here
   directly. Otherwise the href is an **origin base URL**, and readers
   append `blyg.json` and probe as in step 2, as at 0.3. No new `rel`, no
   new media type; the feed's `<blyg:manifest>` (§7) already names the
   manifest by absolute URL. **One hop only**: a rel target's own HTML is
   never scanned — no recursive discovery, no loops. Readers MUST support
   the HTML `<link>` element here; supporting an equivalent HTTP `Link`
   header is OPTIONAL. (Publishers whose blyg mounts away from their front
   page SHOULD emit this link on pages they expect to be shared.)
5. **Conventional-mount probes.** At the input's scheme+host root, probe
   `/blyg/blyg.json`, then `/blyg.json`, skipping any URL already probed.
   This is a courtesy fallback only — publishers MUST NOT rely on it. The
   mount is free (§4); these probes exist because `/blyg/` is the reference
   default and root mounts are first-class.
6. **RSS fallback.** If no manifest was found: the L0 candidate from step 3,
   or standard RSS autodiscovery on the input's HTML
   (`rel="alternate" type="application/rss+xml"` or the Atom equivalent),
   resolves the URL as a **legacy L0 feed** (§13.6). Otherwise resolution
   fails, and the reader SHOULD report the trail of URLs tried.
7. **Hopper match** (new in 0.4). Whenever steps 2–5 resolve a manifest
   that carries `hoppers` (§6.1), and before returning it, compare the
   input URL, with query and fragment stripped and *before* step 1's
   trailing slash, against each entry's `feed` and `page`, resolved against
   the identity origin (§12.2); a `page` matches with or without its
   trailing slash. On a match with an entry that has a `feed`, the URL is
   **resolved as a hopper**: `{ origin, manifest, hopper_feed }`, the
   feed's resolved URL. A match with a `page` alone resolves as the blyg.
   No extra fetch is needed; the manifest is already in hand. A reader that
   offers both SHOULD let the user choose the whole blyg instead.
   Without this step, every URL under a blyg's mount resolves to the whole
   blyg, through step 2 or step 5, before the hopper feed is found in step 6.
   A hopper feed under a mount that steps 2–5 do not find (no `rel="blyg"`
   on the hopper page, no conventional mount) resolves at step 6 as a plain
   L0 feed. That is a correct degradation, not a hopper subscription.
   Publishers SHOULD therefore put `<link rel="blyg">` (step 4) on hopper
   pages.

### 12.2 Subscription identity

- **Subscription identity is the final fetch origin**: the URL the manifest
  was actually fetched from, minus its last path segment — `blyg.json` at
  the default location — after following redirects. A publisher whose
  manifest lives at `/wp-json/blyg/v1/manifest` has the identity origin
  `/wp-json/blyg/v1/`; every reference to it names that string (§5.9), and
  so it must be as stable as any origin (new in 0.4: the 0.3 rule, stated
  without the filename). The manifest's self-asserted `site` is
  display-advisory only. If `site`
  disagrees with the fetch origin, the reader SHOULD surface the discrepancy
  and MUST NOT adopt the asserted value as identity — otherwise a mirror
  could inherit another origin's identity, violating origin scoping (§13.1).
  This is the subscribe-side face of invariant 4: the only
  protocol-authenticated entity is the origin. **The same rule is applied
  inbound by Webmention verification** (§15.4): a document is believed to
  speak for an origin only if it was fetched from that origin.
- **A hopper subscription's identity** is the pair (identity origin, the
  hopper feed's URL as the manifest names it). It is a subscription to a
  list *at* an origin, not a second origin. When a later manifest no longer
  lists the feed (the hopper was taken private or removed), the reader
  stops polling it and handles its entries as withdrawn (§13.5a). The
  reader MUST NOT silently turn the subscription into one to the whole
  blyg; it SHOULD tell the user and MAY offer that.
- **Redirects:** follow a bounded number (RECOMMENDED: 5); the *final* URL
  wins as origin. Cross-host redirects are allowed — sites move; identity is
  where the bytes actually came from.
- **Re-resolution:** readers MAY re-run resolution when a subscription's
  surfaces 404 persistently (the blyg may have moved and left a rel link).
  Adopting a new origin is an **identity change** and MUST be user-confirmed,
  never automatic.
- The identity origin is the value a publisher writes into every reference
  it emits (§5.9). Two readers that resolved the same blyg therefore write
  the same `origin` string, which is what lets a receiver compare a mention's
  claimed origin against its own (§15.4).

### 12.3 Polling etiquette

- Readers SHOULD poll with conditional requests (`If-None-Match` /
  `If-Modified-Since`) and honor `304`.
- Readers SHOULD back off exponentially on repeated failure, SHOULD honor
  `Retry-After` on 429/503, and MUST NOT tighten their polling interval in
  response to failure. Poll failure never justifies discarding stored state
  (§13.2).
- Readers SHOULD send an identifying `User-Agent`, and the reference client
  derives its user agent from its `generator` string.

## 13. Reader conformance — the import side

A conforming reader at L1 follows the ground rules in §13.1; a reader that
maintains subscriptions additionally follows §§13.2–13.7.

### 13.1 Ground rules

1. MUST treat item documents as ground truth and the feed as a lossy signal.
2. MUST roll up by `blyg:id`: highest `version` wins; ties are broken by
   `updated`. Timestamps are self-asserted by origins; ordering across
   origins is the reader's own policy (§13.7).
3. MUST treat a withdrawal endcap as roll-up-to-null (§13.4). A later version
   under the same id is the item returning.
4. MUST ignore unknown kinds, unknown JSON members, unknown `blyg:*` XML
   elements, and reserved constructs, without rejecting the containing
   document.
5. MUST NOT reject an item over its `author` contents, and MUST NOT treat
   equal `author` values from different origins as the same entity (§5.5).
6. SHOULD backfill from `items/index.json` when the feed window has been
   missed; a reader offline for any duration recovers losslessly.
7. MUST scope everything it learns to the origin: ids, authors, and trust do
   not transfer across origins. A reference's `origin` (§5.9) is the scope
   of the id it carries.
8. MUST NOT gate any behaviour on `generator` or `level` (§3.2).

### 13.2 The reconciliation model

**The archive index is the reconciliation surface; the feed is a cheap
trigger.** `items/index.json` is complete by construction (§6.2), so diffing
it against local state is total reconciliation — the feed's only jobs are
cheap change detection and low-latency pickup. This one commitment dissolves
most failure modes structurally:

- **Feed-window gaps are not an error path.** Any suspected gap — the
  previously newest-seen entry no longer in the window, a long outage, a
  first subscribe — falls back to an index diff, which recovers everything
  regardless of how much window was missed. Readers SHOULD also reconcile
  against the index periodically regardless of suspicion (it is one file).
- **Clock skew is irrelevant to correctness.** Rollup is driven by version
  numbers, never timestamps. Remote timestamps are display material.
- **Malformed input degrades; it never corrupts.** An unparseable feed skips
  the trigger and goes straight to an index diff. An unparseable *entry* is
  skipped individually — the containing feed is not rejected (the §13.1
  ignore ethos, applied to syntax). Poll failures of any kind MUST NOT alter
  stored item state.
- The feed never mutates state directly: an interesting entry — including a
  withdrawal entry — triggers an item-document fetch, and **only the fetched
  document advances state**.
- **A republish that changed no words is maintenance** (revision of
  2026-10-17, decision #77). A fetched document whose `content_hash` equals
  the one the reader holds for the version before it — a snapshot refresh, a
  re-bake, a metadata-only republish — carries no new writing. Readers MAY
  queue such versions at low priority and SHOULD NOT resurface them as new
  (the reference client's *ignyr* queue); the version advances state as any
  version does. Nothing on the wire marks it, by design — the counter stays
  bare (§5.2) — because the hash already says it.
- **A version that barely changed is maintenance too** (revision of
  2026-10-19, decision #83). The reader holds the previous version's
  `content_md` at reconciliation, before it overwrites it, so it can measure
  the edit. A version whose text differs from its predecessor by less than a
  **reader-local** threshold MAY be treated under the clause above — queued
  low, not resurfaced as new, state advanced as for any version. The
  threshold is never on the wire and never advertised, so that no author can
  write to it; the author's own lever is to hold a small edit for the next
  publish worth an event (draft saves are invisible, §5.2). Keep it small:
  one word can negate a sentence, which is also why nothing is ever omitted,
  only queued.

A 404 on `items/index.json` from an otherwise-live blyg is a nonconforming
publisher: readers SHOULD fall back to feed-window-only operation and surface
the subscription as lossy.

### 13.3 The watermark, history rewrites, and stealth edits

The highest version ever observed per imported item is a monotonic
**watermark**, and it never silently regresses:

- A fetched document whose `version` is **lower** than the watermark is a
  protocol violation by the origin (§5.2: versions increment by exactly 1 per
  publish event). The reader MUST NOT silently adopt it, SHOULD surface the
  discrepancy, and MAY offer a **user-confirmed** reset to origin state.
  Without this rule, a compromised or rolled-back origin memory-holes its own
  edit history invisibly; with it, history rewriting is at least *loud*.
- A fetched document with the **same** version as local state but a different
  `content_hash` over different content is a **stealth edit** — an edit
  without the version bump the protocol requires. Content ground truth wins:
  the reader SHOULD adopt the fetched content, but SHOULD record and surface
  the discrepancy. The watermark is unchanged.
- Readers SHOULD verify `content_hash` against `content_md` on import. A
  mismatch is a discrepancy signal, and the content is adopted anyway: the
  hash is the origin's own claim about its own bytes — a defect report, not a
  security boundary, at L1.

### 13.4 Withdrawal and retention

On a withdrawal endcap, a conforming reader rolls the item up to null: it
MUST stop presenting the withdrawn content as live and SHOULD delete its
stored copy — with one principled exception. **Retention follows the origin's
own serving surface**: content corresponding to a version the origin has
**pinned** (a fetchable `items/{id}/v{n}.json`) MAY be retained and continue
to be displayed, with attribution linking the pin — the origin itself still
serves those exact bytes forever (§8 rule 1), so local retention never exceeds the
origin's own promise. Everything unpinned rolls to null.

A reader that wants a durable citation of someone else's content has exactly
one instrument: the origin's pin. Local hoarding past withdrawal is
nonconforming; asking the origin's author to pin is the protocol's answer.
A pin-retained snapshot remains a valid transclusion source (§10.2); an
unretained withdrawn item is not.

**The watermark survives withdrawal** (decision #76, conformance finding
F5). The endcap is itself a version, the highest, and a reader keeps it to
show the item withdrawn; deleting the stored copy never deletes the version
number. A document that arrives with a version at or below the endcap's is a
replay under §13.3, not the item returning under §13.1 rule 3.

### 13.5 Curation display and re-emission

A client that both subscribes and publishes MUST keep the two planes
separate:

- **Imported items are never re-emitted.** They MUST NOT appear in the
  publisher's `feed.xml`, `items/index.json`, or as `items/{id}.json`
  documents, in any form — re-emission would collide with `blyg:id` rollup
  and break the single-publisher invariant (§5.5). Speech about someone
  else's content costs editorial work: write an item. (Transcluding it into
  a thread *is* that editorial work, and the result is the publisher's own
  item with provenance — §10.)
- A client MAY **display** imported content publicly as curation — a shown
  list, with source attribution and links to the origin — without any
  protocol surface beyond the `hoppers` list (§6.1) and a hopper feed
  (§13.5a): no other manifest vocabulary, no events on the publisher's
  feed, no new item documents. Publicity is a property of the displayed
  *list*, never of an imported item. Displayed copies follow §13.4's retention rule when their
  source is withdrawn. Verified inbound mentions (§15.5) are displayed, if
  at all, under exactly this rule.
- **This is also the aggregator pattern.** A site that wants to present a
  group of blygs in one place is a reader with a public face: it displays
  curated imported content under this rule, publishes a blogroll of the
  members (§11) so any blyg-aware reader can subscribe to all of them in one
  import, and MAY serve a plain RSS digest *outside* the blyg surface —
  excerpts and links to origin permalinks, no `blyg:` namespace — for legacy
  readers that want one feed. It never re-emits, and it never stubs on the
  members' behalf (§10.6).

### 13.5a Hopper feeds (new in 0.4)

A public hopper's list MAY also be served as an RSS 2.0 feed, so other
readers can subscribe to the list rather than to the whole blyg. A hopper
feed is a curation display in feed form, not speech: every rule of §13.5
holds, and it is never the publisher's `feed.xml`.

Publishers:

1. MUST serve a hopper feed only for a public hopper, and MUST name it in
   the manifest's `hoppers` entry for that hopper (§6.1). A hopper taken
   private leaves the list, and its feed SHOULD answer 404 or 410.
2. MUST NOT use the `blyg:` namespace anywhere in a hopper feed: no
   `<blyg:manifest>` on the channel and no `blyg:id` or `blyg:version` on
   any entry, the publisher's own items included. A hopper feed carrying
   `blyg:` elements would be a second blyg feed for the origin, and
   readers would collide on `blyg:id` rollup (§13.5). The publisher's own
   items already reach blyg-aware readers through `feed.xml`.
3. MUST carry **every current member**: the feed is the list, not a window.
   An item leaving the hopper, or rolled to null under §13.4, leaves the
   feed at the next regeneration.
4. Each entry is one membership:
   - `<guid isPermaLink="false">` stable for the life of the membership,
     derived from the hopper and the member's `origin` and `id`;
   - `<link>`: the member's `page` when held; else its item document at its
     origin (`{origin}items/{id}.json` through its `item` template, §6.1),
     never a constructed permalink (§15.2, decision #85); for an L0-wrapped
     member, the entry's own URL;
   - `<source url="…">`, the member origin's feed and its title (RSS 2.0
     §`source`), for every member not the publisher's own;
   - `<author>` or `dc:creator` from the member's `author` (§5.5) when it
     has one;
   - `<description>`: an **excerpt** with a link to the origin, never the
     full held snapshot. A note the curator wrote for the membership MAY
     lead it;
   - `<pubDate>`: when the item joined the hopper, not when it was
     published. Entries are ordered newest-joined first.

Readers that subscribe to a hopper feed (§12.1 step 7):

5. import its entries as L0 wrapper rows (§13.6): summaries and links,
   never a transclusion source, synthetic ids scoped to the hopper
   subscription, never attributed to the hopper's origin as their author;
6. MUST drop an entry that no longer appears in the feed, as rule 3 makes
   absence meaningful. This is where a hopper subscription differs from a
   plain L0 feed, whose entries scroll out of a window and are retained;
7. MAY follow an entry's `<link>` through §12 to reach the member's origin
   and item. That is a separate act with its own subscription identity, and
   the hopper subscription confers none.

### 13.6 L0 grandfathering — the legacy RSS wrapper

A plain-RSS subscription (resolution step 6) imports each entry as a
**summary item + link**, best-effort by design:

- The local id is synthetic — derived deterministically from the entry's GUID
  (or link, absent a GUID) — and origin-scoped like everything else. Synthetic
  ids are never valid blyg ids and MUST NOT be exported or re-emitted in any
  protocol surface. An L0 row is never a transclusion source (§10.2); a
  response to an L0 entry is a `{url}` stub (§10.6).
- Content is the entry's title linking to the entry URL, plus its sanitized
  summary/description, truncated to the fragment ethos. Clients SHOULD mark
  L0 items visibly as wrapped legacy content.
- RSS has no versions: the same GUID reappearing with changed content is
  treated as an edit (a local version bump). There is no withdrawal concept
  and no archive index: entries scrolling out of the window are simply
  retained. The wrapper degrades gracefully because it promises nothing the
  underlying feed cannot deliver.

### 13.7 Ordering across origins

Ordering the merged reading surface is the reader's own policy, never the
protocol's — remote timestamps are self-asserted (§5.2) and comparable only
advisorily. Readers SHOULD ensure a skewed or future-dated origin cannot
permanently dominate the display order. (The reference client sorts by
`min(claimed updated, first observed locally)`: an item sorts no newer than
when the reader actually saw it.)

**Items published together MAY be shown together** (revision of 2026-10-17,
decision #78). One authoring act can produce many items — a thread and the
fragments it quotes, minted in one publish; a document chopped into
fragments — and a reader that shows each as a separate arrival buries a
week of other origins under one act. Nothing on the wire marks the burst,
by design (§5.2: the counter stays bare, and §13.2's same-hash rule shows
the pattern: the signal is derived, never declared). What a reader can see
is enough: items from one origin whose `created` times fall within one
publish, and, when a thread created with them names them in its
`transclusions[]`, the thread that is their whole. A reader MAY present
such a burst as one publication — the thread as its entry, its fragments
beneath it or deferred to the low-priority queue of §13.2 — and MUST still
import every item (§13.1), since folding is display, never omission.

## 14. Security and privacy considerations

- **Withdrawal is cooperation, not erasure.** The protocol makes the honest
  promise only: the origin stops serving content, conforming readers drop it
  (pinned-backed retention excepted, §13.4), pinned versions survive by
  design, baked snapshots in other people's threads survive by design
  (§10.4), and nothing forces non-conforming copies to do anything.
  A pin is irrevocable, and anything published can be quoted into a
  thread whose snapshot its publisher cannot recall; both are worth
  knowing before the act, not after.
- **Timestamps are self-asserted.** Nothing prevents an origin from
  backdating. Ordering across origins is each reader's own
  observation-time policy, which §13.7 says SHOULD keep a skewed origin
  from dominating.
- **`author` is an unverified assertion** (§5.5). Displaying it is displaying
  the origin's claim. Impersonation resistance across origins is out of scope
  by design; within an origin, accountability is the origin's.
- **Generation provenance is an unverified assertion** (§5.7). `generated`
  discloses what the origin says was machine-produced; nothing verifies it,
  and its absence proves nothing. The protocol's stance is symmetric honesty:
  it neither verifies the claim nor pretends undisclosed generation is
  detectable. A remote generation source (§5.7 rule 9) is the same kind of
  assertion, and a notifying one: a `source` mention says that a model at
  the sender's origin drew on the target's words, and the target can check
  only what every relation lets it check — that the sender's document
  really names it (§15.4).
- **A baked snapshot is the quoter's assertion about the quoted.** A thread's
  `content_html` carries another origin's words, wrapped and attributed by
  data attributes that the quoting publisher wrote. The reference names a
  version, so while the source lives, anyone can check the quote against
  `{origin}items/{id}.json` or a pinned file; once the source is gone, the
  quote is the quoter's word. This is the same standing as every other
  self-asserted claim above, and readers SHOULD present remote quotes as
  *the publisher's snapshot of* the source, not as the source.
- **HTML safety:** `content_html` is publisher-supplied — and since 0.3 it
  may contain, nested, HTML that some *other* publisher supplied and this
  one baked. The reference implementation renders markdown with raw HTML escaped
  and sanitizes imported HTML before baking it, but readers MUST sanitize or
  sandbox fetched `content_html` before rendering it in their own UI, as with
  any syndicated HTML, and MUST NOT assume a nested snapshot was sanitized by
  anyone. Store verbatim, sanitize at render — the stored ground truth is
  preserved; the presentation is defended.
- **Resolution fetches attacker-suppliable URLs.** A subscribe-by-URL surface
  makes requests wherever it is pointed. Server-side readers SHOULD apply
  standard fetch hygiene: bounded redirects (§12.2), response size and time
  limits, and refusal to fetch private-network addresses where the deployment
  could be used to probe them.
- **A Webmention endpoint is a fetch-on-demand surface** (§15). Anyone can
  make it fetch any URL by naming that URL as a source. The verification
  bounds in §15.4 — fetch count, redirect count, time, and body size — are
  MUSTs for this reason, the rate limit in §15.3 is what keeps the queue
  finite, and the private-network refusal above applies with more force
  here than anywhere else, because this is the one surface a stranger can
  drive without subscribing to anything.
- **Structural verification is what keeps mentions honest.** A mention is
  believed only when the source *document*, fetched from the origin it
  claims, names the target in a machine-readable reference. A page that
  merely links to the target proves nothing and is held apart (§15.6). This
  is the trackback-era hole, closed: the cost of a false mention is
  publishing a real blyg document that really references the target, in
  public, under the sender's own origin.
- **History rewriting is loud, not prevented.** The watermark rule (§13.3)
  cannot stop an origin from rewriting its past; it guarantees conforming
  readers notice and require a human decision to accept it.
- **A blogroll reveals reading choices.** It is therefore curated and opt-in
  by design (§11), with no completeness claim — absence of an entry carries
  no information, by construction.
- **Displaying inbound mentions reveals who responded to you.** It is
  therefore per-item curation (§15.5), never automatic.
- **Media immutability** (§5.4) is a promise by the publisher, not a
  verifiable property at L1; `content_hash` covers markdown only.
- **The write side is out of scope, and so is its security.** How an
  authoring tool authenticates to a studio, what it may do there, and how
  that access is revoked are the studio's concern (§16.6). The protocol's
  security surface is the public one described in this document, and it is
  read-only except for §15.

## 15. Webmention — response notification with structural verification

*(New in 0.3. OPTIONAL at every level.)* The blogroll (§11) is the static
half of discovery: who a publisher chose to show they read. Webmention is
the dynamic half: how an origin learns that it has been quoted, stubbed,
forked, or drawn on by a generator, from a publisher it does not subscribe
to. It is the protocol's
**first and only dynamic surface**, and it is optional precisely so that
the static file contract (§4) survives intact — a static-only blyg does
nothing here and stays fully conformant (§15.7).

The mechanism is the W3C's, reused without invention: a `POST` of
`source=…&target=…`. What this protocol adds is **structural verification**
— a receiver believes a mention only when the source's *item document*,
fetched from the origin it claims, names the target with a reference (§5.9).

### 15.1 Advertising an endpoint

- A publisher that receives mentions carries `"webmention"` in its manifest
  (§6.1): a URL, origin-relative allowed, resolved against the manifest URL.
  Present only when mentions are accepted; a static export omits the key.
- Permalink pages and the feed page SHOULD carry
  `<link rel="webmention" href="…">` and SHOULD announce the endpoint in an
  HTTP `Link` header, per W3C discovery, so that non-blyg senders find it.
- The reference endpoint is `{origin}webmention` — *inside* the origin
  surface, because it is a protocol surface, unlike a studio or its API,
  which are host-rooted client internals and never protocol.

### 15.2 Sending

A publisher SHOULD send a mention for each **remote reference** in a newly
published version: every blyg-target `stub_of` whose origin is not its own
(§10.6), every `transclusions[]` entry carrying an `origin` (§10.3), a
`forked_from` naming another origin (§5.6), every `generated[].sources[]`
entry carrying an `origin` (§5.7; new in 0.4), and every `links[]` entry
carrying an `origin` (§10.3a; revision of 2026-10-19, decision #79). A `{url}` stub SHOULD send an
ordinary Webmention to that URL. Same-origin references never generate
mentions. A version that both quotes and draws on one target MAY send a
single mention for it; the receiver determines the relation (§15.4 step 4).

- **source** = the referencing item's absolute page (`origin` + `page`,
  §5.8).
- **target** = for a blyg reference, the target's absolute page (`origin` +
  the target's `page`) when the sender holds it; otherwise the target's
  **item document**, expanded from the target origin's `item` template or
  the default `items/{id}.json` (§6.1) — an address every publisher serves
  (§4), which the receiver resolves to the item under §15.3 step 1
  (revision of 2026-10-20, decision #85, on
  [blygger-spec#17](https://github.com/blygger/blygger-spec/issues/17)). A
  sender MUST NOT construct a target from the reference permalink
  convention (`f/{id}/`, `t/{id}/`): §4 calls those paths presentation, a
  receiver that does not serve them refuses the guess correctly, and a blyg
  with no HTML pages at all (§5.8) has no page to guess — its item document
  is its only mentionable address. The sender already holds the target's
  manifest, because endpoint discovery below reads it first. Until this
  revision the text said "else the reference convention"; a sender built on
  that reading lands only on receivers that happen to serve the convention
  under the guessed kind. For a `{url}` stub, the target is that URL.
- **Endpoint discovery**, in order: the target origin's manifest
  `webmention` key (one conditional GET of `blyg.json`, which a subscriber
  already holds); otherwise W3C discovery on the target URL — a `Link`
  header with `rel="webmention"`, then the first `<link>` or `<a>` with
  `rel="webmention"` in the HTML, resolved against the target, `HEAD` first
  and `GET` if no header; otherwise **no endpoint**, recorded and not
  retried (a static blyg is conformant and simply unreachable this way).
- **Retry.** A network failure or 5xx is retried with backoff — RECOMMENDED
  15 minutes, 1 hour, 4 hours, 12 hours, 24 hours — then abandoned. 4xx is
  terminal, except 429, which retries. Any 2xx is sent.
- **Republish re-sends** only for references that are new or whose target
  version changed; unchanged references are not re-sent. (A sender that
  re-sends everything on every republish is conformant but noisy; the
  reference client records the target version per outbound reference for
  this purpose.)
- **A pin MAY re-send** the pinned version's remote mentions (decision
  #73), so that a quoted origin can learn its words were frozen; the
  receiver re-verifies as for any re-send and MAY record, from the changelog
  of the document it fetched, that the source version is pinned. Nothing
  requires either side to do this.
- **Withdrawal re-sends once** for a withdrawn stub, so the receiver finds a
  document that no longer verifies and marks the mention gone (§15.4) — the
  W3C-blessed way to say "deleted".
- Delivery is **fire-and-forget from the author's point of view**: publish
  MUST NOT block on it, and outbound status is information, never a publish
  outcome. A sender that cannot reach a target has still published.

### 15.3 Receiving

The endpoint contract is the W3C's: `POST`, body
`application/x-www-form-urlencoded`, `source` and `target`.

1. **Syntactic checks → 400.** Both MUST be absolute `http(s)` URLs; `source`
   MUST differ from `target`; `target` MUST resolve, by the receiver's own
   published data, to one of this blyg's items (revision of 2026-10-20,
   decision #84, on [blygger-spec#17](https://github.com/blygger/blygger-spec/issues/17)):
   an address the receiver itself serves for that item — its `page` (§5.8),
   its item document (the receiver's own `item` template or the default
   `items/{id}.json`, §6.1), or a pinned version's document or page (§8; the
   `pin` template or the default). **Location is not the test.** An absolute
   `page` or a relocated surface puts an item's addresses outside the base
   URL, and they are no less this blyg's; a URL under the base URL that
   names nothing published is a bad claim. The test is membership because
   the receiver is the one party that knows its own items — the mirror of
   step 2 in §15.4, where a stranger's document is known only by where it
   was served. Two blygs on one host stay apart by the same test: a target
   is one blyg's item or it is not. Until this revision the text said the
   target must lie within the base URL, a reading under which a templated
   blyg rejected every target it itself names; a receiver whose surface is
   never relocated and that accepts only addresses under its mount is
   conformant by accident, not by rule. An unknown item is 400, not 404:
   the endpoint exists, the claim is bad. A withdrawn target is accepted
   (people may respond to a withdrawal).
2. **Rate limit → 429.** RECOMMENDED: more than 60 mentions from one source
   host in an hour. Cheap — but not, on its own, enough to bound the queue:
   a sender that controls a wildcard DNS zone has unlimited hosts, and every
   accepted claim costs the receiver up to two fetches at URLs the sender
   chose (§15.4). Receivers SHOULD therefore also cap by a coarser grouping
   of the source (the reference client groups by registrable domain, at a
   looser limit than the per-host one, because the grouping is a heuristic
   that can over-collect) and cap total accepted claims per hour regardless
   of source. A claim refused by any cap is 429 and is never queued. The
   numbers are the receiver's; the shape — per source, per source group,
   global — is the recommendation.
3. **Accept → 202**, record the `(source, target)` pair as pending, and
   verify asynchronously. W3C permits synchronous 200 or 201; 202 is the
   honest answer since verification fetches the network. A re-sent pair
   re-verifies rather than creating a duplicate.

### 15.4 Structural verification

Verification is bounded — RECOMMENDED: at most 2 fetches, or 3 when the
source origin's manifest must be read (step 2), at most 3 redirects, 5
seconds per fetch, 1 MB per body — and these bounds are the receiver's
protection, not a nicety (§14).

1. `GET source`. If the response is JSON with a `blyg` key, it is the item
   document. If it is HTML, find `<link rel="alternate"
   type="application/json">` (§5.8) and fetch that; it MUST be a blyg item
   document. Anything else → **failed**.
2. **The item document's final URL MUST be exactly `{origin}items/{id}.json`
   for the document's own `origin` and `id`** (revision of 2026-10-06,
   decision #61; scheme and host compared case-insensitively, default port
   dropped, trailing slash of `origin` normalized). This is §12.2's identity
   rule applied inbound — the identity origin is the full base URL, path
   included (§4, §12.2), never merely its host — and it is what stops a
   mirror or an impostor from speaking in a real blyg's name. Two
   consequences are the point: a document served under one path-mounted
   blyg cannot verify in the name of another on the same host (two blygs on
   one host is an ordinary deployment, §13.5), and a **pinned version file
   never verifies a mention** — its URL is not the live document's, so a
   stub whose pin still carries `stub_of` stops verifying the moment its
   live document is an endcap (§9, §10.6 rule 4), with no extra fetch. A
   legitimate sender is unaffected: its source is the page (§15.2), whose
   alternate link names the live document (§5.8). Until this revision the
   rule here compared scheme, host and port only; a receiver built on that
   reading has a hole to close. **Under surface templates** (new in 0.4;
   promoted from the 0.3 text's §16.6e, decision #61): a source origin's
   `item` template (§6.1) may place its documents away from the default
   path. A receiver checks the final URL against the default first; when it
   differs, the receiver fetches the asserted origin's own manifest at
   `{origin}blyg.json` — one more fetch, within the bound raised to 3 —
   expands its `item` template with the document's `id`, and accepts an
   exact match. It fails the claim when the manifest is missing or the URL
   matches neither the default nor the template. Publishers who want their
   mentions verifiable by 0.3 receivers keep item documents at the default
   path.
3. A document with `"kind": "withdrawn"` → **gone**.
4. **Relation**, in order: `stub_of` naming `{ origin: this blyg, id: target }`
   → `stub`; else a `transclusions[]` entry with `origin` = this blyg and
   `id` = target → `transclusion`; else `forked_from` naming a **pinned**
   version of the target → `fork`; else a `generated[].sources[]` entry
   (§5.7) with `origin` = this blyg and `id` = target → `source` (new in
   0.4); else a `links[]` entry (§10.3a) with `origin` = this blyg and `id`
   = target → `link` (revision of 2026-10-19, decision #79); else **failed** — the document exists but does not reference us. "This blyg" compares the document's asserted
   origin string against the receiver's own identity origin, normalized. The
   receiver is the only party that can say whether a version is pinned, so
   the fork check consults its own pins and fails a claim naming an unpinned
   version, at no extra fetch. Every comparison here reads a reference's
   identity members only; a `cited` object (§5.9) is ignored.
5. Success → **verified**, recording the source item's `id`, `origin`,
   `version`, `kind`, the relation, the source `author` (pass-through, §5.5),
   and the source page URL. **No content is stored** — a verified mention is
   a pointer, and what it points at is fetched from its origin when
   displayed, or not at all.
6. A re-sent mention re-verifies and updates what it recorded. A mention that
   verified before and fails now becomes **gone**; the receiver SHOULD keep
   the record with that status rather than deleting it, so that a stubber
   who withdraws and later republishes is recognized rather than treated as
   new.

The relation set is exactly `stub`, `transclusion`, `fork`, `source`, `link`
— one per wire construct that names a target — and nothing else at this
version. `link` is the relation the revision of 2026-10-19 adds (decision
#79, reversing #32); a markdown link is not a relation (§10.1), and a 0.3
receiver reports `link` as **failed**, correctly for its version. `source` is the relation 0.4 adds
(promoted from the 0.3 text's §16.3): a generation source is a wire construct
that names a target and carries its words, transformed. A 0.3 receiver
reports such a mention as **failed**, which is correct for it, and a sender
SHOULD read that failure as the receiver's version, not as an error of its
own.

**Reposts** (revision of 2026-10-19, decision #80). After the relation is
found, a receiver SHOULD classify a `stub` or `transclusion` mention whose
source document carries **no words of its own** as a **repost**: strip from
its `content_md` every transclusion directive line, each attached
partial-selection blockquote (§10.1), labels and whitespace; if nothing
remains, it is a repost. The relation is unchanged — stub-ness still comes
from the marker and never from the body (§10.6 rule 2); only the mention's
class changes (§15.5). The test runs on the document the receiver already
fetched, costs no request, and is derived rather than declared, as §13.2's
maintenance rule is: no wire marker says "repost", by the rule that
significance is never declared (§5.2, decision #19). A thread of twenty
directives and no words sends twenty notices, one per target; the same
thread with a paragraph of its own sends one `stub` and nineteen
`transclusion` responses. §10.6's misuse paragraph stands unchanged: the
class exists so that a receiver can absorb content-free stubbing, not to
bless it.

### 15.5 What a verified mention is, and is not

Verified mentions are **studio signals**. They are never auto-published,
never enter the feed, the archive index, or any item document, and add no
manifest vocabulary. A publisher MAY display verified mentions of an item
publicly — a "responses" list on a permalink page — and if it does, that is
**per-item curation** under §13.5: a shown list with attribution and links
to the origin, publicity being a property of the list, never of the
mention. Nothing in this protocol lets a stubber put words on the target's
page.

**Two classes** (revision of 2026-10-19, decisions #79 and #80). A verified
mention is a **response** — relation `stub`, `transclusion`, `fork` or
`source`, from a document with words of its own — or a **notice**: relation
`link`, or a repost (§15.4). Notices are held apart: they MUST NOT appear in
a responses list, MAY be shown as "linked from" or "reposted by" with
attribution under §13.5 like any display, and SHOULD go to a low-priority
queue rather than the response signal (the reference client's *ignyr*,
§13.2). Nothing a sender writes moves a mention between the classes; the
receiver derives both. A verified mention of either class remains a studio
signal under the first paragraph of this section.

### 15.6 Plain mentions

A receiver MAY accept mentions whose source is not a blyg item document,
verified the W3C way (the source page contains the target URL), and if it
does MUST hold them **apart** from structurally verified mentions as a lower
class — never in the same signal, never displayed as a response — because
link verification is exactly the check that trackback spam defeated. The
reference client does not accept them.

### 15.7 Withdrawal and static deployments

A withdrawn stub re-sends its mention once (§15.2); the receiver finds a
withdrawn document and marks the mention gone. A withdrawn *target* keeps
accepting mentions — its document is 200 forever — and its studio shows them
under the withdrawn item. Nothing cascades: a stub of a withdrawn item is
the stubber's speech and stays published.

A static-only deployment does **nothing**: it advertises no endpoint,
receives nothing, and remains fully conformant at every level. It may still
*send* — a static export is produced by some dynamic studio, which can send
at export time — but is not REQUIRED to.

## 16. Ruled, deferred, and reserved constructs (non-normative)

This section records what has been decided but not yet built (and so is
not yet normative text — the project's rule is that testing precedes
prose), what has been explicitly deferred to a later version, and what is
reserved. Implementations should leave room accordingly. Decision records
are in `blygger-spec`'s `CLAUDE.md` and `docs/v0.4-plan.md`. A subsection
that has since been promoted into the normative text keeps its number here
as a pointer, so that citations of it made before the promotion still
resolve.

### 16.1 The human half of a citation — `cited` (promoted to §5.9, 2026-09-28)

Ruled 2026-09-28, emitted by blygger-studio 0.6.0 the same day on all three
reference kinds, exercised across both live nodes (a remote transclusion
carrying `cited` was imported byte-for-byte by the other node; a cross-origin
stub's mention verified on the bare reference with the citation ignored), and
promoted into §5.9 in the first published revision. The normative text is
there; this number is kept only so that earlier citations of §16.1 resolve.

### 16.1a `cited` on a plain-web stub (promoted to §10.6, 2026-10-06)

Ruled 2026-10-03 (decision #55, on
[blygger-spec#7](https://github.com/blygger/blygger-spec/issues/7)). The
reference client has emitted a hostname-only `cited` on `{url}` stubs since
0.4 and a full one since 0.18.0, which freezes the subscription's name as
`source` and the entry's title as `excerpt` at creation. A protocol-institute
`{url}` stub carrying it was imported onto venkateshrao with `stub_of`
byte-identical, and it was promoted into §10.6 in the seventh revision. The
normative text is there; this number is kept so that earlier citations
resolve.

### 16.2 Plain internal links — `[[id]]` (promoted to §10.1, 2026-09-28)

Ruled 2026-09-28, rendered by blygger-studio 0.6.0 the same day, exercised
across both live nodes (an inline link survived import into the other node's
reading view intact, with no import error and no mention sent), and promoted
into §10.1 in the first published revision, which replaced the sentence
declaring `[[id]]` undefined. The normative text is there. **Silence reversed
in the fourth revision** (2026-10-19, decision #79): links are disclosed in
`links[]` (§10.3a) and notify as notices; the markdown link is the silent form.

### 16.3 Remote generation sources (promoted to §5.7 and §15.4, 2026-10-17)

Ruled 2026-09-28 (decision #44) as a 0.4 construct — the one place the
project's build-then-prose rule was inverted on purpose, because the wire had
to be able to say this before any client could build it — built by
blygger-studio 0.41.0, and exercised between the two reference deployments
on 2026-10-10: a protocol-institute scope drew on venkateshrao item
`20bfv5msj0hx4p4bma6hs319vb` v1 in `4wev44fq07jfw36t67ys388t92`, the item
document carried `generated[0].sources[0]` with `origin` and `cited`, the
mention verified as `source` on the far side, and the `generated` array
survived import byte-identical. Promoted into §5.7 rules 1, 8 and 9 and
§15.4 in this document's first revision, which is what opened version 0.4
(decision #43). The normative text is there; this number is kept so that
earlier citations resolve. One build finding became practice, not rule: a
thread fed as a source is handed to the generator as its baked HTML read as
text, because its markdown holds bare directives.

### 16.4 Partial quotation (promoted to §10.1–§10.3, 2026-10-03) and titles (closed)

**Partial quotation — promoted.** Ruled 2026-09-28 as a partial *transclusion*
(decision #49), built by blygger-studio 0.8.1 the next day, exercised across
both live nodes (a PI stub quoting one paragraph of a venkateshrao thread:
`selector` and the `blyg-partial` bake on the document, the mention verified
as `stub` on the far side, the quote intact through import, a wrong quote
refused at publish), and promoted into §10.1 (grammar), §10.2 (faithfulness
and the bake) and §10.3 (`selector`) in the fifth published revision. The
normative text is there; this number is kept so that earlier citations of
§16.4 resolve. One implementation finding was left to the build and is now
the rule: the bake carries the selection's **plain text in paragraphs**, not
a carved sub-range of the source's inline HTML.

- *(Imported generated text was on this list and is resolved: §5.7 rule 7
  discloses it through the existing construct. The authoring grammar for it
  is studio-private.)*
- **Titles — closed 2026-09-28: no title field, at any version.** Items
  are titleless (§5.3) and `<title>` is derived (§7). The wish behind the
  question — a leading heading shown as the item's linked title — needs
  nothing from the wire: the RECOMMENDED derivation's excerpt half already
  begins with the heading when there is one, and how a client renders its
  own pages is presentation. §5.3's reader rule stands: readers MUST NOT
  extract a title from content, because a reader inventing structure the
  publisher did not assert is the failure that rule exists to prevent.

### 16.5 Transitive staleness (resolved 2026-09-28: there is no such thing)

§10.4 defines staleness as a direct relation. **Ruled: no transitive notion
exists, and none will be defined.** A thread A that baked B at version *n*
is stale only when B has a version above *n*. If B's own source C has moved
and B has not republished, A holds B's unchanged bytes; republishing A
re-bakes B's current version, which still contains the old C. A can do
nothing about C — only B can, and B's client sees C's staleness directly, by
§10.4. Every edge of the quotation graph is therefore owned by the publisher
who baked it, and freshness over the graph is nothing but the direct check
applied at each origin. No construct, no wire fact, nothing a client must do
beyond §5.9's comparison. A client MAY show, as presentation, that an item
it quotes has itself gone stale on something — the nested `data-blyg-*`
attributes (§10.2) plus one fetch per layer are enough — but that is a
reading aid, not staleness of the quoting document.

### 16.6 The write surface (never normative; companion note planned)

Multiple authoring tools already write into blygs, and each does so through
whatever interface its client happens to expose. **Ruled 2026-09-28: the
protocol does not, and will not, specify how a client is written to.** A
normative write API would make a static-file client with no server
non-conformant for a reason unrelated to publishing, and the write side is
exactly what invariant 1 puts out of scope. What will exist instead is a
**non-normative technical note** describing the reference client's write
surface as *a* way, in the genre of TN-1, once that surface has been built
with per-tool, scoped, revocable credentials and used by at least one
third-party tool. Tools discover a write endpoint through an HTML `rel` link
on the studio's page, never through the manifest; the manifest is wire and
stays clean.

**Clarified 2026-10-03 (decision #52), as the reference client's write
surface is being built by a contributor.** An OAuth-style authorization
flow, in which a tool sends the owner to their own studio to approve a
scoped token, is one way of *minting* the per-tool, scoped, revocable
credential this section describes — the IndieAuth shape Micropub itself
uses — and so stays within what was ruled; a paste-a-token path must exist
beside it, for tools with no browser. Nothing about authorization touches
the manifest, a `.well-known` path (host-rooted, so it would break a
path-mounted blyg, §4), or this document: discovery remains the HTML `rel`
link on the studio page, and whatever metadata it points at lives under the
mount. An MCP server over the same operations and scopes is a transport for
the client's contract, not a second contract; text an agent writes through
it is disclosed through `generated[]` like any other generated text (§5.7).

### 16.6a Client source discovery — `generator_url` (promoted to §6.1, 2026-09-28)

Ruled 2026-09-28, emitted by blygger-studio 0.6.0 the same day on both live
nodes, and promoted into §6.1 (with §3.2 extended to cover it) in the first
published revision. The normative text — SHOULD emit, MUST NOT gate, no
maintenance declaration ever — is there.

### 16.6b Identity, groups, and agents (ruled; technical notes, never protocol)

Three questions raised on 2026-09-28 were ruled to need **no construct**, and
are recorded here so that the absence is legible as a decision:

- **Identity practice.** Every live client emits `name` and `url` and nothing
  else; the field is empty and converging on a URL. A non-normative note
  will recommend: a person is a URL they control; proof is a reciprocal
  link or a signature over `content_hash` carried inside `author`; OAuth
  providers, wallets, DIDs and Fediverse actors all map onto those two
  proofs; readers show verified claims as verified and never merge
  identities across origins without one. Invariant 4 and §5.5 are untouched.
- **Groups.** "Multi-author" is either several origins under one host with a
  house blogroll, or one origin with bylines; the test is who can withdraw.
  The aggregator shape is §13.5; stub-everything is not (§10.6).
- **Agents.** The protocol is agent-agnostic at the span (§5.7), item (§5.5)
  and origin (§1) levels. Maintenance that republishes is authorship: a
  snapshot refresh is a new version with an unchanged `content_hash`, which
  is how a client can tell a re-bake from an edit without any construct. An
  agent's byline SHOULD name an operator; that convention lives in the
  identity note. A blyg is two-author only when an agent signs items.

### 16.6c Generated changelog notes (promoted to §5.2, 2026-10-06)

Ruled 2026-09-28 (decision #40), emitted by blygger-studio 0.14.0 and read back
across nodes by its 0.15.0 history view (a protocol-institute item carrying a
generated note, read on venkateshrao), and promoted into §5.2 in the seventh
revision. The reference client marks a note generated only when the author
published the drafted text unchanged; a draft the author edited goes out as
the author's. That is the client's policy, not a protocol rule. The normative
text is in §5.2; this number is kept so that earlier citations resolve.

*Considered and not opened (2026-09-28):* feed entries for **pinned** publish
events carrying that pinned version's content rather than the latest, which §7
forbids for all entries. It would leak nothing, since pinned content is
public. But blyg readers are unaffected either way — only the item document
advances state (§13.2) — so the sole beneficiary is a plain RSS reader that
would see a pinned version's frozen text instead of the latest, nobody has
asked for that, and the observation that raised it was a reader working as
designed. Parked on a measured need; not a 0.4 item.

### 16.6d Discovery through references (ruled; no construct; one 0.4 candidate)

Everything a reader needs to discover origins *backward* from what it holds is
already on the wire: nested transclusion layers carry their origins in the baked
attributes (§10.2), `stub_of` and `forked_from` name origins and items that any
reader may fetch (§5.9), and subscriptions may publish blogrolls (§11). A reader
MAY walk these — the chain in a snapshot, the `stub_of` chain to its root, its own
verified mentions, its subscriptions' blogrolls — and MAY order what it finds by
any local heuristic, provided nothing derived is published (the no-metrics rule).

*Forward* discovery — who has responded to an item you did not publish — is
deliberately not on the wire: verified mentions are studio signals (§15.5), and a
publisher's public responses list is presentation that readers MUST NOT parse as
protocol. **Considered for 0.4 and kept closed (2026-09-28):** an OPTIONAL
per-item curated responses surface in the blogroll's shape — opt-in per item,
structurally verified sources only, no completeness claim, never re-emitting
content. A machine-readable list of who responded is a follower list by another
name and the first surface a count could attach to; the four reader-side
surfaces above are unbuilt, and this reopens only if they are built and found
insufficient.

### 16.6e The manifest locates the surface (promoted to §4, §5.8, §6.1, §12 and §15, 2026-10-17)

Ruled 2026-09-28 (decision #51) on a public proposal
([blygger-spec#2](https://github.com/blygger/blygger-spec/issues/2)),
amended 2026-10-06 (decision #61, verification under templates; decision
#64, a manifest's address is a path), published through templates by
Soapbox — a WordPress plugin not written by this project — and exercised by
the reference client: `blyg.blygger.org` subscribed to
`https://www.robertpeake.com/blyg/`, quoted item `5c9baa9948s3esskfhta9a7v5g`
in thread `2g4hqmpjd0nbpcezefaf3f7znt`, and the mention verified through the
templated `item` branch on 2026-10-07. Promoted into §4, §5.8, §6.1, §12.1
steps 1 and 4, §12.2, §15.3 step 1 and §15.4 step 2 in this document's first
revision. The normative text is there; this number is kept so that earlier
citations resolve. Not adopted, for the record: a
`rel="alternate" type="application/blyg+json"` link — a second discovery
vocabulary for a job the existing `rel="blyg"` link does — and a
query-string manifest, out of scope by #64.

### 16.6f A fork of a thread descends from the pinned document (promoted to §5.6 rule 6, 2026-10-06)

Ruled 2026-10-03 (decision #57), amended 2026-10-06 (#62, #63), built by
blygger-studio 0.20.0 (flattened quotes) and 0.32.3 (flattened `[[id]]`
links), exercised across two nodes at gate G11 (a venkateshrao fork of a
protocol-institute thread carrying three origins), and promoted into §5.6
rule 6 in the eleventh revision. The reasoning — why the alternative, that a
thread may be pinned only when everything it quotes is pinned, was rejected —
is in decision #57. The reference client's attribution line reads
`— quoted from [{host} · v{n}]({page})`, closing the blockquote; the wording
is the client's, not a rule. When the own-prose path cannot be made exact
(the directives or links do not line up with the bake), the client rebuilds
the whole fork from the pinned HTML rather than give up a disclosure. The
normative text is in §5.6; this number is kept so that earlier citations
resolve.

### 16.7 Reserved

- `![[id@vN]]` version-explicit transclusion (§10.1) — reserved, rejected at
  publish, tolerated on read.
- Plain (non-structural) mentions — MAY, held apart (§15.6).
- Encrypted/permissioned content — L3.

Ideas that are neither ruled nor scheduled — including proposals received on
the public repository — are tracked, non-normatively, in `blygger-spec`'s
`docs/backlog.md`, with what would schedule each.

### 16.8 What will never appear

Reply primitives (this is a network of soapboxes, not a conversation
medium); follower graphs or any protocol "follow" object; addressable
authors; AI constructs on the wire beyond the passive provenance of §5.7;
version-significance markup (the counter stays bare; the pin is the
significance primitive); content-addressed identity; metrics of any kind;
a mention relation for links; and a normative write API.

### 16.9 Pinned-entry members — `pinned_at` and `cid` (ruled 2026-10-17; awaiting a build)

Two OPTIONAL members on a changelog entry that carries `"pinned": true`,
ruled on the pace-layered feed (blygger-studio 0.42.0; RFC-3) and on
[blygger-spec#13](https://github.com/blygger/blygger-spec/issues/13).
Neither is normative until a client emits it and another reads it.

- **`pinned_at`** (decision #73): an ISO 8601 UTC timestamp, the moment the
  publisher made the promise — self-asserted like every timestamp here.
  Absent means the time is unknown, and a consumer that needs one falls back
  to the version's `at`, as the reference client's pace-layered order does
  today. Present only beside `"pinned": true`.
- **`cid`** (decision #74): an IPFS CID of **the pinned version document's
  exact bytes as served** at `{origin}items/{id}/v{n}.json` — one file, not
  a bundle. A publisher that emits it promises those bytes, `author`
  included: a stronger promise than §8 rule 6, and opt-in. A reader MAY
  fetch the pinned document from IPFS when the origin does not serve it, and
  treats what it fetches as the origin's own pinned file. A third party that
  mirrors pinned bytes is within §13.4 — the origin serves them forever, so
  the mirror never exceeds the origin's promise — and MUST NOT mirror
  unpinned versions. The CID profile (version, codec, chunking) and the
  pin-log contract the proposal sketched belong in a technical note; media
  addressing is not covered (§5.4's immutability lets a mirror fetch media
  by URL).

```json
{ "version": 2, "at": "2026-07-17T21:12:00Z", "note": "typo",
  "pinned": true, "pinned_at": "2026-07-19T08:00:00Z", "cid": "bafy…" }
```

Both are revisions by #43: a reader that ignores them is unaffected.

### 16.10 Author-sized images (ruled 2026-10-17; awaiting a build)

Ruled on [studio#37](https://github.com/blygger/blygger-studio/issues/37)
under decision #75. If an image's size is written in `content_md`, it is
written in the form markdown processors already share — Pandoc's link
attributes, as markdown-it-attrs also reads them — restricted to `width`
and `height`, each a bare integer (pixels) or a percentage:
`![a diagram](https://example.com/blyg/media/x7f2.png){width=33%}`. The
publisher bakes `width` and `height` attributes onto the `<img>` in
`content_html`, so subscribers see the sized image; a client that does not
know the form shows the attribute as literal text, exactly as it would an
unknown label (§10.1). Nothing else from the attribute syntax is adopted. A
size hint in the URL fragment was refused as an invented convention (#71),
and a maximum height in a client's stylesheet needs no ruling.

### 16.11 Responding from anywhere (ruled 2026-10-19; studio work and an RFC, no construct)

Decision #82. Nothing on the wire ties a stub, a quote or a link to a
subscription: §10.2 step 2 resolves against any snapshot the publisher holds
from the item's identity origin, however obtained, and §10.6 rule 7 says
stubs couple to no studio construct. A client MAY therefore take a URL from
anywhere — a bookmarklet, a share sheet, a browser extension — resolve it
(§12 for the origin, the page's JSON alternate for the item, §5.8), hold the
item as a one-off snapshot with no subscription, and open a stub with the
quote. The stubber then learns of no later version unless it subscribes,
which is its choice. A plain-web URL opens a `{url}` stub with `cited`
(§10.6). All of that is client behaviour. What is not the client's alone is
a **client-agnostic affordance on a blyg page** — a "stub this" that must
find a stranger's studio — because every client would have to agree on it;
that is a convention, and conventions go through an RFC on the official blyg
with a comment period before any client blesses a shape (the received
pattern is a registered `web+` protocol handler, with a Mastodon-style
remote-interaction dialog as the fallback). No wire change in either half.

## 17. Revision history (non-normative)

One line per published change to this document, newest first. Snapshots are
cut at `blygger.org/spec/0.4/{date}/` and each carries a diff link to the one
before it. Version 0.3's own history is in its document, frozen at its
eleventh revision.

- **PROPOSED, not in force — pending a Fable ruling** (Aneesh Sathe, from
  the World Machines bridge; write-up in
  `docs/proposals/hopper-feeds-proposal.md`) — **a public hopper's feed can
  be subscribed to**: the `hoppers` manifest key (§6.1, unparking Fable
  queue item 14), hopper feeds (§13.5a), a hopper subscription in
  resolution (§12.1 step 7, §12.2), the §13.5 exception, *hopper* in §2.
  Additive on the wire: readers that ignore `hoppers` resolve every hopper
  URL to the whole blyg, as today. The one reader change is step 7.

- **2026-10-20, sixth revision** (Fable 5.1, session 52, the same
  afternoon; on Robert Peake's follow-up to blygger-spec#17) — §15.2's
  **fallback target is the item document, never the permalink
  convention**: a sender that does not hold the target's `page` names
  `{origin}items/{id}.json` through the target's `item` template, an address
  every publisher serves and every receiver resolves under the fifth
  revision's §15.3; the old "else the reference convention" guessed a
  presentation path §4 already called non-normative, and a blyg with no
  pages (§5.8) has nothing to guess (decision #85). Sender-side only; no
  wire or receiver change. Not snapshotted.

- **2026-10-20, fifth revision** (Fable 5.1, session 52; on Robert Peake's
  [blygger-spec#17](https://github.com/blygger/blygger-spec/issues/17)) —
  §15.3 step 1's **target check is membership, not location**: the target
  MUST resolve, by the receiver's own published data, to one of its items —
  its `page`, its item document or a pinned version's document or page,
  wherever the manifest or an absolute `page` puts them. The previous text
  required the target to lie within the base URL, which a templated blyg's
  own targets never do; the wording had been carried over from §15.4 step
  2's source check (#61), which answers a different question and is
  unchanged (decision #84). No wire change; the one receiver change is to
  accept a pinned version's address as a target. Not snapshotted.

- **2026-10-19, fourth revision** (Fable 5.1, session 50; on Venkat's
  report of demand for simple responses, and a parallel build that wanted a
  significance token in changelog notes) — **plain internal links are
  disclosed**: a `links[]` member (§10.3a, §5 member table), a fifth mention
  relation `link` (§15.2, §15.4), and the markdown link as the one silent
  citation (§10.1); decision #79 reverses #32. **Receivers classify
  reposts** — a stub or transclusion from a document with no words of its
  own — and §15.5 splits verified mentions into **responses** and
  **notices** (#80). The directive **label is baked** as `data-blyg-label`
  for attribution lines (§10.1, §10.2; #81). §10.2 step 2 no longer says
  *subscribed*: any held snapshot from the identity origin resolves, and
  §16.11 records how a client may respond from anywhere (#82). §5.2 says no
  word in a note has wire meaning and §13.2 adds the reader-local
  near-sameness rule beside the same-hash rule (#83). §2 gains *notice* and
  *repost*. **One wire change**, additive: the `links[]` member and the
  `data-blyg-label` attribute; readers that ignore both stay conformant. Not
  snapshotted.

- **2026-10-17, third revision** (Fable 5.1, session 49, the same evening;
  on the session-29 exploration *inline fragment authoring*, `plans/`, and
  a live client that chops documents into fragments at authoring time) —
  §7 says a multi-item authoring act publishes one event per item, with no
  quiet publish and the thread last; §13.7 says readers MAY fold items
  published together into one publication, the thread as its entry,
  without omitting any (decision #78). No wire change. Not snapshotted.
- **2026-10-17, second revision** (Fable 5.1, session 49, the same
  afternoon; on Aneesh Sathe's conformance findings F2, F3, F5, F14 and F17,
  blygger-spec#11, and the queued questions from sessions 34 and 46) — §5
  and §6.1 gain member tables, checked against all 22 live blygs (#76);
  §10.1 says a line ends at LF or CRLF and that a partial quote's blockquote
  has CommonMark's extent; §10.2 says a local id never falls through to an
  import, when a partial quote's re-check window closes, and that the
  closure check walks the baked versions; §10.3 one entry per directive;
  §10.6 `stub_of` never names an L0 wrapper and its `version` is monotonic;
  §13.4 the watermark survives withdrawal (all #76); §13.2 a same-hash
  republish is maintenance and readers MAY queue it low (#77, no wire
  member); §15.2 a pin MAY re-send its mentions (#73); §16.9 `pinned_at`
  and `cid` on pinned entries (#73, #74) and §16.10 author-sized images
  (#75) ruled as shapes awaiting builds; §2 gains *maintenance republish*.
  No wire change. Not snapshotted.
- **2026-10-17 (published)** — Initial draft and first published revision
  (session 49, Fable 5.1); first snapshot cut at publication, dated
  `2026-10-18` by the snapshot clock (UTC). Supersedes 0.3,
  carrying its text forward with its section numbers. Promotes **remote
  generation sources** (0.3 §16.3 → §5.7 rules 1, 8 and 9; §15.4 step 4 and
  the relation set, now `stub`, `transclusion`, `fork`, `source`; §15.2;
  §5.9; §2; decision #44, gate G8) and **the manifest-located surface** (0.3
  §16.6e → §4, §5.8, §6.1, §12.1 steps 1 and 4, §12.2, §15.3 step 1, §15.4
  step 2 and its fetch bound; decisions #51, #61, #64, gate G9). Adds the
  **label** (`[[id | text]]`, `![[id | text]]`) to §10.1 and states that any
  other bracketed text is literal and that client-private bracket forms are
  rewritten before publish (decision #70). §8.4 rule 3 says what
  `rel="canonical"` is for and that a publisher serving an item at two live
  addresses chooses (decision #69, reviewed). §1, §3, §14 and §16 updated to match; §16.3 and §16.6e kept as
  pointers. Version 0.3 is SUPERSEDED as of this publication.
