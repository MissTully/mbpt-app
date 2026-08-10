// The ports: contracts the platform implements and the application wires to
// the core. SDD-MBPT-001 section 7. They exist so that nothing above the
// perception layer knows how a pressure value was obtained.

import type { AttemptRecord, AudioRoute, Calibration } from "@mbpt/core";

export interface GaugeReading {
  t_ms: number;
  // Null when the reading is unavailable — dial lost, or confidence below
  // threshold (invariant I-9: a wrong pressure is worse than none).
  pressure_mmhg: number | null;
  confidence: number;
}

export interface GaugeReader {
  start(calibration: Calibration | null): void;
  stop(): void;
  onReading(handler: (r: GaugeReading) => void): void;
}

export interface VoiceOnset {
  t_ms: number;
}

export interface TranscriptResult {
  transcript: string;
  t_ms: number;
  prompted: boolean;
  input_mode: "voice" | "structured" | "typed";
}

export interface VoiceInput {
  // The mark timestamp. Fires at voice ONSET, never at recognition
  // (INSTR-MBPT-001 section 6.3 point 4).
  onOnset(handler: (o: VoiceOnset) => void): void;
  start(): Promise<void>;
  stop(): void;
}

export interface AudioOutput {
  // Schedule, never trigger: playback is scheduled a fixed lookahead into the
  // future against the audio hardware clock (ARC-MBPT-001 section 4.5).
  scheduleBeat(beatId: string, atTimeMs: number, character: string): void;
  currentRoute(): AudioRoute;
  outputLatencyMs(): number;
}

// Release 2. Declared now so that adding a spatial activity requires
// implementing an adapter — a visible, deliberate act, not incremental drift
// (risk R9).
export interface SpatialTracker {
  armGeometry(): never;
  chestpiecePose(): never;
}

export interface AttemptStore {
  // Validates on write; a record missing scaffold_state is rejected
  // (invariant I-4). There is deliberately no update method: an interface
  // that offers one will eventually be used.
  write(record: AttemptRecord): Promise<void>;
  read(id: string): Promise<AttemptRecord | null>;
  query(filter: { learner_id?: string; activity_id?: string }): Promise<AttemptRecord[]>;
  nextSeq(): Promise<number>;
  exportAll(): Promise<string>; // JSON export; local-first, no server
}
