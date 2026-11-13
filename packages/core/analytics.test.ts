// The local event log: capped in size, and safe when storage is blocked.
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

import { MAX_EVENTS, getEvents, track, trackAppOpen } from "./analytics";

const KEY = "mindfulverse.events.v1";

beforeEach(() => {
  store.clear();
  blocked = false;
});

describe(track, () => {
  it("keeps only the most recent events once the log is full", () => {
    const full = Array.from({ length: MAX_EVENTS }, (_, i) => ({
      e: { type: "app_open" },
      t: i,
    }));
    store.set(KEY, JSON.stringify(full));

    track({ type: "account_signout" });

    const events = getEvents();
    expect(events).toHaveLength(MAX_EVENTS);
    expect(events[0].t).toBe(1); // the oldest one was dropped
    expect(events.at(-1)?.e).toStrictEqual({ type: "account_signout" });
  });
});

describe(trackAppOpen, () => {
  it("records first-seen once and logs an open", () => {
    trackAppOpen();
    const firstSeen = store.get("mindfulverse.firstSeen.v1");
    trackAppOpen();
    expect(firstSeen).toBeDefined();
    expect(store.get("mindfulverse.firstSeen.v1")).toBe(firstSeen);
    expect(getEvents().map((s) => s.e.type)).toStrictEqual([
      "app_open",
      "app_open",
    ]);
  });

  it("does not throw when storage is blocked", () => {
    blocked = true;
    expect(() => trackAppOpen()).not.toThrow();
    expect(getEvents()).toStrictEqual([]);
  });
});
