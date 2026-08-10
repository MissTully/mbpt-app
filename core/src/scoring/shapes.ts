// The five rule shapes of SDD-MBPT-001 section 4.4.2. Every one of the 39
// objectives is scored by one of these; keeping the shapes explicit is what
// keeps the scorer small and testable rather than 39 special cases.

import type { FindingOutcome } from "../model/score.js";

export interface ShapeResult {
  outcome: FindingOutcome;
  measured: number | null;
  threshold: number | null;
}

/** Shape 1: absolute difference between a learner value and a reference,
 * compared against a configured tolerance. */
export function toleranceComparison(
  learnerValue: number,
  referenceValue: number,
  tolerance: number,
): ShapeResult {
  const diff = Math.abs(learnerValue - referenceValue);
  return {
    outcome: diff <= tolerance ? "met" : "not_met",
    measured: diff,
    threshold: tolerance,
  };
}

/** Shape 2: whether a measured value stayed inside a configured band, with a
 * separate check for excursions rather than only the mean. A learner averaging
 * 2.5 by alternating 0.5 and 5 has not learned control. */
export function bandMembership(
  mean: number,
  band: { min: number; max: number },
  excursionCount: number,
): ShapeResult {
  const meanInBand = mean >= band.min && mean <= band.max;
  return {
    outcome: meanInBand && excursionCount === 0 ? "met" : "not_met",
    measured: mean,
    threshold: band.max,
  };
}

/** Shape 3: a choice compared against a computed correct answer. */
export function discreteCorrectness(allCorrect: boolean, total: number): ShapeResult {
  return {
    outcome: allCorrect ? "met" : "not_met",
    measured: total,
    threshold: total,
  };
}

/** Shape 5: a measured geometry compared against a configured tolerance.
 * Glasses dependent; on a phone attempt this is not assessable and says so
 * rather than pretending ([DECISION-1], phone-only release 1). */
export function geometricCheckUnavailable(): ShapeResult {
  return { outcome: "not_assessable", measured: null, threshold: null };
}
