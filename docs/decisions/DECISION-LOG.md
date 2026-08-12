# Decision log

Extends INSTR-MBPT-001 section 11 and the tags in SDD-MBPT-001 section 13.
Per the standing rule: an ambiguity is never resolved by an engineer's
inference; it is logged here with an owner. This file is updated as decisions
close — a stale open-decisions list is worse than none.

## Closed 2026-08-10 (confirmed by Melissa Tully)

| Tag | Decision | Resolution |
| --- | --- | --- |
| `[DECISION-1]` | Release 1 surface | **Phone only; glasses is a later layer.** Spatial interfaces are declared, unimplemented. Spatially-dependent objectives (A2, B4, D1) score `not_assessable` on phone. **Follow-up owned by Melissa:** the re-surfacing pass over the ActivityUX sheet and Coverage recalculation — the crosswalk checker currently reports 14 glasses-evidence tokens on release 1 activities as warnings. |
| `[DECISION-3]` | Offline speech | **Structured input fallback** to start; online recognition may be added with disclosure; on-device model is the upgrade path. See ADR-006. `spoken_responses[].input_mode` records which was used. |
| INSTR 11.3 | Circumference tolerance | **1.5 cm** (the exit-condition value) is in cfg-1.0.0 as `circumference_agreement_cm`. The objective text still reads 1 cm; the workbook edit to make them match is pending (learning engineer). |
| INSTR 11.4 | Module 1 Lesson 1 release tag | **Stays Spring-tagged as the Crosswalk has it.** Visible consequence, surfaced by the crosswalk checker: A5 is taught in release 1 but its only Assess surface (A-1.1.3) is Spring-tagged. |

## Adopted provisionally by this build (need formal adoption under INSTR 10.2)

| Item | What | Why |
| --- | --- | --- |
| `[DECISION-4]` fields | `case_version`, `calibration`, `expected_response_set_versions`, `app_version` on the attempt record; `scorer_version` on the score result | Required for faithful re-scoring; SDD section 6.1 |
| `[DECISION-5]` field | `habitus_category` (nullable) on the attempt record | TO-1 mastery needs it; until populated, the mastery engine reports TO-1 as blocked rather than guessing |
| New fields | `perception_mode`, `spoken_responses[].input_mode`, `learner_selection`, `seq` | Degraded-mode labelling (SDD §9), DECISION-3 resolution, objective F3, and a clock-skew-proof total order for "three consecutive" |
| New config params | `rest_duration_s` (300), `terminal_digit_bias_threshold` (0.5), `needle_confidence_threshold_provisional` flag | Thresholds the scorer/trends need; invariant I-2 forbids holding them in code. INSTR section 9 needs a matching update. |
| Prompt/gate id conventions | `spoken_responses.prompt_id` starts `<objective>_`; `safety_gate_responses.gate_id` starts `<objective>:` | Lets the scorer associate evidence with objectives without a lookup table |

## Adopted 2026-08-12

| Tag | Decision | Resolution |
| --- | --- | --- |
| `[DECISION-8]` | LRS statement export posture — Encountive LRS integration (decision D4 in Encountive/encountive-lrssql `docs/LRS_INTEGRATION_PLAN.md`) | **Two stages.** Stage 1 — export enrichment only: a pure mapper (attempts → xAPI statements) that runs outside `core/` and adds a `statements` array beside `attempts` in the existing manual JSON export; zero network calls from the learner device; ships without further approval. Stage 2 — opt-in background sync to the LRS: requires its own entry in this log before implementation, plus inclusion in the pre-pilot network-traffic audit (build plan task 5.7); not scheduled. Reaffirmed: the default-to-no-network invariant; the `core/` boundary check (no network in core — the mapper lives in `app/` or `tools/`); pseudonymous learner ids only (`learner-<8hex>` as the xAPI account name under homePage `https://mbpt.encountive.com/local`, never a person's name); no prose in statements (finding codes, scores, ids — never transcripts or free text). Vocabulary source of truth: `docs/xapi-glossary.md` in Encountive/encountive-lrssql (glossary v0.1). Numbering follows this log: DECISION-8 is the next free tag after the open DECISION-6/DECISION-7. |

## Still open, unchanged owners

| Tag | Decision | Owner | Blocks |
| --- | --- | --- | --- |
| `[DECISION-2]` | Dial linearity — from M1 evidence | Software engineer | ADR-002 completion |
| INSTR 11.2 | Cuff bladder fit standard, **in writing** with the partner institution | Nisha Patel | Objective B2 scoring (currently `not_assessable`, by design) |
| INSTR 11.5 | Is 14 accepted cases a release 1 gate or a variety target | Melissa Tully | Pilot scoping |
| `[DECISION-6]` | Device support matrix | Nisha Patel | Performance budget, test devices |
| `[DECISION-7]` | Microphone permission refused | Melissa Tully | Currently: marking activities are blocked with a clear explanation (implemented). Whether a non-voice marking path should exist is an invariant-level conversation. |
| INSTR 11.6 | Scope of practice per cohort | Nisha Patel | E4 wording per cohort; `escalation_scope` field exists in the case manifest, null until decided |
| INSTR 11.6 | Pilot date | Melissa Tully | Converts the build plan from a shape into a schedule |
| INSTR 11.6 | Recording site, raters, gauge models, device supply | Melissa Tully / Nisha Patel | Media programme, M1 validation corpus |
