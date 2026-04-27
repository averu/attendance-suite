#!/usr/bin/env bash
# PostToolUse hook: 編集後に prettier / eslint / tsc を非ブロックで実行。
# 失敗は stderr に流し、Claude に自己修復させる (exit 0)。
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

# package.json が無い段階 (初期セットアップ前) は静かに抜ける
[ ! -f package.json ] && exit 0

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$file" ] && exit 0
[ ! -f "$file" ] && exit 0

case "$file" in
  *.ts|*.tsx)
    pnpm exec prettier --write --log-level=warn "$file" 1>&2 || true
    pnpm exec eslint --fix --quiet "$file" 1>&2 || true
    pnpm exec tsc --noEmit -p . 1>&2 || true
    ;;
  *.css|*.scss|*.json|*.md|*.yaml|*.yml)
    pnpm exec prettier --write --log-level=warn "$file" 1>&2 || true
    ;;
esac

exit 0
