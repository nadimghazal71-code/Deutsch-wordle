import { el } from './dom.js';
import { toTile } from '../core/normalise.js';
import type { KeyState } from '../core/types.js';

/**
 * QWERTZ — the German layout, so the muscle memory transfers to a real German
 * keyboard. Ä Ö Ü extend the middle row and ß the bottom one: 30 letter keys,
 * because one word in ten needs them. See docs/ui-ux.md § 3.
 */
export const ROWS: readonly string[][] = [
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
  ['ENTER', 'y', 'x', 'c', 'v', 'b', 'n', 'm', 'ß', 'ü', 'BACK'],
];

export interface KeyboardHandlers {
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

export function renderKeyboard(states: Map<string, KeyState>, handlers: KeyboardHandlers): HTMLElement {
  const rows = ROWS.map((row) =>
    el('div', { class: 'keyboard-row' }, row.map((key) => {
      if (key === 'ENTER') {
        const button = el('button', { class: 'key wide', type: 'button', 'aria-label': 'Wort abschicken' }, ['Enter']);
        button.addEventListener('click', handlers.onEnter);
        return button;
      }
      if (key === 'BACK') {
        const button = el('button', { class: 'key wide', type: 'button', 'aria-label': 'Buchstabe löschen' }, ['⌫']);
        button.addEventListener('click', handlers.onBackspace);
        return button;
      }

      const state = states.get(key);
      const button = el('button', {
        class: 'key',
        type: 'button',
        'data-key': key,
        'data-state': state && state !== 'unused' ? state : null,
        'aria-label': ariaLabel(key, state),
      }, [toTile(key)]);
      button.addEventListener('click', () => handlers.onLetter(key));
      return button;
    })),
  );

  return el('div', { class: 'keyboard', role: 'group', 'aria-label': 'Tastatur' }, rows);
}

/**
 * Give up and see the word. Two clicks rather than one: losing a round you were still
 * thinking about because of a mis-click would be worse than the extra click.
 */
export function renderGiveUp(confirming: boolean, onPress: () => void): HTMLElement {
  const button = el('button', {
    class: confirming ? 'give-up confirming' : 'give-up',
    type: 'button',
    'aria-label': confirming ? 'Wirklich aufgeben und das Wort zeigen' : 'Aufgeben',
  }, [confirming ? 'Wirklich aufgeben?' : 'Aufgeben']);
  button.addEventListener('click', onPress);
  return el('div', { class: 'give-up-row' }, [button]);
}

function ariaLabel(key: string, state: KeyState | undefined): string {
  const suffix =
    state === 'correct' ? ', richtig' :
    state === 'present' ? ', im Wort' :
    state === 'absent' ? ', nicht im Wort' : '';
  return `${toTile(key)}${suffix}`;
}
