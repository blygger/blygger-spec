# Editorial sheet

How the book is written. Every chapter obeys this page; where a chapter cannot, the
sheet is changed first and the change is applied everywhere. First cut, session 73
(2026-11-16), Fable 5.2. Task and acceptance: [`../spec-refactor-plan.md`](../spec-refactor-plan.md).

## 1. Voice

- **Present tense, third person, active.** "A publisher serves the pinned document."
  Not "will serve", not "is served by".
- **It states what is so.** The 0.4 text was written a revision at a time, each
  defending itself. The book does not argue with an absent objector. If a sentence
  begins "This is not…", "Deliberately…", "By design…" or "Note that…", the thought
  belongs in a note or in Part I, or nowhere.
- **Plain words.** A sentence a careful reader has to read twice is rewritten. No
  figure of speech where the literal statement exists. One analogy per chapter at
  most, and only in "What it is".
- **No history.** No dates, no version in which a thing arrived, no decision numbers,
  no "used to", no "new in". The history page and the decision list hold these.
- **No client.** The book names no software. Where 0.4 says what the reference client
  does, the sentence leaves for that client's studio style.
- **No hedged normativity.** A sentence is a definition, a rule or a note (section 3).
  There is no fourth kind that sounds like a rule and is not.

## 2. The parties

Rules name who acts. The book has six actors and uses no synonyms for them.

| Actor | Is | 0.4 also called it |
|---|---|---|
| **publisher** | the party that serves a blyg at an origin and answers for it | origin (when acting), studio, client, renderer |
| **reader** | software that fetches a blyg's documents on someone's behalf | importer, subscriber, consumer, client |
| **sender** | a publisher delivering a mention | — |
| **receiver** | a publisher accepting a mention | — |
| **author** | the person or agent whose words an item carries; never a party to a rule | — |
| **client** | any software, when a rule binds publisher and reader software alike | — |

"Origin" is a place, not an actor: an origin does not do things, its publisher does.
"Studio" appears only in Part I, as the name for everything the protocol does not see.

## 3. Three kinds of sentence

1. **A definition** says what a thing is. Declarative, no requirement keyword. "A pin
   is a publisher's promise to serve one version for good." Definitions live in *What
   it is* and *The shape*.
2. **A rule** says what a party does. One actor, one keyword, one requirement, one
   sentence where it can be. Rules live only in *The rules*.
3. **A note** gives a one-off reason, an edge case, or what a rule leaves open. Notes
   live only in *Notes* and never contain a requirement.

**0.4 states some requirements without a keyword** ("Withdrawal is reversible"). The
book does not promote them: a keyword-less statement in 0.4 is carried as a
definition, with the same force it had, and is listed in
[`findings.md`](findings.md) for a ruling on whether it should be a rule. That keeps
the clause map exact.

## 4. How a rule is written

> **3.** A publisher MUST serve a pinned document with status 200 for as long as the
> origin exists. *Withheld unless pinned.* `R-0003`

- **The number** is the rule's place in its chapter and may change.
- **The sentence** starts with its actor. The keyword is MUST, MUST NOT, SHOULD,
  SHOULD NOT or MAY, in capitals, once. "REQUIRED", "RECOMMENDED" and "OPTIONAL"
  are used only in member tables.
- **The italic phrase** names the principle the rule follows from, when it follows
  from one. A rule with none stands on its note.
- **The id** is permanent and opaque: `R-` and four digits, assigned in the order
  rules are first written, never reused, never renumbered, carrying no meaning. Code,
  decisions and issues cite the id. A rule that is split keeps its id on the part that
  keeps its subject, and the other part takes a new one; a rule that is withdrawn
  retires its id.
- **Conditions come first**, in the same sentence: "For a version that is not pinned,
  a publisher MUST answer 404."
- **A rule states a property of a value** in preference to an algorithm that produces
  it, and keeps correctness (MUST) apart from quality (SHOULD).

## 5. The chapter

Every chapter in Parts II to VIII:

```
# Chapter title
*Reads after: … · Leans on: principle, principle*

## What it is        prose; the cast; a reader who stops here knows what it is for
## The shape         the document or member: a table, one example from the cast
## The rules         numbered, as in section 4
## Notes             short; reasons used once, edges, what is left open
## Elsewhere         rules about this construct that live in other chapters, by id
```

- **A rule lives in one chapter**: the one for the document or the act it constrains.
  A chapter on a construct points to rules about it that live elsewhere and does not
  restate them.
- **Target length:** 600 to 1,500 words. A chapter over 2,000 is two chapters.
- Part I has no rules and no requirement keywords. Parts II to VIII have no
  philosophy beyond the italic citation.

## 6. Vocabulary

One term per thing. The glossary at the back of the book is the authority and is
reconciled with blygger.org's. Terms the first sitting fixed:

| Use | Not | Because |
|---|---|---|
| **item document** | canonical item file, item JSON, live document | one name for `items/{id}.json` |
| **pinned document** | per-version file, pinned file, pinned version file, pin file | one name for `items/{id}/v{n}.json` |
| **endcap** | withdrawal version, tombstone | 0.4's own term, used alone |
| **quote** (noun), **quote** (verb) | transclusion, transclude, bake (as a noun) | "transclusion" stays only as the name of the wire tokens `transclusions` and `blyg-transclusion` |
| **bake** (verb) | resolve-and-render, snapshot (verb) | what a publisher does to a quote at publish |
| **snapshot** | local copy, held copy | what a party holds of another origin's item |
| **reference** | citation shape, pointer | the `{origin, id, version}` triple, and only that |
| **withheld** | private, hidden, unpublished | of versions that are not served |
| **the wire** | the surface (as a synonym), protocol surface | everything a publisher serves that the protocol defines |
| **claim** | assertion, self-assertion, self-description | what an origin says that nothing checks |
| **response**, **notice** | reply (never) | the two classes of verified mention |

Open with Venkat: **"quote" for "transclusion".** It reads far better and is what the
thing is, but "transclusion" is the project's own word and in the wire tokens. The
sample chapters use "quote". Reversible in one pass.

## 7. Examples

- **Every example comes from the cast** ([`cast.md`](cast.md)): the same origins,
  items and ids throughout.
- **Every example document is a file** under `conformance/` that the suite validates.
  The book includes it; it is not retyped.
- An example shows one thing. Members irrelevant to the point are elided with `…`
  only in a fragment of a document, never in a whole one.
- No example depends on a hyperlink for its meaning (the book may be printed).

## 8. Cross-reference

- To a rule: by id, with the chapter named on first use in a chapter ("`R-0003`,
  Pins").
- To a principle: by its name in italics.
- To a chapter: by its title. Section numbers are never cited, in the book or outside
  it.
- Outward links (RFCs, W3C, CommonMark) go in a references list at the back, cited by
  short name.
