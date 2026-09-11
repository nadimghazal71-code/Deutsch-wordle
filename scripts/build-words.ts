/**
 * Validate data/words/*.json and compile the bundles the app ships.
 *
 * This is a build GATE: every rule below fails the build rather than warning, because
 * a bad word entry reaches the player as a broken definition card. See
 * docs/word-list.md § 3.
 *
 *   npm run build:words
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LENGTHS } from '../src/core/types.js';
import type { Word } from '../src/core/types.js';

const DATA_DIR = 'data/words';
const OUT_DIR = 'src/data';
/** Below this, a length does not have enough answers to be worth offering. */
const MIN_POOL = 30;

const LEMMA_RE = /^[a-zäöüß]{3,8}$/;
const SEPARABLE_PREFIXES = ['zurück', 'nach', 'auf', 'aus', 'bei', 'ein', 'mit', 'vor',
  'weg', 'her', 'hin', 'ab', 'an', 'zu', 'um'];

const errors: string[] = [];
const fail = (lemma: string, message: string) => errors.push(`${lemma}: ${message}`);

const letters = (w: string) => [...w];
const stem = (w: string) => w.slice(0, Math.max(3, letters(w).length - 2));

/**
 * Does the example sentence use the word? German needs more than a substring check:
 * a separable verb splits across the clause (aufhören -> "Hör bitte auf!") and a
 * strong verb changes stem in the Partizip II (gewinnen -> gewonnen).
 */
function exampleUsesWord(w: Word): boolean {
  const example = w.example_de.toLowerCase();
  if (example.includes(stem(w.lemma))) return true;
  if (w.partizip2 && example.includes(w.partizip2.toLowerCase())) return true;
  if (w.separable) {
    const prefix = SEPARABLE_PREFIXES.find((p) => w.lemma.startsWith(p));
    if (prefix) {
      const root = w.lemma.slice(prefix.length);
      if (root && example.includes(stem(root)) && example.includes(prefix)) return true;
    }
  }
  return false;
}

function validate(words: Word[]): void {
  const ids = new Set<string>();
  const lemmas = new Set<string>();

  for (const w of words) {
    const { lemma } = w;

    if (!LEMMA_RE.test(lemma)) fail(lemma, 'lemma must be 3-8 lowercase German letters');
    if (lemma !== lemma.normalize('NFC')) fail(lemma, 'lemma is not NFC — ä must be one code point');
    if (w.display.toLowerCase() !== lemma) fail(lemma, `display ${w.display} disagrees with lemma`);
    if (ids.has(w.id)) fail(lemma, `duplicate id ${w.id}`);
    if (lemmas.has(lemma)) fail(lemma, 'duplicate lemma');
    ids.add(w.id);
    lemmas.add(lemma);

    if (w.level !== 'A1' && w.level !== 'A2') fail(lemma, `unknown level ${w.level}`);

    if (!w.answer) continue; // non-answers only need to be typeable

    if (w.pos === 'noun') {
      if (!w.article) fail(lemma, 'noun without an article');
      if (!('plural' in w)) fail(lemma, 'noun without a plural key (use null for mass nouns)');
    }
    if (w.pos === 'verb') {
      if (!w.partizip2) fail(lemma, 'verb without a Partizip II');
      if (w.aux !== 'haben' && w.aux !== 'sein') fail(lemma, 'verb without an auxiliary');
    }
    for (const field of ['definition_de', 'definition_en', 'example_de', 'example_en'] as const) {
      if (!w[field]?.trim()) fail(lemma, `empty ${field}`);
    }
    if (w.definition_de.toLowerCase().includes(lemma)) {
      fail(lemma, 'the word appears in its own definition');
    }
    if (!exampleUsesWord(w)) fail(lemma, `example does not use the word: ${w.example_de}`);
  }
}

function main(): void {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort();
  const words: Word[] = files.flatMap((f) => JSON.parse(readFileSync(join(DATA_DIR, f), 'utf8')) as Word[]);

  validate(words);

  // A length is only offered if it has a real pool behind it.
  const byLength = new Map<number, Word[]>();
  for (const w of words) {
    const n = letters(w.lemma).length;
    byLength.set(n, [...(byLength.get(n) ?? []), w]);
  }
  for (const n of LENGTHS) {
    const pool = (byLength.get(n) ?? []).filter((w) => w.answer);
    if (pool.length < MIN_POOL) {
      errors.push(`length ${n}: answer pool is ${pool.length}, below the minimum of ${MIN_POOL}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} problem(s) in ${DATA_DIR}:\n`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  for (const [n, group] of [...byLength].sort(([a], [b]) => a - b)) {
    const sorted = group.slice().sort((a, b) => a.lemma.localeCompare(b.lemma, 'de'));
    writeFileSync(join(OUT_DIR, `words.${n}.json`), JSON.stringify(sorted) + '\n');
  }

  // The dictionary validation tier needs more than the answers: a player must be able
  // to spend a guess on a plural or a participle. Everything here is either a curated
  // lemma or a grammatical form of one, so it ships with the app.
  const guesses = new Set<string>();
  for (const w of words) {
    guesses.add(w.lemma);
    for (const form of [w.plural, w.partizip2]) {
      const f = form?.toLowerCase();
      if (f && LEMMA_RE.test(f)) guesses.add(f);
    }
  }
  writeFileSync(join(OUT_DIR, 'guesses.json'), JSON.stringify([...guesses].sort()) + '\n');

  const answers = words.filter((w) => w.answer);
  console.log(`✓ ${words.length} entries valid — ${answers.length} answers, ${guesses.size} accepted guesses\n`);
  console.log('len | answers | A1 | A2 | nouns | verbs | other | with ä ö ü ß');
  console.log('----+---------+----+----+-------+-------+-------+-------------');
  for (const n of LENGTHS) {
    const g = (byLength.get(n) ?? []).filter((w) => w.answer);
    const count = (p: (w: Word) => boolean) => g.filter(p).length;
    const row = [
      String(n).padStart(3),
      String(g.length).padStart(7),
      String(count((w) => w.level === 'A1')).padStart(2),
      String(count((w) => w.level === 'A2')).padStart(2),
      String(count((w) => w.pos === 'noun')).padStart(5),
      String(count((w) => w.pos === 'verb')).padStart(5),
      String(count((w) => w.pos !== 'noun' && w.pos !== 'verb')).padStart(5),
      String(count((w) => /[äöüß]/.test(w.lemma))).padStart(12),
    ];
    console.log(row.join(' | '));
  }

  const freq = new Map<string, number>();
  for (const w of answers) for (const ch of letters(w.lemma)) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const top = [...freq].sort(([, a], [, b]) => b - a).slice(0, 12).map(([c, n]) => `${c} ${n}`);
  console.log(`\nletter frequency: ${top.join(', ')}`);
  const umlauts = ['ä', 'ö', 'ü', 'ß'].map((c) => `${c} ${freq.get(c) ?? 0}`).join(', ');
  console.log(`umlauts and eszett: ${umlauts}`);
}

main();
