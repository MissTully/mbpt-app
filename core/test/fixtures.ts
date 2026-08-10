import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  type AttemptRecord,
  type ActivityDefinition,
  type GroundTruth,
  type ThresholdConfig,
  ResponseSetLibrary,
  type ExpectedResponseSet,
} from "../src/index.js";

const contentDir = fileURLToPath(new URL("../../content/", import.meta.url));

export function fixtureConfig(): ThresholdConfig {
  return loadConfig(
    JSON.parse(readFileSync(`${contentDir}config/config-v1.json`, "utf8")),
  );
}

export function fixtureResponseSets(): ExpectedResponseSet[] {
  return ResponseSetLibrary.parse(
    JSON.parse(readFileSync(`${contentDir}response-sets/response-sets-v1.json`, "utf8")),
  ).sets;
}

export const fixtureGroundTruth: GroundTruth = {
  systolic_mmhg: 134,
  diastolic_mmhg: 86,
  phase4_mmhg: null,
  raters: 3,
  rater_agreement_mmhg: 2,
};

export function fixtureActivity(overrides: Partial<ActivityDefinition> = {}): ActivityDefinition {
  return {
    activity_id: "A-3.4.4",
    module: "M3",
    lesson: "L3.4",
    title: "Full unaided measurement",
    type: "Assess",
    minutes: 8,
    surface: "P",
    scaffold: "Unaided",
    objectives: ["D2", "D3"],
    entry_state: "",
    learner_action: "",
    input_modality: "Voice",
    system_response: "",
    evidence_captured: ["marks", "pressure_trace"],
    exit_condition: "",
    release: "Fall",
    ...overrides,
  };
}

let seqCounter = 0;

export function makeAttempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  seqCounter += 1;
  return {
    attempt_id: `att-${seqCounter}`,
    seq: seqCounter,
    learner_id: "learner-001",
    activity_id: "A-3.4.4",
    objectives: ["D2", "D3"],
    scaffold_state: "unaided",
    surface: "phone",
    case_id: "C001",
    case_version: "1",
    started_at: "2026-08-10T10:00:00.000Z",
    ended_at: "2026-08-10T10:05:00.000Z",
    config_version: "cfg-1.0.0",
    app_version: "0.1.0",
    perception_mode: "camera",
    calibration: {
      zero_angle_deg: 225,
      ref_angle_deg: 45,
      ref_pressure_mmhg: 200,
      method: "two_point_linear",
    },
    habitus_category: "adult",
    pressure_trace: {
      samples: [
        { t_ms: 0, pressure_mmhg: 180, confidence: 0.95 },
        { t_ms: 30000, pressure_mmhg: 100, confidence: 0.95 },
        { t_ms: 60000, pressure_mmhg: 20, confidence: 0.95 },
      ],
      peak_mmhg: 180,
      mean_rate_mmhg_per_s: 2.6,
    },
    rate_excursions: [],
    reinflation_events: [],
    tracking_gaps: [],
    marks: [
      { type: "systolic", t_ms: 12000, pressure_mmhg: 136, source: "voice_onset" },
      { type: "diastolic", t_ms: 32000, pressure_mmhg: 86, source: "voice_onset" },
    ],
    spoken_responses: [],
    safety_gate_responses: [],
    arm_circumference_entered_cm: null,
    arm_circumference_reference_cm: null,
    cuff_selected: null,
    timer_events: [],
    steps_completed: [],
    equipment_check: { gauge_zero_confirmed: true, audio_check_passed: true },
    audio_route: "wired",
    expected_response_set_versions: {},
    learner_selection: null,
    ...overrides,
  };
}
