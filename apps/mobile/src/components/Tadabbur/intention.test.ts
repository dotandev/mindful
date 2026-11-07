import type { JournalEntry } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

import {
  composeIntention,
  currentIntention,
  hasSurahPage,
  surahPageHref,
} from "./intention";

const entry = (
  id: string,
  createdAt: number,
  body: string,
  context: JournalEntry["context"]
): JournalEntry => ({ body, context, createdAt, id, prompt: "" });

describe(composeIntention, () => {
  it("builds the same entry as web and skips blank drafts", () => {
    expect(composeIntention(94, "Ash-Sharh", "  For ease  ")).toStrictEqual({
      body: "For ease",
      context: { kind: "intention", ref: "94" },
      prompt: "Why I'm reading Ash-Sharh",
    });
    expect(composeIntention(94, "Ash-Sharh", "   ")).toBeNull();
  });
});

describe(currentIntention, () => {
  it("returns the newest intention for the surah only", () => {
    const entries = [
      entry("a", 1, "first", { kind: "intention", ref: "94" }),
      entry("b", 3, "latest", { kind: "intention", ref: "94" }),
      entry("c", 5, "other surah", { kind: "intention", ref: "93" }),
    ];
    expect(currentIntention(entries, 94)).toBe("latest");
    expect(currentIntention(entries, 1)).toBeNull();
  });
});

describe(hasSurahPage, () => {
  it("is true once any entry for the surah exists", () => {
    expect(hasSurahPage([], 94)).toBeFalsy();
    expect(
      hasSurahPage(
        [entry("a", 1, "Lessons: x", { kind: "tadabbur", ref: "94:5" })],
        94
      )
    ).toBeTruthy();
  });
});

describe(surahPageHref, () => {
  it("points at the agreed surah page route", () => {
    expect(surahPageHref(94)).toBe("/tadabbur/journal/94");
  });
});
