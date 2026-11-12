# R5 — Enterprise: identity groups, managed keys, and what encryption adds

**Exploration, not a plan of record.** Written 2026-11-12 by Opus 5.5 for the 0.5 design
round (decision #99), task R5 of [`docs/l3-research-brief.md`](../../docs/l3-research-brief.md).
Serves questions H, F and D. Findings only; my own view is in the last section and is
marked.

**Dating.** Sources read on **2026-11-12** unless stated. Statements marked *(general
knowledge)* come from my training and were not re-checked against a source today.

## 0. Summary of findings

- **RFC-5's comment period has drawn nothing yet.** As of 2026-11-12: blygger-spec#27 (the
  comment issue for people without a blyg) has **zero comments**; the item page on
  blyg.blygger.org shows **no responses**; a search of the `blygger` org's issues for
  "RFC-5" and "enterprise" finds only #27. I cannot see studio-side verified mentions that
  the owner has not chosen to display, so "no responses shown" is not proof of no stubs.
  The period closes 2026-12-03.
- **"The identity provider decides who may unwrap" is an off-the-shelf pattern.** Google
  Workspace client-side encryption (CSE) does exactly this: content is encrypted in the
  browser under a data encryption key (DEK); the customer's **key access control list
  service (KACLS)** wraps and unwraps the DEK; the KACLS receives an **authentication JWT
  from the customer's identity provider** and an **authorization JWT from Google**.
  Microsoft Purview / Azure Rights Management and AWS KMS with attribute-based policies
  are other instances *(general knowledge)*.
- **Groups reach applications as token claims with hard size limits.** Microsoft Entra:
  "The number of groups emitted in a token are limited to 150 for SAML assertions and 200
  for JWT, including nested groups." OIDC Core defines no standard `groups` claim; each
  IdP names and shapes its own *(general knowledge)*.
- **Revocation in the enterprise is a SCIM event**: deprovisioning a user (SCIM `active`
  set false, or a DELETE — RFC 7643/7644, *general knowledge*) or removing them from a
  group. For a key service that checks the IdP at unwrap time, the next unwrap fails;
  nothing reaches content already decrypted.
- **Cloudflare Access (and its equivalents) already give a whole-origin deployment
  everything RFC-5 shape A needs**: deny-by-default applications, IdP-backed policies,
  service tokens for machines, a signed JWT to the origin. It can also protect *paths*
  ("use wildcards to protect multiple parts of an application that share a root path"),
  which is how someone would build per-item gating — the C2 shape #93 refused.
- **MLS has no production document-access deployment that I could find.** The nearest work
  is the IETF Open Cloud Mesh draft `draft-ietf-ocm-mls-federated-groups` (federated file
  sharing with per-file keys wrapped to the MLS epoch key; a WG document, not finished) and
  `draft-sullivan-mls-attachments`, which notes that revoking access to an existing
  attachment needs re-encryption.
- **Encryption adds three compliance burdens to #93 F5**: the organisation must be able to
  decrypt for e-discovery and legal hold (which pushes keys toward a company-held service,
  not toward readers); audit "who read what" becomes "who obtained which key", which is
  only observable if keys come from a service; and retention schedules can be met by
  destroying keys (crypto-shredding) — which, on this protocol, collides with pins.

## 1. RFC-5 and its comment thread

**What RFC-5 says that bears on L3** (read in full in the repo; §3.3 and §10 especially):

- Audience is a property of the origin (F1); "What an origin serves does not depend on who
  asks" is now §4 text.
- Group visibility within one origin is L3 (F4). Of the gate shapes: C2 (401/403 on chosen
  documents) refused; **C3 (encrypted static content) is where the L3 round starts**; C1
  (redacted wire, fuller rendition off the mount) is client territory.
- The cost RFC-5 names for today's answer (one origin per audience) is "N origins, N
  archives, N sets of pins", and the case that answer cannot meet is "an item that is
  team-only today and company-wide tomorrow" (shape E). #99 opened L3 without waiting for
  a named shape-E case.
- Section 7 asks implementers nine questions; question 1 ("Is one origin per audience
  enough? Name the case where publishing anew across audiences fails you") is the one an
  L3 design most needs answered.

**Comments received (checked 2026-11-12):** none visible (see §0). The RFC was published
2026-11-05, a week ago.

## 2. How identity providers expose groups, and how SCIM signals departure

| Mechanism | How group membership is exposed | Limits and quirks | How "left" is signalled |
|---|---|---|---|
| **OIDC** (ID token / access token / UserInfo) | No standard claim in OIDC Core; IdPs add one (`groups`, or custom) *(general knowledge)* | Entra: up to 200 groups in a JWT, "including nested groups"; above that the token carries an overage indicator and the app must query Graph *(overage mechanism: general knowledge)*. Entra recommends "Groups assigned to the application" for large organisations | Token lifetime: a user removed from a group keeps the claim until the token expires or is refreshed |
| **SAML 2.0** | Attribute statements in the assertion | Entra: up to 150 groups in a SAML assertion | Same: at next sign-in |
| **SCIM 2.0** (RFC 7643 schema, RFC 7644 protocol) | IdP pushes users and groups to the application; `Group.members` | — | **Deprovisioning**: `active: false` via PATCH, or DELETE of the user; group removal via PATCH on the group *(general knowledge)*. This is the enterprise meaning of revocation |
| **Directory APIs** (Microsoft Graph, Google Directory) | Pull membership on demand | Rate limits | Real-time |

What this means for keys: an L3 design that maps groups to keys needs a party that (a)
receives the IdP's assertion or SCIM feed and (b) decides who gets which key. The token
limits say that party should not expect every group in every token; it should ask the
directory or receive SCIM.

## 3. Envelope encryption with managed key services

**The common pattern** (*general knowledge*, consistent across vendors): content is
encrypted locally under a **data encryption key (DEK)**; the DEK is **wrapped** by a key
encryption key (KEK) that never leaves the key service; the wrapped DEK is stored beside
the ciphertext; reading means asking the service to unwrap, and the service's access
policy decides.

| Service | Wrap / unwrap | Who decides | Notes |
|---|---|---|---|
| **AWS KMS** | `GenerateDataKey` returns a plaintext and a wrapped DEK; `Decrypt` unwraps | IAM and key policies; *encryption context* (key–value pairs bound into the wrap, logged in CloudTrail); attribute-based access with IdP session tags via IAM Identity Center | Every unwrap is logged — an audit trail of key access *(general knowledge)* |
| **Google Cloud KMS** | `encrypt`/`decrypt` on a key; envelope by convention | Cloud IAM | Cloud External Key Manager lets the KEK live outside Google *(general knowledge)* |
| **Azure Key Vault** | `wrapKey`/`unwrapKey` | Entra ID + Key Vault access policies / RBAC | Managed HSM option *(general knowledge)* |
| **Google Workspace CSE** (read today: `developers.google.com/workspace/cse/guides/overview`) | Browser generates the DEK and encrypts; "Google sends the DEK and authentication tokens to your KACLS"; KACLS "encrypts the DEK and returns the protected result" | **The customer's IdP** authenticates the user ("The service that authenticates users before they can encrypt files or access encrypted files"); Google issues an authorization JWT "to verify that the caller is authorized to encrypt or decrypt a resource"; the KACLS can run additional "perimeter" checks | "Google servers can't access your encryption keys". The closest off-the-shelf match to "the IdP decides who may unwrap" |
| **Microsoft Purview Information Protection / Double Key Encryption** | Documents protected under a rights-management service; DKE adds a customer-held key | Entra identity and label policy | *(general knowledge, not read today)* |
| **Customer-held keys (BYOK/HYOK)** | The KEK is in the customer's HSM or service | Customer | Common enterprise procurement requirement *(general knowledge)* |

**Is "the IdP decides who may unwrap" off-the-shelf?** Yes — CSE is a product built on it,
and every cloud KMS supports policies keyed to IdP-federated identities. The shape is
always: **wrapped DEK travels with the content; an online key service unwraps for
authenticated, authorised callers.** That is AMP's shape (R2 §2.1) with the IdP as the
authority, and it is a hybrid of the brief's families: the wrapped key rides along
(wrapped to the *service*, not to readers), and entitlement is off-protocol.

## 4. What Cloudflare Access and equivalents give a whole-origin deployment

**Source read:** Cloudflare's self-hosted public application page. Other details
*(general knowledge)*.

- Deny by default: "All Access applications are deny by default."
- Policies select users by IdP identity, groups, email domain, device posture; service
  tokens (`CF-Access-Client-Id` / `-Secret` headers) admit machines — the "machine
  credential" RFC-5 §3.4 says a subscribing studio needs.
- The origin receives a signed application JWT (`Cf-Access-Jwt-Assertion`) it can verify.
- Paths: an application can cover "multiple parts of an application that share a root
  path" with wildcards; separate path-scoped applications are possible (linked page not
  read).
- Equivalents: Google Identity-Aware Proxy, Tailscale/WireGuard private networks, an
  internal-only DNS name, Zscaler/Okta access proxies *(general knowledge)*.

**What shape E needs beyond this.** Access gates *requests*; shape E wants one origin whose
items have different audiences. With Access alone that means path-scoped policies on item
documents — a 403 to some readers on chosen documents — which is exactly C2 (refused, #93
F4), and it breaks reconciliation (§13.2: the index lists items a reader cannot fetch) and
verification (§15.4). With encryption, the origin can stay behind one Access policy (the
whole company) while items carry content only some groups can decrypt; Access stays
transport, and the per-item audience moves into keys. The additional pieces are: a key
service that knows groups (CSE's KACLS, a KMS with IdP-federated policy, or a client's
own), a mapping from item to audience that the key service can read, and a reader client
that can authenticate to the key service (the same machine-credential problem as RFC-5
§3.4, one more endpoint).

## 5. MLS for document access

- **RFC 9420** is "a group key agreement protocol for messaging applications"; its
  architecture companion (RFC 9750) leaves access-control policy to the application layer
  (search-result summary; not re-read).
- **`draft-ietf-ocm-mls-federated-groups`** (Open Cloud Mesh WG; replaced the individual
  `draft-nordin-…`, revision -01 dated July 2026 in the version seen): uses MLS for group
  management in federated file sharing; files "can optionally be encrypted with a per-file
  key, wrapped with the current group key", derived from the epoch secret and rotating
  each epoch; membership changes need admin approval.
- **`draft-sullivan-mls-attachments`**: random-access encryption of large files keyed from
  the MLS exporter; notes that revoking access to an existing attachment requires
  re-encryption.
- **Deployments:** none found for document access. MLS deployments I know of are messaging
  (Wire, Webex, RCS) *(general knowledge)*.
- **Fit:** MLS gives forward secrecy and post-compromise security per epoch; joiners do not
  get past epochs. An enterprise archive wants the opposite for joiners (a new hire reads
  the team's history). Using MLS here means exporting an archive key per epoch and handing
  old epoch keys to joiners — re-creating a key-distribution service on top of MLS.

## 6. Compliance pressures that pull against encryption

#93 F5 already ruled how compelled removal and retention appear on the wire (a 404 with no
marker; retention never reaches a governed surface). What encryption adds:

| Pressure | Without encryption (today) | What encryption adds |
|---|---|---|
| **E-discovery / legal hold** | The organisation holds plaintext in its studio; published items are 200 forever (#8) | The organisation must be able to decrypt everything it published, for as long as a hold lasts. That pushes toward company-held keys (KMS/KACLS) and away from keys that exist only with readers. Lost keys during a hold are a legal problem, not just a reader problem |
| **Retention schedules / erasure** | Compelled removal = 404 (F5); pins promised forever | **Crypto-shredding** (destroy the key, keep the ciphertext) is the standard way to "delete" encrypted data in place *(general knowledge)*. On this protocol it would leave a pinned document serving ciphertext nobody can read — the pin's byte promise kept, its purpose not. It is also not a 404, so it is a different wire appearance from F5's compelled removal |
| **Audit: who read what** | Not observable: static reads are anonymous (§12.3), and RFC-5 §4.4 puts audit on the client's own actions | If keys come from a service, every unwrap is a loggable event (KMS logs every `Decrypt`) — "who obtained the key for item X version n, when". Ride-along keys wrapped to readers produce no such log; capability links produce none |
| **Data residency** | Where the files are hosted (RFC-5 §4.5) | Ciphertext may sit anywhere; residency attaches to keys and the key service. Some regimes accept "encrypted with customer-held keys" as satisfying residency for the ciphertext's host *(general knowledge)* |
| **DLP at publish** (RFC-5 §4.7) | The boundary rule: no reference to a narrower origin | Encryption inside one origin makes the boundary per item; the "quote a sealed item into a wider item" problem (R4 §3) becomes an enterprise DLP rule |
| **Offboarding** | Remove from the IdP; the gate stops serving | Same gate, plus: the person may hold decrypted copies and cached keys; nothing recalls them (§9, §14). Key rotation protects only future versions |

## Questions this raises for the design round

1. **H.** Does the protocol say anything about how an IdP group becomes a key, or is the
   mapping wholly the key service's (as in CSE), with the protocol carrying at most a
   wrapped DEK and a pointer?
2. **D.** Is the AMP/CSE shape — wrapped DEK in the document, wrapped to a *service*, an
   online service unwrapping for authorised callers — a ride-along design, an off-protocol
   one, or the layering the brief anticipates?
3. **F.** Is SCIM deprovisioning (or group removal) supposed to cause anything visible on
   the wire — a new key epoch for future versions — or is it entirely the key service's
   refusal at next unwrap?
4. **Compliance.** Does a sealed item have to stay decryptable by its publisher for as long
   as it is served (a requirement on publishers, not readers)?
5. **Crypto-shredding vs pins.** If a publisher destroys a sealed version's key under a
   retention schedule, is that a fourth state beside live, withdrawn and compelled-removal
   404 — and does a pin of that version still count as kept?
6. **Audit.** Is an unwrap log an expected product of L3 for enterprise, which only
   service-mediated keys provide? Does that tilt the enterprise mapping away from
   ride-along keys wrapped to readers?
7. **RFC-5 §7 Q1.** The round is proceeding without a named shape-E case. Should it ask
   the comment thread for one before ruling H, given the period closes 2026-12-03?
8. **MLS.** Is MLS out of scope for 0.5, given no document-access deployments and the
   joiner-history mismatch?

## Own view (Opus 5.5, clearly marked; not a finding)

Enterprise buyers already know one shape — CSE / KMS envelope encryption, where the IdP
decides and the key service logs every unwrap — and it happens to be the shape that
publishes nothing about readers (commitments 3 and 4) and needs no reader public keys.
If the protocol carried a wrapped DEK and the name of the service that can unwrap it, an
enterprise client could plug in its organisation's KMS or KACLS without the protocol
learning anything about groups. That is the observation; whether it is also right for
paid public content is R1's question.
