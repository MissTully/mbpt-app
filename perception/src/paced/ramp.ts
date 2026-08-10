// The authored deflation ramp behind the paced shadowing adapter — the
// designed fallback for risk R2 and the no-camera degraded mode. A legitimate
// pacing and perception exercise, labelled as such, never an error state.

export interface RampSegment {
  duration_ms: number;
  from_mmhg: number;
  to_mmhg: number;
}

export interface DeflationRamp {
  segments: RampSegment[];
}

/** A standard authored ramp: hold at peak, then descend at the target rate,
 * then rest at zero. Rates are parameters, not constants, so an activity can
 * author a deliberately faulty ramp for error-recognition exercises. */
export function standardRamp(
  peak_mmhg: number,
  rate_mmhg_per_s: number,
  hold_ms = 3000,
): DeflationRamp {
  const descent_ms = (peak_mmhg / rate_mmhg_per_s) * 1000;
  return {
    segments: [
      { duration_ms: hold_ms, from_mmhg: peak_mmhg, to_mmhg: peak_mmhg },
      { duration_ms: descent_ms, from_mmhg: peak_mmhg, to_mmhg: 0 },
    ],
  };
}

/** Pressure at a given elapsed time. Pure; the adapter samples it on its own
 * cadence. Returns null after the ramp ends. */
export function rampPressureAt(ramp: DeflationRamp, elapsed_ms: number): number | null {
  let t = elapsed_ms;
  for (const segment of ramp.segments) {
    if (t <= segment.duration_ms) {
      const fraction = segment.duration_ms === 0 ? 1 : t / segment.duration_ms;
      return segment.from_mmhg + (segment.to_mmhg - segment.from_mmhg) * fraction;
    }
    t -= segment.duration_ms;
  }
  return null;
}
