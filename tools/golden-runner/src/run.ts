// The golden set runner. Scores the checked-in attempt records and compares
// against expected scores byte for byte. Runs on every commit (INSTR-MBPT-001
// section 6.7). When a threshold changes, the golden set is regenerated
// deliberately and the difference reviewed line by line — that review is the
// audit trail.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  loadConfig,
  score,
  validateAttemptRecord,
  ActivityDefinition,
  GroundTruth,
  ResponseSetLibrary,
  type ScoringContext,
} from "@mbpt/core";

const goldenDir = "tests/golden";
const config = loadConfig(JSON.parse(readFileSync("content/config/config-v1.json", "utf8")));
const responseSets = ResponseSetLibrary.parse(
  JSON.parse(readFileSync("content/response-sets/response-sets-v1.json", "utf8")),
).sets;

let failures = 0;
let count = 0;

for (const entry of readdirSync(goldenDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(goldenDir, entry.name);
  const attempt = validateAttemptRecord(
    JSON.parse(readFileSync(join(dir, "attempt.json"), "utf8")),
  );
  const contextRaw = JSON.parse(readFileSync(join(dir, "context.json"), "utf8"));
  const context: ScoringContext = {
    activity: contextRaw.activity ? ActivityDefinition.parse(contextRaw.activity) : null,
    groundTruth: contextRaw.groundTruth ? GroundTruth.parse(contextRaw.groundTruth) : null,
    responseSets,
    priorStreaks: contextRaw.priorStreaks ?? {},
  };
  const expected = JSON.parse(readFileSync(join(dir, "expected.json"), "utf8"));
  const actual = score(attempt, config, context);
  count += 1;

  const actualJson = JSON.stringify(actual, null, 2);
  const expectedJson = JSON.stringify(expected, null, 2);
  if (actualJson !== expectedJson) {
    failures += 1;
    console.error(`GOLDEN MISMATCH: ${entry.name}`);
    const actualLines = actualJson.split("\n");
    const expectedLines = expectedJson.split("\n");
    for (let i = 0; i < Math.max(actualLines.length, expectedLines.length); i++) {
      if (actualLines[i] !== expectedLines[i]) {
        console.error(`  expected: ${expectedLines[i] ?? "<none>"}`);
        console.error(`  actual:   ${actualLines[i] ?? "<none>"}`);
      }
    }
  }
}

if (failures > 0) {
  console.error(
    `\ngolden set: ${failures} of ${count} mismatched. If a threshold or scorer change is intended, review the differences line by line and regenerate deliberately — that review is the audit trail.`,
  );
  process.exit(1);
}
console.log(`golden set: ${count} records, all scores reproduced exactly`);
