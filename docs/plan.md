# Plan

How PawPedal is built, in order. Each step ends with a commit and its own check.

| # | Step | Who | Check |
|---|------|-----|-------|
| 1 | `docs/spec.md` and this plan | agent drafts, **owner reviews** | commit order: spec before any code |
| 2 | Scaffold Next.js + TypeScript + Vitest; `AGENTS.md`; hooks that block `.env*` and log every agent action | agent | `pnpm check` green on an empty app; `pnpm hooks:test` |
| 3 | Tests for R2–R4 (domain) — **no implementation** | agent | `pnpm test` red, committed on its own |
| 4 | `scripts/loop.sh`: run `pnpm check` → hand failures to a fresh headless agent → repeat, max 5 | agent writes, loop runs maker | run log in `docs/runs/` |
| 5 | Store + API (R4.5, R5) with route tests | agent | tests green; `curl` against the running app |
| 6 | UI (R1.2, R6) | agent | owner walks through §8 acceptance in a browser |
| 7 | Independent review: a separate read-only agent reviews the diff against this spec | reviewer agent | report in `docs/reviews/`; findings → test first → fix |
| 8 | Decision log kept during the work | agent + owner | `docs/decisions.md` |
