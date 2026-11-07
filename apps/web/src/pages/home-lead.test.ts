import { describe, expect, it } from "vitest";

import { starterLabel, surahLabel } from "./home-lead";

const asr = { ayahCount: 3, name: "Al-'Asr", number: 103 };

describe("home lead labels", () => {
  it("names a surah from its metadata", () => {
    expect(surahLabel(103, asr)).toBe("Al-'Asr");
  });

  it("falls back to the surah number before the list loads", () => {
    expect(surahLabel(103, undefined)).toBe("Surah 103");
    expect(starterLabel(103, undefined)).toBe("Surah 103");
  });

  it("shows the verse count on a starter surah", () => {
    expect(starterLabel(103, asr)).toBe("Al-'Asr · 3 verses");
  });

  it("uses the singular for a one-verse count", () => {
    expect(starterLabel(5, { ayahCount: 1, name: "X", number: 5 })).toBe(
      "X · 1 verse"
    );
  });
});
