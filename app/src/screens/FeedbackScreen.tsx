// Feedback, after the attempt (UXS-MBPT-001 section 7). Every number came
// from the scorer (principle P7); the templates received measured and
// threshold as variables and nothing was rounded, restated or invented.
// "Try again" is offered; "show me the answer" is not (invariant I-6) — the
// reference values appear only for marks the learner actually made, as the
// designed post-attempt comparison.

import { renderTemplate, type ActivityDefinition, type GroundTruth, type Mark, type ScoreResult } from "@mbpt/core";
import { config, templates } from "../content.js";

interface Props {
  activity: ActivityDefinition;
  result: ScoreResult;
  streaks: Record<string, number>;
  marks: Mark[];
  groundTruth: GroundTruth;
}

export function FeedbackScreen({ activity, result, streaks, marks, groundTruth }: Props) {
  const systolic = marks.filter((m) => m.type === "systolic").at(-1);
  const diastolic = marks.filter((m) => m.type === "diastolic").at(-1);
  const unaidedAssess = activity.type === "Assess";
  const assessedFindings = result.findings.filter((f) => f.outcome !== "not_assessable");

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Attempt complete</h2>
        {(systolic || diastolic) && (
          <div className="comparison">
            {systolic && (
              <div>
                <div className="sub" style={{ margin: 0 }}>systolic</div>
                <div className="big">
                  you {Math.round(systolic.pressure_mmhg)} · ref {groundTruth.systolic_mmhg}
                </div>
              </div>
            )}
            {diastolic && (
              <div>
                <div className="sub" style={{ margin: 0 }}>diastolic</div>
                <div className="big">
                  you {Math.round(diastolic.pressure_mmhg)} · ref {groundTruth.diastolic_mmhg}
                </div>
              </div>
            )}
          </div>
        )}
        {result.nothing_assessable && (
          <p className="sub">
            Nothing in this attempt could be assessed — this is a flag, not a failure.
          </p>
        )}
      </div>

      <div className="card">
        {result.findings.map((finding) => (
          <div className="finding" key={finding.objective_id + finding.finding_code}>
            <span className={`mark ${finding.outcome}`}>
              {finding.outcome === "met" ? "✓" : finding.outcome === "not_met" ? "✕" : "◦"}
            </span>
            <span>
              <strong>{finding.objective_id}</strong>{" "}
              {renderFinding(finding.finding_code, finding.measured, finding.threshold)}
            </span>
          </div>
        ))}
      </div>

      <div className="card row spread">
        <span>
          This attempt: {unaidedAssess ? "ASSESS" : activity.type.toUpperCase()} ·{" "}
          {assessedFindings.length > 0 ? `score ${result.total}` : "no score"}
        </span>
        <span>
          {activity.objectives
            .filter((o) => streaks[o] !== undefined)
            .map((o) => `${o} streak ${streaks[o]} of ${config.sequence_mastery_consecutive}`)
            .join(" · ")}
        </span>
      </div>

      <div className="row">
        <button onClick={() => location.reload()}>Try again</button>
        <button className="secondary" onClick={() => (location.hash = `#/lesson/${activity.lesson}`)}>
          Back to lesson
        </button>
      </div>
    </div>
  );
}

function renderFinding(code: string, measured: number | null, threshold: number | null): string {
  const template = templates[code];
  if (!template) return code;
  const variables: Record<string, number | string> = {};
  if (measured !== null) variables["measured"] = measured;
  if (threshold !== null) variables["threshold"] = threshold;
  try {
    return renderTemplate(template, variables);
  } catch {
    // A template referencing a variable the scorer did not supply is an
    // authoring fault (rule R-6); fall back to the stable code rather than
    // inventing a number.
    return code;
  }
}
