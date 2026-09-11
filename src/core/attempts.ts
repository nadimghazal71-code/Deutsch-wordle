import type { Length } from './types.js';

/**
 * Attempts allowed for a given word length: `ceil(length / 2) + 3`.
 *
 *   3,4 -> 5    5,6 -> 6    7,8 -> 7
 *
 * One extra attempt for every two letters, anchored so that 5 letters gets the
 * 6 attempts of classic Wordle.
 *
 * The low end stays at 5 because a 3-letter guess tests only three letters, so each
 * one narrows the field slowly, and the pool's initials cluster (34 answers over 16
 * distinct first letters). The high end stops at 7 because 35% of the 8-letter pool
 * starts with ab-/an-/auf-/aus-/be-/ge-/ver-/zu-, so long words collapse quickly
 * once a player knows the prefixes — and 7 attempts at 8 tiles is already 56 tiles
 * of typing.
 *
 * See docs/game-design.md § 2.
 */
export function attemptsFor(length: Length): number {
  return Math.ceil(length / 2) + 3;
}
