import type { SurahMeta } from "@mindfulverse/core/types";

/** The name Home shows for a surah, before or after the surah list loads. */
export function surahLabel(surah: number, meta: SurahMeta | undefined): string {
  return meta?.name ?? `Surah ${surah}`;
}

/** A starter surah's button text: just its name, "Al-'Asr". */
export function starterLabel(
  surah: number,
  meta: SurahMeta | undefined
): string {
  return surahLabel(surah, meta);
}

export type LeadKind = "continue" | "circle" | "circle-surah" | "starters";

/** Which suggestion Home leads with: a surah in progress, then the joined
 *  circle, then an old numeric circle link, then the short starters. */
export function chooseLead(state: {
  inProgress: boolean;
  joinedCircle: boolean;
  circleSurah: boolean;
}): LeadKind {
  if (state.inProgress) {
    return "continue";
  }
  if (state.joinedCircle) {
    return "circle";
  }
  if (state.circleSurah) {
    return "circle-surah";
  }
  return "starters";
}

interface CircleFocus {
  surah: number;
  verse: number | null;
}

/** Drops a focus verse past the end of the surah, so Home never links to a
 *  verse that does not exist. Kept as is until the verse count is known. */
export function circleFocus(
  circle: CircleFocus,
  verseCount: number | undefined
): CircleFocus {
  const outOfRange =
    circle.verse !== null &&
    verseCount !== undefined &&
    circle.verse > verseCount;
  return outOfRange ? { surah: circle.surah, verse: null } : circle;
}

/** The tadabbur page for a circle's surah, at its focus verse when set. */
export function circleStartPath(circle: CircleFocus): string {
  return circle.verse === null
    ? `/tadabbur/${circle.surah}`
    : `/tadabbur/${circle.surah}?v=${circle.verse}`;
}

/** Where a circle's lead button goes, and what it says. */
export function circleBeginAction(
  circle: CircleFocus,
  surahName: string
): { to: string; label: string } {
  const label =
    circle.verse === null
      ? `Begin ${surahName}`
      : `Go to verse ${circle.verse}`;
  return { label, to: circleStartPath(circle) };
}
