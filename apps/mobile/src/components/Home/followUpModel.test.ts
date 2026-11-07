import type { DueFollowUp } from "@mindfulverse/core/followUps";
import type { JournalEntry } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

import { followUpHeading, followUpStillOpen } from "./followUpModel";

const reflection: JournalEntry = {
  body: "Action: Call my mother",
  context: { kind: "tadabbur", ref: "2:255" },
  createdAt: 0,
  id: "r1",
  prompt: "Tadabbur",
};
const due: DueFollowUp = {
  action: "Call my mother",
  entry: reflection,
  kind: "tadabbur",
  ref: "2:255",
  verseKey: "2:255",
};

describe(followUpHeading, () => {
  it("prefixes the surah name once known", () => {
    expect(followUpHeading("2:255", new Map([[2, "Al-Baqarah"]]))).toBe(
      "Al-Baqarah 2:255"
    );
  });

  it("falls back to the verse key", () => {
    expect(followUpHeading("2:255", new Map())).toBe("2:255");
  });
});

describe(followUpStillOpen, () => {
  it("is open while the reflection exists unanswered", () => {
    expect(followUpStillOpen([reflection], due)).toBeTruthy();
  });

  it("closes when the reflection was deleted", () => {
    expect(followUpStillOpen([], due)).toBeFalsy();
  });

  it("closes when answered on another device", () => {
    const answer: JournalEntry = {
      body: "Yes",
      context: { kind: "followup", ref: "r1" },
      createdAt: 1,
      id: "f1",
      prompt: "How did it go? (2:255)",
    };
    expect(followUpStillOpen([reflection, answer], due)).toBeFalsy();
  });
});
