import { loadSurahs } from "@mindfulverse/core/data";
import { useEffect, useState } from "react";

/** Surah number to transliterated name, for verse attributions. */
export function useSurahNames(): Map<number, string> {
  const [names, setNames] = useState<Map<number, string>>(() => new Map());
  useEffect(() => {
    let alive = true;
    loadSurahs()
      .then((list) => {
        if (alive) {
          setNames(new Map(list.map((s) => [s.number, s.name])));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return names;
}
