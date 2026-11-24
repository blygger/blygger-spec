# Private posts and Notebook mode: the first step toward Level 3

*Ships in Blygger Studio 0.72.0. The release announcement lists everything else in it and how to upgrade.*

Until now, publishing in the studio meant one thing: the words went on your public pages and into your feed. A draft was the only thing that stayed yours, and a draft has no history. Every working version overwrote the last.

Studio 0.72.0 adds a second way to publish. An item can be **published privately**. It gets a real version, with a note and a place in the item's history, and it appears nowhere on the public surface. You can keep adding private versions for as long as you like. When you're ready, an ordinary publish takes the item public.

## Private versions are studio history

Private versions are numbered on their own counter: **p1, p2, p3**. The public counter doesn't move. So when a private item first goes public, its first public version is **v1**, as it would be for any new item. Readers see a post with a clean history. Your private versions and their notes stay in your studio, listed under the item's history, and never reach the changelog.

Going public is one-way. A public item can't be made private again, because readers may already have it, quoted it or pinned it. Withdrawal is still the only exit from public.

Private versions also behave carefully at the edges:

- **References are checked.** Publishing anything that names a private item, with `[[id]]` or `![[id]]`, is refused until that item is public. A public post can't link to a page that 404s, or quote words nobody else can read.
- **Media follows the version.** An image used only by private versions stays private. It becomes public when a public version shows it.
- **Your reader shows them.** Private items appear in your own reader, marked *private*, at their latest private version.

## Notebook mode

Some people want a blog. Some want a notebook that occasionally shares a page. Settings now offers both, as two modes:

- **Publish mode** (the default, and how the studio has always worked): a new item goes public when you publish it.
- **Notebook mode**: a new item stays private when you add a version, and goes public only when you choose *public*. The editor's button reads **add version**, with a private/public choice beside it, and it asks before anything goes public.

In Notebook mode a **private** tab sits above *compose*. It's your reader, showing only your private items. Each private item's editor links to its reader view, where a public item would link to its public page.

The mode is the default and nothing more. Either mode can publish either way, item by item, and switching modes changes nothing you've already written. Tools and agents follow the mode too. In Notebook mode, a tool takes an item public only by asking for it explicitly, so an agent working in your notebook can't publish by accident.

If you set up a new studio, the setup walk-through now asks which mode you want. If you upgrade, a one-time note lists what's new, and you can walk through just the new settings.

## Nothing private reaches the wire

Private items are not a protocol feature. A private version never leaves your studio, so no other client needs to know it exists, and no cryptography is involved. That is deliberate: it keeps private posts simple, and it lets the reference client do the plumbing that Level 3 needs before any of Level 3's wire format exists.

## How this unlocks Level 3

Level 3 is the protocol's next layer. Its first two drafts, [RFC-6 (sealed content and permissions)](https://blyg.blygger.org/t/194zwhh5036j2fxxk5b2hw3m81/) and [RFC-7 (payments)](https://blyg.blygger.org/t/2wcgk0vrwm3wknmdnxtrdh2ecd/), let an item carry encrypted words that only holders of a key can read, and let a reader earn a key, including by paying. Private posts are the owner-only end of the same spectrum, which runs from **private** (only you) through **group** (holders of a key) to **public** (everyone).

Building private first does four things that sealed content depends on.

**The public surface asks one question.** Every public route used to decide what to serve by asking whether an item was a draft. That question can't express "published, but not for everyone". Each route now asks a single allow-list question, *is this served publicly?*, and a test walks every public route to check that a private item is absent from all of them. When sealed items arrive, that test grows a second question: is any sealed plaintext on this surface?

**History separates from publication.** Private versions showed that an item can have a life before its first public version, numbered apart from what readers see. Sealed items need the same split between what the author keeps and what the wire carries.

**References respect audience.** The rule that a public item can't name a private one is the owner-only form of RFC-6's principle that *audience travels with the lock, not with the context*. Quoting must never widen who can read something.

**The writing habit comes first.** Notebook mode is the workflow sealed content serves: write privately, then share a page with the people it's for. Today that sharing is all or nothing. Under RFC-6, a *group* item is a sealed item under a lock whose holders are the group, so the same notebook can share a page with a working group, a board or paying readers, while older clients see only its cover.

## What comes next

RFC-6 and RFC-7 are open for comment until **28 November 2026**. After the close, the rulings are revised and the build begins with sealed spans and items, keys handed over by hand. That alone opens protocol version 0.5. Grant files, the request endpoint, and with it group visibility follow in that order, and RFC-7's payments ride on the request endpoint. Each step is usable without the next.

If you'd use a private notebook that sometimes shares with a group, the RFCs are where your use case shapes the design. Respond by stubbing either RFC from your own blyg, quote the passage you're answering, or comment on GitHub: [blygger-spec#34](https://github.com/blygger/blygger-spec/issues/34) for RFC-6, [blygger-spec#35](https://github.com/blygger/blygger-spec/issues/35) for RFC-7.
