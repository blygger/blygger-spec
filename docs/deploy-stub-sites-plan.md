# Deploy plan: blygger.org and blygger.com stub sites

**Status:** PLAN, not yet executed. Written session 6 (2026-07-24), alongside the
brand rename and the `blygger-protocol/` scaffolding (`blygger-org/`, `blygger-com/`
repos created as empty stubs). Sonnet-safe to execute — infra/deployment work, not
protocol semantics; nothing here touches `docs/v0.1-plan.md`'s normative shapes.

> **Session 8 amendments (read before executing):** (1) The default mount is now
> **`/blyg`**, configurable per deployment via the `MOUNT` wrangler var (decision
> #14, plan task 17) — read every `/blyg/*` route pattern and URL below as
> `/blyg/*`, and set `MOUNT` per environment. (2) **Deploy targets changed:** the
> first two-node test network goes to `venkateshrao.com/blyg/` and
> `protocol-institute.com/blyg/` (Venkat, session 8), not the org/com pair;
> blygger.org is the spec/docs home (separate agent building its site) and
> blygger.com stays reserved. This plan's architecture — Workers Routes over a
> Pages catch-all, per-site Wrangler environments with independent D1/R2/secrets
> — applies unchanged to the new domains; `venkateshrao.com` DNS is already on
> Cloudflare (see `venkateshrao-cloudflare/`), shortening the §3 long pole.
>
> **Session 10 update (2026-08-06): `venkateshrao.com/blyg/` executed.** §5 steps
> 2–4 and 6–7 done for this domain: D1 `blyg-venkateshrao` + R2
> `blyg-venkateshrao-media` provisioned, `env.venkateshrao` added to
> `blygger-spec/worker/wrangler.jsonc` with Workers Routes for `/blyg/*`,
> `/studio/*`, `/api/*`, deployed and verified live (manifest, feed, studio
> login, API auth) — with the static Pages site confirmed unaffected outside
> those paths. Route registered in `venkateshrao-cloudflare/routes.md`; secrets
> in `Code/.env.keys`. Step 5 (landing content) is moot here — `venkateshrao.com`
> already has its own site, unlike the org/com pair this plan originally
> targeted. `protocol-institute.com/blyg/` (the second test-network node) remains
> undeployed — DNS onboarding for that domain is still the long pole.

## 1. Goal

Both `blygger.org` and `blygger.com` get:
1. A small **stub landing page** — human-facing site content, framed per domain
   (§4).
2. A live **`/blyg` deployment** of the reference client (`blygger-spec/worker`) —
   not a demo, a real independently-published feed with its own identity, D1
   database, and content. The two together are the **first real cross-client
   pair**: once v0.2 ships the subscribe side, blygger.org and blygger.com can
   follow each other, giving the protocol its first non-localhost multi-client
   test before any third party's client exists.

This doc plans the architecture and provisioning; it does not write the landing
page content or run the deploys (that's the execution session this plan hands off
to).

## 2. Architecture

**Decision: one Cloudflare zone per domain, two independently-deployed things
sharing it via Workers Routes — not one worker doing both jobs.**

Why not extend `blygger-spec`'s worker to also serve a landing page at `/`? It
already owns `/` (redirects to `/blyg/`), `/studio/*`, `/api/*` — folding
site-specific marketing content into the protocol reference implementation would
couple two things that should stay decoupled: the reference client should stay
identical across every deployment (including third parties' — it's the reference,
not a bespoke marketing site), and the landing content is genuinely per-domain
(commons framing vs. commercial framing, §4). Keeping them separate means
`blygger-spec` never has to know these two sites exist.

**The split, per domain:**

| Path pattern | Serves | Project |
|---|---|---|
| `<domain>/blyg/*`, `<domain>/studio/*`, `<domain>/api/*` | Reference client (unmodified `blygger-spec/worker`) | `blygger-spec`, deployed with a per-site Wrangler environment |
| `<domain>/*` (everything else) | Landing page | `blygger-org` / `blygger-com` repo |

Mechanism: **Cloudflare Workers Routes** let multiple Workers (or a Worker +
Pages project) share one zone; the most specific matching path pattern wins
regardless of declaration order, so `<domain>/blyg/*` naturally overrides a
`<domain>/*` catch-all with no ordering fuss. This is a documented, supported
Cloudflare pattern (Pages site + Worker mounted at a sub-path) — no custom
routing code needed on either side.

**Landing page implementation:** Cloudflare Pages (git-connected to
`blygger-org`/`blygger-com`, auto-deploys on push) for the static content, with
its custom-domain association covering the zone; the `/blyg`, `/studio`, `/api`
Workers Routes take precedence over Pages for those paths per the mechanism
above. Simpler to author/update than a hand-rolled Worker for what's meant to be
a small, low-churn stub.

**Reference-client deployment:** `blygger-spec/worker/wrangler.jsonc` gains two
named environments (`org`, `com`), each with its own D1 `database_id`, R2
`bucket_name`, and `routes` binding for that domain's `/blyg/*` (+ `/studio/*`,
`/api/*`). One codebase, two independent deployed instances — `wrangler deploy
--env org` / `--env com`. This is additive to the existing default (unnamed)
environment, which stays available for a plain workers.dev reference instance if
still wanted (see §6).

## 3. Prerequisites (one-shot, do first)

1. **DNS: both domains onto Cloudflare.** Custom domains for Pages/Workers Routes
   require the zone to be on Cloudflare's nameservers. Add `blygger.org` and
   `blygger.com` as Cloudflare zones, update nameservers at the registrar,
   wait for activation.
2. **Secrets & IDs, registered per `Code/warnings-keys.md` policy:**
   - Two D1 databases (`blyg-org`, `blyg-com`) — `wrangler d1 create`.
   - Two R2 buckets (`blyg-org-media`, `blyg-com-media`).
   - `OWNER_PASSWORD` + `COOKIE_SECRET` per site (independent — these are
     separate identities, not shared credentials), via `wrangler secret put`.
   - All four secrets/ids registered in `Code/.env.keys` before first deploy.

## 4. Content scope (stub, not final)

Deliberately minimal — enough to be a real, non-embarrassing public page, not a
marketing push:

- **blygger.org** — commons framing. One paragraph on the protocol (can lift from
  `README.md`'s "The idea" section), a link to `blygger-spec` (spec + reference
  impl), a link to its own `/blyg/` feed, and — since this domain **is** the XML
  namespace host — a plain-text note at `blygger.org/ns/0.1` (or wherever the
  namespace URI resolves) saying what it is, since `https://blygger.org/ns/0.1`
  will be dereferenced by curious implementors even though RSS namespace URIs
  aren't required to resolve to anything.
- **blygger.com** — commercial-dev framing. Same core paragraph, reframed: "this
  domain is for protocol-adjacent commercial work"; no specific commercial
  content yet (there isn't any) — just an honest placeholder, not a fake product
  page.
- Both link to each other and note they're a live cross-client pair once v0.2
  ships.

## 5. Execution task list (for the session that builds this)

1. DNS onboarding for both zones (prerequisite, blocks everything else).
2. Provision D1/R2/secrets for both sites (§3.2); register in `.env.keys`.
3. Add `org`/`com` environments to `blygger-spec/worker/wrangler.jsonc`; apply
   migrations to both new D1 instances (`wrangler d1 migrations apply --env
   org`, `--env com`).
4. Deploy `blygger-spec/worker` to both environments; verify `/blyg/`,
   `/blyg/feed.xml`, `/blyg/blyg.json` on both live domains.
5. Write and deploy landing content for `blygger-org`/`blygger-com` (Pages).
6. Wire Workers Routes so `/blyg/*`, `/studio/*`, `/api/*` override Pages on
   each zone.
7. Verify: landing page loads at `/`, blyg feed loads at `/blyg/`, studio login
   works at `/studio` on both domains, feed validates in a real RSS reader.
8. Update `blygger-spec/CLAUDE.md` TODO + `DEVLOG.md` with the live URLs (same
   convention task 11 already specifies).

## 6. Relationship to `blygger-spec` task 11 (deploy)

Task 11 in `v0.1-plan.md` (§5) — "reference instance on workers.dev" — is still
open and still fine to do independently (a workers.dev instance costs nothing and
is useful for quick manual testing without touching DNS). But once this plan
executes, **blygger.org's `/blyg` deployment becomes the de facto public
reference instance** — same codebase, real domain, better than workers.dev for
anyone actually trying the protocol. Recommendation: do task 11's workers.dev
deploy first (fast, no DNS dependency, unblocks verifying the deploy path works
at all) as a rehearsal for this plan's org/com deploys, which reuse the same
`wrangler deploy` mechanics with real domains layered on.

## 7. Explicitly out of scope here

- Any actual commercial product content for blygger.com — this plan only
  provisions a placeholder.
- Cross-client subscribe/import (v0.2) — the two sites will be live blyg
  feeds, but nothing consumes either feed until v0.2 ships the subscribe side.
- Namespace URI resolution behavior beyond a plain-text note (§4) — building a
  real machine-readable namespace document is a v0.2+/protocol-spec question,
  not a stub-site concern.
