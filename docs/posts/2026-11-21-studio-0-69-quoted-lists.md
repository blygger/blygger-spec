# Studio 0.69.0: a quote of list items keeps its bullets

Blygger Studio 0.69.0 is out. Among other things, a partial quote of list items now publishes as a list. Until now it published the quoted items as bare paragraphs, on every page that showed it, because a partial quote kept only the plain text of what it quoted. The list structure now comes from the quoted post, never from the markers the quoter types, so it cannot be invented; the text is unchanged, so the quote's check at publish is the same (decision #114).

Here are two of TN-8's rules for local patches, quoted as they stand, numbers included:

<!-- quote: 2d244a6ff5tz7mfe5gd4m41a4p -->
> 2. **One patch, one commit, on your own branch,** with a message that starts `local:` and says why in a line. Never leave a patch uncommitted or in a stash. A stash is how a patch gets lost.
> 3. **Add rather than edit where you can.** A new file never conflicts. Keep an edit to a shared file to as few lines as possible, with no reformatting around it.

The rest of the release (helpers and Catch up, the Agentic feed's foundations, spellcheck with a shared dictionary, the claims extension, full-text search) is in the [changelog](https://github.com/blygger/blygger-studio/blob/main/CHANGELOG.md).
