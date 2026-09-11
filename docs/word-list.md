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
levels is taught as A1): **1,270 unique lemmas → 959 playable → 878 answers.**

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

> Regenerate this table whenever the data changes — `npm run build:words` prints it.
> Do not hand-edit the numbers.

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

`scripts/import-goethe.ts` turns the source PDFs into **reviewable drafts**, not
into shipped data. It never writes `data/words/` directly.

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

## 4. The extended guess list

Answers come from the curated 878. **Guesses**, under the default `dictionary` tier,
are checked against a much larger list so a player can spend a guess on a probe
like `essen` without it being a candidate answer.

Requirements: open licence, lowercase, one word per line, filtered to
`/^[a-zäöüß]{3,8}$/`, NFC. A German Hunspell/`wordlist-german` dump filtered this way
is around 50k words at these lengths — small enough to ship as a compressed set and
check in memory, with no network call on the guess path.

Every curated lemma must also be present in the guess list; the build asserts this,
because a valid answer that the game rejects as a guess is the worst possible bug.

---

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
