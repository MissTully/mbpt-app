import { describe, expect, it } from "vitest";
import {
  score,
  validateAttemptRecord,
  loadConfig,
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

function context(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    activity: fixtureActivity(),
    groundTruth: fixtureGroundTruth,
    responseSets: fixtureResponseSets(),
    priorStreaks: {},
    ...overrides,
  };
}

describe("attempt record validation (invariant I-4)", () => {
  it("rejects a record missing scaffold_state at write time", () => {
    const attempt = makeAttempt() as Record<string, unknown>;
    delete attempt["scaffold_state"];
    expect(() => validateAttemptRecord(attempt)).toThrow();
  });

  it("rejects unknown fields rather than silently carrying them", () => {
    const attempt = { ...makeAttempt(), surprise: 1 };
    expect(() => validateAttemptRecord(attempt)).toThrow();
  });

  it("accepts a complete record", () => {
    expect(() => validateAttemptRecord(makeAttempt())).not.toThrow();
  });
});

describe("configuration loading (invariant I-2)", () => {
  it("refuses to load an invalid configuration rather than defaulting", () => {
    expect(() => loadConfig({ version: "x" })).toThrow(/refused to load/);
  });

  it("refuses an inverted band", () => {
    const bad = { ...config, deflation_rate_band_mmhg_per_s: { min: 3, max: 2 } };
    expect(() => loadConfig(bad)).toThrow();
  });
});

describe("scorer determinism (invariant I-1)", () => {
  it("produces identical output for identical input", () => {
    const attempt = makeAttempt();
    const a = score(attempt, config, context());
    const b = score(attempt, config, context());
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});

describe("marking (D2, D3)", () => {
  it("scores a mark within tolerance as met", () => {
    const result = score(makeAttempt(), config, context());
    expect(result.findings.find((f) => f.objective_id === "D2")?.outcome).toBe("met");
    expect(result.findings.find((f) => f.objective_id === "D3")?.outcome).toBe("met");
    expect(result.total).toBe(100);
  });

  it("scores a mark out of tolerance as not_met with the measured difference", () => {
    const attempt = makeAttempt({
      marks: [
        { type: "systolic", t_ms: 12000, pressure_mmhg: 144, source: "voice_onset" },
        { type: "diastolic", t_ms: 32000, pressure_mmhg: 86, source: "voice_onset" },
      ],
    });
    const d2 = score(attempt, config, context()).findings.find((f) => f.objective_id === "D2");
    expect(d2?.outcome).toBe("not_met");
    expect(d2?.measured).toBe(10);
    expect(d2?.threshold).toBe(4);
  });

  it("flags, not fails, a mark inside a tracking gap (not_assessable)", () => {
    const attempt = makeAttempt({
      tracking_gaps: [{ start_ms: 11000, end_ms: 13000, reason: "dial_lost" }],
    });
    const d2 = score(attempt, config, context()).findings.find((f) => f.objective_id === "D2");
    expect(d2?.outcome).toBe("not_assessable");
    expect(d2?.finding_code).toBe("TRACKING_GAP_IN_MARKING_WINDOW");
  });

  it("uses the last mark of a type as the standing declaration", () => {
    const attempt = makeAttempt({
      marks: [
        { type: "systolic", t_ms: 10000, pressure_mmhg: 170, source: "voice_onset" },
        { type: "systolic", t_ms: 12000, pressure_mmhg: 136, source: "voice_onset" },
        { type: "diastolic", t_ms: 32000, pressure_mmhg: 86, source: "voice_onset" },
      ],
    });
    expect(
      score(attempt, config, context()).findings.find((f) => f.objective_id === "D2")?.outcome,
    ).toBe("met");
  });
});

describe("deflation control (C3): the excursion check is the objective", () => {
  it("fails a correct mean with excursions present", () => {
    const attempt = makeAttempt({
      objectives: ["C3"],
      rate_excursions: [{ start_ms: 5000, end_ms: 7000, rate_mmhg_per_s: 4.8 }],
    });
    const c3 = score(attempt, config, context()).findings.find((f) => f.objective_id === "C3");
    expect(c3?.outcome).toBe("not_met");
    expect(c3?.finding_code).toBe("RATE_EXCURSION_PRESENT");
  });

  it("passes a correct mean with no excursions", () => {
    const attempt = makeAttempt({ objectives: ["C3"] });
    expect(
      score(attempt, config, context()).findings.find((f) => f.objective_id === "C3")?.outcome,
    ).toBe("met");
  });
});

describe("safety gates (A1)", () => {
  it("requires every gate decision correct", () => {
    const attempt = makeAttempt({
      objectives: ["A1"],
      safety_gate_responses: [
        { gate_id: "A1:left_fistula", response: "use_other_arm", correct: true },
        { gate_id: "A1:iv_line", response: "proceed", correct: false },
      ],
    });
    expect(
      score(attempt, config, context()).findings.find((f) => f.objective_id === "A1")?.outcome,
    ).toBe("not_met");
  });
});

describe("expected response matching (Domain E)", () => {
  it("meets E4 on an unprompted answer containing all required concepts", () => {
    const attempt = makeAttempt({
      objectives: ["E4"],
      spoken_responses: [
        {
          prompt_id: "E4_crisis_escalation",
          transcript: "That is a hypertensive crisis, I would notify the charge nurse now",
          t_ms: 1000,
          prompted: false,
          input_mode: "structured",
        },
      ],
    });
    expect(
      score(attempt, config, context()).findings.find((f) => f.objective_id === "E4")?.outcome,
    ).toBe("met");
  });

  it("fails E4 when the learner needed prompting (the prompted flag participates)", () => {
    const attempt = makeAttempt({
      objectives: ["E4"],
      spoken_responses: [
        {
          prompt_id: "E4_crisis_escalation",
          transcript: "That is a crisis, I would notify the nurse",
          t_ms: 1000,
          prompted: true,
          input_mode: "structured",
        },
      ],
    });
    const e4 = score(attempt, config, context()).findings.find((f) => f.objective_id === "E4");
    expect(e4?.outcome).toBe("not_met");
    expect(e4?.finding_code).toBe("RESPONSE_PROMPTED");
  });

  it("fails on a disqualifying concept", () => {
    const attempt = makeAttempt({
      objectives: ["E4"],
      spoken_responses: [
        {
          prompt_id: "E4_crisis_escalation",
          transcript: "Crisis over 180, notify the nurse... or just document it and carry on",
          t_ms: 1000,
          prompted: false,
          input_mode: "structured",
        },
      ],
    });
    expect(
      score(attempt, config, context()).findings.find((f) => f.objective_id === "E4")?.outcome,
    ).toBe("not_met");
  });
});

describe("phone surface limits ([DECISION-1])", () => {
  it("marks spatial objectives not_assessable on phone rather than pretending", () => {
    const attempt = makeAttempt({ objectives: ["B4"] });
    const b4 = score(attempt, config, context()).findings.find((f) => f.objective_id === "B4");
    expect(b4?.outcome).toBe("not_assessable");
    expect(b4?.finding_code).toBe("SURFACE_NOT_CAPABLE");
  });
});

describe("B2 blocked by the cuff standard decision (INSTR 11.2)", () => {
  it("scores not_assessable while cuff_bladder_fit_standard is unset", () => {
    const attempt = makeAttempt({
      objectives: ["B2"],
      cuff_selected: "adult",
      arm_circumference_reference_cm: 30,
    });
    const b2 = score(attempt, config, context()).findings.find((f) => f.objective_id === "B2");
    expect(b2?.outcome).toBe("not_assessable");
    expect(b2?.finding_code).toBe("CONFIG_DECISION_PENDING_CUFF_STANDARD");
  });
});

describe("trend-scoped objectives (invariant I-8)", () => {
  it("never scores D6 within an attempt", () => {
    const attempt = makeAttempt({ objectives: ["D6"] });
    const d6 = score(attempt, config, context()).findings.find((f) => f.objective_id === "D6");
    expect(d6?.outcome).toBe("not_assessable");
    expect(d6?.finding_code).toBe("TREND_SCOPED");
  });
});

describe("nothing assessable", () => {
  it("reports nothing_assessable rather than a meaningful-looking zero", () => {
    const attempt = makeAttempt({ objectives: ["A7"] });
    const result = score(attempt, config, context());
    expect(result.nothing_assessable).toBe(true);
    expect(result.total).toBe(0);
  });
});

describe("mastery updates", () => {
  it("counts only unaided Assess met findings toward mastery", () => {
    const attempt = makeAttempt();
    const result = score(attempt, config, context({ priorStreaks: { D2: 1 } }));
    const d2 = result.mastery_updates.find((m) => m.objective_id === "D2");
    expect(d2?.counts_toward_mastery).toBe(true);
    expect(d2?.streak_after).toBe(2);
  });

  it("does not count scaffolded success (invariant I-4's purpose)", () => {
    const attempt = makeAttempt({ scaffold_state: "guided" });
    const result = score(attempt, config, context({ priorStreaks: { D2: 1 } }));
    const d2 = result.mastery_updates.find((m) => m.objective_id === "D2");
    expect(d2?.counts_toward_mastery).toBe(false);
    expect(d2?.streak_after).toBe(1);
  });

  it("resets the streak on not_met", () => {
    const attempt = makeAttempt({
      marks: [
        { type: "systolic", t_ms: 12000, pressure_mmhg: 160, source: "voice_onset" },
        { type: "diastolic", t_ms: 32000, pressure_mmhg: 86, source: "voice_onset" },
      ],
    });
    const result = score(attempt, config, context({ priorStreaks: { D2: 2 } }));
    expect(result.mastery_updates.find((m) => m.objective_id === "D2")?.streak_after).toBe(0);
  });
});
