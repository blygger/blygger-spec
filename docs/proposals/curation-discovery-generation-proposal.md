# Curation, Discovery & Generation Hardpoints — Session-7 Decision Record

**Status: §1–§3 ACCEPTED (session 7, 2026-08-03, Fable + Venkat). §4 records
pre-decisions ("leans") for the v0.4 Fable design pass — directional, not locked.**

This session resolved three protocol questions Venkat raised before the build
resumes: (1) what "make-public" means for imported items, (2) how nodes discover
each other and learn they've been responded to, and (3) where the AI-generation
hardpoints live and what the wire carries. The governing frame throughout is the
GitHub precedent Venkat named: **treat publishing the way GitHub treats code** —
quiet watching, public forks and citations, no comment threads.

---

## 1. Make-public is curation, not speech (ACCEPTED)

The v0.2 roadmap had: *"imported items owner-only by default with a make-public
('retweet-like') action"* — under-specced, and a naked retweet is in tension with
the frozen v0 spec's no-reply/no-quote-primitive stance (initial spec items 26–27).

**Decision:** make-public means **curation display only**. A made-public imported
item appears on a **public hopper page** (a curated reading list — blogroll-adjacent
presentation), rendered from the local snapshot with source attribution and a link
to the origin. It is **never re-emitted as an item on the publisher's feed**.

**Rationale (two independent reasons, either sufficient):**

1. **Semantic:** re-emitting someone else's item under your origin collides with
   the rollup contract — subscribers match by `blygg:id`, so your copy and the
   origin's live stream would be conflated as one item with two publishers,
   violating the session-5 single-publisher invariant and origin-scoping of
   everything (ids, authors, trust).
2. **Editorial:** the medium's stance is that appearing on your feed costs
   editorial. If you want their content in your stream, the price is a stub —
   quote-with-editorial. Retweet becomes curation (a list you keep), not speech
   (a thing you said).

**The complete public response-surface inventory, after this decision:**

| Surface | Version | What it is |
|---|---|---|
| Stub | v0.3 | Quote-with-editorial: hopper-add + stub thread transcluding a snapshot + editorial note. The only way to put someone else's content *on your feed*. |
| Fork | v0.3 | `forked_from` → a **pinned** version. Continue an item as your own, with lineage. |
| Public hopper | v0.2 | Curation display: a reading list, off-feed. |
| Blogroll | v0.2 (§2.1) | Curated subscription list, off-feed. |

No reply primitive exists at any level, permanently (frozen spec item 27).

---

## 2. Discovery: two planes (ACCEPTED, both L2)

Current state (correct, confirmed): there is no discovery. Subscription requires
finding a blygg out-of-band and adding its URL; v0.2's "autodiscovery" is
*resolution* (URL → manifest-or-RSS), not discovery. The frozen spec's stance —
"no discovery as such… old school blogrolls" (item 56) — is kept as the *floor*
and extended with two optional L2 surfaces, one per protocol plane.

### 2.1 Static plane: published blogroll (L2, ships v0.2)

An optional, crawlable, curated subscription list:

- **Format: OPML 2.0** at `/blygg/blogroll.opml` — reuse, don't invent; OPML is
  the existing blogroll interchange format and tooling reads it.
- Referenced from the manifest via an optional `"blogroll"` key; publishers
  SHOULD also emit the conventional `rel="blogroll"` link on the HTML page.
- **Publishing your blogroll is a publishing act**: it is a *curated subset* of
  your subscriptions, deliberate and revocable. The protocol makes **no
  completeness claim** — a blogroll is what you chose to show, not a follower
  graph leak.
- Network traversal = crawling blogrolls + following transclusion provenance
  backwards to origins (the mechanism spec item 56 already names).

### 2.2 Notification plane: Webmention (L2, ships v0.3)

**Reuse Webmention** (W3C Recommendation, 2017) — the living successor to
pingback/trackback, both rejected as dead (trackback: no verification, died of
spam; pingback: XML-RPC legacy).

- Receivers advertise an endpoint via an optional manifest key plus the standard
  W3C discovery (`Link` header / `rel="webmention"`). **Advertising an endpoint
  is optional**; a static-only deployment simply doesn't, and remains fully
  conformant — discovery for it is crawl-only.
- Senders SHOULD send a mention when publishing an item whose transclusions,
  stub metadata, or `forked_from` reference another origin's item. Source =
  the referencing item's permalink page; target = the referenced item's
  permalink (plain-Webmention compatible).
- **Structural verification kills the trackback spam hole:** a blygger-aware
  receiver maps the source permalink to its item JSON and verifies that the stub
  metadata / `transclusions` / `forked_from` actually name the target id. A
  mention that doesn't verify structurally is dropped.
- Received, verified mentions land in the **studio as signals** feeding the
  detect-stubs filter. They are never auto-published. This closes the real gap:
  without a notification channel, detect-stubs only sees stubs from feeds you
  already subscribe to — quietly reinventing the mutual-follow dynamic. Webmention
  is what makes the soapbox network asymmetric: anyone can stub you and you'll know.
- Full mechanics (retry, dedupe, endpoint shape, rate limits) are the v0.3 Fable
  plan's job; this record locks the *choice of mechanism* and the verification
  principle.

**Amendment to locked decision #1, explicitly acknowledged:** a Webmention
receiver is the protocol's first **dynamic surface**. Resolution: it lives at
**L2 and is optional even there**. "A blygg is just files" remains the L1 floor,
untouched.

### 2.3 "Follow" is deliberately nothing (ACCEPTED)

Subscription stays **client-local and invisible**, like RSS. No follower lists,
no follow requests, no protocol follow object, ever. The public social graph is
exactly two artifacts: your **blogroll** (outbound, curated) and verified
**stubs of you** (inbound, earned). GitHub again: watching is quiet; forks and
citations are public.

**Rejected alternatives:** ActivityPub Follow (requires an actor model — collides
with locked decisions #5/#11: identity is never in the protocol; only the origin
is authenticated); WebSub (solves update latency for existing subscriptions, not
discovery — orthogonal, revisit post-1.0 if polling ever hurts); central
directories/registries (the ecosystem's job, not the protocol's).

---

## 3. What stays out of the protocol (ACCEPTED)

Asked and answered: no tags, no canned editorial phrases in the protocol.

- **Hoppers are already the taxonomy** — many-to-many, named, curated; a public
  hopper *is* a tag page. A second labeling system would be the cruft.
- **Canned editorial phrases are studio sugar** — a "stub templates" client
  deliverable (one-click stub with a picker of saved phrases) delivers the ease
  with zero protocol bytes. This extends the standing pattern to a third leg:
  *AI is never in the protocol; identity is never in the protocol;* **editorial
  convenience is never in the protocol.**
- If per-item tags are ever truly demanded, the answer is RSS's existing
  `<category>` as pass-through presentation — reuse, don't invent. Not built
  until demand appears.

---

## 4. Generation hardpoints (v0.4 pre-record — leans, not locked)

Recorded here so the v0.4 Fable pass starts from Venkat's session-7 intent
rather than rediscovering it:

1. **Fragment-level generation hook (gap, to be added to v0.4):** v0.4's
   authoring hooks are thread-centric (`[TK]…[/TK]` scopes). Add a first-class
   **generate/regenerate hardpoint in the fragment editor** too, and design all
   generation hooks — fragment editor, thread TK scopes, import-pipeline filter
   plugins — against **one provider-call interface** (the configurable
   provider + key already in v0.4). This is part of the existing ⚠️ FABLE "TK
   generation contract" item, now explicitly scoped to both item kinds.
2. **Post-generation on the wire, always** (restating locked decision #5 as it
   applies here): the published artifact is the generated output; pre-generation
   draft state (unexpanded TK scopes) is studio-private. "Raw" is visible only
   as the separately-published source fragments that provenance points at.
3. **Lean: generated text lands in `content_md`**, with TK scope markers
   retained as inert annotations — so the hash and any pin cover what readers
   actually read, and readers see ordinary markdown. To be confirmed in the
   v0.4 TK-generation-contract design.
4. **Open (disclosure):** whether/how the artifact records *that* generation
   occurred (model id, etc.). Unspecced; decide in the same v0.4 pass.
5. **Staleness is a studio concept, not a protocol concept** (restated): source
   edits version the source on the feed immediately; dependent threads change
   on the wire only when the owner regenerates and republishes. A thread baked
   against an older source version is legible by design — its provenance names
   the exact version it baked.

---

## 5. Where this lands

- `docs/roadmap.md` — v0.2: make-public reworded as curation; blogroll added to
  protocol deliverables. v0.3: Webmention added to protocol deliverables (L2);
  stub templates added to client deliverables. v0.4: fragment-level generation
  hook added; FABLE item extended with the `content_md` lean and disclosure question.
- `CLAUDE.md` — locked decisions #12 (response primitives & curation) and #13
  (discovery model) added.
- `docs/protocol-v0.1.md` — unaffected normatively (all of this is L2/v0.4);
  the L1 spec's "Reserved & future" section points here.
