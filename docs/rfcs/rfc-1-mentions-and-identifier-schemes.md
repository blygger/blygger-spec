# RFC-1 — Mentions across identifier schemes: petnames in the studio, full identifiers on the wire

**Request for comments · non-normative · DRAFT, awaiting publication · session 40,
2026-10-07.** Drafted by Opus 5.5 at Venkat Rao's request; edited the same session by
Fable 5.1, whose rulings on the five open questions are section 10. An RFC is a
recommendation put up for comment *before* any client builds it, because the
reference client shipping a convention reads as a blessing. Like a technical note,
an RFC constrains nothing. After its comment period and the gate in section 10,
ruling 1, it becomes a technical note. It builds on locked decisions #11 (the opaque
`author`), #35 (identity practice, proposed in
`docs/proposals/identity-practice-proposal.md`, which becomes `tn-2`), #36 (groups,
`tn-3`), #20 (studio grammar versus wire grammar) and #32 (`[[id]]` is silent).
Written against protocol 0.3 as published on 2026-10-07; no pre-1.0 version promises
anything (#21).

## 1. The question

Several early users have asked for **multi-author blygs**, and with them comes a
second request: **@-mentions** of the people who write there and of people
elsewhere. The request (Venkat Rao, session 40) was for three things:

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
client's default and what is rejected. Section 10 records the rulings.

The constraints are fixed. Authors are never addressable (§5.5, §16.8). The
protocol has no reply primitive and no fourth mention relation (§16.8). The
protocol has no normative write surface (#31), so nothing here comes from
Micropub, in keeping with that decision while staying close to the IndieWeb in
spirit. Whatever this RFC recommends has to be HTML and studio practice, not
protocol.

## 2. Correcting a premise: the single `author` does not block multi-author blygs

The worry was that an item's author field holds only one name, so a multi-author
blyg would have to sign everything as "community" unless the spec changed in
a way that breaks RSS. Two parts of that are true and one is not.

- **A multi-author blyg does not need more than one name per item.** `author` is
  **per-item** (§5.5). A masthead blyg with five writers publishes items whose
  bylines differ item by item. That is shape B of `tn-3`, specified since #11, and
  the feed rule is single-**publisher**, never single-author. "Community" is only
  needed if you want it: the Protocol Institute node already uses the byline
  "Editor".
- **RSS is not the binding constraint.** In RSS 2.0, the core `<author>` element
  is a single email address, and the protocol does not emit it. The feed carries
  `<dc:creator>` (§7). Dublin Core lets that element repeat, and Atom allows
  several `<author>` elements. Many feed readers show only the first creator,
  which is a display limit, not a format limit.
- **The real single-valued thing is the protocol's own §5.5.** `author` is one
  JSON object. Only **co-authored items** need more than one person in it, and
  §5.5's extension point already lets them carry more without a spec change
  (section 4.1 below).

So multi-author blygs work today and need nothing from the protocol. What the
reference client lacks is studio-side: one `author_name` setting stamps every
item (`protocol.ts` sets `author.url` to the origin). That is a client gap, and
section 8 addresses it.

**The census, re-run 2026-10-07** against the 20 blygs listed at blygger.com (19
reachable), the three newest items each: every item `author` is `{name, url}`,
`{name}`, or absent. No client has invented an authorspace grammar, no item has
two people in it, and no body contains an h-card or mention markup.
Manifest-level `author` has grown `bio`, `links` and `avatar` in several clients.
The per-item field is still empty, so this is still the cheapest time to
recommend something.

## 3. Identifiers within a domain

In shape B (one origin, many bylines), what identifies a member? The answer
follows from #35's spine — **a person is a URL they control** — with one
concession for people who have no URL of their own:

| Member has… | `author.url` | What it proves |
|---|---|---|
| their own site, profile or actor URL | that URL | portable. If the page links back (section 5.5), a reader can confirm the byline from the member's side. |
| nothing of their own | a house-hosted member page, e.g. `https://house.example/people/alice/` | only that **the house** says so. That is honest: in shape B the house answers for everything (`tn-3` section 5). |

The member page is presentation. It is an HTML page like any `page`, not a
protocol construct, so it does not make authors addressable in §16.8's sense:
nothing in the protocol references it. It has a second job, which section 5.5
gives it: it is the origin-side end of the reciprocal proof for a member who
does have their own URL. A member who later moves to their own origin (shape A)
takes their own URL with them. A house URL does not travel. That is the
practical reason to prefer the member's own URL whenever they have one.

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
| **Ethereum** | ENS name `alice.eth` | the account as a DID, `did:pkh:eip155:1:0xAb…` (the CAIP-10 account `eip155:1:0xAb…` wrapped; see section 7) | ENS needs chain access (an RPC endpoint); the account needs nothing | EIP-191 signature (e.g. over `content_hash`, #35 §4.2); EIP-4361 for sign-in | signature |

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

A fifth, smaller observation sets the wire vocabulary: with Ethereum accounts
written as `did:pkh:`, **everything on the wire is an `https:`, `acct:` or
`did:` URI**. Three schemes, three normalization rules (section 6), and a
matcher needs nothing else.

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
rule, and is ruled in as a conventional member in section 10, ruling 5. It is
distinct from the manifest-level `links` that several clients already emit:
`links` are labelled links for display, `ids` are identifiers for matching.

## 5. The convention: an address book of petnames, full identifiers on the wire

This is the design the request asked for. It takes its shape from **petname
systems**, and in particular from Zooko's triangle. Zooko's observation was
that a name cannot be global, secure and memorable all at once. The standard
resolution, used by Stiegler's petname designs and by every phone's
contact list, is to keep the memorable name local, to the person who chose it,
and to send the global, secure identifier. `@kyle` is memorable only in
one studio. `did:plc:…` is global and verifiable but nobody can type it.
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
  each member's byline, and the members sign in with #31's scoped tokens. The
  roster changes nothing about accountability: the house still withdraws any
  item and owns every pin (`tn-3` section 5).

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

The same fact sets what a fork keeps. A forked thread descends from the pinned
document (#57), so its baked `content_html` carries the h-cards. A forked
*fragment* is re-rendered from `content_md` (#63), so it carries the plain
link and not the alternate identifiers, unless the forking client's own book
knows the URL and re-wraps it. That is correct: the identifiers were the
original publisher's statement about their contact, and a fork is the forker's
speech.

### 5.3 What goes on the wire

**In `content_md`:** a plain markdown link, which any markdown reader understands:

```markdown
Thanks to [@Kyle Mathews](https://bricolage.io/) for the edge-cache work.
```

**In `content_html`:** the same link, wrapped as an h-card that carries the
contact's alternate identifiers:

```html
<span class="h-card"><a class="u-url" href="https://bricolage.io/">@<span class="p-name">Kyle Mathews</span></a><data class="u-url" value="did:plc:7iza6de2dwap2sbkpav7c6c6"></data><data class="u-url" value="acct:kyle@social.example"></data></span>
```

The markup follows these rules:

- **The visible anchor is the contact's `https` URL.** A reader that knows
  nothing about h-card shows a link, and clicking it works. A contact without
  a URL renders as `<span class="h-card">@<span class="p-name">Name</span>…</span>`,
  which shows a name with no link. The `@` sits outside `p-name`, so a parser
  gets the name and the page gets the sigil.
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
- **Mentions are silent on the wire**, in exactly the sense in which `[[id]]` is
  silent (§10.1, #32). They add no `transclusions[]` entry, no relation (§15.4)
  and no new field, and they send nothing (section 10, ruling 2).

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

### 5.5 The proof on a shared origin

#35's proof is a reciprocal `rel="me"` link: `author.url` names a page that
links back to the identity origin, and the sentence both links make is "this
is also me". For a one-person blyg that sentence is true in both directions.
On a shared origin it is false in one: Alice is not the house.

The ruling (section 10, ruling 3) keeps the proof and moves its origin-side
end. On a shared origin the reciprocal `rel="me"` runs between `author.url`
and the member's **page under the origin** (section 3), and both directions are
now true statements, because both pages are Alice:

- `https://alice.example/` carries `<a rel="me" href="https://house.example/people/alice/">`;
- `https://house.example/people/alice/` carries `<a rel="me" href="https://alice.example/">`.

A reader verifying a byline fetches `author.url` and looks for a `rel="me"`
link whose `href` is either the identity origin itself (#35 as written, the
one-person case) or a URL that has the identity origin as its prefix (the
shared case). In the second case it fetches that page and requires a
`rel="me"` back to `author.url`. Two bounded fetches, cached per
`(author.url, origin)` pair, and the result is shown with the same chrome as
any other verified claim: there are two states, verified and claim, and this
adds no third. The house can write whatever it likes on its side of the pair,
but the house is already the party asserting the byline; what it cannot forge
is Alice's page, which is exactly the half #35 relies on. A member whose
`author.url` *is* the house page has nothing on the far side to check, and the
byline stays a claim, as section 3 says.

This is also what makes `tn-3` section 5's portability concrete: when Alice
leaves, the house removes its `rel="me"`, Alice's page points at her new
origin, and the same reader rule follows her there.

## 6. Reading: resolving a mention in the scheme you speak

A receiving client finds `.h-card` elements in `content_html` and collects the
`href` and the `<data class="u-url">` values. It then does whatever its own
schemes allow:

- **Match against its own address book.** It normalises each identifier per
  scheme, three rules for three schemes:

    - `https` URLs: as §15.4 normalizes an origin — scheme and host
      case-insensitive, default port dropped, trailing slash normalized;
    - `acct:` identifiers: compare case-insensitively;
    - DIDs: compare exactly, except that a `did:pkh:eip155:…` account is
      compared case-insensitively on the address, and a bare CAIP-10
      `eip155:…` met in the wild is read as the same account (section 7).

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
   mentions. A match against the reader's book is a display decision, never a
   merge (§13.1 rules 5 and 7).
3. **No counts and no gating.** "You were mentioned 40 times" is a follower
   metric by another name (#12, #13). A client may list mentions of a contact
   for its own owner. It never publishes them as a number.

**Quotations carry other people's mentions.** A baked transclusion copies the
source's `content_html`, h-cards included (§10.2, verbatim). Those mentions are
the *quoted* author's speech. The quoting client MUST NOT treat them as its own,
whether for notification, for its book, or for display as "mentioned by me".

**The reference reader's sanitizer drops this markup today.**
`blygger-studio/src/importer/sanitize.ts` keeps `class`, but `data` is not in
its tag list, so the element is unwrapped and its `value` removed. It also
strips any `href` that is not `http(s)`/`mailto`/`tel`, which is right. The fix
is small: allow the `<data>` element with `value` (inert text, never fetched).
Without it, the reference client would publish the full identifiers and then
throw them away on every read. Other clients' sanitizers will vary. Every
reader keeps the visible link, so the design degrades to an ordinary link.

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
- **Ethereum.** Emit the account as `did:pkh:eip155:<chain>:<address>`, which is
  the CAIP-10 account in DID clothing and the same bytes. Writing it as a DID
  keeps the wire to three URI schemes and spares readers a fourth normalizer;
  readers accept a bare `eip155:…` as the same account. ENS is an input
  convenience, because a name that can expire must never be the wire
  identifier. Proof of control is a signature, which is #35's second proof. A
  signed byline (EIP-191 over `content_hash`) is that proposal's mechanism,
  unchanged. Whatever the address book does, a wallet scheme is meaningful in
  a mention only when the person themselves published the address at their URL.
- **h-card.** It is the carrier format. The contact's own representative h-card
  is also where the book learns their other identifiers. In practice, a person
  who wants to be mentionable across schemes lists them on their home page.

## 8. Recommendation for the reference client

The client should stay boring (the ruling that tabled blygger-studio#35: "studio should be
boring"), so its default is narrow, and every wider scheme belongs in other
clients or in extensions.

1. **Per-item bylines from a member roster**, which closes the real multi-author
   gap. A member's `author.url` is their own URL when they have one, otherwise a
   house member page. Tie this in with #31 tokens so each member's scoped token
   publishes under that member's byline.
2. **An address book with `@handle` autocomplete**, consumed at publish into a
   markdown link in `content_md` and an h-card in `content_html`, as in
   section 5.
3. **Schemes it resolves when a contact is added:** `https` (h-card and `rel="me"`),
   fediverse handles (WebFinger) and ATProto handles (DNS or well-known, giving
   the DID), plus `did:web`. These all reduce to a URL or a DNS check, and none of
   them needs a vendored dependency (the session-29 ruling).
4. **Schemes it stores but does not resolve:** other DIDs and `did:pkh` accounts. It
   accepts them as `entered`, and emits them only when the contact's own page
   lists them. ENS lookups, wallet sign-in and signature checking belong in an
   extension, not the base client.
5. **Its sanitizer keeps `<data value>`**, so it reads the markup it writes.
6. **No notification.** A mention is silent like `[[id]]`; the reference client
   sends no Webmention for one, and offers no switch to (section 10, ruling 2).
7. **Byline verification on a shared origin** follows section 5.5 when the
   reader side of #35 is built: one rule, two fetches, two display states.
8. **Later: IndieAuth for member sign-in.** IndieAuth proves that a member
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
9. **A Webmention for every mention, or an opt-in switch for one in the
   reference client.** A mention is a link, and a link notifies nobody (#32).
   The reasoning is section 10, ruling 2; what a client that does send must
   respect is there too.
10. **An "acknowledged" display class between verified and claim**, for a
    member's link to a shared origin. Rejected because any link from Alice's
    page to the house proves only that Alice linked to something there, and a
    third chrome state is more display for less proof. Section 5.5 keeps the
    reciprocal `rel="me"` and two states.
11. **Bare CAIP-10 as the wire form of an Ethereum account.** It is a fourth
    URI scheme for the same bytes `did:pkh:` already carries (section 7).

## 10. Rulings (Fable 5.1, session 40, 2026-10-07)

The draft closed with five questions. The rulings follow, each with the
principle it rests on; where a ruling differs from the draft's own
recommendation, it says so.

**1. Sequencing.** The route is confirmed, with its steps named. (a) This
edited draft is published at blygger.org in a new RFC section with a stated
close date for comments; an RFC page takes dated revisions during its period,
unlike a spec snapshot, and its status line reads *open*, *closed* or
*superseded by TN-n*. The length of the period is Venkat's call; four weeks is
the recommendation, since the people most likely to comment are the ones
already building clients and active in the repos. (b) Comments arrive the way
every other piece of exploration does: a GitHub issue on `blygger-spec` opened
as the RFC's comment anchor and linked from the page. (c) Nothing in section 8
is built in the reference client until the period closes. (d) After that, the
RFC becomes a technical note of its own by the gate #35 uses for `tn-2`: one
client emits mention h-cards and a second resolves them. It does **not** fold
into `tn-2`. That note's subject is one person's URL and the two proofs of it;
this one's is a client convention for naming *other* people, and folding them
would make the identity note carry a studio design. Two rulings here are about
`author` rather than about mentions, and `tn-2` absorbs them when it is
written: the shared-origin proof (ruling 3) and `ids` (ruling 5).

**2. A mention does not notify.** Mentions are silent, and the reference
client sends nothing for one and offers no switch to. This is #32's principle
carried over, not a new one: a link asserts nothing on the target's behalf, so
a receiver has nothing to verify, and a notification with no verifiable claim
behind it is the trackback class §15.6 holds down. The `@` form is a link with
a better name, and it inherits the link's silence; "@ notifies" is an
expectation from media with reply primitives, which this one refuses (§16.8).
Two further facts settle the edges. §16.8's bar on a fourth relation is not in
play either way, because a mention's target is a person's page and never an
item; §15 governs mentions between blyg items, and this was never a §15
question. And where a person's URL happens to be a blyg page, a plain
Webmention to it is refused outright (§15.3 step 1: the target must name a
published item) or marked *failed* (§15.4 step 4), so it could only ever cost
the receiver fetches. What remains is the open web: any client may send a W3C
Webmention to a non-blyg page for a link it publishes, as IndieWeb sites do,
and this RFC neither blesses nor forbids that. A client that does so should
observe three things: never to a target inside a blyg origin; never for an
h-card inside a baked quote (§10.2 verbatim, the quoted author's speech);
never by default, only per mention at the author's choice. This differs from
the draft, which recommended a per-mention opt-in in the reference client.
The client stays boring (blygger-studio#35), and the one way to cite without
notifying stays wide.

**3. Reciprocity on a shared origin.** Not an acknowledgement class. The
proof is #35's reciprocal `rel="me"`, unchanged; what moves is its origin-side
end, from the origin to the member's page under it (section 5.5). Both links
then say "this is also me" truthfully, because both pages are the member. The
reader rule is one rule with two acceptable far ends: the identity origin
itself, or a page that has it as a prefix and links back. Two fetches, two
display states, no third chrome. The draft's alternative, any link from
`author.url` to the origin shown as "linked from", was rejected because a link
proves that the member linked to something at the house, not that they write
there, and because a third state is more display for less proof (section 9,
item 10). This is a ruling about identity semantics, so it is Fable's under
#58, and `tn-2` carries it when written. `tn-3` section 5 already promised
that a verified byline survives a move from shape B to shape A; this is what
makes that true.

**4. The spec says nothing.** Confirmed. A sentence about preserving
microformats in `content_html` would be the spec's first word, however
indirect, about identity markup, and #11's silence on identity is a principle
rather than an omission. Under #43 it would in any case be a revision that
readers already handle, and a convention one client emits is not yet a reader
question. The fix lives in the reference client's sanitizer (section 8, item 5).
Revisit when a second client emits the markup *and* a sanitizing reader's
loss of it has caused a failure someone can name; the candidate home would be
§13.1, not §5.2.

**5. `ids` in `author`.** Allowed as a conventional member, filtered as
section 5.3 filters mentions. #35 already places two conventional members in
`author`, the signature and an agent's `operator`, so a third of the same
character adds no principle. The shape: an unordered array of absolute URIs
in the three wire schemes, `https:`, `acct:` and `did:` (Ethereum as
`did:pkh:`, section 7), each `self` or `bound` from the member's own
publications. Because of that filter the house relays what the member
publishes about themselves and asserts nothing new. §5.5's pass-through rule
binds `ids` as it binds every `author` member, and §13.1 rules 5 and 7 still
hold: a reader matching `ids` against its book is making a display decision,
never a merge. The draft's reason stands as the practical one: a reader should
not need a fetch to match a byline against its address book.

**What happens next.** Publish for comment under ruling 1 once the RFC section
exists at blygger.org (held by Venkat as of this session). Until then this file
is the record. The decision list carries one entry for the five rulings, with
this section as its reasoning.
