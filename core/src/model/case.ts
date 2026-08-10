import { z } from "zod";

// The case package manifest and its derived annotation artifacts.
// Format: INSTR-MBPT-001 section 4.3 and SDD-MBPT-001 section 6.2.
// Invariant I-10: no case without a complete capture protocol record; the
// loader rejects a package lacking one rather than warning about it.

export const CaptureProtocol = z
  .object({
    device: z.string().min(1),
    mode: z.string().min(1),
    gain: z.string().min(1),
    sample_rate_hz: z.number().positive(),
    camera: z.string().min(1),
    frame_rate: z.number().positive(),
    exposure_locked: z.boolean(),
    reference_sensor_id: z.string().min(1),
    sync_method: z.string().min(1),
    consent_record: z.string().min(1),
    captured_on: z.string().min(1),
    operator: z.string().min(1),
  })
  .strict();
export type CaptureProtocol = z.infer<typeof CaptureProtocol>;

// Ground truth: three independent expert raters, agreed within 4 mmHg, or the
// case was rejected rather than averaged (INSTR-MBPT-001 section 8.2).
export const GroundTruth = z
  .object({
    systolic_mmhg: z.number(),
    diastolic_mmhg: z.number(),
    // For phase-four populations and case C014; null when not annotated.
    phase4_mmhg: z.number().nullable(),
    raters: z.number().int().min(1),
    rater_agreement_mmhg: z.number().nonnegative(),
  })
  .strict();
export type GroundTruth = z.infer<typeof GroundTruth>;

// The audibility profile: for any cuff pressure, is a Korotkoff sound audible
// and of what character. Pressure-indexed, not time-indexed — the central
// design rule of the product (SDD-MBPT-001 section 4.2.2). The auscultatory
// gap is not a special case in code; it is a silent band in this profile.
export const BeatCharacter = z.enum([
  "phase1_crisp",
  "phase2_swishing",
  "phase4_muffled",
]);
export type BeatCharacter = z.infer<typeof BeatCharacter>;

export const AudibilityBand = z
  .object({
    // Bands are inclusive of upper, exclusive of lower, evaluated high to low.
    upper_mmhg: z.number(),
    lower_mmhg: z.number(),
    character: BeatCharacter.nullable(), // null = silent (e.g. the gap band)
  })
  .strict()
  .refine((b) => b.upper_mmhg >= b.lower_mmhg, {
    message: "audibility band upper must be >= lower",
  });
export type AudibilityBand = z.infer<typeof AudibilityBand>;

export const AudibilityProfile = z
  .object({ bands: z.array(AudibilityBand) })
  .strict();
export type AudibilityProfile = z.infer<typeof AudibilityProfile>;

// One entry per extracted beat in the beat library, tagged with the cuff
// pressure at which it occurred during capture.
export const BeatIndexEntry = z
  .object({
    beat_id: z.string().min(1),
    pressure_mmhg: z.number(),
    character: BeatCharacter,
    // Relative path of the audio clip inside the package, or a synthesis
    // descriptor for synthetic demo cases.
    source: z.string().min(1),
  })
  .strict();
export type BeatIndexEntry = z.infer<typeof BeatIndexEntry>;

export const CaseManifest = z
  .object({
    case_id: z.string().regex(/^C\d{3}(-[A-Z]+)?$/),
    case_version: z.string().min(1),
    title: z.string().min(1),
    condition: z.string().min(1),
    // Synthetic cases exist only for development and demo. They are labelled,
    // and reports carry the label. A tone generator trains a learner to
    // recognise a tone generator (INSTR-MBPT-001 section 8.1) — a synthetic
    // case never counts toward the case-variety condition of TO-1 mastery.
    synthetic: z.boolean(),
    capture_protocol: CaptureProtocol,
    ground_truth: GroundTruth,
    audibility_profile: AudibilityProfile,
    beat_index: z.array(BeatIndexEntry),
    // Beat-to-beat interval sequence in milliseconds from the recording. For
    // a regular rhythm, near-constant; for atrial fibrillation, the real
    // irregular intervals — which is what makes that case valuable.
    rhythm_intervals_ms: z.array(z.number().positive()).min(1),
    // Scope parameter for E4 wording per cohort (INSTR section 11.6); null
    // until the scope-of-practice decision closes.
    escalation_scope: z.string().nullable(),
  })
  .strict();
export type CaseManifest = z.infer<typeof CaseManifest>;

/** Load and validate a case manifest. Rejects a package without a complete
 * capture protocol record (invariant I-10) by construction: the schema
 * requires it and there is no lenient mode. */
export function validateCaseManifest(candidate: unknown): CaseManifest {
  return CaseManifest.parse(candidate);
}
