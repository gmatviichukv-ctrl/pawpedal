#!/usr/bin/env bash
# maker ≠ checker: a SEPARATE headless session runs the read-only reviewer agent over a diff.
# Output: docs/reviews/<utc-timestamp>-review.md
#
#   pnpm review              # everything since the first commit
#   pnpm review <base-ref>   # only what changed since <base-ref>
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="${1:-$(git rev-list --max-parents=0 HEAD | tail -1)}"
mkdir -p docs/reviews
OUT="docs/reviews/$(date -u +%Y%m%dT%H%M%SZ)-review.md"

printf '# Review %s\n\n- reviewer: `.claude/agents/reviewer.md` (separate session, read-only tools)\n- diff: `git diff %s..HEAD` — %s\n\n' \
  "$(date -u +%FT%TZ)" "${BASE:0:7}" "$(git diff --shortstat "$BASE"..HEAD -- . ':!pnpm-lock.yaml' | xargs)" >"$OUT"

claude -p --agent reviewer \
  --allowedTools "Read" "Grep" "Glob" "Bash(git diff *)" "Bash(git log *)" "Bash(git show *)" "Bash(pnpm check)" "Bash(pnpm test *)" \
  --disallowedTools "Edit" "Write" "NotebookEdit" \
  -- "Review: git diff $BASE..HEAD (ignore pnpm-lock.yaml, docs/runs/, docs/reviews/). Follow your instructions and output format." \
  </dev/null 2>&1 | grep -v 'Ignoring .* permissions.allow' >>"$OUT"

echo "review: $OUT"
grep -m1 '^## Verdict' "$OUT" || echo "(no verdict line — read the file)"
