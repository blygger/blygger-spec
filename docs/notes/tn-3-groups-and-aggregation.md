# TN-3 — Groups need no new construct: N origins, one masthead, and the stubbing anti-pattern

**Technical note · non-normative · session 28, 2026-09-28 (Opus 5, writing up
decision #36 — ruled session 27 by Fable + Venkat). Decision record for locked
decision #36.** Technical notes record design reasoning — especially rejected
designs — alongside the normative spec; they constrain nothing and are citable
rationale, not protocol. Written against protocol 0.3 as published on
2026-09-28; every construct named here is built and live, but no pre-1.0
version promises anything (#21), so check the living text before you lean on a
detail.

**Revised session 38, 2026-10-06 (Opus 5.5)**, after decision #61: §3 gains the
consequence that members on one host cannot verify mentions in each other's
name, which was not true of the 0.3 text this note was first written against.

## 1. The question

Two requests arrived from early users within days of the first strangers
standing up their own blygs:

1. **"A multi-user blyg with separate folders."** A publication or workgroup
   wants several people writing under one roof, each with their own space.
2. **"An aggregator that stubs everything."** A site wants to be the one place
   to follow a group, and proposed doing it by emitting a stub for every item
   the members publish.

Both read like requests for a new construct — a group, a space, a members
list, a pipe. Neither is. The first decomposes into two shapes the protocol
already has, distinguished by one question; the second is an anti-pattern, and
the interesting part is *why* it cannot be stopped by a rule.

The spec's own involvement in all of this is two sentences of documentation: a
warning in §10.6 and the honest shape named in §13.5. This note is the
reasoning behind those sentences.

## 2. There is no folder on the wire

Start with what "separate folders" would have to mean. A blyg is a directory of
files under an origin: one `blyg.json`, one `feed.xml`, one `items/index.json`,
and item documents (spec §4). Every reference in the protocol — `transclusions[]`,
`stub_of`, `forked_from` — names `{origin, id, version}` (§5.9). Subscription
targets an origin (§12.2). Withdrawal is an act by an origin about its own item
(spec §9). Pins are hosting promises made by an origin (spec §8).

Nothing in that list has a place to put a folder, and adding one would mean
adding an addressable sub-identity beneath the origin — which is exactly what
#11 refuses ("authors are never addressable … permanently") and what invariant
4 refuses one level up ("the only authenticated entity is the publishing client
at its domain").

So the folder, if it exists, is a **studio view**: a way of organising the
authoring tool, invisible on the page, which is precisely where #1's
studio/page split puts it. Members in the studio are #31's scoped bearer
tokens — owner-minted, owner-revoked, per-client, with coarse verb scopes. A
member is a token with a member's scopes, and the wire never learns that any of
this happened.

What the request actually asks, once the folder is set aside, is: **how many
origins?** There are two answers, and they are different protocols of trust,
not different implementations of one.

## 3. Shape A — N origins under one host

Mount independence (#14) means a blyg's origin is *any* absolute base URL, and
no protocol construct may infer anything from the path. So one host serves as
many blygs as it likes:

```
https://house.example/alice/     blyg.json, feed.xml, items/…
https://house.example/bob/       blyg.json, feed.xml, items/…
https://house.example/           the house's own blyg (optional)
```

Subdomains work identically (`alice.house.example`) and were exercised in the
wild by a stranger who path-mounted at `/blyg/` without being told it was
allowed.

**The index is a blogroll.** The house publishes `blogroll.opml` (§11) listing
its members. A reader importing that one OPML file subscribes to every member
at once — and nothing custom was needed to make that work, because each
member's feed carries `<blyg:manifest>`, so plain OPML resolves to the blyg
upgrade for free (§11, #13, #17). The members list a group construct would have
introduced already exists, in a format other people's tooling reads, published
as a deliberate curated act with no completeness claim.

**Optionally a house blyg.** The house origin can be a blyg of its own, and if
the house has an editorial voice it should be: editorials, announcements,
curated hoppers of member work (§13.5), stubs that actually respond to
members' pieces. The house is then a publisher among publishers, with its own
accountability, rather than a directory pretending to be a publication.

Consequences worth naming before choosing this shape:

- Each member withdraws their own items (spec §9) and owns their own pins (spec §8).
- Each member's `author` is their own assertion at their own origin.
- Cross-member quoting is ordinary cross-client transclusion (#26) and sends
  real Webmentions (§15). The house's internal conversation is publicly
  checkable exactly like anybody else's — a feature, not overhead.
- **Members cannot speak in each other's name.** A mention verifies only if
  the source's item document was fetched from exactly `{origin}items/{id}.json`
  for the origin it declares (§15.4 step 2, decision #61). So a document
  served under `house.example/alice/` that claims to be `house.example/bob/`
  fails, and Bob's items are safe from Alice even though they share a host.
  This was not true when this note was first written: the 0.3 text compared
  scheme, host and port only, and Aneesh Sathe's conformance model found the
  hole in exactly this shape (finding F1). The eighth revision of the spec
  closed it on 2026-10-06, and blygger-studio 0.32.2 implements it. A receiver
  still running older code keeps the hole until it upgrades, so a house on a
  shared host should run current clients for all its members.
- The cost is real: N deploys, N polling crons, N sets of pin promises, N
  archives to keep serving forever. Withdrawal being permanent and pins being
  irrevocable means an origin is a long commitment, and this shape makes N of
  them.

## 4. Shape B — one origin with bylines

The masthead, specified since #11: one origin, one feed, one archive index, one
manifest, and per-item `author` bylines. The feed invariant is
single-**publisher**, never single-author (§5.5), precisely so that this shape
is conformant without a social layer.

Consequences, which are the mirror image of shape A's:

- The publisher can withdraw anyone's item and owns every pin. One party is
  accountable for everything at that origin, which is the point.
- No member has a citation surface of their own. A stub of Alice's piece is a
  stub of the house's item, carrying Alice's byline as passed-through data.
- One subscription, one blogroll, one editorial identity, one deploy, one cron.
- A member's items cannot leave with them. Ids are origin-scoped (#2, §5.1);
  the same words at a new origin are a new item, or a fork from a pin (§5.6).

## 5. The test: who can withdraw

#36 names one question to choose between the shapes, and it is not "how many
people are there":

> **Can this person's accountability be someone else's?**

Operationally: **who gets to withdraw, and who owns the pins.** Withdrawal is
the protocol's only exit and it is permanent (#8); a pin is an irrevocable
promise to serve one version forever. Those two are the whole of what an origin
is on the hook for. A member whose retractions must be their own decision, and
whose citations must survive a falling-out with the house, needs their own
origin. A member who is content for the house to answer for their work does
not.

This cuts across the intuitive axis. A five-person magazine with a real editor
is one origin — the editor withdrawing a piece *is* the editorial relationship
working. Two friends who trust each other completely but publish under
professionally distinct names need two origins, because the thing they need
separate is not affection but accountability.

**The choice is less fateful than it looks, because of #35.** Practice for
identity (proposed in `docs/proposals/identity-practice-proposal.md`) is that a
person is a URL they control, provable by a reciprocal link or a signature. A
byline carrying a verified home URL is recognisable after a move from shape B
to shape A, which is otherwise impossible: §5.5 forbids treating equal `author`
values at different origins as the same entity, and a verified claim is the
only thing that lifts it. Be precise about what is portable, because this is
where an implementer will over-promise: **the person is portable, the items are
not.** Moving means new ids at a new origin, with lineage expressed as forks
from pins if the old origin pinned anything.

## 6. Why content-free stubbing is an anti-pattern

The aggregator-by-stub proposal is the interesting half, because the pipe it
describes is *byte-for-byte conformant*. Every document it emits is a valid
thread with a valid `stub_of` (§10.6). Every mention it sends passes structural
verification (§15.4). No rule in the spec is broken. It is still wrong, for
three independent reasons, and then there is the question of why the spec
responds with prose instead of a MUST NOT.

### 6.1 The marker is the one claim nothing can check

`stub_of` is the protocol's only machine-readable assertion that *this is a
response to that*. §10.6 rule 2 makes readers rely on the marker and never on
body inspection — deliberately, because inspecting a body to decide whether it
is a response would require the protocol to read prose, and it would let a
reader overrule an author about what they wrote.

That design puts the marker's entire value in its honesty. Structural
verification does not help: §15.4 checks that the source document really names
the target at the origin it claims — it proves the *relation exists*, never
that the relation *means* anything. A pipe satisfies it perfectly. So a stub
emitted with nothing to say is not a weak response; it is a false statement in
the one field where the protocol has no defence but truthfulness.

### 6.2 It floods the only scarce inbound signal there is

The protocol has no follower list, no follower count, no metrics, at any level,
ever (#12, #13, §11). A publisher's entire inbound signal is verified mentions
(§15.5) — and #41 identifies it as the strongest discovery signal available,
because someone who responded to you demonstrably read you.

That signal is scarce by construction, which is what makes it informative.
Pipe-generated stubs are indistinguishable from real ones at the receiver — the
receiver sees a valid thread with a valid marker — so they degrade the signal to
noise with no filter available, and the noise is loudest for exactly the
publishers a group aggregator would target.

This is the trackback failure reproduced inside the protocol.
Trackback died of unverified spam, and the protocol answered it with structural
verification (#13). Verification defeats the *impostor*, who claims a relation
that isn't in the document. It does nothing about the *relay*, whose relation
is genuinely there and genuinely empty.

### 6.3 It reprices re-emission to zero, which §13.5 forbids by cost

§13.5's ban on re-emitting imported items has two halves with two different
enforcement mechanisms. The mechanical half — imported items MUST NOT appear in
your feed, index, or item documents — is enforced by the `blyg:id` rollup
contract and the single-publisher invariant: violating it breaks readers, so it
holds itself up. The editorial half — "speech about someone else's content
costs editorial work" (#12) — is enforced by *nothing but the cost*. Write an
item; that is the price.

Automating stub creation sets that price to zero. The result is the naked
retweet that #12 refused, rebuilt out of legal parts: content appears on your
feed under your origin with no editorial act anywhere in the loop. Nothing
mechanical catches it, because there is nothing mechanically different to
catch.

### 6.4 The line is content-free, not automated, and not non-human

This must be said explicitly, because the obvious summary of sections 6.1–6.3 above is "don't
let robots stub", and that summary is wrong. #38 rules the protocol
agent-agnostic at every level: an agent is a valid `author` (§5.5), generated
prose is disclosed by `generated` (§5.7), and invariant 3 constrains the reader
side and the wire, never who writes.

An agent that reads each member item and answers it under its own byline,
disclosed as generated, is **stubbing legitimately, however many stubs that
is** — a critic, not a planet. Many mentions from one busy respondent are fine;
each one says a real thing about a real item (#44 makes the same point for
generation sources). What is illegitimate is a response with nothing in it,
whoever or whatever emits it. A human who copy-pastes "interesting" under fifty
transclusions a day has built the same pipe by hand.

### 6.5 Why this is a warning sentence and not a MUST NOT

The natural instinct is to forbid it: "a stub MUST carry editorial content."
That rule cannot be written, for two reasons.

**It is not checkable.** "Has something to say" has no machine test. A word
count is trivially defeated and would fail legitimate one-line responses. A
similarity check against the target is an editorial judgement the protocol has
no business making. A MUST that nothing can test is worse than no MUST: it
teaches implementers that this spec's requirements are aspirational, which
devalues the ones that are real. #48's conformance partition depends on
MUST-clauses being exactly the set a checker fails on.

**The constructs are identical.** A pipe's output and a critic's output differ
only in what the prose says. There is no field, count, flag, or shape that
separates them — which is the same reason #38 refuses an "I am an agent" flag
(a spammer would not set it) and #34 refuses a maintenance declaration (the
software that would have to say it is the software nobody updates).

So the spec does the only thing available: it says plainly, in §10.6, that a
stub emitted without a response is a misuse, names the honest alternative in
the same breath, and leaves it as reputation rather than validation. A protocol
that cannot enforce a norm can still refuse to pretend the norm doesn't exist.

## 7. The honest aggregator, which needs nothing new

Everything the "one place to follow a group" request actually wants is already
built:

1. **Curation display** (§13.5). Import the members, display their items
   publicly with source attribution and links to the origin. Publicity is a
   property of the displayed list, never of an imported item — there is no
   per-item public toggle and there will not be, because that is the naked
   retweet again.
2. **A blogroll of the members** (§11). One OPML import subscribes a reader to
   every member. This is the aggregator's most valuable output: it makes itself
   unnecessary for readers who have a blyg-aware client, which is the correct
   relationship for a directory to have with the medium it indexes.
3. **Optionally a plain RSS digest, outside the blyg surface** (§13.5).
   Excerpts and links to origin permalinks, no `blyg:` namespace, not
   `feed.xml`. Its consumers are L0 readers who need nothing from the protocol, and
   keeping it outside the surface is what stops it being re-emission.
4. **Optionally its own blyg**, if it has an editorial voice — see section 3 above. A
   digest is plumbing; an editorial voice is a publisher, and a publisher's
   stubs are real responses.

No re-emission at any step, and no stubs on the members' behalf.

## 8. Rejected designs

Recorded because each will be re-proposed.

1. **A group or space construct** — a `members` array in the manifest, a
   `group` key, a shared parent identity. Rejected three ways: it is a
   follower-list-shaped surface and the first place a count could attach
   (#12/#13, and #47 refused a per-item responses list for the same reason);
   it makes something below the origin addressable, which #11 forbids
   permanently; and it duplicates the blogroll, which is already the members
   list, already curated, already read by other people's tooling.
2. **`user@server` or any two-level addressing.** Closed at #11: DNS is the
   namespace. Mount independence is what makes the second level unnecessary —
   a path *is* a namespace, and `house.example/alice/` is a first-class origin
   with no new grammar.
3. **Per-author feeds carved out of one origin** (`feed.xml?author=alice`).
   The feed URL is bound up with subscription identity (§12.2), and the
   manifest's `feed` value is what locates it (#51). A per-member feed with its
   own manifest is not a variant of shape B; it *is* shape A, with the
   deployment cost hidden until the first withdrawal.
4. **Letting an aggregator re-emit member items.** Not a policy call but a
   collision: `blyg:id` rollup plus the single-publisher invariant means the
   copy and the original present as one item with two publishers (§13.5).
5. **A digest construct on the wire.** Unnecessary — the digest's audience is
   plain RSS readers, so it needs no blyg vocabulary, and giving it some would
   put a second lossy notification plane inside a surface that already has one.
6. **The aggregator-by-stub pipe**, per section 6 above.

## 9. What stands

- **No new construct for groups, at any level.** Two supported shapes: N
  origins under one host with a house blogroll (and optionally a house blyg),
  or one origin with per-item bylines.
- **The test is who can withdraw** — accountability, not headcount. #35's
  verified home URL is what keeps a byline recognisable if the answer changes
  later; the person moves, the items do not.
- **Members are studio-side**, as #31's scoped tokens. There are no author
  folders on the wire: one origin, one feed, one index, and the byline is the
  distinction.
- **A stub emitted without a response is a misuse** — false in the one field
  nothing can verify, a flood of the only scarce inbound signal, and a
  repricing of re-emission to zero. Said as a warning in §10.6 rather than a
  rule, because no rule can distinguish the pipe from the critic, and an
  unenforceable MUST would cost more than it bought.
- **The honest aggregator is §13.5 plus §11**, plus a plain RSS digest outside
  the surface if it wants one. This is locked decision #36; relitigating it
  starts from this note.
