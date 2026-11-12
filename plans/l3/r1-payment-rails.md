# R1 — Payment rails: a fact sheet

**Exploration, not a plan of record.** Written 2026-11-12 by Opus 5.5 for the 0.5 design
round (decision #99), task R1 of [`docs/l3-research-brief.md`](../../docs/l3-research-brief.md).
Serves questions E, C and F. Findings only; my own view is in the last section and is marked.

**Dating.** Every source below was read on **2026-11-12** unless another date is given.
Where a claim comes from a blog post, press coverage or a third-party summary rather than a
specification or official documentation, it says so. Where I could not verify a claim, it
says so.

## 0. Summary of findings

- **x402** is a real, versioned specification (Protocol Version 2, dated 2025-12-09 in its
  own version table), now maintained by the **x402 Foundation** at
  `github.com/x402-foundation/x402`; the older `coinbase/x402` repository is described in
  third-party search results as a development fork (not verified from the repo itself).
  It settles stablecoins on chains through a *facilitator*.
- **"MPP" is not ambiguous in current usage, but it is young.** It is the **Machine
  Payments Protocol**, co-authored by **Tempo Labs and Stripe**, announced 2026-03-18
  (press coverage), specified as the **"Payment" HTTP authentication scheme**. Its core
  Internet-Draft, `draft-ryan-httpauth-payment-01` (dated 2026-03-17), is an **individual
  draft that the IETF Datatracker lists as expired and archived**, not adopted by any
  working group; the living text is `draft-httpauth-payment-01` in `tempoxyz/mpp-specs`
  (last push 2026-11-11). mpp.dev says the core is "submitted to the IETF standards
  track"; the Datatracker does not support "standards track" in the formal sense. Other
  things abbreviated MPP exist (for example `mppsol/spec`, a separate "Machine Payments
  Protocol for Solana" repo created 2026-05-05 with no stars and no activity since
  2026-05-09); the Solana Foundation maintains a **fork** of `tempoxyz/mpp-specs`, which
  suggests convergence on the Tempo/Stripe text.
- **x402 and MPP do the same job at the HTTP layer** — a 402 challenge, a retried request
  carrying proof of payment, a receipt — and differ in header names, in how many rails
  they admit (MPP: cards via Stripe, Lightning, several chains; x402: chain schemes), and
  in governance. Stripe accepts both (MPP on Tempo and Solana; x402 on Base).
- **No rail yields a content key by itself, except two edge cases.** Every rail yields
  something that proves payment *to a verifier*: a settlement response, a receipt header,
  a transaction hash, an NFT balance, a zap receipt, a webhook. Turning that into a key
  needs a party that holds or can derive the key and checks the proof. The two exceptions
  are (1) **Lightning, where the seller chooses the preimage** and could make it key
  material — with two real problems, below — and (2) **threshold key networks (Lit)**,
  which release decryption shares when an on-chain condition holds, with no server of
  the publisher's.
- **The smallest server a static publisher needs**, on every rail except Lit and the
  Lightning preimage trick, is a function that checks a payment proof and returns a
  wrapped key. That function can be third-party (a Cloudflare Worker, a facilitator-style
  service). Cloudflare's own x402 page offers to gate "APIs, web pages, and files with a
  Worker proxy".
- **Conventional publishing (Substack, Ghost, Patreon) gates feeds with a private
  per-subscriber URL and handles leaks by detecting sharing and resetting the URL.** That
  is per-reader bytes, the shape #93 refused as C2 when it is on the protocol surface.

## 1. x402

**Primary sources:** `x402-foundation/x402`, `specs/x402-specification-v2.md` (last
commit to the file 2026-10-26), `specs/transports-v2/http.md`,
`specs/extensions/extension-offer-and-receipt.md`, directory `specs/schemes/` (contains
`exact`, `upto`, `batch-settlement`, `auth-capture`); Coinbase CDP x402 FAQ
(`docs.cdp.coinbase.com/x402/support/faq`).

- **Version.** "Protocol Version: 2". Version history in the spec: v0.1 2025-08-29, v0.2
  2025-10-03 ("transport-agnostic redesign"), v2.0 2025-12-09. Both v1 and v2 messages
  are still seen in the wild (third-party docs show `x402Version: 1`).
- **Roles.** Resource server, client, **facilitator** ("a service that handles payment
  verification and blockchain settlement"). The facilitator exposes `POST /verify`,
  `POST /settle`, `GET /supported`; a resource server may run these itself.
- **Flow (HTTP transport v2).** Client requests → server answers **402** with a
  base64 JSON `PAYMENT-REQUIRED` header listing acceptable payments (`accepts[]`) →
  client retries with a signed authorization in `PAYMENT-SIGNATURE` → server verifies
  (via facilitator), serves, settles → `PAYMENT-RESPONSE` header carries the settlement
  result. The spec defines three *payment flows*: `authorization` (verify → resource →
  settle; the default), `upfront` (settle first), `escrow` (settle a ceiling, then the
  final charge).
- **Assets and chains.** Networks are CAIP-2 ids (`eip155:8453` Base, Solana mainnet and
  devnet, Avalanche, testnets). EVM: "ERC-20 tokens implementing EIP-3009 (Transfer with
  Authorization). Example: USDC"; Permit2 for others. Solana: SPL and Token-2022. The CDP
  facilitator settles on Base, Polygon, Arbitrum, Monad, World and Solana mainnets.
- **Fees and floor.** CDP facilitator: "The first 1,000 facilitator transactions each
  month are free, and each one after that costs $0.001"; "There are no processor fees or
  chargeback fees"; "The facilitator submits the settlement transaction and pays the gas"
  (except a one-time Permit2 approval). The spec states no minimum. The practical floor
  is therefore roughly the facilitator fee plus whatever gas the facilitator is willing
  to absorb; sub-cent payments are technically expressible (amounts are atomic units).
  The `upto` and `batch-settlement` schemes exist to amortise per-payment cost (scheme
  docs listed, not read in full).
- **What the payer proves; what the seller learns.** The payer signs a transfer
  authorization from a wallet. The settlement response includes `payer` (the wallet
  address) and `transaction` (a chain tx hash). **The seller learns the payer's wallet
  address**, and the chain makes the payment public and linkable.
- **Replay.** EIP-3009 32-byte nonce, enforced by the token contract; explicit validity
  windows; signatures.
- **Receipts.** The core receipt is the settlement response (tx hash on chain). The
  **Offer and Receipt extension** adds server-signed offers and receipts (EIP-712 or JWS)
  for "dispute evidence and auditability"; it says its "wire shape and field placement
  are not considered stable".
- **Identity extensions.** `sign-in-with-x.md` and §10.2 ("integration with
  authentication systems (e.g., Sign-In with Ethereum)") exist; not read in full.

## 2. MPP — the Machine Payments Protocol

**Primary sources:** `tempoxyz/mpp-specs` (created 2026-01-05, last push 2026-11-11;
README; `specs/core/draft-httpauth-payment-01.md`; `specs/methods/` lists `card`, `evm`,
`hedera`, `lightning`, `nearintents`, `solana`, `stellar`, `stripe`, `tempo`, `usdc`,
`xrpl`; `specs/intents/` lists `charge` and `subscription`; `specs/methods/lightning/
draft-lightning-charge-00.md`); IETF Datatracker page for `draft-ryan-httpauth-payment`;
mpp.dev/governance; Stripe docs `docs.stripe.com/payments/machine`.
**Secondary:** launch date 2026-03-18 from press coverage (Fortune, The Block, others);
I did not read a Stripe or Tempo announcement directly.

- **What it is.** "An open standard for machine-to-machine payments, co-authored by Tempo
  and Stripe" (README). Authors of the core draft: three from Tempo Labs, two from
  Stripe. Governance (mpp.dev): core via IETF submission; each payment method "maintained
  by its rail".
- **Maturity.** Core draft revision 01 (2026-03-17); the Datatracker lists it as an
  **expired individual draft**, "not endorsed by the IETF", no replacement listed
  (Datatracker read 2026-11-12). The GitHub text continues to change. SDKs exist in
  TypeScript, Python, Rust, Go and Ruby (README). Treat the wire as pre-standard.
- **Flow.** 402 with `WWW-Authenticate: Payment …` challenge → client pays by the method
  named (possibly off-band) → retry with `Authorization: Payment <credential>` → 2xx with
  a `Payment-Receipt` header. It deliberately reuses HTTP authentication framing rather
  than custom headers. Challenges can be bound to the request by an HMAC-SHA256 (§"Challenge
  Binding").
- **Rails.** Method-agnostic core. Stripe says: cards through **Shared Payment Tokens**
  (minimum 0.50 USD), stablecoins on Tempo (USDC.e) and Solana (USDC). Methods directory
  includes Lightning (contributed by Lightspark per press coverage; not verified).
- **Fees and floor.** Stripe: stablecoin minimum 0.01 USDC; "MPP sessions" allow
  sub-cent charges with a 0.01 USDC minimum *settlement*; card minimum 0.50 USD. Stripe's
  public pricing page: cards "2.9% + 30¢", stablecoins "1.5%" with a promotional 0.8%
  through 2027-01-01. Whether these percentages apply to MPP stablecoin charges in
  particular I could not confirm from Stripe's MPP pages.
- **What the seller learns.** Depends on method; for Stripe payments, a Stripe payment
  record. Not uniform.
- **Replay.** Core: "A payment proof MUST be usable exactly once"; concurrency rules
  require at most one settlement and one delivery per credential.
- **Receipts.** `Payment-Receipt`: base64url JSON with `status` ("success"), `method`,
  `timestamp`, `reference` (tx hash, invoice id).
- **Refunds.** Stripe: "Refunds are available through the Refunds API" for machine
  payments.

**Relation to x402.** mpp.dev has a page "use MPP with x402" (seen in search results, not
read). Stripe's x402 docs say to integrate MPP as well if you want cards. They are
parallel, competing HTTP-402 conventions; neither is a standard.

## 3. Existing crypto rails

### 3.1 Lightning and L402

**Sources:** `lightninglabs/L402` `protocol-specification.md` (repo last push
2026-06-09); `tempoxyz/mpp-specs` Lightning charge method; yzernik, "Trustless PTLC for
content" (blog, 2022-01-07); Boltwall README (Tierion).

- **L402.** Server returns 402 with `WWW-Authenticate: L402` carrying a **macaroon** and a
  Lightning invoice; the client pays and presents `<macaroon>:<preimage>`. The server
  checks `sha256(preimage) == H`, where `H` is committed in the macaroon, "with no
  database lookup required". Macaroons carry caveats (expiry, scope) and can be
  attenuated.
- **The preimage.** 32 bytes `r` with `sha256(r)` = the invoice's payment hash.
  **The invoice creator (the seller) chooses `r`.** It is revealed to the payer when the
  payment settles.
- **Can the preimage be key material?** Mechanically yes — the "naive approach" of
  making the decryption key the preimage is described in the yzernik post. Two facts
  limit it, the second from my knowledge of the Lightning HTLC design rather than a
  source read today: (1) the buyer must trust that the preimage really decrypts the
  content (the post's fix uses PTLCs, which are not deployed on Lightning as far as I
  know — unverified); (2) **every routing node on the payment path learns the preimage**
  as the HTLC settles hop by hop, and **a payment hash must not be reused across
  payments** (a router that learned `r` can claim any later HTLC with the same hash). So
  one content key cannot be one preimage for many buyers; a per-buyer preimage could
  instead serve as a per-buyer *wrapping* key or as a proof to a key server.
- **As proof to a key server.** This is what L402 and MPP's Lightning method do: the
  preimage is a single-use bearer proof. MPP's Lightning method says the payment hash is
  the "shareable payment receipt identifier" and "The preimage MUST NOT" appear in logs
  or shared receipts "would allow replay".
- **Floor and reversibility.** Lightning fees are typically small and payments of a few
  satoshis are routine; I did not verify current fee levels today. Settled Lightning
  payments are final: MPP's Lightning method says "the payment cannot be refunded" by the
  protocol once the preimage is revealed.

### 3.2 Direct stablecoin transfers

A reader sends USDC (or similar) to the publisher's address; the yield is an **on-chain
transfer event** (tx hash, from, to, amount). Anyone can verify it from a public node or
indexer. A static publisher cannot see it without some watcher; binding it to a key
needs a service that watches the chain and releases a key to the sender's address (or a
threshold network, §3.4). Transfers are irreversible on chain; issuers can freeze
addresses (USDC's blacklist function — general knowledge, not re-verified today). The
sender's address is public and every payment is linkable to it. No source read for this
row beyond the x402 material; it is included as the baseline that x402 standardises.

### 3.3 Token-gating: Unlock Protocol and NFT ownership checks

**Sources:** `docs.unlock-protocol.com`; `unlock-protocol/unlock` repository (last push
2026-11-11; last tagged release 2025-03-25), code search for `getHasValidKey` and
`cancelAndRefund`.

- A **Lock** is a contract; a purchase mints a **Key**, "an NFT … such as an expiration
  date". Access is checked by calling `getHasValidKey(owner)` on the lock (a public view
  function). Members can `cancelAndRefund` (the contract supports refunds as the lock
  owner configures).
- **Yield:** an NFT in the buyer's wallet. Ownership is public and checkable by anyone.
- **Binding to a key:** needs a checker that, given proof the reader controls the wallet
  (a signature, e.g. SIWE), checks `getHasValidKey` and releases a key — a server, or a
  threshold network (§3.4). Token-gating "as practised" on websites is a server-side or
  client-side check against the chain, i.e. a gate on who gets served, which on the blyg
  surface is the refused C2 shape unless the thing released is a key rather than content.
- **Reveals:** a public list of key holders (the NFT holders) — a member list on chain,
  the thing commitment 4 worries about, though off the blyg surface.

### 3.4 Threshold key release on on-chain conditions: Lit Protocol

**Sources:** search results and Lit's own blog (`spark.litprotocol.com`) and developer
docs (`developer.litprotocol.com`), read 2026-11-12. **Unverified current state.**

- Historically (Lit "v0 Datil", "v1 Naga"): content is encrypted to a network key under
  **access control conditions** (e.g. "holds NFT X", "has paid"); a decrypting client
  proves its wallet and the node network releases decryption shares when the condition
  evaluates true. No server of the publisher's is needed at reading time; the network is
  the third party.
- Lit's migration guide (as summarised in search results) says that in the new
  **"Chipotle" (v3)** design the root key sits in a TEE with rules in Base contracts, and
  that Chipotle's encrypt/decrypt "are not a drop-in replacement for wallet-authenticated,
  dynamic decryption tied to on-chain conditions". Lit's sunset page targeted Chipotle
  production for "March 25th" (year not shown in the summary) with Naga sunsetting 30 days
  later. **I could not confirm what is in production today.** The operational history —
  three networks retired or migrated, each with a forced migration window — is itself a
  finding: content encrypted to a retired network's key must be re-encrypted, which a
  pinned blyg version (bytes promised forever) cannot be.

### 3.5 Nostr: paid relays and zaps

**Sources:** `nostr-protocol/nips` NIP-11, NIP-42, NIP-57 (read via the GitHub API).

- **Paid relays.** NIP-11 relay information includes `payment_required` ("this relay
  requires payment before a new connection may perform any action"), `auth_required`
  (NIP-42 authentication), `restricted_writes`, and a `fees` object. The relay gates
  *access to the relay*, keyed to the user's pubkey after NIP-42 auth. That is per-reader
  serving, gated by identity.
- **Zaps (NIP-57).** A zap request (kind 9734) is sent to the recipient's LNURL server; when
  the Lightning invoice is paid, the server **publishes a zap receipt (kind 9735)** to the
  relays named. Receipts are public events signed by the recipient's LNURL server key.
  Zaps are tips, not access grants; nothing in NIP-57 releases content. A publisher could
  treat a valid zap receipt as proof of payment to a key server.

## 4. Conventional rails (the baseline)

### 4.1 Stripe Checkout with an entitlement record

**Sources:** `stripe.com/pricing`; `docs.stripe.com/billing/entitlements` (index page
only — it confirms an Entitlements feature exists for granting and revoking feature
access; I did not read the API variant).

- Yield: a Checkout session completes; Stripe sends webhooks; the merchant records an
  entitlement (its own or Stripe's Entitlements). The merchant's server must be online to
  receive webhooks and to decide what a reader gets.
- Fees: "2.9% + 30¢" per US card transaction; disputes "$15.00". The 30¢ fixed fee makes
  card payments under about a dollar uneconomic; MPP-via-Stripe's 0.50 USD card minimum
  points the same way.
- Reversible: refunds and card chargebacks. A key already released cannot be taken back.

### 4.2 How Substack, Ghost and Patreon reach feed readers

- **Patreon** (help centre, "RSS feed security & protection"): each member gets a
  private audio RSS URL "unique to your membership" containing "an authorisation token";
  Patreon "monitors feed activity" for one link used from many devices or apps and
  **resets** a shared link; a repeat offence suspends the sharer's comment and DM
  privileges for seven days. The private feeds are audio (podcast) feeds.
- **Ghost** (secondary sources only — I did not find Ghost's own documentation page):
  the public RSS feed carries full text for public posts only; full-text members' feeds
  are a third-party product (FeedPress/Outpost) syncing with Ghost's members API. **404
  Media** (post, 2024-03-26) runs per-subscriber full-text feeds of the form
  `https://404.feed.press/private?key=XXXX` and explains why: a Ghost site that published
  *one* shared paid feed saw it leak, and disabling it would have cut off every paying
  reader.
- **Substack**: paid posts are emailed to and readable by paid subscribers (Substack FAQ).
  I could **not** confirm from an official source whether Substack offers per-subscriber
  full-text RSS for text posts; private podcast feeds exist.
- **Pattern:** a per-subscriber secret URL, revocable per subscriber, with leak
  detection by usage heuristics. In this protocol's terms that is different bytes per
  reader at different URLs, and identity via the URL; #93 refused it on the protocol
  surface (C2), and §12.2 would make the secret part of the subscription identity (R4 §2.6).

## 5. The six questions, line by line

| Rail | 1. What a successful payment yields | 2. Bound to a key without the publisher's server online? Smallest server | 3. Usable by a static-file publisher? | 4. Per item / per version; smallest sensible payment | 5. Reversible? | 6. Agent without a human? |
|---|---|---|---|---|---|---|
| **x402** | HTTP 2xx with the resource; `PAYMENT-RESPONSE` settlement JSON (`transaction` hash, `payer`, `network`); optional server-signed receipt (extension) | **No.** Something must verify and return the key: the resource server behind the 402. Smallest: a function that returns a wrapped key for a resource URL after `/verify`+`/settle` (facilitator does the chain work) | Only through a third party in the request path (e.g. a Worker proxy; Cloudflare documents this) | Yes: the price is per resource URL, so per item or per version is a URL choice. Floor: CDP charges $0.001/tx after 1,000 free; no minimum in spec | Not by protocol (on-chain transfer). Seller may refund voluntarily | **Yes** — the stated purpose ("AI Agent Integration", §12.1 of the spec) |
| **MPP** | 2xx with resource plus `Payment-Receipt` (`method`, `reference`, `timestamp`) | **No**, same as x402: the server that answers the challenge returns the key | Through a third party in the request path; Stripe-hosted options | Per URL. Stablecoin minimum settlement 0.01 USDC; card 0.50 USD (Stripe) | Stripe payments refundable via Refunds API; cards charge-back; Lightning method non-refundable | **Yes** — "machine-to-machine"; Stripe SPTs are scoped agent grants |
| **L402 / Lightning** | Preimage (32 bytes) + server-minted macaroon | **Partly.** A seller-chosen preimage *can* be a key, but it is revealed to every routing node and a hash cannot be reused, so it can only be a per-buyer secret, not the content key. As proof: a key server checks `sha256(r)` statelessly | Through a third party (LNURL/L402 proxy) | Per invoice, so per item or version. Sats-level payments routine (fees not verified today) | **No** — final on settlement | **Yes** — L402 has an `agent-spec.md`; wallets can pay programmatically |
| **Direct stablecoin transfer** | On-chain transfer event | **No**: something must watch the chain and release a key to the payer's address | Only with a watcher service or threshold network | Per transfer; the floor is chain gas (varies by chain; not measured) | No (issuer freeze aside) | Yes, with a wallet |
| **Unlock (NFT key)** | An NFT "key" with optional expiry | **No** without a checker; **yes** with a threshold network that evaluates `getHasValidKey` | Through a checker or Lit-style network | Per lock; a lock per item is possible but each is a contract | `cancelAndRefund` exists if configured | Yes, with a wallet |
| **Lit (threshold release)** | Decryption shares released by a node network when conditions hold | **Yes** — the network replaces the publisher's server | **Yes**, via the third-party network | Per encryption, so per item or version | Depends on the condition (refund ≠ revocation of shares already released) | Yes |
| **Nostr zaps / paid relays** | Zap receipt event (kind 9735) published by the recipient's LNURL server; or relay access after NIP-42 auth | Zap: **no**, a server must accept the receipt as proof. Paid relay: it *is* a server gating by pubkey | Relay: not static. Zap: via a third-party key server | Per zap; tips | No (Lightning) | Yes |
| **Stripe Checkout + entitlement** | Webhook; a merchant-side entitlement record | **No**: merchant's server records and enforces | Only with a hosted service | Per product; 2.9% + 30¢ puts the floor near $1 | Yes: refunds and chargebacks | Only via MPP/SPT-style agent tokens; classic Checkout is human-facing |
| **Substack/Ghost/Patreon** | Account membership; email delivery; a private per-subscriber feed URL | **No**: the platform is the server | No (they are the host) | Subscriptions; single items rare | Yes (platform policy) | No (human accounts) |

## 6. Cross-cutting facts for the round

1. **"Payment yields a key" is always mediated** except in the Lit-style threshold case.
   The design question E is therefore about which mediator, and whether the protocol names
   it (a manifest member, a URL template) or leaves it off-protocol.
2. **x402 and MPP both price per URL.** If a key is fetched per item-version from a URL
   like `{origin}keys/{id}/v{n}`, per-version pricing falls out of URL design; if the key is
   per item or per origin, so is the price. These URLs would be the protocol's second
   dynamic surface (R4 §2.1).
3. **Payment reversibility and key irrevocability do not line up.** Cards and Stripe
   payments reverse for months; a released key does not. Chain and Lightning payments do
   not reverse; they match key release better.
4. **What the seller learns about the buyer:** x402 and direct transfers reveal a wallet
   address and put the payment on a public chain; Lightning reveals little to the seller
   (the payer is hidden behind onion routing) but reveals the preimage to routers; Stripe
   reveals a customer record; Unlock puts the membership on chain as an NFT. None of these
   is protocol identity in #11's sense, but several create a public membership record off
   the blyg surface.
5. **Per-subscriber feed URLs are how the incumbents reach plain RSS readers.** Under
   commitment 2 (same bytes for everyone) and §12.2 (identity = fetch URL), they do not fit
   on the protocol surface; a client could still offer one *off* the mount, which is C1
   territory (#93 F4).
6. **Maturity.** x402 v2 is under a year old; MPP's core draft is eight months old and
   expired at the IETF; Lit has changed networks at least twice in about a year. Any key
   bound to a specific rail's verification will outlive the rail's current version.

## Questions this raises for the design round

1. **E.** Does the protocol name where a reader goes to pay (a manifest member, a URL
   pattern per item/version), or does it stop at "a reader that has a key decrypts" and
   leave payment entirely to clients?
2. **E, #1.** If a key-returning endpoint is named, is it a second carve-out like the
   Webmention receiver (#13) — optional at L3, with static-only L3 publishers possible
   through a third party?
3. **C.** Should the pricing unit (origin, item, version) be decided by the key hierarchy
   or left to the endpoint's URL design?
4. **F.** Given that card refunds and chargebacks can reverse a payment after a key is
   released, does the protocol say anything about reversal, or is that wholly the
   seller's risk?
5. **E.** Is the Lightning preimage worth a special path (preimage as per-buyer wrapping
   key), or should every rail be treated as "proof to a key server"?
6. **Commitment 4.** On-chain rails create public membership records (NFT holders,
   payers' addresses). Does the protocol care about records it does not publish?
7. **Agents (#38).** x402 and MPP are built for agents; conventional checkout is not. Is
   agent purchase a requirement for the design, or one rail's feature?
8. **Durability.** Should a key-release mechanism that depends on a third-party network
   (Lit) be acceptable for content whose ciphertext is pinned forever (§8)?

## Own view (Opus 5.5, clearly marked; not a finding)

The rails converge on one shape at the HTTP layer — a 402 challenge in front of a URL
that returns something after proof of payment — and x402 and MPP are interchangeable for
that purpose. If the round wants payment to reach keys at all, the narrowest protocol
statement that fits every rail is "a key for this item-version may be obtained from this
URL, which may answer 402", with the rail left to the 402. Whether that URL is on the
protocol surface is the real choice, and it is question D more than E.
