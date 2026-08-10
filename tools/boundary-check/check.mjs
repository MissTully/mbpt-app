#!/usr/bin/env node
// The dependency boundary check. ARC-MBPT-001 section 2: "dependencies point
// inward, and the rule is enforced by an automated check on every commit, not
// by review." Fails the build if anything under core/src or perception/src
// imports outward.
//
// Allowed inside the boundary:
//   - relative imports within the same package
//   - core: "zod" (the schema validator, ARC section 4.9)
//   - perception: "@mbpt/core" and "zod"
// Everything else — browser globals, node builtins, frameworks, device
// libraries — is a violation.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const rules = [
  { dir: "core/src", allowed: ["zod"] },
  { dir: "perception/src", allowed: ["zod", "@mbpt/core"] },
];

// Browser/device globals that must not be referenced in boundary code even
// without an import statement.
const forbiddenGlobals =
  /\b(window|document|navigator|localStorage|indexedDB|AudioContext|MediaStream|fetch|XMLHttpRequest|WebSocket)\b/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (path.endsWith(".ts")) out.push(path);
  }
  return out;
}

const violations = [];
for (const rule of rules) {
  for (const file of walk(rule.dir)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(
      /(?:^|\n)\s*(?:import|export)[^"'`]*from\s*["']([^"']+)["']/g,
    )) {
      const spec = match[1];
      if (spec.startsWith("./") || spec.startsWith("../")) continue;
      if (rule.allowed.includes(spec)) continue;
      violations.push(`${file}: imports "${spec}"`);
    }
    // Strip comments and string literals before checking globals, so prose
    // mentioning a browser term does not trip the check.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g, '""');
    const globalHit = code.match(forbiddenGlobals);
    if (globalHit) {
      violations.push(`${file}: references browser global "${globalHit[0]}"`);
    }
  }
}

if (violations.length > 0) {
  console.error("BOUNDARY CHECK FAILED — the core must not reach outward:\n");
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    "\nFix the leak before building anything more on top of it (INSTR-MBPT-001 section 6.2).",
  );
  process.exit(1);
}
console.log("boundary check: intact");
