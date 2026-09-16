# UI and UX

Three screens, one grid, one keyboard, one card.

---

## 1. Screen flow

```
┌─ Setup ───────────────────┐   ┌─ Game ────────────────┐   ┌─ Reveal ──────────────┐
│  Wie viele Buchstaben?    │   │  ▢▢▢▢▢   ← grid      │   │  die Tasse       A2   │
│                           │   │  ▢▢▢▢▢               │   │  Plural: Tassen       │
│  [3] [4] [5] [6] [7] [8]  │──▶│  ▢▢▢▢▢               │──▶│  Substantiv           │
│   34 168 174 227 153 122  │   │                       │   │  ─────────────────    │
│                           │   │  Q W E R T Z U I O P  │   │  Ein kleines Ding…    │
│  ○ Täglich  ● Üben        │   │  A S D F G H J K L Ö Ä│   │  cup                  │
│                           │   │  ⏎ Y X C V B N M ß Ü ⌫│   │  „Ich trinke eine…"   │
│  [ Spielen ]      ⚙ 📊    │   │                       │   │  [Nochmal] [📊] [⤳]  │
└───────────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

**Setup** shows the pool size under each length — it is the honest way to surface the
3-letter pool being 34 rather than hiding it. Mode toggle (Täglich / Üben) lives here
too; practice must be one tap away, since that is the mode a learner grinding
vocabulary uses.

**Game** is the grid plus keyboard, nothing else. No timer, no score ticker, no
streak counter during play — all of it is noise while thinking about a word.

**Reveal** is the definition card (see §4). It is a screen, not a toast: it must be
readable for as long as the player wants, and dismissed deliberately.

German UI strings throughout, since the audience is learning German. Keep them A1:
*Wie viele Buchstaben?*, *Spielen*, *Nochmal*, *Das Wort kenne ich nicht.*

## 2. The grid

- `attempts × length` tiles, sized so an 8-wide grid fits a 360px phone screen:
  tiles flex between 34px and 62px with a 4px gap. At 8 letters this is the binding
  constraint on the whole layout — design for it first, not for 5.
- The active row's current tile has a visible caret/outline. Filled-but-unsubmitted
  tiles show the letter with a neutral border and **no colour**.
- Reveal animation: tiles flip left to right, ~250ms total for the row, then the
  keyboard updates. Respect `prefers-reduced-motion` by cutting straight to the
  colours.
- Invalid guess: horizontal shake on the row, ~180ms, plus the live-region message.
  Do not clear the row — the player wants to edit it, not retype it.

## 3. On-screen keyboard

**30 keys.** The four extra letters are not an afterthought; one word in ten needs
them (see [word-list.md § 1](word-list.md#measured-pool-per-length)).

```
 Q  W  E  R  T  Z  U  I  O  P          ← QWERTZ, not QWERTY: Z and Y swap
 A  S  D  F  G  H  J  K  L  Ö  Ä
 ⏎  Y  X  C  V  B  N  M  ß  Ü  ⌫
```

Rationale: QWERTZ is the German layout, so the muscle memory transfers to a real
German keyboard — itself a small lesson. `Ö Ä` extend the home row and `ß Ü` the
bottom row, which keeps the three rows within one key-width of each other. On a
narrow phone the rows may need to be 11 keys at ~30px; test at 320px.

Key states use the max-merge rule from
[game-design.md § 3](game-design.md#keyboard-colouring): green > yellow > grey >
unused. A key never downgrades.

**Physical keyboard** works in parallel: letters type, `Enter` submits, `Backspace`
deletes. For umlauts, `;` (or `"`) acts as a dead key — `;a` → `ä`, `;s` → `ß` —
which is input convenience only, per
[architecture.md § 4](architecture.md#4-normalisation-one-place-only). Show it once
as a hint on the setup screen: *Tipp: „;u" wird zu „ü" — oder tippe auf Ä Ö Ü ß*.

Digraph collapsing (`ss` → `ß`) is deliberately **not** offered: it would break the
26 pool words that legitimately contain `ss`. See
[game-design.md § 4](game-design.md#4-the-german-alphabet-ä-ö-ü-ß).

**Known limitation.** Input is read from `keydown`, so a character delivered *without*
a key event — an IME, a macOS compose sequence, `insertText` — never reaches the game.
A German physical keyboard fires `keydown` with `key: 'ö'` and works; everyone else has
the dead key and the on-screen `Ä Ö Ü ß` keys, which is why this is documented rather
than worked around. Closing it properly means a focused offscreen editable element
listening to `beforeinput`, which costs more in accessibility than it buys.

## 3a. The start button, and a bug worth remembering

The primary button says **`Starten`** and spans the full width of the setup screen,
with a floor of 52px on its height — comfortably past the 48dp tap-target guideline.

That floor exists because of a real bug. On Android the button was styled
`flex: 1` so it would fill the definition card's action row. In React Native `flex: 1`
also sets `flexBasis: 0`, so in the setup screen's **column** parent the button's
height collapsed to zero: a thin blue sliver with the label clipped out of sight.
Growing to fill a row is now an explicit `fill` prop used only inside
`flexDirection: 'row'` containers, and the `minHeight` makes the failure impossible to
reintroduce silently.

## 3b. Giving up

A small underlined `Aufgeben` control sits between the board and the keyboard,
right-aligned — reachable but out of the way of typing. One tap asks
*„Wirklich aufgeben?"*, the second reveals the word. Rules in
[game-design.md § 8a](game-design.md#8a-giving-up).

## 3c. The word list

`📖 Wortliste ansehen` sits under the start button on the setup screen. It opens a
searchable, filterable list of every answer; tapping one shows its full entry. Rules
and rationale in [game-design.md § 12](game-design.md#12-the-word-list--the-answer-key-browsable).

The search field takes focus when the list opens, since searching is the common case
at 347 entries. `Esc` (web) and the back gesture (Android) step from an entry back to
the list, and from the list back to the menu.

## 4. The definition card

The payoff. Layout and required content are specified in
[game-design.md § 6](game-design.md#6-the-definition-card). UX requirements on top of
that:

- **Identical whether the player won or lost.** No "Schade!" styling that makes
  losing feel like a dead end — the card is the lesson either way. A small win/loss
  line (`4/6` or `Das Wort war:`) is enough.
- **The headword shows real capitalisation and the article** — `die Tasse`. The grid
  shows `TASSE`; only the card teaches the spelling that counts.
- **Nothing is truncated.** Definition and example wrap in full. If the card
  overflows on a small screen it scrolls; it never ellipsises the lesson.
- The `⤳` button copies the emoji share grid, which must not contain the answer.

## 5. Accessibility

Not optional — a colour-coded word game is a worked example of how to exclude people.

**Colour.** Roughly 8% of men have a red-green deficiency, and green/yellow tiles are
exactly that pair. Therefore:
- A **colour-blind mode** (orange `#e07a2f` / blue `#2f6fe0` instead of green/yellow),
  toggleable in settings, remembered.
- Colour is never the only channel. Each tile carries a **glyph** — `✓` correct,
  `◐` present, `·` absent — visible in colour-blind mode and available always.
- Contrast ≥ 4.5:1 for letters on tiles in both themes and both palettes. Check it,
  don't eyeball it.

**Screen readers.**
- Each tile: `aria-label="T, richtig"` / `", an anderer Stelle"` / `", nicht im Wort"`.
- One `aria-live="polite"` region announces the scored row after submit, e.g.
  *„E an anderer Stelle, S an anderer Stelle, S richtig, E nicht im Wort, N nicht im
  Wort"*, plus invalid-guess messages and the round result.
- The grid is a `role="grid"` with `role="row"`; the keyboard is a set of real
  `<button>`s. No `div` with a click handler anywhere.
- The definition card takes focus when it opens, and is announced in full.

**Keyboard-only.** Every control reachable by `Tab` with a visible focus ring; the
on-screen keyboard is operable without a mouse (though the physical keyboard is the
faster path); `Esc` closes the card and dialogs.

**Motion.** `prefers-reduced-motion` disables the flip and shake animations, keeping
the state changes instant.

**Language.** `<html lang="de">`, with `lang="en"` on the English gloss and example
translation so a screen reader pronounces each correctly. This matters more here than
in most apps: a German screen reader reading `cup` as German is unintelligible.

## 6. Theming

Light and dark, following `prefers-color-scheme` with a manual override in settings.
Define the palette as CSS custom properties on `:root`, redefine only the tokens
under `prefers-color-scheme: dark` and under an explicit `[data-theme]`, so both the
system default and the manual toggle work in both directions. Tile colours come from
tokens, so colour-blind mode is a token swap rather than a second stylesheet.
