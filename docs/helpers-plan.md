# Helpers — simple agents that complex agents and people share

**Status:** a plan; `catch-up` is being built first (session 77). Session 77 (2026-11-21), Opus 5.5 with Venkat. Companion to
[`agentic-feed-plan.md`](agentic-feed-plan.md). A client contract (decision #31), not protocol.

## 1. The idea (Venkat)

A top-level agent, such as the Agentic feed's assistant or a power user's own, should not have to do
everything itself. It helpers routine work to a set of **helpers**: some purely
mechanical, some backed by a small, cheap model. The same helpers are available to a person in
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

## 2. Kinds of helper

| Kind | What it is | Cost | Examples |
|---|---|---|---|
| **Mechanical** | A pure function over what the node holds. Deterministic, free, instant | none | Catch-up layout, the quote chain at every depth, the "responds to" walk, word diff between versions, stale quotes, burst and fold, near-same, the pace-layered order, Background reasons, who-quotes-whom |
| **Decision** | A decision model with a fixed label set (Clef, Jev). An injected instruction can at most mislabel (§14) | small, budgeted | Change size (typo, minor, major, refresh), topic labels from the owner's list, "is this the same story as X", relevance to the owner's writing |
| **Text** | A small text model that writes words, always disclosed as generated | budgeted | Catch-up summary, changelog summary (exists), headline or dek for an entry, translation, a digest of a long thread |

Helpers compose. Catch up is the clearest case: the mechanical layout feeds the text summary,
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

**One operation per helper, under `/api/helpers/{name}`, and the same as an MCP tool** (#52:
MCP is a transport for the contract, not a second one).

- **A catalogue:** `GET /api/helpers` lists each helper with its name, kind, a one-line
  description, input and output schemas, cost class, the model it would use (owner-chosen), and
  whether it is offered in the UI.
- **Calling:** `POST /api/helpers/{name}` with typed input, typically reading identities (`sub`,
  `remoteId`, optional `version`), as Saved and editions name entries.
  - Mechanical helpers answer at once.
  - Model helpers answer at once when cached, else start a **run**
    (`GET /api/helpers/runs/{id}`). The caller polls, as everywhere (#39).
- **Output is data, with provenance.** A model helper's output carries `{ model, at, sources }`
  in the §5.9 reference shape. Whoever places it in a thread places it as an `impyrt` span, so it
  is disclosed when published, as editions do (`agentic-feed-plan.md` §3.1).
- **Caching:** results are keyed by helper, input identities and their versions, like changelog
  summaries. Asking twice about the same versions costs nothing. A new version is a new key.
- **Scopes:** reading a helper's inputs needs what reading them directly needs (`reading:read`
  for an agent, the owner cookie for the UI). Model helpers also need `reading:helpers` so an
  owner can let an agent read without letting it spend. Helpers never write to the blyg; a
  caller that wants to act on a result does so through its own grant (`reading:curate`,
  `reading:save`, …).
- **Budget:** model helpers spend the node's AI budget, attributed per caller (the owner's UI, the
  resident assistant, each outside grant). Settings shows who spent what and can cap each caller.
  This is where pending call #10's budget model lands.

## 5. People and agents get the same affordances

- **In the UI**, a helper marked for people is a control where it belongs: **Catch up** on any
  thread with nested quotes (a sheet, oldest first, with an optional summary); **classify** in an
  entry's ⋯; **translate** later. The button calls the same operation an agent calls.
- **For agents**, every helper is in the catalogue and is an MCP tool. Some are agent-only:
  bulk forms (classify fifty entries in one run), the quote graph of a whole subscription, raw
  structure (an entry's layers and references as JSON).
- **A person's own AI** (Claude through MCP, say) drives the same tools under the person's grant.
  That is the "human AI" hookup, and it is no different from an outside assistant's.

## 6. Who supplies helpers

- **The Studio core** ships the mechanical ones and a small set of model ones. They should stay
  boring (#35).
- **Extensions** may register helpers (catalogue entries plus handlers), compiled in as
  extensions are today. A helper is a computation over held data and writes nothing, which fits
  the extension model's read-only rule.
- **Other clients:** helpers are the **Studio's reference design**, not a standard and not a
  recommendation (Venkat, session 77). Burrow and others may do agentic feeds entirely
  differently. A client that uses the Studio as its server sees the same raw signals and may call
  the Studio's helpers, but nothing here asks another client to copy the catalogue, and it never
  goes the RFC route.

## 7. First helpers, in order

1. **`catch-up`** (mechanical): a thread or entry with nested quotes, laid out oldest first, each
   card the post's own words with its source, version and time. Credit Aneesh Sathe and Burrow
   0.23.0. UI: a Catch up control on reading entries that have layers.
2. **`catch-up-summary`** (text): an ordered summary over `catch-up`'s output, cached per set of
   versions, disclosed as generated. **Built session 78** (studio `main`, unreleased; migration
   0053 `helper_results`, one row per helper and subject, keyed by every card's origin, id and
   version). Two departures from §4, both to revisit with the resident assistant: it answers
   synchronously with a claim, as changelog summaries do, and a concurrent caller gets 409
   rather than a run to poll (`/helpers/runs/{id}` waits until a helper is slow or bulk); and
   the model is one **text helpers** setting (`ai_model_helpers`, blank = the change-notes
   model), not one per helper, until there is a second text helper. Its scope is
   `owner:draft`, as `summarizeChangelog`'s is, until `reading:helpers` exists.
3. **`classify-change`** (decision): the change classifier as a helper for any version pair,
   imported included. This is Background phase 4b's model, so 4b and this helper are one build.
4. **`relevance`** (decision): how an entry relates to the owner's own writing (Surya's case,
   studio#57), on a cheap model of its own.
5. **`same-story`** (mechanical first, decision second): entries across blygs that quote, link or
   copy the same item, then optionally a model's judgment for the rest.

**Later: smart-scoped TK** (Venkat, session 78; ROADMAP row 146). Today a TK scope is one model
call over the instruction, its sources and the draft. Letting that call use helpers as tools
(search the blyg and the reader's imports, catch up on a conversation, fetch a supplied page)
turns it into a short tool-using loop under the same budget and disclosure: everything the
model drew on that it was not handed becomes a `sources[]` entry (§5.7 rule 1, "whether the
generator was handed them … or retrieved them itself"). Not scheduled.

The resident Agentic feed assistant (`agentic-feed-plan.md` §5) is written as a caller of these
helpers, not a monolith. That keeps it boring and makes it the worked example for power users.

## 8. Venkat's answers (session 77, 2026-11-21)

1. **Name:** helpers. `/api/helpers`, MCP tools named after each helper, scope `reading:helpers`
   for model helpers.
2. **Model choice:** the owner's per-helper setting decides; a caller cannot pick one. A caller may
   later be able to bring its own model (and key) for its runs, which would spend nothing of the
   node's budget.
3. **Catch up:** build it now. First as a sheet from the entry, like Burrow's ⇧C; a reading mode
   of its own can follow.
4. **Cross-client:** no RFC. This is the Studio's reference design (§6).
