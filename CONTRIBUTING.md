# Contributing to the Blygger spec

This repository holds the protocol: what a blyg serves and what a reader may rely on. Before you open an issue, check that your idea belongs here. Answer these in order and stop at the first yes:

1. Would it change the bytes another blyg or reader receives (an item document, the feed, `blyg.json`, `content_html`), or would another client have to change to work with it? → **a spec question. It belongs here.**
2. Is it a bug in a client, or a feature of one? → that client's repository. For the reference client, [blygger-studio](https://github.com/blygger/blygger-studio/issues/new/choose).
3. Is it about how a page looks: a layout, a theme, a reading view, a count on your own page? → **not a spec question.** The project polices the wire, not the page. It belongs to a client, an extension or a mod.

The full ladder, with tool, extension, hook, mod, local patch and fork as the other rungs, is **[where does my change belong?](https://github.com/blygger/blygger-studio/blob/main/docs/where-does-it-go.md)** in the Studio repository.

## Proposals

Use the **Protocol proposal** template, and describe the problem before the solution. Two refusals stop most proposals: no metrics of any kind on the wire, and no identity in the protocol. [`protocol-v0.4.md` §16.8](docs/protocol-v0.4.md) lists what will never appear. A well-argued case against a locked decision is still welcome; several have won.

A proposal that is accepted gets a row in [`ROADMAP.md`](ROADMAP.md), published at [blygger.org/roadmap](https://blygger.org/roadmap/), and its issue stays open until the work ships. A spec bug, such as two sections that disagree or a rule that cannot be implemented as written, goes in the **Protocol defect or ambiguity** template.

## Merging

Venkat Rao merges by default. Kyle Mathews and Aneesh Sathe are also maintainers across the `blygger` repositories. They work through pull requests like everyone else, and push to `main` or merge only when Venkat is unavailable or hands a merge to them.
