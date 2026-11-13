import { verseId } from "@mindfulverse/core/divisions";
import { getLastRead } from "@mindfulverse/core/progress";
import { useLayoutEffect, useRef } from "react";

const AFTER_POPSTATE_MS = 30;

/** A verse's element in either reader view. Surah pages use plain "v{ayah}"
 *  ids in the translation view; `pageSurah` names the surah those belong to. */
export function findVerseElement(
  surah: number,
  ayah: number,
  pageSurah: number | null
): HTMLElement | null {
  return (
    document.getElementById(verseId(surah, ayah)) ??
    (surah === pageSurah ? document.getElementById(`v${ayah}`) : null)
  );
}

/** Switching Translation / Reading re-renders every verse at a new height.
 *  Call the returned function just before the switch: the last-read verse
 *  then stays where it was on screen. */
export function useHoldVerse(
  view: unknown,
  pageSurah: number | null
): () => void {
  const held = useRef<{ surah: number; ayah: number; top: number } | null>(
    null
  );

  useLayoutEffect(() => {
    const at = held.current;
    if (!at) {
      return;
    }
    const restore = () => {
      const el = findVerseElement(at.surah, at.ayah, pageSurah);
      if (el) {
        window.scrollBy(0, el.getBoundingClientRect().top - at.top);
      }
    };
    restore();
    // The settings sheet steps history back as it closes, and the browser
    // then restores the old scroll offset. Put the verse back once after it.
    let timer: number | undefined;
    const onPop = () => {
      timer = window.setTimeout(restore, AFTER_POPSTATE_MS);
    };
    window.addEventListener("popstate", onPop, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
    };
  }, [view, pageSurah]);

  return () => {
    const last = getLastRead();
    const el = last && findVerseElement(last.surah, last.ayah, pageSurah);
    held.current =
      last && el
        ? {
            ayah: last.ayah,
            surah: last.surah,
            top: el.getBoundingClientRect().top,
          }
        : null;
  };
}
