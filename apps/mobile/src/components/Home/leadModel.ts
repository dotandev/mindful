// Pure logic for Home's lead card and "Or ponder a theme" (web:
// apps/web/src/pages/Home.tsx). No React Native imports, so vitest runs it.
import type { SessionProgress } from "@mindfulverse/core/progress";
import type { TadabburSession } from "@mindfulverse/core/types";

export const BEGIN_TITLE = "Begin with a surah";
export const BEGIN_LINE =
  "Write why you’re reading, ponder it verse by verse with Ibn Kathir, and keep a page for it. A week later, we’ll ask how your action went.";

export interface SuggestedSurah {
  number: number;
  name: string;
}

/** Short surahs a first tadabbur can finish in one sitting. */
export const SUGGESTED_SURAHS: readonly SuggestedSurah[] = [
  { name: "Al-'Asr", number: 103 },
  { name: "Ash-Sharh", number: 94 },
];

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
