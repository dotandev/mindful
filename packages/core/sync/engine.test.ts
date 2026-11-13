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

interface Row {
  id: string;
  prompt: string;
  body: string;
  context_kind: string | null;
  context_ref: string | null;
  created_at: number;
  deleted_at?: number | null;
}
/** What the signed-in account already holds remotely. */
let remoteJournal: Row[] = [];
/** Ids taken by some other account: inserting one fails with 23505. */
let foreignIds = new Set<string>();
/** Rows accepted by journal_entries inserts, in order. */
let inserted: Row[] = [];

const DUPLICATE = { code: "23505", message: "duplicate key value" };

/** Every query builder method chains; awaiting one yields the stubbed result. */
function query(table: string): Record<string, unknown> {
  let result: { data: unknown; error: unknown } = { data: [], error: null };
  const chain: Record<string, unknown> = {
    // oxlint-disable-next-line unicorn/no-thenable -- stands in for the SDK's awaitable builder
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve(result),
  };
  for (const m of ["select", "eq", "order", "update", "delete", "limit"]) {
    chain[m] = () => chain;
  }
  chain.range = (from: number) => {
    if (table === "journal_entries" && from === 0) {
      result = { data: remoteJournal, error: null };
    }
    return chain;
  };
  chain.insert = (rows: Row[]) => {
    if (table === "journal_entries") {
      const taken = new Set([
        ...foreignIds,
        ...remoteJournal.map((r) => r.id),
        ...inserted.map((r) => r.id),
      ]);
      if (rows.some((r) => taken.has(r.id))) {
        result = { data: null, error: DUPLICATE };
      } else {
        inserted.push(...rows);
      }
    }
    return chain;
  };
  chain.maybeSingle = () => ({
    // oxlint-disable-next-line unicorn/no-thenable -- stands in for the SDK's awaitable builder
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
    database: { from: (table: string) => query(table) },
  } as never,
}));

import {
  dueFollowUp,
  loadFollowUpState,
  saveFollowUpState,
  skipFollowUp,
} from "../followUps";
import { addEntry, deleteEntry, getEntries, getTombstones } from "../journal";
import { recordVisit, recordLastRead, getLocalProgress } from "../progress";
import { formatTadabburBody } from "../tadabburBody";
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
const DAY_MS = 86_400_000;

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
  remoteJournal = [];
  foreignIds = new Set();
  inserted = [];
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
    addEntry({ body: "b", prompt: "p" });
    await resolveOwnerMismatch("merge");
    expect(getSyncOwner()).toBe("user-b");
    expect(getEntries().map((e) => e.body)).toStrictEqual(["b"]);
    expect(getSyncStatus()).toBe("synced");
  });

  it('"merge" uploads entries already synced by the other account under new ids', async () => {
    store.set(OWNER_KEY, "user-a");
    const first = addEntry({ body: "one", prompt: "p" });
    const second = addEntry({ body: "two", prompt: "p" });
    // Both ids already belong to user A's rows on the server.
    foreignIds = new Set([first.id, second.id]);

    await resolveOwnerMismatch("merge");

    expect(getSyncStatus()).toBe("synced");
    expect(inserted.map((r) => r.body).sort()).toStrictEqual(["one", "two"]);
    for (const row of inserted) {
      expect(foreignIds.has(row.id)).toBeFalsy();
    }
    // The device now holds exactly what was uploaded.
    expect(
      getEntries()
        .map((e) => e.id)
        .sort()
    ).toStrictEqual(inserted.map((r) => r.id).sort());

    // A later pass has nothing left to retry.
    remoteJournal = inserted.map((r) => ({ ...r, deleted_at: null }));
    inserted = [];
    await syncNow();
    expect(inserted).toStrictEqual([]);
    expect(getSyncStatus()).toBe("synced");
  });

  it('"merge" keeps follow-up answers and skips pointing at their entries', async () => {
    store.set(OWNER_KEY, "user-a");
    const action = addEntry({
      body: formatTadabburBody({ action: "call my mother", reflection: "r" }),
      context: { kind: "tadabbur", ref: "2:83" },
      prompt: "p",
    });
    const answer = addEntry({
      body: "Yes",
      context: { kind: "followup", ref: action.id },
      prompt: "How did it go? (2:83)",
    });
    const skipped = addEntry({
      body: formatTadabburBody({ action: "give charity", reflection: "r" }),
      context: { kind: "tadabbur", ref: "2:271" },
      prompt: "p",
    });
    const skippedAt = new Date(Date.now() + 7 * DAY_MS);
    saveFollowUpState(skipFollowUp(loadFollowUpState(), skipped.id, skippedAt));
    foreignIds = new Set([action.id, answer.id, skipped.id]);

    await resolveOwnerMismatch("merge");

    const entries = getEntries();
    const newAction = entries.find((e) => e.context?.ref === "2:83");
    const newAnswer = entries.find((e) => e.context?.kind === "followup");
    const newSkipped = entries.find((e) => e.context?.ref === "2:271");
    expect(newAction?.id).not.toBe(action.id);
    expect(newAnswer?.context?.ref).toBe(newAction?.id);
    expect(
      inserted.find((r) => r.context_kind === "followup")?.context_ref
    ).toBe(newAction?.id);
    expect(loadFollowUpState().skipped).toStrictEqual({
      [newSkipped?.id ?? ""]: skippedAt.getTime(),
    });
    // Nothing is asked again: one is answered, the other is still skipped.
    const state = { ...loadFollowUpState(), lastActedDay: null };
    expect(
      dueFollowUp(entries, new Date(Date.now() + 8 * DAY_MS), state)
    ).toBeNull();
    // Without the remap the skipped entry would be asked about again.
    expect(
      dueFollowUp(entries, new Date(Date.now() + 8 * DAY_MS), {
        lastActedDay: null,
        skipped: {},
      })?.entry.id
    ).toBe(newSkipped?.id);
  });

  it('"merge" does not duplicate entries the account already holds', async () => {
    store.set(OWNER_KEY, "user-a");
    const entry = addEntry({ body: "same", prompt: "p" });
    // The account has the same reflection under its own id.
    remoteJournal = [
      {
        body: "same",
        context_kind: null,
        context_ref: null,
        created_at: entry.createdAt,
        deleted_at: null,
        id: "account-copy",
        prompt: "p",
      },
    ];
    foreignIds = new Set([entry.id]);

    await resolveOwnerMismatch("merge");

    expect(inserted).toStrictEqual([]);
    expect(getEntries().map((e) => e.id)).toStrictEqual(["account-copy"]);
    expect(getSyncStatus()).toBe("synced");
  });
});

describe("push duplicate keys", () => {
  it("reports a duplicate id that is not in this account as a failure", async () => {
    const entry = addEntry({ body: "b", prompt: "p" });
    foreignIds = new Set([entry.id]);

    await syncNow();

    expect(getSyncStatus()).toBe("error");
    expect(inserted).toStrictEqual([]);
  });

  it("re-keys the entry on the next pass so it does reach the account", async () => {
    const entry = addEntry({ body: "b", prompt: "p" });
    foreignIds = new Set([entry.id]);
    await syncNow();

    await syncNow();

    expect(getSyncStatus()).toBe("synced");
    expect(inserted.map((r) => r.body)).toStrictEqual(["b"]);
    expect(inserted[0].id).not.toBe(entry.id);
    expect(getEntries().map((e) => e.id)).toStrictEqual([inserted[0].id]);
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
