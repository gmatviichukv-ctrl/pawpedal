#!/usr/bin/env node
// PreToolUse hook: refuses any agent tool call that touches a .env file (except .env.example).
// Exit code 2 blocks the call; stderr is shown to the agent as the reason.
const input = JSON.parse((await new Response(process.stdin).text()) || "{}");
const t = input.tool_input ?? {};
const targets = [t.file_path, t.notebook_path, t.path, t.command, t.pattern].filter(Boolean).map(String);
const hit = targets.find((s) => /(^|[\s/"'=])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s"';|&)])/.test(s));
if (hit) {
  console.error(`Blocked: "${hit.slice(0, 120)}" touches a .env file. Secrets stay with the human; use .env.example.`);
  process.exit(2);
}
