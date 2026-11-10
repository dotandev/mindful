import type { AnalyticsEvent } from "@mindfulverse/core/analytics";

export interface CheckinTally {
  /** Visits to the check-in page. */
  checkins: number;
  /** Feeling taps, by feeling. */
  emotions: Map<string, number>;
}

/** `checkin_view` fires once when the page opens and once per feeling tap
 *  (with `emotion`). Only the plain ones are check-ins; the rest feed the
 *  feelings tally. */
export function tallyCheckins(events: AnalyticsEvent[]): CheckinTally {
  let checkins = 0;
  const emotions = new Map<string, number>();
  for (const e of events) {
    if (e.type !== "checkin_view") {
      continue;
    }
    if (e.emotion) {
      emotions.set(e.emotion, (emotions.get(e.emotion) ?? 0) + 1);
    } else {
      checkins += 1;
    }
  }
  return { checkins, emotions };
}
