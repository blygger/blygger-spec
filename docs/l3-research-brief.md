# Level 3 research brief — fact-finding for the 0.5 design round

**Written:** session 64 (2026-11-09), by Fable 5.2, at Venkat's direction. **For:** an Opus
session (or several; the tasks are independent). **Decision behind it:** #99, protocol
version 0.5 is Level 3.

Version 0.5 will specify Level 3: private and paid content on the protocol. Venkat's
starting design is this: **encrypted content goes out on the wire as ordinary static
files, and a reader who holds the right key decrypts and reads it.** Access is meant to
be fine-grained, per item and perhaps per version. He wants payment rails that are now
emerging (x402, MPP, existing crypto) to be able to grant that access, and he wants the
enterprise case (single sign-on and the rest of RFC-5) covered by the same design.

Two families of design are both open and the round will choose between them or layer
them:

- **Ride-along.** The protocol says how keys are distributed and revoked, and the key
  material (wrapped) or a pointer to it travels in protocol documents.
- **Off-protocol.** The protocol says only how content is encrypted and how a reader
  that already has a key uses it. How the key reached the reader is the client's
  business.

This brief asks for facts, so that a later Fable session can design. **It does not ask
for a design.** Nothing here is ruled except #99.

## How to do this work

- **Write findings, not recommendations.** Where a task asks you to compare options, lay
  them out with what each costs. Put your own view, if you have one, in a clearly marked
  last section of the document. Do not write spec text, and do not label anything as
  decided.
- **Use primary sources and date them.** Payment rails and encryption standards in this
  area change month to month. For every factual claim give the source (specification,
  RFC, repository, official documentation) and the date you read it. Say plainly when
  you could not verify something, and when a source is a blog post or an announcement
  rather than a specification.
- **Do not assume this brief is right about the outside world.** In particular, "MPP"
  is the name Venkat used; establish from primary sources what it is, who maintains it
  and how mature it is, and say so if the name is ambiguous.
- **One document per task** in `plans/l3/`, named as below. `plans/` holds unruled
  exploration, which is what these are. Each document ends with "Questions this raises
  for the design round".
- **Nothing is built in the studio, and no money moves.** Task R8 is a throwaway probe
  and has its own rules.
- **Read first:** `plans/private-items-proposal.md` (§5 and §8), RFC-5
  (`docs/rfcs/rfc-5-enterprise-deployment.md`, especially §3.3 and §10), `CLAUDE.md`
  decisions #1, #7, #11, #12, #13, #19, #93, #94, #99, and spec §3, §4, §8, §9, §14.

## What any design has to live with

These are the existing commitments the round will weigh each option against. Research
should report how each option meets or strains them; it should not treat them as
already waived.

1. **Static files** (#1). An origin can be a folder of files on a static host. The one
   dynamic surface so far is the optional Webmention receiver (#13), which was admitted
   as a named carve-out.
2. **Same bytes for everyone** (§4, #93 F1). What an origin serves does not depend on
   who asks. A 401 or 403 on chosen documents was refused (#93, shape C2).
3. **Identity is never in the protocol** (#11). Authors are not addressable, and the
   only authenticated entity is the origin. A scheme that wraps a key to each reader's
   public key has to say what a reader's public key is without creating protocol
   identity.
4. **No follower graph and no metrics** (#12, #13). A list of wrapped keys in a public
   document tells the world how many readers have access, and possibly who.
5. **The hash covers what readers read** (#2, #20), **pins are irrevocable hosting
   promises** (#8), and **withdrawal is cooperation, not cryptography** (§9). The
   protocol has always been honest that a copy, once read, cannot be recalled.
6. **Levels are strict supersets** (#4). A Level 2 reader that meets a Level 3 item must
   still see a valid document and a valid feed entry.
7. **Enterprise is a separate client** and RFC-5 stays client-neutral.

## The questions the design round will rule

Aim the research at these. Each task below says which it serves.

- **A. What is encrypted.** Content only, or also metadata (author, changelog notes,
  `transclusions[]`, `links[]`, `stub_of`, media)? What may stay in the clear?
- **B. What the hash covers.** Plaintext or ciphertext, and what each choice leaks or
  breaks.
- **C. Key granularity.** One key per origin, per group, per item, per version; and
  whether a hierarchy lets one grant cover a subtree.
- **D. Key distribution.** Ride-along, off-protocol, or a layering of the two.
- **E. How a payment becomes a key.** What the protocol says, if anything, about where
  a reader goes to pay and what comes back.
- **F. Revocation.** What it can honestly mean for static files that have already been
  fetched.
- **G. Quoting, forking, pinning and mentioning** encrypted items.
- **H. The enterprise mapping.** How an identity provider's groups become keys.
- **I. What a reader without a key sees**, at Level 2, at Level 0 (plain RSS) and on the
  public page.

## The tasks

### R1. Payment rails — `plans/l3/r1-payment-rails.md` (serves E, C, F)

A fact sheet on each rail, written so that the rails can be compared line by line.

Cover at least:

- **x402.** The current specification and its version; the request and response flow;
  who verifies and who settles (the facilitator role); which assets and chains; fees
  and the practical floor on a payment's size; what the payer proves and what the
  seller learns about the payer; replay protection; receipts.
- **MPP.** The same questions, after establishing what it is.
- **Existing crypto rails.** At least: Lightning with L402 (note what the payment
  preimage is and whether it can serve as key material or as proof to a key server);
  direct stablecoin transfers; token-gating as practised (Unlock Protocol, NFT
  ownership checks); threshold key release on on-chain conditions (Lit Protocol or its
  current equivalents); paid relays and zaps on Nostr.
- **Conventional rails, as the baseline.** Stripe checkout with an entitlement record;
  how Substack, Ghost and Patreon gate a post and deliver it to feed readers (private
  per-subscriber feed URLs are the usual answer; record how they handle leaks).

For every rail answer the same six questions:

1. What does a successful payment yield, concretely: a response body, a receipt, a
   token, a preimage, an on-chain event?
2. Can that thing be bound to a content key without a server of the publisher's being
   online at reading time? If a server is needed, what is the smallest thing it does?
3. Can a static-file publisher use the rail at all, perhaps through a third party?
4. Can it price per item and per version? What is the smallest payment that makes
   economic sense after fees?
5. Is the payment reversible (refund, chargeback), given that a released key is not?
6. Can an agent pay without a human present? This matters because #38 treats agents as
   ordinary readers and authors, and x402 is aimed at them.

### R2. Encrypting static content — `plans/l3/r2-encryption-prior-art.md` (serves A, B, C, I)

How existing systems publish encrypted content as static or replicated data, and what
each standard building block gives.

- **Building blocks:** HPKE (RFC 9180), JWE, age, saltpack, COSE; AES-GCM and
  ChaCha20-Poly1305 limits that matter for many small documents under related keys;
  key derivation by HKDF. For each, say whether a browser can do it with WebCrypto
  alone and whether Python's and Go's standard libraries can. A rule the round would
  like to keep is that a normative requirement be implementable from a standard
  library; report where that fails.
- **Systems to study:** Tahoe-LAFS capabilities and other key-in-the-URL-fragment
  designs; Nostr's encrypted events (NIP-44 and NIP-59); Secure Scuttlebutt private
  groups; Matrix (Megolm) and Signal sender keys; MLS (RFC 9420); whatever AT Protocol
  has published for private data; IPFS-based publishing with gated keys; encrypted RSS
  or podcast feeds if any exist in practice.
- For each system: where keys live, what stays in the clear, how much a ciphertext
  costs in bytes, what an observer learns from the public data, and what happens to old
  content when a member leaves.
- **Post-quantum:** one page on whether "published today, decrypted in fifteen years"
  matters for content that is public ciphertext forever, and what hybrid HPKE options
  exist today.

### R3. Key distribution and revocation — `plans/l3/r3-keys.md` (serves C, D, F)

- **Ride-along options:** per-recipient wrapped keys in the document or beside it; a
  separate key file per audience; key epochs. For each: how size grows with the
  audience, what it reveals about the audience (see commitment 4), and what a
  recipient's key is (see commitment 3).
- **Off-protocol options:** a capability link; a key endpoint run by the client; a
  third-party key service; keys handed over by a payment rail (from R1) or an identity
  provider (from R5).
- **Hierarchies:** how a tree of derived keys (origin, then item, then version) lets a
  single grant cover one version, one item, or everything; what is known about
  granting a *range* of versions; what the cost is when one key in the tree leaks.
- **Revocation, honestly.** Catalogue what each scheme can and cannot do: stopping
  future versions, stopping future items, re-encrypting an archive, and the fact that
  nothing recalls bytes already decrypted. Note how each interacts with pins, which
  promise bytes forever.
- **Loss.** What happens to pinned ciphertext when the publisher loses the key.

### R4. What Level 3 touches in the existing protocol — `plans/l3/r4-spec-audit.md` (serves A, B, G, I)

No outside research. Read `docs/protocol-v0.4.md` end to end and list **every place the
text assumes an item's content is readable by whoever fetches it.** For each one, say
what breaks or changes if the item is encrypted, and what the options are. Expect at
least these:

- `content_md`, `content_html`, `content_hash` (including whether a hash of the
  plaintext lets someone confirm a guess at the text), `media` and the media files;
- the feed entry and its `<description>`, and what a plain RSS reader then shows;
- `items/index.json` and the manifest: what the existence, timing and count of private
  items reveal;
- changelog notes and the depth rule;
- transclusion: a quote bakes the source's words into the quoter's `content_html`, so
  quoting a paid item publishes it in the clear unless something is said; the partial
  quote's re-check; `transclusions[]`, `links[]`, `stub_of`, `forked_from`;
- mention verification (§15.4), which reads the source document's structure;
- generation sources (§5.7): paid text fed to a model;
- pins, pinned pages, withdrawal and the endcap, importer retention (§13.4);
- hoppers and curation display (§13.5), the blygger.com directory, the conformance
  suites.

A table is the right form: construct, section, what it assumes, what encryption does to
it, options. This is the task the round depends on most, and it can start first.

### R5. Enterprise — `plans/l3/r5-enterprise.md` (serves H, F, D)

Start from RFC-5 and its comment thread (the period closes 2026-12-03; report what has
come in). Then establish:

- how OIDC and SAML expose group membership, and how SCIM signals that someone has
  left, since that event is the enterprise meaning of revocation;
- how envelope encryption with a managed key service works in practice (AWS KMS, Google
  Cloud KMS, Azure Key Vault, and customer-held keys), and whether "the identity
  provider decides who may unwrap" is an off-the-shelf pattern;
- what Cloudflare Access and its equivalents already give a whole-origin deployment, so
  the round can see exactly what RFC-5's shape E (per-item audiences in one origin)
  needs beyond it;
- the compliance pressures that pull against encryption: retention, legal hold,
  e-discovery, audit logs of who read what. #93 F5 already ruled how a compelled
  removal or retention appears on the wire; report what encryption adds;
- whether MLS has enterprise deployments that manage document access rather than chat.

### R6. Demand — `plans/l3/r6-demand.md` (serves C, E, I)

- **In the ecosystem.** From public issues, the census and the directory: who has asked
  for private, group or paid items, and in what words. List them. Do not contact anyone;
  if a question to a named person would help, write it down for Venkat.
- **In the wider field.** What paid publishing actually sells today (subscriptions,
  free previews above a paywall, founding tiers) and how rarely it sells single items.
  Summarise the record on why per-article micropayments failed for human readers, and
  what is different about agents as buyers.
- **Per-version pricing.** Find any precedent for charging by version or revision
  (software updates, academic versions of record, serial fiction) and what it was for.
- **Legal flags only.** Note, without analysing, where taking payment for content or
  operating a key service could raise questions (money transmission, sales tax,
  consumer refund rules). Venkat decides whether any of it needs advice.

### R7. Threat model worksheet — `plans/l3/r7-threat-model.md` (serves all)

A structured list for the round to fill in, drawn from R1 to R5: who the adversaries
are (a stranger, a former member, a paying reader who republishes, the hosting provider,
a compromised studio), what each can do under each family of design, and which of those
the protocol should promise to prevent, which it should only disclose, and which are
out of scope. Include the public page that decrypts in the browser with script served
by the same origin, and say what that does and does not protect. Write it last.

### R8. Optional probe, only on Venkat's word — `plans/l3/r8-probe.md`

A throwaway, outside every repository's main branch, to replace guesses with
measurements: encrypt one item document with WebCrypto, decrypt it on a static page from
a key in the URL fragment, and measure sizes and timings; and, separately, put a
key-returning endpoint behind x402 on a test network to see what the flow yields.
Test networks only, no real funds, nothing deployed to a live node. Read
`Code/devops/security-policy.md` before generating any key, and register nothing
without asking.

## Order and size

R4 first; it needs nothing from outside and everything else is read against it. R1, R2
and R5 are independent and can run in parallel. R3 draws on R2. R6 can run at any time.
R7 last. Each of R1 to R5 is roughly a session's work.

## Hand back

When the documents exist, add one line per task to `docs/fable-brief.md` under the Level
3 gate saying where it is and what could not be verified, and tell Venkat the round can
be scheduled. The round's first act will be to decide question D, since most of the
others depend on it.
