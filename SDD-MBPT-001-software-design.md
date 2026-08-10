# Manual Blood Pressure Trainer: Software Design Document

**Document identifier:** SDD-MBPT-001
**Version:** 0.1 draft, for review
**Date:** August 9, 2026
**Author:** drafted for Melissa Tully, Founder, Chief Executive Officer and Learning Engineer
**Derived from:** PPP-MBPT-004 version 4.0, INSTR-MBPT-001 version 1.0, and the Encountive Manual Blood Pressure Trainer User Experience and Curriculum Crosswalk workbook
**Companion documents:** ARC-MBPT-001 (architecture), UXS-MBPT-001 (user experience summary), BLD-MBPT-001 (build plan)

---

## 0. How to read this document

This document answers one question: **what exactly gets built, and what does each piece guarantee to the pieces around it?**

It sits below the architecture document. The architecture document (ARC-MBPT-001) decides the shape of the system and the technologies. This document decides the behaviour of each component inside that shape, the data that flows between them, and the tests that prove each one works.

Order of authority, extending the order already set in INSTR-MBPT-001 section 0:

1. INSTR-MBPT-001, for process and for the contracts between the learning engineer and the software engineer.
2. PPP-MBPT-004 version 4.0, for product scope, learning architecture and thresholds.
3. This document, for software component behaviour.
4. The Crosswalk workbook, for activity level detail.

Where this document had to make a choice that is properly someone else's to make, that choice appears in section 13, **Design decisions awaiting confirmation**, and is marked in the body with the tag `[DECISION-n]`. Per the rule in INSTR-MBPT-001, none of these has been silently resolved.

**A note on vocabulary.** Every term used here is defined in INSTR-MBPT-001 section 1. This document introduces four new terms, all defined in section 1 below. No other new vocabulary is introduced.

---

## 1. New vocabulary introduced by this document

| Term | Definition |
| --- | --- |
| **Beat library** | The set of individual Korotkoff sound recordings extracted from one clinical case, each one tagged with the cuff pressure at which it occurred during capture. The auscultation engine plays these one at a time. It does not play the original continuous audio file. |
| **Audibility profile** | The part of a case's annotation that answers, for any given cuff pressure, whether a Korotkoff sound is audible at that pressure and what its character is. It is derived from ground truth and the phase annotations, and it is what makes a case pressure indexed rather than time indexed. |
| **Expected response set** | A versioned, human authored list of the concepts a spoken or typed judgement answer must contain to be marked correct, plus the concepts that mark it incorrect. It is data, it is graded by exact deterministic matching rules, and it is what allows Domain E to be scored without a model grading anything. |
| **Perception adapter** | A concrete implementation of one of the perception interfaces defined in section 7, for one platform. For example, the browser camera gauge adapter is a perception adapter; so is the paced shadowing adapter that substitutes for it. |

---

## 2. Scope of this design

### 2.1 In scope for release 1

Everything needed to run the 52 release 1 activities on a phone, score them deterministically, and record what happened. Concretely:

- The needle estimator that reads a real aneroid gauge from a camera.
- The auscultation engine that plays real recorded Korotkoff sounds indexed to that measured pressure.
- Voice marking of systolic and diastolic.
- The deterministic scorer, the trend engine and the mastery engine.
- The activity runner that presents an activity, enforces feedback timing, and writes an attempt record.
- Local first storage of attempt records, and export.
- The content pipeline tools: case annotation, case acceptance checking, crosswalk checking.
- The instructor reports.

### 2.2 Explicitly out of scope for release 1

- The spatial layer: depth sensing, hand tracking, spatial anchors, spatial replay. Designed for, not built. See `[DECISION-1]`, which is INSTR-MBPT-001 section 11.1 and is the single largest open question in the whole programme.
- The nine release 2 activities and the five objectives they serve.
- Any evaluation research instrumentation. That is a separate track with a separate approval path, per PPP-MBPT-004 section 4.5.
- Multi institution accounts, billing, and a learning management system integration. Named here only so nobody assumes they are hiding somewhere in the design.

### 2.3 The thing this design is optimised for

Not speed of first demo. **Auditability.** A programme director must be able to ask "how do you know this learner is competent" and receive an answer that is reproducible from stored data, years later, on a different machine, without the original application running. Every structural decision in this document falls out of that requirement, and where a faster design would have compromised it, the faster design was rejected.

---

## 3. System overview

### 3.1 The one paragraph version

The learner performs a real blood pressure measurement on a partner with real equipment. A camera watches the real aneroid dial and converts the needle angle into a pressure reading thirty to sixty times a second. That pressure value is fed to an auscultation engine, which holds a library of individual Korotkoff sounds recorded from a real patient and decides, beat by beat, whether a sound should be heard at the pressure the learner is currently producing. The learner marks systolic and diastolic by voice. Everything that happened is written into an immutable attempt record. A pure, deterministic scorer reads that record and produces a score, a set of findings tied to specific objectives, and updates to the learner's mastery flags. A separate trend engine looks across ten or more attempts and produces the measures that a single attempt cannot show.

### 3.2 Component map

```
                        ┌──────────────────────────────────────────┐
                        │              APPLICATION                 │
                        │  activity runner, screens, feedback UI,  │
                        │  instructor reports, session management  │
                        └───────┬──────────────────────┬───────────┘
                                │                      │
                 calls (down)   │                      │  reads (down)
                                ▼                      ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │                              CORE                                  │
   │  ┌────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────┐ ┌─────────┐  │
   │  │ auscultat- │ │ deterministic│ │  trend   │ │mastery│ │ config  │  │
   │  │ ion engine │ │   scorer     │ │  engine  │ │engine │ │ loader  │  │
   │  └────────────┘ └─────────────┘ └──────────┘ └──────┘ └─────────┘  │
   │  ┌──────────────────────────────────────────────────────────────┐  │
   │  │ model: Case, Activity, AttemptRecord, Objective, Config      │  │
   │  └──────────────────────────────────────────────────────────────┘  │
   │  ┌──────────────────────────────────────────────────────────────┐  │
   │  │ perception INTERFACES (declared here, implemented elsewhere) │  │
   │  └──────────────────────────────────────────────────────────────┘  │
   └───────▲───────────────────▲──────────────────▲─────────────────────┘
           │ implements        │ implements       │ implements
   ┌───────┴──────┐   ┌────────┴───────┐   ┌──────┴────────┐
   │ gauge adapter│   │ voice adapter  │   │ paced         │
   │ (camera →    │   │ (onset detect  │   │ shadowing     │
   │  needle est- │   │  + transcript) │   │ adapter       │
   │  imator)     │   │                │   │ (fallback)    │
   └──────────────┘   └────────────────┘   └───────────────┘

   ┌──────────────────────────────────────────────────────────────────┐
   │  STORAGE: append only attempt record store, case store,          │
   │           config store, mastery state, export                    │
   └──────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────┐
   │  TOOLS (never shipped to a learner):                             │
   │  needle laboratory · case annotator · case acceptance checker ·  │
   │  crosswalk checker · golden set runner                           │
   └──────────────────────────────────────────────────────────────────┘
```

**The dependency rule, which is the most important structural rule in the system:** arrows point inward. The application depends on the core. Adapters depend on the core. The core depends on nothing. If you can run the entire scorer and mastery engine from a command line script over a JavaScript Object Notation attempt record, with no browser present, the boundary is correct. If you cannot, it has leaked and it must be fixed before anything more is built on it. This restates INSTR-MBPT-001 section 6.2 and it is worth restating because it is the rule most likely to be quietly broken under deadline pressure.

---

## 4. The critical path components, in detail

These four components are where the product either works or does not. Everything else is competent assembly.

### 4.1 The needle estimator

**What it does.** Converts a camera frame showing a real aneroid dial into a pressure value in millimetres of mercury, with a confidence value, at 30 to 60 frames per second.

**Why it is built first.** INSTR-MBPT-001 section 6.1 gives the argument in full and it is not repeated here. The short version: it is simultaneously the decisive technical gate, the content annotation tool, and the capture rig validator. There is no outcome in which building it first is wrong.

**Acceptance, milestone M1.** Within 2 millimetres of mercury on 95 percent of frames, across three gauge models and three lighting conditions, with the full error distribution reported. A mean error of 1 with a long tail of 15 millimetre outliers is a failure wearing a passing grade.

#### 4.1.1 Processing stages

| Stage | Input | Output | Notes |
| --- | --- | --- | --- |
| 1. Dial location | One frame | Dial centre in pixels, dial radius in pixels | Established once at calibration, then tracked. Cheap re-check every N frames guards against the phone being moved. |
| 2. Region of interest crop | Frame plus dial location | A square crop containing the dial | Everything downstream operates on the crop, which is a large cost saving. |
| 3. Greyscale and contrast normalisation | Crop | Single channel image | No automatic exposure compensation here. The capture rule that exposure is locked exists precisely so this stage does not have to fight the camera. |
| 4. Radial sampling | Single channel crop plus centre | An angular response profile: one value per angular bin, typically 720 bins at half degree resolution | For each angle, sample intensity along a ray from an inner to an outer radius and reduce to one number. The needle is dark against a light dial, so the reduction is a minimum or a low percentile. |
| 5. Peak location | Angular response profile | Needle angle, in degrees, with sub bin precision | Find the strongest response, then take a centroid over the neighbouring bins to get precision finer than the bin width. |
| 6. Angle unwrapping and continuity | Needle angle plus history | A continuous angle with no wrap discontinuity | An aneroid dial sweeps past the zero point; naive angle arithmetic produces a jump from 359 to 1 degree that reads as a pressure change of hundreds of millimetres. |
| 7. Filtering | Continuous angle | Filtered angle plus estimated rate of change | An alpha beta or simple Kalman filter. The rate output is used by the degraded modes to extrapolate through a brief occlusion. |
| 8. Angle to pressure mapping | Filtered angle plus calibration | `pressure_mmhg` | Linear in the first instance. See `[DECISION-2]` on dial non linearity. |
| 9. Confidence | Angular response profile plus filter residual | `confidence`, zero to one | Combines the sharpness of the angular peak, the margin between the strongest and the second strongest peak, and the agreement between the measured angle and the filter's prediction. |

#### 4.1.2 Calibration

Two point calibration, taken once per session, in about fifteen seconds. The two points are:

1. **Zero.** The cuff is fully deflated and the needle rests in the zero rest position. The learner is already required to do this as an equipment check in activity `A-0.1.1`, so this costs no additional learner time and doubles as a safety habit.
2. **A known scale mark.** The learner is asked to touch the printed `200` mark on the dial on screen. This gives a second known angle without requiring the learner to produce a known pressure.

Two points define a linear angle to pressure map. The calibration is written into the attempt record so that a later re-score knows exactly what mapping produced the pressures.

**Why not one point.** A single point plus an assumed degrees per millimetre constant would require the software to know each gauge model's scale, which means a device database, which means an unknown gauge cannot be used at all. Two point calibration works on any dial the learner puts in front of it.

#### 4.1.3 Where it runs

In a worker thread, off the main user interface thread, reading frames as they arrive rather than polling. A dropped frame is acceptable; a stalled interface during a live measurement is not.

#### 4.1.4 The validation harness, which is a deliverable in its own right

The needle laboratory is a standalone command line tool. It takes a gauge video file and a reference pressure log, aligns them using the electronic slate, runs the estimator over every frame, and emits:

- Per frame error against the reference sensor.
- The error distribution: median, 95th percentile, 99th percentile, maximum, and a histogram.
- Confidence against error, so that the confidence threshold can be chosen from evidence rather than guessed.
- The count and duration of every interval where confidence fell below candidate thresholds.

That last output is what sets `needle_confidence_threshold`, which INSTR-MBPT-001 section 9 currently leaves as "to be set from milestone M1 results". It is set from this tool, and the tool's output is the evidence recorded in the architecture decision record for optical gauge reading.

### 4.2 The auscultation engine

**What it does.** Decides, moment by moment, whether the learner hears a Korotkoff sound, and plays the right recorded sound at the right instant.

**The design rule that everything else follows from: the audio is indexed by pressure, not by time.** If a case were played as a continuous recording along a timeline, a learner who deflated slowly would hear the sounds finish early and a learner who deflated quickly would hear them continue after the cuff was empty. Both would be learning a false association. So the recording is broken into individual beats at annotation time, each tagged with the pressure at which it occurred, and the engine reassembles them against the pressure the learner is actually producing right now.

#### 4.2.1 The three collaborating parts

| Part | Responsibility | Deterministic? |
| --- | --- | --- |
| **Cardiac clock** | Advances in real time and fires a beat request at each interval taken from the case's rhythm interval sequence. For a regular rhythm the intervals are near constant; for the atrial fibrillation case they are the real, irregular intervals from the recording, which is exactly what makes that case valuable. | Yes, given a start time and the interval sequence. |
| **Audibility rule** | Given the current pressure and the case's audibility profile, answers: is a sound audible, and of what character (phase one crisp, phase two swishing, phase four muffled, silent). | Yes. A pure function of pressure and case data. |
| **Beat scheduler** | On a beat request, asks the audibility rule about the current pressure. If audible, selects the beat from the beat library nearest that pressure and schedules it for playback with a small lookahead. If not audible, does nothing at all. | Playback timing depends on the audio hardware, so not bit exact; but the decision to play or not play is deterministic. |

**A beat plays only when both agree.** The clock says when a heart beat occurs. The pressure says whether that beat is audible. Neither alone is sufficient, and building either one to drive playback on its own is the most likely wrong turn in this component.

#### 4.2.2 The audibility profile

For an ordinary case, the profile is a small piecewise structure derived from ground truth:

```
above systolic ................................ silent
systolic down to phase two boundary ........... phase one, crisp tapping
phase two band ................................ phase two, softer, swishing
   [if the case has an auscultatory gap]
   gap upper bound to gap lower bound ......... SILENT   ← the trap that teaches D4
phase four boundary to phase five ............. phase four, muffled
below phase five .............................. silent
```

The auscultatory gap is not a special case in the code. It is a silent band in the profile. This is the payoff of a data driven design: the case that teaches objective D4 needs no new engine behaviour at all, only a correctly annotated case. When case `C012` is finally captured, the engine already knows what to do with it.

#### 4.2.3 The synchrony budget

PPP-MBPT-004 section 5.4 establishes that pressure accuracy is not the binding constraint; perceived audiovisual synchrony is, with a budget of roughly 120 milliseconds end to end. The budget is spent as follows and this table should be re-measured on real devices during milestone M5:

| Stage | Typical cost | Notes |
| --- | --- | --- |
| Camera exposure to frame delivered | 16 to 33 ms | One to two frame periods. Not reducible in a browser. |
| Needle estimator processing | 5 to 15 ms | In a worker. This is the part everyone wants to optimise and it is the part that matters least. |
| Engine decision | under 1 ms | A comparison against a small data structure. |
| Audio scheduling lookahead | 20 to 50 ms | Deliberate. Scheduling with zero lookahead produces audible glitching. |
| Output device latency, wired | 10 to 30 ms | |
| **Total, wired** | **roughly 55 to 130 ms** | At the budget. Measure it, do not assume it. |
| Output device latency, standard Bluetooth | **100 to 200 ms additional** | Blows the budget on its own. Hence the requirement to detect and warn. |

**The engineering instruction that follows:** spend optimisation effort on the audio path and on reducing scheduling lookahead, not on shaving milliseconds off the pressure computation. A 100 millisecond error in pressure timing is about a quarter of a millimetre of mercury at a correct deflation rate, which is an order of magnitude inside the four millimetre scoring tolerance. The same 100 milliseconds in the audio path is plainly perceptible against a needle the learner is watching, and it reads to the learner as the product being broken.

### 4.3 Voice marking

**What it does.** Turns the learner saying "mark" into a timestamped pressure value.

**The rule from INSTR-MBPT-001 section 6.3, point 4, and it is more important than it looks: the mark is timestamped at voice onset, not at recognition.** If the timestamp comes from a speech recogniser's completion callback, it carries the recogniser's latency and, worse, the recogniser's latency *variance* straight into the learner's score. A learner could be marked down for the recogniser having a slow moment.

So marking is split in two:

| Path | Mechanism | Used for | Determinism |
| --- | --- | --- | --- |
| **Onset detection** | A cheap audio energy and spectral onset detector running locally on the microphone stream. Fires within a few milliseconds of the learner beginning to speak. | The mark timestamp, and therefore the marked pressure. | Deterministic given the audio, and it runs entirely on device. |
| **Recognition** | Speech to text, for spoken judgement responses in Domains B, E and F. | The transcript stored in `spoken_responses`. | Not deterministic. See section 6.3 for why this does not break invariant I-1. |

The onset detector does not need to know that the word was "mark". It needs to know that the learner spoke. During a marking window, the learner is instructed to say one thing. False positives from partner speech are handled by requiring the onset to come from the learner's own microphone at above a threshold level, and by the design rule that the partner does not speak during the descent. Both are honest limitations and both belong in the perception capability report that flows to the learning engineer under INSTR-MBPT-001 section 7.2.

`[DECISION-3]` covers what to do about speech recognition when the device is offline, which is a real problem because the product is specified to work offline and most browser speech recognition is not offline.

### 4.4 The deterministic scorer

**What it does.** Takes one attempt record and one threshold configuration version. Returns a score, a list of findings each tied to an objective, and mastery flag updates.

**What it must not do.** Anything at all except compute. No input or output, no clock read, no network call, no random number, no model call, no reading of global state. It is a pure function, and its purity is the thing that makes a learner's score defensible to a programme director and auditable to an accreditor.

#### 4.4.1 Signature

```
score(attemptRecord, config) -> ScoreResult

ScoreResult = {
  attempt_id,
  config_version,
  scorer_version,
  total,                    // number, 0 to 100
  findings: [ {
      objective_id,         // e.g. "C3"
      outcome,              // met | not_met | not_assessable
      measured,             // the value that was compared
      threshold,            // the value it was compared against
      finding_code,         // a stable code, e.g. "RATE_EXCURSION_PRESENT"
      evidence_refs         // pointers into the attempt record
  } ],
  mastery_updates: [ { objective_id, counts_toward_mastery, streak_after } ]
}
```

Three things about this shape are deliberate.

**`outcome` has three values, not two.** `not_assessable` exists because of situations like an attempt where the dial was lost during the marking window. That attempt cannot be scored for accuracy on D2 and D3, and scoring it as a failure would teach the learner that their technique was wrong when in fact the camera lost the dial. It is flagged, not failed. This is required by the `tracking_gaps` field and it is stated in INSTR-MBPT-001 section 4.2.

**`finding_code` is a stable code, not a sentence.** The sentence lives in the feedback template library, which is the learning engineer's deliverable. The scorer emits `RATE_EXCURSION_PRESENT` and a measured value; the feedback layer turns that into words. This separation is what allows feedback wording to be improved without re-scoring anything, and it is what makes invariant I-3 enforceable.

**`scorer_version` is recorded alongside `config_version`.** A configuration change and a scorer logic change are different events and a re-score needs to know both. INSTR-MBPT-001 section 4.2 specifies `config_version`; this document adds `scorer_version` as a required field of the score result, not of the attempt record. It is proposed as an addition under the change process in INSTR-MBPT-001 section 10.2, and it is listed in section 13 of this document as `[DECISION-4]`.

#### 4.4.2 The scoring rules, by shape

Every one of the 39 objectives is scored by one of five rule shapes. Recognising this early keeps the scorer small and testable rather than becoming 39 special cases.

| Shape | What it computes | Objectives using it |
| --- | --- | --- |
| **Tolerance comparison** | Absolute difference between a learner value and a reference value, compared against a configured tolerance. | B1, C1, D2, D3 |
| **Band membership** | Whether a measured value stayed inside a configured band, with a separate check for excursions rather than only the mean. | C2, C3, C5 |
| **Discrete correctness** | A choice compared against a computed correct answer. | A1, A5, B2, B6 |
| **Expected response match** | A transcript matched against a versioned expected response set, with the `prompted` flag participating in the outcome. | A3, A6, B3, B5, C4, C6, D4, D5, D7, D8, E1 to E8, F2, F3, F4 |
| **Geometric or spatial check** | A measured geometry compared against a configured tolerance. Glasses dependent; see `[DECISION-1]`. | A2, B4, D1 |

Plus two that are not attempt scoped at all and belong to the trend engine: D6 and F1.

And one that is never scored: **A7, hand hygiene, is self report only and must never appear on any report, dashboard or export as a measured competency.** This is invariant I-12 and it needs to be enforced in the reporting code, not merely remembered. A unit test should assert that A7 never appears in a competency export.

#### 4.4.3 Expected response matching, and how it stays deterministic

This is the subtlest part of the scorer, because it grades free speech without a model grading anything.

The mechanism is: the learning engineer authors an expected response set as data. It is a versioned file. For each prompt it lists required concepts, each with a set of accepted surface forms, plus disqualifying concepts, plus the rule that combines them.

```
prompt_id: E4_crisis_escalation
version: 3
required_concepts:
  - id: recognises_crisis
    any_of: ["hypertensive crisis", "crisis", "emergency", "above 180", "over 180"]
  - id: names_action
    any_of: ["escalate", "notify", "tell the nurse", "report to", "call"]
  - id: names_recipient
    any_of: ["nurse", "supervisor", "registered nurse", "charge nurse", "provider"]
disqualifying_concepts:
  - id: proceeds_without_escalating
    any_of: ["record it and move on", "just document it", "carry on"]
rule: all required present AND no disqualifying present AND prompted == false
```

Two properties make this work:

**It is deterministic over the stored transcript.** The transcript is captured once, by a non deterministic recogniser, and then stored in the attempt record. Every subsequent score runs over that stored string. Given the record and the expected response set version, the score is reproducible exactly, forever, which satisfies invariant I-1. The non determinism lives at capture time, in the perception layer, where it is honestly labelled, and not in the scoring path.

**It keeps the model out of grading entirely.** A model may be used to *phrase* the feedback that follows the finding, under invariant I-3, and its output is discarded if it contains a number the scorer did not supply. It is never asked whether the answer was right.

The honest limitation, which must go in the perception capability report: a learner whose answer is correct but phrased outside the accepted surface forms will be marked incorrect. The mitigation is that the expected response set is a living artifact, that every `not_met` outcome on an expected response match stores the transcript, and that reviewing those transcripts periodically is a named task in the build plan, not a hope.

### 4.5 The trend engine

**What it does.** Computes measures that have no meaning within a single attempt.

Invariant I-8: trends are scored separately from attempts and never contribute to a single attempt's score. So this runs as a second pass over a window of attempts, and its results feed the Reflect activities and the instructor report, never the attempt score.

| Measure | Objectives | Computation | Window |
| --- | --- | --- | --- |
| Terminal digit bias | D6, F1 | Distribution of the final digit of all marked values across the window, compared against the distribution expected by chance. A learner reading correctly to the nearest 2 millimetres produces a roughly even spread across even digits; a learner rounding produces a spike at 0 and 5. | `terminal_digit_window`, currently 10 attempts |
| Rate control stability | C3, C6 | Excursion count and excursion duration per attempt, trended. A learner whose mean rate is correct but whose excursion count is not falling has not learned control. | 10 attempts |
| Error attribution accuracy | F2, F4 | Agreement between the learner's stated cause and the scorer's finding, across attempts. | 10 attempts |
| Mastery streak state | All | Consecutive unaided attempts meeting each objective's exit condition. | Per objective |

**The window rule.** Below the window size a trend measure has no meaning and must not be shown as though it did. `terminal_digit_window` is 10, so with nine attempts the Reflect activity shows "not enough attempts yet, N more to go" rather than a misleading chart. This is a user experience requirement as much as a computational one and it appears again in UXS-MBPT-001.

### 4.6 The mastery engine

Mastery is not the same as passing. Passing is one attempt scoring at or above the threshold. Mastery is the pattern across attempts under the correct conditions.

**The rule for the terminal objective, from PPP-MBPT-004 section 2.1:** three consecutive attempts meeting TO-1, across at least two body habitus categories and at least two clinical cases, with no scaffolding present.

That single sentence has four separate data requirements and each one has been a place where planning previously went wrong:

| Requirement | Field it needs | What breaks without it |
| --- | --- | --- |
| "Three consecutive" | Ordered, immutable attempt records | Cherry picking the best three |
| "No scaffolding present" | `scaffold_state == unaided` | Scaffolded success silently counted as competence. Invariant I-4. |
| "Two body habitus categories" | The habitus category of the partner, per attempt | Mastery claimed on three attempts against the same slim arm |
| "Two clinical cases" | `case_id` | Mastery claimed on three attempts against the same recording, which is memorisation, not competence |

The third of these is a gap. `arm_circumference_reference_cm` is in the attempt record and habitus category can be derived from it, but only for activities where an arm was measured. For `A-3.4.4`, the full unaided end to end attempt, the partner's arm is not necessarily measured in that same activity. **Raised as `[DECISION-5]`: does the attempt record need an explicit `habitus_category` field, or is it derived from a session level partner record?** This is exactly the class of gap that INSTR-MBPT-001 section 4.2 warns has been missed in earlier planning at least once.

---

## 5. The supporting components

### 5.1 The activity runner

The activity runner is the state machine that turns an activity definition into a learner experience and an attempt record. There are 61 activities and exactly one runner. If a second runner appears for a special activity, the activity definition format is missing a field.

```
  IDLE
    │ learner selects activity
    ▼
  PREPARING ──────► entry state rendered; equipment and calibration checked
    │ preconditions met
    ▼
  PERFORMING ─────► perception adapters live; evidence accumulating
    │              ├─ if type == Practice: feedback emitted immediately
    │              └─ if type == Assess:   feedback buffered, nothing shown
    │ exit condition met, or learner ends, or abort
    ▼
  SCORING ────────► attempt record sealed and written; scorer runs
    │
    ▼
  FEEDBACK ───────► findings rendered; for Assess, this is the first
    │               moment the learner sees anything
    ▼
  COMPLETE ───────► mastery flags updated; next activity suggested
```

**Feedback timing is enforced here, in code, once.** Invariant I-5 says feedback timing is a property of activity type. It is therefore not a decision each activity screen makes for itself; it is a property of the state machine, read from the activity definition's `type` field. An activity screen has no mechanism available to it to show feedback during `PERFORMING` when the type is `Assess`. This is the difference between a rule and a convention, and only a rule survives twelve months of feature additions.

**Invariant I-6 is also enforced here.** When the learner's value and the system's value disagree, the runner's only permitted responses are to ask for another attempt or to end the activity. There is no code path that renders the correct value in response to a discrepancy. Revealing the answer removes the objective being assessed.

### 5.2 The safety gate handler

Three kinds, and they behave differently, which is why they are three concepts and not one. This restates PPP-MBPT-004 section 2.3 in terms of code behaviour.

| Gate | When evaluated | Runner behaviour | Recorded as |
| --- | --- | --- | --- |
| **Contraindication** | Before `PERFORMING` begins | Refuses to start on that limb. The only correct responses are to select the other limb or to escalate. There is no "proceed carefully" branch, and building one would be a clinical error encoded in software. | `safety_gate_responses` with the gate identifier |
| **Technique** | Continuously during `PERFORMING` | Blocks progression until satisfied. Repeatable within one attempt without ending it. | The relevant evidence field, plus a gate response |
| **Interpretation** | After the measurement, before `COMPLETE` | Requires a stated action, not just a number. The activity cannot complete on a number alone. | `spoken_responses` with the `prompted` flag |

### 5.3 The attempt record writer

Small, and load bearing.

- **Validate on write.** A record missing `scaffold_state` is rejected at write time, not tolerated with a default. Invariant I-4. The same applies to `activity_id`, `objectives`, `config_version` and `surface`.
- **Seal on `ended_at`.** After that timestamp the record is immutable. Corrections are new records that reference the original by identifier. There is no update path in the storage interface, because an interface that offers one will eventually be used.
- **Write locally first, always.** The classroom has bad connectivity and a lost attempt is a lost learner performance that cannot be recreated.
- **Validate against the schema on read as well as on write,** so that a record written by an older application version is either readable or loudly rejected, never silently misinterpreted.

### 5.4 The feedback layer

Sits between the scorer and the screen. Its job is to turn findings into words without ever changing what the finding said.

```
finding { objective_id: "C3",
          finding_code: "RATE_EXCURSION_PRESENT",
          measured: 4.8, threshold: 3.0, ... }
        │
        ▼
  template lookup by finding_code
        │
        ▼
  "Your deflation reached {measured} mmHg per second, above the
   {threshold} limit, at two points during the descent."
        │
        ▼  (optional, only if enabled and online)
  model rephrasing for tone and reading level
        │
        ▼
  NUMBER GUARD: every number in the model output must appear in the
  scorer output. Any that does not → discard entirely, show template.
        │
        ▼
  learner sees words
```

**The number guard is code, not prompt discipline.** Invariant I-3 is explicit that this check is implemented in code. Extract every numeric token from the model's response, compare against the set of numbers the scorer supplied, and if any is unaccounted for, discard the whole response and show the template. Log the discard. A rising discard rate is a signal that the phrasing guidance needs work, and it is worth a line on the instructor report's technical page.

### 5.5 Storage

| Store | Contents | Lifetime | Notes |
| --- | --- | --- | --- |
| Attempt records | Append only, one record per attempt | Retained; exportable | Local first. Sync is a later addition and the design must not assume it. |
| Case packages | Media, annotations, ground truth, capture protocol | Downloaded per install, cached | Large. Needs an eviction policy and a "this case is not downloaded" state. |
| Configuration | Threshold sets, versioned | Every version retained | A retired configuration version must remain readable, or old attempts cannot be re-scored. |
| Activity definitions | Exported from the Crosswalk workbook | Versioned per release | |
| Expected response sets | Versioned | Every version retained | Same re-scoring argument as configuration. |
| Mastery state | Derived, rebuildable | Cache only | **Must be fully rebuildable from attempt records.** If mastery state is ever the only copy of a fact, a corrupted cache destroys a learner's record. |
| Take log | Subject identifiers, capture sessions | Never in the product | Authoring side only. PPP-MBPT-004 section 4.5 and INSTR-MBPT-001 section 8.4: never shipped. |

### 5.6 The authoring and validation tools

These never ship to a learner. They run on a laptop and in continuous integration. Underestimating them is a common way for a project like this to stall in month four.

| Tool | Purpose | Runs |
| --- | --- | --- |
| **Needle laboratory** | Section 4.1.4. Validates the estimator against reference pressure logs. | Command line, and once per estimator change in continuous integration against a fixed video set |
| **Case annotator** | Runs the needle estimator across a captured take, detects beat onsets, tags each with pressure, extracts the rhythm interval sequence, produces the beat library and audibility profile. Pipeline stage P6. | Command line, human reviewed |
| **Case acceptance checker** | Automates acceptance criteria 2, 3, 5 and 6 from INSTR-MBPT-001 section 8.2: needle readability, exposure and focus stability, deflation rate compliance, synchronisation offset. | **At the capture rig, before the volunteer is thanked and sent home.** This is the point of building it. |
| **Crosswalk checker** | The five coverage checks, plus the evidence contract check: every field named in an activity's `evidence_captured` must exist in the attempt record schema. | Continuous integration, on every content change |
| **Golden set runner** | Scores a checked in set of attempt records and compares against expected scores. | Continuous integration, on every commit |

---

## 6. Data design

### 6.1 The attempt record

The authoritative field list is INSTR-MBPT-001 section 4.2 and it is not duplicated here. This section covers only what that table leaves open.

**Proposed additions,** each raised as a change under INSTR-MBPT-001 section 10.2 rather than assumed:

| Field | Reason | Reference |
| --- | --- | --- |
| `calibration` | The angle to pressure mapping in force for this attempt. Without it a re-score cannot reproduce the pressures. | Section 4.1.2 |
| `habitus_category` | Required by the TO-1 mastery rule, "at least two body habitus categories". | `[DECISION-5]` |
| `expected_response_set_versions` | Which version of each expected response set was in force. Same re-scoring argument as `config_version`. | Section 4.4.3 |
| `app_version` | Diagnostic. Not used in scoring. | |

**Rules, restated because they constrain the storage implementation:**

- Append only. Never edited after `ended_at`.
- Scoreable offline from the record alone, with no network call and no access to the running application.
- Re-scoreable: given the record plus a configuration version, the scorer reproduces the original score exactly.

**A concrete consequence of "re-scoreable" that is easy to miss:** ground truth for a case must be either included in the attempt record or immutably versioned in the case store. If a case's ground truth were ever corrected in place, every attempt scored against the old value would silently change meaning. Case ground truth is therefore versioned, and the attempt record stores `case_id` plus `case_version`. Adding `case_version` is part of `[DECISION-4]`.

### 6.2 The case package

Format is fixed by INSTR-MBPT-001 section 4.3 and PPP-MBPT-004 section 4.8. This document adds the derived artifacts that annotation produces:

```
cases/C011/
  MBPT_C011_T02_gauge.mp4          raw, as captured
  MBPT_C011_T02_audio.wav          raw, as captured
  MBPT_C011_T02_pressure.csv       reference sensor, authoring only
  capture_protocol.json            mandatory, invariant I-10
  ground_truth.json                three raters, agreed within 4 mmHg
  annotation/
    needle_read.csv                estimator output across the take
    beats/                         one audio file per beat, pressure tagged
    beat_index.json                pressure of each beat, character, ordering
    rhythm_intervals.json          the interval sequence for the cardiac clock
    audibility_profile.json        section 4.2.2
  case.json                        the manifest tying it all together
```

**The raw pressure log is authoring only and is never shipped to a learner device.** It is ground truth for validating the needle estimator, and shipping it would let a determined learner read the answers. PPP-MBPT-004 section 4.2 already states the reference sensor is never shipped to a customer; this extends the same rule to its output.

### 6.3 The activity definition

Fields correspond one to one with the columns of the ActivityUX sheet, per INSTR-MBPT-001 section 4.4. The workbook is authored by the learning engineer and exported to a machine readable file that the application consumes. The export is generated, never hand edited, so that the workbook stays the single source of truth.

**`evidence_captured` is the contract line.** If an activity names evidence the attempt record does not carry, that is a build blocker, not a detail, and the crosswalk checker fails the build. This is stated in INSTR-MBPT-001 section 4.4 and is implemented in section 5.6 above.

**`exit_condition` must be a computable predicate over attempt record fields.** "Within 4 millimetres of mercury on three consecutive attempts" is computable. "Demonstrates competence" is not. Authoring rule R-4. The crosswalk checker should parse exit conditions and fail on any it cannot compile, which turns R-4 from a guideline into a gate.

### 6.4 The configuration file

Every parameter in INSTR-MBPT-001 section 9, as versioned data. Two implementation notes:

- **The file carries a `version` string, and every attempt record carries the `config_version` that scored it.** A retired version is never deleted.
- **The configuration is schema validated on load,** and a configuration that fails validation refuses to load rather than falling back to defaults. A silent default is a threshold in code wearing a disguise, and it breaks invariant I-2.

---

## 7. Interfaces

These are the contracts the core declares and the platform implements. They exist so that nothing above the perception layer knows how a pressure value was obtained.

```
interface GaugeReader {
  start(calibration): void
  stop(): void
  // emits a stream of readings; consumer never asks "how"
  onReading(handler: (r: { t_ms, pressure_mmhg, confidence }) => void): void
}

interface VoiceInput {
  onOnset(handler: (o: { t_ms }) => void): void          // the mark timestamp
  requestTranscript(promptId, window): Promise<{ transcript, t_ms, prompted }>
}

interface AudioOutput {
  scheduleBeat(buffer, atTime, character): void
  currentRoute(): "wired" | "bluetooth" | "speaker" | "unknown"
  outputLatencyMs(): number
}

interface SpatialTracker {          // release 2, declared now, unimplemented
  armGeometry(): ...
  chestpiecePose(): ...
}

interface AttemptStore {
  write(record): Promise<void>       // validates; no update method exists
  read(id): Promise<AttemptRecord>
  query(filter): Promise<AttemptRecord[]>
  export(filter): Promise<Blob>
}
```

**The paced shadowing adapter implements `GaugeReader`.** This is the design payoff that makes risk R2 survivable. When no camera reading is available, an authored deflation ramp drives exactly the same engine, through exactly the same interface, and the learner marks against it. Nothing above the interface changes. The mode is labelled to the learner as a pacing and perception exercise, which is what it honestly is, and not presented as a failure state.

---

## 8. Non functional requirements

| Requirement | Target | How it is verified |
| --- | --- | --- |
| Audiovisual synchrony | 120 ms end to end, wired output | Measured on three real devices at milestone M5, not calculated |
| Needle estimator accuracy | Within 2 mmHg on 95 percent of frames, three gauges, three lighting conditions | Needle laboratory, milestone M1 |
| Scorer determinism | Bit identical output for identical input, on every platform | Golden set, every commit |
| Scorer speed | One attempt scored in under 50 ms on a mid range phone | Benchmark in continuous integration |
| Offline operation | Every release 1 activity runnable with the network off, except where `[DECISION-3]` applies | Manual test with the network disabled, every release |
| Cold start | Under 5 seconds to a usable screen on a mid range phone | Measured |
| Attempt durability | No attempt lost on application crash or battery death mid attempt | Fault injection test: kill the process during `PERFORMING` |
| Device support | Phones from roughly the last five years, both major mobile operating systems | Device matrix agreed at `[DECISION-6]` |
| Accessibility | Meets recognised accessibility guidance at the level agreed in UXS-MBPT-001 | Audit before pilot |
| Privacy | No personally identifying information leaves the device by default | Design review, plus a network traffic audit before pilot |

---

## 9. Error handling and degraded modes

The degraded mode table in INSTR-MBPT-001 section 6.6 is the specification. Two design instructions attach to it.

**First: write the degraded mode tests before the happy path is polished.** These are the states that occur in a real classroom, with real lighting, and a learner who moves. The happy path will be exercised constantly during development and will be fine. The degraded paths will be exercised for the first time by a learner in front of an instructor unless they are tested deliberately.

**Second: invariant I-9 governs the ambiguous cases.** A wrong pressure is worse than no pressure, because a wrong pressure fires beats at wrong values and teaches a false association, which is worse than a brief silence. When in doubt about whether to use a low confidence reading, do not.

| Condition | Behaviour | Recorded |
| --- | --- | --- |
| Dial lost under 500 ms | Extrapolate at the last observed rate. Continue audio. Say nothing. | Nothing |
| Dial lost 500 ms to 3 s | Hold the last pressure, suppress new beats, small peripheral indicator. No spoken interruption. | `tracking_gaps` |
| Dial lost over 3 s | Pause the attempt, prompt the learner to bring the dial into view. | `tracking_gaps`, attempt may become `not_assessable` for D2 and D3 |
| Confidence below threshold while visible | Treat as lost. Invariant I-9. | `tracking_gaps` with reason `low_confidence` |
| Implausible rise with no squeeze detected | Reject the sample. Physical systems do not spontaneously repressurise. | Diagnostic log |
| No camera, or camera reading unavailable | Fall back to paced shadowing, labelled as such. | `scaffold_state` unchanged; a `perception_mode` flag distinguishes it |
| Bluetooth audio route detected | Warn. Refusing to score is a configurable policy, `bluetooth_scoring_policy`. | `audio_route` |
| Microphone permission refused | Marking by voice is impossible. Offer the activity in a non marking mode or block it, with a clear explanation. | Attempt not started |

That last row is not in the source documents and is a real gap: invariant I-7 says input never requires a hand that is holding equipment, which means voice is not optional during a live measurement. A learner who refuses microphone permission cannot perform a marking activity at all. **Raised as `[DECISION-7]`.**

---

## 10. Security and privacy

The privacy position is unusually strong here and it should be protected deliberately, because it is a genuine advantage when talking to an institution.

- **Learner identifiers are pseudonymous.** Never a name in the attempt record. The mapping from pseudonym to person, if one exists at all, belongs to the institution, not to the product.
- **Clinical recordings are de-identified at the point of capture, not in post production.** Framing the dial and the cuff only, no face, no voice on the stethoscope channel, subject identifiers only on the take log, sequential case identifiers with no clinical or personal reference. This is PPP-MBPT-004 section 4.5 and it is worth restating in a software document because it is what allows the case store to be treated as ordinary media rather than as protected health information.
- **Learner voice is the one sensitive stream the product does handle.** Spoken judgement responses are the learner's own voice. The design position is: store the transcript, not the audio, once the transcript has been produced; and if transcription happens off device, say so plainly. This interacts directly with `[DECISION-3]`.
- **The take log never ships.** It is the only place subject identifiers appear.
- **Default to no network.** The product works offline. Anything that leaves the device is opt in, named, and documented.

---

## 11. Testing strategy

| Layer | Test kind | Gate |
| --- | --- | --- |
| Core, scorer | Golden set: checked in attempt records with expected scores, run on every commit. When a threshold changes, the golden set is regenerated deliberately and the difference reviewed line by line. **That review is the audit trail.** | Every commit |
| Core, scorer | Property test: scoring the same record twice, on two platforms, produces identical output | Every commit |
| Core, engine | Unit tests for the audibility rule against every case shape, including the gap case and the irregular rhythm case, using synthetic case data so the tests do not wait on capture | Every commit |
| Core boundary | Static check: no browser, camera, audio or device import appears anywhere under the core. Automated, not reviewed by eye. | Every commit |
| Perception, needle estimator | Needle laboratory against a fixed video corpus, error distribution reported and compared against the last run | Every estimator change |
| Content | Crosswalk checker: five coverage checks plus the evidence contract check plus exit condition compilability | Every content change |
| Content | Feedback template check: no number in a template that the scorer does not supply as a variable. Authoring rule R-6. | Every content change |
| Application | Degraded mode tests, written before the happy path is polished | Every release |
| Application | Fault injection: kill the process mid attempt, verify no attempt is lost | Every release |
| End to end | A learner deflates a real cuff and hears the correct case sounds at the correct pressures. Milestone M5. | Milestone |
| Whole system | Instructors run a full session on the real equipment in the real room. Milestone M7. | Milestone |

**On the golden set specifically.** It is tempting to generate expected scores by running the current scorer and saving the output. That is circular and catches nothing. The first golden set must have its expected scores derived by hand, from the objective definitions, by the learning engineer and the software engineer together. It is tedious once and then it is the thing that catches every accidental scoring change forever.

---

## 12. Traceability: objective to evidence to rule

This is the table a programme director's question resolves to. For each objective: what is recorded, what predicate is computed, and which release it lands in.

Abbreviations used only in this table: `AR` means attempt record; `EX` means the exit condition as authored in the Crosswalk workbook.

### Domain A, preparation and patient safety

| Objective | Evidence field | Predicate | Release | Notes |
| --- | --- | --- | --- | --- |
| A1 | `safety_gate_responses` | All four contraindication decisions correct, unaided | 1 | |
| A2 | Geometric check | All four positioning conditions met, three consecutive | 1 | Surface dependent, `[DECISION-1]` |
| A3 | `spoken_responses` | Expected response match on direction and magnitude of each fault | 1 | |
| A4 | `timer_events` | Rest interval at or above 300 seconds before first inflation | 1 | |
| A5 | `safety_gate_responses` | Invalidating condition decisions correct | 1 | |
| A6 | `spoken_responses` | Explanation event detected before first limb contact step | 1 | Partial assessment; completeness only, wording not graded |
| A7 | `steps_completed` | Hand hygiene step recorded | 1 | **Self report only. Never reported as a measured competency. Invariant I-12.** |

### Domain B, cuff selection across body habitus

| Objective | Evidence field | Predicate | Release | Notes |
| --- | --- | --- | --- | --- |
| B1 | `arm_circumference_entered_cm`, `arm_circumference_reference_cm` | Absolute difference at or below the configured tolerance, three consecutive | 1 | **Tolerance conflict: objective says 1 cm, exit condition says 1.5 cm. INSTR-MBPT-001 section 11.3.** |
| B2 | `cuff_selected` | Correct for the measured circumference on ten trials spanning four categories, zero errors | 1 | **Blocked by the bladder fit standard decision, INSTR-MBPT-001 section 11.2** |
| B3 | `spoken_responses` | Direction correct on four of four | 1 | |
| B4 | Vision or spatial check | Placement inside the configured band, three consecutive | 1 | Surface dependent, `[DECISION-1]` |
| B5 | `spoken_responses` | Expected response match naming taper and residual uncertainty | 1 | |
| B6 | `safety_gate_responses` | Correct alternative stated rather than proceeding | 1 | |

### Domain C, inflation and deflation control

| Objective | Evidence field | Predicate | Release | Notes |
| --- | --- | --- | --- | --- |
| C1 | `pressure_trace`, mark | Palpated disappearance within `palpation_agreement_mmhg` of auscultated systolic | 1 | |
| C2 | `pressure_trace.peak_mmhg` | Peak at or above palpated estimate plus `inflation_margin_mmhg`, three consecutive | 1 | |
| C3 | `pressure_trace.mean_rate_mmhg_per_s`, `rate_excursions` | Mean in band **and** excursion list empty, three consecutive | 1 | The excursion check is the objective. A learner averaging 2.5 by alternating 0.5 and 5 has not learned control. |
| C4 | `spoken_responses` | Both consequences and both directions stated | 1 | |
| C5 | `reinflation_events` | No re-inflation at a pressure above zero | 1 | |
| C6 | `rate_excursions` plus `spoken_responses` | Excursion detected and corrected within the attempt without restart | 1 | |

### Domain D, auscultation and identification

| Objective | Evidence field | Predicate | Release | Notes |
| --- | --- | --- | --- | --- |
| D1 | Chestpiece track | Within tolerance for the required hold, three consecutive | 1 | **Partial assessment: proxy tracking cannot assess skin contact quality. Invariant I-12. Surface dependent, `[DECISION-1]`.** |
| D2 | `marks`, `tracking_gaps` | Marked systolic within `marking_tolerance_mmhg` of ground truth, **and** no tracking gap overlapping the marking window; otherwise `not_assessable` | 1 | |
| D3 | `marks`, `tracking_gaps` | As D2, for diastolic | 1 | |
| D4 | `marks`, `spoken_responses` | Gap identified and its range stated within tolerance | **2** | Needs case C012 |
| D5 | `marks`, `spoken_responses` | Both phase four and phase five marked, populations named | **2** | Needs case C014 |
| D6 | `marks`, trend | Terminal digit distribution across the window not biased toward 0 and 5 | 1 | Trend measure, not attempt scored. Invariant I-8. |
| D7 | `spoken_responses` | Irregularity named unprompted | **2** | Needs case C011 |
| D8 | `spoken_responses` | Three corrective actions named | 1 | |

### Domain E, interpretation and action

| Objective | Evidence field | Predicate | Release | Notes |
| --- | --- | --- | --- | --- |
| E1 | `spoken_responses` | Classification correct against the configured categories | 1 | |
| E2 | `spoken_responses` | Repeat requirement stated | 1 | |
| E3 | `marks` across attempts, `spoken_responses` | Multiple readings taken, averaged, justified | **2** | Needs case C011 |
| E4 | `spoken_responses.prompted` | Escalation stated, in scope, **and `prompted == false`** | 1 | **Blocked by the scope of practice decision, INSTR-MBPT-001 section 11.6.** One rubric cannot serve two cohorts without a scope parameter in the case data. |
| E5 | `spoken_responses` | Action correct and linked to the presentation | **2** | Needs case C013 |
| E6 | `spoken_responses` | All four documentation elements, unprompted, three consecutive | 1 | |
| E7 | `marks`, `pressure_trace`, `spoken_responses` | Repeat chosen unprompted | 1 | |
| E8 | `spoken_responses` | Correct action stated | 1 | |

### Domain F, self monitoring and practice regulation

| Objective | Evidence field | Predicate | Release | Notes |
| --- | --- | --- | --- | --- |
| F1 | Terminal digit trend | Bias identified by the learner and a corrective strategy stated | 1 | Trend measure. Requires the full window before it means anything. |
| F2 | `spoken_responses` plus scorer findings | Attribution matches the scorer's finding on three of four | 1 | |
| F3 | `learner_selection` plus mastery flags | Choice made with a justification | 1 | Never pass or fail |
| F4 | `spoken_responses` plus scorer findings | Both classified correctly | 1 | |

**Count check.** Release 1 fully serves 34 objectives. Release 2 unlocks D4, D5, D7, E3 and E5, which is 5. Total 39. This matches INSTR-MBPT-001 section 5.7 and Appendix B, and it is asserted by the crosswalk checker rather than trusted.

---

## 13. Design decisions awaiting confirmation

Per the rule in INSTR-MBPT-001 section 0, none of these has been resolved by inference. Each is stated with the reading this document has provisionally been written to, so that the document is usable now, and each names what changes when the real decision arrives.

| Tag | Decision | Provisional reading used here | What changes when decided | Owner |
| --- | --- | --- | --- | --- |
| `[DECISION-1]` | **Release 1 surface: phone only, or phone plus glasses.** This is INSTR-MBPT-001 section 11.1 and it is the largest open question in the programme. | Phone is the release 1 surface; glasses is a later layer. Spatial interfaces are declared, not implemented. | Roughly half of release 1 activities, the entire session flow, the coverage figure of 34, and the spatial layer's position in the build plan. Objectives A2, B4 and D1 currently depend on it. | Melissa Tully |
| `[DECISION-2]` | **Aneroid dial linearity.** Is a two point linear angle to pressure map accurate enough across the full range, or do real gauges deviate at the extremes? | Linear, pending measurement. | If deviation exceeds the error budget, calibration needs a third point or a per model correction curve, and the gauge model question in INSTR-MBPT-001 section 11.6 becomes urgent rather than merely important. **Answer this from milestone M1 data.** | Software engineer, from M1 evidence |
| `[DECISION-3]` | **Offline speech recognition.** The product is specified to work offline. Common browser speech recognition is not offline and may send audio off device. | Onset detection is fully on device and covers marking. Transcription for judgement responses is treated as requiring either an on device model, a deferred transcription queue, or a structured input fallback. | Which of those three; the privacy statement in section 10; and whether some Domain E activities are network dependent, which would be a scope statement change. | Melissa Tully with the software engineer |
| `[DECISION-4]` | **Attempt record additions:** `scorer_version` in the score result, `case_version`, `calibration`, `expected_response_set_versions`, `app_version`. | Included in this design as necessary for re-scoring. | Formal adoption under INSTR-MBPT-001 section 10.2, and a matching update to section 4.2 of that document in the same change. | Both roles |
| `[DECISION-5]` | **Habitus category on the attempt record.** The TO-1 mastery rule requires two habitus categories but no field currently carries it for activities where the arm is not measured. | An explicit `habitus_category` field is assumed. | Either the field is added, or a session level partner record is introduced and mastery reads from it. Until then, TO-1 mastery cannot be fully evaluated. | Both roles |
| `[DECISION-6]` | **Device support matrix.** Which phones must work. | Phones from roughly the last five years, both major mobile operating systems. | Camera frame rate assumptions, worker performance budget, and the test device list. Depends on the answer to "do partner programmes supply devices, or is bring your own device assumed", INSTR-MBPT-001 section 11.6. | Nisha Patel |
| `[DECISION-7]` | **Microphone permission refused.** Invariant I-7 makes voice non optional during a live measurement. | Marking activities are blocked with a clear explanation. | Whether a non voice marking path exists at all, which would be an invariant level conversation, not a feature. | Melissa Tully |

**Carried, unchanged, from INSTR-MBPT-001 section 11 because they block software work directly:** the cuff bladder fit standard (11.2) blocks objective B2's scoring rule; the circumference tolerance mismatch (11.3) blocks B1's; the scope of practice boundary per cohort (11.6) blocks E4's. None of the three can be resolved by an engineer and none should be guessed.

---

## 14. What this design deliberately does not do

Stating these prevents them being rediscovered as omissions.

- **It does not build a content management system.** Activity definitions are exported from the workbook. The workbook is the source of truth and the learning engineer already works in it.
- **It does not build user accounts, classes or rosters for release 1.** A pseudonymous learner identifier and an export is sufficient for a pilot, and building an identity system before the pilot proves the core loop would be spending effort on the wrong risk.
- **It does not synchronise attempt records to a server for release 1.** Local first with export. Sync is added when a real customer requirement names it.
- **It does not attempt automatic assessment of hand hygiene or of stethoscope skin contact.** Both are honestly labelled as partial or self report, per invariant I-12, and the product says so.
- **It does not use a model anywhere in the scoring path.** A model that both grades and explains will eventually explain a grade it invented.

---

*End of document.*
