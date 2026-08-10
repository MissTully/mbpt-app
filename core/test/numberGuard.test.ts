import { describe, expect, it } from "vitest";
import {
  extractNumbers,
  guardFeedback,
  numbersAccountedFor,
  renderTemplate,
} from "../src/index.js";

describe("the number guard (invariant I-3): code, not prompt discipline", () => {
  it("extracts plain numeric tokens, not identifiers", () => {
    expect(extractNumbers("Your rate reached 4.8 against a limit of 3, objective C3")).toEqual([
      4.8, 3,
    ]);
  });

  it("passes model output whose numbers all came from the scorer", () => {
    const result = guardFeedback(
      "You deflated at 4.8, a little over the 3 limit.",
      "template",
      [4.8, 3],
    );
    expect(result.discarded).toBe(false);
    expect(result.text).toContain("4.8");
  });

  it("discards entirely on any unsourced number and shows the template", () => {
    const result = guardFeedback(
      "You deflated at 4.8, about 60 percent over the 3 limit.",
      "Your deflation reached 4.8 mmHg per second, above the 3 limit.",
      [4.8, 3],
    );
    expect(result.discarded).toBe(true);
    expect(result.text).not.toContain("60");
  });

  it("accounts for numbers exactly, not approximately", () => {
    expect(numbersAccountedFor("within 4 mmHg", [4])).toBe(true);
    expect(numbersAccountedFor("within 5 mmHg", [4])).toBe(false);
  });
});

describe("template rendering (authoring rule R-6)", () => {
  it("substitutes scorer-supplied variables", () => {
    expect(
      renderTemplate("Your deflation reached {measured} mmHg per second, above the {threshold} limit.", {
        measured: 4.8,
        threshold: 3,
      }),
    ).toBe("Your deflation reached 4.8 mmHg per second, above the 3 limit.");
  });

  it("fails loudly on a variable the scorer did not supply", () => {
    expect(() => renderTemplate("You were {percent} percent over.", { measured: 4.8 })).toThrow(
      /R-6/,
    );
  });
});
