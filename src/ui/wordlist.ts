import { el } from './dom.js';
import {
  searchVocabulary, countByLength, headword,
  type VocabularyFilter, type VocabularyFilterPatch,
} from '../core/vocabulary.js';
import { LENGTHS, type Length, type Word } from '../core/types.js';

const POS_DE: Record<Word['pos'], string> = {
  noun: 'Substantiv', verb: 'Verb', adj: 'Adjektiv', adv: 'Adverb', num: 'Zahlwort', other: 'Wort',
};

export interface WordListHandlers {
  onFilter: (patch: VocabularyFilterPatch) => void;
  onSelect: (word: Word | null) => void;
  onClose: () => void;
}

/**
 * The word list — every answer the game can set, readable outside a round, so the app
 * works as a vocabulary trainer and not only as a puzzle. Reachable from the setup
 * screen. See docs/game-design.md § 12.
 */
export function renderWordList(
  words: readonly Word[],
  filter: VocabularyFilter,
  selected: Word | null,
  handlers: WordListHandlers,
): HTMLElement {
  if (selected) return renderDetail(selected, handlers);

  const matches = searchVocabulary(words, filter);
  const counts = countByLength(words);

  const search = el('input', {
    class: 'search',
    type: 'search',
    value: filter.query ?? '',
    placeholder: 'Suchen — deutsch oder englisch',
    'aria-label': 'Wort suchen, auf Deutsch oder Englisch',
  }) as HTMLInputElement;
  search.addEventListener('input', () => handlers.onFilter({ query: search.value }));

  const chip = (label: string, active: boolean, patch: VocabularyFilterPatch, ariaLabel?: string) => {
    const button = el('button', {
      class: active ? 'chip active' : 'chip',
      type: 'button',
      'aria-pressed': active ? 'true' : 'false',
      'aria-label': ariaLabel ?? null,
    }, [label]);
    button.addEventListener('click', () => handlers.onFilter(patch));
    return button;
  };

  const rows = matches.map((word) => {
    const row = el('button', { class: 'word-row', type: 'button' }, [
      el('span', { class: 'word-row-head' }, [
        el('span', { class: 'word-row-word', lang: 'de', text: headword(word) }),
        el('span', { class: 'word-row-level', text: word.level }),
      ]),
      el('span', { class: 'word-row-gloss', lang: 'en', text: word.definition_en }),
    ]);
    row.addEventListener('click', () => handlers.onSelect(word));
    return row;
  });

  const card = el('div', {
    class: 'card card-tall', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Wortliste', tabindex: '-1',
  }, [
    el('h2', { class: 'headword' }, ['Wortliste']),
    el('p', { class: 'grammar', text: `${matches.length} von ${searchVocabulary(words).length} Wörtern` }),
    search,
    el('div', { class: 'chips', role: 'group', 'aria-label': 'Nach Länge filtern' }, [
      chip('Alle', filter.length === undefined, { length: undefined }, 'Alle Längen'),
      ...LENGTHS.map((n) => chip(String(n), filter.length === n, { length: n }, `${n} Buchstaben, ${counts.get(n) ?? 0} Wörter`)),
    ]),
    el('div', { class: 'chips', role: 'group', 'aria-label': 'Nach Niveau filtern' }, [
      chip('A1 + A2', filter.level === undefined, { level: undefined }),
      chip('A1', filter.level === 'A1', { level: 'A1' }),
      chip('A2', filter.level === 'A2', { level: 'A2' }),
    ]),
    matches.length === 0
      ? el('p', { class: 'empty', text: 'Kein Wort gefunden.' })
      : el('div', { class: 'word-rows' }, rows),
    el('div', { class: 'card-actions' }, [closeButton(handlers.onClose)]),
  ]);

  const backdrop = el('div', { class: 'card-backdrop' }, [card]);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) handlers.onClose(); });
  requestAnimationFrame(() => search.focus());
  return backdrop;
}

/** One word in full — the same content as the end-of-round card, without the result. */
function renderDetail(word: Word, handlers: WordListHandlers): HTMLElement {
  const back = el('button', { class: 'secondary', type: 'button' }, ['← Zurück']);
  back.addEventListener('click', () => handlers.onSelect(null));

  const card = el('div', {
    class: 'card', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Wort: ${headword(word)}`, tabindex: '-1',
  }, [
    el('h2', { class: 'headword' }, [
      el('span', { lang: 'de', text: headword(word) }),
      el('span', { class: 'level', text: word.level }),
    ]),
    el('p', { class: 'inflection', lang: 'de', text: inflection(word) }),
    el('p', { class: 'grammar', text: `${POS_DE[word.pos]} · ${word.topic} · ${[...word.lemma].length} Buchstaben` }),
    el('hr', {}),
    el('p', { class: 'definition', lang: 'de', text: word.definition_de }),
    el('p', { class: 'gloss', lang: 'en', text: word.definition_en }),
    el('p', { class: 'example' }, [
      el('span', { lang: 'de', text: `„${word.example_de}“` }),
      el('span', { class: 'translation', lang: 'en', text: word.example_en }),
    ]),
    el('div', { class: 'card-actions' }, [back, closeButton(handlers.onClose)]),
  ]);

  const backdrop = el('div', { class: 'card-backdrop' }, [card]);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) handlers.onClose(); });
  requestAnimationFrame(() => card.focus());
  return backdrop;
}

function inflection(word: Word): string {
  if (word.pos === 'noun') return word.plural ? `Plural: die ${word.plural}` : 'Kein Plural';
  if (word.pos === 'verb' && word.partizip2) {
    const aux = word.aux === 'sein' ? ' (ist)' : '';
    return `Partizip II: ${word.partizip2}${aux}${word.separable ? ' · trennbar' : ''}`;
  }
  return '';
}

function closeButton(onClose: () => void): HTMLElement {
  const button = el('button', { class: 'primary', type: 'button' }, ['Schließen']);
  button.addEventListener('click', onClose);
  return button;
}

export type { Length };
