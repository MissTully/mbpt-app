# Manual Blood Pressure Trainer: Architecture Design

**Document identifier:** ARC-MBPT-001
**Version:** 0.1 draft, for review
**Date:** August 9, 2026
**Author:** drafted for Melissa Tully, Founder, Chief Executive Officer and Learning Engineer
**Derived from:** PPP-MBPT-004 version 4.0 and INSTR-MBPT-001 version 1.0
**Companion documents:** SDD-MBPT-001 (software design), UXS-MBPT-001 (user experience summary), BLD-MBPT-001 (build plan)

---

## 0. What this document is for, and how it differs from the software design document

Two documents, two questions.

- **This document** decides the *shape* of the system and the *technologies*. It answers: what are the major parts, what may depend on what, what is each part built with, and why was each alternative rejected. It is the document you hand to someone deciding whether to fund or to join the project, and the document you argue with before writing code.
- **SDD-MBPT-001** decides the *behaviour* of each part inside that shape. It is the document you work from while writing code.

If the two ever disagree, this document wins on structure and technology, and the software design document wins on behaviour.

**A note for a reader newer to software architecture.** Architecture is mostly the business of deciding what is expensive to change later, and then arranging the system so that the expensive things are decided once and the cheap things stay cheap. In this product the expensive things are: the definition of an attempt record, the purity of the scorer, and the format of the clinical case library. Screens are cheap. A wrong screen costs a week. A wrong attempt record costs the credibility of every score already issued, because those attempts cannot be re-scored. The architecture below is arranged around that asymmetry.

---

## 1. Architectural drivers

These are the forces that actually determine the shape. Everything in section 3 is downstream of this table, and a proposed change that ignores one of these is not a change, it is a redesign.

| Driver | Where it comes from | Architectural consequence |
| --- | --- | --- |
| **D1. A score must be defensible and auditable, years later, on a different machine** | Invariant I-1; the accreditation context in PPP-MBPT-004 section 6.1 | A pure, dependency free scoring core. Versioned configuration. Immutable, self sufficient attempt records. This is the single strongest force on the design. |
| **D2. Reach every learner on the phone already in their pocket, both mobile platforms, and later on glasses without a rebuild** | PPP-MBPT-004 section 5.1 | Web application first, native shell second, spatial layer third. Rules out a phone only native application and rules out an application that assumes glasses. |
| **D3. Real time closed loop between a physical gauge and audio, inside about 120 milliseconds** | PPP-MBPT-004 section 5.4 | Perception runs off the main thread. Audio is scheduled, not triggered. The audio path gets the optimisation effort, not the pressure computation. |
| **D4. The classroom has bad connectivity and no attempt may be lost** | PPP-MBPT-004 section 5.2; the deployment reality of a skills laboratory | Local first storage. Offline by default. The network is an optional extra, never a dependency. |
| **D5. The clinical case library outlives every other artifact** | PPP-MBPT-004 section 4; the 90 hours and the permission calendar behind each case | The case format is versioned, self describing, and carries its own capture protocol record. Cases are data the application reads, never code the application contains. |
| **D6. Two roles, one product, and neither may change a shared contract alone** | INSTR-MBPT-001 sections 4 and 10 | Contracts are machine checkable artifacts in the repository, checked in continuous integration, not agreements held in two people's heads. |
| **D7. A generative model may phrase, never grade** | Invariant I-3 | The model sits strictly outside the scoring path, downstream of a finished score, behind a code enforced guard. |
| **D8. Small team, novice to building software of this kind, long runway** | Stated context; risk R6 | Choose boring, well documented technology with one language across the whole system. Optimise for the ability of one person to hold the system in their head. |

---

## 2. Architectural style

**Ports and adapters, with a pure core.** Also called hexagonal architecture. If that name is unfamiliar, the whole idea is one sentence: **the logic that matters sits in the middle and knows nothing about the outside world; everything that touches the outside world plugs into it through a declared interface.**

Concretely, for this product:

- The **core** holds the case model, the auscultation engine, the scorer, the mastery rules and the trend measures. It imports nothing that has anything to do with a browser, a camera, an audio device or a screen. It can be run from a command line over a JavaScript Object Notation file.
- The **ports** are the interfaces the core declares: a gauge reader, a voice input, an audio output, a spatial tracker, an attempt store.
- The **adapters** are the implementations: a browser camera gauge reader, a paced shadowing gauge reader, a browser audio output, a browser storage attempt store. Each one satisfies a port.
- The **application** orchestrates: it selects an activity, wires the adapters to the core, renders screens.

**Why this style, specifically here.** Two reasons, and both are unusually strong in this product.

First, driver D1. A scorer that can be run offline over a stored record is exactly what "defensible to a programme director" means in practice. Ports and adapters is not chosen here for elegance; it is chosen because the alternative cannot satisfy the requirement.

Second, driver D2. The same core must run on a phone browser, inside a native shell, and later on glasses. In each of those cases the perception adapters differ and nothing above them does. Without the port boundary, supporting glasses would mean a second implementation of the auscultation engine and the scorer, and two implementations of a scorer is two scorers that will disagree.

**The one rule that makes it real:** dependencies point inward, and the rule is enforced by an automated check on every commit, not by review. A boundary that is only checked by a human reviewer is a boundary that has already leaked and nobody has noticed yet.

---

## 3. The layers

| Layer | Contents | Depends on | May be imported by |
| --- | --- | --- | --- |
| **Core** | Model types, auscultation engine, cardiac clock, audibility rules, deterministic scorer, mastery engine, trend engine, configuration loader and validator | Nothing outside itself. No framework, no browser, no device library. | Everything |
| **Ports** | Interface declarations only, no implementations | Core model types | Adapters, application |
| **Adapters** | Camera gauge reader, needle estimator, voice input, audio output, storage, and later the spatial tracker | Ports, core model types, platform libraries | Application only |
| **Application** | Activity runner, screens, feedback layer, session management, instructor reports | Core, ports, adapters | Shell |
| **Shell** | Thin native wrapper for store distribution and deeper camera access | Application | Nothing |
| **Tools** | Needle laboratory, case annotator, case acceptance checker, crosswalk checker, golden set runner | Core, and platform libraries as needed. **Never shipped to a learner.** | Nothing |

```
   ┌────────────────────────────────────────────────────────┐
   │  SHELL  (native wrapper, store distribution)           │
   │  ┌──────────────────────────────────────────────────┐  │
   │  │  APPLICATION  (runner, screens, reports)         │  │
   │  │  ┌────────────────────────────────────────────┐  │  │
   │  │  │  ADAPTERS  (camera, voice, audio, storage) │  │  │
   │  │  │  ┌──────────────────────────────────────┐  │  │  │
   │  │  │  │  PORTS  (interfaces only)            │  │  │  │
   │  │  │  │  ┌────────────────────────────────┐  │  │  │  │
   │  │  │  │  │  CORE                          │  │  │  │  │
   │  │  │  │  │  engine · scorer · mastery ·   │  │  │  │  │
   │  │  │  │  │  trends · model · config       │  │  │  │  │
   │  │  │  │  │  ── imports nothing outward ── │  │  │  │  │
   │  │  │  │  └────────────────────────────────┘  │  │  │  │
   │  │  │  └──────────────────────────────────────┘  │  │  │
   │  │  └────────────────────────────────────────────┘  │  │
   │  └──────────────────────────────────────────────────┘  │
   └────────────────────────────────────────────────────────┘

   TOOLS sit outside this stack entirely and import only the CORE.
```

**The test that tells you the boundary is intact:** you can score a stored attempt from a command line, with no browser anywhere, in under a second. If you cannot, something in the core has reached outward and it must be fixed before more is built on top of it.

---

## 4. Technology choices

Every choice below names the alternative that was rejected and why. A reader who disagrees with a choice should be able to find their objection already answered here, or find that it was not considered, which is equally useful.

Choices marked **provisional** are genuine decisions still open, listed again in section 9.

### 4.1 One language across the whole system: TypeScript

**The choice.** TypeScript everywhere: core, adapters, application, tools.

**Why.** The core has to run in three places: in a phone browser during a live attempt, in a test harness on a laptop, and server side for batch scoring and content validation (PPP-MBPT-004 section 5.2 requires exactly this). Exactly one mainstream language runs natively in all three without a compilation bridge, and that is JavaScript, with TypeScript adding the type checking that makes a data contract like the attempt record enforceable at build time rather than discovered at runtime.

Driver D8 also weighs heavily. One language means one set of tooling, one test runner, one package manager, one mental model. For a small team newer to building software of this kind, that is worth more than any per component optimum.

**Alternatives rejected.**

| Alternative | Why not |
| --- | --- |
| Python core, TypeScript application | The core would then need to run in the browser, which means a Python to WebAssembly bridge, which is slow to start and awkward to debug. Two languages doubles the tooling burden for one person. |
| Rust core compiled to WebAssembly | Genuinely attractive for the needle estimator's inner loop and for determinism. Rejected for release 1 on driver D8: the learning curve is steep and the performance is not needed, because the pressure computation is not the binding constraint (PPP-MBPT-004 section 5.4). **Revisit if and only if profiling shows the estimator is the bottleneck.** The port boundary makes this a contained, later swap. |
| Swift and Kotlin native applications | Rejected by driver D2 and by PPP-MBPT-004 section 5.2 directly: going native first excludes one platform's learners on day one and forces a rewrite to recover them. |

**The type checking payoff, stated concretely, because it is the main reason for the "Type" in TypeScript:** the attempt record has around 25 fields, several of which exist solely because one objective cannot be scored without them. Typed, a missing `scaffold_state` is a build failure. Untyped, it is a mastery rule silently evaluating against `undefined` and a learner being told they are competent when they are not. Invariant I-4 is a type, not a hope.

### 4.2 The application: a progressive web application

**The choice.** An installable progressive web application, working offline, using the standard browser camera and audio interfaces. A thin native shell added afterwards, wrapping the same application, for store distribution and for camera access where a browser cannot reach it.

**Why.** PPP-MBPT-004 section 5.2 sets this out and the reasoning is sound: a web application reaches every learner on the device already in their pocket, with no installation and no platform exclusion. A native shell around the same application adds store distribution without a second codebase. Going native first would exclude one platform's learners on day one.

**The honest cost,** which should be stated to anyone who asks: a browser gives slightly less camera control than a native application does, and audio output latency is less controllable. Both are recoverable through the shell. The cost of the reverse mistake is not recoverable without a rewrite.

**Alternative rejected: a cross platform native framework.** These solve the two platform problem but not the glasses problem, they add a large dependency at the exact layer where the product needs precise camera and audio control, and they do not give the "runs in a browser, no installation" property that makes a pilot easy to start.

### 4.3 User interface framework: React **(provisional)**

**The choice.** React, with a component library kept deliberately small.

**Why.** The application layer is genuinely stateful: an activity runner state machine, live perception streams, buffered feedback. A declarative framework earns its place there. React specifically because it has the deepest documentation and the largest answer base, which matters under driver D8.

**Why provisional.** The application layer is the cheapest layer to change and this choice is not load bearing. Any comparable framework would serve. What matters architecturally is that the framework stays *above* the port boundary and never appears in the core. If a different framework is preferred, nothing in this architecture changes.

### 4.4 Camera and needle reading: browser media capture plus classical computer vision in a worker

**The choice.** Standard browser camera capture. Frames processed in a worker thread. A classical computer vision algorithm, written by hand, as described in SDD-MBPT-001 section 4.1: radial sampling around the dial centre, angular peak location, sub bin centroid, filtering.

**Why classical rather than a trained model.**

| Consideration | Classical computer vision | A trained model |
| --- | --- | --- |
| Training data | None needed | Needs a labelled corpus of dial images across gauge models and lighting, which does not exist and would itself be a media production programme |
| Explainability | Every step is inspectable, and the confidence value has a physical meaning | Confidence is a number the model emits |
| Failure mode | Degrades predictably as contrast falls; confidence tracks it | Can fail confidently, which is the worst possible behaviour under invariant I-9 |
| Determinism | Deterministic per frame | Deterministic per frame in principle, but subject to numerical differences across hardware backends |
| Effort | Days to a first version | Weeks, plus the data |

The dial is a genuinely favourable target: high contrast by design, engineered to be read at a glance, with a dark needle against a light face, and the camera is held still with exposure locked at capture time. This is close to the best case for a classical approach. A trained model remains a fallback if milestone M1 fails, and the port boundary means it can be swapped in without anything above it changing.

**On computer vision libraries.** The full browser build of a general computer vision library is a heavy dependency for what amounts to a few hundred lines of pixel arithmetic. Recommendation: hand written first, measured, and a library considered only if the hand written version misses the milestone M1 target. This keeps the first release's dependency surface small, which matters for cold start time on a mid range phone.

### 4.5 Audio: the browser audio interface, with scheduled playback

**The choice.** Individual Korotkoff beats held as decoded audio buffers, scheduled ahead of time against the audio clock rather than played on demand.

**Why scheduling rather than triggering.** Triggering a sound at the moment you decide it should play adds the browser's event loop jitter to every beat. Scheduling it a fixed short interval into the future, against the audio hardware's own clock, removes that jitter entirely at the cost of a fixed lookahead. The lookahead is part of the synchrony budget in SDD-MBPT-001 section 4.2.3 and is spent deliberately.

**Why not play the original continuous recording.** Because the audio must be indexed by pressure, not by time. A continuous file played along a timeline gives a slow deflator sounds that end too early and a fast deflator sounds that continue after the cuff is empty, and both learn a false association. This is the central design constraint of the whole product and it is worth repeating in an architecture document because it is the thing an outside contractor is most likely to get wrong.

**Bluetooth.** Detected, recorded in the attempt record as `audio_route`, warned about, and refusable for scoring as a configurable policy. Standard Bluetooth adds 100 to 200 milliseconds, which barely affects accuracy but sits at the edge of perceptible lag against a needle the learner is watching, and reads to the learner as the product being broken. Wired earphones are recommended in all instructor and learner materials.

### 4.6 Voice: on device onset detection, plus transcription **(provisional)**

**The choice.** Two separate mechanisms, per SDD-MBPT-001 section 4.3. A cheap on device audio onset detector supplies the mark timestamp. A speech recogniser supplies transcripts for spoken judgement responses.

**Why they are separate.** If the mark timestamp came from a recogniser's completion callback it would carry the recogniser's latency, and worse its latency variance, straight into the learner's score. Onset detection is deterministic, local, and costs almost nothing.

**Why the transcription half is provisional.** The product is specified to work offline. Common browser speech recognition is not offline and on at least one major browser sends audio to a remote service. That is both an offline problem and a privacy problem, and it is `[DECISION-3]` in SDD-MBPT-001 section 13. The three candidate resolutions, in order of preference:

1. An on device speech model. Feasible on recent phones, costs application size and cold start time, keeps the privacy position clean.
2. A deferred transcription queue: capture the audio locally, transcribe when the network returns, score afterwards. The learner does not get immediate feedback on judgement responses, which conflicts with Practice activities' immediate feedback requirement.
3. A structured input fallback offline: select from options rather than speak freely. Cheapest, but it weakens the objective, because recognising a correct option is an easier task than producing one.

This is a decision with a learning consequence, not only an engineering one, which is why it is owned jointly.

### 4.7 Storage: local first, in the browser's own database

**The choice.** Attempt records, case packages, configuration and activity definitions stored locally on the device. Export as a file. No server dependency in release 1.

**Why.** Driver D4. The classroom has bad connectivity and no attempt may be lost. A design that writes to a server first and caches locally as a fallback will lose attempts on the day the network is bad, which is the day it matters. A design that writes locally first and syncs later cannot.

**The consequence to accept deliberately:** with no server, a learner's history lives on their device. Changing devices loses it unless exported. For a pilot this is acceptable and it is far better than building an identity and synchronisation system before the core loop is proven. It becomes a real requirement the moment a partner institution asks for cohort reporting, and it is named in the build plan as a post pilot addition rather than discovered as a gap.

### 4.8 Configuration and content: files, versioned in the repository

**The choice.** Threshold configuration, activity definitions and expected response sets are versioned data files in the repository, not database rows and not values in code.

**Why.** Invariant I-2 requires that changing a tolerance is a data change with a version number and a changelog entry. Version control gives that for free, along with a review history, an author, and a date, which is precisely the audit trail a threshold change needs at review gate G-3.

Activity definitions are *generated* from the Crosswalk workbook by an export step, never hand edited, so the workbook remains the single source of truth and the learning engineer keeps working where they already work.

### 4.9 Testing and continuous integration

| Concern | Choice | Note |
| --- | --- | --- |
| Test runner | Whatever runs the chosen language fastest with the least configuration | The core's tests must run in about a second, or they will not be run often enough to matter |
| Schema validation | A runtime schema validator that also produces the compile time types from a single definition | One definition of the attempt record, not two that can drift |
| Boundary enforcement | An automated dependency check that fails the build if the core imports outward | Not a review convention |
| Golden set | Checked in attempt records with hand derived expected scores | See SDD-MBPT-001 section 11 on why generating them from the current scorer is circular and catches nothing |

---

## 5. Runtime views

### 5.1 A live measurement attempt

```
learner        camera        needle          auscultation      audio      attempt
                             estimator       engine                       record
  │              │              │                 │              │           │
  │ calibrate ───┼──────────────▶ zero + 200 mark │              │           │
  │              │              │  → mapping      │              │           │
  │              │              │                 │              │           │
  │ inflates     │ frames ──────▶ pressure,       │              │           │
  │              │   30-60/s     │  confidence ───▶ above systolic│           │
  │              │              │                 │  → silent    │           │
  │              │              │                 │              │           │
  │ deflates ────┼──────────────▶ pressure ───────▶ cardiac clock │           │
  │  2-3 mmHg/s  │              │                 │  fires beat  │           │
  │              │              │                 │  audible?    │           │
  │              │              │                 │  YES ────────▶ schedule  │
  │              │              │                 │              │  +30ms    │
  │ ◀────────────┼──────────────┼─────────────────┼──── hears beat│           │
  │              │              │                 │              │           │
  │ says "mark" ─┼── onset detector ──────────────┼──────────────┼──▶ mark   │
  │              │   timestamp at ONSET           │              │  at that  │
  │              │   not at recognition           │              │  pressure │
  │              │              │                 │              │           │
  │ ... continues to phase five, marks diastolic ...             │           │
  │              │              │                 │              │           │
  │ ends ────────┼──────────────┼─────────────────┼──────────────┼──▶ SEALED │
                                                                             │
                                                              scorer ◀───────┘
                                                              (pure, offline capable)
```

**The two details in this diagram that carry the most weight.** The mark is timestamped at voice onset, not at recognition. And a beat plays only when the cardiac clock and the pressure state both agree; neither drives playback alone.

### 5.2 Scoring, and re-scoring

```
  attempt record  ──┐
  configuration v7 ─┼──▶  scorer (pure)  ──▶  score + findings + mastery updates
  case ground truth ┘                                    │
                                                         ▼
                                            feedback layer (templates)
                                                         │
                                            optional model rephrasing
                                                         │
                                            NUMBER GUARD ─── fails ──▶ show template
                                                         │
                                                         ▼
                                                    learner sees words
```

Re-scoring is the same diagram with a different configuration version, run months later, from stored records, with no application present. That is the property that makes a score defensible, and every other choice in this architecture is downstream of preserving it.

### 5.3 Case production, from capture to library

```
  CAPTURE RIG                          AUTHORING                     PRODUCT
  ───────────                          ─────────                     ───────
  gauge video ────┐
  stethoscope ────┼──▶ case acceptance ──▶ annotator ──▶ ground   ──▶ case
  audio           │    checker (AT THE      (needle      truth        package
  reference ──────┘    RIG, before the      read, beat   (3 raters,   in the
  pressure log         volunteer leaves)    onsets,      within       library
                              │             rhythm,      4 mmHg or
                       fail ──┘             audibility)  REJECTED)
                       retake now,
                       not next month
```

**The architectural point hiding in this diagram:** the case acceptance checker runs *at the rig*, on a laptop, before the volunteer is thanked and sent home. That is why it is a tool built early rather than a script written later, and it is why the needle estimator, which the checker depends on, is built first. One tool, three jobs, per INSTR-MBPT-001 section 6.1.

---

## 6. How the architecture satisfies each invariant

Invariants are only real if something structural enforces them. This table is the audit.

| Invariant | Architectural mechanism | Enforced by |
| --- | --- | --- |
| I-1, deterministic scoring | Pure core, no clock, no network, no model, no randomness in the scoring path | Boundary check plus golden set, every commit |
| I-2, thresholds in configuration | Versioned configuration files; schema validation refuses to load an invalid configuration rather than defaulting | Schema validator plus review gate G-3 |
| I-3, models phrase but never grade | The model sits downstream of a finished score, behind a code enforced number guard | Feedback layer code plus a unit test |
| I-4, every attempt carries its scaffold state | Required field; write rejected without it; typed at compile time | Type system plus write validation |
| I-5, feedback timing by activity type | Enforced once in the activity runner state machine; screens have no mechanism to show feedback during an Assess performance | Runner design plus tests |
| I-6, never resolve a discrepancy by revealing the answer | No code path renders the correct value in response to a discrepancy | Runner design plus review |
| I-7, no input requiring a hand on equipment | Voice and gesture adapters only during a live measurement | Activity definition input modality field plus review |
| I-8, trends scored separately | Separate engine, separate pass, results never enter the attempt score structure | Type separation: the trend engine's output type is not accepted by the attempt score |
| I-9, a wrong pressure is worse than none | Confidence threshold in the perception adapter; below it, pressure is reported as unavailable, not as a value | Adapter design plus degraded mode tests |
| I-10, no case without a capture protocol record | Case loader rejects a package lacking one; acceptance checker rejects at capture | Loader validation plus acceptance tool |
| I-11, no claim to replace supervised measurement | Not architectural. Copy review, in the content pipeline and in marketing review. | Human gate, named in the build plan |
| I-12, hand hygiene never reported as measured competency; stethoscope placement reported as partial | Reporting layer excludes A7 from competency exports and labels D1 partial | Unit test asserting A7 never appears in a competency export |

**I-11 is the only invariant with no automated enforcement.** That is worth noticing rather than glossing over. It is a copy and claims discipline, and the mitigation is that it appears on a review checklist before anything is published, not that someone remembers.

---

## 7. Deployment

| Environment | What runs there | Notes |
| --- | --- | --- |
| Learner phone, browser | The progressive web application, installed to the home screen, working offline | The default and the pilot path. No store approval needed, which means a pilot can start without waiting on anyone. |
| Learner phone, native shell | The same application inside a thin wrapper | For store distribution and for camera access a browser cannot reach. Added after the core loop is proven, not before. |
| Glasses | The same application in the device browser; the spatial layer added later | Depends on `[DECISION-1]` |
| Instructor laptop | The same application, plus report views | No separate build |
| Authoring laptop | Tools: needle laboratory, annotator, acceptance checker | Never shipped |
| Capture rig laptop | Reference pressure logging plus the acceptance checker | One rig. The reference sensor is never shipped to a customer. |
| Continuous integration | Core tests, golden set, boundary check, crosswalk check | The place the contracts between the two roles are actually enforced |
| Server, optional and later | Batch scoring, content validation, and eventually synchronisation | The core already runs server side by construction. Nothing new is needed to enable it. |

**What is deliberately absent from this table for release 1:** any server the product depends on to function. The pilot must run in a room with no network.

---

## 8. Architecture decision records to write

INSTR-MBPT-001 section 10.1 already names two. This document adds four more, and recommends the same short format for all of them: context, decision, alternatives considered, consequences, status, date.

| Record | Subject | Status |
| --- | --- | --- |
| ADR-001 | Web application first, native shell second. Records the reach argument in full. | Named in INSTR-MBPT-001. Write now. |
| ADR-002 | Optical gauge reading. Records the latency reasoning and, once milestone M1 completes, the validation result and the chosen confidence threshold. | Named in INSTR-MBPT-001. Open it now, complete it at M1. |
| ADR-003 | One language across core, adapters, application and tools. Records section 4.1 above. | Write now. |
| ADR-004 | Local first storage with export, no server dependency for release 1. Records the attempt durability argument and the accepted consequence about device changes. | Write now. |
| ADR-005 | Pressure indexed audio with scheduled beat playback, rather than timeline playback. **The most important record for any future contributor**, because it is the design most likely to be innocently undone by someone optimising. | Write now. |
| ADR-006 | Speech handling: onset detection separated from transcription, and the resolution of the offline transcription question. | Open now, complete at `[DECISION-3]`. |

**On writing these at all.** An architecture decision record is a page. Its value is not documentation for its own sake; it is that in eleven months, when someone proposes playing the case audio as a continuous file because it would be simpler, ADR-005 answers them in thirty seconds instead of the argument being re-run from memory by people who no longer remember the reason.

---

## 9. Open architectural decisions

These are architectural rather than behavioural, and they are additional to the decisions listed in SDD-MBPT-001 section 13 and INSTR-MBPT-001 section 11.

| Decision | Why it is architectural | Owner | Needed by |
| --- | --- | --- | --- |
| **Release 1 surface: phone only, or phone plus glasses** (`[DECISION-1]`, INSTR-MBPT-001 section 11.1) | It determines whether the spatial layer is release 1 scope or a later layer, which changes the build plan, the session flow, the coverage figure, and roughly half the activities. Everything in this document is written to phone first, as the instructions file provisionally does. **This is the highest priority open item in the whole programme.** | Melissa Tully | Before any activity implementation |
| **Offline transcription approach** (`[DECISION-3]`) | It determines whether some Domain E activities are network dependent, which is a scope statement change and a privacy statement change, not a feature detail. | Melissa Tully with the software engineer | Before Domain E activities are built |
| **User interface framework** | Low stakes, named for completeness. It must stay above the port boundary. | Software engineer | Before application work starts |
| **Whether the needle estimator's inner loop is later moved to a compiled module** | Only if profiling demands it. The port boundary makes it a contained swap. | Software engineer | Only if milestone M1 or device profiling raises it |
| **Device support matrix** (`[DECISION-6]`) | It sets the performance budget and the test device list, and it depends on whether partner programmes supply devices or assume bring your own device. | Nisha Patel | Before pilot scoping |

---

## 10. Risks, from an architectural point of view

The full register is PPP-MBPT-004 section 8. These are the ones the architecture is specifically arranged to absorb.

| Risk | How the architecture absorbs it |
| --- | --- |
| **R2, needle reading does not reach required accuracy in classroom conditions** | The paced shadowing adapter implements the same port. If the estimator fails, the product still ships as a pacing and perception trainer, the estimator still annotates the entire case library, and it has still validated the capture rig. There is no outcome in which building it first is wrong. |
| **R3, capture protocol drift makes the library internally incomparable** | Every case carries its own capture protocol record, the loader rejects a package without one, and the acceptance checker runs at the rig before the volunteer leaves. Drift is caught the same day, not a year later. |
| **R6, engineering capacity insufficient** | The port boundary is what makes contracting safe. The application layer and the screens can be contracted out because they sit above the boundary and cannot damage the durable assets. The needle estimator, the scorer and the content pipeline stay in house because they are the durable assets. |
| **R8, Bluetooth audio lag** | Route detection is in the audio adapter, the route is recorded in the attempt record, and the scoring policy is configuration rather than code. |
| **R9, scope creep from spatial features** | The spatial port is declared and unimplemented. Adding a spatial activity requires implementing an adapter, which is a visible, deliberate act, not an incremental drift. |
| **Contributor undoes a load bearing design innocently** | Architecture decision records, particularly ADR-005 on pressure indexed audio, plus the automated boundary check. |

---

## 11. What would make this architecture wrong

Worth stating plainly, so that the assumptions are falsifiable rather than implicit.

- **If the needle estimator cannot reach milestone M1 accuracy in a browser** but could in a native application, then the web first position weakens considerably and the shell moves from a later convenience to a release 1 requirement. Test this early; it is part of what milestone M1 is for.
- **If the audiovisual synchrony budget cannot be met in a browser on real mid range phones**, the same conclusion follows. Measure it at milestone M5 on real devices rather than trusting the calculation.
- **If release 1 turns out to include glasses**, then the spatial layer is not "added later", it is release 1 scope, the build plan changes shape substantially, and the session flow in the Crosswalk workbook is the real one rather than a superseded one. This is `[DECISION-1]` and it is why that decision is the highest priority item in the programme.
- **If a partner institution requires cohort level reporting from day one**, local first with export is insufficient and synchronisation moves into release 1. Ask the question before the pilot is scoped rather than after.

---

*End of document.*
