// Port of the matching in apps/web/src/pages/Search.tsx, kept pure so it can
// be tested without React Native.
import { parseVerseKey } from "@mindfulverse/core/data";

export const MAX_RESULTS = 50;
export const MIN_QUERY_LENGTH = 2;
const SNIPPET_RADIUS = 90;

export type SearchIndex = [string, string][];

export interface SearchResult {
  verseKey: string;
  surah: number;
  ayah: number;
  snippet: string;
}

export interface SearchOutcome {
  term: string;
  results: SearchResult[];
  capped: boolean;
}

export interface Segment {
  text: string;
  match: boolean;
}

const REGEXP_SPECIALS = /[.*+?^${}()|[\]\\]/gu;
const CURLY_APOSTROPHES = /[’‘]/gu;

function escapeRegExp(s: string): string {
  return s.replaceAll(REGEXP_SPECIALS, "\\$&");
}

/** Same-length replacement, so match offsets stay valid against the original. */
function normApostrophes(s: string): string {
  return s.replaceAll(CURLY_APOSTROPHES, "'");
}

export function normalizeQuery(raw: string): string {
  return raw.trim().replaceAll(/\s+/gu, " ");
}

export function isSearchable(term: string): boolean {
  return normalizeQuery(term).length >= MIN_QUERY_LENGTH;
}

/** Trim a long translation to a window around the first match, snapped to
 *  word boundaries. */
export function makeSnippet(
  text: string,
  matchIndex: number,
  matchLength: number
): string {
  if (text.length <= SNIPPET_RADIUS * 2 + matchLength) {
    return text;
  }
  let start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  let end = Math.min(text.length, matchIndex + matchLength + SNIPPET_RADIUS);
  if (start > 0) {
    const sp = text.indexOf(" ", start);
    if (sp !== -1 && sp < matchIndex) {
      start = sp + 1;
    }
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(" ", end);
    if (sp > matchIndex + matchLength) {
      end = sp;
    }
  }
  const lead = start > 0 ? "…" : "";
  const tail = end < text.length ? "…" : "";
  return `${lead}${text.slice(start, end)}${tail}`;
}

/** Case-insensitive substring search; whole-word matches rank first. */
export function runSearch(index: SearchIndex, raw: string): SearchOutcome {
  const term = normalizeQuery(raw);
  const q = normApostrophes(term).toLowerCase();
  if (!q) {
    return { capped: false, results: [], term };
  }
  const wordRe = new RegExp(`\\b${escapeRegExp(q)}\\b`, "iu");
  const exact: SearchResult[] = [];
  const partial: SearchResult[] = [];
  let total = 0;

  for (const [verseKey, translation] of index) {
    const plain = normApostrophes(translation);
    const at = plain.toLowerCase().indexOf(q);
    if (at === -1) {
      continue;
    }
    total += 1;
    const bucket = wordRe.test(plain) ? exact : partial;
    const unreachable = exact.length >= MAX_RESULTS && bucket === partial;
    if (unreachable || bucket.length >= MAX_RESULTS) {
      continue;
    }
    const { surah, ayah } = parseVerseKey(verseKey);
    bucket.push({
      ayah,
      snippet: makeSnippet(translation, at, q.length),
      surah,
      verseKey,
    });
  }

  const results = [...exact, ...partial].slice(0, MAX_RESULTS);
  return { capped: total > MAX_RESULTS, results, term };
}

/** Split a snippet into plain and matching runs, case-insensitively, with
 *  curly and straight apostrophes treated alike. */
export function highlightSegments(snippet: string, term: string): Segment[] {
  const q = normalizeQuery(term);
  if (!q) {
    return [{ match: false, text: snippet }];
  }
  const pattern = escapeRegExp(normApostrophes(q)).replaceAll("'", "['’‘]");
  const parts = snippet.split(new RegExp(`(${pattern})`, "giu"));
  const segments: Segment[] = [];
  for (const [i, text] of parts.entries()) {
    if (text) {
      segments.push({ match: i % 2 === 1, text });
    }
  }
  return segments;
}

export function resultCountLabel(outcome: SearchOutcome): string {
  if (outcome.capped) {
    return `Showing the first ${MAX_RESULTS} verses`;
  }
  const n = outcome.results.length;
  return `${n} ${n === 1 ? "verse" : "verses"}`;
}
