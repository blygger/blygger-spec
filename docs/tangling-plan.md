# Tangling and the Background classifier — implementation plan

**Status:** plan of record. Written session 57 (2026-11-01) by Opus 5.5 with Venkat, who
chose the four open settings (§0). **The protocol side is already ruled**: decision #78
(tangling is a studio act whose output is ordinary wire), #70 (a client-private bracket form
is rewritten before publish), #77, #80 and #83 (what readers may queue low), and §7 and §13.7
of `protocol-v0.4.md`. This plan adds no wire construct. Two wording flags for Fable are in §5.

**Revised session 66 (2026-11-12), Fable 5.2 with Venkat: a tangled span becomes a thread,
not a fragment.** An item's kind is fixed once published (the studio API already refuses the
change, `src/api.ts` `updateItemOperation`), so the kind chosen at minting is permanent.
"Fragment" is the author's own statement that an item is a leaf: one layer, bounded length,
no quotes. A client must not make that statement on the author's behalf, because the author
may later want the minted item to quote something or to grow. So every item this plan mints
is `kind 'thread'`, and the two refusals that existed only to keep minted items legal
fragments (a span containing a quote, a span over 1,000 characters) are gone. Below, the
minted items are called **parts**. Decision #100; reasoning `v0.4-plan.md` §20. Tangling was not yet built
when this changed.

**Sources:** `plans/inline-fragment-authoring.md` (the session-29 exploration),
`v0.4-plan.md` §13 (Fable's ruling), [studio#20](https://github.com/blygger/blygger-studio/issues/20),
ROADMAP row 45; reader side: Opus brief items l, o, p, r (rows 77, 78, 82) and row 92.

**Why the two halves are one plan.** Tangling makes bursts: N parts and a thread from
one act. The protocol answers bursts on the reader's side, not the writer's: no quiet
publish (§7), and readers MAY fold (§13.7). A studio that ships the first half without the
second floods its own readers. The reader side also carries everything else the rulings
send to a low-priority queue (maintenance republishes, near-same edits, wordless items,
notices), so it is built once, as one classifier.

---

## 0. Settings Venkat chose (session 57)

| Question | Choice |
|---|---|
| Spelling | `![[+ text]]` — the directive with `+` for "a new item" |
| Inline placeholders (`[[+ text]]` → a link to a new item; Aneesh's withdrawn speculative-authoring design) | **Reserved, built later.** Same grammar family; folding them needs §13.7 extended to `links[]`, which is Fable's |
| Cap on spans per publish | **10** — a fifth of the RECOMMENDED 50-entry feed window |
| Reader-side scope | **All five reasons** in one classifier (§3), plus notices in signals |

---

## 1. Grammar (studio-private; never on the wire, #70)

```
![[+ Stigmergy is the mechanism by which a protocol becomes invisible
to the people inside it.]]
```

1. **Opener** `![[+` at the start of a line (leading whitespace allowed, as for
   `DIRECTIVE_LINE`), followed by at least one space or a newline. **Closer** `]]` at the end
   of a line (trailing whitespace allowed). The span is the text between them, trimmed. A
   span may run over several lines and paragraphs.
2. **The scanner skips nested `[[id]]` and `[[id | label]]` links** when looking for the
   closer, so a link inside a span does not end it. Links inside a span are fine: the part
   carries them in its `links[]` (§10.3a).
3. **Inert where every bracket form is inert:** inside code spans, fenced and indented code
   (`codeRanges`, #54), and inside TK scopes, instruction or output.
4. **Errors, all reported by pre-flight (§2.1), none silent:**
   - an opener with no closer; a closer that does not end its line, or an opener that does not
     start one. The replacement is an own-line directive, so a span must be whole lines;
   - a span inside a span (not in this build: tangle again inside the part once it
     exists); a span containing a TK scope or inline media (§2.5);
   - an empty span;
   - more than 10 spans in one publish;
   - spans in a **fragment** draft: "tangling makes a thread; switch this draft to a thread".
     A draft may change kind until its first publish; after that the API refuses
     (`updateItemOperation`: "kind is fixed once an item has been published").

   **Allowed since the session-66 revision:** a span that contains an own-line `![[id]]`
   or `![[id | label]]` directive, since the part is a thread and quotes it; and a span of
   any length. Pre-flight resolves a span's directives as it resolves the thread's, and
   the local closure check (§10.2) runs on each part.
5. **Reserved, not built:** inline `[[+ text]]` (placeholders, §6). Until it is built it is
   literal text, which is what #70 says any non-id `[[…]]` is, and pre-flight does **not**
   rewrite it.
6. No escape for `]]` inside a span, the same choice #70 made for labels: rewrite the text.

## 2. Publishing a tangled thread

### 2.1 Pre-flight (pure; writes nothing)

Parse spans, apply §1.4, then dry-run the thread's resolution with each span replaced by a
directive to a placeholder id the resolver treats as a resolvable local item, and dry-run
each span's own resolution the same way. Every
error the real publish would raise — an unresolvable `![[id]]` in the thread or in a span,
a TK scope with no output, a stub-target problem — is raised here, before anything is
minted. This is #78's "a failed thread publish never strands fragments", which holds for
parts of either kind.

### 2.2 The count gate (every client, not just the studio UI)

`publishItem` on a working copy that contains spans **fails** unless the request carries
`tangle: true`. The failure lists what would be published: N parts (first words of each)
and the thread. The studio's publish dialog shows "This will publish 3 new items and this
thread" and resends with the flag. An MCP agent or API client meets the same gate, which is
#78's "visible count" for every caller. New error code in the contract:
`tangle-confirmation-required`.

### 2.3 The sequence

1. **One D1 batch:** insert each part as a draft (`kind 'thread'`, `content_md` = the
   span, `tangled_from` = the thread id) **and** rewrite the thread's working copy, each
   span replaced by

   ```
   ![[3k7m2p9wqx4vb8ntr5zhdf16cg | Stigmergy is the mechanism by which…]]

   ```

   — the label is the span's first ~8 words plus `…` when cut, so the thread's source stays
   readable (the literate-programming warning in the exploration's §4.4), and **a blank line
   always follows**, so an author's own blockquote after the span is never read as a partial
   selection (#49). The batch is guarded by the thread's `revision`, as `publish()` is.
2. **Publish each part** with the existing `publish()`, in source order.
3. **Publish the thread last** (§7), through the existing `publishAndNotify`.

**Recovery.** After step 1 the source holds no spans, so a retry can never mint twice. A
thread publish that names a local draft whose `tangled_from` is this thread
publishes that part first (step 2), then itself. So a crash after step 1 or partway
through step 2 is repaired by pressing publish again. Drafts without `tangled_from` keep
today's rule: a draft target is an unresolvable reference.

### 2.4 After publish

- The thread source shows `![[id | label]]` lines. To edit a quoted passage, open that
  part; the preview links each directive to it. This is correct (one source of truth per
  item) and the publish dialog says so the first time.
- A new `![[+ …]]` in a later version mints only that one.
- Deleting a directive leaves its part published and quoted by nothing; the publish
  dialog names it. No "untangle": withdrawal is permanent (§9), so it is not minting's inverse.
- Each part has its own page (under `t/`, being a thread), feed entry and `created` (the
  mint time), and no `stub_of` or `forked_from`.
- A part is an ordinary thread afterwards: the author may add quotes to it, tangle inside
  it, or let it grow, and it can be quoted from anywhere.

### 2.4a Sealed regions (Level 3; not built until RFC-6 closes)

When sealed content exists (`v0.5-plan.md`), a span tangled inside a sealed region
inherits the enclosing lock unless the author picks another. Minting publishes the part
as its own document, so without this default tangling would publish sealed text in the
clear.

### 2.5 Media

A span with inline media is refused in this build. Media rows belong to an item
(`media.item_id`), and since 0.49.11 they are addressed by digest, so a later build can
re-attach the same blob to the part. Recorded here, not built.

### 2.6 Preview and other readers of `content_md`

Every place that reads a working copy must know the span:
- **preview** renders each span as a transclusion-style quote marked "new item";
- `authoredText` / `publish()` never see a span (pre-flight rewrites first), but
  `src/ui/plain-text.ts`, `change-note.ts` and `change-class.ts` (`publishableText`) strip the
  markers and keep the text;
- `stub-quote.ts`'s caret logic steps over a span as it steps over a quote;
- the editor's syntax highlighting, if it marks directives, marks the opener and closer.

### 2.7 Schema

One studio migration (next free number at build time; 0037 is reserved by the AI-budget
prototype and 0038 by studio#84): `ALTER TABLE items ADD COLUMN tangled_from TEXT`
(nullable, the thread's id). Studio-private, never on the wire.

## 3. The reader side: one Background classifier

> **Superseded session 61 (2026-11-07) by [`background-plan.md`](background-plan.md)**, which
> builds these five reasons, adds the superseded rule, manual item and blyg placement, a
> Settings section and the changelog signal. Kept for the record; build from that plan.
> Its `burst` rule was widened in session 66 from "a fragment" to "an item", since parts
> are now threads; the table below keeps the session-57 wording.

Every imported version gets a stored **reason**, private to the studio, or none. The
**Background** lens lists everything with a reason; every other lens leaves it out. Every
rule is derived from what the wire already carries, by the rule that significance is never
declared (#19, #77, #80). That is also the method this project recommends to other
clients: each rule below cites the spec text that permits it.

| Reason | Rule (at reconciliation) | Ruling, spec |
|---|---|---|
| `burst` | A fragment from origin O named in the `transclusions[]` of a thread from O, whose `created` falls within the **burst window** before the `updated` of the thread version that first names it | #78, §13.7 (see flag 1) |
| `wordless` | `content_md` with every directive line, attached `>` selection, label and whitespace stripped is empty — the empty stub | #80's test, applied to reading (see flag 2) |
| `maintenance` | `content_hash` equals the previous version's | #77, §13.2 (item l) |
| `near-same` | Changed less than the **near-same threshold** from the held `content_md` | #83, §13.2 (item r) |
| `withdrawn` | As today | row 92 |

1. **The thread stays in the main lens** with a "+N fragments" control that lists them in
   place. Fragments are never omitted, only queued: `MUST still import` (§13.1, §13.7).
2. **Order works in the reader's favour.** The publisher sends the thread last (§7), so one
   feed fetch normally holds the whole burst. The importer classifies the batch before
   anything is shown: when it imports a thread, it marks the fragments it names that qualify,
   including fragments imported earlier in the same reconciliation.
3. **Reader-local constants**, documented in the studio, never on the wire or in the API (#83):
   burst window **15 minutes**; near-same threshold **≤ 2% of the text and ≤ 40 characters
   changed**, measured on `content_md` (the build may tune it; keep it small, since one word
   can negate a sentence).
4. **A later version re-classifies.** A wordless stub that gains a paragraph leaves
   Background; a burst fragment edited later is a normal update, and its reason clears.
5. **Read state is unaffected.** Background is a lens, not a mark-as-read.
6. **Schema:** `imported_items.background_reason TEXT` (nullable). The change-state
   triggers in migration 0024 list columns explicitly, so the new column does not bump the
   reading counters on its own. Decide at build time whether a reason change should; it
   probably should, since items move between lenses.
7. **Our own items** in the reading feed (row 83) are classified by the same function.

### 3.1 Mentions: notices in signals

Items o and p, unchanged: `link` mentions and reposts (wordless stubs or transclusions,
§15.4) are **notices**, held apart from responses in the signals tab, never in a public
responses list (§15.5). A tangle whose fragments carry remote `[[id]]` links sends link
notices, and they land there.

## 4. Build order and acceptance

1. **Classifier first** (reader side). It is useful alone (empty stubs, maintenance) and
   must exist before the studio can emit bursts.
   - *Accept:* on two local nodes, a same-hash republish, a one-character edit, a wordless
     stub and a burst from node A all land in node B's Background; a stub that gains a
     paragraph moves to the main lens; the burst's thread shows "+3 fragments".
2. **Notices** (items o and p) on the signals tab.
   - *Accept:* item o's and p's own acceptance lines in `opus-brief.md`.
3. **Tangling.**
   - *Accept:* a thread with three spans asks for confirmation with a count of 3; publishes
     three parts then the thread, in that feed order; **each part is `kind: "thread"`**; the
     thread's `content_md` has three labelled directives each followed by a blank line; the
     working copy matches; node B shows one entry with the three parts folded under it.
     With a deliberately unresolvable `![[id]]` elsewhere in the draft or inside a span,
     nothing is minted. A span containing a resolvable `![[id]]` publishes a part that
     quotes it, and the outer thread shows the nested quote. A 3,000-character span is
     accepted. Killing the Worker between steps 1 and 3 and publishing again yields exactly
     three parts. Eleven spans are refused. Spans in code are inert. An MCP publish without
     `tangle: true` gets `tangle-confirmation-required`.
4. **Conformance:** reader-suite fixtures (blygger-spec `conformance/reader/`) for a tangled
   thread's published output: it is ordinary wire, so the existing groups should pass it
   unchanged, which is itself the check.

## 5. Flags for Fable (#58 batch: Opus drafts the sentences, Fable reviews)

1. **§13.7's fold rule says "a thread created with them".** On the wire `created` is when the
   item was first drafted (`src/protocol.ts:108`), so a thread drafted on Monday and tangled
   on Friday never matches, nor does a later version that tangles one more span. Proposed:
   "a thread **published** with them — one whose version, by its `updated`, follows their
   `created` within one publish — that names them in its `transclusions[]`".
2. **The wordless test is written for mentions** (§15.4). Applying it to imported items in
   reading is display, which is already every reader's own business, so the studio needs no
   ruling. A sentence in §13.2, beside #77 and #83, would let the project recommend it to
   other clients: "a version with no words of its own (§15.4's test) MAY be queued low".

## 6. Not in this build

- **Inline placeholders** `[[+ text]]` → `[[id | text]]` linking a new item (Aneesh's
  speculative authoring, blygger-spec#24 and studio#108, withdrawn at Venkat's request). The
  grammar is reserved by §1.5. To build: a placeholder publishes a near-empty thread, and
  folding it needs §13.7 to cover items a thread names in `links[]`, which is Fable's.
- Media inside spans (§2.5). A span inside a span. Any kind of untangle.
