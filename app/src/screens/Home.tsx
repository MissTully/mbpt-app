import { activities } from "../content.js";
import type { ActivityDefinition } from "@mbpt/core";

// Spatially-dependent objectives cannot be assessed on a phone; activities
// whose surface is authored G are runnable in a reduced form and say so.
function surfaceNote(activity: ActivityDefinition): string | null {
  if (activity.release === "Spring") return "release 2 — needs a clinical case not yet in the library";
  if (activity.surface === "G") return "authored for glasses — runs reduced on phone, pending re-surfacing";
  return null;
}

export function Home() {
  const modules = [...new Set(activities.map((a) => a.module))];
  return (
    <div>
      <div className="topbar">
        <h1>Manual Blood Pressure Trainer</h1>
        <a href="#/report">Instructor</a>
      </div>
      <div className="sub">
        Development build · synthetic case C000-SYNTH · release 1 is phone-only.
        Practice rehearses with feedback; Assess counts toward mastery only when unaided.
      </div>
      {modules.map((moduleId) => {
        const moduleActivities = activities.filter((a) => a.module === moduleId);
        return (
          <div key={moduleId}>
            <h2>{moduleId}</h2>
            {moduleActivities.map((activity) => {
              const note = surfaceNote(activity);
              const blocked = activity.release === "Spring";
              return (
                <div
                  key={activity.activity_id}
                  className={`card ${blocked ? "" : "tap"}`}
                  onClick={() => {
                    if (!blocked) location.hash = `#/activity/${activity.activity_id}`;
                  }}
                >
                  <div className="row spread">
                    <strong>
                      {activity.activity_id} · {activity.title}
                    </strong>
                    <span className={`badge ${activity.type.toLowerCase()}`}>{activity.type}</span>
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <span className="badge">{activity.minutes} min</span>
                    <span className="badge">scaffold: {activity.scaffold}</span>
                    {activity.objectives.length > 0 && (
                      <span className="badge">{activity.objectives.join(" ")}</span>
                    )}
                    {note && <span className="badge blocked">{note}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
