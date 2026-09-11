import type { Length, ValidationTier } from '../core/types.js';

/**
 * localStorage persistence. Every read is wrapped: private-mode browsers throw on
 * access and the game must stay playable, so a failure degrades to defaults rather
 * than breaking the app. See docs/architecture.md § 7.
 */
const KEY = 'dw:v1';
const SCHEMA = 1;

export interface LengthStats {
  played: number;
  won: number;
  streak: number;
  bestStreak: number;
  /** distribution[i] = wins on attempt i+1 */
  distribution: number[];
  /** Ids of answers this player has met — the number that reflects vocabulary learned. */
  wordsSeen: string[];
}

export interface SavedRound {
  answerId: string;
  guesses: string[];
  date: string;
  mode: 'daily' | 'practice';
}

export interface Settings {
  validation: ValidationTier;
  hints: boolean;
  palette: 'default' | 'cb';
  glyphs: boolean;
  theme: 'system' | 'light' | 'dark';
}

export interface Store {
  schema: number;
  settings: Settings;
  /** An unfinished round per length, so a reload resumes instead of losing it. */
  inProgress: Partial<Record<Length, SavedRound>>;
  /** ISO date of the last completed daily round per length, to block a replay. */
  dailyDone: Partial<Record<Length, string>>;
  stats: Partial<Record<Length, LengthStats>>;
}

export const defaultSettings = (): Settings => ({
  // `open` is the default rather than `dictionary`: shipping a full German word list
  // is a licensing question (see docs/word-list.md § 4), and rejecting a beginner's
  // real word is worse than accepting a nonsense one.
  validation: 'open',
  hints: false,
  palette: 'default',
  glyphs: false,
  theme: 'system',
});

export const emptyStats = (length: Length): LengthStats => ({
  played: 0,
  won: 0,
  streak: 0,
  bestStreak: 0,
  distribution: new Array(attemptsCount(length)).fill(0),
  wordsSeen: [],
});

/** Local copy of the attempts rule, so the store does not depend on core. */
function attemptsCount(length: number): number {
  return Math.ceil(length / 2) + 3;
}

const fresh = (): Store => ({ schema: SCHEMA, settings: defaultSettings(), inProgress: {}, dailyDone: {}, stats: {} });

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<Store>;
    if (parsed.schema !== SCHEMA) return migrate(parsed);
    return {
      schema: SCHEMA,
      settings: { ...defaultSettings(), ...parsed.settings },
      inProgress: parsed.inProgress ?? {},
      dailyDone: parsed.dailyDone ?? {},
      stats: parsed.stats ?? {},
    };
  } catch {
    return fresh();
  }
}

/**
 * Schema migrations live here. There is only one version so far; the hook exists
 * because losing a player's stats to an unversioned shape change is self-inflicted.
 */
function migrate(old: Partial<Store>): Store {
  return { ...fresh(), settings: { ...defaultSettings(), ...old.settings } };
}

export function save(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable or full. The round in memory still plays fine.
  }
}

export function statsFor(store: Store, length: Length): LengthStats {
  const existing = store.stats[length];
  if (!existing) return emptyStats(length);
  // Guard against a distribution shorter than the attempt count (e.g. edited by hand).
  const needed = attemptsCount(length);
  if (existing.distribution.length < needed) {
    return { ...existing, distribution: [...existing.distribution, ...new Array(needed - existing.distribution.length).fill(0)] };
  }
  return existing;
}

export function recordResult(
  store: Store,
  length: Length,
  outcome: { won: boolean; attempts: number; answerId: string; countsForStreak: boolean },
): Store {
  const s = statsFor(store, length);
  const distribution = s.distribution.slice();
  if (outcome.won && outcome.attempts >= 1 && outcome.attempts <= distribution.length) {
    distribution[outcome.attempts - 1] = (distribution[outcome.attempts - 1] ?? 0) + 1;
  }
  const streak = outcome.countsForStreak ? (outcome.won ? s.streak + 1 : 0) : s.streak;
  const updated: LengthStats = {
    played: s.played + 1,
    won: s.won + (outcome.won ? 1 : 0),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    distribution,
    wordsSeen: s.wordsSeen.includes(outcome.answerId) ? s.wordsSeen : [...s.wordsSeen, outcome.answerId],
  };
  return { ...store, stats: { ...store.stats, [length]: updated } };
}
