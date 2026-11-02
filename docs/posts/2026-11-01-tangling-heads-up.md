# Heads-up: tangling is coming to Blygger Studio, and readers should fold bursts

*A note for anyone building a Blygger client. This is not an RFC: nothing on the wire
changes, and every protocol rule it leans on is already in the 0.4 text. It says what
Blygger Studio is about to do, so other clients can get ready for the traffic it makes.*

## What is coming

Top-down authoring, the way Roam and Obsidian writers work. Write an essay, mark the
passages that stand on their own, and publish once:

```
Here is the opening, which stays in the essay.

![[+ Stigmergy is the mechanism by which a protocol becomes invisible
to the people inside it.]]

And here is what follows from that.
```

At publish, each marked passage becomes **its own fragment**, with its own id, page and
feed entry. The essay becomes **a thread that quotes them**, and its source is rewritten to
ordinary directives:

```
![[<new id> | Stigmergy is the mechanism by which…]]
```

The idea is old. It is Knuth's *tangle* from literate programming, applied to a blyg. The
fragment is the medium's unit, but essayists find the parts by writing the whole. Tangling
lets the commonplace book fall out of the essay instead of being a second discipline.

The `![[+ …]]` marker is Blygger Studio's own authoring syntax. It is rewritten before
publish and **never reaches the wire** (decision #70). On the wire a tangled thread is
fragments plus a thread, the same as if you had written each fragment by hand and quoted
them.

## The cost, and why it lands on readers

One act now publishes many items. Every one is a real publication, so every one gets a feed
event: §7 has no quiet publish, because an event the feed leaves out is content hidden from
subscribers. A ten-passage essay is eleven entries in a feed window that holds fifty.

Mentions can flood the same way. A thread of bare quotes sends a notice to every source it
quotes, and fragments full of `[[id]]` links send one per link.

The protocol's answer, ruled across decisions #77, #78, #80 and #83, is the same each time:
**nothing on the wire marks an item as minor, so readers work it out from what is already
there, and queue it low instead of hiding it.** No author can write to a signal that is
never declared.

## What Blygger Studio will do

**As a publisher:**
- Publish the fragments first and **the thread last**, so the thread is the newest entry
  (§7).
- Show the count before anything is published ("this will publish 3 fragments and this
  thread"). API and MCP callers have to confirm it too.
- Cap one publish at 10 passages.

**As a reader**, a new **Background** lens collects what is worth having but not worth
interrupting you for:

- **Bursts:** fragments that arrived with a thread quoting them. The thread stays in your
  main feed with a "+3 fragments" control (§13.7).
- **Wordless items:** a stub or thread that is only quotes, with no words of its own. This
  is the same test §15.4 applies to mentions.
- **Maintenance:** a republish with the same `content_hash`, or an edit too small to matter
  (§13.2). The threshold is the reader's own and is never published.
- **Withdrawn items**, as today.

Nothing is dropped. Every item is still imported (§13.1); Background is a place, not a
filter. Link mentions and reposts become **notices**, held apart from responses (§15.5).

## What other clients can do

- **If you publish several items in one act**, publish one event per item and the thread
  last. Don't invent a "quiet" or "minor" flag. The spec refuses those on purpose.
- **If your client has its own authoring syntax**, rewrite it before publish. `content_md`
  is what readers get.
- **If you read blygs**, fold bursts under their thread, and queue maintenance versions and
  wordless items low. Everything you need is already in the item documents: `created`,
  `updated`, `transclusions[]`, `content_hash`, `content_md`.
- **If you receive mentions**, classify reposts and links as notices, not responses.

Two sentences in the spec are being tightened as part of this. §13.7 says a burst folds
under "a thread created with them", but `created` is when a draft was started, so a thread
drafted on Monday and tangled on Friday would not match. It should say *published* with
them. And §13.2 will say that the wordless test may be used in reading, not only for
mentions.

## Where to read more

The full plan, including the edge cases (crash recovery, spans inside code, what happens on
republish) and the order of the build, is
[`docs/tangling-plan.md`](https://github.com/blygger/blygger-spec/blob/main/docs/tangling-plan.md)
in blygger-spec. Discussion is on
[blygger-studio#20](https://github.com/blygger/blygger-studio/issues/20).

Inline placeholders, where `[[+ text]]` mid-sentence would create a fragment to fill in later
and link it, are reserved for a later build.
