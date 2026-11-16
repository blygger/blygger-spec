# Withdrawal

*Reads after: The item document; Pins · Leans on: Honest promises; Each origin answers for itself; Withheld unless pinned*

## What it is

A published item cannot be deleted. It can be withdrawn.

To withdraw an item, its publisher publishes one more version of it, an **endcap**,
which has no content. The item's address goes on answering. What it answers with is
an empty document that says something was here and its author took it back.

That is different from an address that stops answering, and the difference is the
reason withdrawal exists. A missing document could be an outage, a mistyped id, or
something that was never there. A reader cannot tell which, and so cannot know
whether to keep what it holds. An endcap is a statement, and a reader can act on it.

Ada withdraws the promise at version 4. Cy's reader, which follows her, stops showing
the text it held. Three things do not change. Version 2, which Ada pinned, is still
served. The Ledger's review, which quoted the promise, keeps its quote. The Ledger's
fork of it stays published, because the fork is the Ledger's.

Withdrawal can be undone. Twelve days later Ada publishes version 5, a fragment again
with its text restored, under the same id. Readers that had dropped the item take it
up again as they would any new version.

Withdrawal asks; it does not erase. The origin stops serving the content and readers
that follow the protocol let it go. Copies held by anyone else are beyond its reach,
and the protocol does not say otherwise.

An item that was never published is a different matter. A draft can simply be
discarded, since nothing about it was ever public.

## The shape

An endcap is an item document like any other, one version higher than the last. This
is the promise, withdrawn:

```json
{
  "blyg": "0.4",
  "id": "h7ybxk4zscw71gt1tpvzvb3gc5",
  "kind": "withdrawn",
  "origin": "https://ada.example/blyg/",
  "page": "f/h7ybxk4zscw71gt1tpvzvb3gc5/",
  "created": "2026-03-01T10:00:00Z",
  "updated": "2026-06-20T08:00:00Z",
  "version": 4,
  "content_md": "",
  "content_html": "",
  "content_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "media": [],
  "changelog": [
    { "version": 1, "at": "2026-03-01T10:00:00Z", "note": null },
    { "version": 2, "at": "2026-03-02T09:15:00Z", "note": "said who keeps it", "pinned": true },
    { "version": 3, "at": "2026-03-05T16:40:00Z", "note": "and who checks it" },
    { "version": 4, "at": "2026-06-20T08:00:00Z", "note": "withdrawn while I rethink this" }
  ]
}
```

| In an endcap | |
|---|---|
| `kind` | `"withdrawn"` |
| `content_md`, `content_html` | empty strings |
| `media` | an empty array |
| `transclusions` | an empty array, when the item was a thread |
| `changelog` | everything it held, and one more entry for the endcap, whose note is optional |
| `page`, `forked_from` | kept |
| `stub_of`, `generated`, `links` | absent |

The endcap empties what the item said. Where the item lives and where it came from
are not things it said, so `page` and `forked_from` stay.

**Returning.** A later version whose `kind` is the kind the item had before is the
item coming back. It has the same id and the next version number.

**No cascade.** Withdrawing an item changes that item's document and nothing else.
A thread that quoted it keeps the quote it baked. A stub that answered it stays
published and stays a stub. And the withdrawn item can still be answered: its
document keeps its address, and its origin keeps accepting mentions of it.

## The rules

1. A publisher MUST keep in an endcap every member an item document requires, with
   empty content. `R-0013`
2. A publisher MUST NOT put `stub_of` or `generated` in an endcap. `R-0014`

## Notes

- **Why an endcap drops `stub_of`** (rule 2). A receiver decides whether a document is
  a response by finding `stub_of` in it. A withdrawn response therefore stops
  counting as one the moment its endcap is published, with nothing further to check.
  A pinned version of that stub still carries the `stub_of` it was published with,
  and does not count either: a pinned document never verifies a mention.
- **Why `generated` goes too.** It describes how words were produced, and an endcap
  has none.
- **The version number survives.** An endcap is the item's highest version. A reader
  that has discarded the content still knows the number, so an older document that
  turns up later is recognised as old and not mistaken for the item's return.
- **A long work that quotes a withdrawn item** keeps its quote for as long as it is
  not republished. Republishing bakes every quote afresh, and a withdrawn item with
  no pin has nothing left to bake. An author who wants a quote to outlast its source
  quotes a pinned version.

## Elsewhere

- An item document answers 200 permanently once the item has been published,
  withdrawn or not. *The surface.*
- A withdrawn item has one entry in the feed, for its withdrawal. *The feed.*
- What a reader does on meeting an endcap, and what it may keep. *Retention.*
- An endcap is never pinned: `R-0002`, Pins.
- A withdrawn stub tells its target once more, so that the target learns of it.
  *Mentions.*
- A change of kind to or from `withdrawn` is the one change of kind there is. *Items,
  versions and kinds.*
- Removal or retention that a court compels is outside the protocol. *Security and
  privacy.*
