# Conformance and intent toolkit

Tools for checking whether the Blygger spec does what it is meant to do, and
whether implementations do what the spec says. Open `index.html` for the
dashboard.

A spec can fail in two different ways, and these tools look for both:

- **Implementations disagree with the text.** Conformance work (track 1.4,
  decision #48) catches this: MUST fails, SHOULD warns, MAY is shape-checked.
- **The text disagrees with its intent.** Every clause passes, and the property
  the clauses were written to secure still fails. Conformance checks can't
  catch this kind of failure. The intent ledger (`intents.json`) and the two
  behavioural models (`alloy/`, `model/`) are here for it.

| Directory | Tool | Checks against |
|---|---|---|
| `clauses/` | Clause register: every normative sentence in `docs/protocol-v0.3.md` with a stable ID, linked to decisions, sections and tests; graph + coverage views | the spec and `CLAUDE.md` decisions |
| `schemas/` | JSON Schemas for every wire document, rules relating fields to each other, and test cases for the `![[id]]`/`[[id]]` syntax | blygger-studio, Burrow (blygger-desktop) |
| `live/` | Read-only crawler of every known blyg; checks invariants that span origins (fork targets pinned, quotes are substrings of their source, Webmention reach) | the live network |
| `alloy/` | Alloy 6 model of the protocol's rules; the solver searches for counterexamples | the spec |
| `model/` | fast-check stateful property tests: a model written from the spec, and the real blygger-studio importer, driven by the same random action sequences | the spec, blygger-studio |
| `intents.json` | The intent ledger: what the protocol is *for*, in the author's words, linked to sections and decisions | — |

## Running

Each tool has its own README and one regenerate command, writing
`<tool>/out/summary.json` and `<tool>/out/report.html`. Then:

```sh
python3 conformance/build_dashboard.py   # joins all summaries to the intent ledger → index.html
```

Every check in a `summary.json` carries `spec_refs` (`§5.6`) and `decisions`
(`#49`). That is how the dashboard attaches evidence to intentions, and how
`clauses/` attaches tests to clauses. A new tool joins the dashboard by writing
the same file shape.

## Rules for this directory

- Nothing here is normative. A failing check is evidence for a Fable round, not
  a spec edit: findings that imply a change to `docs/protocol-*.md` are
  labelled **For Fable**.
- The crawler only reads (GET/HEAD) and never sends a Webmention.
- `intents.json` is meant to be corrected by Venkat. If an intention is
  misread, fix the quote or the gap, not the evidence.
