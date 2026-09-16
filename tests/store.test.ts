import { describe, expect, it } from 'vitest';
import { recordResult, statsFor, emptyStats, defaultSettings } from '../src/store/stats.js';
import type { Store } from '../src/store/stats.js';

const base = (): Store => ({ schema: 1, settings: defaultSettings(), inProgress: {}, dailyDone: {}, stats: {} });

describe('stats', () => {
  it('starts a length at zero with a distribution sized to its attempts', () => {
    expect(emptyStats(3).distribution).toHaveLength(5);
    expect(emptyStats(5).distribution).toHaveLength(6);
    expect(emptyStats(8).distribution).toHaveLength(7);
  });

  it('records a win in the right distribution bucket', () => {
    const store = recordResult(base(), 5, { won: true, attempts: 3, answerId: 'a2-tasse', countsForStreak: true });
    const s = statsFor(store, 5);
    expect(s.played).toBe(1);
    expect(s.won).toBe(1);
    expect(s.distribution[2]).toBe(1);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(1);
  });

  it('keeps stats separate per length', () => {
    let store = recordResult(base(), 5, { won: true, attempts: 2, answerId: 'a', countsForStreak: true });
    store = recordResult(store, 8, { won: false, attempts: 7, answerId: 'b', countsForStreak: true });
    expect(statsFor(store, 5).won).toBe(1);
    expect(statsFor(store, 8).won).toBe(0);
    expect(statsFor(store, 5).played).toBe(1);
    expect(statsFor(store, 3).played).toBe(0);
  });

  it('breaks the streak on a loss but keeps the best', () => {
    let store = base();
    for (const won of [true, true, true]) {
      store = recordResult(store, 5, { won, attempts: 2, answerId: `w${won}`, countsForStreak: true });
    }
    expect(statsFor(store, 5).streak).toBe(3);
    store = recordResult(store, 5, { won: false, attempts: 6, answerId: 'x', countsForStreak: true });
    expect(statsFor(store, 5).streak).toBe(0);
    expect(statsFor(store, 5).bestStreak).toBe(3);
  });

  it('leaves the streak untouched for practice rounds', () => {
    let store = recordResult(base(), 5, { won: true, attempts: 2, answerId: 'a', countsForStreak: true });
    store = recordResult(store, 5, { won: false, attempts: 6, answerId: 'b', countsForStreak: false });
    expect(statsFor(store, 5).streak).toBe(1);
    expect(statsFor(store, 5).played).toBe(2);
  });

  it('counts each answer once in wordsSeen — the number that reflects learning', () => {
    let store = recordResult(base(), 5, { won: true, attempts: 2, answerId: 'a2-tasse', countsForStreak: false });
    store = recordResult(store, 5, { won: false, attempts: 6, answerId: 'a2-tasse', countsForStreak: false });
    expect(statsFor(store, 5).wordsSeen).toEqual(['a2-tasse']);
    expect(statsFor(store, 5).played).toBe(2);
  });

  it('ignores an out-of-range attempt count instead of writing outside the array', () => {
    const store = recordResult(base(), 5, { won: true, attempts: 99, answerId: 'a', countsForStreak: false });
    expect(statsFor(store, 5).distribution).toEqual([0, 0, 0, 0, 0, 0]);
    expect(statsFor(store, 5).won).toBe(1);
  });

  it('pads a distribution that is shorter than the attempt count', () => {
    const store: Store = { ...base(), stats: { 5: { ...emptyStats(5), distribution: [1, 2] } } };
    expect(statsFor(store, 5).distribution).toEqual([1, 2, 0, 0, 0, 0]);
  });

  it('defaults guess validation to dictionary, so a non-word is rejected', () => {
    expect(defaultSettings().validation).toBe('dictionary');
  });
});
