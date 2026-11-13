import { afterEach, describe, it, expect } from "vitest";

import {
  localDayIndex as appLocalDayIndex,
  verseKeyFor as appVerseKeyFor,
} from "../packages/core/dailyVerse";
import {
  minutesOfDayInZone,
  localDayIndexInZone,
  verseKeyForDayIndex,
  isDue,
  dueOccurrence,
  localDateInZone,
  pickContinueTarget,
} from "./send-reminders";

// 2026-09-15T12:00:00Z fixed instant
const T = Date.UTC(2026, 8, 15, 12, 0, 0);

describe("timezone math", () => {
  it("minutes of day respects the zone", () => {
    expect(minutesOfDayInZone(T, "UTC")).toBe(12 * 60);
    expect(minutesOfDayInZone(T, "Africa/Lagos")).toBe(13 * 60); // UTC+1
    expect(minutesOfDayInZone(T, "America/New_York")).toBe(8 * 60); // EDT, UTC-4
  });

  it("local date string respects the zone", () => {
    expect(localDateInZone(Date.UTC(2026, 8, 15, 23, 30), "Africa/Lagos")).toBe(
      "2026-09-16"
    );
    expect(localDateInZone(Date.UTC(2026, 8, 15, 23, 30), "UTC")).toBe(
      "2026-09-15"
    );
  });

  it("day index is the local calendar date's days since epoch", () => {
    // 2026-09-15 in both zones at T.
    expect(localDayIndexInZone(T, "Africa/Lagos")).toBe(20_711);
    expect(localDayIndexInZone(T, "America/New_York")).toBe(20_711);
    // 23:30Z is already the 16th in Lagos.
    expect(
      localDayIndexInZone(Date.UTC(2026, 8, 15, 23, 30), "Africa/Lagos")
    ).toBe(20_712);
  });
});

// Same vectors as packages/core/dailyVerse.test.ts. [zone, y, m, d, index]
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

describe("day index parity with the app", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it.each(DAY_INDEX_VECTORS)(
    "%s %i-%i-%i: function and app give the same index",
    (zone, year, month, day, index) => {
      process.env.TZ = zone;
      // Noon local time on that date, as an instant.
      const at = new Date(year, month - 1, day, 12, 0);
      expect(localDayIndexInZone(at.getTime(), zone)).toBe(index);
      expect(appLocalDayIndex(at)).toBe(index);
    }
  );

  it.each(["Europe/London", "Africa/Lagos", "America/New_York"])(
    "matches the app every hour for 400 days in %s, one step per local date",
    (zone) => {
      process.env.TZ = zone;
      let prevIndex = localDayIndexInZone(RUN_START, zone);
      let prevDate = localDateInZone(RUN_START, zone);
      let changes = 0;
      for (let h = 1; h <= RUN_DAYS * 24; h++) {
        const t = RUN_START + h * HOUR_MS;
        const index = localDayIndexInZone(t, zone);
        const date = localDateInZone(t, zone);
        expect(index).toBe(appLocalDayIndex(new Date(t)));
        expect(index - prevIndex).toBe(date === prevDate ? 0 : 1);
        changes += index - prevIndex;
        prevIndex = index;
        prevDate = date;
      }
      expect(changes).toBe(RUN_DAYS);
    }
  );
});

describe("verse rotation", () => {
  it("stride-53 walk over a 139-verse pool, matching packages/core/dailyVerse.ts", () => {
    const id = "4b0c2f4e-0000-4000-8000-000000000001";
    expect(verseKeyForDayIndex(0, id)).toBe(appVerseKeyFor(0, id)); // same verse as the app
    expect(verseKeyForDayIndex(20_000, id)).toBe(appVerseKeyFor(20_000, id));
    expect(verseKeyForDayIndex(139, id)).toBe(verseKeyForDayIndex(0, id)); // full cycle
    expect(verseKeyForDayIndex(5, "someone-else")).not.toBe(
      verseKeyForDayIndex(5, id)
    );
  });
});

describe(isDue, () => {
  it("fires within the 30-minute window after the reminder time", () => {
    expect(isDue("07:00", 7 * 60)).toBeTruthy();
    expect(isDue("07:00", 7 * 60 + 15)).toBeTruthy(); // a run that started late
    expect(isDue("07:00", 7 * 60 + 29)).toBeTruthy();
    expect(isDue("07:00", 7 * 60 + 30)).toBeFalsy();
    expect(isDue("07:00", 7 * 60 - 1)).toBeFalsy();
  });

  it("handles the midnight wrap", () => {
    expect(isDue("00:05", 23 * 60 + 59)).toBeFalsy();
    expect(isDue("23:55", 23 * 60 + 56)).toBeTruthy();
    expect(isDue("00:05", 6)).toBeTruthy();
    expect(isDue("23:50", 10)).toBeTruthy();
  });

  it("is never due for a malformed time", () => {
    expect(isDue("soon", 7 * 60)).toBeFalsy();
  });
});

describe(dueOccurrence, () => {
  const LAGOS = "Africa/Lagos"; // UTC+1, no DST
  // Local wall time on 2026-09-15 in Lagos, as an instant.
  const lagos = (day: number, hour: number, minute: number, second = 0) =>
    Date.UTC(2026, 8, day, hour - 1, minute, second);

  it("is due on time and when the run is a second late", () => {
    expect(dueOccurrence("07:00", lagos(15, 7, 0), LAGOS, null)).toBe(
      "2026-09-15"
    );
    // The 07:00 run was missed; the next one starts at 07:15:01.
    expect(dueOccurrence("07:00", lagos(15, 7, 15, 1), LAGOS, null)).toBe(
      "2026-09-15"
    );
    expect(dueOccurrence("07:00", lagos(15, 7, 30), LAGOS, null)).toBeNull();
    expect(dueOccurrence("07:00", lagos(15, 6, 59), LAGOS, null)).toBeNull();
  });

  it("the second run inside the window does not send again", () => {
    const first = dueOccurrence("07:00", lagos(15, 7, 0), LAGOS, "2026-09-14");
    expect(first).toBe("2026-09-15");
    expect(dueOccurrence("07:00", lagos(15, 7, 15), LAGOS, first)).toBeNull();
  });

  it("uses the subscriber's local date, not the UTC date", () => {
    // 00:10 on the 16th in Lagos is still the 15th in UTC.
    expect(dueOccurrence("00:10", lagos(16, 0, 10), LAGOS, "2026-09-15")).toBe(
      "2026-09-16"
    );
  });

  it("a reminder just before midnight is not sent again after midnight", () => {
    const first = dueOccurrence("23:50", lagos(15, 23, 55), LAGOS, null);
    expect(first).toBe("2026-09-15");
    // 00:10 on the 16th: still inside the window, but the same occurrence.
    expect(dueOccurrence("23:50", lagos(16, 0, 10), LAGOS, first)).toBeNull();
    // Missed before midnight: caught after it, stamped as the 15th.
    expect(dueOccurrence("23:50", lagos(16, 0, 10), LAGOS, "2026-09-14")).toBe(
      "2026-09-15"
    );
    // And the next night still fires.
    expect(dueOccurrence("23:50", lagos(16, 23, 50), LAGOS, first)).toBe(
      "2026-09-16"
    );
  });

  it("a welcome push stamped after midnight covers the earlier occurrence", () => {
    expect(
      dueOccurrence("23:50", lagos(16, 0, 10), LAGOS, "2026-09-16")
    ).toBeNull();
  });

  it("throws on an invalid time zone, like the other zone helpers", () => {
    expect(() => dueOccurrence("07:00", T, "Not/AZone", null)).toThrow(
      RangeError
    );
  });
});

describe(pickContinueTarget, () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 8, 17, 12, 0, 0);
  const counts = { "2": 286, "49": 18, "8": 75 };

  it("picks the most recently pondered unfinished surah, resuming at the next ayah", () => {
    const map = {
      "2": { ayah: 10, updatedAt: now - 5 * DAY },
      "8": { ayah: 3, updatedAt: now - 2 * DAY },
    };
    expect(pickContinueTarget(map, counts, now)).toStrictEqual({
      nextAyah: 4,
      surah: 8,
    });
  });

  it("skips surahs already pondered to the last ayah", () => {
    const map = {
      "2": { ayah: 40, updatedAt: now - 6 * DAY },
      "49": { ayah: 18, updatedAt: now - 1 * DAY }, // finished,
    };
    expect(pickContinueTarget(map, counts, now)).toStrictEqual({
      nextAyah: 41,
      surah: 2,
    });
  });

  it("ignores entries older than the freshness window", () => {
    const map = { "2": { ayah: 10, updatedAt: now - 20 * DAY } };
    expect(pickContinueTarget(map, counts, now)).toBeNull();
  });

  it("returns null for empty, null, or malformed maps", () => {
    expect(pickContinueTarget({}, counts, now)).toBeNull();
    expect(pickContinueTarget(null, counts, now)).toBeNull();
    expect(pickContinueTarget(undefined, counts, now)).toBeNull();
    expect(
      pickContinueTarget(
        { "2": { ayah: Number.NaN, updatedAt: now } } as never,
        counts,
        now
      )
    ).toBeNull();
  });

  it("skips surahs with an unknown ayah count", () => {
    const map = { "999": { ayah: 3, updatedAt: now - 1 * DAY } };
    expect(pickContinueTarget(map, counts, now)).toBeNull();
  });
});

describe("verse pool parity with the client", () => {
  it("is deep-equal to the pool in packages/core/dailyVerse.ts", async () => {
    const fn = await import("./send-reminders");
    const client = await import("../packages/core/dailyVerse");
    expect(fn.DAILY_VERSES).toStrictEqual(client.DAILY_VERSES);
  });
});
