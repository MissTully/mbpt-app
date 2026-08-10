// Reflect activities: the learner's own data, shown honestly, never pass or
// fail. The window rule is a user experience requirement: below the window a
// trend is not drawn as though it meant something (UXS-MBPT-001 section 3).

import { useEffect, useState } from "react";
import {
  rateStabilityTrend,
  terminalDigitTrend,
  type ActivityDefinition,
  type AttemptRecord,
} from "@mbpt/core";
import { config } from "../content.js";
import { attemptStore } from "../adapters/store.js";
import { learnerId } from "../runner/attempt.js";

export function ReflectScreen({ activity }: { activity: ActivityDefinition }) {
  const [attempts, setAttempts] = useState<AttemptRecord[] | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void attemptStore.query({ learner_id: learnerId() }).then(setAttempts);
  }, []);

  if (!attempts) return <div className="card">Loading your attempts…</div>;

  const digits = terminalDigitTrend(attempts, config);
  const rates = rateStabilityTrend(attempts, config);

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
        <h2 style={{ marginTop: 0 }}>Terminal digits of your marks</h2>
        {digits.ready ? (
          <>
            <div className="chartbar">
              {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => {
                const count = digits.value.distribution[digit] ?? 0;
                const max = Math.max(1, ...Object.values(digits.value.distribution));
                return (
                  <div key={digit} style={{ flex: 1 }}>
                    <div
                      className={`bar ${(digit === "0" || digit === "5") && digits.value.biased ? "hot" : ""}`}
                      style={{ height: `${(count / max) * 80}px` }}
                    />
                    <div className="bar-label">{digit}</div>
                  </div>
                );
              })}
            </div>
            <p className="sub">
              {digits.value.biased
                ? "Your marks cluster on 0 and 5. What would you change about how you read the dial?"
                : "No rounding pattern is visible across this window."}
            </p>
          </>
        ) : (
          <p className="sub">
            {digits.attempts_needed} more marked {digits.attempts_needed === 1 ? "attempt" : "attempts"} and
            your rounding pattern becomes readable.
          </p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Deflation control across attempts</h2>
        {rates.ready ? (
          <>
            <div className="chartbar">
              {rates.value.excursion_counts.map((count, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <div className={`bar ${count > 0 ? "hot" : ""}`} style={{ height: `${count * 20 + 2}px` }} />
                </div>
              ))}
            </div>
            <p className="sub">
              Rate excursions per attempt, oldest to newest.{" "}
              {rates.value.excursions_falling
                ? "The count is falling — control is developing."
                : "The count is not falling yet."}
            </p>
          </>
        ) : (
          <p className="sub">
            {rates.attempts_needed} more measured {rates.attempts_needed === 1 ? "attempt" : "attempts"} before
            this trend means anything.
          </p>
        )}
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
