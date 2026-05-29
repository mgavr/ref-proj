/**
 * Design tokens for the mobile app. Mirrors apps/web/tailwind.config.ts
 * — same Linear-leaning palette, same indigo accent — so web and
 * mobile read as one product.
 *
 * Not using Tailwind on mobile; NativeWind would add build complexity
 * for a 2-screen reference app. Plain StyleSheet with these constants
 * is sufficient and idiomatic to React Native.
 */

export const colors = {
  white: '#ffffff',
  page: '#f6f7f9',
  surface: '#ffffff',
  ink: {
    primary: '#0b0d10',
    muted: '#6c707a',
    faint: '#8a8e96',
  },
  hairline: '#e4e6eb',
  hairlineStrong: '#d1d5db',
  accent: '#5e6ad2',
  accentSoft: '#eef0fb',
  danger: '#c4344b',
} as const;

export const radii = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 14,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Font sizes calibrated for a typical 390pt phone width.
export const type = {
  // Display: small for an iOS app, density-first.
  display: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.4 },
  title: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  mono: {
    fontSize: 12,
    fontFamily: 'Menlo',
    letterSpacing: 0.1,
  },
  monoLabel: {
    fontSize: 11,
    fontFamily: 'Menlo',
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;
