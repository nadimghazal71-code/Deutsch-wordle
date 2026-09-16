import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LENGTHS, type Length } from '@core/types';
import { attemptsFor } from '@core/attempts';
import type { Theme } from '../theme';
import { Button } from './DefinitionCard';

interface Props {
  poolSizes: Record<Length, number>;
  selected: Length | null;
  mode: 'daily' | 'practice';
  dailyDone: (length: Length) => boolean;
  theme: Theme;
  onChoose: (length: Length) => void;
  onMode: (mode: 'daily' | 'practice') => void;
  onStart: () => void;
}

/**
 * The chooser shows the real answer-pool size under each length. That is the honest
 * way to surface a small pool rather than hiding it.
 */
export function Setup({ poolSizes, selected, mode, dailyDone, theme, onChoose, onMode, onStart }: Props) {
  const blocked = selected !== null && mode === 'daily' && dailyDone(selected);

  return (
    <View style={styles.setup}>
      <Text style={[styles.title, { color: theme.text }]}>Wie viele Buchstaben?</Text>
      <Text style={[styles.lede, { color: theme.textDim }]}>
        Wortschatz Goethe A1 und A2. Am Ende jeder Runde gibt es die Bedeutung.
      </Text>

      <View style={styles.lengthGrid}>
        {LENGTHS.map((length) => {
          const active = selected === length;
          return (
            <Pressable
              key={length}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${length} Buchstaben, ${poolSizes[length]} Wörter, ${attemptsFor(length)} Versuche`}
              onPress={() => onChoose(length)}
              style={[
                styles.lengthOption,
                { backgroundColor: theme.surface, borderColor: active ? theme.accent : theme.border },
              ]}
            >
              <Text style={[styles.lengthNumber, { color: theme.text }]}>{length}</Text>
              <Text style={[styles.lengthMeta, { color: theme.textDim }]}>{poolSizes[length]} Wörter</Text>
              <Text style={[styles.lengthMeta, { color: theme.textDim }]}>{attemptsFor(length)} Versuche</Text>
            </Pressable>
          );
        })}
      </View>

      {selected !== null && poolSizes[selected] < 40 ? (
        <Text style={[styles.smallPool, { color: theme.textDim, backgroundColor: theme.surface, borderLeftColor: theme.present }]}>
          {`Kleiner Wortschatz: nur ${poolSizes[selected]} Wörter mit ${selected} Buchstaben. `
            + 'Im Täglich-Modus kommt jedes Wort einmal, bevor sich etwas wiederholt.'}
        </Text>
      ) : null}

      <View style={styles.modeRow}>
        <ModeOption label="Täglich" note="ein Wort pro Tag" active={mode === 'daily'} theme={theme} onPress={() => onMode('daily')} />
        <ModeOption label="Üben" note="so oft du willst" active={mode === 'practice'} theme={theme} onPress={() => onMode('practice')} />
      </View>

      <View style={{ opacity: selected === null || blocked ? 0.5 : 1 }}>
        <Button
          label={blocked ? 'Heute schon gespielt' : 'Starten'}
          theme={theme}
          primary
          onPress={() => {
            if (selected !== null && !blocked) onStart();
          }}
        />
      </View>

      <Text style={[styles.hint, { color: theme.textDim }]}>Tipp: Ä Ö Ü ß sind eigene Tasten auf der Tastatur.</Text>
    </View>
  );
}

function ModeOption({ label, note, active, theme, onPress }: {
  label: string; note: string; active: boolean; theme: Theme; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${note}`}
      onPress={onPress}
      style={[styles.modeOption, { backgroundColor: theme.surface, borderColor: active ? theme.accent : theme.border }]}
    >
      <Text style={[styles.modeLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.modeNote, { color: theme.textDim }]}>{note}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  setup: { gap: 18, paddingTop: 22 },
  title: { fontSize: 22, fontWeight: '700' },
  lede: { fontSize: 15, lineHeight: 21 },
  lengthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lengthOption: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 10,
  },
  lengthNumber: { fontSize: 24, fontWeight: '700' },
  lengthMeta: { fontSize: 11 },
  smallPool: { fontSize: 13, lineHeight: 19, padding: 10, borderLeftWidth: 3, borderRadius: 4 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeOption: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 2, borderRadius: 10 },
  modeLabel: { fontSize: 16 },
  modeNote: { fontSize: 11 },
  hint: { fontSize: 13 },
});
