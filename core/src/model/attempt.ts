import { z } from "zod";

// The attempt record. Authoritative field list: INSTR-MBPT-001 section 4.2,
// plus the additions proposed in SDD-MBPT-001 section 6.1 ([DECISION-4]:
// case_version, calibration, expected_response_set_versions, app_version)
// and [DECISION-5] (habitus_category). Additions beyond that list:
//   - perception_mode: required by SDD-MBPT-001 section 9 ("a perception_mode
//     flag distinguishes it") to tell a camera attempt from paced shadowing.
//   - spoken_responses[].input_mode: required by the [DECISION-3] resolution
//     (structured input fallback offline) so a re-score can tell a typed or
//     selected response from a transcribed one.
//   - learner_selection: required by objective F3 (SDD-MBPT-001 section 12).
//   - seq: write-assigned monotonic ordinal; "three consecutive" in the
//     mastery rule needs a total order that does not depend on clock skew.
// Each is logged in docs/decisions/DECISION-LOG.md per INSTR section 10.2.

export const ScaffoldState = z.enum([
  "guided",
  "confirmatory",
  "sound_only",
  "unaided",
]);
export type ScaffoldState = z.infer<typeof ScaffoldState>;

export const Surface = z.enum(["phone", "glasses"]);
export type Surface = z.infer<typeof Surface>;

export const AudioRoute = z.enum(["wired", "bluetooth", "speaker", "unknown"]);
export type AudioRoute = z.infer<typeof AudioRoute>;

export const PerceptionMode = z.enum(["camera", "paced_shadowing"]);
export type PerceptionMode = z.infer<typeof PerceptionMode>;

// Cuff size categories double as the body habitus categories the TO-1 mastery
// rule needs ("at least two body habitus categories"). [DECISION-5] provisional.
export const HabitusCategory = z.enum([
  "small_adult",
  "adult",
  "large_adult",
  "extra_large",
]);
export type HabitusCategory = z.infer<typeof HabitusCategory>;

export const PressureSample = z
  .object({
    t_ms: z.number(),
    pressure_mmhg: z.number(),
    confidence: z.number().min(0).max(1),
  })
  .strict();
export type PressureSample = z.infer<typeof PressureSample>;

export const PressureTrace = z
  .object({
    samples: z.array(PressureSample),
    peak_mmhg: z.number(),
    mean_rate_mmhg_per_s: z.number(),
  })
  .strict();
export type PressureTrace = z.infer<typeof PressureTrace>;

export const RateExcursion = z
  .object({
    start_ms: z.number(),
    end_ms: z.number(),
    rate_mmhg_per_s: z.number(),
  })
  .strict();
export type RateExcursion = z.infer<typeof RateExcursion>;

export const ReinflationEvent = z
  .object({ t_ms: z.number(), pressure_at_reinflation_mmhg: z.number() })
  .strict();
export type ReinflationEvent = z.infer<typeof ReinflationEvent>;

export const TrackingGap = z
  .object({
    start_ms: z.number(),
    end_ms: z.number(),
    reason: z.enum(["dial_lost", "low_confidence", "paused"]),
  })
  .strict();
export type TrackingGap = z.infer<typeof TrackingGap>;

export const Mark = z
  .object({
    type: z.enum(["systolic", "diastolic"]),
    t_ms: z.number(),
    pressure_mmhg: z.number(),
    source: z.enum(["voice_onset", "tap", "paced"]),
  })
  .strict();
export type Mark = z.infer<typeof Mark>;

export const SpokenResponse = z
  .object({
    prompt_id: z.string(),
    transcript: z.string(),
    t_ms: z.number(),
    prompted: z.boolean(),
    input_mode: z.enum(["voice", "structured", "typed"]),
  })
  .strict();
export type SpokenResponse = z.infer<typeof SpokenResponse>;

export const SafetyGateResponse = z
  .object({
    gate_id: z.string(),
    response: z.string(),
    correct: z.boolean(),
  })
  .strict();
export type SafetyGateResponse = z.infer<typeof SafetyGateResponse>;

export const TimerEvent = z
  .object({ timer_id: z.string(), started_ms: z.number(), ended_ms: z.number() })
  .strict();
export type TimerEvent = z.infer<typeof TimerEvent>;

export const EquipmentCheck = z
  .object({
    gauge_zero_confirmed: z.boolean(),
    audio_check_passed: z.boolean(),
  })
  .strict();
export type EquipmentCheck = z.infer<typeof EquipmentCheck>;

// The angle-to-pressure mapping in force for this attempt. Without it a
// re-score cannot reproduce the pressures. SDD-MBPT-001 section 4.1.2.
export const Calibration = z
  .object({
    zero_angle_deg: z.number(),
    ref_angle_deg: z.number(),
    ref_pressure_mmhg: z.number(),
    method: z.enum(["two_point_linear"]),
  })
  .strict();
export type Calibration = z.infer<typeof Calibration>;

export const LearnerSelection = z
  .object({ selection: z.string(), justification: z.string() })
  .strict();
export type LearnerSelection = z.infer<typeof LearnerSelection>;

export const AttemptRecord = z
  .object({
    attempt_id: z.string().min(1),
    seq: z.number().int().nonnegative(),
    learner_id: z.string().min(1), // pseudonymous; never a name
    activity_id: z.string().regex(/^A-\d+\.\d+\.\d+$/),
    objectives: z.array(z.string().regex(/^[A-F]\d$|^TO-1$/)),
    scaffold_state: ScaffoldState, // invariant I-4: no default, ever
    surface: Surface,
    case_id: z.string().regex(/^C\d{3}(-[A-Z]+)?$/).nullable(),
    case_version: z.string().nullable(),
    started_at: z.string().datetime(),
    ended_at: z.string().datetime(),
    config_version: z.string().min(1),
    app_version: z.string(),
    perception_mode: PerceptionMode,
    calibration: Calibration.nullable(),
    habitus_category: HabitusCategory.nullable(),
    pressure_trace: PressureTrace.nullable(),
    rate_excursions: z.array(RateExcursion),
    reinflation_events: z.array(ReinflationEvent),
    tracking_gaps: z.array(TrackingGap),
    marks: z.array(Mark),
    spoken_responses: z.array(SpokenResponse),
    safety_gate_responses: z.array(SafetyGateResponse),
    arm_circumference_entered_cm: z.number().nullable(),
    arm_circumference_reference_cm: z.number().nullable(),
    cuff_selected: z.string().nullable(),
    timer_events: z.array(TimerEvent),
    steps_completed: z.array(z.string()),
    equipment_check: EquipmentCheck.nullable(),
    audio_route: AudioRoute,
    expected_response_set_versions: z.record(z.string()),
    learner_selection: LearnerSelection.nullable(),
  })
  .strict();
export type AttemptRecord = z.infer<typeof AttemptRecord>;

/**
 * Validate a candidate attempt record for writing. A record missing
 * scaffold_state (or activity_id, objectives, config_version, surface) is
 * rejected here, not tolerated with a default. Invariant I-4.
 */
export function validateAttemptRecord(candidate: unknown): AttemptRecord {
  return AttemptRecord.parse(candidate);
}
