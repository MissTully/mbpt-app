// The case video manifest (ADR-007): what a recorded measurement must ship
// alongside its media. The pressure track is the bridge from a mark's video
// timestamp to a pressure, so its integrity is scoring integrity — validate
// at the door, refuse to load rather than default (invariant I-4 posture).

import { z } from "zod";

export const PressureTrackSample = z
  .object({
    t_ms: z.number().int().nonnegative(),
    pressure_mmhg: z.number().nonnegative(),
  })
  .strict();
export type PressureTrackSample = z.infer<typeof PressureTrackSample>;

export const VideoManifest = z
  .object({
    case_id: z.string().min(1),
    video_src: z.string().min(1),
    // The generated dev asset carries sound in a sidecar; recorded cases mux
    // audio into the video and omit this field.
    audio_src: z.string().min(1).optional(),
    duration_ms: z.number().positive(),
    pressure_track: z.array(PressureTrackSample).min(2),
  })
  .strict();
export type VideoManifest = z.infer<typeof VideoManifest>;

export function validateVideoManifest(raw: unknown): VideoManifest {
  const manifest = VideoManifest.parse(raw);
  let previous = -1;
  for (const sample of manifest.pressure_track) {
    if (sample.t_ms <= previous) {
      throw new Error(
        `video manifest ${manifest.case_id}: pressure track not strictly time-ordered at t_ms=${sample.t_ms}`,
      );
    }
    previous = sample.t_ms;
  }
  const last = manifest.pressure_track[manifest.pressure_track.length - 1]!;
  if (last.t_ms > manifest.duration_ms) {
    throw new Error(
      `video manifest ${manifest.case_id}: pressure track (${last.t_ms} ms) extends past the video (${manifest.duration_ms} ms)`,
    );
  }
  return manifest;
}

/** Pressure at a video timestamp, linearly interpolated; clamps to the ends.
 * Pure — the same function the scorer's mark resolution and any player UI
 * must share, so a mark and a readout can never disagree. */
export function pressureAtTrackTime(track: readonly PressureTrackSample[], t_ms: number): number {
  let previous = track[0]!;
  for (const sample of track) {
    if (sample.t_ms > t_ms) {
      const span = sample.t_ms - previous.t_ms;
      const fraction = span === 0 ? 0 : (t_ms - previous.t_ms) / span;
      return previous.pressure_mmhg + (sample.pressure_mmhg - previous.pressure_mmhg) * fraction;
    }
    previous = sample;
  }
  return previous.pressure_mmhg;
}
