# Deutsch-Wordle

A Wordle clone for German learners. The answer pool is a **fixed, curated list of
A1 and A2 vocabulary** based on the Goethe-Institut word lists, you **pick the word
length (3–8) before you play**, and when the round ends you get the word's
**definition, article, plural and an example sentence** — so every round teaches
you something whether you win or lose.

> **Status:** playable on the web, and there is an Android app on Expo SDK 57 that is
> ready to build ([mobile/](mobile/README.md)). 347 curated answers across all six
> lengths, a 98,000-form guess dictionary, 82 unit tests and an end-to-end browser
> run that plays a real round. The
> documents in `docs/` are the spec; where building it changed a decision, the doc
> says so and why.

## Why another Wordle

Standard Wordle is a 5-letter English game with a huge answer pool. That is a bad
vocabulary trainer for a beginner: the words are too obscure, the length is fixed,
and you learn nothing when the round ends. This game changes three things:

| Wordle | Deutsch-Wordle |
| --- | --- |
| Fixed 5 letters | You choose 3–8 letters before the round |
| ~2,300 obscure answers | curated A1/A2 words you actually need (347 shipped, 878 eligible) |
| Answer revealed, no context | Definition card: article, plural, meaning, example |
| English alphabet | German alphabet incl. `Ä Ö Ü ß` |
| Rejects non-words | Same — ~98,000 German forms, so a guess has to be a real word |

## Documentation

| Document | What's in it |
| --- | --- |
| [docs/game-design.md](docs/game-design.md) | Rules, length/attempt table, tile-colouring algorithm, German-specific decisions (umlauts, `ß`, capitalised nouns), hints, scoring |
| [docs/word-list.md](docs/word-list.md) | Word entry schema, sourcing and curation rules, pool-size targets per length, validation script contract |
| [docs/architecture.md](docs/architecture.md) | Tech stack, module boundaries, game state machine, daily-word selection, localStorage schema |
| [docs/ui-ux.md](docs/ui-ux.md) | Screen flow, on-screen keyboard layout, the definition card, accessibility requirements |
| [docs/roadmap.md](docs/roadmap.md) | Milestones from playable prototype to full release |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to add or fix a word |
| [data/words.sample.json](data/words.sample.json) | Thirteen annotated entries showing every field and every tricky case |
| [data/words/](data/words/) | The real curated word list, one file per length |

## The 60-second version

1. **Setup screen.** Choose a word length, 3 to 8. The chooser shows how many words
   exist at each length so you know what you're in for.
2. **Play.** Type a German word of that length — it has to be a real one, checked
   against ~98,000 German forms. Tiles turn 🟩 correct place, 🟨 in the word but
   elsewhere, ⬜ not in the word. `Ä Ö Ü ß` are letters in their own right and have
   their own keys.
3. **Attempts** scale with length: 5 for a 3–4 letter word, 6 for 5–6, 7 for 7–8.
4. **Round ends** — won or lost — and the definition card appears: **die Tasse**,
   plural *Tassen*, "ein kleines Ding, aus dem man Kaffee oder Tee trinkt", plus an
   example sentence and the CEFR level.
5. **Stats** are tracked per length, because a 3-letter streak and an 8-letter streak
   are not the same achievement.

## Quick start

```bash
npm install
npm run build:words   # validate data/words/*.json and compile the shipped bundles
npm run dev           # http://localhost:5173
npm test              # 82 unit tests
npm run build         # build:words + typecheck + production bundle
```

`npm run build:words` is a gate, not a formatter: it fails the build on a noun with
no article, a definition containing its own headword, an example that does not use
the word, or an answer pool that has dropped below 30 for an offered length.

To play a round in a real browser (Chromium via Playwright):

```bash
npm run build && npx vite preview --port 4173 &
npx tsx tests/e2e/play.ts      # plays a full round, checks the definition card
npx tsx tests/e2e/narrow.ts    # 8-letter grid at 320px, checks for overflow
```

### Android app

```bash
cd mobile && npm install && npm run apk
```

Expo SDK 57. It imports the game logic and the word list from this repository rather
than copying them, so a rules fix or a new word fixes both apps. Prerequisites, the
EAS alternative and what has and has not been verified are in
[mobile/README.md](mobile/README.md).

### Layout

```
src/core/     pure game logic — no DOM, no storage, no framework (shared with mobile)
src/store/    the persisted shape, migrations and stats rules (shared with mobile)
              persist.ts is the web localStorage adapter; mobile/storage.ts is AsyncStorage
src/ui/       web only: setup screen, grid, 30-key keyboard, definition card, stats
src/data/     generated bundles — never hand-edited, but committed (mobile builds need them)
mobile/       the Expo app: theme.ts, components/, App.tsx
data/words/       the curated answers, one file per length
data/dictionary/  the guess dictionary, one file per length (98k forms; guesses only)
scripts/      import_goethe.py (PDF -> review queue), import_dictionary.py (word list
              -> per-length lists), build-words.ts (validate -> bundles)
tests/        82 unit tests over src/core and src/store, plus two Chromium e2e runs
```

## What is not done

- **The guess dictionary's licence is unconfirmed.** Validation itself is done:
  ~98,000 German forms, a non-word is rejected, and the default tier is `dictionary`.
  But the word list was supplied rather than sourced, so confirm its licence and add
  attribution before distributing — see
  [docs/word-list.md § 4](docs/word-list.md#4-the-guess-dictionary).
- **347 of 878 eligible answers are curated.** Every length has a real pool (31–68
  words), but a daily player at one length will see a repeat inside three months.
  Curating the rest is the largest remaining task.
- **No audio, no hint UI, no PWA/offline** — see [docs/roadmap.md](docs/roadmap.md).
- **Umlauts typed through an IME or a macOS compose sequence are not seen**, because
  input is read from `keydown`. German keyboards, the `;a` dead key and the on-screen
  `Ä Ö Ü ß` keys all work. [Details](docs/ui-ux.md#3-on-screen-keyboard).

## Licence and attribution

The Goethe-Institut word lists (*Goethe-Zertifikat A1: Start Deutsch 1 Wortliste*
and *Goethe-Zertifikat A2 Wortliste*) are used as a **reference for which words
belong at which level**. Definitions, example sentences and translations in this
repository are **written for this project** — do not paste Goethe's definition or
example text into the data files. See
[docs/word-list.md § Sourcing and licence](docs/word-list.md#sourcing-and-licence).
