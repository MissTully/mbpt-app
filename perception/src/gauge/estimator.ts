// The needle estimator. SDD-MBPT-001 section 4.1: radial sampling around the
// dial centre, angular peak location, sub-bin centroid, unwrapping, filtering,
// two-point angle-to-pressure mapping, confidence with a physical meaning.
//
// Pure pixel arithmetic: no camera, no browser, no device import. The browser
// camera adapter (app layer) feeds it frames; the needle laboratory
// (tools/needle-lab) feeds it recorded frames and measures it against a
// reference sensor log. Same code in both places — that is the point.

import type { Calibration } from "@mbpt/core";

export interface GrayFrame {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray; // one byte per pixel, row major
}

export interface DialGeometry {
  cx: number;
  cy: number;
  radius: number;
}

export interface EstimatorOptions {
  bins: number; // angular resolution; 720 = half-degree bins
  innerRadiusFraction: number; // radial sampling window, as fractions of radius
  outerRadiusFraction: number;
  alpha: number; // alpha-beta filter gains
  beta: number;
}

export const DEFAULT_OPTIONS: EstimatorOptions = {
  bins: 720,
  innerRadiusFraction: 0.3,
  outerRadiusFraction: 0.85,
  alpha: 0.5,
  beta: 0.1,
};

/** Convert an RGBA buffer (e.g. canvas ImageData) to a single-channel frame.
 * Rec. 601 luma, integer arithmetic, deterministic. */
export function rgbaToGray(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): GrayFrame {
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = (299 * rgba[p]! + 587 * rgba[p + 1]! + 114 * rgba[p + 2]!) / 1000;
  }
  return { width, height, data: out };
}

/**
 * Stage 4: the angular response profile. For each angular bin, sample
 * intensity along a ray from the inner to the outer radius and reduce to one
 * number. The needle is dark against a light dial, so the response is
 * darkness (255 - low percentile of samples): high response = probably the
 * needle.
 */
export function radialProfile(
  frame: GrayFrame,
  geometry: DialGeometry,
  options: EstimatorOptions = DEFAULT_OPTIONS,
): Float64Array {
  const { bins, innerRadiusFraction, outerRadiusFraction } = options;
  const rInner = geometry.radius * innerRadiusFraction;
  const rOuter = geometry.radius * outerRadiusFraction;
  const steps = Math.max(8, Math.round(rOuter - rInner));
  const profile = new Float64Array(bins);
  for (let b = 0; b < bins; b++) {
    const theta = (b / bins) * 2 * Math.PI;
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);
    // Low percentile approximated by the mean of the darkest quarter of the
    // samples along the ray: robust to a single dark tick mark, cheap, and
    // deterministic.
    const samples: number[] = [];
    for (let s = 0; s <= steps; s++) {
      const r = rInner + ((rOuter - rInner) * s) / steps;
      const x = Math.round(geometry.cx + dx * r);
      const y = Math.round(geometry.cy + dy * r);
      if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) continue;
      samples.push(frame.data[y * frame.width + x]!);
    }
    if (samples.length === 0) {
      profile[b] = 0;
      continue;
    }
    samples.sort((a, z) => a - z);
    const quarter = Math.max(1, Math.floor(samples.length / 4));
    let sum = 0;
    for (let i = 0; i < quarter; i++) sum += samples[i]!;
    profile[b] = 255 - sum / quarter;
  }
  return profile;
}

export interface PeakResult {
  angle_deg: number; // screen convention: 0 = +x axis, increasing clockwise on screen
  response: number;
  // Separation between the strongest peak and the strongest peak outside its
  // neighbourhood; small margin = ambiguous frame (two needle-like features).
  margin: number;
  // Peak response relative to the profile mean; low sharpness = flat profile,
  // no clear needle.
  sharpness: number;
}

/** Stage 5: locate the strongest angular response, with sub-bin precision via
 * a centroid over the neighbouring bins. */
export function locatePeak(profile: Float64Array): PeakResult {
  const bins = profile.length;
  let best = 0;
  for (let i = 1; i < bins; i++) if (profile[i]! > profile[best]!) best = i;

  // The needle has physical width, so its angular response is a plateau, not
  // a point; taking the first-found maximum biases the angle by half the
  // plateau width. Centre instead: centroid over the contiguous region around
  // the peak that stays above halfway between the profile mean and the peak.
  let mean = 0;
  for (let i = 0; i < bins; i++) mean += profile[i]!;
  mean /= bins;
  const halfHeight = mean + 0.5 * (profile[best]! - mean);
  const maxHalfWidth = 30; // bins; a plateau wider than this is not a needle
  let weightSum = 0;
  let offsetSum = 0;
  for (let d = -maxHalfWidth; d <= maxHalfWidth; d++) {
    const idx = (best + d + bins) % bins;
    const w = profile[idx]! - halfHeight;
    if (w <= 0) continue;
    weightSum += w;
    offsetSum += w * d;
  }
  const refined = best + (weightSum > 0 ? offsetSum / weightSum : 0);
  const angle_deg = ((refined / bins) * 360 + 360) % 360;

  // Second peak outside a ±10 bin exclusion zone around the winner.
  let second = 0;
  const exclusion = 10;
  for (let i = 0; i < bins; i++) {
    const dist = Math.min((i - best + bins) % bins, (best - i + bins) % bins);
    if (dist <= exclusion) continue;
    if (profile[i]! > second) second = profile[i]!;
  }

  const peak = profile[best]!;
  return {
    angle_deg,
    response: peak,
    margin: peak > 0 ? (peak - second) / peak : 0,
    sharpness: peak > 0 ? Math.max(0, (peak - mean) / peak) : 0,
  };
}

/** Stage 8: two-point linear angle-to-pressure mapping. Angles are handled as
 * a clockwise sweep from the zero rest position, so the mapping is well
 * defined on any dial without a device database (SDD section 4.1.2).
 * [DECISION-2]: linearity across the full range is answered from M1 data. */
export function angleToPressure(angle_deg: number, calibration: Calibration): number {
  const sweepToRef = (((calibration.ref_angle_deg - calibration.zero_angle_deg) % 360) + 360) % 360;
  let sweep = (((angle_deg - calibration.zero_angle_deg) % 360) + 360) % 360;
  // A needle slightly below the zero rest position reads as a near-full-turn
  // sweep; fold it back to a small negative pressure rather than a huge one.
  if (sweep > sweepToRef + 30) sweep -= 360;
  return (sweep / sweepToRef) * calibration.ref_pressure_mmhg;
}

export interface EstimatorReading {
  t_ms: number;
  angle_deg: number;
  pressure_mmhg: number | null; // null when no calibration is set
  rate_mmhg_per_s: number;
  confidence: number; // 0..1; thresholding is the adapter's job (I-9)
}

interface FilterState {
  pressure: number;
  rate: number; // mmHg per second
  t_ms: number;
}

/**
 * Stages 6, 7, 9: continuity, alpha-beta filtering, confidence. Holds only
 * the filter state between frames; everything else is stateless.
 */
export class NeedleEstimator {
  private filter: FilterState | null = null;
  private lastResidual = 0;

  constructor(
    private geometry: DialGeometry,
    private calibration: Calibration | null,
    private options: EstimatorOptions = DEFAULT_OPTIONS,
  ) {}

  setCalibration(calibration: Calibration): void {
    this.calibration = calibration;
    this.filter = null;
  }

  setGeometry(geometry: DialGeometry): void {
    this.geometry = geometry;
  }

  /** Read one frame. Deterministic given the frame sequence. */
  step(frame: GrayFrame, t_ms: number): EstimatorReading {
    const profile = radialProfile(frame, this.geometry, this.options);
    const peak = locatePeak(profile);

    if (this.calibration === null) {
      return {
        t_ms,
        angle_deg: peak.angle_deg,
        pressure_mmhg: null,
        rate_mmhg_per_s: 0,
        confidence: confidenceFrom(peak, 0),
      };
    }

    const measured = angleToPressure(peak.angle_deg, this.calibration);

    let filtered: FilterState;
    if (this.filter === null) {
      filtered = { pressure: measured, rate: 0, t_ms };
      this.lastResidual = 0;
    } else {
      const dt_s = Math.max(0.001, (t_ms - this.filter.t_ms) / 1000);
      const predicted = this.filter.pressure + this.filter.rate * dt_s;
      const residual = measured - predicted;
      filtered = {
        pressure: predicted + this.options.alpha * residual,
        rate: this.filter.rate + (this.options.beta * residual) / dt_s,
        t_ms,
      };
      this.lastResidual = Math.abs(residual);
    }
    this.filter = filtered;

    return {
      t_ms,
      angle_deg: peak.angle_deg,
      pressure_mmhg: filtered.pressure,
      rate_mmhg_per_s: filtered.rate,
      confidence: confidenceFrom(peak, this.lastResidual),
    };
  }

  reset(): void {
    this.filter = null;
    this.lastResidual = 0;
  }
}

/** Stage 9: confidence with a physical meaning. Combines the sharpness of the
 * angular peak, the margin over the second-strongest peak, and the agreement
 * between the measurement and the filter's prediction. Each term is 0..1; the
 * product degrades predictably as contrast falls, which is what invariant I-9
 * needs from it. The threshold applied to it is chosen from milestone M1
 * evidence, not guessed. */
export function confidenceFrom(peak: PeakResult, residual_mmhg: number): number {
  const sharpnessTerm = Math.min(1, peak.sharpness / 0.5);
  const marginTerm = Math.min(1, peak.margin / 0.3);
  const residualTerm = 1 / (1 + residual_mmhg / 8);
  return sharpnessTerm * marginTerm * residualTerm;
}
