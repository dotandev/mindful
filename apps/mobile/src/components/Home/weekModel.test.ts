import type { JournalEntry } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

import { circleCountText, rhythmView } from "./weekModel";

function entryAt(date: Date): JournalEntry {
  return {
    body: "b",
    createdAt: date.getTime(),
    id: String(date.getTime()),
    prompt: "p",
  };
}

const now = new Date(2026, 10, 8, 9, 0);

describe(rhythmView, () => {
  it("shows nothing for a quiet week", () => {
    expect(rhythmView([], now)).toBeNull();
    expect(rhythmView([entryAt(new Date(2026, 9, 1))], now)).toBeNull();
  });

  it("says one day in the singular", () => {
    expect(rhythmView([entryAt(new Date(2026, 10, 8, 8))], now)).toStrictEqual({
      days: [false, false, false, false, false, false, true],
      label: "Reflections on 1 of the last 7 days",
      line: "You kept reflections on 1 day this week.",
    });
  });

  it("counts days, not entries, oldest first", () => {
    const view = rhythmView(
      [
        entryAt(new Date(2026, 10, 2, 12)),
        entryAt(new Date(2026, 10, 5, 7)),
        entryAt(new Date(2026, 10, 5, 21)),
        entryAt(new Date(2026, 10, 8, 8)),
      ],
      now
    );
    expect(view?.days).toStrictEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
    expect(view?.line).toBe("You kept reflections on 3 days this week.");
    expect(view?.label).toBe("Reflections on 3 of the last 7 days");
  });
});

describe(circleCountText, () => {
  const circle = { name: "Friday group" };

  it("shows nothing without a circle or a count", () => {
    expect(circleCountText(null, 5)).toBeNull();
    expect(circleCountText(circle, null)).toBeNull();
  });

  it("never singles out one person", () => {
    expect(circleCountText(circle, 0)).toBeNull();
    expect(circleCountText(circle, 1)).toBeNull();
  });

  it("names the circle, not the people", () => {
    expect(circleCountText(circle, 2)).toBe(
      "2 in Friday group reflected this week."
    );
  });
});
