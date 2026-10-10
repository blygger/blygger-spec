# Clause register & traceability graph

This directory pulls every RFC 2119 sentence out of the living spec
(`docs/protocol-v0.3.md`), gives each one a stable id, and links it to the
56 locked decisions in `CLAUDE.md`, the four design invariants in §1, the
sections it cites, and, once other toolkit areas publish results, the tests
that exercise it. It is a reading aid for the spec author, not a normative
document. Nothing here edits `docs/`.

## Run

```sh
python3 conformance/clauses/build.py
```

You need Python 3.10 or later, standard library only. The command regenerates:

| File | What |
|---|---|
| `clauses.json` | The register: a list of clauses, plus sections, §2 terminology, §1 invariants and the §16 pending shapes |
| `decisions.json` | Decisions #1–#56 parsed from `CLAUDE.md`: title, session, spec sections named, relations, tokens |
| `ids.lock.json` | The fingerprint → id lock (commit it) |
| `out/graph.json` | Nodes and edges: invariants, decisions, sections, clauses, tests |
| `out/analysis.json` | The coverage matrix, the timeline, the prose lints and the term tables |
| `out/summary.json` | Toolkit-standard checks (`area: "clauses"`) |
| `out/report.html` | The page to open (self-contained apart from cytoscape.js from cdnjs) |

You can also run each step on its own: `extract.py` (takes `--spec`, `--lock` and `--out`),
then `decisions.py`, then `analyze.py`, then `report.py`.

## A clause entry

```json
{"id": "C-5.6-02", "section": "5.6", "heading": "Lineage — `forked_from`",
 "level": "MUST", "keywords": ["REQUIRED"], "status": "normative",
 "text": "`origin` is REQUIRED, even when it is the publisher's own — a citation is absolute.",
 "side": "publisher", "side_basis": "subject '`origin`'",
 "decisions": [], "decisions_nearby": [], "refs": [], "line": 437, "fp": "…"}
```

- **level** follows the partition in decision #48:
  - **MUST** covers MUST, MUST NOT, REQUIRED, SHALL. A MUST clause fails a test.
  - **SHOULD** covers SHOULD, SHOULD NOT and RECOMMENDED. A SHOULD clause only warns.
  - **MAY** covers MAY and OPTIONAL. A MAY clause is shape-checked when present.

  A sentence that contains more than one keyword takes the strongest.
- **status**: `normative`, or `pending` for keyword sentences in §16. A
  pending sentence is a ruled shape that is not yet normative, and its id
  starts with `P-` instead of `C-`. Each §16 subsection is also listed under
  `pending_shapes`, with one of these statuses: promoted, ruled, ruled-0.4,
  closed, reserved or never.
- **side** is a heuristic. It takes the last actor named before the strongest
  keyword (publisher, reader, receiver, sender or client/studio; document
  nouns such as *manifest* or *file* count as publisher). If no actor is
  named, it falls back to a default for the section. `side_basis` says which
  rule fired.
- **decisions** lists the `#N` numbers cited in the sentence. `decisions_nearby`
  lists those cited elsewhere in the same paragraph. **refs** lists the §
  sections the sentence cites. References into other versions, such as
  `0.2 §12.2`, go in `ext_refs`.
- Extraction skips the preamble, §1 and §17, fenced code blocks and inline
  code spans.

## How ids stay stable

Each id has the form `C-<section>-<nn>`. On the first extraction, `nn`
follows document order within the section. After that, ids are append-only:

1. A clause whose fingerprint (a hash of its normalised text) is in
   `ids.lock.json` keeps its id.
2. A clause whose text was edited is matched by similarity (≥ 0.80) to a
   clause that vanished from the same section, and inherits that clause's
   id (`id_basis: "near-match …"`).
3. A new clause gets the next number never used in its section. So a
   sentence inserted in the middle of §4 becomes `C-4-13`, not `C-4-05`.
4. An id whose clause disappears is marked `retired` in the lock and is
   never reused.

Test ids, issues and devlog entries can therefore cite `C-10.2-04` and keep
pointing at it. If you delete `ids.lock.json`, every clause is renumbered,
which breaks those external references.

## Hand curation: `overrides.json`

- `clauses`: `{match, section?, exclude | set}`. Each entry is matched by a
  text substring, so it survives renumbering. Use `exclude` for sentences that
  only talk *about* keywords (for example §6.1, "It is a SHOULD and will never
  be a MUST"). Use `set` for side corrections. An override that matches
  nothing prints a warning.
- `decision_sections`: the spec homes of decisions whose records predate the
  spec or name no section (#1–#29 mostly). These get `via: "curated"`.
- `decision_classes`: why a decision has no clause. The classes are process,
  note, studio, refusal, vocabulary, deferred and foundational. A classified
  decision reports `info`, and an unclassified decision with no clause
  reports `warn`.
- `decision_relations`: amend/refine/resolve edges that the regex cannot see.
  The timeline draws these dashed.
- `invariant_decisions`: links each §1 invariant to the decisions that state it.

## Tests from other areas

`analyze.py` reads every `conformance/*/out/summary.json` except its own.
It joins a check to the register by three fields:

- `clauses: ["C-5.6-02"]`, or a clause id inside `spec_refs`, gives
  clause-level coverage. This is the only kind that counts as "tested".
- `spec_refs: ["§5.6"]` gives section-level coverage. It is shown, but it
  still warns.
- `decisions: ["#26"]` adds a decision edge.

If no other area has published results yet, every MUST shows as untested.

## Reading the report

- **Tiles** show the counts at a glance.
- **Traceability graph** has five node types. Invariants are diamonds,
  decisions are blue, sections are grey rectangles, and clauses are coloured
  by level (MUST red, SHOULD amber, MAY slate). A hollow clause has no test.
  Click a node to read it, or double-click it to fade everything except its
  neighbourhood. You can filter by level, decision or top-level section.
  Token links (decision ↔ clause pairs that share a specific wire token like
  `stub_of`) and clause → § edges are off by default to cut clutter. Red
  arrows are decision relations.
- **Coverage matrix** has one row per section and one column per level. The
  cell shade is the clause count, and the green bar is the tested share.
  Click a cell to filter the clause table.
- **Decision timeline** puts sessions on the x-axis. Dot colour is the
  grounding:
  - *normative*: a normative clause cites the decision, or sits in a section
    its record names.
  - *pending*: the decision reaches only §16.
  - *token-only*: the only link is a shared wire token.
  - *none*: no link at all.

  Arcs are the relations between decisions.
- **Checks** shows the same list as `summary.json`. The per-section MUST
  coverage checks are hidden behind a toggle.
- **Clauses** is a search box. It supports free text plus `§10.2` (section,
  prefix match) and `#26` (cited, or in a section the decision names).
- **Prose that sounds normative** lists two kinds of sentence that a suite
  cannot see because they carry no keyword: lowercase *must/should/required*
  (likely missed keywords), and absolutes (*never*, *always*, *publish error*).

## Known limits

- Sentence splitting is a heuristic. It handles abbreviations and does not
  split inside parentheses, so a long parenthetical stays in one clause. A
  "Rules:" list item is its own block, and its bold lead label is kept in
  `label`.
- Bold-term and token analyses are heuristics meant to point you at text to
  read, not verdicts.
- Decision → section parsing classifies each `§` by the nearest document hint
  (spec, plan, a `.md` file). A bare `§` in a decision from session 20 or
  later is assumed to mean the spec (`via: "spec?"`).
