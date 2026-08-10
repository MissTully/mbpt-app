# The case recording pipeline

How a recorded measurement becomes a playable case (ADR-007). A case is a
directory under `cases/` — drop a complete package in and the app registers
it automatically; `npm run cases` (part of `npm test`) refuses an incomplete
or inconsistent one.

## The package

```
cases/C0XX-NAME/
  case.json             ground truth, audibility profile, capture protocol
  video-manifest.json   video/audio filenames, duration, pressure track
  <video file>          the recording, audio muxed in (webm or mp4)
```

The synthetic development case (C000-SYNTH) additionally carries a sidecar
WAV because its stand-in media was generated without an audio encoder; real
recordings mux audio into the video and omit `audio_src`.

## The pipeline, in order

1. **Record.** One continuous take: the aneroid dial in frame, sharp and
   fill-frame; the auscultated Korotkoff audio on the same clock. Deflation
   at 2–3 mmHg/s. The capture-protocol fields in `case.json` (device, gain,
   sample rate, camera, sync method, consent record) are filled at the
   bench, not reconstructed later.

2. **Derive the pressure track.** Run the needle estimator
   (`tools/needle-lab`) over the video to produce time → mmHg samples
   (every 200 ms is ample). This is the estimator's job now — authoring
   time, not runtime — and its accuracy gate applies here: **within
   2 mmHg of a reference sensor on 95% of frames** for the rig, error
   distribution reported, not just the mean. A recording whose track fails
   the gate is re-shot, not shipped.

3. **Rate the ground truth.** At least two raters mark systolic and
   diastolic independently from the recording; agreement within the
   threshold recorded in `ground_truth.rater_agreement_mmhg`. The
   audibility profile's bands are authored from the same listening pass —
   an auscultatory gap is a silent band, not special code.

4. **Assemble and check.** Write `video-manifest.json` (the track, the
   duration, the media filename) and run `npm run cases`. The check
   enforces: manifests parse, ids agree, named media exists, the track is
   strictly time-ordered and inside the video's duration, and the ground
   truth values are reachable from the track's pressure range.

5. **Play it once end-to-end** in the app before merging: sounds land where
   the needle says they should, and a deliberate correct mark scores met.

## What the app does with it

The library is discovered from `cases/*/` at build time. Attempts rotate
through playable cases per activity (least recently used, deterministic —
`selectCase` in core), which is what makes the terminal mastery rule's
"at least two clinical cases in the streak" satisfiable once a second case
lands. Scoring resolves marks through the case's own track and refuses to
score against ground truth unless the exact case version the attempt was
made against is still in the library.

## A case that is not yet recorded

A directory with `case.json` but no `video-manifest.json` is a *planned*
case: it validates, is reported as "recording pending", and never reaches
the learner. The five release-2 objectives name theirs: C011 (atrial
fibrillation), C012 (auscultatory gap), C013 (hypotension), C014 (clear
phase-four muffling).
