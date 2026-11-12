# R7 — Threat model worksheet for Level 3

**Exploration, not a plan of record.** Written 2026-11-12 by Opus 5.5 for the 0.5 design
round (decision #99), task R7 of [`docs/l3-research-brief.md`](../../docs/l3-research-brief.md).
Serves every question A–I. Drawn from [R1](r1-payment-rails.md), [R2](r2-encryption-prior-art.md),
[R3](r3-keys.md), [R4](r4-spec-audit.md) and [R5](r5-enterprise.md); sources are dated
there. This is a **worksheet**: the "Disposition" column is for the round to fill in. Where
I have a view it is only in the marked last section.

## 0. How to use this

For each adversary, the rows say what they can do under each family of design, so the round
can decide, per row, whether the protocol should **prevent** it (make it cryptographically
or structurally impossible for conforming parties), **disclose** it (say plainly in the
spec, as §9 and §14 do for withdrawal, that it cannot be prevented), or rule it **out of
scope** (a client's, host's or law's problem).

Families, as the brief defines them, with the sub-shapes R3 found:

- **RA-R — ride-along, wrapped to readers**: per-recipient wrapped keys in or beside the
  document, or per-audience key files (R3 §1.1–1.3).
- **RA-S — ride-along, wrapped to a service**: the content key travels in the document
  wrapped only to a key service's public key, AMP/Workspace-CSE style (R3 §1.4).
- **OFF — off-protocol**: the protocol says how content is encrypted and used; the key
  arrives by capability link, studio endpoint, third-party service, payment rail or IdP
  (R3 §2).

Assets: **(a)** sealed content (plaintext of item-versions); **(b)** the audience (who and
how many can read); **(c)** the publisher's keys; **(d)** the integrity of what readers see
(same text for every reader); **(e)** the protocol's existing promises (static files, same
bytes, no identity, no follower graph, pins, withdrawal).

Facts that hold under every family (R3 §4, R4 §3):

- Nothing recalls plaintext a reader has decrypted.
- Revocation stops only future versions or future key requests.
- A sealed item's existence, timing, version count, size and (if references stay clear) its
  citations are public unless separate per-audience files or padding hide them.
- Pinned ciphertext is public forever.

## 1. Adversaries and what they can do

### 1.1 A stranger (no key, no relationship)

| Capability | RA-R | RA-S | OFF | Disposition |
|---|---|---|---|---|
| Read sealed content | No (needs a reader's private key) | No (needs the service to unwrap) | No (needs the key) | ☐ prevent ☐ disclose ☐ out of scope |
| Learn that sealed items exist, when, how often edited, how big | Yes (index, feed, version counter, ciphertext length) | Yes | Yes | ☐ ☐ ☐ |
| Learn audience size | **Yes**: count of wrapped entries per item or key file | No | No | ☐ ☐ ☐ |
| Learn audience membership | Yes if entries carry key ids or readers reuse keys across origins; otherwise only by trial | No | No | ☐ ☐ ☐ |
| Confirm a guess at the text | Yes **if** a plaintext `content_hash` is in the clear (R4 §2.2) | Same | Same | ☐ ☐ ☐ |
| Harvest now, decrypt later (quantum) | Wrapped keys to readers' classical public keys are public forever | One classical wrap per item to the service key, public forever | Nothing durable published, if keys travel over (PQ-hybrid) TLS | ☐ ☐ ☐ |
| Learn the citation graph of sealed items | Yes if references (`stub_of`, `transclusions[]`, `links[]`, `generated[].sources[]`) stay clear | Same | Same | ☐ ☐ ☐ |
| Probe a key service (enumerate, DoS) | — | Yes, if the service is named on the surface | Yes, if discoverable | ☐ ☐ ☐ |

### 1.2 A former member (held access, now revoked)

| Capability | RA-R | RA-S | OFF | Disposition |
|---|---|---|---|---|
| Keep reading what they already decrypted | Yes | Yes | Yes | ☐ ☐ ☐ |
| Read versions published before revocation that they never fetched | Yes (their wrap is in those versions, and in pins) | Yes if they cached keys; otherwise the service refuses | Capability link: yes forever. Service: no | ☐ ☐ ☐ |
| Read pinned sealed versions from their membership period | **Yes, forever** (pin freezes their wrap) | Yes if they cached the key | Link: yes | ☐ ☐ ☐ |
| Read versions published after revocation | No (omitted from new wraps / new epoch) | No (service refuses) | No for new keys; **yes** if keys are per item and the item key was granted (R3 §3.1) | ☐ ☐ ☐ |
| Read under a derived key they still hold (item key, ratchet) | Yes for everything derivable (R3 §3.4) | Same | Same | ☐ ☐ ☐ |
| Prove to others what a sealed item said | By publishing plaintext; a plaintext hash in the clear (or a committed key) would let others verify it | Same | Same | ☐ ☐ ☐ |

### 1.3 A paying reader who republishes

| Capability | RA-R | RA-S | OFF | Disposition |
|---|---|---|---|---|
| Copy plaintext anywhere | Yes | Yes | Yes | ☐ ☐ ☐ |
| Republish **inside the protocol** with provenance: quote (bake) the sealed item into a public thread; `selector.exact`; `cited.excerpt`; fork; feed a generator (R4 §3 item 1) | Yes; the result names the source (`transclusions[]`, `forked_from`, `generated[].sources[]`) and its mention notifies the publisher | Same | Same | ☐ ☐ ☐ |
| Share their key | Share their private key (all their access everywhere) | Share a cached content key (one item-version) or their service credential | Share the link (capability) or key; for a rail, resell the response body | ☐ ☐ ☐ |
| Be traced from a leaked copy | No (all holders see identical plaintext) unless per-reader watermarking is added — which breaks "same bytes" | Same | Same | ☐ ☐ ☐ |
| Reverse the payment after receiving the key | Card chargeback / refund yes; chain and Lightning no (R1 §6) | Same | Same | ☐ ☐ ☐ |
| (Agent buyer) resell at scale | Yes, programmatically | Yes | Yes | ☐ ☐ ☐ |

### 1.4 The hosting provider (serves the static files)

| Capability | RA-R | RA-S | OFF | Disposition |
|---|---|---|---|---|
| Read sealed content | No | No | No — **unless the reader decrypts in a page whose script the host serves** (§2) | ☐ ☐ ☐ |
| Serve different ciphertext to different readers | Yes (the host controls bytes); readers cannot tell unless they compare hashes | Same | Same | ☐ ☐ ☐ |
| Observe who fetches which sealed item | Yes (request logs, as today for any item) | Yes; and if the key service is on the same host, who unwrapped what | Yes; and key requests if the endpoint is on the host | ☐ ☐ ☐ |
| Withhold or delete files | Yes (as today; a pin is the publisher's promise, not the host's) | Same | Same | ☐ ☐ ☐ |
| Substitute key material | Replace a wrap with one to a key it controls — readers cannot decrypt, publisher-side detectable only | Replace the service-wrapped key — service unwrap fails | — | ☐ ☐ ☐ |

### 1.5 A compromised studio (the publisher's client or its key store)

| Capability | RA-R | RA-S | OFF | Disposition |
|---|---|---|---|---|
| Read all sealed content and all keys it holds | Yes | Yes, plus the ability to ask the service | Yes | ☐ ☐ ☐ |
| Publish sealed items readers will trust | Yes (it is the origin) | Yes | Yes | ☐ ☐ ☐ |
| Add itself (or an attacker key) to every audience going forward | Yes: add a wrap | Yes: the service trusts the studio | Yes | ☐ ☐ ☐ |
| Show different readers different text under one ciphertext (non-committing AEAD, R2 §1.2) | Yes unless keys or plaintext are committed | Same | Same | ☐ ☐ ☐ |
| Leak the origin root key | Exposes everything derivable (R3 §3.4) | Exposes everything under that service's key if the studio held it | Same | ☐ ☐ ☐ |
| Destroy keys (sabotage or crypto-shredding) | Readers still hold their own private keys and can unwrap past versions | Everything sealed to a lost service key is lost (R3 §5) | Depends on where keys were cached | ☐ ☐ ☐ |

### 1.6 Additional parties the round may want rows for

| Party | What it can do | Families | Disposition |
|---|---|---|---|
| **Key service operator** (RA-S or OFF) | Read everything it can unwrap; log every reader; refuse service; disappear (Lit network migrations, R1 §3.4) | RA-S, OFF | ☐ ☐ ☐ |
| **Payment facilitator / processor** (R1) | Learn payer wallet or customer identity and which URL was bought; refuse to settle | OFF (and any named key URL) | ☐ ☐ ☐ |
| **Lightning routing nodes** | Learn the preimage of any payment they route (R1 §3.1); if a preimage is key material, they learn the key | OFF (preimage-as-key) | ☐ ☐ ☐ |
| **Identity provider** (R5) | Decide who gets keys; a compromised IdP grants anyone | RA-S, OFF | ☐ ☐ ☐ |
| **Another blyg that mirrors or quotes** | Republish ciphertext (harmless) or plaintext (if it held a key) with provenance | all | ☐ ☐ ☐ |
| **Archivist / IPFS mirror (`cid`, §16.9)** | Keep ciphertext and wrapped keys forever; enables harvest-now-decrypt-later | RA-R, RA-S | ☐ ☐ ☐ |
| **The publisher, against its readers** | Equivocate (different text per reader); revoke after payment; lose keys | all | ☐ ☐ ☐ |

## 2. The public page that decrypts in the browser

Setup: the item's `page` is an HTML page served by the same origin (or its host); script on
the page obtains a key — from the URL fragment (capability link), from the reader's local
key store, or from a key service — and decrypts the sealed content into the DOM.

**What it protects:**

- Plaintext never transits the network in the clear after publication; the host serves only
  ciphertext and script.
- A fragment key is not sent to the server in requests (R2 §2.2), so the host's access logs
  do not contain it.
- Readers without a key see the placeholder, and indexers index the placeholder.

**What it does not protect:**

- **The origin (or anyone who can change what it serves) controls the script.** It can serve
  script that sends the key or the plaintext anywhere — to every reader or only to chosen
  ones. Since the same host serves the ciphertext and the code that decrypts it, in-browser
  decryption protects content from the host only to the extent the reader trusts each
  load of the script. This is the standing objection to web-delivered end-to-end
  encryption *(general knowledge)*; mitigations exist outside the protocol (Subresource
  Integrity pins scripts referenced by a page, but the page itself is served by the same
  host; browser extensions or installed clients that carry their own code; code
  transparency logs).
- **Fragments leak by other routes:** browser history, synced tabs, copy-paste, screenshots,
  chat logs, and any script running on the page (including third-party analytics) can read
  `location.hash` *(general knowledge)*.
- **Decrypted HTML is publisher-supplied** and must be sanitised after decryption before it
  is inserted (§14's rule applies to the decrypted bytes).
- **It is presentation, not protocol** under #3 and §8.4: the protocol can say nothing that
  makes a client's page trustworthy. A reader's own client (a studio decrypting imported
  items locally) avoids the "origin serves the decryptor" problem for subscribers but not
  for people arriving at the page from a link.
- **Hosting provider row (§1.4) changes:** with in-browser decryption, the host can read
  sealed content by serving modified script. Without it (decryption only in readers' own
  clients), the host cannot.

| Question for the round | Disposition |
|---|---|
| Does the protocol say anything about decrypting pages, or is it wholly presentation? | ☐ |
| Does §14 get a sentence that a page decrypting with script served by the origin protects content from the network, not from the origin or its host? | ☐ |
| Are capability links (keys in fragments) an endorsed shape, a tolerated client choice, or discouraged? | ☐ |

## 3. Cross-cutting threats to the protocol's own commitments

| Commitment | Threat under L3 | Families most affected | Disposition |
|---|---|---|---|
| Static files (#1) | A key or payment endpoint named on the surface is a second dynamic surface | RA-S (if the service is named), OFF (if a key URL is named) | ☐ |
| Same bytes for everyone (§4) | Per-reader key fetches on the surface; per-subscriber feed URLs (R1 §4.2); non-committing AEAD equivocation (R2 §1.2) | all | ☐ |
| No identity (#11) | Readers' public keys in wraps act as pseudonyms; IdP groups mapped to keys | RA-R most | ☐ |
| No follower graph, no metrics (#12, #13, §16.8) | Wrapped-key counts and churn are a public subscriber list and count | RA-R | ☐ |
| Hash covers what readers read (#20); pins irrevocable (#8); withdrawal is cooperation (§9) | Plaintext hash enables guess confirmation; ciphertext hash breaks maintenance detection; pins defeat revocation and survive key loss as unreadable bytes | all | ☐ |
| Levels are strict supersets (#4) | L2 readers must see a valid document and feed entry for a sealed item | all (placeholder design) | ☐ |
| Enterprise is a separate client; RFC-5 client-neutral | The enterprise key service (KMS/KACLS) is product infrastructure; the protocol naming it would bind clients | RA-S | ☐ |

## Questions this raises for the design round

1. Which adversary is the design *for*? A paywall's main adversary is the paying reader who
   republishes (§1.3), whom no scheme stops; an enterprise's is the former member and the
   compromised studio (§1.2, §1.5); commit–reveal's is the stranger before the reveal (§1.1).
   The three lead to different minimum designs.
2. Is "a stranger learns the audience size" (§1.1) a prevent, given #12/#13?
3. Is equivocation by the publisher (§1.5, §1.6) something the protocol prevents (key or
   plaintext commitment), discloses, or leaves out of scope?
4. Is a sealed version's pin compatible with any revocation promise the round wants to make
   (§1.2)?
5. Does the in-browser decrypting page (§2) get a disclosure sentence in §14, and are
   capability links endorsed?
6. Is post-quantum exposure of public wrapped keys (§1.1) a prevent (hybrid KEM required), a
   disclose, or out of scope for 0.5?
7. Is quoting, forking or generating from a sealed item into a wider audience (§1.3) a
   prevent (publish error), a disclose (as #93 F3 did at the enterprise boundary), or out of
   scope?

## Own view (Opus 5.5, clearly marked; not a finding)

Most rows that matter most cannot be prevented by any family: the paying reader who
republishes, the former member's past and pinned access, and the origin's control of a
decrypting page. The design choice shows up mainly in §1.1 (what strangers learn) and §1.5
(how much a compromised studio or lost key costs). RA-R leaks the audience to strangers;
RA-S and OFF do not, but they concentrate trust in a service. I expect the round's §14
text to be mostly "disclose" rows, in the same voice as the existing withdrawal sentences.
