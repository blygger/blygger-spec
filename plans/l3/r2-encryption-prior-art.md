# R2 — Encrypting static content: building blocks and prior art

**Exploration, not a plan of record.** Written 2026-11-12 by Opus 5.5 for the 0.5 design
round (decision #99), task R2 of [`docs/l3-research-brief.md`](../../docs/l3-research-brief.md).
Serves questions A, B, C and I. Findings only; my own view is in the last section and is
marked.

**Dating.** Sources read on **2026-11-12** unless stated. RFCs are cited by number; their
content is stable. Statements marked *(general knowledge)* are from my training and were not
re-checked against a source today.

## 0. Summary of findings

- **The stdlib rule fails for Python.** Python 3.14.5's standard library (checked on this
  machine) has SHA-2/SHA-3/BLAKE2 hashing, HMAC and scrypt, and **no cipher of any kind**
  and no X25519. A normative rule that requires decrypting content cannot be implemented
  from Python's standard library; Python implementers will need the `cryptography`
  package. Python core developers have refused AES in the stdlib (python-dev, 2018). HKDF
  is implementable from `hmac` in a few lines.
- **Go's standard library is complete** since Go 1.26 (February 2026): `crypto/hpke`
  implements RFC 9180 with X25519, P-256/384/521, ML-KEM, and the hybrids MLKEM768X25519
  (X-Wing), MLKEM768P256 and MLKEM1024P384; AEADs AES-128/256-GCM and ChaCha20Poly1305
  (pkg.go.dev, `crypto/hpke@go1.26.7`).
- **Browsers (WebCrypto) have AES-GCM, ECDH P-256, X25519, HKDF, PBKDF2 and AES-KW, and
  not ChaCha20-Poly1305 or ML-KEM** in the stable, cross-browser API (MDN). Chrome has an
  Intent to Experiment (June 2026) adding ML-KEM, ML-DSA, ChaCha20-Poly1305 and X-Wing;
  Firefox and Safari support is unconfirmed. HPKE is not a WebCrypto primitive but can be
  composed from X25519/P-256 + HKDF + AES-GCM.
- **The intersection that all three can do with platform libraries** (WebCrypto, Go stdlib,
  Python `cryptography`) is: AES-GCM, HKDF-SHA-256, X25519 or P-256 ECDH, and therefore
  HPKE with an AES-GCM AEAD. ChaCha20-Poly1305 drops out of the browser; post-quantum KEMs
  drop out of the browser and Python's stdlib.
- **Closest prior art to "encrypted static page, key elsewhere":** AMP's subscription
  content encryption — premium content AES-GCM-encrypted inside a cacheable page, the
  per-document key wrapped (ECIES P-256) to the publisher's authorizer key and to Google's,
  and an authorizer that unwraps it for entitled readers. Every visitor gets identical
  markup. That is a ride-along key wrapped to *a key service*, not to readers.
- **Version-granular access has a worked design:** WNFS (Fission's Web Native File System)
  uses a **skip ratchet** so that one key grants a revision and every later revision but
  never earlier ones, and a derived **snapshot key** grants exactly one revision. The spec
  repository has had no commits since 2024-04-11.
- **Non-committing AEADs let one ciphertext decrypt to different plaintexts under different
  keys** (partitioning-oracle / "invisible salamanders" results). For a multi-reader
  publication this means a publisher could show different readers different text under
  one ciphertext unless the design commits to the key or the plaintext. This bears
  directly on "same bytes for everyone" (§4).
- **ATProto's private data ("Spaces", alpha announced 2026-08-20) is access control, not
  encryption**: "The data in a space is readable by any user or application with access to
  that space, it's not encrypted." It is a server-enforced gate, the C2 shape.
- **No deployed encrypted RSS or podcast format was found.** Incumbents use private URLs
  (R1 §4.2).

## 1. Building blocks

### 1.1 Comparison table

"WebCrypto" = the stable cross-browser SubtleCrypto API. "Py stdlib" = Python 3.14
standard library. "Go stdlib" = Go 1.26.

| Block | What it is | Per-recipient / per-message cost | WebCrypto alone | Py stdlib | Go stdlib | Notes |
|---|---|---|---|---|---|---|
| **HPKE** (RFC 9180, 2022) | KEM + KDF + AEAD; "base" mode encrypts to a public key, "PSK"/"auth" modes add a pre-shared key or sender auth; *export-only* mode derives secrets | DHKEM(X25519): 32-byte encapsulated key + AEAD tag 16 bytes per recipient (plus the wrapped payload). X-Wing: 1,120-byte encapsulation (*general knowledge*: ML-KEM-768 ciphertext 1,088 + X25519 32) | **Composable**, not native: X25519 (or P-256) + HKDF + AES-GCM are present; ChaCha20-Poly1305 suite is not | **No** (no ECDH, no AEAD) | **Yes** (`crypto/hpke`, incl. PQ hybrids) | The natural "wrap a content key to a recipient key" primitive |
| **JWE** (RFC 7516) with e.g. `ECDH-ES+A256KW` / `A256GCM` | JSON/compact envelope; multiple recipients in JSON serialization | Per recipient: an ephemeral public key (JWK) + 40-byte AES-KW-wrapped key, base64url | **Yes** (ECDH P-256, AES-KW, AES-GCM all present) | **No** | Partly: primitives yes, no JOSE package in stdlib | Verbose; recipient headers are readable JSON (count visible) |
| **age** (C2SP `age.md`, v1) | File format: random 128-bit file key, one header *stanza* per recipient (X25519, scrypt, MLKEM768-X25519 hybrid "age1pq"), header HMAC, payload in 64 KiB ChaCha20-Poly1305 STREAM chunks | Per X25519 recipient: 32-byte ephemeral share + 32-byte wrapped body, base64 in a text line | **No** (ChaCha20-Poly1305) | **No** | Primitives yes (`x/crypto` for some parts; not checked) | **The header lists one stanza per recipient, so the count is visible**; the spec warns that adding recipient identifiers "sacrifices anonymity and unlinkability"; advises against mixing PQ and non-PQ recipients in one file |
| **saltpack** | NaCl-based multi-recipient format (Keybase) | Per recipient: a box of the payload key; recipient public keys may be hidden (anonymous recipients) *(general knowledge)* | **No** (XSalsa20-Poly1305) | **No** | No (x/crypto/nacl) | Keybase-era; little current activity *(general knowledge, not checked)* |
| **COSE** (RFC 9052) + COSE-HPKE (draft) | CBOR envelope; multi-recipient | Similar to JWE, binary | Primitives yes | No | Primitives yes | Binary; not a natural fit for JSON documents |
| **AES-GCM** | AEAD; 96-bit nonce, 128-bit tag | 12-byte nonce + 16-byte tag per message | **Yes** | **No** | **Yes** | NIST SP 800-38D: with random 96-bit nonces, at most 2^32 encryptions per key *(general knowledge)*; **not key-committing** |
| **ChaCha20-Poly1305** (RFC 8439) | AEAD; 96-bit nonce | 12 + 16 bytes | **No** (stable API) | **No** | Yes (via `crypto/hpke`; standalone package is `x/crypto`, *not checked*) | XChaCha20 (192-bit nonce) avoids random-nonce limits; not in WebCrypto |
| **AES-GCM-SIV** (RFC 8452) | Nonce-misuse-resistant AEAD; deterministic for equal (key, nonce, plaintext) | 16-byte tag | **No** | **No** | **No** *(general knowledge)* | Relevant if the design wants byte-identical re-encryption (R4 §2.7) |
| **HKDF** (RFC 5869) | Extract-and-expand KDF | — | **Yes** | **Implementable** from `hmac` (~10 lines) | **Yes** (`crypto/hkdf`, Go 1.24 *general knowledge*; also inside `crypto/hpke`) | The tool for key hierarchies (origin → item → version) |
| **AES-KW / KWP** (RFC 3394 / 5649) | Deterministic key wrapping | 8 bytes over the wrapped key | **Yes** (AES-KW) | **No** | No in stdlib *(not checked)* | WNFS wraps temporal keys with AES-KWP |
| **HMAC-SHA-256** | Keyed hash | 32 bytes | **Yes** | **Yes** | **Yes** | The one stdlib-everywhere keyed primitive; candidate for a keyed content hash (R4 §2.2) |

### 1.2 Limits that matter for many small documents under related keys

- **Nonce limits** apply per key. A design that derives a fresh key per item-version (HKDF
  from a parent key with the item id and version as `info`) encrypts each key once or a few
  times, which removes the 2^32 random-nonce concern entirely. A design that encrypts every
  item and version under one origin-wide key with random nonces stays within limits for any
  plausible blyg (thousands of messages), but has no headroom for media chunking at scale.
- **Key commitment.** AES-GCM and ChaCha20-Poly1305 are not committing: a crafted
  ciphertext can decrypt validly under two different keys to two different plaintexts
  (Dodis, Grubbs, Ristenpart, Woodage, "Fast Message Franking", CRYPTO 2018 — the
  "invisible salamanders" attack; Len, Grubbs, Ristenpart, "Partitioning Oracle Attacks",
  USENIX Security 2021 — *general knowledge, papers not re-read today*). In a
  multi-reader setting where different readers hold different wrapped keys for one
  ciphertext, a publisher could show different readers different text, contradicting "same
  bytes, same content". Known mitigations: a key commitment (publish a hash of the content
  key, or use a committing construction), or a sealed hash of the plaintext that every
  holder checks (which only catches it if all holders compare notes or the hash is public).
- **Length.** AEAD ciphertext length = plaintext length + fixed overhead, so ciphertext
  reveals plaintext length. NIP-44 v2 pads to powers of two (minimum 32 bytes) and still
  lists "Limited message size leak" as a known property; WNFS fixes block sizes and
  recommends blocks under 256 KB to limit size leakage.
- **Equality.** Deterministic encryption (SIV, or convergent encryption with a
  content-derived key) makes equal plaintexts produce equal ciphertexts, which lets
  re-serving be byte-identical and maintenance republishes be detectable — and lets anyone
  test equality. Tahoe-LAFS documents the two attacks this enables against convergent
  encryption: **confirmation-of-a-file** ("Someone who knows your convergence secret and
  has a copy of a file can test whether you also hold that file") and
  **learn-the-remaining-information** (brute-forcing the private parts of a document whose
  boilerplate is known). Tahoe's mitigation is a secret mixed into the key derivation. The
  same two attacks apply to an unsalted plaintext `content_hash` in the clear (R4 §2.2).

## 2. Systems studied

Each entry answers: where keys live; what stays clear; ciphertext cost; what an observer of
public data learns; what happens to old content when a member leaves.

### 2.1 AMP subscriptions content encryption (amp.dev)

- **Keys:** a random per-document AES-GCM-128 key (via Tink), placed in a JSON object with
  the document's `AccessRequirements` and wrapped with P-256 ECIES to (a) the publisher's
  authorizer key and (b) Google's key, in a `<script type="application/json" cryptokeys>`
  element in the page head.
- **Clear:** everything outside the marked premium sections; the wrapped-key blob; the
  access requirements (inside the wrap, so not clear — the page says the JSON object is
  what is encrypted).
- **Flow:** AMP sends the wrapped key to the authorizer in a `crypt=` parameter during the
  entitlements fetch; the authorizer unwraps it, checks the reader's entitlements and, if
  granted, returns `decryptedDocumentKey`. "Entitled users get the key and AMP decrypts the
  content in the browser".
- **Observer learns:** that premium content exists and roughly its size; nothing about
  readers.
- **Member leaves:** the authorizer stops returning keys; a reader who stored a document key
  keeps that document.
- **Relevance:** this is a working "same bytes for everyone, key from an authorizer"
  design at web scale, with the wrapped key riding inside the document but wrapped to the
  *service*, so the document reveals nothing about readers.

### 2.2 Tahoe-LAFS capabilities and key-in-the-URL-fragment designs

- **Tahoe:** a read capability *is* the decryption key plus a verifier hash; holding the
  string is holding access. Immutable files use convergent encryption by default, with a
  per-client "convergence secret" to defeat the two attacks in §1.2.
- **Fragment designs** (PrivateBin, Excalidraw share links, the retired Firefox Send —
  *general knowledge*): the key sits in the URL fragment, which browsers do not send to the
  server (RFC 3986 §3.5 semantics), so a static host serves ciphertext and script, and the
  page decrypts in the browser.
- **Observer learns:** existence and size of the ciphertext.
- **Member leaves:** nothing can be revoked; the link is the key. Re-encryption under a new
  key with a new link is the only answer.
- **Relevance:** the off-protocol "capability link" option in R3; the in-browser-decrypt
  page in R7.

### 2.3 Nostr: NIP-44 and NIP-59

**Sources:** `nostr-protocol/nips` 44.md, 59.md (and 17.md for DMs).

- **NIP-44 v2:** secp256k1 ECDH → HKDF → ChaCha20 + HMAC-SHA256, power-of-two padding (min
  32 bytes), versioned (`0x02`; `0x01` deprecated). Known leaks listed by the NIP itself:
  IP address to relays, `created_at` public, "Limited message size leak".
- **NIP-59 gift wrap:** an encrypted *rumor* (unsigned) inside a *seal* (signed by the
  author, encrypted to the recipient) inside a *gift wrap* (signed by a random ephemeral
  key, addressed to the recipient's pubkey), so relays see the recipient but not the sender.
- **Keys:** user secp256k1 keys; per-recipient encryption, one event per recipient.
- **Cost:** one wrapped copy of the whole message per recipient (no shared content key).
- **Observer learns:** recipient pubkeys (`p` tags on gift wraps), timing (randomised
  `created_at` is recommended), sizes.
- **Member leaves:** not applicable (no groups); old messages stay readable by recipients.
- **Relevance:** per-recipient encryption of whole content scales as audience × size;
  the opposite of a shared content key.

### 2.4 Secure Scuttlebutt private groups (box2)

**Source:** `ssbc/private-group-spec` (last push 2023-11-07). *Details below are general
knowledge; I did not re-read the spec today.*

- **Keys:** a symmetric group key, distributed to members in a private message; each
  message's key is wrapped to the group key (and optionally to individuals) in a fixed
  number of key slots.
- **Clear:** the feed's author, sequence, timestamps; the number of key slots is fixed to
  hide recipient count.
- **Member leaves:** the original spec had no removal; removal means a new group key from
  that point (the later "epochs" work — not verified). Old content stays readable to the
  removed member.

### 2.5 Matrix (Megolm) and Signal sender keys

*General knowledge; Matrix spec and Signal docs not re-read today.*

- **Megolm:** each sender has an outbound session (a ratchet); the session key is shared
  with room members one-to-one over Olm. Sessions rotate on membership change and after N
  messages or time. New members get history only if someone shares old session keys (room
  history visibility + key sharing/backup).
- **Signal sender keys:** similar per-sender chain key distributed pairwise.
- **Member leaves:** rotation stops future messages; past messages remain decryptable by the
  leaver.
- **Relevance:** both are tuned for *forward secrecy in chat*, where a newcomer should not
  read the past. A publication usually wants the opposite: a new subscriber reads the
  archive.

### 2.6 MLS (RFC 9420, 2023)

- A tree of keys (TreeKEM) shared by a group; each **epoch** has a group secret; adding or
  removing members starts a new epoch; forward secrecy and post-compromise security.
  Cost of a membership change is O(log n) for the committer in good cases *(general
  knowledge)*.
- **Member leaves:** cannot read later epochs. **Joiners cannot read earlier epochs** by
  design. Publishing an archive to a growing audience needs an exporter-derived key per
  epoch and a separate way to hand old keys to new members.
- Enterprise deployments for document access rather than chat: see R5 §5.

### 2.7 AT Protocol private data: "Spaces"

**Sources:** atproto.com blog "The Atproto Spaces Alpha is Live" (2026-08-20); "AT Protocol
Roadmap (Spring 2026)" (title and summary only).

- A space has an authority (a DID) deciding which DIDs may access it; records live in
  "per-space permissioned repos on the author's PDS"; "Applications will sync space data
  directly from PDS hosts"; there is no relay for spaces.
- "Spaces provide **access control** _not_ confidentiality"; "The data in a space is
  readable by any user or application with access to that space, it's not encrypted."
- **Relevance:** the largest protocol in this field chose server-enforced access control
  over encryption for its first private-data design. That is the C2 shape #93 refused for
  this protocol. A third-party "atp-keyserver" exists (seen in search results on
  tangled.org; not read).

### 2.8 WNFS (private partition) and IPFS publishing with gated keys

**Sources:** `wnfs-wg/spec` `spec/private-wnfs.md` (repo last push 2024-04-11);
`wnfs-wg/rs-wnfs` (last push 2026-06-15); Lit + Bundlr + Arweave post (title only).

- **Keys:** a per-node **skip ratchet** is "the single source of truth for generating the
  decryption key". A **temporal key** (ratchet at revision r) gives access from r forward,
  "never earlier revisions"; a **snapshot key** "grant[s] access to a single revision
  snapshot of that node and its children". Directory keys flow downward only: a pointer to
  a directory "MUST NOT grant access to sibling or parent nodes".
- **Clear:** a flat HAMT of ciphertext blocks with labels derived from 2048-bit RSA
  accumulators (names and tree shape hidden); block sizes fixed (`40 + blockSize`); the
  "dark forest" may contain unrelated trees, hiding how many file systems exist.
- **Member leaves:** a new ratchet from a later revision; earlier revisions stay readable
  by anyone who held keys for them.
- **IPFS + Lit:** content encrypted client-side and stored on IPFS/Arweave, the key held
  by Lit under access conditions (R1 §3.4).
- **Relevance:** the only prior art found that answers the brief's "granting a *range* of
  versions" (forward ranges via the ratchet, single versions via snapshot keys). It also
  shows the cost of hiding structure: accumulators and a custom block store, far from
  "static files a dumb host serves".

### 2.9 Encrypted RSS or podcast feeds

None found in practice. Search results turned up a 2005 Schneier post about password-
encrypted feeds and an old Greasemonkey hack that decrypted feed descriptions in the
browser; no format or deployment. Podnews notes that even with encrypted contents a
unique feed domain reveals which podcast someone follows. The deployed practice is
per-subscriber private URLs (R1 §4.2).

## 3. Post-quantum: "published today, decrypted in fifteen years"

**Does it matter here?** A sealed item on this protocol is public ciphertext forever by
construction: the document is 200 forever (§4), pinned versions are promised forever (§8),
`cid` invites third-party IPFS mirrors (§16.9), and any reader may archive it. If the
content key is ever wrapped to a reader's public key with a classical KEM (X25519, P-256),
anyone who archives the wrapped key and later breaks the KEM recovers the content key. The
symmetric layer is not the concern: AES-256 and ChaCha20 are not considered threatened by
known quantum algorithms beyond Grover's square-root speed-up *(general knowledge)*. So the
exposure depends on **where wrapped keys live**:

- **Off-protocol keys** (a key server hands a key over TLS): the archived public data
  contains only symmetric ciphertext. The exposure is whatever the TLS session used
  (hybrid PQ key exchange is already deployed in major browsers and Cloudflare — *general
  knowledge*), and nothing durable is published.
- **Ride-along keys wrapped to readers' public keys:** the wrapped keys are themselves
  public forever, so a classical KEM is a harvest-now-decrypt-later target for the life
  of the archive.
- **Ride-along keys wrapped to a service key (AMP pattern):** one classical wrap per
  document to a service key; the same exposure, concentrated on one key.

Whether fifteen-year confidentiality matters for a paywalled essay is a product question;
for enterprise documents it is often a stated requirement (R5).

**Hybrid HPKE options today:**

| Option | Status (read 2026-11-12) | Availability |
|---|---|---|
| X-Wing (X25519 + ML-KEM-768) | `draft-connolly-cfrg-xwing-kem`, revision -11 (September 2026), CFRG individual draft; not an RFC | Go 1.26 `crypto/hpke` (`MLKEM768X25519`); age's `age1pq` recipients; Chrome WebCrypto experiment; Cloudflare Workers behind a flag (ML-KEM-768); Node.js |
| MLKEM768-P256, MLKEM1024-P384 | Go `crypto/hpke` | Go 1.26 |
| HPKE PQ codepoints (`draft-ietf-hpke-pq`) | **Could not verify** the draft's status | — |
| ML-KEM (FIPS 203, 2024) alone | Standard *(general knowledge)* | Go stdlib; not in stable WebCrypto; not in Python stdlib |

Cost: an X-Wing encapsulation is about 1.1 KB per recipient against 32 bytes for X25519 — a
ride-along design with N readers pays roughly 1.1 KB × N per document or key file.

## Questions this raises for the design round

1. **Stdlib rule.** Python cannot decrypt from its standard library. Does the rule become
   "implementable from each platform's primary crypto library" (WebCrypto, Go stdlib,
   Python `cryptography`), or is the decrypting side exempt as a client concern?
2. **Algorithm floor.** Is the protocol's AEAD AES-GCM (the only one WebCrypto has), and the
   KDF HKDF-SHA-256? Is ChaCha20-Poly1305 excluded until browsers ship it?
3. **Key commitment.** Does the design commit to the content key (or to the plaintext) so
   that one ciphertext cannot show different readers different text?
4. **Deterministic or randomised encryption per version?** Deterministic keeps re-serving
   byte-identical and maintenance detectable (R4 §2.7) and enables equality tests.
5. **Granularity.** Is WNFS's skip ratchet (forward range) plus snapshot keys (single
   version) the shape for per-version access, or is a plain HKDF tree enough (R3)?
6. **PQ.** If keys ride along wrapped to public keys, is a hybrid KEM required from the
   start, given ~1.1 KB per recipient and no stable browser support?
7. **AMP precedent.** Is "wrap the document key to a key service, ride along in the
   document" — revealing nothing about readers — acceptable as a ride-along shape that
   still leaves entitlement off-protocol?
8. **Length.** Does the protocol pad sealed content, and to what bucket sizes?

## Own view (Opus 5.5, clearly marked; not a finding)

The prior art splits cleanly: systems that wrap keys to *readers* (age, JWE, Nostr, MLS)
publish something about the audience; systems that wrap to a *service* (AMP) or hand keys
over a live channel (Tahoe links, Lit, key servers) publish nothing about readers. Given
commitments 3 and 4, the AMP shape — content key derived per item-version by HKDF, AES-GCM
for the payload, the key wrapped only to a service or not published at all — is the one
I would expect the round to examine first. Python's missing ciphers mean the stdlib rule
cannot hold for decryption as worded; it can still hold for everything a non-decrypting
reader does (hashes and HMAC).
