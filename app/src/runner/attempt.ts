// Attempt assembly and scoring context. History is scored on demand from the
// stored records — a live demonstration that every attempt is re-scoreable
// from data alone (invariant I-1), and the reason mastery state needs no
// storage of its own.

import {
  analyseTrace,
  type TraceEvidence,
} from "@mbpt/perception";
import {
  objectiveMastery,
  score,
  validateAttemptRecord,
  type ActivityDefinition,
  type AttemptRecord,
  type AudioRoute,
  type Mark,
  type PerceptionMode,
  type PressureSample,
  type ScaffoldState,
  type ScoredAttempt,
  type ScoreResult,
  type SpokenResponse,
  type TrackingGap,
} from "@mbpt/core";
import { activityById, APP_VERSION, config, responseSets, synthCase } from "../content.js";
import { attemptStore } from "../adapters/store.js";

export const SYNTHETIC_CASE_IDS = new Set([synthCase.case_id]);

export function learnerId(): string {
  const key = "mbpt.learner_id";
  let id = localStorage.getItem(key);
  if (!id) {
    // Pseudonymous, never a name. Randomness is fine here — it is identity
    // assignment in the application layer, nowhere near the scoring path.
    id = `learner-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function scaffoldStateOf(activity: ActivityDefinition): ScaffoldState {
  switch (activity.scaffold) {
    case "Guided":
      return "guided";
    case "Confirmatory":
      return "confirmatory";
    case "Sound only":
      return "sound_only";
    default:
      return "unaided";
  }
}

export interface AttemptInputs {
  activity: ActivityDefinition;
  startedAtIso: string;
  seq: number;
  samples: PressureSample[];
  marks: Mark[];
  tracking_gaps: TrackingGap[];
  spoken_responses: SpokenResponse[];
  safety_gate_responses: AttemptRecord["safety_gate_responses"];
  timer_events: AttemptRecord["timer_events"];
  steps_completed: string[];
  equipment_check: AttemptRecord["equipment_check"];
  audio_route: AudioRoute;
  perception_mode: PerceptionMode;
  calibration: AttemptRecord["calibration"];
  learner_selection: AttemptRecord["learner_selection"];
  arm_circumference_entered_cm: number | null;
  arm_circumference_reference_cm: number | null;
  cuff_selected: string | null;
}

export function buildAttempt(inputs: AttemptInputs): AttemptRecord {
  const trace: TraceEvidence | null =
    inputs.samples.length >= 2 ? analyseTrace(inputs.samples, config.deflation_rate_band_mmhg_per_s) : null;

  const usedSets = responseSets.filter((s) =>
    inputs.spoken_responses.some((r) => r.prompt_id === s.prompt_id),
  );

  const record: AttemptRecord = {
    attempt_id: crypto.randomUUID(),
    seq: inputs.seq,
    learner_id: learnerId(),
    activity_id: inputs.activity.activity_id,
    // Copied at attempt start so a later curriculum edit cannot retroactively
    // change what an old attempt was scored against.
    objectives: [...inputs.activity.objectives],
    scaffold_state: scaffoldStateOf(inputs.activity),
    surface: "phone",
    case_id: synthCase.case_id,
    case_version: synthCase.case_version,
    started_at: inputs.startedAtIso,
    ended_at: new Date().toISOString(),
    config_version: config.version,
    app_version: APP_VERSION,
    perception_mode: inputs.perception_mode,
    calibration: inputs.calibration,
    habitus_category: null, // [DECISION-5]: no partner record exists yet
    pressure_trace: trace
      ? {
          samples: inputs.samples,
          peak_mmhg: trace.peak_mmhg,
          mean_rate_mmhg_per_s: trace.mean_rate_mmhg_per_s,
        }
      : null,
    rate_excursions: trace?.rate_excursions ?? [],
    reinflation_events: trace?.reinflation_events ?? [],
    tracking_gaps: inputs.tracking_gaps,
    marks: inputs.marks,
    spoken_responses: inputs.spoken_responses,
    safety_gate_responses: inputs.safety_gate_responses,
    arm_circumference_entered_cm: inputs.arm_circumference_entered_cm,
    arm_circumference_reference_cm: inputs.arm_circumference_reference_cm,
    cuff_selected: inputs.cuff_selected,
    timer_events: inputs.timer_events,
    steps_completed: inputs.steps_completed,
    equipment_check: inputs.equipment_check,
    audio_route: inputs.audio_route,
    expected_response_set_versions: Object.fromEntries(usedSets.map((s) => [s.prompt_id, s.version])),
    learner_selection: inputs.learner_selection,
  };
  return validateAttemptRecord(record);
}

/** Re-score the full stored history. Pure over stored data. */
export async function scoredHistory(): Promise<ScoredAttempt[]> {
  const attempts = await attemptStore.query({ learner_id: learnerId() });
  return attempts.map((attempt) => {
    const activity = activityById(attempt.activity_id);
    return {
      attempt,
      activity,
      score: score(attempt, config, {
        activity,
        groundTruth: attempt.case_id === synthCase.case_id ? synthCase.ground_truth : null,
        responseSets,
        priorStreaks: {},
      }),
    };
  });
}

/** Score one new attempt with real prior streaks, then persist it. */
export async function scoreAndStore(record: AttemptRecord): Promise<ScoreResult> {
  const history = await scoredHistory();
  const priorStreaks: Record<string, number> = {};
  for (const objective of record.objectives) {
    priorStreaks[objective] = objectiveMastery(objective, history, config).streak;
  }
  const activity = activityById(record.activity_id);
  const result = score(record, config, {
    activity,
    groundTruth: record.case_id === synthCase.case_id ? synthCase.ground_truth : null,
    responseSets,
    priorStreaks,
  });
  // Write locally first, always: an attempt that scored must never be lost.
  await attemptStore.write(record);
  return result;
}
