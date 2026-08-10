import { activities, lessonTextOf, moduleTextOf } from "../content.js";

// The module list tab: modules in curriculum order, each opening onto its
// lessons; a lesson card navigates to the lesson screen where activities run.

export function Modules() {
  const moduleIds = [...new Set(activities.map((a) => a.module))];
  return (
    <div>
      <div className="topbar">
        <h1>Modules</h1>
        <a href="#/report">Instructor</a>
      </div>
      <div className="sub">
        Work in order — each module stands on the last. Practice rehearses with
        feedback; Assess counts toward mastery only when unaided.
      </div>
      {moduleIds.map((moduleId) => {
        const moduleText = moduleTextOf(moduleId);
        const moduleActivities = activities.filter((a) => a.module === moduleId);
        const lessonIds = [...new Set(moduleActivities.map((a) => a.lesson))];
        const minutes = moduleActivities.reduce((s, a) => s + a.minutes, 0);
        return (
          <div key={moduleId} className="module-block">
            <h2>{moduleText.title}</h2>
            <div className="sub" style={{ marginBottom: 6 }}>
              {moduleText.tagline} · {lessonIds.length} {lessonIds.length === 1 ? "lesson" : "lessons"} ·{" "}
              {minutes} min
            </div>
            {moduleText.solo && (
              <div className="notice solo">
                <strong>Practice alone:</strong> {moduleText.solo}
                {moduleText.solo_demo && (
                  <>
                    {" "}
                    <a href="#/demo">Watch and listen: gauge demonstration →</a>
                  </>
                )}
              </div>
            )}
            {lessonIds.map((lessonId) => {
              const lessonText = lessonTextOf(lessonId);
              const lessonActivities = moduleActivities.filter((a) => a.lesson === lessonId);
              const lessonMinutes = lessonActivities.reduce((s, a) => s + a.minutes, 0);
              const allBlocked = lessonActivities.every((a) => a.release === "Spring");
              return (
                <div
                  key={lessonId}
                  className="card tap"
                  onClick={() => (location.hash = `#/lesson/${lessonId}`)}
                >
                  <div className="row spread">
                    <strong>{lessonText.title}</strong>
                    <span className="badge">{lessonMinutes} min</span>
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <span className="badge">
                      {lessonActivities.length} {lessonActivities.length === 1 ? "activity" : "activities"}
                    </span>
                    {allBlocked && <span className="badge blocked">coming in release 2</span>}
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
