#!/usr/bin/env node
// Runs the hooks with fake events — proves they work without starting an agent.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = (hook, ev, env = {}) =>
  spawnSync("node", [join(".claude/hooks", hook)], { input: JSON.stringify(ev), encoding: "utf8", env: { ...process.env, ...env } });

const cases = [
  ["Read .env.local", { tool_name: "Read", tool_input: { file_path: "/x/.env.local" } }, 2],
  ["Read .env", { tool_name: "Read", tool_input: { file_path: "/x/.env" } }, 2],
  ["Bash cat .env", { tool_name: "Bash", tool_input: { command: "cat .env" } }, 2],
  ["Read .env.example", { tool_name: "Read", tool_input: { file_path: "/x/.env.example" } }, 0],
  ["Read app/env.ts", { tool_name: "Read", tool_input: { file_path: "/x/app/env.ts" } }, 0],
  ["Bash pnpm check", { tool_name: "Bash", tool_input: { command: "pnpm check" } }, 0],
];
let failed = 0;
for (const [name, ev, want] of cases) {
  const got = run("guard-env.mjs", ev).status;
  const ok = got === want;
  failed += ok ? 0 : 1;
  console.log(`${ok ? "PASS" : "FAIL"}  guard-env: ${name} → exit ${got} (want ${want})`);
}
const dir = mkdtempSync(join(tmpdir(), "hooks-"));
run("log-action.mjs", { hook_event_name: "PreToolUse", tool_name: "Edit", tool_use_id: "t1", session_id: "abcdef1234", tool_input: { file_path: join(dir, "lib/x.ts") } }, { CLAUDE_PROJECT_DIR: dir });
const line = JSON.parse(readFileSync(join(dir, ".agent-log/actions.jsonl"), "utf8").trim());
const ok = line.phase === "pre" && line.tool === "Edit" && line.target === "lib/x.ts" && line.session === "abcdef12";
failed += ok ? 0 : 1;
console.log(`${ok ? "PASS" : "FAIL"}  log-action writes a repo-relative line: ${JSON.stringify(line)}`);
process.exit(failed ? 1 : 0);
