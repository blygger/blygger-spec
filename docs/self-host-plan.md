# Self-Host Plan — a packaged Cloudflare blyg anyone can stand up

**Status:** PLAN, not executed. Written session 21 (2026-09-16, Opus) from Venkat's
answers to the four artifact decisions below.

This is deliverable 1 of the two named in `roadmap.md` § "Release candidate". It is
**operational tooling, not protocol surface** — the same category as
`deploy-protocol.md`, and therefore Sonnet/Opus-safe. Nothing here adds, removes, or
constrains a wire construct; a blyg stood up by this tooling is byte-identical to one
stood up by hand.

## 1. Objective & non-goals

**Objective:** a person with a domain, a Cloudflare account and a terminal can have a
working blyg — publishing, subscribing, TK generation — in under fifteen minutes, and
can take the next protocol version afterwards without hand-merging config.

**Non-goals, each deliberate:**

- **Not a one-click deploy button.** Rejected session 11, and the rejection holds for a
  reason that has only got stronger: the interactive parts — which account, which mount,
  which secrets — are exactly the parts that go wrong, and a button cannot ask.
- **Not a docs-only guide.** Also rejected session 11. The hand-done path is ~12 steps
  with two copy-the-generated-id-back-into-config loops; prose that long is prose people
  get halfway through.
- **Not a hosted service.** No blygger-operated instances. The medium's whole claim is
  that anything serving files can host one.
- **Not multi-tenant.** One repo, one blyg, one owner. The single-publisher invariant
  (decision #11) is per-origin, and nothing here changes that.

## 2. The four decisions (Venkat, session 21)

### 2.1 Artifact shape: **GitHub template repo + `npm run init`**

`blygger/blygger-spec` gets marked a template repository. A user clicks *Use this
template* (or `gh repo create --template`), gets their own repo, and runs an
interactive init that provisions and configures.

```
gh repo create my-blyg --template blygger/blygger-spec --private
cd my-blyg && npm install && npm run init
```

Chosen over `npx create-blyg` **for now** on cost: the npm route has the better update
story (bump a dependency) but requires restructuring `worker/` into a publishable
library with a stable public API — a new surface to maintain and freeze, at a moment
when the protocol itself is explicitly unstable (decision #21). Revisit at 1.0, when
there is something worth freezing an API against.

**The update path is the known weak point and is treated as a first-class deliverable
rather than a footnote** (§5). A template copy is a fork, and forks drift.

### 2.2 Mount: **subdomain only, at first**

`init` provisions `blyg.theirdomain.com` as a Cloudflare **Custom Domain**, which
auto-provisions DNS and needs no route patterns.

Path mounts (`theirdomain.com/blyg/`) remain fully supported by the protocol and by the
client — decision #14's origin-relativity is untouched — but `init` will not generate
them, for the reason session 11 hit head-on: **`/studio` and `/api` are host-rooted
regardless of `MOUNT`**, so a path mount on a domain already serving `/api` collides,
and plain Routes need manual DNS besides. `venkateshrao.com/blyg/` works because that
domain's root path space was free. Most people's isn't.

Documented as a manual recipe in the generated README, not automated. If demand appears,
automating it is additive.

### 2.3 Directory backend: **Worker + D1, personal Cloudflare account** (see §7)

### 2.4 Directory validation: **run the v0.2 resolution algorithm** (see §7)

## 3. What `init` actually does

Interactive, resumable, and idempotent — re-running it after a failure must not create a
second D1 database. State lives in the generated `wrangler.jsonc` and a
`.blyg-init.json` marker; every step checks before it creates.

| Step | Action | Failure mode it prevents |
|---|---|---|
| 1 | `wrangler whoami` → list accounts → **user picks one explicitly**, even if there is only one | Incident `2026-09-12-01`: deploying to the wrong account. Never inferred. |
| 2 | Prompt domain + subdomain label (default `blyg`) | — |
| 3 | Verify the zone exists in the chosen account | Otherwise failure surfaces much later, at deploy, as a confusing routing error |
| 4 | `d1 create blyg-{slug}` → capture id → write it into `wrangler.jsonc` | The copy-paste loop, which is where hand setup goes wrong |
| 5 | `r2 bucket create blyg-{slug}-media` | — |
| 6 | Write the named env block: `name`, `account_id`, `vars.MOUNT=""`, cron trigger, D1, R2, Custom Domain | — |
| 7 | `d1 migrations apply --remote` | A blyg that 500s on first request |
| 8 | `wrangler secret put OWNER_PASSWORD` / `COOKIE_SECRET` — **wrangler prompts; init never reads, echoes, stores or transmits the value** | Secrets in shell history, in a config file, or in a log |
| 9 | Offer `AI_PROVIDER_KEY` (skippable — TK generation is optional) | — |
| 10 | Append the target to `deploy-targets.json` | Gets them the s17 deploy protocol for free: account cross-check, migration preflight, post-deploy verification |
| 11 | Print next steps: `npm run deploy`, then the studio URL | — |

**On secrets.** `init` shells out to `wrangler secret put` and lets *wrangler* do the
prompting. The script never holds the plaintext. This is not only hygiene — it is what
lets the whole flow be driven by an agent, or pasted into a tutorial, without a
credential passing through anything that logs.

## 4. What already exists and is reused

Not a greenfield build. Session 17's deploy protocol is most of the machinery:

- `scripts/deploy-lib.ts` — account cross-check (`crossCheckTarget`), `stripJsonComments`,
  `hasPendingMigrations`, `verifyUrl`. All directly reusable.
- `scripts/deploy-all.ts` — the deploy half, already multi-target.
- `deploy-targets.json` — the manifest `init` appends to. Its no-secrets-in-committed-files
  convention is already documented in the file itself.
- `migrations/0001`–`0006` — apply unchanged.
- `scripts/export.ts` — gives every self-hoster the static-export escape hatch on day one,
  which is the credible answer to "what if Cloudflare goes away".

New code is roughly: `scripts/init.ts` (the interview + provisioning), a generated
`README-YOUR-BLYG.md`, and the upgrade tooling in §5.

## 5. The update path — the part the record has never answered

A template copy is a fork. Without an answer here, the artifact strands people on 0.2,
which is worse than shipping nothing.

**Mechanism:** `init` adds `blygger/blygger-spec` as a git remote named `upstream` and
writes the template's commit SHA into `.blyg-init.json`. `npm run upgrade` then:

1. fetches `upstream`, shows what changed since their recorded SHA (with `migrations/`
   and `wrangler.jsonc` called out separately — the two files that carry conflict risk);
2. merges;
3. runs `d1 migrations apply --remote` for anything new;
4. re-runs the test suite and `tsc` before offering to deploy.

**The conflict surface is deliberately small and stays that way.** Everything
deployment-specific lives in exactly two places — the named env block in
`wrangler.jsonc` and a row in `deploy-targets.json`. Nothing under `worker/src/` should
ever need per-deployment editing. **That is a constraint on us, not on them:** any future
change that makes a self-hoster edit `src/` to configure their instance breaks the
upgrade path, and should be a settings row or an env var instead.

**Honest limits, stated in the generated README rather than discovered:** a user who
edits `src/` is on their own at merge time; pre-1.0 the wire can change under them
(decision #21); migrations run forward only.

## 6. Where people find this: `blygger.org/start/`

Venkat's framing: *one page on .org where you find your options for building a blyg.*
A new content page, third genre already established by `/talks/`.

Three routes, honestly labelled by effort and by what each gets you:

1. **Host it on Cloudflare** (this plan) — the full client: studio, subscriptions,
   hoppers, TK. ~15 minutes, needs a domain and a CF account.
2. **Just be readable** — you already have an RSS feed, so blygs can subscribe to you
   today with zero work. Genuinely the first row, because it is true and costs nothing,
   and it makes the medium look joinable rather than demanding.
3. **Build a client** — spec, CSS contract, conformance levels, and the standing ask for
   a second implementation.

Plus a "what you get / what you don't" block that states the pre-1.0 no-promises stance
(#21) at the moment someone is deciding to invest, not buried in a status section.

## 7. blygger.com — the directory (companion deliverable, same session)

A single page: an *add your blyg* box, then a feed of approved blygs — **home pages, not
feeds**. A link to blygger.org for the protocol.

**Stack:** Worker + D1 on the **personal** Cloudflare account (where blygger.org already
lives; the `.com` is the commercial-adjacent sibling, and putting it under the PI org
would muddy that split). Same toolchain as the client, so nothing new to learn.

**Submission → approval flow:**

1. Anyone POSTs a URL. Stored `status: "pending"`.
2. **On submission, the v0.2 resolution algorithm runs against it** — normalize → direct
   `blyg.json` probe → feed-upgrade via `<blyg:manifest>` → one-hop `<link rel="blyg">` →
   conventional mounts → RSS fallback. The result records `kind: "blyg" | "rss"`, the
   resolved origin, the site title and the home-page URL.
   **This is the most valuable part of the whole directory and the reason to build it:**
   it runs our own resolver against strangers' real sites, which is a test of the spec
   we have no other way to run. Resolution failures are logged, not discarded.
3. Admin-gated review (same cookie auth as the studio, one owner password) approves or
   rejects. Nothing is public until approved.
4. The public page lists approved entries: title, home-page link, and a small mark
   distinguishing a real blyg from a plain feed.

**Deliberately not:** no ranking, no counts, no follower anything (the protocol's stance
on all three is settled — decision #12 and the follow-is-nothing rule in #13), and the
page never republishes anyone's content, only links the home page.

**Built and deployed session 21** — Worker + D1 + Custom Domain on the personal
account. The zone was already active (the domain was registered through Cloudflare);
an earlier note in this plan claimed it was not onboarded, inferred from a `curl` that
failed only because nothing was connected to the domain yet.

## 8. Task breakdown (ordered; commit-sized, each with an acceptance check)

| # | Task | Acceptance |
|---|---|---|
| 1 | `scripts/init.ts` skeleton: account picker + zone check, writes nothing | Run against a real account; refuses a domain not in it |
| 2 | Provisioning: D1 + R2 create, id capture, `wrangler.jsonc` write | Idempotent — second run creates nothing, reports existing |
| 3 | Migrations + secrets via `wrangler secret put` | Fresh blyg answers `blyg.json` 200 after deploy |
| 4 | `deploy-targets.json` append + s17 cross-check passes | `npm run deploy:all` sees the new target and verifies it |
| 5 | Generated `README-YOUR-BLYG.md` | Covers studio URL, export escape hatch, upgrade, limits |
| 6 | `npm run upgrade` | Simulated: tag an old SHA, upgrade, migrations apply, suite green |
| 7 | Mark repo as a GitHub template; end-to-end dry run on a throwaway domain | A blyg stood up start to finish by following only the generated README |
| 8 | `blygger.org/start/` page | Three routes live, links resolve |
| 9 | blygger.com Worker + D1 + submit/approve/list | Local `wrangler dev`: submit, resolve, approve, appears |
| 10 | Deploy blygger.com | **Done session 21** — live, both nodes submitted |

## 9. Definition of done

- A person who has never seen this repo stands up a working blyg from the template
  following only the generated README, on a domain we do not control.
  **Met in the wild, 2026-09-25, without the template existing.** Three strangers stood
  up conformant 0.3 nodes from `blygger.org/start/` alone — `jd-blyg.exe.xyz`,
  `blyg.aneeshsathe.com`, and `thinking.drwip.com` (path-mounted at `/blyg/`, advertised
  with `<link rel="blyg">`, which is decision #14 exercised by someone we never spoke
  to). Read this as the criterion being satisfied by the *provisional* instructions, not
  as the template being unnecessary: nobody has yet had to upgrade.
- Their instance takes a subsequent protocol version via `npm run upgrade` without
  hand-editing config. **Not met, and now the binding constraint** — there are three
  third-party nodes and no packaged distribution, no upgrade command, and no way to
  tell them a new version exists. Tracked as the high-priority item in `CLAUDE.md`
  → TODO → Post-launch.
- `blygger.org/start/` names all three routes in.
- blygger.com lists at least the two existing nodes, both resolved as `kind: "blyg"` by
  the real resolver. **Done** — approved session 22; the directory now lists five blygs
  and three plain feeds (2026-09-25).

## 9.1 Prerequisite added session 23: harden the Webmention endpoint first

> **⚠️ This gate has fired — 2026-09-25.** The condition was "before the self-host
> template makes origins discoverable". The template never shipped, but the outcome
> arrived anyway: three third-party nodes exist and blygger.com now publishes their
> origins. All three run the reference client, so all three advertise an unhardened
> Webmention endpoint at a URL any stranger can now find from a public directory page,
> and the operators are people who did not choose to run an endpoint — they followed a
> start page. The work below is no longer a prerequisite for a future artifact; it is
> outstanding hardening on live third-party deployments, and it is the reason the
> version-alert path in the Post-launch TODO matters as a *delivery mechanism* and not
> just a courtesy.

**This is the gate item the v0.3 work created, and it belongs here rather than in the
v0.3 plan, because the trigger is exactly what this artifact does.** A self-hosted
blyg advertises a `webmention` endpoint — an *unauthenticated public POST*, the only
one in the codebase — and the template makes origins both numerous and discoverable
(the directory lists them). Today the endpoint's defences are: syntactic validation
before any outbound fetch, bounded verification (≤ 2 fetches, ≤ 3 redirects, 5 s,
1 MB), no stored content, and a rate limit of 60/hour **per source host**.

Three gaps, all cheap, none urgent while the network is two nodes nobody has heard of:

1. **Count the limit against the registrable domain, not the host.** `a.spam.example`
   and `b.spam.example` are different hosts, so wildcard DNS defeats a per-host cap
   entirely.
2. **A global hourly cap on pending verifications.** Each accepted claim spends up to
   two outbound fetches at URLs a stranger chose; per-host limiting doesn't bound the
   total, and the bill is the deployer's.
3. **Prune `failed` rows**, which currently accumulate forever.

~1 hour, all local, no protocol surface. **Do it before task 1 of §8**, because after
that the instances are other people's and their defaults are whatever we shipped.

Venkat's standing ruling on the policy question this sits next to (session 23): the
endpoint stays **open to all origins** — requiring a real blyg publishing a real
structurally-verified stub is the spam control, and restricting it to subscribed
origins would end the property the design exists for.

## 10. Open decisions (Venkat)

- ~~**Does this gate on v0.3?**~~ **Ruled session 22 (2026-09-16, Venkat): yes, it
  gates.** The release-candidate gate's "pubsub/subscribe (v0.2–v0.3)" leg wants the v0.3
  half, not just v0.2's live subscribe side. This plan is therefore written-and-held:
  none of §8's tasks 1–8 start until Fable's v0.3 pass lands. Reasoning recorded in
  `roadmap.md` "Release candidate" — a self-host artifact ships instances into a network
  whose cross-client semantics are still under design, and every such instance becomes a
  compatibility constraint on decisions Fable has not made yet.
- **Private or public template repo default?** `gh repo create --template` above shows
  `--private`. A public default makes for a visible network of blygs; a private one is
  the safer suggestion for someone's personal writing.
- **Does the directory need an abuse story before it is public?** Approval is manual and
  nothing appears unapproved, so the blast radius is a queue that fills with spam. Rate
  limiting is one line and can wait; worth saying out loud that it was considered.
