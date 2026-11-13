import { surahJournal } from "@mindfulverse/core/surahJournal";
import type { JournalEntry } from "@mindfulverse/core/types";

export function currentIntention(
  entries: JournalEntry[],
  surah: number
): string | null {
  return surahJournal(entries, surah).intention?.body ?? null;
}

export function hasSurahPage(entries: JournalEntry[], surah: number): boolean {
  return !surahJournal(entries, surah).isEmpty;
}

/** The journal entry an intention becomes (same prompt/context as web), or
 *  null when the draft is blank. */
export function composeIntention(
  surah: number,
  surahName: string,
  draft: string
): {
  body: string;
  context: { kind: "intention"; ref: string };
  prompt: string;
} | null {
  const body = draft.trim();
  if (!body) {
    return null;
  }
  return {
    body,
    context: { kind: "intention", ref: String(surah) },
    prompt: `Why I'm reading ${surahName}`,
  };
}

/** What a surah's own journal page is called, in links and as its heading. */
export function surahPageLabel(name: string): string {
  return `Your page on ${name}`;
}

export function surahPageHref(surah: number): `/tadabbur/journal/${number}` {
  return `/tadabbur/journal/${surah}`;
}
