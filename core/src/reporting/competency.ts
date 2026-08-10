// The competency evidence view: the report a programme director is shown.
// It reads as a record of what was observed and under what conditions.
// Invariant I-12 is enforced here in code: A7 never appears as a measured
// competency in any export, and D1 is labelled partial. A unit test asserts
// both.

import type { ScoredAttempt } from "../scoring/mastery.js";
import { objectiveMastery } from "../scoring/mastery.js";
import type { ThresholdConfig } from "../model/config.js";

// A7 is self report only (invariant I-12). It is excluded from every
// competency export by this constant, which the export function consults and
// a unit test asserts.
export const NEVER_A_COMPETENCY = new Set(["A7"]);

// D1 is tracked by proxy and cannot assess skin contact quality; it is
// reported as partial assessment, and the product says so.
export const PARTIAL_ASSESSMENT: Record<string, string> = {
  D1: "position tracked; skin contact not assessed",
  A6: "completeness only; wording not graded",
};

export interface CompetencyEvidenceRow {
  objective_id: string;
  streak: number;
  mastered: boolean;
  attempts_counted: number;
  assessment_note: string | null; // partial-assessment label, when one applies
  evidence: {
    attempt_id: string;
    activity_id: string;
    scaffold_state: string;
    outcome: string;
    case_id: string | null;
  }[];
}

export function competencyEvidence(
  objectives: readonly string[],
  history: readonly ScoredAttempt[],
  config: ThresholdConfig,
): CompetencyEvidenceRow[] {
  return objectives
    .filter((objective) => !NEVER_A_COMPETENCY.has(objective))
    .map((objective) => {
      const mastery = objectiveMastery(objective, history, config);
      const evidence = history
        .filter((sa) => sa.attempt.objectives.includes(objective))
        .sort((a, b) => a.attempt.seq - b.attempt.seq)
        .map((sa) => ({
          attempt_id: sa.attempt.attempt_id,
          activity_id: sa.attempt.activity_id,
          scaffold_state: sa.attempt.scaffold_state,
          outcome:
            sa.score.findings.find((f) => f.objective_id === objective)?.outcome ??
            "not_assessable",
          case_id: sa.attempt.case_id,
        }));
      return {
        objective_id: objective,
        streak: mastery.streak,
        mastered: mastery.mastered,
        attempts_counted: mastery.attempts_counted,
        assessment_note: PARTIAL_ASSESSMENT[objective] ?? null,
        evidence,
      };
    });
}
