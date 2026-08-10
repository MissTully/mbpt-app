// Versioned content the application consumes. All of it is data from the
// repository (ARC-MBPT-001 section 4.8): thresholds, activities, expected
// response sets, feedback templates, the demo case. Parsed through the core
// schemas so an invalid file refuses to load rather than defaulting.

import {
  ActivityCatalog,
  ResponseSetLibrary,
  loadConfig,
  validateCaseManifest,
  validateVideoManifest,
  type ActivityDefinition,
  type CaseManifest,
  type VideoManifest,
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

// The case library (ADR-007). A case package is a directory under cases/
// holding case.json (ground truth), video-manifest.json (the pressure track
// that bridges video time to mmHg), and the media the manifest names. Drop a
// complete package in and it registers here; an incomplete or inconsistent
// one refuses to load rather than playing wrong.
export interface CasePackage {
  manifest: CaseManifest;
  video: VideoManifest;
  video_url: string;
  audio_url: string | null;
}

const caseFiles = import.meta.glob("../../cases/*/case.json", { eager: true, import: "default" });
const videoManifestFiles = import.meta.glob("../../cases/*/video-manifest.json", {
  eager: true,
  import: "default",
});
const mediaFiles = import.meta.glob("../../cases/*/*.{webm,mp4,wav}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function buildCaseLibrary(): CasePackage[] {
  const packages: CasePackage[] = [];
  for (const [path, rawVideo] of Object.entries(videoManifestFiles)) {
    const dir = path.slice(0, path.lastIndexOf("/") + 1);
    const rawCase = caseFiles[`${dir}case.json`];
    if (!rawCase) throw new Error(`case library: ${dir} has a video manifest but no case.json`);
    const manifest = validateCaseManifest(rawCase);
    const video = validateVideoManifest(rawVideo);
    if (video.case_id !== manifest.case_id) {
      throw new Error(`case library: ${dir} video manifest names ${video.case_id}, case is ${manifest.case_id}`);
    }
    const video_url = mediaFiles[`${dir}${video.video_src}`];
    if (!video_url) throw new Error(`case library: ${dir} is missing media file ${video.video_src}`);
    const audio_url = video.audio_src ? (mediaFiles[`${dir}${video.audio_src}`] ?? null) : null;
    if (video.audio_src && !audio_url) {
      throw new Error(`case library: ${dir} is missing media file ${video.audio_src}`);
    }
    packages.push({ manifest, video, video_url, audio_url });
  }
  if (packages.length === 0) throw new Error("case library: no playable cases");
  return packages.sort((a, b) => (a.manifest.case_id < b.manifest.case_id ? -1 : 1));
}

export const caseLibrary: CasePackage[] = buildCaseLibrary();

export function caseById(case_id: string): CasePackage | null {
  return caseLibrary.find((c) => c.manifest.case_id === case_id) ?? null;
}

/** Ground truth for scoring an attempt — only if the exact case version the
 * attempt was made against is still in the library. Anything else scores
 * not_assessable rather than against the wrong answer. */
export function groundTruthFor(case_id: string | null, case_version: string | null) {
  if (case_id === null) return null;
  const pkg = caseById(case_id);
  if (!pkg || pkg.manifest.case_version !== case_version) return null;
  return pkg.manifest.ground_truth;
}

// Learner-facing curriculum copy: the opening screen, module descriptions,
// and lesson introductions. Hand-authored draft (learning engineer to review).
export interface ModuleText {
  title: string;
  tagline: string;
  description: string;
  /** How (and how far) this module works alone on the practice arm. */
  solo?: string;
  /** Link the gauge demonstration from this module's solo note. */
  solo_demo?: boolean;
}
export interface LessonText {
  title: string;
  intro: string;
}
/** Learner-facing copy for a Present activity, rendered instead of the
 * generated UX-spec fields when present. */
export interface ActivityText {
  body: string[];
  demo_link?: boolean;
}
export interface DemoText {
  title: string;
  subtitle: string;
  instructions: string;
  phase_holding: string;
  phase_above: string;
  phase1_crisp: string;
  phase2_swishing: string;
  phase4_muffled: string;
  phase_below: string;
  recap: string;
  rate_note: string;
  video_note: string;
  play: string;
  replay: string;
}
export interface LearnerText {
  version: string;
  welcome: {
    app_name: string;
    tagline: string;
    hero_image_alt: string;
    intro: string[];
    how_it_works: { title: string; body: string }[];
    what_you_need: string[];
    solo: {
      heading: string;
      intro: string;
      build_steps: string[];
      teaches: string;
      limits: string;
      demo_cta: string;
    };
    expectations_heading: string;
    expectations: { title: string; body: string }[];
    scope_note: string;
    journey_heading: string;
    journey_intro: string;
    cta_start: string;
    cta_browse: string;
  };
  demo: DemoText;
  modules: Record<string, ModuleText>;
  lessons: Record<string, LessonText>;
  activities?: Record<string, ActivityText>;
  /** Activities with no role in this release (e.g. glasses-only spatial
   * setup). Kept in the generated catalog — the workbook is its source of
   * truth — but never shown to the learner. */
  retired_activities?: Record<string, string>;
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
export function activityTextOf(activityId: string): ActivityText | null {
  return learnerText.activities?.[activityId] ?? null;
}

const retired = new Set(Object.keys(learnerText.retired_activities ?? {}));

/** The catalog as the learner sees it: retired activities excluded from
 * every list and count. Direct navigation to a retired activity still
 * resolves through activityById, honestly labelled. */
export const learnerActivities: ActivityDefinition[] = activities.filter(
  (a) => !retired.has(a.activity_id),
);

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
