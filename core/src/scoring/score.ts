// The deterministic scorer. Takes one attempt record, one threshold
// configuration and the versioned data the attempt references (case ground
// truth, expected response sets, activity definition, prior streaks). Returns
// a score, findings tied to objectives, and mastery flag updates.
//
// It must not do anything at all except compute: no input or output, no clock
// read, no network call, no random number, no model call, no global state.
// Invariant I-1. Its purity is what makes a score defensible years later.

import type { AttemptRecord, SpokenResponse } from "../model/attempt.js";
import type { ThresholdConfig } from "../model/config.js";
import type { GroundTruth } from "../model/case.js";
import type { ActivityDefinition } from "../model/activity.js";
import type { ExpectedResponseSet } from "../model/responseSet.js";
import type { Finding, MasteryUpdate, ScoreResult } from "../model/score.js";
import {
  bandMembership,
  discreteCorrectness,
  geometricCheckUnavailable,
  toleranceComparison,
} from "./shapes.js";
import { matchExpectedResponse } from "./expectedResponse.js";

// Bumped whenever scoring logic changes; recorded in every score result so a
// re-score knows which logic produced it ([DECISION-4]).
export const SCORER_VERSION = "0.1.0";

export interface ScoringContext {
  activity: ActivityDefinition | null;
  groundTruth: GroundTruth | null;
  responseSets: ExpectedResponseSet[];
  // Streak state per objective before this attempt; the scorer is pure, so
  // history arrives as data. The mastery engine derives it from the ordered
  // attempt store.
  priorStreaks: Record<string, number>;
}

// Objectives whose evidence is a geometric or spatial check. On a phone
// attempt these are not assessable (phone-only release 1; SDD section 12).
const SPATIAL_OBJECTIVES = new Set(["A2", "B4", "D1"]);

// Objectives that are trend measures, never attempt scoped (invariant I-8).
const TREND_OBJECTIVES = new Set(["D6", "F1"]);

function finding(
  objective_id: string,
  outcome: Finding["outcome"],
  finding_code: string,
  measured: number | null = null,
  threshold: number | null = null,
  evidence_refs: string[] = [],
): Finding {
  return { objective_id, outcome, measured, threshold, finding_code, evidence_refs };
}

function responsesFor(attempt: AttemptRecord, objective: string): SpokenResponse[] {
  return attempt.spoken_responses.filter((r) =>
    r.prompt_id.startsWith(`${objective}_`),
  );
}

function gateResponsesFor(attempt: AttemptRecord, objective: string) {
  return attempt.safety_gate_responses.filter((g) =>
    g.gate_id.startsWith(`${objective}:`),
  );
}

/** Score all matched expected-response prompts for one objective. The
 * objective is met when every prompt belonging to it matched its set. */
function scoreExpectedResponses(
  attempt: AttemptRecord,
  objective: string,
  context: ScoringContext,
): Finding {
  const responses = responsesFor(attempt, objective);
  if (responses.length === 0) {
    return finding(objective, "not_assessable", "NO_RESPONSE_CAPTURED");
  }
  let allMatched = true;
  const refs: string[] = [];
  for (const response of responses) {
    const set = context.responseSets.find((s) => s.prompt_id === response.prompt_id);
    if (!set) {
      return finding(objective, "not_assessable", "RESPONSE_SET_MISSING", null, null, [
        `spoken_responses:${response.prompt_id}`,
      ]);
    }
    const result = matchExpectedResponse(response.transcript, response.prompted, set);
    refs.push(`spoken_responses:${response.prompt_id}`);
    if (result.prompted_violation) {
      return finding(objective, "not_met", "RESPONSE_PROMPTED", null, null, refs);
    }
    if (!result.matched) allMatched = false;
  }
  return finding(
    objective,
    allMatched ? "met" : "not_met",
    allMatched ? "RESPONSE_MATCHED" : "RESPONSE_CONCEPTS_MISSING",
    null,
    null,
    refs,
  );
}

/** Read a numeric value the learner entered through a structured prompt, e.g.
 * the palpated estimate. Deterministic parse of the stored transcript. */
function numericResponse(attempt: AttemptRecord, promptId: string): number | null {
  const response = attempt.spoken_responses.find((r) => r.prompt_id === promptId);
  if (!response) return null;
  const match = response.transcript.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function markOf(attempt: AttemptRecord, type: "systolic" | "diastolic") {
  // The last mark of the type is the learner's standing declaration; earlier
  // marks of the same type were superseded within the attempt.
  const marks = attempt.marks.filter((m) => m.type === type);
  return marks.length > 0 ? marks[marks.length - 1]! : null;
}

function markInTrackingGap(attempt: AttemptRecord, t_ms: number): boolean {
  return attempt.tracking_gaps.some((g) => t_ms >= g.start_ms && t_ms <= g.end_ms);
}

/** Marked value against ground truth, with the tracking-gap rule of
 * SDD-MBPT-001 section 12: a gap overlapping the marking window makes the
 * objective not assessable rather than failed. */
function scoreMark(
  attempt: AttemptRecord,
  objective: string,
  type: "systolic" | "diastolic",
  reference: number | null,
  tolerance: number,
): Finding {
  if (reference === null) {
    return finding(objective, "not_assessable", "NO_GROUND_TRUTH");
  }
  const mark = markOf(attempt, type);
  if (!mark) {
    return finding(objective, "not_met", "MARK_ABSENT", null, tolerance);
  }
  if (markInTrackingGap(attempt, mark.t_ms)) {
    return finding(objective, "not_assessable", "TRACKING_GAP_IN_MARKING_WINDOW", null, tolerance, [
      `marks:${type}`,
      "tracking_gaps",
    ]);
  }
  const shape = toleranceComparison(mark.pressure_mmhg, reference, tolerance);
  return finding(
    objective,
    shape.outcome,
    shape.outcome === "met" ? "MARK_WITHIN_TOLERANCE" : "MARK_OUT_OF_TOLERANCE",
    shape.measured,
    shape.threshold,
    [`marks:${type}`],
  );
}

function scoreObjective(
  attempt: AttemptRecord,
  objective: string,
  config: ThresholdConfig,
  context: ScoringContext,
): Finding {
  if (TREND_OBJECTIVES.has(objective)) {
    // Invariant I-8: trend measures never contribute to an attempt score.
    return finding(objective, "not_assessable", "TREND_SCOPED");
  }
  if (SPATIAL_OBJECTIVES.has(objective) && attempt.surface === "phone") {
    const shape = geometricCheckUnavailable();
    return finding(objective, shape.outcome, "SURFACE_NOT_CAPABLE");
  }
  const gt = context.groundTruth;

  switch (objective) {
    // Domain A ------------------------------------------------------------
    case "A1":
    case "A5": {
      const gates = gateResponsesFor(attempt, objective);
      if (gates.length === 0) return finding(objective, "not_assessable", "NO_GATE_RESPONSES");
      const shape = discreteCorrectness(gates.every((g) => g.correct), gates.length);
      return finding(
        objective,
        shape.outcome,
        shape.outcome === "met" ? "GATES_ALL_CORRECT" : "GATE_DECISION_INCORRECT",
        gates.filter((g) => g.correct).length,
        gates.length,
        gates.map((g) => `safety_gate_responses:${g.gate_id}`),
      );
    }
    case "A3":
      return scoreExpectedResponses(attempt, "A3", context);
    case "A4": {
      const rest = attempt.timer_events.find((t) => t.timer_id === "rest");
      if (!rest) return finding(objective, "not_assessable", "NO_TIMER_EVENT");
      const seconds = (rest.ended_ms - rest.started_ms) / 1000;
      const outcome = seconds >= config.rest_duration_s ? "met" : "not_met";
      return finding(
        objective,
        outcome,
        outcome === "met" ? "REST_INTERVAL_MET" : "REST_INTERVAL_SHORT",
        seconds,
        config.rest_duration_s,
        ["timer_events:rest"],
      );
    }
    case "A6": {
      // Partial assessment: completeness only, wording not graded.
      const explained = attempt.steps_completed.includes("explain_procedure");
      return finding(
        objective,
        explained ? "met" : "not_met",
        explained ? "EXPLANATION_RECORDED" : "EXPLANATION_ABSENT",
        null,
        null,
        ["steps_completed"],
      );
    }
    case "A7":
      // Invariant I-12: self report only, never a measured competency. The
      // reporting layer excludes A7 from every competency export, and a unit
      // test asserts it.
      return finding(
        objective,
        "not_assessable",
        "A7_SELF_REPORT_ONLY",
        null,
        null,
        ["steps_completed"],
      );

    // Domain B ------------------------------------------------------------
    case "B1": {
      if (
        attempt.arm_circumference_entered_cm === null ||
        attempt.arm_circumference_reference_cm === null
      ) {
        return finding(objective, "not_assessable", "CIRCUMFERENCE_NOT_CAPTURED");
      }
      const shape = toleranceComparison(
        attempt.arm_circumference_entered_cm,
        attempt.arm_circumference_reference_cm,
        config.circumference_agreement_cm,
      );
      return finding(
        objective,
        shape.outcome,
        shape.outcome === "met" ? "CIRCUMFERENCE_WITHIN_TOLERANCE" : "CIRCUMFERENCE_OUT_OF_TOLERANCE",
        shape.measured,
        shape.threshold,
        ["arm_circumference_entered_cm", "arm_circumference_reference_cm"],
      );
    }
    case "B2": {
      // Blocked by the cuff bladder fit standard decision (INSTR 11.2). The
      // configuration holds null until the decision closes in writing, and
      // this objective says so rather than guessing.
      if (config.cuff_bladder_fit_standard === null) {
        return finding(objective, "not_assessable", "CONFIG_DECISION_PENDING_CUFF_STANDARD");
      }
      if (attempt.cuff_selected === null || attempt.arm_circumference_reference_cm === null) {
        return finding(objective, "not_assessable", "CUFF_SELECTION_NOT_CAPTURED");
      }
      const correct = cuffCategoryFor(
        attempt.arm_circumference_reference_cm,
        config.cuff_bladder_fit_standard,
      );
      const shape = discreteCorrectness(attempt.cuff_selected === correct, 1);
      return finding(
        objective,
        shape.outcome,
        shape.outcome === "met" ? "CUFF_CORRECT" : "CUFF_INCORRECT",
        null,
        null,
        ["cuff_selected", "arm_circumference_reference_cm"],
      );
    }
    case "B3":
    case "B5":
      return scoreExpectedResponses(attempt, objective, context);
    case "B6": {
      const gates = gateResponsesFor(attempt, "B6");
      if (gates.length === 0) return finding(objective, "not_assessable", "NO_GATE_RESPONSES");
      const shape = discreteCorrectness(gates.every((g) => g.correct), gates.length);
      return finding(
        objective,
        shape.outcome,
        shape.outcome === "met" ? "ALTERNATIVE_STATED" : "PROCEEDED_WITHOUT_FIT",
        null,
        null,
        gates.map((g) => `safety_gate_responses:${g.gate_id}`),
      );
    }

    // Domain C ------------------------------------------------------------
    case "C1": {
      if (!gt) return finding(objective, "not_assessable", "NO_GROUND_TRUTH");
      const palpated = numericResponse(attempt, "C1_palpated_estimate");
      if (palpated === null) return finding(objective, "not_assessable", "PALPATED_ESTIMATE_NOT_CAPTURED");
      const shape = toleranceComparison(palpated, gt.systolic_mmhg, config.palpation_agreement_mmhg);
      return finding(
        objective,
        shape.outcome,
        shape.outcome === "met" ? "PALPATION_AGREES" : "PALPATION_DISAGREES",
        shape.measured,
        shape.threshold,
        ["spoken_responses:C1_palpated_estimate"],
      );
    }
    case "C2": {
      if (!attempt.pressure_trace) return finding(objective, "not_assessable", "NO_PRESSURE_TRACE");
      const palpated = numericResponse(attempt, "C1_palpated_estimate");
      const baseline = palpated ?? gt?.systolic_mmhg ?? null;
      if (baseline === null) return finding(objective, "not_assessable", "NO_INFLATION_BASELINE");
      const required = baseline + config.inflation_margin_mmhg;
      const outcome = attempt.pressure_trace.peak_mmhg >= required ? "met" : "not_met";
      return finding(
        objective,
        outcome,
        outcome === "met" ? "INFLATION_ADEQUATE" : "INFLATION_INADEQUATE",
        attempt.pressure_trace.peak_mmhg,
        required,
        ["pressure_trace.peak_mmhg"],
      );
    }
    case "C3": {
      if (!attempt.pressure_trace) return finding(objective, "not_assessable", "NO_PRESSURE_TRACE");
      const shape = bandMembership(
        attempt.pressure_trace.mean_rate_mmhg_per_s,
        config.deflation_rate_band_mmhg_per_s,
        attempt.rate_excursions.length,
      );
      const hasExcursions = attempt.rate_excursions.length > 0;
      // When excursions are the fault, the number the learner sees is the
      // worst excursion rate, not the mean — the mean is what hides the fault.
      const band = config.deflation_rate_band_mmhg_per_s;
      const bandMid = (band.min + band.max) / 2;
      const worstExcursion = hasExcursions
        ? attempt.rate_excursions.reduce((worst, e) =>
            Math.abs(e.rate_mmhg_per_s - bandMid) > Math.abs(worst.rate_mmhg_per_s - bandMid) ? e : worst,
          ).rate_mmhg_per_s
        : null;
      return finding(
        objective,
        shape.outcome,
        shape.outcome === "met"
          ? "RATE_CONTROLLED"
          : hasExcursions
            ? "RATE_EXCURSION_PRESENT"
            : "RATE_MEAN_OUT_OF_BAND",
        shape.outcome !== "met" && hasExcursions ? worstExcursion : shape.measured,
        shape.threshold,
        ["pressure_trace.mean_rate_mmhg_per_s", "rate_excursions"],
      );
    }
    case "C4":
      return scoreExpectedResponses(attempt, "C4", context);
    case "C5": {
      const bad = attempt.reinflation_events.filter((e) => e.pressure_at_reinflation_mmhg > 0);
      const outcome = bad.length === 0 ? "met" : "not_met";
      return finding(
        objective,
        outcome,
        outcome === "met" ? "NO_PARTIAL_REINFLATION" : "REINFLATED_ON_PARTIAL_CUFF",
        bad.length,
        0,
        ["reinflation_events"],
      );
    }
    case "C6": {
      if (!attempt.pressure_trace) return finding(objective, "not_assessable", "NO_PRESSURE_TRACE");
      if (attempt.rate_excursions.length === 0) {
        // Nothing went out of band, so there was nothing to detect and
        // correct. The objective needs a fault to exercise it.
        return finding(objective, "not_assessable", "NO_EXCURSION_OCCURRED");
      }
      const samples = attempt.pressure_trace.samples;
      const traceEnd = samples.length > 0 ? samples[samples.length - 1]!.t_ms : 0;
      const corrected = attempt.rate_excursions.every((e) => e.end_ms < traceEnd);
      const restarted = attempt.reinflation_events.length > 0;
      const outcome = corrected && !restarted ? "met" : "not_met";
      return finding(
        objective,
        outcome,
        outcome === "met" ? "EXCURSION_CORRECTED_IN_ATTEMPT" : "EXCURSION_NOT_CORRECTED",
        attempt.rate_excursions.length,
        null,
        ["rate_excursions", "reinflation_events"],
      );
    }

    // Domain D ------------------------------------------------------------
    case "D2":
      return scoreMark(attempt, "D2", "systolic", gt?.systolic_mmhg ?? null, config.marking_tolerance_mmhg);
    case "D3":
      return scoreMark(attempt, "D3", "diastolic", gt?.diastolic_mmhg ?? null, config.marking_tolerance_mmhg);
    case "D4":
    case "D5":
    case "D7":
      // Release 2: blocked by cases C012, C014, C011 (INSTR section 5.6).
      return finding(objective, "not_assessable", "RELEASE_2_CASE_UNAVAILABLE");
    case "D8":
      return scoreExpectedResponses(attempt, "D8", context);

    // Domain E ------------------------------------------------------------
    case "E1":
    case "E2":
    case "E4":
    case "E6":
    case "E7":
    case "E8":
      return scoreExpectedResponses(attempt, objective, context);
    case "E3":
    case "E5":
      return finding(objective, "not_assessable", "RELEASE_2_CASE_UNAVAILABLE");

    // Domain F ------------------------------------------------------------
    case "F2":
    case "F4":
      return scoreExpectedResponses(attempt, objective, context);
    case "F3": {
      // Never pass or fail (SDD section 12): the finding records that a
      // choice was made with a justification; Reflect activities do not
      // count toward mastery.
      if (!attempt.learner_selection || attempt.learner_selection.justification.trim() === "") {
        return finding(objective, "not_assessable", "SELECTION_NOT_RECORDED");
      }
      return finding(objective, "met", "SELECTION_WITH_JUSTIFICATION", null, null, [
        "learner_selection",
      ]);
    }

    default:
      return finding(objective, "not_assessable", "OBJECTIVE_UNKNOWN");
  }
}

// Cuff size category tables per standard. These are rubric content; they go
// live only when cuff_bladder_fit_standard is set in configuration (B2 is
// not_assessable until then), and the boundary values themselves belong to
// the standard named, not to this codebase.
export function cuffCategoryFor(
  circumference_cm: number,
  standard: "current_professional_statement" | "legacy_40_80_proportional",
): string {
  // Both standards use the same nominal category names; they differ at
  // boundary circumferences. Until the decision closes these tables are
  // placeholders exercised only by tests.
  const boundaries =
    standard === "current_professional_statement"
      ? [26, 34, 44] // small_adult <=26 < adult <=34 < large_adult <=44 < extra_large
      : [25, 33, 43];
  if (circumference_cm <= boundaries[0]!) return "small_adult";
  if (circumference_cm <= boundaries[1]!) return "adult";
  if (circumference_cm <= boundaries[2]!) return "large_adult";
  return "extra_large";
}

/**
 * Score one attempt. Pure: same inputs, same output, forever.
 */
export function score(
  attempt: AttemptRecord,
  config: ThresholdConfig,
  context: ScoringContext,
): ScoreResult {
  const findings: Finding[] = attempt.objectives.map((objective) =>
    scoreObjective(attempt, objective, config, context),
  );

  const assessable = findings.filter((f) => f.outcome !== "not_assessable");
  const met = assessable.filter((f) => f.outcome === "met").length;
  const total =
    assessable.length === 0 ? 0 : Math.round((met / assessable.length) * 100);

  const isAssess = context.activity?.type === "Assess";
  const unaided = attempt.scaffold_state === "unaided";

  const mastery_updates: MasteryUpdate[] = findings.map((f) => {
    const prior = context.priorStreaks[f.objective_id] ?? 0;
    const counts = isAssess && unaided && f.outcome === "met";
    let streak_after = prior;
    if (counts) streak_after = prior + 1;
    else if (isAssess && unaided && f.outcome === "not_met") streak_after = 0;
    return { objective_id: f.objective_id, counts_toward_mastery: counts, streak_after };
  });

  return {
    attempt_id: attempt.attempt_id,
    config_version: config.version,
    scorer_version: SCORER_VERSION,
    total,
    nothing_assessable: assessable.length === 0,
    findings,
    mastery_updates,
  };
}
