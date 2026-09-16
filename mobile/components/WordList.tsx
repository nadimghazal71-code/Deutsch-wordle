import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { searchVocabulary, countByLength, headword, type VocabularyFilter } from '@core/vocabulary';
import { LENGTHS, type Length, type Word } from '@core/types';
import type { Theme } from '../theme';
import { Button, Overlay } from './DefinitionCard';

const POS_DE: Record<Word['pos'], string> = {
  noun: 'Substantiv', verb: 'Verb', adj: 'Adjektiv', adv: 'Adverb', num: 'Zahlwort', other: 'Wort',
};

/**
 * The word list — every answer the game can set, readable outside a round, so the app
 * works as a vocabulary trainer and not only as a puzzle. Reachable from the setup
 * screen. See docs/game-design.md § 12.
 */
export function WordList({ words, theme, onClose }: {
  words: readonly Word[]; theme: Theme; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [length, setLength] = useState<Length | undefined>(undefined);
  const [level, setLevel] = useState<'A1' | 'A2' | undefined>(undefined);
  const [selected, setSelected] = useState<Word | null>(null);

  const total = useMemo(() => searchVocabulary(words).length, [words]);
  const matches = useMemo(() => {
    const filter: VocabularyFilter = {};
    if (query.trim()) filter.query = query;
    if (length !== undefined) filter.length = length;
    if (level !== undefined) filter.level = level;
    return searchVocabulary(words, filter);
  }, [words, query, length, level]);
  const counts = useMemo(() => countByLength(words), [words]);

  if (selected) {
    return (
      <Overlay theme={theme} onClose={onClose} label={`Wort: ${headword(selected)}`}>
        <WordDetail word={selected} theme={theme} />
        <View style={styles.actions}>
          <Button label="← Zurück" theme={theme} onPress={() => setSelected(null)} />
          <Button label="Schließen" theme={theme} primary fill onPress={onClose} />
        </View>
      </Overlay>
    );
  }

  return (
    <Overlay theme={theme} onClose={onClose} label="Wortliste">
      <Text style={[styles.title, { color: theme.text }]}>Wortliste</Text>
      <Text style={[styles.count, { color: theme.textDim }]}>{`${matches.length} von ${total} Wörtern`}</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Suchen — deutsch oder englisch"
        placeholderTextColor={theme.textDim}
        accessibilityLabel="Wort suchen, auf Deutsch oder Englisch"
        autoCorrect={false}
        style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
      />

      <View style={styles.chips}>
        <Chip label="Alle" active={length === undefined} theme={theme} onPress={() => setLength(undefined)} />
        {LENGTHS.map((n) => (
          <Chip
            key={n}
            label={String(n)}
            accessibilityLabel={`${n} Buchstaben, ${counts.get(n) ?? 0} Wörter`}
            active={length === n}
            theme={theme}
            onPress={() => setLength(n)}
          />
        ))}
      </View>

      <View style={styles.chips}>
        <Chip label="A1 + A2" active={level === undefined} theme={theme} onPress={() => setLevel(undefined)} />
        <Chip label="A1" active={level === 'A1'} theme={theme} onPress={() => setLevel('A1')} />
        <Chip label="A2" active={level === 'A2'} theme={theme} onPress={() => setLevel('A2')} />
      </View>

      {matches.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textDim }]}>Kein Wort gefunden.</Text>
      ) : (
        <ScrollView style={[styles.rows, { borderTopColor: theme.border }]} nestedScrollEnabled>
          {matches.map((word) => (
            <Pressable
              key={word.id}
              accessibilityRole="button"
              accessibilityLabel={`${headword(word)}, ${word.definition_en}, Niveau ${word.level}`}
              onPress={() => setSelected(word)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: theme.border, backgroundColor: pressed ? theme.surface : 'transparent' },
              ]}
            >
              <View style={styles.rowHead}>
                <Text style={[styles.rowWord, { color: theme.text }]}>{headword(word)}</Text>
                <Text style={[styles.rowLevel, { color: theme.textDim }]}>{word.level}</Text>
              </View>
              <Text style={[styles.rowGloss, { color: theme.textDim }]}>{word.definition_en}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.actions}>
        <Button label="Schließen" theme={theme} primary fill onPress={onClose} />
      </View>
    </Overlay>
  );
}

/** One word in full — the same content as the end-of-round card, without the result. */
function WordDetail({ word, theme }: { word: Word; theme: Theme }) {
  return (
    <>
      <View style={styles.detailHead}>
        <Text style={[styles.detailWord, { color: theme.text }]}>{headword(word)}</Text>
        <Text style={[styles.detailLevel, { color: theme.textDim, backgroundColor: theme.surface2 }]}>{word.level}</Text>
      </View>
      <Text style={[styles.count, { color: theme.textDim }]}>{inflection(word)}</Text>
      <Text style={[styles.count, { color: theme.textDim }]}>
        {`${POS_DE[word.pos]} · ${word.topic} · ${[...word.lemma].length} Buchstaben`}
      </Text>
      <View style={[styles.rule, { backgroundColor: theme.border }]} />
      <Text style={[styles.definition, { color: theme.text }]}>{word.definition_de}</Text>
      <Text style={[styles.gloss, { color: theme.textDim }]}>{word.definition_en}</Text>
      <View style={[styles.example, { borderLeftColor: theme.border }]}>
        <Text style={[styles.exampleDe, { color: theme.text }]}>{`„${word.example_de}“`}</Text>
        <Text style={[styles.exampleEn, { color: theme.textDim }]}>{word.example_en}</Text>
      </View>
    </>
  );
}

function inflection(word: Word): string {
  if (word.pos === 'noun') return word.plural ? `Plural: die ${word.plural}` : 'Kein Plural';
  if (word.pos === 'verb' && word.partizip2) {
    const aux = word.aux === 'sein' ? ' (ist)' : '';
    return `Partizip II: ${word.partizip2}${aux}${word.separable ? ' · trennbar' : ''}`;
  }
  return '';
}

function Chip({ label, active, theme, onPress, accessibilityLabel }: {
  label: string; active: boolean; theme: Theme; onPress: () => void; accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.chip, {
        backgroundColor: active ? theme.accent : theme.surface,
        borderColor: active ? theme.accent : theme.border,
      }]}
    >
      <Text style={[styles.chipLabel, { color: active ? '#fff' : theme.textDim }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700' },
  count: { fontSize: 13, marginTop: 3 },
  search: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderRadius: 8, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderRadius: 999 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  rows: { maxHeight: 360, marginTop: 10, borderTopWidth: 1 },
  row: { paddingVertical: 9, paddingHorizontal: 2, borderBottomWidth: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowWord: { flex: 1, fontSize: 16, fontWeight: '600' },
  rowLevel: { fontSize: 11, fontWeight: '700' },
  rowGloss: { fontSize: 13, marginTop: 1 },
  empty: { marginVertical: 24, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  detailHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  detailWord: { flex: 1, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  detailLevel: { fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  rule: { height: 1, marginVertical: 14 },
  definition: { fontSize: 16, lineHeight: 23 },
  gloss: { fontSize: 15, marginTop: 5 },
  example: { marginTop: 16, paddingLeft: 12, borderLeftWidth: 3 },
  exampleDe: { fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  exampleEn: { fontSize: 13, marginTop: 3 },
});
