# R4 — What Level 3 touches in the existing protocol

**Exploration, not a plan of record.** Written 2026-11-12 by Opus 5.5 for the 0.5 design
round (decision #99), task R4 of [`docs/l3-research-brief.md`](../../docs/l3-research-brief.md).
Nothing here is ruled. It contains no spec text.

**Source read:** `docs/protocol-v0.4.md` at its twelfth revision (the text in the repo on
2026-11-12, end to end, §1–§16.14), plus `plans/private-items-proposal.md` §5 and §8,
`docs/rfcs/rfc-5-enterprise-deployment.md` §3.3 and §10, and locked decisions #1, #7, #11,
#12, #13, #19, #93, #94 and #99. No outside research: this document is about the text alone.

**Method.** For every construct, the question was: does the text assume that whoever fetches
an item's bytes can read them? Where it does, the table says what encryption does to that
assumption and what the options are. "Encrypted item" below means only what #99's starting
design says: an item whose readable content travels as ciphertext in ordinary static files,
decryptable by a reader who holds a key. Nothing here presumes which parts are encrypted;
that is question A, and most rows show how its answer moves them.

Short names used in the options:

- **Clear** — the member stays in plaintext on the wire.
- **Sealed** — the member moves inside the encrypted payload.
- **Placeholder** — the REQUIRED member carries a valid, readable stand-in (for example a
  sentence saying the item is for subscribers) and the real content is sealed elsewhere.
- **Refuse** — the publisher makes the construct a publish error in this situation.

## 1. The six assumptions the text rests on

Most rows below are instances of six assumptions. Naming them first makes the table shorter
and shows which commitments each design choice strains.

1. **Content members are plaintext and REQUIRED.** `content_md`, `content_html` and
   `content_hash` are REQUIRED on every item document and every pinned file (§5 member
   table, §8). A Level 2 reader that ignores unknown members still reads these three.
2. **The hash is SHA-256 over plaintext `content_md`, unsalted** (§5.1). Readers verify it
   (§13.3), compare it across versions to detect maintenance (§13.2), and #35 builds
   author signatures on it.
3. **Every reader can reach every word.** The feed carries full `content_html` (§7);
   resolution, verification and staleness checks are anonymous fetches (§12, §15.4, §5.9);
   the reader's own derived judgements (maintenance, reposts, near-sameness, bursts) read
   `content_md` (§13.2, §15.4, §13.7).
4. **Quoting copies the words into the quoter's bytes** (§10.2). The baked snapshot, the
   partial quote's `selector.exact` (§10.3) and `cited.excerpt` (§5.9) all put the target's
   words into a different document, under the quoter's audience.
5. **References are readable by strangers** — receivers verify mentions by reading
   `stub_of`, `transclusions[]`, `forked_from`, `generated[].sources[]` and `links[]`
   in the source's document (§15.4), and readers walk them (§16.6d).
6. **Promises are about bytes, forever.** "200 forever" (§4), pins (§8), `cid` (§16.9) and
   media immutability (§5.4) promise the same bytes indefinitely; withdrawal is
   cooperation, not cryptography (§9, §14).

## 2. The audit table

Columns: **Construct** · **§** · **What the text assumes** · **What encryption does to it**
· **Options** (with their main cost). Rows are in section order.

### 2.1 Framing, levels, surface

| Construct | § | Assumes | Encryption does | Options |
|---|---|---|---|---|
| Level table, L3 row | §3 | L3 is "*(future)* Encrypted/permissioned content"; levels are strict supersets; readers ignore what they do not understand | An L3 item met by an L2 reader must still be "a valid document and a valid feed entry" (brief commitment 6). Whatever is sealed, the REQUIRED members (§5) must still be present and valid | (a) Placeholder content in the REQUIRED members, sealed payload in a new member — L2 readers show the placeholder. (b) A new `kind` — §5.3 makes L2 readers *ignore the item entirely*, which is valid but shows nothing and drops it from their archive. (c) Ciphertext in `content_md` — L2 readers display base64 as prose; hash check passes but the reader shows garbage |
| Version key `"blyg"` | §3.1 | Informative; readers accept any `0.x` | Nothing breaks. #43 makes L3 a new version because readers that want to decrypt must change | None needed; noted for completeness |
| `level`, `generator` informative; readers MUST NOT gate on them | §3.2, §13.1 r8 | A reader learns what a document contains by reading it | A reader cannot decide "this item is encrypted" from `level: 3`; it must be visible in the document itself | The marker of encryption has to be a document member (or kind), not the manifest's `level` |
| Static-file surface | §4 | "The entire surface MUST be servable as plain static files"; the Webmention endpoint is the one dynamic exception (#13) | Ciphertext is static and fits. A key-issuing or key-unwrapping service is a second dynamic surface | Off-protocol keys keep the surface static. A ride-along key file is static. A key endpoint *named by the protocol* (manifest key, URL template) is a second carve-out to #1 like #13's |
| "Same bytes for everyone" | §4 (F1, #93) | What an origin serves does not depend on who asks | Satisfied by ciphertext: every reader gets the same ciphertext. Strained by per-reader key files fetched under auth, or per-subscriber feed URLs (the Substack/Patreon pattern; see R1) | Keep all key material either public-but-wrapped or off the surface. A per-reader URL on the surface is C2 under another name (refused, #93 F4) |
| 404/200 rules | §4 | An item document is 404 until published, 200 forever after | An encrypted item is "published" to everyone, including non-holders: its document answers 200. Its existence is therefore public | Accept (existence public, content private); or serve sealed items from a separate surface (another origin or a non-indexed path), which is the N-origins shape of RFC-5 and loses per-item granularity |
| Permissive CORS | §4 | JSON/XML readable cross-origin | Ciphertext under CORS is harmless. A key endpoint under `*` CORS lets any page request keys with the reader's cookies only if credentials are allowed — `*` forbids credentials, which is protective | If a key endpoint exists, its CORS policy is a security decision the round should name |
| Timestamps ISO UTC | §4 | Public | `created`, `updated`, changelog `at` stay readable and reveal when sealed items are written and edited | Clear (accept the timing leak) or seal `changelog` (then §13.2/§13.7 lose their inputs for non-holders) |

### 2.2 The item document (§5)

| Construct | § | Assumes | Encryption does | Options |
|---|---|---|---|---|
| Member table: `content_md`, `content_html`, `content_hash`, `media` REQUIRED | §5 | Present and meaningful | See §3 row options (a)–(c). REQUIRED-ness is the hard constraint for commitment 6 | Placeholder in the three, a new OPTIONAL sealed member (name and shape for the round); or make them OPTIONAL for an L3 kind (breaks every L1 reader's schema) |
| `id` 128 random bits | §5.1 | — | No leak: ids are random, not content-derived | None |
| `content_hash` = `sha256(content_md)` | §5.1 | Hash of the plaintext readers read (#20's "the hash covers exactly what readers read") | **If the hash stays over plaintext and in the clear, anyone can confirm a guess.** An unsalted SHA-256 of a short fragment is a dictionary target: "yes", a stock quote, a leaked draft, or a suspected copy of another origin's text can each be tested offline with one hash. Equal hashes also link identical text across items and origins. This is the "confirmation of a file" attack documented for convergent encryption (see R2) | (i) Hash over plaintext, **sealed** (inside the payload) — holders verify, non-holders see nothing; then the clear `content_hash` must be something else. (ii) Hash over **ciphertext** in the clear — integrity of the bytes served, no guess confirmation; but re-encryption with a fresh nonce changes it, so §13.2's maintenance test and #35's signatures change meaning (see those rows). (iii) **Keyed** hash (HMAC under a content-derived or item key) — holders can compare across versions, non-holders cannot test guesses; not a plain stdlib SHA-256 but HMAC is in every stdlib. (iv) Salted hash with the salt sealed. Question B |
| `content_hash` over the placeholder | §5.1 | — | If option (a) of §3 is used, the clear `content_hash` covers the placeholder text — truthful for an L2 reader (it covers what that reader reads) and useless as integrity for the sealed payload | Two hashes: the clear one over what an L2 reader reads, a sealed one over what a key holder reads. This keeps #20 literally true for both audiences |
| `version` counter | §5.2 | +1 per publish event, visible | Visible counter reveals edit frequency of a sealed item | Accept (it is needed for staleness, §5.9, and the watermark, §13.3) |
| Withheld history | §5.2 | Only the latest content is served unless pinned | Unchanged in shape. With sealed content, "withheld" now has two layers: unpinned versions are not served at all, and served versions are unreadable without a key | None; but note a key-holder who saved each version has history the origin withholds — the same as any reader today |
| `changelog[].note` | §5.2 | A note is public prose; it becomes the feed `<title>` (§7); depth rule forbids reproducing unpinned text | A note on a sealed item, in the clear, may describe the sealed content ("added the paywalled chart") — it leaks by description, and the depth rule says nothing about encryption | (i) Notes clear; the studio warns. (ii) Notes sealed per entry; the clear changelog keeps `version`, `at`, `pinned`. Then the feed title (§7) needs a clear derivation and readers without keys see no notes. (iii) A clear "public note" and a sealed note — two notes per entry |
| Depth rule (note between pinned versions may be full) | §5.2 | Pinned = public, so nothing is withheld between two pins | **A pinned sealed version is not public.** "Any reader can fetch both files" stays true of ciphertext but not of text. A full note between two sealed pins reproduces sealed text in the clear | The depth rule would need an encryption clause: a note in the clear may not reproduce sealed content even between pins |
| `changelog[].generated` | §5.2 | Self-asserted flag | Unaffected | None |
| `updated` | §5.2 | Equals latest `at` | Timing leak as above | As timestamps |
| `content_html` self-contained, absolute URLs | §5.2 | Every URL absolute | Inside a sealed payload this still holds and is invisible. In a placeholder it holds trivially. The links inside sealed HTML (to media, to other items) are hidden from non-holders — good — but also from every party that reads HTML to learn the graph | None needed |
| Kinds; unknown kinds ignored | §5.3 | `fragment`, `thread`, `withdrawn` | A new kind (e.g. a sealed kind) is ignored by L2 readers — the item disappears for them rather than showing a placeholder; also the feed would carry `blyg:kind` they do not know | Keep `fragment`/`thread` and mark sealing elsewhere (keeps L2 display) vs a new kind (cleaner parsing, item invisible to L2). Note that `kind` itself in the clear reveals short-form vs long-form |
| Fragment length cap | §5.3 | 2,000 characters SHOULD | Ciphertext length reveals plaintext length to within the AEAD overhead (see R2), so a sealed fragment reveals roughly how long it is | Padding to buckets (cost: bytes) or accept |
| Titleless items | §5.3 | No title; feed `<title>` derived | A sealed item has no readable excerpt to derive a title from | The clear feed title comes from the placeholder or a clear note; question I |
| `media[]`: `url`, `mime`, `alt` | §5.4 | Media files are public, immutable, fetched by URL | **Media bytes are a separate static file.** Sealing `content_md` while leaving `media/x.png` in the clear publishes the image. `mime` and `alt` describe the content | Encrypt each media object (its own key or derived), seal `alt`; `mime` could be a generic type. Media immutability (§5.4) and pin retention (§8 r4) then apply to ciphertext media. Large media pushes toward streaming/chunked AEAD (R2) |
| `author` opaque, OPTIONAL | §5.5 | An unverified assertion, public | A clear byline on a sealed item reveals who wrote the sealed text | Clear (the byline is the publication's face) or sealed; #11 is not touched either way |
| Feed `dc:creator` | §7, §5.5 | From `author.name` | As above | Follows the `author` choice |
| `forked_from` must name a **pinned** version; publisher SHOULD check with one fetch | §5.6 r2 | The pin is fetchable and readable | The check is a fetch of ciphertext and still works for *existence*. The fork's content is copied from the pinned document's text — the forker must hold a key, and the fork then republishes that text **in the clear** under the forker's audience | (i) Refuse forks of sealed items in the forker's client (client policy). (ii) Allow, as #93 F3 allows quoting across a boundary — "anything published can be quoted". (iii) The fork is itself sealed (inherits an audience); key handling for the forker's audience is then the forker's. Lineage (`forked_from`) in the clear reveals the relation either way |
| Fork flattening reads pinned `content_html` | §5.6 r6 | The flattener can read the bake, including `blyg-partial` classes and `data-blyg-*` | A flattener without the key cannot flatten a sealed thread at all; with the key, flattening re-publishes quoted words in the clear (see §10.2 row) | Same as above |
| Fork page shows lineage | §5.6 r7 | Link to the pinned source | Link points at a page a reader may not be able to read | Presentation; note only |
| `generated[].sources[]` | §5.7 | Sources are named references; a remote source sends a `source` mention | (a) A sealed item fed to a generator: the **derived prose is published in the generating item's audience**, which may be public — paid text paraphrased by a model into the clear. (b) The `sources[]` entry in the clear reveals that a sealed item was drawn on. (c) A sealed item that is itself generated: its `generated[]` in the clear reveals model and sources | (a) is the generation analogue of the quoting row (§10.2); the same options apply (refuse by client, allow and disclose, inherit the audience). (b)/(c): `generated` clear or sealed — if sealed, a receiver cannot verify a `source` mention (see §15.4 row) |
| `blyg-tk-gen` wrapper | §5.7 | In `content_html` | Sealed with the HTML if `content_html` is sealed | None |
| `page` | §5.8 | A public HTML permalink; `rel="alternate"` to the JSON | The page of a sealed item is either a placeholder page or a page that **decrypts in the browser** with script served by the same origin (see R7 for what that protects) | Presentation, but R7 must cover the in-browser-decrypt page: the origin that serves the script can serve script that exfiltrates the key |
| `page` stability; readers MAY refresh `page` | §5.8 | — | Unaffected | None |
| Reference shape `{origin,id,version}` | §5.9 | Machine identity; staleness check fetches `{origin}items/{id}.json` and compares `version` | Staleness still works for anyone — `version` stays clear. A reference **to** a sealed item from a public item reveals the relation | Clear by necessity if staleness and mentions are to keep working |
| `cited` — `excerpt`, `author`, `source`, `url` | §5.9 | Caption of the target as seen, frozen, ~200 chars | **An `excerpt` of a sealed target is up to 200 characters of sealed text, in the clear, in the citer's document.** `author` passes through the target's byline | Client policy (do not excerpt a sealed target; a clear `cited` may carry `source` and `retrieved` only) or a protocol rule. Question G |

### 2.3 Manifest, index, feed (§6, §7)

| Construct | § | Assumes | Encryption does | Options |
|---|---|---|---|---|
| Manifest members | §6.1 | Public, REQUIRED `blyg`, `title`, `updated` | Unaffected. A place where a key endpoint, payment URL or public key would be named if the protocol names one | Ride-along or "protocol names the key endpoint" designs add a manifest member here; off-protocol designs add nothing |
| Manifest `author` (publication identity) | §6.1 | Public | Unaffected | — |
| `hoppers` list | §6.1 | Public hoppers only | A hopper whose members are sealed items | See §13.5 row |
| Manifest locates the surface (`item`, `pin` templates) | §6.1 | Templates expand to static paths | A sealed item at a different template (a separate path for sealed documents) is possible; it does not hide existence if the index lists the id | Note only |
| Archive index: "every item ever published, including withdrawn, no window" | §6.2 | Complete by construction; reconciliation surface (§13.2) | **The index reveals the existence, kind, creation time, update time and version count of every sealed item**, and their number. That is the count commitment 4 worries about — not of readers, but of private items | (i) List sealed items like any other (honest, reconciliation unchanged, counts public). (ii) A separate index file per audience (static; its existence and size reveal the audience's item count; reconciliation splits). (iii) Omit sealed items (breaks "every item ever published" and makes a key holder's reconciliation lossy). (iv) Pad with decoys (cost: bytes, dishonest-looking entries, conformance oddity) |
| Feed: one `<item>` per publish event; "no quiet publish" | §7 | Every publish event is announced; "an event the feed omits is content hidden from subscribers" | Either sealed items appear in the one public feed (timing and count public; plain RSS readers see placeholders), or they are omitted (contradicts the no-quiet-publish rule as written) | (i) Announce in the public feed with placeholder description. (ii) A separate feed per audience — static, same bytes for everyone, contents sealed or placeholder; its URL in the manifest or off-protocol. (iii) Omit and amend §7 |
| Feed `<description>` MUST carry latest `content_html` | §7 | Full self-contained HTML | For a sealed item: placeholder HTML, or ciphertext (no RSS reader can use it), or nothing | Placeholder is the only option that keeps commitment 6 for plain RSS. A per-subscriber private feed URL (the newsletter pattern) gives plain RSS readers the plaintext but breaks "same bytes" and puts a per-reader URL on or beside the surface (R1, R7) |
| Feed `<title>` derived from note + excerpt | §7 | Note and excerpt are public | The excerpt half would leak sealed text | Derive from the placeholder or a clear note only |
| GUID per version | §7 | — | Unaffected | — |
| `<link>` = item page | §7 | — | Points to a placeholder or decrypting page | Presentation |
| Withdrawn item: one entry, empty | §7 | — | Unaffected | — |
| Optional citation/lineage line prepended to `<description>` | §7 | Presentation | Might quote a sealed target's caption | Client policy |

### 2.4 Pins, withdrawal (§8, §9)

| Construct | § | Assumes | Encryption does | Options |
|---|---|---|---|---|
| Pin = irrevocable promise of exact bytes | §8 r1 | The bytes are the content; citable by anyone | **A pinned sealed version is ciphertext promised forever.** Consequences: (1) it can never be re-encrypted under a new key without breaking the pin's bytes, so key rotation does not reach pinned versions; (2) it is public ciphertext forever, so "harvest now, decrypt later" applies (R2's post-quantum page); (3) if the publisher loses the key, the promise is kept and useless (R3 "Loss") | (i) Pins of sealed versions allowed; the promise is ciphertext. (ii) Pins limited to public versions (as `private-items-proposal.md` §8 item 3 already says for private/group: "pins make no sense below public") — then citations of sealed items have nothing durable to point at. (iii) A pin promises ciphertext *and* a key-escrow promise (out of protocol) |
| Pinned file carries `content_md`, `content_html`, `content_hash`, `transclusions`, `generated`, `stub_of`, `forked_from` | §8 r5 | Same as live document | Same sealing choices as the live document, frozen | Whatever §5 rows choose |
| Media of pinned versions retained forever | §8 r4 | — | Ciphertext media retained forever; same key-loss and rotation consequences | As above |
| `author` outside the pin promise | §8 r6 | — | Unaffected | — |
| Pins are the only thing a reader may retain past withdrawal | §8 r7, §13.4 | Retention follows the origin's serving surface | A reader holding a key and a pinned ciphertext may retain the decrypted text "because the origin still serves those bytes" — but the origin serves ciphertext, and may have meant revocation to stop that reader | The round must say whether revocation is a retention event like withdrawal (§13.4) — a cooperative rule for conforming readers, unenforceable by crypto |
| Pinned HTML pages, content verbatim | §8.4 | Rendered `content_html` | A sealed pin's page is a placeholder or a decrypting page | Presentation |
| `cid` of pinned bytes; third-party mirrors | §16.9 | Mirrors are within §13.4 | Mirrors replicate ciphertext to IPFS indefinitely; the CID addresses ciphertext | Note: a `cid` on a sealed pin makes the ciphertext durable beyond the origin — strengthens harvest-now-decrypt-later |
| Withdrawal endcap empties content | §9 | — | Unaffected; endcap of a sealed item is an ordinary endcap | — |
| "Withdrawal is cooperation, not cryptography" | §9, §14 | Honest about copies | Revocation has the same shape: a reader who decrypted once keeps the plaintext. Encryption does not change this; it adds a second cooperative event (revocation) | Say so in the same sentence (question F) |
| Withdrawal is reversible | §9 | — | Unaffected | — |

### 2.5 Threads, transclusion, links, stubs (§10)

| Construct | § | Assumes | Encryption does | Options |
|---|---|---|---|---|
| `[[id]]` link and label | §10.1 | Resolves at publish; anchor to absolute page; label is the author's words in `content_md` | A public item linking to a sealed one reveals the relation and the author's label for it; the link points at a page non-holders cannot read | Clear (a link carries no target words); `links[]` entry follows the same choice |
| Resolution order: local item, else imported snapshot | §10.2 | The publisher holds a readable snapshot | A publisher without a key holds ciphertext and cannot bake a quote. A publisher with a key holds plaintext | Resolution against a sealed import either requires the key or fails as a publish error |
| **Baking the snapshot into `content_html`** | §10.2 | The quoted item's HTML is copied into the quoter's document | **This is the main leak.** Quoting a sealed item from a public thread publishes the sealed words in the clear under the quoter's audience, with provenance pointing at the source. #93 F3 already accepted this for the enterprise boundary as client policy ("anything published can be quoted…") | (i) Client policy, as F3: a client refuses or warns. (ii) A protocol rule: a directive naming a sealed target MUST be a publish error unless the quoting item is sealed to an audience no wider than the target's — but the protocol cannot know audiences without identity (#11). (iii) Bake a placeholder (the quote shows "sealed passage" and the reference) — a new bake shape. (iv) The quoting item is itself sealed, and the baked quote rides inside the quoter's payload under the quoter's key |
| Partial quote: selection must be a substring of the target's text content; readers MAY re-check | §10.2 | The checker can read the target | Non-holders cannot re-check; holders can. The publisher's own check is unchanged if it holds the key | Accept; the re-check is already opportunistic (#76 F2) |
| **`selector.exact`, `prefix`, `suffix` in `transclusions[]`** | §10.3 | Selector is the normalized selection text | **`selector.exact` is sealed text in the clear** if `transclusions[]` is in the clear — even when the quoting item's `content_html` is sealed. A sealed thread with clear references still leaks every passage it quotes | Seal `selector` with the payload; keep `{origin,id,version}` clear for verification (see §15.4 row) |
| `data-blyg-*` attributes on the bake | §10.2 | Readable by any reader; used for nested discovery (§16.6d) | Sealed with `content_html` if it is sealed; then nested chains are invisible to non-holders | None needed |
| `blyg-transclusion`, `blyg-partial` permanent tokens | §10.2 | — | Unaffected | — |
| Local closure check | §10.2 | Walks the publisher's own baked versions | Unaffected (the publisher holds its own plaintext) | — |
| Republish re-resolves; withdrawn unretained source is a publish error | §10.2 | — | A source whose key the quoter has lost (revocation, expiry) is unresolvable on republish — **a revocation behaves like a withdrawal for the quoter**, and the quoter's thread cannot be republished until the directive is removed | The round should say whether loss of access is a publish error like withdrawal (consistent) or whether the old bake may stand |
| `transclusions[]` provenance | §10.3 | Clear list of what was baked | In a sealed thread, a clear list reveals what the sealed thread quotes | Clear `{origin,id,version}` (needed for verification and staleness) vs sealed (mentions cannot verify) |
| `links[]` | §10.3a | Clear list; remote entries send `link` mentions | Same trade as `transclusions[]` | Same |
| Snapshot independence; no auto-pin | §10.4 | Baked bytes survive source changes | Baked plaintext of a sealed item in someone else's public thread survives revocation and withdrawal | Nothing new: §14 already says it; encryption does not undo a bake |
| Staleness direct check | §10.4 | Any client fetches the target's document | Works on `version`, which stays clear | — |
| Thread feed entries carry full baked HTML | §10.5 | — | Placeholder or sealed | As §7 |
| `stub_of` (blyg target) | §10.6 | A clear marker naming one target | A public stub of a sealed item reveals that someone responded to it. A sealed stub with a clear `stub_of` reveals what it responds to | Clear (verification needs it) or sealed (no verification). The stubber's body may quote the sealed target — see the bake row |
| `stub_of` `{url}` + `cited` | §10.6 | — | Same as `cited` row | — |
| Version agreement (`stub_of.version` = baked version) | §10.6 r3 | — | Unaffected | — |
| Misuse paragraph; reposts | §10.6, §15.4 | — | See §15.4 repost row | — |

### 2.6 Blogroll, resolution (§11, §12)

| Construct | § | Assumes | Encryption does | Options |
|---|---|---|---|---|
| Blogroll | §11 | Public curated OPML | Unaffected. A blogroll of paid blygs is a reading choice the publisher chose to show | — |
| Resolution | §12.1 | Anonymous GETs; ≤ 6 fetches | Unaffected for discovery. If key discovery rides along (manifest member), resolution is where a reader first learns an origin has sealed items | Note only |
| Identity = final fetch origin | §12.2 | — | A per-subscriber feed URL (newsletter pattern) at `https://x.example/feed/{secret}` would resolve to an identity that embeds a secret, and every reference the subscriber writes would name it — a leak of the secret into public documents | Keep per-reader URLs off the identity path; this is one concrete reason the newsletter pattern does not transplant |
| Polling, conditional requests, User-Agent | §12.3 | Anonymous | A key fetch, if it happens on the surface, is not anonymous: it identifies a reader to the origin at the moment of reading — the first per-reader signal the protocol would carry | Off-protocol keys move this outside the protocol's governance; ride-along wrapped keys fetched with the content avoid it entirely (everyone fetches the same key file) |

### 2.7 Reader conformance (§13)

| Construct | § | Assumes | Encryption does | Options |
|---|---|---|---|---|
| Item documents are ground truth | §13.1 r1 | Ground truth is readable | For a non-holder, ground truth is the placeholder plus ciphertext | Fine; ground truth is the document |
| Ignore unknown members | §13.1 r4 | — | This is what makes placeholder-plus-sealed-member work for L2 readers | — |
| Origin scoping | §13.1 r7 | Ids scoped to origin | Unaffected. If keys are per item, the key scope must be (origin, id) too — a key must not be reusable across an id that appears at two origins (mirrors) | Note for R3 |
| Index backfill | §13.1 r6 | — | Holders reconcile sealed items like any other if the index lists them | Depends on §6.2 choice |
| Maintenance = same `content_hash` as previous version | §13.2 | Hash over plaintext is stable across re-bakes | **If the clear hash is over ciphertext with a fresh nonce, every republish looks like new writing to every reader**, and a non-holder can no longer tell a re-bake from an edit. If the clear hash is over plaintext, maintenance detection works for everyone and so does guess confirmation | Deterministic encryption (same plaintext + key → same ciphertext; SIV modes, R2) restores same-hash detection at the cost of revealing equality across versions; a keyed plaintext hash restores it for holders only |
| Near-sameness threshold (reader-local) | §13.2 | Reader holds the previous `content_md` | Holders only | Accept |
| Repost-as-maintenance test | §13.2, §15.4 | Strips directives from `content_md` | Holders only; receivers without the key cannot classify | See §15.4 |
| Watermark; lower version = history rewrite | §13.3 | — | Unaffected (version is clear) | — |
| **Stealth edit** = same version, different `content_hash` | §13.3 | Hash stable for unchanged content | With randomized encryption, a re-serve of the same version re-encrypted would look like a stealth edit | Ciphertext must be produced once per version and served byte-identical, or the clear hash must not be over ciphertext |
| Readers SHOULD verify `content_hash` on import | §13.3 | The reader can compute it | Non-holders verify whatever the clear hash covers; holders verify the sealed hash | Two-hash option (§5.1 row) |
| Retention follows origin's serving surface | §13.4 | Readable copy = served copy | A holder's decrypted copy of an unpinned version: same rule as today (drop on withdrawal). New question: drop on **revocation**? | Round decides whether revocation is a cooperative retention event |
| Curation display; never re-emit; publicity is a property of the list | §13.5 | Displayed imported content is public anyway | **A holder who displays an imported sealed item in a public hopper page publishes it.** A hopper feed's `<description>` "an excerpt… never the held snapshot" — an excerpt of a sealed item is still sealed text | Client policy (a sealed import is never displayed publicly, or displayed by reference only); or a protocol rule in §13.5 |
| Aggregator / digest pattern | §13.5 | — | Same as above | Same |
| L0 wrapper | §13.6 | Plain RSS | A plain-RSS subscription to an L3 blyg's feed sees placeholders | Fine |
| Burst folding by `created` and `transclusions[]` | §13.7 | Readable `transclusions[]` | Works if `transclusions[]` stays clear | — |

### 2.8 Security, Webmention (§14, §15)

| Construct | § | Assumes | Encryption does | Options |
|---|---|---|---|---|
| §14 "Withdrawal is cooperation, not erasure"; "anything published can be quoted" | §14 | Honest about copies | Encryption narrows who can read, not what readers can copy | §14 would need the parallel sentence for keys |
| HTML safety: sanitize at render | §14 | — | Decrypted HTML is still publisher-supplied; a client that decrypts must sanitize after decryption. An in-browser decrypting page renders decrypted HTML into its own DOM | R7 |
| "The protocol's security surface is read-only except §15" | §14 | Only one dynamic surface | A key endpoint the protocol names would be a second | — |
| Resolution fetch hygiene | §14 | — | Applies to any key or payment URL a reader follows | — |
| Sending mentions; source = referencing page | §15.2 | Source page is fetchable | A sealed source page is fetchable (placeholder) | — |
| **Verification reads the source document's references** | §15.4 step 4 | `stub_of`, `transclusions[]`, `forked_from`, `generated[].sources[]`, `links[]` readable by the receiver, who is a stranger | **If references are sealed, no receiver can verify a mention from a sealed item** unless it holds the key. If references stay clear, any stranger can see what a sealed item cites | Clear references (verification works; the citation graph of sealed items is public); sealed references (sealed items cannot notify, which is honest — they are not public speech); a mixed form where the reference is clear only for remote targets that are themselves sealed to the same audience (needs audience knowledge) |
| Verification step 2: final URL equals `{origin}items/{id}.json` | §15.4 | — | Unaffected | — |
| Repost classification reads `content_md` | §15.4 | Receiver can read the source's words | A receiver without the key cannot tell a repost from a response | Treat unknown as response, or as notice; receiver policy |
| "No content is stored"; display fetches from origin | §15.4 step 5 | Display fetch returns readable text | Displaying a mention from a sealed source shows the placeholder | Fine |
| Per-item curation of responses | §15.5 | Public display of responses | A publisher displaying responses that came from sealed items would show placeholders and reveal that sealed items responded | Presentation |
| Static deployments do nothing | §15.7 | — | Unaffected | — |

### 2.9 §16 ruled shapes and adjacent surfaces

| Construct | § | Assumes | Encryption does | Options |
|---|---|---|---|---|
| Discovery through references | §16.6d | Readers walk baked layers and references | Walks stop at sealed payloads for non-holders | — |
| §16.7 reserves "Encrypted/permissioned content — L3" | §16.7 | — | This is the slot | — |
| §16.8 never: follower graph, metrics, a relation naming a person | §16.8 | — | **A public list of per-reader wrapped keys is a member list** (count, and possibly identity if a reader's public key is linkable). Commitment 4 | R3 enumerates; any ride-along design must answer this row |
| `pinned_at`, `cid` | §16.9 | — | See pin rows | — |
| Author-sized images | §16.10 | Attributes baked on `<img>` | Inside sealed HTML | — |
| Responding from anywhere (one-off snapshots) | §16.11 | Any URL can be stubbed | Stubbing a sealed item from a one-off fetch requires a key | — |
| Hopper feeds (excerpt, `<source>`) | §13.5, §16.12 | Excerpts are public | See §13.5 row | — |
| `moved_from` | §16.13 | Old origin keeps item documents | Key endpoints and wrapped-key files must move or stay with the documents they unlock | Note for R3 |
| `syndication` | §16.14 | Copies on other networks | A syndicated copy of a sealed item on a public network is a leak by the publisher's own act | Client policy |

### 2.10 Outside the spec text, but on the brief's list

| Surface | Assumes | Encryption does | Options |
|---|---|---|---|
| **blygger.com directory** (`blygger-com/`: resolver-validated listings, hourly health re-check, dedupe by item ids, OPML/Atom of listings) | Reads manifests, feeds and item ids anonymously | Unaffected for listing. Dedupe by item ids still works. Any future directory feature that reads content (search, summaries) sees placeholders | Directory policy only |
| **Conformance suites** (`conformance/clauses/`, `conformance/live/`, the publisher and reader suites of #48) | Clause checks such as "`content_hash` = sha256(`content_md`)", REQUIRED members present, feed description = latest `content_html` | Every clause that reads content must be re-stated for sealed items, and the live crawler will report today's sealed documents as nonconforming unless the clause set knows L3 | New clauses at 0.5; fixtures for placeholder + sealed payload |
| **tn-6 found-mentions** (reader lists mentions found in items it holds) | Reads held items' text | Holders only | — |
| **tn-7 comments sections** (comments are stubs, displayed by the house) | Public stubs | A comment on a sealed item quoting it publishes the quote in the commenter's origin | As the bake row |
| **Search engines and indexers** reading pages | Pages are public | Placeholder pages are indexed; a decrypting page with script is indexed as placeholder | Presentation |

## 3. Cross-cutting observations

These are findings about the shape of the problem, not recommendations.

1. **Three channels carry a target's words out of a sealed item into other documents:** the
   baked quote (§10.2), `selector.exact` (§10.3) and `cited.excerpt` (§5.9). A fourth carries
   them transformed: generation sources (§5.7). A fifth is the depth rule's "full note
   between pins" (§5.2). Any rule about quoting sealed items has to name all five, or say
   that it governs the bake only and leave the others to clients.
2. **The hash question has four users with different needs.** Integrity for holders (§13.3),
   maintenance detection for everyone (§13.2), author signatures (#35, §16.6b) and the
   "hash covers what readers read" principle (#20). An unsalted plaintext hash in the clear
   serves all four and enables guess confirmation. No single clear hash serves all four
   without that leak; two hashes (one over what an L2 reader reads, one sealed over what a
   holder reads) keep #20 literally true for both audiences.
3. **References are the protocol's public graph, and verification depends on them being
   readable** (§15.4). Sealing them makes sealed items silent; leaving them clear makes a
   sealed item's citations public. This is the same trade #93 F3 made at the enterprise
   boundary, now inside one origin.
4. **Existence, timing, size and count leak under every option that keeps sealed items on
   the ordinary surface** — through the index (§6.2), the feed (§7), the version counter,
   timestamps and ciphertext length. Hiding them needs either separate files per audience
   (which reveal per-audience counts instead) or padding and decoys.
5. **Pins and keys interact in one direction only.** A pin freezes ciphertext; nothing about
   a later key change can reach it. Rotation therefore protects only future versions, and
   key loss makes a kept promise worthless.
6. **The text already has a model for "a promise the protocol cannot enforce"** —
   withdrawal (§9, §13.4, §14). Revocation fits the same mould (a cooperative event that
   conforming readers honour and copies ignore). Whether the round wants that symmetry is
   question F.
7. **Commitment 6 (L2 readers see a valid document and feed entry) is cheapest to keep with
   placeholder content in the REQUIRED members.** A new `kind` keeps it only in the weak
   sense that the item is valid and ignored.

## Questions this raises for the design round

1. **A, I.** Do the REQUIRED content members carry a readable placeholder (which the author
   writes, like C1's redaction, #93 F4), a fixed generic sentence, or nothing — and is the
   placeholder the author's speech, hashed and quotable like any content?
2. **B.** Which of the hash's four users (§3 item 2) is the round willing to lose for
   non-holders? Is a second, sealed hash acceptable as a new member?
3. **A.** Are `changelog[].note`, `author`, `media[].alt`, `generated[]`, `transclusions[]`,
   `links[]` and `stub_of` clear or sealed — and is the answer per member or one rule
   ("references clear, words sealed")?
4. **G.** Which of the five word-carrying channels (§3 item 1) does the protocol govern, and
   does quoting a sealed item from a wider audience become a publish error, a placeholder
   bake, or client policy as at the enterprise boundary (#93 F3)?
5. **G, F.** Is losing access to a quoted sealed source a publish error on republish, as
   withdrawal is (§10.2)?
6. **F.** Is revocation a retention event for conforming readers (§13.4), and does §14 get a
   sentence saying it is cooperation, not cryptography?
7. **§6.2, §7.** Do sealed items appear in the one public index and feed (counts and timing
   public), in per-audience files, or not at all — and if not at all, how is §7's
   "no quiet publish" amended?
8. **§8.** May a sealed version be pinned? If so, does the protocol say anything about key
   durability, given that the ciphertext is promised forever?
9. **§15.4.** Can a sealed item send a verifiable mention? If not, is that stated as a
   feature (sealed items are not public speech)?
10. **§13.2, §13.3.** Is encryption deterministic per version (so re-serving is
    byte-identical and same-hash maintenance survives), and who checks that?
11. **Conformance.** Which clauses in `conformance/clauses/` change, and does the live
    crawler need an L3 mode before any node emits a sealed item?

## Own view (Opus 5.5, clearly marked; not a finding)

The cheapest coherent cut the text suggests is: references and counters clear, words
sealed, placeholder in the REQUIRED members written by the author, two hashes, and every
word-carrying channel out of a sealed item treated as client policy with one protocol
sentence in §14 — the same structure as #93 F3. That keeps verification, staleness,
reconciliation and L2 display working, and it is honest that a sealed item's existence,
size, timing and citations are public. The two places where I think the text forces a real
choice rather than a default are the hash (§5.1) and pinning sealed versions (§8).
