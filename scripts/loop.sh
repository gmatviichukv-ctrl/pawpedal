#!/usr/bin/env bash
# Build loop: deterministic gate (`pnpm verify` = tests + warning-free next build) → fresh headless maker agent → repeat until green or MAX_ITER.
# Every run leaves a log in docs/runs/<utc-timestamp>-loop.md (what failed, what the agent said, how it ended).
#
#   pnpm loop "implement lib/pricing.ts per docs/spec.md R2"
#   MAX_ITER=3 pnpm loop "make pnpm check green"
#   AGENT_CMD="cursor-agent -p" pnpm loop "..."      # any CLI that takes the prompt as its last argument
set -uo pipefail
cd "$(dirname "$0")/.."

GOAL="${1:?usage: pnpm loop \"<goal>\"}"
MAX_ITER="${MAX_ITER:-5}"
mkdir -p docs/runs
LOG="docs/runs/$(date -u +%Y%m%dT%H%M%SZ)-loop.md"

maker() {
  if [ -n "${AGENT_CMD:-}" ]; then $AGENT_CMD "$1"; return; fi
  # The project allow-list in .claude/settings.json is NOT applied to an untrusted headless workspace,
  # so the maker's boundary is set explicitly here: edit files + run the gate, nothing else (no git, no installs).
  claude -p --permission-mode acceptEdits \
    --allowedTools "Read" "Edit" "Write" "Glob" "Grep" "Bash(pnpm check)" "Bash(pnpm verify)" "Bash(pnpm build)" "Bash(pnpm build:check)" "Bash(pnpm test *)" \
    --disallowedTools "Bash(git *)" "Bash(pnpm add *)" "Bash(rm *)" \
    -- "$1" </dev/null
}

printf '# Loop run %s\n\n- goal: %s\n- max iterations: %s\n- maker: `%s`, fresh session each iteration\n\n' \
  "$(date -u +%FT%TZ)" "$GOAL" "$MAX_ITER" "${AGENT_CMD:-claude -p}" >"$LOG"

tests_before="$(git diff --stat HEAD -- '*.test.ts' '*.test.tsx' | tail -1)"

for i in $(seq 1 "$MAX_ITER"); do
  OUT="$(pnpm verify 2>&1)"; CODE=$?
  { printf '## Gate before iteration %s — `pnpm verify` exit %s\n\n```\n' "$i" "$CODE"
    printf '%s\n' "$OUT" | grep -E 'Tests |Test Files|error TS|✗|×|FAIL|problem|build-check|Warning' | head -25
    printf '```\n\n'; } >>"$LOG"

  if [ "$CODE" -eq 0 ]; then
    echo "**Result: green after $((i - 1)) maker iteration(s).**" >>"$LOG"
    break
  fi

  PROMPT="You are the MAKER in an automated loop. Goal: $GOAL.
Read AGENTS.md and docs/spec.md first and follow them exactly.
You may NOT edit any *.test.ts / *.test.tsx file, docs/, configs or .claude/. If a test looks wrong, say so and stop.
\`pnpm verify\` (tests + warning-free next build) currently fails (exit $CODE). Its output (last 100 lines):
$(printf '%s\n' "$OUT" | tail -100)

Make the change, run \`pnpm verify\` yourself, then answer in <= 6 lines: what you changed, the Tests line, anything still red."
  printf '### Maker says (iteration %s)\n\n' "$i" >>"$LOG"
  maker "$PROMPT" 2>&1 | grep -v 'Ignoring .* permissions.allow' | tail -20 | sed 's/^/> /' >>"$LOG"
  printf '\n' >>"$LOG"
done

FINAL_OUT="$(pnpm verify 2>&1)"; FINAL=$?
if [ "$FINAL" -ne 0 ] && ! grep -q '^\*\*Result' "$LOG"; then
  echo "**Result: stopped at MAX_ITER=$MAX_ITER, still red — needs a human.**" >>"$LOG"
fi

# Guard: the maker must not have touched tests.
tests_after="$(git diff --stat HEAD -- '*.test.ts' '*.test.tsx' | tail -1)"
if [ "$tests_before" != "$tests_after" ]; then
  printf '\n**WARNING: test files changed during the loop — review before committing:**\n\n```\n%s\n```\n' \
    "$(git diff --stat HEAD -- '*.test.ts' '*.test.tsx')" >>"$LOG"
fi

echo "$(printf '%s\n' "$FINAL_OUT" | grep -E 'Tests ' | tail -1) — log: $LOG"
exit "$FINAL"
