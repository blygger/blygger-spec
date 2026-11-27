# Commerce in the Thicket — technical review, first pass

Session 91, 2026-11-27, Opus 5.5. Reviewed `commerce-in-the-thicket-v4.md` (809 lines, about 13,500
words), the PDF (42 pages, ReportLab, same text), and the blyg bundle (the same markdown, byte for
byte, plus ten figures). This pass does two things. It lists the work the draft marks for technical
review (TR-01 to TR-14). It also checks the draft's Blygger claims against the repos and the live
sites. It edits nothing in the draft.

## 0. Evidence base (as of 2026-11-27)

| Source | State used for this pass |
|---|---|
| Protocol | `docs/protocol-v0.4.md`, the living DRAFT (twenty-fourth revision); locked decisions in `CLAUDE.md` |
| RFC-3 pace-layered order | Open for comment until **2026-12-10**. Shipped in Studio since 0.42.0, where it is the default home order. Burrow 0.28 has it too |
| RFC-6 sealed content, RFC-7 payments | v2 (Fable's edit, #106); comment periods **close 2026-11-28, tomorrow** |
| RFC-8 editorialized quotation | Draft, unpublished |
| Blygger Studio | 0.73.1 on `main`. Reading tabs: Feed, Mentions, Agentic feed, Saved, Background, Raw (`src/ui/reading.tsx` `LENS_LABELS`) |
| Burrow (`aneeshsathe/blygger-desktop`) | 0.29, 2026-11-24. Writes Agentic feed editions with the user's own AI; web Burrow is served at `{mount}/burrow/` |
| Plans, not built | `agentic-digest-plan.md`, `file-attachments-plan.md` (both session 90) |
| Endnote URLs | All 14 Blygger and web links checked answer 200 |
| Figures | Numbers check out: α=1.5 gives ×1,000 total and ×10 average from 1 to 100; the A/D/V log plot matches n^1.3, n^0.65, n^0.9 |

## 1. Accuracy findings (must fix)

Ordered by how much each one would mislead a hackathon participant who builds on it.

**F1. Relational opacity is overstated for incorporation and understated for reading** (Exec summary
L13, §11 L167, §12, §14 L228–232). The draft says an outsider participates "without gaining a
comprehensive map of the people and relationships". Blygger's public *incorporation* graph is
built to be mapped:
- every quote, stub, fork, pin and link names `{origin, id, version}`, and blogrolls are public OPML;
- blygger.org/thicket describes the planned explorer as a block explorer: "who quotes it… its
  blogroll and its mentions."

What is opaque is *readership*:
- subscription is client-local and invisible, and "follow is nothing" (#13);
- there are no follower objects and no subscriber counts anywhere;
- no document or feed carries a count of any kind (#107).

The thesis survives if relational opacity is restated as **opacity of reading, with incorporation
public by design**. As written, it contradicts the project's own thicket page.

**F2. Only the origin can pin** (§14 L230 "A second publisher can… preserve a particular version";
§23 "a pin can anchor an old representation"). A pin is the origin's irrevocable promise to host
one of its own versions (§8; #8). A second publisher preserves a version in two ways:
- **by quoting it.** The snapshot is baked into their own thread and is independent of later
  edits and withdrawal (§10.2, §10.4; #9);
- **by mirroring bytes the origin already pinned** (§13.4; #74).

**F3. Forks need a pin** (§14, §23, §26 "publishes a fork"). `forked_from` must name a **pinned**
version (§5.6). For commerce, a merchant controls forkability by what it pins. Quotation, by
contrast, needs no permission.

**F4. Expiry has no wire representation, and quotes outlive withdrawal** (§22 L336 "downstream
quotation must not renew expired terms"; A.2 "validity periods"). The protocol has nothing for
expiry:
- no expiry or offer construct exists;
- RFC-7 §10 refuses any construct that claims to restrict use after delivery, expiry included;
- RFC-7 also puts no price, currency or for-sale flag in any document;
- a quote is a frozen snapshot, so withdrawing an offer does not remove quotations of it (#9, #62).

An agent does have two tools:
- every quote carries `{id, version}`, so a reader can fetch the live item document and see a
  newer version or a withdrawn endcap (§10.4, the direct staleness check);
- the offer's own terms can be a cited stable document (RFC-6 "terms are a citation").

§22 needs rewriting around those facts. As written, it implies a mechanism that does not exist.

**F5. The Agentic feed evidence is reversed** (§18 L277). The tab list (Feed, Agentic feed, Saved,
Background, Raw, plus Mentions) is the **Studio's** reading bar, adopted since session 77; Burrow
0.28 and 0.29 brought itself into line with it. The two clients have shipped different things:
- **Studio 0.73.1:** the Agentic feed tab is a placeholder ("Coming soon"). Its prompt can be set,
  and the built-in digest is a plan (`agentic-digest-plan.md`).
- **Burrow 0.29:** it writes editions (headline, summary, "why it's there") with the user's own AI,
  local or provider, signed "Burrow · <provider>".

So the evidence for editions is Burrow's, and the evidence for the tab structure is shared.

**F6. Background filtering is built, not speculative** (§19). Studio's Background is a set of
automatic, structural reasons the reader derives from the wire: withdrawn, maintenance (a
same-hash republish, #77), near-same (#83), superseded, folded bursts and tangles (#78, #112),
wordless. It also takes the owner's manual moves. Raw shows everything, unfolded. Three of the
draft's points are already answered, with the reason:
- **Flooding.** "A merchant that floods its origin with near-identical offers" is what near-same
  and burst folding already do.
- **Cheap talk.** No sender-settable significance flag exists, by decision: #19, #77, #83 and #96
  refuse it as cheap talk.
- **Costly signal.** Pins are the protocol's costly signal (#19).

The Feed Modulation Signals Inventory remains correctly described as exploratory. It is a v2 thread
on venkateshrao.com/blyg, dated 2026-10-18.

**F7. Pace-layering rewards pins and revisions, so it is a commercial lever** (§15, §19 L295). RFC-3
ranks from pins (items sink more slowly) and revisions (a non-maintenance version climbs one
place). This is the "pins as quality score" risk the draft warns about, and it is live in two
clients' default feeds. The defenses are:
- **Pins are costly** and irrevocable.
- **Maintenance versions do not climb** (RFC-3 R2).
- **The constants are client-tunable.**

The draft should say this concretely rather than in the abstract. The hackathon should treat it as
a red-team target.

**F8. Inbound intelligence runs on Webmention, and citers can stay silent** (§8, §23, §29). Here is
how a merchant learns of incorporation:
- **Mentions** with structural verification (#28). The relations are stub, transclusion, fork,
  source and link (#44, #79). Reposts are classed as notices (#80).
- **Private by default.** Verified mentions are private studio signals; public display is the
  owner's curation (§13.5, §15.5).
- **Silence is a choice.** A markdown link to an absolute URL is the one deliberately silent
  citation (#79). Not every client sends mentions.

So a merchant cannot assume it sees every reference. That is a feature for buyers and it belongs in
the text. Studio's **Mentions** tab is a different thing: mentions of the owner *found in items
already read*, unverified, with nothing sent (#91 B4).

**F9. Digests cannot re-emit others' items** (§18, §21 "Editorial", §24 "Fixed tenancy in a public
edition", A.4 "includes the notebook in a digest"). A publisher never re-emits imported items on
its own feed (#12). A Blygger "digest" is one of three things:
- **a public hopper**, optionally with a hopper feed of excerpts and RSS `<source>`, never the held
  snapshot (#86);
- **a thread** that quotes, with the editor's own words;
- **an Agentic edition**, which is private by default.

There is no slot for sponsor disclosure. It would be prose, or a convention through the RFC route.

**F10. Payments and permissions: use the RFCs' exact mechanics** (§25, §26, §29, §35):
- **Hold, then probe, then ask.** A held lock key opens content locally with no request; probing is
  a GET to computed grant paths (RFC-6 §4).
- **The home's ladder.** A request is decided pre-approved, automatic or exception, possibly by
  the owner's AI delegate under standing instructions.
- **Payment.** It is one more ground for a grant, via a 402 in any rail's own format (RFC-7 §3).
- **Leakage is already listed.** RFC-6 §7 and RFC-7 §9 list what leaks: existence, timing, size
  class, lock sharing, epoch cadence; "every first read" in on-demand mode; probing shows the home
  what an agent looked at and did not buy; on-chain rails make public member lists.

The draft's honeypot section (§35) can cite these directly instead of speculating. Both RFCs close
tomorrow, and the final text should reflect the close.

**F11. Delegate safety rules already exist** (§36–37). These sections should cite four things:
- **Buyer delegates (RFC-7 §8).** Seller text is untrusted data, a person sets spending limits the
  delegate cannot raise, the delegate buys entries only by default, never pays for what it holds,
  and keeps evidence.
- **Approver delegates (RFC-6 §4).** A requester's note is data, a delegate grants entry keys only,
  and an exception does not recurse.
- **Studio scoped tokens.** Tokens carry scopes (#31, #52, `reading:read`/`reading:curate`,
  `owner:private`). The password is typed only on the studio's own login page. MCP uses the same
  scopes.
- **The protocol is agent-agnostic (#38).** Agents carry `generated[]` provenance and an agent
  byline with `operator`.

**F12. What a polling publisher sees** (§22 L338, A.3). Studio's importer fetches with a generic
user agent (`Blygger Studio/… (+https://blygger.org)`) from Cloudflare's shared egress. The
publisher sees that some Studio polled, not which reader. Desktop clients poll from the user's own
IP. Say this, version-stamped. It is the concrete form of "private reading is an architectural
objective, not anonymity".

**F13. Exit is documented, partly unbuilt** (§30–31, §38). Three things exist:
- **Subscriptions** export and import as OPML.
- **Identity** is DNS: the final fetch origin (#17).
- **References** are absolute, and pins are forever.

Origin succession (`moved_from`, a permanent redirect of the manifest, #88) is a ruled shape still
**awaiting a build** (§16.13). That is honest material for TR-10.

**F14. Flood bounds are concrete** (§33). Four bounds apply:
- **Rate.** The Webmention receiver answers 429 above 60 per hour per source host.
- **Verification cost.** It is bounded: at most 2–3 fetches, 5 s and 1 MB each.
- **Storage.** Nothing is stored but a pointer.
- **Display.** It is the owner's choice.

A reader never fetches unsubscribed content on its own. The Sybil caveat stands, because the limit
is per host. This answers part of TR-11's "do public references force fetching or processing".

**F15. Smaller corrections:**
- A.1 "being developed by the Protocol Institute". The blygger repos are their own GitHub org and
  the Institute sponsors them. Wording is Venkat's call (Q2 below).
- A.1 table: "Article or post → Published item or thread" should read **fragment or thread**.
  "Reference to material on another origin" should also cover one's own origin.
- §11 and [6]: cite Aneesh's specific essay, the one blygger.org/thicket names: "Logic of the
  Thicket and the Unsearchable Web" (2025-12-19).
- [9]: the protocolized.summerofprotocols.com hostname is being retired (`sop-migration`). Check
  whether a protocolized.io URL now exists. The byline (Rao, Sathe, Mathews) checks out.
- [16]: cite `blygger.org/spec/0.4/` at a dated snapshot, not the repo (#42: implement the living
  text, cite snapshots).
- §5 "agents are first-class": on the wire the protocol is agent-agnostic (#38). It never asks who
  acted. "First-class" is true of the clients and the owner API, not the wire. Worth one sentence,
  because it is a strength: nothing in the protocol can be gamed by claiming to be human.

## 2. Marked work: the TR register, first pass

For each TR: what the evidence supports, and what the revision adds. "Gap" means real new work for
the hackathon or for the project, to be recorded as such.

| TR | Sections | Evidence found | Revision adds | Gaps to record |
|---|---|---|---|---|
| 01 Core model | §14, A, C | Origins, items (fragment/thread), versions, pins, RSS plane vs item-document plane (#1), resolution (#17) | Replace §14 with an accurate one-screen model (F1–F3, F15). Precise C.1 glossary | none |
| 02 Versioning, pace layers | §15, §22 | RFC-3 inputs and status; bare counter (#19); maintenance derivable; no expiry (F4) | §15 concrete (F7); §22 expiry rewrite (F4) | No offer-validity convention exists; candidate RFC |
| 03 Propagation, provenance | §14, §23, §32, §34 | Mention relations, verification, notices, silent links (F8); `cited`; snapshot independence | What is discoverable, what is verifiable, what attribution doesn't prove (a verified mention proves the origin named you, not independence) | Explorer is planned, not built |
| 04 Agent integration | §16–17, §20 | Owner API, OAuth/MCP, scopes, helpers, polling by conditional GETs (#111) | Agent-side architecture sketch, owner API vs public files | No inference-budget controls beyond the AI call cap and the parked AI-budget prototype |
| 05 Feeds, filtering | §18–19 | F5, F6, F7; Burrow editions | Replace §18–19 speculation with the two clients' real behaviour; "genetic lineage" stays a proposal | Studio digest unreleased; cross-client edition format is client contract, not wire |
| 06 Commercial surfaces | §21–24 | Hoppers and hopper feeds, curation display, #12 (F9) | Map the six surfaces to real constructs; mark sponsor disclosure and structured offers as non-existent | Offer, sponsor conventions: none |
| 07 Selective access | §25, §35, §39 | RFC-6 v2 (F10) | Exact flow and leak list; read ≠ contact | Unbuilt; Studio has owner-only private items only (0.72.0), seals in phases 1–4 after close |
| 08 Payment, fulfillment | §26, §35 | RFC-7 v2 | Doors, epochs, rent/purchase, vouchers/pass, refusals | Unbuilt; physical fulfillment wholly external (correct as drafted) |
| 09 Measurement | §27–29 | Webmention signals; no counts; generic-UA polling (F12) | What a merchant can and can't measure | No experiment instrumentation exists |
| 10 Aggregation, exit | §30–31, §38 | OPML, DNS identity, pins, #88 (F13) | Migration as built vs ruled | `moved_from` unbuilt |
| 11 Sybil, flooding | §32–34 | F14; Background folding | Concrete bounds | Per-host limits are Sybil-weak; no cross-origin dedupe beyond near-same |
| 12 Delegate capture | §36–37 | F11 | Cite the delegate rules; portability = OPML + open API | Reader-context portability between clients unspecified |
| 13 Security synthesis | §40–42 | All above | Reclassify the §41 table into four columns: protocol invariant / shipped client control / proposed (RFC) / ecological hypothesis | — |
| 14 Hackathon feasibility | §43 | Two live nodes plus blyg.blygger.org; owner API; MCP; fixtures (`test/fixtures/feeds/`); conformance toolkit | Per-track "runs today / needs a client feature / needs a protocol change / needs an outside service" | Sandbox nodes for teams; simulated rails; no payment code anywhere |

Planned diagrams for D.3's "compact architecture or sequence diagrams":
1. **The two planes and a poll:** feed as signal, item documents as state, what the publisher sees.
2. **A quote and its mention:** bake, send, verify, private signal, optional curation.
3. **RFC-6 and RFC-7's hold, probe, ask, 402, grant:** with the leak points marked.

These would replace the generic box figures `surfaces.png`, `payment.png` and `edition.png`.

## 3. Editorial notes (for the writing pass)

- **The hedging is heavy.** Nearly every section ends "this is a hypothesis, not a guarantee". Once
  the technical facts are pinned, most of these can go. A short status vocabulary used
  consistently would replace them: *protocol* / *shipped in Studio X* / *shipped in Burrow X* /
  *proposed (RFC-n)* / *hypothesis*.
- **The structure works.** Parts I–III are doctrine, IV–VII are the case, VIII is the hackathon.
  The appendices are the right ones. Appendix D is review scaffolding and comes out of the final;
  a short "Sources and status" appendix replaces it.
- **The figures are inconsistent.** `attack-economics.png` uses matplotlib default styling and the
  other nine share a palette. The three box diagrams above should become real request-path
  diagrams.
- **The date line.** "Fourth discussion draft — technical review handoff" becomes the final
  version line.
- **Some sentences need a source.** "the medium should not depend… GDPR-like" is fine as argument.
  "There is no clear evidence…" in §4 is a claim about the world with no source; keep it as
  argument or cite.

## 4. Publishing questions (for Venkat)

- **Q1. PDF on R2.** The Studio's media upload accepts png/jpg/gif/webp/svg only (`src/api.ts`
  `MEDIA_TYPES`). It serves media only through a `media` table row, so an object put straight into
  the bucket returns 404. PDF attachments are `file-attachments-plan.md`, which is not built and is
  sequenced after the Agentic digest release. The PI node is `blyg-protocol-institute` on the
  **PI Cloudflare account**. There are three options:
  - (a) **build the attachments plan first**, so the PDF is a proper `media[]` attachment;
  - (b) **put the object in the PI media bucket** and serve it from a public R2 custom domain,
    outside the Studio;
  - (c) **host the PDF elsewhere**, e.g. blygger.org or protocol-institute.org, and link it.
- **Q2.** What attribution wording should describe the Protocol Institute's role in Blygger?
- **Q3.** Should the briefing mention unreleased Studio work, such as the built-in digest?
  Recommendation: say "planned" and give no dates.
- **Q4. The tangle.** The Studio mints at most 10 spans per publish (`TANGLE_MAX`), and spans don't
  nest. A natural shape is a root thread (title, executive summary, a link to the PDF) with one
  span per part: Parts I–VIII plus Conclusion plus Appendices, which is 10. Each part's sections
  would be headings inside its thread. Does that structure suit, and whose byline goes on it?
- **Q5.** RFC-6 and RFC-7 close tomorrow. Should the final wait for the close rulings so §25–26 and
  §35 describe the ruled state?
