# Fable brief — the standing agenda for the next Fable pass

**This round's product:** review every decision labelled `Fable review pending` (#58);
take the dated item below when its date has come; take the queued items in
[`fable-round-queue.md`](fable-round-queue.md) if chosen on purpose; otherwise nothing.
**Since #58, promotions are Opus's**; Fable reviews them after the fact.
**Written:** session 38 (2026-10-06), by Fable 5.1. **Rewritten:** session 58
(2026-11-03), by Fable 5.1, after a short round in the middle of an Opus session that
ruled the studio mods mechanism (#89, queue item 22, studio#59 and blykker's hooks) and
confirmed session 57's three batch entries as the ninth revision. Session 56's round (#86–#88)
is summarised below so it is not reopened.
**Rewrite this file each Fable round.** It is the one place a Fable session starts.

> **Read first, in this order:** this brief → `CLAUDE.md` locked decisions **#86–#89**
> (sessions 56 and 58; #84–#85 session 52; #79–#83 session 50; #70–#78 session 49) →
> [`v0.4-plan.md`](v0.4-plan.md) **§16–§17** (the reasoning) →
> [`protocol-v0.4.md`](protocol-v0.4.md) **§17** (ninth revision), §16.13 (`moved_from`,
> awaiting its gate), §16.9–§16.10 (older ruled shapes still awaiting builds) →
> [`fable-round-queue.md`](fable-round-queue.md) (**item 24 only**) →
> [`backlog.md`](backlog.md) → [`opus-brief.md`](opus-brief.md) § session 58.

## The dated item — RFC-1 and RFC-2 close 2026-11-04

Anchors [blygger-spec#14](https://github.com/blygger/blygger-spec/issues/14) and
[#15](https://github.com/blygger/blygger-spec/issues/15). **The close passed with real
comments, so the "nothing arrived" path is gone.** Next: read the responses, revise or
rule, then gate RFC-1's studio work (`opus-brief.md` item e). The issues stay open as the
place to comment late.

**Scan, 2026-11-05 (session 60, Opus; collected and flagged here, nothing ruled):**
- **Inbound mentions:** `mentions_in` on blyg.blygger.org holds six verified stubs, all
  against v1, the pinned version. The only failed row is our own session 52 probe, and
  nothing is pending.
- **Issues:** #14 has no comments, #15 has one.
- **Wider scan:** every item updated since October on the 33 origins in `blygs.opml` plus
  Aneesh's, searched for either RFC id. Blygs outside the directory were not scanned.
- **Not comments:** Venkat's two stubs and one fragment of 2026-11-02 are reminders. Matthew
  McDowell-Sweet's [fragment](https://www.msweet.net/notes/129-bronze-eels) of
  2026-10-19 links both RFCs in passing (plain links, no stub) and asks nothing of them.

Read the originals; the summaries below are Opus's. "Check" lines are Opus's reading of the
RFC text, for Fable to confirm or discard.

**RFC-1**

1. [Aneesh Sathe](https://blyg.aneeshsathe.com/t/1x1f5f6dkr1asm81y33dgcgrzc/), 2026-11-04.
   Yes to the address book, autocomplete and seeding it from subscriptions. Accepts ruling 2
   on the wire, but silence means the mentioned person never learns of it. Asks for a Studio
   Mentions tab: imported items whose `content_html` has an h-card matching the owner's
   `author.url` or `author_links`, listed beside verified Webmentions. "Ideally" also from
   feeds the owner does not subscribe to.
   - *Check:* the subscribed half looks compatible: §6 rule 3 already lets a client list
     mentions of a contact for its owner, and nothing is sent. Three edges: §6 says a baked
     quote's h-cards are the quoted author's speech, so they need excluding; §6 rule 2 says a
     mention proves nothing, so listing it beside *verified* Webmentions may blur two classes;
     and `author_links` is not in the RFC.
   - *Check:* the unsubscribed half has no mechanism without a crawler or a notification,
     and the notification is what ruling 2 refuses.
2. [Mike Casey](https://caseyjr.org/blyg/t/5vrr4d89q57kjdybrx78hedr8v/), 2026-11-02 (posts
   through the API from `drafts-blyg`).
   - **§5.2:** is `@handle` resolved server-side at publish, or only in the Studio's editor?
     If only the editor, API clients put raw `@alice` in `content_md`, which §9 rejects. He
     asks the RFC to say either way, and offers to implement it.
     *Check:* a real gap. §5.2 opens with the editor and says "consumed at publish";
     §5.6 item 3 has the publish API returning unresolved-`@word` warnings, which implies a
     server resolver, but neither states it. It decides what third-party clients must do.
   - **§5.6:** +1 to provenance being set only by the resolver, and he concludes a
     client-generated text's byline should stay human.
     *Check:* §5.6 item 3 concerns address-book provenance (`self`/`bound`/`entered`); the
     byline rule is item 2, decided by token scope. He may be merging the two, which could
     mean the section reads ambiguously.

**RFC-2**

3. [Aneesh Sathe](https://blyg.aneeshsathe.com/t/25y14phagghjzcqtjxsewd0e7x/), 2026-11-04.
   Kinds 2 and 3 matter most, since most of his readers will not get a blyg.
   - **Main ask:** say how the house tells hosted commenters about replies: opt-in email per
     comment or thread, sent by the house's client when a stub of their comment verifies.
     "Blygs should not discard affordances already there on blogs."
     *Check:* the RFC has no notification text, and §4 does give the comments origin every
     reply. It is off the wire, but his kind 3 condition has a timing problem: an email deleted
     "once the comment's decision is made" is gone before any reply can arrive, and §7.3 keeps
     no such data.
   - **"One install runs both"** should be a firm recommendation.
     *Check:* §4 already says "should"; this may only be emphasis.
   - **Kind 1 as a comments section under a post in every Studio, perhaps as an extension.**
     *Check:* extensions cannot reach public pages (`blygger-studio/docs/extensions.md`, "The
     wire"; #89), so it could not be one today. The RFC also says the reference client builds
     nothing from it.
4. [Mike Casey](https://caseyjr.org/blyg/t/4rwfyv2ca091qhwmc7z73f2fzn/), 2026-11-02. The
   header's stance holds in practice: responding from your own blyg is one tap. §5: asks kind
   1 clients to exclude or separate typed stubs carrying "a recognized extension", such as a
   prediction resolution `{resolves, outcome, evidence}`, because there the resolutions are
   the content.
   *Check:* §5.1 already separates by relation, so a display rule fits. But recognizing a
   typed stub presupposes the extension members blygger-spec#10 refused (the `meta` bag under
   "Do not open" below), although he says "no wire change". Is there a form that needs nothing
   on the wire?
5. [ksurya on #15](https://github.com/blygger/blygger-spec/issues/15), 2026-11-02. Agrees
   there should be no reply primitive. Wants to accept webmentions from places that are not
   blygs, such as replies to a Twitter post.
   *Check:* out of this RFC's scope. It belongs with RFC-4, responding from anywhere (#82),
   and §15.6's trackback class is the constraint.

## Review first — decisions Opus ruled (#58)

**Pending now: nothing.** Session 58 reviewed session 57's batch (the §16.12 promotion,
studio#106's reading, the tangling plan's two wording fixes) — all confirmed, `v0.4-plan.md`
§17.2. Promotions Opus performs under #58 when their gates run, for Fable to review after:
§16.9 `pinned_at` → §5.2 and §8 once the studio emits it and a second client reads it;
§16.9 `cid` → the same once any client emits it and a mirror reads it; §16.10 image size
→ §10.1 once emitted and imported across two nodes; **§16.13 `moved_from`** → §6.1, §12.2,
§15.3, §15.4 once Florian's live case has run the gate. When reviewing that promotion, the
thing to look at: that the receiver's former-identity substitution is confined to origins
the receiver itself declares. The tangling build (Opus, `tangling-plan.md`) may add
further sentences under #58; they go in section C of the queue.

## The gates

| Gate | What must be true | Then Fable does |
|---|---|---|
| **G3** | Kyle's token auth has shipped under #52's four invariants (it has, 0.28) and **at least one third-party tool** authenticates with a scoped token | Review **`tn-4` — the write surface** (non-normative, #31), which Opus drafts from the build. |
| **G5** | The reference agent (2.10) has run against a live node long enough to refresh a snapshot, answer a mention, and author under its own byline | Review `tn-5` for anything that wants a construct — the refresh scope on the re-bake identity (#38, backlog §1) is the candidate. |
| **RFC-3 draft** | Opus has drafted RFC-3 (pace-layered order) from `blygger-studio/docs/pace-layered-feed.md` and the fixtures (`opus-brief.md` item i) | Edit and rule it as #67/#68 were; publish on blyg.blygger.org with a comment period. |
| **RFC-4 draft** | Opus has drafted RFC-4, responding from anywhere (#82; `opus-brief.md` item t) | Edit and rule it; publish with a comment period as RFC-1 and RFC-2 had. |

If nothing is pending review, the dated item is not due and no gate is true when a Fable
session opens, **say so in one line and stop** — or take item 24 or the `plans/` review if
Venkat has decided to.

## Next round, on Venkat's word

0. **The four unreviewed session-29 explorations in `plans/`** (carry-over since session
   49): `unicode-support-proposal.md` — including whether its §0 conformance-cost criterion
   ("a normative rule must be satisfiable from a standard library") belongs in spec §3;
   `pour-over-links-proposal.md`; `rich-editor-proposal.md`; `publishing-patterns.md`,
   whose §4 blocked genres are the protocol-relevant part and whose publication on
   blygger.org as a fourth genre is an open question. File what survives in `backlog.md`.
1. **Item 24 — the nine choices the 0.4 text leaves open**, found by Aneesh's reader
   suite ([blygger-spec#22](https://github.com/blygger/blygger-spec/pull/22), merged), with
   the clause register's For-Fable findings in
   [blygger-spec#23](https://github.com/blygger/blygger-spec/issues/23). Each answer is a
   sentence in the living text that another client reads, so this is a round of its own,
   not a quick ruling; measure each choice against the live clients before ruling, as
   session 49's second round did with the member tables. The reader suite's studio run
   (72/28) is Opus's to reproduce first, so the round starts from a current report.
2. **RFC-3 and RFC-4**, when drafted.

**Opus-tier, not Fable's — listed so a Fable session does not take them by habit.**
[blygger-spec#19](https://github.com/blygger/blygger-spec/issues/19) (fetched text is data,
one SHOULD in §14; Opus may rule under #58, the one question being whether a conformance
document should mention language models at all given the §0 criterion above);
[blygger-spec#20](https://github.com/blygger/blygger-spec/issues/20) (publish the
conformance schemas at their `$id` URLs; depends on blygger-org#4); studio#88 (shannonbux,
component primitives, unreviewed); the re-scope of studio#59 and `docs/mods.md` under #89
(opus-brief § session 58); blykker's hooks in their general forms; blygger.com's two
listings for Florian's blyg (opus-brief item y).

## What sessions 56 and 58 settled, so it is not reopened

**#89** (session 58): the studio has three mod surfaces — owner-API configuration,
compiled-in extensions, hooks upstream — and a hook must be general, wire-silent and
reads-only on the server; no program-hosted extension registry now (the extension API is
unversioned, a listing under the org reads as endorsement, demand is unmeasured, #47);
Aneesh's operator tooling survives as a registry of one; the feed filter and the server
write hook blykker proposed are refused, the other three accepted as settings or
presentation; principles in `blygger-studio/docs/mods.md`, not an RFC; blykker is on its own.
The day a second mod with browser code exists is the day to count demand again.

**#86**: a hopper feed is not re-emission — #12's line is the state plane and the `blyg:`
namespace, not the manifest; no `blyg:` in a hopper feed, own items included; no item
document ever names a hopper; step 7 is a reader change and 0.4 text; a ruled shape until
the two-node gate runs. **#87**: `{identity}blyg.json` MUST serve the manifest (copy or
same-identity redirect); #51 amended; a `manifest` URL in references and "subscribers only"
were refused. **#88**: a move's two statements are the old manifest's permanent redirect
and the successor's `moved_from`; readers offer on both and adopt only on confirmation;
receivers read a declared former identity as their own; no `moved_to` key; publishers that
move keep serving old item documents. Also: the fixed name holding at the identity is what
makes #85's sender fallback and §15.4's template check sound.

## The one standing question — Unicode on the wire (blygger-spec#6)

Not a gate; it opens on choice. `content_hash` differs between NFC and NFD spellings of the
same visible text, the same visible origin serializes to two different strings, three caps
say "characters" without a unit, and two truncations say nothing about where they may cut.
#76 settled line endings for the grammar (LF or CRLF) but not for the hash. Take it only
when no gate is open, or when the first cross-client hash disagreement appears in the
wild. **Measure first:** hash every live item both ways, serialize every live origin
through WHATWG, Python's `urllib` and Go's `net/url`, and count what the caps actually count
in each live client. Nothing here is pre-decided.

## Sequencing notes

- **`tn-2` identity** can be written now (#61, #64, #67 ruled). **`tn-3`** is revised.
- **A technical note on IPFS** (CID profile, pin log) waits on a client emitting `cid`.
- **blygger-spec#12 (Glass Bead Game)** is declined (session 38); parked in `backlog.md`.
- **Kyle's PRs are not gates.** Opus reviews them against #52's four invariants.
- **The snapshot policy stands:** revisions land in the living text and are not
  snapshotted; a snapshot is cut at publication of a new version and thereafter as a
  deliberate act when a third party needs the text to hold still. The seventh revision was
  not snapshotted.
- **Opening 0.5** needs a construct of #43's second kind built and exercised. Step 7 (#86)
  and `moved_from` (#88) are 0.4 constructs landing in the living text, as #79 and #84 did;
  do not open 0.5 for them.

## Do not open

- **#11 identity, #12 metrics** — load-bearing refusals. (#88 touches neither: origins,
  not people; a verified succession between two origins, not a merge of identities.)
- **A normative write API** (#31), **a mention relation for links** (#32), **a title
  field** (#46), **transitive staleness** (#45), **a maintenance flag** (#34, and now
  #77: a same-hash republish is detected, never declared).
- **Version-significance markup in either direction** — #19, TN-1, #77.
- **The two declined candidates** (#47) unless the trigger named in `backlog.md` §1 occurs.
- **`![[id@vN]]`** — reserved; the variorum (blygger-spec#8) is its named trigger.
- **A second discovery vocabulary** for manifests — #51 chose to extend the existing link.
- **`.well-known` discovery for auth, or any auth key in the manifest** (#52).
- **A general `meta` extension bag on the item document** (blygger-spec#10).
- **Softening #57 for withdrawn quotes** — ruled explicitly in #62.
- **A query-string manifest** — out of scope by #64.
- **Label-first brackets, an escape for `]]`, a wire meaning for `[[text]]`** — #70, #71.
- **A bundle CID, or any media addressing on the wire** — #74 named the document only.
- **Image attributes beyond `width` and `height`** — #75.
- **A filtered blyg feed** (per-hopper `feed.xml` with `blyg:id`, or a publisher-side
  filter that drops marked items) — #86 named it as the refused sibling of the hopper
  feed; #89 refused it again for blykker.
- **A program-hosted extension registry, or any extension listing under the `blygger`
  org that reads as endorsement** — #89; the trigger to count again is a second mod with
  browser code.
- **A server-side write hook in the studio** — #89; writes go through `client` in the
  browser or a scoped token outside.
- **A `moved_to` key, or any succession claim a reader acts on without the old origin's
  redirect** — #88.
- **A `manifest` locator inside references** — #87.

## Hand back

Per gate: what was promoted, into which section, in which document. Continue `CLAUDE.md`'s
locked decisions from **#89**, record reasoning in `v0.4-plan.md` §17 (or a new section),
append the DEVLOG entry, file any new ideas in `backlog.md`, prune `fable-round-queue.md`,
and rewrite this brief.
