import { describe, expect, it } from "vitest";

import {
  checkCircleForm,
  circleShareMessage,
  circleShareUrl,
  circleSummary,
  whatsappUrl,
} from "./circles-view";

const counts = new Map([
  [18, 110],
  [108, 3],
]);
const verseCount = (s: number) => counts.get(s);

describe("circle share link", () => {
  it("builds the link from the origin", () => {
    expect(circleShareUrl("https://mindfulverse.vercel.app", "abc234")).toBe(
      "https://mindfulverse.vercel.app/circle/abc234"
    );
    expect(circleShareUrl("http://localhost:5173/", "abc234")).toBe(
      "http://localhost:5173/circle/abc234"
    );
  });

  it("mentions the focus verse only when set", () => {
    const url = "https://x.app/circle/abc234";
    expect(
      circleShareMessage(
        { name: "Friday friends", verse: null },
        "Al-Kahf",
        url
      )
    ).toBe(
      `Join “Friday friends” on MindfulVerse. We’re reading Al-Kahf together.\n${url}`
    );
    expect(
      circleShareMessage({ name: "Friday friends", verse: 10 }, "Al-Kahf", url)
    ).toContain("together, starting at verse 10.");
  });

  it("encodes the WhatsApp message", () => {
    expect(whatsappUrl("a b\n&")).toBe("https://wa.me/?text=a%20b%0A%26");
  });

  it("summarises the surah and focus", () => {
    expect(circleSummary({ verse: null }, "Al-Kahf")).toBe("Reading Al-Kahf");
    expect(circleSummary({ verse: 10 }, "Al-Kahf")).toBe(
      "Reading Al-Kahf · Focus: verse 10"
    );
  });
});

describe("circle form check", () => {
  it("accepts a name and surah with no verse", () => {
    expect(
      checkCircleForm(
        { name: "  Friday  friends ", surah: "18", verse: "" },
        verseCount
      )
    ).toStrictEqual({
      draft: { name: "Friday friends", surah: 18, verse: null },
      ok: true,
    });
  });

  it("needs a name and a surah", () => {
    expect(
      checkCircleForm({ name: "  ", surah: "18", verse: "" }, verseCount).ok
    ).toBeFalsy();
    expect(
      checkCircleForm({ name: "A", surah: "", verse: "" }, verseCount).ok
    ).toBeFalsy();
  });

  it("checks the verse against the surah's length", () => {
    expect(
      checkCircleForm({ name: "A", surah: "18", verse: "110" }, verseCount)
    ).toStrictEqual({ draft: { name: "A", surah: 18, verse: 110 }, ok: true });
    expect(
      checkCircleForm({ name: "A", surah: "108", verse: "4" }, verseCount)
    ).toStrictEqual({
      message:
        "This surah has 3 verses. Choose a verse from 1 to 3, or leave it empty.",
      ok: false,
    });
    expect(
      checkCircleForm({ name: "A", surah: "18", verse: "2.5" }, verseCount).ok
    ).toBeFalsy();
  });
});
