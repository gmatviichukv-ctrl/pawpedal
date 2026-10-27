#!/usr/bin/env bash
# Definition of done includes "no new warnings in next build" — this makes that checkable by a machine.
set -uo pipefail
cd "$(dirname "$0")/.."
OUT="$(pnpm -s build 2>&1)"; CODE=$?
printf '%s\n' "$OUT" | tail -15
if [ "$CODE" -ne 0 ]; then echo "build-check: next build failed"; exit 1; fi
if printf '%s\n' "$OUT" | grep -qiE "warning"; then echo "build-check: next build printed warnings"; exit 1; fi
echo "build-check: clean"
