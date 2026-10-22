#!/usr/bin/env node
// Pre/PostToolUse hook: appends one JSON line per event to .agent-log/actions.jsonl.
// A "pre" line with no matching "post" line = proposed but not executed (blocked or denied).
// Never blocks the agent.
import { appendFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
try {
  const ev = JSON.parse((await new Response(process.stdin).text()) || "{}");
  const root = process.env.CLAUDE_PROJECT_DIR || ev.cwd || process.cwd();
  const t = ev.tool_input ?? {};
  const target = t.file_path ? relative(root, t.file_path) : t.command ?? t.pattern ?? t.url;
  const line = {
    ts: new Date().toISOString(),
    phase: { PreToolUse: "pre", PostToolUse: "post", PostToolUseFailure: "fail" }[ev.hook_event_name] ?? ev.hook_event_name,
    session: String(ev.session_id ?? "").slice(0, 8),
    id: ev.tool_use_id,
    tool: ev.tool_name,
    target: target === undefined ? undefined : String(target).slice(0, 160),
  };
  mkdirSync(join(root, ".agent-log"), { recursive: true });
  appendFileSync(join(root, ".agent-log", "actions.jsonl"), JSON.stringify(line) + "\n");
} catch {
  /* logging must never break a session */
}
