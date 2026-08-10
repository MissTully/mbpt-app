import { useEffect, useState } from "react";
import { Welcome } from "./screens/Welcome.js";
import { Modules } from "./screens/Modules.js";
import { Lesson } from "./screens/Lesson.js";
import { ActivityRunner } from "./screens/ActivityRunner.js";
import { GaugeDemo } from "./screens/GaugeDemo.js";
import { InstructorReport } from "./screens/InstructorReport.js";

// Hash routing: no router dependency, works offline, works installed.
function parseRoute(hash: string): { screen: string; param?: string } {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "modules") return { screen: "modules" };
  if (parts[0] === "lesson" && parts[1]) return { screen: "lesson", param: parts[1] };
  if (parts[0] === "activity" && parts[1]) return { screen: "activity", param: parts[1] };
  if (parts[0] === "demo") return { screen: "demo" };
  if (parts[0] === "report") return { screen: "report" };
  return { screen: "home" };
}

// The tab bar shows on browsing screens only; a running activity is
// full-focus and keeps its own navigation.
const TABBED_SCREENS = new Set(["home", "modules", "lesson"]);

export function App() {
  const [route, setRoute] = useState(parseRoute(location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="app">
      {route.screen === "home" && <Welcome />}
      {route.screen === "modules" && <Modules />}
      {route.screen === "lesson" && route.param && <Lesson key={route.param} lessonId={route.param} />}
      {route.screen === "activity" && route.param && (
        <ActivityRunner key={route.param} activityId={route.param} />
      )}
      {route.screen === "demo" && <GaugeDemo />}
      {route.screen === "report" && <InstructorReport />}
      {TABBED_SCREENS.has(route.screen) && <TabBar screen={route.screen} />}
    </div>
  );
}

function TabBar({ screen }: { screen: string }) {
  return (
    <nav className="tabbar">
      <a href="#/" className={screen === "home" ? "active" : ""}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        <span>Home</span>
      </a>
      <a
        href="#/modules"
        className={screen === "modules" || screen === "lesson" ? "active" : ""}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M4 5 H20 M4 12 H20 M4 19 H20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <span>Modules</span>
      </a>
    </nav>
  );
}
