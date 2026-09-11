# TK-Core Implementation Plan — instructed generation in the studio

**Status: DESIGN COMPLETE (session 12, 2026-08-10, Fable). IMPLEMENTED session
14 (2026-08-10, Sonnet) — all 8 tasks below, verified against the real
Anthropic API in local `wrangler dev` and export byte-compared; see DEVLOG
session 14. `AI_PROVIDER_KEY` is registered on both live nodes. **DEPLOYED
to both live nodes session 15 (2026-09-11)** — migration 0005 + worker code,
live-verified. **Grammar respelled to balanced tokens session 16 (2026-09-11,
Fable design + Sonnet implementation): §9 complete** — parser, ~59 test
fixtures + 2 new cases, studio sugar/hints, working-copy migration (one
real scope migrated on venkateshrao, verified re-parsing correctly against
the newly-deployed parser; protocol-institute had nothing to migrate),
deployed and live-verified on both nodes. 241/241 green.** This plan
resolves the v0.4 ⚠️ FABLE items that don't depend on
v0.2/v0.3 — the TK generation contract, the inline-vs-block scope question
(`curation-discovery-generation-proposal.md` §4 items 1, 3, 4, 6), and the
provider-call interface — and specs the authoring core to Sonnet/Opus-
implementable precision. **Build order: after or in parallel with the v0.2
build** (`v0.2-plan.md`); TK-core depends only on v0.1 machinery. Pulled
forward from v0.4 per the session-12 roadmap amendment (decision #6 note).
Decision record: locked decision #20.

**Deferred to their original slots, not designed here:** import-pipeline
filter plugins (need v0.2's importer), staleness over nested thread DAGs
(needs v0.3 nesting), cross-client generation sources (need v0.3 semantics).

## 1. The shape of the thing

TK (journalism's "to come") is instructed, in-prose generation at authoring
time. Locked decision #5 governs everything: **AI is never in the protocol** —
generation is studio-side; the page publishes output plus provenance. The
design's central move is a strict two-layer split:

- **Working copy (studio-private):** carries the full TK grammar — scopes,
  instructions, source references. This is pre-generation draft state and
  never reaches the wire (proposal §4 item 2).
- **Published version (the wire):** ordinary markdown. Generated text lands
  in `content_md` with **no markers** — the hash covers exactly what readers
  read. Provenance rides in the item document and the baked HTML, mirroring
  transclusion's two-plane architecture (§10 of the L1 spec: JSON provenance
  array + baked HTML class), not as in-band annotations.

This amends the §4 item-3 lean (markers retained as inert annotations in
`content_md`): the lean's actual goal — hash and pin cover what readers read —
is satisfied by output-in-`content_md` alone, and the disclosure goal (item 4)
is served better by the existing provenance pattern than by a third, in-band
mechanism polluting the source plane.

## 2. Authoring grammar (studio-side; wire-invisible)

### 2.1 Scopes

- A TK scope is delimited by the tokens `[TK]`, `[=]`, and `[/TK]` — all
  three complete bracket pairs, in the familiar open-tag/close-tag idiom:
  - Before generation: `[TK]<instruction>[/TK]`
  - After generation: `[TK]<instruction>[=]<output>[/TK]`

  Whitespace around the instruction is trimmed, so `[TK] instruction [/TK]`
  and `[TK]instruction[/TK]` are equivalent.

  *(Grammar history — two dated revisions, both to this bullet. Session 12's
  original spelled the opener `[TK` with no closing bracket; session 15
  (Fable) confirmed that no token **terminating the instruction** may begin
  with `]` — a bare-`]` terminator, as in `[TK instruction]`, mis-splits an
  instruction ending in the very `![[id]]` source refs instructions exist to
  carry (`…![[abc]]][/TK]` cuts the ref). That constraint stands and is
  forced. Session 16 (2026-09-11, Fable + Venkat) respelled the opener to
  the balanced `[TK]`: the session-15 argument only rules out `]`-initial
  terminators, and the opener's `]` sits at a fixed position before any
  instruction text, so it was always compatible. Venkat rejected the
  unbalanced spelling as unreadable, making readability an explicit grammar
  objective — and the balanced form is what every pre-implementation
  document (frozen v0 spec, roadmap, session-11 proposal examples) wrote
  informally anyway. No wire impact: the grammar is studio-private.
  Old-spelling working copies on the two test nodes are migrated or
  discarded, not dual-supported — pre-release, decision #21.)*
- Tokens may appear **anywhere — inline mid-sentence or on their own lines**;
  a scope may span lines. Parsing is a linear token scan (`[TK]` … optional
  `[=]` … `[/TK]`), with **no bracket balancing**: instructions may freely
  contain `![[id]]` references because the scanner only looks for the three
  tokens — none begins with `]`, and none can be composed from reference
  characters (refs are `![[` + lowercase base32 + `]]`; uppercase `TK`,
  `=`, and `/` are all outside that alphabet).
- **No nesting** of scopes (publish/generate error), matching v0.1's
  fragments-only conservatism.
- Scopes are valid in **both fragment and thread working copies** — one
  mechanism, both item kinds (§4 item 1). The fragment editor's
  "generate whole" affordance is sugar that wraps the body in one scope.

### 2.2 Quote vs. source — the inline-transclusion resolution (§4 item 6)

Two different authorial acts, two different constructs:

- **Quote** — verbatim, visible, cited: the block-level transclusion of
  decision #9, unchanged. Own-line `![[id]]` **outside** any TK scope bakes
  the blockquote wrapper and lands in `transclusions[]`.
- **Source** — material the author (via the generator) *draws on*: inside a
  TK scope, every `![[id]]` — own-line or inline — is a **source reference**,
  never a transclusion. The referenced fragment's content is fed to the
  generator; the output is woven prose, and the fragment lands in the
  version's generation provenance (§3.1), not in `transclusions[]`.

The rule composes by exclusion: **scopes cannot contain transclusions.** An
author who wants a verbatim quote inside a generated passage closes the
scope, transcludes, and reopens. Venkat's target pattern
(`As Einstein said, ![[id]], instruction: simplify…`) is written
`[TK]simplify ![[id]] for a lay reader[/TK]` inline in running prose. This
resolves proposal §4 item 6: decision #9's block-only grammar stands
untouched for *transclusion*; TK scopes are inline-capable because they are
studio grammar the protocol never sees.

### 2.3 Generation and regeneration

- **Generate** (per scope, explicit studio action): resolver feeds the
  provider (§4) the instruction, the current output (if any — "current draft
  of this span"), each referenced source fragment's `content_md` (must
  resolve like transclusion targets: local, currently-published fragments —
  drafts/withdrawn/unknown/threads are generation errors), the full working
  copy with the active scope marked (document context), and the optional
  site-level style prompt (settings). Output replaces the text after `[=]`.
- The author **edits output in place freely** — it's just working-copy text.
  Regeneration replaces the span after `[=]` again; the instruction persists.
- Source references resolve to the **latest published version at generation
  time**; provenance records the exact version. Snapshot independence (§10.4)
  applies verbatim: later source edits/withdrawals never touch generated
  output; regenerating is a new authoring act.

### 2.4 Publish rules

- Publishing with any scope lacking output (`[TK]…[/TK]` with no `[=]`) is a
  **publish error** listing the unresolved scopes — generation is always
  author-reviewed, never publish-triggered (human stays in the loop; "at
  authoring time" per decision #5).
- At publish, each scope is stripped to its output: the
  `[TK]<instruction>[=]` prefix and the `[/TK]` closer are removed; the
  output text stays in place in `content_md`. Provenance is
  recorded (§3.1); the rendered `content_html` wraps each generated span
  (§3.2). The working copy retains the full grammar (it's the source of
  truth for the next edit, exactly like thread directives §10.2).

## 3. Wire artifacts (additive; join the spec at the next protocol version)

### 3.1 Generation provenance — item-document `"generated"` key

OPTIONAL top-level array, parallel to `transclusions`, one entry per resolved
scope in document order:

```json
"generated": [
  { "sources": [ { "id": "7c9wk2…", "version": 3 } ],
    "model": "…provider model id…",
    "at": "2026-08-10T18:00:00Z" }
]
```

- `sources` MAY be empty (pure instructed generation, no fragment refs).
  `model` and `at` are RECOMMENDED. No instruction text, ever — instructions
  are pre-generation state (studio-private).
- Omitted entirely when the version involved no generation. Readers ignore
  the unknown key (§11.4) — fully backward compatible.
- Like all provenance it is **self-asserted and unverifiable**; the spec
  language is SHOULD-record for publishers that generate. The reference
  client always records. (Same honesty stance as timestamps and `author` —
  the protocol doesn't pretend to verify what it can't.)
- Pinned version files carry the version's `generated` array, like
  `transclusions` — the citation includes its provenance.

### 3.2 Baked HTML disclosure

Publisher's renderer wraps each generated span in `content_html`:
`<span class="blyg-tk-gen">…</span>` (inline output) or
`<div class="blyg-tk-gen">…</div>` (block output). Presentation-plane
disclosure, baked at publish like `blyg-transclusion`; the class name is the
contract, styling is the client's. No data attributes required (span-level
source mapping is deliberately not promised — the JSON provenance is
version-level and robust; span-level claims would be brittle across the
author's post-generation edits).

### 3.3 What the protocol does NOT gain

No generation constructs beyond the passive provenance above: no TK grammar
on the wire, no instruction bytes, no model negotiation, no "regenerate"
affordance for readers. The standing pattern holds — AI is never in the
protocol; this is its provenance shadow only.

## 4. Provider-call interface (one interface for every hook)

`worker/src/ai/provider.ts`:

```ts
interface GenerateRequest {
  instruction: string;
  currentText: string | null;       // span's current output, if regenerating
  sources: { id: string; content_md: string }[];
  documentContext: string;          // full working copy, active scope marked
  stylePrompt: string | null;       // settings key, optional
}
interface GenerateResult { text: string; model: string; }
generate(env, req): Promise<GenerateResult>
```

- Configured via settings (`ai_model`, `ai_style_prompt`) + wrangler secret
  `AI_PROVIDER_KEY` (register in `Code/.env.keys` per policy; never in code
  or `.dev.vars`).
- The reference implementation targets the **Anthropic Messages API**;
  the implementing session MUST load the `claude-api` skill for current
  model ids/parameters rather than hardcoding from memory.
- This same interface later serves the fragment editor hook (already covered
  — same scope mechanism), import-pipeline filter plugins (v0.2-dependent,
  deferred), and any future hook. Designing against it now is what makes the
  deferrals cheap.

## 5. Reference implementation

- **Migration** (next free number at implementation time): add
  `versions.generated_json TEXT` (NULL when no generation). Emission: item
  doc + pinned version files include `generated` when non-NULL. No schema
  for scopes — they live in the working-copy text.
- **API:** `POST /api/items/{id}/generate` body `{scope: n}` (0-based scope
  index in the working copy) → runs §2.3, saves the updated working copy,
  returns `{text, model}`; errors: unresolvable source (with id + reason),
  nested scopes, unknown scope index, provider failure (surfaced verbatim,
  no retry loop). Publish endpoint gains the §2.4 validation + strip +
  provenance recording.
- **Studio UI (utilitarian per the deferred-UI-refresh rule):** editors get
  scope highlighting (regex-level is fine), a per-scope Generate/Regenerate
  button, and a fragment-editor "generate" affordance that inserts a
  whole-body scope. Publish-error banner lists unresolved scopes (reuses the
  transclusion-error banner pattern from v0.1 task 15).
- **Rendering:** publish-time renderer emits the §3.2 wrappers. Public page
  CSS may style `.blyg-tk-gen` subtly or not at all (presentation).

## 6. Task breakdown (ordered; commit-sized units with acceptance checks)

1. **Scope parser** (`worker/src/tk.ts`): token scan, scope extraction,
   nesting detection, source-ref extraction, strip-to-output transform, and
   the exclusion rule (scopes masked *before* transclusion-directive
   detection so a scoped own-line `![[id]]` is a source, not a quote).
   Pure functions + exhaustive tests (inline/block/multiline scopes, refs in
   instructions, no-output scopes, nesting errors, adjacency with real
   transclusion directives). ✓ table-driven suite green.
2. **Migration + emission**: `generated_json` column; item doc + pin files
   emit `generated`. ✓ emission tests incl. pin files; absent when NULL.
3. **Provider interface + Anthropic implementation** (§4; load `claude-api`
   skill first). Unit tests mock `fetch`. ✓ request shape + error surfacing
   tested; no real network in tests.
4. **Generate endpoint** (§5 API): resolution of sources (same lookup as
   transclusion resolver), context assembly, working-copy update. ✓ error
   cases (bad source, nested, bad index) return structured errors; success
   path saves `[=]output`.
5. **Publish integration** (§2.4): validation, strip, provenance, HTML
   wrappers. ✓ publish error on unresolved scope; published `content_md`
   is marker-free; `generated` provenance matches scopes in order; hash
   covers the output; wrappers present in `content_html`.
6. **Studio UI**: highlighting, buttons, fragment-editor affordance, error
   banner. ✓ full authoring loop in a browser against local dev.
7. **Settings + secret**: `ai_model`, `ai_style_prompt` settings;
   `AI_PROVIDER_KEY` secret per policy on both live nodes. ✓ registered in
   `Code/.env.keys` / PI conventions per node.
8. **Static export + docs**: export unaffected (wire is ordinary files) —
   verify; README + roadmap + DEVLOG updates. ✓ export byte-identical check
   still passes on a blyg with generated content.

If implementation surfaces a contract gap, **stop and record it in DEVLOG
open threads** — don't improvise generation semantics (model-routing rule).

## 7. Definition of done

On a live node: author a thread containing (a) a block transclusion, (b) an
inline TK scope referencing a fragment as source, (c) a pure-instruction
scope; generate, hand-edit one output, publish. The wire shows ordinary
markdown (no TK tokens), correct `transclusions` (only the quote) and
`generated` (both scopes, correct sources/model), wrappers in HTML, hash
covering exactly `content_md`. Regenerate + republish bumps the version with
fresh provenance. Fragment-editor generation works. All suites green.

## 8. Open decisions (Venkat)

1. **Disclosure strength** — this plan: `generated` is SHOULD-record in spec
   language, always-recorded in the reference client, `model` RECOMMENDED.
   Say if you want it stronger (MUST-record is unverifiable but normatively
   louder) or quieter (omit `model` by default).
2. **Visible styling of `.blyg-tk-gen`** — reference client default: none
   (invisible disclosure, inspectable in source/JSON). Alternatively a
   subtle presentation marker. Pure presentation; pick at implementation.
3. **Build order vs. v0.2** — this plan assumes v0.2 first (pub-sub testing
   soonest), TK-core immediately after. TK-core is independent enough to go
   first if you'd rather have the authoring loop early.

## 9. Grammar respelling to balanced tokens (session 16 — Sonnet/Opus-safe)

Decision #20 amended session 16 (2026-09-11, Fable + Venkat): the scope
delimiters are now the balanced `[TK]` / `[=]` / `[/TK]` (see §2.1's
revision note for the full rationale). This section is the implementation
task list — **everything here is mechanical against the §2.1 grammar; no
design latitude, Sonnet/Opus-safe.** The separator `[=]` and closer `[/TK]`
are unchanged; only the opener respells (`[TK` → `[TK]`), which shifts the
instruction's start offset by one.

Semantics to preserve exactly (none of these change): trim rule on
instructions; `output === null` for scopes without `[=]`; unterminated-scope
and nested-scope parse errors; block-vs-inline detection; source-ref
extraction over the whole scope; publish strip; `setScopeOutput`'s
first-generation vs. regeneration splice; case-sensitive uppercase tokens.

Tasks (ordered, commit-sized):

1. **Parser** (`worker/src/tk.ts`): respell the open-token scans — both
   `indexOf("[TK", …)` calls (the opener at the top of the loop and the
   nested-scope probe) become `indexOf("[TK]", …)`; the instruction slice
   offset moves from `tkIdx + 3` to `tkIdx + 4` (three places: `closeIdx`
   search start, nested-probe search start, instruction slice). Update the
   header comment, the `TkScope.start` doc comment, the `parseScopes` doc
   comment, and `stripToOutput`'s doc comment to the new spelling.
   ✓ `tsc` clean.
2. **Test fixtures** (`worker/test/tk.test.ts`, `tk-publish.test.ts`,
   `tk-generate.test.ts`, `tk-generate-api.test.ts` — ~59 occurrences
   total): respell every scope literal to the new grammar. Do not weaken any
   assertion; the error-case tests (unterminated, nested) keep their shapes
   with the new opener. Add two new parser cases: (a) `[TK]` with an
   **empty instruction** (`[TK][/TK]` and `[TK][=]out[/TK]`) parses as a
   scope with `instruction === ""` — the journalism-convention bare
   placeholder is now valid grammar; (b) an instruction ending in a
   `![[id]]` ref directly against `[=]` (`…![[<26-char-id>]][=]out[/TK]`)
   splits cleanly — the regression case the grammar history is about.
   ✓ full suite green.
3. **Studio** (`worker/src/studio.ts`): the whole-fragment wrap sugar
   becomes `"[TK]" + instruction + (existing ? "[=]" + existing : "") +
   "[/TK]"`; the two compose-help hints show the real ungenerated form
   (`[TK]instruction[/TK]` — the current hint text `[TK an instruction]`
   predates this respelling and was never a valid form); the three
   `No [TK …] scopes` empty-panel strings respell to `No [TK]…[/TK]
   scopes`. ✓ click-through against local `wrangler dev`: wrap sugar,
   per-scope generate/regenerate, preview highlighting, publish error on
   unresolved scope.
4. **Working-copy migration on the two live nodes**: published wire content
   never contained tokens (nothing to do there); only unpublished working
   copies with old-grammar scopes are affected. Venkat has authorized
   discarding them — but a mechanical migration is trivially safe if
   preferred: parse each working copy with the **old** token rules, re-emit
   with `[TK]` openers, save. Either way, verify each studio's item list
   loads with no malformed-scope errors afterward. Test-content cleanup is
   Venkat's call per node; ask before deleting anything he authored today.
5. **Deploy + verify**: both nodes (account IDs pinned per node — personal
   `7026b5…` for venkateshrao, PI org `7e8c79…` for protocol-institute);
   live-verify one full generate → publish → wire-check loop on one node
   (§7's definition-of-done shape, abbreviated). Update `CLAUDE.md`'s
   decision-#20 note is already done (session 16); DEVLOG entry at wrap-up
   records the respelling.
