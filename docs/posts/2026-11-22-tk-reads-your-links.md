# [TK] now reads the links you give it

A [TK] scope used to write from what it was handed: your instruction, the items you named as sources with `![[id]]`, and the draft around it. A link was just text. If you wrote "summarize https://contraptions.venkateshrao.com/p/the-profligacy-principle", the model never saw the essay. Sometimes the result looked right anyway, because the model half-remembered the post from its training, or because the URL's slug told it enough to guess. That's worse than failing: you can't tell recall or a guess from reading, and when the essay is yours, the guess puts words in your mouth.

So generation now reads the links you placed before it writes. That covers links in the instruction and links anywhere in the draft, because a link you already put in the draft is part of what you're writing about. Web pages are fetched. An `[[id]]` link, or a URL that names a blyg item your node already holds, is read from your node's own copy, as a source always has been.

## What changes for you

- **What was read is listed.** The TK panel shows each page and item a generation drew on, and which other blygs will be told when you publish.
- **What couldn't be read is never guessed at.** Some pages won't come: a site that turns away servers (Substack does), a PDF, a page that only renders in a browser. If any link fails, generation stops and asks: *"2 of 5 links in the draft could not be read. Generate anyway?"* Details lists each link and why it failed. You decide whether to write without them.
- **There are limits.** Up to eight pages are read per generation, about 30,000 characters each, plus up to eight linked items. Links inside a comment to self are left alone.
- **Fetched text is treated as material, not instructions.** It reaches the model marked as someone else's writing from the web, with an instruction not to follow anything it says.

## Why it's disclosed this way

The protocol says nothing about how a studio gathers context. That's the studio's business, and reading a link the author placed adds no new intention. But the page's words are someone else's, and they were fed to a model and woven into your prose. Section 5.7 already discloses what a generator drew on. So a page that was read now goes into the item's `generated[].sources` list in the plain-web citation shape the spec already uses for stubs of web pages:

```json
{ "url": "https://contraptions.venkateshrao.com/p/the-profligacy-principle",
  "cited": { "source": "Contraptions", "excerpt": "The Profligacy Principle",
             "url": "https://contraptions.venkateshrao.com/p/the-profligacy-principle",
             "retrieved": "2026-11-22T18:00:00Z" } }
```

A web page has no endpoint, so this entry notifies nobody. A linked blyg item is different: it's disclosed as an ordinary source reference, and if it's on another blyg, publishing sends that blyg a `source` mention, as it does for an item named with `![[id]]`. That's also the one change you'll notice if you link to other blygs: a link the model drew on is no longer a quiet one.

The rule underneath is short: **whatever was fed is disclosed, and only what was fed.** The list is built from what was actually read, never inferred from the output, and a link that couldn't be read isn't listed. The ruling is [decision #117](https://github.com/blygger/blygger-spec/blob/main/CLAUDE.md), and the shape sits in the living spec as [§16.16](https://blygger.org/spec/0.4/#1616-a-web-page-as-a-generation-source-ruled-2026-11-22-awaiting-a-gate-run). It moves into §5.7 once a second node has imported an item carrying such an entry.

## A recommendation for other clients

If your client generates text, consider the same model:

1. **Hydrate from what the author placed.** Read the links in the instruction and the draft before generating. Don't let a model answer from a URL it hasn't read.
2. **Disclose what was fed.** Blyg items go in as references; web pages as `{url, cited}` with a `retrieved` time.
3. **Fail loudly.** When a link can't be read, tell the author and let them choose. Never let the model fill the gap.
4. **Frame fetched text as untrusted.** It's material to draw on, never instructions to follow.

None of this needs a new protocol version. Readers already ignore `sources` entries they don't understand, and the shape is one the spec already defines for web citations.

### How the Studio does it

Before the model call, one pass collects every `[[id]]` link and every `http(s)` URL in the scope's instruction and in the rest of the draft, leaving out comments to self. Each `[[id]]` resolves to the node's local copy, as a `![[id]]` source does. Each URL is first checked against items the node already holds: a URL whose path names an item imported from that host, or one of the node's own, is read from that copy instead of fetched. Everything else is fetched with the importer's outbound rules: private addresses refused, at most three redirects, a ten-second timeout and a size cap. The page's readable text is taken from its `<article>` or `<main>` (scripts, navigation, headers and footers dropped), titled from `og:title` and `og:site_name`, and cut to 30,000 characters. A page with almost no text is counted as a failure, not as an empty source. If anything failed and the author hasn't said to proceed, the call returns the list of failures and nothing is generated or saved. Otherwise each item and page joins the model's input, pages inside a block marked as untrusted fetched text, and the same list becomes the span's `sources`.

In [blygger-studio](https://github.com/blygger/blygger-studio):

- [`src/tk-hydrate.ts`](https://github.com/blygger/blygger-studio/blob/main/src/tk-hydrate.ts) does the reading: `extractUrls`/`extractLinkIds` find the links, `heldItem` recognizes held items, `fetchPage`/`pageText` fetch and extract, `hydrate` puts it together and `pageSource` gives the disclosure entry.
- [`src/tk-generate.ts`](https://github.com/blygger/blygger-studio/blob/main/src/tk-generate.ts) (`runGenerateScope`) runs hydration, returns the checkpoint when links fail, and records what was read as the span's provenance.
- [`src/ai/provider.ts`](https://github.com/blygger/blygger-studio/blob/main/src/ai/provider.ts) frames fetched pages for the model (`buildUserContent` and the system prompt).
- [`test/tk-hydrate.test.ts`](https://github.com/blygger/blygger-studio/blob/main/test/tk-hydrate.test.ts) shows the behaviour case by case: a page fed and disclosed, a draft link read, the checkpoint, proceeding without a failed link, the caps, a held item read locally, and the published `{url, cited}` entry sending no mention.

## What comes next

A server can't read everything an author can: paywalled posts you subscribe to, pages that need a browser, files on your own machine. The next step is a hydration helper that runs on your own device, or somewhere else you choose, and reads what the server couldn't, so the checkpoint turns into "ask my helper" instead of "write without it". The plan is in [docs/hydration-helper-plan.md](https://github.com/blygger/blygger-spec/blob/main/docs/hydration-helper-plan.md), and comments on it are welcome there or as a response to this item from your own blyg.
