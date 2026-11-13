# Proposal — Unicode support in the protocol

> **Reviewed session 67 (2026-11-12, Fable 5.2): ruled as decision #103**, the fifteenth
> revision of 0.4. Option B was taken with one change (B1's NFC is a SHOULD, not a MUST),
> C5 (`lang`) was parked, C6 and C7 refused, and §0's criterion is in spec §3 in an
> asymmetric form. Reasoning: `docs/v0.4-plan.md` §22. The §6 client table is Opus's;
> some of it has shipped. This document is otherwise as written.

**Status:** DRAFT, exploratory. Written session 29 (2026-09-29) by a research-only Opus
session running beside the implementation session. **Nothing here is ruled.** Sections 2
and 3 are findings and options; §7 is the list for a Fable round.

**Scope note.** This touches `content_hash` (#2), origin comparison (§12.2, §15.4), the
`cited` excerpt cap (#30), partial transclusion's substring test (#49) and §14. Every one
of those is ⚠️ FABLE. The client-side half in §6 is not.

**Ruled by Venkat, session 29, after the first draft:** *vendored options are out for the
reference client, and definitely out for anything touching the protocol.* Read at the
protocol level, that is a **conformance-cost criterion**, and it is a sharper constraint
than it first appears — see §0. Two of the four rules the first draft recommended failed
it and have been reformulated. None of the §2 findings changed; §3, §4, §5 and §7 did.

---

## 0. The conformance-cost criterion

Venkat's ruling, applied to normative text, reads: **a rule this protocol states must be
satisfiable from a language's standard library.** A MUST that can only be met by
installing a Unicode package is this protocol imposing a dependency on every implementer
— which is the vendoring objection, moved one level up and made worse, because at the
protocol level it is permanent and it binds people who never agreed to it.

This is not a hypothetical filter. It is close to fatal for the naive version of a
Unicode spec, because the Unicode operations divide sharply:

| Operation | JS | Python | Go | Rust | Verdict |
|---|---|---|---|---|---|
| Reject C0 controls / lone surrogates | free | free | free | free | **free everywhere** |
| Count/slice by **code point** | free | free (native) | free (`[]rune`) | free (`chars()`) | **free everywhere** |
| **NFC** normalization | `String.normalize` | `unicodedata` (stdlib) | `x/text/unicode/norm` | crate | **near-free** |
| **IDNA ToASCII** | via `URL` | `idna` pkg (stdlib's is IDNA2003) | `x/net/idna` | crate | **a dependency** |
| **Grapheme clusters** (UAX #29) | `Intl.Segmenter` | `regex`/`grapheme` pkg | package | crate | **a real dependency** |

JavaScript has all five built in, which is exactly why the first draft did not notice:
the reference client's runtime made every rule look free. It is free *here* and not free
for the seven other implementations `roadmap-tracks.md` counts.

**The criterion produces a better spec, not a weaker one**, and in two places it pushed
this proposal somewhere it should have started:

- **State properties, not algorithms.** "The origin string MUST be ASCII" is checkable by
  anyone with no library at all. "Apply IDNA ToASCII" names a dependency. They constrain
  the same set of strings; only one of them costs something to conform to.
- **Put correctness in the MUST and quality in the SHOULD.** Splitting a surrogate pair
  produces text that is not text — that is correctness, and detecting it is free.
  Splitting a grapheme cluster produces text that looks bad — that is quality, and
  detecting it is not free. The first draft mandated both at the same level.

---

## 1. The question

"Blygger is UTF-8, done" is the answer the spec currently gives by omission, and it is
the wrong one. UTF-8 settles how bytes encode code points. It settles none of the four
things this protocol actually does with text:

1. **Hashes it.** `content_hash` is `SHA-256(content_md as UTF-8)` (§5.1).
2. **Compares it.** Origin strings are compared as strings in three places — version
   agreement, mention verification (§15.4), reference scoping (§13.1).
3. **Counts it.** Three separate caps are stated in "characters" (§5.3's 2,000, the
   studio's 1,000, `cited.excerpt`'s ~200) without saying which unit.
4. **Slices it.** Feed titles and `cited.excerpt` are both truncations.

Every one of those has a Unicode-specific right answer and the spec states none of them.
Two implementations that both "use UTF-8" can disagree on all four and both be
conformant, which is precisely the class of thing §12.2 exists to prevent when it claims
"two readers that resolved the same blyg therefore write the same `origin` string."

This is not theoretical for this project. The ecosystem census in `roadmap-tracks.md`
counts seven client implementations across at least three languages. The moment one of
them is written in Python or Go, the WHATWG URL guarantees the reference client relies
on silently stop holding.

---

## 2. Findings

Everything in this section was **verified in the Workers runtime** (workerd, via
`vitest-pool-workers`) on 2026-09-29, not reasoned about. The probe file was temporary
and has been deleted; every result is reproducible in twenty lines.

### 2.1 `content_hash` is normalization-sensitive, and normalization is unspecified

```
SHA-256("café")  NFC → 850f7dc43910…
SHA-256("café")  NFD → 81ef060bcd98…   equal: false
```

Two authors who type the same visible word get different hashes depending on their input
method. macOS's own text services, several IMEs, and anything that has round-tripped
through an HFS+ filename produce NFD; almost everything else produces NFC.

The consequence is not cosmetic. `content_hash` is the protocol's only integrity claim
(§5.1: *"Integrity is the hash's job"*). A hash that changes when the bytes are
re-encoded by a well-behaved intermediary is a hash that cannot be used to answer the
question it exists to answer. Worse, it is *silently* useless: nothing fails, the numbers
just differ.

**The spec does not say whether `content_md` is normalized, when, or by whom.**

### 2.2 Origin equality is byte equality over a normalization-sensitive string

`normalizeOrigin()` in the reference client is `new URL(raw).origin + pathname`. Verified
WHATWG behaviour in workerd:

| input | normalized |
|---|---|
| `https://exämple.com/blyg/` | `https://xn--exmple-cua.com/blyg/` |
| `https://EXAMPLE.com/Blyg/` | `https://example.com/Blyg/` |
| `https://example.com/日本/` | `https://example.com/%E6%97%A5%E6%9C%AC/` |
| `https://example.com/café/` (NFC) | `https://example.com/caf%C3%A9/` |
| `https://example.com/café/` (NFD) | `https://example.com/cafe%CC%81/` |

Three distinct problems:

- **The last two rows are the same URL to a human and different origins to this
  protocol.** A publisher who mounts a blyg at a non-ASCII path and a reader who typed
  the address by hand can end up with references that never match.
- **The punycode and percent-encoding steps are WHATWG guarantees, not universal ones.**
  Python's `urllib.parse` does neither by default; Go's `net/url` keeps the Unicode host.
  A Python reader would write `https://exämple.com/blyg/` into every reference it emits,
  and §15.4 verification against a WHATWG-based receiver would fail every time. §12.2's
  same-string claim is currently load-bearing and unearned.
- **Host case is normalized, path case is not.** That is correct per RFC 3986 and worth
  saying out loud, because "compare origins as strings" reads as though it were not.

### 2.3 Imported bytes are decoded as UTF-8 unconditionally

Verified: workerd's `Response.text()` **ignores the `charset` parameter** of
`Content-Type`.

```
new Response([0x63,0x61,0x66,0xE9], {headers:{"content-type":"text/html; charset=iso-8859-1"}})
  .text()  →  "caf�"
```

`src/importer/http.ts` and `src/mentions/http.ts` both call `res.text()` with no charset
handling anywhere in the codebase. Every non-UTF-8 source the importer touches —
`<?xml version="1.0" encoding="ISO-8859-1"?>` is still common in long-lived RSS, and
`Shift_JIS` and `GB18030` pages are ordinary on the open web — is mojibaked at the
boundary. Under §13.6 the L0 wrapper subscribes to exactly those feeds.

Then the damage becomes **permanent**: a mojibaked import can be transcluded, and §10.2
bakes the local snapshot into the quoting thread's `content_html`, which §10.4 makes
independent of the source forever.

The fix is available and unused. Verified: workerd's `TextDecoder` supports the full
WHATWG label set —

```
utf-8 → utf-8    iso-8859-1 → windows-1252    windows-1252 → windows-1252
shift_jis → shift_jis    gb18030 → gb18030    euc-jp → euc-jp    utf-16le → utf-16le
```

— so reading `arrayBuffer()` and decoding with a sniffed label (HTTP header → BOM →
XML declaration → `<meta charset>` → UTF-8) is a contained change in two files.

This one is a **live bug in the reference client**, not a protocol question. It belongs
in the studio backlog regardless of what the spec decides.

### 2.4 Three caps, one word, no unit

| Where | Cap | Stated as |
|---|---|---|
| §5.3 | 2,000 | "characters" |
| §5.3 | 1,000 (RECOMMENDED studio cap) | "characters" |
| §5.9 | ~200 for `cited.excerpt` | "characters" |

The reference client implements all three as `String.length` — UTF-16 code units.
Verified counts for the string `[family emoji] café [JP flag]`:

```
UTF-16 code units: 21    code points: 15    grapheme clusters: 8
```

A fragment budget that counts a single family emoji as 11 and a flag as 4 is not a
budget an author can reason about. The spec's caps are publisher-side SHOULDs, so nothing
breaks — but the client's visible counter is wrong in a way non-Latin authors notice
first: Devanagari and Thai clusters, Hangul jamo sequences, and any emoji all overcount.

`Intl.Segmenter` **is available in workerd** (verified), so grapheme counting is a
one-liner, not a dependency.

### 2.5 Truncation produces lone surrogates

`excerpt()` is `plainText(md).slice(0, n).trimEnd() + "…"`. Verified with a run of one
astral emoji repeated:

| n | result |
|---|---|
| 59 | **ends with a lone high surrogate** before the ellipsis |
| 60 | clean |
| 61 | **ends with a lone high surrogate** |

Parity is not the issue; whether a surrogate pair straddles offset *n* is, and with mixed
prose that is content-dependent. A lone surrogate is not valid Unicode text. It cannot be
encoded as UTF-8, so `TextEncoder` replaces it with U+FFFD on the way out — meaning the
visible symptom is a replacement character at the end of a feed title, in every
subscriber's reader, and in `cited.excerpt` **on the wire** where §5.9 freezes it
forever.

Both call sites are affected: `excerpt()` (feed `<title>`) and `excerptFromHtml()`
(`cited.excerpt`, studio previews).

### 2.6 XML-invalid characters are not filtered out of the feed

Verified: `escapeXml()` passes U+0001 through untouched. XML 1.0 forbids every C0
control except tab, LF and CR, and forbids lone surrogates. `content_md` is author-typed
text with no filter between the composer and the feed.

`fast-xml-parser` — the parser *this* client uses — tolerates it, so the reference
client's own round-trip tests would stay green. libxml2, Python's `xml.etree`, and most
feed-reader stacks reject the document. The failure mode is therefore the worst-shaped
one available: **invisible to us, total for a subscriber** (the whole `feed.xml` fails to
parse, not one entry), and reachable by pasting the wrong thing into a fragment.

The CDATA handling beside it is correct — `cdata()` splits `]]>` properly — which makes
this look like an oversight rather than a decision.

### 2.7 Nothing anywhere declares a language, and `lang="en"` is hardcoded

- `blyg.json` (§6.1) has no language key.
- `feed.xml` (§7) omits RSS 2.0's `<language>`.
- Item documents have no per-item language.
- `src/pages.ts:644` and `src/studio.ts:367` both emit `<html lang="en">` unconditionally.
- No `dir` attribute is emitted anywhere.

So a blyg written in Arabic or Hebrew publishes pages that declare themselves English and
lay out left-to-right, and a transclusion of an RTL item into an LTR thread produces a
blockquote with no directional isolation — the classic bidi-bleed where the quote's
punctuation migrates into the host sentence.

`formatDateIn()` and `relativeTime()` are also hardcoded to `"en-US"` and English words,
one session after the timezone setting made the *zone* configurable. The zone work is the
precedent to copy: a setting the wire is indifferent to, prefilled from the browser.

### 2.8 §14 is silent on the two text-level attacks this medium actually has

§14 covers withdrawal, self-assertion, HTML safety, fetch hygiene and history rewriting.
It says nothing about:

- **Bidi overrides in attributable strings.** `author.name`, manifest `title`,
  `cited.source` and `cited.excerpt` are all publisher-supplied and all rendered near
  other people's content. U+202E and friends reorder rendered text without changing the
  stored bytes — Trojan Source, applied to a medium whose entire premise is quoting
  strangers into your own page. A baked transclusion is the ideal delivery vehicle:
  §10.2 says the quote is the quoter's assertion, but the *reader* is the one whose page
  gets reordered.
- **Confusable origins.** §12.2 makes the origin the only authenticated entity in the
  protocol. A Cyrillic-homograph domain and its Latin twin are different origins and look
  identical, and the reference client displays the punycode form (`safeHost()` returns
  `url.host`), which is at least honest but unreadable.

Neither needs a wire construct. Both need a paragraph in §14 and a display rule.

### 2.9 The PUA sentinels are collidable (low severity, noted for completeness)

`src/tk.ts` uses U+E000–U+E002 as render-time sentinels, documented as "never produced by
normal authoring." Verified: an author who pastes U+E000 into `content_md` keeps it —
nothing strips it. Exploiting it requires reproducing the exact sentinel-index-sentinel
token shape in a document that also has a generated block span. Real, narrow, and cheaply
closed by stripping U+E000–E002 from `content_md` on save — which the §2.6 control-char
filter would do anyway if it were written as "strip characters that have no business in
authored text."

---

## 3. Three options for the protocol

### Option A — say nothing more

Leave the spec as it is; fix §2.3, §2.5 and §2.6 in the client as bugs.

*For:* smallest possible change; keeps §3's conformance surface still. *Against:* §2.1
and §2.2 are cross-implementation interop defects, and the client cannot fix an interop
defect by itself. Doing this means accepting that `content_hash` comparison and origin
comparison work by luck across implementations.

### Option B — specify normalization and comparison (recommended)

Four rules, no new fields, no new vocabulary, **each satisfiable from a standard library**
(§0). Rules 2 and 4 are reformulated from the first draft, which stated them as algorithms
that named dependencies.

1. **`content_md` is NFC.** Publishers MUST normalize `content_md` to Unicode NFC before
   computing `content_hash` and before publishing. Readers MUST NOT re-normalize on
   import. Rationale: the hash is the only thing that has to be stable, and NFC is what
   the web platform already produces almost everywhere.
   *Cost:* near-free (§0) — stdlib in JS and Python, the semi-official extended stdlib in
   Go. The obligation also falls on **publishers only**; a read-only implementation needs
   no normalizer at all, which is where most of the long tail sits.

2. **An origin string is ASCII, and comparison is byte equality.** Stated as a property
   of the value rather than as a procedure for producing it:

   > An origin written into a reference MUST consist only of ASCII characters; its host
   > MUST be lowercase and, for an internationalized domain, in A-label (punycode) form;
   > its path MUST be percent-encoded from its NFC UTF-8 form; it MUST end in `/` and
   > carry no query or fragment. Origins are compared byte for byte.

   *Why this shape:* checking that a string is ASCII, lowercase and slash-terminated needs
   nothing. Only a publisher that actually mounts a blyg at an internationalized domain or
   a non-ASCII path has to *produce* such a string, and that publisher is already using a
   URL library. So the dependency lands on the rare party who has a reason to carry it,
   instead of on every implementation that merely compares two origins — which is
   everyone. Same constrained set, a fraction of the conformance cost.

3. **Text-safety filter on authored content.** `content_md` MUST NOT contain C0 controls
   other than tab/LF/CR, MUST NOT contain unpaired surrogates, and SHOULD NOT contain
   U+FFFE/U+FFFF or unpaired bidi controls. Publishers enforce at publish; readers treat
   a violating document as malformed rather than rejecting the whole feed.
   *Cost:* free everywhere. Pure range checks.

4. **Caps are code points; truncation never produces invalid text.** Split into the
   correctness half and the quality half, which the first draft conflated:

   > Caps stated in this document in *characters* mean **Unicode code points**. A
   > truncation MUST NOT produce an unpaired surrogate, and SHOULD NOT split an extended
   > grapheme cluster (UAX #29).

   *Why this shape:* code points are free in every language and are what "characters"
   most naturally means in a spec. The MUST is free — not splitting a surrogate pair is a
   range check, and in languages that iterate code points natively it is automatic. The
   grapheme rule stays as a SHOULD, where an implementation with a segmenter honours it
   and one without still conforms. **This is the rule the first draft got wrong**: it made
   a segmenter a conformance requirement, which under §0 is precisely the thing not to do.
   The reference client can and should meet the SHOULD, because `Intl.Segmenter` is free
   *for it* — but that is a client quality choice, not a protocol obligation.

Rules 1 and 2 are the interop fixes. Rules 3 and 4 are hygiene that happens to also fix
live client bugs.

### Option C — add an i18n surface

Option B plus:

5. **`blyg.json` gains OPTIONAL `lang`** — a BCP 47 tag for the publication's primary
   language. Informative, like `level` and `generator` (§3.2): readers MUST NOT gate on
   it. Publishers SHOULD emit `<language>` in `feed.xml` to match.
   *Cost under §0:* free. Emitting a tag is a string copy and ignoring one costs nothing;
   nobody has to *validate* BCP 47, precisely because readers may not act on it.
6. **Items gain OPTIONAL `lang`** — per-item override.
7. **A `dir` derivation rule** for readers displaying remote content.

*Against 6 and 7:* per-item `lang` is the kind of field that looks free and is not.
Every reader now has three places to look for a language, a transcluded item's language
is *not* recorded in the bake (only `data-blyg-id`/`version`/`origin` are), so the
nesting story is immediately incomplete — and #46 closed the title field on a very
similar argument: a field readers may not act on, solving a problem presentation already
solves.

*For 5:* the manifest tag is different. It is one value, it is publication-level like
`title` and `author`, it has an exact RSS analogue that already exists, and it is what
lets a directory (blygger.com) and an aggregator group blygs by language without
guessing. It is also the minimum needed to stop the client hardcoding `lang="en"` on
other people's behalf.

---

## 4. Recommendation

**Option B in full — as reformulated under §0 — plus C5 (manifest `lang`) only.**
Everything else in C is presentation, and the project has ruled twice (#46, #45) against
adding wire fields that presentation already covers.

Every rule in the recommendation is now satisfiable from a standard library, and two of
them (B1, and B2's production half) fall on publishers only, so a read-only implementation
takes on nothing at all. That property is worth stating in the spec text itself if this is
adopted: it is the same promise §3.2 makes about `level` and `generator`, generalized —
**conformance should not require a package**.

Sequencing, if it is taken:

- B1–B4 and C5 are **additive and non-breaking**. No migration, no reader obligation
  change, no new relation. Under #43's version-boundary rule they look like a 0.3
  revision rather than a 0.4 construct — but B1 changes what `content_hash` *means*, and
  that deserves an explicit ruling rather than my reading of #43.
- The one real compatibility question is B1 against **existing pinned versions**. A pin
  is an irrevocable promise (§8) and its `content_hash` was computed over whatever bytes
  the author had. Normalizing on republish would change the hash of content the author
  did not edit. The rule has to be *normalize on publish going forward*, never
  retroactively, and pinned files stay exactly as they are. Worth stating in the text.

---

## 5. Sketches of normative text

Not drafts — shapes, for a Fable round to accept, reject or rewrite.

**§5.1, after the `content_hash` bullet:**

> - `content_md` MUST be in Unicode Normalization Form C at publish time, and
>   `content_hash` is computed over the normalized form. Readers MUST NOT re-normalize
>   an imported document: the publisher's bytes are the publisher's bytes, and the hash
>   is a claim about them. Versions published before a publisher adopted this rule are
>   not retroactively renormalized, and pinned files (§8) are never rewritten.

**§5.9, replacing "compared" in the identity-members bullet:**

> - Origin strings are compared **byte for byte**. An origin written into a reference
>   MUST therefore be **ASCII-only**: its host lowercase and, for an internationalized
>   domain, in A-label form; its path percent-encoded from its NFC UTF-8 form; a trailing
>   `/` present; query and fragment absent. A WHATWG URL parser produces this form
>   already; an implementation without one MUST still emit it. The guarantee in §12.2
>   that two readers write the same string depends on it, and the rule is stated as a
>   property of the string so that *checking* it requires nothing.

**§5.3, new bullet:**

> - Caps stated in this document in *characters* mean **Unicode code points**. A
>   truncation — a cap, a derived feed title (§7), a `cited.excerpt` (§5.9) — MUST NOT
>   produce an unpaired surrogate, and SHOULD NOT split an extended grapheme cluster
>   (UAX #29). The first is a correctness rule and costs nothing to honour; the second is
>   a quality rule, and an implementation without a grapheme segmenter remains conformant.

**§5.3, new bullet:**

> - `content_md` MUST NOT contain C0 control characters other than tab (U+0009), line
>   feed (U+000A) and carriage return (U+000D), and MUST NOT contain unpaired surrogates.
>   These make a conforming `feed.xml` (§7) impossible to produce, so a publisher that
>   emits them breaks every subscriber's parse of the whole feed, not one entry.

**§14, new bullets:**

> - **Rendered text can be reordered by its own content.** `author.name`, the manifest
>   `title`, `cited.source`, `cited.excerpt` and `content_html` are publisher-supplied and
>   are displayed adjacent to other publishers' content. Bidi control characters
>   (U+202A–U+202E, U+2066–U+2069) reorder rendered text without changing stored bytes.
>   Readers SHOULD isolate every attributed string and every baked remote quote —
>   `dir="auto"` with `unicode-bidi: isolate`, or explicit U+2068/U+2069 — so that a
>   quoted document cannot reorder its quoter's page.
> - **Origins can be confusable.** §12.2 makes the origin the only authenticated entity
>   here, and IDN homographs make two origins look identical. Readers displaying an origin
>   SHOULD show it in a form the viewer can check, and MUST NOT treat visual similarity as
>   identity — identity is the string, always.

**§6.1, new paragraph:** `lang` as OPTIONAL BCP 47, informative under §3.2, with
`<language>` in the feed as the SHOULD companion.

---

## 6. Client work that needs no protocol decision

These are bugs and quality-of-life fixes in `blygger-studio`. They stand whatever §3
outcome is chosen, and none of them is ⚠️ FABLE.

**None of them needs a dependency.** `TextDecoder`, `Intl.Segmenter`, `String.normalize`,
`Intl.Collator` and `Intl.DateTimeFormat` are all built into workerd — verified this
session — so the no-vendoring ruling costs this table nothing. Where the protocol can only
ask for a SHOULD (B4's grapheme rule), the reference client can simply meet it.

| # | Fix | Files | Size |
|---|---|---|---|
| U1 | Charset sniffing on import (§2.3). `arrayBuffer()` + sniff HTTP header → BOM → XML decl → `<meta charset>` → UTF-8; `TextDecoder(label)` | `src/importer/http.ts`, `src/mentions/http.ts` | small |
| U2 | Grapheme-safe truncation in `excerpt`/`excerptFromHtml` via `Intl.Segmenter` (§2.5) | `src/markdown.ts` | small |
| U3 | Grapheme-based character counters in all three composers (§2.4); the counter and the cap should agree | `src/studio.ts` | small |
| U4 | Strip XML-invalid characters and PUA sentinels at publish, or reject rather than strip if that is preferred (§2.6, §2.9) | `src/api.ts` or `src/model.ts` | small |
| U5 | NFC-normalize `content_md` on save (§2.1) — do this *whatever* the spec rules, since it is a no-op for NFC input and a fix for NFD input | `src/api.ts` | small |
| U6 | `lang` and `dir` from a setting, replacing hardcoded `lang="en"`; locale for `formatDateIn`/`relativeTime` (§2.7). Model it exactly on the session-28 timezone setting | `src/pages.ts`, `src/studio.ts`, `src/util.ts` | medium |
| U7 | Bidi isolation on attributed strings and baked remote quotes (§2.8) | `src/pages.ts`, CSS | small |
| U8 | Display IDN origins in Unicode with the punycode form available, rather than punycode-only (§2.8) | `src/stub.ts` `safeHost`, reader UI | small |

**U1, U2 and U4 are the urgent three.** U1 corrupts imported content permanently once
it is transcluded; U2 puts replacement characters into other people's feed readers and
into frozen `cited.excerpt` values; U4 can break a subscriber's entire feed parse.

**One finding for the implementation session, out of band:** §2.1's NFC gap lands
directly on **partial transclusion (#49, Opus queue item 7)**, which is next up. Its
faithfulness test is "the selection MUST be a substring of the target snapshot's text
content." Verified: the NFC spelling of `"café society"` does not `.includes()` the NFD
spelling of the same words. An author selecting text that has round-tripped through an
NFD-producing layer gets a publish error on a quote that is visibly correct. Normalizing
both sides to NFC before the substring test costs one line and should go in when the test
is written, not after.

---

## 7. For the Fable round

1. **Is `content_hash` normalization-sensitive on purpose?** If the hash is "over the
   author's exact bytes," say so and close §2.1 as a non-issue — but then §5.1's
   "integrity is the hash's job" needs qualifying, because the hash cannot survive a
   re-encoding that changes nothing a reader sees.
2. **Does §12.2's same-string guarantee bind non-WHATWG implementations?** It reads as a
   guarantee and is currently an artifact of the reference client's runtime. Either make
   the canonical spelling normative (B2) or downgrade the claim.
3. **Is "characters" code points?** Three caps, one word. Cheap to close, and under §0 the
   unit should be code points rather than grapheme clusters — which means the *client's*
   character counter and the *protocol's* cap will deliberately disagree for emoji and
   complex scripts. That is defensible (the counter is a courtesy, the cap is a
   conformance line) but it should be a decision rather than a discovered inconsistency.
4. **Is a text-safety filter on `content_md` a publisher MUST or a reader tolerance?**
   Both work; they put the cost in different places. A publisher MUST is stricter and
   protects subscribers; a reader tolerance is more in keeping with §13.1's ignore rule.
5. **Manifest `lang`: in or out?** The argument against is #46's; the argument for is
   that a client currently asserts `lang="en"` on every publisher's behalf, which is a
   claim the wire gives it no basis for.
6. **Does §14 take the two text-attack bullets?** They assert nothing and require
   nothing; they describe a surface the medium has by construction.
7. **Version boundary.** All of this is additive and reader-compatible, which reads like
   a 0.3 revision under #23 — except B1, which redefines an existing field's computation.
   Which side of #43's boundary does that fall on?
8. **Should the conformance-cost criterion be written down?** §0 is currently a criterion
   I inferred from a ruling about vendoring in the client. If it is right, it belongs in
   the spec as a stated principle — a sentence in §3 alongside the conformance levels —
   rather than living in one proposal doc, because it constrains every future construct,
   not just this one. It would also have caught the first draft of B2 and B4 before I
   wrote them. Worth ruling on directly.
