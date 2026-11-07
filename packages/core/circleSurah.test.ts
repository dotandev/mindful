import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, v),
});

import {
  getCircleSurah,
  parseSurahNumber,
  setCircleSurah,
  STARTER_SURAHS,
} from "./circleSurah";

describe("circleSurah", () => {
  beforeEach(() => {
    store.clear();
  });

  it("is empty until a circle link sets it", () => {
    expect(getCircleSurah()).toBeNull();
  });

  it("remembers the surah from a link", () => {
    const now = new Date("2026-11-07T10:00:00Z");
    expect(setCircleSurah("94", now)).toBe(94);
    expect(getCircleSurah()).toStrictEqual({ setAt: now.getTime(), surah: 94 });
  });

  it("a newer link replaces the older one", () => {
    setCircleSurah("94");
    setCircleSurah(18);
    expect(getCircleSurah()?.surah).toBe(18);
  });

  it("ignores values that are not surah numbers", () => {
    for (const bad of ["0", "115", "2.5", "abc", "", null, undefined]) {
      expect(setCircleSurah(bad)).toBeNull();
    }
    expect(getCircleSurah()).toBeNull();
  });

  it("treats corrupted storage as unset", () => {
    localStorage.setItem("mindfulverse.circleSurah.v1", "{not json");
    expect(getCircleSurah()).toBeNull();
    localStorage.setItem("mindfulverse.circleSurah.v1", '{"surah":200}');
    expect(getCircleSurah()).toBeNull();
  });

  it("parses surah numbers strictly", () => {
    expect(parseSurahNumber("1")).toBe(1);
    expect(parseSurahNumber(114)).toBe(114);
    expect(parseSurahNumber(" 5")).toBe(5);
  });

  it("offers four short starter surahs", () => {
    expect([...STARTER_SURAHS]).toStrictEqual([1, 103, 93, 94]);
  });
});
