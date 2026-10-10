#!/usr/bin/env bash
# Set up the "Blygger" VS Code profile for working on the Blygger spec.
#
#   bash conformance/editor/setup-profile.sh
#
# What it does, in order (safe to re-run; each step skips what is already done):
#   1. Finds VS Code's `code` command.
#   2. Checks the sibling repos next to blygger-spec and, for missing ones,
#      asks y/N before cloning (never clones without a "y").
#   3. Creates the "Blygger" profile if it does not exist.
#   4. Installs the extensions recommended in blygger.code-workspace into that
#      profile only. The Default profile and other profiles are never touched.
#   5. Checks python3 / node / Java 17+ / graphviz and says what is missing.
#      It does not install them.
#
# Override the profile name with PROFILE=Name, or the code binary with CODE=path.
set -uo pipefail

PROFILE="${PROFILE:-Blygger}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SPEC="$(cd "$HERE/../.." && pwd)"
PARENT="$(cd "$SPEC/.." && pwd)"
did=()      # summary lines

say() { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }

# ---------------------------------------------------------------- 1. code CLI
step "VS Code command line"
CODE="${CODE:-$(command -v code 2>/dev/null)}"
if [ -z "$CODE" ]; then
  for c in "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
           "$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"; do
    [ -x "$c" ] && CODE="$c" && break
  done
fi
if [ -z "$CODE" ]; then
  say "VS Code's 'code' command was not found."
  say "Install VS Code (https://code.visualstudio.com), open it, press Cmd+Shift+P,"
  say "run 'Shell Command: Install 'code' command in PATH', then run this script again."
  exit 1
fi
say "using: $CODE ($("$CODE" --version 2>/dev/null | head -1))"

# ------------------------------------------------------------ 2. sibling repos
step "Sibling repositories (in $PARENT)"
SIBLINGS=(
  "blygger-studio|https://github.com/blygger/blygger-studio.git|reference client; needed by the property tests"
  "blygger-org|https://github.com/blygger/blygger-org.git|blygger.org site"
  "blygger-com|https://github.com/blygger/blygger-com.git|blygger.com directory"
)
interactive=0; [ -t 0 ] && interactive=1
for entry in "${SIBLINGS[@]}"; do
  IFS='|' read -r name url what <<<"$entry"
  if [ -d "$PARENT/$name" ]; then
    say "  ok       $name"
    continue
  fi
  say "  missing  $name  ($what)"
  if [ $interactive -eq 1 ] && command -v git >/dev/null 2>&1; then
    printf '           clone %s into %s? [y/N] ' "$url" "$PARENT/$name"
    read -r ans
    case "$ans" in
      y|Y|yes|YES)
        if git clone "$url" "$PARENT/$name"; then did+=("cloned $name"); else say "           clone failed (private repo or no access?) - skipped"; fi ;;
      *) say "           skipped (the workspace shows it as a missing folder; that is harmless)" ;;
    esac
  else
    say "           not cloning (non-interactive or no git): git clone $url \"$PARENT/$name\""
  fi
done

# ------------------------------------------------------------ 3. the profile
step "Profile '$PROFILE'"
if "$CODE" --list-extensions --profile "$PROFILE" >/dev/null 2>&1; then
  say "already exists"
else
  # `--install-extension --profile X` refuses an unknown profile, and the CLI
  # has no "create profile" verb: opening a window in the profile creates it.
  say "creating it (an empty VS Code window opens in the new profile; you can close it)"
  "$CODE" --profile "$PROFILE" --new-window
  for _ in $(seq 1 30); do
    "$CODE" --list-extensions --profile "$PROFILE" >/dev/null 2>&1 && break
    sleep 1
  done
  if "$CODE" --list-extensions --profile "$PROFILE" >/dev/null 2>&1; then
    did+=("created profile $PROFILE")
  else
    say "could not create the profile; open VS Code, use Profiles > New Profile named '$PROFILE', then re-run."
    exit 1
  fi
fi

# ------------------------------------------------------------ 4. extensions
step "Extensions (from blygger.code-workspace, into '$PROFILE' only)"
EXTS=$(python3 - "$HERE/blygger.code-workspace" <<'PY' 2>/dev/null
import json, re, sys
text = re.sub(r'^\s*//.*$', '', open(sys.argv[1]).read(), flags=re.M)
print("\n".join(json.loads(text)["extensions"]["recommendations"]))
PY
)
if [ -z "$EXTS" ]; then
  say "could not read blygger.code-workspace (python3 missing?)"; exit 1
fi
installed="$("$CODE" --list-extensions --profile "$PROFILE" 2>/dev/null | tr '[:upper:]' '[:lower:]')"
failed=(); n_new=0
while IFS= read -r ext; do
  [ -z "$ext" ] && continue
  lower="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  if printf '%s\n' "$installed" | grep -qx "$lower"; then
    say "  ok         $ext"
  elif "$CODE" --install-extension "$ext" --profile "$PROFILE" >/dev/null 2>&1; then
    say "  installed  $ext"; n_new=$((n_new + 1))
  else
    say "  FAILED     $ext"; failed+=("$ext")
  fi
done <<<"$EXTS"
[ $n_new -gt 0 ] && did+=("installed $n_new extension(s) into $PROFILE")

# ------------------------------------------------------------ 5. toolchain
step "Tools used by the conformance toolkit (checked, not installed)"
bash "$HERE/bin/toolchain.sh" --check || say "  (only the tools marked MISSING are affected; everything else works)"

# ------------------------------------------------------------ summary
step "Summary"
if [ ${#did[@]} -eq 0 ]; then say "nothing to do: already set up"; else for d in "${did[@]}"; do say "  - $d"; done; fi
[ ${#failed[@]} -gt 0 ] && say "  - FAILED to install: ${failed[*]} (re-run, or install from the Extensions view)"
say "The Default profile was not changed."
say
say "Next:  cd \"$SPEC\" && code --profile $PROFILE conformance/editor/blygger.code-workspace"
say "Then:  Terminal > Run Task... > 'Conformance: open dashboard'"
[ ${#failed[@]} -eq 0 ]
