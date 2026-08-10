import { z } from "zod";

// The activity definition. Fields correspond one-to-one with the columns of
// the ActivityUX sheet (INSTR-MBPT-001 section 4.4). The workbook is the
// single source of truth; content/activities.json is generated from it by
// tools/crosswalk-export and never hand edited.

export const ActivityType = z.enum(["Present", "Practice", "Assess", "Reflect"]);
export type ActivityType = z.infer<typeof ActivityType>;

// Surfaces as authored in the workbook. "G" rows in release 1 are the known
// surface conflict (INSTR-MBPT-001 section 11.1); with release 1 confirmed
// phone-only (decision of 2026-08-10), objectives whose evidence needs
// spatial tracking score not_assessable on phone rather than pretending.
export const ActivitySurface = z.enum(["P", "G", "Either", "Both"]);
export type ActivitySurface = z.infer<typeof ActivitySurface>;

export const ActivityScaffold = z.enum([
  "Guided",
  "Confirmatory",
  "Sound only",
  "Unaided",
  "n/a",
]);
export type ActivityScaffold = z.infer<typeof ActivityScaffold>;

export const ActivityRelease = z.enum(["Fall", "Spring"]);
export type ActivityRelease = z.infer<typeof ActivityRelease>;

export const ActivityDefinition = z
  .object({
    activity_id: z.string().regex(/^A-\d+\.\d+\.\d+$/),
    module: z.string().min(1),
    lesson: z.string().min(1),
    title: z.string().min(1),
    type: ActivityType,
    minutes: z.number().positive(),
    surface: ActivitySurface,
    scaffold: ActivityScaffold,
    objectives: z.array(z.string().regex(/^[A-F]\d$/)),
    entry_state: z.string(),
    learner_action: z.string(),
    input_modality: z.string(),
    system_response: z.string(),
    // The contract line: names attempt record fields from INSTR section 4.2.
    // The crosswalk checker fails the build if any named field does not exist.
    evidence_captured: z.array(z.string()),
    exit_condition: z.string(),
    release: ActivityRelease,
  })
  .strict();
export type ActivityDefinition = z.infer<typeof ActivityDefinition>;

export const ActivityCatalog = z
  .object({
    generated_from: z.string(),
    generated_at: z.string(),
    activities: z.array(ActivityDefinition),
  })
  .strict();
export type ActivityCatalog = z.infer<typeof ActivityCatalog>;
