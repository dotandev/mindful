import type { SurahMeta } from "@mindfulverse/core/types";

/** The name Home shows for a surah, before or after the surah list loads. */
export function surahLabel(surah: number, meta: SurahMeta | undefined): string {
  return meta?.name ?? `Surah ${surah}`;
}

/** A starter surah's button text: "Al-'Asr · 3 verses". */
export function starterLabel(
  surah: number,
  meta: SurahMeta | undefined
): string {
  const name = surahLabel(surah, meta);
  if (!meta) {
    return name;
  }
  const verses = meta.ayahCount === 1 ? "verse" : "verses";
  return `${name} · ${meta.ayahCount} ${verses}`;
}
