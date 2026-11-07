import type { SurahJournal } from "@mindfulverse/core/surahJournal";

import { buildJournalText } from "../Journal/journalText";
import type {
  ExportInput,
  ExportItem,
  ExportSection,
} from "../Journal/journalText";

/** The surah page as export sections, in page order: intention, verse by
 *  verse (each entry followed by its follow-ups), then the rest. A port of
 *  web's lib/surahJournalExport.ts; keep the two in step. */
export function surahJournalSections(
  page: SurahJournal,
  surahName: string,
  verses: Map<string, { arabic: string; translation: string }>
): ExportSection[] {
  const sections: ExportSection[] = [];
  if (page.intention) {
    sections.push({
      items: [{ entry: page.intention }],
      title: "My intention",
    });
  }
  const verseItems: ExportItem[] = [];
  for (const verse of page.verses) {
    const text = verses.get(verse.verseKey);
    let first = true;
    for (const { entry, followUps } of verse.items) {
      // Verse text once per verse, like the page.
      verseItems.push({
        arabic: first ? text?.arabic : undefined,
        entry,
        translation: first ? text?.translation : undefined,
        verseLabel: verse.verseKey,
      });
      first = false;
      for (const followUp of followUps) {
        verseItems.push({ entry: followUp });
      }
    }
  }
  if (verseItems.length > 0) {
    sections.push({ items: verseItems, title: "Verse by verse" });
  }
  if (page.also.length > 0) {
    sections.push({
      items: page.also.map((entry) => ({
        entry,
        verseLabel: entry.context?.ref,
      })),
      title: `Also written on ${surahName}`,
    });
  }
  return sections;
}

const NON_ALNUM = /[^a-z0-9]+/gu;
const EDGE_DASHES = /^-+|-+$/gu;

/** "Al-Baqarah" -> "mindfulverse-al-baqarah", the web's export file name. */
export function exportBaseName(surahName: string): string {
  const slug = surahName
    .toLowerCase()
    .replaceAll(NON_ALNUM, "-")
    .replaceAll(EDGE_DASHES, "");
  return `mindfulverse-${slug}`;
}

/** "A week on: Did it — note", as the web page shows a follow-up. */
export function followUpLine(
  answer: string | null,
  note: string,
  body: string
): string {
  if (!answer) {
    return `A week on: ${body}`;
  }
  return `A week on: ${answer}${note ? ` — ${note}` : ""}`;
}

/** The plain-text export under the page's own title: mobile's journalText
 *  formatter only writes the whole journal's heading. */
export function titledJournalText(input: ExportInput, title: string): string {
  const text = buildJournalText(input);
  return `MindfulVerse | ${title}${text.slice(text.indexOf("\n"))}`;
}
