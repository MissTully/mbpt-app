import { describe, expect, it } from "vitest";
import {
  NeedleEstimator,
  angleToPressure,
  locatePeak,
  radialProfile,
  rampPressureAt,
  renderSyntheticDial,
  standardRamp,
  DEFAULT_DIAL,
} from "../src/index.js";
import type { Calibration } from "@mbpt/core";

// Zero rest at 225 degrees (roughly 7 o'clock on screen), 200 mark 240
// degrees clockwise from it — the sweep shape of a real aneroid dial.
const calibration: Calibration = {
  zero_angle_deg: 225,
  ref_angle_deg: 105,
  ref_pressure_mmhg: 200,
  method: "two_point_linear",
};

function angleForPressure(p: number): number {
  return (225 + (p / 200) * 240) % 360;
}

describe("radial sampling and peak location", () => {
  it("reads the needle angle within half a degree on a clean frame", () => {
    const { frame, geometry } = renderSyntheticDial({
      ...DEFAULT_DIAL,
      needleAngleDeg: 123.4,
    });
    const peak = locatePeak(radialProfile(frame, geometry));
    const error = Math.abs(peak.angle_deg - 123.4);
    expect(Math.min(error, 360 - error)).toBeLessThan(0.5);
  });

  it("reports low confidence terms on a needle-free frame", () => {
    const { frame, geometry } = renderSyntheticDial({
      ...DEFAULT_DIAL,
      needleAngleDeg: 0,
      needleLuma: DEFAULT_DIAL.faceLuma, // needle painted in face colour: no needle
    });
    const peak = locatePeak(radialProfile(frame, geometry));
    expect(peak.sharpness).toBeLessThan(0.2);
  });
});

describe("angle to pressure mapping (two point, any dial)", () => {
  it("maps the calibration points exactly", () => {
    expect(angleToPressure(225, calibration)).toBeCloseTo(0, 6);
    expect(angleToPressure(105, calibration)).toBeCloseTo(200, 6);
  });
  it("is linear between them", () => {
    expect(angleToPressure(angleForPressure(100), calibration)).toBeCloseTo(100, 6);
  });
  it("folds a needle slightly below zero to a small negative, not a huge value", () => {
    expect(angleToPressure(220, calibration)).toBeLessThan(0);
    expect(angleToPressure(220, calibration)).toBeGreaterThan(-10);
  });
});

describe("the estimator end to end on synthetic frames", () => {
  it("tracks a synthetic deflation within 2 mmHg", () => {
    const estimator = new NeedleEstimator(
      renderSyntheticDial({ ...DEFAULT_DIAL, needleAngleDeg: 0 }).geometry,
      calibration,
    );
    let worst = 0;
    // 160 mmHg descending at 2.5 mmHg/s, 30 frames per second.
    for (let i = 0; i <= 300; i++) {
      const t_ms = i * 33;
      const truth = 160 - (2.5 * t_ms) / 1000;
      const { frame } = renderSyntheticDial({
        ...DEFAULT_DIAL,
        needleAngleDeg: angleForPressure(truth),
        noiseAmplitude: 6,
        noiseSeed: i + 1,
      });
      const reading = estimator.step(frame, t_ms);
      if (i > 5 && reading.pressure_mmhg !== null) {
        worst = Math.max(worst, Math.abs(reading.pressure_mmhg - truth));
      }
    }
    expect(worst).toBeLessThan(2);
  });

  it("is deterministic across runs", () => {
    const run = () => {
      const estimator = new NeedleEstimator(
        renderSyntheticDial({ ...DEFAULT_DIAL, needleAngleDeg: 0 }).geometry,
        calibration,
      );
      const readings: (number | null)[] = [];
      for (let i = 0; i < 20; i++) {
        const { frame } = renderSyntheticDial({
          ...DEFAULT_DIAL,
          needleAngleDeg: angleForPressure(150 - i),
          noiseAmplitude: 10,
          noiseSeed: 42 + i,
        });
        readings.push(estimator.step(frame, i * 33).pressure_mmhg);
      }
      return JSON.stringify(readings);
    };
    expect(run()).toEqual(run());
  });
});

describe("the paced shadowing ramp", () => {
  it("holds, then descends at the authored rate", () => {
    const ramp = standardRamp(160, 2.5);
    expect(rampPressureAt(ramp, 0)).toBe(160);
    expect(rampPressureAt(ramp, 3000)).toBe(160);
    expect(rampPressureAt(ramp, 3000 + 4000)).toBeCloseTo(150, 6);
  });
  it("ends rather than going negative", () => {
    const ramp = standardRamp(160, 2.5);
    expect(rampPressureAt(ramp, 10 * 60 * 1000)).toBeNull();
  });
});
