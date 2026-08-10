# tools

Never shipped to a learner. These run on a laptop and in continuous
integration (SDD-MBPT-001 section 5.6).

| Tool | Purpose |
| --- | --- |
| `boundary-check` | Fails the build if anything under core or perception imports a browser, camera, audio, device or node library. The rule that makes the architecture real. |
| `crosswalk-export` | Reads the Crosswalk workbook (the single source of truth) and generates `content/activities.json`. Generated, never hand edited. |
| `crosswalk-check` | The five coverage checks, the evidence contract check, and the release-1 count assertions. Runs in CI on every content change. |
| `golden-runner` | Scores the checked-in golden set and compares against hand-derived expected scores. Runs on every commit. |
| `needle-lab` | The standalone needle estimator harness. Takes frames plus a reference pressure log (or `--synthetic`), runs the estimator, emits the error distribution — median, p95, p99, max — and confidence-versus-error, from which `needle_confidence_threshold` is set at milestone M1. |

Missing on purpose: the case annotator and case acceptance checker (build plan
phase 2, tasks 2.8-2.9) need real capture-rig recordings to be meaningful and
are the next tools to build when the rig exists.
