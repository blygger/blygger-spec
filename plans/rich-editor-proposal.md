# Proposal — a rich editor for the reference client

> **Reviewed session 67 (2026-11-12, Fable 5.2): no ruling needed.** §7 Q3 was answered
> by #78: an editor may rewrite the author's source only as an explicit, visible,
> author-triggered act, which closes option 3 on principle. Option 4 is refused under #1
> (`docs/backlog.md` §4). Q2 is Venkat's (`docs/pending-calls.md` 15). Notes:
> `docs/v0.4-plan.md` §22.1.

**Status:** DRAFT, exploratory. Written session 29 (2026-09-29) by a research-only Opus
session. **Nothing here is ruled.** Companion docs: [`unicode-support-proposal.md`](unicode-support-proposal.md)
(the editor's text-handling half) and [`pour-over-links-proposal.md`](pour-over-links-proposal.md)
(one of the affordances costed below).

**Brief as given:** explore options including ones that would need protocol change, and
cost those honestly.

**Ruled by Venkat, session 29, after the first draft:** *vendored options are out for the
reference client, and definitely out for anything touching the protocol.* This document
has been rewritten against that constraint. It removes the editor library that the first
draft recommended, and the interlude in §3 now records what the constraint costs and what it buys.
The one existing client-side-dependency count stays at **zero**, which is the state this
ruling preserves.

---

## 1. What exists today

Three composition surfaces, all plain `<textarea>`:

| Surface | Where | Shape |
|---|---|---|
| Quick composer | `/studio` | one textarea, kind radio, char counter, attach/generate/publish |
| Fragment editor | `/studio/edit/:id` | split pane: textarea ↔ server-rendered preview, debounced 400 ms |
| Thread editor | `/studio/edit/:id` (threads) | same split, plus transclusion resolution in preview |
| Quick edit | item rows | a hidden textarea revealed in place |

Plus `installPalette()` (session 28): a shared `[[` / `![[` picker, deliberately
regex-free, driven off `textarea.selectionStart`.

The editor's real substance is **the preview**, not the input. `POST /studio/preview`
runs the actual publish-time pipeline — TK annotation, `[[id]]` resolution, markdown
render — and returns HTML. That is the thing that makes this editor good, and any
proposal that breaks it is a downgrade however pretty the input box gets.

### The constraints that are not negotiable

- **`content_md` is the source of truth** and is hashed (§5.1). Whatever the editor does,
  the bytes it saves must be the bytes the author meant.
- **No client-side framework** (`blygger-studio/CLAUDE.md`, Stack conventions).
  Server-rendered HTML plus vanilla JS.
- **No vendored client-side dependency** (ruled session 29). The studio page ships zero
  third-party JS today and keeps shipping zero. This is read as: no prebuilt bundle
  checked into the repo, no CDN script tag, no new build step to produce either. It is
  *not* read as touching the existing server-side npm dependencies (`hono`,
  `markdown-it`, `fast-xml-parser`), which wrangler bundles into the Worker and which
  predate the ruling — say so if that reading is wrong, because it changes §4.4 of the
  pour-over proposal too.
- **Inline page scripts live inside TS template literals.** Backticks and `\n` inside
  them are a live hazard that has shipped a fully-dead studio once (session 19) and bit
  three times in one session more recently. Any large editor script raises that risk
  linearly with its size.
- **The authoring grammar is studio-private, permanently** (§5.7 rule 2). `[TK]…[/TK]`
  never reaches the wire. An editor may render it however it likes.
- **`![[id]]` owns its line; `[[id]]` is inline** (§10.1). These are permanent wire
  surface. An editor must be able to produce both, exactly.

---

## 2. What "rich" is actually being asked for

Worth separating, because the four wants have very different costs:

| Want | Cost |
|---|---|
| **a.** See what you get without reading markdown | low → high depending on approach |
| **b.** Direct manipulation of blygger's own constructs — a transclusion as a *block* you can drag, a TK scope as a *thing*, not a bracket pair | medium |
| **c.** Paste behaviour that does the right thing — a URL, an image, formatted text from elsewhere | low–medium (see the pour-over doc) |
| **d.** Select-to-quote, for partial transclusion (#49) | low |

Only (a) pulls toward WYSIWYG. (b), (c) and (d) are all achievable on a source editor,
and (b) is arguably *better* on one — the constructs are already textual and unambiguous.

---

## 3. Four options

### Option 1 — Enriched plain text (textarea stays)

Keep the textarea. Add: a formatting toolbar and keyboard shortcuts operating on
`selectionStart`/`selectionEnd`; smart paste (URL → link or pour-over; image → attach;
HTML → markdown); select-to-quote producing a `![[id]]` + blockquote pair; drag-and-drop
image attach; the palette extended to all three composers (already Opus queue item 1).

**For.** Zero new dependencies. Zero risk to the preview. Nothing about `content_md`
changes. Delivers (b), (c) and (d) in full.
**Against.** Delivers nothing of (a). The textarea stays an undifferentiated grey wall,
which is the actual complaint when someone says "rich editor."
**Size.** Small-to-medium, incremental, each piece independently shippable.

### Option 2 — Decorate the source, without a library

The first draft of this document recommended CodeMirror 6 here: markdown source in a real
editor, with `![[id]]` rendered as an atomic chip showing the target's excerpt instead of
26 base32 characters, TK scopes as bordered blocks, the palette as native autocomplete.
**That option is closed by the session-29 ruling** and is recorded in the interlude below rather than
argued for.

What remains reachable with no dependency is narrower and still worth having.

**2a — Overlay syntax highlighting.** A `<div>` positioned exactly under a
transparent-text textarea, painting the same characters with the same metrics, scroll- and
resize-synced, re-rendered on `input`. The textarea keeps every native behaviour: IME
composition, undo stack, selection, spellcheck, mobile keyboards, screen readers, bidi
reordering. The overlay only paints colour behind it.

This is the one hand-rolled editor technique that is not a trap, precisely because it
**does not intercept editing at all** — it has no keymap, no document model and no
selection logic, so none of the failure modes that sink a `contenteditable` mirror apply.

- **Buys:** `![[id]]`, `[[id]]`, `[TK]…[/TK]` and code fences visibly distinct from prose;
  an unresolvable id shown red *while typing* instead of at publish; TK scope extents
  visible as regions rather than inferred from bracket pairs.
- **Cannot buy:** anything that changes text metrics. The overlay must align character for
  character with the textarea, so a 26-character id cannot become a 12-character chip.
  **Highlighting yes, chips no** — that is the precise ceiling, and the chip was the
  single biggest legibility win the library bought. This is what the ruling costs.
- **Watch:** the overlay must match the textarea's font, line-height, padding, word-wrap
  and `white-space` exactly or it drifts on long lines; it needs `aria-hidden`; and it is
  ~100 lines of inline script, which under the session-19 template-literal hazard means
  ~100 lines that need `test/inline-scripts.test.ts` coverage.

**2b — Make the preview the rich surface.** The under-used asset here is that
`POST /studio/preview` already runs the *real* publish pipeline and returns real HTML —
resolved transclusions, rendered TK spans, baked links. **The split pane already is a
WYSIWYG view; it is just read-only.** Making it interactive is pure gain with no new
machinery:

- click a rendered transclusion → put the caret on its directive in the source;
- click a generated span → open its TK scope in the panel below (which already exists);
- hover a resolved `[[id]]` → the target's byline and excerpt, which the palette already
  fetches;
- a resolution error in the preview naming the line it came from.

Nothing here is a new dependency, a new document model or a new wire construct. It is
wiring between two panes that already hold everything needed.

**Size.** 2a is a day plus its tests. 2b is incremental and can be done one affordance at
a time.

### Interlude — what the no-vendoring ruling costs, recorded once

So it is not re-proposed, and so the cost is legible if it is ever revisited:

- **Lost:** `[[id]]` and `![[id]]` as readable chips; autocomplete rendered in the editor
  rather than in a floating panel; bracket matching; and correct-by-construction IME,
  undo and large-document behaviour for any future editing feature that goes beyond
  painting.
- **Kept:** zero third-party JS on the page that holds the owner credential; no build
  step; no vendored blob to re-review on every upgrade; a self-host that works air-gapped;
  and a studio page that is still readable as source.
- **Also kept, and this matters more than it looks:** the textarea is genuinely the best
  mobile input surface available. The queued mobile pass and the editor work stop being
  in tension (§7 Q4 dissolves).

The trade is defensible on its own terms, not merely accepted. The chip was a legibility
win; the supply-chain surface on an owner-credentialed page was a real cost, and the
project's stated shape — static files, inspectable source, self-hostable by a stranger —
is more consistent with the ruling than with the library.

### Option 3 — WYSIWYG over markdown (ProseMirror / Tiptap / Lexical)

A real rich-text document model, serialized to markdown on save.

**Closed twice over.** Every editor in this class is a vendored dependency, so the
session-29 ruling closes it before the round-trip argument is reached. The argument below
is kept anyway, because it is the reason this option should stay closed even if the
dependency question is ever reopened — the two objections are independent, and the
round-trip one is the fatal one.

**For.** Delivers (a) completely.
**Against.** **Round-trip lossiness, which is fatal here and not fatal in most apps.**
A WYSIWYG editor parses markdown into a document model and re-serializes it. That
re-serialization is *normalizing*: `*em*` becomes `_em_`, setext headings become ATX,
list bullets and indentation are regularized, hard line breaks and reference links are
rewritten. Anything the model does not represent is dropped.

In an ordinary CMS that is invisible. Here:

- `content_hash` covers `content_md` (§5.1). Opening an item in the editor and saving it
  without typing produces a **different hash and a new version** — a publish event, a
  feed entry, a changelog row, and a re-resolution of every transclusion (§10.2). The
  protocol's "draft saves are invisible" (§5.2) holds, but the first publish after
  adopting the editor rewrites the author's prose.
- `[TK]…[/TK]` and `![[id]]` are not markdown. Each needs a custom node with an exact
  serializer, and the thread grammar's whitespace rules are load-bearing: a directive
  owns its line, and under #49 *a blank line after it detaches the blockquote and changes
  the meaning*. A serializer that normalizes blank lines changes what the document says.
- Third-party tools already write raw markdown to `/api` (a macOS studio, a Drafts
  action, an Obsidian plugin). Their text would be silently rewritten the first time it
  passed through this editor.

**Size.** Large, and the risk is not in the size.

### Option 4 — A structured document model on the wire

Make the wire carry blocks — `content_blocks[]`, or `content_html` primary with
`content_md` demoted — so the editor has something faithful to edit.

**Costed and recommended against**, but worth stating properly since the brief allows it:

- It contradicts **invariant 1 / decision #1** (static file contract, markdown source of
  truth) and would obsolete `content_hash`'s definition.
- Seven client implementations exist. A block format is a rewrite for every one of them.
- §10.2's bake is *HTML-in-HTML* nesting and works precisely because the quote is opaque
  bytes. Blocks would require a merge semantics for nested foreign blocks that nothing
  needs.
- It buys nothing the protocol lacks. The gap is an **editing** gap, and editing is
  §16.6 studio territory by ruling — "never normative."

The honest version of this option is much smaller and stays studio-private: keep
`content_md` on the wire and let the studio hold an *optional side-car* editing
representation in D1, never published, never hashed, rebuilt from markdown when absent.
That is worth considering if Option 3 is ever taken, and it is not a protocol change at
all.

---

## 4. The round-trip problem is the whole decision

Everything above reduces to one question: **may the editor rewrite bytes the author did
not touch?**

Say no, and Options 1 and 2 are the field, and WYSIWYG is out.
Say yes, and Option 3 opens — but the protocol has to absorb the consequence that
`content_hash` stops meaning "the author's text changed."

There was a middle path worth naming — **WYSIWYG that edits a region, not a document**:
a prose-only fragment converted to a rich surface once, on an explicit author action,
dropping back to source the moment a `![[` or `[TK]` enters. It keeps the lossy step
visible and one-time instead of invisible and per-open, which is the property that makes
lossiness tolerable at all.

It is recorded here and **not pursued**, because it still needs a rich-text library. If
the answer to "may bytes change" is ever *no anyway*, the path is closed on its own
merits too and nothing is lost.

---

## 5. Recommendation

**Option 1 plus Option 2a and 2b. Option 3: no. Option 4: no.** The textarea stays, and
stays permanently — this is now a shape, not a stopgap.

Order, all independently shippable, none blocked on a decision:

1. **Palette everywhere** — already Opus queue item 1. Prerequisite for everything else,
   and the one item already scheduled.
2. **Smart paste + select-to-quote** (Option 1's (c) and (d)). Small; select-to-quote is
   a #49 deliverable anyway and should be built *with* partial transclusion rather than
   after it.
3. **Interactive preview** (2b), one affordance at a time — click-through from rendered
   transclusion to directive first, since that is the one that makes a long thread
   navigable.
4. **Toolbar, shortcuts, drag-and-drop attach** (the rest of Option 1). Ordinary work.
5. **Overlay syntax highlighting** (2a), last, behind a per-author setting defaulting
   off for one release — same shape as the update-check setting. It is the only item here
   with a real failure mode (metric drift), so it should ship where it can be turned off.

The ordering changed from the first draft: with no library to install, the *gate*
disappeared, and the work that was queued behind it — steps 3 and 4 — is now the
substance rather than the warm-up.

### What this does not change

`content_md`, `content_hash`, the publish path, `/api`, the preview endpoint, every
third-party tool writing markdown, and the protocol. Nothing above is ⚠️ FABLE.

---

## 6. Unicode and accessibility obligations

In the first draft these were the strongest technical argument for a library. With the
library out, they become **obligations the build has to meet by hand** — and the good
news is that Option 2a's paint-only design is what makes that tractable, since a textarea
gets all four of these right from the platform and an overlay does not take them away.
(Runtime evidence for each is in the Unicode proposal.)

- **IME composition.** A `keydown` handler that mutates the textarea mid-composition
  corrupts Japanese, Chinese and Korean input. The palette's current trigger runs on
  `input` — which fires during composition — so `compositionstart`/`compositionend`
  guards are needed on the *existing* code, not only on anything new. Worth checking
  before it is reported.
- **Grapheme-aware cursor and counting.** Arrow keys over a family emoji or a Devanagari
  cluster should move one cluster. The textarea gets this from the platform and keeps it
  under 2a; it is exactly what a `contenteditable` mirror would have thrown away.
- **Bidi.** An RTL paragraph inside an LTR document needs `dir="auto"` per block. This is
  the one place 2a's overlay is genuinely at risk: bidi reordering means visual order no
  longer tracks character offset, so a painted span can land in the wrong place. An
  honest answer is acceptable — detect an RTL run and disable the overlay for that
  document rather than paint it wrong. Worth deciding before it is discovered.
- **Counters must count what the cap counts.** Today both are UTF-16 code units, which
  is at least consistent — but it means a family emoji spends 11 of an author's 1,000.

---

## 7. Open questions

1. ~~**Does the project accept a vendored client-side dependency at all?**~~ **Answered,
   session 29: no.** Recorded in §3's interlude with what it costs. Option 1 + 2a + 2b is the plan.
2. **Is the no-vendoring ruling about client-side JS specifically, or about dependencies
   generally?** §1 reads it as the former — the existing server-side npm packages
   (`hono`, `markdown-it`, `fast-xml-parser`) are assumed unaffected. If it is the
   broader reading, say so: it changes the pour-over proposal's HTML→markdown converter
   (already hand-rolled under the narrow reading, so no change there) and it would make
   `markdown-it` itself a question, which is a much larger conversation.
3. **May a saved document differ byte-for-byte from what was opened?** Moot for the plan
   above, which never rewrites bytes — but worth ruling anyway, because a *no* closes
   Option 3 and the §4 middle path permanently rather than leaving them on the
   dependency's coat-tails. That is a cleaner reason for them to stay closed.
4. **Should the editor be a separate page, or the composer grow into it?** Today there
   are four surfaces with three behaviours. Still open, and now the main structural
   question left.
5. ~~**Mobile sequencing.**~~ **Dissolved by the ruling.** The textarea is the best mobile
   input surface available, so the queued mobile pass and this work no longer collide and
   can run in either order.
6. **Is any of this ⚠️ FABLE?** No. §16.6 rules the write surface "never normative," and
   nothing in the recommendation touches `content_md`, the hash or any wire token. The
   two options that would have — 3 and 4 — are both closed.
