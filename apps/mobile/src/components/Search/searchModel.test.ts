import { describe, expect, it } from "vitest";

import {
  highlightSegments,
  isSearchable,
  makeSnippet,
  MAX_RESULTS,
  resultCountLabel,
  runSearch,
} from "./searchModel";
import type { SearchIndex } from "./searchModel";

const index: SearchIndex = [
  ["1:1", "In the name of God, the Gracious, the Merciful"],
  ["2:153", "O you who believe, seek help through patience and prayer"],
  ["7:56", "God’s mercy is close to the doers of good"],
  ["39:53", "Do not despair of God's mercy"],
  ["55:13", "So which of your Lord’s marvels will you deny?"],
];

describe(runSearch, () => {
  it("matches case-insensitively and parses the verse key", () => {
    const out = runSearch(index, "PATIENCE");
    expect(out.results).toHaveLength(1);
    expect(out.results[0]).toMatchObject({
      ayah: 153,
      surah: 2,
      verseKey: "2:153",
    });
    expect(out.capped).toBeFalsy();
  });

  it("ranks whole-word matches before partial ones", () => {
    const out = runSearch(index, "merci");
    expect(out.results.map((r) => r.verseKey)).toStrictEqual(["1:1"]);
    const mercy = runSearch(
      [
        ["9:1", "the merciful"],
        ["9:2", "his mercy"],
      ],
      "mercy"
    );
    expect(mercy.results.map((r) => r.verseKey)).toStrictEqual(["9:2"]);
    const mixed = runSearch(
      [
        ["9:1", "mercifully given"],
        ["9:2", "the merciful"],
      ],
      "merciful"
    );
    expect(mixed.results.map((r) => r.verseKey)).toStrictEqual(["9:2", "9:1"]);
  });

  it("treats curly and straight apostrophes alike", () => {
    expect(runSearch(index, "god's mercy").results).toHaveLength(2);
    expect(runSearch(index, "Lord’s").results[0].verseKey).toBe("55:13");
  });

  it("trims and collapses whitespace in the term", () => {
    expect(runSearch(index, "  seek   help ").term).toBe("seek help");
    expect(runSearch(index, "  seek   help ").results).toHaveLength(1);
  });

  it("returns nothing for a blank term or no match", () => {
    expect(runSearch(index, "   ").results).toStrictEqual([]);
    expect(runSearch(index, "zzzz").results).toStrictEqual([]);
  });

  it("caps the results and says so", () => {
    const many: SearchIndex = Array.from({ length: 80 }, (_, i) => [
      `2:${i + 1}`,
      "light upon light",
    ]);
    const out = runSearch(many, "light");
    expect(out.results).toHaveLength(MAX_RESULTS);
    expect(out.capped).toBeTruthy();
    expect(resultCountLabel(out)).toBe("Showing the first 50 verses");
  });

  it("does not treat regex characters as patterns", () => {
    expect(runSearch(index, "(.*)").results).toStrictEqual([]);
  });
});

describe(makeSnippet, () => {
  it("keeps short text whole", () => {
    expect(makeSnippet("short text", 0, 5)).toBe("short text");
  });

  it("windows long text around the match on word boundaries", () => {
    const words = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
    const at = words.indexOf("word40");
    const snip = makeSnippet(words, at, 6);
    expect(snip.startsWith("…word")).toBeTruthy();
    expect(snip.endsWith("…")).toBeTruthy();
    expect(snip).toContain("word40");
    expect(snip.length).toBeLessThan(words.length);
  });
});

describe(highlightSegments, () => {
  it("marks every occurrence, keeping the original casing", () => {
    expect(highlightSegments("Mercy and mercy", "mercy")).toStrictEqual([
      { match: true, text: "Mercy" },
      { match: false, text: " and " },
      { match: true, text: "mercy" },
    ]);
  });

  it("matches across apostrophe styles", () => {
    expect(highlightSegments("God’s mercy", "god's")).toStrictEqual([
      { match: true, text: "God’s" },
      { match: false, text: " mercy" },
    ]);
  });

  it("returns the snippet unmarked for a blank term", () => {
    expect(highlightSegments("text", " ")).toStrictEqual([
      { match: false, text: "text" },
    ]);
  });
});

describe("isSearchable and resultCountLabel", () => {
  it("needs at least two characters", () => {
    expect(isSearchable(" a ")).toBeFalsy();
    expect(isSearchable("ab")).toBeTruthy();
  });

  it("pluralises the count", () => {
    expect(resultCountLabel(runSearch(index, "patience"))).toBe("1 verse");
    expect(resultCountLabel(runSearch(index, "God"))).toBe("3 verses");
  });
});
