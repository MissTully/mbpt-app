// The trend engine: measures that have no meaning within a single attempt.
// Invariant I-8: computed in a separate pass over a window of attempts, and
// the results feed Reflect activities and the instructor report, never the
// attempt score. The output type is deliberately not accepted anywhere in
// ScoreResult — type separation is the enforcement (ARC-MBPT-001 section 6).

import type { AttemptRecord } from "../model/attempt.js";
import type { ThresholdConfig } from "../model/config.js";

// The window rule: below the window size a trend measure has no meaning and
// must not be shown as though it did. `ready: false` carries the number of
// attempts still needed, and the screen says so instead of drawing a chart.
export type TrendMeasure<T> =
  | { ready: true; window_size: number; value: T }
  | { ready: false; window_size: number; attempts_needed: number };

export interface TerminalDigitTrend {
  distribution: Record<string, number>;
  share_ending_0_or_5: number;
  biased: boolean;
}

/** Terminal digit bias (objectives D6, F1): distribution of the final digit
 * of all marked values across the window. A learner reading correctly to the
 * nearest 2 mmHg produces a roughly even spread across even digits; a learner
 * rounding produces a spike at 0 and 5. */
export function terminalDigitTrend(
  attempts: readonly AttemptRecord[],
  config: ThresholdConfig,
): TrendMeasure<TerminalDigitTrend> {
  const window_size = config.terminal_digit_window;
  const withMarks = attempts.filter((a) => a.marks.length > 0);
  if (withMarks.length < window_size) {
    return { ready: false, window_size, attempts_needed: window_size - withMarks.length };
  }
  const recent = [...withMarks].sort((a, b) => a.seq - b.seq).slice(-window_size);
  const digits: Record<string, number> = {};
  let total = 0;
  let zeroOrFive = 0;
  for (const attempt of recent) {
    for (const mark of attempt.marks) {
      const digit = String(Math.abs(Math.round(mark.pressure_mmhg)) % 10);
      digits[digit] = (digits[digit] ?? 0) + 1;
      total += 1;
      if (digit === "0" || digit === "5") zeroOrFive += 1;
    }
  }
  const share = total === 0 ? 0 : zeroOrFive / total;
  return {
    ready: true,
    window_size,
    value: {
      distribution: digits,
      share_ending_0_or_5: share,
      biased: share > config.terminal_digit_bias_threshold,
    },
  };
}

export interface RateStabilityTrend {
  excursion_counts: number[];
  excursions_falling: boolean;
}

/** Rate control stability (C3, C6): excursion count per attempt, trended. A
 * learner whose mean rate is correct but whose excursion count is not falling
 * has not learned control. */
export function rateStabilityTrend(
  attempts: readonly AttemptRecord[],
  config: ThresholdConfig,
): TrendMeasure<RateStabilityTrend> {
  const window_size = config.terminal_digit_window;
  const withTrace = attempts.filter((a) => a.pressure_trace !== null);
  if (withTrace.length < window_size) {
    return { ready: false, window_size, attempts_needed: window_size - withTrace.length };
  }
  const recent = [...withTrace].sort((a, b) => a.seq - b.seq).slice(-window_size);
  const counts = recent.map((a) => a.rate_excursions.length);
  const half = Math.floor(counts.length / 2);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const earlier = sum(counts.slice(0, half));
  const later = sum(counts.slice(counts.length - half));
  return {
    ready: true,
    window_size,
    value: { excursion_counts: counts, excursions_falling: later < earlier },
  };
}
