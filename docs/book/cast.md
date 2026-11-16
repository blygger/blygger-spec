# The cast

The book's one running example. Every chapter draws its examples from these origins
and items and from nowhere else, so that a reader meets each construct acting on
things already known. First cut, session 73 (2026-11-16), Fable 5.2. Names, ids and
dates are fixed once Venkat has read the sample chapters; until then they may change.

## The origins

| Origin | Who | Why it is in the cast |
|---|---|---|
| `https://ada.example/blyg/` | **Ada Okafor**, one writer | The ordinary case: a path mount, one byline, default paths |
| `https://ledger.example/` | **The Ledger**, a small press | A root mount and a masthead: several bylines under one origin, one of them an agent, **Margin**, that drafts under its own name |
| `https://quay.example/wp-json/blyg/v1/` | **Quay**, a shop's journal on a managed host | A relocated surface: nothing at the default paths, everything named by the manifest |
| `https://almanac.example/feed` | **The Almanac**, an old weblog | A plain RSS feed with no blyg: the legacy case |

And one reader with no blyg of their own: **Cy**, who follows Ada and, in Part VIII,
holds a grant to something she sealed.

## The items

| Short name | Id | What |
|---|---|---|
| **the promise** | `h7ybxk4zscw71gt1tpvzvb3gc5` | Ada's fragment. "A protocol is a promise about files." Revised twice, pinned at version 2, withdrawn at 4, returned at 5 |
| **the second thought** | `xpj8e1dhh3fav555c89wxzfpkc` | Ada's fragment, linked to and never quoted |
| **Ada's essay** | `3t6vs35qtanz58f7krtgt5z266` | Ada's thread, which quotes the promise whole |
| **the Ledger's review** | `gx5dm2e73jc8t1s91d8fr8r47t` | The Ledger's thread, which quotes part of the promise |
| **the reply** | `grhckyp8wtyrazkq4hq45zq5mr` | The Ledger's stub, a response to Ada's essay |
| **the fork** | `xxt02c73qdhym60wqyq00q7cws` | The Ledger's fragment, begun as a copy of the promise at its pinned version 2 |
| **the digest** | `a910q7te6z5zqzd8ndgddh2ses` | The Ledger's thread, drafted by Margin, which drew on the promise as a source |
| **the sealed note** | `d9zvhc17fbd3mfb4jvadn6v9sm` | Ada's thread with one sealed passage (Part VIII) |

## The story, in the order the book tells it

Each line is one construct and names the chapter that uses it.

1. Ada publishes the promise. *The item document; The surface; The feed.*
2. She revises it twice. Version 3 is what her origin serves; 1 and 2 are withheld.
   *Items, versions and kinds.*
3. She pins version 2. *Pins.*
4. She writes her essay, which quotes the promise and links to the second thought.
   *The grammar; Resolution at publish; Quotes and links.*
5. The Ledger is handed Ada's address, resolves it and subscribes. So does Cy.
   *From a URL to a subscription; Reconciliation.*
6. The Ledger's review quotes one sentence of the promise. *Quotes and links.* Ada's
   origin is told. *Mentions.*
7. The Ledger answers Ada's essay with the reply. *Stubs; Mentions.* Ada chooses to
   show it under her essay. *The duties of display.*
8. The Ledger forks the promise from its pinned version. *Forks and lineage.*
9. Margin drafts the digest, drawing on the promise. *Generation provenance.*
10. Ada lists the Ledger in her blogroll. *The blogroll.* The Ledger keeps a public
    hopper of pieces on protocols, with a feed. *Hopper feeds.*
11. The Ledger follows the Almanac. *Legacy feeds.* It answers one Almanac post.
    *Stubs.*
12. Quay publishes from a host that cannot serve `.json` paths. *Manifest and index.*
13. **Ada withdraws the promise.** Her pin still answers; the Ledger's review keeps its
    quote; the reply and the fork stand; Cy's reader drops the text and keeps the pin.
    *Withdrawal; Retention.*
14. She brings it back at version 5. *Withdrawal; Reconciliation.*
15. Ada moves her blyg to a new address. *Annex B, origin succession.*
16. Ada seals a passage of a new thread for her patrons; Cy holds a grant.
    *Part VIII.*

## The promise, version by version

The one item the book follows furthest. Hashes are real.

| Version | At | Note | `content_md` | State |
|---|---|---|---|---|
| 1 | 2026-03-01T10:00:00Z | — | A protocol is a promise about files. | withheld |
| 2 | 2026-03-02T09:15:00Z | said who keeps it | A protocol is a promise about files, kept by whoever serves them. | **pinned** |
| 3 | 2026-03-05T16:40:00Z | and who checks it | A protocol is a promise about files, kept by whoever serves them and checked by whoever reads them. | served until 4 |
| 4 | 2026-06-20T08:00:00Z | withdrawn while I rethink this | *(empty)* | the endcap |
| 5 | 2026-07-02T11:30:00Z | back, as it was | as version 3 | served |

- v1 `sha256:1f796a1f68f9c670b7784f2a37bac9c1f3a2cf33d49b10dfdda49ae4f71f2f8e`
- v2 `sha256:16b74b16084518d57960282eed845151d116698752075819c5b9753edbc1b974`
- v3, v5 `sha256:55a9c490f7f072633310cce3d5c488867fbaed59aaa9a1e3c02bcf7ec2340224`
- v4 `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

Version 5 has the same hash as version 3, which the Reconciliation chapter can use: a
return with no new words.
