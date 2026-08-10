import { useEffect, useRef, useState } from "react";
import {
  advanceCardiacClock,
  audibilityAt,
  decideBeat,
  startCardiacClock,
  type CardiacClockState,
} from "@mbpt/core";
import { rampPressureAt, standardRamp } from "@mbpt/perception";
import { WebAudioOutput } from "../adapters/audioOut.js";
import { learnerText, synthCase } from "../content.js";

// The gauge demonstration: an animated aneroid dial falling at the correct
// deflation rate, with Korotkoff beats decided by the same core engine that
// runs live measurement (cardiac clock + audibility rule + beat selection).
// A demonstration, not a video file — what plays here is exactly what solo
// practice on the paper-towel arm sounds like.

const PEAK_MMHG = 160;
const RATE_MMHG_PER_S = 2.5; // within the taught 2–3 mmHg/s band
const END_MMHG = 70; // enough silence below diastolic to make the point
const TICK_MS = 33;

type DemoPhase = "idle" | "running" | "done";

export function GaugeDemo() {
  const t = learnerText.demo;
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [pressure, setPressure] = useState<number>(PEAK_MMHG);
  const [holding, setHolding] = useState(true);

  const audio = useRef(new WebAudioOutput());
  const timer = useRef<number | null>(null);
  const clock = useRef<CardiacClockState | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      void audio.current.stop();
    };
  }, []);

  async function begin() {
    await audio.current.start();
    const ramp = standardRamp(PEAK_MMHG, RATE_MMHG_PER_S);
    const startedAt = performance.now();
    clock.current = startCardiacClock(startedAt, synthCase.rhythm_intervals_ms);
    setPhase("running");
    setHolding(true);
    setPressure(PEAK_MMHG);

    timer.current = window.setInterval(() => {
      const now = performance.now();
      const p = rampPressureAt(ramp, now - startedAt);
      if (p === null || p <= END_MMHG) {
        if (timer.current !== null) window.clearInterval(timer.current);
        timer.current = null;
        setPressure(p === null ? 0 : p);
        setPhase("done");
        return;
      }
      setPressure(p);
      setHolding(now - startedAt < 3000); // standardRamp's hold segment

      if (clock.current) {
        const advanced = advanceCardiacClock(clock.current, now, synthCase.rhythm_intervals_ms);
        clock.current = advanced.state;
        for (const request of advanced.beats) {
          const beatPressure = rampPressureAt(ramp, request.at_ms - startedAt);
          const scheduled = decideBeat(
            request,
            beatPressure,
            synthCase.audibility_profile,
            synthCase.beat_index,
          );
          if (scheduled) {
            audio.current.scheduleBeat(scheduled.beat.beat_id, scheduled.at_ms, scheduled.character);
          }
        }
      }
    }, TICK_MS);
  }

  const caption = captionFor(pressure, holding, phase);
  const groundTruth = synthCase.ground_truth;
  const recap = t.recap
    .replace("{systolic}", String(groundTruth.systolic_mmhg))
    .replace("{diastolic}", String(groundTruth.diastolic_mmhg));

  return (
    <div>
      <div className="topbar">
        <a href="#/">← Home</a>
        <span className="badge">demonstration</span>
      </div>
      <h1>{t.title}</h1>
      <p className="sub">{t.subtitle}</p>

      <AneroidDial pressure={pressure} />

      {phase === "running" && (
        <>
          <div className="pressure-readout">{Math.round(pressure)} mmHg</div>
          <div className="static-instruction">
            {t.rate_note.replace("{rate}", String(RATE_MMHG_PER_S))}
          </div>
          <div className="notice info">{caption}</div>
        </>
      )}

      {phase === "idle" && (
        <>
          <p className="prose">{t.instructions}</p>
          <button onClick={() => void begin()}>{t.play}</button>
        </>
      )}

      {phase === "done" && (
        <>
          <div className="card">
            <p className="prose" style={{ margin: 0 }}>
              {recap}
            </p>
          </div>
          <button onClick={() => void begin()}>{t.replay}</button>
        </>
      )}

      <p className="sub" style={{ marginTop: 16 }}>
        {t.video_note}
      </p>
    </div>
  );
}

function captionFor(pressure: number, holding: boolean, phase: DemoPhase): string {
  const t = learnerText.demo;
  if (phase !== "running") return "";
  if (holding) return t.phase_holding;
  const character = audibilityAt(pressure, synthCase.audibility_profile);
  if (character === "phase1_crisp") return t.phase1_crisp;
  if (character === "phase2_swishing") return t.phase2_swishing;
  if (character === "phase4_muffled") return t.phase4_muffled;
  const topOfSound = Math.max(...synthCase.audibility_profile.bands.map((b) => b.upper_mmhg));
  return pressure > topOfSound ? t.phase_above : t.phase_below;
}

// A plain aneroid face: 0–300 mmHg across 300 degrees, needle straight up at
// 150. Drawn to look like the instrument on the table, not a chart.
function AneroidDial({ pressure }: { pressure: number }) {
  const angle = (clamped: number) => -150 + clamped; // 1 degree per mmHg over 0–300
  const needleAngle = angle(Math.max(0, Math.min(300, pressure)));
  const ticks = [];
  for (let p = 0; p <= 300; p += 10) {
    const major = p % 20 === 0;
    ticks.push(
      <line
        key={p}
        x1={100}
        y1={14}
        x2={100}
        y2={major ? 24 : 19}
        stroke="var(--muted)"
        strokeWidth={major ? 2 : 1}
        transform={`rotate(${angle(p)} 100 100)`}
      />,
    );
  }
  const labels = [];
  for (let p = 0; p <= 300; p += 40) {
    const a = ((angle(p) - 90) * Math.PI) / 180;
    labels.push(
      <text
        key={p}
        x={100 + 62 * Math.cos(a)}
        y={100 + 62 * Math.sin(a) + 3}
        textAnchor="middle"
        fontSize="9"
        fill="var(--text)"
      >
        {p}
      </text>,
    );
  }
  return (
    <div className="dial-wrap">
      <svg viewBox="0 0 200 200" className="dial" role="img" aria-label={`Gauge at ${Math.round(pressure)} millimetres of mercury`}>
        <circle cx={100} cy={100} r={96} fill="var(--panel)" stroke="var(--border)" strokeWidth={3} />
        <circle cx={100} cy={100} r={88} fill="none" stroke="var(--border)" strokeWidth={1} />
        {ticks}
        {labels}
        <text x={100} y={140} textAnchor="middle" fontSize="8" fill="var(--muted)">
          mmHg
        </text>
        <line
          x1={100}
          y1={104}
          x2={100}
          y2={26}
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
          transform={`rotate(${needleAngle} 100 100)`}
        />
        <circle cx={100} cy={100} r={5} fill="var(--accent)" />
      </svg>
    </div>
  );
}
