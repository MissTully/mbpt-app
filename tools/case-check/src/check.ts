// The case-package check: every directory under cases/ must be a coherent
// package before it ships — manifest and video manifest parse, ids agree,
// the media the manifest names exists, and the ground truth is reachable
// from the pressure track. Runs in the test chain; a broken case fails the
// build, not the learner.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  pressureAtTrackTime,
  validateCaseManifest,
  validateVideoManifest,
} from "@mbpt/core";

const casesRoot = join(import.meta.dirname, "../../../../cases");
const dirs = readdirSync(casesRoot).filter((d) => statSync(join(casesRoot, d)).isDirectory());

let playable = 0;
let failed = false;
const fail = (msg: string) => {
  console.error(`  FAIL: ${msg}`);
  failed = true;
};

for (const dir of dirs) {
  const root = join(casesRoot, dir);
  console.log(`case package ${dir}:`);

  const casePath = join(root, "case.json");
  if (!existsSync(casePath)) {
    fail(`no case.json`);
    continue;
  }
  let manifest;
  try {
    manifest = validateCaseManifest(JSON.parse(readFileSync(casePath, "utf8")));
  } catch (e) {
    fail(`case.json invalid: ${(e as Error).message}`);
    continue;
  }
  if (manifest.case_id !== dir) fail(`directory ${dir} holds case_id ${manifest.case_id}`);

  const videoPath = join(root, "video-manifest.json");
  if (!existsSync(videoPath)) {
    console.log(`  note: no video manifest — not playable (recording pending)`);
    continue;
  }
  let video;
  try {
    video = validateVideoManifest(JSON.parse(readFileSync(videoPath, "utf8")));
  } catch (e) {
    fail(`video-manifest.json invalid: ${(e as Error).message}`);
    continue;
  }
  if (video.case_id !== manifest.case_id) {
    fail(`video manifest names ${video.case_id}, case is ${manifest.case_id}`);
  }
  for (const src of [video.video_src, video.audio_src].filter((s): s is string => Boolean(s))) {
    if (!existsSync(join(root, src))) fail(`media file ${src} named but missing`);
  }

  // Ground truth must be reachable from the track, or a correct mark could
  // never resolve to the correct pressure.
  const pressures = video.pressure_track.map((s) => s.pressure_mmhg);
  const max = Math.max(...pressures);
  const min = Math.min(...pressures);
  const truth = manifest.ground_truth;
  for (const [name, value] of [
    ["systolic", truth.systolic_mmhg],
    ["diastolic", truth.diastolic_mmhg],
  ] as const) {
    if (value > max || value < min) {
      fail(`${name} ${value} mmHg outside the track's range ${min}–${max}`);
    }
  }
  for (const band of manifest.audibility_profile.bands) {
    if (band.upper_mmhg > max) fail(`audibility band upper ${band.upper_mmhg} above track peak ${max}`);
  }
  // Sanity: the shared interpolator agrees the track starts at its peak.
  if (pressureAtTrackTime(video.pressure_track, 0) !== video.pressure_track[0]!.pressure_mmhg) {
    fail(`track interpolation inconsistent at t=0`);
  }

  if (!failed) console.log(`  ok: playable, ${video.pressure_track.length} track samples, ${Math.round(video.duration_ms / 1000)} s`);
  playable += 1;
}

if (playable === 0) {
  console.error("case check: no playable case packages — the app cannot run");
  process.exit(1);
}
if (failed) process.exit(1);
console.log(`case check: ${dirs.length} packages, ${playable} playable`);
