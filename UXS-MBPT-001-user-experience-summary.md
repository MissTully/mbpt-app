# Manual Blood Pressure Trainer: User Experience Summary

**Document identifier:** UXS-MBPT-001
**Version:** 0.1 draft, for review
**Date:** August 9, 2026
**Author:** drafted for Melissa Tully, Founder, Chief Executive Officer and Learning Engineer
**Derived from:** PPP-MBPT-004 version 4.0, INSTR-MBPT-001 version 1.0, and the Encountive Manual Blood Pressure Trainer User Experience and Curriculum Crosswalk workbook
**Companion documents:** SDD-MBPT-001 (software design), ARC-MBPT-001 (architecture), BLD-MBPT-001 (build plan)

---

## 0. What this document is for

The Crosswalk workbook already holds the activity level user experience: for every one of the 61 activities, what the learner sees, what they do, how they input it, how the system responds, what is captured and when the activity ends. That is the detail and it is not repeated here.

**This document is the layer above it.** It states who the users are, the principles that govern every screen, the small number of interaction patterns that all 61 activities are built from, and the shape of the key screens. Its purpose is that a person building a screen, or reviewing one, can tell whether the screen is right without re-deriving the reasoning each time.

**Written to the phone as the release 1 surface,** following the provisional reading in INSTR-MBPT-001 section 11.1. Where a design would differ substantially on glasses, that is marked. This is the largest open question in the programme and it affects this document more than any other.

---

## 1. Who uses this, and in what conditions

Design that ignores the conditions produces a product that demonstrates beautifully and fails in a skills laboratory.

| User | What they are doing | Conditions that constrain the design |
| --- | --- | --- |
| **The learner at the station** | Performing a real measurement on a partner with real equipment | **Both hands are occupied**: bulb, cuff, stethoscope. Earphones in. Eyes on a dial, not on a screen. Standing or leaning. Under observation. Possibly nervous. |
| **The learner as partner** | Presenting the arm, holding the device, observing | Has a defined role and is not idle. Is also learning, by observation, and the design should not waste that. |
| **The learners practising away from the station** | Practising on their own phones simultaneously | Three other people are talking nearby. The room is not quiet. |
| **The instructor** | Supervising twenty learners, running a rotation, reading reports afterwards | Cannot watch everyone. Needs to know at a glance who is stuck. Has not read the manual. |
| **The programme director** | Asking how a competency is evidenced | Will not use the product. Will read one report and form a judgement about whether it is credible. |

**The four environmental facts that shape everything.**

1. **Hands are full.** This is not a preference, it is invariant I-7. Input during a live measurement is voice or gesture only.
2. **Eyes are on the dial.** The screen is peripheral during the descent. Anything important shown on screen during a measurement will be missed.
3. **The room is noisy.** Voice input has to work with three other people talking two metres away, and audio feedback competes with room noise.
4. **The network is unreliable.** Everything must work offline.

---

## 2. Design principles

Each of these descends from an invariant or from the learning architecture. They are not style preferences and they are not negotiable at screen level.

**P1. The equipment is the interface. The screen is the second interface.**
The learner's attention belongs on the cuff, the dial and the sounds. The product's job is to be the instructor standing beside them, not a screen competing for their eyes. Design for peripheral vision during a measurement and for full attention only before and after it.

**P2. Feedback timing is a property of the activity, not a choice the screen makes.**
Practice gives immediate feedback. Assess holds everything until the attempt ends. Invariant I-5. Mixing them teaches learners to fish for hints rather than to commit to a judgement, which is precisely the habit that fails at a bedside. The screen has no mechanism to break this rule; the activity runner enforces it.

**P3. Never resolve a discrepancy by revealing the answer.**
When the learner's value and the system's value disagree, the response is to ask for another attempt. Invariant I-6. Revealing the correct value removes the objective being assessed. This is the principle most often violated by well meaning interface design, because showing the answer feels helpful.

**P4. Scaffolding is visible, deliberate and labelled.**
The learner should always know which rung of the ladder they are on and that only the top rung counts. A learner who does not understand that their guided success is not yet competence will be surprised at the assessment, and surprise at an assessment is a design failure.

**P5. The system speaks rarely, and never during the descent.**
Deflating at two to three millimetres of mercury per second while listening for a sound that lasts a fraction of a second is a demanding perceptual task. Interrupting it with speech destroys it. Peripheral, silent indication only, until the attempt ends.

**P6. Degraded states are quiet and honest.**
The dial is lost, the confidence is low, the fallback engaged. The learner is told what is true, in the smallest way that suffices, and the record says what happened. A silently wrong pressure is worse than a visible gap; invariant I-9.

**P7. Every number the learner sees comes from the scorer.**
No screen invents a number, rounds one differently, or restates one in different units. Invariant I-3 and authoring rule R-6. A learner who sees 4.8 in one place and 5 in another loses trust in both.

**P8. The partner is a designed role, not a passive arm.**
Holding the device, presenting the arm, giving a brief history, watching the replay. Observation is itself a documented learning mechanism, and the second learner should get most of the benefit for free.

**P9. Nothing claims more than it can evidence.**
Hand hygiene is self report and is labelled as such. Stethoscope placement is partial assessment and the product says so. Invariant I-12. This is a user experience requirement because it appears on screen, in words, to the learner and to the instructor.

---

## 3. The four activity types as interaction patterns

Every one of the 61 activities is one of four patterns. This is what keeps a curriculum of this size coherent, and it is why one activity runner serves all of them.

### Present, 7 activities

**Function.** Teaches. No performance demanded, no scoring.

**Shape.** Content, one idea at a time, with the rationale available but not forced. Advance under the learner's control. No timer, no score, no failure state.

**Design caution.** Present is deliberately rare, seven of 61. If a proposed design adds Present activities, the first question is whether the content could instead be discovered inside a Practice activity, because the product's advantage is performance with feedback, not exposition. A learner reading a screen is a learner not measuring a blood pressure.

### Practice, 27 activities

**Function.** Rehearses with feedback. Scaffolds visible. Does not count toward mastery.

**Shape.** Scaffold state is shown at the top and named plainly. Feedback is immediate and specific. Repetition is expected and encouraged; the exit condition is usually a count of attempts rather than a standard of performance, because the point is rehearsal.

**The rule that gives Practice its character:** feedback names the specific fault and its consequence, not merely that the answer was wrong. "Your deflation reached 4.8 millimetres of mercury per second at two points" teaches. "Incorrect" does not. This is the learning engineer's feedback template library doing its work.

### Assess, 24 activities

**Function.** Scores. Only unaided scaffold states count toward mastery.

**Shape.** Nothing rendered that could assist. No overlays, no readouts, no pacer. **Complete silence from the system during the performance.** All feedback held until the attempt ends, then delivered at once.

**The moment that matters:** the transition into an Assess activity should feel different. The learner should know, without being told twice, that this one counts and that nothing is coming to help. A visibly emptier screen does this better than a warning banner.

### Reflect, 3 activities

**Function.** Reviews across attempts. Never pass or fail. Owns the trend measures.

**Shape.** Presentational. The learner's own data, shown honestly, with a prompt to interpret it and state a strategy. The system records the learner's interpretation and does not override it.

**The window rule, which is a user experience requirement as much as a computational one:** a trend measure below its window size has no meaning and must not be drawn as though it did. With nine attempts against a ten attempt window, the screen says "three more attempts and your rounding pattern becomes readable", not a chart of nine points. Showing a meaningless chart teaches the learner to read noise as signal, which is the opposite of objective F1.

---

## 4. The scaffold ladder, as an interface system

Four states, one visual language, used identically everywhere. A learner should be able to tell which rung they are on from across a room.

| State | What is present on screen | What the learner should feel |
| --- | --- | --- |
| **Guided** | The aid is live during the performance: the overlay, the numeric readout, the rate pacer moving. | Supported. The connection between what my hand does and what the number does is visible. |
| **Confirmatory** | Nothing during the performance. The aid appears the instant the learner commits. | Tested, then shown. I had to decide first. |
| **Sound only** | The gauge is occluded, deliberately and visibly. There is nothing to look at. | Uncomfortable, and correctly so. I cannot substitute looking for listening. |
| **Unaided** | Nothing at any point. Real equipment, real partner, no assistance. | This is the real thing. |

**Design requirements that follow.**

- The current rung is stated at the top of every performance screen, in words, always. Not an icon.
- Whether this attempt counts toward mastery is stated alongside it. A learner should never have to work this out.
- **Sound only occlusion must be genuinely opaque, not merely dimmed.** A partially visible needle is worse than either extreme: the learner squints at it, splits attention, and neither channel gets trained. The Crosswalk specifies dimming plus an opaque patch; the opaque patch is the part that matters.
- Sound only belongs to auscultation and nowhere else. Do not apply it to activities where the visual channel is the thing being trained.

---

## 5. The core screen: a live measurement

This is the screen the product lives or dies on. It is used, in different scaffold states, by roughly a third of all activities.

### 5.1 Before the descent

```
┌──────────────────────────────────────────────┐
│  Scaffold: GUIDED     ·   Practice, not scored│   ← always present, always words
├──────────────────────────────────────────────┤
│                                              │
│         [ live camera view of the dial ]     │   ← the learner is looking at the
│                                              │      real dial; this is confirmation
│         ┌────────────────────────┐           │      that the software can see it,
│         │   dial framed, locked  │           │      not a substitute for looking
│         └────────────────────────┘           │
│                                              │
│              ●  dial tracking                │   ← one small steady indicator
│                                              │
├──────────────────────────────────────────────┤
│  Target: inflate to at least  178 mmHg       │   ← Guided only. Absent when Unaided.
│  ▁▁▁▁▁▁▁▁▁▁▁▁▁▓▓▓▓▓▓▓▓▓▓                     │
├──────────────────────────────────────────────┤
│  ⌁ wired earphones detected                  │   ← or a Bluetooth warning
└──────────────────────────────────────────────┘
```

### 5.2 During the descent

The screen goes as quiet as the scaffold state permits. In an unaided attempt it shows almost nothing at all.

```
┌──────────────────────────────────────────────┐
│  Scaffold: UNAIDED    ·   Counts toward mastery│
├──────────────────────────────────────────────┤
│                                              │
│         [ live camera view of the dial ]     │
│                                              │
│                                              │
│              ●                               │   ← tracking indicator only
│                                              │
│                                              │
│                                              │
│        say "mark" at first and last sound    │   ← static. Does not change. Does not
│                                              │      react. Reacting is feedback.
└──────────────────────────────────────────────┘
```

**Everything absent from this screen is absent deliberately.** No pressure number, because the learner reads the real dial. No rate indication, because that is guidance. No confirmation that a mark registered, because a confirmation is feedback and this is an Assess activity. The mark is confirmed after the attempt ends, along with everything else.

**In a Guided practice activity the same screen carries the rate pacer**: a target marker descending at 2.5 millimetres of mercury per second beside the real needle, with a live deviation indicator and no words. Silent, continuous, peripheral. This is the single most valuable guided aid in the product, because deflation rate is the most common technique fault by a wide margin.

### 5.3 Degraded states, as the learner experiences them

| What happened | What the learner sees | What they hear |
| --- | --- | --- |
| Dial lost under half a second | Nothing changes | Sounds continue |
| Dial lost up to three seconds | The tracking indicator changes state, peripherally | Sounds stop. No speech. |
| Dial lost beyond three seconds | The attempt pauses. A short, plain instruction: bring the dial into view. | Silence |
| Low confidence while the dial is visible | Treated exactly as lost. The learner is not told the difference, because the difference does not help them. | Silence |
| No camera available | A labelled paced shadowing session: "the pace is set for you; mark what you hear". **Framed as an exercise, not as a failure.** | The engine drives from an authored ramp |
| Bluetooth output detected | A warning before the attempt, with the reason in one line: the sound will lag the needle. | |

**The design rule underneath this table:** the system's response to its own trouble scales with how much the learner needs to do about it. Under half a second, they need to do nothing, so they are told nothing. Beyond three seconds, they need to move the phone, so they are told to move the phone. Nothing in between earns speech.

---

## 6. Setup and calibration

The fifteen seconds that decide whether the rest works.

| Step | Learner action | Why it is here |
| --- | --- | --- |
| **Gauge zero check** | Hold the deflated cuff steady, confirm the needle rests at zero | Doubles as the first calibration point and as an equipment safety habit the learner should carry to a bedside. Activity `A-0.1.1` already requires it, so it costs no extra time. |
| **Scale mark** | Touch the printed 200 mark on the dial, on screen | Gives the second calibration point without requiring the learner to produce a known pressure. Works on any gauge, with no device database. |
| **Framing** | Bring the dial roughly parallel to the phone and fill the frame | The one piece of framing guidance the learner needs. Show it as a shape to match, not as instructions to read. |
| **Audio check** | Confirm a calibration tone and a sample Korotkoff beat are audible | Activity `A-0.1.2`. Also where the Bluetooth warning fires. |

**Design requirement:** calibration must be recoverable mid session without losing the attempt in progress, because a phone gets knocked. Losing a whole attempt to a bumped tripod is the kind of small failure that makes a pilot feel broken.

---

## 7. Feedback, after the attempt

The moment the product either earns its keep or reveals itself as a checklist with a camera.

### 7.1 The shape of a feedback screen

```
┌──────────────────────────────────────────────┐
│  Attempt complete                            │
├──────────────────────────────────────────────┤
│  Systolic   you 138   ·   reference 134      │  ← the comparison, plainly
│  Diastolic  you  86   ·   reference  86      │
├──────────────────────────────────────────────┤
│  ✓ Diastolic within 4 mmHg                   │
│  ✕ Systolic 4 mmHg high                      │
│                                              │
│    Your deflation reached 4.8 mmHg per       │  ← the finding, tied to an objective,
│    second at two points during the descent.  │     with the causal link stated
│    Sounds heard during a fast descent are    │
│    read late, which pushes systolic high.    │
├──────────────────────────────────────────────┤
│  This attempt: UNAIDED · counts toward mastery│
│  Streak: 1 of 3                              │
├──────────────────────────────────────────────┤
│  [ try again ]        [ see what happened ]  │
└──────────────────────────────────────────────┘
```

Four things about this screen are load bearing.

**The finding names the step, not just the outcome.** The learner needs to know which part of their own procedure produced the error. That is objective F2 and it is the whole argument for a tutoring system rather than a checklist.

**The numbers all came from the scorer.** Principle P7. The feedback layer's template received `measured` and `threshold` as variables; nothing on this screen was rounded, restated or invented, and if a model rephrased the sentence, the number guard verified every number in it.

**The mastery streak is visible and honest.** "1 of 3" tells the learner exactly where they stand. Hiding the streak makes mastery feel arbitrary; showing it makes the standard concrete.

**"Try again" is offered, "show me the answer" is not.** Principle P3 and invariant I-6.

### 7.2 The replay

For attempt review, the learner sees their own attempt reconstructed: the pressure curve over time with the rate band drawn on it, their marks against the reference, and where excursions occurred. On a phone this is a chart. On glasses it becomes the spatial replay described in the Crosswalk, anchored in place and walkable, which is a genuinely better experience and is one of the strongest arguments for the glasses surface.

The replay is presentation only. It never grades. Its Assess counterpart, "attribute the error", is a separate activity where the discrepancy is highlighted but unexplained and the learner names the step that produced it.

### 7.3 What feedback must never do

- Reveal a value the learner is being assessed on producing.
- Show a number the scorer did not supply.
- Give a trend interpretation below the trend window.
- Speak during a descent.
- Congratulate a scaffolded success as though it were competence.

---

## 8. The session, as experienced

A forty five minute rotation, four learners, one station, per PPP-MBPT-004 section 3.6.

| Minutes | The learner at the station | The other three | The partner |
| --- | --- | --- | --- |
| 0 to 5 | Orientation, equipment check, gauge zero | The same, on their own phones | Observes |
| 5 to 20 | Deflation rate control and marking practice | Rotate through the same | Holds the device, presents the arm |
| 20 to 33 | Scored checkpoint: measure, select, apply, place, measure | Continue practice | Presents the arm and a brief history |
| 33 to 40 | Interpretation and action, spoken | Continue practice | Observes |
| 40 to 45 | Debrief, error attribution, next practice chosen | Handover | Rotates |

**Two consequences that are not obvious from a feature list, and both are design requirements.**

**The partner is an observer with a defined role.** Holding the device, presenting the arm, giving a brief history, watching the debrief. The partner watching a replay is a second learner getting most of the benefit for free, and the design should support that explicitly rather than treating the partner as scenery.

**Handover must complete in under sixty seconds or the rotation collapses.** That makes handover a designed step, not an interruption. Concretely: the next learner must be able to reach their own first activity within a minute, without a login flow, without re-downloading a case, and without re-reading an orientation.

**Open question carried from INSTR-MBPT-001 section 11.1.** The Crosswalk's session flow is built around one shared glasses unit rotating across four learners, which is a materially different rotation from the one above. Both cannot be the release 1 session. This document describes the phone version, following the provisional reading. **This needs deciding before any instructor material is written**, because the session plan is the first thing an instructor reads and the last thing anyone wants to rewrite.

---

## 9. The instructor experience

Pilots fail on instructor confusion far more often than on software defects. PPP-MBPT-004 makes this point in the context of the Class D onboarding videos, and it applies just as strongly to the interface.

| Need | What the product gives them |
| --- | --- |
| **Start a session without reading a manual** | One screen: how many learners, which activities, go. Defaults that work. |
| **See who is stuck, without walking over** | A simple live view: who is on which activity, who has failed the same objective more than twice. Not a dashboard of metrics. One glance, one judgement. |
| **Understand a learner's result well enough to talk to them about it** | The same findings the learner sees, in the same words, plus the trend measures the learner cannot see in a single attempt. |
| **Evidence a competency to a programme director** | A per objective view: which objectives are met, under which scaffold state, across how many attempts, with the specific evidence. **A7 excluded from competency reporting, D1 labelled partial.** Invariant I-12. |
| **Know what to do when something breaks** | A short, blunt troubleshooting page reachable in one tap: dial not tracking, no sound, Bluetooth, microphone permission. |

**The single most important instructor screen is the competency evidence view,** because it is the one a programme director will be shown. It should be legible to somebody who has never used the product and who is sceptical of software claims. If it reads as a marketing dashboard it will be dismissed; if it reads as a record of what was observed and under what conditions, it will be believed.

---

## 10. Accessibility and inclusion

The audit happens before the pilot. These are the points where this product has specific obligations beyond the general ones.

| Area | Requirement | Note |
| --- | --- | --- |
| **Hearing** | Auscultation is a hearing task and the objectives cannot be met without it. This is a genuine limit and it must be stated honestly rather than papered over. | What the product *can* do: support the learner's own assistive devices, avoid mandating a particular earphone, and ensure nothing else in the interface depends on hearing. Whether a non auditory pathway exists at all is a curriculum question, not a software one. |
| **Vision** | The needle reading task is visual. Everything *around* it need not be: text size, contrast, and screen reader compatibility apply to all non measurement screens. | The paced shadowing mode is inherently more accessible than the camera mode and this is worth noting. |
| **Colour** | No status conveyed by colour alone. The rate band, the tracking indicator and the pass or fail marks all carry a shape or a word as well. | A green band that is only green fails for a colour blind learner in a room with poor lighting. |
| **Motor** | Voice and gesture during measurement, which is invariant I-7 and happens also to be an accessibility benefit. Outside measurement, generous touch targets, no fine dragging as the only path to a task. | The sequence building activity uses dragging; it needs a non drag alternative. |
| **Language** | Expected response sets currently assume one language and one set of surface forms. A learner answering correctly in different phrasing will be marked wrong. | Named honestly in the perception capability report. Reviewing `not_met` transcripts is a standing task, not an aspiration. |
| **Noise** | Voice input must work with three people talking nearby. | Test in a real room before the pilot, not in a quiet office. |

---

## 11. Words: the content style rules for anything the learner reads

The feedback text library is the learning engineer's deliverable. These rules govern it and every other string in the product.

- **Name the step, then the consequence.** "Your cuff's lower edge sat 5 centimetres above the fossa, which reads systolic high." Not "cuff placement incorrect".
- **Never use a number the scorer did not supply.** Authoring rule R-6.
- **Never claim a competency the evidence does not support.** Hand hygiene is "recorded, self reported". Stethoscope placement is "position tracked; skin contact not assessed". Invariant I-12.
- **Never say the product replaces supervised practice.** Invariant I-11. The defensible claim is that learners arrive at live practice having already achieved procedural fluency and having already heard variation they would otherwise never encounter.
- **No abbreviations without first use in full.** Consistent with the project's own naming rules.
- **Plain, short, and directed at the learner in the second person.** A learner reading feedback under observation, slightly embarrassed, needs to understand it in one pass.
- **Vary nothing that carries meaning.** The same finding produces the same wording every time. Feedback that is phrased differently each time reads as unreliable, however elegant the variation.

---

## 12. Open user experience questions

| Question | Why it matters here | Owner |
| --- | --- | --- |
| **Release 1 surface: phone only, or phone plus glasses** | It changes the session flow, roughly half the activities, and the entire debrief experience. This document assumes phone. It is the largest open item in the programme. INSTR-MBPT-001 section 11.1. | Melissa Tully |
| **What happens when microphone permission is refused** | Invariant I-7 makes voice non optional during a live measurement, so a refusal blocks marking activities entirely. There is currently no designed experience for this. SDD-MBPT-001 `[DECISION-7]`. | Melissa Tully |
| **Offline handling of spoken judgement responses** | If transcription needs a network, some Domain E activities behave differently offline, and the learner has to be told something true about that. SDD-MBPT-001 `[DECISION-3]`. | Melissa Tully with the software engineer |
| **Do partner programmes supply devices, or is bring your own device assumed** | Determines whether handover means passing a device or each learner using their own, which changes the sixty second handover requirement substantially. INSTR-MBPT-001 section 11.6. | Nisha Patel |
| **Scope of practice wording for escalation, per cohort** | The escalation feedback text differs between a patient care technician and a practical nursing student. One rubric cannot serve both without a scope parameter. INSTR-MBPT-001 section 11.6. | Nisha Patel |
| **How the release 1 scope limitation is shown to a learner** | Release 1 does not cover pathology recognition. A learner should not discover that by wondering where the abnormal cases are. | Melissa Tully |

---

*End of document.*
