import { useEffect, useState } from "react";
import { Home } from "./screens/Home.js";
import { ActivityRunner } from "./screens/ActivityRunner.js";
import { InstructorReport } from "./screens/InstructorReport.js";

// Hash routing: no router dependency, works offline, works installed.
function parseRoute(hash: string): { screen: string; param?: string } {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "activity" && parts[1]) return { screen: "activity", param: parts[1] };
  if (parts[0] === "report") return { screen: "report" };
  return { screen: "home" };
}

export function App() {
  const [route, setRoute] = useState(parseRoute(location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="app">
      {route.screen === "home" && <Home />}
      {route.screen === "activity" && route.param && (
        <ActivityRunner key={route.param} activityId={route.param} />
      )}
      {route.screen === "report" && <InstructorReport />}
    </div>
  );
}
