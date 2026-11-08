import { circleError } from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";
import { describe, expect, it, vi } from "vitest";

import {
  checkFocusVerse,
  circleSummary,
  filterSurahs,
  fittingVerse,
  inviteMessage,
  inviteUrl,
  PRIVACY_LINE,
  resolveCircleLink,
} from "./circleModel";
import type { LinkDeps } from "./circleModel";

const surahs = new Map<number, SurahMeta>([
  [1, { ayahCount: 7, name: "Al-Fatihah", number: 1 }],
  [18, { ayahCount: 110, name: "Al-Kahf", number: 18 }],
  [103, { ayahCount: 3, name: "Al-'Asr", number: 103 }],
]);

const circle: Circle = {
  code: "abc234",
  name: "Friday friends",
  surah: 18,
  updatedAt: 1,
  verse: 10,
};

function deps(over: Partial<LinkDeps> = {}): LinkDeps {
  return {
    fetch: vi.fn(async () => ({ ok: true as const, value: circle })),
    join: vi.fn(() => true),
    leave: vi.fn(),
    setSurah: vi.fn(),
    ...over,
  };
}

describe(inviteUrl, () => {
  it("points at the web circle path", () => {
    expect(inviteUrl("abc234")).toBe(
      "https://mindfulverse.vercel.app/circle/abc234"
    );
  });
});

describe(inviteMessage, () => {
  it("names the circle, surah and focus verse, link last", () => {
    expect(inviteMessage(circle, surahs)).toBe(
      "Join “Friday friends” on MindfulVerse. We’re reading Al-Kahf together, starting at verse 10.\nhttps://mindfulverse.vercel.app/circle/abc234"
    );
  });

  it("leaves out the verse when there is none", () => {
    expect(inviteMessage({ ...circle, verse: null }, surahs)).toBe(
      "Join “Friday friends” on MindfulVerse. We’re reading Al-Kahf together.\nhttps://mindfulverse.vercel.app/circle/abc234"
    );
  });
});

describe(circleSummary, () => {
  it("shows the surah and verse", () => {
    expect(circleSummary(circle, surahs)).toBe("Al-Kahf · verse 10");
    expect(circleSummary({ surah: 94, verse: null }, surahs)).toBe("Surah 94");
  });
});

describe(checkFocusVerse, () => {
  it("treats empty as no focus verse", () => {
    expect(checkFocusVerse("  ", 7)).toStrictEqual({ ok: true, verse: null });
  });

  it("accepts a verse the surah has", () => {
    expect(checkFocusVerse(" 7 ", 7)).toStrictEqual({ ok: true, verse: 7 });
  });

  it("rejects verses outside the surah", () => {
    for (const bad of ["0", "8", "2.5", "-1", "x", "1e1"]) {
      expect(checkFocusVerse(bad, 7)).toStrictEqual({
        message: "Choose a verse from 1 to 7.",
        ok: false,
      });
    }
  });

  it("falls back to the longest surah before the list loads", () => {
    expect(checkFocusVerse("286", undefined).ok).toBeTruthy();
    expect(checkFocusVerse("287", undefined).ok).toBeFalsy();
  });
});

describe(fittingVerse, () => {
  it("drops a verse the surah doesn't have", () => {
    expect(fittingVerse(10, 3)).toBeNull();
    expect(fittingVerse(3, 3)).toBe(3);
    expect(fittingVerse(10, undefined)).toBe(10);
    expect(fittingVerse(null, 3)).toBeNull();
  });
});

describe(filterSurahs, () => {
  const list = [...surahs.values()];

  it("matches by name or exact number", () => {
    expect(filterSurahs(list, "kah").map((s) => s.number)).toStrictEqual([18]);
    expect(filterSurahs(list, "1").map((s) => s.number)).toStrictEqual([1]);
    expect(filterSurahs(list, " ")).toHaveLength(3);
  });
});

describe(resolveCircleLink, () => {
  it("joins a named circle and opens its focus verse", async () => {
    const d = deps();
    await expect(resolveCircleLink("abc234", d)).resolves.toStrictEqual({
      kind: "tadabbur",
      surah: 18,
      verse: 10,
    });
    expect(d.join).toHaveBeenCalledWith(circle);
    expect(d.leave).not.toHaveBeenCalled();
  });

  it("keeps old numeric links as surah links and leaves a named circle", async () => {
    const d = deps();
    await expect(resolveCircleLink("94", d)).resolves.toStrictEqual({
      kind: "tadabbur",
      surah: 94,
      verse: null,
    });
    expect(d.leave).toHaveBeenCalledOnce();
    expect(d.setSurah).toHaveBeenCalledWith(94);
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("goes home for a link that is neither", async () => {
    const d = deps();
    await expect(resolveCircleLink("nope!", d)).resolves.toStrictEqual({
      kind: "home",
    });
    await expect(resolveCircleLink("115", d)).resolves.toStrictEqual({
      kind: "home",
    });
  });

  it("reports a circle that can't be fetched", async () => {
    const d = deps({
      fetch: vi.fn(async () => ({
        error: circleError("not-found"),
        ok: false as const,
      })),
    });
    await expect(resolveCircleLink("abc234", d)).resolves.toStrictEqual({
      kind: "failed",
      message: "This circle isn't available any more.",
      retry: false,
    });
    expect(d.join).not.toHaveBeenCalled();
  });
});

describe("privacy copy", () => {
  it("keeps the agreed line", () => {
    expect(PRIVACY_LINE).toBe(
      "Your reflections stay private. A circle only shares which surah or verse you're reading together."
    );
  });
});
