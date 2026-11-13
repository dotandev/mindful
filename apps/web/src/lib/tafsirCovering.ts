/** Ibn Kathir comments on passages: a run of ayahs stores its commentary under
 *  the first ayah of the group. Given a surah's ascending list of ayahs that
 *  carry an entry, find the one covering this ayah. */
export function coveringAyah(indexed: number[], ayah: number): number | null {
  let best: number | null = null;
  for (const n of indexed) {
    if (n <= ayah) {
      best = n;
    } else {
      break;
    }
  }
  return best;
}
