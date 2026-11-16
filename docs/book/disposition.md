# Disposition: where everything in 0.4 goes

First sitting, session 73 (2026-11-16), Fable 5.2. Source: `protocol-v0.4.md` at its
seventeenth revision. Working record, not part of the book.

## 1. By section

| 0.4 | Goes to | Remarks |
|---|---|---|
| Preamble | Front matter (one paragraph); the version-policy page | Everything about snapshots, living texts and "which version to implement" is shared by all versions and leaves the book |
| §1 Introduction | I · What Blygger is | The four invariants open Part I and are shown dissolving into the doctrine |
| §2 Terminology | II · Terms; the Glossary | Terms a chapter introduces are defined there; the glossary collects all of them. Its clauses restate rules owned elsewhere and merge |
| §3, §3.1, §3.2 | II · Conformance | "What conformance costs" becomes the principle *A standard library is enough* in Part I |
| §4 | III · The surface | The timestamp rule moves to The item document, where timestamps are |
| §5 intro, §5.1–§5.5, §5.8 | III · The item document; II · Items, versions and kinds | Split by kind of statement: what an item *is* (identity, the version counter, kinds, no title) is the model; what its document *carries* is the chapter. The longest chapter; mathematics and the rules for notes may want their own |
| §5.6 | IV · Forks and lineage | With its flattening procedure whole |
| §5.7 | IV · Generation provenance | |
| §5.9 | IV · The reference | Opens Part IV: the one shape four constructs share |
| §6.1, §6.2 | III · Manifest and index | The `hoppers` key goes to Hopper feeds |
| §7 | III · The feed | |
| §8, §8.4 | III · Pins | **Sample chapter** |
| §9 | III · Withdrawal | **Sample chapter**. Its reader half is V · Retention |
| §10 intro, §10.1 | IV · The grammar; Annex A | |
| §10.2 | IV · Resolution at publish | A partial quote's check and bake go to Quotes and links |
| §10.3, §10.3a, §10.4 | IV · Quotes and links | |
| §10.5 | III · The feed | Two sentences |
| §10.6 | IV · Stubs | |
| §11 | III · The blogroll | "There is no protocol follow" is the principle *Reading is private* |
| §12, §12.1 | V · From a URL to a subscription | |
| §12.2 | II · Origins and identity; V · From a URL to a subscription | The one-spelling rule for an origin string is the model's; subscription identity is the reader's |
| §12.3 | V · Reconciliation | Polling |
| §13.1 | V · Reconciliation | Six of its eight ground rules restate rules owned elsewhere and merge |
| §13.2, §13.3 | V · Reconciliation | |
| §13.4 | V · Retention | |
| §13.5 | V · The duties of display; III · Hopper feeds | Curation display is a duty of display; a publisher's rules for a hopper feed are a publishing chapter |
| §13.6 | V · Legacy feeds | |
| §13.7 | V · Ordering | |
| §14 | VII · Security and privacy; V · The duties of display | Its display SHOULDs (isolate attributed strings; show a quote as the quoter's snapshot) join the duties of display |
| §15 | VI · Mentions | Probably three chapters: sending; receiving and verifying; what a mention is |
| §16.8 | I · What will never appear | |
| §16.9, §16.10, §16.13, §16.14 | Annex B · Ruled shapes awaiting a build | |
| §16.7 | Annex C · Reserved | |
| §16, the eleven promoted stubs | Annex D · Section map | One table |
| §17 | The history page | |

## 2. By clause

The 272 normative clauses in the current text, each with its default destination by
section. **Three exceptions were settled in the first sitting** (C-4-10, C-5-10,
C-9-01); the rest are settled as each chapter is written, when a clause is found to
belong with a different document or act. Rule ids are assigned at writing and recorded
in [`clause-map.md`](clause-map.md). Clause ids here are the toolkit's, from a scratch
extraction: Opus's rebuild of the committed register is the authority once it exists.

| Destination | Clauses |
|---|---|
| II · Terms | 2 |
| II · Conformance | 6 |
| III · The surface | 13 |
| III · The item document | 46 |
| III · Manifest and index | 13 |
| III · The feed | 12 |
| III · Pins | 12 |
| III · Withdrawal | 2 |
| III · The blogroll | 5 |
| IV · The reference | 7 |
| IV · The grammar | 11 |
| IV · Resolution at publish | 11 |
| IV · Quotes and links | 8 |
| IV · Stubs | 9 |
| IV · Forks and lineage | 12 |
| IV · Generation provenance | 13 |
| V · From a URL to a subscription | 15 |
| V · Reconciliation | 24 |
| V · Retention | 2 |
| V · Legacy feeds | 4 |
| V · Ordering | 3 |
| V · The duties of display | 9 |
| VI · Mentions | 25 |
| VII · Security and privacy | 8 |
| **Total** | **272** |

| 0.4 clause | Level | Side | Destination | Text (start) |
|---|---|---|---|---|
| C-2-01 | SHOULD | sender | II · Terms | Each SHOULD send a mention (§15.2). |
| C-2-02 | MUST | reader | II · Terms | **Identity change** — a reader adopting a new origin for an existing subscription, which MUST be user-confirme… |
| C-3-01 | MUST | reader | II · Conformance | A conforming reader at any level MUST ignore constructs it does not understand rather than reject the document… |
| C-3-02 | MUST | unknown | II · Conformance | Two habits follow, and later text is written to them: a rule states a **property of a value** (an origin strin… |
| C-3.1-01 | MUST | reader | II · Conformance | The key is **informative, not a negotiation**: readers MUST accept any `0.x` value and apply the standing igno… |
| C-3.2-01 | MUST | reader | II · Conformance | **Readers MUST NOT gate any behaviour on any of them** — not parsing, not feature selection, not trust. |
| C-3.2-02 | SHOULD | publisher | II · Conformance | `generator` nonetheless carries real weight, which is why publishers SHOULD emit it in the form `name/version`… |
| C-3.2-03 | MUST | reader | II · Conformance | It is the client's name, never the protocol's: a client rename is not a protocol change and MUST NOT be read a… |
| C-4-01 | MUST | reader | III · The surface | The surface is strictly origin-relative: no protocol construct may assume any particular path component, and r… |
| C-4-03 | MUST | publisher | III · The surface | Publishers MUST serve: |
| C-4-04 | MAY | publisher | III · The surface | Publishers MAY additionally serve: |
| C-4-05 | MAY | publisher | III · The surface | `blogroll.opml` ; Curated blogroll (OPTIONAL) ; §11 |
| C-4-06 | MAY | receiver | III · The surface | *(the URL named by the manifest's `webmention` key)* ; Webmention endpoint (OPTIONAL; the protocol's only dyna… |
| C-4-07 | SHOULD | publisher | III · The surface | Publishers SHOULD additionally serve human-readable HTML (a feed page, item permalink pages); their form is pr… |
| C-4-08 | MUST | publisher | III · The surface | The entire surface MUST be servable as plain static files. |
| C-4-09 | MUST | publisher | III · The surface | `items/{id}.json` MUST return 404 for unknown ids and never-published drafts, and MUST return 200 permanently … |
| C-4-10 | MUST | publisher | III · Pins | `items/{id}/v{n}.json` MUST return 404 unless version n of item id is pinned, and MUST return 200 permanently … |
| C-4-11 | SHOULD | publisher | III · The surface | Public JSON and XML responses SHOULD be served with permissive CORS (`Access-Control-Allow-Origin: *`); cross-… |
| C-4-12 | MUST | publisher | III · The surface | A publisher MUST NOT write local time into any protocol surface; time-zone display is a presentation concern o… |
| C-4-13 | MUST | publisher | III · The surface | **That holds at every identity origin, relocated surface or not: `{origin}blyg.json` MUST serve the manifest**… |
| C-4-14 | MAY | publisher | III · The surface | Every other path below is the **default**, and the manifest MAY relocate it (§6.1; new in 0.4, promoted from t… |
| C-4-15 | MAY | publisher | III · The surface | *(the paths named in the manifest's `hoppers` list)* ; Hopper feeds, one per public hopper (OPTIONAL; new in 0… |
| C-5-01 | MAY | publisher | III · The item document | Threads additionally carry `transclusions` (§10.3) and MAY carry `stub_of` (§10.6). |
| C-5-02 | MAY | publisher | III · The item document | Any item MAY carry `forked_from` (§5.6), `generated` (§5.7) and `links` (§10.3a). |
| C-5-03 | MUST | publisher | III · The item document | `blyg`, `id`, `kind`, `origin`, `version`, `created`, `updated`, `content_md`, `content_html`, `content_hash`,… |
| C-5-04 | MUST | publisher | III · The item document | `media` ; REQUIRED; an array, MAY be empty ; §5.4 |
| C-5-05 | SHOULD | publisher | III · The item document | `page` ; RECOMMENDED ; §5.8 |
| C-5-06 | MAY | publisher | III · The item document | `author` ; OPTIONAL; absent means no assertion ; §5.5 |
| C-5-07 | MUST | publisher | III · The item document | `transclusions` ; REQUIRED for threads, absent for fragments ; §10.3 |
| C-5-08 | MAY | publisher | III · The item document | `stub_of`, `forked_from`, `generated` ; OPTIONAL, present when the construct is ; §10.6, §5.6, §5.7 |
| C-5-09 | MAY | publisher | III · The item document | `links` ; OPTIONAL; present when the version resolved at least one `[[id]]` (fourth revision) ; §10.3a |
| C-5-10 | MUST | publisher | III · Withdrawal | A withdrawal endcap (§9) keeps the REQUIRED members with empty content. |
| C-5.1-01 | MUST | publisher | III · The item document | `id` MUST be 128 random bits encoded as 26 characters of lowercase Crockford base32 (alphabet `0123456789abcde… |
| C-5.1-02 | MUST | publisher | III · The item document | Ids are permanent identity: they MUST NOT change across versions, withdrawal, or return. |
| C-5.1-03 | MUST | publisher | III · The item document | `content_hash` MUST be `"sha256:" + hex(SHA-256(content_md as UTF-8))`, computed per published version. |
| C-5.1-04 | SHOULD | publisher | III · The item document | A publisher SHOULD publish `content_md` in Unicode Normalization Form C, which is what nearly every input path… |
| C-5.1-05 | MUST | reader | III · The item document | A reader MUST NOT normalize an imported `content_md`: it would then hold bytes the hash does not cover. |
| C-5.1-06 | MUST | publisher | III · The item document | A publisher MUST NOT publish a `content_md` containing a C0 control character other than tab (U+0009), line fe… |
| C-5.2-01 | MUST | publisher | III · The item document | A note that quotes the prior version's text is a diff by another name and leaks exactly what withholding prote… |
| C-5.2-02 | MUST | publisher | III · The item document | `updated` MUST equal the latest changelog entry's `at`. |
| C-5.2-03 | MUST | publisher | III · The item document | **`content_html` is self-contained** (revision of 2026-10-03, decision #53): every URL in it — media, links, t… |
| C-5.2-04 | MUST | publisher | III · The item document | Readers MAY resolve a relative URL against the document's origin on import as a defensive measure and MUST NOT… |
| C-5.2-05 | MUST | client | III · The item document | **No word in a note has wire meaning** (revision of 2026-10-19, decision #83): a note is prose, and clients MU… |
| C-5.2-06 | MAY | publisher | III · The item document | **A changelog entry MAY carry `"generated": true`** (revision of 2026-10-06, decision #40), meaning the publis… |
| C-5.2-07 | MUST | reader | III · The item document | Readers MUST NOT gate on it, and a reader that ignores it stays conformant. |
| C-5.2-08 | SHOULD | publisher | III · The item document | A publisher that renders mathematical notation SHOULD emit that element, restricted to the presentation elemen… |
| C-5.2-09 | SHOULD | publisher | III · The item document | It SHOULD carry the notation the author wrote inside the element, as `<annotation encoding="application/x-tex"… |
| C-5.2-10 | SHOULD | publisher | III · The item document | A publisher SHOULD NOT bake one; quote the item whole, or the prose either side. |
| C-5.3-01 | MUST | reader | III · The item document | Readers MUST treat unknown kinds as unknown constructs: ignore the item, don't reject the feed or archive cont… |
| C-5.3-02 | SHOULD | publisher | III · The item document | Fragments: publishers SHOULD cap `content_md` at 2,000 characters (RECOMMENDED studio-enforced cap: 1,000). |
| C-5.3-03 | MUST | reader | III · The item document | Enforcement is publisher-side only — readers MUST NOT reject long fragments. |
| C-5.3-04 | MUST | reader | III · The item document | The feed's `<title>` element is derived (§7); a leading markdown heading in `content_md` is content, not a tit… |
| C-5.3-05 | MUST | publisher | III · The item document | A **truncation** — to a cap, for a derived feed title (§7), for an excerpt — MUST NOT produce an unpaired surr… |
| C-5.3-06 | MUST | publisher | III · The item document | A publisher MUST NOT publish a version of a fragment as a thread, or of a thread as a fragment. |
| C-5.3-07 | SHOULD | client | III · The item document | A client that creates items on an author's behalf SHOULD create threads, since only the author can say that an… |
| C-5.4-01 | SHOULD | publisher | III · The item document | `media` entries carry `url` (relative to the origin or absolute), `mime`, and SHOULD carry `alt`. |
| C-5.4-02 | MUST | publisher | III · The item document | Media objects are immutable once published: a media URL MUST always serve the same bytes. |
| C-5.5-01 | MAY | publisher | III · The item document | `author` is OPTIONAL, per-item, **client-asserted, and opaque**: |
| C-5.5-02 | SHOULD | publisher | III · The item document | `name` (display string) is RECOMMENDED, `url` OPTIONAL; **any additional members are permitted and unspecified… |
| C-5.5-03 | MUST | reader | III · The item document | Readers MUST accept any object here and MUST NOT reject an item over its `author` contents. |
| C-5.5-04 | MUST | publisher | III · The item document | It is scoped to `(origin, value)`: equal values from different origins MUST NOT be treated as the same entity. |
| C-5.5-05 | MUST | client | III · The item document | Clients that store or re-emit item JSON MUST carry `author` verbatim, never synthesized or rewritten. |
| C-5.6-01 | MAY | publisher | IV · Forks and lineage | *(Reserved at 0.1 and 0.2; defined at 0.3.)* An item MAY carry a top-level `forked_from`: a reference (§5.9) t… |
| C-5.6-02 | MUST | publisher | IV · Forks and lineage | `origin` is REQUIRED, even when it is the publisher's own — a citation is absolute. |
| C-5.6-03 | MUST | publisher | IV · Forks and lineage | The referenced version MUST be pinned at its origin, i.e. fetchable as `{origin}items/{id}/v{n}.json`. |
| C-5.6-04 | SHOULD | publisher | IV · Forks and lineage | Publishers SHOULD check this at publish time with one conditional fetch, and SHOULD refuse to publish on **evi… |
| C-5.6-05 | SHOULD | publisher | IV · Forks and lineage | A network failure, timeout, or 5xx is evidence of nothing; refusing to publish an author's own words because a… |
| C-5.6-06 | MUST | client | IV · Forks and lineage | Lineage is fixed when the item is created and is **immutable**: it never changes across versions, and a client… |
| C-5.6-07 | SHOULD | sender | IV · Forks and lineage | Lineage across origins is a remote reference and SHOULD send a mention (§15.2), whose relation is `fork`. |
| C-5.6-08 | MUST | reader | IV · Forks and lineage | Readers MUST NOT infer that a fork still resembles its source. |
| C-5.6-09 | SHOULD | client | IV · Forks and lineage | (Forking a quoted fragment directly, naming the fragment's own pin, remains the way to take one passage with i… |
| C-5.6-10 | MUST | client | IV · Forks and lineage | A client MAY note that state beside the quote when it holds it, and MUST NOT need the network at publish to de… |
| C-5.6-11 | MUST | publisher | IV · Forks and lineage | The `blyg-transclusion` class MUST NOT survive into the fork: the forking publisher baked nothing and verified… |
| C-5.6-12 | SHOULD | publisher | IV · Forks and lineage | **A fork's page SHOULD show its lineage** (revision of 2026-10-06, decision #65): a publisher that renders an … |
| C-5.7-01 | SHOULD | publisher | IV · Generation provenance | What the wire gains is generation's **provenance shadow**: a publisher whose version contains machine-generate… |
| C-5.7-02 | MAY | publisher | IV · Generation provenance | The array MAY be empty, meaning **no sources declared**: pure instructed generation, or generation whose sourc… |
| C-5.7-03 | SHOULD | publisher | IV · Generation provenance | `model` and `at` are RECOMMENDED. |
| C-5.7-04 | MAY | publisher | IV · Generation provenance | A span MAY be the whole body. |
| C-5.7-05 | MUST | publisher | IV · Generation provenance | The array MUST NOT carry instruction text or any other pre-generation authoring state — instructions are studi… |
| C-5.7-06 | SHOULD | publisher | IV · Generation provenance | A publisher that knows a span is machine-generated SHOULD disclose it regardless of who ran the model; the con… |
| C-5.7-07 | MUST | publisher | IV · Generation provenance | Publishers additionally disclose generated spans in the rendered HTML: the renderer MUST wrap each generated s… |
| C-5.7-08 | MAY | publisher | IV · Generation provenance | Each entry is a reference (§5.9): `origin` omitted for the publisher's own items and present for another origi… |
| C-5.7-09 | SHOULD | publisher | IV · Generation provenance | A `sources[]` entry carrying an `origin` is a remote reference and SHOULD send a mention (§15.2) whose relatio… |
| C-5.7-10 | MAY | publisher | IV · Generation provenance | No data attributes are REQUIRED: span-level source mapping is deliberately not promised (the JSON provenance i… |
| C-5.7-11 | SHOULD | client | IV · Generation provenance | A client that makes generated spans visible SHOULD say, wherever it explains the mark, that the disclosure is … |
| C-5.7-12 | MUST | publisher | IV · Generation provenance | Drawn-upon material is woven into new prose, not quoted: a source reference MUST NOT appear in `transclusions`… |
| C-5.7-13 | MUST | publisher | IV · Generation provenance | Generated output may carry a directive on a line of its own, which transcludes at publish like any other (§10.… |
| C-5.8-01 | MAY | publisher | III · The item document | *(New in 0.3.)* An item document MAY carry `"page"`: the **URL of the item's human-readable permalink**, origi… |
| C-5.8-02 | SHOULD | reader | III · The item document | Readers SHOULD use `page` when present, and MAY fall back to the reference convention (`f/{id}/` for fragments… |
| C-5.8-03 | SHOULD | publisher | III · The item document | A permalink page SHOULD carry `<link rel="alternate" type="application/json" href="{origin}items/{id}.json">`. |
| C-5.8-04 | SHOULD | publisher | III · The item document | **`page` SHOULD be stable for the life of the item** (revision of 2026-10-03, decision #56). |
| C-5.8-05 | SHOULD | publisher | III · The item document | A publisher that must move a page SHOULD serve a redirect from the old path. |
| C-5.8-06 | MAY | reader | III · The item document | Readers MAY refresh `page` from the item document on any fetch (the staleness check fetches it anyway), and a … |
| C-5.8-07 | MAY | publisher | III · The item document | **`page` MAY be absolute** (new in 0.4; promoted from the 0.3 text's §16.6e). |
| C-5.9-01 | MUST | publisher | IV · The reference | It is REQUIRED in `forked_from` and `stub_of` (a citation is absolute) and OPTIONAL in `transclusions[]` and `… |
| C-5.9-02 | MAY | publisher | IV · The reference | A reference MAY additionally carry the human half of a citation, `cited`, defined next — and nothing else. |
| C-5.9-03 | MAY | publisher | IV · The reference | A reference MAY therefore carry an OPTIONAL `cited` object: the label the citing publisher saw when it made th… |
| C-5.9-04 | MUST | publisher | IV · The reference | `retrieved` is REQUIRED whenever `cited` is present — a citation without a date is not a citation. |
| C-5.9-05 | SHOULD | publisher | IV · The reference | `source` (the target blyg's title as seen), `author` (the target's own `author.name`, passed through under §5.… |
| C-5.9-06 | MUST | receiver | IV · The reference | Mention verification (§15.4) reads the three identity members alone and MUST NOT consult `cited`. |
| C-5.9-07 | MUST | reader | IV · The reference | Readers MUST NOT present it as verified or as the target's current state, MUST NOT bake it into `content_html`… |
| C-6.1-01 | MAY | publisher | III · Manifest and index | The `blogroll` key is OPTIONAL: an origin-relative path, canonically `"blogroll.opml"`, present only when the … |
| C-6.1-02 | MAY | publisher | III · Manifest and index | The `webmention` key (new in 0.3) is OPTIONAL: the URL of the publisher's Webmention endpoint, origin-relative… |
| C-6.1-03 | MAY | publisher | III · Manifest and index | `level` and `generator` are informative (§3.2), and so is **`generator_url`** (new in 0.3): OPTIONAL, one abso… |
| C-6.1-04 | MUST | reader | III · Manifest and index | Publishers SHOULD emit it; readers MUST NOT gate on it; its absence means only that nothing was stated. |
| C-6.1-05 | MUST | publisher | III · Manifest and index | It is a SHOULD and will never be a MUST — a required field that readers may not act on would be a conformance … |
| C-6.1-06 | MAY | publisher | III · Manifest and index | A registry MAY require a client source as a condition of *listing*; that is its business, not conformance. |
| C-6.1-07 | MUST | publisher | III · Manifest and index | **Members** (revision of 2026-10-17, decision #76; checked against all 22 live manifests, which conform): REQU… |
| C-6.1-08 | MAY | publisher | III · Manifest and index | Two further OPTIONAL keys, in [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570) level-1 form, say where docum… |
| C-6.1-09 | MUST | reader | III · Manifest and index | Readers MUST expand them wherever this document says `{origin}items/{id}.json` or `{origin}items/{id}/v{n}.jso… |
| C-6.1-10 | MAY | publisher | III · Manifest and index | All four values MAY carry a query string, because they are expanded or fetched, never resolved against. |
| C-6.1-11 | MAY | publisher | III · Manifest and index | The `hoppers` key (new in 0.4, decision #86) is OPTIONAL: an array of the publisher's **public** hoppers, pres… |
| C-6.1-12 | MUST | publisher | III · Manifest and index | Each entry carries `title` (REQUIRED), `page` (REQUIRED, the hopper's page) and `feed` (OPTIONAL, its hopper f… |
| C-6.1-13 | MUST | publisher | III · Manifest and index | A hopper that is not public MUST NOT be listed. |
| C-7-01 | SHOULD | publisher | III · The feed | The window SHOULD be bounded (RECOMMENDED: 50 entries). |
| C-7-02 | MUST | publisher | III · The feed | A feed entry for an older publish event keeps its own `blyg:version` and note, but its `<description>` MUST ca… |
| C-7-03 | MUST | publisher | III · The feed | RSS requires the element, so publishers MUST emit one, and it MUST NOT be read back as an item field. |
| C-7-04 | SHOULD | publisher | III · The feed | The RECOMMENDED derivation, which the reference client uses, is the publish event's changelog note followed by… |
| C-7-05 | MUST | publisher | III · The feed | Its earlier publish events MUST be dropped from the window (with content withheld they would render as empty n… |
| C-7-06 | MAY | publisher | III · The feed | A publisher MAY prepend a rendered citation or lineage line to `<description>` so that plain RSS readers see w… |
| C-7-07 | MUST | publisher | III · The feed | `<description>` HTML MUST be self-contained — which `content_html` already is (§5.2: every URL absolute) — wit… |
| C-7-08 | SHOULD | publisher | III · The feed | When an item's `author.name` is present, the publisher SHOULD emit `<dc:creator>` (`xmlns:dc="http://purl.org/… |
| C-7-09 | MUST | publisher | III · The feed | Publishers MUST emit it. |
| C-7-10 | SHOULD | publisher | III · The feed | A publisher SHOULD publish the thread last, so that it is the newest entry, and readers MAY fold the burst (§1… |
| C-7-11 | SHOULD | publisher | III · The feed | A publisher SHOULD NOT serialize the opaque `author` object itself into the XML: the state plane is ground tru… |
| C-7-12 | MUST | reader | III · The feed | Later versions add elements to this same namespace under the reader ignore rule (§13.1); the protocol version … |
| C-8-01 | MUST | publisher | III · Pins | Once pinned, the file MUST return 200 forever — including after the item is withdrawn. |
| C-8-02 | MAY | publisher | III · Pins | Any published version with content MAY be pinned, including retroactively (exposing withheld history is the pu… |
| C-8-03 | MUST | publisher | III · Pins | Withdrawal endcaps (§9) MUST NOT be pinned — there is nothing to cite. |
| C-8-04 | MUST | publisher | III · Pins | **Media referenced by any pinned version MUST be retained forever.** |
| C-8-05 | SHOULD | publisher | III · Pins | A pinned file SHOULD carry the assertion as published with that version, but both serve-time and publish-time … |
| C-8.4-01 | MUST | publisher | III · Pins | The same rule bounds what a public page's version display may offer: every version it exposes — as a link, or … |
| C-8.4-02 | MUST | publisher | III · Pins | A version display MUST NOT offer, imply, or hint at access to unpinned history. |
| C-8.4-04 | MAY | publisher | III · Pins | Additionally, a publisher **MAY** serve a rendered page for each pinned version at the item's permalink path p… |
| C-8.4-06 | MUST | publisher | III · Pins | Pinned pages are **not** publish events: they MUST NOT appear in `feed.xml`, the archive index, or `items/inde… |
| C-8.4-07 | MUST | reader | III · Pins | Readers MUST NOT require these pages — the subscribe side works entirely from the JSON surfaces. |
| C-8.4-08 | SHOULD | publisher | III · Pins | The page SHOULD carry `rel="canonical"` pointing at the live permalink. |
| C-9-01 | SHOULD | sender | VI · Mentions | A withdrawn stub stops *verifying* as a stub, because its endcap omits `stub_of`, and SHOULD re-send its menti… |
| C-9-02 | MUST | publisher | III · Withdrawal | An endcap MUST NOT carry `stub_of` (§10.6) or a `generated` array (§5.7): mention verification relies on the f… |
| C-10.1-01 | MUST | client | IV · The grammar | `![[id@vN]]` (explicit version) is **reserved**: publishers at this version MUST reject it at publish time; re… |
| C-10.1-02 | SHOULD | publisher | IV · The grammar | It is **disclosed on the wire** (revision of 2026-10-19, decision #79, which reverses #32): each resolved link… |
| C-10.1-03 | MUST | publisher | IV · The grammar | An unresolvable link MUST be a publish error, like an unresolvable directive. |
| C-10.1-04 | MAY | publisher | IV · The grammar | In either form the id MAY be followed by `\|` and text: `[[7c9wk2mhq0v3xj8tn5rzfd41bg \| the opening fragment]… |
| C-10.1-05 | MAY | reader | IV · The grammar | On a **directive** it is the author's name for the quoted item (revision of 2026-10-19, decision #81; until th… |
| C-10.1-06 | MUST | reader | IV · The grammar | A reader MUST NOT present it as the target item's title, or as anything but the quoter's words (§5.3, decision… |
| C-10.1-07 | MAY | client | IV · The grammar | A client MAY tell the author when a label no longer resembles its target, as a courtesy; the protocol checks n… |
| C-10.1-08 | MUST | client | IV · The grammar | The two forms above, with or without a label, are the whole of the bracket grammar: brackets whose first 26 ch… |
| C-10.1-09 | MUST | client | IV · The grammar | A client-private authoring form inside brackets — a span to be minted as its own fragment, an alias to be reso… |
| C-10.1-10 | MUST | publisher | IV · The grammar | A publisher MUST NOT publish a fragment whose `content_md` contains a directive line; it is a publish error, a… |
| C-10.1-11 | MUST | publisher | IV · The grammar | When the publisher holds no `page` for the target, the `href` is the absolute URL of the target's **item docum… |
| C-10.2-01 | MUST | client | IV · Resolution at publish | Each directive MUST resolve, in this order, to: |
| C-10.2-02 | MUST | client | IV · Resolution at publish | A directive with an attached blockquote (§10.1) resolves exactly as a whole directive — same order, same snaps… |
| C-10.2-03 | MAY | reader | IV · Resolution at publish | Any reader MAY re-check by the same test while the origin serves that version, live or pinned. |
| C-10.2-04 | MUST | client | IV · Resolution at publish | A thread MUST NOT transclude a local thread whose transitive *local* transclusion closure contains the publish… |
| C-10.2-05 | SHOULD | client | IV · Resolution at publish | A studio SHOULD say at publish when a directive resolves to an unpinned remote item. |
| C-10.2-06 | MUST | publisher | IV · Resolution at publish | **More than one imported match MUST be a publish error**, never a guess — the directive names an identity, and… |
| C-10.2-07 | MUST | publisher | IV · Resolution at publish | A directive that carries a label (§10.1) additionally bakes `data-blyg-label="{label}"`, the label verbatim an… |
| C-10.2-08 | MUST | reader | IV · Resolution at publish | A reader MUST NOT resolve a directive or a link in another origin's `content_md` in order to display the item:… |
| C-10.2-09 | MUST | publisher | IV · Resolution at publish | A **local** id — a draft or a published item — MUST NOT fall through to step 2: an imported document with the … |
| C-10.2-10 | MUST | publisher | IV · Resolution at publish | The held HTML is baked as it is, with one exception: a URL in it that is not absolute — the source was non-con… |
| C-10.2-11 | MUST | publisher | IV · Resolution at publish | The closure MUST be walked through the **versions actually baked** — from each `transclusions[]` entry to that… |
| C-10.3-01 | MUST | publisher | IV · Quotes and links | A partial transclusion's entry (§10.1, §10.2) additionally carries an OPTIONAL `selector` (revision of 2026-10… |
| C-10.3-02 | SHOULD | sender | IV · Quotes and links | A remote entry is a **remote reference** and SHOULD send a mention to its origin (§15.2), whose relation is `t… |
| C-10.3-03 | MUST | reader | IV · Quotes and links | Readers at L2 MUST scope a transclusion's `id` to its `origin` when present, and to the document's own origin … |
| C-10.3-04 | MUST | publisher | IV · Quotes and links | Mention verification (§15.4) MUST NOT consult it, as it does not consult `cited`; a reader that ignores it ent… |
| C-10.3a-01 | SHOULD | publisher | IV · Quotes and links | A remote entry is a **remote reference** for §15.2 and SHOULD send a mention, whose relation is `link` (§15.4)… |
| C-10.3a-02 | MUST | publisher | IV · Quotes and links | A markdown link to a blyg page is not an entry (§10.1): the array records the bracket grammar and nothing else… |
| C-10.3a-03 | MUST | reader | IV · Quotes and links | Readers MUST scope `id` to `origin` as §13.1 requires, and MAY ignore the array entirely; a 0.3 reader does. |
| C-10.3a-04 | SHOULD | sender | IV · Quotes and links | A sender SHOULD NOT send a mention for a same-origin entry, here or for any other reference (§15.2): there is … |
| C-10.6-01 | MAY | publisher | IV · Stubs | A thread document MAY carry a top-level `"stub_of"`, in one of two shapes: |
| C-10.6-02 | MUST | publisher | IV · Stubs | for a blyg target — a reference (§5.9), `origin` REQUIRED even when it is the publisher's own, because a citat… |
| C-10.6-03 | MUST | publisher | IV · Stubs | At publish, if the body transcludes the stub's target, `stub_of.version` MUST equal the version actually baked… |
| C-10.6-04 | SHOULD | sender | IV · Stubs | A blyg-target stub is a **remote reference** when its origin is not the publisher's own, and SHOULD send a men… |
| C-10.6-05 | SHOULD | sender | IV · Stubs | A `{url}` stub SHOULD send an ordinary W3C Webmention to that URL if the target advertises an endpoint; most w… |
| C-10.6-06 | MUST | publisher | IV · Stubs | An L0 wrapper's id (§13.6) is a reader-local name for someone's RSS entry, not an item at an origin, and the b… |
| C-10.6-07 | MUST | publisher | IV · Stubs | Either shape MAY carry the `cited` object of §5.9 — the blyg-target shape since §5.9 named `stub_of` as a site… |
| C-10.6-08 | MUST | receiver | IV · Stubs | `stub_of` is the machine-readable response marker, and readers and receivers MUST NOT infer a stub relation fr… |
| C-10.6-09 | MUST | publisher | IV · Stubs | The value is monotonic: it MUST NOT decrease (decision #76, conformance finding F17). |
| C-11-01 | MAY | publisher | III · The blogroll | *(OPTIONAL at every level.)* The blogroll is the protocol's **static discovery plane**: a curated, published l… |
| C-11-02 | MAY | publisher | III · The blogroll | The manifest advertises the file via the OPTIONAL `blogroll` key (§6.1). |
| C-11-03 | SHOULD | publisher | III · The blogroll | Publishers SHOULD also emit `<link rel="blogroll" href="…">` on the HTML feed page. |
| C-11-04 | MUST | reader | III · The blogroll | It is whatever subset of their reading the publisher chose to publish; readers and crawlers MUST NOT treat it … |
| C-11-05 | SHOULD | client | III · The blogroll | Clients SHOULD treat inclusion as opt-in per subscription, defaulting to excluded — publishing a reading choic… |
| C-12-01 | MUST | reader | V · From a URL to a subscription | Readers that subscribe MUST implement the following procedure in this order. |
| C-12.1-01 | SHOULD | reader | V · From a URL to a subscription | HTTPS is expected; readers MAY permit `http:` (local development) but SHOULD warn. |
| C-12.1-02 | MUST | reader | V · From a URL to a subscription | Readers MUST support the HTML `<link>` element here; supporting an equivalent HTTP `Link` header is OPTIONAL. |
| C-12.1-03 | SHOULD | publisher | V · From a URL to a subscription | (Publishers whose blyg mounts away from their front page SHOULD emit this link on pages they expect to be shar… |
| C-12.1-04 | MUST | publisher | V · From a URL to a subscription | This is a courtesy fallback only — publishers MUST NOT rely on it. |
| C-12.1-05 | SHOULD | reader | V · From a URL to a subscription | Otherwise resolution fails, and the reader SHOULD report the trail of URLs tried. |
| C-12.1-06 | MUST | publisher | V · From a URL to a subscription | **The same manifest MUST also be served at `{identity}blyg.json`** (§4), as the manifest itself or by a redire… |
| C-12.1-07 | SHOULD | reader | V · From a URL to a subscription | A reader SHOULD let the user choose the whole blyg instead. |
| C-12.2-01 | MUST | reader | V · From a URL to a subscription | If `site` disagrees with the fetch origin, the reader SHOULD surface the discrepancy and MUST NOT adopt the as… |
| C-12.2-02 | SHOULD | reader | V · From a URL to a subscription | **Redirects:** follow a bounded number (RECOMMENDED: 5); the *final* URL wins as origin. |
| C-12.2-03 | MAY | reader | V · From a URL to a subscription | **Re-resolution:** readers MAY re-run resolution when a subscription's surfaces 404 persistently (the blyg may… |
| C-12.2-04 | MUST | reader | V · From a URL to a subscription | Adopting a new origin is an **identity change** and MUST be user-confirmed, never automatic. |
| C-12.2-05 | MUST | publisher | V · From a URL to a subscription | When a later manifest no longer lists the feed, the reader stops polling it and treats its entries as gone; it… |
| C-12.2-06 | MUST | publisher | V · From a URL to a subscription | An origin written into any document — a document's own `origin`, a reference (§5.9), `moved_from`, a baked `da… |
| C-12.2-07 | MUST | reader | V · From a URL to a subscription | This is what a WHATWG URL parser serializes, and an implementation without one MUST write the same string. |
| C-12.3-01 | SHOULD | reader | V · Reconciliation | Readers SHOULD poll with conditional requests (`If-None-Match` / `If-Modified-Since`) and honor `304`. |
| C-12.3-02 | MUST | reader | V · Reconciliation | Readers SHOULD back off exponentially on repeated failure, SHOULD honor `Retry-After` on 429/503, and MUST NOT… |
| C-12.3-03 | SHOULD | reader | V · Reconciliation | Readers SHOULD send an identifying `User-Agent`, and the reference client derives its user agent from its `gen… |
| C-13.1-01 | MUST | reader | V · Reconciliation | MUST treat item documents as ground truth and the feed as a lossy signal. |
| C-13.1-02 | MUST | reader | V · Reconciliation | MUST roll up by `blyg:id`: highest `version` wins; ties are broken by `updated`. |
| C-13.1-03 | MUST | reader | V · Reconciliation | MUST treat a withdrawal endcap as roll-up-to-null (§13.4). |
| C-13.1-04 | MUST | reader | V · Reconciliation | MUST ignore unknown kinds, unknown JSON members, unknown `blyg:*` XML elements, and reserved constructs, witho… |
| C-13.1-05 | MUST | reader | V · Reconciliation | MUST NOT reject an item over its `author` contents, and MUST NOT treat equal `author` values from different or… |
| C-13.1-06 | SHOULD | reader | V · Reconciliation | SHOULD backfill from `items/index.json` when the feed window has been missed; a reader offline for any duratio… |
| C-13.1-07 | MUST | reader | V · Reconciliation | MUST scope everything it learns to the origin: ids, authors, and trust do not transfer across origins. |
| C-13.1-08 | MUST | reader | V · Reconciliation | MUST NOT gate any behaviour on `generator` or `level` (§3.2). |
| C-13.2-01 | SHOULD | reader | V · Reconciliation | Readers SHOULD also reconcile against the index periodically regardless of suspicion (it is one file). |
| C-13.2-02 | MUST | reader | V · Reconciliation | Poll failures of any kind MUST NOT alter stored item state. |
| C-13.2-03 | SHOULD | reader | V · Reconciliation | A 404 on `items/index.json` from an otherwise-live blyg is a nonconforming publisher: readers SHOULD fall back… |
| C-13.2-04 | SHOULD | reader | V · Reconciliation | Readers MAY queue such versions at low priority and SHOULD NOT resurface them as new (the reference client's *… |
| C-13.2-05 | MAY | reader | V · Reconciliation | A version whose text differs from its predecessor by less than a **reader-local** threshold MAY be treated und… |
| C-13.2-06 | MAY | reader | V · Reconciliation | A fetched document that §15.4's repost test reduces to nothing — directive lines, attached selections, labels … |
| C-13.2-07 | SHOULD | publisher | V · Reconciliation | An unparseable *entry* SHOULD be skipped individually — the containing feed is not rejected (the §13.1 ignore … |
| C-13.2-08 | SHOULD | client | V · Reconciliation | The threshold has no place on the wire, and a client SHOULD NOT advertise it anywhere, so that no author can w… |
| C-13.3-01 | MUST | reader | V · Reconciliation | The reader MUST NOT silently adopt it, SHOULD surface the discrepancy, and MAY offer a **user-confirmed** rese… |
| C-13.3-02 | SHOULD | reader | V · Reconciliation | Content ground truth wins: the reader SHOULD adopt the fetched content, but SHOULD record and surface the disc… |
| C-13.3-03 | SHOULD | reader | V · Reconciliation | Readers SHOULD verify `content_hash` against `content_md` on import. |
| C-13.3-04 | SHOULD | reader | V · Reconciliation | The reader SHOULD record and surface the discrepancy and MAY decline to adopt the version. |
| C-13.3-05 | SHOULD | client | V · Reconciliation | A client re-resolving a quote of such an item at publish (§10.2) SHOULD tell the author before baking it. |
| C-13.4-01 | MUST | reader | V · Retention | On a withdrawal endcap, a conforming reader rolls the item up to null: it MUST stop presenting the withdrawn c… |
| C-13.4-02 | MAY | reader | V · Retention | **Retention follows the origin's own serving surface**: content corresponding to a version the origin has **pi… |
| C-13.5-01 | MUST | client | V · The duties of display | A client that both subscribes and publishes MUST keep the two planes separate: |
| C-13.5-02 | MUST | client | V · The duties of display | They MUST NOT appear in the publisher's `feed.xml`, `items/index.json`, or as `items/{id}.json` documents, in … |
| C-13.5-03 | MAY | client | V · The duties of display | A client MAY **display** imported content publicly as curation — a shown list, with source attribution and lin… |
| C-13.5-04 | MAY | reader | V · The duties of display | A site that wants to present a group of blygs in one place is a reader with a public face: it displays curated… |
| C-13.5-05 | MUST | reader | V · The duties of display | (a) MUST serve one only for a public hopper and MUST name it in that hopper's manifest entry (§6.1); a hopper … |
| C-13.5-06 | MUST | reader | V · The duties of display | (b) MUST NOT use the `blyg:` namespace anywhere in it — no `<blyg:manifest>` on the channel, no `blyg:id` or `… |
| C-13.5-07 | MUST | reader | V · The duties of display | (c) MUST carry every current member: the feed is the list, not a window; an item leaving the hopper, or rolled… |
| C-13.5-08 | MAY | publisher | V · The duties of display | (d) each entry is one membership: `<guid isPermaLink="false">`, stable for the life of the membership and deri… |
| C-13.5-09 | SHOULD | publisher | V · The duties of display | The hopper page SHOULD carry `<link rel="alternate" type="application/rss+xml">` to the feed and SHOULD carry … |
| C-13.6-01 | MUST | reader | V · Legacy feeds | Synthetic ids are never valid blyg ids and MUST NOT be exported or re-emitted in any protocol surface. |
| C-13.6-02 | SHOULD | client | V · Legacy feeds | Clients SHOULD mark L0 items visibly as wrapped legacy content. |
| C-13.6-03 | MUST | reader | V · Legacy feeds | It differs in one place: a reader MUST drop an entry that no longer appears, because §13.5 rule (c) makes abse… |
| C-13.6-04 | MAY | reader | V · Legacy feeds | A reader MAY follow an entry's `<link>` through §12 to the member's origin and item, a separate act with its o… |
| C-13.7-01 | SHOULD | reader | V · Ordering | Readers SHOULD ensure a skewed or future-dated origin cannot permanently dominate the display order. |
| C-13.7-02 | MAY | reader | V · Ordering | **Items published together MAY be shown together** (revision of 2026-10-17, decision #78). |
| C-13.7-03 | MUST | reader | V · Ordering | A reader MAY present such a burst as one publication — the thread as its entry, the items it names (of either … |
| C-14-01 | SHOULD | reader | VII · Security and privacy | This is the same standing as every other self-asserted claim above, and readers SHOULD present remote quotes a… |
| C-14-02 | MUST | reader | VII · Security and privacy | The reference implementation renders markdown with raw HTML escaped and sanitizes imported HTML before baking … |
| C-14-03 | SHOULD | reader | VII · Security and privacy | Server-side readers SHOULD apply standard fetch hygiene: bounded redirects (§12.2), response size and time lim… |
| C-14-04 | SHOULD | reader | VII · Security and privacy | Ordering across origins is each reader's own observation-time policy, which §13.7 says SHOULD keep a skewed or… |
| C-14-05 | MUST | reader | VII · Security and privacy | A reader MUST NOT pass a `math` element through unexamined, which is §14's existing rule said of the place it … |
| C-14-06 | SHOULD | reader | VII · Security and privacy | A reader SHOULD isolate every attributed string and every baked quote directionally (`dir="auto"` on the eleme… |
| C-14-07 | SHOULD | publisher | VII · Security and privacy | A publisher SHOULD NOT publish unpaired bidi controls. |
| C-14-08 | MUST | reader | VII · Security and privacy | Identity is the origin string, always: a reader MUST NOT treat visual similarity as identity, and SHOULD displ… |
| C-15-01 | MAY | publisher | VI · Mentions | *(New in 0.3. OPTIONAL at every level.)* The blogroll (§11) is the static half of discovery: who a publisher c… |
| C-15.1-01 | SHOULD | publisher | VI · Mentions | Permalink pages and the feed page SHOULD carry `<link rel="webmention" href="…">` and SHOULD announce the endp… |
| C-15.2-01 | SHOULD | sender | VI · Mentions | A publisher SHOULD send a mention for each **remote reference** in a newly published version: every blyg-targe… |
| C-15.2-02 | SHOULD | sender | VI · Mentions | A `{url}` stub SHOULD send an ordinary Webmention to that URL. |
| C-15.2-03 | SHOULD | sender | VI · Mentions | A network failure or 5xx is retried with backoff — RECOMMENDED 15 minutes, 1 hour, 4 hours, 12 hours, 24 hours… |
| C-15.2-04 | MUST | sender | VI · Mentions | Delivery is **fire-and-forget from the author's point of view**: publish MUST NOT block on it, and outbound st… |
| C-15.2-05 | MAY | sender | VI · Mentions | A version that both quotes and draws on one target MAY send a single mention for it; the receiver determines t… |
| C-15.2-06 | MUST | sender | VI · Mentions | A sender MUST NOT construct a target from the reference permalink convention (`f/{id}/`, `t/{id}/`): §4 calls … |
| C-15.2-07 | MAY | sender | VI · Mentions | **A pin MAY re-send** the pinned version's remote mentions (decision #73), so that a quoted origin can learn i… |
| C-15.3-02 | SHOULD | receiver | VI · Mentions | RECOMMENDED: more than 60 mentions from one source host in an hour. |
| C-15.3-03 | SHOULD | receiver | VI · Mentions | Receivers SHOULD therefore also cap by a coarser grouping of the source (the reference client groups by regist… |
| C-15.3-04 | MUST | receiver | VI · Mentions | Both MUST be absolute `http(s)` URLs; `source` MUST differ from `target`; `target` MUST resolve, by the receiv… |
| C-15.3-05 | MUST | receiver | VI · Mentions | A claim refused by any cap MUST be answered 429 and SHOULD NOT be queued. |
| C-15.4-02 | MUST | receiver | VI · Mentions | If it is HTML, find `<link rel="alternate" type="application/json">` (§5.8) and fetch that; it MUST be a blyg … |
| C-15.4-04 | SHOULD | receiver | VI · Mentions | A mention that verified before and fails now becomes **gone**; the receiver SHOULD keep the record with that s… |
| C-15.4-05 | SHOULD | receiver | VI · Mentions | Verification is bounded — RECOMMENDED: at most 2 fetches, or 3 when the source origin's manifest must be read … |
| C-15.4-06 | MUST | receiver | VI · Mentions | **The item document's final URL MUST be exactly `{origin}items/{id}.json` for the document's own `origin` and … |
| C-15.4-07 | SHOULD | sender | VI · Mentions | A 0.3 receiver reports such a mention as **failed**, which is correct for it, and a sender SHOULD read that fa… |
| C-15.4-08 | SHOULD | receiver | VI · Mentions | After the relation is found, a receiver SHOULD classify a `stub` or `transclusion` mention whose source docume… |
| C-15.5-01 | MAY | publisher | VI · Mentions | A publisher MAY display verified mentions of an item publicly — a "responses" list on a permalink page — and i… |
| C-15.5-02 | MUST | receiver | VI · Mentions | Notices are held apart: they MUST NOT appear in a responses list, MAY be shown as "linked from" or "reposted b… |
| C-15.5-03 | MUST | receiver | VI · Mentions | A receiver MUST NOT publish one automatically, and MUST NOT put one in the feed, the archive index, or any ite… |
| C-15.6-01 | MUST | publisher | VI · Mentions | A receiver MAY accept mentions whose source is not a blyg item document, verified the W3C way (the source page… |
| C-15.7-01 | MAY | client | VI · Mentions | It may still *send* — a static export is produced by some dynamic studio, which can send at export time — but … |
