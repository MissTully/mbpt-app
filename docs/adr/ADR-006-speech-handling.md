# ADR-006: Speech handling — onset detection separated from transcription

**Status:** partially decided · **Date:** 2026-08-10

## Context
Both of the learner's hands are on the equipment (invariant I-7), so marking
and judgement responses are voice-first. The product must work offline;
common browser speech recognition is not offline and may send audio off
device.

## Decision, part 1 (settled by design)
The mark timestamp comes from a cheap on-device audio onset detector, never
from a recogniser callback. A recogniser's latency — and worse, its latency
variance — must never enter a learner's score.

## Decision, part 2 ([DECISION-3], resolved 2026-08-10 by Melissa Tully)
**Structured input fallback** as the starting position: offline, spoken
judgement responses are entered as structured/typed input, recorded with
`input_mode` so a re-score can tell them apart; online browser recognition
may be added with a clear disclosure. An on-device speech model remains the
upgrade path behind the same port when app-size and cold-start costs are
worth paying.

## Honest limitation
Recognising or typing a correct option is an easier task than producing one
unprompted. This is stated in the perception capability report rather than
papered over, and reviewing `not_met` transcripts stays a standing fortnightly
task.
