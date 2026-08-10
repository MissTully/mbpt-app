# Manual Blood Pressure Trainer: document set index

**Date:** August 9, 2026
**Covers:** four new documents drafted from PPP-MBPT-004 version 4.0, INSTR-MBPT-001 version 1.0, and the Encountive Manual Blood Pressure Trainer User Experience and Curriculum Crosswalk workbook.

---

## The documents

| Identifier | Document | Answers |
| --- | --- | --- |
| **ARC-MBPT-001** | Architecture Design | What are the major parts, what may depend on what, what is each built with, and why was each alternative rejected |
| **SDD-MBPT-001** | Software Design Document | What exactly gets built, and what does each piece guarantee to the pieces around it |
| **UXS-MBPT-001** | User Experience Summary | Who uses it, under what conditions, and what principles govern every screen |
| **BLD-MBPT-001** | Build Plan | What happens in what order, by whom, how long, and what to do if the first gate fails |

## Reading order

**If you are joining the project:** ARC first for the shape, then UXS for the feel, then SDD for the detail, then BLD for the sequence.

**If you are about to write code:** BLD section 12, "the first ten working days", then SDD section 4, then ARC section 4 for the technology choices.

**If you are deciding whether to fund or staff this:** ARC sections 1 and 11, then BLD sections 11 and 14.

## Authority order

Extending the order set in INSTR-MBPT-001 section 0:

1. INSTR-MBPT-001, for process and for contracts between the two roles.
2. PPP-MBPT-004 version 4.0, for product scope, learning architecture and thresholds.
3. ARC-MBPT-001, for structure and technology.
4. SDD-MBPT-001, for component behaviour.
5. UXS-MBPT-001, for interaction principles.
6. The Crosswalk workbook, for activity level detail.

BLD-MBPT-001 is a plan, not an authority. It changes as facts arrive.

---

## What was assumed, and needs confirming before these documents are treated as settled

Following the rule in INSTR-MBPT-001 section 0, nothing ambiguous was silently resolved. Three assumptions were made to keep the documents usable, and each is marked in the body and listed with its consequence.

| Assumption | Where it appears | If it is wrong |
| --- | --- | --- |
| **Release 1 is phones. Glasses is a later layer.** Following the provisional reading in INSTR-MBPT-001 section 11.1. | Everywhere. It is the largest single assumption in the set. | The user experience summary's session flow is the wrong one, roughly half the release 1 activities have no described surface, the spatial layer moves into release 1 scope, and phases 3 to 5 of the build plan change substantially. |
| **One language across core, adapters, application and tools, with a pure dependency free core.** | ARC-MBPT-001 section 4.1 | Nothing structural. The port boundary is the load bearing decision; the language is a preference with reasons. |
| **A classical computer vision approach to needle reading, hand written before any library is added.** | ARC-MBPT-001 section 4.4, SDD-MBPT-001 section 4.1 | Milestone M1 answers this on evidence. The port boundary makes a swap contained. |

## New open decisions surfaced by this work

These are additional to the ones already in INSTR-MBPT-001 section 11, and each is raised rather than resolved.

| Tag | Decision | Owner |
| --- | --- | --- |
| `[DECISION-2]` | Do real aneroid dials hold a two point linear angle to pressure map across the full range? Answer from milestone M1 data. | Software engineer, from evidence |
| `[DECISION-3]` | Offline speech transcription. The product must work offline; common browser speech recognition does not, and may send audio off device. This is a privacy and a scope statement question, not only an engineering one. | Melissa Tully with the software engineer |
| `[DECISION-4]` | Attempt record additions needed for faithful re-scoring: `scorer_version`, `case_version`, `calibration`, `expected_response_set_versions`, `app_version`. | Both roles |
| `[DECISION-5]` | The terminal objective's mastery rule requires two body habitus categories, but no attempt record field currently carries the habitus category for activities where the arm is not measured. **Until this is closed, mastery of the terminal objective cannot be fully evaluated.** | Both roles |
| `[DECISION-6]` | Device support matrix. Depends on whether partner programmes supply devices or assume bring your own device. | Nisha Patel |
| `[DECISION-7]` | What happens when microphone permission is refused. Invariant I-7 makes voice non optional during a live measurement, so a refusal blocks marking activities entirely and there is currently no designed experience for it. | Melissa Tully |

---

*End of index.*
