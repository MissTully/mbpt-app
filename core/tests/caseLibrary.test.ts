import { describe, expect, it } from "vitest";
import { pressureAtTrackTime, selectCase, validateVideoManifest } from "../src/index.js";

const track = [
  { t_ms: 0, pressure_mmhg: 160 },
  { t_ms: 1000, pressure_mmhg: 160 },
  { t_ms: 2000, pressure_mmhg: 150 },
];
const manifest = {
  case_id: "C000-SYNTH",
  video_src: "video.webm",
  duration_ms: 2000,
  pressure_track: track,
};

describe("video manifest validation", () => {
  it("accepts a well-formed manifest", () => {
    expect(validateVideoManifest(manifest).case_id).toBe("C000-SYNTH");
  });

  it("rejects a track that is not strictly time-ordered", () => {
    const bad = { ...manifest, pressure_track: [track[0], track[0], track[2]] };
    expect(() => validateVideoManifest(bad)).toThrow(/time-ordered/);
  });

  it("rejects a track extending past the video duration", () => {
    const bad = { ...manifest, duration_ms: 1500 };
    expect(() => validateVideoManifest(bad)).toThrow(/past the video/);
  });

  it("rejects unknown fields — a typoed field must fail, not vanish", () => {
    expect(() => validateVideoManifest({ ...manifest, presure_track: track })).toThrow();
  });
});

describe("pressureAtTrackTime", () => {
  it("interpolates between samples", () => {
    expect(pressureAtTrackTime(track, 1500)).toBe(155);
  });
  it("clamps before the first and after the last sample", () => {
    expect(pressureAtTrackTime(track, -50)).toBe(160);
    expect(pressureAtTrackTime(track, 99999)).toBe(150);
  });
});

describe("selectCase rotation", () => {
  it("with no history picks the lexicographically first case", () => {
    expect(selectCase(["C2", "C1"], [], "A-1")).toBe("C1");
  });

  it("rotates to the case least recently used for the activity", () => {
    const history = [
      { activity_id: "A-1", case_id: "C1", seq: 1 },
      { activity_id: "A-1", case_id: "C2", seq: 2 },
    ];
    expect(selectCase(["C1", "C2"], history, "A-1")).toBe("C1");
  });

  it("ignores uses on other activities", () => {
    const history = [{ activity_id: "A-9", case_id: "C1", seq: 5 }];
    expect(selectCase(["C1", "C2"], history, "A-1")).toBe("C1");
  });

  it("is total: a single candidate is always returned", () => {
    const history = [{ activity_id: "A-1", case_id: "C1", seq: 1 }];
    expect(selectCase(["C1"], history, "A-1")).toBe("C1");
  });

  it("refuses an empty candidate list", () => {
    expect(() => selectCase([], [], "A-1")).toThrow(/no playable cases/);
  });
});
