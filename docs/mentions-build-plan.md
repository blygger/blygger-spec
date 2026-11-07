# Mentions build plan — tn-6 in the reference client

**Session 60, 2026-11-05, Opus 5.5, at Venkat's word.** The studio half of
[`notes/tn-6-mentions-and-identifier-schemes.md`](notes/tn-6-mentions-and-identifier-schemes.md)
(#67, #91). Nothing here touches the wire beyond what tn-6 already says: a markdown link in
`content_md`, an h-card in `content_html`, no new member, no relation, nothing sent.

## Order

1. **Sanitizer keeps `<data value>`.** Done, 0.54.1.
2. **Address book and publish-time resolver.** Done, 0.55.0: the
   `contacts` table, `/contacts` routes, `@handle` consumed at publish on every write path
   (#91 B2), unresolved handles returned to the caller, preview showing the same result.
3. **The editor.** Done, 0.55.0 and 0.55.1: `@` autocomplete over the book, the soft warning with "add contact",
   a book page in Settings.
4. **Identifier resolution.** First part done, 0.55.0: adding a contact fetches its URL and
   gathers `rel="me"` links in the three wire schemes as `self`, through the importer's guarded
   fetch; a `self` the page drops falls back to `entered`. Still to do: the page's h-card, then
   WebFinger, ATProto and `did:web` (tn-6 section 5.1), and URL-less contacts with them.
5. **The found-mentions list** (#91 B4). Done, 0.56.0, as the Mentions lens in Reading (tn-6
   section 8 keeps it off the responses tab). It matches `author_url` plus the blyg's address
   until step 6 gives the owner a record, and h-cards are recorded at import
   (`imported_mentions`), with a cron backfill, so it never scans stored HTML. Also 0.55.3:
   item pages as `h-entry` with a hidden `p-author h-card` (tn-6 section 5.4).
6. **Member roster and per-token bylines** (tn-6 sections 5.4–5.6). Separate; it changes
   what a token means, so it gets its own plan.

## Choices made in step 2

- **The working copy keeps `@handle`,** as it keeps TK scopes. Only the published version
  has the link. Publishing again re-resolves, so a corrected contact takes effect at the
  next version and never changes an old one.
- **A contact needs an `https` URL for now.** tn-6 allows a URL-less contact, whose mention
  is a name with no link; that is useless until step 4 can supply identifiers.
- **The API can only enter identifiers as `entered`** (tn-6 section 5.6 item 3), and only
  `self` and `bound` go on the wire, so nothing added by hand reaches a reader.
- **The fragment cap measures the author's words,** before handles expand into links, so
  mentioning someone cannot push a fragment over the limit.
- **Never rewritten:** code, `[[…]]` and `![[…]]` directives, existing markdown links,
  blockquote lines (an attached partial quote must stay a substring of its target, and a
  quoted `@` is someone else's speech), and any `@` that follows a word character or a URL
  character, or is followed by `@`, `.word` or `-word` (emails, fediverse handles, URLs).
- **An empty book returns no warnings,** so a node not using the feature hears nothing
  about the `@` signs in its prose.
- **A hand-typed link byte-identical to a mention's** also becomes an h-card. It names the
  same person at the same URL, so this is accepted rather than tracked.
