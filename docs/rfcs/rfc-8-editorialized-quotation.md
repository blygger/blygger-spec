# RFC-8 — Editorialized quotation: marked changes over a verified passage

**Request for comments · non-normative · DRAFT, not yet published · session 78,
2026-11-21.** Drafted by Opus 5.5 from decision #116 (Fable 5.2, the same day, on Venkat
Rao's proposal) and `v0.4-plan.md` §28.3, for Fable to edit before it publishes on
blyg.blygger.org with a comment period (#66). Like a technical note, an RFC constrains
nothing; at its close this one is ruled, and what survives becomes spec text by
revision, with a technical note recording the reasoning (#90). Written against protocol
0.4 at its twentieth revision; no pre-1.0 version promises anything (#21).

Every choice this draft makes that #116 did not is marked *Proposal (Opus)*.

## Summary

- A partial quote (§10.1–§10.3) may carry **editorial marks**: places where the quoter's
  visible text stands in for a run of the source's text, possibly empty. An ellipsis for a
  skip, `[T]` for "t", `[Cato]` for "He", `[sic]`, `[truncated]` at the end of a cut list.
- **The raw passage stays the verified thing.** `selector.exact` is the whole contiguous
  source passage the quote is drawn from, skipped words included, substring-checked at
  publish exactly as today. The document carries both: the raw passage in the selector,
  the editorialized quote in `content_html`.
- **Every character shown is the source's, in order, or inside a mark, and every
  omission has a mark at its place.** A reader can check that from the document alone.
- **Marks are literal text** (brackets, ellipses) inside one new element. A reader that
  knows nothing of marks, or strips the element, still shows an honestly marked quote.
- A client that renders marks SHOULD let a reader see the raw passage.

## 1. Why

Writers have edited quotations for as long as there has been print: to fit a quote to a
sentence, to replace a pronoun its context explained, to skip what is beside the point.
The conventions are old and readers know them: square brackets mean the quoter's words,
an ellipsis means words left out.

The protocol's partial quote (#49) has none of this. A quote is one contiguous run of the
source, baked as plain text. Today a writer who wants two sentences that are a paragraph
apart writes **two quotes**, and the words between them are in neither: the reader cannot
see what was skipped without opening the source. A writer who needs "[Cato]" for "He"
either quotes the sentence before as well, or leaves the quote and paraphrases.

Under this RFC the skipped words are in the document, one inspection away. That is the
point of the design: an editorialized quote that is **more** checkable than the two
quotes it replaces, not less.

What it does not do: it does not prevent misleading elision. A skip can still change a
meaning ("I do not … support it"). §10.2 already concedes that a selection can mislead by
what it leaves out; this RFC makes the leaving-out visible and inspectable, and claims
nothing more.

**Measured, session 78:** of the 50 blygs in blygger.com's directory whose feeds could be
read, 16 carry partial quotes in their current feeds, baked by five different clients
(blygger-studio, blyxt, rafael-fyi-blyg, blyg-publisher, angadh-jekyll-blyg). A new token
in a partial quote reaches all of them. That is why this is an RFC and not a ruling.

## 2. The model

A quote is a sequence of **source runs** and **marks**:

```
shown:   s0  m1  s1  m2  s2  …  mn  sn
source:  s0  g1  s1  g2  s2  …  gn  sn     = selector.exact
```

Each `si` is source text, verbatim. Each mark `mi` is the quoter's visible text and stands
for a gap `gi` of the source, which may be empty (`[sic]` replaces nothing). `s0` and `sn`
may be empty: a quote may begin or end with a mark.

**The check** (condition 2 of #116): strip the marks from the shown quote; the source runs
that remain must occur in `selector.exact` in order, the first at its start unless a mark
comes first, the last at its end unless a mark comes last, with nothing between two runs
unless a mark stands there. Any alignment that satisfies it will do: the claim is that the
shown words are the source's, in order, and that every gap is marked, not which gap a
mark was meant for.

Combined with today's check (`selector.exact` is a substring of the target's text at the
quoted version), a reader that holds the target can confirm the whole chain; a reader
that does not can still confirm that the quote is honest about its own raw passage.

**The §10.2 invariant generalizes.** The twentieth revision states that a partial bake's
text content is its selector's `exact`. With marks, that becomes: a partial bake's text
content, its marks stripped and its gaps restored, is its selector's `exact`. With no
marks the two statements are the same, which is why #116 anticipated it.

## 3. The bake

*Proposal (Opus):*

```html
<blockquote class="blyg-transclusion blyg-partial" data-blyg-id="…" data-blyg-version="1">
<p><span class="blyg-ed">[Cato]</span> ended speeches with delenda Carthage est</p>
</blockquote>
```

- **One element, `<span class="blyg-ed">`**, containing the mark's visible text and nothing
  else (plain text, escaped). A new permanent wire token beside `blyg-transclusion` and
  `blyg-partial`. No attribute records what a mark replaced: the gap is recoverable from
  `exact` by the check, and a second copy of the source in an attribute would be a second
  thing to keep honest.
- **A mark's text discloses itself.** It begins with `[` and ends with `]`, or it is an
  ellipsis (`…`, `...`, `[…]` or `[...]`). A reader that strips the element keeps the text,
  so the brackets and dots remain. A mark is at most 80 characters: long enough for a
  name or a clause that resolves a pronoun, short enough that a quote cannot become the
  quoter's essay.
- **A mark lies within one line** of the bake. A gap may cross lines: an ellipsis that ends
  one paragraph's quoted part and is followed by a later paragraph stands for the end of
  the first, any paragraphs between and the start of the next. A **line made only of
  marks** (a final `[truncated]`, an ellipsis on a line of its own between two quoted
  paragraphs) is allowed; the check ignores the line break that separates it.
- **Marks only in partial quotes.** A whole quote with a mark is partial by definition:
  it bakes `blyg-partial` with a selector.
- **List structure** (#114) composes: a quoted list item keeps its structure from the
  target; a mark sits inside an item's line, or as an item of its own when it closes a
  cut list (`<li><span class="blyg-ed">[truncated]</span></li>`).

## 4. Worked examples

**Venkat's case.** Source: "Cato was afraid of Carthage's rise. He ended speeches with
delenda Carthage est"

- `exact`: `He ended speeches with delenda Carthage est`
- shown: `[Cato] ended speeches with delenda Carthage est`
- check: one mark first, `s0` empty, `s1` = " ended speeches with delenda Carthage est"
  (with its leading space), found at the end of `exact` with "He" before it. Passes.

The proposal as first written also changed "Carthage" to "Carthago". That **fails**: after
stripping `[Cato]`, " ended speeches with delenda Carthago est" is not in `exact`. The fix
is either to quote the source's word or to mark the correction: `delenda [Carthago] est`,
which passes with `[Carthago]` standing for "Carthage". This is the check doing its job: a
silent repair of the source is exactly what a quotation must not make.

**A skip inside a paragraph.** Source: "Protocols are slow to change, which is the point of
them, and fast to copy." Shown: "Protocols are slow to change … and fast to copy."
`exact` is the whole sentence; the mark stands for ", which is the point of them,".

**A skip across paragraphs.** Shown:

```
The first claim is narrow. …
The third paragraph's point.
```

`exact` runs from "The first claim" to "point.", with the second paragraph inside the gap.

**A cut list.** Source has five bullets; the quote takes the first two and closes with
`[truncated]` as its own item. `exact` covers the two quoted bullets; the mark replaces
nothing and tells the reader the list went on.

**A capital at the start.** Source "… and the reason is cost." Shown: "[T]he reason is
cost." `exact` is "the reason is cost."; the mark stands for "t".

## 5. What the author types

*Proposal (Opus).* The attached blockquote of §10.1 is where marks are written, using the
conventions themselves:

```
![[7c9wk2mhq0v3xj8tn5rzfd41bg]]
> [Cato] ended speeches with delenda Carthage est
```

The publisher resolves it in two steps:

1. **Literal first.** If the quote's text occurs verbatim in the target, it is a plain
   partial quote and nothing in it is a mark, brackets and dots included. A source that
   itself contains "[sic]" or "..." is quoted as itself.
2. **Otherwise, marks.** Every `[…]` group and every ellipsis is a candidate mark, and the
   publisher looks for an alignment by §2's check, taking `exact` as the shortest
   contiguous run of the target that contains it. A mark at the start stands for the word
   or part of a word immediately before `s1` (so `[Cato]` stands for "He", `[T]` for "t");
   at the end, for the part of a word immediately after; an ellipsis at either edge stands
   for nothing and says the quote begins or ends mid-passage. No alignment: a publish
   error, as an unfound passage is today.

A source bracket that the author means as text inside a quote that also has marks is the
hard case. *Proposal (Opus):* a backslash before the bracket (`\[`) makes it text, as
markdown escapes do.

## 6. Readers

- **A reader that knows nothing of this** shows the quote as baked, brackets and dots
  included. It is honest as it stands: what a print reader would see.
- **A reader that knows marks** MAY style them (a different colour, a lighter weight) and
  SHOULD offer the raw passage, `exact`, on inspection: a toggle, a hover, a footnote.
  The reference client's design is a "show the passage as written" control on the quote's
  provenance line.
- **A reader re-checking** (§10.2's opportunistic re-check, #76 F2) uses §2's check
  instead of plain equality. A reader that compares the bake's text with `exact` by
  equality would flag every marked quote: that is the one behaviour change this asks of
  any reader, and it is a question for §8 whether it makes this a new protocol version
  under #43.

## 7. Forks

§5.6 flattens a pinned thread's quotes as markdown blockquotes "from its baked
paragraphs". *Proposal (Opus):* marks flatten as their literal text, so a fork's
blockquote reads exactly as the original did; the raw passage is not carried into the
fork's markdown, and the attribution line already points at the source. A fork is the
forker's text; its quotes are no longer verified ones (#62).

## 8. Questions for implementers

1. **Version or revision?** Under #43 a revision adds what readers already handle by
   ignoring it. A reader that ignores `blyg-ed` shows an honest quote, so display is
   safe. But any reader that re-checks partial quotes by equality must change. Does your
   reader re-check? If none does, this is a revision; if any does, it is a 0.5 construct.
2. **Who writes marks.** An agent may quote. Are an agent's marks its publisher's words
   like any others, or do they want disclosure? #102 keeps `blyg-tk-gen` out of quotes, so
   a generated span cannot mark them. *Proposal (Opus):* a mark is the quoter's assertion
   whoever drafted it, as the choice of passage is; the 80-character cap keeps it from
   carrying prose that would need disclosure.
3. **The author's grammar.** Is §5's "literal first, then marks" the right resolution, or
   should marks be explicit (a dedicated delimiter no source would contain)? The
   conventional brackets read naturally in markdown and in every renderer; a dedicated
   delimiter is unambiguous but nobody writes it.
4. **Edge substitutions.** Is "the part of a word immediately before `s1`" the right
   default for a leading `[…]`? It covers `[Cato]` for "He" and `[T]` for "t". A quoter
   replacing a longer phrase at the start can quote one more word and mark inside.
5. **Select-to-quote.** A quoter who selects text in a reader and then edits the
   blockquote into marked form: should the client offer the conventional edits (capitalize
   the first word, replace a pronoun) as actions?
6. **Anything you already do.** Have you shipped your own way of writing a skip inside a
   quote? Tell us; this draft would rather adopt it than invent.

## 9. Refused

- **A free-form "quoter's version" with no raw.** An overlay without the verified passage
  under it is a paraphrase wearing quotation marks.
- **Unmarked changes of any size,** including "obvious" corrections. A correction is a
  mark (`[Carthago]`), visible and inspectable.
- **Marks in whole quotes** as a separate construct: they are partial quotes.
- **Machine-checkable claims about what a mark means** (that `[Cato]` refers to the same
  person as "He"). The protocol checks that the shown words are the source's and the gaps
  are marked; whether a substitution is fair is the reader's judgement, as it is in print.

## 10. Relation to other documents

- Decision #116 (the direction and its three conditions), #114 (list structure, and the
  §10.2 invariant this generalizes), #49 (partial quotation), #62 (partiality is read
  from the bake), #102 (no quote inside a generated span), #43 (revision or version).
- Spec 0.4 §10.1–§10.3 (partial quotes), §5.6 (fork flattening), §16.15 (list structure).
- `v0.4-plan.md` §28.3.
