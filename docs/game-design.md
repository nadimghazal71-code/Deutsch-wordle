# Game Design

Rules, mechanics and the decisions behind them. Every number in this document is
measured against the two source word lists (see
[word-list.md](word-list.md)) — not guessed.

---

## 1. A round, end to end

```
  Setup            Playing                      Reveal
┌─────────┐   ┌──────────────────┐   ┌──────────────────────────┐
│ choose  │──▶│ guess / feedback │──▶│ definition card          │
│ length  │   │ until won/lost   │   │ article · plural · sense │
│  3–8    │   │                  │   │ example · level          │
└─────────┘   └──────────────────┘   └──────────────────────────┘
                                          │
                                     next round / stats
```

The reveal step is not a consolation prize — it is the point of the game. A player
who loses must still walk away knowing the word.

---

## 2. Setup: choosing the word length

The player picks a length from **3 to 8** before the round starts. The chooser shows
the real answer-pool size for each length, because the lengths are genuinely not
equivalent:

| Length | Answer pool | Attempts | Character of the pool |
| :----: | ----------: | :------: | --- |
| **3** | 34 | 5 | Thin and function-word-heavy. `Zug`, `Uhr`, `Tür`, `Tee`, `Ohr`, `Oma`. |
| **4** | 168 | 5 | The sweet spot for A1. Concrete nouns: `Haus`, `Brot`, `Buch`, `Käse`. |
| **5** | 174 | 6 | Mostly nouns (116). `Apfel`, `Tasse`, `Woche`, `Küche`. |
| **6** | 227 | 6 | Largest pool. Nouns plus the first real verbs: `Straße`, `Kaffee`, `lernen`. |
| **7** | 153 | 7 | Compounds appear: `Bahnhof`, `Fenster`, `Zeitung`. |
| **8** | 122 | 7 | Separable verbs and compounds: `arbeiten`, `Brötchen`, `Hochzeit`. |

**Totals:** 959 playable lemmas, **878 usable as answers** after the exclusions in
§7.

### The 3-letter problem — a real constraint, not a rounding error

Only **34** of the 64 three-letter lemmas in the source lists can be answers.
Twenty-nine of the rest are function words (`und`, `der`, `mit`, `bei`, `was`,
`wie`, …) which make both bad puzzles and bad vocabulary lessons — there is nothing
to put on a definition card for `und`. The last one is `Lkw`, an abbreviation.

What remains is genuinely usable, and worth looking at, because it is the entire
3-letter game:

> `Arm` `Bad` `Bus` `Eis` `Fan` `Fax` `Fuß` `Job` `Mai` `Ohr` `Oma` `Opa` `Ort`
> `Rad` `See` `Tag` `Tee` `Tür` `Uhr` `Weg` `Zoo` `Zug` · `alt` `bar` `elf` `eng`
> `fit` `gut` `neu` `rot` `süß` `tot` `tun` `weh`

Thirty-four answers is about **one month** of daily play before the pool repeats.
Three ways to handle it, in order of preference:

1. **Label it.** The chooser marks 3 letters as *kleiner Wortschatz — 34 Wörter* so
   the choice is informed. Cheapest, honest, ship this first.
2. **Cycle without repeats.** Daily mode walks a seeded permutation of the pool
   rather than sampling independently, so a player sees 34 distinct words before any
   repeat. Required anyway — see [architecture.md § Daily word selection](architecture.md#5-daily-word-selection).
3. **Supplement.** Add ~20 hand-picked 3-letter words that are A1-appropriate but
   absent from the official lists, tagged `"source": "supplement"`. Raises the pool
   past 50. Do this only after 1 and 2.

Do **not** solve it by dropping the 3-letter option — short words are exactly what a
beginner wants on day one.

### Why attempts scale the way they do

Classic Wordle gives 6 attempts for 5 letters. The rule here is
`attempts = clamp(length + 1, 5, 7)`:

- **Short words get a floor of 5.** `length + 1` would give a 3-letter word only 4
  attempts. A 3-letter guess tests just three letters, so each one narrows the field
  slowly, and the pool's initials cluster — 34 answers share only **16 distinct
  first letters**, with `Tag`, `Tee`, `Tür`, `tot` and `tun` all on `T`. Four
  attempts there is closer to luck than deduction.
- **Long words get a cap of 7, and it is enough**, because German long words are
  front-loaded with predictable morphology: **35% of the 8-letter pool** begins with
  `ab-`, `an-`, `auf-`, `aus-`, `be-`, `ge-`, `ver-` or `zu-` (24% at 7 letters).
  Once a player learns that, a long word collapses in two or three guesses. More
  attempts would make long rounds trivially safe and slow.
- **A cap also bounds round length.** Seven attempts at 8 tiles is already 56 tiles
  of typing.

---

## 3. Tile feedback

Three states, per tile, revealed only when a guess is submitted:

| State | Colour | Meaning |
| --- | --- | --- |
| `correct` | 🟩 green | Right letter, right position. |
| `present` | 🟨 yellow | Letter is in the word, but not here — and *not already accounted for*. |
| `absent` | ⬜ grey | Letter is not in the word, or every copy of it is already accounted for. |

### The algorithm — two passes, and the order matters

Getting repeated letters right is the single most common bug in a Wordle clone.
A naive one-pass `answer.includes(letter)` check marks **both** `E`s of a guess
yellow when the answer contains only one. The fix is to consume letters from a pool:

```ts
type Mark = 'correct' | 'present' | 'absent';

function score(guess: string[], answer: string[]): Mark[] {
  const marks: Mark[] = new Array(guess.length).fill('absent');
  const pool = new Map<string, number>();

  // Pass 1 — greens. Every exact positional hit consumes its letter.
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) marks[i] = 'correct';
    else pool.set(answer[i], (pool.get(answer[i]) ?? 0) + 1);
  }

  // Pass 2 — yellows, left to right, from whatever the greens left behind.
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === 'correct') continue;
    const n = pool.get(guess[i]) ?? 0;
    if (n > 0) { marks[i] = 'present'; pool.set(guess[i], n - 1); }
  }

  return marks;
}
```

Both passes are mandatory and must run in this order: a green late in the word has
to be able to steal a letter from a yellow earlier in the word.

### Worked example — answer `TASSE`, guess `ESSEN`

Both words are in the source lists (`die Tasse` A2, `essen` A1).

```
answer   T  A  S  S  E
guess    E  S  S  E  N
         🟨 🟨 🟩 ⬜ ⬜
```

| Step | Tile | Why |
| --- | --- | --- |
| Pass 1 | `S` at index 2 | Matches `S` at index 2 → 🟩. Pool becomes `{T, A, S, E}`. |
| Pass 2 | `E` at index 0 | `E` is in the pool → 🟨. Pool → `{T, A, S}`. |
| Pass 2 | `S` at index 1 | `S` is in the pool → 🟨. Pool → `{T, A}`. |
| Pass 2 | `E` at index 3 | Pool has no `E` left — the index-0 `E` took it → ⬜. |
| Pass 2 | `N` at index 4 | Never in the pool → ⬜. |

The second `E` being grey while the first is yellow is correct behaviour, and is
worth a one-time tooltip for new players: *grey means "no more of these", not
"none at all".*

### Keyboard colouring

Each key shows the **best state that letter has ever reached**, ranked
`correct > present > absent`. A letter that came back yellow and later green stays
green; a green never degrades to yellow. Keys the player has not used yet stay
neutral. This is a `max` over all guesses, not the state from the latest guess.

---

## 4. The German alphabet: `Ä Ö Ü ß`

**Decision: `ä`, `ö`, `ü` and `ß` are distinct letters with their own keys and their
own tiles.** `Ä` is not `A`, and `ß` is not `SS`.

This is forced by the data. Across the playable pool the umlauts and eszett occur
**105 times** — `ü` 44, `ä` 25, `ö` 21, `ß` 15 — and roughly one word in ten
contains one (`Käse`, `Tür`, `Straße`, `Brötchen`, `hässlich`, `Fuß`, `grün`).
Normalising them away would either corrupt those words or silently shorten them, and
it would teach learners the wrong spelling. Spelling is the skill being trained.

Consequences to implement:

- **The on-screen keyboard has 30 keys.** Layout in [ui-ux.md § Keyboard](ui-ux.md#3-on-screen-keyboard).
- **Typing aliases for physical keyboards.** Most learners are on a QWERTY layout
  with no umlaut keys. Typing `ae`, `oe`, `ue`, `ss` in the active tile collapses to
  `ä`, `ö`, `ü`, `ß`, and `Alt`/long-press on the base vowel does the same. The
  alias fires only when the resulting word length still fits; it is an input
  convenience, never a scoring rule.
- **Guesses are compared on the exact letters.** No `String.normalize('NFD')`
  stripping, no `ß → ss` folding in the comparison path. See
  [architecture.md § Normalisation](architecture.md#4-normalisation-one-place-only).
- **Case.** German capitalises nouns, but tiles are uppercase in Wordle tradition and
  uppercase carries no information about the answer. So: tiles render uppercase,
  comparison happens on lowercase, and the **definition card shows the true
  capitalisation** (`die Tasse`, not `TASSE`) — that is where the learner sees the
  spelling that matters.
- **Uppercase `ß`.** Render it as `ß` on tiles rather than `SS` (which would break
  the tile count) or `ẞ` (U+1E9E, poorly supported in many fonts). One tile, one `ß`.

---

## 5. Guess validation

A submitted guess must be exactly the chosen length. Beyond that there are three
tiers, and the tier is a **setting** because the right answer differs by audience:

| Tier | Accepts | For |
| --- | --- | --- |
| `strict` | Only words in the A1/A2 answer pool | Players who want the pool to be the dictionary |
| `dictionary` *(default)* | Any word in the extended German word list (§ [word-list.md](word-list.md#4-the-extended-guess-list)) | Everyone. Lets you use `essen` to probe even if it is not a possible answer |
| `open` | Any sequence of German letters | Absolute beginners, and anyone who finds rejection discouraging |

Rejected guesses do **not** consume an attempt. They shake the row and announce
*„Das Wort kenne ich nicht"* via the live region. `open` mode never rejects.

Default is `dictionary`: `strict` is frustrating (you cannot spend a guess on a
letter-probe), and `open` lets a player brute-force letter positions with nonsense,
which trains nothing.

---

## 6. The definition card

Shown when the round ends, win or lose. **Required** fields — the card must never
render as a bare word:

```
┌──────────────────────────────────────────────┐
│  die Tasse                            A2  ▸  │   headword with article
│  Plural: die Tassen                          │   inflection
│  Substantiv · Essen und Trinken              │   part of speech · topic
├──────────────────────────────────────────────┤
│  Ein kleines Ding, aus dem man Kaffee        │   definition, in German,
│  oder Tee trinkt.                            │   at or below the word's level
│  cup                                         │   English gloss
├──────────────────────────────────────────────┤
│  „Ich trinke eine Tasse Kaffee.“             │   example sentence
├──────────────────────────────────────────────┤
│  [ Nochmal spielen ]   [ Statistik ]   [ ⤳ ] │
└──────────────────────────────────────────────┘
```

Per part of speech, the inflection line carries what a learner actually needs:

- **Noun** — article (`der`/`die`/`das`) and plural. Non-negotiable; a German noun
  without its article is half-learned.
- **Verb** — Partizip II, and the auxiliary when it is `sein` (`gefahren (ist)`).
  Mark separable verbs (`ab|fahren`).
- **Adjective** — comparative/superlative only when irregular (`gut, besser, best-`).

The definition is written **in German at or below the word's own level**, with the
English gloss underneath. An A2 word explained with B1 vocabulary is useless. See
[word-list.md § Writing definitions](word-list.md#5-writing-definitions).

---

## 7. What can be an answer

From 1,270 unique lemmas in the two lists down to 878 answers:

| Rule | Removed | Why |
| --- | --- | --- |
| Length outside 3–8 | 300 | `Ei` (2) is too short to be a puzzle; `Entschuldigung` (14) is off the board |
| Multi-word entries | 11 | `Auf Wiedersehen`, `am Wochenende`, `an sein` cannot be typed into a grid |
| Function words | 80 | `und`, `der`, `mit`, `aber`, `dass` — nothing to define, no lesson |
| Abbreviations | 1 | `Lkw` is not a spelling a learner should guess |
| Affixes and stems | — | A2 marks `zurück-` and `all-` as bound forms |

The function-word count is the one number here that a human has to ratify rather
than compute, because German has homographs that differ only by capitalisation and
part of speech. **`Morgen` is the worked case:** `der Morgen` is a perfectly good
6-letter noun answer with a clean definition, while `morgen` ("tomorrow") is an
adverb that belongs on the stoplist. The importer cannot tell them apart from the
source lists alone, so entries like this are flagged for review rather than
auto-dropped — see [word-list.md § Import pipeline](word-list.md#3-import-pipeline).
Same shape of problem: `sein` (to be / his).

Everything removed here is still a **legal guess** under the `dictionary` tier — the
restriction is on what the game *asks*, not on what the player may *type*.

Deliberately kept: months, weekdays and number words (`Dezember`, `Mittwoch`,
`sechzehn`). They are real A1 vocabulary and they define cleanly. One caveat to be
aware of when tuning difficulty: the 8-letter pool contains seven `-zehn` numbers,
so an endgame can come down to distinguishing `vierzehn` from `sechzehn`. That is a
fair puzzle at 7 attempts, but it is the hardest shape in the pool.

---

## 8. Hints — optional, off by default

The definition is the reward for finishing; handing it out early removes the reason
to finish. When enabled in settings, one hint per round, never automatic:

| Hint | Cost |
| --- | --- |
| Reveal the article (`die …`) | Free — it is grammar, not the word |
| Reveal the topic (`Essen und Trinken`) | Free |
| Reveal the English gloss | Costs one attempt |
| Reveal a letter | Costs one attempt, and the round does not count toward the streak |

---

## 9. Modes

**Daily** — one puzzle per length per day, identical for every player, so six daily
puzzles exist. Resets at local midnight. Replaying the same day's length is blocked;
the result is shareable as an emoji grid.

**Practice** — unlimited, random from the pool, no streak effect. This is the mode a
learner grinding vocabulary actually wants, so it must be reachable in one tap from
the setup screen, not buried.

Sharing uses emoji tiles and must **never leak the answer** — length and attempt
count only:

```
Deutsch-Wordle 6 Buchstaben · 11.09.2026
🟨🟨🟩⬜⬜
⬜🟩🟩⬜🟨
🟩🟩🟩🟩🟩
4/6
```

---

## 10. Stats

Tracked **per length**, because a 3-letter streak and an 8-letter streak are not the
same achievement and merging them makes both meaningless:

- games played, games won, win %
- current streak, best streak *(daily mode only)*
- guess distribution (a histogram per length)
- words seen — the count of distinct answers a player has met, which is the number
  that actually reflects vocabulary learned

An **all-lengths summary** may be shown, but the per-length numbers are the source of
truth. Practice games count toward played/won and words-seen, never toward streaks.

---

## 11. Open questions

Decisions deliberately deferred, to be settled with a playable prototype:

1. **Should the answer pool be filtered by level?** An "A1 only" toggle would cut the
   pool roughly in half (576 of 959 lemmas are A1) but would serve true beginners.
   Leaning yes, after M2.
2. **Audio.** A pronunciation button on the definition card is high value for
   learners and needs either recordings or a TTS voice. Out of scope for v1.
3. **Do near-anagram families need suppressing?** See the `-zehn` note in §7. Measure
   player loss rates per word before adding machinery.
4. **Hard mode** (revealed greens must be reused in later guesses) — standard Wordle
   feature, cheap to add, unclear whether learners want it.
