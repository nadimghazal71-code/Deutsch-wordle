import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Word } from '@core/types';
import type { Theme } from '../theme';

const POS_DE: Record<Word['pos'], string> = {
  noun: 'Substantiv',
  verb: 'Verb',
  adj: 'Adjektiv',
  adv: 'Adverb',
  num: 'Zahlwort',
  other: 'Wort',
};

interface Props {
  word: Word;
  outcome: { won: boolean; attempts: number; maxAttempts: number };
  theme: Theme;
  onPlayAgain: () => void;
  onStats: () => void;
  onShare: () => void;
  onClose: () => void;
}

/**
 * The payoff. Identical whether the player won or lost — the card is the lesson
 * either way, so losing must not feel like a dead end.
 */
export function DefinitionCard({ word, outcome, theme, onPlayAgain, onStats, onShare, onClose }: Props) {
  const headword = word.pos === 'noun' && word.article ? `${word.article} ${word.display}` : word.display;
  const result = outcome.won
    ? `Geschafft in ${outcome.attempts} von ${outcome.maxAttempts} Versuchen.`
    : 'Das Wort war:';

  return (
    <Overlay theme={theme} onClose={onClose} label={`Wort: ${headword}`}>
      <Text style={[styles.result, { color: theme.textDim }]}>{result}</Text>

      <View style={styles.headwordRow}>
        <Text style={[styles.headword, { color: theme.text }]}>{headword}</Text>
        <Text style={[styles.level, { color: theme.textDim, backgroundColor: theme.surface2 }]}>{word.level}</Text>
      </View>

      <Text style={[styles.inflection, { color: theme.textDim }]}>{inflection(word)}</Text>
      <Text style={[styles.grammar, { color: theme.textDim }]}>{`${POS_DE[word.pos]} · ${word.topic}`}</Text>

      <View style={[styles.rule, { backgroundColor: theme.border }]} />

      <Text style={[styles.definition, { color: theme.text }]}>{word.definition_de}</Text>
      <Text style={[styles.gloss, { color: theme.textDim }]}>{word.definition_en}</Text>

      <View style={[styles.example, { borderLeftColor: theme.border }]}>
        <Text style={[styles.exampleDe, { color: theme.text }]}>{`„${word.example_de}“`}</Text>
        <Text style={[styles.exampleEn, { color: theme.textDim }]}>{word.example_en}</Text>
      </View>

      <View style={styles.actions}>
        <Button label="Nochmal spielen" onPress={onPlayAgain} theme={theme} primary fill />
        <Button label="📊" accessibilityLabel="Statistik" onPress={onStats} theme={theme} />
        <Button label="⤳" accessibilityLabel="Ergebnis kopieren" onPress={onShare} theme={theme} />
      </View>
    </Overlay>
  );
}

/** What a learner actually needs, per part of speech. */
function inflection(word: Word): string {
  if (word.pos === 'noun') {
    // The plural article is always "die", whatever the singular gender.
    return word.plural ? `Plural: die ${word.plural}` : 'Kein Plural';
  }
  if (word.pos === 'verb' && word.partizip2) {
    const aux = word.aux === 'sein' ? ' (ist)' : '';
    return `Partizip II: ${word.partizip2}${aux}${word.separable ? ' · trennbar' : ''}`;
  }
  return '';
}

interface OverlayProps {
  theme: Theme;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}

/** Shared chrome for the three overlays: backdrop, card, tap-outside and back to close. */
export function Overlay({ theme, onClose, label, children }: OverlayProps) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen">
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[styles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}
          onPress={(event) => event.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  theme: Theme;
  primary?: boolean;
  /**
   * Grow to fill a row. Only for a `flexDirection: 'row'` parent — this used to be
   * baked into `primary`, which silently collapsed the button to zero height in a
   * column parent, because `flex: 1` also sets `flexBasis: 0`.
   */
  fill?: boolean;
  accessibilityLabel?: string;
}

export function Button({ label, onPress, theme, primary, fill, accessibilityLabel }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: theme.accent }
          : { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
        fill ? styles.buttonFill : null,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[styles.buttonLabel, { color: primary ? '#fff' : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderRadius: 14,
  },
  result: { fontSize: 13, marginBottom: 10 },
  headwordRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headword: { flex: 1, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  level: { fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  inflection: { fontSize: 14, marginTop: 6 },
  grammar: { fontSize: 13, marginTop: 2 },
  rule: { height: 1, marginVertical: 16 },
  definition: { fontSize: 16, lineHeight: 23 },
  gloss: { fontSize: 15, marginTop: 5 },
  example: { marginTop: 16, paddingLeft: 12, borderLeftWidth: 3 },
  exampleDe: { fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  exampleEn: { fontSize: 13, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // A floor on the height, so a stray flex rule can never collapse the label out of
    // sight again, and the tap target clears the 48dp accessibility guideline.
    minHeight: 52,
  },
  buttonFill: { flex: 1 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
