# TN-4 — The write surface: one client's owner API, and why the protocol has none

**Technical note · non-normative · session 62, 2026-11-09 (Opus 5.5, writing up
decisions #31 and #52 from blygger-studio 0.58.1); reviewed and edited by Fable,
session 64, the same day (gate G3).** Technical notes record design reasoning,
especially rejected designs, alongside the normative spec; they constrain nothing and
are citable rationale, not protocol. This one belongs to no protocol version (#31). It
describes what one client built; every detail of that client's contract may change
without a protocol revision.

**A dated record.** Section 3 describes Blygger Studio 0.58.1 and is not revised with
each release. The client's current contract is its own OpenAPI document and the docs in
[`blygger/blygger-studio`](https://github.com/blygger/blygger-studio).

## 1. The question

Within weeks of the first strangers' blygs, people were writing to them from somewhere
other than the studio: a native desktop app, an Obsidian plugin, a Drafts action, scripts
that migrate an archive, and agents. Each needed to create, edit and publish items on a
blyg it did not host. The question this raised looked like a protocol question: **should
Blygger define how a tool writes to a blyg?**

It does not, and will not (#31). This note says why, then describes the write surface the
reference client built instead, what tools did with it, and the designs that were turned
down on the way.

## 2. Why the protocol has no write surface

The protocol governs the public artifact: the files a blyg serves, under its mount, that
any reader can fetch (#1, the static file contract; #3, the studio/page split). How those files come to exist is the
publishing client's business. A blyg can be a static site generated from a folder of
markdown and uploaded by hand; it can be a Worker with a database; it can be a
WordPress plugin. All three publish the same artifact.

A normative write API would break that. A static-file client has no server to accept a
write, so it would be non-conformant for a reason that has nothing to do with what it
publishes, and the second independent implementation the 1.0 bar asks for is likely to
be exactly such a client. The cost would fall on the simplest publishers, for a benefit
(tool portability) that the tools themselves can get another way: by speaking each
client's contract, as a publishing tool today speaks one API to WordPress and another
to Ghost.

So the line is drawn at the artifact. **Reading is protocol; writing is client.** Nothing
about writing reaches `blyg.json`, the item documents or the feed (#52, invariant 2).

The protocol does have one surface that accepts a request: the optional Webmention
receiver (#13, spec §15). It is not a write surface. It takes a notification that
another item names one of this blyg's, verifies it by fetching the source, and stores
no content.

## 3. What the reference client built

Blygger Studio's owner API is the client's own contract, documented and versioned as
such (#31 ¶3). As of 0.58.1:

**One contract, two transports.** The operations are defined once (Zod), published as
OpenAPI 3.1, and consumed through a generated SDK; the Studio's own UI uses the same SDK.
REST lives at `{mount}/api`. MCP at `{mount}/studio/mcp` exposes the same operations
under the same permissions, as a transport for the contract, not a second one (#52,
invariant 4). `GET {mount}/api/capabilities` tells a caller the contract version, the
endpoints, and which operations its grant permits on this node.

**The owner password is the root, and no tool holds it.** The password is typed only on
the Studio's login page. Tools hold bearer tokens, minted two ways for one token model
(#52, invariant 1):

- **Mint and paste.** The owner names a client, picks REST or MCP and its permissions,
  and copies a token that lasts 30 days. This path exists because command-line tools,
  cron jobs and agents have no browser.
- **OAuth.** An authorization-code flow with PKCE, where the owner approves the requested
  permissions on their own Studio: the IndieAuth pattern, with the owner's own site as
  the authorization server. Access tokens last an hour; refresh credentials rotate; a
  grant ends no later than 30 days after the owner session that approved it.

A token is bound to one resource (an MCP token cannot call REST, and the reverse). The
Studio lists every grant; the owner revokes one or all. Changing the password ends the
owner's browser sessions and leaves grants standing, so after a suspected compromise the
owner must also choose revoke-all. #31 requires a password reset to offer it, because
compromise is exactly when an attacker has minted a token; the studio does not yet reset
the password from its own pages (it is a Worker secret today), so revoke-all sits on the
Studio's client-access page.

**Coarse verb scopes** (#52, invariant 3), none implying another:

| Scope | Allows |
|---|---|
| `owner:read` | Private reads: drafts, reading material, media, settings, history |
| `owner:draft` | Creating, editing, restoring and deleting drafts; uploads; preview; generation |
| `owner:publish` | Publication, withdrawal, refresh, permanent pins, response display, media deletion |
| `owner:manage` | Settings, subscriptions, signals, collections, response moderation |
| `reading:state` | Marking reading entries read or unread |

Publishing is a separate verb from drafting, so a tool can be trusted to write without
being trusted to make anything public. A change with public effect needs both verbs where
it touches both (attaching media to a published item needs `owner:draft` and
`owner:publish`). There is no refresh-only scope (#38).

**Discovery stays under the mount.** The Studio page carries `rel="authorization_endpoint"`
and `rel="oauth-metadata"` links, and the OAuth metadata lives at
`{mount}/studio/auth/.well-known/openid-configuration`. Nothing is published at the host
root, because a blyg may be mounted at a path (`venkateshrao.com/blyg/` is one) and the
host's root is not the blyg's to claim (#14). The cost is stated in the client's own
docs: this mount-only profile meets neither RFC 8414's host-before-path convention nor
RFC 9728's publication rule, so some OAuth clients may not discover it unaided.

**Writes are conditional.** Every item has a private `revision`, separate from its public
`version`. Each command names the revision it was made against; a stale one gets 409
`revision-conflict` and changes nothing. There is no blind retry and no idempotency-key
store: a client that loses a race reads again and reconciles. This matters most where
several tools write to one blyg, which is the normal case once a person has a desktop app
and a phone.

**Generated text is disclosed by the client.** A tool that writes model output submits
`provenance` with each scope's sources and, if known, the model; the public item carries
it as the protocol's `generated[]` (§5.7). The claim is the client's own assertion, like
every provenance member.

**Polling, not webhooks** (#39). `GET {mount}/api/changes` returns revision counters per
domain; a tool polls it and reloads only what moved.

## 4. What tools did with it

Gate G3 asked for at least one third-party tool authenticating with a scoped token before
this note was written. By 2026-11-09 there are two:

- **Blyg for Obsidian** (Florian Lohse, beta). Publishes notes from an Obsidian vault as
  fragments and threads, on desktop and mobile. It takes a REST token with the
  permissions it needs, keeps it in Obsidian's keychain (never in settings or a URL), and
  on connecting reports the Studio's version, the contract version and the token's
  permissions and expiry. It shows what will change before anything is sent.
- **Blygger Desktop** (Aneesh Sathe). Signs in through the browser, with a pasted API
  token, or with the password as a fallback for older Studios.

The history is the argument for #52's ruling. Before scoped tokens shipped (0.28.0),
Blygger Desktop held either the owner password or one unscoped owner token stored as a
server secret, and a Drafts action still signs in with the password today. Each tool held
the root credential because there was nothing else to hold. The token model ends that,
and the tools moved to it once it existed.

## 5. Designs turned down

- **A normative write API.** The reasons are §2: it would make static publishers
  non-conformant and buy nothing tools cannot get from each client's contract.
- **A manifest key for the API.** `blyg.json` is the public artifact, read by strangers.
  Advertising a private write surface there mixes the two halves of the studio/page
  split, and the endpoint is the client's to move. Discovery is the HTML link on the
  Studio page (#31, #52).
- **`/.well-known/` at the host root.** It is host-rooted, and a blyg need not own its
  host. A path-mounted blyg cannot publish there, and two blygs on one host would
  collide. The client keeps all of it under the mount and accepts the discovery cost (§3).
- **One owner token.** The extended-server workaround: a single unscoped secret. It is
  the root credential under another name, and revoking it cuts off every tool at once.
- **A refresh-only scope.** Rejected with #38: a scope should name what a tool may do,
  not a mechanism.
- **Idempotency receipts.** Not built. Conditional writes on a revision make a lost race
  visible instead of silently applying a stale edit twice; a receipt store would add
  state without that property.
- **Webhooks.** Polling first (#39); no push until a need is measured.

## 6. For other clients

None of this binds another client. A client that wants third-party tools to write to it
may find these parts worth copying, in rough order of value:

1. The owner's password never leaves the client's own login page; tools hold tokens the
   owner can list and revoke.
2. Publishing is a different permission from drafting.
3. Everything about the write surface lives under the blyg's mount, and nothing about it
   enters the public artifact.
4. Writes name the state they were made against, and a stale write fails loudly.
5. Generated text is disclosed through `generated[]`, by whichever tool wrote it.

A tool that wants to work with several clients will, for now, speak each one's contract.
If several clients converge on one shape, that convergence is what a later note, not the
spec, would record.
