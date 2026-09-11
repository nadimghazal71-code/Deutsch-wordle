/**
 * The ONLY place in the codebase that touches case, umlaut aliases or tile
 * rendering. Four transformations exist and mixing them up is the likeliest source
 * of a correctness bug here — see docs/architecture.md § 4.
 */

/** The German alphabet as this game defines it: 26 + ä ö ü ß. */
export const GERMAN_LETTERS = 'abcdefghijklmnopqrstuvwxyzäöüß';

const LETTER_RE = /^[a-zäöüß]+$/;

/**
 * Split a word into letters. Always use this instead of indexing a string, so the
 * code stays correct for any input; `ä` must be one element, never a base letter
 * plus a combining mark.
 */
export function letters(word: string): string[] {
  return [...word];
}

/** Lowercase for comparison. Asserts NFC so `a`+U+0308 can never masquerade as `ä`. */
export function toComparable(word: string): string {
  return word.normalize('NFC').toLowerCase();
}

export function isGermanLetter(ch: string): boolean {
  return LETTER_RE.test(ch);
}

/** True when every character is a German letter (already lowercased). */
export function isAllGermanLetters(word: string): boolean {
  return word.length > 0 && LETTER_RE.test(word);
}

/**
 * Umlaut entry for players on a keyboard without German keys.
 *
 * A dead key (`;` or `"`) followed by a/o/u/s produces ä/ö/ü/ß. INPUT SIDE ONLY —
 * never call this from the scoring path.
 *
 * The original spec collapsed the digraphs ae/oe/ue/ss instead. Measuring the
 * vocabulary killed that idea: `ss` occurs legitimately in 26 pool words (essen,
 * Tasse, Kasse, Klasse, besser, bisschen …) and `ue` in 9 (teuer, feuer, neue,
 * dauern …), against only 15 words containing `ß` and 44 containing `ü`. Collapsing
 * them would make more words untypeable than typeable — `tasse` would become
 * `taße`. A dead key cannot collide with anything, because `;` and `"` are not
 * letters, and it works the same way for all four characters.
 */
export const DEAD_KEYS = [';', '"'] as const;

const UMLAUT_OF: Record<string, string> = { a: 'ä', o: 'ö', u: 'ü', s: 'ß' };

export function isDeadKey(key: string): boolean {
  return (DEAD_KEYS as readonly string[]).includes(key);
}

/** The umlaut a dead key produces from this base letter, or null if there is none. */
export function umlautFor(letter: string): string | null {
  return UMLAUT_OF[letter] ?? null;
}

/**
 * Render a letter on a tile. Uppercase, except `ß`, which stays `ß`: `SS` would
 * break the tile count and `ẞ` (U+1E9E) is missing from many fonts.
 */
export function toTile(ch: string): string {
  return ch === 'ß' ? 'ß' : ch.toUpperCase();
}
