import { Pressable, StyleSheet, Text, View } from 'react-native';
import { toTile } from '@core/normalise';
import type { KeyState } from '@core/types';
import { type Theme, markColour } from '../theme';

/**
 * QWERTZ — the German layout, so the muscle memory transfers to a real German
 * keyboard. Ä Ö Ü extend the middle row and ß the bottom one: 30 letter keys, because
 * one word in ten needs them.
 *
 * On mobile these keys are the only way to enter an umlaut, which makes them more
 * load-bearing here than on the web, where the `;a` dead key also exists.
 */
export const ROWS: readonly string[][] = [
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
  ['ENTER', 'y', 'x', 'c', 'v', 'b', 'n', 'm', 'ß', 'ü', 'BACK'],
];

interface Props {
  states: Map<string, KeyState>;
  theme: Theme;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

interface GiveUpProps {
  theme: Theme;
  /** True once the player has tapped once and is being asked to confirm. */
  confirming: boolean;
  onPress: () => void;
}

/**
 * Give up and see the word. Two taps rather than one: losing a round you were still
 * thinking about because of a mis-tap would be worse than the extra tap.
 */
export function GiveUpRow({ theme, confirming, onPress }: GiveUpProps) {
  return (
    <View style={styles.giveUpRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={confirming ? 'Wirklich aufgeben und das Wort zeigen' : 'Aufgeben'}
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.giveUp, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.giveUpLabel, { color: confirming ? theme.present : theme.textDim }]}>
          {confirming ? 'Wirklich aufgeben?' : 'Aufgeben'}
        </Text>
      </Pressable>
    </View>
  );
}

export function Keyboard({ states, theme, onLetter, onEnter, onBackspace }: Props) {
  return (
    <View accessibilityLabel="Tastatur" style={styles.keyboard}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key) => {
            if (key === 'ENTER' || key === 'BACK') {
              const isEnter = key === 'ENTER';
              return (
                <Key
                  key={key}
                  label={isEnter ? 'Enter' : '⌫'}
                  accessibilityLabel={isEnter ? 'Wort abschicken' : 'Buchstabe löschen'}
                  onPress={isEnter ? onEnter : onBackspace}
                  theme={theme}
                  wide
                />
              );
            }
            const state = states.get(key);
            const scored = state && state !== 'unused' ? state : null;
            return (
              <Key
                key={key}
                label={toTile(key)}
                accessibilityLabel={ariaLabel(key, state)}
                onPress={() => onLetter(key)}
                theme={theme}
                background={scored ? markColour(theme, scored) : undefined}
                colour={scored ? theme.onMark : undefined}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface KeyProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  theme: Theme;
  wide?: boolean;
  background?: string;
  colour?: string;
}

function Key({ label, accessibilityLabel, onPress, theme, wide, background, colour }: KeyProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        wide ? styles.keyWide : null,
        {
          backgroundColor: background ?? theme.key,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.keyLabel, wide ? styles.keyLabelWide : null, { color: colour ?? theme.keyText }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ariaLabel(key: string, state: KeyState | undefined): string {
  const suffix =
    state === 'correct' ? ', richtig' :
    state === 'present' ? ', im Wort' :
    state === 'absent' ? ', nicht im Wort' : '';
  return `${toTile(key)}${suffix}`;
}

const styles = StyleSheet.create({
  giveUpRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: 2 },
  giveUp: { paddingVertical: 6, paddingHorizontal: 4 },
  giveUpLabel: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  keyboard: { gap: 6, paddingBottom: 4 },
  row: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  key: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  keyWide: { flex: 1.5 },
  keyLabel: { fontSize: 16, fontWeight: '600' },
  keyLabelWide: { fontSize: 12 },
});
