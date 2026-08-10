import { z } from "zod";

// The score result. Shape: SDD-MBPT-001 section 4.4.1.

export const FindingOutcome = z.enum(["met", "not_met", "not_assessable"]);
export type FindingOutcome = z.infer<typeof FindingOutcome>;

export const Finding = z
  .object({
    objective_id: z.string(),
    outcome: FindingOutcome,
    // The value that was compared, and what it was compared against. Null
    // when the outcome is not_assessable and nothing was measured.
    measured: z.number().nullable(),
    threshold: z.number().nullable(),
    finding_code: z.string().min(1),
    evidence_refs: z.array(z.string()),
  })
  .strict();
export type Finding = z.infer<typeof Finding>;

export const MasteryUpdate = z
  .object({
    objective_id: z.string(),
    counts_toward_mastery: z.boolean(),
    streak_after: z.number().int().nonnegative(),
  })
  .strict();
export type MasteryUpdate = z.infer<typeof MasteryUpdate>;

export const ScoreResult = z
  .object({
    attempt_id: z.string(),
    config_version: z.string(),
    scorer_version: z.string(),
    total: z.number().min(0).max(100),
    // True when no objective in play was assessable — a total of 0 in that
    // situation is "nothing could be measured", not "everything was wrong",
    // and reports must say so.
    nothing_assessable: z.boolean(),
    findings: z.array(Finding),
    mastery_updates: z.array(MasteryUpdate),
  })
  .strict();
export type ScoreResult = z.infer<typeof ScoreResult>;
