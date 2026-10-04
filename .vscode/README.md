# VS Code setup for Blygger

**Quick start (no coding needed):**

1. Install [VS Code](https://code.visualstudio.com), open it, press Cmd+Shift+P and run **Shell Command: Install 'code' command in PATH**.
2. In Terminal, from this `blygger-spec` folder, run `bash .vscode/setup-profile.sh` and answer y/N to any missing repos it offers to clone.
3. Open the workspace: `code --profile Blygger blygger.code-workspace`.
4. Open the dashboard: **Terminal > Run Task… > Conformance: open dashboard** (run **Conformance: run all tools** first if it says there is none).
5. To read the spec, open `docs/protocol-v0.3.md` and press Cmd+K V for a side-by-side preview; the Outline panel lists every section.

## What the setup script does

`setup-profile.sh` is safe to re-run. Each step skips what is already done, and the script prints what it changed.

- It creates a VS Code profile named **Blygger**. The profile has its own extensions, so your Default profile is not changed.
- It installs the extensions listed in `.vscode/extensions.json` into that profile only.
- It checks for the sibling repos next to `blygger-spec` (`blygger-studio`, `blygger-org`, `blygger-com`). For each missing one it asks y/N before running `git clone`.
- It checks for python3, node, Java 17+ and graphviz. It does not install them; it prints the `brew install` command for anything missing.

**Java.** The Alloy model needs Java 17 or newer: `brew install openjdk@17`. The tasks find Homebrew's JDK on their own. The Alloy extension's **Execute** button runs `java` from VS Code's environment, so for that button macOS must also know about the JDK. `bash .vscode/bin/toolchain.sh --check` prints the one-line `sudo ln -sfn …` command that registers it.

## The workspace

`blygger.code-workspace` opens up to four repos side by side, each from `../<name>`: blygger-spec, blygger-studio, blygger-org and blygger-com. **A repo you have not cloned shows as a missing folder in the Explorer.** That is harmless; you can ignore it or clone the repo. The repo-specific settings (JSON schemas, markdown, spell-check words) are in `.vscode/settings.json`, so they also apply when you open `blygger-spec` on its own.

## Tasks (Terminal > Run Task…)

| Task | What it does |
|---|---|
| Conformance: run all tools | Regenerates every tool's report, then the dashboard (the live crawl needs network) |
| Conformance: open dashboard | Opens `conformance/index.html` in your browser |
| Conformance: preview dashboard in VS Code | Live Preview inside VS Code, which refreshes when the file changes |
| Conformance: rebuild dashboard | `python3 conformance/build_dashboard.py` |
| Conformance: clause register / schemas / live / Alloy / property tests | Runs one tool |
| Setup: check toolchain | Reports python3, node, Java and graphviz |
| Graphviz: render current .dot to SVG | Writes an `.svg` file next to the open `.dot` file |

All tool tasks go through `.vscode/bin/run-tool.sh`, which holds the real commands. The entries marked `TODO(post-merge)` were guessed before each tool's README existed. Check them against `conformance/<tool>/README.md` and fix them in that one file.

## Extensions

| Extension | ID | Why |
|---|---|---|
| Claude Code | `anthropic.claude-code` | The agent the project runs on, with a diff view inside the editor |
| Live Preview | `ms-vscode.live-server` | Views the dashboard and the tool `report.html` pages inside VS Code, with auto-refresh |
| Alloy | `arashsahebolamri.alloy` | Syntax and an **Execute** link above each `run`/`check` in `.als` files (bundles Alloy 6.1; it pulls in `dongyuzhao.alloy-vscode` for highlighting). It hasn't been updated since 2021, but it is the only Alloy runner on the marketplace |
| Graphviz Interactive Preview | `tintinweb.graphviz-interactive-preview` | Previews `.dot` files, including Alloy counterexamples and traceability graphs, with pan and zoom |
| Markdown All in One | `yzhang.markdown-all-in-one` | TOC, section navigation and shortcuts for the 2,000-line spec. Auto-TOC and list renumbering are switched **off**, so it never rewrites normative text |
| Markdown Preview Mermaid | `bierner.markdown-mermaid` | Mermaid diagrams in the built-in preview |
| Markdown Preview GitHub Styling | `bierner.markdown-preview-github-styles` | The preview looks like the spec does on GitHub |
| markdownlint | `davidanson.vscode-markdownlint` | Catches broken markdown structure. Line length and inline HTML rules are off |
| YAML | `redhat.vscode-yaml` | Validates YAML against schemas (GitHub issue templates, CI) |
| Vitest | `vitest.explorer` | Test explorer for blygger-studio and the TypeScript conformance tools |
| Playwright | `ms-playwright.playwright` | blygger-studio's end-to-end tests |
| Python | `ms-python.python` | The dashboard and clause-register scripts |
| Code Spell Checker | `streetsidesoftware.code-spell-checker` | Spell-checks spec prose; protocol words (blyg, transclusion, Webmention…) are already whitelisted |
| GitLens | `eamodio.gitlens` | Who changed this line of the spec, when, and in which session |
| Error Lens | `usernamehw.errorlens` | Shows schema and lint errors on the line they are about |
| Quint (optional) | `informal.quint-vscode` | For a TLA+-style model later; nothing uses it yet |

JSON validation needs no extension because it is built into VS Code. `.vscode/settings.json` maps the 2020-12 schemas in `conformance/schemas/schemas/` to `blyg.json`, `items/index.json`, item and pinned-version files, so the crawler cache and the sample files get hover docs and red squiggles.

To add or remove an extension, edit `.vscode/extensions.json` and re-run the script. The script reads that file, and `blygger.code-workspace` repeats the same list as recommendations.
