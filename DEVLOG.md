# Blygger Devlog

Per-session development log. Non-skippable: every coding session appends an entry
(template and writing standard in [`CLAUDE.md`](CLAUDE.md)). Newest first.

> Renamed from `ygg` in session 6 (2026-07-24) — see `RENAME.md`. Entries below are
> historical and are **not** retroactively edited: sessions before 6 correctly say
> `ygg` because that was the name at the time.

## Session 23 (cont'd, 3) — 2026-09-20 — Public responses: a citation trail, not a comment section

**Model:** Opus 5 · **Committed:** yes · **Deployed:** both live nodes (migration 0009 + the responses list)

**What & why:** Phase B task 17, pulled forward because Venkat's session-22 ruling
allowed it if Phase A finished early — which it did, by four days. His call after
walking the options: **shape A (a list) plus a hide control, open to all origins.**

**A list, never a count.** The argument that decided it is not aesthetic. A count is
the one thing on a blyg page a stranger can move by publishing, and this medium has
deliberately refused every metric it could have had — no follower counts, no likes,
thumbs kept private as studio signals (#12, #13). A list has a different economics: a
row costs a real item, on a real origin, that passes structural verification. Which is
also why the endpoint stays **open to origins we don't subscribe to** — Venkat: "the
origin constrained to being a blyg doing proper stubs is enough spam control for me."
Closing it to subscribers would end the property the whole design exists for.

**The forcing argument for chrome-not-content, stated in a test.** Responses are
rendered from `mentions_in` at request time and reach no item document, no feed, no
hash, and no pinned page. That is not a style choice: a responses list *inside* a
versioned document would mean a stranger's publish changes the author's bytes, which
every subscriber's importer reads as a stealth edit (#18b) — and bumping `version`
instead would be worse, handing a third party the counter #19 made load-bearing and
emitting feed entries the author never wrote. `responses.test.ts` asserts the item
document is byte-identical before and after a stranger responds. The version counter
has to mean "the author published", or it means nothing.

**Editorial controls, and why hiding is not deleting.** `items.show_responses` is
off by default (migration 0009) — other people's names on your page is an editorial
act, so it is one you take per item. `mentions_in.hidden` takes one row off the page
and leaves it in the studio: "I don't want this on my page" and "this never happened"
are different claims, and the blocklist shape means nothing is pre-authorised
irrevocably, which was the gap in a bare per-item toggle.

**What a line can say is bounded by what a mention is.** We store no content of
theirs, so a row is: their self-asserted author name (clamped to 60 characters —
untrusted text bound for the author's page), the origin that actually authenticated,
the relation, the date. The origin is rendered as the load-bearing half because it is
the only part the protocol vouches for (#11: identity is never in the protocol; the
origin is the only authenticated entity).

**State after:** deployed to both nodes; the PI fragment `39nzxm7n…` has responses on
and shows venkateshrao's stub. 488 tests green. `docs/css-contract.md` documents
`.responses` alongside `.stub-cite` and `.provenance` as presentation.

**Open threads:** unchanged — the ⚠️ FABLE citation-on-the-wire question (plan §8),
subscription titles never refreshing, and `rel="webmention"` in static exports. Not
done and deliberately so: no rate-limit hardening (registrable-domain counting, a
global hourly cap, pruning `failed` rows). It is an hour's work and the risk is
nil while two nodes exist and nobody knows the endpoint — but it should land before
the self-host template makes origins discoverable. **Recorded as
`self-host-plan.md` §9.1, a prerequisite to that plan's task 1**, rather than only
in a TODO list: the note has to sit where someone will be reading at the moment it
matters.

**Sequencing for the next session, recorded so it isn't re-derived.** Phase B's six
remaining tasks were checked one by one against the wire, and **only task 11
(`forked_from`) touches it** — 12–16 are entirely studio-side and 17 (done) is page
chrome. So the plan's task 18 ("draft `protocol-v0.3.md` from the tested Phase A + B
shapes") does not in fact wait on all of Phase B: it waits on task 11. The efficient
order is therefore **one short Opus session for `forked_from`, then the Fable
round**, which would then have the complete, live-tested 0.3 wire surface in front of
it plus three questions implementation raised: the citation label (§8), whether a
stub may freeze its quote when its target withdraws (session-22 deferral, now with a
real stub stack to reason about), and spec language for both the open-endpoint policy
Venkat ruled on and the §2.3.3-vs-§4.1 re-send disagreement.

**One ruling put to Venkat and not yet made:** session 22 held the self-host artifact
behind "v0.3" because instances shipped before the cross-client semantics were settled
would become compatibility constraints on decisions Fable had not made. Those
decisions (#26–#29) are made and now live-tested, so the argument's condition is
satisfied — arguably without waiting for Phase B or the 0.3 document. If Venkat agrees,
`self-host-plan.md` §8 unblocks and becomes the largest remaining Opus job, and leg 1
of the release candidate.

## Session 23 (cont'd, 2) — 2026-09-20 — A stub cites what it answers, in a form that outlives the link

**Model:** Opus 5 · **Committed:** yes · **Deployed:** both live nodes (migration 0008 + citation rendering)

**What & why:** Venkat's ruling on the open thread from earlier today — a stub's own
page should say what it responds to, and the citation should survive the link going
dead: *conventional citation norms*.

**The design problem is that `stub_of` names an identity, not a work.** `{origin, id,
version}` is permanent and machine-checkable, and it is the right wire shape (decision
#27). But everything that turns it into a sentence a human can read is mutable or
mortal: the source's *name* comes from a subscription row that can be renamed or
deleted (the stale-byline finding from this morning is the same defect one layer
down), the origin can move, and the target itself can withdraw. Rendering the citation
live means a published citation can decay into "a response to [nothing]".

So migration 0008 adds `versions.stub_cite` and publish **freezes** the human half —
source, author, excerpt, URL, retrieval date — resolved once from local knowledge.
The page renders from that. Three consequences worth naming: a pinned version carries
the citation it froze rather than the live one; deleting the whole subscription leaves
the citation reading correctly (asserted in a test that deletes both tables); and the
URL is printed as **its own anchor text**, so a dead link still tells a reader who
said it, roughly what they said, which item and version, where it was, and when we
read it. That is a citation. "A response to [dead link]" is not.

**Deliberately not on the wire.** Adding `title`/`author`/`retrieved` members to
`stub_of` would be a protocol change, and #27 locked that shape — so `stub_cite` is a
client-side cache, never emitted in any item document. Another client reading our
document composes its own citation from the marker, which is the right division: our
labels are our local knowledge, not facts about their origin. If the wire ever should
carry a citation label, that is a Fable decision, and this implementation is exactly
the evidence it would be decided on.

**Where it renders.** Full form above the body on a thread permalink and on a pinned
version page; a one-line compact form on feed cards and **in the RSS description**,
where transclusion provenance has been injected since 0.1 — a citation belongs with
the work it travels with, and an RSS reader showing the response should show what it
answers.

**State after:** deployed to both nodes and the two live stubs republished, so
`venkateshrao.com/blyg/t/608ay1bz03z3wg58deg787kgvv/` now carries a full citation of
the PI fragment. 481 tests green, `tsc` clean. `docs/css-contract.md` documents
`.stub-cite` as presentation, alongside `.provenance`.

**Both of Venkat's remaining calls came back the same day.**

**The citation-on-the-wire question goes to Fable** ("note that decision for Fable's
review"), written up as `v0.3-plan.md` §8 with three readings rather than a
recommendation: correct as is (a citation label is a claim about *someone else*, and
putting it on the wire lets a publisher assert a title and an author name the origin
never said — the objection that keeps `author` opaque in #11); additive-and-optional
like `generated[]`'s self-asserted provenance (#20); or defer until a second
implementation makes the cost of *not* having it observable. The record names the
consequence plainly: a reader of our document gets `{origin, id, version}` and, if the
target is gone, an identity with no words. **It is one question with remote
transclusion bylines, not two** — same shape, same staleness, same fix or non-fix.
Carried into the roadmap's v0.3 section and the CLAUDE.md TODO so the
`protocol-v0.3.md` pass cannot miss it.

**The version key is bumped to `0.3`** (`blyg-ref/0.3.0`), which is what the wire has
actually carried since this morning: `page`, `stub_of`, `transclusions[].origin`. The
key runs ahead of the document deliberately and with precedent — `0.2` shipped at
session 13 and its document was drafted at session 20 — and #18d makes the key
informative, not a gate. The importer fixtures were deliberately **left** at `0.2`:
now that our own version differs from theirs, those tests exercise the
accept-any-`0.x` rule instead of comparing a constant to itself.

**Open threads:** subscription titles never refresh; static exports still advertise
`rel="webmention"` in page markup; and the Fable question above.

## Session 23 (cont'd) — 2026-09-20 — Phase A deployed; the stub crosses the network for real

**Model:** Opus 5 · **Time:** ~10:45–12:10 PT · **Committed:** yes · **Deployed:** **both live nodes** (migration 0007 + v0.3 code), `site_url` set on both

**What & why:** task 9, run for real. `npm run deploy:all -- --migrate` applied 0007
and deployed both nodes against their own accounts, with the cross-check and the
post-deploy verification the session-17 protocol exists to provide; all ten live
checks passed. Both manifests now carry `"webmention": "webmention"`, and both
endpoints answer 400 to an empty claim.

**`site_url` was empty on both nodes, exactly as flagged.** `siteOrigin()` had been
covering for it by falling back to the request origin, which works for every request
and not at all for the cron — so a mention enqueued by a scheduled drain would have
had no source URL to name. Set to each node's own origin before any publishing; the
manifests' `site` values are unchanged, because the fallback had been producing the
same string.

**The stack, end to end, across two Cloudflare accounts and two domains.** PI
published a fragment; venkateshrao resynced, stubbed it with one API call (the same
call the `stub ↗` button makes), and published. The item document carried
`stub_of: {origin, id, version}` and `transclusions: [{id, version, origin}]`, and the
mention arrived at `blyg.protocol-institute.org/webmention` and **verified as
`stub`** — source page → `rel="alternate"` → item document → origin check → relation
read out of `stub_of`. PI then stubbed the stub back: two levels of blockquote on a
page that fetches nothing at read time, because the outer quote is venkateshrao's
thread *including its own snapshot* of PI's fragment. venkateshrao's inbound row
verified as `stub` in the other direction. Both nodes' `/studio/mentions` show one
verified response each, with the target named by its opening words and the outbound
row marked `sent`.

**The republish re-send works, and so does snapshot independence.** Republishing S1
(v2) re-sent the mention; PI re-verified and moved `source_version` to 2 while PI's
own S2 still shows its v1 snapshot — which is 0.2 §10.4 behaving exactly as specified,
now across origins.

**A stale byline, and what it says about subscription titles.** The first render of
the remote quote read "from *blyg* ↗" — the PI node's *default* site title, captured
in `subscriptions.title` when venkateshrao subscribed on 2026-08-10 and never
refreshed since. Renaming the subscription fixed the demo. The general question is
open and deliberately not decided here: polling does not refresh a subscription's
title, and arguably should not (session 18 made the title editable precisely because
it is the reader's label, and an auto-overwrite would discard a rename) — but a
never-renamed subscription can then show a byline the origin abandoned months ago.
It is the *byline* case that makes it visible, because v0.3 puts that title on a
public page for the first time.

**Static export checked against the definition of done.** An export of the
venkateshrao node is byte-identical to the served routes for item documents, the
archive index and `feed.xml`; the manifest differs by exactly one key, `webmention`,
which is the single intended difference. **Open**: exported *pages* still carry
`<link rel="webmention">`, so a tree served somewhere with no worker behind it would
advertise an endpoint that isn't there — the same claim the manifest strip removes,
left in a second place. Flagged rather than fixed on deploy day; the fix is either
stripping it in `export.ts` or deciding the page link is the origin's business, not
the tree's.

**State after:** v0.3 Phase A is live on both nodes. The roadmap's v0.3 exit
criterion — the full see → stub → publish → *the other end finds out* loop — is
demonstrated between two independent deployments over real HTTP. Live artifacts:
`blyg.protocol-institute.org/t/5tt6adc88s2hacnh68h94t1vsf/` (the nested stack) and
`venkateshrao.com/blyg/t/608ay1bz03z3wg58deg787kgvv/` (the first cross-client stub).

**Open threads:** unchanged from the first half — the version key is still `0.2` and
wants a ruling before the talk; a stub's own page still doesn't say what it responds
to; plus the two found here (subscription-title refresh, `rel="webmention"` in static
exports). Task 10's remaining piece is the README's "on one screen" section and
whether the deck's slide 18 links the live stack, which is Venkat's call.

## Session 23 — 2026-09-16/17 — v0.3 Phase A built: tasks 1–8 in one session

**Model:** Opus 5 · **Time:** ~17:38 PT – 02:00 PT (past midnight; the session opened on the 16th) · **Committed:** yes (blygger-spec ×6, not pushed) · **Deployed:** — (local `wrangler dev` only)

**What & why:** the plan budgeted three sessions for Phase A (1–4, 5–8, 9–10). Tasks
1–8 landed in this one; what is left is the *deployed* half of task 9 and the record.
475 tests green, `tsc` clean. The design was locked enough that almost nothing needed
improvising — the notes below are the places where it did not quite reach.

**Widening the resolver found a defect that nesting would have shipped.**
`resolveFragment` split in two: the v0.1 rule (local, published, fragment-only) stays
untouched for TK source refs, which v0.3 explicitly leaves alone, and transclusion
targets go through a new `resolveTarget` implementing decision #26's order. While
wiring the baked wrapper it turned out `injectProvenance` paired quotes to provenance
lines with a **non-greedy regex** — the moment a transclusion nests, the inner
`</blockquote>` closes the outer match and every following provenance line lands on
the wrong quote. It also hardcoded `f/`, so a local *thread* target (legal from this
version) would have linked a 404. The injector is now depth-aware — only top-level
quotes get a line, which is exactly "provenance records direct transclusions only" —
and each source is resolved: local by authored kind, remote at its own declared
`page`, bylined with the blyg it came from.

**Two judgment calls, both recorded in code.** (1) The version-agreement rule matches
the baked transclusion to the citation **on id alone**, not id+origin: decision #26
makes an id an identity, and an ambiguous id is already a publish error, so origin
equality would be a redundant check with a worse failure mode. (2) `stub_of.id` is
**not** validated against this client's 26-char id spelling — a citation names another
origin's item, decision #2 fixes ids as 128-bit identifiers rather than one encoding,
and rejecting a conformant foreign id would be this client legislating for other
clients. It checks only that the id survives a round trip.

**The plan's outbound re-send rule has one reading the schema can express.** §2.3.3
says a republish re-sends "references that are new or whose target version changed",
while §4.1 says the `(item_id, target)` upsert *is* that rule. The specified schema
stores our version, not the target's, so "unchanged" is not distinguishable — the
upsert semantics were implemented (a republish sets every current reference back to
`pending`). Harmless and W3C-idiomatic, but it is a deviation from the stricter
reading and belongs in the 0.3 draft's text one way or the other.

**Sending needs a canonical origin, and the cron has no request to derive one from.**
`siteOrigin()` falls back to the request origin when `site_url` is empty, which the
scheduled worker cannot do — so a node with no `site_url` can enqueue mentions it can
never send. Rather than invent a URL, the publish path passes its request-derived
origin down for the immediate attempt, and `/studio/mentions` warns when the setting
is missing. **Both live nodes must have `site_url` set before the demo.**

**Driving it against a real instance found what the suite structurally cannot.**
The whole Phase A path was run on `wrangler dev`: fragment → thread quoting it →
thread quoting that thread as a stub → a real loopback Webmention, which returned 202,
fetched the page, followed `rel="alternate"` to the document, checked the origin and
recorded relation `stub`. Three findings. The first publish **500'd**: `wrangler dev`
does not apply migrations, so `versions.stub_of` did not exist — the same ordering
hazard as the session-16 grammar migration, and a reminder for task 9 that 0007 must
be applied per node *before* the code that needs it runs. The endpoint was inheriting
the public surface's 60s `Cache-Control` (now `no-store`). And the mentions page named
each target by its id, which answers "who responded to this" for nobody; it leads with
the item's opening words now.

**State after:** `worker/src/mentions/` is new (store, http, discover, send, receive,
studio); `transclusion.ts`, `model.ts`, `protocol.ts`, `pages.ts`, `api.ts`,
`studio.ts`, `importer/*` and `scripts/export.ts` all carry v0.3 changes. Migration
0007 is applied **locally only**. `respond ↗` no longer exists anywhere. Both live
nodes are untouched and still running the v0.2/TK code.

**Open threads:**
- **Task 9 is the whole remaining gate**, and it is outward: apply 0007 remotely to
  both D1s (correct account per node), `npm run deploy:all`, set `site_url` on both,
  then run the cross-node stack for real. Not started — waiting on Venkat.
- **The version key was deliberately not bumped.** The client now emits `page`,
  `stub_of` and `transclusions[].origin`, but the manifest still says `blyg: "0.2"`
  and `blyg-ref/0.2.0`. Decision #18d makes the key informative, and
  `protocol-v0.3.md` does not exist yet (Phase B task 18), so bumping now would point
  readers at an unpublished version. Venkat's or Fable's call, before the talk.
- **A stub's public page does not say what it responds to.** `stub_of` is on the wire
  and the body usually quotes the target, so the relationship is visible — but the
  page never states it. Plan §3.4 defers *others'* responses to Phase B; this is the
  cheaper mirror image (the author's own citation) and was not specified either way.
- Phase B is unchanged (tasks 11–18), and `self-host-plan.md` stays held behind v0.3.
- Carried: talk slot duration; `security-policy.md` rule 1; account-pinning
  generalisation (session 17).

## Session 22 — 2026-09-16 — The release-candidate gate ruled shut; the directory opens; v0.3 designed with a demo deadline

**Model:** Opus 5 (agenda, gate ruling, record) → Fable 5.1 (v0.3 design, decisions #26–#29), switched by Venkat per the model-switch convention · **Time:** ~12:30–17:30 PT, with breaks · **Committed:** yes (blygger-spec ×3, blygger-org ×1, blygger-com ×1, all pushed) · **Deployed:** — (blygger.com content change only, no code deploy)

**What & why:** the session opened on "what's next for Opus" and the honest answer
was a single question and a single click. Both are now closed.

**The release-candidate gate is ruled shut, and the reasoning is the record's point.**
Session 21 flagged that `roadmap.md`'s gate — "cross-blyg pubsub/subscribe
(**v0.2–v0.3**)" — reads two ways, and that on one reading the self-host artifact was
buildable immediately. Venkat's ruling: **it wants the v0.3 half.** v0.2's subscribe
side being live since session 13 does not open it. The argument that settles it is
about what the artifact *is*: the self-host template is what strangers stand their own
blygs up with, and every instance that exists before v0.3's cross-client semantics are
designed becomes a compatibility constraint on decisions Fable has not made. Shipping
it early would buy convenience now by spending design freedom on the part of the
protocol that is still open. So `self-host-plan.md` stays written-and-held: §8's tasks
1–8 do not start until the v0.3 pass lands. Recorded in three places (`roadmap.md`
"Release candidate", the `CLAUDE.md` TODO, and the plan's own §10) because the previous
state of this question — flagged in one place, ambiguous in another — is exactly how
the last three lapsed holds happened.

**The consequence worth stating plainly: there is no substantial Opus work queued.**
The self-host artifact was the only non-Fable-gated piece of real size, and it is now
behind v0.3 as well. Everything else in the backlog is either Fable's (webmention
mechanics, stub design, DAG semantics, `respond`-becomes-the-stub) or Venkat's (talk
slot duration, `security-policy.md` rule 1, template-repo default). That is a healthy
state, not a stalled one — but it means the v0.3 planning session is now the single
gate on the whole project, which it was not before this ruling.

**The directory opened.** The two pending submissions — Protocol Institute Blyg and
Venkatesh Rao's Blyg, both resolved `kind: "blyg"` with real manifest titles by the
vendored v0.2 resolver — are approved and listed publicly at `blygger.com`. The queue
is empty. This closes the last line of `self-host-plan.md` §9's definition of done that
did not depend on the unbuilt artifact itself. Worth noting the checks were made
against the live artifact in both directions: the queue was confirmed still pending
before approving (the record said so, but the record has been wrong about live state
seven times in this project), and the public home page was re-fetched after, cache-
busted, to confirm both entries actually list rather than merely returning `ok`.

**Two more stale records, making eight.** `blygger-org/status.md` still listed the
`/blyg` reference-client test deployment as upcoming work — superseded in session 11,
corrected in `blygger-com/status.md` in session 21, and missed in this copy, which is
the failure mode of correcting a duplicated claim in one of its two homes.
`blygger-com/status.md`'s Upcoming still read "stub landing page — the domain does not
currently resolve", two paragraphs below the session-21 note recording that it
resolves and serves a directory. Also fixed: a sentence in `blygger-org/status.md`
that said decision #14 changed the default mount "from `/blyg` to `/blyg`" — the
session-9 `blygg`→`blyg` rename had rewritten both spellings to the same token,
leaving a sentence asserting a path changed to itself. **The pattern now has a second
shape worth naming: a global rename can silently turn a true historical sentence into
a false one**, which no status check catches because nothing is stale — it is wrong.

**State after:** the gate is ruled and recorded; `self-host-plan.md` is held behind
v0.3; blygger.com lists both live nodes with an empty queue; four status-record
defects corrected across two repos. No code touched, no deploys, both live blyg nodes
untouched.

**Open threads (Opus half, superseded below):** **the v0.3 Fable pass is now the only gate on substantive work** —
webmention mechanics, stub design, DAG semantics, and the session-18
`respond`-becomes-the-stub question, after which self-host tasks 1–8 unblock. Venkat's
own: talk slot duration (22 slides, Thu 2026-09-24 23:00 UTC, cut points in
`brief.md`); `security-policy.md` rule 1 (print generated secrets to chat, or the
write-to-`.env.keys`-and-verify pattern used in session 21 — the rule wants amending
either way); template-repo public-or-private default and the directory's abuse story,
both from `self-host-plan.md` §10 and both now deferred with the plan. Still open since
session 17: account-pinning has not been generalised to the other Workers projects.

**— Fable half —**

**v0.3 designed, with the talk as the forcing function.** Venkat's brief: start the
v0.3 work and prioritise what makes a fuller demonstration possible at the symposium
on 2026-09-24 — "some early version of stubbing and webmentions." Eight days. The
answer is `docs/v0.3-plan.md`, split into **Phase A** (the smallest permanent wire
surface that lets a stub cross between the two live nodes and be verified on the far
side) and **Phase B** (the rest of the roadmap's v0.3). Nothing in Phase A is
provisional; the split is about *order*, not about shipping a sketch. Per #21, the
normative `protocol-v0.3.md` waits until Phase A has been live-tested — the same
sequence 0.2 took (plan session 12, build 13–19, draft 20).

**What made the demo cheap is that the hard rule was already locked.** "Remote
transclusion always operates on the local snapshot" (roadmap, session 3) does almost
all the work: publish never touches the network, quoting follows reading, and network
cycles are harmless because a snapshot is static bytes. Cross-client transclusion is
therefore a resolution-order change (local any-kind → imported non-L0 blyg item →
error) plus an optional `origin` on provenance — and *nesting* is just nesting
blockquotes. The one DAG rule worth having is a local closure check for the only
genuinely silly case (a thread quoting a thread that quotes it), which snapshot
semantics would permit as a finite, useless doubling; remote closures are not walked
because they are unknowable and harmless. Ambiguous ids (two imports, same
`remote_id`) are a publish error, not a guess: the directive names an identity, not an
origin, which is what lets threads move hosts without rewriting.

**Stubs are threads with `stub_of`, and `respond` dies.** Two shapes — `{origin, id,
version}` for blyg targets (origin REQUIRED even when own; a citation is absolute) and
`{url}` for the plain web — one target per stub, the body entirely the author's. The
protocol never requires the body to transclude the target; the marker is what readers
rely on. A version-agreement rule (if the body transcludes the target, `stub_of.version`
:= the baked version) means the quote and the citation can never disagree on a published
document. The session-18 question is answered: the reading feed's `respond ↗` becomes
`stub ↗` outright — no lighter sibling, because two overlapping "respond to this"
gestures with different semantics was the named bad outcome, and an L0 stub keeps
respond's copy-none-of-their-text discipline anyway. **Deviation from the frozen spec,
flagged:** the stub action does not hopper-add. The stub's own provenance is the ledger;
a side-effect hopper entry is a second ledger that drifts.

**Webmention mechanics, and the gap they exposed.** Endpoint at `{origin}webmention`
— inside the origin surface, because it is a protocol surface, unlike host-rooted
`/studio` and `/api`. Send on publish for every remote-origin reference; discovery via
the target manifest's `webmention` key first, W3C discovery second; retry 15m → 1h →
4h → 12h → 24h; fire-and-forget from the author's view. Receive: 202 then async
**structural verification** — source page → `rel="alternate" application/json` → item
document, whose `origin` MUST equal the final source URL's origin (0.2 §12.2 applied
inbound: a mirror or an impostor cannot speak in a real blyg's name), then the relation
read from `stub_of` / `transclusions[]` / `forked_from`. No content is ever stored — a
verified mention is a pointer. Signals only, never auto-published; public display is
per-item curation under §13.5 and Venkat's call. **The gap:** the reference client has
built remote permalinks as `f/{id}/`·`t/{id}/` since 0.2 (`blygItemUrl`), a convention
0.2 §4 explicitly calls presentation. Webmention needs a target URL and a way from a
W3C source *page* back to a document, so decision #29 adds an optional `page` field to
item documents and the `rel="alternate"` link to permalink pages — additive, optional
for conformance, required of the reference client. Not the first time building the
next thing has found a non-normative assumption the code had been living on.

**What was deliberately left out.** Plain (non-structural) webmentions from non-blyg
sources: spec MAY, held apart as a lower class, dropped by the reference client at 0.3
— link verification is exactly the check spam defeated. Softening
withdraw-rolls-to-null for a stub whose target has withdrawn (a "freeze at the withdrawn
version" affordance): it would be the first place withdrawal failed to roll to null,
so it is an open thread to decide on evidence, not a rule made today. Public
"responses" lists: one afternoon, no wire change, strongest visible demo of the whole
thing — and the first time others' engagement would appear on a public page without
the author writing anything, which the editorial-cost principle has so far refused.
Lean: opt-in per item, off by default, not before the talk unless Phase A finishes
early.

**State after (Fable half):** `docs/v0.3-plan.md` written (§2 is the wire delta the
0.3 draft folds in; §4 the schema and module map; §5 tasks 1–10 Phase A, 11–18 Phase
B; §7 four open decisions for Venkat). Decisions #26–#29 recorded in CLAUDE.md; roadmap
v0.3 carries a design-complete pointer; the session-18 `respond` TODO closed, hopper
composition scheduled to Phase B. No code touched. Both live nodes untouched.

**Open threads:** **Phase A is the next three Opus sessions, in order, with a day of
slack before the 24th** — tasks 1–4 (protocol plumbing) in one, 5–8 (studio + both
webmention halves) in another, 9–10 (deploy both nodes, run the live stack, record) in
a third. Venkat's four calls in `v0.3-plan.md` §7: hopper coupling of the stub action
(plan says no), the public responses list (plan says not before the talk), live demo
vs. screenshots, and confirming `respond ↗`'s outright retirement. Carried from the
Opus half: talk slot duration; `security-policy.md` rule 1; template-repo default and
directory abuse story (deferred with self-host); account-pinning generalisation
(session 17). Two remote-source questions for a later Fable pass, on evidence: whether
a stub may freeze its quote when the target withdraws, and whether `forked_from`'s
pinned-only rule bites in practice.

## Session 21 — 2026-09-16 — Opus backlog cleared; a talk deck; blygger.com ships as a directory; four stale records corrected

**Model:** Opus 5 · **Time:** ~10:48–12:25 PT · **Committed:** yes (blygger-spec ×3, blygger-org ×8, blygger-com ×3, all pushed) · **Deployed:** blygger.org ×4, **blygger.com ×1 (new)**

**What & why:** the session opened on "what Opus work is left before Fable v0.3" and
the honest answer was *almost none* — three small items from session 20's open threads.
It then turned into a talk, a new site, and an unusual amount of correcting the record.

**The export preflight, and why refuse-vs-warn is not symmetric.** Session 19 flagged
that a static export bakes absolute `og:url`/`canonical` from `siteOrigin()`, so an
export off `wrangler dev` ships `localhost`. Confirmed the hazard before fixing it —
the exported tree really does carry `og:url="http://localhost:8787/blyg/"`. `export.ts`
now checks the manifest's `site` **before writing a single file**, and the two failure
modes are deliberately treated differently: a **loopback origin refuses** (no host
exists on which that tree is correct; `--allow-local` for the dev-verification loop),
while **site ≠ `--base` only warns**, because that is precisely the supported
configuration `site_url` exists for — export from local, serve at production. The
original suggestion (compare against `canonical`) would have been weaker: the feed page
emits no canonical, and `site` is the value every absolute URL derives from anyway.

**The carousel, settled on consistency rather than comparison.** Decision #25 had
already made this presentation, so it was the client's call. What decided it was not
the comparison argument from session 19 but that the version line is *identical markup*
on feed, permalink and thread pages — shipping the enhancement on one gave the same
affordance two behaviours. Deliberately **not** extended to the withdrawn endcap (paging
pinned text into a page headed "This item was withdrawn" reads as a contradiction; the
frozen page wears its own banner) or to a pinned version's own page (one frozen version
by definition). `FEED_SCRIPT` → `VERSION_NAV_SCRIPT`, since the name had become false.

**And a real defect found by opening the page.** The carousel swapped the body but left
the *version note*, so v1's text displayed under v2's note ("tightened it") — the
editorial apparatus describing something other than what is on screen, live since
session 19. `v{n}.json` already carried a per-version `note`; it now travels with the
version and hides when absent. **Fourth session running in which the bug was invisible
to a green suite and obvious on the artifact.**

**A talk deck, and a format lesson.** Venkat asked for a symposium deck on
blygger.org, modelled on humboldt's. Ported `_build_talk` minus audio — which is not
mere deletion: humboldt gates its *entire player* on audio existing, because without a
clip nothing drives slide advance; here an operator drives it, so the gate had to be
inverted. **Everything in the stage is sized in `cqh` against a `container-type: size`
container**, so the embedded preview and the fullscreen presentation are one composition
at two scales. That was arrived at the hard way: `rem`/`vw` sizing left a *2-pixel*
screenshot on one slide and pushed two bullets off another, while fullscreen looked
fine. Two further CSS traps worth remembering: a percentage `max-height` against an
auto-height parent resolves to `none`, and a class rule `display: flex` outranks the
UA's `[hidden]`.

**The source format was rebuilt mid-session and the reason generalises.** It started as
`slides.yaml` + `track.md`, splitting "what is projected" from "what is said". Every
content edit touched two files and kept them aligned by hand — which is exactly how a
renumber produced two slides sharing an id and a deck that silently skipped a position.
Collapsed to a single `talk.md` with positional numbering, which makes that class of
error **unrepresentable rather than guarded against**; the duplicate-id check written an
hour earlier was deleted because nothing was left for it to catch.

**Four stale records corrected, which is the session's real theme.** `blygger-org` and
`blygger-com` both still described themselves as "one of the two initial cross-client
test instances" — overtaken in session 11. blygger.org's **front page** linked
`/spec/0.1/` (SUPERSEDED since session 20) and said 0.1 was "heading toward its first
deployments". The site nav pointed at 0.1 too. And `warnings-node.md` claimed only one
project in `Code/` used Node. This is now the *seventh* instance of recorded-status
decay in this project, and the pattern has a shape: **notes rot in the direction of the
past, and the front page rots as readily as a TODO.**

**The blygger.com claim I got wrong, and how.** I recorded the directory as "blocked on
DNS onboarding" because `curl https://blygger.com/` returned 000. Venkat corrected it:
the zone was long since active on the personal account. The error was not failing to
check — it was **testing one artifact and concluding about a different fact**. A failed
`curl` means nothing is serving; it says nothing about whether a zone exists. The
correct check was one API call, which I made only after being told. Worth recording
precisely because it is the inverse of the lesson the project keeps learning: checking
the artifact only helps if it is the artifact your claim is about.

**blygger.com ships as a directory, not a stub.** A submit box, a list of approved blygs
linking **home pages not feeds**, and an admin-gated queue. The part worth building is
validation: submissions are resolved by **this repo's own v0.2 resolver**, which points
the reference implementation at strangers' real sites — a test of the spec nothing else
performs. Verified against reality: both live nodes resolve as `blyg` with their real
manifest titles, simonwillison.net correctly resolves as a plain feed linking his home
page rather than his Atom URL. Approval gating is structural rather than a caller's
discipline: `listApproved()` bakes the status filter in, so no code path can list a
pending row. The resolver is **vendored** with `npm run sync-vendor` so drift is visible
in `git diff` — re-sync at v0.3.

**Environment.** `npm install` is broken on this machine for any *fresh* project
depending on vitest (`arborist` `edgesOut` TypeError), reproducible in an empty
directory; `--legacy-peer-deps` is the workaround. Existing projects install fine only
because a resolved lockfile skips that code path, so diagnosing by comparing them is a
dead end. Recorded in `warnings-node.md` along with the per-project
`com.dropbox.ignored` requirement.

**State after:** blygger.org carries the spec (0.2 tagged and snapshotted at
`spec/0.2/2026-09-16`), technical notes, a `/start/` page, and a 22-slide symposium deck
with real screenshots of both live nodes. blygger.com is live and holds two pending
submissions. `docs/self-host-plan.md` specifies the packaged self-host artifact —
template repo + `npm run init`, subdomain-only mounts, and an explicit upgrade path.
Worker code: 426/426 green, `tsc` clean; directory: 17/17, `tsc` clean. Both live blyg
nodes untouched all session.

**Open threads:** **v0.3 still needs a Fable planning session** and remains the gate on
all substantive protocol work — webmention mechanics, stub design, DAG semantics, and
the `respond`-becomes-the-stub question from session 18. **The release-candidate gate is
ambiguous and worth an explicit ruling:** it reads "pubsub/subscribe (v0.2–v0.3)" and
v0.2's subscribe has been live since session 13, so either the self-host artifact is
buildable now or it waits for v0.3 — flagged because holds in this project have three
times been found already lapsed. Smaller: the talk needs Venkat's slot *duration* (22
slides, cut points recorded in `brief.md`); two pending directory submissions need
approving; account-pinning still hasn't been generalised to the other Workers projects
(open since session 17); and `security-policy.md` rule 1 says print generated secrets to
chat, which I deliberately did not do — worth Venkat confirming which he wants.

## Session 20 — 2026-09-13 — Protocol 0.2 drafted and published; §8.4 recast (#25); a code-fence bug that had been leaking live markup into the published spec

**Model:** Fable 5 (0.2 draft + decision #25) → Opus 5 (publishing, CSS contract), switched by Venkat per the model-switch convention · **Time:** ~11:57–12:25 PT · **Committed:** yes (`blygger-spec` ×2, `blygger-org` ×1, all pushed) · **Deployed:** blygger.org ×1

**What & why:** The session's job was the ⚠️ FABLE item that had gated everything
since session 15 — draft `protocol-v0.2.md` — then publish it. Both done, plus the
CSS contract, plus a bug found by looking at the output.

**Decision #25, and why the ambiguity was resolvable rather than a coin flip.**
Session 19 shipped an in-situ pinned-version carousel and then noticed §8.4's
sentence "a public page's version display is an **indicator, not navigation**"
argues against it, leaving two readings and picking neither — with the explicit
instruction to settle it *before the sentence was copied forward*. The ruling is
reading (a): **the clause constrains routes and promises, not presentation.** What
settles it is not preference but the protocol's own charter — invariant 1 says the
protocol governs the published artifact and disclaims the studio; §8.4's own rule 2
says "page chrome is presentation"; §10.5 says the same of thread excerpting. A
normative clause dictating client UI was always out of character for this document.
Read historically it is clearer still: the sentence is session 5's *rationale for
refusing history routes*, written when JSON was the only pinned representation. When
decision #24 added pinned HTML pages, the clause's route content survived and its
presentation phrasing became a stranded overhang. **The invariant it actually
protects is that unpinned history is unreachable in every representation**, which is
what keeps withheld-by-default and withdrawal meaningful — and the carousel preserves
that structurally (positions are `data-pins` plus the live version; the only fetch is
an already-promised `v{n}.json`; JS-off degrades to plain links). So 0.2's §8.4 states
the bound directly — *every version a display exposes, by link or in place, must be one
the origin already promises forever; a display MUST NOT offer, imply, or hint at access
to unpinned versions* — and keeps "frozen citable artifacts of one identity, not pages
of one document" as design guidance about what pins are. The session-5 scrubber stays
impossible, for the structural reason rather than the stylistic one: its bytes are
never served.

**Companion ruling: `blyg-tk-gen` stays unstyled.** Tinting generated prose would
present self-asserted, unverifiable provenance as a *verified authorship badge* — a
claim the protocol refuses to make anywhere else (timestamps, `author`, `generated`
all carry the same honesty stance) — and after author review the author owns the text
(#20). So the class name is a permanent wire token and styling is any client's free
choice; this client declines. Note the asymmetry with `blyg-transclusion`, which *is*
styled: quotation is a visible authorial act on its face, and the blockquote asserts
nothing the wire cannot back.

**The 0.2 document.** Standalone-complete superset per #23, 15 sections. Beyond
carrying 0.1 forward it folds in: blogroll (§11), resolution (§12, #17 — checked
against the implemented `resolve.ts` step order rather than the plan text alone),
reader conformance with the importer invariants, curation/no-re-emission, and the L0
wrapper (§13), generation provenance (§5.7, matching the shipped
`{sources, model, at}`), the informative version-key policy (§3.1), the bare-counter
rationale (#19) in §5.2, and four new security bullets — generation provenance is
unverifiable *and its absence proves nothing*, resolution fetches attacker-suppliable
URLs so server-side readers need fetch hygiene, history rewriting is made loud rather
than prevented, and a blogroll reveals reading choices so absence from one carries no
information by construction. **One deliberate tightening:** `<blyg:manifest>` becomes
MUST. 0.1 only showed it in an example, but resolution step 3 and the
no-extensions-needed blogroll both load-bear on it — a plain OPML entry upgrades to a
blyg subscription *only* through that element. Both live nodes already emit it, so the
tightening costs nothing.

**A rendering bug that had been live since session 11, found by reading the output.**
Python-Markdown's `fenced_code` only recognizes a fence at column 0. An example
indented under a list item is therefore not code: its first line becomes inline code
and the remainder is parsed as markdown — which passes raw HTML straight through. So
`blygger.org/spec/0.1/` has been emitting a **live** `<blockquote class="blyg-transclusion">`
into the page instead of showing §10.2's example, for two years of session-time, and
0.2 inherited the flaw plus a worse instance: the OPML example injected
`<head><title>` into the document body. **Fixed in `build.py`, not in the prose, and
that choice is forced by the spec lifecycle** — a superseded document receives no
revisions and dated snapshots are immutable, so those pages can *only* be corrected in
the renderer. One preprocessor de-indents fences before conversion and fixes 0.1, its
2026-08-10 snapshot, 0.2, and every future document while leaving the frozen bytes
untouched. Blast radius verified by hashing `dist/` before and after: exactly the three
spec pages changed; overview, namespace and notes pages byte-identical. General lesson,
and the second session running to produce one of this shape: **the suite/tooling
asserts that a thing was produced, not that what it produced is what it claims to be** —
session 19's green tests could not see invalid JavaScript inside valid HTML, and
`sync_spec.py`'s idempotency check could not see valid markdown rendering as broken
HTML. Both were found by looking at the artifact.

**Publishing (§6).** `sync_spec.py` gained the superseded state as
`("SUPERSEDED", successor)`, which drives both the index row and a banner injected
under the superseded page's H1. Two changes beyond the task list, both forced by the
change itself: **latest mode now syncs every version**, because a supersession mutates
an *older* version's page and syncing only the newest would leave it stale; and
**snapshot mode refuses a superseded version**, since #23 freezes it — worth the guard
because the old `--version` default was `0.1`, so the habit it protects against is the
likely one. Two hardcoded `protocol-v0.1.md` references that would have mislabelled
0.2's provenance are gone.

**CSS contract.** Written by commitment level, which is the distinction that was
actually missing. §1 is the two classes baked into published `content_html`: they are
protocol surface binding *any* client that renders blyg content — including content
imported from someone else's origin — so the obligations are style freely, but never
hide, rename, strip, or let a sanitizer drop them, because each exists to disclose
something. §§2–4 are the reference client's own vocabulary, structure, tokens and theme
mechanism, documented so themes can rely on them while being explicitly *not* a
protocol promise. `div.item-content` is named as the load-bearing boundary: author's
published bytes inside, this client's apparatus outside. Every claim was verified
against `pages.ts` rather than written from session 19's summary, which caught an error
that would have shipped — `.provenance` is injected *inside* the transclusion
blockquote at render time into a copy, not rendered beside it.

**Stale TODO, third instance.** `spec-publishing-plan.md` §5 (notes publishing) was
recorded as unexecuted; it shipped in `blygger-org` `f974d8c` and `/notes/` + `/notes/tn-1/`
are live. Verified against the site rather than the note, per the standing lesson.

**Verification:** all four spec URL shapes plus `/notes/`, `/ns/0.1` and the root 200
live with cache-busting; index rows, 0.1 banner and 0.2's escaped examples checked in
the live HTML; snapshot markdown byte-identical (`shasum` before/after) and its page
confirmed to carry no banner.

**State after:** 0.2 is the living spec document and is published; 0.1 is superseded,
bannered, and frozen with its snapshot intact. The protocol surface v0.2 shipped in
sessions 13–16 is now fully specified in normative prose, so a third party could
implement the subscribe side from the document alone. No worker code changed this
session; both live nodes are untouched.

**Open threads:** **0.2 has no dated snapshot** — §6 task 3, deliberately left for
Venkat, since a snapshot mints a permanent git tag and immutable URL and asserts the
text is citable. **v0.3 needs a Fable planning session** before any implementation:
webmention mechanics and the stub design are ⚠️ FABLE and undesigned, and the
session-18 thread about whether the reading feed's `respond` *becomes* the v0.3 stub is
still open. Smaller Opus-safe leftovers: the static-export `canonical`/`og:url`
`localhost` warning, and generalizing account-pinning to the other Workers projects
(open since session 17). The **feed-page-only carousel** question from session 19 is
untouched and now has a clearer frame — #25 makes it purely a presentation choice, so
it can be decided on reading experience alone. Publishing `css-contract.md` to
blygger.org was considered and not done: it is reference-client documentation, and the
site currently publishes normative text and technical notes only.

## Session 19 — 2026-09-13 — Cosmetic pass becomes a design system; nine reader/studio features; a SyntaxError that 400 green tests could not see

**Model:** Opus 5 · **Time:** ~10:33–11:31 PT · **Committed:** yes (13 commits) · **Deployed:** both live nodes ×11 (identity/archive; meta+OG; typography; typography refinements; studio palette; blogroll+title links + carousel; theme; studio editing; SyntaxError fix; studio tests; discard-404 fix)

**What & why:** Venkat asked for "cosmetic updates that don't touch the protocol" before
triggering the ⚠️ FABLE 0.2 draft, then mid-session added nine concrete features. Nothing
here changes a wire shape; two things sit deliberately close to the line and are argued
below.

**The gate on the deferred UI refresh had lapsed, same as the scrubber's did.** The
"Full UI refresh" TODO was parked behind "TK-transclusion + subscribe/pubsub working end
to end" — closed in session 18. That is the second time in two sessions a hold condition
had quietly expired while the TODO still read as blocked.

**Site identity was published to machines and shown to no human.** `title`, `author.name`,
`author.bio`, `author.links` and the avatar were all in `blyg.json` and the feed channel;
the page rendered `site_title` into `<title>` and nothing else. A reader landing on either
node could not tell whose blyg it was. The feed page now carries a masthead. Written up mid-session as
**overriding** a rev-2 review note ("site identity lives in the manifest, feed channel, and
studio settings, not on this page"). **That framing was wrong, and checking the older
document at wrap-up settled it the other way:** `v0.1-plan.md` §4's public-page mockup
always showed `Venkat's blyg` / `bio line · links`. The masthead was specified from the
start; the rev-2 wireframe round removed it, and the rev-2 note then stated that removal as
a principle. So this session *restored the plan* rather than contradicting a decision — and
the rev-2 rationale still holds for its real case, an embedded `.blyg` block where a host
page supplies identity. Both live nodes are standalone, which that note acknowledged and
left unserved. Scoped to the feed page, so embedded pages are unchanged. General lesson,
and the second time this session: **check the oldest document that speaks to a question, not
just the most recent one** — the most recent note is the one most likely to be a
rationalisation of a change rather than a reasoned position.

**The header link was wrong in both directions, and nothing tested it.** It was a hardcoded
`Home → /`. On the root-mounted PI node `/` *is* the page, so it was a self-link; on
path-mounted venkateshrao `/` is the host site, so a reader on a permalink had no link back
to the blyg at all — the one destination the page can actually name. Now the blyg's own
title → `{mount}/`. Linking out to a host site became an author-configured `author_links`
entry, which is the honest place for it: only the author knows whether `/` is their
homepage, someone else's site, or nothing.

**A latent bug found by rendering a field nobody had rendered.** `/media/:file` matches on
the full `r2_key` (`media/{id}.{ext}`), but both the new masthead and — pre-existing —
`buildManifest()` emitted a bare `media/{id}`. The manifest's published `avatar` would have
404'd the first time anyone set one. Fixed in both; the field's *shape* is unchanged, so
this is a bugfix, not a wire change.

**Design: the editorial apparatus IS the design.** The stylesheet was the browser default
with a width limit, and every piece of metadata — `v2 · pinned: v1, v2`, Created/Most-recent,
transclusion provenance, the withdrawn endcap — rendered at one undifferentiated
`0.85rem / opacity 0.7`. But that apparatus is exactly what distinguishes a blyg from a blog:
every item wears its revision history in public. So it got its own face (system sans against
a serif body), one size, one colour, and the prose was left alone. The colour is an **editor's
blue pencil** — to blue-pencil a manuscript is to edit it, the same copy-desk world `[TK]`
comes from — so every editorial mark is blue. **No web fonts, deliberately:** a reference
client for a decentralised medium should not make every reader's page load phone a
third-party font host; self-hosted files that depend on someone else's CDN are not really
self-hosted. Both themes defined rather than inherited.

Three fixes came from looking at it live rather than from reasoning: the apparatus block was
taller than the content it annotated (three ~1rem gaps); the archive's `thread` marker became
its own flex column and knocked that row out of alignment; and a transcluded fragment's
headings rendered at full size and outshouted the thread quoting them (quoted material is
subordinate, so they step down a rank).

**The studio shares the palette but keeps its own type.** It is a dense working tool, not a
reading surface, and should not become one. What it did need: its colours were literals
scattered across four style blocks — `rgba(128,128,128,x)` at seven alphas for what are
really two rules, plus `#c00`/`#2a7` for state. Those two were a genuine dark-mode
legibility problem, not untidiness. Now tokens, defined per theme.

**Nine features (Venkat, mid-session).**

*(1) Blogroll on the public page.* Published as OPML, advertised with `rel="blogroll"`,
invisible to people — backwards for a list whose entire job is pointing readers elsewhere.
Rendered from the same `listBlogrollSubscriptions()` the OPML uses, so the two cannot
disagree. Native blygs are marked, since "this one you can subscribe to natively" is the
distinction the blogroll exists to make.

*(2) Pinned versions open in situ, with a `‹ ›` carousel.* Reading "what did this say
before?" is a comparison, and a comparison wants both texts in the same place; going to the
frozen page became its own explicit link. Three properties it is built to keep, all of which
constrained the design: **it is an enhancement, never a requirement** (the server renders the
same line with pin citations as real links; no-JS, cmd-click, and a failed fetch all still
reach the frozen page); **it works on a dumb file host** (the only thing fetched is
`items/{id}/v{n}.json`, which §2.8 already publishes and the export already writes — so an
exported tree keeps working, which is invariant 4's whole point); and **it never invents a
version** (positions are `data-pins` plus the live version and nothing else, so unpinned
history stays unreachable in every representation, which is what keeps withdrawal
meaningful). A pin *of* the live version is one position that happens to be pinned, not two.
Note this is only legitimate *because* of decision #24 — session 18 deleted a scrubber that
paged through all versions, which cannot exist; a carousel over pinned versions only is
paging through artifacts that do.

**⚠️ FABLE flag raised at wrap-up, after the feature shipped.** §8.4 of the normative spec —
and §2.8 of the plan — say a public page's version display is an "indicator, **not
navigation**", because "pins are a sequence of frozen citable artifacts of one identity,
**not pages of one document**." The carousel breaks no *rule* in that section (no route
serves unpinned history, nothing new is promised, every byte was already promised forever,
and JS-off degrades to plain links), but that rationale is a direct argument against the
affordance. The check made while building was the **route/promise** one — decision #24,
which the carousel passes — and **the presentation clause was simply missed**. Two readings
are open and this session picked neither: the clause constrains routes and promises (client
presentation of already-promised bytes is out of scope), or it constrains presentation (in
which case the reference client is out of conformance with prose it ships against, and
either the feature or the sentence goes). `protocol-v0.1.md` left unedited — this is Fable's
call, and it must be made **before the sentence is copied forward into `protocol-v0.2.md`**.

*(3) A leading `<h1>` links to the item's page.* The anchor wraps the rendered heading at
render time and never touches stored `content_html`, exactly like `injectProvenance`; a test
asserts the item JSON keeps the bare heading. Only a heading that *opens* the item counts —
one further down is a section head, and linking it would claim a structure the author did
not write.

*(4) Reading theme.* Repaints two surfaces: `--page` (the margins) and `--paper` (the block
the writing sits in); when they differ the block reads as a sheet on a desk, which is the
point of offering the pair. The palettes are **borrowed, not invented** — Solarized and Nord
have worked-out contrast, and the cream is the value long-form readers converged on; a
palette someone else already balanced beats one mixed here, and naming them lets an author
look up what they are picking. **`auto` is the default and is not a theme:** it means follow
the reader's system preference, the only setting that respects a choice the *reader* made.
A chosen theme deliberately overrides it — emitted into both the base and the `prefers-dark`
block — because an explicit authorial choice should not flip when the reader's OS does.
Served by appending to `style.css`, so one file themes every page and the export picks it up
by fetching the route. Public pages only: a tool that repaints when you change your site's
colours is a surprise. The key is local and never reaches the manifest (asserted).

*(5–9) Studio.* Always-open "Full Editor" (wanting the bigger editor is not detectable from
what you have typed). A fragment/thread radio replacing `+ new thread`, which read as a
separate feature rather than the other thing the same box makes — `PUT` cannot change kind,
so switching after a draft exists discards and recreates it, losing nothing because the text
lives in the textarea. **`save draft` keeps you in the box**: it used to create the item and
reload, pushing your words into the list below — saved, but no longer being edited, which is
the opposite of what saving a draft should mean. **Discard means two different things and
would be dangerous conflated**: never-published → DELETE the draft; dirty → discard the
*changes* by restoring the last published version, publishing nothing and rewinding nothing;
clean → no button, because leaving the public stream is withdraw. **Quick edit** opens a
fragment's working copy in the row. Fragments only: a thread's working copy carries
transclusion directives and TK scopes whose point is the live preview, the `![[` palette and
the scope panel, and a bare textarea would be a worse tool wearing the same name.

**The session's real lesson: a whole class of bug this suite cannot see.** The studio shipped
**broken** for one deploy. A `confirm()` string was written with a single-backslash `\n`
inside a TS template literal, so the emitted JavaScript carried a real newline inside a string
literal — SyntaxError on load, every `data-action` handler dead (quick edit, publish,
withdraw, pin, discard), **and 402 tests green**. Assertions about HTML pass whether or not
the `<script>` inside it is valid JavaScript. The file's older `confirm()` strings already
used the doubled escape, so the convention was right there and the new code simply lost it.
`test/inline-scripts.test.ts` now compiles every inline script the feed page and all eight
studio pages emit, via `new Function` (which parses without executing); verified against the
broken code, it fails with the same SyntaxError the browser reported.

Venkat then found a **second instance of the same blind spot**: discarding a draft from the
editor 404'd. The shared handler ends in `location.reload()`, right for every action that
leaves the item in place; discard deletes it, so it reloaded an editor URL for the thing you
had just deliberately deleted. The index discard never showed it because reloading the index
is correct. Both post-action navigation paths are now tested. General shape: **what a page
*renders* is well covered here; what its script *does* was not covered at all.**

**Carousel jitter, reported by Venkat, had two causes.** The frozen-version marker was a left
rule plus padding, which indented the prose on every step; and the version label's text
changes as you step (`v3` → `v1 · frozen`), shoving the pin citations along with it. The
marker is now a tint extended by `box-shadow` spread — box-shadow is not laid out, so it
paints "held, not live" *outside* the box and costs nothing in layout — and the label has a
reserved width. Measured across a step: nav, pins, prose left edge and content width all
shift by **0px**.

**A real ordering bug fixed in passing.** `listPublic`/`listAll` sorted by `updated DESC`
only, and `updated` has second precision — so items published inside one second ordered
nondeterministically, in the *public feed's own order*. Same `rowid DESC` tiebreaker session
11 added to `feedEvents()` for the identical reason. Found because a test I wrote kept
flaking; the flake was the code, not the test.

**Wireframes re-synced, and the hand-copy hazard named.** `public.html`/`thread.html` now
carry `STYLE_CSS` verbatim from `pages.ts` rather than a hand-typed copy, plus the session-19
markup; each says outright that the shipped file is the source of truth and any difference
means the wireframe is stale. The three studio wireframes still describe the right layout but
not the right palette, and are annotated rather than left silently wrong. Hand-copying is
what let them drift — the same lesson session 11 learned when `sync_spec.py` retired
hand-copying the spec into `blygger-org`.

**Verification:** 413 tests (was 376); `tsc` clean. Every chunk was deployed to both nodes as
it landed and checked in a real browser — which is how the two studio bugs and the three
typography fixes were found. **Static export re-verified twice** (after the typography pass
and again after all nine features): exported bytes identical to the live routes for the feed
page, archive, a permalink, a pinned version page, a thread, and `style.css` — invariant 4
holds through the whole change. The carousel was measured live in-browser rather than
eyeballed.

**State after:** Public pages have a real design system (tokens, two themes plus six author
themes, serif prose / sans apparatus, blue-pencil editorial marks) and four new reader
affordances (masthead, blogroll, title links, in-situ pinned versions). The studio shares the
palette, keeps its own type, and has the composer/editor/row editing affordances Venkat
asked for. Both nodes run this code; no migration (theme is a settings KV row). The
⚠️ FABLE `protocol-v0.2.md` draft remains the unblocked next session and is untouched.

**Open threads:** **The one item gating the next session: does the pinned-version carousel
conform to §8.4's "indicator, not navigation"?** Flagged at wrap-up, argued both ways above
and in `v0.1-plan.md` §2.8; it must be decided before that sentence is copied into
`protocol-v0.2.md`. The **feed-page masthead** is *not* an open question after all — the
v0.1 plan's own mockup specified it (see the correction above). The **CSS contract** is the
remaining half of the roadmap's v0.5 styling deliverable and the protocol-relevant half:
session 19 established the class vocabulary and token set in practice but wrote neither down,
and `blyg-transclusion`/`blyg-tk-gen` are *baked into published `content_html`*, so they are
already wire-visible and cannot be renamed — a third-party themer needs to know which classes
are load-bearing and which are this client's own presentation. `blyg-tk-gen` is deliberately **unstyled**: tinting generated prose would be
a visible claim about authorship, which is a decision-#20 question rather than a CSS one —
worth putting to Fable during the 0.2 pass. The carousel is **feed-page only**; the permalink
page still shows pin citations as links to the frozen pages, which may be right (one item,
one page) or may want the same treatment. Theme applies to public pages only; whether the
studio should follow is undecided and was deliberately not decided here. Static-export note:
`og:url`/`canonical` are absolute and derive from `siteOrigin`, so an export driven from a
local `wrangler dev` would bake `localhost` — `settings.site_url` is the existing fix, the
same as for the manifest's `site`, but nothing warns you. Account-pinning generalisation to
`venkateshrao-cloudflare/` and PI Workers projects still not done (from session 17). The
transient Cloudflare **7403** on the migration preflight recurred once at the session's first
deploy and cleared on a plain re-run, exactly as session 18 recorded — the recorded advice
held.

## Session 18 — 2026-09-12 — Studio backlog cleared; two mis-recorded root causes corrected; pinned-version pages (#24); v0.2 testing pass closed
**Model:** Opus 5 → Fable 5 (pinned-page design ruling) → Opus 5 (implementation + the rest), switched by Venkat per the model-switch convention · **Time:** ~15:20–16:50 PT · **Committed:** yes (8 commits) · **Deployed:** `blygger-spec` to both live nodes ×5 (backlog fixes + migration 0006; scrubber replacement; pinned-version pages; hopper cold-start; composer TK fixes); `blygger-org` ×1 (spec §8.4 resync)

**What & why:** Worked the session-17 studio/subscribe-side backlog, and started the
testing-pass item (c) convergence clock first so it would ripen during the work.

**The reading-list sort bug — the recorded root cause was wrong, and finding that mattered.**
Session 17 logged it as "`l0.ts` never reads the `pubDate` that `feed.ts` parses, so `updated`
is the import moment and the backfill sorts by fetch time." `l0.ts` line 120 does read it.
The real cause: feed dates were stored **raw**, and `buildReadingFeed()` compared them **as
strings**. RSS 2.0 `<pubDate>` is RFC-822, so descending lexicographic order sorts by
day-of-week *name* first, then day-of-month. That is not a hypothesis — it reproduces the
live order exactly: the observed Jul 1, Jul 28, Jul 9, Jul 12, Jul 5, May 30, May 30, May 23,
May 23, Jun 20, Jul 18 is precisely `Wed > Tue > Thu > Sun 12 > Sun 05 > Sat 30 > Sat 30 >
Sat 23 > Sat 23 > Sat 20 > Sat 18`. It also explains the *clustering by source* that the
fetch-time theory never did: digit-leading ISO strings and letter-leading RFC-822 strings can
never interleave, however recent either is. Worth noting the wrong diagnosis was plausible and
specific — it named a real field and a real call site — which is exactly why it went a whole
session unchallenged. Checking it against the live rendering took two minutes.

Fixed at three layers rather than one, because they answer different questions. `toIsoUtc()`
(in `util.ts`) normalizes foreign dates at the `feed.ts` **parse boundary** — that is where a
foreign format should die, and `ParsedFeedEntry.pubDate` is now documented as normalized, not
raw. `buildReadingFeed()` sorts on **parsed instants** instead of strings, which heals every
row already sitting in the two live DBs *without a migration* — the important property, since
unchanged content means the poll loop skips those rows forever. And `pollL0Subscription()`
repairs stored dates on that skip path so the data itself converges. Two traps there, both
caught before shipping: the repair must not bump `version` (at L0 that means "content changed
under the same guid" and drives the reader's edit signal), and it must let **only a
feed-stated date** correct `updated` — my first version re-derived from `observedAt`, which
would have re-stamped every dateless entry to the poll time on each cycle, reintroducing the
fetch-time drift the whole fix exists to end.

**Hopper rename, and a slug decision.** `PUT /api/hoppers/:id` took only `{public}`; it now
takes `name`. The open question was whether renaming re-slugs. Decided: **a slug freezes the
first time the hopper is made public, permanently** (migration 0006, `slug_frozen`, latching —
un-publishing never clears it). The reasoning is that hoppers have **no discovery surface** —
no manifest key, no index page, and `export.ts` names slugs explicitly on the command line —
so `/h/{slug}/` is not one address among several, it is the *only* way anyone reaches a public
hopper, and every visitor got there from a link the author shared. Re-slugging would break all
of them silently. This also matches the project's standing posture that published things are
promises (pins, withdraw-not-delete). A never-public hopper still re-slugs freely, so the
common "created it as *Untitled*" case gets a good URL; a rename and publish in the same
request freezes the *new* slug, not the old one.

**Hopper UI** (least-developed studio surface, predating session 17's preview work): list rows
now carry item + source counts, the live public URL, and a three-item peek built from
**rendered HTML** via `previewFromHtml` — the session-17 rule, so no markdown markers or `[TK]`
scopes leak. Detail page gets an inline rename form, the public toggle (previously it told you
to go back to the list), and per-item source attribution with origin link and added-date.

**Respond-to-a-reading-entry.** Reading entries now carry `respond ↗` → `?respond=<sub>:<remote>`,
which prefills the composer with a citation line — `[title](url)` and a blank line — and
**nothing else**. Decision #12 forbids re-emitting an imported item, so the link is the
citation and the words are the author's; the page states that in prose above the textarea, and
a test asserts the imported body text never appears in the response. The source URL comes from
`sourceTitleAndUrl()`: the embedded anchor for L0 (which `l0.ts` itself rendered), the
constructed origin permalink for blyg-native. That permalink shape was **duplicated** in
`importer/pages.ts` — extracted to `blygItemUrl()` and shared, rather than writing a second
copy, which is the exact drift that bit `resolve.ts`/`feed.ts` in session 16 and
`preview.ts`/`markdown.ts` in session 17. Third instance of the same hazard; it keeps recurring
because the second copy always looks like one harmless line.

**A TODO that turned out to be mis-scoped, not untested.** "Hopper-based thread generation is
untested — never exercised end-to-end" describes a feature that **does not exist**.
`v0.2-plan.md` defers it explicitly: "v0.2 hoppers hold **imported items only**; v0.3 extends
membership to own items when threads compose from hoppers." `hopper` appears in `src/studio.ts`
only as a nav entry. Recorded as v0.3 plan scope (it needs the own-items-as-hopper-members
schema change first) rather than quietly built mid-v0.2.

**Testing-pass item (c) closed — a real cron-convergence cycle, observed.** Published a marked
fragment on `venkateshrao.com/blyg/` at 22:24:28Z; it appeared in
`blyg.protocol-institute.org`'s reading feed at **22:49:12Z — ~24m45s, with no manual
resync**, correctly attributed to "Venkatesh Rao's Blyg". That closes the last
implementation-independent item of the testing pass. The TODO's "publish, wait 15 min"
**understated the window**: 15 min is the *cron* interval, but `schedule.ts` makes a
subscription due only every `POLL_INTERVAL_MS` = 30 min ± 5 min of deterministic per-sub
jitter, so worst-case convergence is ~45 min — the observed ~25 min sits inside that, and a
15-minute check would have read as a failure. Corrected in the TODO.

**Verification:** 363 tests (was 338); `tsc` clean. The sort fix was driven against local
`wrangler dev` subscribed to the **real Contraptions feed** — the one that exhibited the bug —
and the reading order came back strictly chronological with own and legacy entries
interleaved. Hopper freeze semantics driven live too: renamed while private (slug moved),
published (froze), renamed while public (slug held), and the public page still 200s at the
original slug while the new name's slug 404s. The three reading-sort regression tests were
checked against the pre-fix code and all three fail there.

**Deployed to both nodes** via `deploy:all -- --migrate` (migration 0006 applied remotely to
both D1s, accounts pinned, all 5 live checks green per target). Worth recording: the first
run **halted at the migration preflight** with a Cloudflare `7403 — account not authorized` on
the personal account's D1 query endpoint. That was **transient** — `wrangler d1 list` against
the same account succeeded immediately after, and the identical `migrations list` command then
succeeded too. The protocol behaved correctly by failing closed and deploying *nothing*
(neither node), rather than proceeding on a partial preflight. Do not "fix" a 7403 here by
re-authenticating or editing account config before re-running the plain command once; the
config was correct throughout.

**Live confirmation of the sort fix:** `venkateshrao.com/blyg/studio/reading` now runs
strictly reverse-chronological with all four sources fully interleaved (own items, blyg
imports from the PI node, Contraptions, Simon Willison, Interconnected) — the clustering is
gone. The stored-date repair will heal each L0 row on its next natural poll; the display was
already correct without it, which was the design intent.

**The public page's version controls — Venkat reported dead rewind/forward arrows.** Worth
separating two surfaces that had drifted apart. Session 17 redesigned the **studio index**'s
version controls (`N versions · 📌 v1, v3`) and that shipped; the **public item page** still
carried the rev-3 scrubber `|< < v2 of 2 > >|` with all four buttons hardcoded `disabled`,
untouched since session 4 — which is exactly why it looked unchanged *and* didn't work.

They could never have worked. §2.8's session-5 decision is that **no route ever serves an older
version as an HTML page**, so the arrows point at nothing that exists or will exist; they were
an affordance advertising a capability the protocol had already ruled out. §2.8 even names the
replacement in its own prose — "the public page's version display is an indicator, not
navigation ... the right presentation is discrete pin citations (e.g. 'v6 · pinned: v2, v4')
linking to the existing `v{n}.json` files" — so the page was out of conformance with the spec
text it implements, and the open TODO for it had been parked behind "hold until TK-transclusion
+ subscribe/pubsub land," a condition that has since lapsed.

`itemMeta()` now renders `v2 · pinned: v1, v2`, each pin an anchor to its permanent version
file. Three behaviour changes beyond deleting the arrows, all of them things the old early-return
structure hid: a **pinned single-version item** now shows its citation (it previously showed only
"Created", so a v1 pin was invisible); a **withdrawn item** now shows its pins, which is the case
that matters most — surviving withdrawal is the entire point of a pin, so the endcap page is
precisely where a reader needs to be told what is still citable, and it previously said nothing;
and "Most recent" is now suppressed for single-version items, where it was only ever restating
"Created". Wireframes `public.html`/`thread.html` updated to match; `studio.html` was also stale
(still drawing the scrubber) and was corrected to the studio's *own* session-17 shape rather than
the public page's — they are deliberately different surfaces.

Verified live on real data after deploying: venkateshrao's two-pin fragment renders
`v2 · pinned: v1, v2` with both files 200, its four-version item renders `v4 · pinned: v3`, and
the PI node's pinned **thread** renders correctly at root mount. Locally, withdrawing a two-pin
item was driven end to end — the endcap page keeps both citations and both `v{n}.json` files
still 200. Static export is unaffected by construction: it fetches the live routes and writes
the bytes, so byte-identity cannot drift from a rendering change.

**Pinned-version HTML pages — decision #24 (Fable ruling; the model switch happened here).**
Venkat clicked the new pin citations and landed on raw JSON. That was §2.8 behaving as
specified — and also the *exact trigger* the session-5 ruling reserved: "a pinned-only HTML
route ... can be added post-v0.1 purely additively if demand appears." The sharper argument
than surprise: **a pin exists to be cited, and a citation shown to a human wants a page, not a
JSON file** — JSON-only made pins citable by machines and awkward for people, backwards for an
authoring medium.

The ruling (spec §8.4 rewritten; decision #24 in CLAUDE.md): a publisher MAY serve
`f/{id}/v{n}/` and `t/{id}/v{n}/` — the live permalink plus a version segment. Route shape
deliberately mirrors the permalink rather than sitting at `items/{id}/v{n}/`: `items/` is the
machine plane, `f/`·`t/` the human plane, and a citation URL you can construct in your head
from the permalink is the ergonomic point. Rules: gated exactly like the JSON file (404 unless
pinned, 200 forever once pinned, survives withdrawal — unpinned history stays unreachable in
every representation, so the session-5 worry about gutting withheld-unless-pinned stays dead);
content is the version's publish-time `content_html` verbatim (threads get the live thread
page's provenance injection, from the pinned version's own `transclusions`); presentation adds
a frozen banner, `rel="canonical"` to the live permalink, and a link to the `v{n}.json` twin —
human citation and machine citation one hop apart, each pointing at the other. Not a publish
event: no feed/archive/index membership, no manifest vocabulary; readers MUST NOT require the
pages. One subtlety worth recording: the **authored kind of the pinned version** picks the
route (`transclusions !== null`), not `item.kind` — a withdrawn item's kind is `'withdrawn'`
but its pinned v1 was authored as one or the other, and the same care applied to the live
page's citation links via a caller-supplied `isThread`.

Pin citations everywhere now link the pages: public version line, studio index chips, studio
history badge (the studio links were plausibly the exact ones Venkat clicked). The static
export mirrors each pin as two artifacts; an exported page was byte-compared identical to the
live route, so invariant 4 extends to pin pages. Root mount covered by a new mount test — the
PI node runs `MOUNT=""`.

Live-verified after deploy on real data: venkateshrao's two-pin fragment serves both frozen
pages (v1 shows the original one-line wording, v2 the expanded Knuth text — visibly different
content, which is the whole point); the 4-version item serves v3 and correctly 404s unpinned
v1; the PI node's pinned *thread* serves its baked transclusion snapshot at root mount.

**State after:** four of the five session-17 backlog items closed and the fifth reclassified as
v0.3 scope; the long-parked public-page scrubber cleanup done; pinned-version pages designed,
specced, built, live, and published to `blygger.org`; two studio bugs found by real authoring
fixed. Both nodes on migration 0006 and running this code. **The entire v0.2/TK testing pass —
(a), (b), (c), (d) — is closed**, which was the gate on the 0.2 spec draft. 376 tests, up from
338 at session start; `tsc` clean; both repos pushed.

Pattern worth carrying forward: **three separate "known" facts turned out to be stale or wrong
this session** — the reading-sort root cause (named a real field and call site, and was
nonetheless incorrect), the "Venkat hasn't authored with TK yet" status note (true when
written, repeated for two sessions after it stopped being true), and "pins are JSON-only,
period" (a real decision whose own escape clause had been triggered). Each took one command to
check against the live artifact and would otherwise have driven work in the wrong direction.
Checking beats inheriting, especially for notes about what a *person* has done.

**"I don't see a way to make a single imported item public" — one design answer, one real bug.**

The design answer: **there is no per-item publicity, deliberately.**
`curation-discovery-generation-proposal.md` §1 (locked as decision #12) rules that "make-public
means curation display only … **Retweet becomes curation (a list you keep), not speech (a thing
you said)**." A per-item public toggle *is* the naked retweet that decision rejected — and the
schema agrees: `hopper_items` has no public column, only `hoppers` does. Featuring one item
means a hopper containing one item; the list is the editorial act, even a list of one. The
session-17 TODO wording ("make one imported item public in a hopper") invited exactly this
misreading and has been corrected.

The real bug, and the actual reason Venkat couldn't find it: **`hopperPicker()` returned `""`
when the owner had no hoppers.** venkateshrao has zero, so its reading feed offered thumbs and
respond and *no route into curation at all*. Hoppers are the unit of publicity, so that picker
is the entry point to the entire public-curation feature — and it was hidden precisely at the
moment you had never used it. A cold start with no door. The picker now always renders and
carries a `+ create your first hopper…` option that creates one inline and adds the item in the
same gesture, so the first hopper is reachable from the item that prompted wanting it. Worth
naming the general shape: an empty-state that renders *nothing* reads as "this feature does not
exist," which is the most expensive possible way to be empty.

**Testing-pass item (b) closed while investigating.** The PI node already had two hoppers Venkat
made while testing, one of them public: `blyg.protocol-institute.org/h/ai-insights/` is live and
verified — an imported Matt Webb item rendered from the local snapshot with source attribution
and origin link, off-feed as decision #12 requires. The other, "Biology thoughts," had been made
public and then taken private, which incidentally confirms the session-18 `slug_frozen` latch
working on real data: it still reports its frozen ex-URL. So (b) needed surface verification,
not more curation.

**Two composer bugs found by Venkat authoring for real — the value of (d) arriving late.** He
reported "the TK markup got lost" and "there is no generate button in the in-feed composer."
Both traced to one handler. The composer's publish did `POST /api/items` (creating the draft
with the typed text) and then `POST /publish`; an unresolved TK scope correctly rejects
(decision #20 — publish never triggers generation), but the handler then called
`location.reload()`, which wiped the composer and dropped an unexplained new draft into the
list. **The text was never lost** — the live node still held it verbatim in that draft — but
nothing said so, which is indistinguishable from data loss from the author's side. That is the
general shape worth remembering: *a recoverable failure that doesn't say where the work went is
experienced as an unrecoverable one.*

Fixed by navigating to the created draft's editor instead of reloading: it is where the text
lives, and where the scope can be generated. For the missing generate button, the composer
deliberately does **not** grow a generation panel — generation is an explicit, author-reviewed
act (#20), and a one-line quick-post box is the wrong place to read a paragraph of generated
prose. It offers the door instead: a `generate in editor →` button that appears only once the
text contains `[TK]`, saves, and lands on the editor's TK panel (anchored `#tk`). The
compose-help line had also been telling authors to go find the editor themselves.

**The loop then closed on real content, by Venkat, unaided:** respond → bare link fragment →
add a TK scope → generate → publish. `0vc3pxtn…` is now v2 with `claude-opus-5` provenance at
23:44:39Z, published `content_md` marker-free, the `blyg-tk-gen` wrapper baked into
`content_html`, and the source link preserved — the exact respond→editorial-via-TK path the
design intends, exercised end to end without agent involvement.

**Testing-pass item (d) closed — by auditing the nodes instead of re-asking Venkat.** Venkat
pushed back on the repeated framing that he had not yet authored "something real" with TK. He
was right, and the framing was mine to fix: session 16's note ("an agent-picked instruction on
an already-existing draft, not Venkat's own authored content") was true when written and got
repeated for two sessions after it stopped being true. Enumerating every published item on both
nodes settles it: TK generation in a **fragment** (venkateshrao `5w1fd72f…`, `claude-opus-5`,
2026-09-11); TK generation in a **thread with two scopes** (PI `5zq1kdfptt…`, both generated
2026-09-12, ~4h before this session); **`![[id]]` source refs inside TK scopes** on both of
those scopes — `sources: [{id, version}]` alongside `transclusions: []`, which is the
decision-#20 quote-vs-source rule exercised on real authored prose, and the subtlest thing in
the grammar; and **verbatim transclusion** of two fragments in a thread (venkateshrao
`1vgtgz0g…`). The authoring already produced a locked design change — the session-16 balanced
grammar respelling came out of Venkat reading the parser while using it. Residual, explicitly
not a gate: no single *authored* item yet combines verbatim transclusion with TK generation
(session 14 covered that combination agent-driven). **The whole v0.2/TK testing pass is now
closed, which unblocks the ⚠️ FABLE `protocol-v0.2.md` draft.** General lesson: a status note
about what a *person* has done decays the moment they keep working; verify it against the
artifact before repeating it.

**Spec republished the same session** (`blygger-org`, latest mode): `sync_spec.py` picked up the
§8.4 rewrite, full rebuild, deployed, verified on both `blygger.org` and the pages.dev URL.
Worth recording because it exercised the publishing model's central claim: the **2026-08-10
dated snapshot still serves the OLD §8.4**, unchanged, while `/spec/0.1/` carries the revision —
frozen citable artifacts alongside a living document, which is structurally the same thing pins
are for items. Decision #15's snapshot machinery and decision #24's pin pages are the same idea
at two scales. No new snapshot cut: 0.1 stays DRAFT and living per #21/#23, and a dated
snapshot is a deliberate citation act (git tag + immutable URL), Venkat's call, not a
side effect of a spec edit.

**Open threads:** **the v0.2/TK testing pass is fully closed — (a), (b), (c), (d) all done — so
the ⚠️ FABLE `protocol-v0.2.md` draft is unblocked** and is the natural next session (Fable;
decision #23 makes it a standalone superset of the 0.1 text, after which 0.1 flips to
SUPERSEDED, and `spec-publishing-plan.md` §6 follows it). Open ergonomic question raised by
Venkat this session, deliberately not decided: curating a single item requires creating a
hopper, since publicity is per-list by decision #12 — a default "Links"-style hopper would be
a studio convention with no protocol implication, but it is a convention call, not a bug. The new hopper UI and the freeze rule are
untested by a human — worth a look while doing (b), since making a hopper public is exactly
the action that latches `slug_frozen`. Account-pinning generalization to
`venkateshrao-cloudflare/` and PI Workers projects still not done (from the session-17
incident). A local-dev subscription to the real Contraptions feed was left in place — useful
fixture data, since it is the feed whose RFC-822 dates exposed this bug.

## Session 17 — 2026-09-12 — Blogrolls on both nodes; a deploy protocol (after a wrong-account incident); studio UI made honest

**Model:** Sonnet 5 (blogrolls, syntax page, incident) → Opus 5 (switched at the deploy-protocol design point, per the model-switch convention) · **Time:** ~10:26–11:36 PT · **Committed:** yes (5 commits) · **Deployed:** both live nodes ×5 (syntax page, deploy-protocol validation ×2, studio UI ×2)

**What & why:** Picked up the v0.2/TK live-testing pass. Four threads, two of them unplanned.

**Testing-pass item (b), blogroll half — done.** Both nodes now publish `blogroll.opml` with the manifest `blogroll` key: Matt Webb (`interconnected.org`), Robin Sloan, Venkat's own Contraptions Substack, plus **each other** — the two test nodes are now mutually blogrolled. The cross-node subscriptions already existed from session 13's pub-sub test and only needed the `in_blogroll` flag; the three external blogs resolved cleanly through the §2.1 algorithm as `kind: "rss"` (L0). Discovered in passing that the PI node is **root-mounted** (`MOUNT=""`), so its studio is at `/studio`, not `/blyg/studio` — worth remembering when driving the two nodes with the same script. Still open from (b): making an imported item public in a hopper (curation is Venkat's call).

**Syntax cheat sheet** (Venkat's request, while starting to test TK): new `/studio/syntax` page covering transclusion (`![[id]]`, own-line, threads-only), the TK grammar, and the quote-vs-source rule — linked from the nav and from both composers' hint lines.

**Incident 2026-09-12-01 — a deploy landed in the wrong Cloudflare account.** Deploying the syntax page to the PI node, `wrangler deploy --env protocolInstitute` resolved to Venkat's *personal* account instead of the PI org account, auto-provisioned a stray empty R2 bucket there, and failed on the cross-account D1 lookup. No live impact (it failed before uploading the Worker), but the `wrangler.jsonc` comment warning about exactly this turned out to be **advisory only** — it could describe the mistake, not prevent it. This is a confirmed recurrence of a risk already in Claude memory from session 11. Recorded as `Code/incidents/2026-09-12-blygger-pi-wrong-account-deploy.md`; stray bucket deleted with Venkat's approval.

**Deploy protocol built in response** (`docs/deploy-protocol.md`, Venkat's ask; manual-trigger and blygger-spec-scoped, both his calls). Two independent guards: (1) `account_id` pinned per environment in `wrangler.jsonc` — this alone closes the root cause, verified by re-running the exact command that had failed, which now resolves correctly; (2) `worker/deploy-targets.json` + `npm run deploy:all`, which cross-checks the manifest against `wrangler.jsonc` and aborts the whole run on any disagreement (including an env with *no* `account_id` pinned), gates on tsc+vitest, preflights D1 migrations across **all** targets before deploying **any**, deploys each with its account pinned, then verifies live surfaces with cache-busting. Used for every deploy after it existed. **Secrets: pointers only** — Venkat flagged mid-build that a checked-in file must carry registry filename + key *names*, never values; a test asserts no secret-shaped strings. Account IDs are in the manifest deliberately: they are identifiers, not credentials, and the cross-check needs them. Migration detection is one-sided on purpose — only wrangler's literal `No migrations to apply!` counts as up to date, so an unrecognised format halts the deploy rather than silently skipping a schema change (both real output formats captured as fixtures by probing the live API).

**Studio UI — four things Venkat found while testing.** (i) **Index excerpts were derived from raw markdown**, so block syntax survived whitespace-collapsing as literal text (`# The famous blyg This is NOT…`) and dirty items leaked `[TK]` scopes from the working copy. Previews now come from *rendered HTML* (`src/preview.ts`): leading heading becomes a title line, TK scopes reduce via `previewStrip`, threads show a `⧉N` chip instead of stitched prose. (ii) **Reading tab**: L0 summaries kept paragraph structure instead of collapsing to one 2000-char wall, title links promoted out of the body, entries clamped by line-count (not truncated — no markup is cut) with a "more" toggle, and the feed paged at 25 (venkateshrao was rendering 96 entries / 63KB on one page). (iii) **Version history**: the index's five "previous version" arrows were **hardcoded `disabled`** — decoration implying navigation the studio never had. Replaced with a truthful `N versions · 📌 v1, v3` summary linking to pins' permanent files; the editor's flat changelog became a history panel where any version is readable (`content_html` was always retained but unreachable from the UI) plus **forward-only restore** — loads old content into the working copy to publish as vN+1, never rewinding the counter, so decision #19's +1 discipline and importer invariant #18b both hold; TK provenance is cleared on restore since it is positionally scope-aligned. (iv) **Studio chrome**: clicking any tab stranded you (no way back to the index), and navigation jumped. Added a `compose` nav link + current-section marker, and fixed three distinct causes of the jumping — pages alternated between a 65ch and 110ch body, there was no scrollbar gutter, and the title shared a line with the nav. Verified by *measuring* the first nav link's box across all six tabs plus an editor page in a real browser: identical at x=203 y=60 h=38 on every one.

**Two consolidations worth recording, both instances of the same standing hazard.** `preview.ts` initially grew its own `htmlToText`, duplicating `markdown.ts`'s `plainTextFromHtml` — merged into one implementation rather than shipping a second copy, the same drift that bit `resolve.ts` vs `feed.ts` in session 16. That merge also fixed a real pre-existing defect in it: tag-strip-only **welded words across block boundaries** (`evil.</p><p>Next` → `evil.Next`), which affected feed and page excerpts too (no hash impact — `content_hash` covers markdown, not excerpts). Separately, `stripTransclusionQuotes` shipped with a regex requiring `"` immediately after the class, so it matched **nothing** in production — the baked element carries `data-blyg-id`/`data-blyg-version`. **The live node caught it, the tests did not:** the fixture used a simplified shape. Replaced with a depth-aware scanner (which also handles a transcluded fragment containing its own blockquote, where a lazy regex stops at the inner close), and the tests now use the real baked markup.

**State after:** both nodes current and mutually blogrolled; every deploy this session went through `deploy:all` with account pinning and post-deploy verification. Tests 241 → 338. The studio index, reading feed, editor history, and chrome are all substantially reworked; nothing in this session touched protocol surface (all studio furniture per decision #3) — the one change that *would* have, giving pinned versions an HTML page, was deliberately not made and flagged for Fable/Venkat.

**Open threads:** Venkat confirmed TK generation works well (test thread on the PI node), partially satisfying testing-pass item (d). Remaining before the ⚠️ FABLE `protocol-v0.2.md` draft: (b)'s hopper half, (c) an observed cron-convergence cycle, (d) a fuller authoring pass. Five new UI/subscribe-side items in `CLAUDE.md` TODO, all from Venkat this session — the **reading-list sort bug has its root cause already located** (`l0.ts` never reads the `pubDate` that `feed.ts` parses, so `updated` is the import moment and the whole backfill sorts by fetch time). Generalizing the account-pinning fix to `venkateshrao-cloudflare/` and PI Workers projects is noted in the incident write-up, not done.

## Session 16 — 2026-09-11 — Legacy-RSS testing closes v0.2's exit criterion; studio nested under mount; TK grammar respelled to balanced tokens (decision #20 amended)

**Model:** Sonnet 5 (build/testing/implementation) → Fable 5 (TK grammar redesign ruling) → Sonnet 5 (implementation + migration resumed) · **Time:** ~11:15–13:20 PT · **Committed:** yes · **Deployed:** `blygger-org` (notes publishing, resync) ×2; `blygger-spec` worker to both live nodes ×5 (Atom fix, resolve fix, studio nesting, studioPath centralization, TK grammar respelling)

**What & why:** Picked up the v0.2/TK live-testing pass from session 15's TODO, plus two mid-session Venkat requests that became real design/implementation work of their own.

**Technical-notes publishing** (`spec-publishing-plan.md` §5, ungated Sonnet-safe work): `blygger-org/sync_spec.py` gained a notes pass (parses `docs/notes/tn-*.md` header lines for title/date/status, writes `content/notes/tn-{N}/index.md` + a generated index — no new CLI mode, runs every invocation) and `build.py` walks `content/notes/` the same depth-driven way it walks `content/spec/`. TN-1 is now live at `blygger.org/notes/`.

**Testing-pass item (a): legacy-RSS subscription — closes v0.2's three-way exit criterion, and found two real bugs doing it.** Subscribed `venkateshrao.com/blyg/` to Simon Willison's blog (Venkat's pick, from three candidates offered). It's Atom-only — no RSS 2.0 alternative — which `feed.ts` had never actually been asked to parse despite being designed for "any legacy RSS feed": `parseFeed()` only understood `<rss><channel><item>`. Extended it to also parse `<feed><entry>` (Atom's attribute-based `<link>`, possibly several per entry by `rel`; `<content>`/`<summary>` fallback; `<published>`/`<updated>` fallback), sharing the `blyg:*` extension extraction with RSS since blyg-native feeds are always RSS but the sharing costs nothing. 7 new tests, all 8 existing RSS tests unchanged, verified against the real live feed (30/30 entries parsed correctly) before touching production. Subscribing still failed after that fix — `resolve.ts`'s `extractFeedManifestUrl()` turned out to have its own independent, RSS-only copy of the same root-shape detection, never updated when `feed.ts` learned Atom. Replaced it with a call into the shared `parseFeed()` so the two can't drift apart again; added a regression test (direct fetch of an Atom URL resolves to `kind:"rss"`, not failure). Deployed, subscription created, backfill pulled 30 real entries into the merged reading feed. **Full three-way exit criterion (blyg + blyg + legacy feed) now met** — `roadmap.md` updated. Testing-pass items (b) (blogroll/hopper curation) and (c) (cron-convergence observation) remain open — both need Venkat's input/timing, not implementation.

**Studio nested under the mount** (Venkat's request, mid-session): `venkateshrao.com/studio` read oddly for a non-root deployment where `/blyg` is the whole public site — moved to `venkateshrao.com/blyg/studio`, matching the site it edits. No protocol conflict (studio is explicitly non-protocol client furniture, decision #3). Before touching the route shape, verified with a throwaway Hono reproduction that nesting studio under the mount doesn't reintroduce the cache-control leak the current host-rooted design was built to avoid (root-mount, non-root-mount-current, and non-root-mount-nested all checked — no leakage, old paths cleanly 404). `/api` deliberately stays host-rooted — it's plumbing the studio JS calls into, never a navigated URL, so nesting it would have meant threading a mount-aware base through every embedded `fetch()` call for no user-facing benefit. Root-mount `protocol-institute` node unaffected by construction (`mount + "/studio" === "/studio"` there); `venkateshrao` moves, old bookmarked `/studio` now 404s (Venkat's explicit "clean break, no redirect" call). Manually click-tested end-to-end against local `wrangler dev` before redeploying (login, item list, thread editor's live preview fetch, hoppers, hopper detail, subscriptions, logout).

**Self code-review of the day's changes** (5 findings from a `/code-review high` pass): fixed one real maintainability risk — `mount + "/studio"` had been hand-built independently at ~24 call sites across `index.ts`/`studio.ts`/`importer/studio.ts`, exactly the kind of thing that drifts the way `resolve.ts`'s duplicated detector just had. Centralized into `studioPath(mount)` in `util.ts`, migrated every site, added direct test coverage. Judged the other four findings not worth acting on: a narrowed feed-detection check in `resolve.ts` that the reviewer read as a regression is actually `resolve.ts` becoming *consistent* with `poll.ts`'s pre-existing strict check (poll.ts already required object-typed `<channel>`; the old leniency lived only in resolve.ts's own now-removed duplicate); a stale `wrangler.jsonc` route comment already covered by the clean-break decision above; two negligible per-request string-rebuild perf nits.

**Composer syntax hints** (Venkat's request): one-line muted hints above the in-feed fragment composer (markdown + `[TK...]`, no transclusion — fragments can't transclude) and the thread editor's markdown pane (markdown + `![[id]]` transclusion + `[TK...]`), matching exactly what each context actually supports.

**blygger.org staleness check** (Venkat asked): found the generated pages' provenance footer one commit stale (today's earlier commits landed after the last deploy; no spec/note text had actually changed) — resynced and redeployed. Also found and fixed a stale `CLAUDE.md` line claiming the custom-domain DNS was still pending, when `status.md` has recorded it as live since 2026-08-04 — the two files had drifted apart.

**TK grammar respelled to balanced tokens — decision #20 amended.** Venkat, reading the parser for the earlier Atom work, asked why `[TK` is unbalanced (no closing bracket) rather than `[TK]...[/TK]` or a self-closing `[TK.../]`. Explaining the session-15 "forced, not chosen" record surfaced that its actual scope was narrower than how it reads: what's forced is only that no token *terminating the instruction* may begin with `]` (a bare-`]` terminator mis-splits an instruction ending in a `![[id]]` source ref — `…![[abc]]][/TK]` cuts the ref). It never ruled out a balanced *opener*, since the opener's `]` sits before any instruction text exists. Venkat rejected the unbalanced spelling as unreadable and asked to evolve it — explicitly a Fable task per the model-routing rule (locked decision, design tradeoffs to re-derive), so switched models. Presented three real alternatives — balanced tags `[TK]…[=]…[/TK]` (minimal delta, same three-token linear scan), placeholder style `{{TK …}}…{{/TK}}` (prettiest ungenerated form, but costs close-tag-binding lookahead the fixed-order grammar structurally avoids), HTML-comment style (graceful degradation when pasted elsewhere, but the worst inline ergonomics of the three, undermining the whole point of the change) — Venkat locked in balanced tags. Recorded as an amendment to decision #20 in `CLAUDE.md`, with `tk-core-plan.md` §2.1 rewritten (two-revision grammar history) and a new §9 added: the complete Sonnet/Opus-safe implementation task list, explicit that no design latitude remained. Switched back to Sonnet for implementation.

**Grammar respelling implemented, migrated, and live-verified with a real generation, same session:** parser (`tk.ts` — both `indexOf("[TK"` scans become `indexOf("[TK]"`, instruction offset `tkIdx+3` → `tkIdx+4`; `[=]`/`[/TK]` unchanged), ~59 test-fixture literals across 4 files mechanically respelled plus 2 new cases (empty-instruction `[TK][/TK]` — the balanced opener makes this the journalism-placeholder convention, newly valid; the ref-directly-against-`[=]` regression case the whole grammar history is about), studio wrap-sugar + compose-help hints (which also fixed a pre-existing bug — the hint text `[TK an instruction]` was never valid under *either* grammar). 241/241 green, `tsc` clean, verified end-to-end against local `wrangler dev` (compose → wrap-sugar shape → live preview highlighting → publish → confirmed marker-free wire output) before redeploying. **Working-copy migration** (Venkat: migrate, don't discard, since nothing's released): wrote a one-off script (never committed — git-historical pre-respelling `tk.ts` copied in temporarily, deleted after use) that re-parses each node's drafts with the *old* grammar to find real scope boundaries — not a blind string replace, so no risk from coincidental `[TK ` in ordinary prose — and re-emits the new grammar through the same authenticated API the studio itself uses. Caught two of its own bugs via dry-run before they touched anything: wrong sequencing (data migration must happen *after* the parser deploy, not before — the reverse briefly leaves migrated content sitting on a server whose old parser misreads `[TK]` as an instruction starting with a stray `]`, confirmed by re-deriving the OLD parser's read of the new grammar) and a detection bug (`.includes("[TK")` can't distinguish `[TK` from `[TK]`'s own prefix — fixed to a negative-lookahead regex). One real scope migrated on `venkateshrao` (a snowclone fragment: "Premature ontogenic closure is the root of all prophetic evil."); `protocol-institute` had nothing to migrate. Deployed to both nodes, then **ran a real generation against the live Anthropic API** on the migrated scope to close the loop properly — `claude-opus-5` correctly identified and explained the actual Knuth quote the instruction asked for ("premature optimization is the root of all evil," 1974), the working copy spliced `[=]<output>` correctly, the TK panel flipped to "regenerate." Confirmed in passing: `AI_PROVIDER_KEY` is Venkat's regular personal `ANTHROPIC_API_KEY` (shared across `Publishing/`, `quadrantology/`, `vgr-library-code/`), already live on both nodes since session 14 — no studio-side configuration needed, the key is pure server-side Worker-secret plumbing the studio UI never touches.

**State after:** two-node network fully current on all fronts touched this session — v0.1/v0.2/TK-core deployed and live-verified, legacy-RSS leg of v0.2's exit criterion closed, studio UX improved (mount-nested + syntax hints), TK grammar redesigned and migrated with zero data loss. `blygger.org` serves the notes section and is provenance-current. Decision #20 now carries the balanced-token grammar as its authoritative spelling; the unbalanced `[TK` form is fully retired from code, tests, docs, and both live nodes' data.

**Open threads:** testing-pass items (b) (blogroll + public hopper curation) and (c) (one observed cron-convergence cycle) — both explicitly need Venkat's input/timing, not agent implementation; (d) (Venkat authoring something real with TK) is partially exercised by this session's live generation test but that used an agent-picked instruction on an already-existing draft, not Venkat's own authored content — still open in spirit. The `protocol-v0.2.md` draft (⚠️ FABLE, gated on the testing pass per decision #21's sequencing) is now unblocked except for (b)/(c). `spec-publishing-plan.md` §6 (SUPERSEDED-status mechanics) stays gated on that draft existing. `wrangler.jsonc`'s stale `/studio` and `/studio/*` Workers Routes on venkateshrao (harmless — they just route to the worker's own 404 now instead of falling through to the static site's) — noted by the code review, not fixed, since it's covered by the same clean-break call as the route-shape change itself.

## Session 15 — 2026-09-11 — TK-core deployed live; decisions #22 (ns permanence) + #23 (per-version living docs); TK grammar confirmed
**Model:** Opus 5 (deploy + site work) → Fable 5 (design rulings; switched at the design boundary per convention) · **Time:** ~10:35–11:30 PT · **Committed:** yes · **Deployed:** TK-core (migration 0005 + worker) to both live nodes; blygger.org (ns page + spec updates)

**What & why:** First session in a month. Baseline held: 228/228 tests, both
nodes serving `blyg: "0.2"` — and the PI manifest's `updated` timestamp was
ticking on the quarter-hour, meaning **the v0.2 cron poller has been running
unattended for a month**, which quietly retires session 13's
"cron convergence never observed over a real interval" thread (content-level
convergence verification still listed in the testing pass below).

**TK-core deployed to both live nodes** (Opus): migration 0005 applied
remote and workers redeployed, account ID pinned explicitly per node
(personal `7026b5…` / PI org `7e8c79…`). Live-verified: manifests/feeds 200,
`/api/items/:id/generate` returns 401 not 404 (route present, auth-gated),
venkateshrao's 12-entry feed and item index intact; PI's empty public
archive is correct (imports are never re-emitted, decision #12). TK is now
usable in both studios — remember the PI node's `AI_PROVIDER_KEY` is
Venkat's personal Anthropic key (session-14 billing crosscurrent).

**Found while verifying, worth knowing:** a Workers Route pattern with no
wildcard (`venkateshrao.com/blyg`, added because `/blyg/*` misses the bare
prefix) also **fails to match when a query string is present** — the request
falls through to the static Pages site and returns *its* 404 with a 200-page
body shape that looks like a broken deploy. Consequence beyond debugging: a
shared link with tracking params (`…/blyg?utm_source=…`) serves the static
404 today. Fix would be widening to `/blyg*` (which then shadows any future
same-prefix sibling path); deliberately not applied — Venkat's call.
Recorded in Claude memory alongside the session-13 cache-busting gotcha,
since the two interact (never cache-bust a bare mount path).

**`blygger.org/ns/0.1` page written and deployed.** The namespace URI —
the one URL in the system strangers dereference first — was serving the
*homepage* with HTTP 200 via the Pages fallback, worse than a 404. The new
page explains namespace-name-vs-location, tables the seven `blyg:` elements
(2 channel / 5 item), explains the per-version GUID scheme's dedupe
behavior for plain vs blyg-aware readers, and carries the versioning answer
below. Descriptive-not-normative on its face; `content/README.md` records
the re-check-against-spec-§7 rule.

**Decision #22 (Fable): the namespace URI is a permanent opaque token.**
Writing that page surfaced that nothing had ever locked whether
`…/ns/0.1` tracks the protocol version — #14/#16 froze every other wire
token but not the URI; `types.ts` asserted permanence in a comment whose
"once v0.2 ships importers" window closed silently at the session-13
deploys, leaving live feeds declaring `ns/0.1` under `blyg: "0.2"`
manifests. Ruled permanent, which makes that state correct rather than a
mismatch. Decisive argument beyond the Dublin-Core/Atom precedent: a
version-tracking URI would be a *stricter* version signal than the
deliberately informative manifest key (#18d) — incoherent — and would
break exactly the readers the ignore-unknown-`blyg:*` rule protects.
Renaming to a version-free `/ns` while pre-1.0 still allows it was
considered and rejected: post-deploy churn for a cosmetic gain, and the
page at the URI answers the confusion where it arises. Recorded in
CLAUDE.md #22, spec §7 (new bullet), the ns page, `types.ts`.

**TK grammar §2.1 confirmed (Fable), closing session 14's flag — and the
prose rule turns out to be forced, not merely chosen:** any closing token
beginning with `]` mis-splits an instruction *ending in a source ref*
(`…![[abc]]][/TK]` cuts the ref), and refs-in-instructions are the primary
case the grammar exists for (§2.2). So the canonical typed form is
`[TK instruction[=]output[/TK]` — no `]` terminates the instruction. The
plan's illustrated examples (§2.1/§2.2/§2.4) carried a spurious `]` and
were corrected with a note; `tk.ts` doc-comments fixed; `tk.test.ts` header
flag marked RESOLVED; decision #20's record amended. **No code change** —
session 14 implemented the correct reading, and `studio.ts`'s wrap-sugar
was already right; session 14's devlog entry showing `][/TK]` in the sugar
description was a prose typo, not a code bug (left as-is, historical).

**Decision #23 (Fable + Venkat): per-version spec documents, highest is
living.** The 0.1-doc/0.2-wire mismatch was a symptom: the subscribe side's
normative record is scattered across `v0.2-plan.md` and decisions #17/#18.
Resolution: each protocol version gets a standalone-complete document
(superset revision, never a delta — a `/spec/{version}/` URL hands an
implementor one document); testing-driven revisions (#21) land only in the
highest-numbered doc; on N+1's publication, N freezes as SUPERSEDED
(forward-linking banner, snapshots untouched — immutability outranks
supersession). Amends #15's structure; §2's "freezes at stable" language
formally retired (already dead under #21). Mechanics spec'd Sonnet-safe in
`spec-publishing-plan.md` §6; 0.1's status header now pre-announces its own
supersession.

**Sequencing ruling (Fable): the v0.2/TK live-testing pass comes BEFORE
drafting `protocol-v0.2.md`.** Per #21, testing precedes normative prose,
and the 0.2 doc would describe surfaces with zero operational hours: the L0
wrapper has never touched a real (messy) RSS feed — the unmet third leg of
v0.2's own exit criterion; blogroll and public hoppers are live but unused;
cron convergence inferred, never content-verified; TK never used by a real
author on a live node. Drafting first would invert #21 and buy only churn.
CLAUDE.md TODO now carries the testing pass as an explicit gate on the
draft.

**State after:** two-node network fully current — v0.1 + v0.2 + TK-core all
deployed and live-verified on both nodes. blygger.org serves the ns page and
the updated spec (§7 namespace bullet, lifecycle status header). Decisions
locked through #23. Next major work, in order: the testing pass (Sonnet/
Opus + Venkat-manual), then the ⚠️ FABLE `protocol-v0.2.md` draft, then
`spec-publishing-plan.md` §6 mechanics; §5 technical-notes publishing is
ungated and Sonnet-safe whenever.

**Open threads:** the testing-pass TODO (4 items, CLAUDE.md); §5
technical-notes publishing (TN-1 still unpublished); bare-path
route-vs-query-string behavior left unfixed (Venkat's call on `/blyg*`
widening); `wrangler.jsonc`'s inert top-level env block still carries the
orphaned rehearsal D1 id (harmless, annotated); blygger.com still dark —
no DNS records, scaffold repo only, no active role since the session-8
retargeting.

## Session 14 — 2026-08-10 — TK-core built end-to-end: instructed generation, all 8 tasks
**Model:** Sonnet 5 · **Time:** ~19:17–20:13 PT · **Committed:** no (pending Venkat's review) · **Deployed:** `AI_PROVIDER_KEY` secret set on both live nodes (`blyg-venkateshrao`, `blyg-protocol-institute`); worker code itself **not yet deployed** — pending explicit go-ahead

**What & why:** Implemented `docs/tk-core-plan.md` in full — all 8 ordered tasks,
from the scope parser through static-export verification — working straight
from the session-12 design doc per CLAUDE.md model routing. New code:
`worker/src/tk.ts` (grammar parser + publish-time HTML disclosure),
`worker/src/ai/provider.ts` (Anthropic Messages API client), `worker/src/tk-generate.ts`
(`/generate` endpoint logic), plus integration into `model.ts`'s `publish()`
and the studio editors. 228/228 tests green (63 new), `tsc --noEmit` clean.

**Grammar ambiguity found and resolved, not silently — flagged for Fable/Venkat.**
`tk-core-plan.md` §2.1 states the parser is a linear 3-token scan (`[TK` …
optional `[=]` … `[/TK]`) chosen specifically so `![[id]]` refs never need
escaping ("no bracket balancing"), but the same section's illustrated examples
write `[TK <instruction>][/TK]` — a literal `]` closing the instruction before
`[/TK]`, which would require exactly the bracket-tracking the prose says to
avoid. Implemented per the explicit, twice-stated prose rule (also the only
internally-consistent reading); the examples' `]` is a documentation artifact.
Recorded in `tk.test.ts`'s header and worth a one-line Fable/Venkat confirmation
that the reading is correct, since it's the actual byte-level syntax authors
will type.

**Block vs. inline classification (§3.2's "inline output" vs "block output"),
an implementation-level design call the plan didn't specify:** a scope is
**block** when it occupies a paragraph by itself — preceded and followed only
by a blank line or a document edge — and **inline** otherwise. Chosen because
it's CommonMark's own definition of "standalone paragraph," so it composes
correctly with markdown-it's own paragraph detection instead of fighting it.
Verified live in the browser: a whole-paragraph scope renders as
`<div class="blyg-tk-gen">`, a mid-sentence scope as `<span class="blyg-tk-gen">`
inline in the same `<p>`, and two scopes with no blank line between them (an
edge case the heuristic doesn't special-case) both fall out as inline —
documented behavior, not a bug.

**Rendering technique: Unicode Private Use Area sentinels, not a custom
markdown-it plugin.** Publish needs to (a) bake `blyg-tk-gen` wrappers around
generated spans and (b) — for threads — still run the existing transclusion
walker unchanged. Block spans are rendered independently
(`renderMarkdown(text)`) and spliced in via a unique opaque placeholder token
that's alone in its own paragraph (guaranteed by the block-position rule
above), so a multi-paragraph generated block never gets split by the
surrounding document's own rendering. Inline spans are sentinel-wrapped
*in place* (real text between two markers) so surrounding markdown constructs
— emphasis, links — still parse correctly across the span boundary; the
sentinels survive markdown-it's rendering (PUA chars aren't `&<>"'`, so
`html:false` never touches them) and get string-replaced for the real tags
afterward. This let `transclusion.ts`'s `walk()` stay **completely untouched**
for the thread path — TK spans are just inert text to it, since PUA sentinels
can never match the `![[id]]` directive regex. `resolveFragment()` was
factored out of `walk()` (pure refactor, all 11 `threads.test.ts` cases still
pass unchanged) so TK source resolution reuses the exact same
local/published/fragment-only rule the plan requires ("must resolve like
transclusion targets").

**Provenance-storage bridge, a real gap the plan didn't cover — flagged and
filled, not improvised silently:** §2.3 requires sources to resolve to "the
latest published version *at generation time*," with edits/withdrawals of the
source *after* generation never touching the already-generated output
(snapshot independence, same rule as §10.4). But the plan's only DB change is
`versions.generated_json` — written at *publish* time. Between a `/generate`
call and the next publish, something has to remember which sources/model/
timestamp produced each scope's current output, surviving further plain edits
to the working copy. Added `items.tk_provenance_json` (migration 0005,
alongside the plan's `versions.generated_json`) — a working-copy-side cache,
positionally aligned to scope order as of the last `/generate` call,
consumed at publish to build the wire `generated[]` array and decide which
spans get the `blyg-tk-gen` wrapper. A scope with output but no cached
provenance (hand-authored, never run through `/generate`) gets **no**
wrapper and **no** `generated[]` entry — nothing was actually generated, so
there's nothing to disclose. Known, documented limitation: reordering/adding/
removing scopes between generate calls can misattribute provenance by
position — the same class of fragility the plan's own index-based
`{scope: n}` API already has, not a new one introduced here.

**Fragment cap moved inside `publish()`, from `api.ts`'s pre-check:** the old
check compared the *raw working copy* (with `[TK…]` markup) against
`FRAGMENT_MAX_CHARS`, which is now wrong in either direction once TK is
involved — instructions can push the draft over 1000 chars while the
generated output stays short, or vice versa. `publish()` now checks the
*stripped* (published) length and throws `FragmentTooLongError`; `api.ts`
just catches it. Tested both directions explicitly.

**Provider implementation is raw `fetch`, not `@anthropic-ai/sdk`:** this
Worker has no `nodejs_compat` flag and a deliberately tiny dependency set
(hono, markdown-it, fast-xml-parser); the SDK is Node-oriented. Followed the
`claude-api` skill's model table (default `claude-opus-5`, confirmed via
`ant`-skill guidance, not memory) and the codebase's existing DI convention
(`importer/http.ts`'s `FetchLike`) for a `ProviderFetchLike` so
`provider.test.ts` and `tk-generate.test.ts` mock the request/response shape
with zero real network calls.

**Live-verified against the real Anthropic API, not just fixtures:** after
tests were green, ran a real `wrangler dev` loop — added `AI_PROVIDER_KEY` to
`.dev.vars` temporarily (removed after), published a source fragment, created
a thread with a block transclusion quote + an inline TK scope citing that
fragment as a source + a pure-instruction scope, called `/generate` on both
scopes against `claude-opus-5` for real, published, and diffed the live
`items/{id}.json` byte-for-byte against a fresh `scripts/export.ts` run —
identical, including the `generated` array and the baked HTML wrappers.
Confirms invariant 4 holds for TK content, matching session 13's precedent
for v0.2. Studio UI (task 6) also driven live in the browser: scope
highlighting (block div / inline span, exactly as designed), the
Generate/Regenerate panel, and the combined transclusion+TK preview all
render correctly; the publish-error banner and "generate whole fragment"
sugar (wraps the current draft as `[TK instr[=]existing][/TK]`) were built
but not independently re-verified live (code-reviewed against the same
pattern as the working transclusion-error banner).

**Secret + settings (task 7), with an explicit decision from Venkat:** asked
whether to mint a new dedicated Anthropic key for blyg or reuse the existing
personal `Code/.env.keys` `ANTHROPIC_API_KEY` (shared with Publishing/
quadrantology/vgr-library-code, "expires periodically"); Venkat chose reuse.
Registered the new consumer in `Code/.env.keys`'s comment and set it as
`AI_PROVIDER_KEY` via `wrangler secret put` on both live nodes, verifying the
account ID before each (`7026b5...` personal for `venkateshrao`,
`7e8c79...` PI org for `protocolInstitute`) per the standing multi-account
caution. **Billing crosscurrent flagged explicitly, not buried:** the PI
node's worker infra is org-billed, but this key is Venkat's personal
Anthropic account, so TK generation costs *on the PI node* land on Venkat
personally, not the org — recorded in both `protocol-institute/.env.keys`
and `admin/keys.md`'s registry table (not silently matching the existing
`owner: org` convention used for that worker's other secrets).

**Unrelated gap found and fixed while here:** `worker/.dev.vars` was
`.gitignore`d correctly but missing the Dropbox-ignore xattr required by
`Code/security-policy.md` Rule 6 — had been that way since it was created
(OWNER_PASSWORD/COOKIE_SECRET already in it). Applied `com.dropbox.ignored 1`
before adding the real Anthropic key to it for local testing, removed the key
afterward once the live-verification loop was done.

**State after:** TK-core is fully implemented, tested, and live-verified
against the real provider — fragments and threads can both carry `[TK]`
scopes, generate/regenerate through the studio or the API, and publish with
correct disclosure. `AI_PROVIDER_KEY` is provisioned and ready on both live
nodes. Migration 0005 and the new worker code are **not yet applied/deployed
to either live node** — this session built and verified locally + against
the real API, but did not touch the live Workers' code (only their secrets),
since that's a separate deploy decision. `docs/tk-core-plan.md` and
`docs/roadmap.md` updated to DONE; `CLAUDE.md` TODO checked off.

**Open threads:** deploy migration 0005 + the new worker code to both live
nodes when Venkat wants TK live (straightforward — same pattern as session
13's v0.2 deploy); confirm the §2.1 grammar reading with Fable/Venkat (cheap,
doesn't block anything since the reference implementation already commits to
one reading); the positional-provenance-realignment limitation is documented
but not engineered around — revisit if it ever bites in practice. Carried
over from session 13, still open: the legacy-RSS leg of the three-way exit
criterion, and nothing yet in either node's blogroll/public hoppers.

## Session 13 — 2026-08-10 — v0.2 "Roots" built end-to-end: subscribe side, all 14 tasks
**Model:** Sonnet 5 · **Time:** ~10:47–12:16 PT · **Committed:** yes (`cddf09b`, then a deploy-record follow-up commit) · **Deployed:** both live nodes — `blyg-venkateshrao` and `blyg-protocol-institute`, migration 0004 applied remotely, real bidirectional subscription confirmed converging

**What & why:** Implemented `docs/v0.2-plan.md` in full — all 14 ordered tasks, from
migration 0004 through the simulated-outage integration test — in one session, working
straight from the session-12 design doc per CLAUDE.md model routing (Sonnet-safe
throughout, no protocol redesign needed). New code lives under `worker/src/importer/`
(13 modules) with `worker/test/importer/` (14 test files, 90 new tests); the full suite
ends the session at 163/163 green, `tsc --noEmit` clean throughout.

**Resolution (`importer/resolve.ts`, §2.1) and transition (`importer/transition.ts`,
§3.3)** are both pure functions taking an injectable `FetchLike` (`importer/http.ts`) —
a deliberate implementation choice, not a protocol one: platform `fetch()`'s
`Response.url` is only meaningfully populated by a real network round-trip, so a
custom `FetchLike` (`{ok, status, url, headers, text()}`) decouples "final URL after
redirects" from that platform quirk and makes every importer module testable with
plain deterministic fixture stubs instead of a real HTTP layer or `MockAgent`
plumbing. `resolve()` implements the six-step algorithm exactly (direct probe →
feed-upgrade via a real XML parse, not just a regex → one-hop rel probe → conventional
mounts → RSS fallback), using `HTMLRewriter` (native to the Workers runtime) to extract
`<link>` tags instead of a hand-rolled regex or a DOM dependency. `transition()`
implements every table row from §3.3 plus the edge cells the table doesn't literally
name (e.g. a same-version re-fetch whose kind contradicts the local state) — per
CLAUDE.md's model-routing rule, those fall back to a safe ignore-and-flag
(`"unrecognized-transition"`) rather than inventing new protocol semantics; worth a
Fable pass if they ever prove reachable in practice, but they shouldn't be under an
honest origin (withdrawal is itself a version bump, so a same-version document can't
legitimately change kind).

**Index reconciler + poll cycle (`importer/poll.ts`, §3.2)** implements the full
gap-check/backoff/degrade machinery. One real gap found while implementing: the plan's
"import the full archive on first subscribe" was originally wired as a direct
`reconcileIndex()` call from the subscribe API — but that bypasses `pollSubscription()`'s
own bookkeeping (`newest_guid`, `etag`, `last_index_sync_at`), so the *next* real poll
would find `newest_guid` still null and never trigger gap detection correctly. Fixed by
having initial-subscribe call `pollSubscription()` itself: a fresh subscription's null
`last_index_sync_at` already makes that first call reconcile unconditionally, so it's
a strict simplification (one code path instead of two) that also fixes the bootstrap
bug. Caught this before it shipped, not after — no protocol impact, pure implementation
correctness.

**Hoppers' pin-retention integration (§3.4)** hooks into `poll.ts`'s `rollup-null`
handling: at withdrawal-processing time, if the item is in any hopper, one extra fetch
checks whether the origin still pins the last-known version; if so,
`imported_items.pinned_version_retained` is set and content survives, otherwise it's
wiped to the placeholder state. Scoped to hopper-tracked items only (the only place the
distinction is user-visible) to avoid a pin-check fetch on every withdrawal.

**Sanitization, not in the plan doc but required by §12:** `content_html` fetched from
a remote origin is untrusted HTML and §12/§3.3 both say it MUST be sanitized before
rendering. Added `importer/sanitize.ts` — an allowlist-by-removal sanitizer built on
`HTMLRewriter` (strips `script`/`style`/`iframe`/`object`/`embed`/`form`, `on*` handler
attributes, `javascript:` URLs), applied at render time in the reading feed and public
hopper pages, never at storage time (ground truth stays verbatim, per the spec's own
"sanitize at render, store verbatim" framing). L0 imports skip it structurally instead:
their `content_html` is always our own `renderMarkdown()` output (html:false), never
the origin's raw bytes, so there's nothing to sanitize.

**Version key bump:** landing the blogroll manifest key triggered §2.3's own rule —
`PROTOCOL_VERSION` and `GENERATOR` bumped from `0.1`/`blyg-ref/0.1.0` to
`0.2`/`blyg-ref/0.2.0` (package.json version too). `BRAND.nsUri` (the XML namespace)
was deliberately left at `ns/0.1` — namespaces are permanent identifiers per decision
#14/#16, not version trackers.

**Static export (task 13) verified live**, not just unit-tested: ran a real
`wrangler dev` instance, published content, subscribed it to itself over real loopback
HTTP (`resolve()` against `http://127.0.0.1:8787/blyg/` — genuine self-fetch, not a
sandbox trick), created a public hopper, then ran `scripts/export.ts` and byte-diffed
`blogroll.opml`, the hopper page, and the manifest against the live routes — all three
identical, confirming invariant 4 holds for the new v0.2 surfaces. `--hoppers` is a new
required-if-you-want-them CLI flag (comma-separated slugs): the protocol has no public
"list of public hoppers" surface by design (§4.2 only adds `blogroll.opml` and
`/h/{slug}/`), so the export script can't discover them itself — the operator names
which of their own public hoppers to mirror, the same way they already name `--base`.

**Simulated-outage integration test (task 12)** runs against the real worker via
`SELF.fetch` wrapped as a `FetchLike` — both "nodes" are the one worker under test (it
publishes its own content and subscribes to itself), but the HTTP path is real, not a
fixture map. The scenario is deliberately adversarial: a missed edit and a withdrawal
are both pushed completely out of the 50-entry feed window by unrelated churn on a
third item *before* the subscriber ever reconnects, so the test can only pass if index
reconciliation — not the feed trigger-set — is what recovers them. It does, item-by-item,
on the first run.

**Deployed to both live nodes and real cross-node pub-sub verified, same session
(cont'd):** after committing/pushing the implementation, Venkat asked to continue
straight into deployment rather than defer it. Applied migration 0004 remotely to
both D1s (`blyg-venkateshrao` under the personal CF account
`7026b5d7c1ad16cb808987576bb07ab2`, `blyg-protocol-institute` under the PI org account
`7e8c7969b2464d23795c555bc6a32af8` — verified against `Code/.env.keys` and
`protocol-institute/admin/keys.md` before touching either, per the standing
multi-account-risk caution), then `wrangler deploy` to both named environments — both
came up clean, cron trigger (`*/15 * * * *`) registered on both. Logged into both
studios (owner passwords pulled from the registered key stores) and set up **real**
bidirectional subscriptions: `venkateshrao.com/blyg/` ↔ `blyg.protocol-institute.org`,
each resolving and confirming the other over actual internet HTTP, not a test fixture.
protocol-institute's initial backfill correctly pulled all 5 of venkateshrao's real
published items (verified via its `/studio/reading` page — 5 entries, all attributed
to "Venkatesh Rao's Blyg"). Published a new fragment live on venkateshrao, triggered
`POST /api/subscriptions/{id}/resync` on protocol-institute's side, and watched it
land (`{"ok":true,"changed":1}`, content confirmed present in the reading feed) — the
actual multi-node pub-sub loop Venkat has wanted since session 11's release-bar framing.

One non-obvious hiccup, recorded for future curl-driven sessions: the owner passwords
for both nodes contain `+` and `/` characters (base64-ish, generated per
`security-policy.md`), and `curl -d "password=…"` does **not** URL-encode the value —
`+` silently becomes a space on the server's form-decode, so login failed with no
useful error until switching to `curl --data-urlencode`. Also hit Cloudflare's edge
cache (public routes carry `Cache-Control: public, max-age=60`) serving a stale
pre-deploy manifest for ~60s after each deploy — resolved by cache-busting with a
throwaway query param, not a real problem.

**State after:** v0.2 "Roots" is fully implemented, tested, deployed, and *proven live*
— both nodes running the new code, migration 0004 applied to both, subscribed to each
other, backfilled, and confirmed converging on a real publish + resync round-trip. The
roadmap's v0.2 exit criteria (two live nodes converging) is now actually met, not just
implemented — `docs/roadmap.md` updated accordingly. Cron will carry ongoing
convergence going forward at the registered 15-minute interval; not yet manually
observed (would require waiting out a real interval), but the underlying poll path is
identical to what `resync` just exercised successfully.

**Open threads:** the legacy-RSS leg of the roadmap's three-way exit criterion (blyg +
blyg + one legacy feed) isn't set up yet — pick a real external RSS feed and subscribe
one node to it when convenient; not blocking, the L0 path is already fully tested in
isolation (task 6). Neither node has anything in its blogroll or a public hopper yet
(the plumbing is live and tested, just unused) — worth flagging one item public on one
side as a demonstration when there's real content worth curating. The
`"unrecognized-transition"` fallback cells in `transition.ts` are still worth a quick
Fable sanity-check if they ever actually fire in production logs (they shouldn't,
under honest origins).

## Session 12 — 2026-08-10 — Snapshot №1 live; v0.2 + TK-core designed; decisions #17–#21
**Model:** Sonnet 5 (task 7 execution), then **Fable 5** via `/model` (all design work) · **Time:** ~10:00–10:50 PT · **Committed:** yes (both repos) · **Deployed:** `blygger-org.pages.dev` ×2 — snapshot №1 (`/spec/0.1/2026-08-10/`), then the revised spec status header

**Sonnet half — task 7 closed:** Session 11 held task 7 (first real snapshot) for explicit go-ahead; Venkat gave it at session open. Verified both repos already clean/pushed (session 11's push-hold had been cleared before this session — "push held" open-thread wording can outlive the actual push). `sync_spec.py snapshot` tagged + pushed `spec/0.1/2026-08-10`, wrote the dated page, regenerated latest's Previous-version link + `/spec/` index. **Deploy hiccup, caught:** first attempt used `./deploy.sh --no-build`, which correctly skips sync+rebuild — so it redeployed session 11's stale `dist/` without the snapshot. Caught via `dist/` mtimes, redone with plain `./deploy.sh`, all three URL shapes verified live. Lesson: `--no-build` is never right after `sync_spec.py snapshot` (which only touches `content/`).

**Fable half (post-`/model` switch), four design deliverables:**

**1. v0.2 "Roots" plan** (`docs/v0.2-plan.md`; decisions #17–#18) — both roadmap ⚠️ FABLE items resolved. Resolution algorithm (#17): deterministic bounded probe order (direct manifest → `<blyg:manifest>` feed-upgrade → one-hop `rel="blyg"` → conventional mounts → RSS/L0); **subscription identity = final fetch origin, never self-asserted `site`** (mirrors can't inherit identity). Importer (#18): **the archive index is the reconciliation surface, the feed a cheap trigger** — gaps/skew/malformed-feeds degrade to an index diff, never loss; **no-silent-regression watermark** (history rewrites are surfaced, user-reset only); **retention past withdrawal follows the origin's own serving surface** (pinned versions retainable, everything else rolls to null — settles hopper-copy-vs-withdrawal); blogroll = plain OPML 2.0, zero extensions (feed-upgrade makes standard OPML blyg-transparent). Transition function specced as a pure table-driven function; 14 Sonnet-safe tasks; exit = the two live nodes + a legacy feed converging through simulated outages.

**2. Versioning question closed (decision #19, TN-1):** Venkat proposed semver for future auto-pin heuristics. Rejected — the +1 discipline is load-bearing for #18's watermark; the counter is wire-permanent surface; semver encodes API semantics prose lacks. Counter-proposed an additive `edition` field; **Venkat rejected that too, on design-intent grounds: an edition bump is cheap talk; a pin is a costly signal** — publishers should think consciously in pins, not version-structure skeuomorphism. Auto-pin dissolves into pin-suggestion studio UX (fourth leg: significance markup, like AI/identity/editorial convenience, is never in the protocol). Recorded as `docs/notes/tn-1-versioning-and-pins.md` — the first **technical note**, a new genre (numbered, non-normative design-reasoning records, especially rejected designs); publishing pipeline to `blygger.org/notes/` planned as `spec-publishing-plan.md` §5 (Sonnet-safe, not executed).

**3. TK-core plan** (`docs/tk-core-plan.md`; decision #20; amends locked #6's build order with Venkat): Venkat wants usable TK + multi-node pub-sub ASAP. Pub-sub = v0.2's exit criterion, already next. TK's authoring core depends only on v0.1 machinery, so **v0.4 split and TK-core pulled ahead of v0.3** (build order now v0.2 → TK-core → v0.3 → v0.4-remainder; matches the session-11 release bar of TK + pubsub). The contract: **two-layer split** — TK grammar (`[TK instruction][=]output[/TK]`, inline or block, no nesting, both item kinds) is studio-private and never reaches the wire; published `content_md` is marker-free ordinary markdown (hash covers what readers read), provenance via item-doc `generated[]` + baked `blyg-tk-gen` class, mirroring transclusion's two-plane pattern (amends the session-7 §4 inert-markers lean). **Quote-vs-source rule resolves the session-11 inline question without touching #9:** own-line `![[id]]` outside scopes = transclusion (verbatim quote), any `![[id]]` inside a scope = generation source (woven, disclosed, never a blockquote); scopes compose with transclusion by exclusion. Publish with unresolved scopes errors; generation is always an explicit author-reviewed act. One provider-call interface for all hooks (reference targets Anthropic Messages API; implementing session loads the `claude-api` skill). 8 Sonnet-safe tasks.

**4. Development-phase strategy (decision #21, Venkat):** building the reference implementation **is** testing the protocol. Every spec version < 1.0 is a working draft — no pre-1.0 version is ever declared stable (supersedes freeze-0.1-at-stable; #15's "freezes at stable" amended). **v1.0 is the first version we stand behind**, published to a larger audience at a deliberate release event; until then spec users/builders should assume no promises, including the wire (the #14/#16 wire-permanence discipline manages *our* migration cost, it's not an outsider guarantee). Testing cohort: Venkat alone on the two nodes, possibly a few invited testers pre-1.0, no open beta. Documented in the spec's status header (public-facing, deployed this session), `roadmap.md` "Development-phase strategy," and #21.

**State after:** Snapshot №1 + revised status header live on blygger.org. Every Fable item designable at this point is designed: v0.2 and TK-core are implementation-ready plan docs; remaining ⚠️ FABLE gates are filter-plugin API (needs v0.2 built), webmention mechanics + DAG semantics (v0.3 plan), staleness-over-DAG (needs v0.3). Locked decisions now run #1–#21.

**Open threads:** Next sessions are Sonnet implementation work: `v0.2-plan.md` (14 tasks — gates pub-sub testing) and `tk-core-plan.md` (8 tasks — independent of v0.2, order per Venkat's preference), plus the small `spec-publishing-plan.md` §5 notes pipeline in `blygger-org`. Venkat will have TK/v0.2 design feedback only after trying the implementations — expect testing-driven spec revisions per #21. Open decisions parked in the plans: v0.2 §7 (poll interval, import depth, hopper-page timing), TK §8 (disclosure strength, `.blyg-tk-gen` styling, build order vs v0.2).

## Session 11 — 2026-08-09 — Route bugfix; PI org node deployed; spec publishing automated
**Model:** Sonnet 5 · **Time:** ~14:15–16:05 PT · **Committed:** yes (blygger-spec + blygger-org; push held for this wrap-up) · **Deployed:** `blyg.protocol-institute.org` (new); `blyg.vgr-702.workers.dev/blyg/` decommissioned

**What & why:** Venkat resumed testing the two nodes from session 10 and hit two bugs: `venkateshrao.com/blyg` (no trailing slash) 404'd, and the public page showed no login/nav link. The second was by design (decision #3 — studio deliberately unlinked from the public page — explained, not fixed). The first was real: Cloudflare's Workers Routes `/*` wildcard requires the literal trailing slash and doesn't match the bare prefix, so `/blyg` fell through to the underlying Pages site's 404 instead of ever reaching the worker. Fixed by adding exact-match route entries (`/blyg`, `/studio`, `/api`, no wildcard) alongside the existing wildcards in `wrangler.jsonc`'s `venkateshrao` env, redeployed, verified both forms 200/302 correctly.

**Protocol Q&A, recorded as input for the v0.4 Fable pass:** Venkat asked how transclusion syntax should support inline, instructed AI generation (e.g. "As Einstein said, ![[id]], instruction: simplify..."). Walked through why that's incompatible with the locked block-level `![[id]]` grammar (decision #9) and the frozen v0 spec's `[TK]...[/TK]` scope concept, then recorded the concrete tension — inline-vs-block-only TK scopes — as `docs/proposals/curation-discovery-generation-proposal.md` §4 item 6, flagged for Fable, not resolved here (routing rule: don't improvise protocol semantics as Sonnet).

**Release-scope conversation, also just recorded:** Venkat deferred all UI feedback until TK-transclusion + cross-blyg subscribe/pubsub work, and separately named the release bar for "blygger is ready to release" as a stable spec plus **two** reference implementations — this Cloudflare one, and a not-yet-designed local/laptop folder-based implementation deploying to static hosts (GitHub Pages, Netlify), gated on the CF client reaching TK+pubsub+UI-refresh "feature complete." Recorded in `docs/roadmap.md` (new "Release candidate" section between v0.5 and v1.0, plus a deferred UI-refresh bullet added to v0.5) and mirrored in `CLAUDE.md`'s TODO — explicitly marked as Venkat's scope/sequencing intent, not a locked Fable decision.

**Second two-node-network node — deployed to `blyg.protocol-institute.org`, not `protocol-institute.com`:** Venkat asked to mount the second test node on the existing `protocol-institute.org` Cloudflare zone (already onboarded, unlike `.com`) rather than continuing to wait on `.com` DNS. Investigation found `.org`'s root path space is taken by a live production API (member directory, symposium voting, admin — 25+ routes via Cloudflare Pages Functions at `/api/*`), and blyg's own `/studio`+`/api` routes are host-rooted regardless of `MOUNT` (by design, `index.ts`) — path-mounting there would have hijacked PI's real API. Proposed and got sign-off on a dedicated subdomain instead (`blyg.protocol-institute.org`, `MOUNT=""`), which has its own path space entirely. Provisioned under the **PI org Cloudflare account** (`7e8c7969b2464d23795c555bc6a32af8`), not Venkat's personal one — confirmed explicitly via `wrangler whoami` with the PI org token before touching anything, per Venkat's direct instruction to double check. D1 + R2 provisioned, 3 migrations applied remotely, `OWNER_PASSWORD`/`COOKIE_SECRET` generated and set, worker deployed. Registered new resources/secrets in `protocol-institute/admin/keys.md` + `protocol-institute/.env.keys` (not `Code/.env.keys` — PI's own convention, confirmed from that repo's `website/CLAUDE.md`).

DNS was the remaining gap: the PI API token has Workers Routes permissions but no DNS scope (confirmed both by a failed API call and by the zone's own token-permissions list) — Venkat added the record manually in the dashboard. One wrinkle along the way: Venkat saw a "custom domain" entry in the dashboard before any DNS record existed, which turned out to be the plain zone Route already created (confirmed via the Workers Routes API — the dashboard's per-worker triggers view doesn't clearly distinguish a Route from Cloudflare's separate, DNS-auto-provisioning "Custom Domains" feature, which had zero entries for this hostname via its own API). After the real DNS record went in, full server-side verification passed (manifest, feed.xml, studio login redirect) — resolution briefly appeared broken locally due to macOS's negative DNS cache, not the deployment; bypassed with `curl --resolve` to confirm the server side independently of the client cache.

**Decommissioned the workers.dev rehearsal instance:** with both real two-node-network nodes now live, Venkat asked to retire `blyg.vgr-702.workers.dev` (session 10's rehearsal deploy, never attached to a real domain). Checked it wasn't empty first (4 throwaway test items, R2 bucket empty) before confirming full-teardown scope with Venkat; deleted the Worker, D1 database, and R2 bucket from the personal Cloudflare account. `wrangler.jsonc`'s now-orphaned top-level block annotated so a future bare `wrangler deploy` doesn't silently attempt to reuse dead resource ids. Cleaned the matching `BLYG_REF_*` secrets out of `Code/.env.keys`.

**Fixed the `feed.test.ts` flake** (long-standing fast-follow item): `feedEvents()`'s `ORDER BY` only tiebroke on `version DESC` after `published_at DESC`, so same-second events with also-tied versions across different items could sort nondeterministically. Added `v.rowid DESC` as a third tiebreaker — monotonic with insertion/publish order, resolves ties correctly. Full suite green (67/67); `feed.test.ts` run 5× standalone to build confidence.

**Executed `docs/spec-publishing-plan.md` (tasks 1–6 of 7):** `blygger-org/sync_spec.py` (new, stdlib-only) is now the sole writer of `blygger-org/content/spec/` — latest mode surgically rewrites the This/Latest/Previous-version header bullets (via new `<!-- spec-links:begin/end -->` markers added to `docs/protocol-v0.1.md`, markers only per task 4) while passing every other header bullet through verbatim, adds a generated-file banner + footer provenance stamp (source commit sha, no wall-clock timestamp — kept idempotency clean), and also (re)generates `content/spec/index.md` (version/status table, snapshot list with GitHub compare links, reference-implementation section gated on a `ref-v*` tag existing). Snapshot mode refuses on a dirty or unpushed `blygger-spec` tree, refuses to overwrite an existing dated dir, tags+pushes `spec/{version}/{date}` in `blygger-spec`, and regenerates latest's Previous-version link. `blygger-org/build.py`'s previously fully-hardcoded two-page build replaced with a recursive walker over `content/spec/` (depth-driven title/description/rail derivation, since the tree shape — index / version / version+date — is fixed). `blygger-org/deploy.sh` fixed per task 1: no longer hardcodes the Cloudflare token/account id (already registered generically in `Code/.env.keys`), reads them with a clear failure if unset, runs `sync_spec.py` before `build.py`. Verified: idempotent latest-mode output (byte-identical across repeated runs), snapshot mode's dirty-tree refusal, full local build producing the correct `dist/` tree with correct titles/prompts. **Task 7 (cut the actual first snapshot) deliberately not done** — it requires pushing `blygger-spec`, pushing a public tag, and a live `blygger.org` deploy, which Venkat asked to hold for this wrap-up rather than doing mid-session.

**State after:** Two-node test network is `venkateshrao.com/blyg/` (personal account) + `blyg.protocol-institute.org` (PI org account) — the workers.dev rehearsal is gone. `feed.test.ts` flake fixed. Spec-publishing automation is code-complete and locally verified but not yet exercised live (no snapshot cut, no `blygger-org` deploy this session). Two protocol-semantics questions are recorded for the v0.4 Fable pass (inline-vs-block TK scopes) and a release-scope plan is recorded for later (two reference implementations). `blygger-spec` and `blygger-org` both have local commits not yet pushed.

**Open threads:** Push `blygger-spec` + `blygger-org`, then decide whether to also finish task 7 (cut snapshot №1, deploy `blygger-org` live) now or in a later session — it was held specifically because of the push-hold, not because anything is blocking it technically. `protocol-institute.org`'s `CLOUDFLARE_API_TOKEN` has a long-standing unresolved rotation flag (pasted in a chat 2026-05-30, noted in `protocol-institute/.env.keys`) — flagged in passing, not acted on, not blygger's call to make. v0.2/v0.4 protocol work remains Fable-gated as before; nothing in this session unblocked it.

## Session 10 — 2026-08-06 — Task 11: reference deploy to workers.dev, then venkateshrao.com
**Model:** Sonnet 5 · **Time:** ~13:15–14:45 PT · **Committed:** yes · **Deployed:** `blyg.vgr-702.workers.dev/blyg/` (new) + `venkateshrao.com/blyg/` (new)

**What & why:** First deploy of v0.1 — the last remaining build task. Started the session by backfilling session 9's skipped DEVLOG entry (see below), then executed task 11 per `docs/v0.1-plan.md`: provisioned D1 (`blyg`, id `f9fbfd23-c0b8-40bc-b0df-eb80b992b5a4`) and R2 (`blyg-media`) under the `Vgr@ribbonfarm.com` Cloudflare account (`7026b5d7c1ad16cb808987576bb07ab2` — same account already used for `blygger-org`/`blygger-com`, confirmed against `Code/.env.keys` before provisioning rather than guessing between the two CF accounts logged into wrangler), applied all three migrations remotely, generated `OWNER_PASSWORD`/`COOKIE_SECRET` (`openssl rand`) and set them via `wrangler secret put` (never written to a `.dev.vars` or committed file), then `wrangler deploy`. `wrangler.jsonc`'s placeholder `database_id` swapped for the real one.

**Verification:** server-side, not just deploy-succeeded — curled the manifest (`blyg.json`, correct fields), `feed.xml` (valid empty RSS 2.0 channel with the `blyg:` namespace on first check), then ran a full owner loop against the live instance: `studio/login` (cookie auth) → `POST /api/items` (draft) → `POST /api/items/:id/publish` → refetched `feed.xml` and confirmed the item appears with the correct `blyg:{id}:v{n}` GUID scheme, and its `f/{id}/` permalink returns 200. One transient `error code: 1042` on the very first manifest/feed fetch immediately post-deploy, gone on retry seconds later — read as workers.dev edge propagation lag, not a bug (confirmed by the identical request succeeding on retry with no code change). Ran `tsc --noEmit` + the local test suite before touching Cloudflare at all, to confirm the session-9 rename hadn't regressed anything: clean, 66/67 (the one failure is the pre-existing `feed.test.ts` flake, unrelated).

Not done, and can't be from here: the plan's actual exit criterion is subscribing to `blyg.vgr-702.workers.dev/blyg/feed.xml` in a real RSS reader (NetNewsWire/Reeder) — that needs Venkat's own client. Left open below rather than claiming the task fully closed.

**Same session, second deploy — `venkateshrao.com/blyg/` (the actual two-node test-network node, not just a rehearsal):** Venkat asked to put the reference client on `venkateshrao.com/blyg` directly, per session 8's decision that this domain (not the blygger.org/com stub pair) is the first two-node test target. Followed `docs/deploy-stub-sites-plan.md`'s architecture (Workers Routes over a Pages catch-all) rather than the org/com plan's DNS-onboarding-first path, since `venkateshrao.com` was already a Cloudflare zone (confirmed via `venkateshrao-cloudflare/`) — the one prerequisite that plan calls the "long pole" was already satisfied. Before touching anything: confirmed which of the two Cloudflare accounts logged into wrangler was correct (`Vgr@ribbonfarm.com`, matching `venkateshrao-cloudflare/.env`) and confirmed `/blyg`, `/studio`, `/api` all 404'd on the live static site first (no path collision) — asked Venkat to confirm before provisioning or deploying, since this touches routing on a live personal domain, not a disposable test property.

Provisioned an **independent** identity from the workers.dev instance — separate D1 (`blyg-venkateshrao`, id `c9342724-d1d9-4337-9737-b3850d27c15e`), separate R2 (`blyg-venkateshrao-media`), separate `OWNER_PASSWORD`/`COOKIE_SECRET` — matching the org/com plan's explicit reasoning that these are separate identities, not shared credentials. Added a named `env.venkateshrao` block to `wrangler.jsonc` (non-inheritable keys — `vars`, `d1_databases`, `r2_buckets`, `routes` — must be redeclared per environment, confirmed this isn't implicit) with three Workers Routes (`/blyg/*`, `/studio/*`, `/api/*` on the `venkateshrao.com` zone), matching the plan's route-split table exactly. Migrated the new D1 remotely, deployed via `wrangler deploy --env venkateshrao`.

**Verification:** manifest, feed.xml, studio login, and `/api/items` draft-create all confirmed working on `venkateshrao.com` directly (not workers.dev); deleted the verification draft afterward (never published, so no feed/public-page footprint) since this is a real node, not a throwaway. Re-confirmed the static Pages site is completely unaffected outside the three claimed path prefixes — homepage and `<title>` still correct post-deploy. Same transient edge-propagation glitch as the first deploy (one stale response on `/blyg/feed.xml` immediately post-deploy, resolved on retry) — now recognized as a pattern (first-request-after-deploy on workers.dev/Workers-Routes edges), not something to chase further.

**State after:** v0.1 "Seed" has **two** live instances: the workers.dev rehearsal (`blyg.vgr-702.workers.dev`, one test fragment left on it) and `venkateshrao.com/blyg/` — the actual first node of the protocol's two-node test network, fully independent identity/data. `venkateshrao-cloudflare/routes.md` and `status.md` updated (cross-project bookkeeping — that repo is the canonical route registry for the zone). Both sets of secrets registered in `Code/.env.keys`. `README.md`/`docs/v0.1-plan.md`/`CLAUDE.md` updated for the workers.dev deploy; venkateshrao.com deploy recorded here and in `docs/deploy-stub-sites-plan.md`'s amendment banner.

**Open threads:** Venkat is testing the venkateshrao.com instance directly (studio login from any browser, not just this machine — auth is a single shared password + signed cookie, not device-bound; confirmed no local file storage, everything lives in D1/R2) before any further work proceeds — explicitly paused here, nothing else touched pending that. Once confirmed: the RSS-reader exit check (either instance) is still open; `protocol-institute.com/blyg/` is the second test-network node and remains undeployed (DNS for that domain was flagged in session 8 as the likely long pole); `docs/spec-publishing-plan.md` execution is still queued and unaffected by this session's work.

## Session 9 — 2026-08-05 — Vocabulary rule: blyg/blygger, `blygg` retired (decision #16)
**Model:** Fable 5 · **Time:** ~12:30–13:00 PT (backfilled 2026-08-06 — entry was skipped at session close) · **Committed:** yes · **Deployed:** — (blygger-org site redeployed with the renamed lede, per its own repo)

**What & why:** Venkat + Fable settled the wire-vocabulary spelling left open by session 8's mount-independence decision: the noun is **blyg** (one g, as *blog* is to *blogger*), retiring the intermediate `blygg` spelling everywhere, including the wire — manifest filename (`blyg.json`), JSON version key (`"blyg"`), XML ns prefix and GUID scheme (`blyg:`, `blyg:{id}:v{n}`), transclusion CSS class (`blyg-transclusion`), reserved autodiscovery rel (`<link rel="blyg">`). Amends #14's token spellings without touching its architecture — the wire/mount split stands; mount default stays `/blyg`, so path and filename now happen to agree as a convention coincidence, not a protocol linkage. Cost was zero: nothing is deployed yet (task 11's D1 id is still a placeholder), so this would have been a breaking wire migration after first deploy — the rename window closes once task 11 ships. Spec stayed DRAFT so no version bump was needed; decision recorded as CLAUDE.md #16.

**Implementation:** single commit (`d9ee250`) swept `blygg`→`blyg` across the spec, docs, wireframes, and the full `worker/` reference implementation (types, protocol/pages/studio/transclusion source, all test files, `package.json`). Historical records (`DEVLOG.md`, `RENAME.md`, `docs/ygg-initial-spec.md`) deliberately left unrenamed, matching the precedent set for the `ygg`→`blygger` rename in session 6. Sibling repos followed same-day: `blygger-org` rewrote its landing-page lede for the new spelling and redeployed; `blygger-com`'s stub site was renamed to match.

**Verification (backfilled):** re-ran the suite this session (2026-08-06) to confirm the rename didn't regress anything — `tsc --noEmit` clean, 66/67 tests green, the one failure is the pre-existing `feed.test.ts` timestamp-ordering flake already on record (not caused by this rename).

**State after:** All three repos (`blygger-spec`, `blygger-org`, `blygger-com`) consistently use `blyg`/`blygger`; no `blygg` spelling remains outside intentionally-frozen historical records. v0.1 build status unchanged — task 11 (deploy) is still the only open build task.

**Open threads:** Process gap, not a protocol one — this session's DEVLOG entry was skipped at close, breaking the "non-skippable" rule for the first time since project inception; backfilled next session (10) after the fact. No content was lost (git commit + CLAUDE.md decision record both landed same-day), but the ritual failed silently rather than being caught at session end. Worth a standing reminder to run the wrap-up checklist even on short/single-decision sessions.

## Session 8 — 2026-08-04 — Mount independence (decision #14); /blyg default; spec-publishing model (#15)
**Model:** Fable 5 (orientation + two-node distance analysis ran on Opus 5 before Venkat switched via `/model`) · **Time:** ~12:24–13:25 PT · **Committed:** yes · **Deployed:** —

**What & why:** Venkat wants a two-node test deploy network ASAP —
`venkateshrao.com` + `protocol-institute.com` (typo correction: the site
agent is building blygger.**org**, not .net; .com held in reserve). That
reframed the session: distance-to-network analysis (milestone A: two
publishing nodes = task 11 twice, code-complete; milestone B: nodes following
each other = v0.2, no subscribe code exists), then two protocol questions —
configurable mount, root-domain serving — answered and implemented.

**Decision #14 — mount independence (locked):** origin = any absolute base
URL (root, path, subdomain); surface strictly origin-relative; readers MUST
NOT infer anything from the mount. **Wire vocabulary formally split from
deployment lexicon:** `blygg.json`, `"blygg"` version key, `blygg:`
GUID/XML elements are protocol-permanent; the mount is per-deployment config
with reference default **`/blyg`** (Venkat's call, reversing Fable-as-Opus's
earlier keep-`/blygg` recommendation — the path/wire asymmetry
`/blyg/blygg.json` is now deliberate signal that the path is the deployer's
and the filename is the protocol's; the fixed filename is the discovery
anchor). Root mount = empty mount, first-class. Consequence: v0.2
autodiscovery may not probe a fixed path — roadmap line rewritten
(treat-URL-as-origin + `<link rel="blygg">` + conventional-mount fallback;
mechanics stay ⚠️ FABLE in the v0.2 plan). Amended #1/#13's incidental
`/blygg/` mentions (blogroll is origin-relative `blogroll.opml`, same logic
as manifest).

**Implementation (task 17):** `Env.MOUNT` wrangler var; `normalizeMount()`
(unset → `/blyg`; `""`/`"/"` → root); memoized `makeApp(mount)` factory —
public surface is a mount-relative Hono sub-app; `/studio`/`/api` stay
host-rooted, registered *before* the sub-app so its cache middleware can't
wrap them at root mount. Mount threaded through pages/studio link generation
+ `siteOrigin` fallback; feed provenance links derive from the canonical
origin's own path (stays correct when `site_url` overrides the serving
mount). Retires task 16's slug-drives-path conflation (RENAME.md amended —
also kills the `ygg`-substring sed hazard for paths). ✓ `tsc` clean, 67/67
green (58 migrated to `/blyg` + new `mount.test.ts`: root + multi-segment
mounts via `app.request` with real pool bindings; old default 404s;
`normalizeMount` units). Spec §1/§2/§4 + examples updated; plan §2–3
reworded with task-16 history left verbatim; deploy-stub-sites-plan got an
amendment banner (mount `/blyg`, targets now venkateshrao.com +
protocol-institute.com; org/com pair superseded as first deploy).

**Decision #15 — spec publishing model (locked):** blygger.org spec is
published at semantic versioned URLs (`/spec/{v}/` latest + `/spec/{v}/{date}/`
immutable snapshots + `/spec/` index), each snapshot paired to a
`spec/{v}/{date}` git tag in this repo, pages footer-stamped with source
commit; ref-impl releases (`ref-v*`) loosely coupled via stable Releases
URLs. **Spec-as-blygg rejected** (semantic-vs-opaque URL contract; wrong
shape for fragment primitives; normative text must not depend on the
machinery it defines); announcements-blygg + ceremonial 1.0 pin deferred to
v0.2+. `docs/spec-publishing-plan.md` written for Sonnet/Opus execution
(local-first: blygger-org Pages is direct-upload via deploy.sh, not
git-connected, so CI would deploy nothing — recorded as upgrade path).
Finding en route: `blygger-org/deploy.sh` hardcodes a CF API token —
verified gitignored, never committed/pushed (no incident, no rotation), but
violates `warnings-keys.md`; fix is plan task 1. Blygger-org agent's re-sync
of the stale spec publish copy verified landed + deployed before wrap-up.

**State after:** All v0.1 build tasks done except deploy (task 11); mount
config makes the two-node deploy a per-environment `MOUNT` var. Spec draft
now carries the mounting language and `/blyg` examples; blygger.org serves a
current copy. Two plan docs queued for cheaper models: spec-publishing
(unblocked) and the amended stub-sites deploy plan.

**Open threads:** task 11 → two-node deploy (`venkateshrao.com/blyg/` +
`protocol-institute.com/blyg/`; DNS for protocol-institute.com is the long
pole — venkateshrao.com is already on Cloudflare); execute
spec-publishing-plan incl. deploy.sh token fix, then cut spec snapshot №1;
v0.2 plan doc (⚠️ FABLE: importer state machine + autodiscovery mechanics
per #14); Venkat's review of the L1 spec normativization calls still
pending; feed-flake + scrubber fast-follows unchanged.

## Session 7 — 2026-08-03 — Curation/discovery decisions; L1 spec drafted; blygger.org content
**Model:** Fable 5 (state check ran on Opus 4.8 before Venkat switched via `/model`) · **Time:** ~11:00–11:50 PT · **Committed:** yes (2 repos) · **Deployed:** —

**What & why:** Protocol-design session. Venkat wanted three things settled
before Opus builds further: what "make-public" means for imported items, the
discovery story, and where the AI-generation hardpoints live — all governed by
his named frame: **treat publishing the way GitHub treats code** (quiet
watching, public forks and citations, no comment threads).

**Decisions (locked #12–13; record in
`docs/proposals/curation-discovery-generation-proposal.md`):**
(1) **Make-public = curation display only** — supersedes the roadmap's
"retweet-like" wording: a made-public import appears on a public hopper page
from the local snapshot, **never re-emitted on the feed** (re-emission collides
with `blygg:id` rollup + the single-publisher invariant; and feed-speech about
others' content costs editorial — that's the stub). (2) **No tags, no canned
phrases in protocol** — hoppers are the taxonomy, stub templates are studio
sugar; third leg of the pattern: *editorial convenience, like AI and identity,
is never in the protocol*. (3) **Discovery = two planes, both L2 and
optional**: static plane = curated OPML blogroll (`blogroll.opml` + manifest
key, v0.2; explicitly no completeness claim — a blogroll is a publishing act,
not a follower-graph leak); notification plane = **Webmention** (W3C, reused
not invented; pingback/trackback rejected as dead-of-spam/legacy) with
**structural verification** — receiver fetches the source item JSON and checks
it actually names the target, which kills the trackback spam hole; verified
mentions are studio signals feeding detect-stubs, never auto-published. This
closes a real gap: without mentions, detect-stubs only sees stubs from feeds
you subscribe to — quietly reinventing mutual-follow. (4) **"Follow" is
deliberately nothing** — subscription stays client-local/invisible; the public
graph is blogrolls (outbound) + verified stubs (inbound). ActivityPub rejected
(actor model vs decisions #5/#11), WebSub orthogonal, directories
ecosystem-side. Acknowledged carve-out: the Webmention receiver is the
protocol's **first dynamic surface** — optional-at-L2, "just files" stays the
L1 floor. (5) **v0.4 pre-records (leans, not locked):** fragment-level
generate/regenerate hardpoint added (v0.4 was thread-centric); all generation
hooks share one provider-call interface; lean that generated text lands in
`content_md` (hash/pin must cover what readers read) with TK markers as inert
annotations; disclosure-of-generation left open for the v0.4 pass.

**L1 spec drafted (`docs/protocol-v0.1.md`, DRAFT)** — ahead of the "after
v0.1 ships" gate, deliberately: Venkat wants it publishable on the placeholder
site. Normative, RFC 2119, 13 sections; folds in everything the CLAUDE.md TODO
listed (session-2 feed interpretations, withdraw/pin, session-4 presentation
rules, session-5 version-nav + author). Normativization judgment calls flagged
to Venkat: feed window RECOMMENDED 50, fragment cap RECOMMENDED 2000 with
readers-MUST-NOT-reject, CORS as SHOULD, and §11 pulls the v0.2 rollup rules
forward as normative reader conformance. Freezes at `blygger.org/spec/0.1/`
only when the deploys land.

**blygger.org content:** `blygger-org/content/` created — `overview.md`
(landing-page overview: GitHub-precedent table, soapboxes-not-conversation,
mutable-by-default/immutable-by-choice, AI-native/AI-free-wire, discovery) +
`spec/0.1/index.md` (publish copy; canonical stays in `blygger-spec`, rule in
`content/README.md`). Roadmap v0.2/v0.3/v0.4 sections updated; CLAUDE.md
locked decisions #12–13 + doc map + TODOs updated.

**State after:** All protocol semantics through v0.3 discovery are now
decided-and-recorded; v0.4 has a pre-record. The spec exists as a publishable
draft. Build state unchanged: task 11 (deploy) still the only open v0.1 build
task; stub-site deploy plan still unexecuted — but blygger.org now has real
content waiting.

**Open threads:** Venkat to review the spec's normativization calls and the
overview's public voice ("No replies. Ever."; TK as flagship) before deploy;
webmention mechanics (retry/dedupe/endpoint shape/rate limits) are a v0.3
⚠️ FABLE item; blogroll OPML shape goes in the v0.2 plan doc; task 11 +
stub-site deploys unchanged; feed-flake + scrubber fast-follows unchanged.

## Session 6 — 2026-07-24 — Rename ygg → blygger; 3-repo container; stub-site deploy plan
*(Heading restored session 8 — the entry below was committed without it, visually merging into session 7's. Content untouched.)*

**Model:** Sonnet 5 · **Time:** ~17:30–18:00 PT · **Committed:** yes (3 repos) · **Deployed:** —

**What & why:** Venkat made the brand decision session 3 flagged: protocol renamed
`ygg` → **blygger**, default publish path `/ygg` → `/blygg`, domains `blygger.org`
(XML namespace, commons/spec-adjacent) and `blygger.com` (protocol-adjacent
commercial dev) acquired. This session executed the full chain that decision
gated: task 16 (brand refactor), the physical rename (folder + GitHub repo), new
scaffolding for the two site repos, and a deployment plan for both.

**Brand refactor (task 16, executed for real rather than left speculative):**
`worker/src/types.ts` gained a single `BRAND` constant (`{name: "blygger", slug:
"blygg", nsUri: "https://blygger.org/ns/0.1"}`) driving `GENERATOR` and, via a
case-sensitive blind sed pass across `worker/src`, `worker/test`,
`worker/scripts`, `wrangler.jsonc`, `package.json`, and living docs, everything
else: URL prefix, manifest filename, JSON version key, GUID scheme, XML
namespace + elements, cookie name, CSS class prefix. Real namespace URI resolved
`v0.1-plan.md` §7 open decision #1 (was a GitHub-URL placeholder). Renamed
`YGG_VERSION`/`YGG_LEVEL`/`YGG_NS` to `PROTOCOL_VERSION`/`PROTOCOL_LEVEL`/
`BRAND.nsUri` (only `protocol.ts` imported them). Verified: `tsc --noEmit`
clean, 57/58 tests green (the one failure reproduced as the pre-existing
`feed.test.ts` timestamp-ordering flake on a rerun with no code changes —
confirmed unrelated to the rename, not the rename itself).

**Scope trim, recorded not silent:** task 16's original acceptance check was "set
the brand constant to `zzz`, full suite still passes" — written when the name
was still speculative. Now that it's final, full constant-import purity in
`pages.ts`/`studio.ts`/`transclusion.ts` (~40 call sites with literal `/blygg/`
links and `blygg-transclusion`/`.blygg` CSS classes rather than importing
`BRAND.slug` at each site) wasn't worth doing. `RENAME.md` documents this and
gives the correct sed-based procedure if a rename ever happens again, including
a real gotcha hit mid-session: sed must run *before* any hand-written text
containing the new brand strings exists, since the new slug/name contain the old
one as a substring (`ygg` is inside `blygg`/`blygger`) — running it after
corrupts them. Also caught and fixed by hand: the blind sed pass mangled
**"Yggdrasil"** (the mythological tree, unrelated proper noun) into
"Blyggerdrasil" in three prose spots — fixed, and `README.md`'s "Named for
Yggdrasil" line extended to note the resemblance is literally what prompted this
rename.

**Docs:** `CLAUDE.md`, `README.md`, `docs/v0.1-plan.md`, `docs/roadmap.md`,
`docs/proposals/*.md`, `docs/wireframes/*.html` renamed throughout (path/machine
tokens → `blygg`, brand-name prose → `blygger`). Two deliberate exceptions,
each getting a banner/title note instead of a body rewrite:
`docs/ygg-initial-spec.md` (frozen v0 spec — keeps its historical name and
filename permanently) and `DEVLOG.md` (this file — session entries before 6 are
not retroactively edited; a log that lies about what was true when it was
written stops being a log). README's multi-tenancy paragraph also updated to
match the session-5 single-*publisher* (not single-author) invariant, which
predated this session's edits but was still phrased in the old terms.

**Physical rename:** `Code/ygg/` moved to `Code/blygger-protocol/blygger-spec/`
(git history intact, verified `tsc --noEmit` clean from the new path —
`worker/node_modules` is already Dropbox-ignored via `com.dropbox.ignored`
xattr, so the move didn't trigger a sync storm). GitHub: `vgururao/ygg` →
`gh repo rename` → `vgururao/blygger-spec` → `gh api .../transfer` (no `gh repo
transfer` subcommand exists in this CLI version) → `blygger/blygger-spec`,
confirmed via polling since the transfer API is asynchronous. Local remote
updated, pushed.

**New scaffolding:** `blygger-org/` and `blygger-com/` created as sibling repos
under `blygger-protocol/`, each following the `Code/_template/` new-project
convention (`CLAUDE.md`, `status.md`, `.gitignore`, `LICENSE`, `README.md`) —
currently pure stubs, no site content. Created as `blygger/blygger-org` and
`blygger/blygger-com` on GitHub, public, `main` default branch (hit and fixed
two small GitHub-CLI friction points: `git init` defaults to `master` locally
so both needed a branch rename to match `blygger-spec`'s convention; a failed
first `gh repo create` for `blygger-com` — run from the wrong directory,
`--remote=origin` collided with `blygger-org`'s existing remote — had already
created the GitHub repo before failing locally, so the retry had to detect and
reuse the existing empty remote rather than recreate it). `Code/CLAUDE.md`'s
project table updated to describe `blygger-protocol/` as a 3-repo container
(pattern borrowed from `worldmachines/`); `Code/status.md` got a Done entry.

**Deploy plan (not executed):** `docs/deploy-stub-sites-plan.md` — both domains
get a stub landing page (Cloudflare Pages, git-connected) plus a live `/blygg`
deployment of the *unmodified* reference worker (Workers Routes split:
`<domain>/blygg/*`+`/studio/*`+`/api/*` override a `<domain>/*` Pages
catch-all by path specificity — no code changes to `blygger-spec` needed). Two
new named Wrangler environments (`org`, `com`) in `wrangler.jsonc`, each with
independent D1/R2/secrets. The two live instances double as the protocol's
first real cross-client pair once v0.2 ships subscribe. Recommends running
task 11's workers.dev deploy first as a low-cost rehearsal of the same
`wrangler deploy` mechanics.

**State after:** v0.1 unchanged functionally — this was a naming/infra session,
zero protocol-semantics or behavior change. `blygger-protocol/` now holds three
repos (`blygger-spec` with full history, `blygger-org` and `blygger-com` as
fresh stubs) all under the `blygger` GitHub org. Task 11 (deploy) is the only
open v0.1 build task and is no longer gated on anything. Stub-site deploy plan
exists but is unexecuted.

**Open threads:** execute `docs/deploy-stub-sites-plan.md` (DNS onboarding is
the long pole — registrar nameserver changes aren't instant); task 11 deploy,
still open, now recommended as a rehearsal before the org/com deploys;
`warnings-node.md` at the `Code/` level is stale (says "only one project uses
Node," predating both `blygger-spec/worker` and the two new stub repos) — not
fixed this session, flagged for a future meta-admin pass; the feed-test flake
and scrubber-removal fast-follows from earlier sessions are unchanged and still
pending.

## Session 5 — 2026-07-24 — Author field (minimalist multiplayer); version-nav gap resolved
**Model:** Fable 5 · **Time:** ~17:10–17:30 PT · **Committed:** yes · **Deployed:** —

**What & why:** Pure protocol-semantics session, no build. Two decisions locked with Venkat.

**1. Author/identity model (locked decision #11; `docs/proposals/author-field-proposal.md`, ACCEPTED).**
Venkat wanted conservative multiplayer-client support without ygg becoming a social
protocol. The design separates two constraints the frozen spec (items 33–34) had fused:
one feed = one **publisher** (load-bearing: one origin, one accountable client, DNS as
namespace, no `user@server`) survives; one feed = one *author* is dropped. The mechanism
is a reinterpretation of the **already-existing** per-item `author` member — optional,
client-asserted, opaque (open object: `name` recommended, `url` optional, all other
members = the client's private *authorspace grammar* — local ids, OAuth subjects, wallet
sigs, whatever), origin-scoped (`(origin, value)`; no cross-origin equating), **never
addressable** (permanent anti-commitment: no registry, no author-mention grammar, no
per-author feed requirement, no verification), pass-through verbatim by importers.
Governing symmetry, worth remembering as the design generator: **identity, like AI, is
never in the protocol** — auth machinery lives in the unconstrained studio, the page
publishes the resulting assertion. Structural freebie found during design: `content_hash`
covers `content_md` only, so `author` was already outside the pin-integrity promise —
serve-time (ref impl, settings) and publish-time (multiplayer, per-version) assertion
strategies are both conformant. Feed side: optional `<dc:creator>` byline for L0 readers;
the opaque object never enters XML. Zero rename, zero shape change, zero v0.1 build work;
single-player is the degenerate case (constant author-assertion). Edits landed in
`v0.1-plan.md` §§2.3/2.4/2.6/2.8, roadmap (new cross-cutting invariant 6, v0.3
pass-through deliverable, post-1.0 multi-tenant rewrite), CLAUDE.md decision #11.

**2. Version-nav gap → indicator, not navigation (`v0.1-plan.md` §2.8).** Session 4's
flag resolved as option 3 of 3 (full history browsing rejected — guts
withheld-unless-pinned; pinned-only HTML route rejected — a forever-URL for an
undemonstrated need, addable post-v0.1 purely additively): **no historical-version HTML
route ever in v0.1**; pins stay JSON-only; the rev-3 scrubber is dropped outright in
favor of discrete pin citations ("v6 · pinned: v2, v4" linking existing `v{n}.json`).
Conceptual grounding that decided the UI form, per discussion: pins are *not* fork points
(decision #8 — they're the only *eligible* fork sources once `forked_from` lands in
v0.3); browsing pins is browsing a sequence of frozen citable artifacts of one identity,
not paging one document — so links-to-citations, not arrows. Also clarified for the
record (already implied by §2.3 but easy to misread): what's withheld is unpinned
*content*; the changelog — versions, timestamps, edit notes — is public permanent
metadata. Retention has three layers: live content (latest only), history-as-metadata
(full, forever), history-as-content (pinned only).

**State after:** v0.1 unchanged functionally and still complete; spec docs now carry the
author semantics and the version-nav resolution. Both session-4 Fable flags cleared.
Ship remains gated only on the brand decision.

**Open threads:** Venkat's brand decision (→ task 16 → domain/namespace → task 11
deploy). Sonnet-safe fast-follows: feed-flake tiebreaker; scrubber removal + pin-links UI
+ wireframe update (new TODO). `protocol-v0.1.md` fold-in list grew: author decision
record, version-nav resolution.

## Session 4 — 2026-07-24 — Threads shipped (tasks 13–15); studio UI built; public pages brought to rev-3
**Model:** Sonnet 5 · **Time:** ~13:34–14:40 PT · **Committed:** yes · **Deployed:** — (task 11 still pending)

**What & why:** Opened by re-checking the rev-3 wireframes from session 3 (withdraw/pin +
threads) against `v0.1-plan.md` — they already matched the new spec, so Venkat reviewed
the existing set live in-browser rather than a rebuild, and approved it. That cleared the
task-9/15 gate, so this session built the full remainder of v0.1: threads end-to-end and
the studio UI, plus the rev-2/3 public-page changes that task 8 had shipped against the
rev-1 mockup only.

**Threads (tasks 13–14), §2.9:** migration 0003 adds `versions.content_html` and
`versions.transclusions`. New `src/transclusion.ts` implements the locked `![[id]]`
grammar as a line-walker shared between two callers: `resolveTransclusions()` (strict,
used by `model.publish()` — throws `TransclusionResolveError` listing every bad reference
if any directive fails, aborting the whole publish) and `previewTransclusions()`
(studio-only, never aborts — renders a red "unresolvable" placeholder per bad directive
instead, so the editor can show what publish will reject before the author hits publish).
`model.ts` gained `authoredKind()` — an item's real kind ('fragment'/'thread') independent
of the transient `'withdrawn'` state; for a withdrawn item it's derived from the last
real (non-endcap) version's `transclusions` column, since `items.kind` itself is
overwritten to `'withdrawn'` and can't be trusted. `publish()` now resolves transclusions
and bakes the snapshot into `content_html` for threads, and (as a side effect of storing
`content_html` at publish time for *every* version, not just threads) fragments' rendered
HTML is now precomputed at publish rather than re-rendered per request — pinned
fragment/thread version files now serve the stored value directly. `f/{id}/` and `t/{id}/`
routes now 404 on kind mismatch (via `authoredKind`), so a thread id never resolves at the
fragment permalink or vice versa.

**Protocol-locked vs. presentation, a decision worth recording:** §2.9 only specifies the
`blockquote.ygg-transclusion` + `data-ygg-id`/`data-ygg-version` wrapper as baked
`content_html` — no provenance link. The wireframe's "fragment ↗ · snapshot of vN" line is
therefore presentation, not protocol: `pages.ts`'s `injectProvenance()` adds it after the
fact (root-relative link, matching every other HTML link in this codebase) for the thread
page and, pre-`absolutizeHtml`, for feed.xml's self-contained thread entries — but never
touches the stored `content_html` itself. Item JSON's `content_html` field for threads is
the bare baked blockquote, no provenance.

**A withdrawn thread's `transclusions` field:** implemented as present-but-`[]` (matching
the "empties `content_md`/`content_html`/`media`" pattern for the endcap), while withdrawn
*fragments* carry no `transclusions` field at all — matching §2.3's "thread items
additionally carry" framing. Distinguishing withdrawn-thread from withdrawn-fragment
required `authoredKind()`, since `item.kind` alone is just `'withdrawn'` at that point.

**Studio UI (task 9) + thread editor (task 15):** built directly against
`docs/wireframes/studio.html`/`edit.html`/`thread-edit.html` — server-rendered HTML +
vanilla JS calling the existing `/api/*` endpoints (no client framework, per CLAUDE.md).
Composer (quick-post, creates-then-optionally-publishes), item list with state dot/dirty
flag/kind chip/pin+withdraw+republish actions, fragment editor (textarea + live preview via
a new studio-only `POST /studio/preview`), settings page. Thread editor adds: live preview
via `POST /studio/preview-thread` (the `previewTransclusions` placeholder variant), a
`![[` fragment-search palette (`GET /studio/fragments/search`, arrow-key/click select,
inserts `![[id]]` on the current line), and a publish error banner rendering each bad
reference by directive + reason. These three studio-only routes are authoring-tool
internals, not protocol surfaces — consistent with the studio/page split (studio side is
unconstrained). "Attach image" (both editors) uploads via the existing `/api/media` and
reloads; the composer's attach button implicitly creates the draft first so it has an id to
attach to.

**Public pages brought forward to rev-2/3 (folds in the debt task 8 left, per CLAUDE.md
TODO):** `pages.ts` rewritten for the reviewed wireframe conventions — embeddable
`.ygg`-scoped block with a bare Home+RSS header (session-3 review: "the public page's
header is presumed content, not real navigation," deliberately dropping the inline
site-title/bio/author-links display that rev-1 had; that identity now lives only in the
manifest, feed channel, `<title>` tag, and studio settings), Created/Most-recent timestamp
lines, a version-nav scrubber, and a plain "Permalink" text link (dropping the ∞ glyph).
Feed page renders threads as excerpt cards (~300 chars of plain text) linking to `t/{id}/`;
fragments render in full as before.

**Real gap found and flagged, not silently fixed:** the version-nav scrubber implies
browsing to an older version's HTML, but §2.3 only publishes the *latest* version's content
(older content is withheld unless pinned, and pinned versions are JSON-only per §2.8 — there
is no route that serves a historical version as an HTML page). Implemented the scrubber as
display-only (all buttons disabled, showing "vN of N") rather than inventing a new route
un-reviewed — adding one (e.g. `GET /ygg/f/{id}/v{n}/`) is API-surface design, ⚠️ FABLE
territory per CLAUDE.md model routing, not a Sonnet call. Flagged below for Venkat/Fable.

**Second gap found, pre-existing, not caused this session:** `feed.test.ts`'s tests share
one D1 instance per file; second-precision timestamps plus `ORDER BY published_at DESC,
version DESC` (which only breaks ties *within* one item, not across different items sharing
a timestamp) can non-deterministically push a same-second single-version event outside the
50-entry window when an earlier test in the file has published many higher-versioned events.
Reproduced by rerunning `feed.test.ts` alone several times — different subtests fail each
run. Not touched (out of scope for tasks 13–15, and it's already-shipped session-2 core);
flagged as a fast-follow: add a monotonic sequence/rowid tiebreaker to `feedEvents()`'s
`ORDER BY`, or move to millisecond timestamps.

**Verification:** 58 tests (47 prior + 11 new thread tests), full suite green except the
pre-existing flake above; `tsc --noEmit` clean. Full owner loop driven live against
`wrangler dev` for both fragments and threads — compose/save/publish/pin/withdraw/republish,
settings save, palette search, bad-reference publish rejection with the error banner, and
discard — all verified in the browser-equivalent (curl) path, not just tests. Static export
re-run against the live instance and byte-compared: every surface matched exactly,
including the new `t/{id}/` thread page and pinned thread version files (invariant 4 holds
with threads included).

**State after:** v0.1 "Seed" is functionally complete — tasks 1–10 and 12–15 done; only
task 11 (deploy) and task 16 (brand refactor) remain, both already gated on Venkat's brand
decision. 12 tasks' worth of protocol + UI shipped and tested in one session.

**Open threads:** version-nav route gap (needs a Fable API-surface decision: add a
historical-version HTML route, or leave v0.1's scrubber display-only permanently — record
whichever in `protocol-v0.1.md`); the feed-test timestamp-ordering flake (fast-follow, not
urgent); brand decision still gates task 16 → domain/namespace → task 11 deploy, unchanged
from session 3.

## Session 3 — 2026-07-24 — Withdraw/pin protocol revision; threads into v0.1; rename question
**Model:** Sonnet 5 (wireframe feedback, proposal drafting) → Fable 5 (protocol decisions + implementation) · **Time:** ~12:15–13:30 PT · **Committed:** yes · **Deployed:** — (task 11 pending, now also gated on brand decision)

**What & why:** Started as wireframe review, became the biggest protocol session since inception. Venkat's rev-2 feedback (embeddable no-navbar public page, Created/Most-recent timestamps, |< < > >| version scrubber, dirty-state red flag, drop the ∞ glyph) led to "what does the tombstone do?" → discovery of a real gap: **silent unpublish-to-404 is indistinguishable from transient failure or never-existed** for any future subscriber. Sonnet wrote the analysis up as `docs/proposals/retract-pin-fork-proposal.md`; after a model switch, Fable adopted it with modifications (decision record in the proposal doc, locked as CLAUDE.md decisions #8–9):

1. **Withdraw replaces tombstone + unpublish** — no permanent delete of published items exists; the single exit is a permanent, *reversible* endcap (`kind: "withdrawn"`, empty content, 200 forever, one feed entry, compliant clients roll up to null). Working copy survives withdrawal (it governs the public surface, not the studio); republish = vN+1 same id. Draft discard stays a hard delete.
2. **Pins** — irrevocable per-version *hosting promises*: `items/{id}/v{n}.json` served forever, surviving edits and withdrawal. Only pinned versions are exposed (exposing all history would gut withdrawal); pins survive withdrawal by design ("reliably referenced"). IPFS mapping recorded in the proposal: item id ≈ IPNS name, content_hash ≈ CID, ygg inverts IPFS's default (mutable by default, immutable by explicit act) because it's an authoring medium. Media referenced by pinned versions must persist forever.
3. **Deviation from Venkat's original framing, flagged and accepted:** pinning does *not* force a fork. `forked_from: {id, version}` (must reference a pinned version) reserved in §2.3, lands v0.3.

Implemented same session: migration 0002, `withdraw()`/`discardDraft()`/`pinVersion()`, pin/withdraw API routes, per-version route, protocol/pages/feed/export updates. 47/47 tests; full loop driven against live `wrangler dev`; export byte-identical including pinned files. Gotcha for the record: `wrangler dev` doesn't auto-apply new migrations to the local dev DB (tests do) — `wrangler d1 migrations apply ygg --local`.

**Roadmap restructure** (reopening locked decision #6, with Venkat): **local threads moved from v0.3 into v0.1** so both core abstractions are tested in the first release — the transclusion grammar was one of the two highest-risk permanent surfaces and was previously scheduled *after* v0.2 importers hardened the network shapes. v0.3 is now "threads go cross-client" (stubs, nesting+DAG, remote snapshot semantics, forked_from). Three choices locked with Venkat: **fragments-only transclusion** in v0.1 (no cycles by construction), **`![[id]]` grammar** (own-line directives; `@vN` reserved; inline occurrences inert), **no auto-pin** (snapshot baked into self-contained HTML as `blockquote.ygg-transclusion` with `{id, version}` provenance; source withdrawal never cascades). Spec: new §2.9; schema delta specced as migration 0003 (`versions.content_html` — publish-time rendering so pinned thread versions serve historical snapshots — and `versions.transclusions` JSON); tasks 13–15 added (13–14 Sonnet-safe now; 15 rides the task-9 gate).

**Rev-3 wireframes** delivered: rev-2 set updated for withdraw/pin + two new views (`thread.html` public thread page — no title field in schema, authors use markdown H1; `thread-edit.html` — source/preview, `![[` search palette, unresolvable-reference error state).

**Rename question:** domain discussion (namespace URI is the load-bearing role, not downloads; .org preferred for commons governance; `ygg.org` taken since 2003, `yggprotocol.org`/`ygg-protocol.org` available as of today) surfaced the **Yggdrasil mesh-network adjacency** → Venkat may rename the project. Task 16 defined: brand-name refactor — single `BRAND` constant block driving URL prefix, manifest filename, JSON version key, GUID scheme, XML ns prefix/elements, generator, cookie, CSS classes; acceptance = suite passes with the constant set to `zzz`; `RENAME.md` checklist for non-importable config (wrangler.jsonc, package.json, repo/folder names). New gate order: **brand decision → rename (constants edit) → domain/namespace → deploy.**

**State after:** Worker implements the full withdraw/pin protocol, tested and live-verified; threads specced (§2.9) but unbuilt; wireframes at rev 3 awaiting review; plan doc carries tasks 13–16; nothing deployed.

**Open threads:** Venkat: rev-3 wireframe review (gates tasks 9/15) and brand decision (gates domain + deploy). Buildable now, Sonnet-safe: tasks 13–14 (threads backend), task 16 (brand refactor). `protocol-v0.1.md` (⚠️ FABLE, post-ship) must fold in: session-2 feed interpretations, session-3 withdraw/pin decision record, §2.9 grammar. Namespace URI decision now downstream of rename. Deferred design noted in proposal doc: "finalize" endcap flavor (enshrine = pin + close-the-id) if Venkat wants it later.

## Session 2 — 2026-07-18 — v0.1 build: tasks 1–8 + 10, studio gated, wireframes delivered
**Model:** Fable 5 · **Time:** ~12:14–12:40 PT · **Committed:** yes · **Deployed:** — (task 11 pending)

**What & why:** Built the v0.1 "Seed" worker per `docs/v0.1-plan.md`: scaffold, ID/hash utils, HMAC-cookie auth, item CRUD with full publish-flow semantics (draft→v1, edit→vN+1, unpublish-retract, tombstone, draft hard-delete), media upload to R2, all four protocol surfaces (item JSON, manifest, archive index, feed.xml with per-version GUIDs and 50-entry window), public HTML pages, and the static export script. 46 tests (vitest workers pool) exercise every acceptance check in the plan; verified live via `wrangler dev` with a full curl-driven owner loop; export output byte-compared identical to worker responses (invariant 4 proven). Task 9 (studio UI) deliberately **not built** — the gate holds; `/studio` serves a login-gated placeholder and the full owner API carries the load. Wireframe mockups for the review round delivered to Venkat (`docs/wireframes/`: public, studio, edit).

Two protocol interpretations made this session (Fable, on the record): (1) **feed entries for older publish events render the item's *latest* content** — §2.3's "only the latest version is published" wins over serving per-event historical content; the older entry keeps its own version number and note, only the description is latest. The alternative (serving each version's own content) would have leaked history v0.1 explicitly withholds. (2) **Tombstoned items contribute exactly one feed entry (the tombstone event)** — their earlier publish events are dropped from the window, since with content withheld they'd render as empty noise under interpretation (1). Neither is in the plan text; both should fold into `protocol-v0.1.md` when it's drafted.

Toolchain deviations from plan assumptions, for future CF sessions: `@cloudflare/vitest-pool-workers` 0.18+ dropped the `/config` subpath and `defineWorkersConfig` — it's now a Vite plugin (`cloudflareTest()` from the package root, requires vitest 4, `@cloudflare/workers-types` v5, test env types augment global `Cloudflare.Env` instead of `ProvidedEnv`). Hono `strict:false` requires routes registered *without* trailing slash (registering `/ygg/` 404s; `/ygg` matches both forms). Neither affects protocol shapes.

**State after:** `worker/` is a complete, tested publish-side client minus studio UI and deployment. Local dev works end to end (`npm run dev`, `.dev.vars` gitignored). Wireframes committed and in Venkat's hands.

**Open threads:** Venkat reviews `docs/wireframes/` before next session → clears task 9. Task 11 (deploy) needs: real D1 database ID in `wrangler.jsonc`, `OWNER_PASSWORD`/`COOKIE_SECRET` as wrangler secrets registered in `Code/.env.keys`, then the RSS-reader exit check. Still open from session 1: namespace URI/domain decision (must precede v0.2), fragment-cap sign-off (1,000 enforced this session as planned). The two feed interpretations above want explicit blessing when `protocol-v0.1.md` is drafted.

## Session 1 — 2026-07-17 — Bootstrap: spec assessment, repo, protocol decisions, project docs
**Model:** Fable 5 · **Time:** ~11:30–12:00 PT · **Committed:** yes · **Deployed:** repo published to github.com/vgururao/ygg

**What & why:** Project inception from Venkat's initial concept spec (`docs/ygg-initial-spec.md`, now frozen as the v0 reference). Critical assessment concluded the spec was ~80% complete on social/UX design but ~40% on the distribution layer; the load-bearing gap was treating RSS as the data layer (lossy, window-limited — missed edits would be lost forever, new subscribers couldn't backfill). Four decisions locked with Venkat, all now recorded in CLAUDE.md: (1) the normative protocol is a **static file contract** under `/ygg/` with `items/{id}.json` as ground truth and RSS demoted to a notification plane — this closed off the RSS-extension-only design and simultaneously solved backfill, lagging clients, and IPFS-friendliness; (2) **no-AI core first** roadmap (protocol hardens before AI touches it); (3) public repo from day one; (4) MIT + CC-BY-4.0. Two further design reframes with consequences: stable random IDs with per-version content hashes (content-addressed IDs were rejected because they can't survive editing), and the **studio/page split** (the protocol governs only the public artifact; the dynamic authoring side is unconstrained — which is also the multi-tenancy escape hatch). Privileged-group private content was deferred to L3 because it requires auth on a static page. Repo was created in `Publishing/ygg`, then moved to `Code/ygg` (it's a software project, not a publishing project); Venkat's personal deployment will later live in `Publishing/`. Session rituals (this devlog, start/close checklists) adapted from ribbonfarm_site, simplified to a single DEVLOG.md.

**State after:** Public repo live with README (protocol on one screen, roadmap table), frozen v0 spec with comment banner, issue #1 as comment anchor, Discussions enabled. `docs/roadmap.md` (full roadmap with FABLE annotations) and `docs/v0.1-plan.md` (implementable v0.1 spec for Sonnet/Opus) written this session. No code yet.

Three v0.1 protocol-shaped calls made while writing the plan, for the record: **per-version RSS GUIDs** (`ygg:{id}:v{n}`) so plain L0 readers resurface edits as new entries — closed off the same-guid alternative, which would have hidden all evolution from dumb readers; **tombstones** (deleted published items keep their item file forever as a positive deletion signal, honest that remote copies survive); **fragment cap** 1,000 chars studio-enforced / 2,000 protocol-recommended, reader enforcement forbidden.

**State after (docs):** CLAUDE.md carries session rituals (start/close, non-skippable devlog, wrap-up checklist) adapted from ribbonfarm_site, plus model routing: Sonnet/Opus build from plan docs, Fable does protocol/design work; ⚠️ FABLE annotations live in `docs/roadmap.md`. `docs/v0.1-plan.md` is a complete build spec (schemas with examples, D1 DDL, routes, auth, 11 ordered tasks with acceptance checks). Task 9 (studio UI) is gated on an HTML wireframe review round with Venkat.

**Open threads:** XML namespace URI / dedicated-domain question (v0.1 plan, Open decisions) — must settle before v0.2 importers match on it. Fragment length default needs Venkat's sign-off (plan proposes 1,000 chars). Wireframe review round for public page + studio before studio UI implementation (natural next Fable session). Normative `protocol-v0.1.md` to be drafted by Fable after v0.1 ships and stabilizes the shapes. Build tasks 1–8 are ready for a Sonnet/Opus session anytime.
