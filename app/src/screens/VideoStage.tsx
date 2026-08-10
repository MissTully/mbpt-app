// The video measurement stage (ADR-007): the learner watches the case video,
// listens, and marks systolic and diastolic by tap. A mark made at a video
// timestamp resolves to a pressure through the case's authored pressure
// track, so the pure scorer runs unchanged. No learner pressure trace is
// recorded — the video's deflation is never written down as the learner's.

import { useEffect, useRef, useState } from "react";
import { pressureAtTrackTime, type Mark, type PressureSample, type TrackingGap } from "@mbpt/core";
import type { CasePackage } from "../content.js";

export interface MeasurementEvidence {
  samples: PressureSample[];
  marks: Mark[];
  tracking_gaps: TrackingGap[];
}

export function VideoStage({
  casePkg,
  scaffold,
  countsTowardMastery,
  onDone,
}: {
  casePkg: CasePackage;
  scaffold: string;
  countsTowardMastery: boolean;
  onDone(evidence: MeasurementEvidence): void;
}) {
  const soundOnly = scaffold.toLowerCase().includes("sound");
  const guided = scaffold.toLowerCase().includes("guided");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [pressureNow, setPressureNow] = useState<number | null>(null);

  useEffect(() => {
    if (!guided) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) setPressureNow(pressureAtTrackTime(casePkg.video.pressure_track, video.currentTime * 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [guided]);

  function start() {
    void videoRef.current?.play();
    if (casePkg.audio_url) {
      // The generated dev asset carries its sound in a sidecar; a recorded
      // case muxes audio into the video and this element is absent.
      if (audioRef.current) audioRef.current.currentTime = videoRef.current?.currentTime ?? 0;
      void audioRef.current?.play();
    }
    setPlaying(true);
  }

  function mark() {
    const video = videoRef.current;
    if (!video || marks.length >= 2) return;
    const t_ms = Math.round(video.currentTime * 1000);
    const recorded: Mark = {
      type: marks.length === 0 ? "systolic" : "diastolic",
      t_ms,
      pressure_mmhg: Math.round(pressureAtTrackTime(casePkg.video.pressure_track, t_ms) * 10) / 10,
      source: "tap",
    };
    setMarks([...marks, recorded]);
  }

  function finish() {
    videoRef.current?.pause();
    audioRef.current?.pause();
    onDone({ samples: [], marks, tracking_gaps: [] });
  }

  return (
    <div>
      <div className="scaffold-banner">
        <span>scaffold: {scaffold}</span>
        <span className="mastery">{countsTowardMastery ? "COUNTS TOWARD MASTERY" : "practice"}</span>
      </div>

      <div className="stage">
        <video
          ref={videoRef}
          src={casePkg.video_url}
          playsInline
          muted={Boolean(casePkg.audio_url)}
          onEnded={() => {
            setEnded(true);
            audioRef.current?.pause();
          }}
          style={soundOnly ? { visibility: "hidden" } : undefined}
        />
        {casePkg.audio_url && <audio ref={audioRef} src={casePkg.audio_url} />}
        {soundOnly && playing && (
          <div className="occluder">Sound only — the gauge is hidden. Mark from your ears.</div>
        )}
        {!playing && (
          <div className="occluder">
            <div>
              <p>The recorded measurement plays once, at its own pace. Mark the first sound and the
              last as they happen.</p>
              <button onClick={start}>Play the measurement</button>
            </div>
          </div>
        )}
      </div>

      {guided && playing && pressureNow !== null && (
        <div className="pressure-readout">{Math.round(pressureNow)} mmHg</div>
      )}

      {playing && (
        <>
          <button onClick={mark} disabled={marks.length >= 2 || ended} style={{ width: "100%" }}>
            {marks.length === 0 ? "Mark systolic — first clear sound" : marks.length === 1 ? "Mark diastolic — sound disappears" : "Both marks made"}
          </button>
          <div className="static-instruction">
            {marks.map((m) => `${m.type} marked`).join(" · ") || "listening…"}
          </div>
          {(ended || marks.length >= 2) && (
            <button className="secondary" onClick={finish} style={{ width: "100%", marginTop: 8 }}>
              Finish attempt
            </button>
          )}
        </>
      )}
    </div>
  );
}
