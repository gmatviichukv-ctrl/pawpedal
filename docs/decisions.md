# Decision log

Kept while building PawPedal (2026-10-22). Who decided what, how much the agent was trusted at each step, and
what went wrong. Commit hashes point at the evidence.

**Roles**
- **Owner** — Halyna: product, scope, business rules, final review.
- **Orchestrator** — the main Claude session: spec drafts, tests, harness, UI, fixes.
- **Maker** — a fresh headless `claude -p` session started by `scripts/loop.sh` for each iteration. It may only edit
  files and run the gate; no git, no installs, no test edits.
- **Checker** — a separate headless session with `.claude/agents/reviewer.md`. Read-only tools.

Trust levels: **1** human decides every step · **2** agent edits, human reviews each commit · **3** agent works to a
gate on its own and brings evidence · **4** independent agents, human combines results.

## Log

| # | Work | Level | Who decided | Evidence | Why this level |
|---|------|-------|-------------|----------|----------------|
| 1 | Start over: own repo, English, no course files; delete the old folder | 1 | **owner** | — | irreversible and about the whole project |
| 2 | Product scope: bike + dog-gear rental, no Google integration, no admin | 1 | **owner** chose from 3 options | `4abcc9e` spec v1 | scope sets everything else |
| 3 | Stack: Next.js + TypeScript + Vitest | 1 | **owner** (recommended option) | `df4ec47` | |
| 4 | Spec v1 | 2 | orchestrator drafted with 4 open questions | `4abcc9e` | the spec is the contract; owner must see it before code |
| 5 | Spec v1.1 — the 4 answers | 1 | **owner** kept 2 proposals, **changed 2**: bike-only rentals allowed (agent proposed gear required); cancel any time before the end (agent proposed not on/after the start) | `87654f7` | business rules are the owner's |
| 6 | Domain tests R2–R4 | 2 | orchestrator | `a295f31` red | tests are the gate for step 7, so the maker does not write them |
| 7 | Domain logic | **3** | maker, 1 iteration | `docs/runs/20261022T075404Z-loop.md` → `0327fa5` (28/28) | pure functions, red tests already in git, fails in ~10 s, revert is one `git checkout` |
| 8 | Harness fixes the maker reported | 2 | orchestrator acted on maker's notes | `d31b3fb` | see "What went wrong" #1 |
| 9 | API + store | **3** | maker, 1 iteration | `a679eda` red → `docs/runs/20261022T075649Z-loop.md` → `b3c1a6a` (42/42) | same conditions as #7 |
| 10 | Build warning missed by the loop | **lowered to 2** | orchestrator | `d3972fa` | see "What went wrong" #2 |
| 11 | Spec v1.2 — lookup needs the email | 2 | orchestrator found it while designing R6.3; **owner has not confirmed yet** | `2773217` → `21ea64d` | spec change made by the agent — flagged for the owner |
| 12 | UI | 2 | orchestrator, checked in a real browser | `ca65ae7`, `6f05c21`, `docs/runs/acceptance-run.md` | tests say little about how a form looks |
| 13 | Review 1 (whole project) | 4 | checker: APPROVE + 4 minor | `docs/reviews/20261022T080614Z-review.md` | the author never reviews its own diff |
| 14 | Fixes from review 1 | 2 | orchestrator, test first | `5d539d0` red → `e54eb71`; `c45a5ff` red → `9c5f179` | |
| 15 | Review 2 (UI only — review 1 skipped it) | 4 | checker: APPROVE + 5 minor | `docs/reviews/20261022T080847Z-review.md` | |
| 16 | Fixes from review 2 | 2 | orchestrator, test first | `8a9de8b` red → `9cf5de4` | |
| 17 | Final review, push, publish | 1 | **owner** | ran the app locally on 27 Oct: booked cargo + trailer for 7 days (10 % off shown), basket disabled on trekking bike, second trailer booking refused, cancelled with wrong/right email; confirmed spec v1.2 and v1.3; pushed to GitHub | publishing is the owner's act |

## Changes of trust level

**Raised (rows 7, 9).** The maker got level 3 only after the red tests were committed and the loop prompt forbade
editing tests. `scripts/loop.sh` also checks afterwards that no test file changed. The gate existed *before* the
freedom.

**Lowered (row 10).** The API loop came back green, but `next build` warned that the file store made Turbopack
trace the whole project into the server bundle. The loop's gate was `pnpm check` (tests only), while the definition
of done also asked for a warning-free build. The maker could not see what the gate did not measure. Fix: the gate is
now `pnpm verify` = tests + `scripts/build-check.sh`, which fails on any build warning. Until that existed, the API
was not trusted at level 3.

**Not escalated.** The UI was not handed to the loop: a green test run says nothing about whether the form makes
sense to a person. It was checked with screenshots instead.

## What went wrong

1. **My harness had two mistakes, found by the maker.** The deny rule `Write(./.env*)` is not valid (Claude Code
   only applies `Edit` rules to file writes), and `vite-tsconfig-paths` — taken from the Next.js docs — is redundant
   in the installed Vite. Both fixed in `d31b3fb`.
2. **The gate did not cover the definition of done** — see "Lowered" above.
3. **The spec itself had a privacy hole.** R5.3 let anyone with a ref read the customer's name and email, while
   R6.3 already asked for the email. Found while designing the screen, not by any test (v1.2).
4. **My own fix created a bug.** After allowing spaces around emails (v1.3), the booking stored the untrimmed email,
   so lookup and cancel would not match. Caught by writing a test first (`c45a5ff`, red).
5. **The first acceptance run reported a false failure**: the screenshot was taken before the streamed form
   arrived. That was my script, not the app.
6. **Reviewer 1 was wrong once**: it said no test covered the Madrid midnight boundary. One exists (`R3.2` in
   `lib/rules.test.ts`). It also skipped the UI entirely — hence review 2.
7. **Tests that were too loose**: a UI test matched `€141.00` in two places (subtotal and total). Tightened.
8. **The agent log cannot tell sessions apart.** Every headless session was logged under the same session prefix,
   so `pnpm agent:log` shows one session. Maker and checker are told apart by the files in `docs/runs/` and
   `docs/reviews/`.

## What agents proposed and were stopped

`pnpm agent:log` lists 4 commands that were **proposed but not executed** (a `pre` line with no `post` line). The
timestamps match the two maker loops and the first review:

| When (UTC) | Who | Command | Why it was refused |
|---|---|---|---|
| 07:54:12 | maker, loop 1 | `ls lib && cat lib/*.test.ts && … && git log --oneline` | `git` is not allowed inside the loop |
| 07:56:59 | maker, loop 2 | `git ls-files \| …` | same |
| 07:57:45 | maker, loop 2 | a `python3` heredoc rewriting `app/api/bookings/route.ts` | only the Edit tool may change files; arbitrary scripts are not allowed |
| 08:06:20 | checker, review 1 | one long chained `cat` of ten files | not on the reviewer's read-only list; it then read the files one by one (it says so in its report) |

In every case the agent fell back to an allowed tool instead of working around the limit.

## Owner to confirm

- Spec **v1.2** (lookup needs the email) and **v1.3** (no whitespace in emails) were written by the agent. Keep or
  change them.
- Row 17: what you checked yourself before publishing.
