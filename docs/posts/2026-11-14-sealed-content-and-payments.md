# Sealed Content and Payments: Two RFCs for Level 3

Everything a blyg publishes today is public. Anyone who can reach the origin gets the same bytes, and every item, quote and changelog note can be read by anyone. That is what made the first four protocol versions simple. It is also why a whole class of ordinary writing has nowhere to go: the board memo with one name that can't be shared yet, the working notes meant for a team, the essay you want to charge a dollar for.

Two new requests for comments open Level 3, the protocol's next layer. **RFC-6, sealed content and permissions,** lets an item carry encrypted words beside its readable ones, and says how a reader gets the key. **RFC-7, payments,** treats paying as one more reason to hand over a key. They come out together because RFC-7 is built entirely from RFC-6's parts. Both are drafts, and both are open for your comments. This post explains them in plain language.

## The use case: sharing inside an organisation, with no assumed structure

The first user is the Protocol Institute, a decentralised organisation with no single sign-on. Some of what its members write should reach everyone, some only a working group, and some only one officer. A traditional company with one central set of permission groups has to fit the same design, and so does a reader at another organisation, using a different client, asking to see something.

One case shaped the design more than any other: **redaction**. Picture a sentence that should be public, except for one phrase inside it that only the board may read.

## Covers: what older readers see

Here is what that sentence looks like on the wire:

> There is an acquisition offer from **the acquirer**. The board meets on Friday.

"The acquirer" is a **cover**: ordinary words the author wrote to stand in for the sealed ones. The real name is encrypted and sits in a new `sealed` list in the item document. A reader that holds the key swaps the cover for the real text. Every other reader shows the cover.

This brings no new markup and no placeholder syntax. A cover is ordinary prose, so every client that exists today keeps working: it shows a sensible sentence, the feed entry reads normally, and a reader that has never heard of Level 3 sees nothing broken. The same mechanism works at three sizes: a phrase inside a sentence, a whole item behind a teaser, and a sealed item quoted into a thread.

## Locks, not lists of readers

The obvious design is to list every reader in the document, each with a copy of the key encrypted to them. RFC-6 rejects it, because that list would be public. Everyone could see how many people can read an item and watch the number change over time. The protocol has always refused follower lists, and an audience list is one under another name.

Instead, a document names **locks**. A lock is a random id standing for a key. Holding the lock's key means you're in the group, and the group's membership is never written down anywhere public. One entry can carry several locks (any one of them opens it), and sealed content can sit inside other sealed content, so a reader has to hold both keys.

## Grants as files at secret addresses

How does a reader get a lock key? Each lock has a **home**: a URL that answers requests for keys. A key granted to you is wrapped to your public key and saved as a plain static file at an address only you and the home can work out. To check whether you've been let in, you fetch that address. Nobody else can tell which addresses exist or for whom.

So a home can pre-approve people without ever contacting them. It writes the file, and the reader finds it on the next check.

When a request has to be decided, the home works through what RFC-6 calls a **ladder**: pre-approved, automatic yes, automatic no, or ask a person. That person can be the lock's owner or the owner's **AI delegate**, working from standing instructions. How a home decides is entirely its own business. It might use a roster, a sign-on token, a signed NDA or a payment.

One rule protects member lists. A home may answer "granted" on the spot only when the request itself earned it, for instance with a payment or a token. If it answered instantly for everyone already on its roster, anyone could name a stranger and learn from the reply whether that stranger is a member.

## A promise the publisher can't quietly break

Two smaller pieces of cryptography do a lot of work here.

**A publisher can't show two readers two different texts.** Each sealed entry carries a public **commitment** that every key holder checks. Without it, a dishonest publisher could craft one encrypted message that opens to two different texts under two different keys, and give each reader a different one.

**Nobody can confirm a guess.** An earlier sketch put a hash of the sealed text in public view. Anyone who suspected the redacted name was "Northwind Capital" could have hashed that guess and compared. The draft drops it.

## Quoting doesn't widen the audience

Quoting is at the heart of Blygger, so quoting sealed content had to work. When you quote an item that has a sealed span, your thread carries a copy of the encrypted entry, not the plaintext. Readers who hold the key see through the redaction in your thread too. Everyone else sees the cover. Quoting into a thread meant for a wider audience lets nobody new read the sealed words. In the RFC's phrase: **audience travels with the lock, not with the context.**

## What it does not pretend to do

RFC-6 is plain about its limits. Revocation stops future grants and future content, and nothing more. Nothing recalls a key or a text someone already opened. A pinned version keeps its keys forever. And a stranger can still see that a sealed item exists, roughly how large it is, when it changed, and what it cites. The RFC lists every such leak so that you can judge whether it is acceptable for your use.

## RFC-7: payment is one more way to earn a key

RFC-7 starts from one principle. **Payment rests on competing schemes, as identity does, so the protocol holds as little opinion about it as it can.** The draft adds nothing to the wire. A payment is one more piece of evidence a home can accept, alongside a sign-on token or a signed agreement. A paid-for lock is an ordinary lock.

The interesting choices:

- **Any payment method, unmodified.** A lock's or entry's request URL answers HTTP 402, "Payment Required", in the payment method's own format. That covers x402 (on-chain payments), MPP (which also carries card payments, through Stripe among others), Lightning, or a checkout link for a person at a browser. The protocol names no preferred method. If one wins outright, nothing needs undoing.
- **No prices anywhere in the protocol's files.** There is no price, currency or for-sale flag in any item or manifest. Changing a price is a change at the home, with no new version and no feed event. The cost: an agent has to ask the home about each sealed entry, and the home sees what it looked at.
- **Two doors.** An entry's door sells that one piece. A lock's door sells everything sealed under it for the current period: a subscription. A key bought for version 3 still opens version 4 if the sealed text didn't change.
- **Rent or purchase is the seller's choice, made by which keys it hands out.** Give subscribers the lock key for each paid period and they keep that period's content after they stop paying. Give them one key per item as they read it and access ends when payment does, which is rent as most people know it. The draft recommends neither, and says plainly that "purchase" is weaker than the word suggests unless the seller pins what was sold.
- **Agents are the expected buyers.** The draft assumes the typical purchase is made by an agent working within a spending limit a person set ("anything by this author about biology, under a dollar"), not by a person at a checkout page. It writes rules for that agent: treat the seller's description as untrusted text that may try to steer you, never pay for what you already hold, and keep the receipt and the commitment as evidence of what was advertised against what was delivered.
- **Buying without a blyg.** Pay at an ordinary storefront, then redeem the voucher into a **pass**: a bare key your reader app generates, which works without an account. The draft is plain that a pass is a bearer instrument, like a ticket.

What RFC-7 refuses: anything in the protocol that claims to restrict use after delivery, such as expiry dates, read counts or metering. Nothing could enforce it. Rental as a business is fine. Pretending cryptography can take back what a reader already opened is not.

## Thirteen assumptions to attack

RFC-7 lists the thirteen assumptions it rests on, each with what would change if it is wrong. Agents buy more than people do. People set limits rather than approving each purchase. Small payments are economic on at least one payment method. Subscriptions matter as much as single purchases. Readers without a blyg are a real population. This is the part of the drafts where your experience is worth the most. If you think one of them is wrong, say which and what you see instead.

## How to comment

Both RFCs are published on this blyg with a comment period open until **28 November 2026**. They are published as drafted, before the protocol's editorial pass, so expect revisions during the period; each one is a new version of the same item. Comments use the medium itself:

- **Respond** by stubbing the RFC from your own blyg. Your response names the exact version you read.
- **Quote** the passage you're answering with a partial quote.
- **Counter-propose** by forking the RFC and changing what you'd change.
- **No blyg?** Comment on GitHub: [blygger-spec#34](https://github.com/blygger/blygger-spec/issues/34) for RFC-6, [blygger-spec#35](https://github.com/blygger/blygger-spec/issues/35) for RFC-7.

Each RFC ends with questions for implementers. Would you run a home, or use someone else's? Can your platform do AES-256-GCM, HKDF and X25519 today? Which payment methods would you accept? Is one request per sealed entry tolerable for your agents? Answers to those, from anyone building or planning a client, shape what gets built first.

When the period closes, the rulings are revised in light of what was said and each RFC becomes a technical note. The build then starts small: sealed spans with keys handed over by hand, which alone opens protocol version 0.5. Origin keys, homes and grant files, the request endpoint, and subscriptions follow, each usable without the next.

- [RFC-6 — Sealed content and permissions](https://blyg.blygger.org/t/194zwhh5036j2fxxk5b2hw3m81/)
- [RFC-7 — Payments](https://blyg.blygger.org/t/2wcgk0vrwm3wknmdnxtrdh2ecd/)
