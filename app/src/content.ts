// Versioned content the application consumes. All of it is data from the
// repository (ARC-MBPT-001 section 4.8): thresholds, activities, expected
// response sets, feedback templates, the demo case. Parsed through the core
// schemas so an invalid file refuses to load rather than defaulting.

import {
  ActivityCatalog,
  ResponseSetLibrary,
  loadConfig,
  validateCaseManifest,
  type ActivityDefinition,
  type CaseManifest,
  type ExpectedResponseSet,
  type ThresholdConfig,
} from "@mbpt/core";

import rawConfig from "../../content/config/config-v1.json";
import rawActivities from "../../content/activities.json";
import rawResponseSets from "../../content/response-sets/response-sets-v1.json";
import rawTemplates from "../../content/feedback/templates-v1.json";
import rawSynthCase from "../../cases/C000-SYNTH/case.json";

export const config: ThresholdConfig = loadConfig(rawConfig);
export const activities: ActivityDefinition[] = ActivityCatalog.parse(rawActivities).activities;
export const responseSets: ExpectedResponseSet[] = ResponseSetLibrary.parse(rawResponseSets).sets;
export const templates: Record<string, string> = (rawTemplates as { templates: Record<string, string> }).templates;
export const synthCase: CaseManifest = validateCaseManifest(rawSynthCase);

export const APP_VERSION = "0.1.0";

export function activityById(id: string): ActivityDefinition | null {
  return activities.find((a) => a.activity_id === id) ?? null;
}

// Learner-facing wording for the structured judgement prompts. Demo-only
// authoring; the real prompt library is the learning engineer's deliverable.
export const PROMPT_TEXT: Record<string, string> = {
  A3_positioning_faults:
    "State how each positioning fault changes the reading, and in which direction.",
  B3_undersized_direction: "A cuff that is too small biases the reading in which direction?",
  B3_oversized_direction: "A cuff that is too large biases the reading in which direction?",
  B5_boundary_justification:
    "Justify the cuff you chose for this boundary arm, and state the residual uncertainty.",
  C4_underinflation_consequence:
    "Why does underinflation risk reading systolic below a gap, and why does over-rapid deflation bias both values?",
  D8_corrective_actions: "The sounds are inaudible or ambiguous. Name the corrective actions available.",
  E1_classification: "Classify the value you obtained, and state the classification.",
  E2_repeat_requirement: "Does a single elevated reading establish a diagnosis? What is required?",
  E4_crisis_escalation: "State what this value is and what you will do about it.",
  E6_documentation: "Document this measurement, omitting nothing.",
  E7_implausible_repeat: "The reading does not match your palpated estimate. What do you do?",
  E8_prior_discrepancy: "The value differs materially from the documented prior value. What is the correct action?",
  F2_error_attribution: "Which step of your own procedure most likely produced this result?",
  F4_error_kind: "Was that a technique error or a perceptual error?",
  C1_palpated_estimate: "Enter your palpated estimate of systolic pressure (mmHg).",
};

/** The response-set prompts belonging to an activity's objectives. */
export function promptsForActivity(activity: ActivityDefinition): ExpectedResponseSet[] {
  return responseSets.filter((set) =>
    activity.objectives.some((objective) => set.prompt_id.startsWith(`${objective}_`)),
  );
}
