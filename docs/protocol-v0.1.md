# The Blygger Protocol — Version 0.1

**Status: DRAFT.** This document specifies protocol version 0.1 at conformance
Level 1 (the publish side). It becomes stable when the v0.1 reference deployment
ships, and frozen at protocol 1.0. Until then, breaking changes are permitted but
must bump the manifest version and be recorded in the
[project devlog](https://github.com/blygger/blygger-spec/blob/main/DEVLOG.md).

- **This version:** `https://blygger.org/spec/0.1/`
- **XML namespace:** `https://blygger.org/ns/0.1`
- **Source of truth:** [`blygger/blygger-spec`](https://github.com/blygger/blygger-spec) — `docs/protocol-v0.1.md`
- **Reference implementation:** same repository, `worker/`
- **License:** CC-BY-4.0

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY are to be
interpreted as described in RFC 2119.

---

## 1. Introduction (non-normative)

Blygger is a decentralized public writing medium built on static files and RSS.
A **blygg** is a directory of files — mounted anywhere on the publisher's own
domain, at a path (conventionally `/blyg/`) or at the domain root — containing
versioned items of writing, a manifest, an archive index, and an RSS feed.
Anything that can serve files can serve a blygg; anything that can read RSS can
follow one.

Four design invariants shape everything below:

1. **The protocol is a static file contract.** It governs only the published
   artifact — the *page*. How the publisher composes, edits, imports, or
   generates content (the *studio*) is entirely out of scope.
2. **Every blygg feed is a valid RSS 2.0 feed** whose items carry self-contained
   HTML. A plain RSS reader always sees a sensible microblog.
3. **AI is never in the protocol.** Generation, if any, happens in the studio at
   authoring time; the page publishes output plus provenance. Readers need no
   models or keys.
4. **Identity is never in the protocol.** The only authenticated entity is the
   publishing client at its domain (the *origin*). DNS is the namespace.

The protocol has two planes. The **state plane** — canonical item files and the
archive index — is ground truth and losslessly complete. The **notification
plane** — the RSS feed — is a lossy, windowed signal that something changed.
Readers reconstruct state from the state plane; they never treat the feed as
authoritative.

## 2. Terminology

- **Origin** — a blygg's base URL (e.g. `https://example.com/blyg/`). The unit
  of identity, trust, and subscription. May be a domain root, any path under a
  domain, or a subdomain — the protocol never constrains where a blygg mounts
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
- **Conformance level** — L0–L3, strict supersets (§3).

## 3. Conformance levels

| Level | Meaning |
|---|---|
| **L0** | Any plain RSS feed, grandfathered via a reader-side wrapper (summary fragment + link). No blygg constructs. |
| **L1** | **This specification.** Blygg identity: stable ids, versioned items, canonical item files, manifest, archive index, rollup semantics, withdrawal, pins, threads and local transclusion. |
| **L2** | *(future — protocol 0.3)* Cross-client constructs: stub metadata, thread nesting, `forked_from` lineage, blogroll, webmention. |
| **L3** | *(future)* Encrypted/permissioned content. |

Levels are strict supersets. A conforming reader at any level MUST ignore
constructs it does not understand rather than reject the document containing
them (this is what lets levels and versions advance without breaking anyone).

A **publisher** conforms at L1 by serving the surfaces in §4 with the semantics
in §§5–10. A **reader** conforms at L1 by following the rules in §11.

## 4. The publication surface

A blygg is the following file tree under its origin. The origin's location is
the publisher's free choice — a domain root (`https://example.com/`), any path
(`https://example.com/blyg/`, `https://example.com/notes/b/`), or a subdomain.
The surface is strictly origin-relative: no protocol construct may assume any
particular path component, and readers MUST NOT infer anything from the mount
path. The file names *within* the surface (`blygg.json`, `feed.xml`,
`items/…`) are protocol-fixed and MUST NOT vary per deployment — a known
manifest filename at an arbitrary origin is what keeps free mounting
discoverable (a reader handed any base URL fetches `blygg.json` relative to
it). `/blyg/` is the reference client's default mount and the convention used
in examples throughout this document; it carries no protocol meaning.

Publishers MUST serve:

| Path (relative to origin) | Content | Spec |
|---|---|---|
| `blygg.json` | Manifest | §6 |
| `feed.xml` | RSS 2.0 feed | §7 |
| `items/index.json` | Archive index | §6.2 |
| `items/{id}.json` | Canonical item document | §5 |
| `items/{id}/v{n}.json` | Pinned version document (only for pinned versions) | §8 |
| `media/…` | Media objects referenced by items | §5.4 |

Publishers SHOULD additionally serve human-readable HTML (a feed page, item
permalink pages); their form is presentation, not protocol, except where noted
(§8.4, §10.5).

Requirements:

- The entire surface MUST be servable as plain static files. A conforming blygg
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
  "blygg": "0.1",
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
- Only the **latest** version's content is served in the item document. Older
  content is withheld — the publisher's history stays private by default —
  unless a version is pinned (§8). The `changelog` is metadata (version, time,
  optional note, optional `"pinned": true`), never diffs or content.
- `updated` MUST equal the latest changelog entry's `at`. All timestamps are
  self-asserted by the origin; readers order events per their own policy (§11).

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

### 5.6 Reserved (do not emit at 0.1)

- Top-level `"forked_from": { "id": "…", "version": N }` — lineage pointer to a
  **pinned** version of another item; it MUST reference a pinned version.
  Arrives with L2. Readers encountering it at 0.1 MUST treat it as an unknown
  construct.

## 6. Manifest and archive index

### 6.1 Manifest — `blygg.json`

```json
{
  "blygg": "0.1",
  "level": 1,
  "generator": "blygg-ref/0.1.0",
  "site": "https://example.com/blyg/",
  "title": "Venkat's blygg",
  "author": { "name": "Venkatesh Rao", "bio": "…", "avatar": "media/avatar.png",
              "links": [{ "label": "Home", "url": "https://venkateshrao.com" }] },
  "feed": "feed.xml",
  "items": "items/index.json",
  "updated": "2026-07-18T09:30:00Z"
}
```

The manifest `author` is the **publication identity** — a person, a collective,
a masthead: the imprint, where per-item `author` (§5.5) is the byline. When an
item carries no `author`, no assertion is made; readers fall back to this
site-level identity for display.

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
missed.

## 7. The feed — `feed.xml`

RSS 2.0 with the `blygg:` namespace (`https://blygger.org/ns/0.1`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:blygg="https://blygger.org/ns/0.1">
  <channel>
    <title>Venkat's blygg</title>
    <link>https://example.com/blyg/</link>
    <description>…</description>
    <lastBuildDate>Sat, 18 Jul 2026 09:30:00 GMT</lastBuildDate>
    <blygg:level>1</blygg:level>
    <blygg:manifest>https://example.com/blyg/blygg.json</blygg:manifest>
    <item>
      <guid isPermaLink="false">blygg:7c9wk2mhq0v3xj8tn5rzfd41bg:v3</guid>
      <link>https://example.com/blyg/f/7c9wk2mhq0v3xj8tn5rzfd41bg/</link>
      <title>Sharpened the claim — Markdown source of the latest…</title>
      <description><![CDATA[<p>rendered HTML of latest version</p>]]></description>
      <pubDate>Sat, 18 Jul 2026 09:30:00 GMT</pubDate>
      <blygg:id>7c9wk2mhq0v3xj8tn5rzfd41bg</blygg:id>
      <blygg:kind>fragment</blygg:kind>
      <blygg:version>3</blygg:version>
      <blygg:created>2026-07-17T18:00:00Z</blygg:created>
      <blygg:item>https://example.com/blyg/items/7c9wk2mhq0v3xj8tn5rzfd41bg.json</blygg:item>
    </item>
  </channel>
</rss>
```

Rules:

- **One `<item>` per publish event**, newest first. The window SHOULD be bounded
  (RECOMMENDED: 50 entries). An item edited twice recently may appear twice at
  different versions; that is correct. The feed is lossy by design — the archive
  index (§6.2) is the lossless surface.
- **GUIDs are per-version**: `blygg:{id}:v{n}`, `isPermaLink="false"`. Plain RSS
  readers dedupe by guid, so per-version GUIDs make edits resurface as new
  entries — matching reverse-chron-by-update presentation. Blygg-aware readers
  roll up by `blygg:id` instead and see no duplicates.
- **Entries render the item's latest content.** A feed entry for an older
  publish event keeps its own `blygg:version` and note, but its `<description>`
  MUST carry the *latest* version's HTML. (Serving each event's own historical
  content would leak history that §5.2 withholds.)
- **A withdrawn item contributes exactly one entry** — its withdrawal event,
  with title `withdrawn` and empty description. Its earlier publish events MUST
  be dropped from the window (with content withheld they would render as empty
  noise under the previous rule).
- **Pinning emits no feed event.** A pin is a promise change, not a content
  change; the changelog `pinned` flag is the signal.
- `<description>` HTML MUST be self-contained: absolute media URLs, no
  dependence on the origin's stylesheets or scripts.
- When an item's `author.name` is present, the publisher SHOULD emit
  `<dc:creator>` (`xmlns:dc="http://purl.org/dc/elements/1.1/"`) with the
  display name — the standard RSS byline. The opaque `author` object itself
  never appears in the XML: the state plane is ground truth, the feed is a
  signal.
- `pubDate`/`lastBuildDate` use RFC 822 format; `blygg:*` timestamps stay
  ISO 8601.

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
  "blygg": "0.1",
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
   `transclusions` provenance, with `"kind": "thread"`.
6. **`author` rides outside the pin promise.** `content_hash` covers
   `content_md` only, so the pin's immutability guarantee covers *content*,
   never the author bytes. A pinned file SHOULD carry the assertion as
   published with that version, but both serve-time and publish-time assertion
   strategies are conformant. Verifiable authorship, if wanted, is a signature
   *inside* an authorspace grammar (§5.5), not a protocol feature.

### 8.4 No historical-version HTML route

Pinned versions are served as **JSON only**. No route ever serves an older
version as an HTML page — a general historical route would gut
withheld-unless-pinned. Consequently a public page's version display is an
**indicator, not navigation**: the right presentation is discrete pin citations
(e.g. "v6 · pinned: v2, v4" linking to the `v{n}.json` files) — pins are a
sequence of frozen citable artifacts of one identity, not pages of one document.
A pinned-only HTML route MAY be added in a future version, purely additively.

## 9. Withdrawal

Withdrawing is the only exit for a published item. There is no delete: no
permanent-delete state exists in the protocol. (Discarding a never-published
draft is a hard delete — nothing was ever public.)

Withdrawing publishes a permanent **endcap**: a version bump with
`content_md` = `""`, `content_html` = `""`, `media` = `[]`, an optional note,
`"kind": "withdrawn"`, `updated` set, and the changelog retained plus the endcap
entry. For threads, the endcap also empties `transclusions` to `[]` (§10.4).

- The item document stays **200 forever** (§4). Pinned versions of the item
  remain fetchable forever (§8).
- Conforming readers roll the item up to null and drop it from their local
  archive (§11). The protocol is honest that this is cooperation, not
  cryptography: remote copies, caches, and snapshots survive withdrawal.
- Withdrawal is **reversible**: a later publish event (vN+1 with the item's
  authored kind) is the item returning under the same id; readers that dropped
  it simply re-import it.

## 10. Threads and transclusion

A thread is an item with `"kind": "thread"`: long-form markdown that
**transcludes** the publisher's own fragments. Threads use the same identity,
versioning, changelog, withdrawal, and pin machinery as fragments. At 0.1,
threads are local-only: transclusion targets MUST be fragments of the same
origin; thread-in-thread nesting and remote sources arrive at L2.

### 10.1 Grammar (permanent protocol surface)

- A line consisting solely of `![[` + a 26-character item id + `]]`
  (surrounding whitespace allowed) is a **transclusion directive**:
  `![[7c9wk2mhq0v3xj8tn5rzfd41bg]]`
- Anywhere else — inline, inside code blocks — the same character sequence is
  inert text.
- `![[id@vN]]` (explicit version) is **reserved**: 0.1 publishers MUST reject
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
  <blockquote class="blygg-transclusion"
              data-blygg-id="{id}"
              data-blygg-version="{n}">…fragment html…</blockquote>
  ```

  The wrapper is a bare blockquote plus data attributes — **no link inside**;
  any provenance link shown on an HTML page is presentation, not part of the
  published `content_html`.
- `content_md` keeps the directives — it is the authoring source of truth.
  Republishing a thread re-resolves every directive to the then-latest
  versions.

### 10.3 Provenance

Thread item documents carry a top-level `"transclusions"` array of
`{ "id": …, "version": … }` in directive order — the exact versions baked into
this thread version. Fragments omit the key entirely; threads always carry it
(a withdrawn thread's endcap carries `[]`).

### 10.4 Snapshot independence

The rule that makes future network cycles harmless, applied locally first:

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

## 11. Reader conformance

A conforming reader (the import side; reference implementation arrives with
protocol 0.2):

1. MUST treat item documents as ground truth and the feed as a lossy signal.
2. MUST roll up by `blygg:id`: highest `version` wins; ties broken by
   `updated`. Timestamps are self-asserted by origins; ordering across origins
   is the reader's own policy.
3. MUST treat a withdrawal endcap as roll-up-to-null and SHOULD drop the item
   from its local archive. A later version under the same id is the item
   returning.
4. MUST ignore unknown kinds, unknown JSON members, unknown `blygg:*` XML
   elements, and reserved constructs, without rejecting the containing
   document.
5. MUST NOT reject an item over its `author` contents, and MUST NOT treat
   equal `author` values from different origins as the same entity (§5.5).
6. SHOULD backfill from `items/index.json` when the feed window has been
   missed; a reader offline for any duration recovers losslessly.
7. MUST scope everything it learns to the origin: ids, authors, and trust do
   not transfer across origins.

## 12. Security and privacy considerations

- **Withdrawal is cooperation, not erasure.** The protocol makes the honest
  promise only: the origin stops serving content, conforming readers drop it,
  pinned versions survive by design, and nothing forces non-conforming copies
  to do anything. Publishers should understand pins are irrevocable before
  pinning.
- **Timestamps are self-asserted.** Nothing prevents an origin from
  backdating. Readers that care about ordering across origins must apply their
  own observation-time policy.
- **`author` is an unverified assertion** (§5.5). Displaying it is displaying
  the origin's claim. Impersonation resistance across origins is out of scope
  by design; within an origin, accountability is the origin's.
- **HTML safety:** `content_html` is publisher-supplied. The reference
  implementation renders markdown with raw HTML escaped, but readers MUST
  sanitize or sandbox fetched `content_html` before rendering it in their own
  UI, as with any syndicated HTML.
- **Media immutability** (§5.4) is a promise by the publisher, not a
  verifiable property at L1; `content_hash` covers markdown only.

## 13. Future constructs (non-normative)

Reserved or planned, so 0.1 implementations leave room:

- `forked_from` lineage from pinned versions (§5.6) — L2.
- `![[id@vN]]` version-explicit transclusion (§10.1) — reserved.
- Stub metadata (a thread marking itself a response to a target item),
  thread-in-thread nesting, cross-client transclusion — L2.
- Blogroll (`blogroll.opml`, curated and optional) and Webmention-based
  response notification with structural verification — L2, both optional.
  Decision record: `docs/proposals/curation-discovery-generation-proposal.md`.
- Encrypted/permissioned content — L3.

What will *never* appear: reply primitives (this is a network of soapboxes, not
a conversation medium), follower graphs or any protocol "follow" object,
addressable authors, AI constructs on the wire, and content-addressed identity.
