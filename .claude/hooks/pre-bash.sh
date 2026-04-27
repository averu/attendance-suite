#!/usr/bin/env bash
# PreToolUse(Bash) hook: git commit / push 直前に typecheck と lint をブロッキングで実施。
# 失敗時 exit 2 で Claude に修正を要求する。
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

case "$cmd" in
  *"git commit"*|*"git push"*)
    [ ! -f package.json ] && exit 0

    if ! pnpm exec tsc --noEmit -p . 1>&2; then
      printf '\n[pre-bash] typecheck failed; fix errors before committing/pushing.\n' 1>&2
      exit 2
    fi

    if ! pnpm exec eslint . --quiet 1>&2; then
      printf '\n[pre-bash] lint failed; fix errors before committing/pushing.\n' 1>&2
      exit 2
    fi
    ;;
esac

exit 0
