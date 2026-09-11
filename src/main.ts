import { el, clear, announce } from './ui/dom.js';
import { renderSetup } from './ui/setup.js';
import { renderGrid, describeGuess } from './ui/grid.js';
import { renderKeyboard } from './ui/keyboard.js';
import { renderDefinitionCard } from './ui/definition-card.js';
import { renderStats, renderSettings } from './ui/stats.js';
import { keyboardState } from './core/keyboard-state.js';
import { reduce, initialState, shareText, isRoundOver, type GameState } from './core/game.js';
import { letters, toComparable, isDeadKey, isGermanLetter } from './core/normalise.js';
import { answersOfLength, dailyAnswer, practiceAnswer, isoDate } from './core/select.js';
import { LENGTHS, isLength, type Length, type Word } from './core/types.js';
import { load, save, recordResult, statsFor, type Settings, type Store } from './store/persist.js';

import words3 from './data/words.3.json';
import words4 from './data/words.4.json';
import words5 from './data/words.5.json';
import words6 from './data/words.6.json';
import words7 from './data/words.7.json';
import words8 from './data/words.8.json';
import guessList from './data/guesses.json';

const WORDS: Word[] = [...words3, ...words4, ...words5, ...words6, ...words7, ...words8] as Word[];
const GUESSES = new Set<string>(guessList as string[]);
const POOLS = Object.fromEntries(
  LENGTHS.map((n) => [n, answersOfLength(WORDS, n)]),
) as Record<Length, Word[]>;
const POOL_SIZES = Object.fromEntries(
  LENGTHS.map((n) => [n, POOLS[n].length]),
) as Record<Length, number>;
const BY_ID = new Map(WORDS.map((w) => [w.id, w]));

type Overlay = 'none' | 'reveal' | 'stats' | 'settings';

interface AppState {
  store: Store;
  game: GameState;
  selectedLength: Length | null;
  mode: 'daily' | 'practice';
  overlay: Overlay;
  toast: string | null;
}

const app: AppState = {
  store: load(),
  game: initialState(),
  selectedLength: 5,
  mode: 'practice',
  overlay: 'none',
  toast: null,
};

const root = document.getElementById('app')!;

/* ───────────────────────────── actions ───────────────────────────── */

function startRound(length: Length, mode: 'daily' | 'practice'): void {
  const pool = POOLS[length];
  if (pool.length === 0) return;

  const today = isoDate();
  const seen = statsFor(app.store, length).wordsSeen;
  const word = mode === 'daily' ? dailyAnswer(pool, today, length) : practiceAnswer(pool, seen);

  app.game = reduce(app.game, {
    type: 'START',
    length,
    answerId: word.id,
    answer: letters(toComparable(word.lemma)),
    mode,
    date: today,
  });
  app.overlay = 'none';
  render();
  announce(`Neue Runde: ${length} Buchstaben, ${app.game.maxAttempts} Versuche.`);
}

function submit(): void {
  const before = app.game;
  const next = reduce(before, {
    type: 'SUBMIT',
    tier: app.store.settings.validation,
    isKnownWord,
  });
  app.game = next;

  if (next.rejection === 'too-short') {
    announce('Zu kurz.');
    flashToast('Zu kurz');
  } else if (next.rejection === 'unknown-word') {
    announce('Das Wort kenne ich nicht.');
    flashToast('Das Wort kenne ich nicht');
  } else if (next.guesses.length > before.guesses.length) {
    const scored = next.guesses[next.guesses.length - 1]!;
    announce(describeGuess(scored.letters, scored.marks));
    if (isRoundOver(next)) finishRound(next);
    else saveProgress(next);
  }
  render();
}

function isKnownWord(word: string): boolean {
  const tier = app.store.settings.validation;
  if (tier === 'strict') return POOLS[app.game.length].some((w) => w.lemma === word);
  return GUESSES.has(word);
}

function finishRound(game: GameState): void {
  const won = game.status === 'won';
  app.store = recordResult(app.store, game.length, {
    won,
    attempts: game.guesses.length,
    answerId: game.answerId,
    // Only the daily round moves a streak; practice would make it meaningless.
    countsForStreak: game.mode === 'daily',
  });
  const inProgress = { ...app.store.inProgress };
  delete inProgress[game.length];
  app.store = {
    ...app.store,
    inProgress,
    dailyDone: game.mode === 'daily'
      ? { ...app.store.dailyDone, [game.length]: game.date }
      : app.store.dailyDone,
  };
  save(app.store);
  // Let the last row finish flipping before the card covers it.
  window.setTimeout(() => { app.overlay = 'reveal'; render(); }, game.length * 60 + 260);
}

function isDailyDone(length: Length): boolean {
  return app.store.dailyDone[length] === isoDate();
}

/** Saves the round in flight, so a reload resumes it rather than losing it. */
function saveProgress(game: GameState): void {
  if (game.status !== 'playing') return;
  app.store = {
    ...app.store,
    inProgress: {
      ...app.store.inProgress,
      [game.length]: {
        answerId: game.answerId,
        guesses: game.guesses.map((g) => g.letters.join('')),
        date: game.date,
        mode: game.mode,
      },
    },
  };
  save(app.store);
}

/**
 * Rebuilds a saved round by replaying its guesses through the reducer, so the
 * restored state cannot drift from what the reducer would have produced. A daily
 * round from a previous day is discarded rather than resumed.
 */
function restoreRound(): boolean {
  const today = isoDate();
  for (const length of LENGTHS) {
    const saved = app.store.inProgress[length];
    if (!saved) continue;
    if (saved.mode === 'daily' && saved.date !== today) continue;
    const word = BY_ID.get(saved.answerId);
    if (!word) continue;

    let game = reduce(initialState(), {
      type: 'START',
      length,
      answerId: word.id,
      answer: letters(toComparable(word.lemma)),
      mode: saved.mode,
      date: saved.date,
    });
    for (const guess of saved.guesses) {
      for (const letter of letters(guess)) game = reduce(game, { type: 'TYPE_LETTER', letter });
      game = reduce(game, { type: 'SUBMIT', tier: 'open', isKnownWord: () => true });
    }
    if (isRoundOver(game)) continue; // nothing worth resuming
    app.game = game;
    app.selectedLength = length;
    app.mode = saved.mode;
    return true;
  }
  return false;
}

function updateSettings(patch: Partial<Settings>): void {
  app.store = { ...app.store, settings: { ...app.store.settings, ...patch } };
  save(app.store);
  applyTheme();
  render();
}

function applyTheme(): void {
  const { theme, palette, glyphs } = app.store.settings;
  const html = document.documentElement;
  if (theme === 'system') html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', theme);
  html.setAttribute('data-palette', palette === 'cb' ? 'cb' : 'default');
  html.setAttribute('data-glyphs', glyphs ? 'on' : 'off');
}

let toastTimer: number | undefined;
function flashToast(message: string): void {
  app.toast = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { app.toast = null; render(); }, 1600);
}

async function share(): Promise<void> {
  const text = shareText(app.game, new Date().toLocaleDateString('de-DE'));
  try {
    await navigator.clipboard.writeText(text);
    flashToast('Ergebnis kopiert');
  } catch {
    flashToast('Kopieren nicht möglich');
  }
}

/* ───────────────────────────── render ───────────────────────────── */

function render(): void {
  clear(root);
  root.append(header());

  if (app.game.status === 'setup') {
    root.append(renderSetup(POOL_SIZES, app.selectedLength, app.mode, isDailyDone, {
      onChoose: (length) => { app.selectedLength = length; render(); },
      onMode: (mode) => { app.mode = mode; render(); },
      onStart: () => { if (app.selectedLength !== null) startRound(app.selectedLength, app.mode); },
    }));
  } else {
    root.append(el('div', { class: 'board-area' }, [renderGrid(app.game)]));
    root.append(renderKeyboard(keyboardState(app.game.guesses), {
      onLetter: (letter) => { app.game = reduce(app.game, { type: 'TYPE_LETTER', letter }); render(); },
      onEnter: submit,
      onBackspace: () => { app.game = reduce(app.game, { type: 'BACKSPACE' }); render(); },
    }));
  }

  if (app.overlay === 'reveal') {
    const word = BY_ID.get(app.game.answerId);
    if (word) {
      root.append(renderDefinitionCard(word, {
        won: app.game.status === 'won',
        attempts: app.game.guesses.length,
        maxAttempts: app.game.maxAttempts,
      }, {
        onPlayAgain: () => startRound(app.game.length, app.game.mode === 'daily' ? 'practice' : app.game.mode),
        onStats: () => { app.overlay = 'stats'; render(); },
        onShare: () => void share(),
        onClose: () => { app.game = reduce(app.game, { type: 'RESET' }); app.overlay = 'none'; render(); },
      }));
    }
  } else if (app.overlay === 'stats') {
    const length = app.game.status === 'setup' ? (app.selectedLength ?? 5) : app.game.length;
    root.append(renderStats(app.store, length, () => {
      app.overlay = isRoundOver(app.game) ? 'reveal' : 'none';
      render();
    }));
  } else if (app.overlay === 'settings') {
    root.append(renderSettings(app.store.settings, {
      onChange: updateSettings,
      onClose: () => { app.overlay = isRoundOver(app.game) ? 'reveal' : 'none'; render(); },
    }));
  }

  if (app.toast) root.append(el('div', { class: 'toast', role: 'status', text: app.toast }));
}

function header(): HTMLElement {
  const home = el('button', { class: 'icon-button', type: 'button', 'aria-label': 'Zurück zur Auswahl' }, ['←']);
  home.addEventListener('click', () => {
    app.game = reduce(app.game, { type: 'RESET' });
    app.overlay = 'none';
    render();
  });

  const stats = el('button', { class: 'icon-button', type: 'button', 'aria-label': 'Statistik' }, ['📊']);
  stats.addEventListener('click', () => { app.overlay = 'stats'; render(); });

  const settings = el('button', { class: 'icon-button', type: 'button', 'aria-label': 'Einstellungen' }, ['⚙']);
  settings.addEventListener('click', () => { app.overlay = 'settings'; render(); });

  return el('header', { class: 'header' }, [
    app.game.status === 'setup' ? el('span', { style: 'width: 2.25rem' }) : home,
    el('h1', { text: 'Deutsch-Wordle' }),
    el('div', { class: 'header-actions' }, [stats, settings]),
  ]);
}

/* ───────────────────────────── physical keyboard ───────────────────────────── */

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (event.key === 'Escape') {
    if (app.overlay !== 'none') {
      app.overlay = app.overlay === 'reveal' ? 'none' : (isRoundOver(app.game) ? 'reveal' : 'none');
      if (app.overlay === 'none' && isRoundOver(app.game)) app.game = reduce(app.game, { type: 'RESET' });
      render();
    }
    return;
  }
  if (app.overlay !== 'none' || app.game.status !== 'playing') return;

  if (event.key === 'Enter') { event.preventDefault(); submit(); return; }
  if (event.key === 'Backspace') { event.preventDefault(); app.game = reduce(app.game, { type: 'BACKSPACE' }); render(); return; }
  if (isDeadKey(event.key)) { event.preventDefault(); app.game = reduce(app.game, { type: 'DEAD_KEY' }); render(); return; }

  const key = event.key.toLowerCase();
  if (letters(key).length === 1 && isGermanLetter(key)) {
    event.preventDefault();
    app.game = reduce(app.game, { type: 'TYPE_LETTER', letter: key });
    render();
  }
});

/* ───────────────────────────── boot ───────────────────────────── */

applyTheme();
restoreRound();
render();

// Expose a tiny hook for the smoke test in tests/smoke — not used by the app itself.
declare global { interface Window { __dw?: { isLength: typeof isLength } } }
window.__dw = { isLength };
