# Clause map

Every rule in the book, with the 0.4 clause or clauses it carries. The acceptance test
(`../spec-refactor-plan.md` §8) reads this table: every normative 0.4 clause appears
in the right-hand column exactly once, and every rule in Parts II to VII has at least
one. Where 0.4 states a rule in two places, both clauses point at the one rule and the
row is marked **merge**.

Clause ids are the conformance toolkit's, from a scratch extraction of the
seventeenth-revision text. They are re-keyed to the committed register when Opus has
rebuilt it.

| Rule | Chapter | Actor | Keyword | 0.4 clause | 0.4 section | Remark |
|---|---|---|---|---|---|---|
| R-0001 | Pins | publisher | MAY | C-8-02 | §8 rule 2 | |
| R-0002 | Pins | publisher | MUST NOT | C-8-03 | §8 rule 2 | |
| R-0003 | Pins | publisher | MUST | C-8-01; C-4-10 (second half) | §8 rule 1; §4 | **merge** |
| R-0004 | Pins | publisher | MUST | C-4-10 (first half) | §4 | C-4-10 holds two requirements in one sentence and is split across R-0003 and R-0004 |
| R-0005 | Pins | publisher | MUST | C-8-04 | §8 rule 4 | |
| R-0006 | Pins | publisher | SHOULD | C-8-05 | §8 rule 6 | |
| R-0007 | Pins | publisher | MUST | C-8.4-01 | §8.4 | |
| R-0008 | Pins | publisher | MUST NOT | C-8.4-02 | §8.4 | |
| R-0009 | Pins | publisher | MAY | C-8.4-04 | §8.4 | |
| R-0010 | Pins | publisher | SHOULD | C-8.4-08 | §8.4 rule 3 | |
| R-0011 | Pins | publisher | MUST NOT | C-8.4-06 | §8.4 rule 4 | |
| R-0012 | Pins | reader | MUST NOT | C-8.4-07 | §8.4 rule 5 | |
| R-0013 | Withdrawal | publisher | MUST | C-5-10 | §5 | |
| R-0014 | Withdrawal | publisher | MUST NOT | C-9-02 | §9 | |

**Accounted for so far:** 14 of 272 clauses (12 of Pins' 12, 2 of Withdrawal's 2).
C-9-01 (a withdrawn stub SHOULD re-send its mention) is owned by Mentions and is
mapped when that chapter is written.
