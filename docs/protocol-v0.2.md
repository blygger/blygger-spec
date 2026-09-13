# The Blygger Protocol — Version 0.2

**Status: DRAFT.** This document specifies protocol version 0.2 at conformance
Level 1 — the publish side **and** the subscribe side. **Every spec version
numbered below 1.0 is a working draft**: the reference-implementation
development phase is a testing phase for the protocol itself, and the spec
changes in response to what testing discovers. Version 1.0 will be the first
version its authors stand behind as stable and publish to a larger audience;
until then, users of this spec and builders of implementations should assume
**no promises** — including of the wire surface. Breaking changes are
permitted pre-1.0 but must bump the manifest version and be recorded in the
[project devlog](https://github.com/blygger/blygger-spec/blob/main/DEVLOG.md).

Each protocol version has its own standalone-complete document, and the
highest-numbered document is the living one. **This document supersedes
version 0.1**: it carries the full 0.1 text forward, revised, and adds the
subscribe side (resolution, reader conformance, the blogroll, legacy-RSS
grandfathering) and generation provenance. Version 0.1 stops receiving
revisions when this document is published, and stays citable with its
snapshots intact.

<!-- spec-links:begin -->
- **This version:** `https://blygger.org/spec/0.2/`
- **Supersedes:** `https://blygger.org/spec/0.1/`
- **XML namespace:** `https://blygger.org/ns/0.1`
- **Source of truth:** [`blygger/blygger-spec`](https://github.com/blygger/blygger-spec) — `docs/protocol-v0.2.md`
- **Reference implementation:** same repository, `worker/`
- **License:** CC-BY-4.0
<!-- spec-links:end -->

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
   generates content (the *studio*) is entirely out of scope.
2. **Every blyg feed is a valid RSS 2.0 feed** whose items carry self-contained
   HTML. A plain RSS reader always sees a sensible microblog.
3. **AI is never in the protocol.** Generation, if any, happens in the studio at
   authoring time; the page publishes output plus provenance (§5.7). Readers
   need no models or keys.
4. **Identity is never in the protocol.** The only authenticated entity is the
   publishing client at its domain (the *origin*). DNS is the namespace.

The protocol has two planes. The **state plane** — canonical item files and the
archive index — is ground truth and losslessly complete. The **notification
plane** — the RSS feed — is a lossy, windowed signal that something changed.
Readers reconstruct state from the state plane; they never treat the feed as
authoritative.

Version 0.2 specifies the reading path built on that split. A reader handed
any URL **resolves** it (§12) to a blyg origin or a legacy feed, subscribes,
and polls: the feed is a cheap trigger, item documents are the only thing
that advances state, and the archive index heals every gap — a subscriber
offline for any duration recovers losslessly (§13). Subscription is
deliberately invisible: there is no follow object, no follower list, and the
only public trace of anyone's reading is the curated blogroll they choose to
publish (§11).

## 2. Terminology

- **Origin** — a blyg's base URL (e.g. `https://example.com/blyg/`). The unit
  of identity, trust, and subscription. May be a domain root, any path under a
  domain, or a subdomain — the protocol never constrains where a blyg mounts
  (§4).
- **Item** — the unit of publication. Carries a permanent id and a version
  history. Current kinds: `fragment`, `thread`, `withdrawn`.
- **Fragment** — a short-form item (microblog-post-sized).
- **Thread** — a long-form item that *transcludes* fragments (§10).
- **Version** — one published state of an item, numbered from 1. Publishing an
  edit creates version N+1.
- **Publish event** — the act that creates a version; what the feed announces.
- **Withdrawal** — the only exit for a published item: a permanent, reversible
  endcap version with empty content (§9).
- **Pin** — an irrevocable promise to serve one specific version forever (§8).
- **Transclusion** — publish-time inclusion of a fragment's content, by
  snapshot, into a thread (§10).
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
| **L1** | **This specification.** Publish side: stable ids, versioned items, canonical item files, manifest, archive index, rollup semantics, withdrawal, pins, threads and local transclusion, generation provenance. Subscribe side: resolution, importer conformance, lossless recovery. |
| **L2** | Cross-client constructs, arriving incrementally: the optional blogroll ships with this version (§11); stub metadata, thread nesting, `forked_from` lineage, and webmention arrive at protocol 0.3. |
| **L3** | *(future)* Encrypted/permissioned content. |

Levels are strict supersets. A conforming reader at any level MUST ignore
constructs it does not understand rather than reject the document containing
them (this is what lets levels and versions advance without breaking anyone).

A **publisher** conforms at L1 by serving the surfaces in §4 with the semantics
in §§5–11. A **reader** conforms at L1 by following the rules in §§12–13.
The blogroll is OPTIONAL at every level: serving one never changes a
publisher's conformance, and readers are never required to consume one.

### 3.1 The protocol version key

Manifests and item documents carry a `"blyg"` key naming the spec version
their publisher implements (a deployment serving the 0.2 surfaces emits
`"blyg": "0.2"`). The key is **informative, not a negotiation**: readers MUST
accept any `0.x` value and apply the standing ignore-unknown rules (§13.1) to
whatever they find. Vocabulary evolves inside one namespace under those
ignore rules; a breaking change, if one ever happens, gets a major version
bump and its own migration story — never this mechanism.

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

Publishers SHOULD additionally serve human-readable HTML (a feed page, item
permalink pages); their form is presentation, not protocol, except where noted
(§8.4, §10.5).

Requirements:

- The entire surface MUST be servable as plain static files. A conforming blyg
  can live on a dumb file host; dynamic serving is an implementation detail.
- `items/{id}.json` MUST return 404 for unknown ids and never-published drafts,
  and MUST return 200 permanently once the item has ever been published —
  including after withdrawal.
- `items/{id}/v{n}.json` MUST return 404 unless version n of item id is pinned,
  and MUST return 200 permanently once it is (§8).
- Public JSON and XML responses SHOULD be served with permissive CORS
  (`Access-Control-Allow-Origin: *`); cross-origin reading by other clients
  depends on it.
- All protocol timestamps are ISO 8601 UTC (`…Z`), except RSS-mandated RFC 822
  dates inside `feed.xml`.

## 5. The item document — `items/{id}.json`

Ground truth for one item. Example (a fragment):

```json
{
  "blyg": "0.2",
  "id": "7c9wk2mhq0v3xj8tn5rzfd41bg",
  "kind": "fragment",
  "origin": "https://example.com/blyg/",
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
- `updated` MUST equal the latest changelog entry's `at`. All timestamps are
  self-asserted by the origin; readers order events per their own policy
  (§13.7).

### 5.3 Kinds

- `"kind"` is `"fragment"`, `"thread"` (§10), or `"withdrawn"` (§9) in this
  version. Readers MUST treat unknown kinds as unknown constructs: ignore the
  item, don't reject the feed or archive containing it.
- Fragments: publishers SHOULD cap `content_md` at 2,000 characters
  (RECOMMENDED studio-enforced cap: 1,000). Enforcement is publisher-side only —
  readers MUST NOT reject long fragments.
- Threads additionally carry `transclusions` (§10.3).

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
  origins; lineage targets pinned versions.
- Clients that store or re-emit item JSON MUST carry `author` verbatim, never
  synthesized or rewritten.
- A feed is single-**publisher** (one origin, one accountable client), not
  necessarily single-author: a multiplayer client may publish one conformant
  feed with per-item bylines. There is no shared namespace and no
  `user@server`; DNS remains the namespace.

### 5.6 Reserved (do not emit at 0.2)

- Top-level `"forked_from": { "id": "…", "version": N }` — lineage pointer to a
  **pinned** version of another item; it MUST reference a pinned version.
  Arrives with L2 (protocol 0.3). Readers encountering it at 0.2 MUST treat it
  as an unknown construct.

### 5.7 Generation provenance — the `generated` array

*(New in 0.2.)* Invariant 3 stands: AI is never in the protocol. Generation,
if any, is a studio act at authoring time, and the published `content_md` is
ordinary markdown — no markers, no instructions, no authoring grammar of any
kind reaches the wire. The hash covers exactly what readers read. What the
wire gains is generation's **provenance shadow**: a publisher whose version
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

1. `sources` names the exact published versions of this origin's items whose
   content was **drawn on** by the generator for that span. It MAY be empty
   (pure instructed generation). `model` and `at` are RECOMMENDED.
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

## 6. Manifest and archive index

### 6.1 Manifest — `blyg.json`

```json
{
  "blyg": "0.2",
  "level": 1,
  "generator": "blyg-ref/0.2.0",
  "site": "https://example.com/blyg/",
  "title": "Venkat's blyg",
  "author": { "name": "Venkatesh Rao", "bio": "…", "avatar": "media/avatar.png",
              "links": [{ "label": "Home", "url": "https://venkateshrao.com" }] },
  "feed": "feed.xml",
  "items": "items/index.json",
  "blogroll": "blogroll.opml",
  "updated": "2026-07-18T09:30:00Z"
}
```

The manifest `author` is the **publication identity** — a person, a collective,
a masthead: the imprint, where per-item `author` (§5.5) is the byline. When an
item carries no `author`, no assertion is made; readers fall back to this
site-level identity for display.

The `blogroll` key (new in 0.2) is OPTIONAL: an origin-relative path,
canonically `"blogroll.opml"`, present only when the publisher serves a
non-empty blogroll (§11). The `site` value is self-asserted and
display-advisory only; it never establishes identity (§12.2).

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
    <blyg:level>1</blyg:level>
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
- **A withdrawn item contributes exactly one entry** — its withdrawal event,
  with title `withdrawn` and empty description. Its earlier publish events MUST
  be dropped from the window (with content withheld they would render as empty
  noise under the previous rule).
- **Pinning emits no feed event.** A pin is a promise change, not a content
  change; the changelog `pinned` flag is the signal.
- `<description>` HTML MUST be self-contained: absolute media URLs, no
  dependence on the origin's stylesheets or scripts. (Baked transclusion and
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
  "blyg": "0.2",
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
   publish-time `content_html` (baked snapshots included) and its
   `transclusions` provenance, with `"kind": "thread"`. A pinned version that
   involved generation carries its `generated` array (§5.7).
6. **`author` rides outside the pin promise.** `content_hash` covers
   `content_md` only, so the pin's immutability guarantee covers *content*,
   never the author bytes. A pinned file SHOULD carry the assertion as
   published with that version, but both serve-time and publish-time assertion
   strategies are conformant. Verifiable authorship, if wanted, is a signature
   *inside* an authorspace grammar (§5.5), not a protocol feature.

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

*(Revision note, 2026-09-13: the 0.1 text phrased this as "an indicator, not
navigation," which read as a presentation mandate. The normative content was
always the route/promise bound — restated above so the two readings cannot
diverge. The pinned-page routes below were added in the 2026-09-12 revision
of 0.1, exercising the additive path the original JSON-only rule reserved.)*

The pin's *promise* is the JSON file (§8.1). Additionally, a publisher **MAY**
serve a rendered page for each pinned version at the item's permalink path
plus a version segment:

```
GET {origin}f/{id}/v{n}/     (fragments)
GET {origin}t/{id}/v{n}/     (threads)
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
entry. For threads, the endcap also empties `transclusions` to `[]` (§10.4);
an endcap never carries a `generated` array (§5.7).

- The item document stays **200 forever** (§4). Pinned versions of the item
  remain fetchable forever (§8).
- Conforming readers roll the item up to null and drop it from their local
  archive (§13.4). The protocol is honest that this is cooperation, not
  cryptography: remote copies, caches, and snapshots survive withdrawal.
- Withdrawal is **reversible**: a later publish event (vN+1 with the item's
  authored kind) is the item returning under the same id; readers that dropped
  it simply re-import it.

## 10. Threads and transclusion

A thread is an item with `"kind": "thread"`: long-form markdown that
**transcludes** the publisher's own fragments. Threads use the same identity,
versioning, changelog, withdrawal, and pin machinery as fragments. At 0.2,
threads are local-only: transclusion targets MUST be fragments of the same
origin; thread-in-thread nesting and remote sources arrive at L2.

### 10.1 Grammar (permanent protocol surface)

- A line consisting solely of `![[` + a 26-character item id + `]]`
  (surrounding whitespace allowed) is a **transclusion directive**:
  `![[7c9wk2mhq0v3xj8tn5rzfd41bg]]`
- Anywhere else — inline, inside code blocks — the same character sequence is
  inert text.
- `![[id@vN]]` (explicit version) is **reserved**: 0.2 publishers MUST reject
  it at publish time; readers MUST tolerate it as an unknown construct.

### 10.2 Publish-time resolution

Resolution happens in the studio at publish time; **readers never resolve
anything**.

- Every directive MUST resolve to a local, currently-published
  `kind: "fragment"` item. Drafts, withdrawn items, unknown ids, and threads
  are publish errors.
- Resolution **snapshots** the target's latest published version: its rendered
  HTML is baked into the thread's `content_html`, wrapped as

  ```html
  <blockquote class="blyg-transclusion"
              data-blyg-id="{id}"
              data-blyg-version="{n}">…fragment html…</blockquote>
  ```

  The wrapper is a bare blockquote plus data attributes — **no link inside**;
  any provenance link shown on an HTML page is presentation, not part of the
  published `content_html`. The class name `blyg-transclusion` is a
  **permanent wire token**, baked into published `content_html`; its styling
  is presentation.
- `content_md` keeps the directives — it is the authoring source of truth.
  Republishing a thread re-resolves every directive to the then-latest
  versions.

### 10.3 Provenance

Thread item documents carry a top-level `"transclusions"` array of
`{ "id": …, "version": … }` in directive order — the exact versions baked into
this thread version. Fragments omit the key entirely; threads always carry it
(a withdrawn thread's endcap carries `[]`). Generation sources are disclosed
separately and never appear here (§5.7).

### 10.4 Snapshot independence

The rule that makes network cycles harmless, applied locally first:

- Later edits, withdrawal, or pinning of a source fragment do **not** change a
  thread's baked snapshot. Withdrawal does not cascade — content published into
  a thread stays in the thread, the same honesty rule as remote caches.
- **No auto-pin:** `transclusions[].version` is provenance metadata and may
  name a version with no fetchable per-version file. Pinning stays a separate
  deliberate act; the self-contained baked HTML carries the content.
- A thread rendered against an older source version is legible by design: its
  provenance names exactly which version it baked.

### 10.5 Feed and presentation

Feed entries for threads carry the full baked self-contained HTML (automatic,
given the snapshot rule). Threads have no length cap. How an HTML feed page
excerpts threads is presentation, not protocol.

## 11. The blogroll — `blogroll.opml`

*(New in 0.2. OPTIONAL at every level.)* The blogroll is the protocol's
**static discovery plane**: a curated, published list of subscriptions the
publisher chose to show. It is a publishing act, not an export — the outbound
half of the public graph, and the only half that exists at this version.

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
  level, ever. The public graph is blogrolls — outbound and curated — plus,
  from protocol 0.3, verified inbound stubs (§15).

## 12. Resolution — from URL to subscription

*(New in 0.2.)* Resolution turns a URL found out-of-band — a link someone
shared, a blogroll entry, an address bar — into a subscription target. It is
**deterministic, ordered, and bounded** (at most 6 fetches), so that any two
conforming readers handed the same URL arrive at the same subscription
identity. Readers that subscribe MUST implement the following procedure in
this order. Output: a blyg subscription `{ origin, manifest }`, a legacy
feed subscription `{ feed_url }` (L0), or failure with the list of URLs
tried.

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
  protocol-authenticated entity is the origin.
- **Redirects:** follow a bounded number (RECOMMENDED: 5); the *final* URL
  wins as origin. Cross-host redirects are allowed — sites move; identity is
  where the bytes actually came from.
- **Re-resolution:** readers MAY re-run resolution when a subscription's
  surfaces 404 persistently (the blyg may have moved and left a rel link).
  Adopting a new origin is an **identity change** and MUST be user-confirmed,
  never automatic.

### 12.3 Polling etiquette

- Readers SHOULD poll with conditional requests (`If-None-Match` /
  `If-Modified-Since`) and honor `304`.
- Readers SHOULD back off exponentially on repeated failure, SHOULD honor
  `Retry-After` on 429/503, and MUST NOT tighten their polling interval in
  response to failure. Poll failure never justifies discarding stored state
  (§13.2).
- Readers SHOULD send an identifying `User-Agent`.

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
   not transfer across origins.

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

### 13.5 Curation display and re-emission

A client that both subscribes and publishes MUST keep the two planes
separate:

- **Imported items are never re-emitted.** They MUST NOT appear in the
  publisher's `feed.xml`, `items/index.json`, or as `items/{id}.json`
  documents, in any form — re-emission would collide with `blyg:id` rollup
  and break the single-publisher invariant (§5.5). Speech about someone
  else's content costs editorial work: write an item.
- A client MAY **display** imported content publicly as curation — a shown
  list, with source attribution and links to the origin — without any
  protocol surface: no manifest vocabulary, no feed events, no new item
  documents. Publicity is a property of the displayed *list*, never of an
  imported item. Displayed copies follow §13.4's retention rule when their
  source is withdrawn.

### 13.6 L0 grandfathering — the legacy RSS wrapper

A plain-RSS subscription (resolution step 6) imports each entry as a
**summary item + link**, best-effort by design:

- The local id is synthetic — derived deterministically from the entry's GUID
  (or link, absent a GUID) — and origin-scoped like everything else. Synthetic
  ids are never valid blyg ids and MUST NOT be exported or re-emitted in any
  protocol surface.
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
  design, and nothing forces non-conforming copies to do anything. Publishers
  should understand pins are irrevocable before pinning.
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
- **HTML safety:** `content_html` is publisher-supplied. The reference
  implementation renders markdown with raw HTML escaped, but readers MUST
  sanitize or sandbox fetched `content_html` before rendering it in their own
  UI, as with any syndicated HTML. Store verbatim, sanitize at render — the
  stored ground truth is preserved; the presentation is defended.
- **Resolution fetches attacker-suppliable URLs.** A subscribe-by-URL surface
  makes requests wherever it is pointed. Server-side readers SHOULD apply
  standard fetch hygiene: bounded redirects (§12.2), response size and time
  limits, and refusal to fetch private-network addresses where the deployment
  could be used to probe them.
- **History rewriting is loud, not prevented.** The watermark rule (§13.3)
  cannot stop an origin from rewriting its past; it guarantees conforming
  readers notice and require a human decision to accept it.
- **A blogroll reveals reading choices.** It is therefore curated and opt-in
  by design (§11), with no completeness claim — absence of an entry carries
  no information, by construction.
- **Media immutability** (§5.4) is a promise by the publisher, not a
  verifiable property at L1; `content_hash` covers markdown only.

## 15. Future constructs (non-normative)

Reserved or planned, so 0.2 implementations leave room:

- `forked_from` lineage from pinned versions (§5.6) — L2, protocol 0.3.
- `![[id@vN]]` version-explicit transclusion (§10.1) — reserved.
- Stub metadata (a thread marking itself a response to a target item),
  thread-in-thread nesting, cross-client transclusion — L2, protocol 0.3.
- Webmention-based response notification with **structural verification**
  (the receiver checks that the claimed source item actually references the
  target) — the notification half of the discovery model whose static half
  is §11's blogroll. L2, protocol 0.3, optional. Decision record:
  `docs/proposals/curation-discovery-generation-proposal.md`.
- Encrypted/permissioned content — L3.

What will *never* appear: reply primitives (this is a network of soapboxes,
not a conversation medium), follower graphs or any protocol "follow" object,
addressable authors, AI constructs on the wire beyond the passive provenance
of §5.7, version-significance markup (the counter stays bare; the pin is the
significance primitive), and content-addressed identity.
