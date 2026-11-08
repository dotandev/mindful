import { getEntries, JOURNAL_SAVED_EVENT } from "@mindfulverse/core/journal";
import { rhythmLabel, rhythmLine, weekRhythm } from "@mindfulverse/core/rhythm";
import type { WeekRhythm as Rhythm } from "@mindfulverse/core/rhythm";
import { onSyncStatus } from "@mindfulverse/core/sync/engine";
import { useEffect, useState } from "react";

import "./week.css";

const DAY_KEYS = ["d6", "d5", "d4", "d3", "d2", "d1", "d0"] as const;

const compute = (): Rhythm => weekRhythm(getEntries(), new Date());

/** Private: computed from this device's journal, never sent anywhere. */
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
  return (
    <section aria-label="Your week" className="week-rhythm">
      <span
        role="img"
        aria-label={rhythmLabel(rhythm.count)}
        className="week-rhythm-dots"
      >
        {rhythm.days.map((kept, i) => (
          <i
            key={DAY_KEYS[i]}
            aria-hidden="true"
            className={kept ? "on" : undefined}
          />
        ))}
      </span>
      <p className="week-rhythm-line">{line}</p>
    </section>
  );
}
