import { describe, expect, it } from "vitest";

import {
  chooseLead,
  circleBeginAction,
  circleFocus,
  starterLabel,
  surahLabel,
} from "./home-lead";

const asr = { ayahCount: 3, name: "Al-'Asr", number: 103 };

describe("home lead labels", () => {
  it("names a surah from its metadata", () => {
    expect(surahLabel(103, asr)).toBe("Al-'Asr");
  });

  it("falls back to the surah number before the list loads", () => {
    expect(surahLabel(103, undefined)).toBe("Surah 103");
    expect(starterLabel(103, undefined)).toBe("Surah 103");
  });

  it("shows only the name on a starter surah", () => {
    expect(starterLabel(103, asr)).toBe("Al-'Asr");
  });
});

describe("home lead order", () => {
  const none = { circleSurah: false, inProgress: false, joinedCircle: false };

  it("keeps a surah in progress first", () => {
    expect(
      chooseLead({ circleSurah: true, inProgress: true, joinedCircle: true })
    ).toBe("continue");
  });

  it("puts a joined circle ahead of an old numeric circle link", () => {
    expect(chooseLead({ ...none, circleSurah: true, joinedCircle: true })).toBe(
      "circle"
    );
    expect(chooseLead({ ...none, circleSurah: true })).toBe("circle-surah");
  });

  it("falls back to the starters", () => {
    expect(chooseLead(none)).toBe("starters");
  });
});

describe("circle lead button", () => {
  it("begins the surah when there is no focus verse", () => {
    expect(
      circleBeginAction({ surah: 18, verse: null }, "Al-Kahf")
    ).toStrictEqual({
      label: "Begin Al-Kahf",
      to: "/tadabbur/18",
    });
  });

  it("goes straight to the focus verse", () => {
    expect(
      circleBeginAction({ surah: 18, verse: 10 }, "Al-Kahf")
    ).toStrictEqual({
      label: "Go to verse 10",
      to: "/tadabbur/18?v=10",
    });
  });
});

describe("circle focus verse", () => {
  it("keeps a verse inside the surah", () => {
    expect(circleFocus({ surah: 103, verse: 3 }, 3)).toStrictEqual({
      surah: 103,
      verse: 3,
    });
  });

  it("treats a verse past the end as no verse", () => {
    expect(circleFocus({ surah: 103, verse: 4 }, 3)).toStrictEqual({
      surah: 103,
      verse: null,
    });
  });

  it("keeps the verse until the verse count is known", () => {
    expect(circleFocus({ surah: 103, verse: 200 }, undefined)).toStrictEqual({
      surah: 103,
      verse: 200,
    });
  });
});
