# Delegates — simple agents that complex agents and people share

**Status:** a plan, not built. Session 77 (2026-11-21), Opus 5.5 with Venkat. Companion to
[`agentic-feed-plan.md`](agentic-feed-plan.md). A client contract (decision #31), not protocol.

## 1. The idea (Venkat)

A top-level agent, such as the Agentic feed's assistant or a power user's own, should not have to do
everything itself. It delegates routine work to a set of **simpler agents**: some purely
mechanical, some backed by a small, cheap model. The same delegates are available to a person in
the UI and to a person's own AI through the API or MCP.

**Agents are peers of the human owner.** They see the same mechanical and simple-AI affordances a
person sees as buttons, through the same operations. They also get some affordances that make no
sense for a person (bulk runs, graphs, raw structure) but help an agent.

Two examples:
- **Catch up** (Burrow 0.23.0, from Venkat's request for a "conversation graph microscope"): lays a
  nested quote thread out oldest first, each card showing only that post's own words, with an
  optional AI summary that follows the conversation in order.
- **Classifier agents** like Clef and Jev: decision models with a fixed label set, already used by
  the change classifier.

## 2. Kinds of delegate

| Kind | What it is | Cost | Examples |
|---|---|---|---|
| **Mechanical** | A pure function over what the node holds. Deterministic, free, instant | none | Catch-up layout, the quote chain at every depth, the "responds to" walk, word diff between versions, stale quotes, burst and fold, near-same, the pace-layered order, Background reasons, who-quotes-whom |
| **Decision** | A decision model with a fixed label set (Clef, Jev). An injected instruction can at most mislabel (§14) | small, budgeted | Change size (typo, minor, major, refresh), topic labels from the owner's list, "is this the same story as X", relevance to the owner's writing |
| **Text** | A small text model that writes words, always disclosed as generated | budgeted | Catch-up summary, changelog summary (exists), headline or dek for an entry, translation, a digest of a long thread |

Delegates compose. Catch up is the clearest case: the mechanical layout feeds the text summary,
which a top-level assistant can then quote in an edition. Each layer is usable on its own.

## 3. What already exists, to be wrapped rather than rebuilt

- **Quote chain at every depth** (0.49.0, `src/ui/reader-links.tsx`; the `data-blyg-*` layers
  already in every baked thread). This is most of catch-up's mechanical half.
- **History and word diff** between public versions (0.15.0, `src/imported-history.ts`,
  `src/word-diff.ts`).
- **Freshness** of quotes (0.12.0, `src/freshness.ts`).
- **The change classifier** (`src/change-class.ts`, decision models from `models.json`).
- **Changelog summaries** (0.58.0, `src/changelog-summary.ts`; written once per version, kept).
- **Background reasons, bursts, the pace-layered order** (0.62–0.68).

Today these are internal functions or UI features. The plan gives each a name and a contract.

## 4. The contract

**One operation per delegate, under `/api/delegates/{name}`, and the same as an MCP tool** (#52:
MCP is a transport for the contract, not a second one).

- **A catalogue:** `GET /api/delegates` lists each delegate with its name, kind, a one-line
  description, input and output schemas, cost class, the model it would use (owner-chosen), and
  whether it is offered in the UI.
- **Calling:** `POST /api/delegates/{name}` with typed input, typically reading identities (`sub`,
  `remoteId`, optional `version`), as Saved and editions name entries.
  - Mechanical delegates answer at once.
  - Model delegates answer at once when cached, else start a **run**
    (`GET /api/delegates/runs/{id}`). The caller polls, as everywhere (#39).
- **Output is data, with provenance.** A model delegate's output carries `{ model, at, sources }`
  in the §5.9 reference shape. Whoever places it in a thread places it as an `impyrt` span, so it
  is disclosed when published, as editions do (`agentic-feed-plan.md` §3.1).
- **Caching:** results are keyed by delegate, input identities and their versions, like changelog
  summaries. Asking twice about the same versions costs nothing. A new version is a new key.
- **Scopes:** reading a delegate's inputs needs what reading them directly needs (`reading:read`
  for an agent, the owner cookie for the UI). Model delegates also need `reading:delegate` so an
  owner can let an agent read without letting it spend. Delegates never write to the blyg; a
  caller that wants to act on a result does so through its own grant (`reading:curate`,
  `reading:save`, …).
- **Budget:** model delegates spend the node's AI budget, attributed per caller (the owner's UI, the
  resident assistant, each outside grant). Settings shows who spent what and can cap each caller.
  This is where pending call #10's budget model lands.

## 5. People and agents get the same affordances

- **In the UI**, a delegate marked for people is a control where it belongs: **Catch up** on any
  thread with nested quotes (a sheet, oldest first, with an optional summary); **classify** in an
  entry's ⋯; **translate** later. The button calls the same operation an agent calls.
- **For agents**, every delegate is in the catalogue and is an MCP tool. Some are agent-only:
  bulk forms (classify fifty entries in one run), the quote graph of a whole subscription, raw
  structure (an entry's layers and references as JSON).
- **A person's own AI** (Claude through MCP, say) drives the same tools under the person's grant.
  That is the "human AI" hookup, and it is no different from an outside assistant's.

## 6. Who supplies delegates

- **The Studio core** ships the mechanical ones and a small set of model ones. They should stay
  boring (#35).
- **Extensions** may register delegates (catalogue entries plus handlers), compiled in as
  extensions are today. A delegate is a computation over held data and writes nothing, which fits
  the extension model's read-only rule.
- **Other clients:** Burrow already has catch-up. If clients should share delegate names and
  shapes, so an agent written for one works with another, the catalogue format goes the #66 route
  (an RFC) once two clients implement it. Until then each client's catalogue is its own.

## 7. First delegates, in order

1. **`catch-up`** (mechanical): a thread or entry with nested quotes, laid out oldest first, each
   card the post's own words with its source, version and time. Credit Aneesh Sathe and Burrow
   0.23.0. UI: a Catch up control on reading entries that have layers.
2. **`catch-up-summary`** (text): an ordered summary over `catch-up`'s output, cached per set of
   versions, disclosed as generated.
3. **`classify-change`** (decision): the change classifier as a delegate for any version pair,
   imported included. This is Background phase 4b's model, so 4b and this delegate are one build.
4. **`relevance`** (decision): how an entry relates to the owner's own writing (Surya's case,
   studio#57), on a cheap model of its own.
5. **`same-story`** (mechanical first, decision second): entries across blygs that quote, link or
   copy the same item, then optionally a model's judgment for the rest.

The resident Agentic feed assistant (`agentic-feed-plan.md` §5) is written as a caller of these
delegates, not a monolith. That keeps it boring and makes it the worked example for power users.

## 8. Questions for Venkat

1. **Name:** "delegates", "helpers", "skills" or "tools"? The UI never needs to say it; the API and
   MCP catalogue do.
2. **Model choice:** may a caller ask for a model, or does the owner's per-delegate setting always
   decide? Recommendation: the owner decides; a caller may ask only for a cheaper tier.
3. **Catch up in the UI:** a sheet from the entry (Burrow's ⇧C), or a reading mode of its own?
4. **Cross-client:** should the catalogue aim at an RFC with Burrow from the start (shared names
   for `catch-up`, `classify-change`), or stay the Studio's own until both clients have shipped?
