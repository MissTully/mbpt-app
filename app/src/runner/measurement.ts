// The live measurement session: wires a GaugeReader (camera or paced), the
// core auscultation engine, the audio adapter and the voice onset detector
// into the closed loop. The engine decides; this file only carries signals.
//
// Degraded modes follow SDD-MBPT-001 section 9 exactly: under 500 ms
// extrapolate at the last rate and say nothing; to 3 s hold and suppress
// beats with a peripheral indicator; beyond 3 s pause and prompt. Low
// confidence is treated as lost, and the learner is not told the difference,
// because the difference does not help them.

import {
  advanceCardiacClock,
  decideBeat,
  startCardiacClock,
  type CardiacClockState,
  type CaseManifest,
  type Mark,
  type PressureSample,
  type ThresholdConfig,
  type TrackingGap,
} from "@mbpt/core";
import type { GaugeReading } from "@mbpt/perception";
import type { WebAudioOutput } from "../adapters/audioOut.js";

export type TrackingState = "tracking" | "degraded" | "paused";

export interface MeasurementEvidence {
  samples: PressureSample[];
  marks: Mark[];
  tracking_gaps: TrackingGap[];
}

export interface MeasurementCallbacks {
  onTrackingState(state: TrackingState): void;
  onPressure(pressure_mmhg: number | null): void; // for Guided scaffold display only
  onMark(mark: Mark): void;
}

interface GaugeLike {
  onReading(handler: (r: GaugeReading) => void): void;
  start(calibration: null): void;
  stop(): void;
}

export class MeasurementSession {
  private clock: CardiacClockState | null = null;
  private raf = 0;
  private startedAt = 0;
  private lastGood: { at_ms: number; pressure: number; rate: number } | null = null;
  private openGap: { start_ms: number; reason: TrackingGap["reason"] } | null = null;
  private samples: PressureSample[] = [];
  private marks: Mark[] = [];
  private gaps: TrackingGap[] = [];
  private markCount = 0;
  private state: TrackingState = "tracking";

  constructor(
    private caseManifest: CaseManifest,
    private gauge: GaugeLike,
    private audio: WebAudioOutput,
    private config: ThresholdConfig,
    private callbacks: MeasurementCallbacks,
  ) {}

  start(): void {
    this.startedAt = performance.now();
    this.clock = startCardiacClock(this.startedAt, this.caseManifest.rhythm_intervals_ms);

    this.gauge.onReading((reading) => {
      const rel = reading.t_ms - this.startedAt;
      if (reading.pressure_mmhg !== null) {
        if (this.lastGood) {
          const dt = (reading.t_ms - this.lastGood.at_ms) / 1000;
          if (dt > 0.01) {
            const rate = (this.lastGood.pressure - reading.pressure_mmhg) / dt;
            this.lastGood = { at_ms: reading.t_ms, pressure: reading.pressure_mmhg, rate };
          } else {
            this.lastGood.pressure = reading.pressure_mmhg;
          }
        } else {
          this.lastGood = { at_ms: reading.t_ms, pressure: reading.pressure_mmhg, rate: 0 };
        }
        this.samples.push({
          t_ms: Math.round(rel),
          pressure_mmhg: Math.round(reading.pressure_mmhg * 10) / 10,
          confidence: Math.round(reading.confidence * 100) / 100,
        });
        if (this.openGap) {
          this.gaps.push({ start_ms: this.openGap.start_ms, end_ms: Math.round(rel), reason: this.openGap.reason });
          this.openGap = null;
        }
      } else if (!this.openGap) {
        this.openGap = {
          start_ms: Math.round(rel),
          reason: reading.confidence > 0 ? "low_confidence" : "dial_lost",
        };
      }
    });
    this.gauge.start(null);

    const tick = () => {
      const now = performance.now();
      this.updateTrackingState(now);
      const pressure = this.effectivePressure(now);
      this.callbacks.onPressure(pressure);

      if (this.clock) {
        const { state, beats } = advanceCardiacClock(this.clock, now, this.caseManifest.rhythm_intervals_ms);
        this.clock = state;
        for (const request of beats) {
          // Beats are suppressed outside normal tracking: silence over wrong
          // audio, invariant I-9.
          const audible = this.state === "tracking" ? pressure : null;
          const scheduled = decideBeat(request, audible, this.caseManifest.audibility_profile, this.caseManifest.beat_index);
          if (scheduled) {
            this.audio.scheduleBeat(scheduled.beat.beat_id, scheduled.at_ms, scheduled.character);
          }
        }
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** The learner spoke. Timestamped at onset; the pressure is the gauge value
   * at that instant. First mark is systolic, second diastolic. */
  recordOnset(t_ms: number): void {
    if (this.markCount >= 2) return;
    const pressure = this.effectivePressure(t_ms);
    if (pressure === null) {
      // Marking during a gap: record the mark against the last known
      // pressure; the tracking gap already flags the window and the scorer
      // will rule it not_assessable rather than wrong.
      if (!this.lastGood) return;
    }
    const mark: Mark = {
      type: this.markCount === 0 ? "systolic" : "diastolic",
      t_ms: Math.round(t_ms - this.startedAt),
      pressure_mmhg: Math.round((pressure ?? this.lastGood!.pressure) * 10) / 10,
      source: "voice_onset",
    };
    this.markCount += 1;
    this.marks.push(mark);
    this.callbacks.onMark(mark);
  }

  markCountSoFar(): number {
    return this.markCount;
  }

  end(): MeasurementEvidence {
    cancelAnimationFrame(this.raf);
    this.gauge.stop();
    if (this.openGap) {
      this.gaps.push({
        start_ms: this.openGap.start_ms,
        end_ms: Math.round(performance.now() - this.startedAt),
        reason: this.openGap.reason,
      });
      this.openGap = null;
    }
    return { samples: this.samples, marks: this.marks, tracking_gaps: this.gaps };
  }

  private updateTrackingState(now: number): void {
    const sinceGood = this.lastGood ? now - this.lastGood.at_ms : Infinity;
    let next: TrackingState;
    if (sinceGood <= this.config.tracking_loss_extrapolate_ms) next = "tracking";
    else if (sinceGood <= this.config.tracking_loss_hold_ms) next = "degraded";
    else next = "paused";
    if (next !== this.state) {
      this.state = next;
      this.callbacks.onTrackingState(next);
    }
  }

  /** Pressure for the engine: live when tracking, extrapolated at the last
   * observed rate inside the extrapolation window, otherwise unavailable. */
  private effectivePressure(now: number): number | null {
    if (!this.lastGood) return null;
    const sinceGood = now - this.lastGood.at_ms;
    if (sinceGood <= this.config.tracking_loss_extrapolate_ms) {
      return this.lastGood.pressure - (this.lastGood.rate * sinceGood) / 1000;
    }
    return null;
  }
}
