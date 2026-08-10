import { describe, expect, it } from "vitest";
import {
  competencyEvidence,
  objectiveMastery,
  score,
  terminalDigitTrend,
  terminalObjectiveMastery,
  type ScoredAttempt,
  type ScoringContext,
} from "../src/index.js";
import {
  fixtureActivity,
  fixtureConfig,
  fixtureGroundTruth,
  fixtureResponseSets,
  makeAttempt,
} from "./fixtures.js";

const config = fixtureConfig();

function scored(overrides: Parameters<typeof makeAttempt>[0] = {}): ScoredAttempt {
  const attempt = makeAttempt(overrides);
  const context: ScoringContext = {
    activity: fixtureActivity(),
    groundTruth: fixtureGroundTruth,
    responseSets: fixtureResponseSets(),
    priorStreaks: {},
  };
  return { attempt, score: score(attempt, config, context), activity: fixtureActivity() };
}

function goodMarks() {
  return [
    { type: "systolic" as const, t_ms: 12000, pressure_mmhg: 136, source: "voice_onset" as const },
    { type: "diastolic" as const, t_ms: 32000, pressure_mmhg: 86, source: "voice_onset" as const },
  ];
}

function badMarks() {
  return [
    { type: "systolic" as const, t_ms: 12000, pressure_mmhg: 150, source: "voice_onset" as const },
    { type: "diastolic" as const, t_ms: 32000, pressure_mmhg: 86, source: "voice_onset" as const },
  ];
}

describe("objective mastery streaks", () => {
  it("requires three consecutive unaided met attempts", () => {
    const history = [scored(), scored(), scored()];
    const mastery = objectiveMastery("D2", history, config);
    expect(mastery.streak).toBe(3);
    expect(mastery.mastered).toBe(true);
  });

  it("resets on a not_met attempt", () => {
    const history = [scored(), scored({ marks: badMarks() }), scored()];
    expect(objectiveMastery("D2", history, config).streak).toBe(1);
  });

  it("ignores scaffolded attempts entirely", () => {
    const history = [scored(), scored({ scaffold_state: "guided" }), scored(), scored()];
    expect(objectiveMastery("D2", history, config).streak).toBe(3);
  });
});

describe("TO-1 mastery: the four data requirements", () => {
  const synthetic = new Set<string>();

  it("masters on 3 consecutive across 2 habitus categories and 2 cases", () => {
    const history = [
      scored({ habitus_category: "adult", case_id: "C001" }),
      scored({ habitus_category: "large_adult", case_id: "C002" }),
      scored({ habitus_category: "adult", case_id: "C001" }),
    ];
    const result = terminalObjectiveMastery(history, config, synthetic);
    expect(result.mastered).toBe(true);
    expect(result.consecutive_met).toBe(3);
  });

  it("refuses mastery on three attempts against the same slim arm", () => {
    const history = [
      scored({ habitus_category: "adult", case_id: "C001" }),
      scored({ habitus_category: "adult", case_id: "C002" }),
      scored({ habitus_category: "adult", case_id: "C003" }),
    ];
    expect(terminalObjectiveMastery(history, config, synthetic).mastered).toBe(false);
  });

  it("refuses mastery on the same recording — memorisation, not competence", () => {
    const history = [
      scored({ habitus_category: "adult", case_id: "C001" }),
      scored({ habitus_category: "large_adult", case_id: "C001" }),
      scored({ habitus_category: "adult", case_id: "C001" }),
    ];
    expect(terminalObjectiveMastery(history, config, synthetic).mastered).toBe(false);
  });

  it("excludes synthetic cases from case variety", () => {
    const history = [
      scored({ habitus_category: "adult", case_id: "C001" }),
      scored({ habitus_category: "large_adult", case_id: "C000-SYNTH" }),
      scored({ habitus_category: "adult", case_id: "C001" }),
    ];
    expect(
      terminalObjectiveMastery(history, config, new Set(["C000-SYNTH"])).mastered,
    ).toBe(false);
  });

  it("reports DECISION-5 blockage rather than guessing when habitus is missing", () => {
    const history = [
      scored({ habitus_category: null, case_id: "C001" }),
      scored({ habitus_category: "large_adult", case_id: "C002" }),
      scored({ habitus_category: "adult", case_id: "C001" }),
    ];
    const result = terminalObjectiveMastery(history, config, synthetic);
    expect(result.mastered).toBe(false);
    expect(result.blocked_reason).toContain("DECISION-5");
  });
});

describe("the window rule (UXS section 3, trend engine)", () => {
  it("says how many attempts are needed rather than drawing a chart of nine points", () => {
    const attempts = Array.from({ length: 9 }, () => makeAttempt());
    const trend = terminalDigitTrend(attempts, config);
    expect(trend.ready).toBe(false);
    if (!trend.ready) expect(trend.attempts_needed).toBe(1);
  });

  it("detects a rounding spike at 0 and 5 across the window", () => {
    const attempts = Array.from({ length: 10 }, () =>
      makeAttempt({
        marks: [
          { type: "systolic", t_ms: 1, pressure_mmhg: 140, source: "voice_onset" },
          { type: "diastolic", t_ms: 2, pressure_mmhg: 85, source: "voice_onset" },
        ],
      }),
    );
    const trend = terminalDigitTrend(attempts, config);
    expect(trend.ready).toBe(true);
    if (trend.ready) expect(trend.value.biased).toBe(true);
  });
});

describe("competency evidence export (invariant I-12)", () => {
  it("never includes A7 as a measured competency", () => {
    const history = [scored({ objectives: ["A7", "D2"] })];
    const rows = competencyEvidence(["A7", "D2"], history, config);
    expect(rows.some((r) => r.objective_id === "A7")).toBe(false);
    expect(rows.some((r) => r.objective_id === "D2")).toBe(true);
  });

  it("labels D1 as partial assessment", () => {
    const rows = competencyEvidence(["D1"], [], config);
    expect(rows[0]?.assessment_note).toContain("skin contact not assessed");
  });
});
