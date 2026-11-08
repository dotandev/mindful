import { describe, expect, it } from "vitest";

import { rhythmLabel, rhythmLine, weekRhythm } from "./rhythm";
import type { JournalEntry } from "./types";

function entryAt(date: Date): JournalEntry {
  return {
    body: "b",
    createdAt: date.getTime(),
    id: String(date.getTime()),
    prompt: "p",
  };
}

const now = new Date(2026, 10, 8, 9, 0);

describe(weekRhythm, () => {
  it("is empty with no entries", () => {
    expect(weekRhythm([], now)).toStrictEqual({
      count: 0,
      days: [false, false, false, false, false, false, false],
    });
  });

  it("puts today last and six days ago first", () => {
    const result = weekRhythm(
      [
        entryAt(new Date(2026, 10, 8, 8, 0)),
        entryAt(new Date(2026, 10, 2, 12)),
      ],
      now
    );
    expect(result.days).toStrictEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(result.count).toBe(2);
  });

  it("counts a day once however many entries it has", () => {
    const result = weekRhythm(
      [
        entryAt(new Date(2026, 10, 6, 7)),
        entryAt(new Date(2026, 10, 6, 13)),
        entryAt(new Date(2026, 10, 6, 22)),
      ],
      now
    );
    expect(result.count).toBe(1);
    expect(result.days[4]).toBeTruthy();
  });

  it("splits at local midnight", () => {
    const result = weekRhythm(
      [
        entryAt(new Date(2026, 10, 7, 23, 59, 59)),
        entryAt(new Date(2026, 10, 8, 0, 0, 0)),
      ],
      now
    );
    expect(result.days.slice(-2)).toStrictEqual([true, true]);
    expect(result.count).toBe(2);
  });

  it("ignores entries older than seven days and in the future", () => {
    const result = weekRhythm(
      [
        entryAt(new Date(2026, 10, 1, 23, 59)),
        entryAt(new Date(2026, 9, 20)),
        entryAt(new Date(2026, 10, 9, 0, 1)),
      ],
      now
    );
    expect(result.count).toBe(0);
  });

  it("spans a month boundary", () => {
    const result = weekRhythm(
      [entryAt(new Date(2026, 9, 31, 10))],
      new Date(2026, 10, 3, 10)
    );
    expect(result.days).toStrictEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });
});

describe(rhythmLine, () => {
  it("shows nothing for a quiet week", () => {
    expect(rhythmLine(0)).toBeNull();
  });

  it("uses the singular for one day", () => {
    expect(rhythmLine(1)).toBe("You kept reflections on 1 day this week.");
  });

  it("uses the plural otherwise", () => {
    expect(rhythmLine(4)).toBe("You kept reflections on 4 days this week.");
    expect(rhythmLine(7)).toBe("You kept reflections on 7 days this week.");
  });
});

describe(rhythmLabel, () => {
  it("describes the dots for screen readers", () => {
    expect(rhythmLabel(4)).toBe("Reflections on 4 of the last 7 days");
  });
});
