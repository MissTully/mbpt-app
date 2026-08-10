// The paced shadowing adapter: implements the same GaugeReader port as the
// camera. An authored deflation ramp drives exactly the same engine, and the
// learner marks against it. Labelled to the learner as a pacing and
// perception exercise — which is what it honestly is (SDD-MBPT-001 section 7).

import { rampPressureAt, standardRamp, type DeflationRamp, type GaugeReading } from "@mbpt/perception";

const SAMPLE_INTERVAL_MS = 33; // ~30 readings per second, like the camera path

export class PacedShadowingGaugeReader {
  private ramp: DeflationRamp;
  private timer: number | null = null;
  private startedAt = 0;
  private handler: ((r: GaugeReading) => void) | null = null;

  constructor(peak_mmhg: number, rate_mmhg_per_s: number) {
    this.ramp = standardRamp(peak_mmhg, rate_mmhg_per_s);
  }

  onReading(handler: (r: GaugeReading) => void): void {
    this.handler = handler;
  }

  start(): void {
    this.startedAt = performance.now();
    this.timer = window.setInterval(() => {
      const now = performance.now();
      const pressure = rampPressureAt(this.ramp, now - this.startedAt);
      this.handler?.({
        t_ms: now,
        pressure_mmhg: pressure,
        confidence: 1, // the ramp is authored; there is nothing to be unsure of
      });
    }, SAMPLE_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }
}
