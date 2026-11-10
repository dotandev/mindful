import type { TadabburSession } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

import {
  excerptCount,
  resumeStepFor,
  sessionRows,
  sessionState,
  stepCountLabel,
  verseLabel,
} from "./logic";

const session = (id: string, steps = 3): TadabburSession => ({
  id,
  intro: "",
  journalPrompt: "",
  steps: Array.from({ length: steps }, () => ({ verseKeys: ["1:1"] })),
  theme: id,
  title: id,
});

describe(sessionState, () => {
  it("is new without progress", () => {
    expect(sessionState(undefined)).toBe("new");
  });

  it("is in progress once a step is recorded", () => {
    expect(sessionState({ step: 0 })).toBe("inProgress");
  });

  it("is completed once completedAt is set", () => {
    expect(sessionState({ completedAt: 1, step: 2 })).toBe("completed");
  });
});

describe(sessionRows, () => {
  it("puts in-progress first and completed last, keeping order within a group", () => {
    const rows = sessionRows(
      [session("a"), session("b"), session("c"), session("d")],
      {
        a: { completedAt: 5, step: 2 },
        c: { step: 1 },
      }
    );
    expect(rows.map((r) => r.session.id)).toStrictEqual(["c", "b", "d", "a"]);
    expect(rows.map((r) => r.state)).toStrictEqual([
      "inProgress",
      "new",
      "new",
      "completed",
    ]);
  });
});

describe(stepCountLabel, () => {
  it("is singular for one step", () => {
    expect(stepCountLabel(1)).toBe("1 step");
    expect(stepCountLabel(4)).toBe("4 steps");
  });
});

describe(resumeStepFor, () => {
  it("offers the saved step, clamped to the last one", () => {
    expect(resumeStepFor({ step: 1 }, 3)).toBe(1);
    expect(resumeStepFor({ step: 9 }, 3)).toBe(2);
  });

  it("offers nothing when new or completed", () => {
    expect(resumeStepFor(undefined, 3)).toBeNull();
    expect(resumeStepFor({ completedAt: 1, step: 1 }, 3)).toBeNull();
  });
});

describe(excerptCount, () => {
  it("takes whole paragraphs until past 700 characters", () => {
    const paragraphs = ["a".repeat(400), "b".repeat(400), "c".repeat(400)];
    expect(excerptCount(paragraphs)).toBe(2);
  });

  it("always takes at least one paragraph", () => {
    expect(excerptCount(["x".repeat(2000), "y"])).toBe(1);
  });

  it("takes everything when short", () => {
    expect(excerptCount(["one", "two"])).toBe(2);
  });
});

describe(verseLabel, () => {
  it("names the surah when known", () => {
    const names = new Map([[2, "Al-Baqarah"]]);
    expect(verseLabel("2:255", names)).toBe("Al-Baqarah 2:255");
    expect(verseLabel("3:1", names)).toBe("3:1");
  });
});
