# R3 — Key distribution, hierarchies, revocation and loss

**Exploration, not a plan of record.** Written 2026-11-12 by Opus 5.5 for the 0.5 design
round (decision #99), task R3 of [`docs/l3-research-brief.md`](../../docs/l3-research-brief.md).
Serves questions C, D and F. Draws on [R2](r2-encryption-prior-art.md) (building blocks,
prior art), [R1](r1-payment-rails.md) (rails) and [R5](r5-enterprise.md) (identity
providers). Findings only; my own view is in the last section and is marked.

**Sources.** Mostly analysis of the mechanisms documented in R1, R2 and R5, whose sources
are dated there (all read 2026-11-12). Cryptographic constructions not documented in those
files are marked *(general knowledge)*. Byte counts are computed from primitive sizes, not
measured; R8 (the probe) would measure them and has not been authorised.

**Byte sizes used below.** X25519 public key 32 bytes; AES-GCM tag 16 bytes, nonce 12
bytes; a 32-byte content key wrapped with HPKE base mode (X25519, AES-GCM) ≈ 32 (encapsulated
key) + 32 + 16 = **80 bytes**, ≈ 108 characters in base64. With an X-Wing hybrid KEM the
encapsulation is ≈ 1,120 bytes, so ≈ **1,170 bytes** per wrap. A key identifier, if used,
adds 8–32 bytes per entry.

## 1. Ride-along options

"Ride-along": key material (wrapped) or a pointer to it travels in protocol documents.

### 1.1 Per-recipient wrapped keys in or beside the item document

The item's content key is wrapped once per authorised reader; the list sits in the item
document or in a sibling file (`items/{id}.keys.json`, name illustrative).

- **Size:** ≈ 80 bytes × N readers per item-version (≈ 108 KB for 1,000 readers; ≈ 1.2 MB
  with a PQ hybrid). Every version repeats it unless the version key is derived from an item
  key (§3) and only the item key is wrapped.
- **What it reveals (commitment 4):** the **exact number of readers** of each item, to
  anyone, forever (ciphertext is public; pins keep it). With key identifiers, **which
  reader keys** — linkable across items and, if readers reuse keys, across origins.
  Without identifiers, readers trial-decrypt N entries (age does this; R2 §1.1). Adding a
  reader changes the document, so the list's growth over time is a public subscriber
  graph. This is the "follower list by another name" #12/#13/§16.8 refuse, unless padded
  with decoys to a fixed size (cost: bytes; still reveals an upper bound).
- **What a recipient's key is (commitment 3):** a public key the publisher learned out of
  band. If it is the reader's own long-lived key it is a pseudonym that links the reader
  across every origin that lists it. If readers generate a fresh key per origin, linkage
  across origins goes away, but the publisher still holds a list of keys per reader. The
  protocol need not say whose key it is — but the list exists in public.
- **Revocation:** next version omits the reader; past versions keep the entry (and pins
  freeze it).

### 1.2 One key file per audience

An audience (a tier, a group) has an **audience key**; a key file lists it wrapped to each
member (as §1.1, but once per audience, not per item). Items are encrypted under keys
derived from or wrapped by the audience key.

- **Size:** ≈ 80 bytes × members, once per audience (per epoch, §1.3); plus O(1) per item
  (an item key wrapped under the audience key: 32 + 16 bytes + nonce).
- **Reveals:** the number of audiences (one file each), each audience's member count, and
  which items belong to which audience (if the item names its audience) — a public map of
  the publisher's tiers and their sizes.
- **Recipient key:** as §1.1.
- **Revocation:** see §1.3.

### 1.3 Key epochs

Audience keys are versioned in epochs; adding a member can reuse the epoch (wrap the
current key to the new member, and old epochs if they should read the archive); removing
one starts a new epoch whose key is wrapped to remaining members only. Items published
after the change use the new epoch.

- **Size:** each epoch adds a full key file (≈ 80 bytes × members). Frequent churn
  multiplies it; Megolm and MLS rotate on every membership change (R2 §2.5–2.6).
- **Reveals:** epoch count and timing = public churn events.
- **New members and the archive:** to read old items a new member needs every old epoch key
  (or old keys re-wrapped under the new epoch). MLS's design deliberately denies joiners
  history (R2 §2.6); a publication usually wants the reverse.

### 1.4 Wrapped to a service, not to readers (the AMP / Workspace CSE shape)

The item carries its content key wrapped once to a **key service's** public key (AMP: to the
publisher's authorizer and to Google; Workspace CSE: the DEK is wrapped by the customer's
KACLS — R2 §2.1, R5 §3). Readers ask the service; the service decides.

- **Size:** ≈ 80 bytes per service per item-version, independent of audience size.
- **Reveals:** nothing about readers; only that the item is sealed and which service can
  unwrap it (if named).
- **Recipient key:** none. Readers authenticate to the service by whatever means the service
  uses (an IdP session, a payment proof, a capability) — identity stays out of the
  protocol.
- **Classification:** it is ride-along (wrapped key material travels in the document) *and*
  off-protocol for entitlement (who may ask the service is the service's business). It is
  the layering the brief anticipates.
- **Dependence:** the service must be online at reading time. Readers may cache keys.

## 2. Off-protocol options

"Off-protocol": the protocol says how content is encrypted and how a reader that has a key
uses it; how the key arrived is the client's business.

| Option | How the key reaches the reader | Server needed at reading time | Reveals publicly | Revocation | Notes |
|---|---|---|---|---|---|
| **Capability link** (key in a URL fragment, Tahoe-style) | The link is the key: `…/t/{id}/#k=…` | None | Nothing | **None** — the link works forever for anyone who has it; only re-encryption under a new key (a new version) stops future reads | Fragments are not sent to servers, but they persist in browser history, sync, pastes and chat logs *(general knowledge)*. Works on a dumb static host with an in-browser decrypting page (R7) |
| **Key endpoint run by the client/studio** | The reader's client asks the publisher's studio, which checks a session, token or payment | Yes, the publisher's | Nothing (unless the endpoint is named on the surface) | Refuse future requests; rotate for future versions | The studio already exists for every reference-client deployment; this is a studio feature, like #31's tokens |
| **Third-party key service** (Lit-style network, a KMS/KACLS, a SaaS) | The reader proves a condition to the service | Yes, the third party | Nothing on the blyg surface; the third party may publish conditions (Lit) or log accesses (KMS) | Per service | Lit's network migrations (R1 §3.4) show the durability risk for ciphertext pinned forever |
| **Payment rail** (R1) | x402/MPP: the paid response body *is* the key (or a wrapped key); L402: preimage proves payment to a key server; Lightning preimage could be a per-buyer wrapping key | Yes for every rail except threshold networks | Rail-dependent: chain payments are public and linkable to the payer's address | Payments can be reversed (cards) after a key is released; chain payments cannot | x402/MPP price per URL, so key granularity = price granularity |
| **Identity provider** (R5) | The reader signs in; the IdP's assertion or a SCIM-fed directory decides; a key service unwraps | Yes | Nothing on the surface; the KMS logs every unwrap | SCIM deprovisioning → next unwrap refused | Off-the-shelf (Workspace CSE) |

**A hybrid worth naming:** off-protocol *delivery* of a key that unlocks a ride-along
*audience key file* — e.g. the reader receives a per-reader secret by payment or sign-in, and
the audience key is wrapped to a key derived from that secret in a public file. That moves
the per-reader list back onto the surface (§1.1's leak) unless the wrapping is to a service.

## 3. Key hierarchies

### 3.1 A plain derivation tree: origin → item → version

`K_item = HKDF(K_origin, info = "item" ‖ origin ‖ id)`,
`K_version = HKDF(K_item, info = "version" ‖ n)` (illustrative). HKDF is in WebCrypto and
Go's stdlib and implementable from Python's `hmac` (R2 §1.1).

| Grant | Gives | Cost of leak |
|---|---|---|
| `K_version` for (id, n) | exactly one version | one version |
| `K_item` for id | **every** version of the item, past and future | the whole item, forever (future versions included unless the item key is rotated) |
| `K_origin` | everything, past and future | everything |

- The tree cannot grant "from version 5 on" or "versions 3–7" with one key: `K_item`
  over-grants, a set of `K_version` keys is one key per version.
- Including `origin` in `info` scopes keys to the identity origin, so a mirror serving the
  same id elsewhere cannot reuse keys by accident (R4 §2.7, origin scoping).
- Rotation of `K_item` (a new item-key epoch) is needed to stop future versions for someone
  who held the old item key.

### 3.2 Granting a range of versions

Known constructions *(general knowledge unless cited)*:

- **One-way hash chain, backward access:** derive a chain `k_N, k_{N-1} = H(k_N), …`; holding
  `k_n` gives every earlier version. Requires knowing N in advance, so it suits "grant
  everything up to now" but not open-ended futures. This is "key regression" (Fu, Kamara,
  Kohno, NDSS 2006).
- **Forward ratchet, forward access:** `k_{n+1} = H(k_n)`; holding `k_n` gives version n and
  every later one, never earlier. WNFS's **skip ratchet** is this with skip-ahead so that
  computing far-future keys is cheap; a derived **snapshot key** gives exactly one revision
  (R2 §2.8). Revocation: a new ratchet seed from a chosen revision on.
- **Two chains for a closed range [a, b]:** combine a forward chain (from a) and a backward
  chain (from b), so a version key needs both halves; granting `fwd_a` and `bwd_b` gives
  exactly [a, b]. The backward chain needs a fixed horizon. I did not find a deployed
  publishing system using this; it appears in the access-control literature on time-bound
  keys.
- **Per-version keys in a list:** grant [a, b] by handing over b − a + 1 version keys; simple,
  O(range) size, no structural leak beyond the count.

### 3.3 Hierarchies across items

- A **subtree** grant (a tier, a hopper-like set, a series) needs the item keys to derive
  from a shared parent other than the origin key — i.e., the audience key of §1.2. The tree
  then becomes origin → audience → item → version, and an item belongs to one audience
  (or is wrapped separately into several).
- Moving an item between audiences (RFC-5's "team-only today, company-wide tomorrow") is a
  re-wrap or a new version under the new audience. Old versions under the old audience stay
  readable only by that audience — unless the publisher re-publishes them, which it cannot
  do for pinned bytes (§4).

### 3.4 The cost when one key leaks

A leaked key exposes everything derivable from it: its whole subtree, and along a ratchet
everything on one side. Mitigations: keep high keys offline (the origin key derives only;
items are encrypted under leaf keys); rotate audience and item keys by epoch; prefer
granting leaves. Nothing recalls content already decrypted with the leaked key, and
nothing re-encrypts pinned versions (§4).

## 4. Revocation, honestly

The protocol already says withdrawal "is cooperation, not cryptography" (§9, §14). The same
honesty applies here. Columns: what each scheme can do. "Pins" asks what happens to a
pinned version, whose bytes are promised forever (§8).

| Scheme | Stop future versions of an item | Stop future items | Re-encrypt the archive | Recall bytes already decrypted | Pins |
|---|---|---|---|---|---|
| Per-recipient wrapped keys (§1.1) | Yes: omit the reader from the next version's list | Yes | Only by republishing each item as a new version (old versions' ciphertext and lists remain in any copy) | **No** | A pinned version's list is frozen with it: the revoked reader can still decrypt that pin forever |
| Audience key file + epochs (§1.2–1.3) | Yes, after a new epoch | Yes | Only by new versions under the new epoch | **No** | Pinned versions stay under the old epoch; old-epoch holders keep access |
| Wrapped to a service (§1.4) | Yes: the service refuses | Yes | Not needed for refusal, but a reader who cached a key keeps it | **No** | The pinned ciphertext stays readable by anyone who cached its key; the service can refuse new requests |
| Capability link (§2) | Only by new keys for new versions (and new links) | Yes, new items get new keys | Only by new versions | **No** | The link to a pinned version works forever |
| Client key endpoint / third-party service / IdP (§2) | Yes: refuse | Yes | Not needed for refusal | **No** | As §1.4 |
| Payment rail (§2) | The key server refuses unpaid requests; a refund does not un-release a key | Yes | — | **No** | As §1.4 |
| Derivation tree (§3.1), item key granted | Only by rotating the item key (a new item-key epoch) | Yes | Only by new versions | **No** | Pinned versions under the old item key stay readable by its holders |
| Forward ratchet (§3.2) | Yes, by re-seeding from version n | — | — | **No** | — |

Common to every scheme:

- **Nothing recalls bytes already decrypted**, and nothing stops a holder republishing them
  (R7).
- **Pins and revocation cannot both be total.** A pin promises the same bytes forever; any
  revocation that requires new ciphertext cannot touch a pinned version. For a revoked
  reader, a pinned sealed version they could once decrypt stays decryptable by them
  (they hold, or can re-derive, its key).
- **"Stop future access" is the only revocation any scheme delivers**, and only for versions
  published after the change (or for keys not yet fetched from a service).
- **Revocation can be a cooperative event, like withdrawal**: a conforming reader drops
  decrypted copies of what it may no longer read. Whether the protocol says so is R4's
  question 6; it would be no more enforceable than §13.4.

## 5. Loss

What happens to pinned ciphertext when the publisher loses the key:

- **The pin is kept and worthless.** The origin still serves the promised bytes (§8 rule 1);
  nobody without a cached key can read them, including the publisher. Readers who decrypted
  earlier hold the only plaintext, and §13.4 would ask them to drop it if the item is later
  withdrawn.
- **What survives depends on the scheme:** with per-recipient or audience key files, any
  reader holding their own private key can still unwrap — the publisher's loss is not
  total. With a service-wrapped key (§1.4), losing the service key loses everything sealed
  to it (enterprise practice puts the KEK in an HSM with backup — R5 §3). With a derivation
  tree, losing the root loses everything unless leaf keys were stored.
- **Mitigations** *(general knowledge)*: escrow the origin root key (or split it with
  Shamir secret sharing among trustees); derive everything from one backed-up root so there
  is one thing to protect; keep the studio's key store in the same backup as its database.
- **Interaction with withdrawal and compelled removal:** a lost key is not a 404 (F5) and not
  an endcap (§9); the document stays 200 with unreadable content. Crypto-shredding by choice
  (R5 §6) produces the same wire state on purpose.

## Questions this raises for the design round

1. **D.** Is a public list of per-reader wrapped keys (§1.1–1.2) admissible at all, given
   commitment 4 — and if only with fixed-size padding, what size?
2. **D.** Is the service-wrapped shape (§1.4) the ride-along family, the off-protocol family,
   or the layering? If the protocol names the service, is that a second dynamic surface
   (#1, #13)?
3. **C.** Which grants must one key express: a single version, an item (all versions), a
   forward range ("from now on"), a subtree (an audience)? A plain HKDF tree gives the first
   two; forward ranges need a ratchet.
4. **C.** Are keys scoped to the identity origin in their derivation, so mirrors and moved
   origins (§16.13) cannot reuse them by accident — and what happens to keys on a move?
5. **F.** Does the protocol state that revocation means "no access to versions published, or
   keys requested, after the change" and nothing more — in the same register as §9's
   "cooperation, not cryptography"?
6. **F, §8.** Should a sealed version be pinnable, knowing that a pin defeats revocation for
   anyone who could read it at pin time?
7. **Loss.** Does the protocol say anything about key durability for pinned sealed versions,
   or is "the bytes are kept" the whole promise?
8. **Commitment 3.** If any design wraps to readers' public keys, does the protocol define
   what such a key is (per-origin, reader-generated, unlinkable), or leave it entirely to
   clients?

## Own view (Opus 5.5, clearly marked; not a finding)

The table in §4 makes the main trade plain: every scheme revokes only the future, so the
cheapest designs that are honest about that are the ones that publish least. A derivation
tree with leaf keys per item-version, sealed content keys wrapped to a service (or not
published at all), and revocation stated as "the future only, cooperative for the past"
fits commitments 3–5 with the fewest new promises. Per-reader wrapped-key lists are the
option that most directly collides with #12/#13, and a pinned sealed version is the
construct that most directly collides with any revocation story.
