import { describe, expect, it } from "vitest";

import { greeting, readDesc, streakLine } from "./homeModel";

describe(greeting, () => {
  it("follows the hour like web", () => {
    expect(greeting(0)).toBe("Peace be upon you tonight");
    expect(greeting(4)).toBe("Peace be upon you tonight");
    expect(greeting(5)).toBe("Peace be upon you this morning");
    expect(greeting(11)).toBe("Peace be upon you this morning");
    expect(greeting(12)).toBe("Peace be upon you today");
    expect(greeting(17)).toBe("Peace be upon you today");
    expect(greeting(18)).toBe("Peace be upon you this evening");
    expect(greeting(23)).toBe("Peace be upon you this evening");
  });
});

describe(streakLine, () => {
  it("appears from day 2", () => {
    expect(streakLine(0)).toBeNull();
    expect(streakLine(1)).toBeNull();
    expect(streakLine(2)).toBe("Day 2 of returning to the Qur’an");
  });
});

describe(readDesc, () => {
  it("offers to continue the last read verse", () => {
    expect(readDesc({ ayah: 255, surah: 2 })).toBe(
      "Pick up at Surah 2, verse 255"
    );
    expect(readDesc(null)).toBe("The Qur’an, with translation and commentary.");
  });
});
