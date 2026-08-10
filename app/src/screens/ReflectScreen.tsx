// Reflect activities: the learner's own data, shown honestly, never pass or
// fail. Honesty cuts both ways under ADR-007: marks are taps resolved
// through the case's pressure track, so digit-preference and deflation-rate
// panels would show the recording's behaviour, not the learner's — they are
// stated as unmeasurable rather than drawn as though they meant something
// (UXS-MBPT-001 section 3 posture).

import { useEffect, useState } from "react";
import type { ActivityDefinition, AttemptRecord } from "@mbpt/core";
import { groundTruthFor } from "../content.js";
import { attemptStore } from "../adapters/store.js";
import { learnerId } from "../runner/attempt.js";

const RECENT_WINDOW = 8;

export function ReflectScreen({ activity }: { activity: ActivityDefinition }) {
  const [attempts, setAttempts] = useState<AttemptRecord[] | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void attemptStore.query({ learner_id: learnerId() }).then(setAttempts);
  }, []);

  if (!attempts) return <div className="card">Loading your attempts…</div>;

  const marked = attempts.filter((a) => a.marks.length > 0).slice(-RECENT_WINDOW);

  return (
    <div>
      <div className="topbar">
        <a href={`#/lesson/${activity.lesson}`}>← Lesson</a>
        <span className="badge reflect">Reflect</span>
      </div>
      <h1>
        {activity.activity_id} · {activity.title}
      </h1>
      <div className="sub">Your own data. Never pass or fail.</div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Your recent marks against the reference</h2>
        {marked.length > 0 ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>Attempt</th>
                  <th>Systolic</th>
                  <th>Diastolic</th>
                </tr>
              </thead>
              <tbody>
                {marked.map((attempt) => {
                  const truth = groundTruthFor(attempt.case_id, attempt.case_version);
                  return (
                    <tr key={attempt.attempt_id}>
                      <td>{attempt.activity_id}</td>
                      <td>{markCell(attempt, "systolic", truth?.systolic_mmhg ?? null)}</td>
                      <td>{markCell(attempt, "diastolic", truth?.diastolic_mmhg ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="sub">
              Oldest to newest. A steady drift in one direction is a habit; scatter in both
              directions is attention. Which is yours?
            </p>
          </>
        ) : (
          <p className="sub">
            No marked attempts on this device yet. Your marks, and how far each landed from the
            case's reference values, will appear here.
          </p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What this release cannot yet measure</h2>
        <p className="sub">
          Two habits matter here that the app cannot observe yet: your rounding pattern when
          reading the dial (marks are made by tap, so the app never sees the number you read),
          and your own deflation-rate control (no pressure trace is captured from your cuff).
          Practise both on the practice arm alongside the recordings — and judge them honestly
          yourself, because for now you are the only one who can.
        </p>
      </div>

      <div className="card">
        <label htmlFor="interpretation">
          What do you see in your own data, and what will you practise next?
        </label>
        <textarea
          id="interpretation"
          rows={3}
          value={interpretation}
          onChange={(e) => setInterpretation(e.target.value)}
        />
        <button
          style={{ marginTop: 8 }}
          disabled={interpretation.trim() === "" || saved}
          onClick={() => setSaved(true)}
        >
          {saved ? "Recorded" : "Record my plan"}
        </button>
        {saved && (
          <p className="sub">Recorded. The system does not override your interpretation.</p>
        )}
      </div>
    </div>
  );
}

function markCell(attempt: AttemptRecord, type: "systolic" | "diastolic", reference: number | null): string {
  const mark = attempt.marks.find((m) => m.type === type);
  if (!mark) return "—";
  const value = Math.round(mark.pressure_mmhg);
  if (reference === null) return `${value}`;
  const delta = value - reference;
  return `${value} (${delta >= 0 ? "+" : ""}${delta})`;
}
