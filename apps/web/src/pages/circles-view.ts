import { circlePath, normalizeName } from "@mindfulverse/core/circles";
import type { CircleDraft } from "@mindfulverse/core/circles";

export const PRIVACY_LINE =
  "Your reflections stay private. A circle only shares which surah or verse you're reading together.";

const TRAILING_SLASHES = /\/+$/u;

/** The link a circle's owner shares: "<origin>/circle/<code>". */
export function circleShareUrl(origin: string, code: string): string {
  return `${origin.replace(TRAILING_SLASHES, "")}${circlePath(code)}`;
}

/** The message sent with the link. */
export function circleShareMessage(
  circle: { name: string; verse: number | null },
  surahName: string,
  url: string
): string {
  const focus =
    circle.verse === null ? "" : `, starting at verse ${circle.verse}`;
  return `Join “${circle.name}” on MindfulVerse. We’re reading ${surahName} together${focus}.\n${url}`;
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** "Reading Al-Kahf · Focus: verse 10". */
export function circleSummary(
  circle: { verse: number | null },
  surahName: string
): string {
  return circle.verse === null
    ? `Reading ${surahName}`
    : `Reading ${surahName} · Focus: verse ${circle.verse}`;
}

export interface CircleFormValues {
  name: string;
  surah: string;
  verse: string;
}

export type DraftCheck =
  | { ok: true; draft: CircleDraft }
  | { ok: false; message: string };

/** Checks the form against the chosen surah's verse count. */
export function checkCircleForm(
  values: CircleFormValues,
  verseCount: (surah: number) => number | undefined
): DraftCheck {
  const name = normalizeName(values.name);
  if (name === null) {
    return { message: "Give the circle a name.", ok: false };
  }
  const surah = Number(values.surah);
  const count = verseCount(surah);
  if (!Number.isInteger(surah) || count === undefined) {
    return { message: "Choose a surah.", ok: false };
  }
  const rawVerse = values.verse.trim();
  if (rawVerse === "") {
    return { draft: { name, surah, verse: null }, ok: true };
  }
  const verse = Number(rawVerse);
  if (!Number.isInteger(verse) || verse < 1 || verse > count) {
    const length = count === 1 ? "1 verse" : `${count} verses`;
    const range = count === 1 ? "verse 1" : `a verse from 1 to ${count}`;
    return {
      message: `This surah has ${length}. Choose ${range}, or leave it empty.`,
      ok: false,
    };
  }
  return { draft: { name, surah, verse }, ok: true };
}
