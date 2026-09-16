import type { Length } from './types.js';

/**
 * A guess dictionary for one word length.
 *
 * Every word in a bundle has exactly `n` letters, so the words need no separators:
 * they are concatenated into one sorted string and addressed by offset. That matters
 * on both platforms — the whole dictionary is 6 string constants rather than 98,000
 * array entries, so there is no parse cost worth measuring and nothing to allocate at
 * startup. Lookup is a binary search over the slices.
 */
export interface Dictionary {
  /** Letters per word. */
  n: Length;
  /** How many words the bundle holds. */
  count: number;
  /** `count * n` characters: every word, sorted, concatenated, no separators. */
  words: string;
}

/**
 * Is this a word the game will accept as a guess?
 *
 * The comparison is plain `<`/`>` on strings, which orders by UTF-16 code unit. The
 * bundle is built sorted the same way (every character here is in the BMP, where code
 * point and code unit order agree), and `scripts/build-words.ts` asserts that the
 * bundle really is sorted — a mis-sorted bundle would make this silently miss words.
 */
export function hasWord(dict: Dictionary, word: string): boolean {
  if (word.length !== dict.n) return false;

  let low = 0;
  let high = dict.count - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const offset = mid * dict.n;
    const candidate = dict.words.slice(offset, offset + dict.n);
    if (candidate === word) return true;
    if (candidate < word) low = mid + 1;
    else high = mid - 1;
  }
  return false;
}

/** Every word in the bundle, in order. For tests and tooling, not the guess path. */
export function words(dict: Dictionary): string[] {
  const out: string[] = new Array(dict.count);
  for (let i = 0; i < dict.count; i++) out[i] = dict.words.slice(i * dict.n, (i + 1) * dict.n);
  return out;
}
