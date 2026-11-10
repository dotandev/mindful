// A small in-memory throttle for focus-time circle requests. No React Native
// imports, so vitest runs it.

/** The same circle is not asked about again sooner than this. */
export const CIRCLE_REFETCH_MS = 2 * 60 * 1000;

export interface Throttle {
  /** True when `key` may be fetched at `now`, and records that it was. A key
   *  not seen before is always due. */
  due: (key: string, now: number) => boolean;
}

export function createThrottle(gapMs: number = CIRCLE_REFETCH_MS): Throttle {
  const last = new Map<string, number>();
  return {
    due(key, now) {
      const at = last.get(key);
      // A clock set backwards must not block fetching for good.
      if (at !== undefined && now >= at && now - at < gapMs) {
        return false;
      }
      last.set(key, now);
      return true;
    },
  };
}
