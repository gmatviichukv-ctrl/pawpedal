#!/usr/bin/env node
// Summarises .agent-log/actions.jsonl: what agents proposed vs actually executed, per session and tool.
import { existsSync, readFileSync } from "node:fs";
const f = ".agent-log/actions.jsonl";
if (!existsSync(f)) { console.log("no agent actions logged yet"); process.exit(0); }
const lines = readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const done = new Set(lines.filter((l) => l.phase !== "pre").map((l) => l.id));
const rows = {};
for (const l of lines.filter((l) => l.phase === "pre")) {
  const k = `${l.session} ${l.tool}`;
  rows[k] ??= { session: l.session, tool: l.tool, proposed: 0, executed: 0, notExecuted: 0 };
  rows[k].proposed++;
  if (done.has(l.id)) rows[k].executed++;
  else rows[k].notExecuted++;
}
console.table(Object.values(rows));
const blocked = lines.filter((l) => l.phase === "pre" && !done.has(l.id));
for (const b of blocked) console.log(`not executed: ${b.ts} ${b.tool} ${b.target ?? ""}`);
