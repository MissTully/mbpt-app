// The instructor's competency evidence view: the screen a programme director
// is shown. It reads as a record of what was observed and under what
// conditions. A7 never appears (invariant I-12, enforced in core), D1 is
// labelled partial, synthetic-case evidence is labelled synthetic.

import { useEffect, useState } from "react";
import {
  competencyEvidence,
  terminalObjectiveMastery,
  type CompetencyEvidenceRow,
  type TerminalObjectiveMastery,
} from "@mbpt/core";
import { config } from "../content.js";
import { scoredHistory, SYNTHETIC_CASE_IDS, learnerId } from "../runner/attempt.js";
import { attemptStore } from "../adapters/store.js";

const ALL_OBJECTIVES = [
  "A1","A2","A3","A4","A5","A6","A7",
  "B1","B2","B3","B4","B5","B6",
  "C1","C2","C3","C4","C5","C6",
  "D1","D2","D3","D4","D5","D6","D7","D8",
  "E1","E2","E3","E4","E5","E6","E7","E8",
  "F1","F2","F3","F4",
];

export function InstructorReport() {
  const [rows, setRows] = useState<CompetencyEvidenceRow[] | null>(null);
  const [terminal, setTerminal] = useState<TerminalObjectiveMastery | null>(null);

  useEffect(() => {
    void scoredHistory().then((history) => {
      setRows(competencyEvidence(ALL_OBJECTIVES, history, config));
      setTerminal(terminalObjectiveMastery(history, config, SYNTHETIC_CASE_IDS));
    });
  }, []);

  async function exportAttempts() {
    const json = await attemptStore.exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mbpt-attempts-${learnerId()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!rows) return <div className="card">Rebuilding from attempt records…</div>;
  const withEvidence = rows.filter((row) => row.evidence.length > 0);

  return (
    <div>
      <div className="topbar">
        <a href="#/">← Activities</a>
        <button className="quiet" onClick={exportAttempts}>
          Export attempt records
        </button>
      </div>
      <h1>Competency evidence</h1>
      <div className="sub">
        Learner {learnerId()} · config {config.version} · rebuilt from immutable attempt records on
        this device. Hand hygiene (A7) is self-reported and is not listed here as a measured
        competency. All current evidence is against a synthetic case and says so.
      </div>

      {terminal && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Terminal objective TO-1</h2>
          <p>
            {terminal.mastered ? "Mastered" : "Not yet mastered"} · {terminal.consecutive_met} consecutive
            qualifying {terminal.consecutive_met === 1 ? "attempt" : "attempts"} · habitus categories{" "}
            {terminal.habitus_categories_in_streak.join(", ") || "none recorded"} · real cases{" "}
            {terminal.cases_in_streak.join(", ") || "none (synthetic excluded)"}
          </p>
          {terminal.blocked_reason && <div className="notice">{terminal.blocked_reason}</div>}
        </div>
      )}

      {withEvidence.length === 0 && (
        <div className="card">No attempts recorded on this device yet.</div>
      )}

      {withEvidence.map((row) => (
        <div className="card" key={row.objective_id}>
          <div className="row spread">
            <strong>{row.objective_id}</strong>
            <span className={`badge ${row.mastered ? "practice" : ""}`}>
              {row.mastered
                ? "mastered"
                : `streak ${row.streak} of ${config.sequence_mastery_consecutive}`}
            </span>
          </div>
          {row.assessment_note && <div className="sub">partial assessment: {row.assessment_note}</div>}
          <table>
            <thead>
              <tr>
                <th>activity</th>
                <th>scaffold</th>
                <th>outcome</th>
                <th>case</th>
              </tr>
            </thead>
            <tbody>
              {row.evidence.slice(-6).map((evidence) => (
                <tr key={evidence.attempt_id}>
                  <td>{evidence.activity_id}</td>
                  <td>{evidence.scaffold_state}</td>
                  <td>{evidence.outcome}</td>
                  <td>{evidence.case_id ?? "—"}{evidence.case_id && SYNTHETIC_CASE_IDS.has(evidence.case_id) ? " (synthetic)" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
