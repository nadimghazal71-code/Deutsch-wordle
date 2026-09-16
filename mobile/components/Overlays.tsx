import { StyleSheet, Text, View } from 'react-native';
import { LENGTHS, type Length } from '@core/types';
import type { Settings, Store } from '@store/stats';
import { statsFor } from '@store/stats';
import type { Theme } from '../theme';
import { Button, Overlay } from './DefinitionCard';
import { Pressable } from 'react-native';

/** Stats are per length: a 3-letter streak and an 8-letter streak are not the same. */
export function StatsCard({ store, length, theme, onClose }: {
  store: Store; length: Length; theme: Theme; onClose: () => void;
}) {
  const s = statsFor(store, length);
  const winRate = s.played === 0 ? 0 : Math.round((s.won / s.played) * 100);
  const best = Math.max(...s.distribution, 0);

  return (
    <Overlay theme={theme} onClose={onClose} label="Statistik">
      <Text style={[styles.title, { color: theme.text }]}>{`Statistik · ${length} Buchstaben`}</Text>

      <View style={styles.figures}>
        <Figure value={String(s.played)} label="Runden" theme={theme} />
        <Figure value={`${winRate}%`} label="gewonnen" theme={theme} />
        <Figure value={String(s.streak)} label="Serie" theme={theme} />
        <Figure value={String(s.bestStreak)} label="beste Serie" theme={theme} />
        <Figure value={String(s.wordsSeen.length)} label="Wörter gesehen" theme={theme} />
      </View>

      <View style={[styles.rule, { backgroundColor: theme.border }]} />
      <Text style={[styles.sectionLabel, { color: theme.textDim }]}>Verteilung der Versuche</Text>

      <View style={styles.dist}>
        {s.distribution.map((count, i) => (
          <View key={i} style={styles.distRow}>
            <Text style={[styles.distIndex, { color: theme.textDim }]}>{i + 1}</Text>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: count > 0 && count === best ? theme.correct : theme.absent,
                  flexGrow: best === 0 ? 0 : count / best,
                  minWidth: 26,
                },
              ]}
            >
              <Text style={[styles.barLabel, { color: theme.onMark }]}>{count}</Text>
            </View>
            <View style={{ flexGrow: best === 0 ? 1 : 1 - (best === 0 ? 0 : count / best) }} />
          </View>
        ))}
      </View>

      <View style={[styles.rule, { backgroundColor: theme.border }]} />
      <Text style={[styles.sectionLabel, { color: theme.textDim }]}>Alle Längen</Text>
      <View style={styles.dist}>
        {LENGTHS.map((n) => {
          const other = statsFor(store, n);
          return (
            <View key={n} style={styles.distRow}>
              <Text style={[styles.distIndex, { color: theme.textDim }]}>{n}</Text>
              <Text style={[styles.allLengths, { color: theme.text }]}>{`${other.won}/${other.played}`}</Text>
              <Text style={[styles.allLengthsDim, { color: theme.textDim }]}>{`${other.wordsSeen.length} Wörter`}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button label="Schließen" theme={theme} primary fill onPress={onClose} />
      </View>
    </Overlay>
  );
}

export function SettingsCard({ settings, theme, onChange, onClose }: {
  settings: Settings; theme: Theme; onChange: (patch: Partial<Settings>) => void; onClose: () => void;
}) {
  return (
    <Overlay theme={theme} onClose={onClose} label="Einstellungen">
      <Text style={[styles.title, { color: theme.text }]}>Einstellungen</Text>
      <View style={[styles.rule, { backgroundColor: theme.border }]} />

      <Setting label="Farben" note="Orange und Blau statt Grün und Gelb." theme={theme}>
        <Segmented theme={theme} options={[
          ['Standard', settings.palette === 'default', () => onChange({ palette: 'default' })],
          ['Farbenblind', settings.palette === 'cb', () => onChange({ palette: 'cb' })],
        ]} />
      </Setting>

      <Setting label="Symbole auf den Feldern" note="✓ richtig, ◐ im Wort, · nicht im Wort." theme={theme}>
        <Segmented theme={theme} options={[
          ['Aus', !settings.glyphs, () => onChange({ glyphs: false })],
          ['An', settings.glyphs, () => onChange({ glyphs: true })],
        ]} />
      </Setting>

      <Setting label="Design" note="Hell, dunkel oder wie das System." theme={theme}>
        <Segmented theme={theme} options={[
          ['System', settings.theme === 'system', () => onChange({ theme: 'system' })],
          ['Hell', settings.theme === 'light', () => onChange({ theme: 'light' })],
          ['Dunkel', settings.theme === 'dark', () => onChange({ theme: 'dark' })],
        ]} />
      </Setting>

      <Setting label="Wörter prüfen" note="Offen: alles wird angenommen. Streng: nur Wörter aus der Liste." theme={theme}>
        <Segmented theme={theme} options={[
          ['Offen', settings.validation === 'open', () => onChange({ validation: 'open' })],
          ['Liste', settings.validation === 'dictionary', () => onChange({ validation: 'dictionary' })],
          ['Streng', settings.validation === 'strict', () => onChange({ validation: 'strict' })],
        ]} />
      </Setting>

      <View style={styles.actions}>
        <Button label="Schließen" theme={theme} primary fill onPress={onClose} />
      </View>
    </Overlay>
  );
}

function Figure({ value, label, theme }: { value: string; label: string; theme: Theme }) {
  return (
    <View style={styles.figure}>
      <Text style={[styles.figureValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.figureLabel, { color: theme.textDim }]}>{label}</Text>
    </View>
  );
}

function Setting({ label, note, theme, children }: {
  label: string; note: string; theme: Theme; children: React.ReactNode;
}) {
  return (
    <View style={[styles.setting, { borderBottomColor: theme.border }]}>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.settingNote, { color: theme.textDim }]}>{note}</Text>
      </View>
      {children}
    </View>
  );
}

function Segmented({ theme, options }: {
  theme: Theme; options: [label: string, active: boolean, onPress: () => void][];
}) {
  return (
    <View style={[styles.segmented, { borderColor: theme.border }]}>
      {options.map(([label, active, onPress]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          accessibilityLabel={label}
          onPress={onPress}
          style={[styles.segment, { backgroundColor: active ? theme.accent : theme.surface }]}
        >
          <Text style={[styles.segmentLabel, { color: active ? '#fff' : theme.text }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700' },
  figures: { flexDirection: 'row', gap: 6, marginTop: 14 },
  figure: { flex: 1, alignItems: 'center' },
  figureValue: { fontSize: 20, fontWeight: '700' },
  figureLabel: { fontSize: 10, textAlign: 'center' },
  rule: { height: 1, marginVertical: 14 },
  sectionLabel: { fontSize: 13, marginBottom: 8 },
  dist: { gap: 3 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distIndex: { width: 12, fontSize: 13 },
  bar: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, alignItems: 'flex-end' },
  barLabel: { fontSize: 11 },
  allLengths: { fontSize: 13, minWidth: 40 },
  allLengthsDim: { fontSize: 12 },
  setting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 15 },
  settingNote: { fontSize: 12, marginTop: 1 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  segment: { paddingHorizontal: 10, paddingVertical: 7 },
  segmentLabel: { fontSize: 12 },
  actions: { flexDirection: 'row', marginTop: 18 },
});
