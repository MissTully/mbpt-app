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
import rawLearnerText from "../../content/learner-text/learner-text-v1.json";
import rawSynthCase from "../../cases/C000-SYNTH/case.json";

export const config: ThresholdConfig = loadConfig(rawConfig);
export const activities: ActivityDefinition[] = ActivityCatalog.parse(rawActivities).activities;
export const responseSets: ExpectedResponseSet[] = ResponseSetLibrary.parse(rawResponseSets).sets;
export const templates: Record<string, string> = (rawTemplates as { templates: Record<string, string> }).templates;
export const synthCase: CaseManifest = validateCaseManifest(rawSynthCase);

// Learner-facing curriculum copy: the opening screen, module descriptions,
// and lesson introductions. Hand-authored draft (learning engineer to review).
export interface ModuleText {
  title: string;
  tagline: string;
  description: string;
}
export interface LessonText {
  title: string;
  intro: string;
}
export interface LearnerText {
  version: string;
  welcome: {
    app_name: string;
    tagline: string;
    intro: string[];
    how_it_works: { title: string; body: string }[];
    what_you_need: string[];
    expectations_heading: string;
    expectations: { title: string; body: string }[];
    scope_note: string;
    journey_heading: string;
    journey_intro: string;
    cta_start: string;
    cta_browse: string;
  };
  modules: Record<string, ModuleText>;
  lessons: Record<string, LessonText>;
}

function loadLearnerText(raw: LearnerText): LearnerText {
  // Every module and lesson the activity catalog references must have copy;
  // refuse to load rather than render a blank card (same posture as the
  // schema-parsed content above).
  for (const activity of activities) {
    if (!raw.modules[activity.module]) {
      throw new Error(`learner-text: no module text for ${activity.module} (referenced by ${activity.activity_id})`);
    }
    if (!raw.lessons[activity.lesson]) {
      throw new Error(`learner-text: no lesson text for ${activity.lesson} (referenced by ${activity.activity_id})`);
    }
  }
  return raw;
}

export const learnerText: LearnerText = loadLearnerText(rawLearnerText as LearnerText);

// Presence is guaranteed by loadLearnerText for everything in the catalog.
export function moduleTextOf(moduleId: string): ModuleText {
  const text = learnerText.modules[moduleId];
  if (!text) throw new Error(`learner-text: no module text for ${moduleId}`);
  return text;
}
export function lessonTextOf(lessonId: string): LessonText {
  const text = learnerText.lessons[lessonId];
  if (!text) throw new Error(`learner-text: no lesson text for ${lessonId}`);
  return text;
}

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
