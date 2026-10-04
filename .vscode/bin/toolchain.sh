#!/usr/bin/env bash
# Find the tools the conformance toolkit needs and put them on PATH.
#
#   bash .vscode/bin/toolchain.sh --check        # report what is found, change nothing
#   bash .vscode/bin/toolchain.sh <cmd> [args]   # run <cmd> with java/dot/node on PATH
#
# Nothing is installed. No machine-specific paths: Java is found through
# JAVA_HOME, macOS's java_home, `brew --prefix`, then PATH; the rest through PATH
# (plus `brew --prefix` when Homebrew exists).
set -uo pipefail

JAVA_MIN=17

java_major() { # $1 = java binary; prints major version or nothing
  "$1" -version 2>&1 | awk -F'"' '/version/ {split($2, v, "."); print (v[1] == "1" ? v[2] : v[1]); exit}'
}

usable_java() { # $1 = java binary
  [ -x "$1" ] || return 1
  local m; m="$(java_major "$1")"
  [ -n "$m" ] && [ "$m" -ge "$JAVA_MIN" ] 2>/dev/null
}

find_java() {
  local c
  if [ -n "${JAVA_HOME:-}" ] && usable_java "$JAVA_HOME/bin/java"; then echo "$JAVA_HOME/bin/java"; return; fi
  if [ -x /usr/libexec/java_home ]; then
    c="$(/usr/libexec/java_home -v "$JAVA_MIN+" 2>/dev/null)/bin/java"
    usable_java "$c" && { echo "$c"; return; }
  fi
  if command -v brew >/dev/null 2>&1; then
    for f in "openjdk@$JAVA_MIN" openjdk openjdk@21; do
      c="$(brew --prefix "$f" 2>/dev/null)/bin/java"
      usable_java "$c" && { echo "$c"; return; }
    done
  fi
  # On macOS /usr/bin/java is a stub that fails when no JDK is registered;
  # usable_java rejects it because it reports no version.
  c="$(command -v java 2>/dev/null)"
  [ -n "$c" ] && usable_java "$c" && { echo "$c"; return; }
}

find_on_path_or_brew() { # $1 = binary, $2 = brew formula
  local c
  c="$(command -v "$1" 2>/dev/null)" && { echo "$c"; return; }
  if command -v brew >/dev/null 2>&1; then
    c="$(brew --prefix "$2" 2>/dev/null)/bin/$1"
    [ -x "$c" ] && echo "$c"
  fi
}

JAVA="$(find_java)"
DOT="$(find_on_path_or_brew dot graphviz)"
NODE="$(find_on_path_or_brew node node)"
PY="$(command -v python3 2>/dev/null)"

for b in "$JAVA" "$DOT" "$NODE"; do
  [ -n "$b" ] && PATH="$(dirname "$b"):$PATH"
done
export PATH
[ -n "$JAVA" ] && export JAVA_HOME="$(cd "$(dirname "$JAVA")/.." && pwd)"

report() {
  local ok=0
  if [ -n "$PY" ]; then echo "  python3   ok   $("$PY" --version 2>&1)"; else echo "  python3   MISSING  (dashboard, clause register) -> install Python 3 (brew install python)"; ok=1; fi
  if [ -n "$NODE" ]; then echo "  node      ok   $("$NODE" --version)"; else echo "  node      MISSING  (schemas, live crawler, property tests) -> brew install node"; ok=1; fi
  if [ -n "$JAVA" ]; then echo "  java      ok   Java $(java_major "$JAVA") at $JAVA"; else
    echo "  java      MISSING  (Alloy model needs Java $JAVA_MIN+) -> brew install openjdk@$JAVA_MIN"
    echo "            For the Alloy extension's 'Execute' button, VS Code itself must see java:"
    echo "            sudo ln -sfn \"\$(brew --prefix openjdk@$JAVA_MIN)/libexec/openjdk.jdk\" /Library/Java/JavaVirtualMachines/openjdk-$JAVA_MIN.jdk"
    ok=1; fi
  if [ -n "$DOT" ]; then echo "  dot       ok   $("$DOT" -V 2>&1)"; else echo "  dot       MISSING  (Alloy counterexample pictures) -> brew install graphviz"; ok=1; fi
  return $ok
}

if [ "${1:-}" = "--check" ]; then
  echo "Toolchain:"
  report
  exit $?
fi

if [ $# -eq 0 ]; then
  echo "usage: $0 --check | <command> [args...]" >&2
  exit 2
fi
exec "$@"
