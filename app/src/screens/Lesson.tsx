import { activities, lessonTextOf, moduleTextOf } from "../content.js";
import type { ActivityDefinition } from "@mbpt/core";

// The lesson screen: what the learner reads before doing. Introduction text
// from content/learner-text, then the lesson's activities in order.

// Spatially-dependent objectives cannot be assessed on a phone; activities
// whose surface is authored G are runnable in a reduced form and say so.
function surfaceNote(activity: ActivityDefinition): string | null {
  if (activity.release === "Spring") return "release 2 — needs a clinical case not yet in the library";
  if (activity.surface === "G") return "authored for glasses — runs reduced on phone, pending re-surfacing";
  return null;
}

export function Lesson({ lessonId }: { lessonId: string }) {
  const lessonActivities = activities.filter((a) => a.lesson === lessonId);
  const first = lessonActivities[0];
  if (!first) return <div className="card">Unknown lesson.</div>;

  const moduleText = moduleTextOf(first.module);
  const lessonText = lessonTextOf(lessonId);
  const minutes = lessonActivities.reduce((s, a) => s + a.minutes, 0);

  // The lesson after this one, in catalog order, for the footer link.
  const lessonIds = [...new Set(activities.map((a) => a.lesson))];
  const nextLessonId = lessonIds[lessonIds.indexOf(lessonId) + 1] ?? null;

  return (
    <div>
      <div className="topbar">
        <a href="#/modules">← Modules</a>
        <span className="badge">{minutes} min</span>
      </div>
      <div className="sub" style={{ marginBottom: 2 }}>
        {moduleText.title}
      </div>
      <h1>{lessonText.title}</h1>
      <p className="prose">{lessonText.intro}</p>

      <h2>Activities</h2>
      {lessonActivities.map((activity) => {
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

      {nextLessonId && (
        <div className="row" style={{ marginTop: 16 }}>
          <button className="secondary" onClick={() => (location.hash = `#/lesson/${nextLessonId}`)}>
            Next lesson: {lessonTextOf(nextLessonId).title} →
          </button>
        </div>
      )}
    </div>
  );
}
