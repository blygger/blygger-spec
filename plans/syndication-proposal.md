# Proposal — syndication: saying where an item was cross-posted

**Status:** DRAFT, exploratory. Proposed 2026-11-09 by Patrick Atwater (patwater), from
two client builds that cross-post blyg items to conversational networks. **Nothing here
is ruled.** It adds one OPTIONAL item-document member, so by the four-question test it is
Fable's (question 2 is a yes), and by #43 it is revision-grade, because a reader that
ignores the member stays correct. The first networks are **Bluesky** and **Farcaster**,
with **Substack Notes** third; the construct names none of them.

---

## 1. The problem

The frozen concept spec already expects this: "This is a medium designed for people who
want to write in public. It's not a cozy/private medium. But neither is it a
conversational medium. People can cross-post fragments and threads to conversational
media if they want to talk about it." (`docs/ygg-initial-spec.md`, Design philosophy 1.)
Two clients now do exactly that:

- **Burrow** (Blygger Desktop), in
  [aneeshsathe/blygger-desktop#69](https://github.com/aneeshsathe/blygger-desktop/pull/69),
  gives its bundled cross-post extension Bluesky and Farcaster beside Substack Notes. It
  fills in each network's own composer in the browser pane where the owner signed in by
  hand, after two confirmations, with the item's opening paragraph and a link back to its
  `page`.
- **blygcaster** ([patwater/blyg-caster](https://github.com/patwater/blyg-caster)), a fork
  of Blygger Studio, casts a published item to Farcaster through the owner's own signer,
  replaces the cast when a new version changes the words, and deletes it on withdrawal.
  It also reads Farcaster accounts and channels as a subscription kind.

Both make a copy of a blyg item somewhere else, and both put a link back to the item in
that copy. Neither can tell anyone the other direction. A reader who holds the item in
their reading list has no way to learn that the author's conversation about it is
happening under a particular Bluesky post or Farcaster cast. blygcaster shows an "Also on
Farcaster" link in its own permalink chrome, and its decision record says why it stops
there: the cast record "never enters item documents, the feed, the archive index,
`content_html` or the manifest", because putting it there would change the protocol
(`blyg-caster/docs/blygcaster-decisions.md`, question 19). A link in page chrome is
presentation, and readers MUST NOT parse presentation HTML for meaning (#41), so the
claim reaches no other client.

A second, sharper case follows from blygcaster's reading side. A reader that subscribes
both to a blyg and to its author's Farcaster account receives the same writing twice, as
a blyg item and as a cast, with nothing to say they are one piece of writing.

## 2. The proposal

An OPTIONAL top-level item-document member, `syndication`, listing copies of the item
that its publisher made on other networks. The name is the IndieWeb's
(`u-syndication`, `rel="syndication"`, from the POSSE practice), adopted under #71.

```json
"syndication": [
  { "url": "https://bsky.app/profile/did:plc:abcdexample234/post/3lzexample22", "version": 3 },
  { "url": "https://farcaster.xyz/alice/0x1a2b3c4d", "version": 3 },
  { "url": "https://substack.com/@alice/note/c-123456789", "version": 2 }
]
```

1. **An entry is a URL and a version, and nothing else.** `url` is REQUIRED: the
   absolute `https:` URL at which the copy can be read. `version` is REQUIRED: the
   version of this item the copy was made from, so a reader can tell a copy of v2 from
   the v3 it is reading. There is no network name, because the URL's host already says
   it and a list of networks would be a registry the protocol does not keep. There are
   no counts, no account and no reply data.
2. **It is the publisher's claim, like `cited`.** It is self-asserted, never authoritative,
   never in `content_html`, outside `content_hash`, and not a reference (§5.9): it names
   no blyg item, so it sends no mention and §15.4 never reads it.
3. **It arrives after the version it describes.** A copy exists only once the item is
   published, so its URL cannot be in the publishing version. A publisher records it in
   one of two ways. It MAY republish with the same `content_hash`, which §13.2 already
   calls maintenance (#77): readers advance state and SHOULD NOT resurface it as new. Or
   it MAY carry the entry in the item's next publish. The proposal deliberately does not
   let the member change without a publish event (§5.2's bare counter; see question 1).
4. **It follows the copies.** When a client replaces a copy on a new version, as
   blygcaster does, the entry is replaced. When a copy is deleted, the entry goes at the
   next publish. A withdrawal endcap omits the member, as it omits `stub_of` and
   `generated`, for §9's own reason: the endcap empties what the item said, and a copy
   elsewhere is a copy of what it said. (It keeps `page` and `forked_from` because those
   are where the item lives and where it came from, which a copy is not.) A publishing
   client MAY delete its copies on withdrawal, as blygcaster does; the protocol cannot
   require a copy to vanish, any more than it can require a cache to (§9).
5. **Pins promise bytes, not copies.** A pinned file carries the entries as they stood at
   that version. That is a record of what the publisher said, and it promises nothing
   about a copy's survival on a host the publisher does not control.
6. **A fork does not inherit it.** The copies are the original publisher's, and custody
   runs one hop (#65). A forking client MUST drop the member.
7. **The copy SHOULD link back.** A copy SHOULD contain the item's `page`, or its item
   document's URL where it has no page, which is what both clients above already do.
   This is the second half of the claim, and section 3 explains how readers use it.
8. **The copy's URL SHOULD be the stable form.** Where a network offers a URL that
   survives a handle change, the entry SHOULD use it: a Bluesky post addressed by the
   account's DID rather than its handle, for instance, because ATProto handles change
   (tn-6, section 4). This is §5.8's stability reasoning (#56) applied to an address the
   publisher does not control.

A publisher's own permalink page MAY also carry the same links as
`<a class="u-syndication" rel="syndication" href="…">`, so IndieWeb tools find the copy
as they would on any POSSE site. That is page chrome under §8.4 and needs no rule.

## 3. Readers

- **Ignoring it is conformant** (§13.1 rule 4). A 0.4 reader that has never heard of the
  member changes nothing it does, which is what makes this a revision under #43.
- **A reader MAY show the links** beside the item, for example "also on bsky.app" with
  the version the copy was made from, and MUST present them as the publisher's claim.
- **A reader SHOULD NOT fetch or show counts from a copy.** Likes, reposts and reply
  counts on the other network are metrics, and showing them beside a blyg item would
  bring the one thing §16.8 refuses onto the page through a side door.
- **A reader MAY fold a copy it imported under the item, only when both directions
  hold.** A client that imports from the copy's network as well, as blygcaster does from
  Farcaster, holds both halves locally: the item's entry names the copy's URL, and the
  copy's text contains the item's `page`. When both hold, the reader MAY show the two as
  one piece of writing, with no fetch. It MUST NOT fold on one direction alone, because a
  publisher could otherwise claim a stranger's cast and swallow it in readers' lists, and
  a copy could otherwise attach itself to an item that never claimed it. This is the
  reciprocal-link pattern of #35, applied to a copy rather than a person.

## 4. What it is not

- **It is not a reply primitive** (§16.8, #12). Responses on Bluesky or Farcaster stay
  there. The entry tells a reader where the author chose to talk, as the frozen spec
  imagined, and carries nothing back. Turning replies elsewhere into Webmentions, as
  IndieWeb backfeed does, is the territory of RFC-4 (#82, §16.11). A backfed reply would
  fail §15.4 anyway, since its source is no blyg item document.
- **It is not a follower or identity construct.** An entry names a post, not an account,
  so it is not "a relation that names a person" (§16.8). Identity stays out of the
  protocol (#11).
- **It is not significance markup.** Whether an item was cross-posted says nothing about
  the version counter or the pin.
- **It does not touch the feed.** No `blyg:` element is added and the RSS rendering is
  unchanged.

## 5. Why this cannot just be a client feature

Cross-posting itself is a client feature, and both builds above work without any change
to the spec. What two clients must agree on is the claim: the publisher's client writes
it and someone else's reader reads it. A link in page chrome cannot carry it, because
readers do not parse presentation; a private studio record cannot carry it, because
nobody else can see it. Without a member, every client that cross-posts is limited to
what blygcaster does today, a link on its own page that no reader can use, and the
duplicate in a reader that follows both networks has no honest fix.

## 6. What happens to nodes that don't implement it

Nothing. The member is additive and OPTIONAL. Readers ignore unknown members (§13.1 rule
4), publishers that never cross-post never emit it, and receivers never read it. Every
0.4 document stays valid.

## 7. Questions for the Fable round

1. **A version for a link.** Rule 3 spends a version on a claim that changes no words.
   §13.2 already treats that as maintenance, and the alternative, a member that changes
   between publish events, would be the first such thing on the state plane, which
   readers reconcile by version. The proposal takes the republish. Is the cost acceptable,
   or should clients be told to prefer carrying the entry in the next real publish?
2. **Item or changelog.** A copy is of a version, which suggests
   `changelog[].syndication`. The proposal puts it on the item with a `version`, because
   changelog entries record publish events and the copy is made after one. Which reads
   better against §5.2?
3. **`at://` and other schemes.** Bluesky posts also have `at://` URIs and Farcaster casts
   have hashes. The proposal allows only `https:`, so that every entry opens in a browser.
   Should an entry be allowed a second, network-native identifier?
4. **URL equality for folding.** A cast has several web forms (`farcaster.xyz`, older
   `warpcast.com` links, a short or full hash). Section 3's fold compares URLs. Is
   "compare as the reader's network client normalises them" enough, or does the fold need
   a rule?

## 8. A gate, if it is ruled

One client emits `syndication` for a real copy, and a second client shows the link from
an imported item without fetching the copy. blygcaster can emit first, since it learns the
cast's hash when it casts. Burrow's browser macros do not learn the URL of the post they
make today; a follow-up there would add a recipe step that reads the new post's address
from the composer's confirmation, or let the owner paste it. The fold in section 3 is a
MAY and needs no gate of its own.
