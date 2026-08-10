// Synthetic dial rendering: a raster of a light dial face with a dark needle
// at a known angle. Used by the estimator tests and by the needle
// laboratory's --synthetic mode, so the harness produces an error
// distribution before any real corpus exists (BLD-MBPT-001 day 9-10: "a
// number exists"). Real-corpus validation at milestone M1 replaces, never
// removes, these.

import type { GrayFrame, DialGeometry } from "./estimator.js";

export interface SyntheticDialOptions {
  size: number;
  needleAngleDeg: number; // screen convention, matching the estimator
  needleWidthPx: number;
  faceLuma: number; // dial face brightness
  needleLuma: number; // needle darkness
  noiseAmplitude: number; // deterministic pseudo-noise, for degraded frames
  noiseSeed: number;
}

export const DEFAULT_DIAL: Omit<SyntheticDialOptions, "needleAngleDeg"> = {
  size: 240,
  needleWidthPx: 3,
  faceLuma: 220,
  needleLuma: 30,
  noiseAmplitude: 0,
  noiseSeed: 1,
};

// Deterministic PRNG (mulberry32) so noisy frames are reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderSyntheticDial(options: SyntheticDialOptions): {
  frame: GrayFrame;
  geometry: DialGeometry;
} {
  const { size, needleAngleDeg, needleWidthPx, faceLuma, needleLuma } = options;
  const data = new Uint8Array(size * size);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.45;
  const rand = mulberry32(options.noiseSeed);

  const theta = (needleAngleDeg * Math.PI) / 180;
  const nx = Math.cos(theta);
  const ny = Math.sin(theta);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      let luma = r <= radius ? faceLuma : 128; // outside the dial: mid grey
      if (r <= radius * 0.9) {
        // Distance from the needle ray (forward direction only).
        const along = dx * nx + dy * ny;
        const across = Math.abs(-dx * ny + dy * nx);
        if (along > radius * 0.05 && along < radius * 0.85 && across <= needleWidthPx) {
          luma = needleLuma;
        }
      }
      if (options.noiseAmplitude > 0) {
        luma += (rand() - 0.5) * 2 * options.noiseAmplitude;
      }
      data[y * size + x] = Math.max(0, Math.min(255, Math.round(luma)));
    }
  }
  return { frame: { width: size, height: size, data }, geometry: { cx, cy, radius } };
}
