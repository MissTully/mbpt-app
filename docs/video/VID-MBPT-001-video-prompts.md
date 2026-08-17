# VID-MBPT-001 — Video prompts and production briefs

**Status:** draft for review · **Owner:** learning engineer · **Companion data:** `content/instruction/videos-v1.json`

Twenty films the instructional content calls for. Each one is registered in
`content/instruction/videos-v1.json` and referenced by at least one lesson
page, so the application already shows the learner what is coming and says
plainly that it has not been shot yet. When a film exists, set its `status`
to `available` and its `src` to the media path; the card becomes a player and
nothing else changes.

---

## How to read a brief

Each brief has the same six parts.

| Part | What it is for |
| --- | --- |
| **Purpose** | The one thing a learner can do afterward that they could not do before. If a cut does not serve this, it goes. |
| **Appears in** | The lesson pages that reference the video, so a re-shoot has a known blast radius. |
| **Narration** | The voice-over, written to the same eighth-grade standard as the lessons. It is the script, not a summary of one. |
| **Shot list** | What the camera does, in order, with timings. |
| **Generation prompt** | A single paragraph for a text-to-video model, for the films where synthesis is honest. |
| **Accuracy gate** | What a clinical reviewer signs off before the film is cut into the course. |

### Three rules that apply to every film

**1. Korotkoff sounds are never synthesised.** Any audio a learner is asked to
identify, mark, or score against comes from a real measurement, recorded on
real equipment. A generated approximation of a phase-one tap teaches an ear
the wrong target, and this course's whole claim is that it tells learners the
truth about their ears. Briefs that need real sound say so under **Accuracy
gate**, and their generation prompt is marked *live action only*.

**2. Nothing shows a technique the course marks wrong.** Not even briefly,
not even as a joke, unless it is labelled on screen as the error being
taught. Learners copy what they see far more reliably than what they are
told.

**3. Real people, filmed with consent, or nobody at all.** Where a brief
shows an arm, a face, or a room, it is filmed with written consent and no
identifiable resident. Generated footage is used for the abstract topic films
and never presented as a recording of a real patient.

### House style

- 1080×1920 vertical, because release 1 is phone-only. Any horizontal insert is
  letterboxed with the dial centred, never cropped so the needle leaves frame.
- Calm, quiet rooms. No music under anything a learner is asked to listen to.
- Voice: warm, unhurried, second person. "You" and "your hands", never "the
  student" or "one should".
- On-screen text is short and large: numbers, one label at a time, high
  contrast in both light and dark.
- Every film opens on the thing itself — a dial, a cuff, a hand — not on a
  title card. Titles are burned into the first three seconds over the image.
- Captions are mandatory and burned in, since the app is used with earbuds in
  noisy places, and by learners who are deaf or hard of hearing.

---

## V-01 — Why the manual reading still wins

**Kind:** topic · **Length:** 90s · **Appears in:** L1.1

**Purpose.** The learner can say what a machine gets wrong and why the cuff in
their hands is the check the care team trusts.

**Narration.**
> Automatic machines are fast, and most of the time they are close enough. But
> they are fooled by movement. They are fooled by an uneven heartbeat. And they
> drift as they age, quietly, with nobody noticing. When a machine's number does
> not match the person in front of you, someone has to settle it. That someone is
> you, with a cuff, a stethoscope, and a steady hand. This is why the manual
> method is still the standard every other method is measured against. It is not
> nostalgia. It is that your ears do not drift.

**Shot list.**
1. 0–10s — Close on an automatic monitor cycling, error code appearing.
2. 10–30s — Same arm, aneroid gauge and stethoscope, calm hands working.
3. 30–55s — Split screen: machine number and manual number, 18 mmHg apart.
4. 55–75s — Nursing assistant writing in a chart; nurse reading it.
5. 75–90s — Hold on the aneroid dial at rest, needle on zero.

**Generation prompt.** *A quiet clinical room in soft daylight. Slow, steady
handheld camera, shallow depth of field. Close-up of a modern automatic blood
pressure monitor on a rolling stand as its cuff inflates and its screen shows
an error; cut to a pair of calm hands holding an aneroid blood pressure gauge
and squeezing a rubber bulb, the white dial face and black needle filling the
frame; the needle falls smoothly. Muted teal and warm grey palette, gentle
overhead light, no faces visible, no on-screen text, documentary realism,
vertical 9:16, 1080×1920.*

**Accuracy gate.** The two numbers shown in the split screen must come from a
real paired measurement, not invented for the shot. Equipment must be in
date and visibly clean.

---

## V-02 — Know your kit, and zero the gauge

**Kind:** demonstration · **Length:** 120s · **Appears in:** L0.1

**Purpose.** The learner can name every part of the set and perform a zero
check before use.

**Narration.**
> Lay it all out before you touch a resident. The cuff, and inside it the
> bladder — the balloon that does the squeezing. The tubing. The bulb, and the
> valve on top of it, the small screw that lets the air back out. The gauge,
> with a needle and a dial marked every two millimetres. And the stethoscope:
> earpieces, tubing, and the flat side you press against the skin.
> Now prove the gauge works. Let all the air out. Lay the cuff flat. Look
> straight at the dial, not from the side. The needle should sit inside the zero
> mark. If it does not, that gauge is wrong at every number, all day, in every
> chart. Set it aside and tell someone.

**Shot list.**
1. 0–15s — Overhead, full kit laid on a clean surface; each part slides in as
   it is named, with a burned-in label.
2. 15–45s — Macro on the bladder inside an opened cuff, then the valve turning.
3. 45–70s — The stethoscope: earpieces angled forward, diaphragm tapped once.
4. 70–100s — The zero check, in real time, eye-level and square to the dial.
5. 100–120s — A gauge sitting 4 mmHg off zero, then set aside deliberately.

**Generation prompt.** *Overhead flat-lay on a pale clinical surface: an
aneroid blood pressure cuff unrolled, black rubber bulb with brass valve,
coiled tubing, and a stethoscope arranged neatly. Very slow push-in. Soft,
even, shadowless light. Then a macro shot, straight on, of a round white
aneroid gauge face with black numerals and a thin black needle resting exactly
at zero, shallow depth of field, no hands in frame. Clean documentary
product-photography style, cool neutral colour, vertical 9:16, 1080×1920.*

**Accuracy gate.** Labels must match the glossary headwords exactly. The
off-zero gauge must genuinely be off zero, filmed square-on, not faked in
post.

---

## V-03 — Find the brachial artery

**Kind:** demonstration · **Length:** 75s · **Appears in:** L2.4

**Purpose.** The learner can locate the brachial pulse on arms that do not
all feel the same.

**Narration.**
> Turn the palm up. The artery you want runs along the inner side of the elbow,
> closer to the body than the middle of the crease. Two fingertips, gentle
> pressure, and wait. Do not press hard — hard pressure flattens the very thing
> you are hunting for. Move slowly toward the body until you feel it tap back.
> On some arms it is obvious in a second. On others you will wait through three
> or four beats before you are sure. That waiting is not a sign that you are bad
> at this. It is the job.

**Shot list.**
1. 0–20s — Macro, arm one: fingertips finding the pulse, pulse overlay dot.
2. 20–40s — Arm two, larger and softer: slower search, same technique.
3. 40–60s — Arm three, thin and older: faint pulse, patient search.
4. 60–75s — Freeze on the correct spot with a small marker graphic; the cuff's
   artery marker drops into alignment with it.

**Generation prompt.** *Live action only. Three real arms of different size,
age and skin tone; a generated arm cannot be checked against anatomy and this
film is anatomy.*

**Accuracy gate.** A clinician confirms the marked spot on each of the three
arms. Fingertips, never a thumb. No pulse point mislabelled.

---

## V-04 — Set up the person, not just the cuff

**Kind:** demonstration · **Length:** 150s · **Appears in:** L1.3

**Purpose.** The learner can greet, identify, screen, position and rest a
person before any cuff goes on.

**Narration.**
> Knock. Say who you are and what you are here to do. Check two things that say
> this is the right person — their name, and their date of birth. Then ask the
> four questions: coffee, cigarettes, exercise, and the bathroom. Any of them can
> lift a reading for half an hour, so you need to know before you start, not
> after.
> Now the position. Back against the chair. Feet flat, legs uncrossed. The arm
> supported at the height of the heart, palm up. Sleeve all the way off, not
> rolled — a rolled sleeve is a second cuff you did not mean to apply. Five quiet
> minutes, and no talking from either of you once you begin. Use those five
> minutes. Check your gauge. Measure the arm. Pick your cuff. Nobody has to
> stand there watching a clock.

**Shot list.**
1. 0–20s — Doorway: knock, greeting, introduction.
2. 20–40s — Identity check, wristband and spoken confirmation.
3. 40–60s — The four questions, natural pace.
4. 60–100s — Positioning, one element at a time, each with a burned-in label.
5. 100–130s — The rest period used productively: gauge checked, arm measured.
6. 130–150s — Wide shot of the finished setup, held still.

**Generation prompt.** *Live action only. This film is a person being treated
with respect; synthesis of a resident is both unconvincing and the wrong
thing to model.*

**Accuracy gate.** Heart level verified against the mid-sternum on camera.
The rolled-sleeve error must never appear except as a labelled counter-example.

---

## V-05 — Arms you must not use

**Kind:** topic · **Length:** 90s · **Appears in:** L1.2

**Purpose.** The learner can screen both limbs and knows to escalate when
both are ruled out.

**Narration.**
> Before the cuff touches skin, look at both arms. A dialysis fistula — never.
> Squeezing it can destroy the access that keeps that person alive. An IV line
> — use the other arm. A cuff over an infusion can stop it or push fluid into
> the tissue. Surgery on that side with lymph nodes removed, an injury, a burn,
> a wound, a cast, heavy swelling, a known clot, a limb that cannot be supported
> — all reasons to choose the other side.
> And if both sides are ruled out? Then this is no longer your decision alone.
> Stop. Tell the nurse what you found on each arm and ask what they want you to
> do. A missing reading with a clear reason is safe. A harmful one is not.

**Shot list.**
1. 0–10s — Two arms side by side, calm inspection.
2. 10–60s — Six short inserts, one per condition, each with a burned-in name
   and a red "not this arm" mark.
3. 60–80s — Both arms marked; the assistant steps back and picks up the phone.
4. 80–90s — Text card: *Both arms ruled out is a reason to ask, not to improvise.*

**Generation prompt.** *Clinical still-life inserts on a neutral background:
close-up of a forearm with a soft dressing; a hand with an intravenous
cannula secured under clear tape; an arm with visible swelling. Even, soft
clinical lighting, shallow depth of field, muted colour, no faces, slow
static shots, documentary realism, vertical 9:16, 1080×1920. Do not depict a
blood pressure cuff being applied to any of these limbs.*

**Accuracy gate.** A clinician confirms each depicted condition is
recognisable and correctly named. The fistula insert must not be generated —
use consented footage or a clinical illustration credited on screen.

---

## V-06 — Measure the arm, then pick the cuff

**Kind:** demonstration · **Length:** 120s · **Appears in:** L2.1

**Purpose.** The learner can measure mid-upper-arm circumference correctly
and turn it into a cuff choice.

**Narration.**
> Bare the whole upper arm and let it hang relaxed. Find the point of the
> shoulder. Find the tip of the elbow. Halfway between them is where the cuff
> will sit, so that is where you measure. Tape around the arm, level all the way
> round, snug but not denting the skin. Read the number and say it out loud.
> Thirty-four centimetres. Now it is not a guess any more — it is a fact, and
> the chart tells you which cuff it points to.

**Shot list.**
1. 0–20s — Landmarks: shoulder point and elbow tip marked.
2. 20–40s — The midpoint found and marked.
3. 40–70s — Tape wrapped, level, read on camera in one continuous shot.
4. 70–95s — The number spoken; the size chart appears; a row highlights.
5. 95–120s — The chosen cuff lifted from three laid out side by side.

**Generation prompt.** *Live action only. A tape measure's tension against
real skin is the entire teaching point and cannot be faked.*

**Accuracy gate.** Tape level in every frame. The measurement read aloud must
match the chart row highlighted on screen.

---

## V-07 — Wrong cuff, wrong number

**Kind:** topic · **Length:** 90s · **Appears in:** L2.3

**Purpose.** The learner can state the direction and rough size of each
sizing error, having seen it happen on one arm.

**Narration.**
> One arm. Three cuffs. Watch what happens.
> Too small, and you have to pump harder to close the artery. That extra
> pressure shows on the dial, and the number comes out high.
> The right cuff. This is the true reading.
> Too large, and the artery closes too easily. The number comes out low.
> Same arm. Same person. Same minute. Three different answers, and only one of
> them is real. This is why you measure.

**Shot list.**
1. 0–15s — Three cuffs laid out; one arm, marked and unchanged.
2. 15–40s — Undersized measurement, result held on screen.
3. 40–60s — Correct measurement, result held.
4. 60–80s — Oversized measurement, result held.
5. 80–90s — All three numbers on screen together, the true one ringed.

**Generation prompt.** *Live action only. The three readings must be real
paired measurements taken minutes apart on the same consented arm; inventing
them would make the film a claim rather than a demonstration.*

**Accuracy gate.** Readings recorded by a licensed nurse present at filming,
with all three values, the cuff sizes and the order logged. If the sizing
error happens not to shift the number that day, the film reports what
actually happened — it is not re-shot until it agrees with the textbook.

---

## V-08 — Wrap it right

**Kind:** demonstration · **Length:** 100s · **Appears in:** L2.4

**Purpose.** The learner can place a cuff the same way every time and test it.

**Narration.**
> Artery marker over the artery you just found. Bottom edge about an inch above
> the elbow crease, so the cuff is not sitting on top of your stethoscope.
> Wrap it snug and even — no twist, no bunching, no gap that grows as you pump.
> Then test it. One fingertip should slide under the edge, and no more. Loose
> reads high. Too tight hurts, and it is already squeezing before you have
> started.

**Shot list.**
1. 0–20s — Artery marker aligned, macro.
2. 20–40s — The inch of clearance measured on camera against the crease.
3. 40–70s — The wrap itself, one continuous take, no cuts.
4. 70–90s — The one-fingertip test, then a deliberately loose cuff labelled
   *too loose* with three fingers sliding under.
5. 90–100s — The finished wrap, held.

**Generation prompt.** *Macro live action preferred. If a generated insert is
used for the alignment graphic only: a close-up of a grey blood pressure cuff
being wrapped around a cylindrical practice arm, with a printed artery index
arrow visible on the cuff aligning to a drawn line, soft even studio light,
neutral background, no human skin, vertical 9:16, 1080×1920.*

**Accuracy gate.** The loose-cuff shot carries its label for its entire
duration. Clearance above the crease is verified on camera, not asserted.

---

## V-09 — Feel first, then pump

**Kind:** demonstration · **Length:** 110s · **Appears in:** L3.1

**Purpose.** The learner can take a palpated estimate and use it to choose an
inflation target.

**Narration.**
> Fingers on the wrist pulse. Pump steadily, and keep feeling. There — the pulse
> is gone. Look at the dial: one hundred and thirty. That is your estimate of the
> top number, and you got it without hearing a thing.
> Now let all the air out and wait half a minute. The arm needs it.
> This time, pump to about thirty above what you felt. One sixty. You are now
> safely above every sound this person is going to make, which means you cannot
> start listening in the middle of them and record a number that is forty points
> too low.

**Shot list.**
1. 0–25s — Fingers on radial pulse, dial in the same frame.
2. 25–45s — The moment the pulse disappears; dial number held on screen.
3. 45–60s — Full deflation and the wait, shown in real time.
4. 60–90s — Re-inflation to the target; arithmetic on screen: 130 + 30 = 160.
5. 90–110s — Hold at target, ready to listen.

**Generation prompt.** *Live action only. The disappearance of a real pulse
under a real cuff is the event being taught.*

**Accuracy gate.** Dial and fingers in the same frame at the moment of
disappearance, so the number is not asserted in an edit. The 30 mmHg margin
must match `content/config/config-v1.json`'s `inflation_margin_mmhg`.

---

## V-10 — The valve hand

**Kind:** demonstration · **Length:** 120s · **Appears in:** L3.2

**Purpose.** The learner can see what a correct deflation rate looks like and
copy it on their own equipment.

**Narration.**
> This is the hardest thing your hands will learn. Watch the needle, not the
> hand. Two to three millimetres of mercury per second — about one small mark on
> the dial each second. Slow. Steady. Boring, on purpose.
> Now watch this. Too fast. The needle drops, the marks blur, and the sounds
> arrive at pressures you cannot pin down. And too slow: the arm aches, blood
> pools, and the bottom number starts to drift away from you.
> Back to steady. Count with it. One mark. Two. Three. All the way to zero at
> the same speed, even after you have heard everything you needed.

**Shot list.**
1. 0–45s — Locked-off macro, dial and thumb in frame, correct rate, with a
   live mmHg-per-second counter burned in.
2. 45–65s — Too fast, labelled, counter in red.
3. 65–85s — Too slow, labelled.
4. 85–120s — Correct rate again, full descent to zero, uncut.

**Generation prompt.** *Live action only, locked-off tripod. A synthesised
needle does not fall at a physically real rate, and the rate is the lesson.*

**Accuracy gate.** The burned-in counter is computed from the recorded gauge,
not animated to taste. The correct-rate band shown must equal
`deflation_rate_band_mmhg_per_s` in the shipped configuration — if that
configuration changes, this film is re-cut.

---

## V-11 — What the sounds really sound like

**Kind:** topic · **Length:** 150s · **Appears in:** L3.3

**Purpose.** The learner can tell the five phases apart before being asked to
mark them at speed.

**Narration.**
> Headphones on. We are going to slow this down.
> Silence first. The cuff is above the top number and the artery is held shut,
> so there is nothing to hear.
> Phase one. That first clear tap. The pressure right there is the top number.
> Phase two: softer, swishing. Nothing to report here. Hold your rate.
> Phase three: crisper again. Still nothing to report.
> Phase four: muffled, fading. The bottom number is close. Do not slow down to
> wait for it.
> Phase five: silence. The pressure where the sound vanished is the bottom
> number. Keep letting the air out, smoothly, all the way down.

**Shot list.**
1. 0–15s — Waveform and dial together; silence above systolic.
2. 15–120s — Each phase in turn: audio isolated, played at normal speed then
   repeated slowed, with the dial pressure held on screen.
3. 120–150s — The whole descent again at real speed, unlabelled, as a test of
   what the ear just learned.

**Generation prompt.** *Live action and real recorded audio only. This is the
film the whole course rests on: every sound in it comes from a real
auscultated measurement, recorded through a clinical stethoscope, and no
sound in it is synthesised, cleaned up, or reconstructed.*

**Accuracy gate.** Phase boundaries labelled by two clinicians independently;
disagreements resolved before the labels are burned in, or the segment is
cut. Slowed audio is pitch-preserved so timbre is not distorted.

---

## V-12 — Mark the first sound, mark the last

**Kind:** walkthrough · **Length:** 120s · **Appears in:** L3.4

**Purpose.** The learner understands how their marks are scored and what a
late mark looks like.

**Narration.**
> Here is one measurement, scored three ways.
> This mark lands on the first tap. The app resolves it to the pressure the dial
> was showing at that instant, and it matches the case's true value.
> This one lands late — the tap had already gone by. Six millimetres of mercury,
> from a moment of hesitation.
> And this one lands early, on a sound that was not there. Marking before you
> are sure is not caution. It is a guess with a timestamp.
> Your marks are never compared against your own gauge. They are compared
> against what was actually happening in the recording.

**Shot list.**
1. 0–20s — App screen, a case playing, a mark made.
2. 20–60s — The same instant replayed with the true value revealed.
3. 60–100s — The late mark and the early mark, each replayed against truth.
4. 100–120s — The feedback screen, showing what it does and does not tell you.

**Generation prompt.** *Screen recording only. Capture from the built
application against case C000-SYNTH so the film can be re-shot whenever the
feedback screen changes.*

**Accuracy gate.** The film must not show the app revealing a correct value
in response to a learner's wrong one — that is invariant I-6, and a film that
depicts it teaches learners to expect something the product will never do.

---

## V-13 — Read the dial, do not round it

**Kind:** topic · **Length:** 80s · **Appears in:** L3.5

**Purpose.** The learner reads to the nearest 2 mmHg and can spot their own
rounding habit.

**Narration.**
> The dial is marked every two millimetres. So readings are taken to the nearest
> mark: 124, 126, 128. Not 125 — that mark does not exist. Not 130, because 130
> was easier to say.
> And stand square to it. From an angle, the needle appears to sit somewhere it
> does not, and you will never feel yourself doing it.
> Watch what happens over a year. Round every reading to the nearest ten, and
> the small real changes — the ones that show whether a medicine is working —
> disappear into the rounding.

**Shot list.**
1. 0–25s — Macro on the dial between graduations; the nearest mark highlighted.
2. 25–45s — The same needle filmed square-on and from 30 degrees off, side by
   side, showing the apparent shift.
3. 45–80s — A year of charted readings: honest values, then the same year
   rounded, with the trend flattening out.

**Generation prompt.** *Extreme macro of a white aneroid pressure gauge face,
black graduation marks every two units, a thin black needle resting between
two marks, shot dead-on with a long lens, shallow depth of field, soft
diffused light, no hands, no text, static shot, vertical 9:16, 1080×1920.*

**Accuracy gate.** The parallax comparison is filmed, not simulated. The
charted trend uses plausible synthetic data labelled on screen as an example.

---

## V-14 — The silent gap, and other surprises

**Kind:** topic · **Length:** 110s · **Appears in:** L3.6

**Purpose.** The learner recognises the four common surprises and knows the
response to each.

**Narration.**
> Sometimes the sounds do not behave.
> They start, then vanish, then come back. That silence is an auscultatory gap.
> If you had begun listening inside it, your first sound would have been forty
> points too low. The first sound is the top number — even when a gap follows it.
> Sometimes they are faint from the beginning. Check your placement, quiet the
> room, and try again rather than straining.
> Sometimes they never stop at all, right down to zero. That happens, and you
> record the muffling point and say that you did.
> And sometimes the beats are uneven. Take the reading, take a second one, write
> down what you heard, and tell the nurse.

**Shot list.**
1. 0–35s — Gap case: waveform with the silent stretch marked against the dial.
2. 35–60s — Faint sounds, with the corrective actions shown being taken.
3. 60–85s — Sounds continuing to zero; the phase-four decision.
4. 85–110s — Irregular rhythm, waveform beats visibly uneven.

**Generation prompt.** *Live action and real recorded audio only, and this
film waits for the clinical case library — a synthesised auscultatory gap is
a lie a learner would carry to the bedside.*

**Accuracy gate.** Each of the four cases is a real recording with the
finding confirmed by two clinicians. Until such recordings exist, this film
stays `planned` and the lesson teaches it in words, which the app already
says out loud.

---

## V-15 — What the numbers mean

**Kind:** topic · **Length:** 120s · **Appears in:** L4.1

**Purpose.** The learner can classify an adult reading and knows children are
judged differently.

**Narration.**
> For adults, read the two numbers separately and take the worse of the two.
> Under 120 and under 80 is normal. 120 to 129 with a bottom number under 80 is
> elevated. 130 to 139, or a bottom number of 80 to 89, is stage one. 140 or
> more, or 90 or more, is stage two. 180 or more, or 120 or more, is a crisis —
> and that one does not wait.
> Children are different. There is no single normal number, because it depends
> on age, sex and height. Your job with a child is the same as with an adult:
> the right cuff, careful technique, an accurate number, and a fast report.
> Notice what is not on this list. Deciding what it means. That belongs to the
> nurse and the provider. Your part is to make sure the number they are deciding
> from is true.

**Shot list.**
1. 0–50s — The adult table built one row at a time, with an example reading
   landing in each band.
2. 50–65s — 135/95 shown resolving to stage two by the bottom number.
3. 65–95s — A child's cuff beside an adult's; percentile idea shown simply.
4. 95–120s — Split card: *You measure and report* / *They interpret and act*.

**Generation prompt.** *Motion-graphics only, built from the shipped tables
in `content/instruction/pages-v1.json` so the film and the lesson cannot
drift apart. No footage of children.*

**Accuracy gate.** Every value matches the lesson tables exactly. The child
segment must not imply that a nursing assistant interprets a percentile.

---

## V-16 — Say it out loud: reporting to the nurse

**Kind:** walkthrough · **Length:** 90s · **Appears in:** L4.2

**Purpose.** The learner can give a report a nurse can act on immediately.

**Narration.**
> A good report has a shape.
> "Mrs Alvarez, room 12. Blood pressure 184 over 118, right arm, seated, large
> adult cuff. She says she feels fine. I repeated it on the left arm and got 180
> over 116. I have stayed with her."
> Who, where, the numbers, how you took them, what you saw, what you already
> did. Then stop, and wait.
> Here is the same reading reported badly: "Her pressure's really high." True,
> and the nurse now has to ask five questions before they can move.

**Shot list.**
1. 0–35s — The good report, delivered at natural pace, nurse responding.
2. 35–55s — The same report broken into its six parts on screen.
3. 55–75s — The vague version, and the questions it forces.
4. 75–90s — The six-part shape held as a card.

**Generation prompt.** *Live action only, with actors and a fictional
resident name. No real resident, no real room number, no identifiable
setting.*

**Accuracy gate.** The assistant must not name a diagnosis, suggest a
medicine, or make a treatment recommendation anywhere in the film.

---

## V-17 — When not to trust your own reading

**Kind:** topic · **Length:** 100s · **Appears in:** L4.3

**Purpose.** The learner treats a surprising number as a question and repeats
it correctly.

**Narration.**
> Four moments should stop you.
> When the number is far from what you felt at the wrist. When it is far from
> this person's usual. When you know the technique was imperfect — they talked,
> the arm slipped, the needle ran away from you. And when you were simply not
> sure what you heard.
> Repeating is not an admission that you failed. It is what experienced staff do
> all day. But repeat it properly: all the air out, wait a full minute or two,
> fix whatever went wrong the first time, and record both readings. Not just the
> one you liked better.

**Shot list.**
1. 0–40s — The four triggers, one insert each.
2. 40–75s — A correct repeat in real time, including the wait.
3. 75–90s — Both readings entered in the chart, side by side.
4. 90–100s — Text card: *A surprising number is a question, not an answer.*

**Generation prompt.** *Live action preferred. A generated insert may be used
for the chart entry only: a close-up of a printed vital signs chart on a
clipboard with two blood pressure entries written in blue ballpoint minutes
apart, soft daylight, shallow depth of field, no names visible, static
overhead shot, vertical 9:16, 1080×1920.*

**Accuracy gate.** The wait between readings is shown in real time or with an
honest on-screen clock, never cut away from. The chart must show both values.

---

## V-18 — Build the paper towel arm

**Kind:** walkthrough · **Length:** 100s · **Appears in:** L0.1

**Purpose.** The learner can build a free practice arm and drill on it the
same night.

**Narration.**
> No partner tonight? Build an arm.
> Take a roll of paper towels and unroll it until what is left measures about
> thirteen inches around — an average adult arm. Tape the end down.
> Draw one straight line along the length of it. That line is the brachial
> artery, and from now on your cuff's artery marker lines up with it every single
> time.
> Wedge it somewhere it cannot roll. Now wrap, close the valve, and pump to 160 —
> the target you would use on an arm whose pulse faded at 130. Let it fall while
> you watch the needle. Your ears train on the recordings. Your hands train here.
> What the roll cannot teach you is people — a real pulse, a real arm, a person
> in a chair. Bring those to a partner. Bring everything else to the roll.

**Shot list.**
1. 0–25s — The roll unwrapped and measured to 13 inches, tape applied.
2. 25–40s — The artery line drawn in one stroke.
3. 40–55s — The roll wedged at a table edge.
4. 55–85s — A full wrap-inflate-deflate cycle on the roll, real time, the
   needle falling at 2 to 3 mmHg per second.
5. 85–100s — The roll beside a real arm, honest about the difference.

**Generation prompt.** *A roll of white paper towels standing upright on a
plain wooden table, a hand drawing a single straight vertical line down it
with a black marker, then a grey blood pressure cuff being wrapped around the
roll with its index arrow aligned to the drawn line. Warm domestic evening
light from a window, simple home kitchen background softly out of focus,
handheld but steady, vertical 9:16, 1080×1920.*

**Accuracy gate.** The stated circumference is measured on camera. The film
must repeat the limitation — the roll teaches hands, not people.

---

## V-19 — The whole skill, start to finish

**Kind:** demonstration · **Length:** 240s · **Appears in:** L1.1

**Purpose.** The learner sees the complete procedure once, uncut, in the
order they will be assessed on.

**Narration.** Sparse. The film is the teacher; the voice names each step as
it begins and then gets out of the way. Fourteen labels, matching the
fourteen steps in lesson L1.1 word for word.

**Shot list.** One continuous take from a fixed wide position with a second
locked-off macro on the dial, cut between only where the wide shot cannot
show what the hands are doing. Nothing is edited out — not the hand washing,
not the five minutes of rest (compressed with an honest on-screen clock and a
visible label saying so), not the cleaning afterwards.

**Generation prompt.** *Live action only, single take. The value of this film
is that it is not edited; a synthesised version would be exactly the thing it
exists to disprove.*

**Accuracy gate.** Reviewed step by step against lesson L1.1. If the film and
the lesson disagree, the lesson is checked first — and whichever is wrong is
fixed before either ships.

---

## V-20 — Read your own error pattern

**Kind:** walkthrough · **Length:** 110s · **Appears in:** L5.1

**Purpose.** The learner can read their own history, name the error, and pick
the drill that matches it.

**Narration.**
> Here is a real practice history. Eight attempts.
> Look at the rate first. Steady, inside the band, every time. So the hands are
> fine. That rules out half of everything.
> Now the marks. Systolic late, six to eight points, in six of the eight. That is
> not a bad day. That is a habit, and habits have causes.
> A steady hand and a late ear means the drill is sound-only marking, starting
> with slower cases. Not more full measurements. Not concentrating harder.
> The right drill, chosen for the right reason. That is the instructor's job,
> and this is the lesson where it becomes yours.

**Shot list.**
1. 0–25s — The report screen, eight attempts.
2. 25–50s — Rate column examined, ruled in.
3. 50–80s — Marking column examined; the pattern circled.
4. 80–110s — The drill chosen, with the reasoning stated aloud.

**Generation prompt.** *Screen recording only, from the built application
using a seeded practice history so the film can be regenerated whenever the
report screen changes.*

**Accuracy gate.** The history shown is generated from real attempt records
in the golden set, not drawn by hand to make a tidy story.

---

## Production order

If only part of this can be made, make it in this order. It is ordered by how
much a learner loses without it, not by how easy each one is.

| Order | Video | Why first |
| --- | --- | --- |
| 1 | V-11 | Nothing else teaches the ear, and it gates the whole of module 3. |
| 2 | V-10 | The single hardest motor skill, and the one words describe worst. |
| 3 | V-19 | The map. Everything else is a detail of this. |
| 4 | V-02, V-18 | Both unblock a learner practising alone on day one. |
| 5 | V-09, V-08, V-03 | The hand skills, in the order they are performed. |
| 6 | V-06, V-07 | Cuff choice — the most common source of a wrong number. |
| 7 | V-04, V-05 | Preparation and screening; cheap to shoot, high safety value. |
| 8 | V-12, V-20 | Screen recordings, made last so they match the shipped app. |
| 9 | V-01, V-13, V-15, V-16, V-17 | Topic films; strong, but the lessons carry them meanwhile. |
| 10 | V-14 | Waits for the release-2 clinical recordings by necessity. |

## When a film is delivered

1. Put the media in the case or asset location it belongs to.
2. Set `status` to `available` and `src` to its path in
   `content/instruction/videos-v1.json`.
3. Run `npm test`. The pack validation will reject a video the register knows
   nothing about, and the reading-level check will notice if the accompanying
   copy drifted while you were in there.
4. Re-read the lesson page around it. A film usually makes two paragraphs
   redundant, and leaving them in is how a lesson gets long.
