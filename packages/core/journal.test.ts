// The journal-saved notification across hosts: a browser window (fires) and a
// React Native-style window with no dispatchEvent (must save without throwing).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const store = new Map<string, string>();
/** A key whose writes throw, as when storage is full. */
let failKey: string | null = null;
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => {
    if (k === failKey) {
      throw new Error("quota exceeded");
    }
    store.set(k, v);
  },
});

import {
  addEntry,
  deleteEntry,
  getEntries,
  getTombstones,
  JOURNAL_SAVED_EVENT,
  onEntryAdded,
} from "./journal";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

beforeEach(() => {
  store.clear();
  failKey = null;
});
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

describe("addEntry id", () => {
  it("still saves where crypto.randomUUID is missing", () => {
    const realCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", {});
    try {
      const entry = addEntry({ body: "b", prompt: "p" });
      expect(entry.id).toMatch(UUID_PATTERN);
      expect(getEntries().map((e) => e.id)).toStrictEqual([entry.id]);
    } finally {
      vi.stubGlobal("crypto", realCrypto);
    }
  });
});

describe(deleteEntry, () => {
  it("keeps the entry when the tombstone cannot be written", () => {
    const entry = addEntry({ body: "b", prompt: "p" });
    failKey = "mindfulverse.journal.deleted.v1";
    expect(() => deleteEntry(entry.id)).toThrow("quota exceeded");
    expect(getEntries().map((e) => e.id)).toStrictEqual([entry.id]);
    expect(getTombstones()).toStrictEqual([]);
  });
});
