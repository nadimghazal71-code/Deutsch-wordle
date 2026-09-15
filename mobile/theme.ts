import type { Mark } from '@core/types';

/**
 * The web app's CSS custom properties, as a plain object. React Native has no
 * cascade and no custom properties, so the token set is resolved once per render
 * from (colour scheme x palette) instead of being redefined in media queries.
 */
export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textDim: string;
  border: string;
  borderStrong: string;
  correct: string;
  present: string;
  absent: string;
  onMark: string;
  key: string;
  keyText: string;
  accent: string;
  scheme: 'light' | 'dark';
}

const LIGHT = {
  bg: '#ffffff',
  surface: '#f6f6f7',
  surface2: '#ebebec',
  text: '#16161a',
  textDim: '#6b6b73',
  border: '#d3d3d8',
  borderStrong: '#8b8b93',
  absent: '#7c7c85',
  onMark: '#ffffff',
  key: '#dcdce1',
  keyText: '#16161a',
  accent: '#2f6fe0',
} as const;

const DARK = {
  bg: '#16161a',
  surface: '#1f1f25',
  surface2: '#2a2a31',
  text: '#f2f2f4',
  textDim: '#a0a0aa',
  border: '#3a3a43',
  borderStrong: '#6d6d78',
  absent: '#4a4a53',
  onMark: '#ffffff',
  key: '#3a3a43',
  keyText: '#f2f2f4',
  accent: '#6f9df0',
} as const;

/** Green/yellow is exactly the pair a red-green deficiency confuses. */
const MARKS = {
  light: { default: { correct: '#4f9d5c', present: '#c9a227' }, cb: { correct: '#d2691e', present: '#2f6fe0' } },
  dark: { default: { correct: '#4f9d5c', present: '#b8941f' }, cb: { correct: '#e07a2f', present: '#5b8ee8' } },
} as const;

export type PaletteName = 'default' | 'cb';

export function makeTheme(scheme: 'light' | 'dark', palette: PaletteName): Theme {
  const base = scheme === 'dark' ? DARK : LIGHT;
  return { ...base, ...MARKS[scheme][palette], scheme };
}

export function markColour(theme: Theme, mark: Mark): string {
  return mark === 'correct' ? theme.correct : mark === 'present' ? theme.present : theme.absent;
}

/** Colour is never the only channel — every scored tile can carry a glyph. */
export const MARK_GLYPH: Record<Mark, string> = { correct: '✓', present: '◐', absent: '·' };

export const MARK_LABEL_DE: Record<Mark, string> = {
  correct: 'richtig',
  present: 'an anderer Stelle',
  absent: 'nicht im Wort',
};

export const RADIUS = 6;
export const GAP = 5;
