import type { DueFollowUp } from "@mindfulverse/core/followUps";
import type { JournalEntry } from "@mindfulverse/core/types";

export const ACK_TEXT = "Kept. May it stay with you.";

/** "Al-Baqarah 2:255", or the bare verse key while names are loading. */
export function followUpHeading(
  verseKey: string,
  surahNames: Map<number, string>
): string {
  const name = surahNames.get(Number(verseKey.split(":")[0]));
  return name ? `${name} ${verseKey}` : verseKey;
}

/** False once the reflection was deleted or answered elsewhere since the card was picked. */
export function followUpStillOpen(
  entries: JournalEntry[],
  due: DueFollowUp
): boolean {
  return (
    entries.some((e) => e.id === due.entry.id) &&
    !entries.some(
      (e) => e.context?.kind === "followup" && e.context.ref === due.entry.id
    )
  );
}
