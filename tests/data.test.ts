import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LENGTHS, type Length, type Word } from '../src/core/types.js';
import { letters } from '../src/core/normalise.js';
import { attemptsFor } from '../src/core/attempts.js';
import { answersOfLength, dailyAnswer, isoDate } from '../src/core/select.js';

const read = (n: number) => JSON.parse(readFileSync(`src/data/words.${n}.json`, 'utf8')) as Word[];
const WORDS: Word[] = LENGTHS.flatMap(read);

describe('the shipped word data', () => {
  it('is non-trivial', () => {
    expect(WORDS.length).toBeGreaterThan(300);
  });

  it('files match their own filename length', () => {
    for (const n of LENGTHS) {
      for (const w of read(n)) expect(letters(w.lemma).length, w.lemma).toBe(n);
    }
  });

  it('has a playable pool at every offered length', () => {
    for (const n of LENGTHS) {
      expect(answersOfLength(WORDS, n).length, `length ${n}`).toBeGreaterThanOrEqual(30);
    }
  });

  it('never offers a length whose pool cannot fill the attempts', () => {
    for (const n of LENGTHS) {
      expect(answersOfLength(WORDS, n).length).toBeGreaterThan(attemptsFor(n));
    }
  });

  it('has unique ids and lemmas', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    expect(new Set(WORDS.map((w) => w.lemma)).size).toBe(WORDS.length);
  });

  it('gives every noun an article and every verb a Partizip II', () => {
    for (const w of WORDS.filter((x) => x.answer)) {
      if (w.pos === 'noun') expect(w.article, w.lemma).toBeTruthy();
      if (w.pos === 'verb') expect(w.partizip2, w.lemma).toBeTruthy();
    }
  });

  it('never shows a word inside its own definition', () => {
    for (const w of WORDS) expect(w.definition_de.toLowerCase().includes(w.lemma), w.lemma).toBe(false);
  });

  it('produces a daily answer for every length, today and a year out', () => {
    for (const n of LENGTHS) {
      const pool = answersOfLength(WORDS, n as Length);
      expect(dailyAnswer(pool, isoDate(), n).lemma).toBeTruthy();
      expect(dailyAnswer(pool, '2027-03-01', n).lemma).toBeTruthy();
    }
  });

  it('cycles a whole length-3 pool before repeating', () => {
    const pool = answersOfLength(WORDS, 3);
    const seen = new Set<string>();
    for (let d = 0; d < pool.length; d++) {
      const date = new Date(2026, 0, 1 + d);
      seen.add(dailyAnswer(pool, isoDate(date), 3).id);
    }
    expect(seen.size).toBe(pool.length);
  });
});
