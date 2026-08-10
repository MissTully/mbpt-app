// The needle laboratory: the standalone validation harness for the needle
// estimator, and a deliverable in its own right (SDD-MBPT-001 section 4.1.4).
// Built before the estimator is trusted, so every estimator change is
// measured rather than eyeballed.
//
// Modes:
//   --synthetic            render a synthetic deflation and measure the
//                          estimator against known truth. This is the day-10
//                          "a number exists" harness; it validates the
//                          harness and the pipeline, NOT milestone M1.
//   <framesDir> <ref.csv>  real corpus: a directory of PGM frames (extract
//                          from gauge video with ffmpeg, filenames
//                          frame_<t_ms>.pgm) plus the reference pressure log
//                          (t_ms,pressure_mmhg,sensor_id). Alignment on the
//                          electronic slate is assumed done at extraction.
//
// Output: the full error distribution — median, p95, p99, max — and
// confidence against error, from which needle_confidence_threshold is chosen
// at milestone M1 (never guessed). A mean error of 1 with a long tail of 15
// mmHg outliers is a failure wearing a passing grade, so the mean is
// deliberately not the headline number.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  NeedleEstimator,
  renderSyntheticDial,
  DEFAULT_DIAL,
  type GrayFrame,
} from "@mbpt/perception";
import type { Calibration } from "@mbpt/core";

interface Sample {
  t_ms: number;
  truth: number;
  estimate: number | null;
  confidence: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

function report(samples: Sample[], confidenceThresholds: number[]): void {
  const errors = samples
    .filter((s) => s.estimate !== null)
    .map((s) => Math.abs(s.estimate! - s.truth))
    .sort((a, b) => a - b);
  const within2 = errors.filter((e) => e <= 2).length;
  console.log(`frames: ${samples.length}, with estimate: ${errors.length}`);
  console.log(`error mmHg  median ${percentile(errors, 50).toFixed(2)}  p95 ${percentile(errors, 95).toFixed(2)}  p99 ${percentile(errors, 99).toFixed(2)}  max ${(errors[errors.length - 1] ?? NaN).toFixed(2)}`);
  console.log(`within 2 mmHg: ${((within2 / errors.length) * 100).toFixed(1)}% (M1 gate: 95% across 3 gauges x 3 lighting conditions)`);

  console.log("\nconfidence vs error (for choosing needle_confidence_threshold):");
  for (const threshold of confidenceThresholds) {
    const kept = samples.filter((s) => s.estimate !== null && s.confidence >= threshold);
    const keptErrors = kept.map((s) => Math.abs(s.estimate! - s.truth)).sort((a, b) => a - b);
    const dropped = samples.length - kept.length;
    console.log(
      `  conf >= ${threshold.toFixed(2)}: keeps ${kept.length} (${dropped} dropped), p95 error ${percentile(keptErrors, 95).toFixed(2)} mmHg`,
    );
  }
}

function runSynthetic(): void {
  const calibration: Calibration = {
    zero_angle_deg: 225,
    ref_angle_deg: 105,
    ref_pressure_mmhg: 200,
    method: "two_point_linear",
  };
  const angleFor = (p: number) => (225 + (p / 200) * 240) % 360;
  const { geometry } = renderSyntheticDial({ ...DEFAULT_DIAL, needleAngleDeg: 0 });
  const estimator = new NeedleEstimator(geometry, calibration);
  const samples: Sample[] = [];
  // 170 mmHg descent at 2.5 mmHg/s, 30 fps, moderate sensor noise.
  for (let i = 0; i <= 2000; i++) {
    const t_ms = i * 33;
    const truth = Math.max(0, 170 - (2.5 * t_ms) / 1000);
    const { frame } = renderSyntheticDial({
      ...DEFAULT_DIAL,
      needleAngleDeg: angleFor(truth),
      noiseAmplitude: 8,
      noiseSeed: i + 1,
    });
    const reading = estimator.step(frame, t_ms);
    samples.push({ t_ms, truth, estimate: reading.pressure_mmhg, confidence: reading.confidence });
    if (truth === 0) break;
  }
  console.log("needle-lab --synthetic: harness self-test against rendered dial\n");
  report(samples, [0, 0.3, 0.5, 0.6, 0.7, 0.8]);
  console.log(
    "\nNOTE: synthetic frames validate the harness and the pipeline, not milestone M1. M1 needs the real corpus: three gauge models, three lighting conditions, reference sensor logs.",
  );
}

// Minimal binary PGM (P5) reader — frames extracted via:
//   ffmpeg -i gauge.mp4 -pix_fmt gray frames/frame_%08d.pgm
function readPgm(path: string): GrayFrame {
  const buf = readFileSync(path);
  const header = buf.toString("latin1", 0, 64);
  const m = header.match(/^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/);
  if (!m) throw new Error(`${path}: not a binary PGM`);
  const width = Number(m[1]);
  const height = Number(m[2]);
  const offset = m[0].length;
  return { width, height, data: new Uint8Array(buf.buffer, buf.byteOffset + offset, width * height) };
}

function runCorpus(framesDir: string, refCsvPath: string, calibrationJsonPath: string): void {
  const calibration = JSON.parse(readFileSync(calibrationJsonPath, "utf8")) as Calibration & {
    geometry: { cx: number; cy: number; radius: number };
  };
  const refRows = readFileSync(refCsvPath, "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [t_ms, pressure] = line.split(",");
      return { t_ms: Number(t_ms), pressure: Number(pressure) };
    });
  const truthAt = (t_ms: number): number => {
    // Linear interpolation over the reference log.
    let lo = refRows[0]!;
    for (const row of refRows) {
      if (row.t_ms <= t_ms) lo = row;
      else {
        const span = row.t_ms - lo.t_ms;
        return span === 0 ? lo.pressure : lo.pressure + ((row.pressure - lo.pressure) * (t_ms - lo.t_ms)) / span;
      }
    }
    return lo.pressure;
  };

  const estimator = new NeedleEstimator(calibration.geometry, calibration);
  const samples: Sample[] = [];
  const files = readdirSync(framesDir)
    .filter((f) => f.endsWith(".pgm"))
    .sort();
  for (const file of files) {
    const t_ms = Number(file.match(/(\d+)/)?.[1] ?? 0);
    const reading = estimator.step(readPgm(join(framesDir, file)), t_ms);
    samples.push({ t_ms, truth: truthAt(t_ms), estimate: reading.pressure_mmhg, confidence: reading.confidence });
  }
  report(samples, [0, 0.3, 0.5, 0.6, 0.7, 0.8]);
}

const args = process.argv.slice(2);
if (args[0] === "--synthetic") runSynthetic();
else if (args.length >= 3) runCorpus(args[0]!, args[1]!, args[2]!);
else {
  console.log("usage: needle-lab --synthetic");
  console.log("       needle-lab <framesDir> <reference.csv> <calibration.json>");
  process.exit(1);
}
