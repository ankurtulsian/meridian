#!/usr/bin/env bash
# Makes the working style apply to every piece of work, not just Meridian.
# Run once, on your own computer, from inside the meridian folder.
set -euo pipefail

HOME_CLAUDE="${HOME}/.claude"
mkdir -p "${HOME_CLAUDE}/skills"

cp .claude/working-style.md "${HOME_CLAUDE}/working-style.md"
cp -R .claude/skills/check-in "${HOME_CLAUDE}/skills/"

touch "${HOME_CLAUDE}/CLAUDE.md"
if ! grep -q '@working-style.md' "${HOME_CLAUDE}/CLAUDE.md" 2>/dev/null; then
  printf '\n## How we work\n\nApplies to every project. Read the project notebook at session start.\n\n@working-style.md\n' \
    >> "${HOME_CLAUDE}/CLAUDE.md"
fi

echo "Done. The working style now applies to every project on this computer."
echo "The /check-in command is available everywhere too."
