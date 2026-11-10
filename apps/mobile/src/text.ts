// Small text helpers shared by the reader, tadabbur and theme sessions. No
// React Native imports, so vitest runs it.

/** Blank-line separated paragraphs, trimmed, empties dropped. */
export function splitParagraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
}
