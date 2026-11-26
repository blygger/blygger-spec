# Multi-author blygs in the reference client — plan

**Status:** PLAN, building (session 83, 2026-11-23, Opus 5.5 with Venkat; second draft, after
Venkat pointed at the PI site's login). M0 is in review as studio#178 (session 85: rulings taken,
reworked oracle-first, independent review pending); M1 is built on the local branch `feat/stored-bylines` (commit `4379b14`, tests
updated), waiting on #178. M1 departs from §4 on one point, **confirmed by Venkat (session 85, 2026-11-24): no backfill** —
versions published before M1's migration keep being served from settings, because the default byline URL is the request
origin, which a migration cannot see. #178 took migration 0062, so M1's becomes **0063**. Target: studio 0.73. This is
`docs/mentions-build-plan.md` step 6 ("member roster and per-token bylines").

Design already ruled:
- **tn-6** §5.4–5.6: the byline comes from the contact record, the shared-origin `rel="me"`
  proof, agent members.
- **tn-3** shape B: one origin with bylines. The house withdraws anyone's item and owns every
  pin.
- **RFC-6** §6: on a shared origin, "who inside may read it is the house's business, run off
  the wire". A lock's home decides by "a roster, a sign-on token, a person".

Nothing here reaches the wire beyond the `author` object those notes already rule (#11).

**Test case:** blyg.protocol-institute.org (root mount, PI Cloudflare account). Institute
partners post with their own byline and log in with **their existing PI login**.

Questions for Venkat are marked **Q**, each with a recommendation. The auth-oracle changes
(§10) are Kyle's to approve.

## 1. What exists

**In the studio:**
- **One principal.** `auth.ts` signs the owner cookie over `OWNER_PASSWORD`, and `oauth.ts`
  grants client privileges only to `user.id === 'owner'`. The five scopes in `auth-scopes.ts`
  (`owner:read|draft|publish|manage`, `reading:state`) each cover everything of their kind.
  Ownership of a resource is never checked, because there is only one owner.
- **The byline is not stored.** `protocol.ts` `author(settings, origin)` builds `author` from
  `settings.author_name`/`author_url` every time an item document is built. A settings
  change silently rewrites the byline of every published item (pinned files aside). This is
  a single-author bug as well as the first blocker for several authors.
- **Contacts** (migration 0042) have no member flag. tn-6 §5.4's "member's contact record"
  has nowhere to live yet.

**On the PI side: one login shared across subdomains, already used three times.**
- protocol-institute.org runs a passwordless PIN login. Resend sends a 6-digit PIN, which is
  stored hashed and expires in 15 minutes (`website/docs/authentication.md`). It sets
  `pi_session=<token>:<email>` with `Domain=.protocol-institute.org`, `HttpOnly; Secure;
  SameSite=Lax`. Members get 90-day sessions and admins 24 hours. Sessions are checked
  against `auth_pins` in the `pi-members` D1.
- **cogergo** (`cogergo/functions/_shared/auth.js`) has no login of its own. It reads
  `pi_session` and checks it against `pi-members`.
- **bdfx** formalises the same thing as a **host adapter** (`bdfx/design/design.md` §2,
  `src/host/pi.js`), with four functions:
  - `session(request)` returns a person id;
  - `person(id)` returns `{id, name, isAdmin}`;
  - `projects()` and `units()` return the host's groups with their owners.

  bdfx stores person ids (the PI member slug) and nothing else about a person.
- PI already models what tn-6 §5.6 needs for agents. `members.owner_email` ties a bot
  profile (Humboldt) to its human, which is an agent member with an `operator`.
  `/api/members/me` returns the profiles a person owns.
- PI has **no "partner" role yet**. Today it has `is_admin`, program hosts, project leads,
  and research groups (`programs` of kind `sig`).

The blyg node is a fourth consumer of this pattern, so the studio should adopt bdfx's shape
rather than invent a parallel one. The pattern is common: the studio delegates login to the
site it is attached to. Reverse-proxy forward-auth and Discourse's DiscourseConnect are the
received forms (#71). OIDC is the standard form of the same delegation.

## 2. The permissions model this plan commits to

> **Design for CI (Venkat, session 87; `sealed-content-build-plan.md` §0).** Private items
> took four review rounds because their law holds on every surface and each feature filtered
> by hand. Before building this model, name its one choke point (one function every
> permission decision goes through), its closed set of roles and states, and its laws as
> "For every" sentences, and write the oracle with the law. A permission that cannot be
> decided at that choke point is a design finding, not a build task.


The plan is small, but it is the first time the studio has more than one person in it, so it
fixes the shape that RFC-6 Phase 3 (group visibility) and later roles will extend. Five
parts, each usable on its own:

1. **Identity source.** This is where a person comes from. The built-in source is today's
   owner password, the root credential, never delegated. A **host** source is an adapter
   (§3). Each source yields a stable **person id** (`host:pi:venkat`, `owner`).
2. **Principal.** This is who is acting on a request: a person, or a token minted by or for
   a person. Every request resolves to exactly one principal before any route runs.
   `OwnerAccess` becomes `Access { principal, personId, scopes, clientId, grantId? }`.
3. **Group.** A named set of people. A group either comes from the host (PI research groups,
   project teams, admins, partners once PI has them) or is kept locally by the owner. The
   studio stores a group as `(source, ref)` and asks the source who is in it, as bdfx does.
   It never copies the member list. **The same group object becomes a lock's roster in
   RFC-6 Phase 3.** A lock's home answers a reader's key request by asking whether they are
   in the group. Authoring rights and sealed reading then share people and groups but are
   enforced differently: scopes in the studio, keys on the wire.
4. **Role.** A named bundle of capabilities. A **capability** is
   `verb × resource class × reach`, where `reach` is `own` or `any`. Scopes are what tokens
   carry, and each scope expands to capabilities. 0.73 ships two roles:
   - **owner:** every capability, `any` reach, plus roster, settings and tokens.
   - **member:** draft, publish, pin and withdraw at `own` reach; read their own studio
     material; add to the address book.

   Later roles (curator, editor, reader) are new bundles, not new code paths.
5. **Policy.** These are the owner's rules that give roles to people: "group X of source Y
   gets role *member*". Individual grants and suspensions override them. **Policy is data
   in Settings, not code.** The whole access story is then one readable list, which a later
   UI can show, and which the auth oracle (§10) enumerates.

**Enforcement is in one place.** The operation runner checks each operation's capability
against the principal, and checks `reach` against the resource's `author_id` (items, private
versions, media, hoppers). No route checks `=== 'owner'` itself. Private items 0a already
built the route-enumerating test this needs.

Not taken:
- **Role booleans on member rows** (an `is_admin` copy). They would duplicate the host and
  drift from it.
- **Copying host member lists into the studio.** That repeats bdfx's rule: store ids, read
  the rest from the host.
- **Per-route ownership checks.** These are what the operation runner removes.

## 3. The host identity source

**The adapter interface** is bdfx's, cut to what the studio needs:

| Function | Returns |
|---|---|
| `session(request)` | person id or null |
| `person(id)` | `{id, name, url?, photo?, operator?}` (`operator`: the owning person, for bot profiles) |
| `groups(personId)` | the `(source, ref)` groups the person is in |
| `group(ref)` | `{ref, title}` for Settings |

**How the studio reaches PI: an HTTP host API** (Venkat, 2026-11-23; reading `pi-members`
directly was the alternative). PI's side is
[Protocol-Institute/website#24](https://github.com/Protocol-Institute/website/pull/24),
opened this session and not merged.
- **Three server-to-server endpoints behind `HOST_API_SECRET`:**
  - `GET /api/host/session`: the studio forwards the visitor's `Cookie` header and gets back
    the person, or a 401 that looks the same for every failure.
  - `GET /api/host/people/{slug}`: one member, for refreshing a byline or re-checking a role.
  - `GET /api/host/groups`: the groups the owner can grant rights to.
- **The person object** is `{id, name, url, photo, type, operator, groups}`. It never
  includes an email.
- **Groups:** `admin`, `tier:<tier>`, `role:<name>` and `hosts:<program>`.
- **Migration 067 adds `member_roles`.** Venkat creates the posting role there (for example
  `blyg-author`), and the blyg's policy maps `role:blyg-author` to *member*.
- The same API is what cogergo and bdfx could move onto later, which would end their copies
  of the `pi_session` check.

**Sessions.**
- The studio never holds `pi_session` beyond the request it arrived on. At studio login
  ("Sign in with Protocol Institute"), it calls `session()`. If the person has a role, it
  issues its own **member session cookie**, signed over
  `["member-session-v1", expiry, personId, epoch]` with `COOKIE_SECRET`. It is independent
  of `OWNER_PASSWORD`, so an owner-password reset doesn't sign members out.
- **The studio re-checks the host every 15 minutes.** When a member logs out of PI, is
  removed there, or loses their group, their studio session ends within that window.
- Logging out of the studio ends only the studio session.
- A person with no role sees "your Institute account has no posting rights here", and
  nothing else.

**Email.** With a host source, the studio sends no email: the PIN, Resend and its key stay
the PI site's. A built-in email-code source, for standalone multi-author blygs, is deferred.
Nothing in this plan needs it, and it would bring a new sender and a new key.

**Same-site caution.** `pi_session` is a parent-domain cookie, and every protocol-institute.org
subdomain is same-site, so `SameSite=Lax` gives no protection between them. The studio's own
member cookie is host-only (no `Domain`), and every state-changing call keeps the existing
`Origin` / `Sec-Fetch-Site` check. The rule is written down so a later change can't drop it.

## 3a. The owner: one person, two strengths (step-up)

Venkat is both the owner and a PI member (Venkat, 2026-11-23: "a kind of sudo privilege
escalation model"). The received forms are GitHub's sudo mode and OAuth step-up
authentication (RFC 9470), so the studio follows them (#71).

- **One person, one byline.** The owner's person row may carry **linked identities**
  (`host:pi:venkatesh-rao`). Signing in through PI as a linked identity yields the *owner
  person* with only the roles policy gives that identity. For Venkat that is *member*, under
  the same byline he has today.
- **Owner capabilities need the root password.** An operation that needs the owner role,
  attempted by the owner person without it, answers `401 step_up_required`. The studio
  then shows the password prompt, then retries the operation.
- **After the prompt the browser holds an elevated session**, today's owner cookie,
  for **12 hours** (Q4).
- **A sudo window inside it.** The most sensitive operations also need a password typed in
  the last **15 minutes**:
  - the roster and policy;
  - minting tokens and revoking all of them;
  - backups and exports;
  - withdrawing someone else's item.

  The cookie already records when the owner authenticated (`sessionAuthenticatedAt`), so the
  window costs nothing to check.
- **The host never yields the owner.** A PI compromise reaches at most a member's rights.
  The root password stays the only way up, and it is typed only on the studio's own login
  page (#52 invariant 1).
- **Tokens never step up.** A tool holds the scopes it was minted with, and minting an owner
  scope is itself inside the sudo window.

## 3b. Which identity sources the studio supports

A few common sources in core, and a documented slot for the rest (Venkat, 2026-11-23: "not
every auth pattern, just a few common ones and advice on mods for the long tail").

| Source | For | Groups come from | Re-check |
|---|---|---|---|
| **Owner password** (built in, always on) | the root, and step-up (§3a) | — | — |
| **Host session** (this plan; HTTP contract, PI's #24 the reference) | a blyg attached to a site that has a login | the host's `groups` | poll `people/{id}` every 15 min |
| **OIDC** | organisations with an identity provider (Google Workspace, Microsoft Entra, Okta, Authentik, Keycloak, Cloudflare Access acting as one), **and** standalone blygs whose members sign in with an account they already have (Google, Apple; GitHub through the same adapter's plain-OAuth variant), invited by the owner | the `groups` claim; else local groups kept by the owner | token expiry, then sign in again |
| **IndieAuth** | group blogs whose members **each already have a website** they control (a blyg, WordPress with the IndieAuth plugin, micro.blog, or a homepage delegating to indielogin.com) | local groups kept by the owner | none needed |

All four already fit §2's model without changes: each yields a namespaced person id
(`host:pi:<slug>`, `oidc:<issuer>#<sub>`, `indieauth:<url>`), the studio always issues its
own session, and groups are references that policy maps to roles. Two properties are worth
naming:
- **IndieAuth's person id *is* the byline URL** (#35), so the byline is proved at sign-in
  rather than by the two-fetch `rel="me"` check of §6. It's the most blyg-native of the
  four, but it only fits members who already run a website.
- **OIDC through Cloudflare Access** is the enterprise case (RFC-5): a company puts the
  studio behind Access and the members are its staff.

**Standalone blygs.** Most people have no website, so IndieAuth is a niche source, not the
standalone default. The default is OIDC through an account people already have, with the
owner inviting them. For people who will not use any such account there is a fifth source,
an emailed one-time code. Its shape: the response is the same whether or not the address is a
member, the code is 8 characters, single use, valid for 10 minutes, with 5 tries, and it is
bound to the browser that asked. It brings a sender and a key, so it is built when a
standalone blyg asks, not in 0.73.

**The long tail is mods.** Discourse SSO, WordPress cookies, SAML, ATproto OAuth,
Sign-In with Ethereum: each one is a compiled-in **identity-source extension** (#89 surface
2) implementing the four-function adapter of §3. This is a new extension slot, so it needs
its own rules, written in `docs/mods.md`:
- It returns a person; it never issues a session or a cookie.
- Its ids are namespaced by source, and an email is never an id (emails change).
- It declares its re-check interval.
- It must not name the owner. Step-up stays core's.
- It ships with the shared **adapter conformance oracle**: forged, expired and revoked
  sessions yield no person; a lost group is seen within the interval; nothing it returns
  can grant the owner role.

Venkat's notes say radical options belong in extensions, and this is the same reasoning
applied to authentication. The slot is studio-side and reversible, so Opus rules it under
#58; Kyle reviews the oracle.

## 4. The roster and the byline

**The roster** is the people who have logged in or been added by the owner. One row per
person, holding only what the studio itself needs:

```sql
CREATE TABLE people (
  id TEXT PRIMARY KEY,                -- 'owner' | 'host:pi:<slug>' | 'agent:<id>'
  contact_id TEXT NOT NULL REFERENCES contacts(id),   -- the byline record (tn-6 §5.4)
  kind TEXT NOT NULL CHECK (kind IN ('person','agent')),
  operator_id TEXT REFERENCES people(id),             -- agents (tn-6 §5.6 item 1)
  model TEXT,                                         -- agents
  page_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active','suspended')),
  epoch INTEGER NOT NULL DEFAULT 0,
  created TEXT NOT NULL, updated TEXT NOT NULL
);
CREATE TABLE role_grants (           -- policy (§2.5): to a group or to one person
  id TEXT PRIMARY KEY, role TEXT NOT NULL,
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('group','person')),
  source TEXT, ref TEXT NOT NULL, effect TEXT NOT NULL CHECK (effect IN ('allow','deny')),
  created TEXT NOT NULL
);
```

- **The contact record is the byline.** A host person's record is seeded from `person()` and
  refreshed at each login. For PI, `name` is their PI name and `url` defaults to their PI
  profile page. The member can then point `url` at a home of their own (§6).
- **The owner is a person row too**, seeded from today's `author_name`/`author_url`.
- **People are never deleted.** Their bylines are frozen per version. *Suspended* ends their
  sessions and tokens.
- **Stored bylines:**
  - `items.author_id` records whose item it is. It is set at creation, and the owner may
    reassign it on a draft.
  - `versions.author_json` and `private_versions.author_json` hold the `author` object
    frozen at publish.
  - `buildItemJson` serves the latest version's stored `author`. Feed author elements and the
    `p-author h-card` read the same stored object.
  - A backfill writes exactly what each document serves today, and a guard test asserts
    every live document is byte-identical before and after.
- The owner editing a member's item keeps the member's byline: that is the house's editorial
  right (tn-3 §4).
- **Agents:** a PI bot profile with an `owner_email` becomes an agent person whose
  `operator_id` is its human. It has no login, only tokens minted by the owner. Its token
  scope decides the byline (tn-6 §5.6 item 2), and pin and withdraw are off by default
  (item 4).

## 5. Scopes for members' tools

Member scopes are the member role's capabilities, written as scopes: `member:read`,
`member:draft`, `member:publish`, all at `own` reach (names are the build's, #52 invariant
3). A member mints OAuth or manual tokens for their own tools within their own role. The
owner sees and can revoke every token. #31's "the root password is held by no tool" stands.

## 6. Identity on the public pages: h-cards, `rel="me"`, identifiers

**What exists (checked 2026-11-23 against studio 0.72 and the live nodes).**
- **Settings.** *General* has Author name, Author URL (blank = the blyg's own address), Bio
  and Avatar. *Links → masthead menu* takes `label | url` lines.
- **Masthead.** It shows name, bio and avatar, and each masthead link as `<a rel="me">`. It is
  not marked up as an h-card.
- **Item pages.** An `h-entry` with a hidden `p-author h-card`, which carries the name only,
  linked to Author URL.
- **Item documents.** `author: {name, url}`. The studio has no `ids` field and emits none.
- **`blyg.json`.** `author` has the name, bio, avatar and links.
- **Contacts.** Adding a contact reads `rel="me"` from the contact's page and records the
  results as `self` ids (`selfIdsInPage`).
- **Found mentions.** They match Author URL and the blyg's address only (`ownMentionTargets`).
- **Live state.** Both nodes leave Author URL blank, so each byline names the blyg itself.
  venkateshrao.com's home page has no `rel="me"` back to `/blyg/`, so the masthead's links
  run one way only.

**What M3 builds**, for the owner and every member alike, because each is a person (§4):
1. **A representative h-card.** The blyg's home page marks the owner's masthead up as
   `h-card` (`p-name`, `u-url u-uid`, `u-photo`, `p-note`, with the masthead links as
   `u-url` + `rel="me"`). Each `/people/{slug}/` page carries the member's h-card in the
   same shape.
2. **A fuller byline h-card.** The `p-author h-card` on item pages gains `u-photo` and links
   the member's page or `author.url`. It's built from the version's stored `author_json`
   (§4), not from settings.
3. **Identifiers.** The person record gets the tn-6 `ids` list (`https:`, `acct:`, `did:`).
   Provenance is set by the resolver, never by the caller (§5.6 item 3):
   - a URL found as `rel="me"` on the person's own `author.url` page is `self`;
   - one entered by hand is `entered`, and stays off the wire until resolved.

   The byline emits the filtered `self`/`bound` ids as `author.ids` (tn-6 §5.4).
4. **`rel="me"` on the Author URL link itself**, wherever the byline or masthead shows it.
5. **The proof state.** The profile screen (the owner's in Settings, a member's on their
   own) runs a reader's two fetches against itself and shows *verified* or *claim*, with the
   missing half named:
   - for one person: "add `<a rel="me" href="…/blyg/">` to your home page";
   - on a shared origin: a link back to the person's page under the origin (tn-6 §5.5).

   The result is cached, rechecked daily and on save, and shown only to the person concerned.
   Nothing is published.
6. **Found mentions use every `self` identity.** A mention of any URL in the person's
   verified `ids` or masthead links counts as them, not only Author URL.

**Member pages.** `/people/{slug}/` under the mount (PI:
`https://blyg.protocol-institute.org/people/venkatesh-rao/`) shows the h-card of item 1 and
the member's public items, newest first. It's presentation, so no manifest key names it.

**The proof for each kind of byline:**
- **A member with a home of their own.** Their `author.url` is that home, which links
  `rel="me"` to their member page, and the member page links back (tn-6 §5.5).
- **A PI member.** `author.url` defaults to their PI profile page, which the host API
  returns as `person.url`. PI could add the `rel="me"` there too. That page is the house's
  own, so the byline stays a claim, which is honest (§5.5).
- **The one-person case** (venkateshrao.com/blyg). Set Author URL to
  `https://venkateshrao.com/`. That home page carries `<a rel="me"
  href="https://venkateshrao.com/blyg/">`, and the masthead's venkateshrao.com link is the
  return. This is a change to the `venkateshrao.com/` repo, made when M3 ships so item 5 can
  confirm it.

## 7. Private items, notebooks and hoppers

- **"Private" means the author and the owner.** The owner is the house (tn-3 §5, RFC-6 §6:
  the house can read everything granted to the origin). Group visibility is RFC-6 Phase 3:
  a sealed item under a lock whose roster is one of §2.3's groups.
- **Private items 0c–0e** (`sealed-content-build-plan.md` §1) come first. Members need the
  reference block, the private-read scope (`member:read` is its member form) and the leak
  tests. The leak tests gain a member-to-member axis.
- **Hoppers** (Aneesh, studio#175, agreed 2026-11-23):
  - The owner's hopper view shows own members, private ones marked.
  - The make-public confirmation names every public hopper the item is in.
- **Notebooks are hoppers.** A hopper gets an `author_id`. A member keeps their own hoppers
  of their own items. The owner's hoppers are the house's, and imported items are allowed in
  them. A notebook shared with a group later is a hopper whose visibility is a group, so no
  rule may say a hopper's readers are its author alone.

## 8. The reading side: deferred, with its meaning fixed now

Today reading is the house's: one set of subscriptions, one reader, one Agentic feed trained
by one person's signals. "Can members act on the feed?" covers three different kinds of act:

| Kind | Acts | Who, when members get reading |
|---|---|---|
| **Personal** | read and unread, saved for later, the member's own catch-up | each member, their own state per item |
| **Responding** | stub, quote or link an item into their own draft | any member: it makes their item, not the house's |
| **Curating** | subscribe and unsubscribe, hoppers with imported items, Background placement, thumbs and signals that train the house's assistant, moderation | the owner, or a later *curator* role (§2.4) |

**For 0.73:** members get no reading view. A member who wants to respond to an item pastes
its URL into the stub-from-anywhere flow (#82), which needs no subscription.

**When the reading view comes:** members share the house's reader, read-only on what it
follows. They get personal state and responding, and curating stays a role. So "a shared
reader view managed by the owner" is the right summary, with personal read state as the one
thing that isn't shared. A member who wants their own subscriptions needs their own blyg
(tn-3's test).

## 9. The address book

One shared book. Any member may add contacts, and those entries are `entered`, set by the
resolver, never by the caller (tn-6 §5.6 item 3). The book stores `added_by`:
- A member edits or removes the entries they added.
- The owner edits, merges or removes any entry.

One `@handle` therefore means the same person on every byline. This is `reach` applied to
contacts (§2.4), not a special case.

## 10. The auth-oracle changes (Kyle's to approve)

- Every `auth-security` law that assumed one principal gains member-to-member and
  member-to-owner cases.
- New laws:
  - **reach:** a member's session or token never reads or writes another member's item,
    draft, private version, media, hopper or contact entry, and gets 404 on items (403 on
    contacts, which are shared to read).
  - **roster and policy:** only the owner session changes people, role grants, settings or
    another person's tokens.
  - **host session:** a forged, expired or revoked `pi_session` yields no principal; losing
    the role on the host ends the studio session within the re-check window; the member
    cookie is host-only.
  - **root:** an owner-password reset leaves member sessions alone, and suspension ends
    them.
- Mutants to seed: drop the reach check on one route; trust a cached host answer past the
  window; accept the member cookie without the epoch; let a role grant through the API under
  `member:*`.

## 11. Build order

| Step | What | Visible change | Needs |
|---|---|---|---|
| M0 | Private items 0c–0e and the hopper fix (§7) | Aneesh's fixes | — |
| M1 | Stored bylines (§4) | none (the guard test) | — |
| M2 | Principals, capabilities and the single check in the operation runner (§2), with the owner as the only person | none | Kyle's review starts |
| M3 | People, role grants, the owner posting with a member's byline; member pages, h-cards, `ids`, the proof state (§4, §6) | the owner can publish as a partner; verifiable bylines | venkateshrao.com's `rel="me"` back-link at ship |
| M4 | The host source (§3), step-up (§3a), member sessions, scopes and tokens (§5) | partners sign in with PI; Venkat posts via PI and steps up for owner work | website#24 merged, its secret set, the role created |
| M5 | Agent people, member notebooks, the shared book's `added_by` (§4, §7, §9) | | |

M0, M1 and M3 make one release; M2, M4 and M5 make another (`batch-changes-per-ci-run`).
M2 ships alone in the second batch's PR first, so Kyle reviews the model before any member
can log in.

## 12. Questions

Answered 2026-11-23:
- **Q1. Who gets posting rights?** Venkat creates a PI role for it (for example
  `blyg-author`), in `member_roles` (website#24). Policy: `role:blyg-author` → member.
- **Q2. How does the studio check a PI login?** Through the HTTP host API, website#24.
- **Q3. How does the owner act?** By step-up, §3a.

- **Q4. How long does elevation last?** 12 hours, with the 15-minute sudo window of §3a.

## 13. Not in scope

- The members' reading view (§8).
- Roles beyond owner and member.
- The built-in email-code source.
- Shape A (several origins under one host).
- Passkeys (row 34) and the owner-password reset (row 18).
- Anything on the wire beyond the `author` object.
