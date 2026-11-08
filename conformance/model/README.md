# conformance/model — the protocol's state machines, run

Stateful property-based tests (fast-check `fc.commands`) of Blygger 0.3. Two subjects run the same command sequences:

1. **An executable reference model** (`src/model/`), written from `docs/protocol-v0.3.md`, not from blygger-studio's code. Comments cite § and clause ids from `conformance/clauses/clauses.json`.
2. **The real blygger-studio** (`$STUDIO_DIR`, the version is read from its `package.json` at run time). It runs inside its own Workers vitest pool against a miniflare D1. Every command that touches node S goes to both subjects, and their observations are compared after every step.

```sh
cd conformance/model
npm install                 # fast-check, tsx, typescript (studio deps come from the studio checkout)
npm run report              # model campaigns → studio campaigns → out/summary.json + out/report.html
npm run model               # model only (plain Node, ~10 s)
npm run studio              # studio only (~7 min at 1000 runs)
```

Knobs (environment variables):

- `MODEL_RUNS`: default 1000, multiplied by a campaign's `runFactor`.
- `MODEL_SEED`: default 20261003.
- `STUDIO_RUNS`: default 1000.
- `STUDIO_SEED`: default 20261003.
- `STUDIO_DIR`: default `~/Code/blygger-studio`. Point it at a stock checkout of a release tag that has run `npm ci && npm run build` (the studio's `build/` holds generated modules its source imports), not at a working tree someone is editing:

  ```sh
  git clone --branch v0.57.0 https://github.com/blygger/blygger-studio.git /tmp/studio
  (cd /tmp/studio && npm ci && npm run build)
  STUDIO_DIR=/tmp/studio npm run report
  ```

  Studio 0.49.x tests on Vite 8, which wants Node 20.19 or later; the runs recorded here used Node 20.13.1 without trouble.
- `ONLY=P6-post,D2`: run only the listed campaigns.

Every result records its seed, its run count, fast-check's counterexample `path` and the shrunk command list, so a failure can be replayed exactly.

## The world

- **A, B** are model blyg origins. They publish, pin and withdraw, and they serve the §4 surface as real files: an RSS feed with `blyg:*`, `items/index.json`, item documents and pin files. A can be switched to **rogue** mode (roll back a version, stealth-edit) or to a client **without the partial grammar**.
- **L** is a plain-RSS origin, used for the §13.6 L0 wrapper.
- **The network** sits between them. It can drop, reorder or duplicate feed entries, return 5xx on the feed, the index or one item, garble the feed, or serve a stale cached body. Each reader gets its own deterministic fetch function, so the model reader and the studio importer see byte-identical responses for the same command.
- **S** is the node under test. It publishes on its own origin (`https://example.com/blyg/`) and subscribes to A, B and L. It exists as a model twin (`Publisher` + `Reader`) and, in differential runs, as blygger-studio.
- **Ids** come from a pool of 10 that origins share on purpose. That way the generators reach the cases §5.1 calls "not a real case" but the §10.2 resolution order still has to answer: an id imported from two origins, and an own id equal to an imported one.

## Properties (`src/props/properties.ts`)

| id | property | spec |
|---|---|---|
| P1 | Served ⊆ live ∪ pinned; pins never disappear or change bytes | §4, §8, §8.4 (#8, #24, #25) |
| P2 | After a clean index diff, the reader equals the origin's index | §13.2 (#18a) |
| P2b | After a clean *feed* poll, the reader equals the origin's index. Expected to fail: the feed is lossy | §7, §13.2 |
| P3 | The watermark never regresses, and a lower version is surfaced | §13.3 (#18b) |
| P4 | Nothing is retained past withdrawal that the origin doesn't serve | §13.4 (#18c) |
| P5 | Snapshot independence: published thread bytes never change | §10.4 |
| P6 | **Pre-#57** fork faithfulness (copy `content_md`, re-resolve). Expected to fail | §5.6, §10.2 |
| P6post | **Post-#57** fork (§16.6f): quote text equals the pin's baked text; no `transclusions[]`; no `blyg-transclusion`; attribution names the effective origin and id (nested quotes inherit their origin); own prose is byte-exact | §16.6f (#57) |
| P7 | A partial selector stays verifiable while its target version is served | §10.2, §10.3 (#49) |
| P8 | The local transclusion graph stays acyclic | §10.2 closure check |
| P9 | Stub version agreement is about the (origin, id) target | §10.6 rule 3 (#27) |
| P10 | L0 entries are retained, and a same-guid edit bumps the local version | §13.6 |
| D1 | Differential: studio importer state (+ discrepancy flags) equals the model reader's | §13 |
| D2 | Differential: thread publish/fork accept-vs-refuse equals the model's | §10.1, §10.2 |
| D3 | Differential: published versions, provenance, `stub_of`, pins and lineage are equal | §5, §8, §10.3, §10.6 |

Each campaign in `src/props/campaigns.ts` drives one property with the smallest useful command vocabulary. `src/props/scenarios.ts` holds directed sequences for the §16.6f cases: a partial, a nested cross-origin quote, source drift, and legacy adjacency.

## How the studio is driven (and what isn't covered)

- `studio/vitest.config.mts` uses the studio checkout as Vite `root`, so the pool resolves `vitest/worker` there. It points `test.dir` back here and aliases `@studio` to `$STUDIO_DIR/src`. Nothing in the studio repo is edited.
- The pool package (`@cloudflare/vitest-plugin` from 0.49.x, `@cloudflare/vitest-pool-workers` before) and the migration reader come from `conformance/lib/studio-boot.mjs`, the module `reader/` and `schemas/` boot the studio with. Those two harnesses run the studio's Worker under its own Miniflare and touch only its REST contract and wire documents; this one cannot, because it calls the importer with a model network and compares database state, so it runs inside the studio's own test pool instead.
- **Reset:** each run returns the database to its freshly migrated state by restoring the rows the migrations left (0.49.x seeds `change_state` and `oauth_state` singletons that triggers depend on), not by emptying every table.
- Results leave workerd as POSTs to `http://results.model/`. Those requests are answered by the miniflare `outboundService` in the Node host, which appends them to `out/.studio-raw.jsonl`. Every other outbound fetch gets 503, as in the studio's own tests.
- The studio's **importer** is called directly: `pollSubscription` / `reconcileIndex` with a `FetchLike` backed by the model network. **Publishing** goes through `createDraft` + `publish()`; the draft id is rewritten to the pool id before the first publish. **Pin and withdraw** go through the owner REST contract, so its preconditions apply (endcaps cannot be pinned), with `expectedRevision` read from the item first (contract 5.0.0). The **public surface** is read through the worker's fetch handler.
- **SELF is not used.** After about 1,700 `SELF.fetch` calls in one test, the pool's SELF proxy throws `RangeError: Maximum call stack size exceeded`. This reproduces with a loop of plain GETs, so it's a vitest-pool-workers artefact and not studio code. Calling the exported handler with `createExecutionContext()` does 6,000 requests in 2 s.
- **Forks:** the studio's fork *route* fetches the pinned file with the platform fetch, which can't reach model origins. The adapter therefore runs the route's three steps itself: `resolveForkSource`, then **the studio's own `flattenFork`**, then `createFork`. `quotedLink`, which the studio doesn't export, is copied verbatim from `api.ts` (0.49.12).
- **Retention (§13.4 MAY):** the studio retains past withdrawal only for items in a hopper, so the adapter puts every import into one.
- **Not covered:**
  - TK generation and the `generated[]` / `impyrt` disclosure. Model publishers don't generate, so §16.6f's "disclosure survives" is not exercised.
  - Webmention sending and receiving.
  - `[[id]]` links.
  - The fallback in studio's `flattenFork` for documents whose directives sit in code. The model has no code spans.
  - Resolution (§12). Subscriptions are created directly.
  - L0 is compared by link and local version only.
  - Origins A and B are always model publishers. Studio-as-publisher is exercised only as S.

## Coupling to studio internals

`studio/adapter.ts` imports these studio modules through `@studio`, and reads these tables directly. A studio refactor that renames or reshapes one of them breaks this harness and nothing else in the toolkit; fix it here.

| Kind | What | Used for |
|---|---|---|
| module | `index.ts` (default export: the Worker) | public surface and the owner REST contract, called with a fresh `ExecutionContext` |
| module | `client.ts` `CLIENT` | the studio version |
| module | `model.ts` `createDraft`, `createFork`, `getItem`, `publish`, `saveWorkingCopy`, `authoredKind` | publishing as node S under a pool id |
| module | `surface.ts` `itemUrl`, `storedSurface` | the copy of `quotedLink` |
| module | `fork.ts` `resolveForkSource`, `fork-flatten.ts` `flattenFork` | forking (see above) |
| module | `importer/poll.ts` `pollSubscription`, `reconcileIndex` | importing with the model network |
| module | `importer/store.ts` `createSubscription`, `getSubscription`, `createHopper`, `addHopperItem` | subscriptions and retention |
| module | `importer/util.ts` `blygItemUrl`; type `importer/http.ts` `FetchLike` | `quotedLink`; the model network's fetch |
| table | `items` (`UPDATE … SET id` to give a draft its pool id; `kind`, `version`, `forked_from`) | ids and observations |
| table | `versions` (`version`, `content_md`, `content_html`, `transclusions`, `stub_of`, `pinned`) | observations (D3) |
| table | `subscriptions` (`id`, `origin`, `kind`, `flags`), `imported_items` (`state`, `version`, `content_hash`, `content_html`, `pinned_version_retained`, `l0`, `page`, `kind`) | observations (D1) and `quotedLink` |
| table | every table (`sqlite_master`) | reset |

## Findings

These are from the last run, against **blygger-studio 0.49.12** (1000 runs, seed 20261003). `out/report.html` has the swimlanes and state diffs.

**Changed since the 0.20.2/0.21.0 run:** P9 and P6-post-legacy now pass on the studio over 1000 and 2000 random runs, and the directed `fork-legacy-adjacency` scenario passes too: the two studio-side findings below no longer reproduce. D1-importer and D2 still diverge exactly as described. The bullets below are kept as the record of what was found, each marked with where it stands at 0.49.12.

- **D1-importer: studio deviation at SHOULD level.** §13.2 says a suspected gap falls back to an index diff. The studio reconciles on a gap only when some feed entry also triggered a fetch (`gap && triggeredAny`, `poll.ts`). Minimal case, 4 commands: B publishes; S polls; B republishes; S polls a feed whose entries were all dropped. The model diffs the index and has v2; the studio stays at v1 until its 24 h periodic sync.
- **P9: studio bug, edge case** (no longer reproduces at 0.49.12). `applyVersionAgreement` matches baked quotes to `stub_of` by **id only**. Minimal case, 6 commands: a stub targets `B:#4`, and the body quotes S's own `#4`. `stub_of.version` gets rewritten to S's version, which violates C-10.6-03. This needs an id collision.
- **For Fable — D2: what does §10.2 step 1 mean when the local item is a draft or withdrawn?** Read literally ("a local, currently-published item … otherwise an imported item"), such an item falls through to imports. The studio errors instead ("item is a draft"). D2-shadow runs the model under the studio's reading and passes 1000 runs.
- **For Fable — P6-post-legacy: §16.6f and the partial-grammar revision** (the studio passes at 0.49.12; 0.4 §5.6 reads partiality from the bake, #62). The studio's `flattenFork` swallows the `>` lines after every directive. Minimal case, 4 commands: A, a client without the partial grammar, publishes a thread where `![[x]]` is followed by the author's own `> …` quote. The bake shows a **whole** quote. The fork drops the author's lines, which breaks "own prose copied byte-exact". The bake tells which reading applies (`blyg-partial` or not). §16.6f should say that the bake decides. The four 0.2 nodes in the census are exactly such publishers.
- **Forks before and after #57.** Pre-#57, a fork bakes whatever the forker holds. With 6 commands the forker gets a newer version of the quoted fragment; with 5, a partial loses its selector when the forker lacks the partial grammar. Post-#57, both the model's §16.6f flattener and studio 0.20.2 pass every random campaign and every replay of the pre-#57 counterexamples. They also pass the directed nested cross-origin, partial and drift scenarios. The one exception is the legacy-adjacency case above.
- **No divergence** between model and studio in the other importer campaigns:
  - honest origins with clean polls and index diffs (D1-clean);
  - rogue rollback and stealth edits (D1-rogue);
  - the L0 wrapper (D1-l0);
  - published state with provenance, stubs, pins and post-#57 forks (D3);
  - P1–P5, P7, P8 and P10 on both subjects.
