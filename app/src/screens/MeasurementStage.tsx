// The core screen: a live measurement (UXS-MBPT-001 section 5). Everything
// absent is absent deliberately. During the descent the screen goes as quiet
// as the scaffold state permits; the static instruction never reacts, because
// reacting is feedback.

import { useEffect, useRef, useState } from "react";
import type { Mark, ScaffoldState } from "@mbpt/core";
import { config, synthCase } from "../content.js";
import { WebAudioOutput } from "../adapters/audioOut.js";
import { VoiceOnsetDetector } from "../adapters/voiceOnset.js";
import { PacedShadowingGaugeReader } from "../adapters/pacedGauge.js";
import { CameraGaugeReader, defaultGeometry } from "../adapters/cameraGauge.js";
import { MeasurementSession, type TrackingState } from "../runner/measurement.js";
import type { MeasurementEvidence } from "../runner/measurement.js";
import type { Calibration } from "@mbpt/core";

export type PerceptionChoice = "paced" | "camera";

interface Props {
  scaffold: ScaffoldState;
  countsTowardMastery: boolean;
  perception: PerceptionChoice;
  calibration: Calibration | null;
  cameraReader: CameraGaugeReader | null; // running, when perception=camera
  audio: WebAudioOutput;
  voice: VoiceOnsetDetector;
  onDone(evidence: MeasurementEvidence): void;
}

const PEAK = synthCase.ground_truth.systolic_mmhg + 40;

export function MeasurementStage(props: Props) {
  const [tracking, setTracking] = useState<TrackingState>("tracking");
  const [pressure, setPressure] = useState<number | null>(null);
  const [markCount, setMarkCount] = useState(0);
  const sessionRef = useRef<MeasurementSession | null>(null);
  const videoHost = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const gauge =
      props.perception === "camera" && props.cameraReader
        ? props.cameraReader
        : new PacedShadowingGaugeReader(PEAK, 2.5);
    if (props.perception === "camera" && props.cameraReader) {
      props.cameraReader.calibrate(props.calibration!);
      const video = props.cameraReader.videoElement();
      if (video && videoHost.current) videoHost.current.appendChild(video);
    }
    const session = new MeasurementSession(synthCase, gauge, props.audio, config, {
      onTrackingState: setTracking,
      onPressure: setPressure,
      onMark: (_mark: Mark) => setMarkCount((n) => n + 1),
    });
    sessionRef.current = session;
    props.voice.onOnset((t_ms) => session.recordOnset(t_ms));
    session.start();
    return () => {
      session.end();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guided = props.scaffold === "guided";
  const soundOnly = props.scaffold === "sound_only";
  const band = config.deflation_rate_band_mmhg_per_s;

  return (
    <div>
      <div className="scaffold-banner">
        <span>Scaffold: {props.scaffold.replace("_", " ").toUpperCase()}</span>
        <span className="mastery">
          {props.countsTowardMastery ? "Counts toward mastery" : "Practice, not scored for mastery"}
        </span>
      </div>

      <div className="stage">
        {props.perception === "camera" ? (
          <div ref={videoHost} style={{ width: "100%", height: "100%" }} />
        ) : (
          <div className="static-instruction">
            Paced shadowing: the pace is set for you.
            <br />
            Mark what you hear.
          </div>
        )}
        {soundOnly && (
          <div className="occluder">
            The gauge is occluded. Listen.
          </div>
        )}
        <div
          className={`tracking-dot ${tracking === "degraded" ? "degraded" : ""} ${tracking === "paused" ? "paused" : ""}`}
          title={`dial tracking: ${tracking}`}
        />
      </div>

      {tracking === "paused" && (
        <div className="notice">Bring the dial back into view.</div>
      )}

      {guided && (
        <div className="card">
          <div className="pressure-readout">
            {pressure === null ? "—" : `${Math.round(pressure)} mmHg`}
          </div>
          <div className="pacer">
            <div
              className="band"
              style={{ left: `${(band.min / 6) * 100}%`, width: `${((band.max - band.min) / 6) * 100}%` }}
            />
            <RatePacerNeedle pressure={pressure} band={band} />
          </div>
          <div className="sub" style={{ margin: 0 }}>
            deflation rate — keep the marker inside the band
          </div>
        </div>
      )}

      <div className="static-instruction">say “mark” at the first and the last sound</div>

      <div className="row spread" style={{ marginTop: 8 }}>
        <span className="badge">{markCount} of 2 marks</span>
        <button
          className="secondary"
          onClick={() => sessionRef.current && props.onDone(sessionRef.current.end())}
        >
          End attempt
        </button>
      </div>
    </div>
  );
}

// The live deviation indicator: silent, continuous, peripheral. Rate is
// derived from the displayed pressure trend for guidance only — nothing here
// touches the record or the score (every recorded number comes from the trace).
function RatePacerNeedle({ pressure, band }: { pressure: number | null; band: { min: number; max: number } }) {
  const history = useRef<{ t: number; p: number }[]>([]);
  const [rate, setRate] = useState(0);
  useEffect(() => {
    if (pressure === null) return;
    const now = performance.now();
    history.current.push({ t: now, p: pressure });
    history.current = history.current.filter((s) => now - s.t < 2000);
    const first = history.current[0];
    if (first && now - first.t > 400) {
      setRate(((first.p - pressure) / (now - first.t)) * 1000);
    }
  }, [pressure]);
  const clamped = Math.max(0, Math.min(6, rate));
  const out = rate < band.min || rate > band.max;
  return <div className={`needle ${out ? "out" : ""}`} style={{ left: `${(clamped / 6) * 100}%` }} />;
}
