# Contributing

The most valuable contribution to this project is a **good word entry**. The code is
a grid; the data is the game.

## Adding or fixing a word

1. Find the right file: `data/words/<length>.json`, where length is the letter count
   with `ä ö ü ß` each counting as **one** letter (`Straße` is 6, `Brötchen` is 8).
2. Add one object following the schema in
   [docs/word-list.md § 2](docs/word-list.md#2-entry-schema). Keep the array sorted by
   `lemma`.
3. Run `npm run build:words`. It fails on a bad entry and tells you which field.
4. Open a PR describing the word and, for a correction, the source for the fix.

## What a good entry looks like

```json
{
  "id": "a1-kaese",
  "lemma": "käse",
  "display": "Käse",
  "level": "A2",
  "pos": "noun",
  "topic": "Essen und Trinken",
  "article": "der",
  "plural": null,
  "definition_de": "Ein Essen aus Milch. Man isst es oft auf Brot.",
  "definition_en": "cheese",
  "example_de": "Ich esse Käse auf dem Brot.",
  "example_en": "I eat cheese on bread.",
  "source": "goethe-a2",
  "answer": true
}
```

Checklist for the fields that reviewers actually push back on:

- **`lemma` is lowercase and uses the real letters.** `käse`, never `kaese` and never
  `a` + a combining umlaut. The build rejects NFD input.
- **`display` carries the true capitalisation** — nouns capitalised, verbs and
  adjectives not.
- **Nouns need `article` and `plural`.** `plural: null` is only for nouns with no
  usable plural (`das Wasser`); leaving it out is an error, not a shortcut.
- **`definition_de` is in German, at or below the word's level, one sentence, and does
  not contain the word being defined.**
- **`example_de` is a sentence a beginner could say** and contains the word, with the
  article for nouns.

Full guidance: [docs/word-list.md § 5](docs/word-list.md#5-writing-definitions).

## Do not paste source text

The Goethe-Institut word lists are copyrighted. They tell us **which words** belong at
A1 and A2 — that is all this project takes from them. Definitions, examples and
translations must be **written for this repository**. A PR that copies Goethe's
definition or example wording will be rejected. See
[docs/word-list.md § Sourcing and licence](docs/word-list.md#sourcing-and-licence).

## Code contributions

- **`src/core/` stays pure.** No DOM, no storage, no framework imports. It is a pure
  function over strings and that is what makes it testable.
- **Touching `core/score.ts` means adding a test case.** The table in
  [docs/architecture.md § 8](docs/architecture.md#8-testing) is the minimum bar, and
  the repeated-letter and `ß` cases must stay green.
- **Never normalise away umlauts or fold `ß` to `ss`** in a comparison path. If you
  think you need to, read
  [docs/architecture.md § 4](docs/architecture.md#4-normalisation-one-place-only)
  first.
- Don't hand-edit generated files (`src/data/words.<n>.json`); edit `data/words/` and
  rebuild.
