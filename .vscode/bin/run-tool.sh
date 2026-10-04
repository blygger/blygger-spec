#!/usr/bin/env bash
# Regenerate one conformance tool's report (or all of them), from the repo root.
#
#   bash .vscode/bin/run-tool.sh clauses|schemas|live|alloy|model|dashboard|all
#
# Each tool writes conformance/<tool>/out/{summary.json,report.html}; the
# dashboard joins them into conformance/index.html (see conformance/README.md).
#
# The per-tool commands below were written before the tools were merged.
# Lines marked TODO(post-merge) are best guesses: check them against each
# tool's conformance/<tool>/README.md and fix them HERE (tasks.json only calls
# this script, so this is the one place to edit).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 1
TC=".vscode/bin/toolchain.sh"

need_npm_deps() { # $1 = tool dir with package.json
  if [ -f "$1/package.json" ] && [ ! -d "$1/node_modules" ]; then
    echo "Installing $1 dependencies (first run only)..."
    if [ -f "$1/package-lock.json" ]; then bash "$TC" npm --prefix "$1" ci; else bash "$TC" npm --prefix "$1" install; fi
  fi
}

missing() {
  echo "!! conformance/$1 is not here yet (or its entry point moved)."
  echo "   See conformance/$1/README.md for the regenerate command and update .vscode/bin/run-tool.sh."
  return 1
}

run() {
  case "$1" in
    clauses)
      # TODO(post-merge): confirm entry point; extract.py exists, a report builder may be separate.
      [ -f conformance/clauses/extract.py ] || { missing clauses; return; }
      bash "$TC" python3 conformance/clauses/extract.py
      ;;
    schemas)
      [ -f conformance/schemas/package.json ] || { missing schemas; return; }
      need_npm_deps conformance/schemas
      bash "$TC" npm --prefix conformance/schemas run all
      ;;
    live)
      # TODO(post-merge): confirm flags (read-only crawl of every known blyg; needs network).
      [ -f conformance/live/crawl.mjs ] || { missing live; return; }
      need_npm_deps conformance/live
      bash "$TC" node conformance/live/crawl.mjs
      ;;
    alloy)
      # TODO(post-merge): replace with the command in conformance/alloy/README.md.
      # Needs Java 17+ and graphviz `dot`; toolchain.sh puts both on PATH.
      if [ -x conformance/alloy/run.sh ]; then bash "$TC" conformance/alloy/run.sh
      elif [ -f conformance/alloy/run.py ]; then bash "$TC" python3 conformance/alloy/run.py
      elif [ -f conformance/alloy/run.mjs ]; then bash "$TC" node conformance/alloy/run.mjs
      else missing alloy; fi
      ;;
    model)
      [ -f conformance/model/package.json ] || { missing model; return; }
      need_npm_deps conformance/model
      bash "$TC" npm --prefix conformance/model run report
      ;;
    dashboard)
      bash "$TC" python3 conformance/build_dashboard.py
      ;;
    *)
      echo "unknown tool: $1 (clauses|schemas|live|alloy|model|dashboard|all)" >&2
      return 2
      ;;
  esac
}

if [ "${1:-}" = "all" ]; then
  failed=()
  for t in clauses schemas alloy model live; do
    echo; echo "=== $t ==="
    run "$t" || failed+=("$t")
  done
  echo; echo "=== dashboard ==="
  run dashboard || failed+=(dashboard)
  echo
  if [ ${#failed[@]} -eq 0 ]; then echo "All tools ran; open conformance/index.html."
  else echo "Finished with problems in: ${failed[*]} (the dashboard shows whatever summaries exist)."; exit 1; fi
else
  run "${1:?usage: run-tool.sh <tool>|all}"
fi
