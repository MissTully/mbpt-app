# ADR-007: Video-based measurement playback

**Status:** accepted · **Date:** 2026-08-10 · **Supersedes:** ADR-005

## Context
ADR-005 built the product around pressure-indexed audio: a camera reads the
learner's gauge and beats play at the pressures the learner actually
produces. The product owner has decided to withdraw that requirement.
Real-time audio scheduling, the runtime camera loop, and the synchrony
budget are no longer wanted; measurement practice will play recorded case
videos instead.

## Decision
Measurement activities play a case video: a recording of an aneroid gauge
falling at the correct rate with the case's Korotkoff sounds. The learner
watches, listens, and marks systolic and diastolic. Each case video carries
an authored **pressure track** (video time → mmHg), so a mark made at a
video timestamp resolves to a pressure and the existing pure scorer runs
unchanged. Ground truth stays in the case manifest.

The camera needle estimator moves from runtime to **authoring time**: it is
the tool that produces the pressure track when a real case video is
recorded. The perception workspace remains in the repository for that
purpose and for capture-rig validation.

## Consequences, accepted knowingly
- The sounds no longer track the learner's hands. A learner deflating a
  real cuff alongside the video hears the video's pressures, not their own.
- Deflation-rate control (domain C) can be paced against the video but not
  measured from it. Attempts carry no learner pressure trace; rate and
  inflation findings score not_assessable rather than being faked from the
  video's own ramp — the video's deflation must never be recorded as the
  learner's (invariant I-1 discipline).
- Marking becomes a perception skill scored against the video's known
  values. This is honest as long as feedback says what was measured: the
  learner's reading of a recorded measurement.
- Latency budgets, Bluetooth route warnings, beat libraries and rhythm
  scheduling leave the runtime entirely.

## The development asset
Real clinical videos do not exist yet. The synthetic case ships a stand-in:
a rendered dial video plus a WAV of the deterministic synthetic beats; the
player starts both together. A recorded case replaces all three files in
its case package — a video with muxed audio, a pressure track
(`video-manifest.json`), and rated ground truth in the case manifest.
