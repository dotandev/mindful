// Pure logic for Home's lead card and "Or ponder a theme" (web:
// apps/web/src/pages/Home.tsx). No React Native imports, so vitest runs it.
import type { Circle } from "@mindfulverse/core/circles";
import {
  parseSurahNumber,
  STARTER_SURAHS,
} from "@mindfulverse/core/circleSurah";
import type { SessionProgress } from "@mindfulverse/core/progress";
import type { SurahMeta, TadabburSession } from "@mindfulverse/core/types";

import type { VersePos } from "./homeModel";

export const BEGIN_TITLE = "Begin with a surah";
export const BEGIN_LINE =
  "Write why you’re reading, ponder it verse by verse with Ibn Kathir, and keep a page for it. A week later, we’ll ask how your action went.";

export const CIRCLE_EYEBROW = "Your circle is reading";
export const namedEyebrow = (name: string): string => `${name} is reading`;
export const focusLine = (verse: number): string => `Focus: verse ${verse}`;

/** "Go to verse 10" when the circle has a focus verse, else "Begin Al-Kahf". */
export function namedAction(surahTitle: string, verse: number | null): string {
  return verse === null ? `Begin ${surahTitle}` : `Go to verse ${verse}`;
}

export const STARTERS_HEADING = "Short surahs to begin with";

/** What Home's lead card offers, most specific first. */
export type Lead =
  | { kind: "continue"; surah: number; ayah: number }
  | { kind: "named"; name: string; surah: number; verse: number | null }
  | { kind: "circle"; surah: number }
  | { kind: "starters"; surahs: readonly number[] };

/** A surah tadabbur in progress beats the joined circle, which beats an old
 *  numeric circle link's surah, which beats the short starter surahs. A
 *  circle value that isn't a surah number is ignored. */
export function chooseLead(
  deeper: VersePos | null,
  circleSurah: unknown,
  joined: Pick<Circle, "name" | "surah" | "verse"> | null = null
): Lead {
  if (deeper) {
    return { ayah: deeper.ayah, kind: "continue", surah: deeper.surah };
  }
  if (joined) {
    return {
      kind: "named",
      name: joined.name,
      surah: joined.surah,
      verse: joined.verse,
    };
  }
  const circle = parseSurahNumber(circleSurah);
  if (circle !== null) {
    return { kind: "circle", surah: circle };
  }
  return { kind: "starters", surahs: STARTER_SURAHS };
}

export function surahName(
  surah: number,
  surahs: Map<number, SurahMeta>
): string {
  return surahs.get(surah)?.name ?? `Surah ${surah}`;
}

/** "Al-'Asr · 3 verses"; just the name until the surah list has loaded. */
export function starterLabel(
  surah: number,
  surahs: Map<number, SurahMeta>
): string {
  const meta = surahs.get(surah);
  if (!meta) {
    return surahName(surah, surahs);
  }
  const verses = meta.ayahCount === 1 ? "1 verse" : `${meta.ayahCount} verses`;
  return `${meta.name} · ${verses}`;
}

export const THEME_PICKS = 3;

export function continueTitle(
  surah: number,
  surahNames: Map<number, string>
): string {
  return `Continue ${surahNames.get(surah) ?? `Surah ${surah}`}`;
}

export interface ThemePick {
  id: string;
  title: string;
}

/** Up to `n` sessions in data order, unfinished ones first. */
export function themePicks(
  sessions: TadabburSession[],
  progress: Record<string, SessionProgress>,
  n: number = THEME_PICKS
): ThemePick[] {
  const done = (s: TadabburSession) =>
    progress[s.id]?.completedAt !== undefined;
  return [...sessions.filter((s) => !done(s)), ...sessions.filter(done)]
    .slice(0, n)
    .map(({ id, title }) => ({ id, title }));
}
