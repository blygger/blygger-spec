# The CSS contract — public pages

**Status: reference documentation, non-normative** except where it points at
the spec. Written session 20 (2026-09-13), describing the vocabulary session 19
established in practice. This is the remaining half of the roadmap's v0.5
"styling" deliverable: the default theme shipped, and a theme system whose
required classes and structure are undocumented is a promise nobody can keep.

Two audiences, two very different levels of commitment:

- **Anyone rendering blyg content** — including a reader client displaying
  items imported from someone else's origin. You need §1 only, and §1 is a
  protocol obligation.
- **Anyone theming the reference client** — restyling its public pages, or
  writing a third-party client that wants to reuse these stylesheets. §§2–4
  are for you, and they are a promise by *this client*, not by the protocol.

---

## 1. Wire-visible classes (permanent; protocol surface)

Two class names are **baked into published `content_html`** at publish time.
They travel with the content: they are in the item JSON, in the feed's
`<description>`, in every pinned version file, and in any copy any reader
imports. They are permanent wire tokens and cannot be renamed — see
`protocol-v0.2.md` §10.2 and §5.7.

| Selector | Meaning | Spec |
|---|---|---|
| `blockquote.blyg-transclusion` | A fragment quoted verbatim into a thread, snapshotted at publish time. Carries `data-blyg-id` (26-char item id) and `data-blyg-version` (integer). | §10.2 |
| `span.blyg-tk-gen`, `div.blyg-tk-gen` | A span of machine-generated prose. `span` for inline output, `div` for block output. The JSON `generated` array is the authoritative provenance; this is its presentation-plane twin. | §5.7 |

Obligations:

- **Styling is free; suppression is not.** Both classes exist to disclose
  something — that words are someone else's, or that words were generated. A
  theme may render them any way it likes, but must not make the distinction
  invisible where the disclosure is the point. (`blyg-transclusion` needs to
  read as quoted material; `blyg-tk-gen` is deliberately *unstyled* in this
  client — see §5.)
- **Never rewrite them.** A client that stores or re-emits item JSON carries
  `content_html` verbatim. Renaming, stripping, or "normalizing" these classes
  destroys provenance the publisher asserted.
- **Sanitize before rendering foreign content** (`protocol-v0.2.md` §14).
  Keeping these two classes and their `data-blyg-*` attributes through your
  sanitizer's allowlist is what preserves the disclosure.
- A reader that does not understand them must still render the content; they
  are ordinary HTML elements with a class, and the ignore-unknown rule applies.

Everything else in this document is presentation.

## 2. Page structure

Every public page is one `<div class="blyg">` inside `<body>`. That div is the
**embeddable unit**: a host page can drop it into its own layout, and it
carries its own type and colour rather than inheriting the host's (this is why
`.blyg` repeats the font and colour declarations `body` already makes).

```
div.blyg
  ├─ header.blyg-header            one line: blyg name (→ the feed page), feed link
  │    └─ .blyg-name               the name; absent on the feed page (.bare modifier)
  ├─ div.masthead                  feed page only — the blyg's identity at display size
  │    ├─ img.avatar
  │    └─ .masthead-text
  │         ├─ .site-name  .author-name  .author-bio  .author-links
  ├─ article.fragment | article.thread          one per item
  │    ├─ div.item-content         ← the author's published bytes, untouched
  │    ├─ p.version-line           ← the apparatus begins here
  │    │    ├─ span.vlabel         "v3"
  │    │    └─ span.pins           "pinned: v1, v2" — links to frozen pages
  │    ├─ p.version-note           the publish note, in quotes
  │    ├─ p.timestamps             Created / Most recent
  │    └─ p > a.permalink
  ├─ footer.older                  "older items →"
  └─ section.blogroll              feed page only
       ├─ h2, ul > li > a, .blyg-mark
       └─ p.blogroll-foot
```

Variants and states:

| Selector | Where |
|---|---|
| `article.fragment.thread-card` | A thread shown as an excerpt card on the feed page. |
| `article.fragment.withdrawn` | A withdrawal endcap. Also used bare (`.withdrawn`) for "nothing published yet". |
| `a.item-title` | Wraps a *leading* `<h1>` so the item's title links to its page. Feed page only; added at render time, never stored in `content_html`. |
| `.kind-chip` | The word marking an item's kind. |
| `.pinned-banner` | The frozen-snapshot banner on a pinned-version page (`f|t/{id}/v{n}/`). |
| `.provenance` | The source link under a transcluded quote. Injected at render time *inside* the `blockquote.blyg-transclusion`, into a copy — never stored: the published `content_html` carries no link inside the wrapper, which §10.2 requires. So it appears in the page but not in the item JSON, the feed, or an importer's copy. |
| `ul.archive > li`, `.row-main`, `.meta` | The archive listing. |

**`div.item-content` is the boundary that matters.** Inside it are the
publisher's own published bytes — arbitrary markdown output, plus the §1
wire classes. Outside it is apparatus this client renders *about* the item. A
theme that wants to restyle metadata without touching the writing has exactly
one selector to hang that on.

### 2.1 Carousel classes are script-added

`.vnav`, `.vstep`, `.vlatest`, `.vextra`, and the `article.showing-pin` state
class are created by the feed page's script, which is the only client-side
script on any public page. **They do not exist when JavaScript is off**, where
the server-rendered pin citations remain plain links. Never write a theme that
depends on them existing; style them for when they do.

`p.version-line` carries the data the carousel reads — `data-item`,
`data-kind`, `data-live`, `data-pins`, `data-mount`. Treat these as this
client's private interface, not a contract: they are a DOM-to-script channel,
not published data. (The published data is `items/{id}.json`.)

## 3. Design tokens

The stylesheet defines these on `:root`; a theme redefines the colour ones.
Anything selecting on hardcoded colours instead of tokens will break under
themes.

| Token | Role |
|---|---|
| `--page` | The margins — the surface *behind* the writing. |
| `--paper` | The block the writing sits on. Equal to `--page` unless a theme separates them, in which case the block reads as a sheet on a desk. |
| `--paper-sunk` | Recessed fill: code blocks, the pinned-page banner, a frozen version held in place. |
| `--ink` | Prose. |
| `--ink-soft` | The apparatus layer, and anything spent (withdrawn items). |
| `--rule` | Hairlines: item separators, underlines on quiet links. |
| `--pencil` | **The editorial mark.** Pins, provenance, the rule beside a transclusion, the kind marker, links. One colour for every editorial gesture — an editor's blue pencil. |
| `--block-pad` | Inset between `--page` and `--paper`. `0rem` when the two surfaces match, `2rem` when they differ (halved on narrow screens). `.blyg`'s `max-width` compensates so the measure stays 65ch either way and switching themes never reflows the text. |
| `--serif` | Prose face (system stack). |
| `--sans` | Apparatus face (system stack). |
| `--apparatus` | The full `font` shorthand for the apparatus layer: one size, one leading. Set it as `font: var(--apparatus)` rather than restating the parts. |

**No web fonts, deliberately.** A reference client for a decentralised medium
should not make every reader's page load phone a third-party font host;
self-hosted files that depend on someone else's CDN are not really
self-hosted. A theme is free to differ, at that cost.

### 3.1 How themes are applied

`{mount}/style.css` is generated per deployment: the base stylesheet, plus —
when the `theme` setting names one — a `:root` override appended by
`themeCss()`. The override is emitted **twice**, in the base block and inside
`@media (prefers-color-scheme: dark)`, so an author's explicit choice does not
flip when a reader's OS theme changes. The default (`auto`) is not a theme: it
emits nothing and lets the base stylesheet's own light/dark blocks follow the
reader's preference — the only setting that respects a choice the *reader*
made.

A theme supplies six colours (`page`, `paper`, `ink`, `inkSoft`, `rule`,
`pencil`) and a `dark` flag, which sets `color-scheme` so form controls and
scrollbars match. `--paper-sunk` and `--block-pad` are derived.

Because themes ride in one generated file, the static export picks them up by
fetching the route like any other file — nothing about theming breaks an
exported tree on a dumb file host.

## 4. Rules for a theme or a third-party client

1. **Select on classes, not on structure.** The nesting in §2 may gain levels;
   the class names are the stable part within a release.
2. **Use the tokens.** Redefine them on `:root`; don't fork the stylesheet to
   change a colour.
3. **Keep the apparatus distinguishable from the prose.** It is the thing that
   distinguishes a blyg from a blog — every item wears its revision history in
   public. Merging it into the body text is a legibility regression, not a
   simplification.
4. **Respect §1.** Style the two wire classes; don't hide, rename, or strip
   them.
5. **Degrade without script.** Everything except the carousel is
   server-rendered; keep it that way, and treat §2.1's classes as enhancement.
6. **Don't style `.item-content`'s interior aggressively.** It holds arbitrary
   author markdown; rules written against one blyg's habits will fight
   another's.

## 5. Deliberately not styled

`blyg-tk-gen` carries **no visual treatment** in this client, and that is a
protocol-semantics decision, not an oversight (locked decision #25, companion
to the §8.4 ruling). Generation provenance is self-asserted and unverifiable
(`protocol-v0.2.md` §5.7, §14); tinting generated prose would present it as a
verified authorship badge — a claim the protocol explicitly refuses to make —
and after author review the author owns the text (decision #20). The
disclosure lives where it can be inspected rather than inferred: the item
JSON's `generated` array, and this class in the page source.

A theme may choose otherwise. It should do so knowing it is making a visible
claim about authorship on every reader's screen.

## 6. What this document does not promise

The class vocabulary in §§2–3 is the **reference client's** presentation. It is
documented so themes can rely on it, and it will not churn gratuitously, but it
is not protocol: another conforming client may render blygs with an entirely
different vocabulary, and `protocol-v0.2.md` §4 explicitly leaves HTML form to
the publisher ("their form is presentation, not protocol"). Only §1 crosses the
wire.
