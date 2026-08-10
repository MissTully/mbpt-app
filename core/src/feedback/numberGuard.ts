// The number guard. Invariant I-3: a generative model may phrase feedback but
// never grade, and any model response containing a number the scorer did not
// supply is discarded entirely — this check is code, not prompt discipline.

/** Extract every numeric token from a piece of text. "4.8", "-3", "90" all
 * count; digits embedded in identifiers (e.g. "C3", "mmHg2") do not. */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/(?<![A-Za-z\d])-?\d+(\.\d+)?(?![A-Za-z\d])/g);
  return matches ? matches.map(Number) : [];
}

/**
 * True when every number in the candidate text is accounted for by the
 * scorer-supplied set. Comparison is by exact numeric value.
 */
export function numbersAccountedFor(
  candidate: string,
  supplied: readonly number[],
): boolean {
  const allowed = new Set(supplied.map((n) => String(n)));
  return extractNumbers(candidate).every((n) => allowed.has(String(n)));
}

/**
 * Apply the guard: return the model phrasing when it is clean, otherwise the
 * template. The caller logs discards; a rising discard rate is a signal the
 * phrasing guidance needs work (SDD-MBPT-001 section 5.4).
 */
export function guardFeedback(
  modelPhrasing: string | null,
  template: string,
  suppliedNumbers: readonly number[],
): { text: string; discarded: boolean } {
  if (modelPhrasing === null) return { text: template, discarded: false };
  if (numbersAccountedFor(modelPhrasing, suppliedNumbers)) {
    return { text: modelPhrasing, discarded: false };
  }
  return { text: template, discarded: true };
}

/** Render a feedback template, substituting {measured}, {threshold} and any
 * other named variables from scorer output only (authoring rule R-6). A
 * template referencing a variable that was not supplied fails loudly. */
export function renderTemplate(
  template: string,
  variables: Record<string, number | string>,
): string {
  return template.replace(/\{([a-z_]+)\}/g, (_, name: string) => {
    if (!(name in variables)) {
      throw new Error(
        `Feedback template references "{${name}}" which the scorer did not supply (rule R-6)`,
      );
    }
    return String(variables[name]);
  });
}
