import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  AccessibilityInfo, Pressable, StyleSheet, Text,
  useColorScheme, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';

import { initialState, isRoundOver, reduce, shareText } from '@core/game';
import { keyboardState } from '@core/keyboard-state';
import { letters, toComparable } from '@core/normalise';
import { answersOfLength, dailyAnswer, isoDate, practiceAnswer } from '@core/select';
import { LENGTHS, type Length, type Word } from '@core/types';
import { freshStore, recordResult, statsFor, type Settings, type Store } from '@store/stats';

import { load, save } from './storage';
import { makeTheme, type Theme } from './theme';
import { Grid, describeGuess } from './components/Grid';
import { Keyboard } from './components/Keyboard';
import { DefinitionCard } from './components/DefinitionCard';
import { SettingsCard, StatsCard } from './components/Overlays';
import { Setup } from './components/Setup';

import words3 from '@data/words.3.json';
import words4 from '@data/words.4.json';
import words5 from '@data/words.5.json';
import words6 from '@data/words.6.json';
import words7 from '@data/words.7.json';
import words8 from '@data/words.8.json';
import guessList from '@data/guesses.json';

const WORDS = [...words3, ...words4, ...words5, ...words6, ...words7, ...words8] as Word[];
const GUESSES = new Set<string>(guessList as string[]);
const POOLS = Object.fromEntries(LENGTHS.map((n) => [n, answersOfLength(WORDS, n)])) as Record<Length, Word[]>;
const POOL_SIZES = Object.fromEntries(LENGTHS.map((n) => [n, POOLS[n].length])) as Record<Length, number>;
const BY_ID = new Map(WORDS.map((w) => [w.id, w]));

type Overlay = 'none' | 'reveal' | 'stats' | 'settings';

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

/**
 * Android is edge-to-edge by default from SDK 54 on, and React Native's own
 * SafeAreaView is iOS-only — it silently does nothing on Android, which would put the
 * header under the status bar and the keyboard under the navigation bar. So the insets
 * come from react-native-safe-area-context and are applied as padding.
 */
function Game() {
  const insets = useSafeAreaInsets();
  // useColorScheme can also report 'unspecified'; anything but explicit dark is light.
  const scheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { width } = useWindowDimensions();

  const [game, dispatch] = useReducer(reduce, undefined, initialState);
  const [store, setStore] = useState<Store>(freshStore);
  const [ready, setReady] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [toast, setToast] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<Length>(5);
  const [mode, setMode] = useState<'daily' | 'practice'>('practice');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const settings = store.settings;
  const theme = useMemo(
    () => makeTheme(settings.theme === 'system' ? scheme : settings.theme, settings.palette),
    [scheme, settings.theme, settings.palette],
  );

  // Load persisted state once. Until it arrives the setup screen is inert rather than
  // wrong: starting a round against default settings would clobber real stats.
  useEffect(() => {
    let cancelled = false;
    void load().then((loaded) => {
      if (!cancelled) {
        setStore(loaded);
        setReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((next: Store) => {
    setStore(next);
    void save(next);
  }, []);

  const flashToast = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const isDailyDone = useCallback(
    (length: Length) => store.dailyDone[length] === isoDate(),
    [store.dailyDone],
  );

  const startRound = useCallback((length: Length, nextMode: 'daily' | 'practice') => {
    const pool = POOLS[length];
    if (pool.length === 0) return;
    const today = isoDate();
    const seen = statsFor(store, length).wordsSeen;
    const word = nextMode === 'daily' ? dailyAnswer(pool, today, length) : practiceAnswer(pool, seen);

    dispatch({
      type: 'START',
      length,
      answerId: word.id,
      answer: letters(toComparable(word.lemma)),
      mode: nextMode,
      date: today,
    });
    setOverlay('none');
    AccessibilityInfo.announceForAccessibility(
      `Neue Runde: ${length} Buchstaben, ${Math.ceil(length / 2) + 3} Versuche.`,
    );
  }, [store]);

  const isKnownWord = useCallback((word: string) => {
    if (settings.validation === 'strict') return POOLS[game.length].some((w) => w.lemma === word);
    return GUESSES.has(word);
  }, [settings.validation, game.length]);

  const submit = useCallback(() => {
    dispatch({ type: 'SUBMIT', tier: settings.validation, isKnownWord });
  }, [settings.validation, isKnownWord]);

  // React to what the reducer produced, rather than duplicating its rules here.
  const handled = useRef({ guesses: 0, rejectionAt: 0 });

  useEffect(() => {
    if (game.status === 'setup') return;

    if (game.guesses.length > handled.current.guesses) {
      handled.current.guesses = game.guesses.length;
      const scored = game.guesses[game.guesses.length - 1]!;
      AccessibilityInfo.announceForAccessibility(describeGuess(scored.letters, scored.marks));

      if (isRoundOver(game)) {
        const won = game.status === 'won';
        const inProgress = { ...store.inProgress };
        delete inProgress[game.length];
        persist(recordResult(
          {
            ...store,
            inProgress,
            dailyDone: game.mode === 'daily'
              ? { ...store.dailyDone, [game.length]: game.date }
              : store.dailyDone,
          },
          game.length,
          {
            won,
            attempts: game.guesses.length,
            answerId: game.answerId,
            // Only the daily round moves a streak; practice would make it meaningless.
            countsForStreak: game.mode === 'daily',
          },
        ));
        const delay = game.length * 60 + 260;
        const timer = setTimeout(() => setOverlay('reveal'), delay);
        return () => clearTimeout(timer);
      }

      // Save the round in flight so a kill-and-reopen resumes it.
      persist({
        ...store,
        inProgress: {
          ...store.inProgress,
          [game.length]: {
            answerId: game.answerId,
            guesses: game.guesses.map((g) => g.letters.join('')),
            date: game.date,
            mode: game.mode,
          },
        },
      });
    }
    return undefined;
  }, [game, store, persist]);

  useEffect(() => {
    if (!game.rejection) return;
    const message = game.rejection === 'too-short' ? 'Zu kurz' : 'Das Wort kenne ich nicht';
    flashToast(message);
    AccessibilityInfo.announceForAccessibility(message);
  }, [game.rejection, game.guesses.length, flashToast]);

  // Restore an unfinished round once the store has loaded, by replaying its guesses
  // through the reducer so the restored state cannot drift from the rules.
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const today = isoDate();
    for (const length of LENGTHS) {
      const saved = store.inProgress[length];
      if (!saved) continue;
      if (saved.mode === 'daily' && saved.date !== today) continue;
      const word = BY_ID.get(saved.answerId);
      if (!word) continue;

      dispatch({
        type: 'START',
        length,
        answerId: word.id,
        answer: letters(toComparable(word.lemma)),
        mode: saved.mode,
        date: saved.date,
      });
      for (const guess of saved.guesses) {
        for (const letter of letters(guess)) dispatch({ type: 'TYPE_LETTER', letter });
        dispatch({ type: 'SUBMIT', tier: 'open', isKnownWord: () => true });
      }
      handled.current.guesses = saved.guesses.length;
      setSelectedLength(length);
      setMode(saved.mode);
      return;
    }
  }, [ready, store.inProgress]);

  const share = useCallback(async () => {
    const text = shareText(game, new Date().toLocaleDateString('de-DE'));
    try {
      await Clipboard.setStringAsync(text);
      flashToast('Ergebnis kopiert');
    } catch {
      flashToast('Kopieren nicht möglich');
    }
  }, [game, flashToast]);

  const goHome = useCallback(() => {
    dispatch({ type: 'RESET' });
    handled.current.guesses = 0;
    setOverlay('none');
  }, []);

  // Tiles must fit the narrowest phone at eight letters: that is the binding
  // constraint on the whole layout.
  const tileSize = useMemo(() => {
    const available = Math.min(width, 460) - 32 - 5 * (game.length - 1);
    return Math.max(28, Math.min(58, Math.floor(available / Math.max(game.length, 1))));
  }, [width, game.length]);

  const answerWord = BY_ID.get(game.answerId);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.app, { paddingBottom: insets.bottom + 10 }]}>
        <Header
          theme={theme}
          showBack={game.status !== 'setup'}
          onBack={goHome}
          onStats={() => setOverlay('stats')}
          onSettings={() => setOverlay('settings')}
        />

        {game.status === 'setup' ? (
          <Setup
            poolSizes={POOL_SIZES}
            selected={selectedLength}
            mode={mode}
            dailyDone={isDailyDone}
            theme={theme}
            onChoose={setSelectedLength}
            onMode={setMode}
            onStart={() => { if (ready) startRound(selectedLength, mode); }}
          />
        ) : (
          <>
            <View style={styles.boardArea}>
              <Grid
                state={game}
                theme={theme}
                glyphs={settings.glyphs}
                rejected={game.rejection !== null}
                tileSize={tileSize}
              />
            </View>
            <Keyboard
              states={keyboardState(game.guesses)}
              theme={theme}
              onLetter={(letter) => dispatch({ type: 'TYPE_LETTER', letter })}
              onEnter={submit}
              onBackspace={() => dispatch({ type: 'BACKSPACE' })}
            />
          </>
        )}
      </View>

      {overlay === 'reveal' && answerWord ? (
        <DefinitionCard
          word={answerWord}
          outcome={{ won: game.status === 'won', attempts: game.guesses.length, maxAttempts: game.maxAttempts }}
          theme={theme}
          onPlayAgain={() => startRound(game.length, game.mode === 'daily' ? 'practice' : game.mode)}
          onStats={() => setOverlay('stats')}
          onShare={() => void share()}
          onClose={goHome}
        />
      ) : null}

      {overlay === 'stats' ? (
        <StatsCard
          store={store}
          length={game.status === 'setup' ? selectedLength : game.length}
          theme={theme}
          onClose={() => setOverlay(isRoundOver(game) ? 'reveal' : 'none')}
        />
      ) : null}

      {overlay === 'settings' ? (
        <SettingsCard
          settings={settings}
          theme={theme}
          onChange={(patch: Partial<Settings>) => persist({ ...store, settings: { ...settings, ...patch } })}
          onClose={() => setOverlay(isRoundOver(game) ? 'reveal' : 'none')}
        />
      ) : null}

      {toast ? (
        <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 100 }]}>
          <Text style={[styles.toast, { backgroundColor: theme.text, color: theme.bg }]}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Header({ theme, showBack, onBack, onStats, onSettings }: {
  theme: Theme; showBack: boolean; onBack: () => void; onStats: () => void; onSettings: () => void;
}) {
  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <View style={styles.headerSide}>
        {showBack ? <IconButton label="←" accessibilityLabel="Zurück zur Auswahl" onPress={onBack} theme={theme} /> : null}
      </View>
      <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.text }]}>DEUTSCH-WORDLE</Text>
      <View style={[styles.headerSide, styles.headerActions]}>
        <IconButton label="📊" accessibilityLabel="Statistik" onPress={onStats} theme={theme} />
        <IconButton label="⚙" accessibilityLabel="Einstellungen" onPress={onSettings} theme={theme} />
      </View>
    </View>
  );
}

function IconButton({ label, accessibilityLabel, onPress, theme }: {
  label: string; accessibilityLabel: string; onPress: () => void; theme: Theme;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.iconLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  app: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  headerSide: { width: 76, flexDirection: 'row' },
  headerActions: { justifyContent: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', letterSpacing: 0.8 },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  iconLabel: { fontSize: 17 },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, fontSize: 14, overflow: 'hidden' },
});
