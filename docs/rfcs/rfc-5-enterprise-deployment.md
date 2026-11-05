# RFC-5 — Blygger inside an organisation: one audience per origin, a boundary the publisher enforces

**Request for comments · non-normative · OPEN FOR COMMENT until 2026-12-03 on
[blyg.blygger.org](https://blyg.blygger.org/t/3t4kfb63bsyqajphwz14ngz52t/) (#66); without a blyg, comment on [blygger-spec#27](https://github.com/blygger/blygger-spec/issues/27) ·
session 59–60, 2026-11-04/05.** Drafted by Opus 5.5 (session 59) at Venkat Rao's request
as research only: no code, no client change. Edited and ruled by Fable 5.1 (session 60),
whose rulings are section 10. Like a technical note, an RFC constrains nothing. When the
comment period closes it becomes a technical note, for people building enterprise
products on Blygger (decision #90: the close is the promotion, and the first build is a
revision trigger). It is about the protocol and about what any client serving enterprise
use has to handle. An enterprise product is expected to be a client of its own, so it
describes no particular client. Written against protocol 0.4 at its tenth revision, which
carries the sentences F1 and F5 add; no pre-1.0 version promises anything (#21).

Five questions in this RFC needed Fable under the four-question test (F1–F5). Section 6
states each item, with the test as it was applied, and section 10 rules it.

## Summary

**The protocol has no fundamental blocker for enterprise use.** Nothing on the wire
assumes public DNS or the public internet. An origin is a URL string. Resolution and
verification are fetches. Every fetch failure already degrades safely: a poll failure
discards nothing (§12.3), and an unreachable source is a failed mention (§15.4). The
`blyg:` namespace URI is an opaque token that is never fetched (§7).

Three things need care, and only one of them is a missing capability:

1. **One audience per origin.** A whole origin behind SSO or a private network works
   today. Different readers seeing different items *within one origin* is L3, which #7
   defers. Enterprises get audiences by running one origin per audience: the N-origins
   group shape, `tn-3` shape A. This is the missing capability (F1, F4).
2. **References leak across a boundary.** A quote bakes the bytes. Every reference
   carries an origin string, and `cited` can carry an excerpt. A sent mention POSTs the
   internal URL to the outside receiver. The protocol permits all of this. An enterprise
   client has to refuse it at publish time (F3).
3. **Retention law runs against two promises** the medium makes: published documents
   answer 200 forever, and pins are irrevocable (F5).

Everything else is client work, and section 4 lists it: SSO and roles, reader
credentials, egress policy, audit and retention, hosting and residency, AI controls, and
the publish-time boundary.

## 1. The question

Venkat asked whether anything fundamental stops Blygger being used as an enterprise
tool, deployed inside an organisation's boundary with the usual enterprise features:
SSO, an internal DNS scope, private networks, audit, retention.

The answer matters beyond enterprises. The protocol's claim is that anything able to
serve files can host a blyg (§1). An intranet file server can serve files. If the claim
held only on the public internet, it would be narrower than it says.

`plans/private-items-proposal.md` §8 (same session) recorded Venkat's answer that
"enterprise deployments are under discussion" and are the concrete case likely to open
L3. This RFC is the enterprise half of that thread. It does not repeat the
private-items design. It asks what an enterprise needs *before* L3, and whether L3 is on
its critical path.

## 2. Deployment shapes

| Shape | What it is | Audience per origin | Protocol status |
|---|---|---|---|
| **A. Fully internal** | Every blyg sits on an internal DNS zone (for example under `.internal`, which ICANN reserved for private use in 2024) or behind a gateway. Nothing is reachable from outside. | uniform (employees) | conformant today, given F1 |
| **B. Internal plus selectively public** | Some origins internal, some public: a public engineering blog next to internal team blygs. | uniform per origin; different origins, different audiences | conformant today; the boundary between origins is F3 |
| **C. Mixed federation** | Internal blygs subscribe to and quote public blygs, and the reverse is attempted. | as B | inbound (public → internal) is safe; outbound is F3 |
| **D. Vendor multi-tenant hosting** | A vendor hosts many organisations' blygs, each tenant one or more origins. | uniform per origin | conformant today: #14, #36, #61, #84 make N origins on one host safe |
| **E. Per-item audiences in one origin** | One team blyg where some items are for the team, some for the company, some public. | **mixed** | **L3** (#7). Not available. |

Shapes A–D need no new protocol. Shape E is the only one that does, and the
recommendation in section 3.3 is to build A–D first and treat E as the measured need
that opens L3 (F4).

**Shape B is "promotion" by publishing anew.** Withdrawal is the only exit from public
(#8), and an origin's audience never changes (F1). So an internal item does not *become*
public. Its author publishes a new item in the public origin. Whether that new item may
name its internal ancestor is F3: `forked_from` or a quote would carry the internal
origin string outward.

## 3. Protocol analysis: is anything blocking?

Each claim below is checked against the 0.4 text, not assumed.

### 3.1 Nothing assumes public DNS

| Construct | What it needs | Internal origin? |
|---|---|---|
| Origin, identity origin (§2, §12.2, #14, #17) | an absolute base URL; identity is the final fetch URL minus its last segment | **Fine.** No rule requires a publicly resolvable name. §12.1 step 1 expects HTTPS; an internal CA is a transport matter. |
| Reference shape (§5.9) | `{origin, id, version}` as strings | **Fine** as data. A reader outside cannot check staleness, which §12.3 already treats as an ordinary failure. |
| `content_html` absolute URLs (§5.2, #53) | every URL in the content absolute | **Fine** inside. A baked copy taken outside carries internal hostnames with it (section 3.2). |
| Namespace URI `https://blygger.org/ns/0.1` (§7) | "an opaque wire token" | **Fine.** Never fetched, so an air-gapped reader needs no access to blygger.org. |
| `generator_url` (§6.1) | informative, MUST NOT gate | **Fine.** |
| Resolution (§12.1) | at most six fetches from the reader's network position | **Fine** for any reader that can reach the origin. |
| Verification (§15.4) | the receiver fetches the source from its asserted origin | **Fine** when the receiver can reach the source. Otherwise *failed*, which is honest (F2). |
| Webmention endpoint (§15.1) | optional at every level | **Fine.** A static internal blyg omits it (§15.7). |
| CORS (§4) | `Access-Control-Allow-Origin: *` is a SHOULD | **Fine.** A gated origin answers credentialed CORS instead; the SHOULD bends for a stated reason. |
| Census (§3.2) | "the manifest is a file the protocol requires to be public" | **Wording only.** The census simply never sees internal blygs. "Public" here means the same bytes to every reader who can reach the origin (F1, ruled in section 10; §4 now says so). |

**One hazard to rule out: split-horizon DNS for a blyg origin.** If one name resolves
to an internal server inside the network and a different server outside, then "the item
at that origin" depends on where the reader stands. That breaks §12.2's guarantee that
two readers given the same URL arrive at the same identity, and it reproduces per-reader
content under one origin, which is shape E by the back door. Internal origins should use
names that do not exist publicly. Section 8 lists this as a rejected design.

### 3.2 References across the boundary

Every cross-origin construct carries the target's origin string, and two of them carry
words:

- **A quote bakes bytes.** §10.2 bakes the publisher's local snapshot into
  `content_html`. §10.4 says the snapshot survives anything the source does, and §14
  says so plainly ("anything published can be quoted into a thread whose snapshot its
  publisher cannot recall"). A quote of an internal item into a public blyg copies the
  internal text, and its internal absolute links (#53), out of the boundary for good.
- **A `cited` object** (§5.9) may carry an `excerpt` and a `url`, so even a bare `stub_of`
  or `forked_from` can carry words.
- **Origin strings alone leak** internal hostnames, mount paths and item ids. That is
  true of `stub_of`, `forked_from`, `links[]` (§10.3a), `transclusions[]` and
  `generated[].sources[]` (§5.7).
- **A sent mention leaks in the other direction.** §15.2 says a publisher SHOULD send a
  mention for every remote reference. From an internal blyg that quotes a public one, the
  POST hands the public receiver the internal page URL as `source`. The receiver then
  tries to fetch it: the fetch fails (good), but it has learned the hostname and the
  fact of the quote (bad).
- **Generation is a quote by model.** A TK span drawing on an internal item, published
  publicly, carries the internal origin in `generated[].sources[]` and paraphrased
  content in the text. The 0.4 rationale for the `source` relation, that "paraphrase by
  model must not be the one way to use a stranger's words without telling them", cuts
  the same way here.

None of this is a protocol defect. The protocol is a public-speech medium, and quoting is
its primitive (#12). It does mean that **the boundary is enforced by the publisher at
publish time, or not at all.** No reader-side or wire-side mechanism can recall a baked
quote. That is the same conclusion `private-items-proposal.md` §3.4 reached for private
items, generalised from "private versus public" to "narrower versus wider audience".

The rule a boundary-aware client applies:

> **A version published at an origin with audience W may carry no reference (of any
> kind, `cited` included) to an origin whose audience is narrower than W, and sends no
> mention to a receiver outside the audience of its own origin.**

The audiences are client configuration: a list of origin prefixes per audience. Both
halves are within what the spec already permits. Refusing to quote is a publish error
the client chooses. Not sending a mention is a SHOULD the client declines for a stated
reason. The spec says nothing more (F3, ruled in section 10): §14 already carries the
sentence that matters, "anything published can be quoted into a thread whose snapshot its
publisher cannot recall", and the rule above is client guidance in this note.

### 3.3 "Readable only by members": static, L1/L2, or L3?

The distinction that settles this is **where the audience boundary falls**.

- **Origin-uniform audience.** The whole surface (manifest, feed, index, item documents,
  pins, media, pages) sits behind one gate: a private network, a VPN, an identity-aware
  proxy, Cloudflare Access. Everything inside the gate is plain static files, every
  reader who passes the gate sees the same bytes, and §4's 404/200 rules hold for every
  such reader. The gate is transport, like TLS. This is conformant at L1 and L2 and
  needs nothing new (F1, confirmed in section 10). §4 now says it in one sentence: "What
  an origin serves does not depend on who asks: every reader who can reach it gets the
  same bytes, and reachability is the deployment's."
- **Per-item or per-reader audience in one origin.** Two readers asking for the same
  `items/{id}.json` get different answers (200 versus 401/404, or full versus redacted
  content). That is the gate `private-items-proposal.md` §5 analyses as C1–C3. Section
  10 classifies them: C2 is refused, C3 is where an L3 round starts, and C1 is client
  territory under one invariant. The proposal's "not an option", a gated page over an
  open JSON, applies here too.

So an enterprise gets members-only reading **today** by running one origin per audience
behind a gate. A company-wide blyg, a team blyg and a public blyg are three origins, on
one host if it likes (`tn-3` shape A). The cost is the one `tn-3` names: N origins, N
archives, N sets of pins.

**What this does not give** is an item that is team-only today and company-wide
tomorrow: the publish-anew path (section 2). That is where L3, or a studio-side
cross-origin "promote" with honest lineage, would earn its cost. Section 10 rules it the
trigger for L3 (F4), measured when a deployment hits that cost with a named case.

### 3.4 Reader side

- **Readers must reach the origin.** A subscribing studio behind the gate needs network
  reach and, when the gate is identity-aware, a machine credential (a service token,
  mTLS, workload identity) for each gated origin. That credential is transport. The
  protocol has no opinion on request headers, and §12.3's polling rules are unchanged.
  It is client work (section 4.2).
- **Failures are already safe.** A reader that loses access keeps its stored state and
  backs off (§12.3). It never treats 401 as withdrawal, because only an endcap is
  withdrawal (§13.4).
- **Sanitize-at-render is unchanged** (§14). The internal-content risk is egress, not
  rendering.
- **Retention follows the origin** (§13.4). A records system that keeps withdrawn
  content because the law requires it acts outside the protocol, and keeps the archive
  off every surface the spec governs (F5, ruled in section 10). §14 now says: "Law may
  compel a publisher to remove what it promised to serve, or a reader to retain what an
  origin withdrew. Both are acts outside the protocol: a compelled removal is a 404 with
  no marker, and a compelled retention never reaches any surface this document governs."

### 3.5 Identity and SSO

Invariant 4 and #11 say that identity is never in the protocol, and that the only
authenticated entity is the origin. This **helps** enterprise use rather than blocking
it. The protocol takes no position on how an owner, an editor or a reader proves who
they are, so SSO is entirely the client's:

- **Write side.** §14's last bullet and §16.6 put authoring auth out of scope, and #31
  rules out a normative write surface. A client's authoring auth is its own; an IdP
  session can be its root credential. The pattern #31 recommends (scoped,
  owner-revocable tokens for tools, a root credential no tool holds) carries over
  unchanged.
- **Bylines.** An SSO-backed studio can assert verified employee bylines (`author.name`,
  `author.url` pointing to an internal directory profile). #35's `rel="me"` proof works
  inside the network exactly as outside. RFC-1's `ids` and address book apply unchanged.
  Bylines are still the origin's claim (§5.5), which inside one organisation is the
  right trust model.
- **Multi-author.** The invariant is single *publisher* per origin, not single author
  (#11). A team blyg with many SSO users is `tn-3` shape B, the masthead. #36's test,
  "who can withdraw", decides between shape A and shape B per team.
- **Reader identity.** This is where SSO touches the protocol, and only in shape E,
  where a group needs named readers. That is F4, and #11 calls it out ("keys imply
  identity").

### 3.6 Verdict

| Item | Kind | Where |
|---|---|---|
| Public DNS or internet assumed anywhere | **none found** | 3.1 |
| Whole-origin gating (SSO proxy, private network) | interpretation; one §4 sentence | **F1**, ruled, §10 |
| Verification when the source is unreachable | interpretation, small | **F2**, ruled, §10 |
| Cross-boundary quoting and reference leakage | client rule, no spec text | **F3**, ruled, §10 |
| Per-item audiences in one origin | **missing capability (L3)** | **F4**, ruled, §10 |
| Compelled deletion; compliance archives of others' content | out of protocol; one §14 sentence | **F5**, ruled, §10 |
| SSO, roles, audit, residency, egress, AI controls, DLP | client and product work | 4 |

## 4. Concerns for clients serving enterprise use

The protocol governs only the published surface (#3). Everything below is the client's
business. It is listed so that implementers see the whole job, and so that two enterprise
clients can make compatible choices where they touch.

### 4.1 Authoring identity: SSO and roles

- The organisation's IdP (OIDC, or SAML through a broker) is the root credential. No
  tool holds it; tools get scoped, revocable tokens (the pattern of #31).
- Many people may author in one origin. The protocol needs one *publisher* per origin,
  not one author (#11), so a team blyg is `tn-3` shape B with bylines, or shape A with
  one origin per member. #36's test, "who can withdraw", decides between them.
- IdP groups map onto the client's roles. Deprovisioning (SCIM or equivalent) revokes a
  departing user's sessions and tokens.
- Verified bylines: `author.url` can point at the internal directory profile, and #35's
  `rel="me"` proof works inside the network as outside.

### 4.2 Reading gated origins

- **Gate the whole surface** (manifest, feed, index, item documents, pins, media, pages)
  with one gate, so that every reader past it gets the same bytes (F1). Gating only the
  HTML leaves the full text in the JSON.
- **A subscribing client needs a machine credential** per gated origin (service token,
  mTLS, workload identity). Attach it only on an exact origin-prefix match, and never
  follow a redirect with it to another origin: §12.2 allows cross-host redirects, and a
  credential that follows one leaks.
- **Caches** must be keyed so that nothing cached for one audience is served to another.

### 4.3 Network reach and egress

- **Internal names.** A client fetches manifests, feeds and documents (§12), and a
  receiver fetches mention sources (§15.4). Inside the network those names often exist
  only in internal DNS, and a resolver that consults public DNS will not find them.
- **The probe risk.** §14 asks receivers to refuse private-network addresses where they
  could be used to probe them. The Webmention endpoint is the dangerous one: anyone who
  can POST to it chooses a URL for the receiver to fetch. An internal deployment needs an
  allowlist (host suffixes or origins, plus address ranges), not a switch that turns the
  check off, and the endpoint should fetch allowlisted sources only for claims that
  arrived from inside (F2).
- **Air gaps.** In an air-gapped deployment, no feature may reach a public host: CDN
  scripts, update checks, embeds, hosted AI providers.
- **Rebinding.** A resolve-then-fetch check does not pin the connection. Enforce egress
  at the network boundary as well.

### 4.4 Audit, retention and legal hold

- **Audit.** An append-only, exportable log of sign-ins, token grants and revocations,
  publish, withdraw and pin, visibility and settings changes, subscriptions, outbound
  mentions, and AI calls (model and provider; not prompt text by default).
- **Legal hold** mostly comes free on the published side: withdraw-not-delete (#8) keeps
  every published version, and pins keep their bytes. The gaps are unpublished material
  (drafts, private items, media), which a hold must turn from deletes into soft deletes.
- **Retention schedules and compelled deletion** run the other way. A records policy, a
  court order or an erasure request can require removing a published item that §4
  promised would answer 200 forever and a pin promised to keep (§8). The removal is an
  act outside the protocol: the document answers 404, with no status code, marker or
  reason (F5, ruled in section 10; the §14 sentence is quoted in section 3.4).
- **Archives of external content.** Keeping other origins' withdrawn content because the
  law requires it is outside the protocol too. A client that is both reader and archive
  keeps the archive off every surface the spec governs: no presentation, no re-serving,
  no quote from it (§13.4, F5).

### 4.5 Hosting and data residency

The protocol is host-neutral: any server that can serve the files conforms (§4), so the
published surface can sit on an internal file server behind any gate. It loses only the
Webmention endpoint, which is optional (§15.7). Where the authoring side runs, and where
its data lives, is the client's design. Residency is a property of that design and of
its hosts.

### 4.6 AI provider controls

AI is never in the protocol (#5). An enterprise client needs:

- an operator-controlled list of allowed models and providers, with no free-entry way
  around it;
- the ability to point at an internal gateway;
- AI calls inside the egress policy;
- the boundary rule (section 3.2) applied to generation sources, since a TK source from
  a narrower audience is a cross-boundary reference.

### 4.7 The publish-time boundary (DLP)

This is F3, and the most important enterprise control. Section 10 rules that it is
client policy with no spec text: declining a SHOULD for a stated reason is what SHOULD
means, and §14 already warns that anything published can be quoted out of its
publisher's reach. Revisit only if two boundary-building clients disagree.

- **Audiences are configuration:** named sets of origin prefixes.
- **Publish block.** A version may carry no reference (transclusions, `stub_of`,
  `forked_from`, `links[]`, `generated[].sources[]`, `cited`) to an origin narrower than
  its own. Say which references block, and offer to remove them. This is the same block
  `plans/private-items-proposal.md` §3.4 describes for private items, keyed on audience.
- **Mentions.** Send none to a receiver outside the origin's own audience, and show the
  author why the §15.2 SHOULD was declined.
- **Content scan.** Optionally, check `content_html` for absolute URLs under narrower
  origins (#53 makes them easy to find): a plain link leaks a hostname.
- **Egress as backstop.** A wider-audience deployment that cannot fetch a narrower origin
  cannot quote it either.

### 4.8 Multi-tenant hosting

N origins on one host are safe on the wire: #61 stops one tenant's documents verifying in
another's name, #84 makes target membership exact, and #87 fixes the manifest name at
every identity. Each tenant is the publisher of its origins (#11), not the vendor.
Isolation of data, egress policy, audit and IdP per tenant is the vendor's design.

## 5. Wire impact

**None.** F1 and F5 are each one sentence in the living 0.4 text that readers already
handle; F2 and F3 add nothing; F4's shape E stays L3. Shapes A–D use only existing
constructs, and the boundary rule is a client publish error and a declined SHOULD.

## 6. The five items and their tests

The four questions are those in `CLAUDE.md` → *Model routing*: (1) readers must change;
(2) reader-visible addition; (3) narrows, widens or reinterprets a locked decision;
(4) a locked decision already settles it. The items are kept as the record of the test
as the draft applied it; each *Proposal* now opens with the ruling.

**F1. Audience is a property of the origin.**

- *Proposal:* Ruled, section 10: confirmed, with one sentence in §4. The draft: the
  spec governs the bytes an origin serves to whoever can reach it.
  Reachability, including an identity-aware gate across the *whole* surface, is
  deployment. A gated origin conforms at L1 and L2, provided that every reader who
  passes the gate gets the same bytes. Per-reader difference within an origin stays L3.
  §3.2's "required to be public" reads as "served to its audience". A blyg origin MUST
  NOT be split-horizon.
- *Test:* Q1 no. Q2 no. **Q3 yes**: it reads #1 and #7 ("privileged-group access is
  deferred to L3") as being about per-item audiences, not whole-origin ones, and that is
  an interpretation Opus should not make alone. Q4: #3 and #14 point the same way, but
  do not settle it.
- *Touches:* #1, #3, #7, #14, #17; §3, §3.2, §4 (200 forever, CORS), §12.2, §16.7.

**F2. Verification across a network boundary.**

- *Proposal:* Ruled, section 10: confirmed, no text. The draft: a mention whose source
  the receiver cannot fetch is *failed*, with no new
  state. §14's "refusal to fetch private-network addresses where the deployment could be
  used to probe them" is met by a deployment-scoped allowlist, because internal fetches
  that the deployment intends are not probes.
- *Test:* Q1 no. Q2 no. Q3 *maybe*: it reads §14's private-network SHOULD as
  configurable. Q4: #28 and #61 settle the mechanics, but not §14's wording. Small.
- *Touches:* #13, #28, #61, #84; §14, §15.2, §15.4.

**F3. References that cross a boundary.**

- *Proposal:* Ruled, section 10: confirmed as client policy, no text. The draft: client
  policy in this RFC (section 3.2's rule), with **no** spec text yet.
  Revisit only if a second client builds a boundary and the two disagree.
- *Test:* Q1 no and Q2 no while it stays client policy. Q3 *maybe*: declining §15.2's
  SHOULD wholesale for a class of receivers, and a publish error the spec does not list
  in §10.2 step 3. Q4: #3 lets the client refuse anything at publish. If Fable wants a
  sentence in §14 ("a quote is an export"), that is spec text.
- *Touches:* #9, #12, #26, #53; §5.6, §5.7, §5.9 `cited`, §10.2, §10.3a, §14, §15.2;
  `private-items-proposal.md` §3.4.

**F4. Group visibility is L3, and is enterprise its trigger?**

- *Proposal:* Ruled, section 10: confirmed, with C1–C3 classified. The draft: enterprise
  does not need L3 to start (section 3.3). Shape E is the trigger,
  measured when a deployment hits the publish-anew cost in practice. Until then, group
  tokens wait, as `private-items-proposal.md` §8.3 says.
- *Test:* any form of shape E is **Q1, Q2 and Q3 yes** (C2), or Q3 yes (C1).
- *Touches:* #1, #7, #11, #35, #43; §3, §4, §16.7; `private-items-proposal.md` §5, §8.3;
  backlog L3 row.

**F5. Compelled removal and compliance retention.**

- *Proposal:* Ruled, section 10: a sentence in §14, no marker. The draft: say in §14
  that a legally compelled removal is an out-of-protocol act. The
  origin breaks a promise and readers see a 404, which §12.3 already tolerates. Add no
  status code or marker. For the reader side, ask whether a non-presenting compliance
  archive is "hoarding" under §13.4.
- *Test:* a §14 sentence is Q1 no, Q2 no, **Q3 yes** (it qualifies #8's "200 forever"
  and the irrevocable pin). A marker such as 410 with a reason would be Q1 and Q2 yes.
- *Touches:* #8; §4, §8, §9, §13.4, §14.

## 7. Open questions for comment

For implementers building enterprise products on Blygger. F1–F5 are ruled (section 10);
these questions are about what implementers need, and where an answer bears on a ruling
it says which.

1. **Is one origin per audience enough?** Name the case where publishing anew across
   audiences fails you. That case is what opens L3 (F4).
2. **Reader credentials.** How should a subscribing client authenticate to a gated
   origin: service tokens, mTLS, workload identity, something else? Is a shared
   convention worth an RFC, or is it each product's business?
3. **Outbound mentions from inside.** Should an internal blyg ever notify a public one
   that it quoted it? If so, under what explicit act?
4. **Promotion.** When an internal item is republished publicly, should the public item
   name its internal ancestor (leaking the origin), carry a public lineage note, or
   carry nothing?
5. **Retention.** Which do you need: compelled deletion of published items, legal hold
   over drafts, a compliance archive of external content, or all three? Does the §14
   sentence (F5) cover what you need to build, and if not, what else do you need — legal
   hold on drafts, archives, something the sentence does not reach?
6. **Hosting.** Where must the authoring side run, and what residency do your buyers
   need?
7. **Audit.** Which events, which format, which sink?
8. **Teams.** For your users, is a team blyg shape A (members' own origins) or shape B
   (one masthead)? Who withdraws?
9. **Should the boundary rule (section 3.2) ever become spec text?** It is client policy
   today (F3); name the disagreement between two clients that would change that.

## 8. Rejected designs

Recorded because each will be proposed.

1. **Split-horizon blyg origins.** One name, two servers, two contents. This breaks
   §12.2's determinism and is per-reader content under one origin (section 3.1).
2. **Gating the HTML pages only.** The JSON carries the full text (private-items
   proposal §5, "not an option").
3. **A 401 or 403 on chosen item documents within an otherwise readable origin.** This
   is C2. §4 has no third answer, and §15.4 cannot verify against it. It is L3.
4. **Turning private-network refusal off wholesale for an internal deployment.** It
   works, and it makes the Webmention endpoint an internal fetch proxy for anyone who can
   reach it. Use an allowlist (section 4.3).
5. **An enterprise "audience" member in the manifest or item documents.** Readers cannot
   act on it without identity, which is #11's line. Audience is the client's
   configuration plus the gate.
6. **A removal marker (a 410 with a reason, a tombstone).** A removal marker is the
   tombstone #8 refused, and a delete signal invites delete requests. A compelled removal
   is a 404 with no marker, which readers already tolerate (§12.3; F5, section 10).

## 9. Relation to other documents

- `plans/private-items-proposal.md`: the owner-only level and its publish block. This
  RFC generalises that block to audiences (section 4.7) and supplies F4's trigger
  framing for its §8.3.
- `docs/notes/tn-3-groups-and-aggregation.md`: shapes A and B are the enterprise team
  shapes.
- `docs/notes/tn-6-mentions-and-identifier-schemes.md` (formerly RFC-1): bylines, `ids`
  and agent members under SSO (section 3.5).
- `docs/notes/tn-7-comments-sections.md` (formerly RFC-2): hosted commenters, which
  inside an organisation are SSO users commenting through the house's comments origin.

## 10. Rulings (Fable 5.1, session 60, 2026-11-05)

The draft closed with five items for Fable. The rulings follow, each with the principle
it rests on. All five confirm the draft's direction; F4 adds a classification the draft
did not make, and F5 settles the reader side the draft left as a question.

**F1. Audience is a property of the origin — confirmed, with spec text.** Decision #1
makes the protocol a static file contract, and #14 makes an origin any absolute URL;
nothing in the text requires that an origin be publicly reachable. "Public" in #7 and in
§3.2 means the same bytes to every reader who can reach the origin. Reachability is
deployment, like TLS. Per-reader difference within one origin is L3 (#7), and a
split-horizon origin is that difference by the back door, because it breaks §12.2's
determinism. The tenth revision of 0.4 adds the sentence to §4: "What an origin serves
does not depend on who asks: every reader who can reach it gets the same bytes, and
reachability is the deployment's."

**F2. Verification across a network boundary — confirmed, no text.** §14's clause is
already conditional: it asks for refusal "where the deployment could be used to probe
them". A fetch the deployment intends, under an allowlist, is not a probe. A source the
receiver cannot reach is *failed* (§15.4), which is honest: the receiver could not verify
it.

**F3. References that cross a boundary — confirmed as client policy, no text.** §14
already says the sentence the draft wanted: "anything published can be quoted into a
thread whose snapshot its publisher cannot recall". The boundary rule (section 3.2: no
reference of any kind, `cited` included, to a narrower origin; no mention to a receiver
outside the origin's audience) lives in this note as client guidance. Declining a SHOULD
for a stated reason is what SHOULD means, so a client that withholds §15.2's mentions
across the boundary conforms. Revisit only if two boundary-building clients disagree.

**F4. Group visibility is L3 — confirmed, and the three shapes classified.** Enterprise
does not need L3 to start. Shape E is the trigger, measured when a deployment has hit the
publish-anew cost with a named case. Of the private-items proposal's three gate shapes:

- **C2** (a 401 or 403 on chosen documents, under any gate descriptor) is refused. It is
  not static, and it is L3 by the back door.
- **C3** (encrypted static content) is the shape the L3 round starts from when the
  trigger fires.
- **C1** (a redacted wire, with a fuller rendition served off the mount to signed-in
  readers) is **client territory under #3, not L3**, under one invariant: nothing on the
  protocol surface may name, link to or depend on the fuller rendition, and the public
  document is complete in itself. The redaction is the author's own visible edit (#78).
  That is a paywalled newsletter beside a blyg, which the protocol has never forbidden.

**F5. Compelled removal and compliance retention — a sentence in §14, no marker.** "200
forever" and the irrevocable pin are the publisher's promises. Law may force the
publisher to break them, and the protocol does not legislate the law. Readers already
tolerate a 404 (§12.3). There is no status code and no reason: a removal marker is the
tombstone #8 refused, and a delete signal invites delete requests (section 8, item 6).
On the reader side, §13.4 governs what a conformant reader presents and re-serves. A
records system that retains under law is outside the protocol in the same way, and a
client that is both reader and archive keeps the archive off every surface the spec
governs. The tenth revision of 0.4 adds to §14: "Law may compel a publisher to remove
what it promised to serve, or a reader to retain what an origin withdrew. Both are acts
outside the protocol: a compelled removal is a 404 with no marker, and a compelled
retention never reaches any surface this document governs."

**What happens next.** Published for comment under #66 on 2026-11-05; the period closes
on 2026-12-03 (four weeks). Decision #93 records the five rulings, with this section as
their reasoning (`v0.4-plan.md` §18). Comments are stubs on the item, and
counter-proposals are forks of the pin.
