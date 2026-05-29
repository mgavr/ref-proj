import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Heading: a high-contrast serif with personality. Loaded via
        // Google Fonts in layout.tsx.
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        // Body: a clean sans with subtle character.
        sans: ['"Geist Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Used sparingly for technical details (IDs, dates, status codes)
        // to match the "reference project" tone.
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Warm off-white, never pure white. Pure white feels clinical;
        // this feels like paper.
        canvas: {
          DEFAULT: '#fbf9f4',
          dark: '#15110d',
        },
        // Near-black with a hint of warmth, not the harsh #000.
        ink: {
          DEFAULT: '#1a1816',
          subtle: '#5a544e',
          muted: '#8b8478',
          dark: '#f0ece5',
          'dark-subtle': '#a8a097',
          'dark-muted': '#6b655c',
        },
        // The one accent. Deep burgundy. Confident, atypical.
        accent: {
          DEFAULT: '#7d2424',
          dark: '#c54545',
        },
        // Subtle borders and dividers.
        rule: {
          DEFAULT: '#e8e2d6',
          dark: '#2a2520',
        },
      },
      animation: {
        'fade-in': 'fadeIn 800ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
