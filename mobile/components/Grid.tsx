import { StyleSheet, Text, View } from 'react-native';
import type { GameState } from '@core/game';
import { toTile } from '@core/normalise';
import { GAP, MARK_GLYPH, MARK_LABEL_DE, RADIUS, markColour, type Theme } from '../theme';

interface Props {
  state: GameState;
  theme: Theme;
  glyphs: boolean;
  /** Set while a rejected guess is being shown, so the active row can be flagged. */
  rejected: boolean;
  tileSize: number;
}

/**
 * The board. Each tile carries its state in accessibilityLabel and, when enabled, a
 * glyph, so neither a screen reader nor a colour-blind player depends on the colour.
 */
export function Grid({ state, theme, glyphs, rejected, tileSize }: Props) {
  const rows = [];

  for (let r = 0; r < state.maxAttempts; r++) {
    const guess = state.guesses[r];
    const isCurrentRow = r === state.guesses.length && state.status === 'playing';
    const tiles = [];

    for (let c = 0; c < state.length; c++) {
      const size = { width: tileSize, height: tileSize };

      if (guess) {
        const letter = guess.letters[c]!;
        const mark = guess.marks[c]!;
        tiles.push(
          <View
            key={c}
            accessibilityLabel={`${toTile(letter)}, ${MARK_LABEL_DE[mark]}`}
            style={[styles.tile, size, { backgroundColor: markColour(theme, mark), borderColor: 'transparent' }]}
          >
            <Text style={[styles.letter, { color: theme.onMark, fontSize: tileSize * 0.46 }]}>{toTile(letter)}</Text>
            {glyphs ? <Text style={[styles.glyph, { color: theme.onMark }]}>{MARK_GLYPH[mark]}</Text> : null}
          </View>,
        );
        continue;
      }

      const letter = isCurrentRow ? state.current[c] : undefined;
      const isActive = isCurrentRow && c === state.current.length;
      const borderColor = isActive
        ? (rejected ? theme.present : theme.accent)
        : letter
          ? theme.borderStrong
          : theme.border;

      tiles.push(
        <View
          key={c}
          accessibilityLabel={letter ? toTile(letter) : 'leer'}
          style={[styles.tile, size, { borderColor, backgroundColor: theme.bg }]}
        >
          <Text style={[styles.letter, { color: theme.text, fontSize: tileSize * 0.46 }]}>
            {letter ? toTile(letter) : ''}
          </Text>
        </View>,
      );
    }

    rows.push(<View key={r} style={styles.row}>{tiles}</View>);
  }

  return (
    <View
      accessibilityLabel={`Spielfeld, ${state.length} Buchstaben, ${state.maxAttempts} Versuche`}
      style={styles.board}
    >
      {rows}
    </View>
  );
}

/** The announcement for a freshly scored row. */
export function describeGuess(letters: string[], marks: GameState['guesses'][number]['marks']): string {
  return letters.map((ch, i) => `${toTile(ch)} ${MARK_LABEL_DE[marks[i]!]}`).join(', ');
}

const styles = StyleSheet.create({
  board: { gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: RADIUS,
  },
  letter: { fontWeight: '700' },
  glyph: { position: 'absolute', top: 1, right: 3, fontSize: 9, fontWeight: '700', opacity: 0.85 },
});
