// Pressure trace analysis: turns raw gauge samples into the attempt record's
// derived evidence — peak, mean deflation rate, rate excursions, reinflation
// events. Pure functions: the same trace always yields the same evidence,
// which the scorer then judges. The case annotator will reuse these against
// rig recordings.

import type { PressureSample, RateExcursion, ReinflationEvent, Band } from "@mbpt/core";

export interface TraceEvidence {
  peak_mmhg: number;
  mean_rate_mmhg_per_s: number;
  rate_excursions: RateExcursion[];
  reinflation_events: ReinflationEvent[];
}

const RATE_WINDOW_MS = 2000; // rate estimated over a sliding window this wide
const MIN_EXCURSION_MS = 750; // shorter out-of-band blips are measurement noise
const REINFLATION_RISE_MMHG = 8; // a rise this large during descent is a squeeze

export function analyseTrace(samples: readonly PressureSample[], band: Band): TraceEvidence {
  if (samples.length < 2) {
    return { peak_mmhg: samples[0]?.pressure_mmhg ?? 0, mean_rate_mmhg_per_s: 0, rate_excursions: [], reinflation_events: [] };
  }

  let peak = samples[0]!;
  for (const s of samples) if (s.pressure_mmhg > peak.pressure_mmhg) peak = s;

  // The descent: from where pressure first falls meaningfully below the peak
  // to the last sample. Holding at peak before releasing the valve is normal
  // technique, not a deflation-rate fault, so the hold is excluded.
  const descentStart =
    samples.find((s) => s.t_ms >= peak.t_ms && s.pressure_mmhg <= peak.pressure_mmhg - 2) ?? peak;
  const descent = samples.filter((s) => s.t_ms >= descentStart.t_ms);
  const last = descent[descent.length - 1]!;
  const descentSeconds = Math.max(0.001, (last.t_ms - descentStart.t_ms) / 1000);
  const mean_rate = (descentStart.pressure_mmhg - last.pressure_mmhg) / descentSeconds;

  // Windowed deflation rate across the descent; contiguous out-of-band spans
  // longer than the minimum become excursions.
  const rate_excursions: RateExcursion[] = [];
  let open: { start_ms: number; worst: number } | null = null;
  for (const s of descent) {
    const windowStart = s.t_ms - RATE_WINDOW_MS;
    const earlier = descent.filter((p) => p.t_ms >= windowStart && p.t_ms < s.t_ms);
    if (earlier.length === 0) continue;
    const first = earlier[0]!;
    const dt_s = (s.t_ms - first.t_ms) / 1000;
    if (dt_s < 0.5) continue;
    const rate = (first.pressure_mmhg - s.pressure_mmhg) / dt_s;
    // Excursions only matter while there is meaningful pressure left.
    const inBand = rate >= band.min && rate <= band.max;
    if (!inBand && s.pressure_mmhg > 10) {
      if (open === null) open = { start_ms: s.t_ms, worst: rate };
      else if (Math.abs(rate - (band.min + band.max) / 2) > Math.abs(open.worst - (band.min + band.max) / 2)) {
        open.worst = rate;
      }
    } else if (open !== null) {
      if (s.t_ms - open.start_ms >= MIN_EXCURSION_MS) {
        rate_excursions.push({ start_ms: open.start_ms, end_ms: s.t_ms, rate_mmhg_per_s: round1(open.worst) });
      }
      open = null;
    }
  }
  if (open !== null && last.t_ms - open.start_ms >= MIN_EXCURSION_MS) {
    rate_excursions.push({ start_ms: open.start_ms, end_ms: last.t_ms, rate_mmhg_per_s: round1(open.worst) });
  }

  // Reinflation: a sustained rise after the descent began, at pressure above
  // zero. Physical systems do not spontaneously repressurise.
  const reinflation_events: ReinflationEvent[] = [];
  let trough: PressureSample | null = null;
  for (const s of descent) {
    if (trough === null || s.pressure_mmhg < trough.pressure_mmhg) trough = s;
    else if (
      s.pressure_mmhg - trough.pressure_mmhg >= REINFLATION_RISE_MMHG &&
      trough.pressure_mmhg > 0
    ) {
      reinflation_events.push({ t_ms: s.t_ms, pressure_at_reinflation_mmhg: round1(trough.pressure_mmhg) });
      trough = s; // arm for a possible further reinflation
    }
  }

  return {
    peak_mmhg: round1(peak.pressure_mmhg),
    mean_rate_mmhg_per_s: round1(mean_rate),
    rate_excursions,
    reinflation_events,
  };
}

// Evidence values are recorded to one decimal so a re-score never depends on
// floating point display formatting.
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
