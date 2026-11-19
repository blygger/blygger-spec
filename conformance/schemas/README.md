# conformance/schemas — schemas, semantic rules, grammar differential

Machine-checkable reading of the publication surface, run against
blygger-studio (in process), a live studio node, and any other implementation
that supplies an adapter ([ADAPTERS.md](ADAPTERS.md)). It was written against
`docs/protocol-v0.3.md`; where `docs/protocol-v0.4.md` changed a rule it
checks, it follows 0.4: absolute `page` (C-5.8-01), relocatable manifest paths
(C-4-14), remote generation sources (C-5.7-08), the author's label (#70), and
a partial quote's CommonMark extent and LF/CRLF line endings (#76),
the fragment directive as a publish error (#102), and Unicode on the wire
(#103: `content_md` is text, NFC as a warning, an origin's one spelling).
Nothing here is normative: where the checker had to choose a
reading the spec leaves open, the choice is listed under **For Fable** in the
report.

```sh
cd conformance/schemas
npm install
node run.mjs              # everything: adapters, live snapshot, validate, report
node run.mjs --offline    # same, reusing samples/live-* (local only, gitignored)
node run.mjs --report-only
node run.mjs --offline --impl path/to/adapter.mjs --out path/to/out   # add another implementation
```

Outputs: `out/summary.json` (the toolkit's shared contract, every check
carrying `spec_refs`, `decisions` and `clauses` from
`conformance/clauses/clauses.json`) and `out/report.html` (self-contained).

Inputs it needs: a blygger-studio checkout that has run `npm ci && npm run
build`, by default `../blygger-studio` next to this repository (override with
`STUDIO_DIR`; a stock clone of a release tag is best, not a tree someone is
editing), and network for the live snapshot (`LIVE_ORIGIN`, default
`https://venkateshrao.com/blyg/`). The studio is not modified: it is booted by
`conformance/lib/studio-boot.mjs`, the same module the reader suite uses,
which bundles it from its own source with its own esbuild, runs it under its
own Miniflare and migrates it with its own migrations. The scenario then
drives it only through its owner REST contract (contract 5.0.0 since
blygger-studio 0.49.12: camelCase members, item mutations conditional on
`expectedRevision`) and reads only its public surface.

## Implementations

Every implementation is driven through an adapter, an ES module with
`{ id, name, version(), samples?(), grammar?(), roundtrip?(), staticFields?() }`.
The report gets one column per adapter that ran. One adapter ships here,
`adapters/blygger-studio.mjs`. Any other client can add its own adapter from
its own repository, without changes here: pass it with `--impl` or `IMPLS`.
[ADAPTERS.md](ADAPTERS.md) is the interface and the guide to writing one.

## Layout

| Path | What |
|---|---|
| `schemas/defs.schema.json` | Shared `$defs`: id, utc, reference (§5.9), cited, selector (§10.3), stub_of, generated entry (§5.7), changelog entry, author (opaque), media |
| `schemas/item.schema.json` | `items/{id}.json`, all kinds including the withdrawn endcap (§5, §9) |
| `schemas/pinned.schema.json` | `items/{id}/v{n}.json` (§8) |
| `schemas/manifest.schema.json`, `index.schema.json` | `blyg.json` (§6.1), `items/index.json` (§6.2) |
| `schemas/advisory.schema.json` | The SHOULD/RECOMMENDED layer. Its errors are warnings, never failures (decision #48) |
| `lib/semantic.mjs` | Cross-field rules JSON Schema cannot express, each tagged with level, § and decisions: hash, changelog contiguity, `updated`, absolute URLs in `content_html` (#53), directives ↔ `transclusions[]` ↔ baked wrappers (#26, #49), stub version agreement (#27), `forked_from.cited.url`, `page` form, `blyg-tk-gen` wrappers, pins served, no directive line in a fragment (#102), `content_md` is text and NFC and every written origin has the §12.2 spelling (#103, item, pinned and manifest scope), … |
| `lib/grammar.mjs` | A reference reading of the §10.1 bracket grammar written from the spec, used by the rules |
| `lib/feed.mjs` | A small checker for the `blyg:` elements of `feed.xml` (§7) |
| `lib/selftest.mjs` | Mutation self-test: breaks one MUST in a good document and confirms the checker fails it |
| `grammar/*.json` | 28 grammar fixtures (`content_md` → expected parse), authored in `grammar/_source.mjs` |
| `ADAPTERS.md`, `lib/adapters.mjs` | The implementation adapter interface, its loader, and the helpers handed to adapters |
| `adapters/blygger-studio.mjs` | The built-in adapter: boots blygger-studio in process (`../lib/studio-boot.mjs`), builds the sample scenario and runs the grammar corpus |
| `harness/studio-scenario.mjs` | The studio scenario: subscribes the studio to a fake remote blyg (`harness/fake-remote.mjs`, also a fake Anthropic endpoint), then makes fragment, thread, partial, stub (whole, partial, `{url}`), forks (remote thread, remote fragment, own pin), TK-generated and `impyrt` items, pins, withdrawals, a deleted image |
| `harness/live-fetch.mjs` | Snapshots a live blyg's public surface into `samples/live-*` |
| `samples/` | The documents validated (regenerated by `run.mjs`) |

## Levels

- **fail** — a MUST, or a schema constraint derived from one.
- **warn** — a SHOULD/RECOMMENDED, or a reading the spec leaves open.
- **info** — the spec is silent; recorded so it can be ruled.
