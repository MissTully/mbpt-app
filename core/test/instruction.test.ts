import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildInstructionPack,
  parseTermMarkup,
  stripTermMarkup,
  termsReferencedIn,
} from "../src/index.js";

// The instruction pack's promises: a highlighted word always has a
// definition behind it, a video block always names a film someone has
// briefed, and the shipped content satisfies both.

function glossary(overrides: Record<string, unknown> = {}) {
  return {
    version: "test",
    terms: [
      {
        term_id: "systolic",
        term: "Systolic",
        say_it: "sis-TOL-ik",
        plain: "The top number.",
        also_called: null,
        matters: null,
      },
    ],
    ...overrides,
  };
}

function videos(overrides: Record<string, unknown> = {}) {
  return {
    version: "test",
    videos: [
      {
        video_id: "V-01",
        title: "A film",
        kind: "topic",
        summary: "What it teaches.",
        seconds: 60,
        status: "planned",
        src: null,
        prompt_ref: "docs/video/plan.md#v-01",
      },
    ],
    ...overrides,
  };
}

function pages(blocks: unknown[]) {
  return {
    version: "test",
    source: "test",
    pages: [
      {
        lesson: "L1.1",
        headline: "A headline.",
        read_minutes: 3,
        you_will: ["Do the thing"],
        blocks,
      },
    ],
  };
}

const prose = (text: string) => ({ kind: "prose", text, activities: null });

describe("glossary term markup", () => {
  it("splits text into plain runs and terms", () => {
    expect(parseTermMarkup("Mark [[systolic]] first.")).toEqual([
      { kind: "text", text: "Mark " },
      { kind: "term", term_id: "systolic", text: "systolic" },
      { kind: "text", text: " first." },
    ]);
  });

  it("uses the display text when the sentence needs different wording", () => {
    expect(parseTermMarkup("[[systolic|the top number]] rises.")[0]).toEqual({
      kind: "term",
      term_id: "systolic",
      text: "the top number",
    });
  });

  it("returns text with no markup unchanged, as a single run", () => {
    expect(parseTermMarkup("Nothing marked here.")).toEqual([
      { kind: "text", text: "Nothing marked here." },
    ]);
  });

  it("strips markup back to the sentence a learner reads", () => {
    expect(stripTermMarkup("Mark [[systolic|the top number]] first.")).toBe(
      "Mark the top number first.",
    );
  });

  it("finds terms however deeply they are nested", () => {
    expect(termsReferencedIn({ a: [{ b: "see [[systolic]]" }] })).toEqual(["systolic"]);
  });
});

describe("instruction pack validation", () => {
  it("accepts a consistent pack", () => {
    const pack = buildInstructionPack({
      glossary: glossary(),
      videos: videos(),
      pages: pages([prose("Mark [[systolic]] first.")]),
    });
    expect(pack.pageOf("L1.1")?.blocks).toHaveLength(1);
    expect(pack.termOf("systolic")?.term).toBe("Systolic");
    expect(pack.videoOf("V-01")?.seconds).toBe(60);
  });

  it("refuses a term with no glossary entry rather than rendering a dead word", () => {
    expect(() =>
      buildInstructionPack({
        glossary: glossary(),
        videos: videos(),
        pages: pages([prose("Mark [[systolic]] and [[diastolic]].")]),
      }),
    ).toThrow(/diastolic/);
  });

  it("refuses a key-term chip with no glossary entry", () => {
    expect(() =>
      buildInstructionPack({
        glossary: glossary(),
        videos: videos(),
        pages: pages([
          prose("Mark [[systolic]] first."),
          { kind: "keyterms", title: null, terms: ["korotkoff_sounds"], activities: null },
        ]),
      }),
    ).toThrow(/korotkoff_sounds/);
  });

  it("refuses a video block naming a film that is not in the register", () => {
    expect(() =>
      buildInstructionPack({
        glossary: glossary(),
        videos: videos(),
        pages: pages([prose("Mark [[systolic]] first."), { kind: "video", video_id: "V-99", note: null, activities: null }]),
      }),
    ).toThrow(/V-99/);
  });

  it("refuses a knowledge check with no correct answer", () => {
    expect(() =>
      buildInstructionPack({
        glossary: glossary(),
        videos: videos(),
        pages: pages([
          prose("Mark [[systolic]] first."),
          {
            kind: "check",
            question: "Which?",
            options: [
              { text: "This", correct: false },
              { text: "That", correct: false },
            ],
            explain: "Neither.",
            activities: null,
          },
        ]),
      }),
    ).toThrow(/no correct answer/);
  });

  it("refuses a glossary term no lesson ever uses", () => {
    expect(() =>
      buildInstructionPack({
        glossary: glossary({
          terms: [
            { term_id: "systolic", term: "Systolic", say_it: null, plain: "Top.", also_called: null, matters: null },
            { term_id: "unused", term: "Unused", say_it: null, plain: "Nobody says this.", also_called: null, matters: null },
          ],
        }),
        videos: videos(),
        pages: pages([prose("Mark [[systolic]] first.")]),
      }),
    ).toThrow(/unused/);
  });

  it("refuses an unknown block kind rather than skipping it silently", () => {
    expect(() =>
      buildInstructionPack({
        glossary: glossary(),
        videos: videos(),
        pages: pages([prose("Mark [[systolic]] first."), { kind: "carousel", items: [] }]),
      }),
    ).toThrow();
  });
});

describe("the shipped instruction pack", () => {
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const pack = buildInstructionPack({
    glossary: read("../content/instruction/glossary-v1.json"),
    videos: read("../content/instruction/videos-v1.json"),
    pages: read("../content/instruction/pages-v1.json"),
  });

  it("has a page for every lesson in the activity catalog", () => {
    const activities = read("../content/activities.json").activities as { lesson: string }[];
    const lessons = [...new Set(activities.map((a) => a.lesson))];
    expect(lessons.filter((lesson) => pack.pageOf(lesson) === null)).toEqual([]);
  });

  it("tags teaching blocks only for activities that exist", () => {
    const activities = read("../content/activities.json").activities as { activity_id: string }[];
    const ids = new Set(activities.map((a) => a.activity_id));
    const unknown = pack.pages.flatMap((page) =>
      page.blocks.flatMap((block) => (block.activities ?? []).filter((id) => !ids.has(id))),
    );
    expect(unknown).toEqual([]);
  });

  it("uses every video it registers", () => {
    const used = new Set(
      pack.pages.flatMap((page) =>
        page.blocks.flatMap((block) => (block.kind === "video" ? [block.video_id] : [])),
      ),
    );
    expect(pack.videos.filter((video) => !used.has(video.video_id))).toEqual([]);
  });

  it("gives every knowledge check exactly one correct answer", () => {
    for (const page of pack.pages) {
      for (const block of page.blocks) {
        if (block.kind !== "check") continue;
        const correct = block.options.filter((option) => option.correct);
        expect({ lesson: page.lesson, correct: correct.length }).toEqual({
          lesson: page.lesson,
          correct: 1,
        });
      }
    }
  });
});
