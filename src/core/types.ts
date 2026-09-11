/** Shared vocabulary of the whole game. No behaviour lives here. */

/** The lengths the game offers. Both a type and a runtime list. */
export const LENGTHS = [3, 4, 5, 6, 7, 8] as const;
export type Length = (typeof LENGTHS)[number];

export function isLength(n: number): n is Length {
  return (LENGTHS as readonly number[]).includes(n);
}

/** The state of a single tile after a guess is scored. */
export type Mark = 'correct' | 'present' | 'absent';

/** The state of a key on the on-screen keyboard. */
export type KeyState = Mark | 'unused';

export type Level = 'A1' | 'A2';
export type Pos = 'noun' | 'verb' | 'adj' | 'adv' | 'num' | 'other';
export type Article = 'der' | 'die' | 'das';

/**
 * One vocabulary entry. Mirrors the schema in docs/word-list.md § 2.
 * `length` is deliberately absent — it is `[...lemma].length`, computed where
 * needed, so it cannot drift from the lemma.
 */
export interface Word {
  id: string;
  /** Lowercase, exact letters including ä ö ü ß. This is what a guess is compared against. */
  lemma: string;
  /** True German capitalisation, for the definition card. */
  display: string;
  level: Level;
  pos: Pos;
  topic: string;

  article: Article | null;
  plural: string | null;
  partizip2: string | null;
  aux: 'haben' | 'sein' | null;
  separable: boolean | null;

  definition_de: string;
  definition_en: string;
  example_de: string;
  example_en: string;

  source: 'goethe-a1' | 'goethe-a2' | 'supplement';
  /** false = a legal guess that is never the answer (function words, uncurated entries). */
  answer: boolean;
}

/** A submitted, scored guess. */
export interface ScoredGuess {
  letters: string[];
  marks: Mark[];
}

export type GameStatus = 'setup' | 'playing' | 'won' | 'lost';

export type ValidationTier = 'strict' | 'dictionary' | 'open';
