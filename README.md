# Manual Blood Pressure Trainer

An app for training the manual (auscultatory) blood pressure procedure. The
learner rehearses the procedure with real equipment, then watches recorded
case measurements — an aneroid gauge falling at the correct rate with its
Korotkoff sounds — and marks systolic and diastolic as they happen. Marks
resolve to pressures through each case's authored pressure track, and a pure
deterministic scorer grades everything from immutable attempt records
(ADR-007; supersedes the pressure-indexed live audio of ADR-005).

The governing documents live at the repository root — start with
`README-document-set.md`. The architecture is ports-and-adapters with a
dependency-free core (ARC-MBPT-001); this repository implements it.

## Layout

```
core/         pure logic: model, engine, scorer, mastery, trends, config
perception/   ports, the needle estimator, trace analysis, the paced ramp
app/          the progressive web application (React + Vite)
shell/        (later) thin native wrapper
content/      versioned data: thresholds, activities, response sets, templates
content/instruction/  the teaching layer: lesson pages, glossary, video register
cases/        case packages; C000-SYNTH is the labelled synthetic dev case
tools/        never shipped: boundary check, crosswalk export/check,
              golden runner, needle laboratory, reading-level check
tests/golden/ hand-derived attempt records with expected scores
docs/adr/     architecture decision records
docs/video/   production briefs for the films the lessons call for
docs/decisions/ the living open-decisions log
```

## Getting started

```bash
npm install
npm test              # core + perception tests, boundary check, golden set, crosswalk
npm run dev           # the app, at http://localhost:5173
npm run build:app     # production PWA build
```

Useful tools:

```bash
npm run export:activities                          # workbook → content/activities.json
node tools/dist/needle-lab/src/lab.js --synthetic  # estimator error distribution (harness self-test)
```

## The three rules most worth knowing before touching anything

1. **The core imports nothing outward.** If the scorer cannot run from a
   command line over a JSON attempt record, the boundary has leaked. The
   build fails on violations (`npm run boundary`).
2. **Measurement playback is recorded video, scored via the pressure track.**
   Read `docs/adr/ADR-007-video-based-measurement-playback.md` — including
   what it knowingly gave up from ADR-005 — before touching playback or
   scoring. The video's deflation is never recorded as the learner's.
3. **Thresholds live in configuration** (`content/config/`), versioned, with
   a changelog. A golden-set diff is a scoring change and gets reviewed line
   by line.
4. **Teaching content is data, and its reading level is a build gate.**
   Lesson pages, the glossary and the video register live in
   `content/instruction/` and are written for an eighth-grade reader; `npm run
   readability` fails the build when that drifts. Every clinical word is
   written as `[[markup]]` and must have a glossary entry, or the application
   refuses to load rather than render a highlighted word with nothing behind
   it. See `content/instruction/README.md`.
