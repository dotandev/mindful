// The anonymous "N in <circle> reflected this week." line (no name where the
// circle is already named above it),
// fetched when the screen gains focus, at most once every two minutes per
// circle; in between the last answer is shown. Null while loading, on error,
// or below two people.
import { fetchCircleWeekCount } from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { circleCountText } from "../Home/weekModel";
import { createThrottle } from "./throttle";

// Shared by every screen showing a count, so Home and Circles don't each ask.
const throttle = createThrottle();
const lastCounts = new Map<string, Promise<number | null>>();

export function useCircleCountLine(
  circle: Pick<Circle, "code" | "name"> | null,
  { named = true }: { named?: boolean } = {}
): string | null {
  const code = circle?.code ?? null;
  const [count, setCount] = useState<{ code: string; n: number | null }>();

  useFocusEffect(
    useCallback(() => {
      if (!code) {
        return;
      }
      if (throttle.due(code, Date.now())) {
        lastCounts.set(code, fetchCircleWeekCount(code));
      }
      let alive = true;
      void lastCounts.get(code)?.then((n) => {
        if (alive) {
          setCount({ code, n });
        }
      });
      return () => {
        alive = false;
      };
    }, [code])
  );

  // A count fetched for a previous circle is never shown for this one.
  return circleCountText(circle, count?.code === code ? count.n : null, named);
}
