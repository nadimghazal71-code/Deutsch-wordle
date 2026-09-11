import type { Mark } from './types.js';
import { letters } from './normalise.js';

/**
 * Score a guess against an answer.
 *
 * Two passes, and the order is mandatory: a green late in the word must be able to
 * claim a letter that an earlier position would otherwise have taken as yellow.
 * A single-pass `answer.includes(ch)` check is the classic bug — it marks both `E`s
 * of ESSEN yellow when TASSE contains only one unclaimed `E`.
 *
 * Pure: no DOM, no storage, no imports beyond the letter helper.
 * See docs/game-design.md § 3 for the worked example.
 */
export function score(guess: string[], answer: string[]): Mark[] {
  if (guess.length !== answer.length) {
    throw new Error(`score(): length mismatch, guess ${guess.length} vs answer ${answer.length}`);
  }

  const marks: Mark[] = new Array(guess.length).fill('absent');
  const pool = new Map<string, number>();

  // Pass 1 — greens. Each exact hit consumes its letter; everything else goes in the pool.
  for (let i = 0; i < guess.length; i++) {
    const a = answer[i]!;
    if (guess[i] === a) marks[i] = 'correct';
    else pool.set(a, (pool.get(a) ?? 0) + 1);
  }

  // Pass 2 — yellows, left to right, from whatever the greens left behind.
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === 'correct') continue;
    const ch = guess[i]!;
    const remaining = pool.get(ch) ?? 0;
    if (remaining > 0) {
      marks[i] = 'present';
      pool.set(ch, remaining - 1);
    }
  }

  return marks;
}

/** Convenience wrapper for string inputs. Both must already be comparable (lowercased). */
export function scoreWords(guess: string, answer: string): Mark[] {
  return score(letters(guess), letters(answer));
}

export function isWin(marks: Mark[]): boolean {
  return marks.length > 0 && marks.every((m) => m === 'correct');
}
