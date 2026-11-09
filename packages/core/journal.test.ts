// The journal-saved notification across hosts: a browser window (fires) and a
// React Native-style window with no dispatchEvent (must save without throwing).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, v),
});

import {
  addEntry,
  getEntries,
  JOURNAL_SAVED_EVENT,
  onEntryAdded,
} from "./journal";

beforeEach(() => store.clear());
afterEach(() => void vi.stubGlobal("window", undefined));

describe("addEntry saved notification", () => {
  it("dispatches the saved event on a window that is an EventTarget", () => {
    const target = new EventTarget();
    const seen: string[] = [];
    target.addEventListener(JOURNAL_SAVED_EVENT, (e) => seen.push(e.type));
    vi.stubGlobal("window", target);
    addEntry({ body: "b", prompt: "p" });
    expect(seen).toStrictEqual([JOURNAL_SAVED_EVENT]);
  });

  it("saves without throwing where window has no dispatchEvent (React Native)", () => {
    vi.stubGlobal("window", {});
    const entry = addEntry({ body: "b", prompt: "p" });
    expect(getEntries().map((e) => e.id)).toStrictEqual([entry.id]);
  });
});

describe(onEntryAdded, () => {
  it("tells listeners about each kept entry until unsubscribed", () => {
    vi.stubGlobal("window", {});
    const seen: string[] = [];
    const off = onEntryAdded((e) => seen.push(e.id));
    const first = addEntry({ body: "b", prompt: "p" });
    off();
    addEntry({ body: "b", prompt: "p" });
    expect(seen).toStrictEqual([first.id]);
  });

  it("keeps the entry when a listener throws", () => {
    vi.stubGlobal("window", {});
    const off = onEntryAdded(() => {
      throw new Error("listener failed");
    });
    try {
      const entry = addEntry({ body: "b", prompt: "p" });
      expect(getEntries().map((e) => e.id)).toStrictEqual([entry.id]);
    } finally {
      off();
    }
  });
});
