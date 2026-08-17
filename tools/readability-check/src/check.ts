#!/usr/bin/env node
// The reading-level check. The instructional content is written for learners
// at an eighth-grade reading level, and a reading level is exactly the kind
// of promise that decays quietly: one careful rewrite adds a subordinate
// clause, then another, and a year later the lesson only reads well to the
// person who wrote it.
//
// So it is measured, and the build fails when it drifts.
//
// The measure is Flesch–Kincaid Grade Level, which is coarse — it counts
// syllables and sentence lengths, and knows nothing about whether a sentence
// makes sense. It is used here the way a smoke alarm is used: not as proof
// the writing is good, but as a loud complaint when it stops being plain.
//
// Medical words are the honest tension in this content. "Sphygmomanometer"
// is five syllables however plainly you write around it, and the glossary
// exists precisely so those words can appear and still be understood. The
// per-page limit is therefore set above the target average, and the average
// is what holds the line.

import { readFileSync } from "node:fs";
import { buildInstructionPack, stripTermMarkup, type InstructionPage } from "@mbpt/core";

/** The average the whole body of instruction must hold. */
const TARGET_MEAN_GRADE = 8.0;
/** No single page may exceed this, however many long clinical words it carries. */
const MAX_PAGE_GRADE = 9.5;

function read(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Syllable estimate for an English word. A heuristic, and the standard one:
 * count vowel groups, drop a silent trailing "e", never return zero. */
function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

interface Counts {
  sentences: number;
  words: number;
  syllables: number;
}

function count(text: string): Counts {
  // Sentence enders, with the abbreviations that appear in this content
  // protected so they do not read as full stops.
  const prose = stripTermMarkup(text).replace(/\b(?:e\.g|i\.e|Dr|Mr|Mrs|Ms|St|approx)\./g, (m) =>
    m.replace(".", " "),
  );
  const sentences = prose.split(/[.!?]+(?:\s|$)/).filter((s) => /[a-z]/i.test(s));
  const words = prose.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  return {
    sentences: Math.max(1, sentences.length),
    words: words.length,
    syllables: words.reduce((sum, w) => sum + syllables(w), 0),
  };
}

function grade(counts: Counts): number {
  if (counts.words === 0) return 0;
  return 0.39 * (counts.words / counts.sentences) + 11.8 * (counts.syllables / counts.words) - 15.59;
}

function add(a: Counts, b: Counts): Counts {
  return { sentences: a.sentences + b.sentences, words: a.words + b.words, syllables: a.syllables + b.syllables };
}

const EMPTY: Counts = { sentences: 0, words: 0, syllables: 0 };

/** The strings a learner actually reads as sentences. Table cells, headers
 * and key-term chips are labels, not prose, and scoring fragments as
 * sentences would make the number meaningless in both directions. */
function proseOf(page: InstructionPage): string[] {
  const out: string[] = [page.headline, ...page.you_will];
  for (const block of page.blocks) {
    switch (block.kind) {
      case "prose":
      case "heading":
        out.push(block.text);
        break;
      case "list":
        out.push(...block.items);
        break;
      case "steps":
        for (const item of block.items) {
          out.push(item.do);
          if (item.why !== null) out.push(item.why);
        }
        break;
      case "callout":
        out.push(block.text);
        break;
      case "check":
        out.push(block.question, ...block.options.map((o) => o.text), block.explain);
        break;
      case "practice":
        out.push(block.title, block.i_do, block.we_do, block.you_do, ...block.say_aloud);
        break;
      case "table":
        if (block.note !== null) out.push(block.note);
        if (block.caption !== null) out.push(block.caption);
        break;
      case "video":
        if (block.note !== null) out.push(block.note);
        break;
      case "keyterms":
        break;
    }
  }
  return out;
}

const pack = buildInstructionPack({
  glossary: read("content/instruction/glossary-v1.json"),
  videos: read("content/instruction/videos-v1.json"),
  pages: read("content/instruction/pages-v1.json"),
});

const failures: string[] = [];
let total = EMPTY;
const rows: { label: string; grade: number; words: number }[] = [];

for (const page of pack.pages) {
  const counts = proseOf(page).map(count).reduce(add, EMPTY);
  total = add(total, counts);
  const g = grade(counts);
  rows.push({ label: page.lesson, grade: g, words: counts.words });
  if (g > MAX_PAGE_GRADE) {
    failures.push(`${page.lesson}: grade ${g.toFixed(1)} exceeds the per-page limit of ${MAX_PAGE_GRADE}`);
  }
}

// The glossary is held to the same standard: a definition written above the
// reading level of the lesson that needed it has failed at its one job.
const glossaryCounts = pack.glossary
  .flatMap((entry) => [entry.plain, entry.matters ?? ""])
  .filter((s) => s !== "")
  .map(count)
  .reduce(add, EMPTY);
const glossaryGrade = grade(glossaryCounts);
rows.push({ label: "glossary", grade: glossaryGrade, words: glossaryCounts.words });
total = add(total, glossaryCounts);
if (glossaryGrade > MAX_PAGE_GRADE) {
  failures.push(`glossary: grade ${glossaryGrade.toFixed(1)} exceeds the per-page limit of ${MAX_PAGE_GRADE}`);
}

const meanGrade = grade(total);

rows.sort((a, b) => b.grade - a.grade);
console.log("Flesch–Kincaid grade level, hardest first:\n");
for (const row of rows) {
  const flag = row.grade > MAX_PAGE_GRADE ? "  ✗" : row.grade > TARGET_MEAN_GRADE ? "  ·" : "";
  console.log(`  ${row.label.padEnd(10)} ${row.grade.toFixed(1).padStart(5)}   ${String(row.words).padStart(5)} words${flag}`);
}
console.log(
  `\n  overall     ${meanGrade.toFixed(1).padStart(5)}   ${String(total.words).padStart(5)} words ` +
    `(${total.sentences} sentences, target ${TARGET_MEAN_GRADE.toFixed(1)})`,
);

if (meanGrade > TARGET_MEAN_GRADE) {
  failures.push(`overall grade ${meanGrade.toFixed(1)} exceeds the target of ${TARGET_MEAN_GRADE}`);
}

if (failures.length > 0) {
  console.error("\nReading level check failed:");
  for (const failure of failures) console.error(`  ${failure}`);
  console.error("\nShorten sentences before simplifying words: sentence length is the half of this");
  console.error("measure you control without losing the clinical vocabulary the glossary is there to carry.");
  process.exit(1);
}

console.log("\nReading level check passed.");
