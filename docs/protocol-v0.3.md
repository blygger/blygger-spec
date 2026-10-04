# The Blygger Protocol — Version 0.3

**Status: DRAFT.** This document specifies protocol version 0.3 at conformance
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
version 0.2**: it carries the full 0.2 text forward, revised, and adds the
cross-client layer — transclusion across origins and thread nesting (§10),
stubs (§10.6), lineage (§5.6), the `page` field (§5.8), and Webmention with
structural verification (§15). Version 0.2 stops receiving revisions when this
document is published, and stays citable with its snapshots intact.

**What this document does not add, deliberately.** Every normative construct
below was built and exercised between two independent deployments before it
was written down here — including `cited` (§5.9), `[[id]]` (§10.1) and
`generator_url` (§6.1), which were ruled on 2026-09-28, built the same day,
and promoted from §16 into the normative text once both live nodes had
exercised them across origins. Constructs that have been *decided* but not
yet built are described in §16 with their ruled shapes and enter the
normative text in a later revision, once a client emits them. That
sequencing is the project's rule, not an oversight.

<!-- spec-links:begin -->
- **This version:** `https://blygger.org/spec/0.3/`
- **Supersedes:** `https://blygger.org/spec/0.2/`
- **XML namespace:** `https://blygger.org/ns/0.1`
- **Source of truth:** [`blygger/blygger-spec`](https://github.com/blygger/blygger-spec) — `docs/protocol-v0.3.md`
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

**What is not the spec:** the plan documents (`docs/v0.3-plan.md` and its
siblings) and the reference client's source. Both have carried wire shapes
before this text did — the 0.3 constructs shipped in the reference client
twelve days before this document existed — and several independent clients
were built from them in that window. That was a lag in this project's
process, not a stable arrangement. From this version on, a construct that
has been *ruled* but not yet built appears in §16 of the living document
with its exact shape and an explicit "not yet normative" label, so that the
spec is always the first place a shape is visible.

**The risk of the living text** is that it moves: pre-1.0, every version is
a draft and no wire promise is made (§3.1's version key is informative for
the same reason). **The risk of a superseded text** is only that it is
incomplete: levels are strict supersets and every 0.2 document is a valid
0.3 document, so a client built to 0.2 remains conformant and simply does
not emit or understand the 0.3 constructs. Declare what you implement in
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
  `forked_from`, and `transclusions[]`.
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
- **L0 wrapper** — reader-side grandfathering of a plain RSS feed as summary
  items (§13.6).
- **Conformance level** — L0–L3, strict supersets (§3).

## 3. Conformance levels

| Level | Meaning |
|---|---|
| **L0** | Any plain RSS feed, grandfathered via a reader-side wrapper (summary fragment + link, §13.6). No blyg constructs. |
| **L1** | The single-origin protocol, as specified at version 0.2 and carried forward here unchanged in substance. Publish side: stable ids, versioned items, canonical item files, manifest, archive index, rollup semantics, withdrawal, pins, threads and same-origin transclusion, generation provenance. Subscribe side: resolution, importer conformance, lossless recovery, the optional blogroll. |
| **L2** | **This specification.** Everything in L1 plus the cross-client constructs: transclusion across origins and thread nesting (§10), stubs (§10.6), lineage (§5.6), the `page` field (§5.8), and Webmention (§15). |
| **L3** | *(future)* Encrypted/permissioned content. |

Levels are strict supersets. A conforming reader at any level MUST ignore
constructs it does not understand rather than reject the document containing
them (this is what lets levels and versions advance without breaking anyone).

A **publisher** conforms at L1 by serving the surfaces in §4 with the
semantics in §§5–11, and at L2 by additionally following §10's cross-client
rules and §5.6, §5.8 and §10.6 for any lineage, `page`, or `stub_of` it
emits. **Every L2 construct is additive and optional to emit**: a valid 0.2
document is a valid 0.3 document unchanged, and a publisher that never
quotes another origin, never stubs, never forks, and receives no mentions is
fully conformant at L2 by doing nothing new. Webmention in particular is
optional at every level; a static-only deployment advertises no endpoint
and remains conformant (§15.7). A **reader** conforms at L1 by following the
rules in §§12–13, and at L2 by additionally honouring the cross-origin
provenance rules of §10.3.

### 3.1 The protocol version key

Manifests and item documents carry a `"blyg"` key naming the spec version
their publisher implements (a deployment serving the 0.3 surfaces emits
`"blyg": "0.3"`). The key is **informative, not a negotiation**: readers MUST
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
path. The file names *within* the surface (`blyg.json`, `feed.xml`,
`items/…`) are protocol-fixed and MUST NOT vary per deployment — a known
manifest filename at an arbitrary origin is what keeps free mounting
discoverable (a reader handed any base URL fetches `blyg.json` relative to
it). `/blyg/` is the reference client's default mount and the convention used
in examples throughout this document; it carries no protocol meaning.

Publishers MUST serve:

| Path (relative to origin) | Content | Spec |
|---|---|---|
| `blyg.json` | Manifest | §6 |
| `feed.xml` | RSS 2.0 feed | §7 |
| `items/index.json` | Archive index | §6.2 |
| `items/{id}.json` | Canonical item document | §5 |
| `items/{id}/v{n}.json` | Pinned version document (only for pinned versions) | §8 |
| `media/…` | Media objects referenced by items | §5.4 |

Publishers MAY additionally serve:

| Path (relative to origin) | Content | Spec |
|---|---|---|
| `blogroll.opml` | Curated blogroll (OPTIONAL) | §11 |
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
  so that this rule survives (§15.7).
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
(§10.6). Any item MAY carry `forked_from` (§5.6) and `generated` (§5.7).

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
  optional note, optional `"pinned": true`), never diffs or content.
  **A note describes a change; it never reproduces withheld content.** A
  note that quotes the prior version's text is a diff by another name and
  leaks exactly what withholding protects, so where the prior version is
  unpinned a note MUST NOT reproduce it. Between two pinned versions nothing
  is withheld — any reader can fetch both files — and a note may be as full
  as the author likes. Notes are the publisher's description, and like the
  feed `<title>` derived from them (§7) they may be machine-written; a
  disclosure member for that case is ruled and described in §16.6c.
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
   promise a lineage still points at (§8.1). Publishers SHOULD check this at
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
   resembles its source. For a **thread** source, what is copied is the
   pinned *document* with its baked quotes flattened, not the directives —
   ruled 2026-10-03 as §16.6f (decision #57), entering here once built.

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
  { "sources": [ { "id": "7c9wk2mhq0v3xj8tn5rzfd41bg", "version": 3 } ],
    "model": "claude-opus-5",
    "at": "2026-08-10T18:00:00Z" }
]
```

Rules:

1. `sources` names the exact published versions of **this origin's** items
   whose content was **drawn on** by the generator for that span — the same
   disclosure whether the generator was handed them by an author or
   retrieved them itself from the archive. It MAY be empty, meaning **no
   sources declared**: pure instructed generation, or generation whose
   sources the publisher cannot name. `model` and `at` are RECOMMENDED. A
   span MAY be the whole body.
   At 0.3 a source is always own-origin and carries no `origin` member;
   generation from another origin's items is not expressible on the wire at
   this version. It is ruled in full for 0.4 (§16.3): `sources[]` takes the
   reference shape of §5.9 with `origin` omitted for own-origin sources,
   exactly as `transclusions[]` does, and a remote source notifies its origin.
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

Publishers additionally disclose generated spans in the rendered HTML: the
renderer MUST wrap each generated span in `content_html` as
`<span class="blyg-tk-gen">…</span>` (inline output) or
`<div class="blyg-tk-gen">…</div>` (block output). The class name
`blyg-tk-gen` is a **permanent wire token** — it is baked into published
`content_html`, like `blyg-transclusion` (§10.2), and cannot be renamed. No
data attributes are required: span-level source mapping is deliberately not
promised (the JSON provenance is version-level and robust; span-level claims
would be brittle across the author's post-generation edits). Styling the
class is presentation, any client's free choice — the reference client
deliberately leaves it unstyled, because a visible tint would present
self-asserted provenance as a verified authorship badge, a claim the
protocol refuses to make.

### 5.8 The `page` field

*(New in 0.3.)* An item document MAY carry `"page"`: the **origin-relative
URL of the item's human-readable permalink**, resolved against the origin
(`"page": "t/7c9wk2mhq0v3xj8tn5rzfd41bg/"`).

- The field closes a gap the 0.2 text left open: it called permalink paths
  presentation, and readers that built links to remote items had to guess at
  a convention. Readers SHOULD use `page` when present, and MAY fall back to
  the reference convention (`f/{id}/` for fragments, `t/{id}/` for threads)
  when it is absent.
- The reference client always emits it. It is optional for conformance —
  a blyg with no HTML pages at all is still a blyg.
- `page` is emitted for withdrawn items too (§9): the endcap's page is 200
  forever, and a mention aimed at a withdrawn item still needs a target.
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

Three constructs in this version name a version of an item at an origin —
`forked_from` (§5.6), `stub_of` (§10.6), and `transclusions[]` (§10.3) — and
all three use one shape:

```json
{ "origin": "https://blyg.protocol-institute.org/",
  "id": "1vgtgz0gq5b2c9k7d3m8r4n6xy",
  "version": 1 }
```

- `origin` is the target's **identity origin** as §12.2 defines it — the
  post-redirect URL the target's manifest was fetched from, minus
  `blyg.json` — never the target manifest's self-asserted `site`. It is
  REQUIRED in `forked_from` and `stub_of` (a citation is absolute) and
  OPTIONAL in `transclusions[]`, where omission means own-origin, so that
  every 0.2 thread document stays valid unchanged.
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
- The same object is permitted in `forked_from`, `stub_of` and every
  `transclusions[]` entry, and pinned version files (§8) carry each
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
  "blyg": "0.3",
  "level": 2,
  "generator": "blygger-studio/0.6.0",
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
  index (§6.2) is the lossless surface.
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
  conformant but should know that it is choosing to make its items read
  differently elsewhere.
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

The pin's *promise* is the JSON file (§8.1). Additionally, a publisher **MAY**
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
   citation.
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
  (surrounding whitespace allowed) is a **transclusion directive**:
  `![[7c9wk2mhq0v3xj8tn5rzfd41bg]]`
- A transclusion directive immediately followed, with no blank line, by a
  markdown blockquote is a **partial transclusion** (revision of 2026-10-03,
  decision #49): the blockquote's text is the **selection**, and §10.2 says
  what is checked and what is baked. A blank line detaches the blockquote,
  so a whole transclusion followed by the author's own quotation stays
  writable:

  ```
  ![[7c9wk2mhq0v3xj8tn5rzfd41bg]]
  > Stigmergy is what a protocol looks like from inside, and the
  > reason it looks like nothing at all is the point.

  Commentary begins after a blank line.
  ```

- Anywhere else — inline, inside code spans and code blocks — the directive
  sequence is inert text.
- `![[id@vN]]` (explicit version) is **reserved**: 0.3 publishers MUST reject
  it at publish time; readers MUST tolerate it as an unknown construct.
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
  anchor text is presentation. It is **silent on the wire**: no
  `transclusions[]` entry (§10.3), no mention (§15), no relation (§15.4) —
  a link asserts nothing on the target's behalf, so there is nothing for the
  target to verify. An unresolvable link is a publish error, like an
  unresolvable directive. This deliberately preserves the one way to cite
  without notifying: in a medium where every other citation form notifies,
  that affordance is necessary, not accidental.

### 10.2 Publish-time resolution

Resolution happens in the studio at publish time; **readers never resolve
anything**.

**Resolution order.** Each directive MUST resolve, in this order, to:

1. a **local**, currently-published item with that id — fragment or thread;
2. otherwise an **imported** item with that id, from any subscribed origin,
   whose local state is current — or withdrawn with a pin-retained snapshot
   (§13.4 retention is exactly what makes such a snapshot still quotable) —
   and which is a blyg item, not an L0 wrapper (§13.6: an L0 row is a wrapper
   around someone's RSS summary, not their item);
3. otherwise a **publish error**. Drafts, unknown ids, withdrawn items with
   nothing retained, and L0 rows are publish errors. **More than one imported
   match is a publish error**, never a guess — the directive names an
   identity, and the publisher does not pick an origin on the author's
   behalf.

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
quote is byte-identical to its 0.2 form. The wrapper is a bare blockquote
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
by the same test while the origin serves that version, live or pinned.
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
document to verify against.

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
  whose transitive *local* transclusion closure (walked via stored
  `transclusions[]`) contains the publishing thread's own id. This is cheap
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
  subscription's identity origin (§12.2), never the source manifest's
  self-asserted `site`.
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
  no entry: only copied words are disclosed.
- A remote entry is a **remote reference** and SHOULD send a mention to its
  origin (§15.2), whose relation is `transclusion`.
- Readers at L2 MUST scope a transclusion's `id` to its `origin` when
  present, and to the document's own origin when absent, before doing
  anything with it — the same origin-scoping rule as everywhere else
  (§13.1).

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
   (§10.3); otherwise it keeps the value set when the stub was created —
   what the author saw. The two can never disagree on a published document.
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
order. Output: a blyg subscription `{ origin, manifest }`, a legacy feed
subscription `{ feed_url }` (L0), or failure with the list of URLs tried.

### 12.1 The algorithm

1. **Normalize.** Parse the URL; strip query and fragment. If the path does
   not end in `/`, append `/`. Call this the *candidate origin*. HTTPS is
   expected; readers MAY permit `http:` (local development) but SHOULD warn.
2. **Direct probe.** `GET {candidate}blyg.json`. If the body parses as a
   manifest — a JSON object with a `"blyg"` version key — the URL is
   **resolved as a blyg**. Do not trust `Content-Type` (static hosts
   misreport); parse-success is the test.
3. **Feed upgrade.** If the input URL itself returns XML that parses as RSS
   or Atom: if the channel carries `<blyg:manifest>` (§7), fetch that
   manifest → **resolved as a blyg**. Otherwise hold the feed as the **L0
   candidate** and continue — a later step may still find a manifest.
4. **rel probe.** If the input returned HTML, look for
   `<link rel="blyg" href="…">`. The `href` is the **origin base URL** — not
   the manifest file; the manifest filename is protocol-fixed, so readers
   append `blyg.json`. Resolve the href against the document URL and probe as
   in step 2. **One hop only**: a rel target's own HTML is never scanned — no
   recursive discovery, no loops. Readers MUST support the HTML `<link>`
   element here; supporting an equivalent HTTP `Link` header is OPTIONAL.
   (Publishers whose blyg mounts away from their front page SHOULD emit this
   link on pages they expect to be shared.)
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

### 12.2 Subscription identity

- **Subscription identity is the final fetch origin**: the URL the manifest
  was actually fetched from, minus `blyg.json`, after following redirects.
  The manifest's self-asserted `site` is display-advisory only. If `site`
  disagrees with the fetch origin, the reader SHOULD surface the discrepancy
  and MUST NOT adopt the asserted value as identity — otherwise a mirror
  could inherit another origin's identity, violating origin scoping (§13.1).
  This is the subscribe-side face of invariant 4: the only
  protocol-authenticated entity is the origin. **The same rule is applied
  inbound by Webmention verification** (§15.4): a document is believed to
  speak for an origin only if it was fetched from that origin.
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
serves those exact bytes forever (§8.1), so local retention never exceeds the
origin's own promise. Everything unpinned rolls to null.

A reader that wants a durable citation of someone else's content has exactly
one instrument: the origin's pin. Local hoarding past withdrawal is
nonconforming; asking the origin's author to pin is the protocol's answer.
A pin-retained snapshot remains a valid transclusion source (§10.2); an
unretained withdrawn item is not.

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
  protocol surface: no manifest vocabulary, no feed events, no new item
  documents. Publicity is a property of the displayed *list*, never of an
  imported item. Displayed copies follow §13.4's retention rule when their
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

## 14. Security and privacy considerations

- **Withdrawal is cooperation, not erasure.** The protocol makes the honest
  promise only: the origin stops serving content, conforming readers drop it
  (pinned-backed retention excepted, §13.4), pinned versions survive by
  design, baked snapshots in other people's threads survive by design
  (§10.4), and nothing forces non-conforming copies to do anything.
  Publishers should understand pins are irrevocable before pinning, and
  should understand that anything published can be quoted into a thread
  whose snapshot they cannot recall.
- **Timestamps are self-asserted.** Nothing prevents an origin from
  backdating. Readers that care about ordering across origins must apply
  their own observation-time policy (§13.7).
- **`author` is an unverified assertion** (§5.5). Displaying it is displaying
  the origin's claim. Impersonation resistance across origins is out of scope
  by design; within an origin, accountability is the origin's.
- **Generation provenance is an unverified assertion** (§5.7). `generated`
  discloses what the origin says was machine-produced; nothing verifies it,
  and its absence proves nothing. The protocol's stance is symmetric honesty:
  it neither verifies the claim nor pretends undisclosed generation is
  detectable.
- **A baked snapshot is the quoter's assertion about the quoted.** A thread's
  `content_html` carries another origin's words, wrapped and attributed by
  data attributes that the quoting publisher wrote. The reference names a
  version, so while the source lives, anyone can check the quote against
  `{origin}items/{id}.json` or a pinned file; once the source is gone, the
  quote is the quoter's word. This is the same standing as every other
  self-asserted claim above, and readers SHOULD present remote quotes as
  *the publisher's snapshot of* the source, not as the source.
- **HTML safety:** `content_html` is publisher-supplied — and at 0.3 it may
  contain, nested, HTML that some *other* publisher supplied and this one
  baked. The reference implementation renders markdown with raw HTML escaped
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
the dynamic half: how an origin learns that it has been quoted, stubbed, or
forked, from a publisher it does not subscribe to. It is the protocol's
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
(§10.6), every `transclusions[]` entry carrying an `origin` (§10.3), and a
`forked_from` naming another origin (§5.6). A `{url}` stub SHOULD send an
ordinary Webmention to that URL. Same-origin references never generate
mentions.

- **source** = the referencing item's absolute page (`origin` + `page`,
  §5.8).
- **target** = for a blyg reference, the target's absolute page (`origin` +
  the target's `page` if the sender holds it, else the reference
  convention); for a `{url}` stub, that URL.
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
   MUST differ from `target`; `target`'s origin (scheme, host, port) MUST be
   this blyg's own, and its path MUST name a published item — by `page`, or
   as `items/{id}.json`. An unknown item is 400, not 404: the endpoint
   exists, the claim is bad. A withdrawn target is accepted (people may
   respond to a withdrawal).
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

Verification is bounded — RECOMMENDED: at most 2 fetches, at most 3
redirects, 5 seconds per fetch, 1 MB per body — and these bounds are the
receiver's protection, not a nicety (§14).

1. `GET source`. If the response is JSON with a `blyg` key, it is the item
   document. If it is HTML, find `<link rel="alternate"
   type="application/json">` (§5.8) and fetch that; it MUST be a blyg item
   document. Anything else → **failed**.
2. **The document's `origin` MUST equal the final source URL's origin**
   (scheme, host, port; trailing slash normalized). A page on one host
   pointing at a document claiming another origin does not verify. This is
   §12.2's identity rule applied inbound, and it is what stops a mirror or an
   impostor from speaking in a real blyg's name.
3. A document with `"kind": "withdrawn"` → **gone**.
4. **Relation**, in order: `stub_of` naming `{ origin: this blyg, id: target }`
   → `stub`; else a `transclusions[]` entry with `origin` = this blyg and
   `id` = target → `transclusion`; else `forked_from` naming a **pinned**
   version of the target → `fork`; else **failed** — the document exists but
   does not reference us. "This blyg" compares the document's asserted
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

The relation set is exactly `stub`, `transclusion`, `fork` — one per wire
construct that names a target — and nothing else at this version. A plain
link is not a relation (§10.1). A fourth relation, `source`, is ruled for
0.4 (§16.3) because a generation source is a wire construct that names a
target; receivers at 0.3 report such a mention as **failed**, which is
correct for them.

### 15.5 What a verified mention is, and is not

Verified mentions are **studio signals**. They are never auto-published,
never enter the feed, the archive index, or any item document, and add no
manifest vocabulary. A publisher MAY display verified mentions of an item
publicly — a "responses" list on a permalink page — and if it does, that is
**per-item curation** under §13.5: a shown list with attribution and links
to the origin, publicity being a property of the list, never of the
mention. Nothing in this protocol lets a stubber put words on the target's
page.

### 15.6 Plain mentions

A receiver MAY accept mentions whose source is not a blyg item document,
verified the W3C way (the source page contains the target URL), and if it
does MUST hold them **apart** from structurally verified mentions as a lower
class — never in the same signal, never displayed as a response — because
link verification is exactly the check that trackback spam defeated. The
reference client does not accept them at 0.3.

### 15.7 Withdrawal and static deployments

A withdrawn stub re-sends its mention once (§15.2); the receiver finds a
withdrawn document and marks the mention gone. A withdrawn *target* keeps
accepting mentions — its document is 200 forever — and its studio shows them
under the withdrawn item. Nothing cascades: a stub of a withdrawn item is
the stubber's speech and stays published.

A static-only deployment does **nothing**: it advertises no endpoint,
receives nothing, and remains fully conformant at every level. It may still
*send* — a static export is produced by some dynamic studio, which can send
at export time — but is not required to.

## 16. Ruled, deferred, and reserved constructs (non-normative)

This section records what has been decided but not yet built (and so is
not yet normative text — the project's rule is that testing precedes
prose), what has been explicitly deferred to a later version, and what is
reserved. Implementations should leave room accordingly. Decision records
are in `blygger-spec`'s `CLAUDE.md` and `docs/v0.3-plan.md`. A subsection
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

### 16.1a `cited` on a plain-web stub (ruled 2026-10-03; next revision)

**Ruled: a `{url}` stub (§10.6) MAY carry the same `cited` object**, under
§5.9's rules unchanged — `retrieved` REQUIRED, self-asserted, frozen when the
stub was created, ignored by verification, never baked, ignorable by any
reader, `excerpt` a caption capped near 200 characters — entering §10.6 once
a client emits it and an import across nodes retains it (decision #55, on
[blygger-spec#7](https://github.com/blygger/blygger-spec/issues/7)).
§10.2's "plain-web targets get nothing" is about *verification*: a selector
promises a faithfulness test that cannot run against a page with no
versioned document. `cited` promises no test — §15.4 MUST ignore it and a
reader that drops it stays conformant — and §5.9's own argument is
*stronger* for a target that cannot be re-fetched at any version: the citing
publisher's frozen label is the only record of what was read. The cap stays,
because the quotation channel for the plain web is an ordinary markdown
blockquote and `cited` is a caption there too. Four reference sites instead
of three; the object is the one §5.9 describes, attached to a reference
whose identity is a `url` rather than `origin`/`id`/`version`.

### 16.2 Plain internal links — `[[id]]` (promoted to §10.1, 2026-09-28)

Ruled 2026-09-28, rendered by blygger-studio 0.6.0 the same day, exercised
across both live nodes (an inline link survived import into the other node's
reading view intact, with no import error and no mention sent), and promoted
into §10.1 in the first published revision, which replaced the sentence
declaring `[[id]]` undefined. The normative text is there.

### 16.3 Remote generation sources (ruled 2026-09-28; a 0.4 construct)

At 0.3 a `generated[].sources[]` entry is own-origin by construction (§5.7).
**Ruled 2026-09-28: a generator MAY be fed another origin's words, and that
is a *source*, not a quotation, disclosed as a reference — and it notifies.**
§5.7 rule 3's line between the two authorial acts, verbatim-and-visible
versus drawn-upon-and-woven, does not move when the words come from another
origin; a blockquote around non-verbatim prose would be false. Nor may the
draw be silent: in this protocol notification tracks whether the target's
words are carried (§10.1 keeps links silent because a link carries none),
and a generation source carries them, transformed. The ruled shape, which a
client may build against now:

- `sources[]` takes the reference shape of §5.9 — `origin` omitted for
  own-origin, present for remote — and MAY carry `cited`. Four constructs,
  one reference object.
- A source resolves at generation time by §10.2's order — local published
  item, else imported item with a current or pin-retained snapshot, else an
  error — so sources widen from own fragments to any item a directive may
  name, threads included. What is fed to the generator is the **local
  snapshot**, never a live fetch: generating follows reading, as quoting
  does.
- Disclosure is **direct only**, as §10.3 is for transclusion: a thread fed
  to a generator is disclosed as that thread; the words it had itself baked
  are inspectable through it.
- A remote source is a **remote reference** and SHOULD send a mention
  (§15.2) whose relation is **`source`** — a fourth relation, added to
  §15.4's set when this construct enters normative text. Verification reads
  the reference alone, as for the other three. An agent that draws on many
  remote items sends many mentions, and that is legitimate: each says that a
  model at this origin used those words, and the item it points at has
  content (§10.6's anti-pattern is content-free stubbing, not disclosure).
- Nothing in `content_html` marks a remote source beyond the existing
  `blyg-tk-gen` wrapper (§5.7); span-level source mapping remains
  deliberately unpromised.

This is a **0.4** construct, not a 0.3 revision: a new mention relation
changes what a receiver must do to be correct. It is also the one place the
project's build-then-prose rule is inverted on purpose — the wire had to be
able to say this before any client could build it — and it enters normative
text only after a client has built it and two nodes have exercised it.

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

### 16.6c Generated changelog notes (ruled; next revision)

**Ruled 2026-09-28: a changelog entry MAY carry `"generated": true`**, meaning the
publisher's studio wrote the note (from the local diff between versions) rather
than the author. Self-asserted and unverifiable like `generated[]` (§5.7 rule 6);
absent means only "not stated"; readers MUST NOT gate on it. It exists because a
note is prose readers read and is the source of the feed `<title>`, so a client
reconstructing an item's history from its notes should be able to tell the
author's words from a machine's summary. The depth rule of §5.2 binds generated
notes exactly as it binds authored ones. Enters §5.2 once a client emits it.

```json
{ "version": 3, "at": "2026-07-18T09:30:00Z",
  "note": "Sharpened the second paragraph's claim; no change to the examples.",
  "generated": true }
```

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

### 16.6e The manifest locates the surface (ruled 2026-09-28; a 0.4 construct)

§4 fixes every filename within the surface. That rule was written for
filesystem-shaped deployments, and it excludes a large class of publishers
for a reason unrelated to publishing: managed hosts intercept `.json` and
`.xml` paths as static files before a CMS routes them, so a WordPress site,
for one, cannot serve `items/{id}.json` without rewrite rules that shared
hosting often forbids. **Ruled 2026-09-28, adopting a public proposal
([blygger-spec#2](https://github.com/blygger/blygger-spec/issues/2)) in a
reshaped form: the manifest names where the surface lives.** The shape, for
clients that want to leave room now:

- **`feed` and `items` become authoritative.** Their values are
  origin-relative or absolute URLs, defaulting to `feed.xml` and
  `items/index.json` when absent. Readers use the manifest's value.
- **Two OPTIONAL template keys**, in [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570)
  level-1 form: `item` (variable `id`, default `items/{id}.json`) and
  `pin` (variables `id` and `n`, default `items/{id}/v{n}.json`). Readers
  MUST expand them wherever this document says `{origin}items/{id}.json`
  or `{origin}items/{id}/v{n}.json`. A blyg that omits them is unchanged.
- **Discovery.** §12.1 step 2 is unchanged: a bare origin is still probed for
  `blyg.json`, which stays the fixed filename and the first probe for origins
  with no HTML. Step 4 is extended: the reader fetches the `rel="blyg"`
  href, and if the body parses as a manifest, that *is* the manifest;
  otherwise the href is an origin base and `blyg.json` is appended as
  today. No new `rel`, no new media type. The feed's `<blyg:manifest>`
  already names the manifest by absolute URL.
- **Identity** (§12.2) becomes *the manifest's final URL minus its last path
  segment* — the existing rule stated without the filename. A publisher
  whose manifest lives at `/wp-json/blyg/v1/manifest` has the identity origin
  `/wp-json/blyg/v1/`, every reference to it names that string, and so it
  must be as stable as any origin.
- **`page` MAY be absolute** (§5.8), since a CMS permalink lives outside the
  surface's mount; media URLs already may be (§5.4).
- **Nothing else moves.** The static-file requirement stands — a template
  expands to static paths and the defaults are today's paths. Receivers
  check a mention's target against their own templates (§15.3). Mount
  independence (§4) is unchanged; this is its completion, not its
  reversal: the manifest filename is the protocol's, everything else is the
  deployer's, and the manifest says where.

This is a **0.4** construct by the version boundary rule: a reader that
ignores the template keys returns 404s on a templated blyg, so what a reader
must do changes. It enters normative text once one client not written by this
project publishes through templates and the reference client has subscribed
to it, transcluded from it and sent it a mention that verified.

### 16.6f A fork of a thread descends from the pinned document (ruled 2026-10-03; next revision)

**Ruled: when the item named by `forked_from` is a thread, "the forked
content" of §5.6 rule 6 is the pinned version's rendered document,
flattened — not its `content_md` with the directives intact** (decision
#57). Rule 6 already says a fork is a copy, not a transclusion, and the
reason a lineage may name only a pinned version is that the bytes a fork
descends from must be bytes anyone can still fetch. A thread's `content_md`
is not those bytes: its quotes are `![[id]]` directives that resolve at
publish time, in the forker's context (§10.2), to whatever snapshot the
forker holds — a later version, or nothing — so a fork that copies them
descends from a *composition* rather than from the pinned document,
inherits `transclusions[]` entries the forker never composed, and sends
quote-mentions (§15) on the forker's behalf. The pinned file already freezes
every baked quote in its `content_html`, nested quotes included; nothing
else needs to be pinned for the fork to be sourced from it, which is why
the alternative — a thread may be pinned only when everything it quotes is
pinned — was rejected: it adds nothing to the promise and imported sources
could never satisfy it.

The shape, which a client may build against now:

- The thread's own prose is copied byte-exact from the pinned `content_md`.
  Each `blyg-transclusion` element in the pinned `content_html` (§10.2)
  replaces its directive as an **ordinary markdown blockquote** of that
  element's content, recursively — nested quotes become nested blockquotes —
  followed by a visible attribution line naming the quoted item's origin and
  id and linking to its page (§5.8) where the publisher can compute it, else
  to its item document. The line's wording is the client's. A partial
  transclusion (`blyg-partial`) flattens the same way, from its baked
  paragraphs.
- The `blyg-transclusion` class MUST NOT survive into the fork: the forking
  publisher baked nothing and verified nothing. The flattened quote is in
  the plain-web register of §10.2 — a quotation with a link, editable,
  unverified — and `forked_from` is the way back to the verifiable original.
- The fork carries no `transclusions[]` entry and sends no `transclusion`
  mention for a quote it inherited (rule 6 already says so). An author who
  wants a live quote writes a directive, which resolves and notifies as any
  directive does.
- Generated spans (`blyg-tk-gen`, §5.7) in the pinned document — the
  thread's own and its quotes' — are disclosed in the fork through the
  existing construct (§5.7 rule 7: `sources` empty, `model` if known), so
  a fork cannot launder a disclosure away. The reference client's fork
  dropped `generated[]` from a forked *fragment* too; the same rule covers
  both kinds.

Forking a quoted fragment directly, naming the fragment's own pin, remains
the way to take one passage with its own lineage. This is publisher
behaviour with no wire change — a revision, not a 0.4 construct — and it
enters §5.6 once a client has built it and a fork of a thread carrying a
remote quote has crossed two nodes.

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
a fourth mention relation for links; and a normative write API.

## 17. Revision history (non-normative)

One line per published change to this document, newest first. Snapshots are
cut at `blygger.org/spec/0.3/{date}/` and each carries a diff link to the one
before it.

- **2026-10-03, sixth revision** — §16.6f: a fork of a thread descends from
  the pinned document, its baked quotes flattened into ordinary blockquotes
  with attribution, no `blyg-transclusion` class and no inherited
  `transclusions[]` (decision #57, on Venkat's report that a forked thread's
  quotes arrived as uneditable directive ids); §5.6 rule 6 points at it.
  Shape only; no normative change. Not snapshotted.
- **2026-10-03, fifth revision** — Partial transclusion promoted from §16.4
  into §10.1 (grammar), §10.2 (the faithfulness check and the `blyg-partial`
  bake: plain text in paragraphs) and §10.3 (`selector`), after
  blygger-studio 0.8.1 and a cross-node exercise — the first normative
  addition since the first published revision. Also: `content_html` MUST be
  self-contained, every URL absolute (§5.2, cross-referenced from §7;
  decision #53); `[[id]]` is inert inside code, as the directive already was
  (§10.1; #54, on blygger-spec#4); `page` SHOULD be stable for the life of
  an item (§5.8; #56, on blygger-spec#9); `cited` on a `{url}` stub ruled as
  a shape, §16.1a (#55, on blygger-spec#7); §10.2 names the republication
  veto an unpinned remote quote hands a stranger and the quote-a-pin
  mitigation (on blygger-spec#8); §16.6 clarified for an OAuth-style minting
  flow (#52). Not snapshotted.
- **2026-09-28, fourth revision** — §16.6e: the manifest locates the surface
  (authoritative `feed`/`items`, `item`/`pin` URI templates, discovery via the
  existing `rel="blyg"` link, identity as the manifest URL minus its last
  segment, absolute `page`), a 0.4 construct ruled on a public proposal
  (blygger-spec#2). §16.7 points at the project backlog. Shape only; no
  normative change. Not snapshotted.
- **2026-09-28, third revision** — §16.4: partial quotation ruled as a
  partial transclusion (directive plus attached blockquote, text-quote
  `selector` on the entry, substring-verified, `blyg-partial` class), a 0.3
  revision once built rather than a 0.4 construct. Shape only; no normative
  change. Not snapshotted.
- **2026-09-28, second revision** — §16 updated with the 0.4 rulings of the
  same afternoon: §16.3 remote generation sources ruled in full (a source,
  disclosed as a reference, a fourth mention relation `source`, a 0.4
  construct); §16.4 titles closed, partial quotation framed; §16.5
  transitive staleness resolved as nonexistent; the two parked candidates
  in §16.6c and §16.6d decided against. §5.3, §5.7 rule 1, §10.4 and §15.4
  cross-references updated. No normative change. Not snapshotted; the
  morning's snapshot stands.
- **2026-09-28 (published)** — First published revision; first snapshot cut
  the same day. Promotes `cited` (§16.1 → §5.9), `[[id]]` (§16.2 → §10.1)
  and `generator_url` (§16.6a → §6.1, with §3.2 extended) into normative
  text after blygger-studio 0.6.0 emitted them and both live nodes exercised
  them across origins; §10.1 no longer calls `[[id]]` undefined; §10.3 and
  §15.4 say links produce no provenance and no relation; §15.3's per-host
  rate limit is no longer described as sufficient on its own, after the
  reference client's hardening showed it was not; §15.4 says verification
  ignores `cited`. Version 0.2 is SUPERSEDED as of this publication.
- **2026-09-28** — Initial draft (session 27). Supersedes 0.2. Adds §3.2,
  §5.6 (lineage defined), §5.8 `page`, §5.9 the reference shape, §10
  rewritten for cross-client transclusion and nesting, §10.6 stubs, §15
  Webmention, §16 ruled/deferred/reserved constructs (`cited`, `[[id]]`,
  `generator_url`, generated changelog notes, the write surface, identity,
  groups, agents, discovery), §5.2 note-depth rule, §5.7 rule 7 on imported
  generation. Not published as a page; superseded by the revision above the
  same day.
