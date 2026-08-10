import { z } from "zod";

// Expected response sets: versioned, human-authored data graded by exact
// deterministic matching rules. This is what allows Domain E to be scored
// without a model grading anything. SDD-MBPT-001 section 4.4.3.

export const ConceptMatcher = z
  .object({
    id: z.string().min(1),
    // Accepted surface forms; matching is case-insensitive substring match
    // over a whitespace-normalised transcript. Deterministic by construction.
    any_of: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type ConceptMatcher = z.infer<typeof ConceptMatcher>;

export const ExpectedResponseSet = z
  .object({
    prompt_id: z.string().min(1),
    version: z.string().min(1),
    required_concepts: z.array(ConceptMatcher),
    disqualifying_concepts: z.array(ConceptMatcher),
    // The only rule currently authored. If a prompt needs a different
    // combining rule, that is a schema change under INSTR section 10.2.
    rule: z.enum(["all_required_no_disqualifying", "all_required_no_disqualifying_unprompted"]),
  })
  .strict();
export type ExpectedResponseSet = z.infer<typeof ExpectedResponseSet>;

export const ResponseSetLibrary = z
  .object({
    version: z.string().min(1),
    sets: z.array(ExpectedResponseSet),
  })
  .strict();
export type ResponseSetLibrary = z.infer<typeof ResponseSetLibrary>;
