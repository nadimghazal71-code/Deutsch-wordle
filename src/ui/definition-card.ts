import { el, announce } from './dom.js';
import type { Word } from '../core/types.js';

const POS_DE: Record<Word['pos'], string> = {
  noun: 'Substantiv',
  verb: 'Verb',
  adj: 'Adjektiv',
  adv: 'Adverb',
  num: 'Zahlwort',
  other: 'Wort',
};

export interface CardActions {
  onPlayAgain: () => void;
  onStats: () => void;
  onShare: () => void;
  onClose: () => void;
}

/**
 * The payoff. Identical whether the player won or lost — the card is the lesson
 * either way. See docs/game-design.md § 6.
 */
export function renderDefinitionCard(
  word: Word,
  outcome: { won: boolean; attempts: number; maxAttempts: number },
  actions: CardActions,
): HTMLElement {
  const headword = word.pos === 'noun' && word.article ? `${word.article} ${word.display}` : word.display;

  const result = outcome.won
    ? `Geschafft in ${outcome.attempts} von ${outcome.maxAttempts} Versuchen.`
    : 'Das Wort war:';

  const card = el('div', {
    class: 'card',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': `Wort: ${headword}`,
    tabindex: '-1',
  }, [
    el('p', { class: 'result', text: result }),
    el('h2', { class: 'headword' }, [
      el('span', { lang: 'de', text: headword }),
      el('span', { class: 'level', text: word.level }),
    ]),
    inflectionLine(word),
    el('p', { class: 'grammar', text: `${POS_DE[word.pos]} · ${word.topic}` }),
    el('hr', {}),
    el('p', { class: 'definition', lang: 'de', text: word.definition_de }),
    el('p', { class: 'gloss', lang: 'en', text: word.definition_en }),
    el('p', { class: 'example' }, [
      el('span', { lang: 'de', text: `„${word.example_de}“` }),
      el('span', { class: 'translation', lang: 'en', text: word.example_en }),
    ]),
    el('div', { class: 'card-actions' }, [
      button('Nochmal spielen', 'primary', actions.onPlayAgain),
      button('📊', 'secondary', actions.onStats, 'Statistik'),
      button('⤳', 'secondary', actions.onShare, 'Ergebnis kopieren'),
    ]),
  ]);

  const backdrop = el('div', { class: 'card-backdrop' }, [card]);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) actions.onClose();
  });

  // The card takes focus when it opens, and is announced in full.
  requestAnimationFrame(() => card.focus());
  announce(`${result} ${headword}. ${word.definition_de} ${word.definition_en}.`);

  return backdrop;
}

/** What a learner actually needs, per part of speech. */
function inflectionLine(word: Word): HTMLElement {
  if (word.pos === 'noun') {
    // The plural article is always "die", whatever the singular gender.
    const plural = word.plural ? `Plural: die ${word.plural}` : 'Kein Plural';
    return el('p', { class: 'inflection', lang: 'de', text: plural });
  }
  if (word.pos === 'verb' && word.partizip2) {
    const aux = word.aux === 'sein' ? ' (ist)' : '';
    const separable = word.separable ? ' · trennbar' : '';
    return el('p', { class: 'inflection', lang: 'de', text: `Partizip II: ${word.partizip2}${aux}${separable}` });
  }
  return el('p', { class: 'inflection', text: '' });
}

function button(label: string, className: string, onClick: () => void, ariaLabel?: string): HTMLElement {
  const node = el('button', { class: className, type: 'button', 'aria-label': ariaLabel ?? null }, [label]);
  node.addEventListener('click', onClick);
  return node;
}
