import type { Length, Word } from './types.js';
import { letters } from './normalise.js';

/**
 * Browsing the word list — the "answer key". Everything the game can ask, readable
 * outside a round, so the app works as a vocabulary trainer and not only as a puzzle.
 *
 * This cannot spoil the daily puzzle: knowing all 63 five-letter answers does not tell
 * you which one today is.
 */

export interface VocabularyFilter {
  /** Free text over the German word, the English gloss, the definition and the topic. */
  query?: string;
  /** Restrict to one word length, or every length when absent. */
  length?: Length;
  level?: 'A1' | 'A2';
}

/**
 * Fold a string for searching: lowercase, and umlauts to their base letters, so that
 * typing `kase` finds `Käse` and `strasse` finds `Straße`.
 *
 * SEARCH ONLY. Never use this on the guess path: there, `ä` and `a` are different
 * letters and folding them would break the game (see core/normalise.ts).
 */
export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
}

function haystack(word: Word): string {
  return foldForSearch(
    [word.display, word.article ?? '', word.plural ?? '', word.definition_en, word.definition_de, word.topic]
      .join(' '),
  );
}

/** Filter and sort the vocabulary for display. Alphabetical by German word. */
export function searchVocabulary(words: readonly Word[], filter: VocabularyFilter = {}): Word[] {
  const needle = filter.query ? foldForSearch(filter.query.trim()) : '';

  return words
    .filter((word) => {
      if (!word.answer) return false;
      if (filter.length !== undefined && letters(word.lemma).length !== filter.length) return false;
      if (filter.level !== undefined && word.level !== filter.level) return false;
      if (needle.length > 0 && !haystack(word).includes(needle)) return false;
      return true;
    })
    .sort((a, b) => a.display.localeCompare(b.display, 'de'));
}

/**
 * A change to a filter. Distinct from `VocabularyFilter` because clearing a filter
 * means passing an explicit `undefined`, which `exactOptionalPropertyTypes` forbids
 * on the filter type itself.
 */
export type VocabularyFilterPatch = {
  query?: string | undefined;
  length?: Length | undefined;
  level?: 'A1' | 'A2' | undefined;
};

/** How many answers exist per length, for the browser's filter chips. */
export function countByLength(words: readonly Word[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const word of words) {
    if (!word.answer) continue;
    const n = letters(word.lemma).length;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return counts;
}

/** A one-line summary for a list row: `die Tasse` or `arbeiten`. */
export function headword(word: Word): string {
  return word.pos === 'noun' && word.article ? `${word.article} ${word.display}` : word.display;
}
