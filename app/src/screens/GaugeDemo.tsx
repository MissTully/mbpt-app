import { useEffect, useRef, useState } from "react";
import { audibilityAt } from "@mbpt/core";
import { learnerText, synthCase, videoCase } from "../content.js";
import { pressureAtVideoTime } from "./VideoStage.js";

// The measurement demonstration (ADR-007): plays the case video with phase
// captions tracked from the pressure track — the same recording, player and
// track that measurement practice uses.

export function GaugeDemo() {
  const t = learnerText.demo;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [pressure, setPressure] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) setPressure(pressureAtVideoTime(video.currentTime * 1000));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  function start() {
    setEnded(false);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      void video.play();
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
    }
    setPlaying(true);
  }

  const caption = playing && !ended && pressure !== null ? captionFor(pressure) : "";
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

      <div className="stage">
        <video
          ref={videoRef}
          src={videoCase.video_url}
          playsInline
          muted={Boolean(videoCase.audio_src)}
          onEnded={() => {
            setEnded(true);
            audioRef.current?.pause();
          }}
        />
        {videoCase.audio_url && <audio ref={audioRef} src={videoCase.audio_url} />}
      </div>

      {caption && <div className="notice info">{caption}</div>}

      {!playing && (
        <>
          <p className="prose">{t.instructions}</p>
          <button onClick={start}>{t.play}</button>
        </>
      )}
      {ended && (
        <>
          <div className="card">
            <p className="prose" style={{ margin: 0 }}>
              {recap}
            </p>
          </div>
          <button onClick={start}>{t.replay}</button>
        </>
      )}

      <p className="sub" style={{ marginTop: 16 }}>
        {t.video_note}
      </p>
    </div>
  );
}

function captionFor(pressure: number): string {
  const t = learnerText.demo;
  const character = audibilityAt(pressure, synthCase.audibility_profile);
  if (character === "phase1_crisp") return t.phase1_crisp;
  if (character === "phase2_swishing") return t.phase2_swishing;
  if (character === "phase4_muffled") return t.phase4_muffled;
  const topOfSound = Math.max(...synthCase.audibility_profile.bands.map((b) => b.upper_mmhg));
  return pressure > topOfSound ? t.phase_above : t.phase_below;
}
