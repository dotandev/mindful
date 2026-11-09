import { getEntries, JOURNAL_SAVED_EVENT } from "@mindfulverse/core/journal";
import { rhythmLine, weekRhythm } from "@mindfulverse/core/rhythm";
import type { WeekRhythm as Rhythm } from "@mindfulverse/core/rhythm";
import { onSyncStatus } from "@mindfulverse/core/sync/engine";
import { useEffect, useState } from "react";

import "./week.css";

const compute = (): Rhythm => weekRhythm(getEntries(), new Date());

/** One quiet line ("You kept reflections on 3 days this week."). The day
 *  count under the greeting already has the dots. Private: computed from this
 *  device's journal, never sent anywhere. */
export default function WeekRhythm() {
  const [rhythm, setRhythm] = useState<Rhythm>(compute);

  useEffect(() => {
    const recompute = () => setRhythm(compute());
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        recompute();
      }
    };
    const off = onSyncStatus((status) => {
      if (status === "synced") {
        recompute();
      }
    });
    recompute();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(JOURNAL_SAVED_EVENT, recompute);
    return () => {
      off();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(JOURNAL_SAVED_EVENT, recompute);
    };
  }, []);

  const line = rhythmLine(rhythm.count);
  if (line === null) {
    return null;
  }
  return <p className="week-rhythm">{line}</p>;
}
