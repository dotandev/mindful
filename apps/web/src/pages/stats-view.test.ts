import { describe, expect, it } from "vitest";

import { tallyCheckins } from "./stats-view";

describe("check-in tally", () => {
  it("counts one visit with three feeling taps as one check-in", () => {
    const tally = tallyCheckins([
      { type: "checkin_view" },
      { emotion: "anxious", type: "checkin_view" },
      { emotion: "grateful", type: "checkin_view" },
      { emotion: "anxious", type: "checkin_view" },
    ]);
    expect(tally.checkins).toBe(1);
    expect([...tally.emotions]).toStrictEqual([
      ["anxious", 2],
      ["grateful", 1],
    ]);
  });

  it("ignores other events", () => {
    const tally = tallyCheckins([
      { type: "app_open" },
      { type: "checkin_view" },
    ]);
    expect(tally.checkins).toBe(1);
    expect(tally.emotions.size).toBe(0);
  });
});
