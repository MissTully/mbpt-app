import { z } from "zod";

// The instruction pack: the teaching content a learner reads, the glossary
// that defines its medical words, and the register of videos the lessons
// call for.
//
// It is versioned data, not code (ARC-MBPT-001 section 4.8), assembled from
// three files under content/instruction/ and validated as one thing, because
// the three only mean something together: a lesson page may name a term or a
// video, and a page that names a term nobody defined is a broken promise to
// the learner, not a cosmetic defect. It refuses to load instead.
//
// Two authoring rules are enforced here rather than trusted:
//   1. Every [[term]] in every string resolves to a glossary entry.
//   2. Every video block names a video in the register.
// Reading level is the third rule and cannot be checked by a schema; it is
// checked by tools/readability-check and gated in the build.

/** Marks a glossary word inside learner text: `[[systolic]]`, or
 * `[[systolic|the top number]]` when the sentence needs different wording
 * than the entry's headword. */
const TERM_MARKUP = /\[\[([a-z0-9_]+)(?:\|([^\]]+))?\]\]/g;

export type TermSpan =
  | { kind: "text"; text: string }
  | { kind: "term"; term_id: string; text: string };

/** Split learner text into plain runs and glossary terms. Pure and total:
 * text with no markup returns a single run. The application renders terms as
 * tappable words; the readability tool renders them as their display text. */
export function parseTermMarkup(source: string): TermSpan[] {
  const spans: TermSpan[] = [];
  let cursor = 0;
  TERM_MARKUP.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TERM_MARKUP.exec(source)) !== null) {
    if (match.index > cursor) spans.push({ kind: "text", text: source.slice(cursor, match.index) });
    const term_id = match[1]!;
    spans.push({ kind: "term", term_id, text: match[2] ?? term_id.replace(/_/g, " ") });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) spans.push({ kind: "text", text: source.slice(cursor) });
  return spans;
}

/** The learner text with its markup removed — what the sentence actually
 * reads as. Used by the readability check and by anything that needs the
 * prose without the plumbing. */
export function stripTermMarkup(source: string): string {
  return parseTermMarkup(source)
    .map((span) => span.text)
    .join("");
}

/** Every glossary term named anywhere in a value, however deeply nested. */
export function termsReferencedIn(value: unknown): string[] {
  const found: string[] = [];
  const visit = (node: unknown): void => {
    if (typeof node === "string") {
      for (const span of parseTermMarkup(node)) {
        if (span.kind === "term") found.push(span.term_id);
      }
    } else if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === "object") Object.values(node).forEach(visit);
  };
  visit(value);
  return found;
}

// ---------------------------------------------------------------- glossary

export const GlossaryEntry = z
  .object({
    /** Stable identifier used by [[markup]]; lowercase with underscores. */
    term_id: z.string().regex(/^[a-z0-9_]+$/),
    /** The word as a learner meets it. */
    term: z.string().min(1),
    /** How to say it out loud, for words a learner has only ever read. */
    say_it: z.string().nullable(),
    /** The definition. Plain words, one or two short sentences. */
    plain: z.string().min(1),
    /** The clinical or textbook word, when the entry is the plain one (or
     * the other way round) — so both halves of the pair are learnable. */
    also_called: z.string().nullable(),
    /** Why a nursing assistant cares. Optional; used where it earns its place. */
    matters: z.string().nullable(),
  })
  .strict();
export type GlossaryEntry = z.infer<typeof GlossaryEntry>;

export const GlossaryFile = z
  .object({ version: z.string().min(1), terms: z.array(GlossaryEntry).min(1) })
  .strict();
export type GlossaryFile = z.infer<typeof GlossaryFile>;

// ------------------------------------------------------------------ videos

/** A video the curriculum asks for. `planned` means the prompt is written
 * and the film is not made: the application says so plainly rather than
 * showing a broken player. */
export const VideoStatus = z.enum(["planned", "available"]);
export type VideoStatus = z.infer<typeof VideoStatus>;

export const VideoEntry = z
  .object({
    video_id: z.string().regex(/^V-\d{2}$/),
    title: z.string().min(1),
    kind: z.enum(["topic", "demonstration", "walkthrough"]),
    /** What the learner will be able to do after watching. */
    summary: z.string().min(1),
    seconds: z.number().int().positive(),
    status: VideoStatus,
    /** Where the film is, once it exists. Null while planned. */
    src: z.string().nullable(),
    /** The production brief this video is cut from. */
    prompt_ref: z.string().min(1),
  })
  .strict();
export type VideoEntry = z.infer<typeof VideoEntry>;

export const VideoRegisterFile = z
  .object({ version: z.string().min(1), videos: z.array(VideoEntry).min(1) })
  .strict();
export type VideoRegisterFile = z.infer<typeof VideoRegisterFile>;

// ------------------------------------------------------------------ blocks

/** Blocks a Present activity can claim as its own. A block with no
 * `activities` belongs to the lesson as a whole. */
const blockBase = { activities: z.array(z.string()).nullable() };

export const ProseBlock = z.object({ kind: z.literal("prose"), text: z.string().min(1), ...blockBase }).strict();
export const HeadingBlock = z.object({ kind: z.literal("heading"), text: z.string().min(1), ...blockBase }).strict();

export const ListBlock = z
  .object({
    kind: z.literal("list"),
    style: z.enum(["bullet", "numbered", "check"]),
    title: z.string().nullable(),
    items: z.array(z.string().min(1)).min(1),
    ...blockBase,
  })
  .strict();

/** A procedure. Each step is what to do; `why` is what it protects, because
 * a step whose reason is known survives the first busy shift. */
export const StepsBlock = z
  .object({
    kind: z.literal("steps"),
    title: z.string().nullable(),
    items: z.array(z.object({ do: z.string().min(1), why: z.string().nullable() }).strict()).min(1),
    ...blockBase,
  })
  .strict();

export const CalloutBlock = z
  .object({
    kind: z.literal("callout"),
    /** linchpin — so what?; safety — harm if ignored; tip — a hand or ear
     * trick; scope — what is and is not yours to do; myth — a common wrong
     * belief, named and corrected. */
    variant: z.enum(["linchpin", "safety", "tip", "scope", "myth"]),
    title: z.string().min(1),
    text: z.string().min(1),
    ...blockBase,
  })
  .strict();

export const TableBlock = z
  .object({
    kind: z.literal("table"),
    title: z.string().nullable(),
    caption: z.string().nullable(),
    headers: z.array(z.string().min(1)).min(2),
    rows: z.array(z.array(z.string()).min(2)).min(1),
    note: z.string().nullable(),
    ...blockBase,
  })
  .strict();

export const KeyTermsBlock = z
  .object({ kind: z.literal("keyterms"), title: z.string().nullable(), terms: z.array(z.string()).min(1), ...blockBase })
  .strict();

/** A knowledge check the learner marks themselves. It is teaching, not
 * assessment: nothing here is recorded and nothing counts toward mastery
 * (invariant I-5 — only attempts are scored). The answer is revealed on
 * request because the learner asked a question of themselves, which is the
 * opposite of the discrepancy case invariant I-6 protects. */
export const CheckBlock = z
  .object({
    kind: z.literal("check"),
    question: z.string().min(1),
    options: z.array(z.object({ text: z.string().min(1), correct: z.boolean() }).strict()).min(2),
    explain: z.string().min(1),
    ...blockBase,
  })
  .strict();

/** Scaffolded practice, in the workbook's own three moves: watch it, do it
 * with support, do it alone and say it out loud. */
export const PracticeBlock = z
  .object({
    kind: z.literal("practice"),
    title: z.string().min(1),
    i_do: z.string().min(1),
    we_do: z.string().min(1),
    you_do: z.string().min(1),
    say_aloud: z.array(z.string().min(1)),
    ...blockBase,
  })
  .strict();

export const VideoBlock = z
  .object({ kind: z.literal("video"), video_id: z.string().min(1), note: z.string().nullable(), ...blockBase })
  .strict();

export const InstructionBlock = z.discriminatedUnion("kind", [
  ProseBlock,
  HeadingBlock,
  ListBlock,
  StepsBlock,
  CalloutBlock,
  TableBlock,
  KeyTermsBlock,
  CheckBlock,
  PracticeBlock,
  VideoBlock,
]);
export type InstructionBlock = z.infer<typeof InstructionBlock>;

// ------------------------------------------------------------------- pages

export const InstructionPage = z
  .object({
    lesson: z.string().min(1),
    /** The lesson in one line, in the learner's language. */
    headline: z.string().min(1),
    read_minutes: z.number().int().positive(),
    /** "After this you can…" — plain, checkable, learner-facing. */
    you_will: z.array(z.string().min(1)).min(1),
    blocks: z.array(InstructionBlock).min(1),
  })
  .strict();
export type InstructionPage = z.infer<typeof InstructionPage>;

export const PagesFile = z
  .object({ version: z.string().min(1), source: z.string().min(1), pages: z.array(InstructionPage).min(1) })
  .strict();
export type PagesFile = z.infer<typeof PagesFile>;

// -------------------------------------------------------------------- pack

export interface InstructionPack {
  version: string;
  source: string;
  glossary: GlossaryEntry[];
  videos: VideoEntry[];
  pages: InstructionPage[];
  termOf(term_id: string): GlossaryEntry | null;
  videoOf(video_id: string): VideoEntry | null;
  pageOf(lesson: string): InstructionPage | null;
}

/** Validate the three files and cross-check them. Throws on the first
 * inconsistency with the authoring detail needed to fix it. */
export function buildInstructionPack(raw: {
  glossary: unknown;
  videos: unknown;
  pages: unknown;
}): InstructionPack {
  const glossaryFile = GlossaryFile.parse(raw.glossary);
  const videoFile = VideoRegisterFile.parse(raw.videos);
  const pagesFile = PagesFile.parse(raw.pages);

  const terms = new Map<string, GlossaryEntry>();
  for (const entry of glossaryFile.terms) {
    if (terms.has(entry.term_id)) throw new Error(`instruction: duplicate glossary term ${entry.term_id}`);
    terms.set(entry.term_id, entry);
  }

  const videos = new Map<string, VideoEntry>();
  for (const entry of videoFile.videos) {
    if (videos.has(entry.video_id)) throw new Error(`instruction: duplicate video ${entry.video_id}`);
    videos.set(entry.video_id, entry);
  }

  const pages = new Map<string, InstructionPage>();
  for (const page of pagesFile.pages) {
    if (pages.has(page.lesson)) throw new Error(`instruction: duplicate page for lesson ${page.lesson}`);
    pages.set(page.lesson, page);

    for (const term_id of termsReferencedIn(page)) {
      if (!terms.has(term_id)) {
        throw new Error(`instruction: ${page.lesson} marks [[${term_id}]], which has no glossary entry`);
      }
    }
    for (const block of page.blocks) {
      if (block.kind === "keyterms") {
        for (const term_id of block.terms) {
          if (!terms.has(term_id)) {
            throw new Error(`instruction: ${page.lesson} lists key term ${term_id}, which has no glossary entry`);
          }
        }
      }
      if (block.kind === "video" && !videos.has(block.video_id)) {
        throw new Error(`instruction: ${page.lesson} calls for video ${block.video_id}, which is not in the register`);
      }
      if (block.kind === "check" && !block.options.some((option) => option.correct)) {
        throw new Error(`instruction: ${page.lesson} has a knowledge check with no correct answer`);
      }
    }
  }

  // A defined word nobody uses is dead weight in a glossary a learner
  // browses; say so at load rather than let it accumulate.
  const used = new Set<string>();
  for (const page of pagesFile.pages) {
    termsReferencedIn(page).forEach((id) => used.add(id));
    for (const block of page.blocks) {
      if (block.kind === "keyterms") block.terms.forEach((id) => used.add(id));
    }
  }
  const orphans = glossaryFile.terms.filter((entry) => !used.has(entry.term_id)).map((entry) => entry.term_id);
  if (orphans.length > 0) {
    throw new Error(`instruction: glossary defines terms no lesson uses: ${orphans.join(", ")}`);
  }

  return {
    version: pagesFile.version,
    source: pagesFile.source,
    glossary: [...glossaryFile.terms].sort((a, b) => a.term.localeCompare(b.term)),
    videos: videoFile.videos,
    pages: pagesFile.pages,
    termOf: (term_id) => terms.get(term_id) ?? null,
    videoOf: (video_id) => videos.get(video_id) ?? null,
    pageOf: (lesson) => pages.get(lesson) ?? null,
  };
}
