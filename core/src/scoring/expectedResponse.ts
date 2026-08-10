// Shape 4: expected response matching. Grades free responses without a model
// grading anything (SDD-MBPT-001 section 4.4.3). Deterministic over the
// stored transcript: the non-determinism of speech recognition lives at
// capture time, in the perception layer, never in the scoring path.

import type { ExpectedResponseSet } from "../model/responseSet.js";

export interface ResponseMatchResult {
  matched: boolean;
  missing_required: string[];
  disqualified_by: string[];
  prompted_violation: boolean;
}

/** Normalise a transcript for matching: lower case, punctuation stripped,
 * whitespace collapsed. Deterministic by construction; no locale-dependent
 * calls. */
export function normaliseTranscript(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/[.,;:!?'"()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function conceptPresent(normalised: string, surfaceForms: string[]): boolean {
  return surfaceForms.some((form) =>
    normalised.includes(normaliseTranscript(form)),
  );
}

export function matchExpectedResponse(
  transcript: string,
  prompted: boolean,
  set: ExpectedResponseSet,
): ResponseMatchResult {
  const normalised = normaliseTranscript(transcript);
  const missing = set.required_concepts
    .filter((c) => !conceptPresent(normalised, c.any_of))
    .map((c) => c.id);
  const disqualified = set.disqualifying_concepts
    .filter((c) => conceptPresent(normalised, c.any_of))
    .map((c) => c.id);
  const promptedViolation =
    set.rule === "all_required_no_disqualifying_unprompted" && prompted;
  return {
    matched:
      missing.length === 0 && disqualified.length === 0 && !promptedViolation,
    missing_required: missing,
    disqualified_by: disqualified,
    prompted_violation: promptedViolation,
  };
}
