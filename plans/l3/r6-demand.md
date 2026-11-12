# R6 — Demand: who has asked, what paid publishing sells, and legal flags

**Exploration, not a plan of record.** Written 2026-11-12 by Opus 5.5 for the 0.5 design
round (decision #99), task R6 of [`docs/l3-research-brief.md`](../../docs/l3-research-brief.md).
Serves questions C, E and I. Findings only; my own view is in the last section and is
marked. **Nobody was contacted.** Questions for named people are listed for Venkat in §1.4.

**Dating.** All sources read on **2026-11-12**. Press and blog sources are marked as such.
Statements marked *(general knowledge)* were not re-checked against a source today.

## 1. In the ecosystem

### 1.1 Method

- `gh search issues` (read-only) across `blygger/blygger-spec`, `blygger/blygger-studio`,
  `blygger/blygger-com` and `blygger/blygger-org`, open and closed, for: *private, paid,
  paywall, encrypt, subscriber, members only, group, visibility, monetiz, permission*.
  Twenty-three distinct issues matched a term; each plausible one was opened and its body
  and comments read.
- `blygger-org/ecosystem/projects.toml` (the census) and `DEVLOG.md` grepped for the same
  terms.
- The RFC-5 comment channels (R5 §1).

### 1.2 What was found

| Where | Who | When | Words (quoted) | What it asks for |
|---|---|---|---|---|
| blygger-spec#10 "Brainstorm" (comment; thread opened by KyleAMathews 2026-09-29, prediction journals raised by miguelito4 2026-10-05) | vgururao (Venkat) | 2026-10-05 | "many predictions will work better if paired with encryption. Post and pin the hash now, reveal the prediction later. … secrecy is a useful feature." | **Commit–reveal**: publish a hash or ciphertext of a prediction now, reveal later. Note that the "post the hash" half needs no encryption at all (a pinned item containing a hash); the "reveal" half is publishing the plaintext later |
| blygger-spec#10 (reply) | miguelito4 | 2026-10-05 | "Commit-reveal is a great addition. It solves the reflexivity problem I raised … a sealed prediction can't change its own outcome or be copied." | Same: sealed predictions |
| `plans/private-items-proposal.md` (request) | Venkat | 2026-11-04 (session 59) | publishing an item that references a private item is blocked unless … (c) "something like a paywall/permissioned-access gate condition is met" | A **gate**, paywall or permissioned, on referenced private items |
| same, §8 answer 4 | Venkat | 2026-11-04 | "Paywall/gate: not yet, but getting closer. Enterprise deployments are under discussion." | **Enterprise** as the concrete case |
| RFC-5 (`docs/rfcs/rfc-5-enterprise-deployment.md`) | Venkat's direction; Opus draft; Fable rulings | 2026-11-04/05 | "Enterprises get audiences by running one origin per audience" | Shape E (per-item audiences in one origin) is the named missing capability; **no named case yet** (R5 §1) |
| blygger-spec#27 (RFC-5 comments) | — | to 2026-11-12 | none | — |
| Decision #99 | Venkat | 2026-11-09 | "privacy, encryption and paid access … emerging payment rails (x402, MPP, existing crypto) and enterprise sign-on" | The L3 scope itself |
| Census (`projects.toml`) | — | — | One bespoke blyg whose *generator* is private (benmayhew); nothing about private or paid content | — |
| Issues mentioning "group" | aneeshsathe, chrisbodhi, KyleAMathews, others | — | (about hopper groups, member leaving a house, extension mechanisms) | **Not** requests for group visibility; listed as false positives |

**Finding:** apart from Venkat, **one outside person** (miguelito4) has expressed interest in
anything sealed, and that interest is commit–reveal, not private circulation or paid access.
No issue on any of the four repositories asks for paid items, a paywall, private groups or
encryption. No live blyg in the census or the directory advertises paid or private content
(directory not crawled for content; listings only). The enterprise interest is reported by
Venkat and not visible in any public channel.

### 1.3 What the commit–reveal case needs

It is worth separating because it may not need L3 keys at all:

- **Commit now:** publish an item containing `sha256(prediction ‖ nonce)` and pin it. Fully
  possible today; the pin makes the commitment irrevocable (§8).
- **Reveal later:** publish the prediction and nonce in a later item or version; anyone
  checks the hash against the pinned commitment.
- **Encrypted variant:** publish ciphertext now and the key later. This is L3-shaped, but
  the "key" is published to everyone at reveal time — key distribution is trivial (a public
  later version), and revocation and audiences do not arise.

### 1.4 Questions for Venkat (not sent to anyone)

1. **Enterprise:** who are the enterprise deployments "under discussion" (private-items §8,
   2026-11-04)? Is there a named shape-E case — an item that must move from one audience
   to a wider one — that RFC-5 §7 Q1 asks for?
2. **miguelito4** (blygger-spec#10): would commit–reveal with a plain hash commitment and a
   later reveal meet their need, or do they need sealed text visible to a group before the
   reveal?
3. **Paid content:** is there a named publisher (Venkat's own writing included) who would
   sell items, and at what unit — subscription, single item, single version?
4. **Agents as buyers:** is there a known agent operator who wants to buy access to blyg
   content (the x402/MPP case, R1)?
5. **Patrick Atwater (patwater)** cross-posts items to other networks (blygger-spec#32,
   `syndication`) — worth asking whether any of those networks' paid features are what his
   users want mirrored.

## 2. In the wider field

### 2.1 What paid publishing sells today

- **Subscriptions dominate.** Substack's writer guide sets a $5/month minimum price; Substack
  takes 10% of paid subscriptions, card processing separate (Substack's own post via
  search; fee page not read). A **founding member** tier is a voluntary higher price; CEO
  Chris Best has said it can be up to four times the normal yearly price (Digiday,
  secondary). Patreon sells memberships with tiers (general knowledge). Ghost sells
  memberships (general knowledge).
- **Free previews above a paywall** are the norm: the public post or feed shows an excerpt
  and the paid part is behind the account (Ghost public feeds carry full text for public
  posts only — R1 §4.2, secondary).
- **Per-subscriber private feeds** exist for audio (Patreon) and, through third parties, for
  text (404 Media via FeedPress/Outpost, 2024-03-26). Leaks are handled by resetting the
  URL (R1 §4.2).
- **Single items are rarely sold.** I found no current mainstream text-publishing platform
  whose primary model is per-article sale. The documented attempts below failed or pivoted.

### 2.2 Why per-article micropayments failed for human readers

- **Blendle** (Netherlands, per-article news payments from 2014): pivoted away from
  micropayments in 2019 toward a premium subscription; "of its 1 million-plus registered
  users, only 150,000 had actually made any micropayments" (Nieman Lab, 2019, secondary
  summary); per-article sales ended in August 2019 in the Netherlands and later (reported
  2023) in Germany and the US (Journalism.co.uk, Nieman Lab 2023).
- **Coil** (Web Monetization, streaming micropayments via Interledger): shut down
  2023-03-15; the Web Monetization standard continued under the Interledger Foundation
  (Interledger community posts; Chris Coyier, 2024-01-24, blog).
- **The standing arguments** *(general knowledge; classic sources not re-read)*: Nick Szabo,
  "Micropayments and Mental Transaction Costs" (1999) — each payment decision costs the
  reader attention worth more than the payment; Clay Shirky, "The Case Against
  Micropayments" (2000) — users prefer flat rates and aggregation; Andrew Odlyzko's work on
  flat-rate preference in communications pricing. The recurring finding: the fee was never
  the main barrier; the decision per item was.

### 2.3 What is different about agents as buyers

- **No mental transaction cost**, which is Szabo's objection: an agent with a budget decides
  per call. x402 states agent integration as a primary use case; MPP calls itself "machine-
  to-machine"; Stripe's machine-payments page says human checkout flows "block agents from
  completing tasks autonomously" (R1).
- **The unit agents buy today is an API call or a data request**, priced per URL (R1 §5).
  An item-version of a blyg maps onto that unit naturally.
- **Fees now permit sub-cent units** on chain rails (CDP facilitator $0.001/tx after a free
  tier; Stripe stablecoin minimum 0.01 USDC; MPP sessions sub-cent with 0.01 settlement) —
  R1. Card rails still put the floor near a dollar.
- **What I could not establish:** any evidence of agents buying *written content* (as
  opposed to APIs and data) at scale. Cloudflare's pay-per-crawl exists as a product for
  charging crawlers (linked from its x402 page; not read), which is the closest signal.

### 2.4 Per-version pricing: precedents

| Precedent | What is priced by version | What it is for |
|---|---|---|
| **JetBrains perpetual fallback licence** | After 12 months of subscription you keep "the latest major version of your tool that was available when your subscription started" and its minor releases, forever (JetBrains sales FAQ) | Pay for a period of updates; keep a frozen version — close to "a pin you paid for" |
| **Paid major upgrades** (classic desktop software) | Buy version N; pay again for N+1 *(general knowledge)* | Revenue from new work |
| **Leanpub / O'Reilly Early Release** | Buy once, receive every later version of an evolving book *(general knowledge)* | Paying for a work in progress; later versions free |
| **Academic versions of record** | Preprint (often free, arXiv) vs publisher's version of record (often paywalled) *(general knowledge)* | Paying for the certified, typeset, citable version — the pin, in this protocol's terms |
| **Serial fiction advance chapters** (Patreon/Royal Road practice) | Patrons read chapters days or weeks early; they become free later *(general knowledge)* | Paying for time, not for the text: a delayed-release paywall |

**Observation:** in every precedent the paid unit is either **a period of updates** or **a
frozen, citable version**, and none charges per incremental revision. The academic and
JetBrains cases attach value to the *frozen* version — which in this protocol is the pin —
while serial fiction sells *earliness*, which maps to "sealed now, public later".

## 3. Legal flags only

Not analysed; listed so Venkat can decide whether any needs advice.

1. **Money transmission.** A key service that takes payment for content as the seller is a
   merchant; a service that receives funds on behalf of publishers, holds them, or
   custodies crypto for them could be a money transmitter or money services business
   (US federal and state rules; e.g. FinCEN MSB registration) *(general knowledge)*.
2. **Stablecoin-specific regulation** (for example the US stablecoin legislation enacted in
   2025 and EU MiCA) may bear on accepting or holding stablecoins *(general knowledge, not
   verified)*.
3. **Sales tax / VAT on digital goods.** Selling e-services to EU consumers triggers VAT at
   the buyer's location (OSS scheme); several US states tax digital goods *(general
   knowledge)*. A per-item or per-version price multiplies taxable events.
4. **Consumer refund and withdrawal rights.** The EU gives consumers a 14-day withdrawal
   right for digital content, lost when supply starts immediately with the consumer's
   express consent and acknowledgement *(general knowledge)*. A released key is
   irreversible; card chargebacks are not (R1 §6).
5. **Export controls on encryption.** Open-source encryption software has had US export
   notification requirements in the past; the current rules for publicly available
   encryption source code should be checked *(general knowledge; not verified)*.
6. **Data protection.** A key service that records which reader obtained which key is
   processing personal data (GDPR et al.); an IdP-linked unwrap log (R5 §6) more so.
7. **Platform terms.** Payment providers (Stripe's stablecoin availability excludes New York
   businesses and limits non-US access — R1 §2) and app stores restrict how digital content
   may be sold.

## Questions this raises for the design round

1. **C, E.** With no outside request for paid items and one for commit–reveal, should the
   round design for the stated case (enterprise, per #99) first and leave paid public
   content as a second client of the same key mechanism?
2. **C.** The precedents value a *frozen* version or a *period* of updates, not individual
   revisions. Does per-version key granularity serve any real pricing model beyond "this
   pin" and "from now on"?
3. **I.** Every incumbent shows a free preview above the paywall. Is the placeholder (R4
   question 1) the author's preview text, and is that the expected shape for plain-RSS
   readers?
4. **E.** Agents are the one buyer class for whom per-item payment is plausible. Is agent
   purchase the case that justifies naming a payment-capable key URL in the protocol?
5. **Commit–reveal.** Does the round want to note that sealed-then-public needs no audience
   machinery (the key is published at reveal), and may be the simplest L3 construct to
   build and exercise first?

## Own view (Opus 5.5, clearly marked; not a finding)

The measured demand is thin: Venkat's own cases (enterprise, the private-items gate,
commit–reveal) and one outside voice. The wider field's record says humans buy
subscriptions and frozen versions, not revisions, and that agents are the only plausible
per-item buyers. If the round needs a first construct to build and exercise under #21's
rule, commit–reveal (sealed now, key published later) exercises encryption, hashing and
pins without touching audiences, identity or payment.
