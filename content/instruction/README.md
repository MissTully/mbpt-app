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

**A number that also lives in configuration is quoted, never restated as
law.** Deflation rate, inflation margin and marking tolerance come from
`content/config/`. Where a lesson names one, it says what the app measures
and, where they differ, what written standards say — the workbook's 2 to 4
mmHg per second beside the app's 2 to 3, for instance. If the configuration
changes, search this directory before shipping it.

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

Two places where the source workbook and the shipped configuration disagree,
and how each is handled in the copy:

- **Deflation rate.** The workbook states 2 to 4 mmHg per second; the app
  scores against 2 to 3. Lesson L3.2 teaches 2 to 3 as the target and names
  the wider written standard in a scope callout, so a learner meeting either
  number is not confused by the other.
- **Inflation level.** The workbook uses a fixed 180 mmHg, as skills tests
  do; the curriculum teaches 30 above a palpated estimate. Lesson L3.1
  teaches both and says plainly which belongs where.

The cuff sizing table is reproduced from the workbook. `cuff_bladder_fit_standard`
is still `null` in configuration (open decision, INSTR 11.2), so lesson L2.2
carries a scope callout telling learners to use their own program's chart
rather than implying this one is authoritative.
