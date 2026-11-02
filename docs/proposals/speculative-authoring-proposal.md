# Speculative authoring: placeholder links that resolve, kept in the background

**Status:** PROPOSED, pending Fable (`fable-round-queue.md` item 24). Nothing here is in
force. The proposed text is in `protocol-v0.4.md` **§16.14**, marked PROPOSED.
**Raised:** 2026-11-01, by Aneesh Sathe (written up by Opus 5.5).
**Reference build:** [blygger-studio#108](https://github.com/blygger/blygger-studio/pull/108) (draft) implements the shape below
behind the off-by-default setting `speculative_links`, so the ruling can be checked against running code. If
the ruling changes the shape, the build changes to match.
**Touches:** #70 (labels, and its advice against spelling tangling `[[text]]`), #77, #80
and #83 (no significance marker on the wire), #78 (multi-item publish, no quiet publish,
the §13.7 fold), #79 (`links[]`, the `link` relation), #12 (curation display), #43 (the
version boundary). Spec §7, §13.1, §13.2, §13.7.

---

## 1. What the author wants

Top-down composition. While writing, the author types `[[some idea]]` for a thought
they mean to flesh out later. This is Roam's and the wikis' "red link": a link to a page
that does not exist yet. The link should be real. Remote readers should be able to
follow it, so it has to resolve to an actual item rather than be scrubbed out at publish.

The cost is the feed. Each `[[…]]` mints an item, and a piece of writing with ten
speculative links is eleven feed events, ten of them nearly empty. Aneesh's own framing
was "feed flooding, which requires building ignoring filters on the reader side first".
That is where this proposal puts it.

## 2. The proposal: no wire construct

1. **Authoring is a studio act** (#70, #78). In the editor, `[[text]]` whose contents
   are not id-shaped (§5.1) mints an item at write time and is rewritten visibly to
   `[[id | text]]`, the label form #70 already defines. The wire only ever sees
   `[[id | label]]`. The rewrite is undoable, and it never fires inside code, inside TK
   scopes or output, or inside `![[…]]`.
2. **A placeholder is an ordinary fragment.** Its `content_md` is the label. It is
   published in the same act as the item that first links to it, following #78's
   multi-item publish: one feed event per item, placeholders first and the linking item
   last, with no quiet publish. It appears in `feed.xml` and the index like any item. The
   linking item names it in `links[]` (#79).
3. **The publisher MAY keep it off its own HTML listings.** A blyg's home page, archive
   and "latest" lists are presentation (#25, #69). The placeholder's page MAY render a
   "not yet written" treatment around its label. The item document and the feed entry are
   unchanged.
4. **Filling it is the next ordinary version.** It gets new words and a new
   `content_hash`, and arrives as an ordinary feed update.
5. **Readers keep it in the background, using only what they can derive.** This is the
   one addition to the spec text, at §13.7 (§16.14 here):
   - §13.7's fold of items published together is extended from items a thread names in
     `transclusions[]` to items any co-published item names in `links[]`. Such items MAY
     be folded under the item that names them and deferred to §13.2's low-priority
     queue.
   - A reader that deferred an item's first version this way MAY present the first later
     version with a different `content_hash` as a new arrival rather than an update. That
     is the reader's own memory of what it deferred, not a signal from the publisher.
   - Folding is display, never omission: readers MUST still import every item (§13.1).
6. **Mentions, forks, stubs and quotes need no special case.** A link to one's own
   placeholder is local. A remote item linking to a placeholder sends a `link` notice
   (#79, #80). A published placeholder can be forked, stubbed or quoted like any item.
   Withdrawing an abandoned placeholder is ordinary withdrawal (§9).

By #43 this is revision-grade. A reader that ignores the new sentence shows each
placeholder as its own arrival: noisier, never wrong. Nothing a reader, receiver or
importer must do changes.

## 3. Considered and not proposed

- **A wire marker** (`"placeholder": true`, a `status` or a `kind`). It would tell
  readers "do not surface this", which is the significance flag #77 refused in a
  changelog, #80 refused on reposts, and #83 refused "in any spelling". The pattern in
  all three rulings holds here too: the signal is derived, never declared. The marker
  would also let a publisher hide an item it did publish, which is the softening attack
  #83 names.
- **Leaving placeholders out of `feed.xml` and the index.** This is the quiet publish
  #78 refused ("the feed flood is real and is not hidden"). It would also break the
  index's role as the complete list (§6) that importers reconcile against.
- **Keeping placeholders as unpublished drafts** (#7), with the label published as plain
  text until the placeholder is filled. This needs no ruling, and the reference build
  keeps it as a fallback for a placeholder the author opts out of publishing. It loses
  what the author asked for, though: remote readers never see the speculative link.

## 4. #70's advice against `[[text]]`

#70 advised the studio not to spell tangling `[[text]]`, "because under this grammar a
forgotten id would silently mint a fragment whose content is the label". Speculative
authoring is that minting on purpose, so the advice needs an answer rather than an
exception. The answer is the studio's mitigations, and none of them is protocol:

- Mint only when the contents are not id-shaped, so a mistyped 26-character id is never
  silently minted.
- Rewrite at write time, visibly, so the author sees `[[id | text]]` in their own source.
- Make every mint undoable.
- Never fire inside code, inside TK, or inside `![[…]]`.

Fable may still prefer another spelling. Nothing on the wire depends on it.

## 5. Questions for the ruling

1. Is extending §13.7's fold to `links[]` the right home, or does the placeholder case
   want its own §13.x paragraph?
2. Is "fill as new" acceptable as a reader-local MAY, or does it pull toward the
   significance channel #83 closed? The argument that it doesn't: it keys on what the
   reader itself did (deferred v1), not on anything the author said.
3. Does #70's advice stand against this spelling given §4's mitigations, or should the
   studio spell it differently?
4. Gate, proposed: one node publishes an item with three placeholders. A second node's
   reading surface shows one arrival, with the placeholders deferred. Filling one shows
   it as new on the second node. Plain RSS readers see four ordinary entries, and nothing
   breaks.
