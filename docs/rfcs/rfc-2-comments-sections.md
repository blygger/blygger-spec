# RFC-2 — Comments sections: a curated display of responses, every comment a real item

**Request for comments · non-normative · DRAFT FOR FABLE REVIEW · session 40, 2026-10-07
(Opus 5.5, at Venkat's request).** This proposes a **Recommendation for clients that
want a comments section**. Like a technical note, an RFC constrains nothing.
blygger-studio will not implement it. If it is approved after the comment period, it
is published as guidance for the clients that choose to. **It depends on RFC-1**
(mentions across identifier schemes), which supplies commenter bylines, identities
and the address book. RFC-1 has to be adopted first. Section 11 lists the questions
for Fable. Written against protocol 0.3 as published on 2026-10-07; no pre-1.0 version
promises anything (#21).

## 1. The question

Comments are the most requested feature from people running blygs. Venkat named
three kinds:

1. **Responses from other blygs** — Webmentions that fit a pattern, such as a stub
   with a short note, listed under the original item as comments.
2. **Signed-in commenters** — people who sign in to *this* blyg with distinct
   identities and comment in an ordinary threaded comments section. Each comment
   goes out on the wire as an ordinary top-level item, so the thread is
   flattened to fit the spec.
3. **Anonymous commenters** — if the owner chooses, a form whose submissions are
   vetted and then published as items under a byline such as `anon` or
   `anon 7f3k`.

This RFC recommends how a client builds all three, and argues that none of them
needs a wire change.

## 2. The stance: no reply primitive, a comments section is presentation

The protocol has refused a reply primitive since #12 and says so at §16.8: "a
network of soapboxes, not a conversation medium". §10.6 adds that a stub is "not a
reply. There is no thread of replies, no conversation object". A Recommendation for
comments sections has to leave that stance intact. It can, because the stance is
about **what the wire carries**, and a comments section is **what a page shows**.

The whole recommendation rests on one idea:

> **A comments section is the owner's curated display of published responses.
> Every comment is a real item at some origin. Each one is a stub of the item it
> answers, under its writer's own byline. The tree is rebuilt from `stub_of` for
> display and never exists on the wire.**

Everything the design needs is already built:

- `stub_of`, the response marker (§10.6);
- verified mentions, which tell an origin it was answered (§15);
- curation display, which lets a page show other people's content with attribution
  (§13.5); §13.5 already names verified mentions as displayable under that rule;
- per-item `author`, which puts many writers on one origin (§5.5, `tn-3` shape B);
- withdrawal, the only exit (§9).

What the protocol does *not* give is a way for anyone to put words on a target's
page (§15.5). Under this design they still cannot. **The owner** displays responses,
as curation, and can stop displaying any of them.

## 3. One display path for all three kinds

The three kinds differ in who publishes the comment and where. The comments section
does not have to care, because each kind ends up the same way:

| Kind | Who publishes the comment | At which origin | How the original's page learns of it |
|---|---|---|---|
| 1. Response from a blyg | the responder | their own | a verified `stub` mention (§15.4) |
| 2. Signed-in commenter | the house, under the commenter's byline | the house's **comments origin** (section 4) | a verified `stub` mention, same as kind 1 |
| 3. Anonymous, vetted | the house, under an `anon` byline | the comments origin | same as kind 1 |

So a client builds **one** renderer: the verified stubs of this item, with the stubs
of those stubs nested beneath them. Kinds 2 and 3 are a publishing tool that the
house runs on behalf of people who have no blyg.

## 4. Where house-published comments live: a comments origin

Kinds 2 and 3 are published by the house. There are two places they can go.

**Option S — the same origin as the posts.** This is conformant, but every comment
is a publish event. §7 puts one feed entry per publish event, and §6.2 lists every
item ever published. Subscribers to the house's essays would get every
"great post!" in their reading list, every edit to a comment would resurface it, and
every moderation withdrawal would leave a `withdrawn` entry in the feed. For a
blyg with a handful of comments a month that cost may be acceptable. For a busy one
it turns the house's soapbox into its own comment stream.

**Option C — a sibling comments origin. Recommended.** The house runs a second blyg
next to the first, for example `https://house.example/comments/` (path-mounted, #14)
or `https://comments.house.example/`. All comments the house publishes go there.
Each one is a stub whose `stub_of` names the post on the main origin.

Why C:

- **The main feed stays the house's own writing.** Readers who want the
  conversation subscribe to the comments origin. Its blogroll entry, or a link on
  every post, makes it one click away.
- **It reduces kinds 2 and 3 to kind 1.** A stub from the comments origin to the
  main origin is a cross-origin reference. It sends a real mention, and the main
  origin verifies it exactly as it would a stranger's. Since #61 a document under
  `/comments/` cannot verify in the name of `/`, so the two origins cannot speak for
  each other even on one host. One renderer handles everything.
- **The house collects every reply to the comments it hosts.** A reply to a hosted
  comment, from anyone, is a stub of an item on the comments origin, so the
  mention arrives there.
- **Accountability is legible.** By `tn-3`'s test, the comments origin is a masthead:
  the house withdraws anything on it and answers for everything on it, which is
  what moderation is. Its manifest `author` names the house, for example
  `{ "name": "House comments", "url": "https://house.example/" }`.

The cost is a second origin with its own deployment, its own archive and its own
permanence (withdrawal endcaps are served forever). A client that offers comments
should run both origins from one install, so the owner deploys one thing.

## 5. Kind 1 — responses from other blygs as comments

### 5.1 What counts

- **Relation `stub` only.** Being stubbed is being answered. Being *transcluded* is
  being quoted inside someone's own piece, and being *forked* is being descended
  from. Both are worth showing, but separately, for example as "quoted in" and
  "forked as" lists. Presenting them as comments would misstate what their authors did.
- **Comment versus response.** A short stub reads as a comment and a long one reads
  as an essay. A client MAY show the full text of short stubs inline and only an
  excerpt plus a link for long ones. Measure the stubber's own words, leaving out
  the baked quote of this item (section 5.3). The threshold is presentation and the
  client's choice. §10.6 rule 2 tells readers to rely on the marker and never on
  body inspection. This does not break that rule: the marker alone decides *that*
  something is a response, and length decides only *how much of it is shown*
  (section 11, Q7).

### 5.2 Showing the text, and keeping it honest

§15.4 step 5 says a verified mention stores **no content**: "what it points at is
fetched from its origin when displayed, or not at all." A comments section that shows
text is therefore displaying another origin's content. The rules for that are
§13.5's, and §13.5 names mentions explicitly:

- **Fetch on display, cache briefly, refresh.** The receiver re-fetches the
  stub's live item document when showing it, through an ordinary HTTP cache. Edits
  are not reliably signalled: under §15.2, a stub whose target version did not change
  is not re-sent, so a refresh schedule is the only way to keep displayed text
  current (section 11, Q2–Q3).
- **Gone means gone.** If the stub is withdrawn, re-fetched as an endcap, or the
  mention re-verifies as `gone`, it leaves the display. §13.4's retention rule applies
  as it does to any displayed import: show a pinned version only if the origin pins
  it, otherwise show nothing.
- **Attribution every time.** Show the stubber's byline as their origin asserts it
  (§5.5 pass-through). Under RFC-1 it is an h-card, together with their origin and a
  link to the stub's page. A comment is never shown detached from where it lives.
- **Sanitize as an import** (the reference reader's `importer/sanitize.ts` is a
  working model).

### 5.3 Strip the quote of this item

A stub usually starts by transcluding its target (§10.6 rule 2's aesthetic). Shown
under the target, that quote repeats the post back to the reader. A comments display
SHOULD collapse any baked `blyg-transclusion` whose `data-blyg-id` is this item and
whose `data-blyg-origin` is this origin. A **partial** quote (`blyg-partial`) is the
exception: it should stay, because "replying to this passage" is exactly what a
reader needs to see. A collapsed whole quote can still show a small "quoting the post"
marker.

### 5.4 Moderation

Display is the owner's act, so the owner decides who is shown. Clients SHOULD offer
three modes per blyg, overridable per item:

- **pre-moderated** — nothing shows until approved;
- **post-moderated** — verified stubs show at once, and the owner can hide any;
- **trusted** — post-moderated for origins in the owner's blogroll or address book,
  pre-moderated for everyone else.

The reference client's public responses list (studio, session 23) is the
post-moderated mode, with links only. Hiding a comment is a display choice, never
a delete: the stub is the stubber's speech on their own soapbox (§10.6), and it stays
there.

### 5.5 Depth

Replies to a kind-1 comment stub *that comment*, so their mentions go to the
commenter's origin, not to this one. This origin sees one level of external
responses, plus any reply that also references this item. Showing "N replies
elsewhere" would need a responses surface, and #41 and #47 closed that surface.
Clients SHOULD show one level and link through. Kind 2 and 3 comments have no such
limit (section 4: the house receives replies to everything it hosts).

## 6. Kind 2 — signed-in commenters

### 6.1 Signing in

The commenter signs in to the house's client with any provider the client
supports:
- **IndieAuth**, the best fit: it proves control of the commenter's own URL, which
  is #35's identity directly;
- **Mastodon or Bluesky OAuth**, which yield an actor or a DID;
- **GitHub or Google**, which yield a profile URL.

The client records the commenter in its address book (RFC-1 section 5.1):
- the identifier from the login gets provenance `bound`, because the house checked it
  at sign-in;
- the commenter's display name is theirs to set;
- `member` stays false: a commenter is a guest, not a masthead writer.

Commenters receive a **comment scope**, a token in the shape #31 describes (bearer,
owner-revocable). It can do only:

- publish a stub on the comments origin whose `stub_of` names an item on the main
  origin or the comments origin;
- edit and withdraw that commenter's own comments;
- nothing else: no drafts that last, no hoppers, no subscriptions, no studio.

The byline is fixed to the signed-in identity, and the commenter cannot choose it.
This is the "a member is a token with a member's scopes" model (#38, `tn-3` section 2),
with a narrower scope.

### 6.2 What a comment is on the wire

A comment is a thread on the comments origin:

```json
{
  "blyg": "0.3",
  "id": "3q8m1x…",
  "kind": "thread",
  "origin": "https://house.example/comments/",
  "author": { "name": "Ada Ruiz", "url": "https://ada.example/", "ids": ["did:plc:…"] },
  "stub_of": { "origin": "https://house.example/", "id": "7c9wk2…", "version": 4 },
  "content_md": "This is the part I'd push back on: …",
  …
}
```

- **Kind `thread`, because §10.6 makes stubs threads.** A comment that quotes a
  passage of the post uses a partial transclusion (§10.1). That is the
  quote-reply comments sections have always wanted, and it is verified.
- **A reply to a comment** is a stub of that comment. Its `stub_of` names the
  comments origin. The display rebuilds the tree by following `stub_of` chains, so
  the wire stays flat.
- **Edits** are new versions (§5.2). They get no feed vocabulary, and the comments
  origin's feed shows the edit like any other publish event.
- **Delete** is withdrawal (§9). The commenter withdraws their own comments, and the
  house withdraws anyone's, which is moderation. The endcap stays, and a reply to a
  withdrawn comment keeps its place in the display with a "withdrawn" placeholder.
- **Generated text** is disclosed through `generated[]`, as anywhere (§5.7). An agent
  can be a commenter under #38's rules: its own byline, an `operator` named, and
  content in every comment, since #36's line against content-free stubbing applies.

### 6.3 Limits a client should set

- **No transclusion of third parties by default.** A transclusion of another origin
  in a comment sends a mention from the house's comments origin to a stranger, on a
  commenter's say-so. Allow quotes of this house's own items, and make anything wider
  an owner setting.
- **Pre- or post-moderation, as in section 5.4.** Signed-in commenters are more
  accountable than anonymous ones, but a comment, once out, is on the wire for good:
  withdrawal leaves an endcap, and other readers may have quoted it.
- **Tell commenters what publishing means**, in plain words at the comment box:
  the comment is public, it can be quoted, and deleting it leaves a "withdrawn" marker.

### 6.4 Commenters who have their own blyg

If the signed-in identity is a blyg origin, or the address book knows one for it,
offer **"respond from your own blyg"** next to the comment box. That makes it a kind-1
comment, on their soapbox and under their accountability. A comment hosted by the
house is the fallback for people without a blyg, not the default for people who
have one (`tn-3`'s withdrawal test applied to comments).

### 6.5 Portability

The commenter's verified URL is what keeps their comments recognisable if they
later start their own blyg: RFC-1's `ids` and `url` match across origins once they
are verified (#35 reader rule 2). As `tn-3` section 5 says, **the person is
portable, the items are not.**

## 7. Kind 3 — anonymous comments, vetted

This kind is entirely the owner's choice, and off by default in any client that
offers it.

### 7.1 Flow

1. A form on the item's page takes the text and, optionally, a display name.
   It has no URL field: a URL nobody verified is exactly the unchecked claim RFC-1
   keeps off the wire.
2. The submission enters a **mandatory pre-moderation queue**. For anonymous
   speech that is not optional, because approval is what makes the house's
   publication of it an editorial act rather than a pipe (#36). Machine triage MAY
   sort the queue. A person approves.
3. On approval the house publishes a stub on the comments origin, exactly as in
   section 6.2, under an anonymous byline.
4. The submitter receives a **one-time withdrawal link** at submission. Without an
   account, it is their only way to retract. Using it withdraws the item (§9).

### 7.2 The byline

- `{"name": "anon"}` when the client does not tell anonymous commenters apart.
- `{"name": "anon 7f3k"}` when it does. The suffix comes from a **random token kept
  in the commenter's browser** and is stable across their comments while the token
  lives. It MUST NOT be derived from an IP address, an email address or any hash of
  one: those can be reversed by trying candidates, and an "anonymous" label that
  can be reversed is worse than none.
- **No `url`, no `ids`.** Nothing about an anonymous commenter is checkable, so
  nothing is asserted. Bylines that are byte-equal group only for display within
  this origin (§5.5), never across origins and never as an identity.
- Readers see the house's assertion, as with every byline (§14). A client SHOULD label
  these comments "anonymous, approved by the editor" so that the house's role is
  visible.

### 7.3 Data the house keeps

Store only what vetting needs. Keep the text, the browser token and a
rate-limit key, and delete the rate-limit key once a decision is made. Never put
submission metadata into the item document. The house publishes the words, not the
person.

## 8. Presentation rules common to all three

- **Different chrome for each source.** "From their own blyg (verified)", "signed in
  via GitHub as ada.example", "anonymous, approved". #35's first reader rule says to
  show verified claims as verified and everything else as claims. A comments section
  that makes all three look alike erases the differences readers most need.
- **Order by observation time** (§13.7), not by the commenter's self-asserted
  `created`. A stranger's clock does not get to move their comment to the top.
- **No counts.** No "42 comments" and no per-commenter tallies. This is #12's and
  #13's no-metrics stance carried into presentation, the reason the reference
  responses list shows "a citation trail with no count", and the reason #47 kept a
  responses surface closed: a count is the first thing a ranking attaches to. A
  presence indicator ("Comments ↓") is enough.
- **No machine-readable comments markup on the post page.** IndieWeb practice puts
  `h-cite` comment markup inside the post's `h-entry`. Doing that turns the display
  into exactly the machine-readable responses surface #41 tells readers never to parse
  and #47 declined. The comments origin already *is* the machine-readable record:
  real items, with real `stub_of`, in a real feed and index. Individual comments
  carry RFC-1's h-card bylines, which say who wrote something, not that it
  responds.
- **The comments section is never part of the item.** It is not in `content_html`,
  not in the feed `<description>`, and not baked into anyone's transclusion of the
  post. Quoting a post never quotes its comments.

## 9. Wire impact: none

Nothing new appears anywhere a reader sees. The design uses only:
- `stub_of` (§10.6);
- `author` with RFC-1's conventional members (§5.5);
- partial transclusion (§10.1);
- withdrawal (§9);
- verified mentions (§15);
- curation display (§13.5);
- mount independence for the comments origin (#14);
- exact verification between sibling origins (#61).

No field, no relation, no feed element, no manifest key. A reader that knows
nothing about comments sees a blyg (the comments origin) full of short stubs with
different bylines, which is a correct reading of it.

**The dependency on RFC-1 is real but soft.** Kind 2 works with today's `{name, url}`
bylines. RFC-1 supplies the address book, the `bound` provenance that sign-in
produces, `ids` for recognising commenters across origins, and the h-card byline.
A client could ship kind 1 and kind 3 before RFC-1 is settled. Kind 2 is where
identity matters, and that is why the RFCs are ordered this way.

## 10. Rejected designs

Recorded because each will be re-proposed.

1. **A reply primitive or an `in_reply_to` field.** `stub_of` already is
   "this answers that", verified. A second field would be a reply primitive (§16.8).
2. **A `comment` kind.** Kinds describe what an item is (§5.3), and a comment is a
   short stub. A kind would ask readers to treat it differently, which is a version
   change by #43, for a distinction length already makes in presentation.
3. **Comments embedded in the post's item document**, or carried in its
   `content_html`. That would put other people's words into this origin's item
   under this origin's `content_hash`, which re-emits them (§13.5) and lets
   stubbers write on the target's page (§15.5).
4. **A responses or comments list in the manifest or as a file.** That is #47's
   closed surface, and the first place a count would attach.
5. **House comments on the main origin by default** (option S). It is conformant,
   but it floods the house's feed (section 4). Clients may offer it for low-volume
   blygs, and should not default to it.
6. **Publishing anonymous comments without vetting.** The result would be a pipe
   (#36) feeding permanent endcaps into every subscriber's archive.
7. **Pseudonyms derived from IP or email hashes.** They can be reversed (section 7.2).
8. **Off-wire comments** — an ordinary comment database rendered on the page and
   never published. This is not rejected: it is conformant, since the protocol
   governs only the page's protocol surface (#3) and says nothing about chrome. It
   is not recommended, because the comments then cannot be cited, quoted, forked or
   subscribed to, and they disappear with the client. The point of putting comments
   on the wire is that they become part of the medium. A client that wants Disqus
   can have Disqus.

## 11. Questions for Fable

- **Q1. Does a comments Recommendation fit §16.8 and §10.6's "no thread of
  replies"?** Recommendation: yes. The stance governs the wire, and this adds nothing
  there. The RFC should state plainly that the comments section is the owner's
  curation and that no reply primitive exists or is implied. The risk is not to the
  wire but to the medium's character: a Recommendation will be read as the project
  saying comments are welcome. Venkat's call that the demand justifies that is the
  premise of this RFC, so the check here is only that the wording keeps the
  soapbox framing.
- **Q2. Displayed text against §15.4 step 5's "no content is stored".**
  Recommendation: displaying a stub's text is §13.5 curation display, which §13.5
  already names for mentions. A short-lived cache is part of "fetched when
  displayed", provided it is refreshed and purged on `gone`. If Fable reads step 5
  as forbidding any stored copy, the RFC changes to fetch-at-render only.
- **Q3. Edits are not signalled.** §15.2 re-sends a stub only when its target
  version changes, so a comment edited in place leaves stale text on the target's
  page until the next refresh. Options:
  - (a) receivers refresh on a schedule. Recommended, and needs nothing.
  - (b) also recommend that senders re-send stub mentions on every republish. §15.2
    already calls that "conformant but noisy", so a client may do it.
  - (c) make (b) a spec SHOULD for stubs. That changes sender behaviour, so it
    would be a revision, and it is Fable's to rule.
- **Q4. Steering clients toward two origins.** Is it right for a Recommendation to
  make a sibling comments origin the default (section 4)? It is the only shape that
  keeps the main feed clean without new wire vocabulary.
- **Q5. Counts and comments markup.** Recommendation: no counts, and no `h-cite`
  responses markup on post pages (section 8). Both are presentation, but the
  Recommendation is a blessing, and #12, #41 and #47 all point the same way.
- **Q6. Anonymous bylines.** Is house-vetted anonymous speech under
  `{"name": "anon 7f3k"}` consistent with §5.5 and #38? Recommendation: yes. The
  origin is the accountable party, the byline is the house's assertion, and the
  "approved by the editor" label states the house's role.
- **Q7. Classifying by length.** Section 5.1 shows short stubs in full and long ones
  as excerpts. §10.6 rule 2 forbids deciding *whether* something is a response by
  body inspection. Length decides only how much is displayed. Confirm that this is
  on the right side of the rule.
