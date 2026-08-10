// The mastery engine. Mastery is not the same as passing: passing is one
// attempt at or above threshold; mastery is the pattern across attempts under
// the correct conditions. SDD-MBPT-001 section 4.6.
//
// Derived state only: everything here is rebuildable from the ordered attempt
// records plus their score results. If mastery state were ever the only copy
// of a fact, a corrupted cache would destroy a learner's record.

import type { AttemptRecord } from "../model/attempt.js";
import type { ScoreResult } from "../model/score.js";
import type { ThresholdConfig } from "../model/config.js";
import type { ActivityDefinition } from "../model/activity.js";

export interface ScoredAttempt {
  attempt: AttemptRecord;
  score: ScoreResult;
  activity: ActivityDefinition | null;
}

export interface ObjectiveMastery {
  objective_id: string;
  streak: number;
  mastered: boolean;
  attempts_counted: number;
}

export interface TerminalObjectiveMastery {
  mastered: boolean;
  consecutive_met: number;
  habitus_categories_in_streak: string[];
  cases_in_streak: string[];
  // Null when evaluable; otherwise the reason full evaluation is impossible
  // (e.g. [DECISION-5]: habitus category missing from the records).
  blocked_reason: string | null;
}

function isUnaidedAssess(sa: ScoredAttempt): boolean {
  return sa.activity?.type === "Assess" && sa.attempt.scaffold_state === "unaided";
}

/** Per-objective mastery streaks: consecutive unaided Assess attempts meeting
 * the objective. Attempts where the objective was not assessable neither
 * extend nor break the streak. */
export function objectiveMastery(
  objective_id: string,
  history: readonly ScoredAttempt[],
  config: ThresholdConfig,
): ObjectiveMastery {
  const ordered = [...history].sort((a, b) => a.attempt.seq - b.attempt.seq);
  let streak = 0;
  let counted = 0;
  for (const sa of ordered) {
    if (!sa.attempt.objectives.includes(objective_id)) continue;
    if (!isUnaidedAssess(sa)) continue;
    const finding = sa.score.findings.find((f) => f.objective_id === objective_id);
    if (!finding || finding.outcome === "not_assessable") continue;
    counted += 1;
    streak = finding.outcome === "met" ? streak + 1 : 0;
  }
  return {
    objective_id,
    streak,
    mastered: streak >= config.sequence_mastery_consecutive,
    attempts_counted: counted,
  };
}

// The full unaided end-to-end measurement activity; TO-1 is evaluated over
// its attempts (SDD-MBPT-001 section 4.6).
export const TERMINAL_ACTIVITY_ID = "A-3.4.4";

function attemptMeetsTO1(sa: ScoredAttempt, config: ThresholdConfig): boolean {
  const d2 = sa.score.findings.find((f) => f.objective_id === "D2");
  const d3 = sa.score.findings.find((f) => f.objective_id === "D3");
  return (
    d2?.outcome === "met" &&
    d3?.outcome === "met" &&
    sa.score.total >= config.sequence_mastery_score
  );
}

/** TO-1: three consecutive attempts meeting the terminal objective, across at
 * least two body habitus categories and at least two clinical cases, with no
 * scaffolding present. Synthetic cases never satisfy the case-variety
 * condition. Until [DECISION-5] closes, records without habitus_category make
 * full evaluation impossible, and this function says so rather than guessing. */
export function terminalObjectiveMastery(
  history: readonly ScoredAttempt[],
  config: ThresholdConfig,
  syntheticCaseIds: ReadonlySet<string>,
): TerminalObjectiveMastery {
  const ordered = [...history]
    .filter((sa) => sa.attempt.activity_id === TERMINAL_ACTIVITY_ID && isUnaidedAssess(sa))
    .sort((a, b) => a.attempt.seq - b.attempt.seq);

  // Walk from most recent backwards collecting the current consecutive run.
  const run: ScoredAttempt[] = [];
  for (let i = ordered.length - 1; i >= 0; i--) {
    const sa = ordered[i]!;
    if (attemptMeetsTO1(sa, config)) run.unshift(sa);
    else break;
  }

  const habitus = new Set<string>();
  const cases = new Set<string>();
  let habitusMissing = false;
  for (const sa of run) {
    if (sa.attempt.habitus_category === null) habitusMissing = true;
    else habitus.add(sa.attempt.habitus_category);
    if (sa.attempt.case_id !== null && !syntheticCaseIds.has(sa.attempt.case_id)) {
      cases.add(sa.attempt.case_id);
    }
  }

  const enoughConsecutive = run.length >= config.sequence_mastery_consecutive;
  const blocked_reason =
    enoughConsecutive && habitusMissing
      ? "DECISION-5: habitus_category absent from one or more attempts in the streak; TO-1 mastery cannot be fully evaluated"
      : null;

  return {
    mastered:
      enoughConsecutive && !habitusMissing && habitus.size >= 2 && cases.size >= 2,
    consecutive_met: run.length,
    habitus_categories_in_streak: [...habitus].sort(),
    cases_in_streak: [...cases].sort(),
    blocked_reason,
  };
}
