# Implementation adapters

`run.mjs` checks implementations through **adapters**. An adapter is a small ES
module that knows how to drive one Blygger client (build it, boot it, call its
parser) and hands the toolkit plain JSON back. The toolkit does the rest:
it compares grammar results against the fixtures, validates sample documents
against the schemas and semantic rules, scores round-trip loss, and gives
every adapter that ran its own column in `out/report.html`.

One adapter ships here: [`adapters/blygger-studio.mjs`](adapters/blygger-studio.mjs),
the reference client. Any other client, in any language, can be checked the
same way without changing this directory. The adapter lives in the client's
own repository and is passed in at run time.

```sh
cd conformance/schemas
npm install
node run.mjs --offline --impl ~/src/my-client/conformance/adapter.mjs --out ~/src/my-client/conformance/out
# or: IMPLS=~/src/my-client/conformance/adapter.mjs node run.mjs --offline --out …
```

`--impl` can be repeated, and `IMPLS` takes several paths separated by commas
or colons. The built-in studio adapter always runs first, because its sample
blyg is part of the corpus every other adapter is checked against. Use `--out`
for a third-party run, so that this repository's committed `out/` keeps the
reference results.

## The interface

The module's default export is an object:

```js
export default {
  id: "my-client",        // required. [a-z0-9-]+, unique. Used in file names and check ids.
  name: "My Client",      // required. Display name; the report prints "name version".

  async version(ctx) { return "1.2.3"; },          // required

  // Implement any of the following. Each one you implement adds checks.
  async samples(dir, ctx) { … },                    // write a sample blyg into dir
  async grammar(cases, ctx) { return { localId, results: [ … ] }; },
  async roundtrip(docs, ctx) { return { parsed, failed, dropped }; },
  async staticFields(ctx) { return { item: { … }, pinned: { … }, manifest: { … }, index: { … } }; },

  async dispose(ctx) { … },                         // optional; called once the adapter is done
};
```

All methods may be synchronous or async. Implement at least one of `samples`,
`grammar`, `roundtrip` and `staticFields`.

### `ctx`

| Member | What |
|---|---|
| `root` | absolute path of `conformance/schemas/` |
| `cacheDir` | a scratch directory reserved for this adapter (`.cache/<id>/`, gitignored): build outputs, temp files |
| `outDir` | where results are written (`out/` or `--out`) |
| `samplesRoot` | `samples/`; each set is a sub-directory |
| `remote` | the fake remote blyg every case refers to: `origin` (`https://source.example/`), `ids` (`RA`, `RB`, `RC`), `targets` (`[{ id, origin, version, kind, content_html, page }]`, as a resolver would hold them after importing), and `items` / `pins` (the full item and pinned documents) |
| `local` | the local fragment cases call `{{L}}`: `{ content_md, content_html }` |
| `subst(case, localId)` | returns the case with `{{L}}` replaced by your local id |
| `leaves(json)` | the leaf paths of a JSON value, arrays as `[]` (`author.name`, `transclusions[].selector.exact`) |
| `dropped(perDoc, { ignore })` | aggregates per-document survival into `roundtrip()`'s `dropped` list; `perDoc` is `[{ path, input, kept(leafPath) → boolean }]` |

### `samples(dir, ctx)`: an implementation's public surface

Make the client publish something, then write its public surface into `dir`
(`samples/<id>/`) exactly as the client serves it:

```
dir/blyg.json
dir/feed.xml                 (optional)
dir/items/index.json
dir/items/{id}.json
dir/items/{id}/v{n}.json     (one per pinned version)
dir/scenario.json            (optional) { "title": "…", "origin": "https://…/", "labels": { "<id>": "label" } }
```

Each sample set is validated against every schema and semantic rule, giving
checks `schemas.<id>.schema.*`, `schemas.<id>.advisory.*` and
`schemas.<id>.rule.*`. Set `origin` in `scenario.json` to the origin the
documents were published under: the rules check `origin` and `page` against it.
The richer the scenario (threads, partial quotes, stubs, forks, pins,
withdrawals, generated spans), the more rules apply. See
`harness/studio-scenario.mjs` for the reference scenario.

### `grammar(cases, ctx)`: the §10.1 bracket grammar

`cases` is the fixture corpus in `grammar/*.json`. Each case has `id`,
`content_md` (with `{{L}}` placeholders), `expect`, and optionally
`generate: false`, which means the TK output in the case is the author's own
and must not be regenerated. Run each case's `content_md`, after
`ctx.subst(case, localId)`, through the client's publish path, or the closest
thing it has (a preview renderer, a parser), with a resolver that holds
`ctx.remote.targets` plus your local fragment. Return:

```js
{
  localId: "…",                 // the id your local fragment ({{L}}) has
  implementation: "My Client 1.2.3 (parser X)",   // optional column label
  results: [{
    case: "<case id>",
    error: false,               // true if publishing would be refused
    errorText: "…",             // optional, shown on a mismatch
    html: "<p>…</p>",           // the rendered content_html
    transclusions: [{ id, partial: true|false, exact: "…" }],   // as transclusions[] would record them
    tk_sources: [["<id>", …], …],                                 // generated[].sources ids, per scope
  }, …],
}
```

The toolkit reduces each result to a comparable parse: links are anchors in
`html` outside baked transclusion blockquotes, and text left inert is matched
in that same prose. It compares the parse with `expect`. A case your client
cannot express (TK, if it has no generation) still gets a result: report what
the client actually does with the text. A mismatch is a finding, not an error
in the toolkit. Checks: one `schemas.grammar.<case>` per case, failing if any
adapter disagrees with the expectation.

### `roundtrip(docs, ctx)`: what a stored import loses

For clients that import and store item documents. `docs` is every sampled
item document across all sample sets: `[{ path, origin, id, json }]`, with
`json` the raw text. Parse each with the client's own types, re-serialize what
it stores, and report which input fields did not survive:

```js
{
  implementation: "My Client 1.2.3 (ItemDoc → StoredItem)",   // optional
  parsed: 41,
  failed: [{ path, error }],
  dropped: [{ path: "author.bio_hint", count: 3, sets: ["fake-remote"], example: "fake-remote/items/….json" }],
}
```

`ctx.dropped()` builds the list when you supply, for each document, a
`kept(leafPath)` predicate mapping an input leaf to its place in your stored
form. Checks: `schemas.<id>.roundtrip.{parse,author,selector,cited,generated,changelog-generated}`.
Dropping an opaque `author` member fails (§5.5). The other losses warn.

### `staticFields(ctx)`: field coverage from reading the code

For fields a dynamic harness cannot easily observe. For each document type,
map schema paths (as the report's explorer names them: `author.name`,
`transclusions[].selector`) to `[reads, keeps, note]`. `reads` and `keeps`
are `true`, `false` or `"?"`. `reads` means the client's types read the field;
`keeps` means it survives into what the client stores. Each adapter gets
"reads" and "keeps" columns in the explorer. A `pinned` map adds the check
`schemas.<id>.static.pinned-citations` (§8: a pin carries its own citations).

## Results

For each adapter, `run.mjs` saves `grammar-<id>.json`, `roundtrip-<id>.json`
and `static-<id>.json` to the out directory, so `--report-only` can rebuild
the report without re-running the client. `summary.json` and `report.html`
cover every adapter that ran.

## Rules of thumb

- Do not modify the client to make it pass. An adapter drives the client as
  shipped, and a difference from the fixtures is the result.
- Build into `ctx.cacheDir` or the client's own ignored build directory, not
  into this repository.
- Nothing here is normative. Where a fixture encodes a reading the spec
  leaves open, the case carries `ambiguous`, and the report lists it as a
  warning rather than a failure.
