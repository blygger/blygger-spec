# Fable brief — the standing agenda for the next Fable pass

**This round's product:** review every decision labelled `Fable review pending` (#58);
take the dated item below when its date has come; take the queued items in
[`fable-round-queue.md`](fable-round-queue.md) if chosen on purpose; otherwise nothing.
**Since #58, promotions are Opus's**; Fable reviews them after the fact.
**Written:** session 38 (2026-10-06), by Fable 5.1. **Rewritten:** session 56
(2026-11-01), by Fable 5.1, after one round that ruled the three field items session 55
had queued: hopper feeds (#86, blygger-spec#18), the fixed name at every identity origin
(#87, blygger-spec#21), origin succession and `moved_from` (#88, blygger-studio#102).
**Rewrite this file each Fable round.** It is the one place a Fable session starts.

> **Read first, in this order:** this brief → `CLAUDE.md` locked decisions **#86–#88**
> (session 56; #84–#85 session 52; #79–#83 session 50; #70–#78 session 49) →
> [`v0.4-plan.md`](v0.4-plan.md) **§16** (the reasoning) →
> [`protocol-v0.4.md`](protocol-v0.4.md) **§16.12–§16.13** (the two new ruled shapes and
> their gates), §16.9–§16.10 (older ruled shapes still awaiting builds) →
> [`fable-round-queue.md`](fable-round-queue.md) (**item 22 only**) →
> [`backlog.md`](backlog.md) → [`opus-brief.md`](opus-brief.md) § session 56.

## The dated item — RFC-1 and RFC-2 close 2026-11-04

Anchors [blygger-spec#14](https://github.com/blygger/blygger-spec/issues/14) and
[#15](https://github.com/blygger/blygger-spec/issues/15). Checked 2026-11-01: **zero**
issue comments on both, and neither thread page on `blyg.blygger.org` (ids in
`docs/blyg-published.json`) shows a response. At or after the close: check the studio's
signals on blyg.blygger.org for pending or failed inbound mentions as well as verified
ones (a logged-in tab, `/api`), read anything there and on the two issues, revise or rule,
then gate RFC-1's studio work (`opus-brief.md` item e). If there is nothing, say so in one
line and rule that both drafts stand as published; the issues stay open as the place to
comment late.

## Review first — decisions Opus ruled (#58)

**Pending now: nothing.** The last Opus-ruled decisions (#65, #69) were reviewed in session
49. Promotions Opus performs under #58 when their gates run, for Fable to review after:
§16.9 `pinned_at` → §5.2 and §8 once the studio emits it and a second client reads it;
§16.9 `cid` → the same once any client emits it and a mirror reads it; §16.10 image size
→ §10.1 once emitted and imported across two nodes; **§16.12 hopper feeds** → §2, §4,
§6.1, §12.1 step 7, §12.2, §13.5 once the gate in §16.12 has run (studio#84 is the build);
**§16.13 `moved_from`** → §6.1, §12.2, §15.3, §15.4 once Florian's live case has run the
gate. When reviewing those two promotions, the things to look at: that §13.5's amended
sentence says "no protocol surface beyond the `hoppers` list and a hopper feed" and nothing
wider; that step 7 stayed a post-condition on steps 2–5 with the bound at six; that the
receiver's former-identity substitution is confined to origins the receiver itself declares.

## The gates

| Gate | What must be true | Then Fable does |
|---|---|---|
| **G3** | Kyle's token auth has shipped under #52's four invariants (it has, 0.28) and **at least one third-party tool** authenticates with a scoped token | Review **`tn-4` — the write surface** (non-normative, #31), which Opus drafts from the build. |
| **G5** | The reference agent (2.10) has run against a live node long enough to refresh a snapshot, answer a mention, and author under its own byline | Review `tn-5` for anything that wants a construct — the refresh scope on the re-bake identity (#38, backlog §1) is the candidate. |
| **RFC-3 draft** | Opus has drafted RFC-3 (pace-layered order) from `blygger-studio/docs/pace-layered-feed.md` and the fixtures (`opus-brief.md` item i) | Edit and rule it as #67/#68 were; publish on blyg.blygger.org with a comment period. |
| **RFC-4 draft** | Opus has drafted RFC-4, responding from anywhere (#82; `opus-brief.md` item t) | Edit and rule it; publish with a comment period as RFC-1 and RFC-2 had. |

If nothing is pending review, the dated item is not due and no gate is true when a Fable
session opens, **say so in one line and stop** — or take item 22 or the `plans/` review if
Venkat has decided to.

## Next round, on Venkat's word

0. **The four unreviewed session-29 explorations in `plans/`** (carry-over since session
   49): `unicode-support-proposal.md` — including whether its §0 conformance-cost criterion
   ("a normative rule must be satisfiable from a standard library") belongs in spec §3;
   `pour-over-links-proposal.md`; `rich-editor-proposal.md`; `publishing-patterns.md`,
   whose §4 blocked genres are the protocol-relevant part and whose publication on
   blygger.org as a fourth genre is an open question. File what survives in `backlog.md`.
1. **Item 22 — Aneesh's extension registry** ([studio#59](https://github.com/blygger/blygger-studio/pull/59)),
   **only when Venkat says so**. Kyle Mathews commented against it on 2026-10-26 and 10-27;
   read those with Aneesh's `docs/extension-registry.md` on the branch. To rule: whether a
   registry belongs to the program or a third party; who reviews an entry and what review
   promises; browser-only as a hard rule; whether blygger.org hosts the index.
2. **RFC-3 and RFC-4**, when drafted.

**Opus-tier, not Fable's — listed so a Fable session does not take them by habit.**
[blygger-spec#19](https://github.com/blygger/blygger-spec/issues/19) (fetched text is data,
one SHOULD in §14; Opus may rule under #58, the one question being whether a conformance
document should mention language models at all given the §0 criterion above);
[blygger-spec#20](https://github.com/blygger/blygger-spec/issues/20) (publish the
conformance schemas at their `$id` URLs; depends on blygger-org#4); studio#88 (shannonbux,
component primitives, unreviewed); the API-cleanup stack merged 2026-11-01 and not yet
deployed (session 55's note: owner API moves to `{mount}/api`; the host-root `/api` alias was restored in studio 0.49.12 for two releases, since `/blyg` is one of the two recommended mounts (Venkat, session 55); three
migrations, a repair that must run before deploy); blygger.com's two listings for Florian's
blyg (opus-brief item y).

## What session 56 settled, so it is not reopened

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
- **A filtered blyg feed** (per-hopper `feed.xml` with `blyg:id`) — #86 named it as the
  refused sibling of the hopper feed.
- **A `moved_to` key, or any succession claim a reader acts on without the old origin's
  redirect** — #88.
- **A `manifest` locator inside references** — #87.

## Hand back

Per gate: what was promoted, into which section, in which document. Continue `CLAUDE.md`'s
locked decisions from **#88**, record reasoning in `v0.4-plan.md` §16 (or a new section),
append the DEVLOG entry, file any new ideas in `backlog.md`, prune `fable-round-queue.md`,
and rewrite this brief.
