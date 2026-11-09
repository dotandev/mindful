// The surah a person's study circle is reading, set by opening the circle's
// invite link (/circle/<n>). Device-local: it shapes Home's first suggestion.

const KEY = "mindfulverse.circleSurah.v1";

/** Short surahs offered when no circle link has been opened. */
export const STARTER_SURAHS = [1, 103, 93, 94] as const;

export interface CircleSurah {
  surah: number;
  setAt: number;
}

export function parseSurahNumber(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw) : raw;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 114
    ? n
    : null;
}

export function getCircleSurah(): CircleSurah | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CircleSurah>;
    const surah = parseSurahNumber(parsed.surah);
    return surah === null ? null : { setAt: Number(parsed.setAt) || 0, surah };
  } catch {
    return null;
  }
}

/** Remembers the circle's surah. Returns the stored surah, or null when the
 *  value isn't a surah number. */
export function setCircleSurah(
  raw: unknown,
  now: Date = new Date()
): number | null {
  const surah = parseSurahNumber(raw);
  if (surah === null) {
    return null;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ setAt: now.getTime(), surah }));
  } catch {
    return surah;
  }
  return surah;
}
