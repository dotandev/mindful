// Pure logic for Home's week lines: the private rhythm and the circle count.
// No React Native imports, so vitest runs it.
import { circleCountLine } from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import { rhythmLine, weekRhythm } from "@mindfulverse/core/rhythm";
import type { JournalEntry } from "@mindfulverse/core/types";

export interface RhythmView {
  line: string;
}

/** Null for a week with no entries: Home shows nothing at all. */
export function rhythmView(
  entries: JournalEntry[],
  now: Date
): RhythmView | null {
  const { count } = weekRhythm(entries, now);
  const line = rhythmLine(count);
  if (line === null) {
    return null;
  }
  return { line };
}

/** Null when there is no circle, the count is still loading or failed, or
 *  fewer than two people kept a reflection. */
export function circleCountText(
  circle: Pick<Circle, "name"> | null,
  count: number | null,
  named = true
): string | null {
  if (!circle || count === null) {
    return null;
  }
  return circleCountLine(named ? circle.name : null, count);
}
