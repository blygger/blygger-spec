# RFC-5 — Blygger inside an organisation: one audience per origin, a boundary the publisher enforces

**DRAFT · not yet edited by Fable · not yet published for comment · session 59,
2026-11-04.** Drafted by Opus 5.5 at Venkat Rao's request as research only: no code, no
client change, no spec change. When it is ready it takes the #66 route: Fable edits it,
the version under comment is pinned on [blyg.blygger.org](https://blyg.blygger.org/),
comments are stubs, and a `blygger-spec` issue serves people without a blyg. After the
comment period it becomes a technical note, for people building enterprise products on
Blygger. Like a technical note, an RFC constrains nothing. Written against protocol 0.4
as of 2026-11-04; no pre-1.0 version promises anything (#21). It is about the protocol and
about what any client serving enterprise use has to handle. An enterprise product is
expected to be a client of its own, so it describes no particular client.

**Parts tagged ⚠️ FABLE** (section 6 has the four-question test for each):

- **F1. Audience is a property of the origin.** Read "public" in #1 and §4 as "every
  reader who can reach the origin", so a network-gated origin is conformant at L1 and L2.
  Per-item audiences inside one origin stay L3. Touches #1, #3, #7, #17; §3, §3.2, §4,
  §12.2, §16.7.
- **F2. Verification across a network boundary.** Confirm that §14's private-network
  refusal is met by a deployment-scoped allowlist, and that a mention whose source is
  unreachable from the receiver is simply *failed*. Touches #13, #28, #61, #84; §14,
  §15.2, §15.4.
- **F3. References that cross a boundary.** Should the spec say anything about a
  wider-audience origin referencing or quoting a narrower one, or is it client policy?
  Touches #9, #12, #53, #26; §5.6, §5.7, §5.9 (`cited`), §10.2, §10.3a, §14; it
  generalises the publish block in `plans/private-items-proposal.md` §3.4.
- **F4. Group visibility is L3, and is enterprise its trigger?** Touches #1, #7, #11,
  #35, #43; §3, §4, §16.7; `private-items-proposal.md` §5 (C1–C3) and §8.3.
- **F5. Compelled removal and compliance retention.** These run against 200-forever,
  irrevocable pins and §13.4's "hoarding is nonconforming". Touches #8; §4, §8, §9,
  §13.4, §14.

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
| Census (§3.2) | "the manifest is a file the protocol requires to be public" | **Wording only.** The census simply never sees internal blygs. F1 asks Fable to read "public" here as "served to its audience". |

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
reason. F3 asks whether the spec should say so.

### 3.3 "Readable only by members": static, L1/L2, or L3?

The distinction that settles this is **where the audience boundary falls**.

- **Origin-uniform audience.** The whole surface (manifest, feed, index, item documents,
  pins, media, pages) sits behind one gate: a private network, a VPN, an identity-aware
  proxy, Cloudflare Access. Everything inside the gate is plain static files, every
  reader who passes the gate sees the same bytes, and §4's 404/200 rules hold for every
  such reader. The gate is transport, like TLS. Under F1's reading this is conformant at
  L1 and L2 and needs nothing new.
- **Per-item or per-reader audience in one origin.** Two readers asking for the same
  `items/{id}.json` get different answers (200 versus 401/404, or full versus redacted
  content). That is the gate `private-items-proposal.md` §5 analyses as C1–C3, and it
  rules out C2 as "not static". It is L3 by #7 and needs a Fable crypto or gating round.
  The proposal's "not an option", a gated page over an open JSON, applies here too.

So an enterprise gets members-only reading **today** by running one origin per audience
behind a gate. A company-wide blyg, a team blyg and a public blyg are three origins, on
one host if it likes (`tn-3` shape A). The cost is the one `tn-3` names: N origins, N
archives, N sets of pins.

**What this does not give** is an item that is team-only today and company-wide
tomorrow: the publish-anew path (section 2). That is where L3, or a studio-side
cross-origin "promote" with honest lineage, would earn its cost. It is the trigger
question in F4.

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
- **Retention follows the origin** (§13.4). A reader that keeps withdrawn content for a
  compliance archive conflicts with the text as written (F5).

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
| Whole-origin gating (SSO proxy, private network) | interpretation | **F1** |
| Verification when the source is unreachable | interpretation, small | **F2** |
| Cross-boundary quoting and reference leakage | client rule; possibly spec text | **F3** |
| Per-item audiences in one origin | **missing capability (L3)** | **F4** |
| Compelled deletion; compliance archives of others' content | tension with locked promises | **F5** |
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
  promised would answer 200 forever and a pin promised to keep (§8). F5 asks what, if
  anything, the spec says about that.
- **Archives of external content.** Keeping other origins' withdrawn content for
  compliance conflicts with §13.4 as written (F5).

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

This is the client half of F3, and the most important enterprise control.

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

**None, if F1–F3 rule as this draft proposes.** Shapes A–D use only existing
constructs. The boundary rule is a client publish error and a declined SHOULD. Shape E
(F4) and any compelled-removal status (F5) would be wire changes, and both are deferred.

## 6. The ⚠️ FABLE items

The four questions are those in `CLAUDE.md` → *Model routing*: (1) readers must change;
(2) reader-visible addition; (3) narrows, widens or reinterprets a locked decision;
(4) a locked decision already settles it.

**F1. Audience is a property of the origin.**

- *Proposal:* the spec governs the bytes an origin serves to whoever can reach it.
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

- *Proposal:* a mention whose source the receiver cannot fetch is *failed*, with no new
  state. §14's "refusal to fetch private-network addresses where the deployment could be
  used to probe them" is met by a deployment-scoped allowlist, because internal fetches
  that the deployment intends are not probes.
- *Test:* Q1 no. Q2 no. Q3 *maybe*: it reads §14's private-network SHOULD as
  configurable. Q4: #28 and #61 settle the mechanics, but not §14's wording. Small.
- *Touches:* #13, #28, #61, #84; §14, §15.2, §15.4.

**F3. References that cross a boundary.**

- *Proposal:* client policy in this RFC (section 3.2's rule), with **no** spec text yet.
  Revisit only if a second client builds a boundary and the two disagree.
- *Test:* Q1 no and Q2 no while it stays client policy. Q3 *maybe*: declining §15.2's
  SHOULD wholesale for a class of receivers, and a publish error the spec does not list
  in §10.2 step 3. Q4: #3 lets the client refuse anything at publish. If Fable wants a
  sentence in §14 ("a quote is an export"), that is spec text.
- *Touches:* #9, #12, #26, #53; §5.6, §5.7, §5.9 `cited`, §10.2, §10.3a, §14, §15.2;
  `private-items-proposal.md` §3.4.

**F4. Group visibility is L3, and is enterprise its trigger?**

- *Proposal:* enterprise does not need L3 to start (section 3.3). Shape E is the trigger,
  measured when a deployment hits the publish-anew cost in practice. Until then, group
  tokens wait, as `private-items-proposal.md` §8.3 says.
- *Test:* any form of shape E is **Q1, Q2 and Q3 yes** (C2), or Q3 yes (C1).
- *Touches:* #1, #7, #11, #35, #43; §3, §4, §16.7; `private-items-proposal.md` §5, §8.3;
  backlog L3 row.

**F5. Compelled removal and compliance retention.**

- *Proposal:* say in §14 that a legally compelled removal is an out-of-protocol act. The
  origin breaks a promise and readers see a 404, which §12.3 already tolerates. Add no
  status code or marker. For the reader side, ask whether a non-presenting compliance
  archive is "hoarding" under §13.4.
- *Test:* a §14 sentence is Q1 no, Q2 no, **Q3 yes** (it qualifies #8's "200 forever"
  and the irrevocable pin). A marker such as 410 with a reason would be Q1 and Q2 yes.
- *Touches:* #8; §4, §8, §9, §13.4, §14.

## 7. Open questions for comment

For implementers building enterprise products on Blygger:

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
   over drafts, a compliance archive of external content, or all three? Would a §14
   sentence (F5) be enough, or does a reader need a signal?
6. **Hosting.** Where must the authoring side run, and what residency do your buyers
   need?
7. **Audit.** Which events, which format, which sink?
8. **Teams.** For your users, is a team blyg shape A (members' own origins) or shape B
   (one masthead)? Who withdraws?
9. **Where should the boundary rule live?** In this note as client guidance, or as spec
   text (F3)?

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

## 9. Relation to other documents

- `plans/private-items-proposal.md`: the owner-only level and its publish block. This
  RFC generalises that block to audiences (section 4.7) and supplies F4's trigger
  framing for its §8.3.
- `docs/notes/tn-3-groups-and-aggregation.md`: shapes A and B are the enterprise team
  shapes.
- RFC-1: bylines, `ids` and agent members under SSO (section 3.5).
