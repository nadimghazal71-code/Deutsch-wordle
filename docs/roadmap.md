# Roadmap

Ordered so that something playable exists as early as possible, and so that the
riskiest work — the data — starts first and runs in parallel throughout.

---

## M0 — Data foundation

The word list gates everything else, so it goes first.

- [ ] `scripts/import-goethe.ts`: parse both source PDFs into `candidates.json` +
      `review-queue.md` ([word-list.md § 3](word-list.md#3-import-pipeline))
- [ ] `scripts/build-words.ts`: validation with build-failing rules, pool table output
- [ ] Curate lengths **4 and 5** end to end (~340 entries) as the reference quality bar
- [ ] Resolve the flagged cases: abbreviated plurals (`der Apfel, -Ä`), missing
      plurals, `Morgen`/`morgen`, slashed alternatives

**Done when** `npm run build:words` is green on lengths 4–5 and the review queue for
those lengths is empty.

## M1 — Playable prototype

- [ ] `core/score.ts` with the full test table from
      [architecture.md § 8](architecture.md#8-testing) passing — including the
      `tasse`/`essen` repeated-letter case and the `straße` eszett case
- [ ] `core/attempts.ts`, `core/keyboard-state.ts`, `core/normalise.ts`
- [ ] Game reducer and the setup → playing → reveal flow
- [ ] Grid, 30-key QWERTZ keyboard, physical keyboard with `ae`→`ä` aliases
- [ ] Definition card with every required field
- [ ] Practice mode only, lengths 4–5 only, `open` validation

**Done when** a round can be played start to finish at length 4 and 5 and the card
shows a real definition. Ugly is fine. Wrong tile colours are not.

## M2 — Complete game

- [ ] Curate lengths **3, 6, 7, 8** (~540 more entries); apply the 3-letter mitigations
      from [game-design.md § 2](game-design.md#the-3-letter-problem--a-real-constraint-not-a-rounding-error)
- [ ] Extended guess list + `dictionary` validation tier, with `strict`/`open` in settings
- [ ] Daily mode: seeded permutation selection, midnight reset, one puzzle per length
- [ ] Per-length stats, streaks, guess distribution, words-seen
- [ ] localStorage persistence with `schema` versioning and mid-round resume
- [ ] Emoji share grid that cannot leak the answer

**Done when** all six lengths are playable in both modes and stats survive a reload.

## M3 — Polish and access

- [ ] Colour-blind palette + tile glyphs; contrast audited in all four
      theme × palette combinations
- [ ] Screen-reader pass: tile labels, live-region announcements, `lang` attributes,
      focus management on the card
- [ ] `prefers-reduced-motion`; reveal and shake animations
- [ ] Light/dark theming via tokens
- [ ] Layout verified at 320px with an 8-letter grid
- [ ] Hints (off by default), per [game-design.md § 8](game-design.md#8-hints--optional-off-by-default)

**Done when** the game is fully playable with a screen reader and keyboard only, and
nothing depends on colour alone.

## M4 — Release

- [ ] Complete curation of all 878 answers; every entry human-reviewed
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
