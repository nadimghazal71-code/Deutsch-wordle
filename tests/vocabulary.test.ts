import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { searchVocabulary, countByLength, foldForSearch, headword } from '../src/core/vocabulary.js';
import { LENGTHS, type Word } from '../src/core/types.js';

const WORDS: Word[] = LENGTHS.flatMap(
  (n) => JSON.parse(readFileSync(`src/data/words.${n}.json`, 'utf8')) as Word[],
);

describe('browsing the vocabulary', () => {
  it('returns every answer when unfiltered', () => {
    expect(searchVocabulary(WORDS)).toHaveLength(WORDS.filter((w) => w.answer).length);
  });

  it('sorts alphabetically by the German word', () => {
    const list = searchVocabulary(WORDS, { length: 4 }).map((w) => w.display);
    expect(list).toEqual([...list].sort((a, b) => a.localeCompare(b, 'de')));
  });

  it('filters by length', () => {
    const five = searchVocabulary(WORDS, { length: 5 });
    expect(five.length).toBeGreaterThan(20);
    expect(five.every((w) => [...w.lemma].length === 5)).toBe(true);
  });

  it('filters by level', () => {
    expect(searchVocabulary(WORDS, { level: 'A1' }).every((w) => w.level === 'A1')).toBe(true);
  });

  it('searches the German word', () => {
    expect(searchVocabulary(WORDS, { query: 'Tasse' }).map((w) => w.lemma)).toContain('tasse');
  });

  it('searches the English gloss, so a learner can look up a meaning', () => {
    expect(searchVocabulary(WORDS, { query: 'cup' }).map((w) => w.lemma)).toContain('tasse');
    expect(searchVocabulary(WORDS, { query: 'train station' }).map((w) => w.lemma)).toContain('bahnhof');
  });

  it('searches the topic', () => {
    const food = searchVocabulary(WORDS, { query: 'Essen und Trinken' });
    expect(food.length).toBeGreaterThan(10);
  });

  it('ignores umlauts when searching, so kase finds Käse', () => {
    expect(searchVocabulary(WORDS, { query: 'kase' }).map((w) => w.lemma)).toContain('käse');
    expect(searchVocabulary(WORDS, { query: 'strasse' }).map((w) => w.lemma)).toContain('straße');
    expect(searchVocabulary(WORDS, { query: 'brotchen' }).map((w) => w.lemma)).toContain('brötchen');
  });

  it('combines a query with a length filter', () => {
    const hits = searchVocabulary(WORDS, { query: 'e', length: 3 });
    expect(hits.every((w) => [...w.lemma].length === 3)).toBe(true);
  });

  it('returns nothing for a query that matches nothing, rather than everything', () => {
    expect(searchVocabulary(WORDS, { query: 'zzzzzz' })).toEqual([]);
  });

  it('trims the query, so a stray space does not hide every word', () => {
    expect(searchVocabulary(WORDS, { query: '  Tasse  ' }).map((w) => w.lemma)).toContain('tasse');
  });

  it('counts answers per length for the filter chips', () => {
    const counts = countByLength(WORDS);
    for (const n of LENGTHS) expect(counts.get(n)).toBeGreaterThanOrEqual(30);
  });

  it('shows nouns with their article and other words bare', () => {
    const tasse = WORDS.find((w) => w.lemma === 'tasse')!;
    const arbeiten = WORDS.find((w) => w.lemma === 'arbeiten')!;
    expect(headword(tasse)).toBe('die Tasse');
    expect(headword(arbeiten)).toBe('arbeiten');
  });

  it('folds for search without touching the guess path', () => {
    expect(foldForSearch('Käse')).toBe('kase');
    expect(foldForSearch('Straße')).toBe('strasse');
    expect(foldForSearch('GRÜN')).toBe('grun');
  });
});
