# Reader suite: `content_md` → `content_html` fixtures

The reader half of the conformance partition (decision #48): a corpus of
fixtures that a client author runs locally against their own renderer. Each
fixture gives an item's `content_md`, the items it refers to, and what the
spec says the published `content_html`, `transclusions[]`, `links[]` and
`generated[]` must contain. Tracking issue:
[blygger-spec#5](https://github.com/blygger/blygger-spec/issues/5).

Two decisions shape it (Aneesh Sathe's answers to the questions on #5):

1. **Expectations are written from the spec text, not recorded from a
   client.** The reference studio is one renderer checked against the
   fixtures, like any other. Where it disagrees with the text, the fixture
   follows the text and the disagreement is a finding.
2. **It lives here, at `conformance/reader/`**, beside the publisher half.

**Snapshot.** The fixtures were written against `spec/0.4/2026-10-18`, the
only dated 0.4 snapshot, and the living text it grew into:
`docs/protocol-v0.4.md` at blygger-spec `8e8bce5` (seventh revision,
2026-11-01). Revisions two to seven are not snapshotted, and four things the
fixtures check come from them: the label bake `data-blyg-label` (#81),
`links[]` (#79), the blockquote's CommonMark extent (#76) and LF/CRLF line
endings (#76). Every fixture records both.

## Running

No install step. Node 20 or later (`/usr/local/bin/node` on the project
machines).

```sh
cd conformance/reader
node run.mjs --self-check                         # the fixtures against themselves: must be all pass
node run.mjs --cmd "my-renderer --render"         # your renderer, one process per case
node run.mjs --cmd "my-renderer --batch" --batch  # your renderer, one process for every case
node run.mjs --adapter studio                     # blygger-studio (see below)
```

Options: `--only <group|id>[,…]` runs a subset; `--out <dir>` writes
somewhere other than `out/` (use it for a third-party run, so the committed
`out/` keeps the reference results); `--name <label>` names your renderer in
the report. The exit code is 1 when any case fails.

Output: `out/summary.json` (the toolkit's standard shape: one check per
fixture, each with `spec_refs`, `decisions` and `clauses`, plus a census
check), `out/report.html`, and `out/results.json` (the raw renderer output,
gitignored).

## The renderer protocol

The runner writes a case to the command's stdin as JSON:

```json
{
  "id": "partial-remote",
  "kind": "thread",
  "notation": "reference-tk",          // only on generation cases, see below
  "self": { "id": "01j9zq3k4m5n6p7q8r9s0t1vzz", "origin": "https://home.example/" },
  "content_md": "![[7c9wk2mhq0v3xj8tn5rzfd41bg]]\n> Stigmergy is what…",
  "items": [
    { "id": "7c9wk2mhq0v3xj8tn5rzfd41bg", "origin": "https://remote.example/", "local": false,
      "kind": "fragment", "version": 2, "state": "published", "page": "f/7c9wk2mhq0v3xj8tn5rzfd41bg/",
      "content_md": "…", "content_html": "<p>…</p>\n", "pins": { "1": { "content_md": "…", "content_html": "…" } } }
  ]
}
```

`self` is the item being published and the blyg publishing it. `items` are
what the publisher holds: its own items (`local: true`) and the snapshots it
has imported. `state` is `published`, `draft`, `withdrawn` (nothing
retained) or `withdrawn-retained` (withdrawn at its origin, with the pinned
version `retained` still held, §13.4). `page` may be relative to `origin`,
absolute, or `null` (none declared, §5.8). An item whose `content_md`
names the publishing item (`needs_self`) exists only for the closure case;
`self.prior_content_md` is then the version of the publishing item that was
published first.

The command answers on stdout with either bare HTML (the `content_html`), or
JSON:

```json
{ "content_html": "…", "transclusions": [ … ], "links": [ … ], "generated": [ … ] }
{ "error": "why the publish was refused" }
```

A non-zero exit, or `{ "error": … }`, is a publish error. Arrays left out are
reported as *not reported* and skipped, so a renderer that only produces
HTML can still run the suite. In `--batch` mode stdin is
`{ "cases": [ … ] }` and stdout is
`{ "renderer": { "name", "version" }, "results": [ { "id", … } ] }`.

## What is compared: normative and presentation

The spec fixes some of `content_html` and leaves the rest to the publisher.
It does not name a markdown dialect for prose, so paragraphs, emphasis,
entity spelling, attribute order and whitespace are presentation. The
comparison (`lib/html.mjs`, `project()`) keeps only the normative parts:

| Normative | Where |
|---|---|
| Wire wrappers: `blockquote.blyg-transclusion`, `.blyg-partial`, `span.blyg-tk-gen`, `div.blyg-tk-gen`, their tag and wire classes | §10.2, §5.7, `docs/css-contract.md` §1 |
| `data-blyg-id`, `data-blyg-version`, `data-blyg-origin` (only for remote sources), `data-blyg-label` (only with a label) | §10.2 |
| A whole bake's text content (the target's HTML, verbatim); a partial bake's `<p>` lines (the selection's plain text) | §10.2 |
| Anchors and their hrefs, in document order and tree position; anchor text where the author wrote a label | §10.1, §5.8 |
| Every `href`/`src` in the output is absolute (a bare `#fragment` is a warning) | §5.2 |
| Inert sequences appear as text | §10.1 |
| `transclusions[]` (`id`, `version`, `origin`, `selector.exact`), `links[]` (`id`, `origin`, nothing else), `generated[].sources` | §10.3, §10.3a, §5.7 |

Each fixture carries both forms: `expect.content_html`, a plausible full
rendering written from the text (illustrative), and `expect.normative`, the
projection that is actually compared. An anchor without `text` in the
projection is one whose text is the publisher's choice (an unlabelled
`[[id]]`); an href of `"(absolute)"` must be absolute but its exact value is
not fixed; an href given as a list accepts any of its members.

**Ambiguity.** Where the text left a choice, the fixture says so in
`ambiguous`, chooses a reading, and names in `ambiguous_checks` the
sub-checks the ambiguity covers. A renderer that differs there gets a
warning, not a failure; a failure in any other sub-check still fails. The
ambiguous cases are the questions in the PR description.

## Fixtures

`fixtures/NNN-<id>.json`, one per case, generated from
`fixtures/_source.mjs` (`node fixtures/_source.mjs`, then
`node run.mjs --self-check`). Edit the source, not the JSON. Every item is
synthetic; nothing is copied from a live blyg.

| Group | Cases | Covers |
|---|---|---|
| `grammar` | 16 | §10.1 directive and link recognition, line endings, reserved `@vN`, what is not an id |
| `code` | 12 | §10.1 inert inside code spans, fences (backtick, tilde, unclosed, nested in quotes and lists) and indented code (#54) |
| `label` | 21 | `[[id \| text]]` and `![[id \| text]]` (#70): trimming, pipes, empties, escaping, the first `]]`, `data-blyg-label` (#81) |
| `partial` | 11 | partial transclusion (#49): selector, plain-text bake, emphasis, paragraphs, lazy continuation (#76), escaping, Unicode |
| `resolution` | 13 | §10.2 order and errors: unknown, draft, withdrawn, pin-retained, ambiguous origin, local closure, nesting |
| `urls` | 9 | §5.2 absolute URLs and §5.8 pages: local, remote, absolute and missing `page`, relative markdown, baked HTML |
| `disclosure` | 6 | §10.3 `transclusions[]` order and origin, §10.3a `links[]`, the silent markdown link |
| `generation` | 12 | §5.7 `blyg-tk-gen` wrappers and `generated[]` sources, local and remote |

**Generation cases** (`"notation": "reference-tk"`) mark the generated span
in their input with the reference client's TK notation,
`[TK]instruction[=]output[/TK]` (decision #20). The notation is studio
authoring grammar and never reaches the wire (§5.7); here it only says which
span is machine-generated and what its output is. A renderer that marks
generated spans another way maps the notation onto its own, or skips the
group with `--only` on the others.

## The blygger-studio adapter

`adapters/studio/` drives the reference client.

```sh
git clone --branch v0.49.12 https://github.com/blygger/blygger-studio.git /tmp/studio
(cd /tmp/studio && npm ci && npm run build)
STUDIO_DIR=/tmp/studio node run.mjs --adapter studio
```

It boots the studio's Worker in process (bundled with the checkout's own
esbuild, run in the checkout's own Miniflare, migrated with the checkout's
own migrations) at the fixtures' origin, `https://home.example/`, with fake
remote blygs behind it. It then works the way an author would, through
public surfaces only: it publishes the local items through the owner REST
contract (`src/contract/routes.ts`), subscribes to the remote origins so
their items are imported, creates and publishes each case, and reads the
result from the published item document, `items/{id}.json`. Generation
cases are generated through the contract's `generate` operation against a
fake provider, then given back the fixture's output, as an author editing
generated text would.

**Why this adapter, and not an internals bundle.** The alternative was to
bundle studio internals (`markdown.ts`, `transclusion.ts`, `tk.ts` …) and
run them against a fake D1 that answers exact SQL strings. That breaks
whenever a function signature, a module boundary or a query changes, and
0.49.12 alone renamed the API to camelCase, added migrations 0034–0036 and
moved operations into `routes.ts`. This adapter depends on two things only:
the REST contract, which is versioned and published as an SDK, and the wire
document, which is the protocol. It also checks what the suite exists to
check, the bytes that reach subscribers, rather than a preview: the
contract's `preview` operation returns studio presentation (an unresolved
link renders as a warning span) and is used here only to list a draft's TK
scopes. It runs the same Worker `wrangler dev` would, in the same runtime,
without a port or a seeding script.

Adapting it to a studio change means editing calls in `adapter.mjs`, never
SQL. Things it has to know about the studio, all in comments where they are
used: a TK model must be chosen in settings before `generate` runs, imported
items are retained past withdrawal only when curated into a hopper (a MAY in
§13.4), outbound fetches need `ALLOW_PRIVATE_FETCH` because the fake origins
answer from Miniflare rather than DNS, and Miniflare 5 needs its options
converted.

## Results at blygger-studio 0.49.12

72 pass, 28 fail, against 100 fixtures. The failures are four
disagreements:

| Finding | Cases | Spec |
|---|---|---|
| `links[]` is never emitted | 21 | §10.3a, #79 (studio queue item o) |
| `data-blyg-label` is never baked | 5 | §10.1, §10.2, #81 (studio queue item q) |
| A partial quote's blockquote ends at the first line without `>`; CommonMark lazy continuation is not part of the selection | 1 | §10.1, #76 |
| An own-line `![[id]]` in a *generated* block (one with provenance) stays literal text inside the `div.blyg-tk-gen`, though the publish warning says it was quoted | 1 | #60, §5.7 |

On the nine ambiguous cases the studio's readings match the fixtures' chosen
ones: none of them warns. Two still fail on checks the ambiguity does not
cover (`link-label-markup` on `links[]`, `tk-output-own-line-directive` on
the missing quote).

## Provenance

Seeded from blygger-desktop's parity corpus, see
[#5](https://github.com/blygger/blygger-spec/issues/5). The inputs and the
case list were taken as a starting point and each case was rechecked against
the 0.4 text; pure-CommonMark cases were dropped, and every expectation was
rewritten from the spec rather than from recorded output. `seeded_from` in a
fixture names the seed case it grew from, where there was one.
