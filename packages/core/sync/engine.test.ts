// Account-owner guard. Runs in the "node" env with the same localStorage stub
// pattern as syncFlags.test.ts, plus a thenable stub for the InsForge client.
import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, v),
});

let currentUserId: string | null = "user-b";
let authCalls = 0;
/** Runs while the pass awaits the progress pull, i.e. mid-push. */
let duringPush: (() => void) | null = null;

/** Every query builder method chains; awaiting one yields an empty result. */
function query(): Record<string, unknown> {
  const chain: Record<string, unknown> = {
    then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
      resolve({ data: [], error: null }),
  };
  for (const m of [
    "select",
    "eq",
    "order",
    "range",
    "insert",
    "update",
    "delete",
    "limit",
  ]) {
    chain[m] = () => chain;
  }
  chain.maybeSingle = () => ({
    then: (resolve: (v: { data: null; error: null }) => unknown) => {
      duringPush?.();
      return resolve({ data: null, error: null });
    },
  });
  return chain;
}

// Partial fakes: `as never` lets the typed vi.mock accept them.
vi.mock(import("./insforge"), () => ({
  insforge: {
    auth: {
      getCurrentUser: async () => {
        authCalls++;
        return {
          data: currentUserId ? { user: { id: currentUserId } } : null,
          error: null,
        };
      },
    },
    database: { from: () => query() },
  } as never,
}));

import { addEntry, deleteEntry, getEntries, getTombstones } from "../journal";
import { recordVisit, recordLastRead, getLocalProgress } from "../progress";
import {
  makeDebounced,
  ownerMismatch,
  getSyncOwner,
  getSyncStatus,
  syncNow,
  resolveOwnerMismatch,
  configureSyncTriggers,
  initSync,
} from "./engine";
import type { SyncTriggers } from "./engine";

const OWNER_KEY = "mindfulverse.sync.owner.v1";
const DIRTY_DEBOUNCE_MS = 3000;

// Always online; passive triggers never fire (these tests call syncNow directly).
const testTriggers: SyncTriggers = {
  isOnline: () => true,
  onForeground: () => () => {},
  onOnline: () => () => {},
};
configureSyncTriggers(testTriggers);

/** Let a fire-and-forget syncNow() run to completion (all stubs resolve at once). */
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  store.clear();
  currentUserId = "user-b";
  duringPush = null;
});

describe(makeDebounced, () => {
  it("coalesces bursts into one trailing call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const run = makeDebounced(fn, 3000);
    run();
    run();
    run();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(fn).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

describe(ownerMismatch, () => {
  it("is false with no stored owner (first ever sync)", () => {
    expect(ownerMismatch(null, "user-a")).toBeFalsy();
  });

  it("is false for the same account signing back in", () => {
    expect(ownerMismatch("user-a", "user-a")).toBeFalsy();
  });

  it("is true for a different account", () => {
    expect(ownerMismatch("user-a", "user-b")).toBeTruthy();
  });
});

describe("syncNow owner guard", () => {
  it("stamps the owner after a clean pass", async () => {
    await syncNow();
    expect(getSyncOwner()).toBe("user-b");
    expect(getSyncStatus()).toBe("synced");
  });

  it("refuses to touch local data when another account owns it", async () => {
    store.set(OWNER_KEY, "user-a");
    const entry = addEntry({ body: "b", prompt: "p" });
    await syncNow();
    expect(getSyncStatus()).toBe("switched-account");
    expect(getSyncOwner()).toBe("user-a"); // untouched
    expect(getEntries().map((e) => e.id)).toStrictEqual([entry.id]); // nothing pulled/wiped
  });
});

describe(resolveOwnerMismatch, () => {
  it('"merge" keeps local entries and adopts the current account', async () => {
    store.set(OWNER_KEY, "user-a");
    const entry = addEntry({ body: "b", prompt: "p" });
    await resolveOwnerMismatch("merge");
    expect(getSyncOwner()).toBe("user-b");
    expect(getEntries().map((e) => e.id)).toStrictEqual([entry.id]);
    expect(getSyncStatus()).toBe("synced");
  });

  it('"fresh" clears entries, tombstones and progress, then takes ownership', async () => {
    store.set(OWNER_KEY, "user-a");
    addEntry({ body: "b", prompt: "p" });
    store.set(
      "mindfulverse.journal.deleted.v1",
      JSON.stringify([{ deletedAt: 1, id: "x" }])
    );
    recordVisit();
    recordLastRead(2, 255);

    await resolveOwnerMismatch("fresh");

    expect(getEntries()).toStrictEqual([]);
    expect(getTombstones()).toStrictEqual([]);
    const p = getLocalProgress();
    expect(p.visits).toStrictEqual([]);
    expect(p.lastRead).toBeNull();
    expect(p.sessionProgress).toStrictEqual({});
    expect(p.surahTadabbur).toStrictEqual({});
    expect(getSyncOwner()).toBe("user-b");
  });

  it("does nothing but report signed-out when nobody is signed in", async () => {
    store.set(OWNER_KEY, "user-a");
    currentUserId = null;
    addEntry({ body: "b", prompt: "p" });
    await resolveOwnerMismatch("fresh");
    expect(getSyncStatus()).toBe("signed-out");
    expect(getEntries()).toHaveLength(1);
    expect(getSyncOwner()).toBe("user-a");
  });
});

describe("sync triggers", () => {
  it("reports offline without calling auth when the host says it is offline", async () => {
    configureSyncTriggers({ ...testTriggers, isOnline: () => false });
    authCalls = 0;
    await syncNow();
    expect(getSyncStatus()).toBe("offline");
    expect(authCalls).toBe(0);
    configureSyncTriggers(testTriggers);
  });

  it("initSync runs a pass now, on reconnect and on return to foreground", async () => {
    let fireOnline = () => {};
    let fireForeground = () => {};
    configureSyncTriggers({
      isOnline: () => true,
      onForeground: (cb) => {
        fireForeground = cb;
        return () => {};
      },
      onOnline: (cb) => {
        fireOnline = cb;
        return () => {};
      },
    });
    authCalls = 0;
    initSync();
    await settle();
    expect(authCalls).toBe(1);
    fireOnline();
    await settle();
    expect(authCalls).toBe(2);
    fireForeground();
    await settle();
    expect(authCalls).toBe(3);
    expect(getSyncStatus()).toBe("synced");
    configureSyncTriggers(testTriggers);
  });

  it("skips the debounced dirty sync while signed out, until an explicit syncNow", async () => {
    configureSyncTriggers(testTriggers);
    currentUserId = null;
    initSync();
    await settle();
    expect(getSyncStatus()).toBe("signed-out");
    authCalls = 0;

    vi.useFakeTimers();
    addEntry({ body: "b", prompt: "p" });
    await vi.advanceTimersByTimeAsync(DIRTY_DEBOUNCE_MS);
    expect(authCalls).toBe(0);

    currentUserId = "user-b";
    await syncNow(); // what the UI calls after sign-in
    expect(authCalls).toBe(1);
    addEntry({ body: "b2", prompt: "p" });
    await vi.advanceTimersByTimeAsync(DIRTY_DEBOUNCE_MS);
    expect(authCalls).toBe(2);
    vi.useRealTimers();
  });
});

describe("tombstone pruning", () => {
  it("keeps a delete made while the push was in flight", async () => {
    // Old enough to be pruned, so the pass rewrites the tombstone list.
    store.set(
      "mindfulverse.journal.deleted.v1",
      JSON.stringify([{ deletedAt: 1, id: "long-gone" }])
    );
    const entry = addEntry({ body: "b", prompt: "p" });
    duringPush = () => deleteEntry(entry.id);

    await syncNow();

    expect(getTombstones().map((t) => t.id)).toStrictEqual([entry.id]);
    expect(getEntries()).toStrictEqual([]);
  });
});
