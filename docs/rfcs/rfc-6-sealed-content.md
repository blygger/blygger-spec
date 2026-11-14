# RFC-6 — Sealed content and permissions: covers on the wire, keys by lock, grants as files

**Request for comments · non-normative · OPEN FOR COMMENT until 2026-11-28 on
[blyg.blygger.org](https://blyg.blygger.org/t/194zwhh5036j2fxxk5b2hw3m81/) (#66); without a blyg, comment on [blygger-spec#34](https://github.com/blygger/blygger-spec/issues/34) ·
session 68, 2026-11-12; published session 70, 2026-11-14.** Drafted by Opus 5.5 at Venkat Rao's request from
[`docs/v0.5-plan.md`](../v0.5-plan.md) (the design direction of decisions #101 and #104)
and the Level 3 research in `plans/l3/` (R1–R7). Published together with
[RFC-7](rfc-7-payments.md), which depends on it (#104), **as Opus's draft, before Fable's
edit**, on Venkat's word: Fable's edits and rulings arrive as revisions during the comment
period. Like a technical note, an RFC
constrains nothing. When its comment period closes it becomes a technical note (#90), and
its constructs feed the 0.5 document once they are built and exercised (#21, #43). Written
against protocol 0.4 at its fifteenth revision; no pre-1.0 version promises anything
(#21).

**How to read the proposals.** The plan fixed the direction; it left names, shapes and
twenty-four questions open. Every choice this draft makes that the plan did not is marked
*Proposal (Opus)*. Section 9 lists the items to be ruled, each with its options, the
proposal and a test that would show the proposal right or wrong. Where the draft departs
from the plan, it says so and why (section 9 items 12, 23 and 24, and section 11).

## Summary

Level 3 begins with one mechanism: **sealed content**. An item document may carry
encrypted content beside the readable text, and a reader holding the right key reads it.

- **Covers on the wire, no new markup.** `content_md` carries only what a reader without a
  key reads: clear text and the author's own **covers** ("the acquirer", "restricted",
  a teaser). The sealed words live in an OPTIONAL `sealed` list on the item document.
  `content_html` wraps each cover in a new permanent class, `blyg-sealed`. A Level 2
  reader ignores the list and shows the covers, so every sealed item is a valid 0.4
  document and a valid feed entry. `content_hash` stays the hash of what a keyless
  reader reads.
- **One mechanism, three sizes.** A sealed span (a phrase or a block inside any item), a
  sealed item (one span covering the whole body), and a sealed item quoted with the
  existing `![[id]]` directive. Entries nest (AND) and carry several wraps (OR).
- **Keys by lock.** A **lock** is an opaque id naming a key. Holding the lock key is
  standing membership. An entry's key is wrapped under one or more lock keys, so the
  document names locks, never readers. No list of readers, of any size, is on the wire.
- **Grants as static files.** A **grant** wraps a lock key or one entry key to a recipient
  (an origin's published key, another lock, or a reader's bare **pass** key) and sits at
  a path only the granter and the recipient can compute. A reader probes with a GET.
- **A home answers requests.** A lock's **home** is a URL that answers requests for keys:
  granted, pending or refused. How it decides (a roster, a sign-on token, a person, a
  person's AI delegate, a payment) is private. The home is the protocol's second dynamic
  surface, OPTIONAL like the Webmention receiver.
- **Identity is the origin's.** An origin MAY publish one encryption-only public key in
  its manifest. Never a key per author, never a signing key.
- **Terms are a citation.** A reference to a stable document, in `stub_of`'s two shapes,
  may sit on a wrap, a grant, an item or the manifest. It is never enforcement and has no
  rights vocabulary.
- **Honest limits.** Revocation stops future grants and future content; nothing recalls
  what a reader already opened; a pinned sealed version keeps its wraps forever. A sealed
  item's existence, size class, timing, version count and citations are public.

**Proposals of this draft that the plan did not make** (section 9 has each in full):
AES-256-GCM, HKDF-SHA-256 and HPKE over X25519 as the one suite; a key commitment that
replaces the plan's clear `sealed_hash`, which would have let anyone confirm a guess at
the sealed text; an unchanged entry carried byte for byte into the next version, so that
"maintenance" stays computable and an entry key is per *content*, not per version; a text
selector on each span for markdown-rendering clients; a small **home document** carrying
the home's public key, from which grant paths are derived without contact; a live
answer only when the grant follows from what the request carried, never from who the
recipient is; and a correction to the plan from the rails themselves: **a 402 must not
be cached** (MPP requires `Cache-Control: no-store`), so "the same first answer for
everyone" means the same in substance, not cacheable bytes.

## 1. The question and the use case

Venkat opened Level 3 in session 64 (#99): privacy, encryption and paid access, as
protocol version 0.5. The session-66 round chose the first feature (#101): encrypted
content on the wire as static files, and permission to read it granted by rule, by a
person, or by a person's delegate. Payment is one more ground for a grant and is
[RFC-7](rfc-7-payments.md).

The use case (plan §1): ordinary information sharing inside an organisation, **with no
assumed structure**. Anybody can publish to the eligible population or any segment of it,
and decide for each segment who is pre-approved, who is approved or refused automatically,
and what goes to a person as an exception.

- **The first user is the Protocol Institute**, a decentralised organisation without
  single sign-on. Sign-on may be used where it exists and must never be required.
- **A traditional organisation** (one shared set of permission groups) and **a
  decentralised one** (every node keeps its own) must both fit, without the protocol
  knowing which it is looking at.
- **Across organisations and clients.** Requesting access from another organisation,
  using another client, is in scope.
- **Redaction is a main case**: a phrase inside a sentence, sealed to a narrower group
  than the sentence around it.

What the existing text already rules out, and this RFC keeps (RFC-5 section 10, #93):
per-reader bytes within one origin under any gate (C2, refused); split-horizon origins.
What it keeps open as client territory: a redacted wire with a fuller rendition off the
mount (C1). This RFC is the shape #93 named as where the Level 3 round starts: **C3,
encrypted static content**.

## 2. Vocabulary

| Term | Meaning |
|---|---|
| **Sealed entry** | One piece of encrypted content in an item document: ciphertext, the wraps that open it, and a commitment. |
| **Cover** | The readable text standing where sealed content is, written by the author. Ordinary published content: hashed, quotable, in the feed. |
| **Entry key** | The random key that decrypts one entry. Fresh whenever the sealed content changes. |
| **Lock** | An opaque random id naming a lock key. Holding the lock key is standing membership: it unwraps every entry key wrapped under it. The member list is never on the wire. |
| **Epoch** | One generation of a lock's key. The lock id is stable; each epoch has its own key. |
| **Wrap** | An entry key encrypted under one lock's key at one epoch, with the lock's home. |
| **Home** | The URL where a lock's keys are asked for. Not necessarily on the publishing origin. |
| **Home document** | *Proposal (Opus).* A small JSON file at the home URL: the home's public key and where its grant files and request URLs are. |
| **Grant** | A key (a lock key at an epoch, or one entry key) wrapped to one recipient, served as a static file. |
| **Recipient** | An origin (its manifest key), another lock (that lock's key), or a pass. |
| **Pass** | A bare public key a reader's client generates, used as a recipient by a reader with no origin. A bearer instrument. |
| **Ladder** | The home's private rules for deciding a request: pre-approved, automatic yes, automatic no, or ask a person or their delegate. |
| **About** | Optional plain text on an entry saying what is sealed. The seller's or author's own claim. Not the cover. |
| **Commitment** | A digest in the clear that binds an entry's key, ciphertext and description, so that one entry cannot show two readers two texts. |
| **Terms** | A reference to a stable document stating the terms under which a key is held or content is offered. A citation, never enforcement. |

Two grant sizes matter throughout: **a lock key** (standing membership, for an epoch) and
**one entry key** (a single exception).

## 3. The design on the wire

Field names are proposals unless the plan named them; the plan's own names (`sealed`,
`about`, `blyg-sealed`, `terms`) are kept. All of section 3 is new wire and therefore
Fable's to rule.

### 3.1 The `sealed` member, covers and the class

An item document gains one OPTIONAL top-level member, `sealed`, a list of entries.

```jsonc
{
  "blyg": "0.5",
  "id": "5q1k8w3zc7n0d2v9h6m4r8t2xa",
  "kind": "thread",
  "version": 4,
  "origin": "https://blyg.protocol-institute.org/",
  "content_md": "There is an acquisition offer from the acquirer. The board meets on Friday.",
  "content_html": "<p>There is an acquisition offer from <span class=\"blyg-sealed\" data-blyg-entry=\"e1\">the acquirer</span>. The board meets on Friday.</p>",
  "content_hash": "sha256:…",          // over content_md: what a keyless reader reads
  "sealed": [
    { "entry": "e1",
      "selector": { "exact": "the acquirer", "prefix": "offer from ", "suffix": ". The board" },
      "wraps": [
        { "lock": "k7f3m0q9…", "epoch": 2, "home": "https://keys.protocol-institute.org/",
          "key": "<entry key wrapped under lock k7f3 epoch 2>" }
      ],
      "commit": "<base64url SHA-256 commitment, §3.4>",
      "nonce": "<12 bytes, base64url>",
      "ct": "<AES-256-GCM ciphertext of the padded plaintext, base64url>" }
  ]
}
```

- **`content_md` carries only covers and clear text.** No new markup, no marker, no
  placeholder syntax: a cover is ordinary prose. This is the two-plane pattern of
  generation provenance (#20, §5.7): marker-free source, a list in the item document, a
  baked class in `content_html`.
- **`content_html` wraps each cover** in `<span class="blyg-sealed" data-blyg-entry="…">`
  (inline) or `<div class="blyg-sealed" data-blyg-entry="…">` (block). `blyg-sealed` is a
  **permanent wire token**, like `blyg-transclusion` and `blyg-tk-gen`. A reader holding
  the key replaces the element's contents with the decrypted content; every other reader
  shows the cover.
- **`content_hash` is unchanged in meaning**: SHA-256 of `content_md`, which is what a
  keyless reader reads. #20's "the hash covers exactly what readers read" holds for that
  reader. Section 3.4 gives the key holder its own integrity.
- **The authoring mark for a sealed span is studio-private**, as the generation grammar
  is (#20), and never reaches the wire.
- **A sealed item** is the case where one entry covers the whole body: `content_html` is
  one `blyg-sealed` block whose contents are the cover, and `content_md` is the cover.
  There is no new kind (#100 keeps the kind fixed, and a new kind would make every Level 2
  reader ignore the item rather than show its cover, R4 §2.2).
- **`selector`** *(Proposal (Opus); plan §9 item 5).* A span's entry carries the §10.3
  text-quote selector of its cover, so a client that renders from `content_md` can find
  the cover without parsing `content_html`. REQUIRED on a span, absent on a whole-item
  seal. The selector names cover text, which is public, so it leaks nothing.
- **`about`** *(the plan's shape; plan §3.1, §9 item 18).* An entry MAY carry plain text
  describing what is sealed, for a person or an agent deciding whether to ask or to buy.
  Free text only: no tags, categories, prices or structured fields. Plain like a label
  (#102), escaped by any renderer. *Proposal (Opus):* a cap of 300 code points (§5.3's
  unit, #103). Self-asserted and unverifiable before the key is held. **It is never the
  item's title** (#46): a reader MUST NOT present it as one or as anything but the
  publisher's description. One rule for a reader or an agent: **`about` if present, else
  the cover.** For a fully sealed item the cover is usually the natural abstract and
  `about` is absent; an author may use both, a teaser as cover and a factual
  description in `about`.

### 3.2 The plaintext is a content object

*Proposal (Opus).* An entry's plaintext, after decryption and unpadding, is a JSON object
with the same content members an item has, scoped to the span:

```jsonc
{ "content_md": "Northwind Capital",          // the sealed words, markdown
  "content_html": "Northwind Capital",        // self-contained, absolute URLs (§5.2, #53)
  "media": [ … ],                             // OPTIONAL: media only the sealed words use
  "generated": [ … ],                         // OPTIONAL: provenance of generated words inside
  "sealed": [ … ] }                           // OPTIONAL: nested entries (§3.5)
```

A reader holding the key substitutes `content_html` for the cover's contents, or
`content_md` for the cover in a markdown rendering. A block span's plaintext is block
content; an inline span's is inline. Why an object and not bare text: sealed words carry
their own media, their own generation provenance and their own nested entries, and those
must be inside the ciphertext or they leak (R4 §2.2, `media[]` and `generated[]` rows).

### 3.3 Algorithms

*Proposal (Opus); plan §9 item 3.* One suite, no negotiation, an `alg` member reserved so a
second suite can be added later (section 9 item 16):

| Use | Primitive | Why |
|---|---|---|
| Entry encryption | **AES-256-GCM**, 96-bit random nonce, 128-bit tag | The only AEAD in stable WebCrypto (R2 §1.1); in Go's stdlib and Python's `cryptography` |
| Wrap under a lock key | AES-256-GCM, its own random nonce, over the 32-byte entry key | One AEAD for everything; a wrap is 12 + 32 + 16 = 60 bytes, 80 characters in base64url |
| Wrap to a public key (grants) | **HPKE** (RFC 9180) base mode, DHKEM(X25519, HKDF-SHA256), HKDF-SHA256, AES-256-GCM | Composable from WebCrypto's X25519, HKDF and AES-GCM; native in Go 1.26 `crypto/hpke`; ≈ 80 bytes per grant (R3) |
| Key derivation, grant paths | **HKDF-SHA-256** (RFC 5869) | In WebCrypto and Go; ten lines over Python's `hmac` |
| Commitment | **SHA-256** | Every standard library |

Associated data binds each ciphertext to where it belongs, so an entry cannot be
transplanted into another item and pass for that item's own:

- entry: AAD = `"blyg-seal-v1" ‖ origin ‖ id ‖ entry`, the item's identity origin and id
  and the entry's id. **Not the version** (section 3.6 carries unchanged entries forward).
- wrap: AAD = `"blyg-wrap-v1" ‖ lock ‖ epoch ‖ commit`.

**Padding** *(Proposal (Opus); plan §9 item 4).* The plaintext object is serialised as
UTF-8 JSON, prefixed with its byte length as a 4-byte big-endian integer, and padded with
zero bytes to the next bucket: 256 bytes, then powers of two to 64 KiB, then multiples of
64 KiB. A three-word redaction and a forty-word one are the same 256 bytes; a reader of
the wire learns a size class, not a length. The cost: a short span costs about 380
characters of base64url in the document instead of about 60.

### 3.4 The commitment, and why the plan's `sealed_hash` is dropped

AES-GCM does not bind a key to a ciphertext: a publisher can craft one ciphertext that
decrypts validly under two keys to two texts and hand each to a different reader (the
"invisible salamanders" result, R2 §1.2). A later reveal would then prove nothing.

*Proposal (Opus); plan §9 items 2, 19, 23.*

```
desc   = SHA-256(UTF-8 of `about` if present, else the cover's text content)
commit = SHA-256("blyg-commit-v1" ‖ entry_key ‖ nonce ‖ SHA-256(ct) ‖ desc)
```

- **It binds the key.** Every holder checks the same clear `commit` against the key it
  was given; a second key for the same entry cannot match. This settles equivocation for
  every reader who checks.
- **It binds the ciphertext**, so a home cannot hand out a key for different bytes.
- **It binds the description the reader was shown** (`about`, else the cover's text
  content as §10.2 defines text content), so a buyer can show what was advertised
  against what was delivered (plan §3.1, #104).
- **It reveals nothing to a stranger.** The entry key is 256 random bits, so the digest
  cannot be inverted or tested against a guess.

**The plan's clear `sealed_hash` is dropped** (its §12.1 example; §9 items 1 and 23). A
hash of the sealed plaintext in the clear is exactly the guess-confirmation target R4
found for `content_hash`: anyone who suspects the redacted name is "Northwind Capital"
hashes the guess and compares. Inside the ciphertext it would add nothing to the AEAD's
own integrity. What a holder needs a second hash for, telling maintenance from new
writing, is given by section 3.6 instead.

### 3.5 Nesting (AND) and several wraps (OR)

- **Nesting is containment.** An entry's plaintext may carry its own `sealed` list (section
  3.2), to any depth, under any locks. A reader needs the outer key to learn that an inner
  entry exists. "More restrictive" is the author's intent, not something the protocol
  checks: locks are independent. A client SHOULD warn when an inner lock has members the
  outer one lacks.
- **Several wraps.** An entry's key may be wrapped under several locks. Any one opens it;
  which a reader used is local and unobservable. Locks compose by OR within an entry and
  by AND through nesting.
- **Each layer is checked.** An inner entry's AAD uses the same item origin and id, and
  its commitment is checked like any other.

### 3.6 Versions: unchanged entries are carried byte for byte

*Proposal (Opus); plan §9 items 1, 21; R4 §2.7.* A publisher that publishes a new version
in which an entry's sealed content and description are unchanged **MUST carry the entry
byte-identical** (same `entry`, `nonce`, `ct`, `commit`); it MAY change its `wraps` (add a
lock, move to a new epoch). An entry whose sealed content or description changed gets a
**fresh entry key** and a fresh nonce.

What follows:

- **Maintenance is per audience.** A Level 2 reader compares `content_hash`, which covers
  the covers: if the covers did not change, what it reads did not change, and §13.2's
  same-hash rule is correct for it. A Level 3 reader without the key also compares each
  entry's `commit`: a changed commitment means the sealed content changed. A holder
  compares the decrypted plaintext it holds. Nobody needs a clear hash of sealed text.
- **An entry key is per content, not per version.** A key bought or granted for an entry
  at version 3 still opens it at version 4 if the entry was carried. Corrections to the
  clear text cost a reader nothing (RFC-7 recommends that corrections to sealed text be
  free too).
- **Stealth edits stay detectable.** A changed `ct` under the same `version` is §13.3's
  stealth edit, detectable by anyone, because ciphertext is produced once per content and
  served byte-identical.
- **Re-wrapping is cheap.** Widening one entry to a new lock (section 5) is a new version
  that adds a wrap; the ciphertext and commitment do not change, so it reads as
  maintenance to everyone.

### 3.7 What stays clear

*Proposal (Opus); plan §9 item 6; R4's rows.* **References and counters clear, words
sealed**, member by member:

| Member | Proposal | Why |
|---|---|---|
| `id`, `kind`, `version`, `created`, `updated`, `changelog[].at`, `pinned` | clear | The watermark (§13.3), reconciliation (§13.2) and staleness (§5.9) need them. The timing leak is disclosed (section 7) |
| `content_md`, `content_html`, `content_hash` | clear; covers and clear text only | Level 2 display and the feed (#4) |
| `transclusions[]`, `links[]`, `stub_of`, `forked_from`, `generated[].sources[]` **identities** (`origin`, `id`, `version`) | clear by default | Mentions verify (§15.4) and staleness works only if a stranger can read them. The cost: a sealed item's citations are public |
| Any reference member that **carries words**: `selector`, `cited.excerpt`, `cited.author`, a directive's label | inside the plaintext when the quote or link sits in sealed text | These are sealed words in another field (R4 §3 item 1) |
| A reference that occurs only inside sealed text | clear by default; the author MAY list it inside the plaintext instead | Inside, it sends no mention and is invisible to strangers: silent, and honest about it |
| `media[]` | media used only by sealed words are listed inside the plaintext; their files are encrypted | A clear image beside a sealed caption publishes the image. Encrypted media: section 3.8 |
| `generated[]` | entries for clear generated text clear; entries for generated text inside a seal inside the plaintext | `model` and `sources` describe sealed words |
| `author` | clear | The byline is the publication's face (#11 untouched). A sealed byline is a sealed span in the prose |
| `changelog[].note` | clear, under a new depth-rule clause | A note is the feed title (§7). **A clear note MUST NOT reproduce sealed content, even between two pinned versions**: §5.2's allowance rests on both pins being public, and a sealed pin is not |
| `terms` | clear | A reader needs it before holding a key (section 3.12) |

### 3.8 Media

*Proposal (Opus).* A media file used only by sealed words is encrypted under its own random
key (AES-256-GCM, chunked in 64 KiB records for large files) and served as
`application/octet-stream` at an ordinary media path; its key, nonce and real `mime` and
`alt` are in the plaintext's `media` list. §5.4's immutability and §8 rule 4's retention
apply to the ciphertext file. The file's size class is visible; padding media is not
proposed.

### 3.9 Quoting sealed content

The plan's rule (§3.5): a quoter carries a sealed copy of what it quotes, needs no key,
and widens nobody's access.

*Proposal (Opus) for the shape:*

- **The bake is §10.2's, unchanged.** The quoter bakes the target's `content_html`
  verbatim, which contains the target's `blyg-sealed` elements and their covers.
- **The quoter's `sealed` list gains a copy of each entry the baked bytes contain**,
  byte-identical, plus one member saying where it came from:
  `"from": { "origin": "…", "id": "…", "version": n, "entry": "e1" }`, and an `entry` id
  local to the quoter.
- **Matching.** A `blyg-sealed` element inside a `blyg-transclusion` blockquote refers to
  the copied entry whose `from` matches the blockquote's `data-blyg-origin` (or the
  quoter's own origin), `data-blyg-id` and `data-blyg-version` and the element's
  `data-blyg-entry`. Nothing inside the bake is rewritten.
- **Decryption uses the source's AAD** (`from.origin`, `from.id`, `from.entry`), so a
  copy decrypts exactly as the original did and cannot be passed off as the quoter's own.
- **Nested quotes** carry nested copies: a thread quoting a thread that quoted a sealed
  item carries the copies the inner thread carried, with `from` chains intact.
- **Partial quotes.** A partial quote's selection is a substring of the target's text
  content, covers included. *Proposal:* a selection that includes any part of a cover
  MUST include the whole cover and carries that entry's copy; one that cuts a cover is a
  publish error. Whether a partial bake keeps the `blyg-sealed` element is section 9
  item 25.
- **Snapshot independence is kept** (§10.4): the copy does not depend on the source
  afterwards. Redactions survive quoting, key holders still see through, and quoting a
  sealed item into a thread for another audience does not widen who can read it.
  **Audience travels with the lock, not with the context.**
- **A span is bound to its document**: its AAD names the item. A passage that should be
  reusable on its own is made an item and quoted.
- **Fragments.** A fragment carries no directive (#102), so it never carries copies. A
  sealed fragment is a fragment whose plaintext obeys the fragment rules, including the
  length cap, counted on the plaintext's `content_md`.

### 3.10 Origin keys, the home document, and grant files

**The origin key.** An origin MAY publish one public key in its manifest:

```json
"encryption_key": { "alg": "X25519", "key": "<32 bytes, base64url>" }
```

It is the origin's, never an author's. It is for encryption only: it signs nothing and
claims no authorship (section 6). *Proposal (Opus)* for the name and shape; a rotated
origin key leaves earlier grants wrapped to the old one, so an origin keeps its old
private keys for as long as it wants to read them.

**The home document** *(Proposal (Opus); the plan's §3.6 needed a secret shared by home
and recipient and did not say where it came from).* A GET of the home URL returns:

```json
{ "blyg_home": "0.5",
  "key": { "alg": "X25519", "key": "<home's public key>" },
  "grants": "g/{path}",
  "request_lock": "l/{lock}",
  "request_entry": "e/{commit}" }
```

`grants`, `request_lock` and `request_entry` are RFC 6570 level-1 templates resolved
against the home URL, defaulting to the values shown (the manifest-template pattern of
#51). A static-only home omits the two request templates.

**Grant paths.** For a recipient with a public key (an origin or a pass):

```
shared = X25519(home private key, recipient public key)        // either side computes it
path   = base32(HKDF-SHA-256(shared, salt = home URL,
                info = "blyg-grant-v1" ‖ subject))[0..26]       // 128 bits, lowercase
subject = "lock:" ‖ lock ‖ ":" ‖ epoch      or      "entry:" ‖ commit
```

For a lock recipient (a lock-to-lock grant), `shared` is that lock's key at the epoch in
question, so every holder of lock B can compute where the grants to B are. **Pre-approval
needs no contact**: the home writes the grant before the recipient asks, and the
recipient finds it by computing the path.

**The grant file**:

```jsonc
// GET {home}g/{path}
{ "for": { "lock": "k7f3m0q9…", "epoch": 2 },     // or { "entry": "<commit>" }
  "key": "<HPKE-sealed key to the recipient>",    // or AES-GCM under lock B, for lock-to-lock
  "terms": { "origin": "…", "id": "…", "version": 2 },   // OPTIONAL: terms in force at grant
  "at": "2026-11-12T17:30:00Z" }
```

A reader probes with an ordinary GET: 200 is granted, 404 is not (yet). Nobody else can
tell which paths exist for whom, and there is no listing. A refusal MAY be delivered the
same way: a file at the same path holding `{"for": …, "refused": true, "note": "<sealed
to the recipient>"}`. A withdrawn grant is replaced by a lapse notice (section 5).

**Recipients are of three sorts.** An origin (its manifest key); a lock (lock-to-lock: every
holder of B also reads everything granted to B, which is how an organisation expresses
"the board reads whatever the executives read" with no hierarchy on the wire); a **pass**,
a bare X25519 public key the reader's client generates and sends with a request. A pass
gives a reader with no origin a static, re-fetchable grant with no account: the home
learns a key and nothing else. It is a **bearer instrument**: whoever holds the private
key holds the entitlement, it can be handed over, and it can be copied, which is no worse
than a shared key and is said plainly. A wallet's or a token's control of a pass is
evidence for the ladder, never a second key type on the wire.

### 3.11 The request endpoint

A lock's home MAY answer requests. It is a **second dynamic surface**, OPTIONAL at every
level, like the Webmention receiver (#13, §15.7). A static-only publisher issues grants
by hand, or homes its locks at a home someone else runs.

- **Two request URLs**, from the home document: one per lock (`{home}l/{lock}`, standing
  membership for the current epoch) and one per entry (`{home}e/{commit}`, one entry's
  key). *Proposal (Opus); plan §9 item 24:* the entry URL is keyed by the commitment,
  which already identifies one entry's content uniquely and is URL-safe.
- **The request** is a POST:

  ```json
  { "recipient": { "origin": "https://blyg.example.org/" },
    "note": "I'm on the audit committee",
    "evidence": [ { "type": "…", "value": "…" } ] }
  ```

  `recipient` is `{ "origin": … }` or `{ "pass": "<base64url X25519>" }`. `note` is
  untrusted text the home handles as data. `evidence` is opaque to the protocol: a
  sign-on token, a payment voucher, a signed acceptance of terms, whatever the home's
  ladder accepts.
- **Three answers**: **granted** (200, with the key wrapped to the recipient, or a
  statement that the grant file now exists), **pending** (202; the requester polls its
  grant path), **refused** (403, optional note). The home wraps any grant to the key in
  the named origin's manifest, so a false claim of origin earns a file the claimant
  cannot open.
- **Challenges.** A home MAY answer a request with any HTTP challenge — 401, 402, any
  scheme — and the protocol names none. A reader that cannot satisfy one treats the
  request as not granted. RFC-7 is how 402 is used.
- **A GET with no body is a probe.** It names no recipient, so its answer cannot depend on
  who asks, and **the first answer is the same for everyone in substance**: the same
  challenge, the same offer. *Correction to the plan (§3.7, §8.2, §12.2): it is not
  cacheable.* MPP's draft requires `Cache-Control: no-store` on every 402 and its
  challenge ids are unique per challenge (`draft-httpauth-payment-01` §11.10, §5.1.2.1);
  x402's HTTP transport says to keep the 402 out of shared caches
  (`specs/transports-v2/http.md`, "Browser clients"). A home may still serve a static,
  cacheable offer list in its rail's own format; the protocol specifies none.
- **When a live answer is allowed** *(Proposal (Opus); plan §9 item 12).* A home answers
  "granted" live only when the grant follows from **what the request itself carried**:
  its evidence, its payment, a pass the requester holds. A grant that follows from **who
  the recipient is** (an origin on a roster, a pre-approval) is delivered only at the
  grant path, and the live answer is "pending". Otherwise anyone could name a stranger's
  origin and learn from the answer whether that origin is on the roster: the home would
  be an oracle for its own member list, which is the follower list #12 and #13 refuse,
  served one query at a time.
- **CORS.** A request endpoint meant for browser readers sends credentialed-CORS headers
  for the calling origin, never `*` with credentials (R4 §2.1), and exposes whatever
  challenge headers its rail uses (x402 lists its own).
- **Rate limits** are the home's and private.

### 3.12 Epochs

- **A lock has a stable id and numbered epochs**, each with its own key. A wrap names
  the lock and the epoch. Grant paths are derived per lock and epoch.
- When an epoch ends and what a period is are the home's. Only the number is on the wire.
- **Standing access is a standing claim on the lock**: each new epoch's key is granted to
  the recipient while the home's ladder says so (a roster, a paid subscription).
- **A held key keeps working.** A recipient no longer granted new epochs still holds the
  epoch keys it was given. That is a fact about keys, not a policy, and what a lapsed
  reader is left with depends on which keys the home handed out (RFC-7 section 5:
  holding or on demand).
- **Whether the past is included** is a lock-to-lock grant from an epoch to the one
  before it, at the home's choice and invisible on the wire.

### 3.13 Terms

There is no rights or licence construct anywhere in the 0.4 text. Level 3 needs one (an
NDA, an officer's disclosure, what a buyer is buying) and so does a public blyg that wants
to say "CC BY". One construct serves all of them: **a reference to a stable document**.

- **Shape: `stub_of`'s two shapes.** `{origin, id, version}` naming a blyg item at a
  version, or `{url}` for a document off Blygger. *Proposal (Opus):* a `{url}` target MAY
  carry `sha256`, the digest of the document as the referrer read it, so a later reader can
  tell whether the document at that URL is still the one cited.
- **A blyg target SHOULD be a pinned version.** Unpinned history is never served (§8.4), so
  an unpinned earlier version of a terms thread cannot be fetched by anyone once it is
  revised. A pin keeps those bytes forever. A studio should pin a terms thread when it is
  first used.
- **Where it attaches**: (a) a wrap, beside the lock: the terms of holding that key; (b) a
  grant file, optionally: the terms in force when the grant was made, so a subscriber's
  terms do not move when the lock's do; (c) an item and the manifest, an origin default
  with a per-item override: the terms of public content.
- **Different rights are different locks.** Two wraps on one entry with different terms
  open the same bytes. The difference is legal only, and that is said plainly.
- **Accepting terms is evidence at the home**, like a sign-on token or a payment proof.
  Whether a click-through or a signed document is required is the ladder's.
- **Lines held**: a citation, never enforcement — nothing on the wire makes "delete after
  30 days" happen. No rights vocabulary: no machine-readable permissions, no licence
  codes; an agent matches a well-known URL or reads the prose. A reader MUST NOT refuse to
  show public content over its terms. A terms reference sends no mention and is never a
  relation (§15.4). The terms document itself should be public. **This is the protocol's
  first rights construct of any kind** (#104).

## 4. How a reader gets content

1. **Hold.** The entry names its locks and their homes. A reader holding any of the lock
   keys at the named epoch unwraps locally: no request, no traffic, nothing logged. This
   covers nested entries whose locks it holds.
2. **Probe.** Holding none, it computes its grant paths at each home: the lock at that
   epoch, this one entry, or (through lock-to-lock grants) a lock it holds. A 200 is a
   grant.
3. **Ask.** Finding nothing, it may POST a request to whichever home it thinks likeliest
   to agree.
4. **Decide.** The home runs its ladder: **pre-approved** (the grant already exists),
   **automatic** (a rule over origins, rosters — an OPML list is one natural form — or
   presented evidence), or **exception** (queued for the lock's owner or their AI
   delegate, working from the owner's standing instructions).
5. **Receive.** A grant file appears, or a refusal, or nothing.
6. **Check.** Before showing decrypted content, the reader checks the entry's
   commitment against the key and the ciphertext, and the description it was shown.
   A mismatch is shown as an error, never as content.

**Rules for an approver's delegate** (client guidance, as the plan states them): a
requester's note is untrusted text and is handled as data; a delegate may grant entry
keys only, never a lock key; an exception does not recurse (a key for an outer entry
opens no inner one).

**Where the centralisation lives.** A traditional organisation homes common locks at one
place and every author seals under them: wrapping is symmetric, so any holder of a lock
key can seal under it from their own origin. A decentralised one homes locks per node,
each with its own rosters, which agree only where nodes choose to share one. The wire
says "this lock, ask here" in both cases.

## 5. Widening, revocation and lapse

**Widening** (declassifying):

| Scope | How | Visible on the wire |
|---|---|---|
| One entry | A new version adding a wrap under the wider lock; ciphertext and commitment unchanged, so it reads as maintenance | Yes: the entry now names two locks |
| One group includes another | A lock-to-lock grant | No |
| One pinned entry | A grant of that entry's key (by commitment) to a lock or origin; the pinned bytes are untouched | No |
| Public | Reveal the entry key in the clear (any reader then checks it against the commitment), or publish a new version with the words in place of the cover | Yes |

*Proposal (Opus)* for the reveal: a wrap of the form `{"lock": "public", "key": "<entry key
in the clear>"}`. A conforming reader shows revealed content as ordinary content, and a
Level 2 reader still shows the cover until the publisher replaces it.

**Revocation**, stated in the register of §9 ("cooperation, not cryptography"):

- It stops future grants and, after a lock moves to a new epoch, future content. Nothing
  else.
- Nothing recalls a key or text a reader already holds, and nothing stops a holder
  republishing it.
- A pinned version keeps the wraps it was pinned with, forever, so anyone who could open
  it at pin time can open it always.
- Widening is one-way.

**Lapse as a retention event** *(the plan's proposal, §8.3 and §9 item 15; shape by Opus).*
When a home withdraws a grant it replaces the grant file with a lapse notice:

```json
{ "for": { "lock": "k7f3m0q9…", "epoch": 2 }, "lapsed": "2026-12-01T00:00:00Z" }
```

A conforming reader that finds a lapse notice at a grant path it used SHOULD drop the key
and the decrypted copies it opened with it, as it drops withdrawn content (§13.4). A plain
404 where a grant used to be is not a lapse — hosts fail — and a reader treats it as a
fetch failure (§12.3). *Proposal:* a reader rechecks its grant paths when it next opens
content under that key, and at least as often as it polls the item's origin. This is
cooperation, said as such: it is what makes "rental" in a terms document mean something
among conforming clients, and a non-conforming reader keeps what it holds. A home that
gives subscribers epoch keys and means them to keep what they paid for simply never
writes a lapse notice for past epochs (RFC-7 section 5).

## 6. Identity

The design authenticates **origins**, as Webmention verification does (§15.4, invariant
4). Which person an origin belongs to is the approver's own knowledge: a roster, sign-on
evidence, an h-card.

It sits inside #11 under the two conditions #101 named, which Fable rules here:

- **One key per origin, in the manifest, never inside `author`.** A per-author key would
  make people addressable (#11, §16.8).
- **Encryption only.** It signs nothing and claims no authorship. That stays with the
  identity practice of #35 and tn-2.

The key belongs in the manifest because other clients read it to write grants, and page
markup cannot carry a claim that crosses clients (#41). An h-card may mirror it.

**Shared origins.** Where several people publish from one host as one origin (tn-3 shape
B), a grant reaches the origin. Who inside may read it is the house's business, run off
the wire as comments are (tn-7). The house can read everything granted to the origin; a
member who cannot accept that needs their own origin (tn-3 shape A). A person who only
reads either keeps a minimal origin or uses a pass.

### 6.1 Re-reading #35, tn-3 and #52 against this section

The session-66 brief asked for this re-read (opus-brief session 66 item 1; plan §7, §9
item 10). What it found:

1. **tn-3 gains a second test.** #36's test for choosing between shapes is "who can
   withdraw". Sealed content adds a parallel one: **who can read what is granted to the
   origin.** In shape B the house reads every grant. That is the same answer for the same
   reason (the origin is the accountable party), and a member who needs their own key
   needs their own origin, exactly as one who needs their own withdrawals does. tn-3
   section 5 should say so when this RFC closes.
2. **#35's signature proof covers only the cover.** #35 proves authorship by a detached
   signature over `content_hash`, and `content_hash` covers what a keyless reader reads.
   A signature over a sealed item's `content_hash` says nothing about the sealed words.
   *Proposal for tn-2, not for this RFC:* a signed digest over `content_hash` followed by
   each entry's `commit` in document order covers the whole version, since each
   commitment binds its content. Nothing on the wire changes; tn-2 defines what is
   signed.
3. **#35's reciprocal-link proof is untouched**, and so is the rule against cross-origin
   identity merges without a verified claim.
4. **#52 forbids a manifest key and `.well-known` for auth**, meaning the write surface:
   how a tool discovers and authenticates to a studio. Two things here are near it:
   - **The home URL sits in each wrap, not the manifest**, and is not discovered through
     `.well-known`. That is clear of #52's invariant 2 on any reading.
   - **The origin's `encryption_key` is in the manifest.** It is not an auth construct:
     it grants nothing, authenticates no one to anything, and is useless to a tool
     wanting to publish. It is a public key for receiving confidential bytes, and it is
     authenticated the only way anything is in this protocol, by being served from the
     origin. The reading this draft takes is that #52's line is about the write surface
     and does not reach it. **That is a reading of a locked decision, so it is Fable's**
     (four-question test, Q3).

## 7. What is public, and what this does not protect

Under this design a stranger learns, and the RFC says so rather than hiding it:

- **Existence and timing.** A sealed item is in the archive index and the feed like any
  item (§6.2, §7); its `version`, `created`, `updated` and changelog `at` are clear.
- **Size class**, to a padding bucket (section 3.3).
- **Which entries share a lock**, since lock ids are clear (section 9 item 7), and which
  home each lock uses.
- **Citations.** A sealed item's references are clear by default (section 3.7).
- **Epoch cadence**, which may reveal a home's rotation or billing period (section 9 item
  21).
- **Member counts if the grants host lists.** Grant paths are unguessable, but a host
  that lists directories, or a public repository that holds the grant files, shows how
  many grants a home has written and when: a member count and churn. A home SHOULD serve
  grants from a host that does not list, and MUST NOT publish them in a public
  repository.

What no family of design prevents (R7): the reader who republishes what they opened; a
former member's past and pinned access; the origin's control of a page that decrypts in
the browser with its own script. **A page that decrypts with script served by the
origin protects content from the network, not from the origin or its host** (R7 §2).
Decryption in the reader's own client avoids that for subscribers, not for someone who
arrives from a link.

**Harvest now, decrypt later.** The item document carries only symmetric wraps (AES-256
under lock keys), which known quantum attacks do not threaten beyond Grover's square
root (R2 §3). The classical exposure is in **grant files**, which wrap keys to X25519
public keys; they are public bytes at unguessable paths, so an attacker must first find
them. This is a better position than R3's per-reader wrapped-key lists, which would have
put classical wraps in every public document. Section 9 item 16.

## 8. How the existing text reads under it

The wire impact, construct by construct. R4's table (`plans/l3/r4-spec-audit.md`) is the
full checklist; these are its answers under this design.

| 0.4 construct | Under sealed content |
|---|---|
| §3 levels; ignore unknown | A sealed item is a valid L2 document showing its covers; L3 is a superset |
| §3 conformance cost | A non-decrypting reader's rules stay standard-library (SHA-256, JSON). **Decryption does not**: section 9 item 3 |
| §4 same bytes for everyone | Holds: ciphertext, wraps and grant files are the same bytes for anyone who fetches them |
| §4 static surface | Holds for the origin. The home's request endpoint is a second dynamic surface, optional (item 10) |
| §5.1 `content_hash` | Unchanged: over the covers. Holders get the commitment (section 3.4) |
| §5.2 depth rule | Gains a clause: a clear note never reproduces sealed content (section 3.7) |
| §5.3 kinds, cap | No new kind; a sealed fragment's cap counts its plaintext |
| §5.4 media | Encrypted media for sealed words (section 3.8) |
| §5.6 forks | A forker without the key cannot fork the sealed words; one with the key publishes them in its own audience. Client policy, as #93 F3 treated quoting across a boundary (item 14) |
| §5.7 generation | Sealed text fed to a generator lands in the generating item's audience. Client policy (item 14) |
| §5.9 references, `cited` | Identities clear; `cited.excerpt` of a sealed target is sealed words and goes inside or is omitted |
| §6.2 index, §7 feed | Sealed items listed with covers; spans add no events; a plain RSS reader sees covers (item 8) |
| §8 pins | A sealed version may be pinned; the promise is ciphertext (item 9) |
| §10.2 bake | Unchanged; entries copied beside it (section 3.9) |
| §10.3 `selector` | Inside the plaintext when the quote sits in sealed text |
| §13.2 maintenance | Per audience (section 3.6) |
| §13.3 stealth edits | Detectable by anyone (section 3.6) |
| §13.4 retention | Gains lapse as a retention event (section 5) |
| §13.5 curation display | A holder displaying an imported sealed item in a public hopper page publishes it. Client policy: display the cover |
| §14 | Gains the disclosures of section 7 |
| §15.4 verification | Works on clear references; a receiver classifying a repost reads the cover (item 13) |
| §16.8 never | No follower graph: wrapped keys name locks, grants sit at unguessable paths, the live answer is never an oracle |
| §16.9 `cid` | A `cid` on a sealed pin makes the ciphertext durable beyond the origin; nothing on the wire depends on it being secret |

## 9. Items to be ruled

Every item is new wire (four-question test, Q2 yes), so every item is Fable's, at the edit
or at the close. Each states the options, the proposal and a **test**: the check that
would show the proposal right or wrong. Items 1–24 are the plan's §9, in its order; items
25–27 are new.

### Wire shape

**1. A second hash.**
- *Options:* (a) a clear hash of the sealed plaintext; (b) a hash inside the ciphertext;
  (c) no second hash; maintenance per audience from `content_hash`, each entry's `commit`
  and the holder's own plaintext.
- *Proposal:* (c), with section 3.6's carry-over rule.
- *Test:* write out §13.2's maintenance decision for an L2 reader, an L3 non-holder and a
  holder across the four cases (cover changed or not, sealed text changed or not); each
  must be decidable and none may need a guessable clear hash.

**2. Key commitment.**
- *Options:* (a) none, disclose equivocation; (b) a committing AEAD construction; (c) a
  clear SHA-256 commitment over key, nonce, ciphertext and description.
- *Proposal:* (c), section 3.4. (b) is cleaner cryptography, but no committing AEAD is in
  WebCrypto.
- *Test:* the probe (R8, on Venkat's word) builds an AES-GCM ciphertext that opens under
  two keys and confirms the commitment check rejects the second key.

**3. Algorithms, and the stdlib rule.**
- *Options for the suite:* AES-GCM + HKDF + X25519 HPKE (the browser intersection);
  ChaCha20-Poly1305 (not in WebCrypto); post-quantum hybrids (not in stable browsers).
- *Options for §3's conformance-cost criterion* (#103 item 7), which Python cannot meet
  for decryption (R2 §0): (a) exempt decryption, stating that a reader which decrypts
  holds a platform cryptography library (WebCrypto, Go's standard library, Python's
  `cryptography`); (b) restate the criterion as "each platform's primary crypto library";
  (c) keep the criterion and treat decryption as a client feature outside the rules.
- *Proposal:* the suite of section 3.3; criterion option (a), with the line drawn at
  decrypting: every rule a non-decrypting reader follows stays standard-library (it
  ignores `sealed`, shows covers, may compare commitments as strings). This reinterprets
  #103 and needs Fable.
- *Test:* the probe seals and opens an entry with nested entries in a browser, a Worker,
  Go and Python. **Workers' support for X25519 in `crypto.subtle` is unconfirmed** (R2 did
  not cover Workers; this draft did not check either): the probe settles it.

**4. Padding.**
- *Options:* none; power-of-two buckets; fixed block sizes (WNFS).
- *Proposal:* section 3.3's buckets, 256 bytes minimum.
- *Test:* sizes measured by the probe for a three-word span, a paragraph and a 4,000-word
  item; the overhead on a typical redacted thread should be under 2 KB.

**5. Locating a span in `content_md`.**
- *Options:* (a) clients render `content_html` only; (b) a text selector on each span's
  entry; (c) markup in `content_md` (refused by #101: no new markup).
- *Proposal:* (b), section 3.1.
- *Test:* a markdown-rendering reader substitutes every span of a fixture correctly from
  `content_md` and the selectors alone, including two identical covers in one item (the
  prefix and suffix must disambiguate; if they cannot, the publisher must refuse).

**6. What stays clear.**
- *Proposal:* section 3.7's table: references and counters clear, words sealed, a clear
  note never reproduces sealed content.
- *Test:* every row of R4's audit table has an answer under the proposal, and no member
  that carries a target's words is clear when the words are sealed.

**7. Lock ids are visible.**
- *Options:* accept; blind them per entry (an HMAC of the lock id under the lock key, so
  only holders recognise their locks).
- *Proposal:* accept and disclose. Blinding hides which entries share a lock only from
  someone who cannot see the home URLs, and a home's URLs are per lock.
- *Test:* none needed beyond the disclosure; revisit if an implementer names a case where
  shared-lock visibility harms them.

### Surface

**8. The index and the feed.**
- *Proposal:* sealed items are listed and announced like any item, with their covers; a
  span adds no event; a plain RSS reader sees covers. §6.2's "every item ever published"
  and §7's "no quiet publish" hold unchanged.
- *Test:* a feed with a sealed item validates as RSS 2.0 and reads sensibly in two plain
  RSS readers.

**9. Pins.**
- *Proposal:* a sealed version may be pinned; the promise is the ciphertext. A publisher
  that pins a sealed version SHOULD keep the keys that open it for as long as it grants
  them, and the RFC discloses that a pin defeats revocation for anyone who could open it
  at pin time, and that a lost key leaves a kept promise unreadable.
- *Test:* none; a disclosure.

**10. The carve-out, and #52.**
- *Proposal:* the request endpoint is a second dynamic surface under #13's carve-out,
  OPTIONAL at every level; the home URL sits in the wrap, not the manifest; the origin's
  `encryption_key` in the manifest is not an auth construct under #52 (section 6.1 item 4).
- *Test:* a static-only origin can seal, grant by hand from a static home, and be read by
  a second client, with no dynamic surface anywhere.

**11. Grant path derivation.**
- *Proposal:* section 3.10: X25519 between home and recipient, HKDF to a 128-bit path;
  lock-to-lock paths from the lock key. Hosts that list directories or publish their
  repositories defeat the secrecy of *which paths exist* (member counts and churn), not
  of the grants themselves, which are wrapped. Disclosed, with a SHOULD and a MUST NOT
  (section 7).
- *Test:* two independent implementations compute the same path from the same keys.

**12. Abuse of the request endpoint, and the oracle.**
- *Proposal:* section 3.11: a probe's answer is the same for everyone in substance and is
  not cached; a live "granted" only for grants that follow from what the request carried;
  rate limits private. **This departs from the plan's "cacheable"**, because both rails
  forbid caching a 402.
- *Test:* naming an origin that is on a roster, and one that is not, produces
  indistinguishable answers.

### Behaviour

**13. Mentions.**
- *Proposal:* yes. References stay clear, so a sealed item sends and verifies mentions
  like any item; the receiver displays the cover; repost classification reads the cover.
  A reference listed inside the plaintext sends nothing.
- *Test:* a sealed stub of a public item verifies on a 0.4 receiver unchanged.

**14. Generation, forks and display across a boundary.**
- *Proposal:* client policy, as #93 F3 treated quoting across an enterprise boundary.
  The reference client's defaults, recommended to others: a generator's output from a
  sealed source is sealed under the narrowest lock among its sources unless the author
  says otherwise; a fork of a sealed item keeps the seal; a hopper page displays a sealed
  import's cover.
- *Test:* none; revisit if two clients disagree in a way a reader can see.

**15. Revocation as a retention event.**
- *Proposal:* yes, SHOULD, cooperation; the lapse notice of section 5; a 404 is not a
  lapse; recheck on next open and at least as often as polling. A reader holding a lock
  key whose later epochs lapse keeps earlier epochs unless the notice names them.
- *Test:* a conforming reader drops a lapsed entry's plaintext and shows the cover.

**16. Post-quantum.**
- *Options:* require a hybrid KEM now; disclose and reserve `alg`.
- *Proposal:* disclose and reserve. The public documents carry only symmetric wraps; the
  classical exposure is in grant files at unguessable paths (section 7). X-Wing is not in
  stable WebCrypto (R2 §3), so requiring it now would exclude browser readers.
- *Test:* revisit when a hybrid KEM ships in stable WebCrypto.

**17. Conformance.**
- *Proposal:* existing clauses stand, since a sealed document is a valid L2 document; new
  publisher clauses at 0.5 (commitment format, carry-over, AAD, padding, class and
  selector agreement); the live crawler needs no L3 mode before the first sealed entry,
  and gains a check that each `blyg-sealed` element has a matching entry.
- *Test:* the publisher suite run against a sealed fixture passes every existing clause.

### Added session 67

**18. `about`.**
- *Proposal:* section 3.1: optional, 300 code points, plain text, never a title, never
  required.
- *Test:* an agent instructed to buy on topic can decide from `about`-else-cover for the
  probe's fixtures.

**19. What the commitment binds.**
- *Proposal:* key, nonce, ciphertext and the description shown (section 3.4).
- *Test:* changing any of the four makes the check fail.

**20. The pass.**
- *Proposal:* grant paths from X25519 between the home and the pass key, as for origins;
  a pass may receive entry keys and lock keys (a reader with no origin can subscribe);
  the RFC tells readers that a pass is a bearer instrument, to be kept like a password
  and never put in a URL.
- *Test:* a reader with no origin buys an entry, closes the browser, and refetches the
  grant with only the pass's private key.

**21. Epochs.**
- *Proposal:* section 3.12; a wrap carries `lock` and `epoch`. Epoch numbers and timing
  leak a home's rotation cadence, which may be its billing period; a home that minds
  rotates on a fixed schedule independent of billing.
- *Test:* none; a disclosure.

**22. Terms.**
- *Proposal:* the member is `terms` (`rights` reads as a grant of rights, `license` fails
  NDAs); a `{url}` target MAY carry `sha256`; the item and manifest uses stay in this RFC,
  so the construct is designed once, and Fable may rule them apart early as a 0.4
  revision, since they are useful at Level 2 today.
- *Test:* the construct reads correctly for CC BY on a public blyg, an NDA on a lock and a
  per-subscriber licence on a grant.

**23. `sealed_hash`.**
- *Proposal:* not on the wire (section 3.4). The plan's example placed it in the clear.
- *Test:* as item 1.

**24. The request's shape.**
- *Proposal:* section 3.11: POST to `{home}l/{lock}` or `{home}e/{commit}` from the home
  document's templates, body `{recipient, note?, evidence?}`.
- *Test:* the worked example of RFC-7 section 4 runs end to end against it.

### New in this draft

**25. Partial quotes that include a cover.**
- *Options:* (a) the partial bake keeps the `blyg-sealed` element and carries the copy;
  (b) a partial quote may not include a cover at all.
- *Proposal:* (a), whole covers only (section 3.9).
- *Test:* a partial quote spanning a redacted name verifies by §10.2's substring rule
  against the target's text content and opens for a holder.

**26. The home document.**
- *Proposal:* section 3.10. Without it, grant paths need a secret the plan never said how
  home and recipient share.
- *Test:* a pre-approved recipient finds its grant with no prior contact.

**27. Revealing a key in the clear.**
- *Proposal:* the `"lock": "public"` wrap of section 5.
- *Test:* a Level 3 reader shows a revealed entry; the commitment checks.

## 10. Questions for implementers

1. **Readers without an origin.** Is this a real population for you? RFC-7 depends on the
   answer: the pass exists for it.
2. **Homes.** Would you run one home per organisation, one per node, or use someone else's?
3. **Evidence.** What would your ladder want to see: sign-on tokens, rosters, signed
   terms, payment, something else?
4. **Redaction.** Are author-written covers enough, or do you need something the cover
   cannot express?
5. **Rendering.** Do you render `content_html` or `content_md`? If `content_md`, do the
   selectors (item 5) work for your documents?
6. **Crypto.** Can your platform do AES-256-GCM, HKDF-SHA-256 and X25519 today? Which
   library?
7. **What leaks.** Of section 7's list, which is unacceptable for your use?

## 11. Rejected designs

Recorded because each will be proposed.

1. **Per-reader wrapped keys in the document** (R3 §1.1). Publishes the audience's size,
   and its churn over versions, to everyone forever: a follower list (#12, #13, §16.8).
2. **A new kind for sealed items.** Level 2 readers ignore unknown kinds, so the item
   would vanish for them instead of showing its cover (R4 §2.2), and kinds are fixed
   (#100).
3. **Ciphertext in `content_md`.** Level 2 readers would show base64 as prose.
4. **Per-reader bytes or URLs on the surface** (the per-subscriber feed). C2, refused by
   #93; and §12.2 would make the secret part of the subscription identity (R4 §2.6).
5. **A clear hash of the sealed plaintext.** Guess confirmation (section 3.4).
6. **Deterministic encryption** so equal plaintexts give equal ciphertexts. It lets anyone
   test equality across items. Carry-over (section 3.6) gives byte-identical re-serving
   without it.
7. **A key service named in the manifest.** It would bind every client to one service and
   sit on #52's line; the home sits in each wrap.
8. **Expiry, read counts or metering on keys or entries.** Refused in advance by #101 as
   narrowed by #104: nothing would enforce them.
9. **Sealed fragments as the block mechanism.** Dropped in session 66 for spans, which
   cost no feed events.
10. **A cacheable 402.** The plan's; both rails forbid it (section 3.11).

## 12. Relation to other documents

- [`docs/v0.5-plan.md`](../v0.5-plan.md): the direction this RFC turns into a design.
  Where they differ, this RFC says why (items 12, 23, 24, 26).
- [RFC-7](rfc-7-payments.md): payments. It adds no wire construct; it uses the request
  endpoint, challenges, the pass, epochs, `about` and terms from this RFC.
- `plans/l3/` R1–R7: the research. R4's audit is section 8's checklist; R7's worksheet
  dispositions are proposed in section 13.
- [RFC-5](rfc-5-enterprise-deployment.md) (to become tn-8): one audience per origin, the
  C1/C2/C3 classification this RFC starts from.
- [tn-3](../notes/tn-3-groups-and-aggregation.md): groups; gains the second test of
  section 6.1.
- tn-2 (identity, unwritten): gains the signed-digest proposal of section 6.1.
- RFC-4 (responding from anywhere, unwritten): its handler gains a `redeem` verb (RFC-7
  section 6).

## 13. R7's worksheet, with dispositions proposed

R7 (`plans/l3/r7-threat-model.md`) left a disposition column for the round. This design
is none of R7's three families exactly: entry keys ride along wrapped to **locks**
(symmetric, naming no reader), and readers obtain lock keys off the document through
grant files and homes. The rows below say what this design does and propose a
disposition for each. *All are proposals (Opus).*

| Adversary and capability | Under this design | Proposed disposition |
|---|---|---|
| Stranger reads sealed content | Needs a lock key or an entry key | **Prevent** (AES-256-GCM) |
| Stranger learns existence, timing, edit count, size class | Index, feed, counters, padded length | **Disclose** (section 7) |
| Stranger learns audience size or membership | No reader is named in any document; grant paths are unguessable; the home is not an oracle | **Prevent**, except a listing host: **disclose** with a SHOULD and a MUST NOT (section 7) |
| Stranger confirms a guess at the sealed text | No clear hash of sealed text; the commitment includes a 256-bit key | **Prevent** (section 3.4) |
| Harvest now, decrypt later | Documents carry only symmetric wraps; grant files carry classical X25519 wraps at hidden paths | **Disclose** for 0.5, `alg` reserved (item 16) |
| Stranger learns the citation graph of sealed items | Reference identities clear by default | **Disclose**; the author may move a reference inside (section 3.7) |
| Stranger probes or floods a home | Optional endpoint, private rate limits, uniform probe answer | **Out of scope** beyond the oracle rule (section 3.11) |
| Former member keeps what they decrypted, and pinned versions | Nothing recalls a held key | **Disclose** (section 5) |
| Former member reads content published after revocation | Not without a later epoch's key or a new entry key | **Prevent**, for content sealed under later epochs only |
| Paying reader republishes, inside or outside the protocol | Quotes copy ciphertext, not plaintext; a holder can still copy the plaintext anywhere | **Disclose**; generation and forks across a boundary are client policy (item 14) |
| Paying reader shares a key or a pass | A pass is a bearer instrument | **Disclose** (section 3.10) |
| Leak traced to a reader | Every holder gets the same bytes; no watermarking | **Out of scope** (per-reader bytes are refused, #93) |
| Host reads sealed content | Not from what it serves; yes if readers decrypt in a page whose script it serves | **Prevent** for clients that decrypt locally; **disclose** for in-page decryption (section 7) |
| Host or publisher shows different readers different text | One ciphertext, one commitment, checked by every holder | **Prevent** (section 3.4) |
| Host observes who fetches what | Request logs, and grant-path fetches at the home | **Disclose** |
| Compromised studio reads, publishes, adds itself to locks | It holds the keys | **Out of scope** (client security), disclosed |
| Lost keys | A pin is kept and unreadable | **Disclose** (item 9) |
| Third-party home operator | Holds lock keys, reads everything under them, sees requests | **Disclose** (RFC-7 section 9) |
| Payment processor, routing nodes | Rail-specific | **Out of scope**, rail by rail (RFC-7 section 9) |

## 14. What happens next

The two RFCs were published together on blyg.blygger.org on 2026-11-14, with a comment
period to 2026-11-28 (#66, #104) and a `blygger-spec` issue each for people without a
blyg (#34, #35). Fable edits this draft beside RFC-7 during the period and rules what it
can at the edit; each edit is a new version of the item. At the close the rulings are
revised and the RFC is promoted as a technical note (#90). Then the build order, to be
confirmed at the close (plan §11): the envelope and spans with keys handed over by hand
(this alone exercises a Level 3 construct and opens the 0.5 document); origin keys,
the home document and grant files; the request endpoint and ladder; lock-to-lock grants
and epochs. Each step is usable without the next. A throwaway probe (R8) runs before the
close only on Venkat's word.
