# Changelog Rollup and Background Routing in Studio

A blyg is a set of living documents, not a stream of posts. Items get revised, quotes get refreshed, threads get tightened over months. That is the point of the medium, and it creates a problem every reader of a busy blyg runs into sooner or later: most of the traffic a living document generates is necessary and trivial. A typo fixed. A quoted passage brought up to date with its source. A fragment published as part of a thread, a minute before the thread itself. Each of these is a new version, and each one shows up in a feed.

Two things have to be true at once. You should be able to keep up easily with the changes that matter in documents that keep changing. And the trivial traffic, which is most of it, should get out of your way, either handled automatically or routed by rules you set yourself. Blygger Studio's next two features are built around that pair: **changelog rollup**, which makes the history of a document readable at a glance, and **background routing**, which keeps the trivial versions out of your main reading view.

## Changelog rollup

Every blyg item already carries its full changelog on the wire: each version's note, its time, and whether the author pinned it. Until now, Studio showed you only the latest note. That was the right default for a stream, and the wrong one for a document you return to after a month, when the question you have is not "what changed last" but "how did this get to where it is now".

Studio 0.58.0 adds three ways to show a changelog, chosen separately for your own public item pages and for blyg items in your reader:

- **The latest note**, as before.
- **The full history**: every version's note, newest first, with pinned versions linked to their frozen pages.
- **An AI summary**: a few sentences on how the piece has developed, written from the notes.

A summary is written from the changelog's notes only, never from the text of earlier versions. That is a deliberate limit. The protocol never makes an unpinned earlier version reachable, and a summary written from those texts would be a back door to exactly what the author chose not to keep public. Notes are public by construction and already follow that rule, so a summary of them cannot leak anything. Summaries are labelled as machine-written, with the model named, and they stay in your studio: they never enter the item's document or your feed. Each one is written once per version and kept, so a page viewed a thousand times costs one model call, and your reader writes a summary only when you open an item.

There is a writing-side half too. When you draft a change note, you can now ask for one that **summarizes the full history to date**, ending with this version's change. For a document with a long life, that note becomes the running account readers see first. Settings has a place for your own instructions on how roll-ups should read.

## Background routing

Rollup makes important changes legible. Routing makes unimportant ones quiet. Studio's reader already has a Background view, but today it holds only withdrawn items. An [earlier heads-up](https://blyg.blygger.org/t/2c494ntcyfgt5f2agqmb7vmsye/) said it would grow; the plan now widens it to everything a reader can reasonably treat as maintenance, and gives you the controls.

The automatic rules all work from what the reader can see for itself:

- **Same text.** The item was republished without a word changed.
- **Quotes refreshed.** A thread brought its quoted passages up to date with their sources and changed nothing of its own. This one is common in a medium built on quotation, and easy to detect: the item's content fingerprint covers the author's text and the quote markers, not the quoted versions, so it stays the same while the quotes move.
- **A small edit.** The text changed by a few characters.
- **No words of its own.** A post that is nothing but quotes.
- **Superseded.** The same blyg published a newer item within a few minutes, so the earlier one is bumped sideways rather than left at the top.
- **Part of a burst.** Fragments published together with the thread that names them fold into that thread, which shows "+N fragments".

On top of the rules, you can move any item, or a whole blyg, to the Background yourself, and move it back from there. Your choice on an item beats your choice on a blyg, and both beat the rules. Background never marks anything read and never changes what you publish; it is a view, not a verdict. Every item in it says why it is there.

## Delegated authority

The interesting question was what to do with the author's own words about a change. A note that says "minor typo fix" is useful information. It is also an easy way to bury a rewrite, and the protocol has long said that no word in a note carries meaning on the wire, so that nobody can write to a convention that clients honour.

The answer the project settled on draws a line between a client deciding something on everyone's behalf and you deciding something for yourself. **Studio will not route on a note of its own accord, in either direction.** But you may tell it to. A standing instruction like "if a changelog says minor, believe it; if there are signs of spam, flag it" is your own reading, delegated to an agent, the way a mail filter acts on your rules. Nothing about it reaches the wire, and the author cannot know whether any reader honours the word, so no convention forms. The instruction starts empty, any item it routes says so, and you can change it at any time. When a note's claim and the measured change disagree, say the note says "minor" and half the text changed, the item stays in front of you with a flag saying why.

The same holds on the publishing side. What a note says is the author's own, including words a client writes on the author's instruction. Studio does not police it. If a feed misrepresents its changes, that is for its readers to answer by how they read it. The one thing that stays enforced is the rule that keeps unpinned history unreachable.

An opt-in setting will let a small decision model judge other blygs' changes from the two texts, for readers who want more than measurement. It costs one call per new version of anything you read, and Settings says so.

## Where this stands

Changelog rollup ships in Studio 0.58.0. Background routing is planned in four parts. The first part comes next and brings the controls, plus the change classifier's verdicts on your own items, so your own small fixes leave your reading view without any new model calls. The measured rules come second. The model, your routing instructions over notes, and the disagreement flag come third, once there is a measured change to check notes against. The burst folding that the planned inline-fragment authoring will need comes fourth.

The pace-layered home page order follows the same thinking and is now [an RFC open for comment](https://blyg.blygger.org/t/28cm3qgpz1fa146yjvac97ba7c/) until 10 December: a version that changed nothing worth resurfacing no longer climbs, and a burst counts as one publication. Both rules exist for the same reason: a document that keeps getting better should not have to be noisy about it.
