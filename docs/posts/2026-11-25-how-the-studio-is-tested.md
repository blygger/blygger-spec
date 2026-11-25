# How Blygger Studio is tested now, and why there is more test code than product code

*A plain-language tour of the studio's continuous integration after Kyle Mathews' rebuild of it, and of the oracle framework under it. Numbers are from the repositories as of 23–25 November 2026.*

Every change to Blygger Studio, the reference client most blygs run, goes through a gate called **Check** before it can merge or ship. Until 25 November 2026 Check took about an hour and a half. Since @kyle's rework of it (studio pull request #177, merged 25 November) it takes about **thirteen and a half minutes**, while running every test it ran before.

This post explains what Check does, why it is built the way it is, and why the studio now carries more code for checking the product than for the product itself. That last part can look like overkill. It isn't, and the reason has to do with who writes most of the code now.

## The numbers

Measured on 23 November (studio 0.72.0), counting lines of tracked code, blanks and comments included, generated files left out:

- **Product code:** about **53,300 lines**: the Worker that serves a blyg (24,400), the studio's interface (21,400), the bundled extensions (5,100), database migrations (2,200) and a small hand-written SDK.
- **Verification code:** about **70,600 lines**: unit tests, browser tests, the oracles described below, and the tools that run them.

That is **1.3 lines of checking for every line of product**. Across all four Blygger repositories, about 150,000 lines of code, verification is 56%. On top of the code sit about 77,000 lines of prose: the specification, plans, notes and this kind of explainer.

Today the studio has **84 oracle files**. One full Check run executes, among other things:

- 6,637 editor-formatting cases, twice each;
- about 2,000 tests of the Worker;
- 684 browser tests, on a desktop and a phone-sized screen;
- 48 security controls for sign-in and tokens;
- 2,424 deliberately planted bugs in the studio's own code paths, each of which the tests must catch.

## What Check looks like now

Think of the old Check as one very long queue. Everything ran in a few jobs, one after the other, and one formatting job alone took 86 minutes. A run measured at the start of Kyle's work took 101 minutes from push to verdict.

The new Check is a set of parallel lanes, 42 jobs in all, using at most 20 machines at once:

- **A planner goes first.** It lists every formatting test and splits them into 14 jobs of roughly equal measured length, so no lane finishes long after the others. Those jobs start setting up their machines while the planner is still counting, which saves a few minutes on its own.
- **The long suites are split into shards.** The Worker tests, the browser tests and the security controls each run as several pieces at once, with each piece given its own processor and its own scratch copy of the test data, so two shards can never trip over each other.
- **Machines are reused carefully.** A job that finishes early hands its machine to one that was waiting; jobs that need the same installed tools share them.
- **A final gate adds it all up.** Check passes only if every lane passed and the lanes together ran the whole plan, so a lane that silently skipped its share is a failure, not a pass.

Kyle tuned this over nearly twenty full trial runs, from 30 minutes down to 13, and the pull request records each one. A release can now reuse the green Check of the commit it tags instead of running everything again.

Faster CI matters for an ordinary reason: a person or an agent waiting an hour and a half for a verdict batches changes, loses track of them, or stops checking. At thirteen minutes, a fix gets proved and shipped the same afternoon. The 0.72.1 hotfix on 25 November went from diagnosis to running on three nodes in about an hour, with Check run twice on the way.

## What an oracle is

Most of those 70,600 lines are not ordinary tests. An ordinary test says: *do this, expect exactly that.* It checks one example someone thought of.

The studio's main checks are **oracles**, built on a framework Kyle wrote, `@tanstack/oracles`. An oracle has four parts:

1. **A law.** One sentence, in plain words, that starts with "For every…". For example: *for every replace of the shelf by a token that can't see private items, the entries it can't see keep their places.* The law cites where its promise comes from: the documentation, or a decision a maintainer made and dated.
2. **A model.** A small, independent piece of code that predicts what the law says should happen. It is written from the law, never copied from the product, so a mistake in the product can't hide in the model too.
3. **Generated histories.** Instead of one hand-picked example, the framework generates sequences of actions (create, edit, publish, replace, make private) and runs the real product through them, comparing it with the model at every step.
4. **Calibrations.** A deliberately wrong answer that the check must reject, proving the check can fail at all.

Then comes the part that makes the system unusual: the **gap check**. It plants small bugs in the product code, one at a time: it flips a condition, deletes a line, returns nothing instead of something. Then it reruns the oracles. Every planted bug must make some law fail. A planted bug that survives is a *gap*: a change to the product that no law notices. The rule is strict: there is no such thing as a harmless survivor. Either a law is missing, a history doesn't reach the case, or the code is dead and should go.

This finds real things. Writing the model for a gap on 25 November turned up a genuine ordering bug in a feature still in review, which was fixed before it shipped. That is the normal experience: the gap check is where the bugs are.

## Why this can look like overkill

From a traditional engineering perspective, all of this is a lot. Teams usually aim for "good coverage", a test-to-code ratio well under one, and mutation testing (the planted bugs) is a technique most teams try once and abandon as too slow. Forty-two CI jobs for a blogging tool sounds like a lot of machinery.

That judgment rests on an assumption: that writing code is the expensive part, done by people, and tests are a tax on it.

## Why it is the way forward

In this project most of the code is written by AI models, working with the maintainers. Writing code has become cheap. What hasn't become cheap is knowing that the code is right.

An AI can produce a plausible change in minutes. It can also produce a plausible test that agrees with its plausible change. When the same author writes both, a passing test proves less than it seems. This has happened here: on one piece of work, the planted bugs the authoring model wrote itself were all caught, and an independent review of the same work then found 19 of 45 planted bugs surviving.

The oracle approach divides the work differently:

- **People own the laws.** What the software promises, and on whose authority, is a human decision, written as a sentence anyone can read. An AI may propose a law; it may not adopt or change one.
- **The machine owns the production code.** Any version that keeps every law passing is acceptable, so a large refactor is fine. The project's own instructions put it this way: write the code "as an optimizing compiler for the oracle would write it". The oracle is the review.
- **The gap check keeps everyone honest.** It doesn't trust the author's claim that something is tested. It plants bugs and counts what is caught.

So the ratio of 1.3 lines of checking per line of product isn't a cost to be minimised. It is where the durable value sits. The product code can be rewritten, by people or by models, as often as it needs to be. The laws, the models and the planted-bug evidence are what let anyone, human or machine, change it safely, and they are what a new contributor can read to learn what the studio actually promises.

Fast CI is what makes this livable. A gate this thorough that took ninety minutes would be routed around. At thirteen minutes it is simply how work gets done.

## Credit

The oracle framework and the parallel Check are **@kyle**'s work: Kyle Mathews designed `@tanstack/oracles`, moved the studio's suites onto it, and rebuilt Check in #177. Many other contributors' features arrive with oracles of their own now, and the project is better for every one.

If you build a Blygger client of your own, none of this is required of you. The protocol asks only that what you publish conforms. But if you are building with AI, the pattern is worth borrowing: write down what you promise, in sentences, and let something independent check it.
