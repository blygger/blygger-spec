# Hydration helper: reading links from where the author can read them

**Status:** a plan for Venkat's review (session 79, 2026-11-22, Opus 5.5). Follows the first version
of link hydration (decision #117, built session 79, unreleased). A client contract (decision #31),
not protocol: nothing here touches the wire beyond what #117 already ruled.

## 1. The problem

Since #117, TK generation reads every link its author placed before it writes: web pages are
fetched by the Worker, `[[id]]` links come from local snapshots. A Worker reads from a datacenter
with an honest client user agent, so a lot of the web turns it away. Measured in session 79:
every Substack post answered 429 to the Worker and 200 to the same request from Venkat's Mac.
PDFs, pages that only render in a browser, and anything behind a login the author holds are
out of reach too. Today those links stop at the checkpoint, and the author can only generate
without them.

Venkat (session 79): "The correct solution is to delegate the hydration to a local agent running
on the device or other specified place." The Worker stays the default reader. A **hydration
helper** reads what it cannot, from somewhere that can.

## 2. Shape: the helper pulls, the studio never calls it

The studio page cannot reliably reach a process on the author's device: an https page calling
`localhost` meets mixed-content and private-network rules that differ by browser, an iPad runs no
daemon, and a VM has no address the studio knows. So the direction is reversed, the way every
other agent works with the studio (#39: polling, not webhooks):

1. Generation hydrates in the Worker as now. Links it could not read become a **hydration
   request** (item, scope, the URLs and why each failed), stored on the node.
2. A helper, wherever it runs, holds a token with a narrow new scope and polls
   `GET /api/hydration/requests?state=open`. Conditional reads (studio 0.65.0) keep an idle poll
   to one cheap 304.
3. It claims a request, reads each URL by its own means, and answers
   `PUT /api/hydration/requests/{id}` with, per URL, either `{ text, title, siteName, retrieved }`
   or `{ failed: reason }`.
4. The studio, waiting at the checkpoint, sees the answer and generates with the helper's pages
   fed and disclosed exactly as the Worker's are (`{url, cited}`, #117). Where a page was read is
   not part of the claim, as §5.7 rule 7 says of where generation ran.

The same operations are MCP tools automatically (#52), so a person's own Claude session can be
the helper without any new code.

## 3. Where a helper can run, and what each reads

| Helper | Reads | Cost to build | Notes |
|---|---|---|---|
| **`blyg-hydrate` CLI** (Node, in the studio repo's `tools/`, through the SDK) | Anything an ordinary residential fetch gets: Substack and most bot-filtered sites. PDFs through `pdftotext` when installed | small | Runs on a Mac or a VM under launchd/systemd. The reference helper |
| **The same CLI with a headless browser** (Playwright, optional) | Pages that only render with JavaScript | medium | Opt-in flag; heavy dependency kept out of the default install |
| **A Claude session over MCP** | Whatever its tools reach (web fetch, Chrome with the author's sign-ins) | none in the studio | Only while a session is running; good for trying the flow |
| **A browser extension** | Pages behind the author's logins, in a real tab | large, Chrome first | Later, if paywalled reading turns out to matter |

## 4. What the studio adds

- **`hydration_requests`** (migration): id, item, scope index, URLs with their Worker failure,
  state (`open`, `claimed`, `answered`, `expired`), claimed by (token name), timestamps. Expired
  after a short window (two minutes) so a dead helper cannot hold a generation.
- **A page cache** (`page_cache`: url, text, title, site name, retrieved, who read it), shared by
  the Worker's fetches and helper answers, kept a day. A regenerate, or the second call after
  the checkpoint, reads from it rather than fetching again (the first version fetches twice).
- **Operations:** list open requests, claim, answer (helper side); create and read a request
  (studio side, owner only). A new scope, **`owner:hydrate`**: it can read open requests and
  write answers, nothing else. It can't read drafts: a request carries URLs, not the draft.
- **Settings → AI:** the helpers the node has seen, with the time each last polled, so the
  checkpoint knows whether anyone is listening.
- **The checkpoint gains a third answer.** When a helper polled recently: *ask
  {helper name}* beside *generate anyway* and *cancel*. While it waits, the sheet shows each URL
  turning from waiting to read or failed, and generates when all are settled or the window
  ends.

## 5. Trust and limits

- A helper's text is **untrusted page text**, framed and capped as the Worker's is (§14). The
  helper is the author's delegate, but the page is still someone else's writing.
- The token can't publish, draft or read anything private. A leaked helper token lets someone
  feed text into the next generation the author starts; the author still reviews the output
  and the listed sources before publishing.
- Same caps as the Worker (8 pages, ~30k characters each). A helper that answers with more is
  cut, not refused.

## 6. Questions for Venkat

1. **Which helper first?** Recommended: the **CLI**. It covers the Substack case, runs on the Mac
   and on a VM, and is the reference for others. The MCP route comes free with the operations,
   so it can serve as the first test before the CLI exists.
2. **Ask first, or send automatically?** Recommended: when a helper is online, send failures to it
   **automatically** and show the checkpoint only for what the helper could not read either. The
   author's question is then only about real gaps.
3. **Paywalled text.** A helper with the author's subscription (a browser extension, a Claude
   session with Chrome) can read posts a public reader can't. The generated prose is the
   author's, and the source is disclosed by URL, but its words come from behind a paywall.
   Allow by default, leave it to the author, or keep helpers to public pages? (No
   protocol question: disclosure is the same either way.)
4. **Page cache lifetime:** a day, or only for one generation and its checkpoint?

## 7. Order of work

1. The page cache, plus the checkpoint reading from it (fixes the double fetch; useful on its own).
2. Requests, the scope, the operations and the oracle laws for claim and expiry.
3. The checkpoint's helper answer and the Settings list.
4. `blyg-hydrate` CLI, tried first against the Contraptions post that started this.
5. The cross-node gate run for §16.16: a `{url, cited}` source published on one node and
   retained by another's import.
