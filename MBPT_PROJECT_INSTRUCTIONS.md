# Manual Blood Pressure Trainer: Project Instructions

**Document identifier:** INSTR-MBPT-001
**Version:** 1.0
**Date:** August 9, 2026
**Audience:** the software engineer and the learning engineer working on this product
**Derived from:** PPP-MBPT-004 (Product and Programme Plan, version 4.0) and the Encountive MBPT UX and Curriculum Crosswalk workbook
**Owner:** Melissa Tully, Founder, Chief Executive Officer and Learning Engineer

---

## 0. How to use this document

This file is the working agreement for two roles.

- **The software engineer** builds the system that senses, scores, records and delivers. Sections 1, 2, 3, 4, 6, 8, 9, 10 and 11 are binding on you. Read section 5 so you understand what the learning engineer is producing and why the shape of it matters.
- **The learning engineer** authors the objectives, the activities, the rubrics, the feedback text and the clinical case library. Sections 1, 2, 3, 5, 7, 8, 9, 10 and 11 are binding on you. Read section 6 so you understand what is physically measurable before you write an objective that assumes it.

If this file and any other document disagree, the order of authority is:

1. This file, for process and contracts between the two roles.
2. PPP-MBPT-004 version 4.0, for product scope, learning architecture and thresholds.
3. The Crosswalk workbook, for activity level detail.

Where the Plan and the Crosswalk currently contradict each other, section 11 names the contradiction and the decision needed. Do not silently pick one.

**Rule for both roles:** if you find yourself resolving an ambiguity by guessing, stop and add it to section 11 instead. Guesses become invisible design decisions that nobody can audit later.

---

## 1. Vocabulary

Every term below is used with exactly this meaning throughout the codebase, the workbook and all documentation. No abbreviations are introduced anywhere in the project without being defined here first.

### Clinical terms

| Term | Definition |
| --- | --- |
| Auscultatory method | Measuring blood pressure by listening, through a stethoscope, to sounds produced in the brachial artery while a cuff is slowly deflated. This is the method the product teaches. |
| Korotkoff sounds | The sounds heard during the auscultatory method. They occur in five phases. Phase one onset marks systolic pressure. Phase five disappearance marks diastolic pressure. Phase four is a muffling of the sound that occurs shortly before phase five. |
| Systolic pressure | The higher of the two numbers. The pressure at which blood first begins to pass under the cuff, marked at phase one onset. |
| Diastolic pressure | The lower of the two numbers, marked at phase five disappearance in most adults, or at phase four in specific populations. |
| Aneroid sphygmomanometer | A mechanical blood pressure gauge with a circular dial and a needle, inflated by a hand bulb. "Aneroid" means it contains no liquid, in contrast to a mercury column. This is the physical device the learner uses and the camera reads. |
| Auscultatory gap | A range of pressures within which the Korotkoff sounds temporarily disappear and then return. If the learner does not inflate high enough, they will start listening below the gap and record a systolic value that is falsely low. |
| Millimetres of mercury | The unit of blood pressure. Written in code and data as `mmhg`, displayed to learners as `mmHg`. |
| Body habitus | The overall body form and build of a person, used here mainly to mean arm size and shape, because arm circumference determines cuff size. |
| Antecubital fossa | The hollow at the front of the elbow. The cuff's lower edge sits 2 to 3 centimetres above it, and the stethoscope goes over the brachial artery within it. |
| Brachial artery | The artery in the upper arm over which the stethoscope is placed. |
| Contraindication | A reason not to use a particular limb at all, for example an arteriovenous fistula, lymphoedema, prior axillary lymph node dissection, an intravenous line, or injury. The correct response is to change limbs or escalate, never to proceed carefully. |
| Atrial fibrillation | An irregular heart rhythm. In this product it is the highest value single clinical recording, because it makes a single reading unreliable and forces averaging. |
| Orthostatic hypotension | Low blood pressure occurring on standing. One of the target clinical recordings. |

### Product and learning terms

| Term | Definition |
| --- | --- |
| Terminal objective | The single overall performance a competent learner must be able to produce. There is exactly one, identified as TO-1. |
| Enabling objective | A component performance that contributes to the terminal objective. There are 39, identified A1 to A7, B1 to B6, C1 to C6, D1 to D8, E1 to E8, F1 to F4. |
| Domain | A grouping of enabling objectives. Six domains, A through F. See section 3. |
| Activity | One unit of learner experience, identified as `A-<module>.<lesson>.<n>`, for example `A-3.4.4`. There are 61. |
| Activity type | One of Present, Practice, Assess, Reflect. Defined in section 5.2. |
| Scaffold state | The level of assistance present during a performance: Guided, Confirmatory, Sound only, or Unaided. Only Unaided counts toward mastery. Defined in section 5.3. |
| Attempt | One complete learner performance of an activity, producing one attempt record. |
| Attempt record | The immutable data object describing what happened during one attempt. The scorer reads it. Section 4.2 defines it. |
| Mark | A learner's declaration that they have heard systolic or diastolic, timestamped and paired with the pressure at that instant. |
| Case | One accepted clinical recording package: gauge video, synchronised audio, reference pressure log, annotations, ground truth and capture protocol record. Identified as `C001`, `C002` and so on. |
| Ground truth | The expert established correct systolic and diastolic values for a case, against which a learner's marks are scored. |
| Class A, B, C, D assets | The four categories of media the product needs. Class A is clinical case recordings. See section 6.6. |
| Needle estimator | The software component that reads the angle of the real aneroid needle from camera frames and converts it to a pressure in millimetres of mercury. Sometimes called the gauge reader. |
| Paced shadowing | The fallback mode used when no camera reading is available. An authored deflation ramp drives the engine instead of a real gauge, and the learner marks against it. This is a legitimate exercise, labelled as such, not an error state. |
| Deterministic scoring | Scoring in which the same attempt record always produces exactly the same score, on every device, forever. |
| Trend measure | A measure that has no meaning within a single attempt and is only computed across a window of attempts, for example rounding bias across ten attempts. |
| Surface | The device class an activity runs on. Phone or glasses. See section 11.1, which flags an unresolved conflict about surfaces. |
| Not human subjects research determination | A formal finding by an institution that a given activity is media production rather than research, and therefore does not need a full review board protocol. Weeks rather than months. |

### Naming rules

- The company and platform are **Encountive**. The product in this document is the **Manual Blood Pressure Trainer**. These are not interchangeable and neither is a synonym for the other.
- Objective identifiers are always capital letter plus number with no space: `A1`, `D4`, `F2`.
- Activity identifiers are always `A-<module>.<lesson>.<n>`.
- Case identifiers are always `C` plus three digits: `C011`.
- In code and stored data, use lower snake case and spell units: `pressure_mmhg`, `scaffold_state`, `arm_circumference_cm`.

---

## 2. Non-negotiable invariants

These are the rules that must hold in every release, on every surface. If a proposed change breaks one, it is not a change, it is a redesign, and it goes to section 11 first.

### For both roles

**I-1. Scoring is deterministic.** The same attempt record produces the same score every time, on every device, forever. This is what makes a score defensible to a programme director and auditable to an accreditor. No randomness, no wall clock reads, no floating point comparisons without an explicit tolerance, no model calls in the scoring path.

**I-2. Thresholds live in configuration, never in code.** Every number in section 9 is a versioned configuration value. Changing a tolerance is a data change with a version number and a changelog entry, never a code edit.

**I-3. Generative models phrase feedback. They never grade.** The scorer produces the score and the finding. A model may only be asked to word it. Any model response containing a number that does not appear in the scorer output is discarded and a templated fallback is shown instead. This check is implemented in code, not left to prompt discipline.

**I-4. Every attempt record carries its scaffold state.** Without this field, scaffolded success and unaided competence are indistinguishable and the mastery rule cannot be evaluated. A record missing `scaffold_state` is rejected at write time, not tolerated with a default.

**I-5. Feedback timing is a property of activity type and is enforced by the system.** Practice gives immediate feedback. Assess holds all feedback until the attempt ends. Mixing them teaches learners to fish for hints rather than to commit to a judgement, which is the exact habit that fails at a bedside.

**I-6. A discrepancy is never resolved by revealing the answer.** When the learner's value and the system's value disagree, the learner is asked to try again. Revealing the correct value removes the objective being assessed.

**I-7. Input never requires a hand that is holding equipment.** During a live measurement, input is voice or gesture only. Both of the learner's hands are on the bulb, the cuff and the stethoscope.

**I-8. Trends are scored separately from attempts.** Rounding bias is meaningless in one attempt and diagnostic across ten. Trend measures never contribute to a single attempt's score.

**I-9. A wrong pressure is worse than no pressure.** When needle reading confidence falls below threshold, treat the pressure as unavailable rather than using a low confidence value. A wrong pressure fires beats at wrong values and teaches a false association, which is worse than a brief silence.

**I-10. No clinical case enters the library without a complete capture protocol record.** No exceptions, including for the ten cases already held.

**I-11. Nothing in the product or in marketing claims this replaces supervised measurement on live human beings.** The defensible claim is that learners arrive at live practice having already achieved procedural fluency and having already heard variation they would otherwise never encounter.

**I-12. Objective A7, hand hygiene, is captured by self report only and must never be reported as a measured competency** on any report, dashboard or export. Objective D1, stethoscope placement, is tracked by proxy and cannot assess skin contact quality; it is reported as partial assessment, and the product says so.

---

## 3. The learning architecture, in brief

Both roles need this in working memory. The authoritative statement is PPP-MBPT-004 section 2.

### Terminal objective, TO-1

Given a patient of any body habitus, a calibrated aneroid sphygmomanometer and a stethoscope, the learner will obtain and interpret an auscultatory blood pressure measurement that falls within plus or minus 4 millimetres of mercury of the reference value on both systolic and diastolic pressure, using correct technique at every scored step, and will state the appropriate follow up action for the value obtained.

**Mastery of TO-1** requires the terminal objective on three consecutive attempts, across at least two body habitus categories and at least two clinical cases, with no scaffolding present.

**Why 4 millimetres of mercury:** it matches the scoring tolerance and it matches the inter-rater agreement threshold used to accept a case into the library. A case whose three expert raters cannot agree within 4 is rejected rather than averaged. Scoring a learner more tightly than the experts achieved would be indefensible.

### The 39 enabling objectives

| Domain | Title | Count | Covers |
| --- | --- | --- | --- |
| A | Preparation and patient safety | 7 | Contraindication screening, positioning, rest, patient explanation, hygiene |
| B | Cuff selection across body habitus | 6 | Measuring, selecting, consequence of mis-sizing, application, boundary judgement |
| C | Inflation and deflation control | 6 | Palpated estimate, inflation adequacy, deflation rate, re-inflation discipline |
| D | Auscultation and identification | 8 | Stethoscope placement, phase identification, gap detection, precision reading |
| E | Interpretation and action | 8 | Classification, escalation, documentation, reliability and repeat |
| F | Self monitoring and practice regulation | 4 | Trend awareness, error attribution, practice planning |

The count is 39. Earlier documents said 32, which was an arithmetic error. If you see 32 anywhere, that document is stale.

Domain F is the domain that justifies building a tutoring system rather than a checklist, because it is only assessable across attempts, which an instructor watching a single performance cannot do.

### Three kinds of safety gate

These behave differently in code, so they are three concepts, not one.

| Gate | Fires | Behaviour |
| --- | --- | --- |
| Contraindication | Before the procedure | Refuses the limb. The correct action is to select the other arm or escalate, not to proceed carefully. |
| Technique | During the procedure | Blocks progression until satisfied. Repeatable within one attempt. |
| Interpretation | After the measurement | Requires a stated action, not just a number. |

---

## 4. Shared data contracts

These are the boundary objects between the two roles. The learning engineer specifies what must be captured because an objective needs it. The software engineer guarantees it is captured and is stable. **Neither role changes these unilaterally.** Changes go through the process in section 10.

### 4.1 Objective and activity references

Every activity declares the objectives it serves, by identifier. Every attempt record carries the activity identifier and, through it, the objectives in play. This is what makes the coverage check in section 7.3 computable rather than a matter of opinion.

### 4.2 The attempt record

Below is the minimum field set. Some fields exist only because a specific objective cannot be scored without them, and each of those has been missed in earlier planning at least once. They are marked with the objective that requires them.

| Field | Type | Required by | Why it exists |
| --- | --- | --- | --- |
| `attempt_id` | identifier | all | Immutable primary key |
| `learner_id` | identifier | all | Pseudonymous. Never a name. |
| `activity_id` | string | all | For example `A-3.4.4` |
| `objectives` | list of string | all | Copied from the activity definition at attempt start, so a later curriculum edit cannot retroactively change what an old attempt was scored against |
| `scaffold_state` | enum: guided, confirmatory, sound_only, unaided | Every Domain B, C and D mastery rule | Scaffolded success is progress, not competence. Invariant I-4. |
| `surface` | enum: phone, glasses | Coverage reporting | Which device the attempt was made on determines which objectives were assessable at all |
| `case_id` | string, nullable | D and E scoring | Which clinical case was in play. Null for activities with no case. |
| `started_at`, `ended_at` | timestamp | all | Duration and session reconstruction |
| `config_version` | string | all | Which threshold set scored this attempt. Without it, a rescore is not reproducible. |
| `pressure_trace` | time series of `{t_ms, pressure_mmhg, confidence}` | C1 to C6, D2, D3 | The complete record of what the cuff actually did |
| `pressure_trace.peak_mmhg` | number | C2 | Inflation adequacy |
| `pressure_trace.mean_rate_mmhg_per_s` | number | C3 | Deflation rate |
| `rate_excursions` | list of intervals outside the rate band | C3 | A learner averaging 2.5 by alternating between 0.5 and 5 has not learned control. The mean hides this. |
| `reinflation_events` | list of `{t_ms, pressure_at_reinflation_mmhg}` | C5 | Re-inflating on a partly deflated cuff is a technique fault the mean rate hides |
| `tracking_gaps` | list of `{start_ms, end_ms, reason}` | D2, D3 | An attempt where the dial was lost during the marking window cannot be scored for accuracy and must be flagged rather than scored badly |
| `marks` | list of `{type: systolic\|diastolic, t_ms, pressure_mmhg, source}` | D2, D3, D6 | The learner's declarations |
| `spoken_responses` | list of `{prompt_id, transcript, t_ms, prompted: boolean}` | E1 to E8, B5, F2, F4 | The `prompted` flag is essential: a learner who names the escalation only when asked whether they should escalate has not met E4 |
| `safety_gate_responses` | list of `{gate_id, response, correct}` | A1, A5, B6 | Gate decisions |
| `arm_circumference_entered_cm` | number | B1 | What the learner measured |
| `arm_circumference_reference_cm` | number | B1 | The independent check |
| `cuff_selected` | string | B2 | Which cuff, detected or declared |
| `timer_events` | list | A4 | The five minute rest, enforced |
| `steps_completed` | list of step identifiers | A2, A4, A7 | Procedure sequence |
| `equipment_check` | object | setup | Gauge zero, audio check |
| `audio_route` | enum: wired, bluetooth, speaker, unknown | quality flag | See section 6.5. Bluetooth attempts may be refused for scoring. |

**Rules on this record:**

- It is append only. An attempt record is never edited after `ended_at`. Corrections are new records that reference the original.
- It must be scoreable offline, from the record alone, with no network call and no access to the running application.
- It must be re-scoreable. Given the record and a `config_version`, the scorer reproduces the original score exactly.

### 4.3 The case package

One case is a directory or object containing:

```
MBPT_<caseId>_<take>_<stream>.<ext>

  example   MBPT_C014_T02_gauge.mp4
            MBPT_C014_T02_audio.wav
            MBPT_C014_T02_pressure.csv
```

| Stream | Format |
| --- | --- |
| `gauge` | H.264 video, 1920 by 1080, 60 frames per second, constant frame rate, manual exposure, focus and white balance, no stabilisation |
| `audio` | WAV, pulse code modulation, 16 bit, 16 kHz or above, mono, no processing, no normalisation, no noise reduction of any kind |
| `pressure` | CSV with columns `t_ms`, `pressure_mmhg`, `sensor_id` |

Plus, mandatory under invariant I-10, a `capture_protocol` record:

```json
"capture_protocol": {
  "device": "<stethoscope make and model>",
  "mode": "bell",
  "gain": "fixed_setting_4",
  "sample_rate_hz": 16000,
  "camera": "<make, model, lens>",
  "frame_rate": 60,
  "exposure_locked": true,
  "reference_sensor_id": "REF-01",
  "sync_method": "led_tone_slate",
  "consent_record": "<reference>",
  "captured_on": "2026-09-xx",
  "operator": "<initials>"
}
```

Plus annotations produced in pipeline stage P6: needle read across the recording, beat onsets tagged with the pressure at which each occurred, and the rhythm interval sequence.

Plus ground truth from stage P7: systolic and diastolic as agreed by three independent expert raters.

### 4.4 The activity definition

The learning engineer authors these. The software engineer renders and scores them. Fields correspond to the columns of the ActivityUX sheet:

`activity_id`, `module`, `lesson`, `title`, `type`, `minutes`, `surface`, `scaffold`, `objectives`, `entry_state`, `learner_action`, `input_modality`, `system_response`, `evidence_captured`, `exit_condition`, `release`.

`evidence_captured` is the contract line. It names attempt record fields from section 4.2. **If an activity names evidence that the attempt record does not carry, that is a build blocker, not a detail.** The check runs in continuous integration; see section 8.3.

---

## 5. Instructions for the learning engineer

### 5.1 Your deliverables

1. The objective set, LO-MBPT-001, holding TO-1 and the 39 enabling objectives with their level and evidence type.
2. The Crosswalk workbook: ActivityUX, CurriculumMap, Coverage, SessionFlow and MediaAssets sheets, kept live and recalculated whenever an activity is added or a duration changes.
3. The rubric and threshold configuration, which is data the scorer consumes. See section 9.
4. The feedback text library: the templated findings the scorer emits and, separately, the phrasing guidance given to the model under invariant I-3.
5. The case requirements: which clinical conditions must be recorded, which objectives each unlocks, and the acceptance criteria for a case.
6. The instructor pack: session plan, report interpretation, failure modes.

### 5.2 The four activity types

| Type | Count | Function | Feedback timing |
| --- | --- | --- | --- |
| Present | 7 | Teaches. No performance demanded, no scoring. Used sparingly. | Not applicable |
| Practice | 27 | Rehearses with feedback. Scaffolds visible. Does not count toward mastery. | Immediate |
| Assess | 24 | Scores. Only unaided scaffold states count toward mastery. | Held until the attempt ends |
| Reflect | 3 | Reviews across attempts. Never pass or fail. Owns the trend measures. | Presentational only |

Present is deliberately rare. Seven of 61 activities. If a new design adds Present activities, ask whether the content could instead be discovered inside a Practice activity, because the product's advantage is performance with feedback, not exposition.

### 5.3 The scaffold ladder

The same objective can be met under four conditions. Only one counts.

| State | What is present | Purpose |
| --- | --- | --- |
| Guided | The aid is visible during the performance. Overlay, numeric readout, rate pacer. | Builds the association between action and result. |
| Confirmatory | The aid appears only after the learner commits. | Teaches self checking rather than following. |
| Sound only | The gauge is occluded so the learner cannot substitute looking for listening. | Isolates the perceptual channel actually being trained. |
| Unaided | Nothing. Real equipment, real patient, no assistance of any kind. | The only state counting toward mastery. |

Sound only is specific to auscultation. Do not apply it to activities where the visual channel is the thing being trained.

### 5.4 Authoring rules

**R-1.** Every Assess activity must have at least one Practice or Present activity for the same objective earlier in the sequence. The Coverage sheet flags any that do not.

**R-2.** Every objective must be both taught and scored. Currently zero holes. Keep it at zero.

**R-3.** Spoken judgement responses must record whether the learner was prompted. Unprompted is the mastery condition for Domain E.

**R-4.** Write the exit condition as a computable predicate over attempt record fields, not as a description. "Within 4 mmHg on 3 consecutive attempts" is computable. "Demonstrates competence" is not.

**R-5.** Every activity's `evidence_captured` must name fields that exist in section 4.2. If you need a new field, that is a contract change: raise it before authoring the activity, not after.

**R-6.** When authoring feedback, never write a number into the template that the scorer does not supply as a variable. Invariant I-3 discards model output containing unsourced numbers, and the same discipline applies to templates.

**R-7.** Objectives that depend on a clinical case that does not exist are tagged to the later release and are named in the workbook. They are never quietly assumed available.

### 5.5 Curriculum structure as it stands

Six modules, 22 lessons, 61 activities, 295 minutes of designed instruction.

| Module | Title | Lessons | Activities | Minutes | Domains |
| --- | --- | --- | --- | --- | --- |
| M0 | Orientation, equipment and setup | 1 | 3 | 8 | Setup, no objectives |
| M1 | Preparation and the procedure | 4 | 10 | 54 | A |
| M2 | Cuff selection across body habitus | 5 | 15 | 69 | B |
| M3 | Auscultation | 6 | 21 | 110 | C, D, F |
| M4 | Interpretation and action | 3 | 8 | 35 | E |
| M5 | Debrief and self regulation | 3 | 4 | 19 | F |

Release 1 carries 52 activities and 239 minutes and fully serves 34 objectives. Release 2 carries 9 activities and 56 minutes and unlocks the remaining 5.

### 5.6 The five objectives held to release 2

Named here so they are never rediscovered late. Each is blocked by a clinical recording that does not yet exist.

| Objective | Requires | Activities blocked | Case |
| --- | --- | --- | --- |
| D4, auscultatory gap detection | A recording containing a genuine auscultatory gap | A-3.6.1, A-3.6.5 | C012 |
| D5, phase four discrimination | A recording with a clear muffling point | A-3.6.2, A-3.6.5 | C014 |
| D7, irregular rhythm recognition | An atrial fibrillation recording | A-3.6.3, A-3.6.5 | C011 |
| E3, averaging in irregular rhythm | The same atrial fibrillation recording | A-4.3.2 | C011 |
| E5, hypotension recognition and action | A hypotensive recording with a patient presentation | A-4.2.2 | C013 |

**The honest scope statement, to be used verbatim with programme directors:** release 1 covers preparation, cuff selection, inflation and deflation control, core auscultation, interpretation of ordinary values, and the whole self regulation domain. It does not cover pathology recognition. That is a clean, bounded claim and it is far better stated up front than discovered by a programme director in week three.

### 5.7 The crosswalk is a live workbook, not a table

Recalculate the Coverage sheet every time an activity is added or a duration changes. The five checks and their required state:

| Check | Required state |
| --- | --- |
| Objectives not covered at all | 0 |
| Objectives taught but never scored | 0 |
| Objectives scored without any practice first | 0 |
| Objectives unavailable until release 2 | 5, and exactly the five in section 5.6 |
| Objectives fully served in release 1 | 34 |

Run against the first draft of the curriculum, this check found 23 faults: 13 objectives taught but never scored, and 10 assessed with no teaching activity before them. Closing them produced two activities the draft was missing entirely, including a full end to end unaided attempt. This is why the check earns its place in the build pipeline rather than living in a reviewer's head.

---

## 6. Instructions for the software engineer

### 6.1 Build order, and why it is not negotiable

**Build the needle estimator first, as a standalone offline tool, before any application exists.** Point it at recorded video of dials and compare its output against a reference pressure sensor log.

It is the decisive technical gate, because the closed loop depends on it. It is also the content annotation tool, because tagging each extracted heartbeat with the pressure at which it occurred requires reading pressure off your own recordings. And it is the capture rig validator, because it is what verifies a take is readable before a volunteer is thanked and sent home.

One tool, three jobs. If it hits accuracy, the product has a closed loop. If it is marginal, the product falls back to paced shadowing and the estimator still annotates the entire case library. If it fails outright, it has still validated the capture rig. **There is no outcome in which building it first is the wrong move.**

Acceptance for milestone M1: within 2 millimetres of mercury on 95 percent of frames, across three gauge models and three lighting conditions. Report the full error distribution, not just the mean. A mean error of 1 mmHg with a long tail of 15 mmHg outliers is a failure wearing a passing grade.

### 6.2 Architecture layers

| Layer | What it is | Runs where |
| --- | --- | --- |
| Core | Pure logic with no device dependencies: case models, the auscultation engine, the deterministic scorer, mastery rules, trend measures. Written once, tested on a laptop in under a second. | Everywhere. Also runs server side for batch scoring and content validation. |
| Perception interfaces | Declared by the core, implemented per platform: gauge reading, arm measurement, placement tracking. Nothing above this layer knows how a pressure value was obtained. | Interface everywhere, implementation per device. |
| Web application | The product. Progressive web application, installable, works offline, uses the standard browser camera and audio interfaces. | Every phone including iPhone, every tablet, every laptop, and the browser on Android XR devices. |
| Native shell | A thin wrapper around the same web application, for app store distribution and for camera access where a browser cannot reach it. | Google Play, including the store on Android XR devices. Apple App Store if and when wanted. |
| Spatial layer | Added later. Depth, anchors and hand tracking for the glasses specific activities. | Android XR devices only. Absent on phones, which lose nothing because those activities are glasses specific by design. |

**Why web first rather than native first:** a web application reaches every learner on the device already in their pocket, with no installation and no platform exclusion. A native shell around that same application adds store distribution and deeper camera access without a second codebase. Going native first would exclude iPhone learners on day one and force a rewrite to recover them.

The single most important structural rule: **the core must have no import of any browser, camera, audio or device library.** If you can run the entire scorer and mastery engine from a command line script over a JSON attempt record, the boundary is correct. If you cannot, it has leaked and it must be fixed before more is built on it.

### 6.3 How a reading is actually taken

1. The learner points the device camera at the real aneroid dial. The dial is high contrast by design, engineered to be read at a glance, and it is already in frame because the learner is looking at it.
2. A needle angle estimator reads the dial 30 to 60 times a second. Two point calibration, taken once per session in about 15 seconds, maps angle to millimetres of mercury.
3. That pressure value indexes the case audio. A cardiac clock advances in real time and fires beat requests. The pressure state decides whether a sound is audible. **A beat plays only when both agree.**
4. The learner marks systolic and diastolic by voice, because both hands are on the equipment. The mark is timestamped at voice onset, not at recognition, so timing is carried by onset detection rather than by a language model.

Point 4 matters more than it looks. If the mark timestamp comes from the speech recogniser's completion callback, it carries the recogniser's latency and its variance directly into the score. Onset detection is a separate, cheap, deterministic signal. Use it.

### 6.4 Two numbers that make this tractable

At a correct deflation rate of 2 to 3 millimetres of mercury per second, 100 milliseconds of processing latency corresponds to roughly a quarter of a millimetre of mercury. That is an order of magnitude inside the 4 millimetre scoring tolerance and below what a human can read off a dial.

**So pressure accuracy is not the binding constraint. Perceived audiovisual synchrony is.** That gives a budget of roughly 120 milliseconds end to end, which a 30 frame per second pipeline meets comfortably.

Spend your optimisation effort on the audio path and the synchrony budget, not on shaving milliseconds off the pressure computation.

### 6.5 Audio output route

Standard Bluetooth adds 100 to 200 milliseconds. That barely affects accuracy but it sits at the edge of perceptible lag against a needle the learner is watching, which will read to the learner as the product being broken.

Requirements: detect the output route, record it in the attempt record as `audio_route`, warn the learner when it is Bluetooth, and treat refusing to score Bluetooth attempts as a configurable policy. Recommend wired earphones in all instructor and learner materials.

### 6.6 Degraded modes, designed rather than discovered

| Condition | Behaviour |
| --- | --- |
| Dial lost for under 500 milliseconds | Extrapolate at the last observed rate. Continue audio. Say nothing. |
| Dial lost for 500 milliseconds to 3 seconds | Hold the last pressure, suppress new beats, show a small peripheral indicator. No spoken interruption. |
| Dial lost for over 3 seconds | Pause the attempt, mark the interval in `tracking_gaps`, prompt the learner to bring the dial into view. |
| Confidence below threshold while visible | Treat as lost. Invariant I-9. |
| Implausible rise with no squeeze detected | Reject the sample. Physical systems do not spontaneously repressurise. |
| No camera, or camera reading unavailable | Fall back to paced shadowing: the authored deflation ramp drives the same engine and the learner marks against it. A legitimate pacing and perception exercise, labelled as such, not a failure state. |

Every one of these must be reachable in a test. Write the degraded mode tests before the happy path is polished, because these are the states that occur in a real classroom with real lighting and a learner who moves.

### 6.7 The scoring path

- Input: one attempt record plus one threshold configuration version.
- Output: a score, a list of findings each tied to an objective, and mastery flag updates.
- Constraints: pure function, no input or output, no clock, no network, no model. Runs identically in the browser, on a server, and in a test harness.
- Trend measures run in a separate pass over a window of attempts and never contribute to a single attempt's score.

Test requirement: a golden set of attempt records with expected scores, checked in to the repository, run on every commit. When a threshold changes, the golden set is re-generated deliberately and the difference is reviewed line by line. That review is the audit trail.

### 6.8 Repository layout

A suggested structure that keeps the boundaries visible. Adapt names to your language, keep the separation.

```
/core                  pure logic, no device imports, no framework imports
  /model               case, activity, attempt record types
  /engine              auscultation engine, cardiac clock, audibility rules
  /scoring             deterministic scorer, mastery rules
  /trends              window based measures
  /config              loader and validator for the threshold configuration
/perception            interfaces declared here, implementations per platform
  /gauge               needle estimator
  /spatial             depth, anchors, placement tracking
/app                   the progressive web application
/shell                 the native wrapper
/content               activity definitions, feedback templates, rubric config
/cases                 case packages, or references to them
/tools
  /needle-lab          the standalone offline needle estimator harness
  /crosswalk-check     the coverage checks, run in continuous integration
/tests
  /golden              attempt records with expected scores
```

### 6.9 Definition of done, for a software change

- The core boundary is intact: no device import has crossed into `/core`.
- New thresholds went into configuration, with a version bump, not into code.
- Golden set passes, or the differences were reviewed and deliberately accepted.
- Any new attempt record field is documented in section 4.2 of this file in the same change.
- Degraded mode behaviour is tested, not just the happy path.
- The change is scoreable offline: the scorer still runs from a command line over a JSON record.

---

## 7. The handshake between the two roles

### 7.1 What flows from learning engineer to software engineer

| Artifact | Format | Consumed by |
| --- | --- | --- |
| Objective set | Structured list with identifiers, levels, evidence types | Mastery rules, reporting |
| Activity definitions | ActivityUX rows, exported to a machine readable file | The renderer and the scorer |
| Threshold configuration | Versioned configuration file, section 9 | The scorer |
| Feedback templates | Templated strings with named variables | The feedback layer |
| Case requirements and acceptance criteria | Section 6.6 of the Plan, MediaAssets sheet | The annotation pipeline and the acceptance gate |

### 7.2 What flows from software engineer to learning engineer

| Artifact | Why the learning engineer needs it |
| --- | --- |
| The attempt record schema, current version | Determines which exit conditions are computable and therefore which objectives are assessable |
| Perception capability report: what the gauge reader, depth and placement tracking can and cannot measure, with error bounds | Determines whether an objective can be assessed or only partially assessed, which must then be stated in the product |
| The needle estimator, as an annotation tool | Required to annotate the case library in pipeline stage P6 |
| Coverage check output from continuous integration | Confirms the crosswalk is still clean after a content change |

### 7.3 Review gates

Neither role ships past these alone.

| Gate | Reviewed by both | Question answered |
| --- | --- | --- |
| G-1, objective is assessable | Both | Can the system actually observe this, and with what error? If only partially, is that stated in the product? |
| G-2, activity is buildable | Both | Does every field in `evidence_captured` exist in the attempt record? |
| G-3, threshold change | Both | What does the golden set difference show, and is the change defensible to a programme director? |
| G-4, case acceptance | Learning engineer plus three raters, software engineer for the technical criteria | Does the case meet all seven acceptance criteria in section 8.2? |
| G-5, release scope | Both | Which objectives are actually served, and does the scope statement in section 5.6 still read true? |

---

## 8. The media production programme

This is the longest lead time item in the programme and no amount of engineering shortens it. The software engineer owns the annotation tooling and the technical acceptance criteria. The learning engineer owns the clinical requirements and the ground truth process. The chief executive officer owns the permissions and recruitment.

### 8.1 The four asset classes

| Class | Asset | Quantity for release 1 | Why it cannot be synthesised |
| --- | --- | --- | --- |
| A | Clinical case recordings: aneroid gauge video, synchronised Korotkoff audio, reference pressure log | 14 accepted cases | Real Korotkoff sounds carry the timing irregularity, spectral character and subject to subject variation that define the perceptual objective. A tone generator produces a sound that trains a learner to recognise a tone generator. |
| B | Technique demonstration video | 8 clips, 30 to 90 seconds | A real hand on a real arm shows the pressure, angle and hesitation that animation smooths away. |
| C | Habitus reference imagery | 12 arms across five categories | Needed to present size at scale for learners who cannot access the extremes in their cohort. |
| D | Instructor onboarding video | 4 clips | Pilots fail on instructor confusion far more often than on software defects. |

Classes B, C and D are ordinary production work, a single day with a colleague and a tripod. Class A is the programme.

### 8.2 Acceptance criteria for a Class A case

All seven must hold. A case failing any one is rejected, not patched.

1. Three expert raters agree on systolic and on diastolic within 4 millimetres of mercury. Disagreement beyond that **rejects the case rather than averaging it**, because a case whose correct answer experts cannot agree on cannot fairly score a learner.
2. The needle is readable by the automated reader across the entire descent, with no frame where confidence falls below threshold for more than 200 milliseconds.
3. No exposure or focus shift across the take, verified by frame differencing on a static region of the dial face.
4. No audio clipping and no audible speech.
5. Deflation rate within 2 to 3 millimetres of mercury per second for at least 80 percent of the descent.
6. Synchronisation offset between audio and video established to within 20 milliseconds.
7. A complete capture protocol record, per section 4.3.

Criteria 2, 3, 5 and 6 are automatable. Build them as a case acceptance script in `/tools`, run before a volunteer is thanked and sent home.

### 8.3 Capture rig rules that engineers must not relax

- **Exposure, focus and white balance are locked manually. No automatic anything.** This is the single most important line in the capture specification. Automatic exposure hunting between frames changes needle contrast and ruins automated needle reading.
- One digital stethoscope, one mode, one gain setting, for the entire library. Different modes apply different filtering. Mixing them makes cases incomparable and is unrecoverable after the fact.
- Dial face parallel to the sensor plane, filling roughly 60 percent of frame. Off axis framing introduces perspective distortion into the angle to pressure mapping.
- Electronic slate for synchronisation: an LED in frame lit simultaneously with an audible tone into the stethoscope channel. Audio and video are separate files, and without a hard sync marker every case carries an unknown offset.
- The inline reference pressure sensor logging at 50 Hz or better is an authoring tool. One rig. **Never shipped to a customer.**

### 8.4 Consent and de-identification, in one paragraph each

**This is not legal advice.** Every point is confirmed with counsel and with the host institution before any recording occurs.

**The distinction that decides the timeline:** recording volunteers to produce an educational product is generally not human subjects research, because it is not a systematic investigation designed to develop generalisable knowledge. It is media production, and a not human subjects research determination typically takes weeks. Evaluating whether the product improves learning **is** research and does require full review board approval, which takes months. These are two separate tracks and conflating them is what makes the media programme look like a six month problem when the production half of it is not.

**De-identification is easier here than it looks.** The asset the product needs contains a dial, a cuff, a forearm and heart sounds. It does not need a face, a voice, a name or a date of service. Frame the dial and the cuff only. No speech on the stethoscope channel; the operator uses hand signals. Subject identifiers live only on the take log, which is kept separately and is never shipped. Case identifiers are sequential and carry no clinical or personal reference. A Class A recording is therefore inherently de-identified at the point of capture rather than in post production.

**Consent must name the actual use.** A generic clinical photography consent is not sufficient. The form names commercial educational distribution, indefinite retention, and use at institutions other than the one where the recording was captured. A volunteer who consented to teaching use at their own clinic has not consented to a licensed product.

### 8.5 Case library status

Ten cases accepted. Six outstanding for full objective coverage. One deferred.

| Case | Condition | Priority | Unlocks | Status |
| --- | --- | --- | --- | --- |
| C001 to C010 | Normotensive and stage two hypertension | Have | D2, D3, E1 | Accepted |
| C011 | Atrial fibrillation, rate controlled | 1 | D7, E3 | Not started. Highest value single recording in the programme. |
| C012 | Auscultatory gap | 2 | D4 | Not started. Cannot be recruited by diagnosis; must be found by screening. |
| C013 | Hypotension, orthostatic | 3 | E5 | Not started |
| C014 | Phase four muffling | 4 | D5 | Not started |
| C015 | Large arm, large adult cuff | 5 | B2 reinforcement | Not started |
| C016 | Wide pulse pressure, elderly | 6 | Case variety | Not started |
| C017 | Paediatric, school age | 7 | Paediatric variation | Deferred. Separate mini programme. |

**The recruitment insight that shortens the schedule:** these do not have to be hospital patients. Community volunteers with a known diagnosis are far easier to recruit, far easier to consent, and produce identical recordings. Approaching a senior centre, a cardiac rehabilitation programme or a church group is a completely different undertaking from approaching a hospital ward, and it removes an entire layer of institutional gatekeeping.

---

## 9. The configuration file

Every value below is data, versioned, never a literal in code. This is invariant I-2.

| Parameter | Value | Note |
| --- | --- | --- |
| `marking_tolerance_mmhg` | 4 | Matches the case acceptance threshold deliberately |
| `deflation_rate_band_mmhg_per_s` | 2 to 3 | The most common technique fault by a wide margin |
| `inflation_margin_mmhg` | at least 30 above the palpated estimate | Underinflation is what turns a gap into a misdiagnosis |
| `cuff_edge_placement_cm` | 2 to 3 above the antecubital fossa | |
| `cuff_bladder_fit_standard` | **DECISION REQUIRED** | See section 11.2 |
| `sequence_mastery_score` | 90 or above on 3 consecutive attempts | |
| `terminal_digit_window` | 10 attempts | Below the window size a trend measure has no meaning |
| `palpation_agreement_mmhg` | 10 | C1: pulse disappearance within this of auscultated systolic |
| `circumference_agreement_cm` | 1.5 | B1 activity exit condition. Note the objective text says 1 centimetre; see section 11.3. |
| `tracking_loss_extrapolate_ms` | 500 | |
| `tracking_loss_hold_ms` | 3000 | |
| `needle_confidence_threshold` | to be set from milestone M1 results | |
| `sync_budget_ms` | 120 | End to end audiovisual synchrony |
| `bluetooth_scoring_policy` | warn, or refuse | Configurable |

Every configuration file carries a `version` string and every attempt record carries the `config_version` that scored it.

---

## 10. Change control

### 10.1 Records to open now

These exist as documents in the repository, not as email threads.

- **The capture protocol specification.** Frozen, printed, kept at the rig. Referenced by every case record.
- **The consent form and media release,** naming commercial educational distribution, reviewed by counsel.
- **Architecture decision record: web first plus native shell.** Records the reach argument.
- **Architecture decision record: optical gauge reading.** Records the latency reasoning and the milestone M1 validation result.
- **The take log template.** The only place subject identifiers ever appear, and it is never shipped.

### 10.2 How a change is made

| Change type | Process |
| --- | --- |
| A threshold value | Configuration edit, version bump, golden set re-run, difference reviewed at gate G-3 |
| A new attempt record field | Both roles agree, section 4.2 updated in the same change as the code, schema version bump |
| A new or edited activity | Authored in ActivityUX, Coverage recalculated, gate G-2, then implemented |
| A new objective | Both roles agree, objective set version bump, activities authored to cover it, Coverage must return to zero holes |
| An architectural decision | Architecture decision record written before the code |
| Anything touching an invariant in section 2 | Not a change. Raise it in section 11 and decide deliberately. |

### 10.3 Milestones

| Milestone | Depends on | Evidence it is met |
| --- | --- | --- |
| M1, needle estimator validated | Recorded dial video plus a reference sensor | Within 2 mmHg on 95 percent of frames, across three gauges and three lighting conditions. Error distribution reported, not just the mean. |
| M2, capture pipeline proven | M1, rig built, protocol frozen | Two colleague recordings taken all the way through to accepted cases |
| M3, permissions in place | Site identified, consent form approved | Written institutional permission and a not human subjects research determination |
| M4, case library migrated | M1 | Ten existing cases in the current schema with beat libraries and rhythm sequences |
| M5, core loop working | M1, M4 | A learner deflates a real cuff and hears the correct case sounds at the correct pressures |
| M6, curriculum implemented | M5 | 52 release 1 activities, crosswalk showing zero coverage faults |
| M7, pilot ready | M6, instructor pack, dry run | Instructors have run a full session on the real equipment in the real room |
| M8, pathology cases accepted | M2, M3, capture sessions | Priorities one to four accepted. Unlocks the five held back objectives. |

M1 through M7 are release 1. M8 is release 2 and it completes the product's central claim, which is why the media workstream starts on day one even though it delivers last.

**The three workstreams run in parallel, not in sequence.** Media production is calendar bound, software is effort bound, curriculum is already largely done. Running them serially would waste the autumn. Stage P3, site permission and the not human subjects research determination, starts on day one.

---

## 11. Open decisions that block work

Nothing in this section may be resolved by an engineer's inference. Each has a named owner.

### 11.1 Surface conflict between the Plan and the Crosswalk, highest priority

**The conflict.** PPP-MBPT-004 section 5 and risk R9 state that the first release is phones, and that glasses specific activities are excluded by release tag. The Crosswalk workbook, however, assigns roughly half of the 52 release 1 activities to surface `G`, glasses, including every scored checkpoint in Domain B, Domain E and Domain F, and the SessionFlow sheet is built entirely around one shared glasses unit rotating across four learners.

**Why it blocks.** These cannot both be true. If release 1 is phones only, then a large share of release 1 activities have no surface to run on, the SessionFlow is not the release 1 session flow, and the coverage figure of 34 objectives fully served in release 1 is wrong. If release 1 includes glasses, then risk R9 is not being managed and the spatial layer is not "added later", it is release 1 scope.

**What is needed.** A decision on release 1 surface scope, followed by a re-surfacing pass over the ActivityUX sheet and a recalculation of Coverage. My reading is that the Plan at version 4.0 is the newer document and is deliberately narrowing scope to phones, and that the Crosswalk predates that narrowing and still carries the earlier glasses first deployment model, including the product name "AURA" which appears nowhere in the Plan. **I have written this instructions file to the Plan, treating phone as the release 1 surface and glasses as a later layer.** That is a judgement call, not a decision. Confirm it.

**Owner:** Melissa Tully. **Needed by:** before any activity implementation begins, milestone M6.

### 11.2 Cuff bladder fit standard

Which standard does the rubric encode: the current professional statement, or the widely taught legacy proportional rule of bladder width at 40 percent of arm circumference and bladder length at 80 percent? These give different answers at boundary circumferences, which is exactly where objectives B2 and B5 are assessed.

Consequence of not answering: objective B2 is unscoreable, and B2 carries the human variation acceptance criterion that is the reason the product exists.

The configuration already supports either. This is a content decision, not an engineering one, and it must be confirmed **in writing** with the partner institution, because risk R7 is that the rubric encodes a standard the institution does not teach.

**Owner:** Nisha Patel with the partner institution. **Needed by:** before the rubric freezes.

### 11.3 Circumference tolerance mismatch

Objective B1 states measurement to within **1 centimetre** of reference. The activity exit conditions for A-2.1.2 and A-2.1.3 both use **1.5 centimetres**. One of these is wrong.

My reading is that 1.5 is the practical tolerance chosen once the depth estimate's own error was accounted for, and that the objective text was not updated. But that is inference. Pick one and make the other match.

**Owner:** Melissa Tully as learning engineer. **Needed by:** before B1 activities are implemented.

### 11.4 Release tag on Module 1 Lesson 1

Activities A-1.1.1, A-1.1.2 and A-1.1.3, the procedure walkthrough, the sequence build and the unsafe step identification, are tagged Spring in the Crosswalk. Nothing in the Plan explains why: none of them depends on a missing clinical case, and the Plan's scope statement says release 1 covers preparation. If this tag is an error, release 1 gains three activities and 19 minutes and the release 1 totals change.

**Owner:** Melissa Tully as learning engineer. **Needed by:** before release 1 scope is communicated to any partner.

### 11.5 Case count for release 1

The Plan section 4.1 requires 14 accepted Class A cases for release 1. The MediaAssets sheet shows 10 accepted and treats the remaining 6 as unlocking specific objectives rather than as a release 1 quantity requirement. Clarify whether 14 is a release 1 gate or a target for case variety.

**Owner:** Melissa Tully. **Needed by:** before the pilot is scoped.

### 11.6 Carried forward from the Plan, section 9

| Question | Owner | Needed by | Consequence of not answering |
| --- | --- | --- | --- |
| Which site hosts the recording, and is a not human subjects research determination available there? | Melissa Tully | Week 1 | The entire media programme, and with it five objectives |
| What is the scope of practice boundary for escalation, per cohort? A patient care technician and a practical nursing student owe different actions on a crisis value. | Nisha Patel | Before Domain E content is authored | One rubric cannot serve both cohorts without a scope parameter in the case data |
| Do partner programmes supply devices at the station, or is bring your own device assumed? | Nisha Patel | Before the pilot is scoped | Determines whether the platform architecture is sufficient |
| Which gauge models are actually in use at the partner institutions? | Nisha Patel | Before milestone M1 completes | The needle reader must be validated against the dials learners will really point a camera at |
| Who are the three expert raters for ground truth, and are they available for the volume required? | Melissa Tully | Before capture sessions | Cases cannot be accepted into the library without them |
| Is the pilot date set? | Melissa Tully | Immediately | Every milestone is currently relative rather than dated |

---

## 12. Risks the engineers own day to day

The full risk register is in PPP-MBPT-004 section 8. These four are the ones that show up in daily engineering decisions.

| Risk | Your standing response |
| --- | --- |
| R2, needle reading does not reach required accuracy in classroom conditions | Prove it offline before any application code exists. Paced shadowing is a complete shippable product and the estimator still serves annotation. |
| R3, capture protocol drift makes the library internally incomparable | One device, one mode, one gain, one rig. Recorded in every case and audited at acceptance. Locked manual exposure is the single most important setting. |
| R6, engineering capacity insufficient for the activity count | Contract the undifferentiated interface work. Keep the needle estimator, the scorer and the content pipeline in house, because those are the durable assets. |
| R8, learners use Bluetooth earphones and audio lags the needle | Detect the output route, warn, and consider refusing to score attempts made on a Bluetooth route. |

---

## Appendix A: the 39 enabling objectives

Reproduced for reference. Level notation follows the cognitive, psychomotor and affective taxonomies as used in LO-MBPT-001.

**Domain A, preparation and patient safety**

| ID | Objective | Level | Evidence |
| --- | --- | --- | --- |
| A1 | Screen the limb for contraindications and select an alternative site or escalate, identifying every contraindicated limb | Cognitive, Apply | Gate response |
| A2 | Position the patient with back supported, feet flat, legs uncrossed and the arm supported at heart level, all four before inflation | Psychomotor, Guided response | Geometric or vision check |
| A3 | State how each positioning fault changes the reading and in which direction | Cognitive, Understand | Spoken or typed response |
| A4 | Allow five minutes of quiet rest before inflation, with no talking | Psychomotor, Set | Timer, steps completed |
| A5 | Identify conditions that invalidate a reading and defer or document accordingly | Cognitive, Apply | Gate response |
| A6 | Explain the procedure to the patient and obtain cooperation before touching the limb | Affective, Responding | Speech event detection, partial |
| A7 | Perform hand hygiene before patient contact | Psychomotor, Set | Self report only, never a measured competency |

**Domain B, cuff selection across body habitus.** This domain carries the human variation acceptance criterion. It is the reason the product exists.

| ID | Objective | Level | Evidence |
| --- | --- | --- | --- |
| B1 | Measure arm circumference at the midpoint between acromion and olecranon, to within one centimetre of reference | Psychomotor, Guided response | Entered value, independently checked |
| B2 | Select the correct cuff from a measured circumference, with no error across ten trials spanning four size categories | Cognitive, Apply | Cuff selected against form detected |
| B3 | Predict the direction and approximate magnitude of error from an undersized and an oversized cuff | Cognitive, Analyze | Response, plus consequence simulation |
| B4 | Apply the cuff on bare skin, bladder centred over the brachial artery, lower edge 2 to 3 centimetres above the fossa, index line verified | Psychomotor, Guided response | Vision or spatial check |
| B5 | Given a boundary circumference or a markedly conical arm, justify the cuff chosen and state the residual uncertainty | Cognitive, Evaluate | Spoken justification |
| B6 | Recognise when no available cuff fits and state the correct alternative rather than proceeding | Cognitive, Evaluate | Gate response |

**Domain C, inflation and deflation control**

| ID | Objective | Level | Evidence |
| --- | --- | --- | --- |
| C1 | Palpate the radial pulse during inflation and record its disappearance within 10 mmHg of auscultated systolic | Psychomotor, Guided response | Pressure trace, timed hold |
| C2 | Inflate to at least 30 mmHg above the palpated estimate, on every attempt | Cognitive, Apply | Pressure trace peak |
| C3 | Control deflation at 2 to 3 mmHg per second for the full descent with no excursion outside the band | Psychomotor, Complex overt response | Pressure trace rate and excursions |
| C4 | Explain why underinflation risks reading systolic below a gap, and why over rapid deflation biases both values | Cognitive, Analyze | Response |
| C5 | Deflate fully and wait before any repeat inflation, never re-inflating on a partially deflated cuff | Psychomotor, Mechanism | Pressure trace re-inflation events |
| C6 | Detect an out of band deflation rate during the attempt and correct it without restarting | Cognitive, Evaluate | Pressure trace, trend |

**Domain D, auscultation and identification.** The perceptual core, and the reason the clinical recordings cannot be synthesised.

| ID | Objective | Level | Evidence |
| --- | --- | --- | --- |
| D1 | Place the stethoscope over the brachial artery, below the cuff edge, with full skin contact and no tubing contact | Psychomotor, Guided response | Vision or spatial track, partial |
| D2 | Identify phase one onset and mark systolic within 4 mmHg of reference | Psychomotor, Perception | Marks |
| D3 | Identify phase five disappearance and mark diastolic within 4 mmHg of reference | Psychomotor, Perception | Marks |
| D4 | Detect an auscultatory gap, state its pressure range, and explain how underinflation would falsify systolic | Cognitive, Analyze | Marks, response |
| D5 | Discriminate phase four muffling from phase five disappearance and state the populations in which phase four is recorded | Psychomotor and Cognitive | Marks, response |
| D6 | Read the needle to the nearest 2 mmHg without rounding to 5 or 10, across at least ten attempts | Psychomotor, Perception | Terminal digit trend |
| D7 | Recognise an irregular rhythm during auscultation and state that a single reading is unreliable | Cognitive, Analyze | Response |
| D8 | Identify inaudible or ambiguous sounds and state the corrective actions available | Cognitive, Evaluate | Response |

**Domain E, interpretation and action.** The domain most training software omits. The clinically consequential failures happen after the number, not during it.

| ID | Objective | Level | Evidence |
| --- | --- | --- | --- |
| E1 | Classify a measured value against the current categories and state the classification | Cognitive, Apply | Response |
| E2 | State that a single elevated reading does not establish a diagnosis, and state the repeat requirement | Cognitive, Understand | Response |
| E3 | Given an irregular rhythm, take multiple readings, average them, and justify why | Cognitive, Apply | Marks across attempts, response |
| E4 | Identify a hypertensive crisis value and state the escalation action within scope, unprompted | Cognitive, Evaluate | Response with prompted flag |
| E5 | Identify a hypotensive value, relate it to the presentation, and state the action | Cognitive, Evaluate | Response |
| E6 | Document arm used, patient position, cuff size and time, omitting nothing | Cognitive, Apply | Response |
| E7 | Recognise a reading implausible against the palpated estimate or a prior value and repeat rather than record it | Cognitive, Evaluate | Marks, trace, response |
| E8 | State the correct action when the value differs materially from a documented prior value | Cognitive, Evaluate | Response |

**Domain F, self monitoring and practice regulation.** Only assessable across attempts.

| ID | Objective | Level | Evidence |
| --- | --- | --- | --- |
| F1 | Identify a rounding bias in the learner's own values across at least ten attempts and state a corrective strategy | Cognitive, Evaluate | Terminal digit trend |
| F2 | Given an out of tolerance result, identify which step of the learner's own procedure most likely produced it | Cognitive, Analyze | Attempt record plus response |
| F3 | Select the next practice condition from the learner's own performance pattern and justify the choice | Cognitive, Evaluate | Selection plus mastery flags |
| F4 | Distinguish a technique error from a perceptual error in the learner's own performance | Cognitive, Analyze | Scorer output plus response |

---

## Appendix B: quick reference card

Pin this somewhere visible.

```
Objectives         1 terminal, 39 enabling, 6 domains (A7 B6 C6 D8 E8 F4)
Curriculum         6 modules, 22 lessons, 61 activities, 295 minutes
Release 1          52 activities, 239 minutes, 34 objectives served
Release 2          9 activities, 56 minutes, unlocks D4 D5 D7 E3 E5

Tolerance          plus or minus 4 mmHg, systolic and diastolic
Deflation band     2 to 3 mmHg per second
Inflation          at least palpated estimate plus 30 mmHg
Cuff edge          2 to 3 cm above the antecubital fossa
Mastery            score 90 or above, 3 consecutive, Unaided only
Trend window       10 attempts

Needle estimator   within 2 mmHg on 95 percent of frames, M1 gate
Synchrony budget   about 120 ms end to end
Latency effect     100 ms is about 0.25 mmHg at 2.5 mmHg per second
Audio              wired earphones. Detect and warn on Bluetooth.

Cases              10 accepted, 6 outstanding, 1 deferred
Case acceptance    3 raters within 4 mmHg, or the case is rejected

Never              a model that grades
Never              a threshold in code
Never              an attempt record without scaffold_state
Never              a case without a capture protocol record
Never              revealing the answer to resolve a discrepancy
```

*End of document.*
