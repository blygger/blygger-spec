# The basic Agentic digest and a reference outside agent — plan

**Status:** a plan, not built. Session 90 (2026-11-27), Opus 5.5, from Venkat's brief the same day.
It builds on [`agentic-feed-plan.md`](agentic-feed-plan.md) (the contract, sessions 77–78) and its
foundations in studio 0.69.0 (`src/agentic.ts`, `GET`/`PUT /agentic/{feed}`, the digest tab). A
client contract (decision #31): nothing here reaches the wire, so no Fable ruling is needed. It is
sequenced after PR (access layer): editions are private items, and private items come first.

## 1. The brief (Venkat, session 90)

- **A basic built-in digest** with four sections:
  - (a) **Highlights:** new posts that are longer and are not responses to existing posts;
  - (b) **Happening conversations;**
  - (c) **Interesting mentions from people you don't yet follow;**
  - (d) **Samples of interesting new blygs that have become active.**
- **The built-in agent offers a digest/feed switch:** the same edition, read as a digest or as a feed.
- **A reference outside agent** that runs on a local device, signs in with OAuth, and gets its
  intelligence from the owner's local AI plan through headless Claude Code (`claude -p`), not an API
  key. It shows something simpler: filtering the feed by a standing set of interests ("robotics and
  movies"), organized by interest, in both presentations.
- **Inspiration:** Florian Lohse's Daily in Blyg for Obsidian (`florianlohse/blyg-obsidian`,
  `src/digest/`, its `docs/ARCHITECTURE.md` § Daily digest).

## 2. What Florian's Daily teaches

Read at `florianlohse/blyg-obsidian` on 2026-11-27, the day of its #130–#141. The parts worth
taking:

1. **Deterministic first, AI as a layer.** The digest exists with no model: stories are clusters
   found by rule, ordered by rule, with first-sentence headlines. AI writes headlines, summaries
   and sections over that. A failed or refused AI run leaves the deterministic digest standing.
   This is the right shape for the built-in assistant on a node without a model key.
2. **Clusters by structure, then by text.** (a) A reply joins the post it answers. (b) Posts
   that quote the same item join, even when that item is outside the window. (c) A post left
   alone joins the one it most resembles (tf-idf cosine ≥ 0.4, at least 5 terms and 3 shared),
   on the cautious side: a missed join leaves a post alone, a wrong one puts strangers together.
   Rules (a) and (b) are our conversations section almost as stated.
3. **An edition per cutoff.** A daily time (default 07:00, local clock) opens an edition, which
   covers the 24 hours before the cutoff and keeps growing until the next one. Stories are stable
   within an edition: a new post joins the story it answers or resembles, and it doesn't reshuffle
   the page. The last 14 editions are kept, read-only.
4. **The model sees positions, not ids.** Requests carry numbered stories and about 300
   characters of a single post's own words, never a whole body and never an item id. Answers are
   read strictly: unknown or duplicate numbers are dropped, and a forgotten item goes to "Other".
   That is the §14 posture (fetched text is data) made concrete.
5. **Bounded and honest about cost.** Batches of at most 8 groups, 40 single posts or 50 items per
   request. A cut-off answer is retried once in halves. Results are cached by (cluster hash, prompt
   version, model). There's a per-day token ceiling for automatic runs, a cost estimate before a
   manual run, and a monthly cost line.
6. **One plain voice.** One fixed editorial voice ("the gist at a glance, no wordplay, invent no
   names, numbers or quotes"), versioned, with no persona picker.
7. **Reading in the digest.** Mark read from the digest (through `reading:state`). A post shows
   which section it sits in. Back returns to the same scroll position.
8. **Feed / Digest is one mode switch** (`readerPane.mode`) over the same reader, not two products.

What we don't take: his per-device CRDT sync. One node holds one edition, so the Worker is the
single writer.

## 3. The built-in digest

### 3.1 Shape

The resident assistant (agentic-feed-plan §5) becomes a **pipeline of pure selectors plus an
optional AI layer**, writing through the same `PUT /agentic/{feed}` an outside agent uses.

- **The edition clock.** A setting `agenticDigestTime` (owner's timezone, default 07:00) opens an
  edition. It covers the window since the previous cutoff and grows until the next one. A cron
  tick (the 15-minute one) extends it when the reading collection's generation has moved.
- **The selectors are pure functions** from held data to candidates, one per section, each
  bounded. Each is an oracle's model almost as written (§6).
- **The AI layer is optional.** With a model configured (`ai_model_feed`), it ranks within each
  section, writes headlines, one-line reasons and a lede, in Florian's posture (positions not ids,
  own words capped, strict reading, cached by content, under the AI budget). Without one, the
  deterministic edition stands, with first-sentence headlines and rule-stated reasons ("longest
  new post from a blyg you read daily").

### 3.2 The four sections

| Section | Candidates (deterministic) | AI layer adds | Kind |
|---|---|---|---|
| **(a) Highlights** | Items new in the window from followed blygs, whose **own words** (text outside quotes and generated spans) run past a threshold (default 300 words). Excluded: stubs (`stub_of` set), forks, and items that are mostly quotation. | Ranks them, picks a lead, writes the headline and one line of why | `lead` + `section` |
| **(b) Happening conversations** | Clusters by Florian's rules (a) and (b) over our structure: `stub_of`, `transclusions[]`, `links[]`, verified `mentions_in`, own items included. A cluster counts when it has ≥ 2 distinct authors and ≥ 1 item in the window. Ordered by activity in the window. | One headline per conversation and who is in it; the catch-up helper's link | `section`, entries grouped (`group`) |
| **(c) Mentions from people you don't follow** | Verified `mentions_in` in the window whose source origin is not a subscription (the receiver already verified them; nothing is fetched). | Which are worth your time, and why in a line | `briefs` |
| **(d) New blygs that have become active** | Any public blyg not followed that has posted in the last N days, found two ways: blygger.com's directory (`/blygs.json`, as Discover reads it), and blygs met in your reading (origins in quote chains, `links[]`, stubs and forks of what you read, and mention sources). One sample item each, read through `/peek` (nothing stored). At most 5. | Which samples are interesting given what you read and write | `briefs` |

A section with no candidates is left out of the edition, so a quiet day is a short page.

**(d) is the discovery mechanism for new follows** (Venkat, session 90). A blyg with a public feed
is assumed to want to be found, listed or not, so the directory is one source among several,
not a gate.

### 3.3 The contract change: entries the node does not hold

Today every edition entry references a reading entry the node holds, and the layout drops what
doesn't resolve (§3, "an assistant can never put anyone's content on the page"). Sections (c) and
(d) are, by definition, about things the node doesn't hold. Two additions to the closed set keep
the promise in spirit:

- **`mention` entries** reference a verified receipt by its id. They render from the receipt the
  receiver stored and verified (source page, kind, relation, author), not from text the assistant
  supplies.
- **`remote` entries** reference `{origin, id}` on a public blyg the node has met: in the
  blygger.com directory, or in its reading's quote chains, links or mention sources. They
  render through `/peek` when opened. The card shows only the assistant's headline, marked as
  generated, plus the origin's name; nothing is stored. Each one offers *subscribe*.

Both are additions to the private contract (a minor bump). An assistant still can't put arbitrary
content on the page: a `mention` must name a receipt the node verified, and a `remote` must name
an origin the node has met, whose item `/peek` can read.

### 3.4 Digest / feed switch

One edition, two presentations, switched in the tab and remembered per feed:

- **Digest:** today's rendering. Masthead, lede, sections, the lead large, briefs in columns.
- **Feed:** the edition's entries as one list, in edition order (sections in order, entries in
  order; for a `scores` edition, by score), each card carrying its reason and its section as a
  chip ("In the digest: Highlights", as Florian does). Groups fold under their first entry.

No contract change: the switch is presentation, and every assistant's edition gets both for free,
including the outside agent's.

### 3.5 Editions over time

Keep the last 14 editions per feed (a new table, `agentic_edition_history`: feed, cutoff, the
edition as written, the resolved layout's ids), read-only from a date control in the masthead,
as Florian does. One migration. Rows: about 14 × feeds, small.

### 3.6 Cost (the soft free-tier rule)

- **Rows:** the selectors read the window, not the corpus: about the size of one Reading page per
  run, plus the cluster joins. The pipeline runs per edition change, not per tab load. The build
  states each selector's rows measured with `wrangler d1 insights`.
- **AI:** one batched ranking call per section with candidates, cached by content, under
  `AI_DAILY_CALL_LIMIT` (or #10's budget when it lands).
- **Network:** (d) reads `/blygs.json` once per edition, checks the unfollowed origins it has met
  for recent activity (their feeds, conditionally), and peeks at most 5.

## 4. The reference outside agent

### 4.1 What it shows

A small program on the owner's own machine that keeps its own Agentic feed ("Robotics and
movies"). It:

1. reads new reading entries since its last run (conditional reads, #152);
2. asks the local model, entry by entry in batches, which standing interests each one touches;
3. writes an edition with one section per interest, and an "Other worth a look" brief;
4. leaves both presentations to the Studio's switch (§3.4).

It is deliberately simpler than the built-in digest, and it exercises the whole outside path: OAuth,
the edition contract, multiple feeds, and model text disclosed as generated.

### 4.2 Where it lives and what it's made of

`blygger-studio/examples/interest-agent/`: one Node file with no dependencies beyond the standard
library (no vendored dependencies, session 29). It calls `/api` over `fetch`, with the request
shapes taken from `openapi.json` rather than the SDK tarball, so it reads as a model for agents in
any language. A README walks through setup. It is linked from `docs/` as agentic-feed-plan §9's
"worked outside assistant", step 5.

### 4.3 Signing in (OAuth, native-app pattern)

The Studio already supports dynamic client registration, S256 PKCE, refresh rotation and
per-grant revoke (`docs/client-access.md`).

1. First run registers itself at `{mount}/studio/auth/oauth2/register` as a public client with a
   loopback redirect (`http://127.0.0.1:<port>/callback`, RFC 8252).
2. It opens the owner's browser at the authorize URL with `resource={mount}/api` and the scopes
   it needs. It catches the code on the loopback port and exchanges it.
3. It stores the refresh credential in a file the owner alone can read (mode 0600, outside any
   synced folder). It never stores the password.
4. Grants end within 30 days of the owner session, so the agent re-asks then. It says so in one line.

**The scopes are the open question (§7, Q1).** Today `GET /agentic/{feed}` needs `owner:private`,
and `PUT` needs `owner:manage` plus `owner:private`. Since 0.73.0, `owner:private` reads the whole
notebook. A filtering agent should not need that.

### 4.4 Intelligence from the local plan

Each batch is one headless Claude Code call on the owner's machine, under their Claude plan:

```sh
claude -p --model sonnet --tools "" --no-session-persistence \
  --output-format json --json-schema "$SCHEMA" \
  --system-prompt "$CLASSIFIER_PROMPT" < batch.json
```

- **`--tools ""`**: no tools at all, so text in a post can at most misclassify it. It can't read
  a file, run a command or fetch a page (§14).
- **`--json-schema`**: the answer is structured and validated, and read strictly like Florian's
  (positions, not ids; unknown positions dropped).
- **`-p`**, not `-c`: `-c` continues the last conversation; `-p` is the non-interactive mode.
- Batches of about 20 entries, each one's own words capped (about 300 characters plus the headline).
- Results are cached by (entry id, version, interests hash), so a re-run costs nothing.
- The plan's usage limits are the budget. A run that hits one stops cleanly and keeps the last
  edition.

The model name is recorded in the edition's `agent.model`, so the Studio discloses the text as
generated, the same as for the resident assistant.

### 4.5 Running it

`node agent.mjs --feed robotics-movies --interests "robotics, movies"` once, or on a schedule
(launchd or cron, hourly). It writes only when its classification changed (`expectedRevision`
guards a race). A `--dry-run` prints the edition instead of writing it.

### 4.6 What the Studio needs for it

- **A second feed.** The routes are keyed by feed since 0.69.0, but the UI shows one tab. Adding
  feeds (name, brief, driver: off, resident, or a named grant) is agentic-feed-plan §3.3's next
  step, and step 4 below.
- **The driver check.** Only the feed's chosen driver may `PUT` (agentic-feed-plan §5), so the
  outside agent can't overwrite the built-in digest.

## 5. Build order

Each step ships on its own, oracle first.

1. **Scopes** (Q1, ruled: narrow first). `reading:read` and `reading:curate` scoped per feed,
   with an edition draft that a curate grant may write without seeing private items. Their laws are
   Kyle's to approve (the auth oracles).
2. **The selectors (a)–(d)**, as pure functions with their oracle, and the deterministic edition
   written on the cron. No AI yet.
3. **`mention` and `remote` entries** in the closed set, with their rendering and *subscribe*.
4. **Several feeds:** the list, per-feed name, brief and driver, tabs in the owner's order.
5. **The digest/feed switch** (§3.4) and the edition history (§3.5, migration).
6. **The AI layer** for the built-in digest: ranking, headlines, reasons, lede; cached and under budget.
7. **The reference outside agent** (§4), exercised live on blyg.blygger.org, with a post about it
   there.

## 6. Designed for CI

Per the design principle in the studio's `AGENTS.md` (one choke point per cross-cutting property,
laws before code):

- **Visibility goes through the access object** (PR (access layer) shape B): selectors read items
  only through it, so a restricted grant's edition can never select or resolve a hidden item. No
  selector filters by status itself.
- **Each selector is a law.** For example: "for every window, an item is a highlight candidate
  if and only if it is new in the window, from a followed blyg, past the own-words threshold, and
  not a stub, fork or mostly quotation". The model is the sentence. Fixtures come from real
  threads on the three nodes.
- **The edition resolution law** extends to the new entry kinds. For every `mention` entry the
  receipt exists and is verified; for every `remote` entry the origin is one the node has met
(the directory or its reading).
  Anything else is dropped, never shown.
- **The AI layer is outside the laws:** its output can only choose and order among candidates the
  laws admitted, and its text is always marked generated. A broken model answer degrades to the
  deterministic edition.

## 7. Venkat's answers (session 90, 2026-11-27)

1. **Scopes: narrow first.** `reading:read` and `reading:curate` before the reference agent ships.
2. **"Longer" is 300 own words**, as the default of a setting.
3. **(d) reaches beyond the directory.** It is the discovery mechanism for new follows: a blyg with
   a public feed is assumed to want to be found, even if it is not listed.
4. **Where the reference agent lives:** not answered; the plan assumes `blygger-studio/examples/`.

## 8. The deterministic digest's laws (approved as written, Venkat, session 90)

**The edition window follows the frequency** (Venkat, session 90, amending laws 1 and 2): the
digest is written hourly, daily at 07:00 or Mondays at 07:00 in the owner's timezone
(`agenticFrequency`), and its window is the last day for an hourly or daily edition and the last
week for a weekly one. Wherever the laws below say "the window", that is the window meant.

Probe first (venkateshrao, read-only, 2026-11-27): over one day, 12 long non-response items from
11 blygs, 13 new stubs answering 10 items, 0 verified mentions from unfollowed origins (1 in
seven days). The probe read 23,117 rows, so every selector is an indexed window query and states
its rows.

1. **Highlights.** For every edition window, an item is a highlight if and only if all of these
   hold: it is held from a followed blyg that is not in Background; it was created in the window;
   its own words (text outside quotes and generated spans) are at least the threshold (default
   300); it is not a stub or fork; and it is not in Conversations. Ordered by own words, then
   newest; at most 7, and the first is the lead.
2. **Conversations.** For every window, a conversation is a connected set of held items (own
   included) linked by `stub_of`, quotes, `links[]` or verified mentions, with at least two
   distinct authors and at least one item created in the window. Each appears once, ordered by
   items in the window, then newest; at most 5.
3. **Mentions.** For every window, a verified receipt is listed if and only if it was verified in
   the window and its source origin is not followed. Newest first; at most 5.
4. **New blygs.** For every window, an origin is listed if and only if it is not followed, the node
   has met it (the directory, or an origin in its reading's quotes, links, stubs, forks or mention
   sources), and it has a public item created in the last 14 days. One sample each, its newest
   item; ordered by how often met, then newest; at most 5.
5. **The edition.** For every window, an item appears in at most one section (Conversations wins
   over Highlights), a section with no candidates is absent, and the same held data and window
   give the same edition. An unchanged edition is not written again (added by Venkat, session 90,
   so an idle node spends no writes).

**Laws 3 and 4 as built (Venkat, session 92, 2026-11-27).** Probe (venkateshrao, read-only): 57 blygs
in the directory (46 posted in the last 14 days); 13 unfollowed origins met in the reading, of which the
most met (381 references) was the node's own origin, and several were old addresses of blygs that
have moved. Rulings:

- **Bounded, daily.** Discovery runs once a day (the 07:00 tick in the owner's timezone, whatever the
  frequency, or Regenerate now) and spends at most 14 fetches: the directory, then up to 13 feeds.
  Hourly editions reuse the day's result. The queue: met origins neither followed nor the owner's own,
  less listed ones whose directory `lastPost` is missing or 14 or more days old; most met first, then
  newest `lastPost`, then origin; one feed fetch each (a listing's `feed`, else `{origin}feed.xml`),
  stopping once five are active. Active means a feed item, not withdrawn, whose `blyg:created` is in the
  last 14 days; the newest is the sample.
- **Form B:** the discovery writes `met_origins` (migration 0066), which every edition and the
  resolution of `remote` entries read, so neither touches the network.
- **Hidden receipts are listed** in Mentions: the digest is private.
- Added rules, marked as such in the oracle: the own origin is never a new blyg; a directory listing
  makes an origin met but adds nothing to how often it is met.
- Owned by `blygger-studio/test/agentic-outside.oracle.test.ts` (laws 3, 4 and the resolution law).
