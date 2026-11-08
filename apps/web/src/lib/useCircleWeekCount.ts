import { fetchCircleWeekCount } from "@mindfulverse/core/circles";
import { useEffect, useState } from "react";

interface Fetched {
  code: string;
  count: number | null;
}

/** The circle's weekly reflection count, refetched when the page becomes
 *  visible. Null while loading, on error, or without a code. */
export function useCircleWeekCount(code: string | null): number | null {
  const [fetched, setFetched] = useState<Fetched | null>(null);

  useEffect(() => {
    if (!code) {
      return;
    }
    let active = true;
    const load = () => {
      void fetchCircleWeekCount(code).then((count) => {
        if (active) {
          setFetched({ code, count });
        }
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code]);

  return fetched && fetched.code === code ? fetched.count : null;
}
