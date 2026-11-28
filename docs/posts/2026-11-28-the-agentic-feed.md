# The Agentic feed: an assistant that edits your reading

*The built-in digest shipped in Blygger Studio 0.74.0. Two more sections, mentions from blygs you don't follow and newly active blygs, are in review for the next release. This post explains the feature as it stands, and the fuller form it's planned to grow into.*

Blygger Studio's reader has two tabs that look alike and work in opposite ways.

**The Feed decides by structure only.** Its order (pace-layered by default, or chronological), and what it folds or moves to Background, come from facts on the wire and rules anyone can measure: the same text republished, a small edit, a refreshed quote, a burst of posts, a newer version superseding an older one. When the Feed uses AI at all, it judges the *size* of a change, never what the change says.

**The Agentic feed makes editorial judgments.** It decides what you should see today, in what order and grouping, and how much of each piece to show. The metaphor is an assistant who reads ahead and lays out your morning paper.

Keeping the two apart is the point of the design. The Feed stays predictable, because nothing in it depends on a model's opinion. All the judgment lives in a tab of its own, where it's labelled as judgment.

## One contract, any assistant

The Agentic feed tab draws an **edition**: a short document an assistant writes, made of sections that point at things in your reading. An edition can be laid out in full, with a lead story, sections and a column of briefs. Or it can be a list of scores, which the Studio lays out highest first. Either way, the assistant chooses and words. It never supplies anyone's content. Every entry is a reference to something you already hold, and a reference that stops resolving simply drops out.

Every word the assistant writes is shown as its own and marked as generated: headlines, summaries, section notes, the one-line reason an entry is there. The authors' text is never marked, because it isn't the assistant's.

Any program can write an edition through the Studio's API, with a token you grant it: `PUT /api/agentic/{feed}`, guarded by a revision number so a slow run can't overwrite a newer one. The Studio ships one assistant of its own, and it uses exactly the same contract. Power users are expected to write their own.

**Every edition is also a thread.** The Studio composes each edition into a private draft from ordinary blyg constructs: headings, quotes, links, and `impyrt` spans for the assistant's words. You can open it in the editor and publish it like any thread. Nothing new reaches the wire, and publishing is always your act, never the assistant's, because a published edition quotes other blygs and sends them mentions.

## The built-in digest (0.74.0)

Choose **Settings → AI → agentic feed → the built-in digest**, and the Studio writes the edition itself, on your clock: hourly, daily at 07:00, or weekly on Monday mornings. You can regenerate it at any time. The built-in digest uses no model at all. Its sections come from rules, which makes them predictable, cheap, and possible on any node.

- **Highlights:** new posts from blygs you follow, outside Background, that say at least 300 words *of their own*. Quotes and generated spans don't count toward the length. Stubs and forks don't qualify. Longest first, at most seven.
- **Happening conversations:** linked sets of posts, joined by stubs, quotes, links or verified mentions, your own posts included. A set counts when it has at least two authors and something new in the window. Most active first, at most five. A post in a conversation is never also a highlight.

An unchanged edition isn't written again, so a quiet node spends nothing.

## Next: looking past what you follow

Two sections in review take the digest outside your subscriptions.

- **Mentions from blygs you don't follow:** verified mentions of your posts that arrived in the edition's window from blygs you don't subscribe to. Newest first, at most five.
- **Newly active blygs:** blygs you've *met* but don't follow, which published something in the last 14 days. You meet a blyg when the [blygger.com directory](https://blygger.com/) lists it, or when your reading quotes, links, stubs or forks it, or when it mentions you. Most met first, at most five. Each card shows the blyg's newest post, which opens live without being stored, and a Subscribe button.

The second section is the digest's **discovery mechanism**. A blyg with a public feed is assumed to want to be found, listed or not, so the directory is one source among several, not a gate.

Discovery costs network, so it's bounded. It runs once a day (at 07:00 on your clock, or when you press Regenerate now) and spends at most 14 fetches: the directory first, then feeds in rank order, stopping once five blygs are found active. The directory's own record of each blyg's last post decides which listed feeds are worth a fetch. Hourly editions reuse the day's result. Your own blyg never appears as a new one.

These sections add two kinds of entry to the edition contract, available to any assistant: a **mention** names a verified receipt, and a **remote** entry names an item on a blyg you've met. Neither carries content. A mention is drawn from what your studio verified when it arrived, and a remote item is read from its own blyg when you open it.

## The fuller form

The plans for the rest are public: [the Agentic feed plan](https://github.com/blygger/blygger-spec/blob/main/docs/agentic-feed-plan.md) and [the digest plan](https://github.com/blygger/blygger-spec/blob/main/docs/agentic-digest-plan.md). In rough order:

**A digest/feed switch.** The same edition, read either as a digest (masthead, lead, sections, briefs) or as one list in edition order, each card tagged with the section it came from. It's presentation only, so every assistant's edition gets both.

**Editions over time.** The last fourteen editions kept, read-only, behind a date control in the masthead.

**An AI layer for the built-in digest.** With a model configured, it ranks within each section, writes headlines and one-line reasons, and opens with a lede. It can only choose and order among the entries the rules admitted, and its text is always marked as generated. If the model fails or misbehaves, the plain digest stands. The posture follows Florian Lohse's Daily in [Blyg for Obsidian](https://github.com/florianlohse/blyg-obsidian), which the design studied closely. The model sees numbered positions and short excerpts, never ids or whole bodies. Its answers are read strictly. Results are cached by content, and everything runs under a daily budget.

**Several feeds.** People may keep several assistants, or subscribe to several "newspapers", so each feed becomes its own tab beside the Feed, with its own name, brief and driver. The driver is one of: off, the built-in digest, or one named outside assistant. Only a feed's chosen driver may write it, so two assistants never fight over one edition. An outside assistant's grant covers only the feeds it was given.

**Narrow scopes.** Today an assistant that writes editions needs broad owner access. New scopes, `reading:read` and `reading:curate` scoped per feed, will let an assistant read your reading and write its edition without seeing your private notebook.

**A reference outside assistant.** A small program on your own machine, with no dependencies beyond the standard library. It signs in with OAuth (a loopback redirect, nothing stored but a refresh credential only you can read). It gets its intelligence from your own Claude plan through headless Claude Code, not from an API key. It reads your new entries, asks the local model which of your standing interests each one touches ("robotics and movies"), and writes a feed with one section per interest. The model runs with no tools at all, so a post that tries to give it instructions can at most be misfiled. It's meant as a worked example to copy: an agent in any language can follow the same path.

**Editions as private items.** Since private posts arrived in 0.72.0, an edition's thread can become a private item by default rather than a draft, with going public still a deliberate act.

Beyond these, the plan lists presentation choices that belong here and never in the Feed:

- digests of a long thread;
- what changed since you last read something;
- clustering by topic, and folding the same story across blygs;
- ranking by relation to your own writing;
- a reading-time budget ("twenty minutes today");
- translation;
- explaining a quote chain in context.

## What stays fixed

**The Feed stays structural.** No assistant can reorder it, or move anything to its Background. **Nothing here is protocol.** Editions are private to your studio, so no other client needs to know about them. If other clients ever want to read or write the same edition format, it goes through an RFC first. And **Blygger Studio stays boring**: it ships the contract, the rendering and a plain built-in assistant. The inventive assistants are for anyone to write.

If you write one, the contract is in the API reference under `/agentic`. Until the narrow scopes land, an assistant's token needs owner access (`owner:private`, plus `owner:manage` to write). The [roadmap](https://blygger.org/roadmap/) tracks the rest as row 168.
