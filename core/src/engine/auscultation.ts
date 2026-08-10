// The auscultation engine: cardiac clock, audibility rule, beat selection.
// SDD-MBPT-001 section 4.2. The audio is indexed by pressure, not by time —
// the central design rule of the whole product (ADR-005). The engine holds no
// clock of its own: the caller supplies time, so every part of this file is a
// pure function and testable in milliseconds.
//
// A beat plays only when both agree: the cardiac clock says when a heart beat
// occurs, the pressure says whether that beat is audible. Neither alone is
// sufficient, and building either one to drive playback on its own is the
// most likely wrong turn in this component.

import type { AudibilityProfile, BeatCharacter, BeatIndexEntry } from "../model/case.js";

/** The audibility rule: a pure function of pressure and case data. The
 * auscultatory gap is not a special case in code — it is a silent band in the
 * profile. */
export function audibilityAt(
  pressure_mmhg: number,
  profile: AudibilityProfile,
): BeatCharacter | null {
  for (const band of profile.bands) {
    if (pressure_mmhg <= band.upper_mmhg && pressure_mmhg > band.lower_mmhg) {
      return band.character;
    }
  }
  return null;
}

/** Select the beat from the beat library nearest the given pressure, among
 * beats of the required character. Ties resolve to the higher-pressure beat
 * so the choice is deterministic. */
export function selectBeat(
  pressure_mmhg: number,
  character: BeatCharacter,
  beatIndex: readonly BeatIndexEntry[],
): BeatIndexEntry | null {
  let best: BeatIndexEntry | null = null;
  let bestDistance = Infinity;
  for (const beat of beatIndex) {
    if (beat.character !== character) continue;
    const distance = Math.abs(beat.pressure_mmhg - pressure_mmhg);
    if (
      distance < bestDistance ||
      (distance === bestDistance && best !== null && beat.pressure_mmhg > best.pressure_mmhg)
    ) {
      best = beat;
      bestDistance = distance;
    }
  }
  return best;
}

// The cardiac clock: advances in real time, fires a beat request at each
// interval taken from the case's rhythm interval sequence. Deterministic
// given a start time and the sequence. The sequence loops when exhausted so
// a slow deflation never outlives the rhythm.
export interface CardiacClockState {
  next_beat_at_ms: number;
  interval_index: number;
}

export function startCardiacClock(
  start_ms: number,
  intervals_ms: readonly number[],
): CardiacClockState {
  return { next_beat_at_ms: start_ms + intervals_ms[0]!, interval_index: 0 };
}

export interface BeatRequest {
  at_ms: number;
}

/** Advance the clock to `now_ms`, returning every beat request that fell due.
 * Pure: returns the new state rather than mutating. */
export function advanceCardiacClock(
  state: CardiacClockState,
  now_ms: number,
  intervals_ms: readonly number[],
): { state: CardiacClockState; beats: BeatRequest[] } {
  const beats: BeatRequest[] = [];
  let { next_beat_at_ms, interval_index } = state;
  while (next_beat_at_ms <= now_ms) {
    beats.push({ at_ms: next_beat_at_ms });
    interval_index = (interval_index + 1) % intervals_ms.length;
    next_beat_at_ms += intervals_ms[interval_index]!;
  }
  return { state: { next_beat_at_ms, interval_index }, beats };
}

export interface ScheduledBeat {
  at_ms: number;
  beat: BeatIndexEntry;
  character: BeatCharacter;
}

/** The engine decision for one beat request: given the pressure at the beat
 * instant, decide whether a sound is heard and which recorded beat it is.
 * If not audible, nothing at all — silence is a decision, not an omission. */
export function decideBeat(
  request: BeatRequest,
  pressure_mmhg: number | null,
  profile: AudibilityProfile,
  beatIndex: readonly BeatIndexEntry[],
): ScheduledBeat | null {
  // Invariant I-9: no pressure (lost dial, low confidence) means no beat.
  // A wrong pressure fires beats at wrong values and teaches a false
  // association, which is worse than a brief silence.
  if (pressure_mmhg === null) return null;
  const character = audibilityAt(pressure_mmhg, profile);
  if (character === null) return null;
  const beat = selectBeat(pressure_mmhg, character, beatIndex);
  if (beat === null) return null;
  return { at_ms: request.at_ms, beat, character };
}
