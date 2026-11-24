# Codebase size

A dated record of how large the four repositories are, and how the studio splits
between product code and verification code. Add a new dated section each time it is
measured; don't edit old ones.

## 2026-11-23 (session 83)

Measured on each repo's `main`: studio at `3f46fce` (0.72.0's code), spec at `3068472`.
These are line counts of tracked files, blank lines and comments included. They leave out
generated files (`sdk/generated/`, `openapi.json`), lockfiles and images.

| Part | Lines | Files |
|---|---:|---:|
| **Studio: product code** | **~53,300** | 352 |
|   Server (`src/`, not UI) | 24,400 | 165 |
|   UI (`src/ui/`, TSX + CSS) | 21,400 | 76 |
|   Bundled extensions | 5,100 | 49 |
|   Migrations (0001–0060) | 2,200 | 59 |
|   Hand-written SDK | 300 | 3 |
| **Studio: verification code** | **~70,600** | 514 |
| Studio: tooling scripts (build, release, deploy, upgrade) | 3,700 | 36 |
| Conformance toolkit (`blygger-spec/conformance/`, code) | 12,600 | |
| blygger-com (directory) | 3,400 code + 1,400 tests | |
| blygger-org (site builder, sync and publish scripts) | 3,900 | |
| blygger-spec scripts | 1,400 | |

**Studio verification** counts:
- unit tests;
- the worker, UI and browser oracles;
- the e2e specs;
- the mutation and gap runners.

**Not counted:** the conformance toolkit's fixtures, schemas and clause register, another
~47,000 lines of JSON, much of it generated.

**Totals, code only:** about **150,000 lines**.
- **Verification ~85,000 (56%):** the studio's 70,600, the toolkit's 12,600, and blygger-com's tests.
- **Product ~61,000 (40%):** the studio plus the two sites.
- **Tooling:** the remaining ~5,000.

Within the studio alone, verification is about **1.3 lines for every line of product code**.

**Prose, on top of the code:** about 77,000 lines of markdown.
- blygger-spec: 40,000 (spec versions, plans, notes, devlog).
- blygger-org: 20,000.
- The studio's docs: 16,000.

**Accuracy.** A file counts as verification by its path or name: `test*/`, `e2e/`,
`*.test.*`, `*.spec.*`, `*oracle*`, `scripts/verify*`, `scripts/run-oracle*`, `*mutation*`.
A few borderline helper files could fall on either side, so the split is good to within a
few percent.

### How it was measured

Run this in `blygger-studio/`. The other repos were counted the same way, by extension, with
`conformance/` split into code and JSON.

```sh
git ls-files | grep -v -E '(^|/)(package-lock\.json|openapi\.json)$|^sdk/generated/|\.(png|jpg|ico|woff2?|svg|gif)$' |
/opt/homebrew/bin/python3 -c '
import sys, os, collections
code = {".ts",".tsx",".js",".mjs",".css",".sql",".html",".py",".sh",".als"}
def cat(p):
    if p.startswith(("test/","test-ui/","test-oracles/","test-browser/","e2e/","tests/")) or ".test." in p or ".spec." in p: return "verification"
    if p.startswith(("scripts/verify","scripts/run-oracle")) or "oracle" in p.split("/")[-1] or "mutation" in p: return "verification"
    if p.startswith("src/ui/"): return "studio UI"
    if p.startswith("src/"): return "studio server"
    if p.startswith("migrations/"): return "migrations"
    if p.startswith("scripts/"): return "tooling scripts"
    if p.startswith("sdk/"): return "sdk (hand-written)"
    if p.startswith("extensions/"): return "extensions"
    if p.endswith(".md"): return "docs (md)"
    return "other"
c = collections.Counter()
for p in sys.stdin.read().split():
    if os.path.splitext(p)[1] in code or p.endswith(".md"):
        c[cat(p)] += sum(1 for _ in open(p, errors="ignore"))
for k, v in c.most_common(): print(f"{k:22s} {v:8d}")
'
```
