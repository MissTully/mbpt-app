# cases

Case packages, or references to them (INSTR-MBPT-001 section 6.8).

`C000-SYNTH` is a **synthetic development case**: software-rendered beats, no
subject, no recording. It exists so the closed loop can be built and
demonstrated before any real capture, and it is labelled synthetic everywhere
it appears — a tone generator trains a learner to recognise a tone generator
(INSTR section 8.1), so a synthetic case never counts toward the case-variety
condition of TO-1 mastery, and the pilot needs the real library.

The ten accepted real cases (C001-C010) are **not in this repository**. When
they are migrated (build plan task 2.10), each package lands here as
`C0NN/case.json` plus its media, with the raw reference pressure log kept
authoring-side only — it is never shipped to a learner device (SDD-MBPT-001
section 6.2).
