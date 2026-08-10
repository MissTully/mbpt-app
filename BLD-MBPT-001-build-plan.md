# Manual Blood Pressure Trainer: Build Plan

**Document identifier:** BLD-MBPT-001
**Version:** 0.1 draft, for review
**Date:** August 9, 2026
**Author:** drafted for Melissa Tully, Founder, Chief Executive Officer and Learning Engineer
**Derived from:** PPP-MBPT-004 version 4.0, INSTR-MBPT-001 version 1.0
**Companion documents:** SDD-MBPT-001 (software design), ARC-MBPT-001 (architecture), UXS-MBPT-001 (user experience summary)

---

## 0. How to read this plan

**Weeks are relative, not dated.** Week 1 is the first week after the decisions in section 2 are closed. Every milestone in PPP-MBPT-004 section 7.3 is currently relative rather than dated, because the pilot date is not set. That open question, "is the pilot date set", is listed as needed *immediately* in INSTR-MBPT-001 section 11.6, and it is the single input that converts this plan from a shape into a schedule.

**Estimates are in engineer days**, meaning one person, one uninterrupted working day. They assume one experienced engineer. If the engineer is learning as they go, multiply by somewhere between 1.5 and 2.5 for the first two phases and less thereafter, and treat that multiplier as a real number rather than an insult; a first attempt at a real time perception loop takes longer than a fifth attempt.

**Ranges are honest ranges.** Where a range is wide, the reason is stated. A wide range on the needle estimator is not vagueness; it is the actual uncertainty about how a classical computer vision approach performs against real gauges in real lighting, which is exactly what milestone M1 exists to resolve.

---

## 1. The sequencing principle

**Three workstreams run in parallel, not in sequence.** This is the most important sentence in the plan and it comes straight from PPP-MBPT-004 section 7.1.

| Workstream | Bound by | Why it cannot wait |
| --- | --- | --- |
| **Media production** | The calendar: permissions, recruitment, scheduling | Permission work takes three to six weeks of elapsed time and almost no effort. Starting it in month three delays the second release by three months for no engineering reason at all. |
| **Software** | Effort: engineering hours available | It is the long pole in labour but not in calendar. |
| **Curriculum and content** | The needle estimator, for case annotation | Largely done already. Its remaining dependency is a tool, not a decision. |

Running them serially would waste the autumn. The media workstream **delivers last and starts first**, which is counter intuitive enough that it needs saying explicitly to anyone joining the project.

**The second sequencing principle: build the needle estimator first, standalone, before any application exists.** INSTR-MBPT-001 section 6.1 gives the argument. One tool, three jobs: the decisive technical gate, the content annotation tool, and the capture rig validator. There is no outcome in which building it first is the wrong move — if it hits accuracy, there is a closed loop; if it is marginal, paced shadowing ships and the estimator still annotates the library; if it fails outright, it has still validated the capture rig.

---

## 2. Phase 0: decisions and foundations, week 0

Nothing in this phase is code. All of it is cheap, and every item on it blocks something expensive later.

| Item | Owner | Blocks |
| --- | --- | --- |
| **Decide the release 1 surface: phone only, or phone plus glasses** | Melissa Tully | Roughly half of the release 1 activities, the entire session flow, the coverage figure of 34, and the shape of phases 4 and 5 of this plan. INSTR-MBPT-001 section 11.1. **This is the highest priority item in the programme.** |
| Decide the cuff bladder fit standard, in writing, with the partner institution | Nisha Patel | Objective B2's scoring rule. B2 carries the acceptance criterion that is the reason the product exists. |
| Resolve the circumference tolerance: 1 centimetre or 1.5 | Melissa Tully | Objective B1's scoring rule |
| Resolve the release tag on Module 1 Lesson 1 | Melissa Tully | Release 1 totals, and therefore anything communicated to a partner |
| Clarify whether 14 accepted cases is a release 1 gate or a variety target | Melissa Tully | Pilot scoping |
| Confirm the scope of practice boundary for escalation, per cohort | Nisha Patel | Domain E content authoring and objective E4's rule |
| Identify the recording site and start the not human subjects research determination | Melissa Tully | The entire media programme and five objectives. **Start this on day one; it runs on a calendar, not on effort.** |
| Name the three expert raters and confirm their availability | Melissa Tully | Case acceptance, and therefore every pathology objective |
| Confirm which gauge models are in use at partner institutions | Nisha Patel | Milestone M1 validation. The needle reader must be tested against the dials learners will really point a camera at. |
| Confirm whether partner programmes supply devices or assume bring your own device | Nisha Patel | The device support matrix and the sixty second handover requirement |
| **Set the pilot date** | Melissa Tully | Every milestone in this plan |
| Write architecture decision records ADR-001, ADR-003, ADR-004, ADR-005 | Software engineer | Nothing immediately; costs half a day and saves a fortnight of re-litigation later |
| Set up the repository, tooling and continuous integration | Software engineer | Everything |

**The uncomfortable observation about this table:** almost none of it is engineering work, and almost all of it blocks engineering work. A week spent closing these is the highest return week in the whole programme.

### 2.1 Repository and tooling setup, concretely

For a first time setup, in order. Each step is small and each is verifiable before moving on.

1. **Create the repository** with the directory structure from INSTR-MBPT-001 section 6.8. Create the directories empty, with a one line README in each saying what belongs there and what does not. This sounds trivial. It is the cheapest possible way to make the architectural boundary visible to everyone who ever opens the project.
2. **Initialise the language toolchain**, one language across core, adapters, application and tools, per ARC-MBPT-001 section 4.1.
3. **Set up the test runner** and write one trivial passing test in the core. Confirm the core's test suite runs in about a second. If it takes ten seconds now, it will take three minutes in six months and will stop being run.
4. **Set up the automated dependency boundary check** so that the build fails if anything under the core imports a browser, camera, audio or device library. Write one deliberately failing example, watch it fail, then delete it. **Do this now, not later.** A boundary added after the leak is a refactor; a boundary added before is a rule.
5. **Set up continuous integration** to run, on every commit: core tests, the boundary check, and (once they exist) the golden set and the crosswalk check.
6. **Create the configuration file** with every parameter from INSTR-MBPT-001 section 9, a `version` string, and a schema that refuses to load an invalid file rather than defaulting. Leave `cuff_bladder_fit_standard` explicitly unset so that anything depending on it fails loudly rather than silently guessing.

**Estimate: 2 to 4 engineer days.** Resist the urge to skip step 4.

---

## 3. Phase 1: the needle estimator, weeks 1 to 3

**Goal:** milestone M1. The estimator reads a real aneroid dial within 2 millimetres of mercury on 95 percent of frames, across three gauge models and three lighting conditions, with the full error distribution reported.

| Task | Detail | Estimate |
| --- | --- | --- |
| 1.1 Build the reference capture setup | Camera on a fixed mount, inline pressure sensor logging at 50 hertz or better, electronic slate. This is a subset of the full rig and it is needed now, before the full rig is frozen. | 2 to 3 days, plus procurement lead time |
| 1.2 Record the validation corpus | Three gauge models, three lighting conditions, several deflations each, with synchronised reference pressure logs. Colleagues, not volunteers. No consent complexity. | 1 to 2 days |
| 1.3 Build the needle laboratory harness | The command line tool: takes a video and a reference log, aligns on the slate, runs the estimator, emits the error distribution. **Build the harness before the estimator**, so that every estimator change is measured rather than eyeballed. | 2 to 3 days |
| 1.4 Implement the estimator | Dial location, radial sampling, angular peak location, sub bin centroid, angle unwrapping, filtering, angle to pressure mapping, confidence. SDD-MBPT-001 section 4.1. | 4 to 10 days |
| 1.5 Iterate against the corpus | Measure, adjust, re-measure. This is where the range in 1.4 actually lives. | 3 to 8 days |
| 1.6 Set the confidence threshold from evidence | Plot confidence against error across the corpus and choose the threshold that separates them. Write it into configuration. Record the reasoning in ADR-002. | 1 day |
| 1.7 Answer the dial linearity question | Does a two point linear map hold across the full range on real gauges, or is a correction needed? `[DECISION-2]`. The corpus already contains the data to answer it. | 1 day |
| 1.8 Report | Error distribution, not just the mean. **A mean error of 1 with a long tail of 15 millimetre outliers is a failure wearing a passing grade.** | 1 day |

**Phase total: 15 to 29 engineer days.**

**Exit gate, milestone M1.** Met or not met on evidence, not on impression. If not met, go to section 9, the fallback plan, before writing any application code.

**Running in parallel, and not by the engineer:** site identification, the not human subjects research determination, consent form drafting with counsel, and rater recruitment. Pipeline stage P3 starts on day one.

---

## 4. Phase 2: the core, and the case library, weeks 3 to 7

**Goal:** milestones M2 and M4. The pure core exists and is tested. The capture pipeline is proven end to end. The ten existing cases are migrated into the current schema.

| Task | Detail | Estimate |
| --- | --- | --- |
| 2.1 Model types | Case, Activity, AttemptRecord, Objective, Config, ScoreResult. One definition producing both compile time types and runtime validation. | 2 to 3 days |
| 2.2 Configuration loader and validator | Versioned, schema validated, refuses to load rather than defaulting. | 1 day |
| 2.3 Attempt record store | Append only, validate on write, reject a record missing `scaffold_state`, no update method in the interface. | 2 days |
| 2.4 Deterministic scorer, the five rule shapes | Tolerance comparison, band membership, discrete correctness, expected response match, geometric check. SDD-MBPT-001 section 4.4.2. Build the shapes, then wire the objectives to them. | 5 to 8 days |
| 2.5 Expected response set format and matcher | The data format plus the deterministic matcher. SDD-MBPT-001 section 4.4.3. | 2 to 3 days |
| 2.6 Trend engine and mastery engine | Terminal digit bias, excursion trend, mastery streaks with the scaffold state and case and habitus conditions. | 3 to 4 days |
| 2.7 The first golden set | **Expected scores derived by hand**, by both roles together, from the objective definitions. Not generated by running the scorer, which is circular and catches nothing. Tedious once, then it catches every accidental scoring change forever. | 2 to 3 days, both roles |
| 2.8 Case annotator | Needle read across a take, beat onset detection, pressure tagging, rhythm interval extraction, audibility profile generation. Pipeline stage P6. | 4 to 6 days |
| 2.9 Case acceptance checker | Automates acceptance criteria 2, 3, 5 and 6. **Runs at the rig, before the volunteer is thanked and sent home.** | 2 to 3 days |
| 2.10 Migrate the ten existing cases | Through the annotator into the current schema, with beat libraries and rhythm sequences. Milestone M4. | 2 to 4 days |
| 2.11 Crosswalk checker | Five coverage checks, plus the evidence contract check, plus exit condition compilability. Runs in continuous integration. | 2 to 3 days |

**Phase total: 27 to 40 engineer days.**

**Running in parallel, media workstream:** rig built and capture protocol frozen (P1); pilot capture with two colleagues taken all the way through to an accepted case (P2, milestone M2). **Stage P2 is the one most often skipped and the one most worth protecting.** Taking two colleagues end to end, before any volunteer is scheduled, is what stops a capture day producing fourteen unusable recordings because the audio was in the wrong mode or the slate was missed.

**Running in parallel, learning engineer:** export activity definitions from the Crosswalk workbook to a machine readable file; author the expected response sets for the release 1 Domain E and Domain F prompts; author the feedback template library.

**Exit gates:** M2, two colleague recordings taken through to accepted cases. M4, ten cases in the current schema.

---

## 5. Phase 3: the closed loop, weeks 7 to 11

**Goal:** milestone M5. A learner deflates a real cuff and hears the correct case sounds at the correct pressures.

This is the phase where the product becomes real, and it is the phase most worth protecting from scope pressure.

| Task | Detail | Estimate |
| --- | --- | --- |
| 3.1 Auscultation engine | Cardiac clock, audibility rule, beat scheduler. **A beat plays only when both agree.** SDD-MBPT-001 section 4.2. | 4 to 6 days |
| 3.2 Audio adapter | Decoded buffers, scheduled playback with lookahead, route detection, latency reporting. | 3 to 4 days |
| 3.3 Camera gauge adapter | The estimator from phase 1, moved behind the port, running in a worker off the main thread. | 3 to 5 days |
| 3.4 Calibration flow | Zero, scale mark, framing guidance, mid session recalibration without losing the attempt. | 2 to 3 days |
| 3.5 Voice adapter, onset detection | On device onset detection supplying the mark timestamp. **Timestamped at onset, not at recognition.** | 3 to 4 days |
| 3.6 Voice adapter, transcription | Depends on `[DECISION-3]`. Estimate assumes the simplest resolution. | 2 to 6 days |
| 3.7 Paced shadowing adapter | The fallback implementing the same port. Cheap now, and it is the insurance policy for risk R2. | 1 to 2 days |
| 3.8 Degraded mode handling | All seven conditions in SDD-MBPT-001 section 9. **Write these tests before polishing the happy path.** | 3 to 4 days |
| 3.9 Measure the synchrony budget on real devices | Three real phones, wired and Bluetooth. Measured, not calculated. If the budget is missed, this is the moment to know. | 2 days |

**Phase total: 23 to 36 engineer days.**

**Exit gate, milestone M5,** and it is a physical demonstration rather than a test suite: a person deflates a real cuff, and the right sounds appear and disappear at the right pressures, no matter how fast or slowly they deflate.

**Running in parallel, media workstream:** permissions completing (M3); capture sessions scheduled; priorities one to four recruited. Recruitment is the long pole, particularly the auscultatory gap case, which cannot be recruited by diagnosis and must be found by screening candidates.

---

## 6. Phase 4: the curriculum, weeks 11 to 17

**Goal:** milestone M6. The 52 release 1 activities implemented, crosswalk showing zero coverage faults.

| Task | Detail | Estimate |
| --- | --- | --- |
| 4.1 Activity runner state machine | One runner, all 61 activities. Feedback timing enforced here, once. Invariants I-5 and I-6 live in this component. | 4 to 6 days |
| 4.2 The four activity type patterns | Present, Practice, Assess, Reflect as reusable shells. | 4 to 6 days |
| 4.3 The scaffold ladder as an interface system | Four states, one visual language, used identically everywhere. | 2 to 3 days |
| 4.4 The live measurement screen | The core screen, in all four scaffold states. UXS-MBPT-001 section 5. | 5 to 8 days |
| 4.5 Feedback layer | Template lookup, optional model rephrasing, **the number guard in code**. | 3 to 4 days |
| 4.6 Safety gate handling | Three kinds, three behaviours. | 2 to 3 days |
| 4.7 The remaining activity screens | 52 activities across the patterns above. Most are assembly once the patterns exist; a handful are bespoke. **This is the largest single block in the plan and the best candidate for contracting.** | 15 to 30 days |
| 4.8 Reflect activities and trend presentation | Including the window rule: below the window, say so rather than drawing a meaningless chart. | 3 to 4 days |
| 4.9 Instructor reports | Session start, live view, learner detail, and **the competency evidence view**, with A7 excluded and D1 labelled partial. | 5 to 7 days |
| 4.10 Offline behaviour and installability | Everything works with the network off. | 2 to 3 days |
| 4.11 Accessibility pass | UXS-MBPT-001 section 10. | 3 to 4 days |

**Phase total: 48 to 78 engineer days.**

**Exit gate, milestone M6:** 52 activities implemented and the crosswalk check showing zero coverage faults in continuous integration, not in a reviewer's head.

**The contracting decision lives here.** Risk R6 and its standing response: contract the undifferentiated interface work, keep the needle estimator, the scorer and the content pipeline in house, because those are the durable assets. Task 4.7 is precisely the undifferentiated interface work, and the port boundary is what makes handing it over safe.

---

## 7. Phase 5: pilot readiness, weeks 17 to 20

**Goal:** milestone M7. Instructors have run a full session on the real equipment in the real room.

| Task | Detail | Estimate |
| --- | --- | --- |
| 5.1 Instructor pack | Session plan, report interpretation, failure modes. Learning engineer deliverable. | 4 to 6 days, learning engineer |
| 5.2 Class B, C and D media | Technique demonstration clips, habitus reference imagery, instructor onboarding video. **A single day with a colleague and a tripod**, plus editing. | 3 to 5 days |
| 5.3 Dry run, internal | The full session, real equipment, real room, colleagues as learners. | 2 days, both roles |
| 5.4 Fix what the dry run finds | Reserve capacity deliberately. Something will be found and it will not be a software defect; it will be a handover taking ninety seconds. | 3 to 6 days |
| 5.5 Instructor dry run | The instructors run it, not the builders. This is the actual milestone. | 1 to 2 days |
| 5.6 Claims and copy review | Invariant I-11 has no automated enforcement, so it needs a human gate before anything is published or shown to a partner. | 1 day |
| 5.7 Network traffic audit | Verify that nothing personally identifying leaves the device by default. | 1 day |

**Phase total: 15 to 23 days across both roles.**

---

## 8. The media workstream, in its own calendar

This runs from day one, in parallel with everything above, and it is bound by calendar rather than by effort. Total production effort is approximately 90 hours, which is not a large number. **The programme has never been effort constrained; it has been permission and recruitment constrained, and those two things run on calendars.**

| Stage | Work | Owner | Duration | Starts |
| --- | --- | --- | --- | --- |
| P1 | Build the rig, freeze the capture protocol, write the take log template and the consent form | Melissa Tully with counsel | 2 weeks | Week 1 |
| P2 | Pilot capture: two colleagues, full protocol, end to end through to an accepted case | Melissa and Doug Tully | 1 week | After P1 |
| P3 | Site identification and permission, consent approval, not human subjects research determination | Melissa Tully with Nisha Patel | 3 to 6 weeks | **Day one, in parallel with everything** |
| P4 | Capture sessions, six subjects per day, two days covers priorities one to six | Melissa Tully | 2 days plus scheduling | After P2 and P3 |
| P5 | Post production per accepted take | Contract or in house | 1 hour per take | After P4 |
| P6 | Annotation, automated by the needle reader, reviewed by hand | Automated plus review | 1 hour per case | After P4 |
| P7 | Ground truth, three independent raters, disagreement beyond 4 millimetres rejects rather than averages | Melissa Tully plus two clinical raters | 20 minutes per rater per case | After P6 |
| P8 | Acceptance and packaging with the capture protocol block | Melissa Tully | 30 minutes per case | After P7 |

**Recruitment priority, and what each unlocks.**

| Priority | Condition | Unlocks | Difficulty |
| --- | --- | --- | --- |
| 1 | Atrial fibrillation, rate controlled | D7, E3, and three activities. **The highest value single recording in the programme.** | Moderate. Common in community volunteers over seventy. |
| 2 | Auscultatory gap | D4, and the trap that teaches why underinflation matters | **Hard. Cannot be recruited by diagnosis; must be found by screening candidates.** Start earliest. |
| 3 | Hypotension, orthostatic | E5 | Moderate |
| 4 | Phase four muffling | D5 | Moderate; pregnancy adds consent complexity |
| 5, 6 | Large arm; wide pulse pressure | Case variety and Domain B reinforcement | Easy |
| 7 | Paediatric | Paediatric variation | **Hardest, deliberately last, deliberately out of release scope.** A separate mini programme. |

**The recruitment insight that shortens the schedule:** these do not have to be hospital patients. Community volunteers with a known diagnosis are far easier to recruit, far easier to consent, and produce identical recordings. A senior centre, a cardiac rehabilitation programme or a church group is a completely different undertaking from a hospital ward, and it removes an entire layer of institutional gatekeeping.

**Exit gate, milestone M8:** priorities one to four accepted, unlocking D4, D5, D7, E3 and E5, and with them the nine release 2 activities. This is the milestone that completes the product's central claim, which is why the media workstream starts on day one even though it delivers last.

---

## 9. What to do if milestone M1 fails

Written now, deliberately, because the moment to decide this is before the result arrives and disappointment is doing the reasoning.

| Outcome at M1 | Interpretation | Action |
| --- | --- | --- |
| **Within 2 mmHg on 95 percent of frames, all three gauges, all three lighting conditions** | Pass | Proceed as planned. Record the result and the confidence threshold in ADR-002. |
| **Meets target on two gauges, fails on a third** | The failing gauge is the problem, not the approach | Characterise why. If it is a low contrast dial face, that is a documented equipment requirement, not a software failure. Confirm which gauges partner institutions actually use, which is an open question already. |
| **Meets target in good light, fails in poor light** | An environmental requirement | Specify the lighting requirement, add a "lighting insufficient" state to the degraded modes, and test it in the real room before the pilot. |
| **Marginal everywhere: correct within 4 mmHg but not 2** | The closed loop is usable but the accuracy claim weakens | The tolerance is 4 millimetres and the estimator would be consuming most of the budget. Do not simply loosen the acceptance criterion. Investigate whether the error is systematic (correctable by calibration) or random (not). |
| **Fails outright** | The camera path does not work | **Ship paced shadowing as the product.** It is a complete, legitimate pacing and perception exercise, it satisfies a large part of Domain C and Domain D, and it is honestly labelled. The estimator still annotates the entire case library from the fixed, controlled rig footage, where conditions are far better than a classroom. The rig has still been validated. The scope statement changes and is stated plainly. |

**The reason this table exists:** the fallback is not a consolation prize invented after a failure. It is a designed product path that the architecture already supports, because the paced shadowing adapter implements the same port. Building that adapter costs one to two days in phase 3 and it is the cheapest insurance in the programme.

---

## 10. Staffing

| Role | Commitment | Owns |
| --- | --- | --- |
| **Software engineer** | Full time from week 1 | Needle estimator, core, scorer, engine, adapters, tools. The durable assets. |
| **Learning engineer** (Melissa Tully) | Substantial, alongside the chief executive role | Objectives, activities, rubrics, feedback text, expected response sets, case requirements, ground truth process, instructor pack |
| **Chief executive** (Melissa Tully) | Ongoing | Permissions, recruitment, site relationships, the pilot date |
| **Contract interface work** | Phase 4, roughly 15 to 30 days | Task 4.7, the activity screens. Above the port boundary, which is what makes it safe to hand over. |
| **Contract post production** | Phase P5, 1 hour per take | Optional. Can be in house. |
| **Three expert raters** | 20 minutes per rater per case | Ground truth. **Named and confirmed before capture sessions**, or cases cannot be accepted. |
| **Clinical adviser** (Nisha Patel) | Consulting | Cuff standard, scope of practice, partner institution questions |
| **Counsel** | Once, early | Consent form and media release naming commercial educational distribution |

**The load bearing observation:** Melissa Tully appears in three rows and is the owner of most of the open decisions in section 2. That is the real capacity constraint in this programme, more than engineering hours. The mitigations available are to close the decisions in a single concentrated week rather than piecemeal, and to delegate the permission and recruitment calendar to a named person as early as possible.

---

## 11. Totals and shape

| Phase | Engineer days | Elapsed weeks (one engineer) |
| --- | --- | --- |
| Phase 0, decisions and setup | 2 to 4 | 1 |
| Phase 1, needle estimator | 15 to 29 | 3 to 6 |
| Phase 2, core and case library | 27 to 40 | 5 to 8 |
| Phase 3, closed loop | 23 to 36 | 5 to 7 |
| Phase 4, curriculum | 48 to 78 | 10 to 16, less with contract help |
| Phase 5, pilot readiness | 15 to 23 across both roles | 3 to 5 |
| **Total to milestone M7, release 1 pilot ready** | **130 to 210 engineer days** | **27 to 43 weeks with one engineer; roughly 20 to 30 with contract help in phase 4** |
| Media workstream to milestone M8 | approximately 90 hours of effort | Runs in parallel throughout. Bound by permissions and recruitment, not effort. |

**How to read these totals honestly.** The wide range is real and most of it lives in two places: how the needle estimator performs against real gauges, and how much of the 52 activity build is assembly versus bespoke work. Both narrow substantially after phase 1 and after the first ten activity screens respectively. **Re-estimate at the end of phase 1 and at the end of the first two weeks of phase 4**, and treat the first estimate as a plan rather than a promise.

**On the multiplier for a first time build.** If the engineer is learning this class of system as they go, phases 1 and 3 are where the multiplier bites hardest, because real time perception and audio scheduling have failure modes that are unfamiliar until you have met them. Phases 2 and 4 are much closer to ordinary software work. Plan for it rather than being surprised by it.

---

## 12. The first ten working days, concretely

For a start that produces something verifiable rather than a fortnight of setup.

| Day | Do this | Done when |
| --- | --- | --- |
| 1 | Book the decision session with everyone needed for section 2. Start the site permission conversation. Order the reference pressure sensor and the mount. | The permission conversation has begun and the hardware is ordered. **These have lead times and nothing else does.** |
| 2 | Repository, directory structure, one language toolchain, test runner, one passing test in the core. | The core's test suite runs in about a second. |
| 3 | The dependency boundary check. Write a deliberate violation, watch the build fail, delete it. Continuous integration running the core tests and the boundary check. | A commit that imports a browser library into the core fails the build automatically. |
| 4 | The configuration file with every parameter from INSTR-MBPT-001 section 9, schema validated, refusing to load when invalid, with the cuff standard left explicitly unset. | An invalid configuration refuses to load rather than defaulting. |
| 5 | Architecture decision records ADR-001, ADR-003, ADR-004, ADR-005. Half a day of writing that prevents a fortnight of re-argument. | Four records, one page each, in the repository. |
| 6 to 7 | Assemble the reference capture setup: camera on a fixed mount, exposure and focus and white balance locked manually, inline pressure sensor logging, electronic slate. | A recording exists with a gauge video, a synchronised reference pressure log, and a visible slate. |
| 8 | Record the validation corpus: three gauges, three lighting conditions, several deflations each. Colleagues only. | Corpus recorded and organised by gauge and lighting condition. |
| 9 to 10 | Build the needle laboratory harness. It should load a video and a reference log, align on the slate, and produce an error report from a deliberately naive estimator. | **A number exists.** The estimator is bad, and you know exactly how bad, and by what distribution. |

**Why day ten's outcome is the right first target.** By day ten there is no product, no screen and no learner experience. There is a measured error distribution against a real gauge. That single number is what decides whether the product has a closed loop, what sets the confidence threshold, what validates the capture rig, and what annotates every case in the library. Everything else in the programme is downstream of it, and every day it is deferred is a day of unresolved risk carried into work that assumes it away.

---

## 13. Standing tasks that are easy to drop

Each of these has no deadline, which is exactly why each one needs an owner and a cadence.

| Task | Cadence | Owner | Why it matters |
| --- | --- | --- | --- |
| Review `not_met` transcripts on expected response matches | Fortnightly | Learning engineer | A correct answer phrased outside the accepted forms is currently marked wrong. This is the only mechanism that finds it. |
| Review feedback layer number guard discard rate | Monthly | Software engineer | A rising rate means the model phrasing guidance needs work. |
| Recalculate the Coverage sheet after every activity change | Every change | Learning engineer | Automated in continuous integration, but the workbook is the source and it must stay current. |
| Re-run the needle laboratory against the fixed corpus after every estimator change | Every change | Software engineer | Prevents a quiet accuracy regression. |
| Re-estimate the plan at the end of phase 1 and two weeks into phase 4 | Twice | Both | The two moments where the wide ranges collapse. |
| Update the open decisions list as decisions close | Continuous | Both | An open decisions list that goes stale is worse than none, because it stops being read. |

---

## 14. What would change this plan most

Ranked by impact, so that attention goes to the right place.

1. **The release 1 surface decision.** If glasses are in release 1, phases 3, 4 and 5 change substantially, the spatial layer becomes release 1 scope, the session flow in the Crosswalk becomes the real one, and the total grows by a large and currently unestimated amount. This is the highest priority decision in the programme and it is why it sits at the top of phase 0.
2. **The milestone M1 result.** Section 9. It determines whether the product has a closed loop or ships as a paced shadowing trainer.
3. **The pilot date.** It converts this plan from a shape into a schedule and it determines whether contract help in phase 4 is optional or essential.
4. **The permission timeline.** If the not human subjects research determination takes months rather than weeks, the second release moves and the media workstream needs a different site. Conflating production with evaluation research is what makes this look like a six month problem when the production half of it is not.
5. **Whether contract help is available for phase 4.** It is the largest single block in the plan and the safest to hand over, because it sits above the port boundary.

---

*End of document.*
