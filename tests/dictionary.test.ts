import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { hasWord, words, type Dictionary } from '../src/core/dictionary.js';
import { LENGTHS, type Length, type Word } from '../src/core/types.js';
import { letters } from '../src/core/normalise.js';

const dict = (n: number) => JSON.parse(readFileSync(`src/data/guesses.${n}.json`, 'utf8')) as Dictionary;
const DICTS = Object.fromEntries(LENGTHS.map((n) => [n, dict(n)])) as Record<Length, Dictionary>;
const ANSWERS: Word[] = LENGTHS.flatMap((n) => JSON.parse(readFileSync(`src/data/words.${n}.json`, 'utf8')) as Word[]);

describe('the guess dictionary', () => {
  it('has a bundle for every offered length', () => {
    for (const n of LENGTHS) {
      expect(DICTS[n].n, `length ${n}`).toBe(n);
      expect(DICTS[n].count, `length ${n}`).toBeGreaterThan(500);
    }
  });

  it('stores exactly count * n characters, so slicing lines up', () => {
    for (const n of LENGTHS) {
      expect(DICTS[n].words.length, `length ${n}`).toBe(DICTS[n].count * n);
    }
  });

  it('is strictly sorted by code unit — binary search depends on it', () => {
    for (const n of LENGTHS) {
      const all = words(DICTS[n]);
      for (let i = 1; i < all.length; i++) {
        if (!(all[i - 1]! < all[i]!)) {
          throw new Error(`length ${n} unsorted at ${all[i - 1]} / ${all[i]}`);
        }
      }
    }
  });

  it('finds every word it contains — the first, the last and a sample', () => {
    for (const n of LENGTHS) {
      const all = words(DICTS[n]);
      expect(hasWord(DICTS[n], all[0]!)).toBe(true);
      expect(hasWord(DICTS[n], all[all.length - 1]!)).toBe(true);
      for (let i = 0; i < all.length; i += Math.max(1, Math.floor(all.length / 200))) {
        expect(hasWord(DICTS[n], all[i]!), all[i]).toBe(true);
      }
    }
  });

  it('NEVER rejects one of the game\'s own answers', () => {
    for (const answer of ANSWERS) {
      const n = letters(answer.lemma).length as Length;
      expect(hasWord(DICTS[n], answer.lemma), answer.lemma).toBe(true);
    }
  });

  it('accepts real German words that are not answers', () => {
    // The whole point: a player can spend a guess probing letters.
    for (const word of ['essen', 'trinken', 'gehen', 'vater', 'blume', 'reise']) {
      const n = letters(word).length as Length;
      expect(hasWord(DICTS[n], word), word).toBe(true);
    }
  });

  it('rejects non-words — this is what makes it a Wordle', () => {
    for (const junk of ['xxxxx', 'qqqq', 'zzz', 'aeiou', 'abcdefg', 'wwwwwwww']) {
      const n = letters(junk).length as Length;
      expect(hasWord(DICTS[n], junk), junk).toBe(false);
    }
  });

  it('rejects the transliterations a learner must not be taught', () => {
    // These appeared in a 5-letter list that was considered and dropped: they are
    // misspellings of Bäume, ätzt, äfft and Bonsai.
    for (const wrong of ['baume', 'aetzt', 'aefft', 'bnsai']) {
      expect(hasWord(DICTS[5], wrong), wrong).toBe(false);
    }
    // ...while the correctly spelled forms are accepted.
    expect(hasWord(DICTS[5], 'bäume')).toBe(true);
  });

  it('rejects a word of the wrong length outright', () => {
    expect(hasWord(DICTS[5], 'haus')).toBe(false);
    expect(hasWord(DICTS[5], 'strasse')).toBe(false);
    expect(hasWord(DICTS[4], 'haus')).toBe(true);
  });

  it('treats ä ö ü ß as their own letters', () => {
    expect(hasWord(DICTS[4], 'käse')).toBe(true);
    expect(hasWord(DICTS[4], 'kase')).toBe(false);
    expect(hasWord(DICTS[6], 'straße')).toBe(true);
    expect(hasWord(DICTS[4], 'grün')).toBe(true);
    expect(hasWord(DICTS[4], 'grun')).toBe(false);
  });

  it('rejects German first names', () => {
    // German capitalises every noun, so a word list cannot tell 'Albin' from 'Haus';
    // the names are excluded explicitly. See scripts/import_names.py.
    for (const name of ['albin', 'bernd', 'helmut', 'sigrid', 'detlef', 'gisela',
                        'jürgen', 'michael', 'thomas', 'andreas', 'klaus', 'peter',
                        'anna', 'maria', 'julia', 'sabine']) {
      const n = letters(name).length as Length;
      if (DICTS[n]) expect(hasWord(DICTS[n], name), name).toBe(false);
    }
  });

  it('still accepts the real words that happen to also be names', () => {
    // These are the collisions that make blind name-removal dangerous: seven of them
    // are answers this game can set, and rejecting one would be unwinnable.
    for (const word of ['rot', 'alt', 'ort', 'ecke', 'gast', 'wald', 'wolke',
                        'land', 'bald', 'dank', 'frei', 'hart', 'rein',
                        'kraft', 'linde', 'ernst', 'frank',
                        // Also names, but der Kai is a quay, der Jasmin a shrub,
                        // and rosa is a colour.
                        'kai', 'jasmin', 'rosa']) {
      const n = letters(word).length as Length;
      expect(hasWord(DICTS[n], word), word).toBe(true);
    }
  });

  it('is big enough to be worth calling a dictionary', () => {
    const total = LENGTHS.reduce((sum, n) => sum + DICTS[n].count, 0);
    expect(total).toBeGreaterThan(50_000);
  });
});
