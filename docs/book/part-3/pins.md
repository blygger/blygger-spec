# Pins

*Reads after: The item document · Leans on: Withheld unless pinned; Honest promises; Cost is the filter*

## What it is

An origin serves each item at its latest version and at no other. When Ada revises
the promise, the wording she replaced stops being served, and nobody who arrives
afterwards can ask for it. A writer's history is the writer's.

A pin is the exception a publisher makes on purpose. To pin a version is to promise
that this exact text will stay fetchable at one address, whatever happens to the item
afterwards. Ada pins version 2 of the promise. She goes on to publish version 3, and
months later she withdraws the item altogether. Version 2 is still there.

The item and the pin do different work. An item's id names something that keeps
changing. A pinned version is a fixed thing that can be cited. Pinning does not stop
the item from changing; it sets one of its states aside.

A pin cannot be taken back, and that is its whole value to anyone else. Whatever
another party wants to build on a particular version (a fork's lineage, a quote kept
after a withdrawal, a citation meant to last) may rest only on a pin, because a pin is
the one promise of permanence the protocol contains. Someone who wants a passage to
stay citable has a single recourse, which is to ask its author to pin it.

## The shape

A pinned version is served as a **pinned document**, at `items/{id}/v{n}.json` under
the origin or wherever the manifest's `pin` template places it. This is the promise
at version 2:

```json
{
  "blyg": "0.4",
  "id": "h7ybxk4zscw71gt1tpvzvb3gc5",
  "kind": "fragment",
  "origin": "https://ada.example/blyg/",
  "version": 2,
  "at": "2026-03-02T09:15:00Z",
  "note": "said who keeps it",
  "pinned": true,
  "author": { "name": "Ada Okafor", "url": "https://ada.example/blyg/" },
  "content_md": "A protocol is a promise about files, kept by whoever serves them.",
  "content_html": "<p>A protocol is a promise about files, kept by whoever serves them.</p>",
  "content_hash": "sha256:16b74b16084518d57960282eed845151d116698752075819c5b9753edbc1b974"
}
```

A pinned document carries:

| Members | From |
|---|---|
| `blyg`, `id`, `kind`, `origin` | the item |
| `version`, `at`, `note`, `pinned` | that version's entry in the item's changelog |
| `content_md`, `content_html`, `content_hash` | that version, exactly as it was published |
| `author` | the item's byline (rule 6) |
| `transclusions` | that version, when the item is a thread |
| `stub_of`, `forked_from`, `generated` | that version, when it was published with them |

A pinned thread's `content_html` holds the quotes that were baked into it when the
version was published, other origins' words included. The frozen thing says what it
quoted, what it answered and where it came from, as of the version that said so.

A pinned document has no `media` member. Its `content_html` refers to media objects
directly, and those never change once published.

The item document records the pin as well: the version's changelog entry gains
`"pinned": true`. That flag is how a reader learns of a pin. Pinning publishes no
version and puts nothing in the feed.

A publisher may also give a pinned version a page for people, at the item's page
address followed by `v{n}/`. The page stands or falls with the document: it does not
exist unless the version is pinned and it is permanent once it is. Its content is that
version's `content_html` as published. Everything around the content is presentation.
No protocol document lists these pages; a visitor reaches them from the item's live
page.

## The rules

1. A publisher MAY pin any published version that has content, at any time after
   publishing it. `R-0001`
2. A publisher MUST NOT pin an endcap. `R-0002`
3. A publisher MUST answer 200 at a pinned document's address permanently once the
   version is pinned, through later versions and through withdrawal. *Withheld unless
   pinned.* `R-0003`
4. A publisher MUST answer 404 at the address a pinned document would have, unless
   that version of that item is pinned. *Withheld unless pinned.* `R-0004`
5. A publisher MUST keep every media object that a pinned version's content refers
   to, permanently. `R-0005`
6. A publisher SHOULD serve a pinned document with the `author` that version was
   published with. `R-0006`
7. A publisher whose page shows an item's versions MUST expose there only the live
   version and pinned versions, whether as links or in place. *Withheld unless
   pinned.* `R-0007`
8. A publisher MUST NOT offer, imply or hint at access to a version that is not
   pinned. *Withheld unless pinned.* `R-0008`
9. A publisher MAY serve a page for a pinned version at the item's page address
   followed by `v{n}/`. `R-0009`
10. A publisher SHOULD give a pinned version's page a `rel="canonical"` link to the
    item's live page. `R-0010`
11. A publisher MUST NOT list a pinned version's page in the feed or the index.
    *Truth in documents, news in the feed.* `R-0011`
12. A reader MUST NOT depend on a pinned version's page. *Truth in documents, news in
    the feed.* `R-0012`

## Notes

- **A pin may come late.** A version published a year ago can be pinned today (rule
  1). Until then it was withheld, and making it public is the publisher's to decide.
- **An endcap is not pinned** (rule 2) because it has no words, and a pin exists so
  that words can be cited.
- **The byline is outside the promise** (rule 6). The hash covers `content_md` alone,
  so what a pin guarantees is the content. A publisher that serves a pinned document
  with the item's present byline also conforms. Authorship that can be verified would
  be a signature inside the `author` object, which is the client's own business.
- **The canonical link** (rule 10) is for search indexers, so that they index the live
  page and not its frozen copies. Nothing in the protocol reads it. A publisher that
  serves one item at several live addresses names whichever it wants indexed.
- **How a page shows versions** is the client's choice within rules 7 and 8. What it
  has to work with is a set of separate frozen states of one item. A continuous edit
  history cannot be shown, since the versions between pins are not served to anyone.
- **Two further members** of a pinned changelog entry, `pinned_at` and `cid`, have a
  settled shape and are not yet rules. They are in Annex B.

## Elsewhere

- A fork's lineage may name only a pinned version. *Forks and lineage.*
- A reader may keep a withdrawn item's content only where it is pinned. *Retention.*
- A snapshot of a pinned version stays quotable after its item is withdrawn.
  *Resolution at publish.*
- A changelog note does not reproduce a version that is not pinned. *The item
  document.*
- A sender may tell the origins a version quoted that it has been pinned; a pinned
  document never verifies a mention. *Mentions.*
- The `pin` template. *Manifest and index.*
