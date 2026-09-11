import { el } from './dom.js';
import { LENGTHS, type Length } from '../core/types.js';
import type { LengthStats, Settings, Store } from '../store/persist.js';
import { statsFor } from '../store/persist.js';

/** Stats are per length: a 3-letter streak and an 8-letter streak are not the same. */
export function renderStats(store: Store, length: Length, onClose: () => void): HTMLElement {
  const s = statsFor(store, length);
  const winRate = s.played === 0 ? 0 : Math.round((s.won / s.played) * 100);
  const best = Math.max(...s.distribution, 0);

  const card = el('div', { class: 'card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Statistik', tabindex: '-1' }, [
    el('h2', { class: 'headword' }, [`Statistik · ${length} Buchstaben`]),
    el('div', { class: 'stats-figures' }, [
      figure(String(s.played), 'Runden'),
      figure(`${winRate}%`, 'gewonnen'),
      figure(String(s.streak), 'Serie'),
      figure(String(s.bestStreak), 'beste Serie'),
      figure(String(s.wordsSeen.length), 'Wörter gesehen'),
    ]),
    el('hr', {}),
    el('p', { class: 'grammar', text: 'Verteilung der Versuche' }),
    el('div', { class: 'dist' }, s.distribution.map((count, i) =>
      el('div', { class: 'dist-row' }, [
        el('span', { class: 'n', text: String(i + 1) }),
        el('span', {
          class: count > 0 && count === best ? 'bar best' : 'bar',
          style: `flex: 0 0 ${count === 0 ? 1.5 : 1.5 + (count / best) * 70}%`,
          text: String(count),
        }),
      ]),
    )),
    el('hr', {}),
    el('p', { class: 'grammar', text: 'Alle Längen' }),
    el('div', { class: 'dist' }, LENGTHS.map((n) => {
      const other = statsFor(store, n);
      return el('div', { class: 'dist-row' }, [
        el('span', { class: 'n', text: String(n) }),
        el('span', { class: 'bar', style: 'flex: 0 0 auto; background: var(--surface-2); color: var(--text-dim)' }, [
          `${other.won}/${other.played}`,
        ]),
        el('span', { class: 'label', style: 'color: var(--text-dim); font-size: 0.72rem' }, [
          `${other.wordsSeen.length} Wörter`,
        ]),
      ]);
    })),
    closeRow(onClose),
  ]);

  const backdrop = el('div', { class: 'card-backdrop' }, [card]);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) onClose(); });
  requestAnimationFrame(() => card.focus());
  return backdrop;
}

export interface SettingsHandlers {
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

export function renderSettings(settings: Settings, handlers: SettingsHandlers): HTMLElement {
  const card = el('div', { class: 'card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Einstellungen', tabindex: '-1' }, [
    el('h2', { class: 'headword' }, ['Einstellungen']),
    el('hr', {}),

    setting('Farben', 'Orange und Blau statt Grün und Gelb.', segmented([
      ['Standard', settings.palette === 'default', () => handlers.onChange({ palette: 'default' })],
      ['Farbenblind', settings.palette === 'cb', () => handlers.onChange({ palette: 'cb' })],
    ])),

    setting('Symbole auf den Feldern', '✓ richtig, ◐ im Wort, · nicht im Wort.', segmented([
      ['Aus', !settings.glyphs, () => handlers.onChange({ glyphs: false })],
      ['An', settings.glyphs, () => handlers.onChange({ glyphs: true })],
    ])),

    setting('Design', 'Hell, dunkel oder wie das System.', segmented([
      ['System', settings.theme === 'system', () => handlers.onChange({ theme: 'system' })],
      ['Hell', settings.theme === 'light', () => handlers.onChange({ theme: 'light' })],
      ['Dunkel', settings.theme === 'dark', () => handlers.onChange({ theme: 'dark' })],
    ])),

    setting('Wörter prüfen', 'Streng: nur Wörter aus der Liste. Offen: alles wird angenommen.', segmented([
      ['Offen', settings.validation === 'open', () => handlers.onChange({ validation: 'open' })],
      ['Liste', settings.validation === 'dictionary', () => handlers.onChange({ validation: 'dictionary' })],
      ['Streng', settings.validation === 'strict', () => handlers.onChange({ validation: 'strict' })],
    ])),

    setting('Hinweise', 'Einen Hinweis pro Runde erlauben.', segmented([
      ['Aus', !settings.hints, () => handlers.onChange({ hints: false })],
      ['An', settings.hints, () => handlers.onChange({ hints: true })],
    ])),

    closeRow(handlers.onClose),
  ]);

  const backdrop = el('div', { class: 'card-backdrop' }, [card]);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) handlers.onClose(); });
  requestAnimationFrame(() => card.focus());
  return backdrop;
}

function figure(value: string, label: string): HTMLElement {
  return el('div', { class: 'figure' }, [
    el('div', { class: 'value', text: value }),
    el('div', { class: 'label', text: label }),
  ]);
}

function setting(label: string, note: string, control: HTMLElement): HTMLElement {
  return el('div', { class: 'setting' }, [
    el('div', { class: 'label' }, [label, el('small', { text: note })]),
    control,
  ]);
}

function segmented(options: [label: string, active: boolean, onClick: () => void][]): HTMLElement {
  return el('div', { class: 'segmented' }, options.map(([label, active, onClick]) => {
    const button = el('button', { type: 'button', 'aria-pressed': active ? 'true' : 'false' }, [label]);
    button.addEventListener('click', onClick);
    return button;
  }));
}

function closeRow(onClose: () => void): HTMLElement {
  const button = el('button', { class: 'primary', type: 'button' }, ['Schließen']);
  button.addEventListener('click', onClose);
  return el('div', { class: 'card-actions' }, [button]);
}

export type { LengthStats };
