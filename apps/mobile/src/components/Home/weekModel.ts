// Pure logic for Home's week lines: the private rhythm and the circle count.
// No React Native imports, so vitest runs it.
import { circleCountLine } from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import { rhythmLabel, rhythmLine, weekRhythm } from "@mindfulverse/core/rhythm";
import type { JournalEntry } from "@mindfulverse/core/types";

export interface RhythmView {
  /** Oldest first; the last is today. */
  days: boolean[];
  line: string;
  label: string;
}

/** Null for a week with no entries: Home shows nothing at all. */
export function rhythmView(
  entries: JournalEntry[],
  now: Date
): RhythmView | null {
  const { days, count } = weekRhythm(entries, now);
  const line = rhythmLine(count);
  if (line === null) {
    return null;
  }
  return { days, label: rhythmLabel(count), line };
}

/** Null when there is no circle, the count is still loading or failed, or
 *  fewer than two people kept a reflection. */
export function circleCountText(
  circle: Pick<Circle, "name"> | null,
  count: number | null
): string | null {
  if (!circle || count === null) {
    return null;
  }
  return circleCountLine(circle.name, count);
}
