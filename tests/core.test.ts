import { describe, expect, it } from 'vitest';
import { attemptsFor } from '../src/core/attempts.js';
import { keyboardState, betterState } from '../src/core/keyboard-state.js';
import { umlautFor, isDeadKey, toTile, letters, toComparable, isAllGermanLetters } from '../src/core/normalise.js';
import { dailyAnswer, daysSinceEpoch, seededShuffle, practiceAnswer, isoDate } from '../src/core/select.js';
import { LENGTHS, type Length, type Word } from '../src/core/types.js';

describe('attemptsFor — ceil(length / 2) + 3', () => {
  it('matches the table in docs/game-design.md § 2', () => {
    expect(LENGTHS.map(attemptsFor)).toEqual([5, 5, 6, 6, 7, 7]);
  });
  it('floors short words at 5 and caps long words at 7', () => {
    expect(attemptsFor(3)).toBe(5);
    expect(attemptsFor(8)).toBe(7);
  });
});

describe('keyboard state — best state ever reached', () => {
  it('never downgrades green to yellow or grey', () => {
    const state = keyboardState([
      { letters: ['t', 'a'], marks: ['correct', 'absent'] },
      { letters: ['t', 'b'], marks: ['present', 'absent'] },
    ]);
    expect(state.get('t')).toBe('correct');
  });
  it('upgrades yellow to green', () => {
    const state = keyboardState([
      { letters: ['s'], marks: ['present'] },
      { letters: ['s'], marks: ['correct'] },
    ]);
    expect(state.get('s')).toBe('correct');
  });
  it('ranks unused < absent < present < correct', () => {
    expect(betterState('unused', 'absent')).toBe('absent');
    expect(betterState('absent', 'present')).toBe('present');
    expect(betterState('correct', 'absent')).toBe('correct');
  });
  it('leaves untouched letters out of the map entirely', () => {
    expect(keyboardState([{ letters: ['a'], marks: ['absent'] }]).has('z')).toBe(false);
  });
});

describe('normalise', () => {
  it('treats ä ö ü ß as single letters', () => {
    expect(letters('straße')).toHaveLength(6);
    expect(letters('brötchen')).toHaveLength(8);
    expect(letters('käse')).toHaveLength(4);
  });
  it('renders ß as ß on a tile, not SS or ẞ', () => {
    expect(toTile('ß')).toBe('ß');
    expect(toTile('ä')).toBe('Ä');
    expect(toTile('a')).toBe('A');
  });
  it('maps dead-key + base letter to the umlaut', () => {
    expect(umlautFor('a')).toBe('ä');
    expect(umlautFor('o')).toBe('ö');
    expect(umlautFor('u')).toBe('ü');
    expect(umlautFor('s')).toBe('ß');
    expect(umlautFor('t')).toBeNull();
  });
  it('recognises both dead keys, and no letter as one', () => {
    expect(isDeadKey(';')).toBe(true);
    expect(isDeadKey('"')).toBe(true);
    expect(isDeadKey('s')).toBe(false);
  });
  it('does not strip diacritics when making a word comparable', () => {
    expect(toComparable('Käse')).toBe('käse');
    expect(toComparable('STRAßE')).toBe('straße');
  });
  it('normalises decomposed input to NFC so a+combining-umlaut cannot pass as ä', () => {
    const decomposed = 'käse'; // k a ¨ s e
    expect(letters(decomposed)).toHaveLength(5);
    expect(letters(toComparable(decomposed))).toHaveLength(4);
    expect(toComparable(decomposed)).toBe('käse');
  });
  it('accepts only German letters', () => {
    expect(isAllGermanLetters('straße')).toBe(true);
    expect(isAllGermanLetters('haus2')).toBe(false);
    expect(isAllGermanLetters('mein haus')).toBe(false);
    expect(isAllGermanLetters('')).toBe(false);
  });
});

describe('daily selection', () => {
  const pool = (n: number): Word[] =>
    Array.from({ length: n }, (_, i) => ({ id: `w${i}`, lemma: 'haus' }) as Word);

  it('is stable for a fixed date and length', () => {
    const p = pool(34);
    expect(dailyAnswer(p, '2026-09-11', 3).id).toBe(dailyAnswer(p, '2026-09-11', 3).id);
  });
  it('gives different lengths different words on the same day', () => {
    const p = pool(34);
    const ids = LENGTHS.map((l) => dailyAnswer(p, '2026-09-11', l).id);
    expect(new Set(ids).size).toBeGreaterThan(1);
  });
  it('covers the whole pool exactly once per cycle — no repeat within 34 days', () => {
    const p = pool(34);
    const seen = Array.from({ length: 34 }, (_, d) => {
      const date = new Date(Date.UTC(2026, 0, 1 + d));
      return dailyAnswer(p, isoDate(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())), 3).id;
    });
    expect(new Set(seen).size).toBe(34);
  });
  it('handles dates before the epoch without throwing or going negative', () => {
    expect(daysSinceEpoch('2025-12-31')).toBe(-1);
    expect(() => dailyAnswer(pool(34), '2025-06-01', 3)).not.toThrow();
  });
  it('throws on an empty pool instead of returning undefined', () => {
    expect(() => dailyAnswer([], '2026-09-11', 3)).toThrow(/empty pool/);
  });
  it('seededShuffle is deterministic and does not mutate its input', () => {
    const input = [1, 2, 3, 4, 5];
    expect(seededShuffle(input, 42)).toEqual(seededShuffle(input, 42));
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('practice selection', () => {
  const pool = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}` }) as Word);
  it('avoids recently seen words', () => {
    const recent = pool.slice(0, 3).map((w) => w.id);
    for (let i = 0; i < 40; i++) {
      expect(recent).not.toContain(practiceAnswer(pool, recent).id);
    }
  });
  it('falls back to the full pool rather than starving when everything is recent', () => {
    const recent = pool.map((w) => w.id);
    expect(() => practiceAnswer(pool, recent)).not.toThrow();
  });
});

describe('isoDate', () => {
  it('formats local calendar dates, zero-padded', () => {
    expect(isoDate(new Date(2026, 8, 11))).toBe('2026-09-11');
    expect(isoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

const L: Length = 5;
describe('length guard', () => {
  it('offers exactly 3 through 8', () => {
    expect(LENGTHS).toEqual([3, 4, 5, 6, 7, 8]);
    expect(attemptsFor(L)).toBe(6);
  });
});
