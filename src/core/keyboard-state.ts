import type { KeyState, Mark, ScoredGuess } from './types.js';

/** Higher wins. A key never downgrades: green stays green after a later yellow. */
const RANK: Record<KeyState, number> = { unused: 0, absent: 1, present: 2, correct: 3 };

export function betterState(a: KeyState, b: KeyState): KeyState {
  return RANK[b] > RANK[a] ? b : a;
}

/**
 * Merge every scored guess into one state per letter: the best state that letter has
 * ever reached. This is a max over all guesses, NOT the state from the latest guess.
 * See docs/game-design.md § 3.
 */
export function keyboardState(guesses: readonly ScoredGuess[]): Map<string, KeyState> {
  const states = new Map<string, KeyState>();
  for (const guess of guesses) {
    for (let i = 0; i < guess.letters.length; i++) {
      const ch = guess.letters[i]!;
      const mark: Mark = guess.marks[i]!;
      states.set(ch, betterState(states.get(ch) ?? 'unused', mark));
    }
  }
  return states;
}
