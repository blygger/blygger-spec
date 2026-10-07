# RFC-1 — Mentions across identifier schemes: petnames in the studio, full identifiers on the wire

**Request for comments · non-normative · DRAFT FOR FABLE REVIEW · session 40, 2026-10-07
(Opus 5.5, at Venkat's request).** Not yet a decision record: section 10 lists the
questions Fable needs to rule on before it is published for comment. After the
comment period it becomes a technical note (section 10, Q1). It builds
on locked decisions #11 (the opaque `author`), #35 (identity practice, proposed in
`docs/proposals/identity-practice-proposal.md`, which becomes `tn-2`), #36 (groups,
`tn-3`) and #20 (studio grammar versus wire grammar). Like a technical note, an RFC
constrains nothing. Written against protocol 0.3 as published on 2026-10-07; no pre-1.0 version
promises anything (#21).

## 1. The question

Several early users have asked for **multi-author blygs**, and with them comes a
second request: **@-mentions** of the people who write there and of people
elsewhere. Venkat asked for three things:

1. a consistent recommendation for **user identifiers within a domain** that can
   travel through the protocol;
2. an evaluation of how markup in the item body could carry the major
   identifier schemes — **W3C DIDs, Ethereum accounts, ActivityPub, ATProto and
   h-card** — so that clients sharing a convention can resolve @-mentions;
3. a convention in which **the client keeps an address book of contacts across
   schemes**. The author types a short `@handle`, the client looks up the full
   identifiers in that address book, and the full identifiers travel on the
   wire, so that another client can resolve whichever scheme it speaks.

The third request is the design. Sections 2–4 clear the ground, section 5 is the
convention, and sections 6–9 cover reading, scheme details, the reference
client's default and what is rejected.

The constraints are fixed. Authors are never addressable (§5.5, §16.8). The
protocol has no reply primitive and no fourth mention relation (§16.8). The
protocol has no normative write surface (#31), so we use nothing from Micropub,
in keeping with that decision while staying close to the IndieWeb in spirit.
Whatever we recommend has to be HTML and studio practice, not protocol.

## 2. Correcting a premise: the single `author` does not block multi-author blygs

The worry was that an item's author field holds only one name, so a multi-author
blyg would have to sign everything as "community" unless we changed the spec in
a way that breaks RSS. Two parts of that are true and one is not.

- **A multi-author blyg does not need more than one name per item.** `author` is
  **per-item** (§5.5). A masthead blyg with five writers publishes items whose
  bylines differ item by item. That is shape B of `tn-3`, specified since #11, and
  the feed rule is single-**publisher**, never single-author. "Community" is only
  needed if you want it: the Protocol Institute node already uses the byline
  "Editor".
- **RSS is not the binding constraint.** In RSS 2.0, the core `<author>` element
  is a single email address, and we do not emit it. We emit `<dc:creator>` (§7).
  Dublin Core lets that element repeat, and Atom allows several `<author>`
  elements. Many feed readers show only the first creator, which is a display
  limit, not a format limit.
- **The real single-valued thing is our own §5.5.** `author` is one JSON object.
  Only **co-authored items** need more than one person in it, and §5.5's
  extension point already lets them carry more without a spec change (section 4.1 below).

So multi-author blygs work today and need nothing from the protocol. What the
reference client lacks is studio-side: one `author_name` setting stamps every
item (`protocol.ts` sets `author.url` to the origin). That is a client gap, and
section 8 addresses it.

**The census, re-run today** (19 live blygs, the three newest items each): every
item `author` is `{name, url}`, `{name}`, or absent. No client has invented an
authorspace grammar, no item has two people in it, and no body contains
mention markup. Manifest-level `author` has grown `bio`, `links` and `avatar`
in several clients. The field is still empty, so this is still the cheapest
time to recommend something.

## 3. Identifiers within a domain

In shape B (one origin, many bylines), what identifies a member? The answer
follows from #35's spine — **a person is a URL they control** — with one
concession for people who have no URL of their own:

| Member has… | `author.url` | What it proves |
|---|---|---|
| their own site, profile or actor URL | that URL | portable. If the page links back (section 5.3), a reader can confirm the byline from the member's side. |
| nothing of their own | a house-hosted profile page, e.g. `https://house.example/people/alice/` | only that **the house** says so. That is honest: in shape B the house answers for everything (`tn-3` section 5). |

The house profile page is presentation. It is an HTML page like any `page`, not a
protocol construct, so it does not make authors addressable in §16.8's sense:
nothing in the protocol references it. A member who later moves to their own
origin (shape A) takes their own URL with them. A house URL does not travel.
That is the practical reason to prefer the member's own URL whenever they have
one.

**No `user@domain` grammar inside an origin.** `@alice` as typed in the studio is
a **petname**, a name that is meaningful only in this address book (section 5).
It never reaches the wire as an identifier. DNS remains the namespace (#11).

## 4. The five schemes, evaluated

Each scheme answers four questions:
- What is its **stable** identifier, as opposed to its human-readable name?
- Can a reader resolve it with an ordinary fetch?
- How does a person prove control of it?
- What does it reduce to under #35's two proofs: a reciprocal link, or a
  signature?

| Scheme | Human name (mutable) | Stable identifier to put on the wire | Resolution | Proof | Reduces to |
|---|---|---|---|---|---|
| **Web / h-card** | the URL itself | `https://alice.example/` | fetch, then parse the representative h-card | `rel="me"` reciprocal links | link (it *is* #35) |
| **ActivityPub** | `@alice@social.example` | `acct:alice@social.example` (RFC 7565), plus the actor's `https` URL | WebFinger (RFC 7033) maps `acct:` to the actor URL | Mastodon-family servers check `rel="me"` on the links in a profile and serve `rel="me"` on profiles themselves | link |
| **ATProto** | handle `alice.example` or `alice.bsky.social` | the DID, usually `did:plc:…` | DNS TXT `_atproto.<handle>` or `https://<handle>/.well-known/atproto-did`, and the DID document's `alsoKnownAs` points back | two-way handle↔DID binding. A domain handle is DNS control. | link (a domain handle is a URL the person controls) |
| **W3C DID** | none | `did:<method>:…` | method-specific. `did:web` is an HTTPS fetch. `did:plc` needs a directory. `did:key` and `did:pkh` resolve locally. | `did:web`: DNS. Others: a key in the document | `did:web` reduces to a link. The others reduce to a signature. |
| **Ethereum** | ENS name `alice.eth` | CAIP-10 account `eip155:1:0xAb…` (`did:pkh:eip155:1:0xAb…` is the same account) | ENS needs chain access (an RPC endpoint); the account needs nothing | EIP-191 signature (e.g. over `content_hash`, #35 §4.2); EIP-4361 for sign-in | signature |

Four observations decide the design.

1. **h-card is not a rival scheme. It is the envelope.** It is the IndieWeb's
   format for "here is a person and their identifiers": `p-name`, `u-url`
   (which may repeat), `u-uid`, and `u-key`. Every other row can be written
   *inside* an h-card. That makes it the natural carrier for request 3, and it
   is already how Mastodon marks up mentions in HTML (`<span class="h-card"><a
   class="u-url mention" href="…">@<span>alice</span></a></span>`).
2. **Put the stable identifier on the wire, never the name.** ENS names expire
   and transfer, ATProto handles change, and fediverse accounts migrate. The
   address, the DID and the actor's `acct:` are what a distant reader can still
   match a year later. The web is the exception, because the URL is both the
   name and the identifier. That is exactly why #35 chose it.
3. **Three of the five reduce to "a URL the person controls".** Those are the
   web, ActivityPub, and ATProto with a domain handle. `did:web` joins them.
   Only `did:plc`/`did:key` and Ethereum need a signature or a non-HTTP resolver.
   The default can therefore stay boring (section 8) and lose almost nothing.
4. **The schemes differ in cost to the reader, not just in reach.** Resolving
   an ENS name needs chain access, and `did:plc` needs a third-party
   directory. A static reader cannot do either. Any convention has to work for
   a reader that resolves *nothing*, and that pushes the visible fallback onto
   a plain `https` link.

### 4.1 What `author` can carry for co-authored items

A co-authored item keeps one `author` object, as §5.5 requires. It can use the
extension point §5.5 grants, so no spec change is needed:

```json
"author": {
  "name": "Alice Ng and Bob Ruiz",
  "url": "https://house.example/",
  "coauthors": [
    { "name": "Alice Ng", "url": "https://alice.example/", "ids": ["did:plc:7iza6de2dwap2sbkpav7c6c6"] },
    { "name": "Bob Ruiz", "url": "https://social.example/users/bob", "ids": ["acct:bob@social.example"] }
  ]
}
```

A reader that knows only `name` shows "Alice Ng and Bob Ruiz", which is correct.
`<dc:creator>` carries the same combined string. Emitting one `<dc:creator>` per
person is legal, but readers that show only the first would drop Bob. For a
single author, `ids` sits directly in `author` beside `url`. `ids` is the same
array as a mention's alternate identifiers (section 5), with the same emission
rule.

## 5. The convention: an address book of petnames, full identifiers on the wire

This is the design Venkat asked for. It takes its shape from **petname
systems**, and in particular from Zooko's triangle. Zooko's observation was
that a name cannot be global, secure and memorable all at once. The standard
resolution, used by Stiegler's petname designs and by every phone's
contact list, is to keep the memorable name local, to the person who chose it,
and to send the global, secure identifier. `@kyle` is memorable only in
my studio. `did:plc:…` is global and verifiable but nobody can type it.
So the address book holds the mapping, and the wire carries only what other
clients can check.

### 5.1 The address book (studio-private)

Each contact record holds:

- `handle`: the petname the author types (`kyle`). It is unique within the
  book. **It never leaves the studio.**
- `name`: the display name used when the mention renders.
- `url`: the primary `https` URL, used as the link target. It is optional only
  for a contact who has no web presence at all, for example an Ethereum-only
  contact.
- `ids[]`: alternate identifiers in their stable form (section 4 observation 2).
  Each carries **provenance**:
  - `self` means the contact publishes it themselves, for example as a
    `rel="me"` link or an h-card `u-url` at their `url`, or as an
    `alsoKnownAs` entry in their DID document;
  - `bound` means the scheme's own two-way binding was checked. Examples are a
    handle and DID that point at each other, or WebFinger agreeing with the
    actor;
  - `entered` means the author typed it in, and nothing has checked it.
- `member: true` for people who publish at this origin. In shape B the
  house's member roster is simply the book's member entries. The roster supplies
  each member's byline, and the members sign in with #31's scoped tokens.

**How the book fills itself.** When the author adds a contact by any single
identifier, the studio resolves outward from it and gathers what it can:

- from a URL, it fetches the page and reads the representative h-card and the
  `rel="me"` links, which reveal the person's fediverse, Bluesky and GitHub
  profiles, all `self`;
- from `@alice@social.example`, it runs WebFinger, reaches the actor, and reads
  the actor's profile links;
- from an ATProto handle, it resolves the DID and checks the DID document's
  `alsoKnownAs`;
- from `did:web`, it fetches the DID document.

Subscriptions supply contacts for free: every subscribed blyg's `author` already
carries a `name` and `url`, and the studio can offer to add it.

### 5.2 Writing: `@handle` is studio grammar and is consumed at publish

The editor offers autocomplete on `@`. The grammar is **studio-private** under
#20's two-layer split, like TK. It is consumed at publish, and it never appears
in `content_md`:

- `@kyle` that matches a contact turns into a mention.
- `@word` that matches nothing stays literal text, and the editor shows a soft
  warning with an "add contact" action. It is never a publish error, because `@`
  is common in prose, in code and in email addresses. Text in code spans and code
  blocks is never touched, which is the same rule as #54.

**Why it must be consumed rather than left in `content_md`:** forkers re-parse
`content_md` (#63). If `@kyle` stayed in the text, it would travel to a forker
whose address book has no `kyle`, or a different one. That would make one
person's petname resolve to another person in someone else's fork. Under
#43's boundary test, a grammar that a third party has to re-parse belongs to the
protocol. This one must not become protocol (§16.8), so it must not survive
publish.

### 5.3 What goes on the wire

**In `content_md`:** a plain markdown link, which any markdown reader understands:

```markdown
Thanks to [@Kyle Mathews](https://bricolage.io/) for the edge-cache work.
```

**In `content_html`:** the same link, wrapped as an h-card that carries the
contact's alternate identifiers:

```html
<span class="h-card"><a class="u-url p-name" href="https://bricolage.io/">@Kyle Mathews</a><data class="u-url" value="did:plc:7iza6de2dwap2sbkpav7c6c6"></data><data class="u-url" value="acct:kyle@social.example"></data></span>
```

The markup follows these rules:

- **The visible anchor is the contact's `https` URL.** A reader that knows
  nothing about h-card shows a link, and clicking it works. A contact without
  a URL renders as `<span class="h-card"><span class="p-name">@Name</span>…</span>`,
  which shows a name with no link.
- **Each alternate identifier is a `<data class="u-url" value="…">`.**
  microformats2 parsers read `<data value>` for `u-*` properties, and `u-url`
  is allowed to repeat. `<data>` renders nothing, so readers that ignore it lose
  nothing. All these values are absolute URIs, so §5.2's rule that
  `content_html` is self-contained holds.
- **Only `self` and `bound` identifiers go on the wire by default.** The
  `entered` identifiers stay in the book. Putting an unchecked DID beside
  someone's URL tells every reader that the two are the same person, and the
  author never verified that. The author MAY choose to publish `entered`
  identifiers per contact, but the studio should not do it unasked.
- **Order carries no meaning.** The anchor's `href` is the primary identifier;
  everything else is unordered.
- **Mentions are silent on the wire** in exactly the sense in which `[[id]]` is
  silent (§10.1). They add no `transclusions[]` entry, no relation (§15.4) and no
  new field. Notification is a separate question, which section 10 Q2 asks Fable
  to rule on.

Why this is not a spec construct: the markup is ordinary HTML using a published
W3C-community vocabulary, inside a field that already accepts any editorial
HTML. No reader, receiver or publisher has to change for it to work, so it fails
every part of #43's test for protocol. It uses no `blyg-` class and no
`data-blyg-*` attribute. Those prefixes are spec vocabulary (§10.2), and using
one would turn this into a spec construct by the back door.

### 5.4 The byline uses the same record

When a member publishes, the studio fills `author` from their contact record:
`name`, `url`, and the same filtered `ids`. A permalink page renders the byline
as an h-card (`p-author h-card`) inside the item's `h-entry`. A
microformats-aware reader then gets the byline and the mentions from one parse,
and the item becomes a valid IndieWeb post without any work on the reader's part.

## 6. Reading: resolving a mention in the scheme you speak

A receiving client finds `.h-card` elements in `content_html` and collects the
`href` and the `<data class="u-url">` values. It then does whatever its own
schemes allow:

- **Match against its own address book.** It normalises each identifier per
  scheme:
  - `https` URLs: lowercase the scheme and host;
  - `acct:` identifiers: compare case-insensitively;
  - Ethereum addresses: compare case-insensitively and treat
    `did:pkh:eip155:…` as the same account as `eip155:…`;
  - DIDs: compare exactly.

  The client then looks for a contact holding any of the identifiers. On a
  match it MAY show the mention as *the reader's own* contact, under the
  reader's petname.
- **Resolve schemes it speaks.** An ATProto-aware reader can link the DID to a
  Bluesky profile, a wallet-aware reader can show the ENS reverse name, and a
  fediverse-aware reader can offer to follow the actor.
- **Do nothing.** The link still works, which is the floor.

Three rules protect readers. They mirror #35's reader rules:

1. **A relabel replaces the whole mention.** If the reader shows its own
   contact's petname, it also uses its own contact's URL as the link.
   Otherwise a publisher could pair the victim's DID with the attacker's
   `href`, and a reader would print the victim's name over the attacker's
   link. With this rule, a forged pairing makes the reader show its own,
   correct contact, with no way to redirect the click.
2. **A mention's identifiers are the publisher's claim and never prove anything.**
   An h-card that lists a URL and a DID together does not tell the reader that
   they belong to one person. A reader MUST NOT add a mention's identifiers to
   its own contact record without checking them. This is #35's rule against
   merging identities across origins without a verified claim, applied to
   mentions.
3. **No counts and no gating.** "You were mentioned 40 times" is a follower
   metric by another name (#12, #13). A client may list mentions of a contact
   for its own owner. It never publishes them as a number.

**Quotations carry other people's mentions.** A baked transclusion copies the
source's `content_html`, h-cards included (§10.2, verbatim). Those mentions are
the *quoted* author's speech. The quoting client MUST NOT treat them as its own,
whether for notification, for its book, or for display as "mentioned by me".

**The reference reader's sanitizer drops this markup today.**
`blygger-studio/src/importer/sanitize.ts` keeps `class`, but it does not have
`data` in its tag list, so the element is unwrapped and its `value` removed. It
also strips any `href` that is not `http(s)`/`mailto`/`tel`. The fix is small:
allow the `<data>` element with `value` (inert text, never fetched). Without
it, the reference client would publish the full identifiers and then throw them
away on every read. Other clients' sanitizers will vary. Every reader keeps the
visible link, so the design degrades to an ordinary link.

## 7. Scheme notes

- **ActivityPub.** On the wire, an `acct:` identifier plus the actor URL as
  `href`. Actually *notifying* a fediverse account requires delivery to its
  inbox as an ActivityPub actor. A blyg is not an actor and should not become
  one in order to do this. Bridges such as Bridgy Fed, which turn Webmention-sending
  web sites into fediverse presences, are the route for anyone who wants it,
  outside the protocol.
- **ATProto.** Emit the DID, not the handle. A handle that is the person's own
  domain is the best case of all: their `url` is `https://alice.example/` and
  their DID resolves back to that domain. One record then counts as `bound` in two
  schemes.
- **DIDs.** `did:web` is a URL with extra steps (#35). Other methods are stored and
  emitted when `self` (listed in the person's h-card or `rel="me"` links) and are
  otherwise left to clients that resolve them.
- **Ethereum.** Emit CAIP-10. ENS is an input convenience, because a name that
  can expire must never be the wire identifier. Proof of control is a signature,
  which is #35's second proof. A signed byline (EIP-191 over `content_hash`) is
  that proposal's mechanism, unchanged. Whatever the address book does, a
  wallet scheme is meaningful in a mention only when the person themselves
  published the address at their URL.
- **h-card.** It is the carrier format. The contact's own representative h-card
  is also where the book learns their other identifiers. In practice, a person
  who wants to be mentionable across schemes lists them on their home page.

## 8. Recommendation for the reference client

The client should stay boring (the ruling that tabled blygger-studio#35: "studio should be
boring"), so its default is narrow, and every wider scheme belongs in other
clients or in extensions.

1. **Per-item bylines from a member roster**, which closes the real multi-author
   gap. A member's `author.url` is their own URL when they have one, otherwise a
   house profile page. Tie this in with #31 tokens so each member's scoped token
   publishes under that member's byline.
2. **An address book with `@handle` autocomplete**, consumed at publish into a
   markdown link in `content_md` and an h-card in `content_html`, as in
   section 5.
3. **Schemes it resolves when a contact is added:** `https` (h-card and `rel="me"`),
   fediverse handles (WebFinger) and ATProto handles (DNS or well-known, giving
   the DID), plus `did:web`. These all reduce to a URL or a DNS check, and none of
   them needs a vendored dependency (the session-29 ruling).
4. **Schemes it stores but does not resolve:** other DIDs and CAIP-10 accounts. It
   accepts them as `entered`, and emits them only when the contact's own page
   lists them. ENS lookups, wallet sign-in and signature checking belong in an
   extension, not the base client.
5. **Its sanitizer keeps `<data value>`**, so it reads the markup it writes.
6. **No notification by default.** A mention is silent like `[[id]]` until Fable
   rules on Q2.
7. **Later: IndieAuth for member sign-in.** IndieAuth proves that a member
   controls their URL at the moment the house mints their token, so the
   roster's `url` becomes verified from the member's side without a second
   fetch. It fits #52 (an OAuth-style minting flow) and is the one IndieWeb spec
   besides Webmention and microformats that the studio has a use for.

**Of the five schemes, the reference client should emit h-card markup and
recognise the web, ActivityPub, ATProto and `did:web` natively, and treat
Ethereum and other DID methods as data it carries but does not interpret.**
The full identifier list still goes on the wire for every scheme, which is what
lets a wallet-aware or ATProto-native client resolve what the reference client
only carries.

## 9. Rejected designs

Recorded because each will be re-proposed.

1. **An `@` construct in the spec** (a MAY directive in §10.1, a `mentions[]`
   field in the item, a `blyg:mention` feed element). Rejected because it would
   make authors addressable (§16.8). It would also add a reference kind that
   receivers would be expected to act on, which is a reply primitive by another
   route. Finally, it would freeze one identifier vocabulary into a permanent
   surface while the schemes themselves keep moving.
2. **Leaving `@handle` in `content_md` for each reader to resolve.** A
   petname means something only in the book that defined it. Shipping one
   gives every forker and reader a name that resolves to whoever *they* call
   `kyle` (section 5.2).
3. **One canonical scheme that everyone must use** (all DIDs, or all fediverse).
   This picks a winner among live communities. It also adds a resolver as a
   dependency for every reader. The census shows that the field already chose
   the URL.
4. **`user@domain` addressing inside a shared origin.** Closed at #11 and again
   in `tn-3` section 8: the path or subdomain already serves as the namespace.
5. **Putting `entered` identifiers on the wire by default.** That would make
   every author an unwitting identity broker, publishing guesses about which
   accounts belong together.
6. **`data-blyg-ids`.** It would survive today's sanitizer because of the
   `data-blyg-` prefix. Rejected because that prefix is spec vocabulary, and
   using it here would add a construct silently. Fix the sanitizer instead.
7. **Micropub** as the members' write path. No normative write surface (#31).
   The studio's own API with scoped tokens already serves the purpose.
8. **Salmention-style propagation of mentions upstream.** It pushes other
   people's responses onto a target's page. §15.5 forbids that: nothing lets a
   stubber put words on the target's page.

## 10. Questions for Fable

- **Q1. Sequencing.** Venkat's route: once Fable has edited this, publish it
  at blygger.org as an RFC with a comment period, and only then build it in
  the studio. Shipping in the reference client will be read as a blessing by
  other clients, so the comments have to come first. #35 gates `tn-2` on one
  client emitting a proof and a second verifying it. Applied here, that gate
  means the RFC becomes a technical note after the comment period, once one
  client emits mention h-cards and another resolves them. Confirm the route,
  and whether this RFC then folds into `tn-2` or becomes its own note.
- **Q2. May a mention notify?** The W3C answer is to send a plain Webmention to
  the mentioned URL. IndieWeb sites receive these, and blyg receivers already
  hold plain mentions apart from verified ones (§15.6). The tension: §16.8 rules
  out "a fourth mention relation for links", and `[[id]]` was kept silent on
  purpose so that one citation form never notifies. Recommendation: allow an
  opt-in, per-mention plain Webmention to the person's URL. It would be
  explicitly outside §15, never sent by default, and never sent for mentions
  inside baked quotes.
- **Q3. Reciprocity on a group origin.** #35's proof is `rel="me"` from
  `author.url` back to the origin, meaning "this origin is also me". That is
  right for a one-person blyg and wrong for a house: Alice is not the house.
  Recommendation: on a shared origin, any link from `author.url` to the origin
  counts as an *acknowledgement*, and readers show it as "linked from
  alice.example" rather than "verified". `rel="me"` stays the proof only where
  the origin is the person.
- **Q4. Should the spec say anything?** One candidate sentence for §5.2 or §13:
  "`content_html` MAY carry microformats2 markup; readers that sanitize SHOULD
  preserve `class` and `<data value>`." Recommendation: no spec text yet.
  Revisit it once a second client emits the markup, because until then the
  sentence describes a single client.
- **Q5. `ids` in `author`.** The alternative is to keep `author` as `{name,
  url}` and let readers find other identifiers on the person's own page.
  Recommendation: allow `ids` as a conventional member, filtered as in section
  5.3. A reader should not need a fetch to match a byline against its address
  book. Since every value is `self` or `bound`, the member adds no new claim.
