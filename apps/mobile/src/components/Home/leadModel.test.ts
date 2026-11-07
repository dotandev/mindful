import type { TadabburSession } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

import {
  BEGIN_LINE,
  continueTitle,
  SUGGESTED_SURAHS,
  themePicks,
} from "./leadModel";

const session = (id: string): TadabburSession => ({
  id,
  intro: "",
  journalPrompt: "",
  steps: [],
  theme: id,
  title: `Title ${id}`,
});

const all = ["a", "b", "c", "d"].map(session);

describe(continueTitle, () => {
  it("uses the surah name when known", () => {
    expect(continueTitle(103, new Map([[103, "Al-'Asr"]]))).toBe(
      "Continue Al-'Asr"
    );
  });

  it("falls back to the number", () => {
    expect(continueTitle(94, new Map())).toBe("Continue Surah 94");
  });
});

describe(themePicks, () => {
  it("takes the first three in data order", () => {
    expect(themePicks(all, {})).toStrictEqual([
      { id: "a", title: "Title a" },
      { id: "b", title: "Title b" },
      { id: "c", title: "Title c" },
    ]);
  });

  it("moves finished sessions behind unfinished ones", () => {
    const picks = themePicks(all, {
      a: { completedAt: 1, step: 3 },
      b: { step: 1 },
    });
    expect(picks.map((p) => p.id)).toStrictEqual(["b", "c", "d"]);
  });

  it("still shows finished sessions when nothing else is left", () => {
    const picks = themePicks(all.slice(0, 2), {
      a: { completedAt: 1, step: 3 },
    });
    expect(picks.map((p) => p.id)).toStrictEqual(["b", "a"]);
  });

  it("returns nothing for no sessions", () => {
    expect(themePicks([], {})).toStrictEqual([]);
  });
});

describe("begin copy", () => {
  it("suggests Al-'Asr and Ash-Sharh", () => {
    expect(SUGGESTED_SURAHS.map((s) => s.number)).toStrictEqual([103, 94]);
  });

  it("keeps the agreed line", () => {
    expect(BEGIN_LINE).toContain("with Ibn Kathir");
  });
});
