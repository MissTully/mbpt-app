# Manual Blood Pressure Trainer

An app for training the manual (auscultatory) blood pressure procedure. The
learner measures a real partner with real equipment; a phone camera reads the
real aneroid gauge, real recorded Korotkoff sounds play indexed to the
pressure the learner is actually producing, marks are made by voice, and a
pure deterministic scorer grades everything from immutable attempt records.

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
cases/        case packages; C000-SYNTH is the labelled synthetic dev case
tools/        never shipped: boundary check, crosswalk export/check,
              golden runner, needle laboratory
tests/golden/ hand-derived attempt records with expected scores
docs/adr/     architecture decision records
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
2. **Audio is indexed by pressure, not time.** Read
   `docs/adr/ADR-005-pressure-indexed-audio.md` before proposing to simplify
   playback.
3. **Thresholds live in configuration** (`content/config/`), versioned, with
   a changelog. A golden-set diff is a scoring change and gets reviewed line
   by line.
