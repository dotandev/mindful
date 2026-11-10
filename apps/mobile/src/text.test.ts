import { describe, expect, it } from "vitest";

import { splitParagraphs } from "./text";

describe(splitParagraphs, () => {
  it("splits on blank lines, trims and drops empties", () => {
    expect(splitParagraphs(" one \n\n\n\ntwo\n\n")).toStrictEqual([
      "one",
      "two",
    ]);
  });

  it("treats missing text as no paragraphs", () => {
    expect(splitParagraphs(null)).toStrictEqual([]);
    expect(splitParagraphs(undefined)).toStrictEqual([]);
    expect(splitParagraphs("")).toStrictEqual([]);
  });
});
