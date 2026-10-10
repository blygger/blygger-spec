# conformance/live — the live-network crawler

Checks the **live network** of blygs against the cross-origin invariants of
[`docs/protocol-v0.3.md`](../../docs/protocol-v0.3.md). The question it answers is
whether the network the spec produced matches what the spec intends: it does
not test one implementation, it tests every published document against every
other.

## Run

```sh
node conformance/live/run.mjs            # crawl (cached) → check → report
open conformance/live/out/report.html
```

Node ≥ 20, no dependencies. Outputs in `out/`:

| File | What |
|---|---|
| `crawl.json` | **The fixture corpus.** Every origin's manifest, archive index, item documents, pinned files, parsed feed and blogroll, page metadata, probes, and the §12.1 resolution trail of every seed. **Local only (gitignored)**: it holds other people's published words, which a withdrawal at their origin could never reach once in git history (§13.4). Your first run builds it; `--skip-crawl` reuses it. |
| `results.json` | Every check instance, plus graph/census/fork data for the report. Local only. |
| `summary.json` | The toolkit's shared contract (`area: "live"`, one entry per check with `spec_refs`, `decisions`, `clauses`). |
| `report.html` | Self-contained report: network graph, check table, origin × check heat grid, census, fork lineage findings, issue list. Committed, so it carries no item text: ids, URLs and findings only. |
| `report-local.html` | With `--with-text`: the same page plus side-by-side fork diffs. Local only. |

Useful flags (all scripts share them, see `lib/args.mjs`):

| Flag | Effect |
|---|---|
| `--offline` | Use only `cache/`; no network at all. |
| `--skip-crawl` | Re-run checks and report against the existing `out/crawl.json`. |
| `--refresh` | Ignore cache age, re-fetch everything. |
| `--ttl-hours N` | Cache freshness window (default 12). |
| `--max-items N` | Cap item documents fetched per origin (default: all). |
| `--max-origins N` | Cap origins crawled (default 80). |
| `--no-blogrolls` | Don't follow blogroll entries to new seeds. |
| `--with-text` | Also render the fork diffs, into `out/report-local.html`. |
| `--verbose` | Log every request. |

The stages run on their own too: `node conformance/live/crawl.mjs`,
`node conformance/live/check.mjs [crawl.json]`, `node conformance/live/report.mjs`.
`check.mjs` is offline and deterministic — every network fact it uses was
gathered by the crawl.

## Seeds — how to add an origin

Seeds come from three places, in order:

1. the approved listings on <https://blygger.com/> (scraped every run);
2. `seeds.json` — `known` is the list named when the tool was built; put
   anything else in **`extra`** (a site URL, a feed URL or a blyg origin — each
   is resolved per §12.1, so any of them works);
3. every `blogroll.opml` entry of every blyg crawled (§11), and every origin
   named by a reference (`stub_of`, `transclusions[]`, `forked_from`,
   `generated[].sources[]`) that is not already known.

## Politeness

- **Read-only.** `lib/http.mjs` implements GET and HEAD and throws on anything
  else; the crawler never POSTs and never sends a Webmention — endpoint
  checks are discovery only.
- At most **2 concurrent requests per host** (`--per-host`) and 8 overall
  (`--concurrency`); 15 s timeout (`--timeout-ms`), one retry on network error.
- User-Agent: `blygger-conformance-crawler (+https://github.com/blygger/blygger-spec)`.
- Every response is cached in `cache/` (gitignored) for 12 h, so reruns cost
  almost nothing. Unpinned-version probes are capped (2 per item, 12 per
  origin) and chosen deterministically so `--offline` reruns hit the cache.
- A full cold crawl of ~20 blygs is ~2,700 requests and takes ~5 minutes.

## What is checked

Each check is tagged with spec sections, locked decisions and clause ids from
`conformance/clauses/clauses.json`. Invariant checks report pass / warn / fail
per instance (MUST → fail, SHOULD → warn); info checks never fail.

| Check | Tests |
|---|---|
| `live.resolve` | every seed resolves per §12.1 (and which step found it) |
| `live.census` | client, `blyg` key, level, webmention, items per origin |
| `live.identity` | documents' `origin` equals the origin serving them (§12.2, §15.4 step 2); manifest `site` agrees |
| `live.content-hash` | `content_hash` = sha256(`content_md`) on items and pins |
| `live.index-agree` | archive index ⇔ documents (version, kind, order) |
| `live.feed` | GUID `blyg:{id}:v{n}`, `blyg:id`/`blyg:version` agree, `<blyg:manifest>`, withdrawn = one entry |
| `live.updated-changelog` | `updated` = latest changelog `at` |
| `live.reference-target` | every reference names a resolvable identity origin and an existing item/version |
| `live.fork-pinned` | `forked_from` targets a pinned version (incl. on withdrawn forks) |
| `live.selector-substring` | partial-quote `selector.exact` ⊂ target version text (#49 normalization) |
| `live.transclusion-correspondence` | `transclusions[]` ⇔ directives ⇔ baked `blyg-transclusion` (id, version, origin, partial, order) |
| `live.reserved-directive` | no published `![[id@vN]]` |
| `live.stub` | `stub_of` ⇒ thread, origin present, #27 version agreement, protocol id |
| `live.html-absolute` | no relative URLs in `content_html` (#53) |
| `live.page` / `live.page-alt-json` | `page` → 200; page carries `rel=alternate` JSON |
| `live.withdrawn-endcap` | endcap shape; endcap not pinned |
| `live.pins-served` / `live.pin-pages` | changelog pins served (incl. after withdrawal); optional pin pages |
| `live.unpinned-404` | unpinned versions are 404 |
| `live.cors` | ACAO `*` on manifest, index, feed, items |
| `live.webmention-advertised` / `-reachability` | who advertises an endpoint; which cross-origin references can never notify |
| `live.generated-sources` | generation sources stay own-origin at 0.3 |
| `live.fork-reresolution` | source pin vs fork: lost selectors, re-resolved origins, re-baked versions |
| `live.fork-lineage-visible` | the fork's page links its source pin |

## Known limits

- HTML parsing is regex-level (tags, attributes, lines). Good enough for
  publisher-generated `content_html`; it is not a browser.
- `{url}` stub targets are not probed for W3C Webmention endpoints.
- The text-content normalization for selectors is this tool's reading of
  §10.2; where a selector matches only when block boundaries are collapsed the
  check warns rather than fails, because the spec text does not settle it.
