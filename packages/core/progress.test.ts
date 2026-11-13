// Progress writes: skipped when nothing changed, silent when storage fails.
import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
let blocked = false;
const guard = () => {
  if (blocked) {
    throw new Error("storage blocked");
  }
};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => {
    guard();
    return store.get(k) ?? null;
  },
  removeItem: (k: string) => {
    guard();
    store.delete(k);
  },
  setItem: (k: string, v: string) => {
    guard();
    store.set(k, v);
  },
});

import {
  clearLocalProgress,
  getLastRead,
  getLocalProgress,
  recordLastRead,
  recordSessionComplete,
  recordSessionStep,
  recordSurahTadabbur,
  recordVisit,
  replaceLocalProgress,
} from "./progress";
import { clearDirty, isDirty } from "./syncFlags";

beforeEach(() => {
  blocked = false;
  store.clear();
});

describe(recordLastRead, () => {
  it("writes and marks dirty when the place changes", () => {
    recordLastRead(2, 255);
    expect(getLastRead()).toMatchObject({ ayah: 255, surah: 2 });
    expect(isDirty()).toBeTruthy();
  });

  it("does nothing when the surah and ayah are unchanged", () => {
    recordLastRead(2, 255);
    const before = store.get("mindfulverse.lastRead.v1");
    clearDirty();
    vi.useFakeTimers();
    vi.advanceTimersByTime(60_000);
    recordLastRead(2, 255);
    vi.useRealTimers();
    expect(store.get("mindfulverse.lastRead.v1")).toBe(before);
    expect(isDirty()).toBeFalsy();
  });
});

describe("blocked storage", () => {
  it("never throws from a progress read or write", () => {
    blocked = true;
    expect(() => {
      recordVisit();
      recordSessionStep("s", 1);
      recordSessionComplete("s");
      recordSurahTadabbur(2, 5);
      recordLastRead(2, 5);
      replaceLocalProgress({
        lastRead: { at: 1, ayah: 1, surah: 1 },
        sessionProgress: {},
        surahTadabbur: {},
        visits: ["2026-01-01"],
      });
      clearLocalProgress();
    }).not.toThrow();
    expect(getLocalProgress()).toStrictEqual({
      lastRead: null,
      sessionProgress: {},
      surahTadabbur: {},
      visits: [],
    });
  });
});
