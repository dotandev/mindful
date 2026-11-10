import { afterEach, describe, expect, it } from "vitest";

import {
  DAILY_VERSES,
  localDayIndex,
  verseKeyFor,
  verseOffset,
} from "./dailyVerse";

const n = DAILY_VERSES.length;

describe("daily verse", () => {
  it("gives different people different verses on the same day", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `user-${i}-${i * 7919}`);
    const today = new Set(ids.map((id) => verseKeyFor(20_000, id)));
    // 50 people over 139 verses: a handful may share, most must differ.
    expect(today.size).toBeGreaterThan(35);
  });

  it("is stable for one person within a day", () => {
    expect(verseKeyFor(20_000, "abc")).toBe(verseKeyFor(20_000, "abc"));
  });

  it("walks one person through every verse before repeating", () => {
    const seen = new Set(
      Array.from({ length: n }, (_, d) => verseKeyFor(20_000 + d, "abc"))
    );
    expect(seen.size).toBe(n);
  });

  it("offsets are within the pool", () => {
    for (const s of [
      "",
      "a",
      "00000000-0000-0000-0000-000000000000",
      "ünïcode",
    ]) {
      const o = verseOffset(s);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(n);
    }
  });
});

// Same vectors as functions/reminder-logic.test.ts: the app and the edge
// functions must agree on the index for a local date. [zone, y, m, d, index]
const DAY_INDEX_VECTORS: [string, number, number, number, number][] = [
  ["Europe/London", 2027, 3, 27, 20_904],
  ["Europe/London", 2027, 3, 28, 20_905], // clocks go forward
  ["Europe/London", 2027, 3, 29, 20_906],
  ["Europe/London", 2027, 10, 30, 21_121],
  ["Europe/London", 2027, 10, 31, 21_122], // clocks go back
  ["Europe/London", 2027, 11, 1, 21_123],
  ["Africa/Lagos", 2027, 3, 28, 20_905],
  ["Africa/Lagos", 2027, 10, 31, 21_122],
  ["America/New_York", 2027, 3, 14, 20_891],
  ["America/New_York", 2027, 11, 7, 21_129],
];
const HOUR_MS = 3_600_000;
const RUN_DAYS = 400;
const RUN_START = Date.UTC(2027, 0, 1);

const { env } = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined> };
  }
).process;

describe(localDayIndex, () => {
  const originalTz = env.TZ;
  afterEach(() => {
    if (originalTz === undefined) {
      delete env.TZ;
    } else {
      env.TZ = originalTz;
    }
  });

  it.each(DAY_INDEX_VECTORS)(
    "indexes %s %i-%i-%i by calendar date",
    (zone, year, month, day, index) => {
      env.TZ = zone;
      expect(localDayIndex(new Date(year, month - 1, day, 0, 0))).toBe(index);
      expect(localDayIndex(new Date(year, month - 1, day, 23, 59))).toBe(index);
    }
  );

  it.each(["Europe/London", "Africa/Lagos", "America/New_York"])(
    "steps by exactly one per local date for 400 days in %s",
    (zone) => {
      env.TZ = zone;
      let prev = new Date(RUN_START);
      let changes = 0;
      for (let h = 1; h <= RUN_DAYS * 24; h++) {
        const at = new Date(RUN_START + h * HOUR_MS);
        const step = localDayIndex(at) - localDayIndex(prev);
        const dateChanged = at.getDate() !== prev.getDate();
        expect(step).toBe(dateChanged ? 1 : 0);
        changes += step;
        prev = at;
      }
      expect(changes).toBe(RUN_DAYS);
    }
  );
});
