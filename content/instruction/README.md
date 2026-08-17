# content/instruction

The teaching layer: what a learner reads, the glossary behind every
highlighted word, and the register of videos the lessons call for.

| File | What it holds |
| --- | --- |
| `glossary-v1.json` | Every medical word the lessons use, in plain language, with pronunciation, the other name it goes by, and why a nursing assistant cares. |
| `videos-v1.json` | The video register: identifier, title, length, status, and the brief each film is cut from. |
| `pages-v1.json` | One teaching page per lesson, built from typed blocks. |

Adapted from the *Manual Blood Pressure Workbook* (Encountive Clinical
Training Series). The three files are assembled and cross-checked as one pack
by `buildInstructionPack` in the core; the application refuses to start if
they disagree.

## Authoring rules

**Reading level is eighth grade, and it is measured.** `npm run readability`
computes Flesch–Kincaid grade level over every learner-facing sentence and
fails the build when the average drifts above the standard or any single page
runs far past it. Sentence length is the half of that measure you control
without giving up clinical vocabulary — shorten sentences before you start
simplifying words.

**Clinical words are welcome, but only in `[[markup]]`.** Write
`[[systolic]]`, or `[[systolic|the top number]]` when the sentence needs
different wording. The word renders highlighted and tappable, and its
definition opens in place. A term with no glossary entry throws at load —
there is no such thing as a highlighted word with nothing behind it. A
glossary entry no lesson uses throws too, so the glossary cannot silt up.

**One number per rule, and it is the one the app scores.** Deflation rate,
inflation margin and marking tolerance come from `content/config/`. The
lessons teach those values and no others: **2 to 3 mmHg per second**, and
**30 above the palpated estimate**. Where a written standard is looser — the
source workbook allows 2 to 4, and skills tests often use a fixed 180 mmHg —
the course does not teach the alternative alongside it. A learner practising
against two targets is practising against neither, and the tighter rule
satisfies the looser one anyway. If the configuration changes, search this
directory before shipping it.

**Knowledge checks teach; they never assess.** Nothing on a lesson page is
recorded, scored, or counted toward mastery. Only attempts are scored
(invariant I-5), and a lesson page is not an attempt. Every check needs
exactly one correct option and an explanation that says *why*, not just
*which*.

**Blocks may be tagged for an activity.** A block with `"activities":
["A-0.1.1"]` also appears inside that Present activity. Untagged blocks
belong to the lesson as a whole. An activity with no tagged blocks shows the
whole page rather than nothing — teaching is never withheld.

**Videos are named, not embedded.** A `video` block references a
`video_id` from the register. While a film's status is `planned`, the card
says so in words and the lesson still teaches the same thing in text. The
briefs live in `docs/video/VID-MBPT-001-video-prompts.md`.

## Changing this content

Add to the version, do not edit history in place: a learner who saw
`instruction-pages-v1` should be able to be shown what they read. Retired
versions are never deleted, for the same reason threshold configuration
versions are not.

## Changelog

### instruction-pages-v1, instruction-glossary-v1, instruction-videos-v1 — first authored

Twenty-two lesson pages, one per lesson in the activity catalog. Fifty-two
glossary terms. Twenty video briefs, all `planned`.

Two places where the source workbook is looser than what this course teaches.
The decision (2026-08-17) is that the course teaches one target in each case,
matching `content/config/config-v1.json`:

- **Deflation rate — 2 to 3 mmHg per second.** The workbook states 2 to 4.
  The course does not mention 2 to 4 anywhere: L3.2 teaches 2 to 3, the
  glossary defines it as 2 to 3, and the callout that used to reconcile the
  two now explains *why* 3 is the ceiling — an average pulse gives about one
  beat per second, so a faster fall moves several mmHg between the beats you
  are listening for. Practising to the tighter band satisfies the looser
  standard automatically.
- **Inflation — 30 above the palpated estimate.** The workbook, like most
  skills tests, uses a fixed 180 mmHg. The course teaches only the palpated
  target: L3.1's callout now says why a habit number is wrong in both
  directions, and the practice-arm drills pump to 160 (the target for a
  felt estimate of 130) rather than to 180, so no drill rehearses a number
  the course does not teach.

**Pediatric content is clinically reviewed (2026-08-17).** The screening
values in L4.1 follow the 2017 American Academy of Pediatrics guideline, and
the low-blood-pressure thresholds are checked against PALS. Lesson L4.1 names
both sources so a learner or an instructor can trace any number in the table.

The cuff sizing table is reproduced from the workbook. `cuff_bladder_fit_standard`
is still `null` in configuration (open decision, INSTR 11.2), so lesson L2.2
carries a scope callout telling learners to use their own program's chart
rather than implying this one is authoritative.
