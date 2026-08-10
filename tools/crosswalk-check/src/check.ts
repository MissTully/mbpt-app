// The crosswalk checker: the five coverage checks (INSTR-MBPT-001 section
// 5.7), the evidence contract check (section 4.4), and the release count
// assertions of Appendix B. Runs in continuous integration on every content
// change — the coverage figures are asserted, not trusted.

import { readFileSync } from "node:fs";
import { ActivityCatalog, AttemptRecord } from "@mbpt/core";

const catalog = ActivityCatalog.parse(
  JSON.parse(readFileSync("content/activities.json", "utf8")),
);
const aliases = JSON.parse(readFileSync("content/evidence-aliases.json", "utf8")) as {
  field: Record<string, string>;
  spatial: string[];
  presentational: string[];
};

const activities = catalog.activities;
const release1 = activities.filter((a) => a.release === "Fall");
const release2 = activities.filter((a) => a.release === "Spring");

const ALL_OBJECTIVES = [
  ...["A1", "A2", "A3", "A4", "A5", "A6", "A7"],
  ...["B1", "B2", "B3", "B4", "B5", "B6"],
  ...["C1", "C2", "C3", "C4", "C5", "C6"],
  ...["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
  ...["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8"],
  ...["F1", "F2", "F3", "F4"],
];
const RELEASE_2_OBJECTIVES = new Set(["D4", "D5", "D7", "E3", "E5"]);

const failures: string[] = [];
const warnings: string[] = [];

// ---- Count assertions (Appendix B) ----------------------------------------
if (activities.length !== 61) failures.push(`61 activities expected, found ${activities.length}`);
if (release1.length !== 52) failures.push(`52 release 1 activities expected, found ${release1.length}`);
if (release2.length !== 9) failures.push(`9 release 2 activities expected, found ${release2.length}`);
if (ALL_OBJECTIVES.length !== 39) failures.push("objective list drifted from 39");

// ---- The five coverage checks (INSTR section 5.7) --------------------------
// Computed over release 1, matching the Coverage sheet: the five held-back
// objectives land in check 4's bucket, not in checks 1-3. A Reflect activity
// is both the teaching and the scoring surface for its objectives — it owns
// the trend measures, which the trend engine scores across attempts.
const knownObjectives = new Set(ALL_OBJECTIVES);
for (const activity of activities) {
  for (const objective of activity.objectives) {
    if (!knownObjectives.has(objective)) {
      failures.push(`${activity.activity_id} names unknown objective ${objective}`);
    }
  }
}

type Coverage = { taught: boolean; scored: boolean };
function coverageOver(subset: typeof activities): Map<string, Coverage> {
  const map = new Map<string, Coverage>();
  for (const objective of ALL_OBJECTIVES) map.set(objective, { taught: false, scored: false });
  for (const activity of subset) {
    for (const objective of activity.objectives) {
      const c = map.get(objective);
      if (!c) continue;
      if (activity.type === "Present" || activity.type === "Practice" || activity.type === "Reflect")
        c.taught = true;
      if (activity.type === "Assess" || activity.type === "Reflect") c.scored = true;
    }
  }
  return map;
}

// Checks 1-3 run over the whole curriculum; the five release-2 objectives are
// check 4's bucket, not faults.
const curriculumCoverage = coverageOver(activities);
const checkable = ALL_OBJECTIVES.filter((o) => !RELEASE_2_OBJECTIVES.has(o));
const notCovered = checkable.filter((o) => {
  const c = curriculumCoverage.get(o)!;
  return !c.taught && !c.scored;
});
const taughtNeverScored = checkable.filter((o) => {
  const c = curriculumCoverage.get(o)!;
  return c.taught && !c.scored;
});
const scoredNeverTaught = checkable.filter((o) => {
  const c = curriculumCoverage.get(o)!;
  return c.scored && !c.taught;
});

if (notCovered.length > 0) failures.push(`objectives not covered at all: ${notCovered.join(", ")}`);
if (taughtNeverScored.length > 0) failures.push(`objectives taught but never scored: ${taughtNeverScored.join(", ")}`);
if (scoredNeverTaught.length > 0) failures.push(`objectives scored without any practice first: ${scoredNeverTaught.join(", ")}`);

// Release-1-only view, for checks 4-5 and for surfacing the INSTR 11.4
// consequence: an objective taught in release 1 whose only Assess surface is
// release-2-tagged.
const coverage = coverageOver(release1);
const inRelease1 = (o: string) => {
  const c = coverage.get(o)!;
  return c.taught || c.scored;
};
const assessedOnlyLater = checkable.filter((o) => {
  const r1 = coverage.get(o)!;
  return r1.taught && !r1.scored;
});
if (assessedOnlyLater.length > 0) {
  warnings.push(
    `taught in release 1 but assessed only in a release-2-tagged activity: ${assessedOnlyLater.join(", ")} — consequence of the Module 1 Lesson 1 release tag (INSTR 11.4, owner Melissa Tully)`,
  );
}

// Check 4: objectives unavailable until release 2 — exactly the five named.
const release2Only = ALL_OBJECTIVES.filter((o) => !inRelease1(o));
const expectedR2 = [...RELEASE_2_OBJECTIVES].sort();
const actualR2 = [...release2Only].sort();
if (JSON.stringify(actualR2) !== JSON.stringify(expectedR2)) {
  failures.push(
    `objectives unavailable until release 2: expected [${expectedR2.join(", ")}], found [${actualR2.join(", ")}]`,
  );
}

// Check 5: objectives fully served in release 1 — 34.
const fullyServed = ALL_OBJECTIVES.filter(inRelease1).length;
if (fullyServed !== 34) {
  failures.push(`objectives fully served in release 1: expected 34, found ${fullyServed}`);
}

// ---- The evidence contract check (build blocker on phone-runnable rows) ----
const attemptFields = new Set(Object.keys(AttemptRecord.shape));
for (const [token, field] of Object.entries(aliases.field)) {
  const root = field.split(".")[0]!;
  if (!attemptFields.has(root)) {
    failures.push(`evidence alias "${token}" maps to unknown attempt field "${field}"`);
  }
}

const spatialSet = new Set(aliases.spatial);
const presentationalSet = new Set(aliases.presentational);
const pendingResurfacing: string[] = [];
for (const activity of activities) {
  for (const token of activity.evidence_captured) {
    if (aliases.field[token]) continue;
    if (spatialSet.has(token)) {
      if (activity.release === "Fall") {
        pendingResurfacing.push(`${activity.activity_id}: ${token}`);
      }
      continue;
    }
    if (presentationalSet.has(token)) {
      if (activity.type === "Assess") {
        failures.push(
          `${activity.activity_id} (Assess) captures presentational-only evidence "${token}"`,
        );
      }
      continue;
    }
    const phoneRunnable = activity.surface !== "G";
    const message = `${activity.activity_id} names evidence "${token}" that the attempt record does not carry`;
    if (activity.release === "Fall" && phoneRunnable) failures.push(message);
    else warnings.push(message);
  }
}
if (pendingResurfacing.length > 0) {
  warnings.push(
    `release 1 activities carrying glasses evidence, awaiting the INSTR 11.1 re-surfacing pass (${pendingResurfacing.length} tokens): ${pendingResurfacing.join("; ")}`,
  );
}

// ---- Report ---------------------------------------------------------------
console.log(`crosswalk check: ${activities.length} activities, ${ALL_OBJECTIVES.length} objectives`);
console.log(`  release 1: ${release1.length} activities; release 2: ${release2.length}`);
for (const w of warnings) console.log(`  WARNING: ${w}`);
if (failures.length > 0) {
  console.error("\nCROSSWALK CHECK FAILED:");
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("crosswalk check: no coverage faults");
