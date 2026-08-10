import { activities, learnerText, lessonTextOf, moduleTextOf } from "../content.js";

// The opening screen. Everything it says is data from
// content/learner-text (draft copy, learning engineer to review); the only
// numbers on it are computed from the activity catalog, never typed in.

export function Welcome() {
  const t = learnerText.welcome;
  const moduleIds = [...new Set(activities.map((a) => a.module))];
  const lessonCount = new Set(activities.map((a) => a.lesson)).size;
  const totalMinutes = activities.reduce((sum, a) => sum + a.minutes, 0);
  const firstLesson = activities[0]?.lesson;

  return (
    <div>
      <div className="hero">
        <div className="hero-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="56" height="56">
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--accent)" strokeWidth="3" />
            <circle cx="32" cy="32" r="3" fill="var(--accent)" />
            <line x1="32" y1="32" x2="45" y2="19" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
            <path d="M32 6 v6 M58 32 h-6 M32 58 v-6 M6 32 h6" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1>{t.app_name}</h1>
        <p className="hero-tagline">{t.tagline}</p>
      </div>

      {t.intro.map((paragraph, i) => (
        <p key={i} className="prose">
          {paragraph}
        </p>
      ))}

      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">{moduleIds.length}</div>
          <div className="stat-label">modules</div>
        </div>
        <div className="stat">
          <div className="stat-num">{lessonCount}</div>
          <div className="stat-label">lessons</div>
        </div>
        <div className="stat">
          <div className="stat-num">{activities.length}</div>
          <div className="stat-label">activities</div>
        </div>
        <div className="stat">
          <div className="stat-num">~{Math.round(totalMinutes / 60)}h</div>
          <div className="stat-label">of practice</div>
        </div>
      </div>

      <h2>How it works</h2>
      {t.how_it_works.map((step, i) => (
        <div key={i} className="card step">
          <div className="step-num" aria-hidden="true">
            {i + 1}
          </div>
          <div>
            <strong>{step.title}</strong>
            <p className="step-body">{step.body}</p>
          </div>
        </div>
      ))}

      <h2>What you'll need</h2>
      <div className="card">
        <ul className="need-list">
          {t.what_you_need.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <h2>{t.expectations_heading}</h2>
      {t.expectations.map((item, i) => (
        <div key={i} className="card">
          <strong>{item.title}</strong>
          <p className="step-body">{item.body}</p>
        </div>
      ))}

      <div className="notice info">{t.scope_note}</div>

      <h2>{t.journey_heading}</h2>
      <p className="prose">{t.journey_intro}</p>
      {moduleIds.map((moduleId) => {
        const moduleText = moduleTextOf(moduleId);
        const minutes = activities.filter((a) => a.module === moduleId).reduce((s, a) => s + a.minutes, 0);
        return (
          <div key={moduleId} className="card tap" onClick={() => (location.hash = "#/modules")}>
            <div className="row spread">
              <strong>{moduleText.title}</strong>
              <span className="badge">{minutes} min</span>
            </div>
            <div className="step-body sub" style={{ marginBottom: 0 }}>
              {moduleText.tagline}
            </div>
          </div>
        );
      })}

      <div className="row" style={{ marginTop: 16 }}>
        {firstLesson && (
          <button onClick={() => (location.hash = `#/lesson/${firstLesson}`)}>{t.cta_start}</button>
        )}
        <button className="secondary" onClick={() => (location.hash = "#/modules")}>
          {t.cta_browse}
        </button>
      </div>

      <div className="sub" style={{ marginTop: 20 }}>
        Development build · synthetic case C000-SYNTH · release 1 is phone-only ·{" "}
        <a href="#/report">instructor report</a>
      </div>
    </div>
  );
}
