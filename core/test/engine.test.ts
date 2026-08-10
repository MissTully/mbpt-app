import { describe, expect, it } from "vitest";
import {
  advanceCardiacClock,
  audibilityAt,
  decideBeat,
  selectBeat,
  startCardiacClock,
  type AudibilityProfile,
  type BeatIndexEntry,
} from "../src/index.js";

// Synthetic case shapes so engine tests do not wait on capture
// (SDD-MBPT-001 section 11).

const ordinaryProfile: AudibilityProfile = {
  bands: [
    { upper_mmhg: 134, lower_mmhg: 120, character: "phase1_crisp" },
    { upper_mmhg: 120, lower_mmhg: 100, character: "phase2_swishing" },
    { upper_mmhg: 100, lower_mmhg: 86, character: "phase4_muffled" },
  ],
};

// The auscultatory gap is a silent band in the profile, not a special case in
// code: the case that teaches objective D4 needs no new engine behaviour.
const gapProfile: AudibilityProfile = {
  bands: [
    { upper_mmhg: 180, lower_mmhg: 160, character: "phase1_crisp" },
    { upper_mmhg: 160, lower_mmhg: 140, character: null }, // the gap
    { upper_mmhg: 140, lower_mmhg: 100, character: "phase2_swishing" },
    { upper_mmhg: 100, lower_mmhg: 90, character: "phase4_muffled" },
  ],
};

const beats: BeatIndexEntry[] = [
  { beat_id: "b170", pressure_mmhg: 170, character: "phase1_crisp", source: "synth" },
  { beat_id: "b130", pressure_mmhg: 130, character: "phase1_crisp", source: "synth" },
  { beat_id: "b110", pressure_mmhg: 110, character: "phase2_swishing", source: "synth" },
  { beat_id: "b95", pressure_mmhg: 95, character: "phase4_muffled", source: "synth" },
];

describe("audibility rule", () => {
  it("is silent above systolic", () => {
    expect(audibilityAt(150, ordinaryProfile)).toBeNull();
  });
  it("returns phase one at systolic", () => {
    expect(audibilityAt(130, ordinaryProfile)).toBe("phase1_crisp");
  });
  it("is silent below phase five", () => {
    expect(audibilityAt(80, ordinaryProfile)).toBeNull();
  });
  it("is silent inside an auscultatory gap — the trap that teaches D4", () => {
    expect(audibilityAt(170, gapProfile)).toBe("phase1_crisp");
    expect(audibilityAt(150, gapProfile)).toBeNull();
    expect(audibilityAt(120, gapProfile)).toBe("phase2_swishing");
  });
});

describe("beat selection", () => {
  it("selects the nearest beat of the required character", () => {
    expect(selectBeat(128, "phase1_crisp", beats)?.beat_id).toBe("b130");
  });
  it("never selects a beat of another character", () => {
    expect(selectBeat(130, "phase4_muffled", beats)?.beat_id).toBe("b95");
  });
  it("returns null when the library has no beat of that character", () => {
    expect(selectBeat(130, "phase2_swishing", [beats[0]!])).toBeNull();
  });
});

describe("cardiac clock", () => {
  it("fires at the interval sequence, deterministically", () => {
    const intervals = [800, 800, 800];
    let state = startCardiacClock(0, intervals);
    const { state: s2, beats: due } = advanceCardiacClock(state, 2500, intervals);
    expect(due.map((b) => b.at_ms)).toEqual([800, 1600, 2400]);
    expect(s2.next_beat_at_ms).toBe(3200);
  });

  it("reproduces an irregular rhythm exactly — what makes the AF case valuable", () => {
    const irregular = [620, 940, 710, 1120];
    let state = startCardiacClock(0, irregular);
    const { beats: due } = advanceCardiacClock(state, 3500, irregular);
    expect(due.map((b) => b.at_ms)).toEqual([620, 1560, 2270, 3390]);
  });

  it("loops the sequence rather than falling silent on a slow deflation", () => {
    const intervals = [1000, 1000];
    const { beats: due } = advanceCardiacClock(startCardiacClock(0, intervals), 5500, intervals);
    expect(due.length).toBe(5);
  });
});

describe("the two-agreement rule: a beat plays only when clock and pressure agree", () => {
  it("plays the right beat when audible", () => {
    const scheduled = decideBeat({ at_ms: 1000 }, 130, ordinaryProfile, beats);
    expect(scheduled?.beat.beat_id).toBe("b130");
    expect(scheduled?.character).toBe("phase1_crisp");
  });

  it("plays nothing above systolic even though the clock fired", () => {
    expect(decideBeat({ at_ms: 1000 }, 160, ordinaryProfile, beats)).toBeNull();
  });

  it("plays nothing when pressure is unavailable (invariant I-9)", () => {
    expect(decideBeat({ at_ms: 1000 }, null, ordinaryProfile, beats)).toBeNull();
  });
});
