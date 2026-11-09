// Private weekly rhythm: which of the last seven local days have a journal
// entry. Computed on the device only and never sent anywhere. Nothing here
// breaks or counts down; a quiet week simply shows nothing.
import { localDay } from "./installId";
import type { JournalEntry } from "./types";

export const RHYTHM_DAYS = 7;

export interface WeekRhythm {
  /** Oldest first; the last element is today (local days). */
  days: boolean[];
  /** Days with at least one entry. */
  count: number;
}

export function weekRhythm(entries: JournalEntry[], now: Date): WeekRhythm {
  const kept = new Set(
    entries.map((entry) => localDay(new Date(entry.createdAt)))
  );
  const days: boolean[] = [];
  for (let back = RHYTHM_DAYS - 1; back >= 0; back -= 1) {
    // Calendar arithmetic, not 24h steps, so DST days stay one local day.
    const day = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - back
    );
    days.push(kept.has(localDay(day)));
  }
  return { count: days.filter(Boolean).length, days };
}

/** Null for a week with no entries: show nothing rather than a zero. */
export function rhythmLine(count: number): string | null {
  if (!Number.isFinite(count) || count < 1) {
    return null;
  }
  const n = Math.min(Math.floor(count), RHYTHM_DAYS);
  return `You kept reflections on ${n} ${n === 1 ? "day" : "days"} this week.`;
}

/** Screen-reader label for the seven dots. */
export function rhythmLabel(count: number): string {
  return `Reflections on ${count} of the last ${RHYTHM_DAYS} days`;
}
