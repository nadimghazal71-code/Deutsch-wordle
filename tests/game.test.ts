import { describe, expect, it } from 'vitest';
import { reduce, initialState, shareText, type GameState } from '../src/core/game.js';
import { letters } from '../src/core/normalise.js';
import type { Length, ValidationTier } from '../src/core/types.js';

const KNOWN = new Set(['tasse', 'essen', 'woche', 'käse', 'straße', 'haus', 'zug']);
const isKnownWord = (w: string) => KNOWN.has(w);

function start(answer: string, length: Length = 5): GameState {
  return reduce(initialState(), {
    type: 'START',
    length,
    answerId: 'a2-tasse',
    answer: letters(answer),
    mode: 'practice',
    date: '2026-09-11',
  });
}

/** Types a word letter by letter; `;` dispatches the dead key, as the UI does. */
function type(state: GameState, word: string): GameState {
  return letters(word).reduce(
    (s, letter) => reduce(s, letter === ';' ? { type: 'DEAD_KEY' } : { type: 'TYPE_LETTER', letter }),
    state,
  );
}

function submit(state: GameState, tier: ValidationTier = 'dictionary'): GameState {
  return reduce(state, { type: 'SUBMIT', isKnownWord, tier });
}

describe('game reducer', () => {
  it('starts a round with the right attempt count and an empty grid', () => {
    const s = start('tasse');
    expect(s.status).toBe('playing');
    expect(s.maxAttempts).toBe(6);
    expect(s.guesses).toHaveLength(0);
    expect(s.current).toEqual([]);
  });

  it('types, backspaces, and refuses to overfill the row', () => {
    let s = type(start('tasse'), 'essenxyz');
    expect(s.current.join('')).toBe('essen');
    s = reduce(s, { type: 'BACKSPACE' });
    expect(s.current.join('')).toBe('esse');
  });

  it('scores only on submit — typing never produces marks', () => {
    const s = type(start('tasse'), 'essen');
    expect(s.guesses).toHaveLength(0);
    const after = submit(s);
    expect(after.guesses[0]!.marks).toEqual(['present', 'present', 'correct', 'absent', 'absent']);
  });

  it('rejects a short guess without consuming an attempt or clearing the row', () => {
    const s = submit(type(start('tasse'), 'ess'));
    expect(s.rejection).toBe('too-short');
    expect(s.guesses).toHaveLength(0);
    expect(s.current.join('')).toBe('ess');
  });

  it('rejects an unknown word without consuming an attempt', () => {
    const s = submit(type(start('tasse'), 'xxxxx'));
    expect(s.rejection).toBe('unknown-word');
    expect(s.guesses).toHaveLength(0);
    expect(s.current.join('')).toBe('xxxxx');
  });

  it('accepts anything of the right length in open mode', () => {
    const s = submit(type(start('tasse'), 'xxxxx'), 'open');
    expect(s.rejection).toBeNull();
    expect(s.guesses).toHaveLength(1);
  });

  it('wins on an exact guess', () => {
    const s = submit(type(start('tasse'), 'tasse'));
    expect(s.status).toBe('won');
    expect(s.guesses).toHaveLength(1);
  });

  it('loses after the last attempt is spent, not before', () => {
    let s = start('tasse');
    for (let i = 0; i < 6; i++) {
      s = submit(type(s, 'essen'), 'open');
      if (i < 5) expect(s.status).toBe('playing');
    }
    expect(s.status).toBe('lost');
    expect(s.guesses).toHaveLength(6);
  });

  it('ignores input once the round is over', () => {
    const won = submit(type(start('tasse'), 'tasse'));
    expect(type(won, 'essen').current).toEqual([]);
    expect(submit(won).guesses).toHaveLength(1);
  });

  it('produces umlauts from the dead key', () => {
    expect(type(start('käse', 4), 'k;ase').current.join('')).toBe('käse');
    expect(type(start('straße', 6), 'stra;se').current.join('')).toBe('straße');
    expect(type(start('brötchen', 8), 'br;otchen').current.join('')).toBe('brötchen');
    expect(type(start('grün', 4), 'gr;un').current.join('')).toBe('grün');
  });

  it('leaves ss and ue alone — they are real letter pairs in German', () => {
    expect(type(start('tasse'), 'tasse').current.join('')).toBe('tasse');
    expect(type(start('essen'), 'essen').current.join('')).toBe('essen');
    expect(type(start('teuer'), 'teuer').current.join('')).toBe('teuer');
  });

  it('passes a dead key through unchanged for a letter with no umlaut', () => {
    expect(type(start('tasse'), ';tass;e').current.join('')).toBe('tasse');
  });

  it('cancels a pending dead key on backspace without eating a letter', () => {
    let s = type(start('käse', 4), 'ka');
    s = reduce(s, { type: 'DEAD_KEY' });
    expect(s.deadKey).toBe(true);
    s = reduce(s, { type: 'BACKSPACE' });
    expect(s.deadKey).toBe(false);
    expect(s.current.join('')).toBe('ka');
    s = reduce(s, { type: 'BACKSPACE' });
    expect(s.current.join('')).toBe('k');
  });

  it('ignores non-letter input', () => {
    const s = type(start('tasse'), 'ta1!');
    expect(s.current.join('')).toBe('ta');
  });

  it('clears a rejection as soon as the player edits the row', () => {
    let s = submit(type(start('tasse'), 'xxxxx'));
    expect(s.rejection).toBe('unknown-word');
    s = reduce(s, { type: 'BACKSPACE' });
    expect(s.rejection).toBeNull();
  });
});

describe('giving up', () => {
  it('ends the round as a loss, so the card still shows the word', () => {
    const s = reduce(type(start('tasse'), 'ess'), { type: 'GIVE_UP' });
    expect(s.status).toBe('lost');
  });

  it('clears the half-typed row', () => {
    const s = reduce(type(start('tasse'), 'ess'), { type: 'GIVE_UP' });
    expect(s.current).toEqual([]);
  });

  it('keeps the guesses already made, so the grid and stats stay honest', () => {
    let s = submit(type(start('tasse'), 'essen'));
    s = reduce(s, { type: 'GIVE_UP' });
    expect(s.guesses).toHaveLength(1);
    expect(s.status).toBe('lost');
  });

  it('works before any guess at all', () => {
    const s = reduce(start('tasse'), { type: 'GIVE_UP' });
    expect(s.status).toBe('lost');
    expect(s.guesses).toHaveLength(0);
  });

  it('does nothing once the round is already over', () => {
    const won = submit(type(start('tasse'), 'tasse'));
    expect(reduce(won, { type: 'GIVE_UP' }).status).toBe('won');
  });

  it('does nothing on the setup screen', () => {
    expect(reduce(initialState(), { type: 'GIVE_UP' }).status).toBe('setup');
  });

  it('accepts no further input afterwards', () => {
    const s = reduce(start('tasse'), { type: 'GIVE_UP' });
    expect(type(s, 'tasse').current).toEqual([]);
    expect(submit(s).guesses).toHaveLength(0);
  });

  it('reports as a loss when shared', () => {
    const s = reduce(submit(type(start('tasse'), 'essen')), { type: 'GIVE_UP' });
    expect(shareText(s, '16.09.2026')).toContain('X/6');
  });
});

describe('shareText', () => {
  it('contains the grid and the score but never the answer', () => {
    let s = start('tasse');
    s = submit(type(s, 'essen'));
    s = submit(type(s, 'tasse'));
    const text = shareText(s, '11.09.2026');
    expect(text).toContain('🟨🟨🟩⬜⬜');
    expect(text).toContain('🟩🟩🟩🟩🟩');
    expect(text).toContain('2/6');
    expect(text.toLowerCase()).not.toContain('tasse');
  });

  it('marks a loss as X/attempts', () => {
    let s = start('tasse');
    for (let i = 0; i < 6; i++) s = submit(type(s, 'essen'), 'open');
    expect(shareText(s, '11.09.2026')).toContain('X/6');
  });
});
