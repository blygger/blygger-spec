# Alloy model of the Blygger 0.3 rules

A bounded, executable model of `docs/protocol-v0.3.md` in [Alloy 6](https://alloytools.org).
The solver searches every history up to a size bound for one that obeys every rule
but breaks a property the spec intends. A counterexample is a concrete story you can
read; "no counterexample" means none exists within the stated scope.

## Regenerate

```sh
python3 conformance/alloy/run.py           # solve everything, write out/ (~15 min)
python3 conformance/alloy/run.py --reuse   # rebuild report/summary from out/raw without re-solving
python3 conformance/alloy/run.py --only ForkFaithful,Vac_ForkWithQuotes
```

Needs Java 17+ (`$JAVA`, default `/opt/homebrew/opt/openjdk@17/bin/java`) and Graphviz
(`$DOT`, default `/opt/homebrew/bin/dot`). The Alloy 6.2.0 jar is downloaded into
`vendor/` (gitignored) on first run. Solver: glucose (`$ALLOY_SOLVER` to change).

Outputs:

- `out/summary.json` — one check per assertion (`pass` / `warn` / `fail` / `info`), with
  scope, spec sections, decisions and clause ids from `conformance/clauses/clauses.json`.
- `out/report.html` — self-contained report: per-assertion cards, quoted spec sentences,
  plain-English explanations, counterexample traces as SVG step strips, the fork rule
  sets side by side, and a "For Fable" list.
- `out/svg/` — the violating step of each counterexample as a standalone SVG.
- `out/raw/` — raw Alloy XML instances (gitignored).

## Files

| File | What it models |
|---|---|
| `models/blygger.als` | Versions, pins, withdrawal, import/poll, transclusion (whole and partial), nesting, local closure check, forks (two rule sets: §5.6 alone, and §5.6 + §16.6f/#57), stubs. Temporal. |
| `models/watermark.als` | One reader, one item: the §13.3 watermark against rewrites, stale caches, dropped feed entries and withdrawal. Temporal. |
| `models/mentions.als` | Origin identity (§12.2) and Webmention structural verification (§15.4) against an adversarial publisher. Static. |
| `checks.py` | Per-command metadata: expectation, status on counterexample, quoted spec text, explanations, "For Fable" notes. |
| `run.py` | Runner and report builder (Python 3 stdlib). |

Status meanings: **pass** = no counterexample within scope; **fail** = a counterexample that is
a real problem with the spec text; **warn** = a counterexample that turns on an ambiguity, a reading
or wording, or a gap a ruling leaves open; **info** = a counterexample showing behaviour the spec chose
deliberately. Every passing check is paired with a `run` showing its situation is reachable
(non-vacuity); a check whose run finds nothing is downgraded to warn.

Readings the model had to choose are marked `READING:` or modelled both ways via the `Cfg`
signature (closure-walk reading; fork rule set) and the watermark `Policy`.

## Open in the Alloy GUI

```sh
/opt/homebrew/opt/openjdk@17/bin/java -jar conformance/alloy/vendor/org.alloytools.alloy.dist.jar
```

File → Open `conformance/alloy/models/blygger.als`, choose a command from Execute, then use
the visualiser's → arrow to step through time. Theme the visualiser by projecting over nothing
and hiding `res`, `Directive`, `Bake` for a clearer picture.
