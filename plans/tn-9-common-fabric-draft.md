# TN-9 — Experimenting with Blygger and Common Fabric

**Technical note · non-normative · DRAFT for Fable's review, not published · session 68,
2026-11-12.** Drafted by Opus 5.5 at Venkat Rao's request (Opus brief, session 67, item 7;
ROADMAP row 120). After Fable's review, and on Venkat's word, it moves to
`docs/notes/tn-9-common-fabric.md` and publishes. It is `tn-9` because tn-8 is reserved
for RFC-5's promotion (#90). Like every technical note, it constrains nothing.

**Not an endorsement.** Common Fabric is one company's work, with one implementation, and
it calls itself early: "This is early, fast-moving work: interfaces change often, and
there is no API stability yet" (its README). This note describes experiments a reader of
either project could try. It recommends no vendor, and nothing in the Blygger protocol
depends on Common Fabric.

**What was read.** The `commonfabric/labs` repository at commit `210f787c` (2026-11-12
17:02 PST), cloned shallow into a throwaway directory: `README.md`, `docs/why.md`,
`docs/how.md` (in full), `docs/inverting-the-physics-of-trust.md` (in part), the
tutorial's chapter 10 (identity, authorization and isolation),
`docs/specs/verifiable-execution/` (the README, foundations and receipts in full, the
rest by heading), `docs/specs/webhook-ingress/README.md` (in part), the feature notes on
DIDs and vouched ingest, and the code paths named below. **No code was run.** Deno is not
installed on the machine this was written on, and the brief allows no global install, so
the minimal reader experiment of section 4.1 was not tried. Every claim about Common
Fabric below is from its own documents or code, with the path; anything not verified says
so.

## 1. The two systems, each in its own terms

**Blygger** is a protocol for public writing as static files. A *blyg* is a file tree
under an origin: a manifest (`blyg.json`), an archive index, one JSON document per item
(`items/{id}.json`), and an RSS feed (`feed.xml`). Items are fragments (short, one layer)
and threads (which quote other items by baking a snapshot of them). Every item has a
stable random id, a bare version counter, and a `content_hash`. The protocol governs only
the published files; every client also has a private *studio* where writing happens, and
the studio is the client's own business (decision #3). AI is never in the protocol:
generation happens in the studio, and the published document discloses it as
self-asserted provenance (§5.7). The only authenticated party is the origin (§12.2).
Readers follow a small set of cooperative rules: drop withdrawn content unless the origin
still serves a pinned version (§13.4), never re-emit an imported item on your own feed
(§13.5), never auto-publish a verified mention (§15.5). Blygger is at protocol 0.4,
pre-1.0, with no promises (#21).

**Common Fabric** is a runtime "in which software is untrusted and safety attaches to the
data" (`docs/why.md`). Programs, called *patterns*, are TypeScript compiled to run in
sandboxed compartments with no ambient network access. Values carry *labels*: integrity
atoms recording who or what vouches for a value, and confidentiality clauses saying who
may observe it (tutorial chapter 10). "Labels only tighten. Join two labeled values and
the result carries both sets of rules" (`docs/how.md`), and a flow checker refuses code
whose data flows would break a label. Relaxing a rule is "a decision, not a write": an
*exchange rule* the data itself names, or a *grant*, "a content-addressed record at a
reserved address … so revoking it is an edit to the grant rather than to the data"
(`docs/how.md`, "Release is a decision, not a write"). Identity is a keypair named as a
DID (`did:key`); data lives in *spaces* with access-control lists (tutorial chapter 10).
Network access, model calls and streams leave only through a named list of *sinks*
(`runtime/runner/src/cfc/sink-inventory.ts`). The licence is 0BSD (`LICENSE`).

## 2. Where they meet, and why it is the client

The two meet at the split between a client's studio and its published page (#3). Common
Fabric can be the runtime of a **reader** or of a **studio**. The blyg stays static files.
Nothing about Common Fabric needs the Blygger protocol to change, and nothing should:

- A blyg is read by fetching JSON over HTTP. A Common Fabric pattern can do that today
  with the `fetchJson` builtin (section 4.1).
- A blyg is written through whatever write surface a client has. The protocol has none,
  by decision (#31); the reference client's is its owner API with scoped tokens (tn-4).
  A Common Fabric pattern can call such an API through the same fetch builtins.
- Policies travelling with data is a property of the runtime that holds the data. The
  Blygger wire carries none and will not (section 5).

So **a Common Fabric reader or studio is a separate client**, as an enterprise product is
(RFC-5), and the reference studio is not where this work goes. Blygger Studio stays
boring.

## 3. Facts that shape the experiments

Seven questions were put to the Common Fabric documents. Answers, with what was and was
not verified.

**(a) How a pattern fetches from the open web, and what label the result gets.** Through
node-factory builtins: `fetchJson`, `fetchText`, `fetchBinary`, `fetchJsonUnchecked`,
`fetchProgram`. "A compartment endows no `fetch`", and the builtins are the only route
(`docs/plans/handler-callable-egress.md`). Each request is recorded as a sink request and
"measure[d] against the sink's confidentiality ceiling" (same file). The example is one
line: `fetchJson<T>({ url })` (`patterns/examples/fetch-json/fetch-json.tsx`). **What
integrity label a fetched public document carries was not found.** The runtime has an
`ExternalIngest` provenance mark with a `kind: "fetch"` variant that "carries only a
`pinnedSource` URL and commit SHA: the trusted host attests to the immutable source it
read" (`docs/features/vouched-ingest-channel-mint.md`), but it is set "only by trusted
host code … a pinned-fetch helper", not by a pattern's `fetchJson`
(`runtime/runner/src/cfc/external-ingest.ts`). Whether an ordinary fetch result is
unlabelled, or labelled from its request, is the first thing the experiment in section
4.1 should show.

**(b) Whether a label can express Blygger's three reader rules.** No document claims it,
and no code was run, so these are hypotheses written as the policy each rule would be:

| Blygger rule | As a Common Fabric policy | Expressible? |
|---|---|---|
| §13.4: drop withdrawn content unless the origin serves a pinned version | Not a flow rule but a lifecycle rule: a pattern that rolls an import up to null when the fetched document is an endcap. A label could at most stop withdrawn content reaching the render sink, if rendering required an integrity atom ("current at the origin") that only trusted importer code may mint — and "an author-declared one survives only when the writer's identity is a builtin" (`docs/how.md`). So it is code, or a trusted builtin, not a label alone | Probably not as a label |
| §13.5: never re-emit an imported item on your own feed | A confidentiality clause on imported items that keeps them from the network sink that writes to the reader's own blyg. **But Blygger permits one deliberate re-emission: the quote**, which bakes another origin's words into the quoter's thread (§10.2), at the cost of editorial (#12). That is release as a decision, which is Common Fabric's own model: a rule or a grant at a boundary | Plausibly, with quoting as the named release |
| §15.5: never publish a verified mention automatically | A write that requires its origin in a reviewed handler on a trusted surface. Common Fabric shows this working: in `patterns/examples/cfc-authorized-save/` a lookalike button wired to the same stream "does not save", and the test clicks both (`patterns/integration/cfc-authorized-save.test.ts`). `docs/how.md` adds that this "attests … surface origin, not human intent" | Yes, by their own demonstration, for the "not automatically" half |

**(c) How a secret such as a bearer token is held and bound to one destination.**
`docs/why.md` and `docs/inverting-the-physics-of-trust.md` describe an OAuth token
"protected by a four-line policy attached to the token itself": never logged, never
transmitted outside the attested fabric, "sent only to the origin that minted it", "and
only in the Authorization header". **This draft did not find the code or test that binds
a token to one destination**, so it is reported as their description, not as a verified
mechanism. A related built mechanism: webhook secrets "exist only in CFC-labeled cells
displayed by trusted system components", and "the pattern code never reads the URL or
secret directly" (`docs/specs/webhook-ingress/README.md`, whose status is "Draft —
seeking framework author review").

**(d) What a release to "public" looks like, and who may make it.** Releases are
exchange rules or grants (`docs/how.md`). A space can be opened to every authenticated
identity with an ACL wildcard (tutorial chapter 10). **A label meaning "the open web" was
not found**, and `docs/how.md` says "the default sink ceiling is empty". Not verified
further.

**(e) What a receipt will be able to claim, and to whom.** "Future Enhancement": today
"the system's 'receipt-like' artifact is the `application/commit+json` fact produced by a
transaction" (`docs/specs/verifiable-execution/04-receipts.md`). The planned receipt
commits to a content-addressed code bundle, input commitments, label-map commitments, a
policy id and the resulting state, optionally signed by several principals, so that
"verifiers can check policy/label reasoning without requiring disclosure of the labeled
values" (same file). Anyone holding a receipt is a potential verifier; which signatures
a verifier needs is "policy" for "a given trust profile". The spec's status is "Draft".

**(f) How principals are named, and whether a blyg origin can be one.** Users and spaces
are `did:key` DIDs from Ed25519 keypairs (tutorial chapter 10). "Some services and CFC
principals are named by `did:web` DIDs instead" (`docs/common/concepts/glossary.md`).
Label rules can name a principal by protocol, `principal("mailto", …)` in the example of
`docs/how.md`, which the storage engine expands to `did:mailto:<address>`, lowercasing
`mailto` and `web` values (`runtime/memory/v2/sqlite/row-label.ts`). So **a blyg origin
could be named as a `did:web` principal** (`did:web:example.com` for a root origin, and
the W3C method's colon-path form for a mounted one), but resolving `did:web` means
serving a DID document, at `/.well-known/did.json` for a bare host. Blygger serves no
such file and will not ask publishers to (#14, #52); a publisher could serve one as its
own choice, outside the protocol. Common Fabric's own domain binding uses a DNS TXT record
or `/.well-known/cf-space-did`, and says "Domain bindings do not grant write authority"
(`docs/specs/verifiable-execution/07-extensions-and-appendices.md` §16).

**(g) What runs today, and what is planned.** In their words: "What runs today: the
compiler; the checker, enforcing at its strictest rung by default in every host … labels
that survive into the store; row-level clearance on shared tables; and access control on
spaces, enforced on the production server" (`docs/why.md`). "What is left: one dial still
observes rather than refuses, the default sink ceiling is empty, a browser profile can
opt out of the render ceiling, a space still has a host that can revoke a participant,
and the machine that would prove which runtime it is before your data arrives is
provisioned but not yet proving anything. Robustness and performance are not there yet"
(same file). And: "Attestation … is specified rather than built" (`docs/how.md`, "What is
not here yet").

## 4. Three experiments

### 4.1 A blyg reader inside Common Fabric (the cheapest)

**What to build.** A pattern that, given a blyg origin, fetches `{origin}blyg.json`, then
`items/index.json`, then each `items/{id}.json`, and renders them. Everything a reader
needs is JSON: the archive index is the reconciliation surface and the feed is only a
trigger (#18), so the pattern never has to parse `feed.xml`.

**Which sections it must satisfy.** §12 (resolution: probe the origin, identity is the
final fetch URL), §13.1–§13.4 (ground rules, reconciliation by the index, the watermark,
withdrawal and retention), §14 (sanitise `content_html` at render; it is the publisher's
HTML). It need not send or receive mentions (§15 is optional at every level).

**What it would show.** First, the open question of section 3(a): what label a fetched
item document carries. Second, whether Blygger's provenance (the document's `origin`,
`id`, `version` and `content_hash`) can be carried into a Common Fabric label, and what
the runtime makes of a value whose provenance is the publisher's own claim. Third,
whether the three reader rules of section 3(b) can be enforced by the runtime rather than
followed by the code, starting with §15.5's, which Common Fabric already demonstrates in
another setting.

**What is unknown.** Whether `fetchJson` can follow §12.1's redirects and record the
final URL, which §12.2 needs for identity; whether sanitising `content_html` is
available inside the compartment (`docs/how.md` says the render boundary "has an open
gap" in DOM sanitisation); and whether polling at §12.3's etiquette fits the scheduler.

**Self-asserted stays self-asserted.** A Blygger document's provenance is the publisher's
own claim, including `generated[]` (§5.7 rule 6). A Common Fabric reader may record it as
provenance, but it MUST NOT be turned into a verified mark on any surface Blygger
governs, and a reader that shows it should say whose claim it is (#59).

### 4.2 A Common Fabric studio or authoring agent

**What to build.** A pattern that drafts and publishes to a blyg through a client's
write API on a scoped token: the reference client's owner API (tn-4), whose publish verb
is distinct from drafting (#52 invariant 3).

**Which rules it must meet.** #39's agent contract: write through scoped tokens, read
through the public files or a read scope, poll rather than receive webhooks, disclose
provenance. If it generates text, `generated[]` and the `blyg-tk-gen` wrapper (§5.7),
with sources in the reference shape. If it publishes under its own name, the agent
byline with an `operator` (#38, tn-6 §5.6).

**What it would show.** Whether "publish" maps onto Common Fabric's "release at a
boundary" — a reviewed handler on a trusted surface as the only way to reach the publish
sink, as `cfc-authorized-save` shows for a save — and whether the scoped token can be
held the way their webhook secrets are, readable by no pattern and sent only to the
studio that minted it.

**What is unknown.** Whether the destination-bound token policy of section 3(c) is built
(it was not found); how the agent's model calls, which are sinks like `fetchJson`
(`docs/how.md`), interact with labels on drafts that quote other origins.

### 4.3 Level 3, later: an attested runtime as grounds for a grant

Blygger's Level 3 design (RFC-6, in draft) lets a lock's home grant a key on grounds it
keeps private: a roster, a sign-on token, a payment, a person's decision. "The requester
is an attested Common Fabric runtime" could be one more ground — evidence in a request,
weighed by the home's ladder, with no wire text. A home could then release a key only to
runtimes that prove they will keep a label such as "never leaves the fabric". It waits
on two things: Common Fabric's attestation, which is "specified rather than built", and
RFC-6's comment period. Even then, a key handed to an attested runtime is a key handed
over: Blygger's own statement of revocation (RFC-6 section 5) does not change.

## 5. What stays off the Blygger wire, and why

Each line is a locked decision; this note states them and does not argue them.

- **No policy that restricts use after delivery.** RFC-6 and RFC-7 refuse any wire
  construct claiming to restrict use after delivery (#101, as narrowed by #104). A label
  that travels with data is a property of the runtime holding it, and a Blygger document
  will not carry one.
- **No rule that asks a reader for more than a standard library** (§3, #103). A Blygger
  reader must remain writable in any language with JSON, HTTP and SHA-256; no Common
  Fabric construct can become a reader obligation.
- **Provenance stays self-asserted**, and no receipt becomes a verified badge on the wire
  (#59, §5.7 rule 6). A Common Fabric receipt about how a blyg item was produced would be
  evidence its holder can check, not a field in the item document.
- **No auth or identity key for Common Fabric in the manifest or `.well-known`** (#52,
  #11). (RFC-6 separately proposes one encryption-only origin key in the manifest; that
  is its own question for its own ruling.)
- **A Common Fabric client is a separate client**, as enterprise is (RFC-5), and the
  reference studio stays boring.

## 6. Status

Both projects are early. Blygger is pre-1.0 and promises nothing (#21); Common Fabric
says there is "no API stability yet". Everything in sections 3 and 4 was read on
2026-11-12 at Common Fabric commit `210f787c` and against Blygger protocol 0.4 at its
fifteenth revision, and should be re-read before anyone builds on it. Of the three
experiments, the first can be tried today by anyone with Deno and a live blyg; the second
needs a Blygger client with a scoped-token write API (the reference client has one); the
third waits on attestation and on RFC-6.

**Finding, for the record.** The first experiment looks possible as described:
`fetchJson` exists, a blyg is JSON over HTTP, and nothing in Common Fabric's documents
stands in the way. What could not be established without running code is the one thing
the experiment is for: what the runtime does with a stranger's public document and its
self-asserted provenance.
