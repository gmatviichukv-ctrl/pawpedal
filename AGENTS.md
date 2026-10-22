<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PawPedal — rules for coding agents

Bike + dog-gear rental. **What to build is `docs/spec.md`** — the source of truth. Requirement IDs (R1.1 …) are
the vocabulary: name tests after them. If code and spec disagree, stop and say so; never edit the spec or a test
to make them agree.

## Commands (pnpm only)

- `pnpm check` — typecheck + lint + tests. Run it before claiming anything is done; paste the `Tests N passed` line.
- `pnpm test -- <file>` — one test file. `pnpm dev` — app on :3000 (never start a second one).

## Definition of done

`pnpm check` green · every requirement you touched has a test named `R<id>: …` · no new warnings in `next build`.

## Rules the linter cannot enforce

- `lib/` is pure domain logic: no React, no Next, no `fs`, no `Date.now()`/`new Date()` — "today" is a parameter.
- Money is **integer cents** everywhere except formatting for display.
- Dates are `YYYY-MM-DD` strings compared as strings; parse strictly (reject `2026-02-30`).
- Route handlers stay thin: parse → call `lib/` → respond. Persistence only through `server/store.ts`.
- Errors are `{ code, message }`; tests assert the `code`, the UI shows the `message`.
- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`), one logical change per commit.

## Boundaries

- Ask first: new dependencies, configs, `.claude/**`, `docs/spec.md`.
- Never: read or write `.env*` (a hook blocks it), delete or weaken a test to get green, `git push`, `rm -rf`.
