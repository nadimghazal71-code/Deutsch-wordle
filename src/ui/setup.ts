import { el } from './dom.js';
import { LENGTHS, type Length } from '../core/types.js';
import { attemptsFor } from '../core/attempts.js';

export interface SetupHandlers {
  onChoose: (length: Length) => void;
  onMode: (mode: 'daily' | 'practice') => void;
  onStart: () => void;
}

/**
 * The chooser shows the real answer-pool size under each length. That is the honest
 * way to surface a small pool instead of hiding it — see docs/game-design.md § 2.
 */
export function renderSetup(
  poolSizes: Record<Length, number>,
  selected: Length | null,
  mode: 'daily' | 'practice',
  dailyDone: (length: Length) => boolean,
  handlers: SetupHandlers,
): HTMLElement {
  const options = LENGTHS.map((length) => {
    const pool = poolSizes[length];
    const button = el('button', {
      class: 'length-option',
      type: 'button',
      'aria-pressed': selected === length ? 'true' : 'false',
      'aria-label': `${length} Buchstaben, ${pool} Wörter, ${attemptsFor(length)} Versuche`,
    }, [
      el('span', { class: 'n', text: String(length) }),
      el('span', { class: 'pool', text: `${pool} Wörter` }),
      el('span', { class: 'attempts', text: `${attemptsFor(length)} Versuche` }),
    ]);
    button.addEventListener('click', () => handlers.onChoose(length));
    return button;
  });

  const modeButton = (value: 'daily' | 'practice', label: string, note: string) => {
    const button = el('button', {
      class: 'mode-option',
      type: 'button',
      'aria-pressed': mode === value ? 'true' : 'false',
    }, [label, el('small', { text: note })]);
    button.addEventListener('click', () => handlers.onMode(value));
    return button;
  };

  const start = el('button', {
    class: 'primary',
    type: 'button',
    disabled: selected === null || (mode === 'daily' && selected !== null && dailyDone(selected)),
  }, [
    selected !== null && mode === 'daily' && dailyDone(selected)
      ? 'Heute schon gespielt'
      : 'Starten',
  ]);
  start.addEventListener('click', handlers.onStart);

  const smallPool = selected !== null && poolSizes[selected] < 40
    ? el('p', {
        class: 'small-pool',
        text: `Kleiner Wortschatz: nur ${poolSizes[selected]} Wörter mit ${selected} Buchstaben. `
            + 'Im Täglich-Modus kommt jedes Wort einmal, bevor sich etwas wiederholt.',
      })
    : null;

  return el('section', { class: 'setup' }, [
    el('h2', { text: 'Wie viele Buchstaben?' }),
    el('p', { class: 'lede', text: 'Wortschatz Goethe A1 und A2. Am Ende jeder Runde gibt es die Bedeutung.' }),
    el('div', { class: 'length-grid', role: 'group', 'aria-label': 'Wortlänge' }, options),
    smallPool,
    el('div', { class: 'mode-row', role: 'group', 'aria-label': 'Modus' }, [
      modeButton('daily', 'Täglich', 'ein Wort pro Tag'),
      modeButton('practice', 'Üben', 'so oft du willst'),
    ]),
    start,
    el('p', { class: 'hint' }, [
      'Tipp: ', el('kbd', { text: ';u' }), ' wird zu ü — oder tippe auf Ä Ö Ü ß.',
    ]),
  ]);
}
