#!/usr/bin/env bash
# Open conformance/index.html in the default browser (macOS, Linux, WSL).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PAGE="$ROOT/conformance/index.html"
if [ ! -f "$PAGE" ]; then
  echo "No dashboard yet: run the task 'Conformance: run all tools' (or 'Conformance: rebuild dashboard')."
  exit 1
fi
if command -v open >/dev/null 2>&1; then open "$PAGE"
elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$PAGE"
else python3 -c 'import sys, pathlib, webbrowser; webbrowser.open(pathlib.Path(sys.argv[1]).as_uri())' "$PAGE"
fi
echo "Opened $PAGE"
