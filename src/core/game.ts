import type { Length, Mark, ScoredGuess, GameStatus, ValidationTier } from './types.js';
import { attemptsFor } from './attempts.js';
import { score, isWin } from './score.js';
import { letters, umlautFor, isAllGermanLetters } from './normalise.js';

export interface GameState {
  status: GameStatus;
  length: Length;
  /** The answer's id, never the plaintext word — see docs/architecture.md § 6. */
  answerId: string;
  /** Comparable (lowercase) letters of the answer. */
  answer: string[];
  guesses: ScoredGuess[];
  /** The row being typed. */
  current: string[];
  maxAttempts: number;
  mode: 'daily' | 'practice';
  /** Local ISO date the round was started on, so a stale daily round is discarded. */
  date: string;
  /** Set when a submit is rejected, for the UI to announce and animate. */
  rejection: 'too-short' | 'unknown-word' | null;
  /** True after a dead key (`;`), so the next a/o/u/s becomes ä/ö/ü/ß. */
  deadKey: boolean;
}

export type Action =
  | { type: 'START'; length: Length; answerId: string; answer: string[]; mode: 'daily' | 'practice'; date: string }
  | { type: 'TYPE_LETTER'; letter: string }
  | { type: 'DEAD_KEY' }
  | { type: 'BACKSPACE' }
  | { type: 'SUBMIT'; isKnownWord: (word: string) => boolean; tier: ValidationTier }
  | { type: 'RESET' };

export function initialState(): GameState {
  return {
    status: 'setup',
    length: 5,
    answerId: '',
    answer: [],
    guesses: [],
    current: [],
    maxAttempts: attemptsFor(5),
    mode: 'practice',
    date: '',
    rejection: null,
    deadKey: false,
  };
}

/**
 * The whole game, as a reducer. Nothing about tile colour is computed while typing:
 * only SUBMIT scores, so a half-typed row cannot leak information through a render
 * path. An invalid guess must not mutate anything except `rejection`.
 */
export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START':
      return {
        status: 'playing',
        length: action.length,
        answerId: action.answerId,
        answer: action.answer,
        guesses: [],
        current: [],
        maxAttempts: attemptsFor(action.length),
        mode: action.mode,
        date: action.date,
        rejection: null,
        deadKey: false,
      };

    case 'DEAD_KEY': {
      if (state.status !== 'playing') return state;
      return { ...state, deadKey: true, rejection: null };
    }

    case 'TYPE_LETTER': {
      if (state.status !== 'playing') return state;
      const typed = action.letter.toLowerCase();
      if (!isAllGermanLetters(typed) || letters(typed).length !== 1) return state;

      // A pending dead key turns a/o/u/s into ä/ö/ü/ß; anything else just clears it.
      const letter = state.deadKey ? (umlautFor(typed) ?? typed) : typed;

      if (state.current.length >= state.length) {
        return state.deadKey ? { ...state, deadKey: false } : state;
      }
      return { ...state, current: [...state.current, letter], rejection: null, deadKey: false };
    }

    case 'BACKSPACE': {
      if (state.status !== 'playing') return state;
      if (state.deadKey) return { ...state, deadKey: false, rejection: null };
      if (state.current.length === 0) return state;
      return { ...state, current: state.current.slice(0, -1), rejection: null };
    }

    case 'SUBMIT': {
      if (state.status !== 'playing') return state;

      if (state.current.length !== state.length) {
        return { ...state, rejection: 'too-short' };
      }
      const word = state.current.join('');
      if (action.tier !== 'open' && !action.isKnownWord(word)) {
        // A rejected guess does not consume an attempt.
        return { ...state, rejection: 'unknown-word' };
      }

      const marks: Mark[] = score(state.current, state.answer);
      const guesses = [...state.guesses, { letters: state.current, marks }];
      const won = isWin(marks);
      const status: GameStatus = won ? 'won' : guesses.length >= state.maxAttempts ? 'lost' : 'playing';

      return { ...state, guesses, current: [], status, rejection: null, deadKey: false };
    }

    case 'RESET':
      return initialState();
  }
}

export function isRoundOver(state: GameState): boolean {
  return state.status === 'won' || state.status === 'lost';
}

/** Emoji grid for sharing. Must never contain the answer — see docs/game-design.md § 9. */
export function shareText(state: GameState, dateLabel: string): string {
  const glyph: Record<Mark, string> = { correct: '🟩', present: '🟨', absent: '⬜' };
  const rows = state.guesses.map((g) => g.marks.map((m) => glyph[m]).join('')).join('\n');
  const result = state.status === 'won' ? `${state.guesses.length}/${state.maxAttempts}` : `X/${state.maxAttempts}`;
  const head = `Deutsch-Wordle ${state.length} Buchstaben · ${dateLabel}`;
  return `${head}\n${rows}\n${result}`;
}
