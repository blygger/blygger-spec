# Proposal — pour-over links

> **Reviewed session 67 (2026-11-12, Fable 5.2): no ruling needed.** Three things have
> changed since this was written. §5's question was ruled as #55 (`cited` MAY sit on a
> `{url}` stub). Class A no longer needs a subscription: #82 lets a one-off snapshot
> resolve. `[[id]]` is a disclosed link since #79, not a silent one. The rest is client
> work (ROADMAP row 40). Notes: `docs/v0.4-plan.md` §22.1.

**Status:** DRAFT, exploratory. Written session 29 (2026-09-29) by a research-only Opus
session. **Nothing here is ruled.** Companions: [`rich-editor-proposal.md`](rich-editor-proposal.md)
(the surface this lives on) and [`unicode-support-proposal.md`](unicode-support-proposal.md)
(§4.2 below depends on a fix described there).

**Definition, as given by Venkat this session:** *an authoring-time move in the editor.
Paste a URL, the editor fetches it and pours the content into the draft as attributed
material you then trim down. Client-side only — the output is ordinary transclusion or an
ordinary blockquote. No new wire construct.*

The term appears nowhere in the four repos or in `DEVLOG.md` before today; this document
is its first record.

---

## 1. Why this is the right shape

The medium's existing borrowing ladder (§16.4) is *quote a passage → transclude the whole
item → fork from a pin*. All three start from something you have already read and
imported. There is no rung for the most common blogging act of all: **you are looking at
a page and you want to write about it.**

Today that costs: copy the URL, go to the studio, work out whether the site is a blyg,
subscribe if it is, wait for a poll, find the item in the reading view, then stub or
transclude. Or give up and paste a bare link. Pour-over collapses that to a paste.

Crucially it introduces nothing on the wire. What comes out is what an author would have
typed by hand — a `![[id]]` directive, a `[[id]]` link, or a markdown blockquote with an
attribution line. Under #50's naming rule it is named for what it does, and it makes no
claim on anyone's behalf.

---

## 2. What the protocol already says

Four rulings bound this, and they bound it usefully — every hard question has an answer
already.

1. **§16.4: "Plain-web targets get nothing."** Quoting an ordinary web page is an
   ordinary markdown blockquote; there is no versioned document to verify against, and a
   construct there would promise what it cannot check. **So class C below emits plain
   markdown, full stop.** This is the ruling that makes pour-over cheap.
2. **§13.5: imported items are never re-emitted.** "Speech about someone else's content
   costs editorial work: write an item." A paste that dumps a whole article into a draft
   and publishes it is exactly the re-emission this forbids, wearing a different hat.
   **The trim step is not a convenience; it is the editorial work the rule requires.**
3. **§10.6: `{url}` stubs exist.** A response to a plain-web page is already expressible.
   Pour-over's natural pairing for class C is *create a `{url}` stub, pour the passage
   into its body.*
4. **#50: a reader affordance that inserts a link is fine**, provided it is named for
   what it does and is never a peer of `stub ↗`. Pour-over is the composer-side twin of
   that ruling.

And one thing the protocol does *not* have: **`cited` attaches only to a reference**
(`forked_from`, `stub_of`, `transclusions[]`), all of which are blyg-native. A plain-web
pour has nowhere structured to put "who said this, where, when." §5 returns to this.

---

## 3. Three target classes

The classifier already exists: `resolve()` in `src/importer/resolve.ts` implements §12.1
exactly. Pour-over is mostly a new front-end on it.

### Class A — the URL is a blyg item

Detected by: resolving the URL's origin to a manifest, then finding the item — the
permalink page SHOULD carry `<link rel="alternate" type="application/json">` (§5.8),
which is the documented way back from a page to a document.

**Pours into:** a real transclusion. If the origin is already subscribed and the item
imported, this is exactly today's path: `![[id]]` for a whole quote, `[[id]]` for a link,
`stub_of` if the author wants it marked as a response, `cited` composed by
`composeStubCite()`.

If the origin is *not* subscribed: offer to subscribe, then import, then pour. §10.2's
resolution order permits nothing else — a directive resolves to a local or imported item
or it is a publish error, and "quoting follows reading" is the rule that makes publishing
network-independent. **Pour-over must not become a live-fetch back door into
transclusion.** That is the one way this feature could go wrong at the protocol level,
and the fix is simply that the pour goes through import like everything else.

### Class B — the URL is a blyg, but not an item

A blyg's front page, or an origin. **Pours into:** nothing. Offer to subscribe, and
insert a plain markdown link. There is no construct for "I quote a publication."

### Class C — the URL is an ordinary web page

**Pours into** an ordinary markdown blockquote plus an attribution line the author can
edit or delete:

```markdown
> The passage the author trimmed down to, as markdown.

— [Some Essay](https://example.com/some-essay/), example.com, retrieved 2026-09-29
```

Optionally, as one gesture: create the draft as a `{url}` stub of that page (§10.6), which
is the machine-readable "this is a response," and send a plain W3C Webmention if the
target advertises an endpoint (§10.6 rule 5 — "most will not").

**Nothing structured is emitted.** §16.4 already ruled why, and the ruling is right: a
`selector` against an unversioned page would be a faithfulness promise nobody can check.

---

## 4. The parts that are actually hard

### 4.1 Extraction

Turning an arbitrary HTML page into quotable markdown. Three tiers, in the order a build
should attempt them:

1. **Metadata only** — `<title>`, `og:title`, `og:description`, `<meta name="author">`,
   `article:published_time`. Cheap, always works, and if the affordance shipped as *only*
   this it would already be most of the value: a paste that becomes a correctly-titled,
   correctly-attributed link.
2. **The author's selection.** If the author pastes a URL *and* has copied a passage,
   or picks one from a preview, quote that. This sidesteps extraction entirely and is the
   honest shape — **the author chooses the quote, which is what §13.5 asks for anyway.**
3. **Full-article extraction** (Readability-style). Mozilla Readability needs a DOM;
   Workers have `HTMLRewriter`, not a DOM. Vendoring a DOM shim is **out** under the
   session-29 ruling, and doing it in the browser is blocked by CORS on most targets, so
   what remains is a streaming heuristic over `HTMLRewriter` — `<article>`, `<main>`,
   `[role=main]`, else the largest `<p>` cluster. That is materially worse than
   Readability on a long tail of sites and there is no way to close the gap without a
   dependency.

**Recommendation: build tiers 1 and 2; treat 3 as optional and clearly fallible.** Tier 2
is also better aligned with the medium — the author picked these words — and the ruling
strengthens rather than weakens that case: with no Readability to lean on, *asking the
author which passage they mean* is both the cheaper build and the better one. Tier 3
should be offered as a suggestion the author edits, never as the thing that fills the
draft.

### 4.2 Charset — a hard dependency

A pour-over fetch hits the open web, where non-UTF-8 pages are ordinary. Verified this
session: **workerd's `Response.text()` ignores the `charset` parameter of
`Content-Type`** — a Latin-1 body served with `charset=iso-8859-1` decodes to a
replacement character. The whole codebase calls `res.text()`.

So a pour-over built today would mojibake a real share of what it touches, and — unlike
an import, which can be re-fetched — the poured text is **typed into the author's draft
and published as their own words**.

`TextDecoder` in workerd supports the full WHATWG label set (verified), so the fix is
contained. It is item **U1** in the Unicode proposal, and it is a **prerequisite** for
this feature, not a nice-to-have.

### 4.3 Fetch hygiene

A composer that fetches a URL on paste is a server-side fetch driven by whatever the
author types — the same class of surface as the Webmention receiver, with a lower risk
because the principal is the owner, not a stranger.

Reuse `src/mentions/http.ts` wholesale: manual redirects capped at 3, 5 s timeout, 1 MB
body cap, identifying User-Agent. Add: refuse non-http(s), refuse private-network and
loopback addresses (§14 names this for exactly this reason), and cap the poured text.

### 4.4 HTML → markdown

markdown-it renders markdown to HTML; nothing here goes the other way. The session-29
ruling settles the build: **hand-roll a `HTMLRewriter`-driven subset** — headings,
paragraphs, emphasis, links, lists, blockquotes, code — and drop everything else. A
vendored converter (turndown and its kin) is out.

This is the rare case where the constraint picks the answer the design wanted anyway. A
quote is prose; inheriting a stranger's table markup, figure captions and footnote
scaffolding into your `content_md` is not a feature, and a general-purpose converter's
job is precisely to preserve all of it. A deliberately lossy subset is the correct tool,
and the ruling means it gets built rather than argued for.

It runs server-side in the Worker, on HTML that has already passed through
`sanitizeHtml()`. Note it is the same conversion a rich editor's "paste formatted text"
needs, so the two proposals share one module — build it once, in `src/`, not inline.

### 4.5 Etiquette, which is a design constraint here and not a footnote

This feature makes it one keystroke to put a large piece of someone else's writing into
your own document. §13.5 is explicit that the cost of speaking about someone else's
content is *editorial work*. Three concrete constraints follow:

- **Cap what is poured** — a few hundred words by default, with the rest discarded rather
  than folded. A cap is editorial convenience, which §16.4 rightly refuses to put in the
  *protocol*; in a *client* it is exactly where it belongs.
- **The attribution line is inserted, not optional-by-default.** The author may delete it;
  the tool never omits it.
- **Never publish a pour unedited.** The pour lands in a draft. It does not become a
  publish action, and it should be visibly marked as unedited in the composer until the
  author has touched it.

### 4.6 What a pour is *not*

Not a generation source. §5.7 rule 3 draws the line between verbatim-and-visible (quote)
and drawn-upon-and-woven (source), and a pour is the first. If a pasted page is fed to a
generator instead, that is `[TK]`, and at 0.3 remote sources are not expressible — §16.3
rules the 0.4 shape, and it is blyg-native only. **There is no route from a pour-over to
`generated[].sources[]`,** and the composer should not offer one.

The adjacent construct worth not confusing this with is `[TK]impyrt=…[/TK]` (Opus queue
item 4, #37): pasted text disclosed as generated-elsewhere. Different act, different
disclosure. A pour is a quotation, disclosed by being visibly a quotation.

---

## 5. The one place a wire question appears

For a class-C pour, provenance lives in prose: `— [Title](url), site, retrieved date`.
That is a sentence, not data. Nothing can check it, nothing can re-find it if the line is
edited, and a `{url}` stub carries the URL but not the label the author saw.

`cited` (§5.9, #30) exists for exactly this problem on the blyg-native side, and its
rationale — *"a citation is as-of-retrieval by nature, so the citing publisher's frozen
label is more faithful than a reader's later lookup"* — applies identically to a web
page, arguably more so, since web pages have no versions and rot faster.

**The question for a Fable round:** should `stub_of: { url }` be permitted to carry
`cited`?

*For:* one construct, four sites instead of three; the shape already exists and readers
already ignore it safely; it is self-asserted like everything else; and it makes a
plain-web citation survive the target's death, which is the whole reason `cited` was
added.
*Against:* §16.4 just ruled "plain-web targets get nothing," and this is a thing. The
counter to the counter is that §16.4's sentence is about *verification* — a selector
promises a check that cannot be made — whereas `cited` explicitly promises nothing and
§5.9 says verification MUST ignore it. Those may not be the same case.

**I have no view worth acting on here and this is squarely ⚠️ FABLE.** Everything else in
this document works without it.

---

## 6. A staged plan

Each stage is useful alone and shippable alone.

| Stage | What | Depends on |
|---|---|---|
| **P0** | **U1 — charset sniffing on import/fetch.** Prerequisite (§4.2) | — |
| **P1** | **Paste classification.** Paste a URL in any composer → `resolve()` it → one of three offers. No fetching of page *content* yet; class A inserts `[[id]]`/`![[id]]` for already-imported items, class B offers subscribe, class C inserts a plain link | palette-everywhere (Opus queue item 1) |
| **P2** | **Class C tier 1: metadata pour.** Fetch bounded, extract title/author/date, insert a titled link plus an attribution line. Add the `{url}`-stub-on-pour option | P0, P1 |
| **P3** | **Class C tier 2: selection pour.** Show a preview of the fetched page's text, let the author select the passage, insert it as a capped blockquote with attribution | P2, §4.4 converter |
| **P4** | **Class A subscribe-then-pour.** Paste a blyg item URL for an origin not yet subscribed → subscribe, import, then pour as a real transclusion | P1 |
| **P5** | *(optional)* **Tier 3 extraction** — full-article heuristic, offered as a suggestion the author edits, never as the default | P3 |

P1 and P2 together are the feature as Venkat described it. P3 is what makes it good.

**Sequencing note:** P3's selection UI is the same control as **select-to-quote for
partial transclusion (#49, Opus queue item 7)** — pick a passage, produce a quote. Build
them as one control over two backends and they cost roughly one and a half features
instead of two.

---

## 7. Open questions

1. **`cited` on a `{url}` stub?** §5. ⚠️ FABLE, and nothing else is blocked on it.
2. **Where does the paste handler live** — all three composers, or the full editors only?
   Consistency argues all three; the quick composer's 1,000-character ethos argues that a
   pour belongs where there is room to trim.
3. **Is a pour that the author never edits publishable?** §13.5's spirit says no. Making
   it a hard block is paternalistic in a single-user tool; making it a visible warning is
   probably right. Venkat's call.
4. **What is the default cap?** §4.5. Needs a number, and the number is an editorial
   judgement about the medium, not a technical one.
5. **Does the fetch go through the Worker or the browser?** Worker: works on any target,
   but every pour is a server-side fetch from the blyg's IP, and the blyg's user-agent
   shows up in strangers' logs. Browser: no server surface, but CORS blocks most targets.
   Worker, almost certainly — but the log-footprint point is worth knowing before it is a
   surprise.
6. **Robots and scraping norms.** A studio fetching a page an author explicitly pasted is
   not a crawler, and honouring `robots.toml`/`robots.txt` for a single user-initiated
   fetch is arguably wrong. Worth deciding on purpose rather than by omission, since this
   is the first construct in the project that fetches non-blyg content on an author's
   instruction.
