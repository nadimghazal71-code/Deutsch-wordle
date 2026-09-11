import { el } from './dom.js';
import { toTile } from '../core/normalise.js';
import type { GameState } from '../core/game.js';
import type { Mark } from '../core/types.js';

const MARK_LABEL: Record<Mark, string> = {
  correct: 'richtig',
  present: 'an anderer Stelle',
  absent: 'nicht im Wort',
};

const MARK_GLYPH: Record<Mark, string> = { correct: '✓', present: '◐', absent: '·' };

/**
 * The board. A role="grid" of rows, with every tile carrying its state in an
 * aria-label and a glyph, so neither a screen reader nor a colour-blind player
 * depends on the tile colour. See docs/ui-ux.md § 5.
 */
export function renderGrid(state: GameState): HTMLElement {
  const rows: HTMLElement[] = [];

  for (let r = 0; r < state.maxAttempts; r++) {
    const guess = state.guesses[r];
    const isCurrentRow = r === state.guesses.length && state.status === 'playing';
    const tiles: HTMLElement[] = [];

    for (let c = 0; c < state.length; c++) {
      if (guess) {
        const letter = guess.letters[c]!;
        const mark = guess.marks[c]!;
        tiles.push(
          el('div', {
            class: 'tile reveal',
            'data-mark': mark,
            role: 'gridcell',
            'aria-label': `${toTile(letter)}, ${MARK_LABEL[mark]}`,
            style: `animation-delay: ${c * 60}ms`,
          }, [toTile(letter), el('span', { class: 'glyph', 'aria-hidden': true, text: MARK_GLYPH[mark] })]),
        );
        continue;
      }

      const letter = isCurrentRow ? state.current[c] : undefined;
      const isActive = isCurrentRow && c === state.current.length;
      tiles.push(
        el('div', {
          class: ['tile', letter ? 'filled' : null, isActive ? 'active' : null].filter(Boolean).join(' '),
          role: 'gridcell',
          'aria-label': letter ? toTile(letter) : 'leer',
        }, [letter ? toTile(letter) : '']),
      );
    }

    const rowClass = isCurrentRow && state.rejection ? 'row invalid' : 'row';
    rows.push(el('div', { class: rowClass, role: 'row' }, tiles));
  }

  return el('div', {
    class: 'board',
    role: 'grid',
    'aria-label': `Spielfeld, ${state.length} Buchstaben, ${state.maxAttempts} Versuche`,
    style: `grid-template-rows: repeat(${state.maxAttempts}, auto)`,
  }, rows);
}

/** The announcement for a freshly scored row. */
export function describeGuess(letters: string[], marks: Mark[]): string {
  return letters.map((ch, i) => `${toTile(ch)} ${MARK_LABEL[marks[i]!]}`).join(', ');
}
