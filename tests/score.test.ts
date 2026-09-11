import { describe, expect, it } from 'vitest';
import { score, scoreWords, isWin } from '../src/core/score.js';
import { letters } from '../src/core/normalise.js';
import type { Mark } from '../src/core/types.js';

/** Compact notation for expectations: G green, Y yellow, _ grey. */
const M: Record<string, Mark> = { G: 'correct', Y: 'present', _: 'absent' };
const marks = (pattern: string): Mark[] => [...pattern].map((c) => M[c]!);

describe('score — the test matrix from docs/architecture.md § 8', () => {
  // Every answer/guess pair below is a real word from the Goethe A1/A2 lists.
  const cases: [answer: string, guess: string, expected: string, guards: string][] = [
    ['tasse', 'essen', 'YYG__', 'the repeated-letter bug: the second E is grey, the first is yellow'],
    ['tasse', 'tasse', 'GGGGG', 'win detection'],
    ['kaffee', 'kaffee', 'GGGGGG', 'two separate doubled letters'],
    ['kaffee', 'feiern', 'YY_Y__', 'doubles in the answer, singles in the guess'],
    ['straße', 'straße', 'GGGGGG', 'ß is one letter and one tile, not ss'],
    ['käse', 'kase', 'G_GG', 'no diacritic stripping: ä is not a'],
    ['zug', 'zug', 'GGG', 'minimum length'],
    ['arbeiten', 'arbeiten', 'GGGGGGGG', 'maximum length'],
  ];

  for (const [answer, guess, expected, guards] of cases) {
    it(`${answer} / ${guess} -> ${expected}  (${guards})`, () => {
      expect(scoreWords(guess, answer)).toEqual(marks(expected));
    });
  }

  it('a green claims a letter that an earlier position would have taken as yellow', () => {
    // WOCHE contains exactly one E, at index 4. EICHE has an E at index 0 and at 4.
    // Pass 1 takes the green at 4, so nothing is left for index 0 — it must be grey,
    // which is only correct if the greens run before the yellows.
    expect(scoreWords('eiche', 'woche')).toEqual(marks('__GGG'));
  });

  it('counts repeats exactly rather than testing mere membership', () => {
    // One A in the answer, two in the guess: the first A gets it, the second does not.
    expect(scoreWords('aab', 'bxa')).toEqual(marks('Y_Y'));
    expect(scoreWords('aaa', 'xax')).toEqual(marks('_G_'));
  });

  it('throws on a length mismatch rather than scoring nonsense', () => {
    expect(() => score(letters('haus'), letters('tasse'))).toThrow(/length mismatch/);
  });

  it('isWin only for an all-green row', () => {
    expect(isWin(marks('GGG'))).toBe(true);
    expect(isWin(marks('GGY'))).toBe(false);
    expect(isWin([])).toBe(false);
  });

  it('is a pure function: does not mutate its inputs', () => {
    const guess = letters('essen');
    const answer = letters('tasse');
    score(guess, answer);
    expect(guess.join('')).toBe('essen');
    expect(answer.join('')).toBe('tasse');
  });
});
