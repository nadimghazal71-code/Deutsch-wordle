# The Word List

The word list *is* the game. The grid is a few hundred lines of code; the data is
what makes a round worth playing. This document specifies the entry schema, where
the words come from, how they get imported, and the rules for writing the
definitions.

---

## 1. Sources

Two lists, both provided as PDFs and both parsed for this spec:

| Source | Shape | Entries parsed | Lemmas used |
| --- | --- | --- | --- |
| *Goethe-Zertifikat A1 – Start Deutsch 1, Wortliste* (DE–EN) | 22 pages: thematic groups, then an alphabetical list | 728 | 576 playable |
| *Goethe-Zertifikat A2 – Complete Vocabulary List* | 21 pages, tabular: German / Art. / Type / English / Partizip II; self-reported 606 entries, 138 verbs | 561 | 383 playable |

After merging and de-duplicating (**A1 wins on collision**, so a word shared by both
levels is taught as A1): **1,270 unique lemmas → 959 playable → 878 eligible as
answers.** Of those, **347 are curated and shipped** — see § 6.

### Measured pool, per length

| Length | Playable | Answers | Nouns | Verbs | Other | Contains `ä ö ü ß` |
| :----: | -------: | ------: | ----: | ----: | ----: | -----------------: |
| 3 | 64 | 34 | 23 | 0 | 41 | 4 |
| 4 | 196 | 168 | 110 | 1 | 85 | 20 |
| 5 | 185 | 174 | 116 | 5 | 64 | 14 |
| 6 | 232 | 227 | 104 | 35 | 93 | 27 |
| 7 | 154 | 153 | 82 | 14 | 58 | 19 |
| 8 | 128 | 122 | 56 | 19 | 53 | 19 |
| **Σ** | **959** | **878** | **491** | **74** | — | **103** |

The part-of-speech and umlaut columns describe the **playable** pool, not the answer
pool — the two differ by 81 stoplisted entries, exactly one of which is a noun
(`Morgen`, §3.3).

Letter frequency across the pool, which is what a good opening guess should cover:
`e` 818, `n` 528, `r` 383, `a` 364, `t` 343, `i` 311, `s` 302, `h` 273, `l` 258,
`u` 213, `g` 178, `c` 169. Umlauts and eszett: `ü` 44, `ä` 25, `ö` 21, `ß` 15.

> These are the *source* numbers, printed by `python3 scripts/import_goethe.py`.
> `npm run build:words` prints the same table for the words actually shipped (§ 6).
> Do not hand-edit either set of figures.

### Sourcing and licence

The Goethe-Institut lists are **copyrighted material**. This project uses them for
one thing only: **deciding which words belong at A1 and which at A2.** That
selection is a factual claim about a syllabus.

What must **not** happen: copying Goethe's definition text, example sentences, or
translation wording into `data/words/`. Every `definition_de`, `example_de` and
`definition_en` field in this repository is written for this project. A PR that
pastes source text gets rejected — see [CONTRIBUTING.md](../CONTRIBUTING.md).

If the project is ever distributed commercially, get the licensing checked properly.
Attribute the lists in the About screen either way.

---

## 2. Entry schema

One JSON object per word. Files live at `data/words/<length>.json` as arrays, sorted
by lemma.

```jsonc
{
  "id": "a2-tasse",          // stable slug, "<level>-<lemma>" transliterated to ASCII
                             // (ä→ae, ö→oe, ü→ue, ß→ss); never reused or renumbered
  "lemma": "tasse",          // lowercase, exact letters incl. ä ö ü ß — the answer
  "display": "Tasse",        // true German capitalisation, for the definition card
  "level": "A2",             // "A1" | "A2"
  "pos": "noun",             // noun | verb | adj | adv | num | other
  "topic": "Essen und Trinken",

  "article": "die",          // nouns only: der | die | das
  "plural": "Tassen",        // nouns only; null when there is no usable plural
  "partizip2": null,         // verbs only, e.g. "gearbeitet"
  "aux": null,               // verbs only: "haben" | "sein"
  "separable": null,         // verbs only: true for ab|fahren

  "definition_de": "Ein kleines Ding, aus dem man Kaffee oder Tee trinkt.",
  "definition_en": "cup",
  "example_de": "Ich trinke eine Tasse Kaffee.",
  "example_en": "I'm drinking a cup of coffee.",

  "source": "goethe-a2",     // goethe-a1 | goethe-a2 | supplement
  "answer": true             // false = legal guess, never the answer
}
```

See [data/words.sample.json](../data/words.sample.json) for thirteen real entries
covering every length from 3 to 8 and every awkward case: `ä` (`Käse`), `ö`
(`Brötchen`), `ü` (`grün`), `ß` (`Straße`), doubled letters (`Tasse`, `Kaffee`), a
verb (`arbeiten`), and an adjective.

### Field rules

- **`length` is not a field.** It is `[...lemma].length` and is computed at build
  time. A stored length is a second source of truth that will drift.
- **`lemma` must match `/^[a-zäöüß]{3,8}$/`.** Lowercase, no spaces, no hyphens, no
  combining diacritics — `ä` is U+00E4, never `a` + U+0308. The build fails on NFD
  input rather than normalising it silently.
- **`display` must equal `lemma` case-insensitively.** This catches the class of
  typo where the two fields drift apart and the card shows a different word than the
  grid.
- **`answer: false`** exists for words that should be typeable but never asked —
  function words, `Lkw`. They still need `definition_*` only if `answer` is true.
- **`plural: null`** is meaningful (mass nouns like `das Wasser`), and distinct from
  a missing plural, which is a validation error.

### Iteration order over letters

`"straße".length` is 6 and `[..."straße"].length` is 6, so for this data set plain
`.length` happens to agree. It is still wrong to rely on: **always iterate with
`[...word]` or `Array.from(word)`**, never `word[i]` over a raw string, so the code
stays correct if a word with a surrogate pair or combining mark ever lands in the
data. Validation enforces `lemma === lemma.normalize('NFC')` to keep that from
happening in the first place.

---

## 3. Import pipeline

`scripts/import_goethe.py` turns the source PDFs into **reviewable drafts**, not into
shipped data. It never writes `data/words/` directly. (Python, not TypeScript, because
PDF text extraction is where the good libraries are; it needs `pip install pypdf`.)

The PDFs are copyrighted and are **not** committed, so the script takes their paths:

```bash
python3 scripts/import_goethe.py --a1 path/to/A1_Wortliste.pdf \
                                 --a2 path/to/A2_Vocabulary.pdf --out build/
```

```
PDF ──▶ text ──▶ parse ──▶ candidates.json ──▶ human review ──▶ data/words/<n>.json
                              │
                              └──▶ review-queue.md  (everything ambiguous)
```

The two sources need two parsers, because their shapes differ:

**A1 is line-oriented,** one entry per line with no delimiter between German and
English:

```
die Adresse, -en address
der Apfel, -Ä apple
arbeiten to work
```

So: a line starting `der|die|das` is a noun (article, lemma, optional plural marker,
then English); otherwise the first token is the lemma and the rest is the gloss.
Section markers (`— A —`) and topic headings (`Colours (Farben)`) are skipped.

**A2 is record-oriented,** five fields per entry on consecutive lines, with the
article line *absent* for non-nouns — so the parser must probe rather than assume a
fixed stride:

```
Tasse          ← lemma
die            ← article (absent for verbs/adjectives!)
Substantiv     ← type
cup            ← English
—              ← Partizip II, or "—"
```

### What the importer must flag rather than decide

These are the cases found while parsing the real files. Each one needs a human:

1. **Abbreviated plural markers.** A1 writes `der Apfel, -Ä`, `das Haus, -er`,
   `der Zug, -e` — shorthand that must be expanded to `Äpfel`, `Häuser`, `Züge`. The
   `-Ä` form means "umlaut the stem vowel", which is not mechanically derivable.
   Flag every one.
2. **Missing plurals.** `der Bahnhof`, `der Kaffee`, `die Hochzeit`, `das Brötchen`
   carry no plural marker in the source at all. Someone has to supply them.
3. **Homographs split by case and part of speech.** `der Morgen` (noun, good answer)
   vs `morgen` (adverb, stoplist). Also `sein`. The importer emits both and asks.
4. **Slashed alternatives.** `der Arzt / die Ärztin`, `der Samstag / Sonnabend`,
   `der Frühling / das Frühjahr` — one source line, two lemmas. Split into separate
   entries, or pick one and note the other in the definition.
5. **Reflexive and bracketed forms.** `(sich) anmelden`, `all- / alles / alle`.
   Strip to the bare lemma or drop.
6. **Bound forms.** A2 types `zurück-` as `Affix`. Never an answer, never a guess.
7. **Multi-word entries.** `Auf Wiedersehen`, `an sein`, `am Wochenende` — 11 of
   them. Dropped, but logged so nobody wonders where they went.

### `npm run build:words`

Validates and compiles. It must **fail the build**, not warn, on:

- a `lemma` that fails the character/length regex, or is not NFC
- `display` disagreeing with `lemma` case-insensitively
- a noun with `answer: true` and a missing `article`, or a missing/empty `plural`
  that is not explicitly `null`
- an `answer: true` entry with an empty `definition_de`, `definition_en` or
  `example_de`
- a duplicate `id` or a duplicate `lemma`
- an `example_de` that does not contain the word (in any inflected form — a warning
  if the check is only a stem match)
- **an answer pool below 30 for any offered length** — the tripwire for the
  3-letter problem in [game-design.md § 2](game-design.md#the-3-letter-problem--a-real-constraint-not-a-rounding-error)

On success it writes the per-length bundles, prints the pool table from §1, and
prints the letter-frequency table.

---

## 4. The guess dictionary

Answers and guesses come from two different places, and conflating them is the mistake
that makes a Wordle clone feel wrong:

- **Answers** — the 347 curated A1/A2 words in `data/words/`. Nothing else can ever be
  the answer.
- **Guesses** — a full German word list, so that a guess which is not a German word is
  rejected instead of being scored. **A non-word guess is not leniency, it is a broken
  game:** the colours it returns teach the player nothing, and accepting them lets a
  player brute-force letter positions with nonsense.

### What ships

| | |
| --- | --- |
| Source | A full German word list, ~1.9M inflected forms, supplied for this project |
| Committed | `data/dictionary/<n>.txt` — filtered, lowercased, NFC, sorted, one word per line (~800 KB) |
| Generated | `src/data/guesses.<n>.json` by `npm run build:words` |
| Total accepted | **97,391 forms** at 3–8 letters (98,035 from the list, minus 644 given names) |

| Length | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --: | --: | --: | --: | --: | --: |
| Accepted guesses | 1,038 | 2,689 | 6,781 | 13,602 | 25,455 | 48,470 |

`scripts/import_dictionary.py` does the filtering. The raw list is ~30 MB and is **not**
committed; the filtered per-length lists are, because they are small, diffable, and
the thing the build actually consumes:

```bash
python3 scripts/import_dictionary.py --list path/to/wordlist-german.txt
```

Filtering drops everything outside 3–8 letters (1.8M forms — the list is full of
compounds like `Weltkriegszusammenhanges`) and the 290 forms containing characters
outside the game's alphabet (`café`, `crêpe`, `façon`) — those could never be typed on
a 30-key German keyboard anyway.

### Given names are excluded, carefully

A full German word list contains first names — `Albin`, `Bernd`, `Helmut` — and
because **German capitalises every noun there is no structural way to tell `Albin`
from `Haus`**. Both appear only capitalised; both lowercase to a plausible word. So
the names have to be listed explicitly.

| | |
| --- | --- |
| Sources | A supplied list of ~2,000 historical German first names, plus `data/dictionary/names-common.txt` for the modern ones it omits (Jürgen, Michael, Thomas, Anna) |
| Committed | `data/dictionary/excluded-names.txt` — 2,210 names |
| Actually removed | **644** (the rest, like `adalbald`, were never in the word list) |

The danger is that **many German first names are also ordinary words**, so blind
removal would reject real German. `scripts/import_names.py` therefore protects a name
when any of three things is true, and prints what it protected:

1. **It is a curated answer.** Seven are: `alt`, `ecke`, `gast`, `ort`, `rot`, `wald`,
   `wolke`. Removing one of these would show a player a valid answer being refused,
   with no way to win — the worst outcome in the whole project.
2. **It is a Goethe A1/A2 lemma** — the vocabulary the app teaches: `land`, `bald`,
   `dank`, `frei`, `hart`, `rein`.
3. **It also exists in lowercase in the word list**, meaning a verb, adjective or
   adverb of the same spelling exists: `kraft`, `linde`, `ernst`, `frank`, `rosa`,
   `max`, `traut`.

Two more needed a human, because they pass none of those rules and are still words:
**`Kai`** (a quay) and **`Jasmin`** (the shrub). They are commented out of
`names-common.txt` rather than silently dropped. `tests/dictionary.test.ts` pins all
of these, so a future name list cannot quietly break them.

What this does **not** fix: place names (`aachen`, `berlin`), names outside the
supplied lists (`aaron`), and general oddities the word list carries anyway
(`bauzeugs`, `nottank`). A frequency list would deal with all three at once and is the
better long-term answer; see § 4 above.

### The storage format, and why it is a single string

Every word in a bundle has exactly `n` letters, so no separators are needed. Each
bundle is one sorted, concatenated string plus a count:

```json
{ "n": 5, "count": 6781, "words": "aalenaalesaalstaalte…" }
```

`core/dictionary.ts` binary-searches it by slicing at `index * n`. This is not
premature cleverness; it buys three things that matter:

1. **No startup allocation.** A `Set` of 97,000 strings would be built on every launch.
   This is six string constants, and on mobile they land in the Hermes bytecode.
2. **A quarter less space.** A JSON array of 48,470 eight-letter words spends three
   characters per word on quotes and commas; concatenation spends none.
3. **Lookup without parsing.** `hasWord` reads the string directly.

The order must be a plain code-unit sort, because that is what `<` compares in
JavaScript. Every character here is in the BMP, where code point and code unit order
agree, so Python's `sorted()` and JavaScript's `<` produce the same order — and
`build-words.ts` **asserts the bundle is strictly sorted**, because a mis-sorted bundle
would make the binary search silently miss words rather than fail loudly.

### The invariant that matters most

**The dictionary must never reject one of the game's own answers.** That would show the
player a valid answer being refused, with no way to win. So the build unions the
dictionary with every curated lemma and its plural and participle, and then asserts
that every answer is accepted. `tests/dictionary.test.ts` asserts it again over the
shipped bundles. As it happens the supplied list already contains all 347 answers and
all 540 forms, so the union currently adds nothing — it is there so that swapping the
word list cannot quietly break the game.

### Loading

The bundles total ~700 KB, which is handled differently per platform:

- **Web** — one dynamic `import()` per length, so Vite code-splits them and a round
  fetches only its own (17 KB gzipped at five letters; the main bundle stays 35 KB).
  The dictionary is fetched when a length is selected, before the round can start.
- **Mobile** — static imports. Metro emits one bundle regardless, so splitting would
  buy nothing; the Hermes bytecode grows from 1.6 MB to 3 MB.

### Licence

The word list was supplied for this project. Before distributing the app, confirm its
licence and add the required attribution — a full-form German word list is usually
derived from a Hunspell or `wordlist-german` corpus under a free licence, but "usually"
is not a licence review. This is separate from the Goethe question in § 1: that one
governs which words are *taught*, this one which words are *accepted*.

## 5. Writing definitions

The definition is what the player takes away. Rules:

1. **Write in German, at or below the word's own level.** An A1 word explained with
   B1 vocabulary teaches nothing. Prefer `Man trinkt daraus.` over
   `Ein Trinkgefäß zur Aufnahme von Heißgetränken.`
2. **One sentence.** Two if the word genuinely needs it.
3. **Never use the word in its own definition.** `Eine Tasse ist eine Tasse, aus
   der…` is useless.
4. **The English field is a gloss, not a translation of the German sentence.**
   `cup` — one to three words.
5. **The example sentence must be a sentence a learner could say**, in the present
   tense where possible, containing the word. `Ich trinke eine Tasse Kaffee.` not
   `Die Tasse fiel vom Tisch, nachdem sie angestoßen worden war.`
6. **Nouns get their article in the example**, so the gender is seen in use as well
   as stated.
7. **Topics come from the A1 list's own thematic groups** where possible (`Essen und
   Trinken`, `Wohnen`, `Verkehr`, `Farben`, `Zahlen`, …) so the topic field can later
   drive themed practice sets.

---

## 6. What is curated so far

347 of the 878 eligible answers are written and shipped. `npm run build:words` prints
this table from the data itself:

| Length | Answers | A1 | A2 | Nouns | Verbs | Other | With `ä ö ü ß` |
| :----: | ------: | -: | -: | ----: | ----: | ----: | -------------: |
| 3 | 31 | 21 | 10 | 21 | 1 | 9 | 3 |
| 4 | 56 | 43 | 13 | 49 | 0 | 7 | 6 |
| 5 | 63 | 39 | 24 | 59 | 0 | 4 | 4 |
| 6 | 64 | 46 | 18 | 55 | 4 | 5 | 6 |
| 7 | 65 | 47 | 18 | 50 | 6 | 9 | 5 |
| 8 | 68 | 48 | 20 | 44 | 20 | 4 | 13 |
| **Σ** | **347** | **244** | **103** | **278** | **31** | **38** | **37** |

Every length clears the 30-answer tripwire, so all six are offered. The honest caveat:
at 31–68 words a daily player will meet a repeat within three months. Curating the
remaining 531 eligible answers is the largest open task in the project — and it is
pure content work, since the pipeline and the validation gate already exist.

The curated set was chosen for **teachability**, not coverage: concrete nouns a
beginner meets first (`Haus`, `Brot`, `Bahnhof`), the verbs they need early
(`arbeiten`, `trinken`, `sprechen`), and enough `ä ö ü ß` words at every length that
the umlaut keys matter from day one.
