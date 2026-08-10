import { z } from "zod";

// The threshold configuration. Every parameter from INSTR-MBPT-001 section 9,
// as versioned data. Invariant I-2: thresholds live in configuration, never in
// code. The loader refuses to load an invalid file rather than defaulting
// (SDD-MBPT-001 section 6.4): a silent default is a threshold in code wearing
// a disguise.

export const Band = z
  .object({ min: z.number(), max: z.number() })
  .strict()
  .refine((b) => b.min <= b.max, { message: "band min must not exceed max" });
export type Band = z.infer<typeof Band>;

// INSTR-MBPT-001 section 11.2: DECISION REQUIRED. Left explicitly unset so
// anything depending on it fails loudly rather than silently guessing
// (BLD-MBPT-001 section 2.1 step 6). Owner: Nisha Patel with the partner
// institution, in writing.
export const CuffBladderFitStandard = z.enum([
  "current_professional_statement",
  "legacy_40_80_proportional",
]);
export type CuffBladderFitStandard = z.infer<typeof CuffBladderFitStandard>;

export const ThresholdConfig = z
  .object({
    version: z.string().min(1),
    marking_tolerance_mmhg: z.number().positive(),
    deflation_rate_band_mmhg_per_s: Band,
    inflation_margin_mmhg: z.number().positive(),
    cuff_edge_placement_cm: Band,
    cuff_bladder_fit_standard: CuffBladderFitStandard.nullable(),
    sequence_mastery_score: z.number().min(0).max(100),
    sequence_mastery_consecutive: z.number().int().positive(),
    terminal_digit_window: z.number().int().positive(),
    palpation_agreement_mmhg: z.number().positive(),
    circumference_agreement_cm: z.number().positive(),
    tracking_loss_extrapolate_ms: z.number().nonnegative(),
    tracking_loss_hold_ms: z.number().nonnegative(),
    // Provisional until milestone M1 evidence sets it (INSTR section 9,
    // needle laboratory output). Provisional status is data, not a comment,
    // so reports can say so.
    needle_confidence_threshold: z.number().min(0).max(1),
    needle_confidence_threshold_provisional: z.boolean(),
    sync_budget_ms: z.number().positive(),
    bluetooth_scoring_policy: z.enum(["warn", "refuse"]),
    // Engineer-proposed additions, flagged in docs/decisions/DECISION-LOG.md.
    // INSTR section 9 omits both, but each is a threshold the scorer needs,
    // and invariant I-2 forbids holding a threshold in code.
    // terminal_digit_bias_threshold: the share of marks ending in 0 or 5
    // above which the terminal digit trend is reported as biased. Chance
    // level for readings taken to the nearest 2 mmHg is 0.2.
    terminal_digit_bias_threshold: z.number().min(0).max(1),
    // rest_duration_s: objective A4's "five minutes of quiet rest".
    rest_duration_s: z.number().positive(),
  })
  .strict();
export type ThresholdConfig = z.infer<typeof ThresholdConfig>;
