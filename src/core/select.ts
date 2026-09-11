import type { Length, Word } from './types.js';
import { letters } from './normalise.js';

/** Launch epoch for daily puzzles. Changing this shifts every historical puzzle. */
export const DAILY_EPOCH = '2026-01-01';

const MS_PER_DAY = 86_400_000;

/** Local-calendar ISO date (YYYY-MM-DD). Not UTC: the daily puzzle turns over at local midnight. */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysSinceEpoch(iso: string, epoch: string = DAILY_EPOCH): number {
  const [ey, em, ed] = epoch.split('-').map(Number) as [number, number, number];
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const a = Date.UTC(ey, em - 1, ed);
  const b = Date.UTC(y, m - 1, d);
  return Math.floor((b - a) / MS_PER_DAY);
}

/** FNV-1a. Small, deterministic, and stable across engines — which is the whole requirement. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — a tiny seeded PRNG, adequate for shuffling a word list. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Fisher–Yates with a seeded source. Does not mutate the input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const rnd = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function answersOfLength(words: readonly Word[], length: Length): Word[] {
  return words.filter((w) => w.answer && letters(w.lemma).length === length);
}

/**
 * The daily answer for a (date, length). Deterministic, offline, identical for every
 * player.
 *
 * A shuffled permutation rather than `pool[hash(date) % pool.length]`: independent
 * sampling repeats words within days, which is unacceptable at length 3 where the
 * pool is small. A permutation guarantees every word appears once before any repeat,
 * and reshuffles each cycle so the order is not memorisable.
 */
export function dailyAnswer(pool: readonly Word[], iso: string, length: Length): Word {
  if (pool.length === 0) throw new Error(`dailyAnswer(): empty pool for length ${length}`);
  const period = pool.length;
  const epochDay = daysSinceEpoch(iso);
  // Floor division, so dates before the epoch still land on a valid cycle.
  const cycle = Math.floor(epochDay / period);
  const index = ((epochDay % period) + period) % period;
  const ordered = seededShuffle(pool, hash(`${length}:${cycle}`));
  return ordered[index]!;
}

/**
 * A practice answer, avoiding the most recently seen ids so the mode does not feel
 * repetitive. For small pools the avoid-window shrinks rather than starving.
 */
export function practiceAnswer(
  pool: readonly Word[],
  recentIds: readonly string[],
  random: () => number = Math.random,
): Word {
  if (pool.length === 0) throw new Error('practiceAnswer(): empty pool');
  const window = Math.min(20, Math.floor(pool.length / 3));
  const avoid = new Set(recentIds.slice(-window));
  const candidates = pool.filter((w) => !avoid.has(w.id));
  const from = candidates.length > 0 ? candidates : pool;
  return from[Math.floor(random() * from.length)]!;
}
