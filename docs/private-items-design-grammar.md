# Private items: the design-grammar pass

**Status:** draft, session 89 (2026-11-26), Opus 5.5. Written for Venkat to review, then
used as the plan for PR (access layer) and PR (notebook narrowing). Method: Kyle's design
grammar card (`@tanstack/oracles` `docs/instruments/design-grammar.md`). Laws: 
[`sealed-content-build-plan.md`](sealed-content-build-plan.md) §1 0f, laws 1–8, Q3, and
law 2's stated limit. Production: `blygger-studio` at 0.73.1 (`956dee3`).

**What this pass establishes and what it does not.** It lists the parts and rules, the
places production enforces them, the conflicts, a reduced model and four production
shapes. It runs no model comparison yet: every simplification below is a proposal with
the comparison it needs, not a result. Nothing here changes a law; the law questions are
marked for you.

## 1. Why the trigger fired

Every trigger on the card's list is true. There are eight laws on one boundary. The model
in `test/private-scope.oracle.test.ts` has many branches per law. PR 178 (privacy leaks) and PR 189
(privacy follow-up) each left three or more gaps in one function: `hopperEntries` had 12
at its first gap run. And each review round found real leaks: Kyle's 16, then 5, then 5,
then 3 live bugs from a mutant search, then the placement 404 found today. The card says to
stop adding histories and write the parts list. PR 189 added histories first, which is the
shortcut the skill names "Skipped design grammar". This document is that step, late.

## 2. The preservation relation

**Named laws.** The work keeps laws 1–8 as adopted. Behaviour no law names may change.

**Checkpoints.** For a restricted caller: every response body and status. For a caller who
sees private: every list and search (laws 6 and 7). For both callers: every write's effect
on stored state (law 1's "no write takes effect", law 4's taint).

**Assumptions.** One owner. A caller is one of two classes. Items and their taint are the
only visibility state; nothing else hides an item.

**Freedoms the contract leaves open.** Q3: revisions, ETags, `dirty` and cursor expiry may
move when a hidden item changes. The order of independent events. The representation of
everything above, including which module enforces what.

## 3. The parts

A part is admitted only for a job. Each has a law it serves and a history that needs it.

| Part | Kind | Job | Witness |
|---|---|---|---|
| Caller class: *sees private* or *restricted* | input | the premise of every law | any law-1 history: the same `GET /items/P` answers 200 and 404 |
| Item state: `status` ∈ {draft, private, public, withdrawn} | state | decides *hidden item* | law 1 on P (private) against X (public) |
| Taint bit (`items.private_taint`) | state | decides *hidden* for a draft and *hidden working copy* for a public item | TD (tainted draft) hidden, D (clean draft) visible |
| Visibility V(caller, item) ∈ {full, published-only, unknown} | **derived** | the one answer every surface reads | the three-way split P / TP / X for a restricted caller |
| Taint write rules | transitions | laws 3, 4 and 5 | generate from P taints; a PATCH or hand edit does not clear it; discard does |
| Hopper membership with each hopper's public flag | state | law 7 (marks, "names the public hoppers before it goes") | raising a draft that is in a public hopper asks first |
| Shelf positions | state | law 8 (hidden entries keep their places) | a restricted replace keeps P where it was |
| Mode (Publish / Notebook) | input | default visibility; notebook narrowing (§7) | a restricted publish under the private default is refused (403) |

V is a definition, not stored state:

- **unknown** when the caller is restricted and the item is private, or is a draft with
  its taint set;
- **published-only** when the caller is restricted and the item is public or withdrawn with
  its taint set;
- **full** otherwise.

This is the plan's *Terms* paragraph stated as one function. The plan already has the three
cases; production does not, which is §4's point.

## 4. Where production enforces them (the surfaces)

Counted at `956dee3` with `grep` over `src/`; reproducible with the command in §10.

| Kind | Where | Serves |
|---|---|---|
| **Runner substitution.** For a restricted caller, an own-item id in the *path* becomes `UNSEEN`, an id no item has, so the handler answers as for an unknown id by construction. | `operation-runner.ts` (one site) | law 1, path ids only |
| **Derived table.** `visibleItemsSql(access)`: hidden items absent, hidden working copies read as the public version. Its row form is `getItemAs`. | `read-api.ts` list and detail, `api.ts` edit answer (4 files) | laws 1, 2 |
| **Ad hoc predicate.** `hiddenItemSql` or `hiddenWorkingCopySql` pasted into a feature's own SQL. | reading (`withoutPrivate`), hopper members (`HIDE_OWN_PRIVATE`), search, Agentic draft taint, avatar, shelf (6 sites) | laws 2, 6, 7, 8 |
| **A `restricted` flag** threaded through reference resolution. | `resolveTarget` and its callers: transclusion, links, preview, tangles, publish, TK hydrate and generate (about 20 call sites in 6 files) | laws 1, 2 for references inside text |
| **Status lists.** A feature filters own items by `status IN (…)` itself. | placement (fixed today), shelf lens (`status = 'public'`), `PRIVATE_SQL` (3 seen; not yet counted in full) | whichever law the author remembered |
| **Write-side special cases.** | `api.ts` edit (provenance masking), publish (notebook refusal), shelf replace, `mcp.ts` publish challenge | laws 1, 4, 8 |

Six enforcement shapes for one function V. Every fault the reviews found sits in the last
four rows. None sits in the first two.

## 5. Rules, sources and open conflicts

Each law is already one sentence with its authority in the plan. The new findings are
where two rules or two domains meet.

1. **Ruled (session 89): law 2 against the working copy's own text.** An untainted draft
   that writes a private id shows the id to a restricted caller. Recorded as law 2's stated
   limit. To revisit with the access layer, because V cannot see ids inside text: only a
   parse could, and the parse is publish's.
2. **Ruled (Venkat, session 89): law 1 widens.** Was open: law 1's domain was narrower than the surfaces that name items. Law 1
   said "every `/items/{id}` operation", and the runner enforces exactly that, for ids in
   the path. An id can also arrive in a body: shelf entries, the placement body's `id`,
   Agentic edition entries, the avatar's medium, hopper membership `{sub, remoteId}` paths
   that are not `~own`. Every one of these took its own check, and every check was found
   late: the shelf (#178), the Agentic edition (#178, then refused whole), the avatar
   (#178), placement (today). Law 1 now reads "every operation that names an own item, in
   its path or its body". The runner can then substitute body ids too, if routes declare
   which body fields name own items (form C below).
3. **Ruled (Venkat, session 89): the Saved lens shows a shelved private item** to a caller who sees private. Build it in PR (access layer): `shelfIdentitySql`'s status list goes, and V decides. Was open: the Saved lens and private items. `shelfIdentitySql` admits own
   items only at `status = 'public'`, so a private item the owner shelved is not in their
   Saved lens. Law 7 does not cover the shelf. The session-81 *owner reader* law shows the
   owner their private items. One of the two decides it; the choice is yours.
4. **Open, to probe: the `reading` change domain and private items.** The trigger in
   migration 0065 moves `reading` only when the old or new status is public or withdrawn.
   A private item's edit or private publish moves `items` but not `reading`. Under Q3 this
   is allowed for a restricted caller. For the owner it may leave the private tab stale
   until the next poll. Today's hopper-lens test shows the ETag is computed from the
   response, so the server answer is right; the open part is the Studio's refetch.
5. **Ruled (Venkat, session 89): law 4 amended** to name both clears; the code stays. Was open: law 4's wording against two later rulings. Law 4 says no client body
   clears the taint, and only discarding the working copy removes it. Production clears it
   in two more places, each on a recorded decision: a restricted token's text edit of a
   public item with a hidden working copy (`api.ts:186`, your session-86 ruling: the edit
   replaces the copy, mark and provenance with it), and each Agentic recomposition, which
   recomputes the composed draft's mark and clears it when the edition names no hidden item
   (`agentic.ts:79`). Neither is a leak: the TLA+ model in §10 shows the first is safe because
   the mark goes only with the text. Law 4's sentence should name both, or the code should
   change; the wording is yours.

## 6. The reduced model, and what each simplification needs

**Reduced model.** State is a map from item id to (status, taint), plus the hopper, shelf
and mode parts. The caller class is an input. V is derived. Each law then reads as:

- **laws 1, 2, 6 (restricted half), 7 (restricted half), 8:** every surface answers through
  V, with *unknown* read as "does not exist" and *published-only* read as "the latest public
  version";
- **laws 6 and 7 (the half for a caller who sees private):** *full* means every member
  and every result, marked;
- **laws 3, 4 and 5:** the taint transitions, which are the only rules that change V.

It is a reduced model, not a minimal one.

**Simplifications proposed, each with the comparison it owes:**

| # | Change | Kind | Comparison needed |
|---|---|---|---|
| S1 | The three notions (hidden item, hidden working copy, `restricted`) become V's three values | refactor | the private-scope oracle's histories against the current and the V model: every history up to the oracle's depth, same observations |
| S2 | `restricted: boolean` becomes the access itself, and `resolveTarget` asks V | refactor | the same, plus the reference-resolution histories (preview, publish, tangle, TK) |
| S3 | Body-borne own-item ids are substituted by the runner (needs conflict 2's law change) | revise, then refine | a strengthening: histories the new model rejects that the old one allowed (a restricted shelf or placement naming P) |
| S4 | Status lists are deleted and read V instead | refactor where the list matched V, revise where it did not (placement did not) | each deleted list gets its own history first, as placement did today |

The card's rule applies: do not change a law, a history filter and an observation in one
step. S1 and S2 are one PR. S3 waits on your answer to conflict 2. S4 goes site by site.

## 7. Notebook narrowing (decision 3, session 87) — ruled (b), session 89

**Ruled (Venkat, session 89): reading (b).** A restricted token keeps working with public
items as it did before private items existed. The analysis that led there follows.

Decision 3 says that in Notebook mode a token without `owner:private` gets "no notebook
access at all, rather than item-by-item hiding". There are two readings, and they predict
different behaviour, so this is a law question for you, not a choice of mine:

- **(a) Refuse whole.** In Notebook mode, every owner operation that lists, reads or writes
  own items answers a restricted token 403 `insufficient scope` naming `owner:private`, as
  the Agentic feed does now. Public items too. Imports, subscriptions and settings stay
  reachable. One check in the route policy; most of §4's surfaces stop mattering in Notebook
  mode. It is breaking for a token that reads a Notebook-mode blyg's public items.
- **(b) Refuse the notebook, keep the public.** In Notebook mode a restricted token gets
  403 on the private-only surfaces (the private tab, private versions, publishing under
  the private default, which it already gets) and item-by-item hiding everywhere else. It
  is close to today: a small change, and §4's surfaces still all matter.

The law delta for (a), to replace nothing and add a sentence after law 2's *Refused whole*
clause: *"In Notebook mode, every operation on own items is refused whole to a restricted
caller."* For (b) the delta is a list of routes, which is the weakness of (b).

## 8. Four production shapes for PR (access layer)

Each keeps every adopted law. They differ in where V lives and what the compiler or a test
can check. Not ranked, as the card asks; I will recommend if you want one.

- **A. One table function.** `visibleItemsSql(access)` and `getItemAs` become the only
  ways to read `items` for an owner caller. A CI check (like 0a's public-route
  enumeration) fails on `FROM items` or a status comparison on `items` outside an
  allow-listed set of modules. *Keeps* the current direction. *Changes* about 20 read sites.
  *Costs* the UNION queries in `reading-data.ts`, which compose awkwardly with a derived
  table.
- **B. An access object.** One value per request, built from the caller, with `items` (the
  table), `see(row)` (V for one row), `unknown()` (the answer for an unknown id) and
  `resolve(id)` (`resolveTarget` through V). It replaces every `restricted` flag and every
  ad hoc predicate. *Keeps* the laws and gives the compiler the enforcement: a function
  that reads items must be handed an access. *Changes* the most code. *Costs* churn across
  the resolver's call sites.
- **C. Declared item references.** Each route's policy names the fields, in path or body,
  that carry own-item ids. The runner substitutes all of them, so law 1 holds for body ids
  by construction. A route-inventory oracle fails on an undeclared id field. *Keeps* the
  laws only if conflict 2's widening is approved. *Changes* the contract metadata, not
  handlers. *Costs* a declaration per route. Combines with A or B.
- **D. Fewer surfaces.** Refuse whole wherever item-by-item hiding is costly: reading,
  shelf and hoppers for a restricted token, as the Agentic feed is. *Keeps* laws 1 and 2
  trivially on every refused route. *Changes* the contract: a reading client such as Burrow
  loses access. *Costs* a revise, and it overlaps §7(a).

## 9. PR 189's leftovers under the no-equivalence rule

Studio's oracle rules say there are no equivalent mutants: a survivor shows a missing
history or observation, or dead code. PR 189 merged with survivors that I wrongly called
equivalent, and its body says so. Each is now a task:

- **The hopper routing guard** (`hopper && !shelf && !raw` in `readingData`). Either find
  the history that separates the branches (a burst-folded member under `raw=true&hopper=`,
  where folding must not apply), or remove the parts of the guard no legal history can
  observe and give the contract's reason.
- **The kind filter on the hopper lens's own rows** (`authoredItemKindSql('p')`, unreached).
  A history with a withdrawn own member under `kind=` reaches it.
- **The draft path's `sanitizeHtml` call** (the reviewer's M06). Venkat (session 89): search
  for an input where it changes the renderer's output, then decide. **Found:** a `data:`
  image (`![a](data:image/png;base64,…)`) renders with its `src` and the allow-list strips
  it; 23 other candidates (raw `<script>`/`<iframe>`, `javascript:`/`vbscript:`/`file:` links,
  `data:text/html`, math with HTML, title-attribute injection, entities, tables, code
  fences) render identically either way. Probe: `probe-sanitize.test.ts` (session-89
  scratchpad). So the call is live: the next studio batch adds a `data:` image to the hopper
  lens's draft history and observes that no `data:` source reaches the lens.

I will also correct PR 189's body to drop "equivalent".

## 10. Formal check

Java (Homebrew `openjdk`, keg-only) and TLA+ tools 1.7.4 installed session 89
(`Code/devops/warnings.md` § Java and TLA+).

**Done: taint, laws 3–5 (`PrivateTaint.tla`).** One private source P and one item I that
draws on it. Generation is two steps (read, then install guarded by the revision), as in
`runGenerateScope` and `installWorkingCopy`. Ghost state `derived` records whether I's copy
really holds text drawn from P while private; `taint` is the server's mark. Safety: no public
version of I is published from derived text (law 5), with the mechanism invariant *derived
implies taint*. **Mode: exhaustive finite model, MaxRev = 5, one source, one item, one
generation in flight.**

| Config | Result |
|---|---|
| As production (install never clears; a restricted replace clears the mark only with the text) | no error, 684 distinct states |
| Weakened: the install writes the mark from the current source alone | violated: generate from private P, raise P, regenerate, publish |
| Weakened: the restricted replace clears the mark and keeps the text | violated: generate, restricted replace, publish |

What it shows: the two clears of conflict 5 are safe *as built*, and each depends on one
design choice the counterexamples name. What it does not show: that the model matches
production. The oracle's histories do that. The revision guard turned out not to matter for
this invariant (the mark is installed atomically with the text); a model with two items or
concurrent publishes may need it.

**Not started:** a restricted shelf replace racing a visibility change (law 8), and
membership-cursor expiry (law 7). Each needs its own passing and weakened run.

**Reproduce §4's count:**
`grep -rn 'seesPrivate(\|hiddenItemSql(\|visibleItemsSql(\|hiddenWorkingCopySql(\|withoutPrivate(\|restricted' src`
in `blygger-studio`.

## 11. Limits

- No comparison in §6 has been run. "Refactor" there is a claim to test, not a result.
- The TLA+ model is in the session-89 scratchpad. **Its home (Venkat, session 89): `blygger-studio/formal/`, run by hand with a script for the passing and weakened configs, no CI job yet.** It moves there with the next studio batch.
- §4's status-list row is a sample (three sites seen), not a census.
- Conflicts 3 and 4 are unprobed; the probes are the next step, and each gets a rerunnable
  script.
- Multi-author (`multi-author-plan.md` §2) will add callers between owner and restricted.
  V's three values may then be the wrong number. This pass does not decide that.
