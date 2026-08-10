# ADR-005: Pressure-indexed audio with scheduled beat playback

**Status:** superseded by ADR-007 · **Date:** 2026-08-10
**The most important record for any future contributor.**

## Context
The learner controls deflation. The sounds must appear and disappear at the
pressures the learner is actually producing, or the product teaches a false
association.

## Decision
Case audio is broken into individual beats at annotation time, each tagged
with the pressure at which it occurred. At runtime a cardiac clock fires beat
requests from the case's real rhythm interval sequence; an audibility rule
answers, from the case's pressure-indexed profile, whether a sound is heard at
the current pressure and with what character. **A beat plays only when both
agree.** Playback is scheduled a fixed lookahead ahead against the audio
hardware clock, never triggered on demand — triggering adds event-loop jitter
to every beat; scheduling spends a fixed, budgeted lookahead instead.

## The alternative that will look simpler, and why it is wrong
Playing the original continuous recording along a timeline. A slow deflator
would hear the sounds finish early; a fast deflator would hear them continue
after the cuff was empty. Both learn a false association. Any future proposal
to "simplify" to timeline playback undoes the central design of the product —
this record exists so that argument takes thirty seconds, not a meeting.

## Consequences
The auscultatory gap case needs no special engine code — it is a silent band
in the audibility profile. Bluetooth routes are detected and warned about
because their added latency blows the synchrony budget on their own.
