# Roadmap

Ordered so that something playable exists as early as possible, and so that the
riskiest work — the data — starts first and runs in parallel throughout.

**M0, M1 and most of M2/M3 are done.** What remains is mostly content (curating the
other 531 answers) plus the licensed guess list. Boxes below are ticked against what
is actually in the repository.

---

## M0 — Data foundation ✅

The word list gates everything else, so it goes first.

- [x] `scripts/import_goethe.py`: parses both source PDFs into `candidates.json` +
      `review-queue.md` ([word-list.md § 3](word-list.md#3-import-pipeline)) — 1,270
      lemmas, 390 ready to curate, 491 flagged for review
- [x] `scripts/build-words.ts`: validation with build-failing rules, pool table output
- [x] Curated **all six lengths** (347 entries), not just 4 and 5 — every length clears
      the 30-answer tripwire
- [x] Resolved the flagged cases for every curated word: plurals supplied by hand,
      `Morgen`/`morgen` split, slashed alternatives picked

**Done:** `npm run build:words` is green on all six lengths.

## M1 — Playable prototype ✅

- [x] `core/score.ts` with the full test table from
      [architecture.md § 8](architecture.md#8-testing) passing — including the
      `tasse`/`essen` repeated-letter case and the `straße` eszett case
- [x] `core/attempts.ts`, `core/keyboard-state.ts`, `core/normalise.ts`
- [x] Game reducer and the setup → playing → reveal flow
- [x] Grid, 30-key QWERTZ keyboard, physical keyboard with the `;a`→`ä` dead key
- [x] Definition card with every required field
- [x] Both modes, all six lengths, all three validation tiers

**Done:** `npx tsx tests/e2e/play.ts` plays a real round in Chromium and checks the
card, the keyboard colouring, the dead key, and that `ss` stays `ss`.

## M2 — Complete game — mostly done

- [x] All lengths curated to a playable pool; the 3-letter mitigations from
      [game-design.md § 2](game-design.md#the-3-letter-problem--a-real-constraint-not-a-rounding-error)
      are in (pool size shown per length, a `Kleiner Wortschatz` note, no-repeat cycling)
- [ ] **Curate the remaining 531 eligible answers** — the largest open task
- [x] All three validation tiers in settings
- [ ] **A licensed German guess list**, which is what flips the default to `dictionary`
      ([word-list.md § 4](word-list.md#4-the-extended-guess-list))
- [x] Daily mode: seeded permutation selection, local midnight reset, one puzzle per length
- [x] Per-length stats, streaks, guess distribution, words-seen
- [x] localStorage persistence with `schema` versioning and mid-round resume
- [x] Emoji share grid that cannot leak the answer

All six lengths are playable in both modes and stats survive a reload; the two open
items above are content and licensing, not code.

## M3 — Polish and access — mostly done

- [x] Colour-blind palette + tile glyphs, both toggleable and remembered
- [ ] Contrast **audited with a tool** in all four theme × palette combinations
- [x] Tile labels, live-region announcements, `lang` attributes, focus management on
      the card
- [ ] Verify with a **real screen reader** — the markup is right, the experience is untested
- [x] `prefers-reduced-motion`; reveal and shake animations
- [x] Light/dark theming via tokens, with a manual override
- [x] Layout verified at 320px with an 8-letter grid (`tests/e2e/narrow.ts`)
- [ ] Hints (off by default), per [game-design.md § 8](game-design.md#8-hints--optional-off-by-default)

Nothing depends on colour alone. The remaining work is verification, not construction.

## M4 — Release

- [ ] Complete curation of all 878 eligible answers; every entry human-reviewed
- [ ] About screen with Goethe-Institut attribution
- [ ] PWA: installable, playable offline (the whole game is static — this is nearly free)
- [ ] Static deploy + CI running `build:words`, typecheck and tests on every PR

## Later — deliberately not in v1

- **Audio pronunciation** on the definition card. Highest-value learner feature after
  release; needs recordings or a TTS voice.
- **A1-only / A2-only filter.** 576 of 959 lemmas are A1, so the split is viable.
- **Topic practice sets** — "Essen und Trinken", "Verkehr" — using the `topic` field
  already in the schema.
- **B1 word list** as a third level.
- **Hard mode** (revealed greens must be reused).
- **Accounts and cross-device sync.** Only if there is real demand; it means a backend.
