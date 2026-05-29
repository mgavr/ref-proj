import type { Config } from 'tailwindcss';

/**
 * Tailwind theme for the Linear-leaning aesthetic (variant A from the
 * step-6.5 mockups). Dense, geometric, neutral grays with a single
 * indigo accent. Light-mode only — no dark variants. No dark: classes
 * needed anywhere in the app.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  // Single source of truth for our palette. We're explicitly NOT using
  // Tailwind's default color palette — too many options, too little
  // intentionality. These are the colors. Period.
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      // Page background, slightly cooler than #f6f7f9 in the mockup —
      // it reads as "ambient surface" rather than the actual card.
      page: '#f6f7f9',
      // Card surface. Pure white card on cool gray page = the Linear
      // signature "raised plane."
      surface: '#ffffff',
      // Near-black with a hint of blue. Better than pure #000 against
      // the cool gray page.
      ink: {
        DEFAULT: '#0b0d10',
        muted: '#6c707a',
        faint: '#8a8e96',
      },
      // Hairline borders. Cool, not warm.
      hairline: '#e4e6eb',
      hairlineStrong: '#d1d5db',
      // The accent. Linear's indigo. Used very sparingly — only for
      // logo dot, focus rings, and the rare semantic accent.
      accent: {
        DEFAULT: '#5e6ad2',
        soft: '#eef0fb',
      },
      danger: '#c4344b',
    },
    fontFamily: {
      // Inter is the right call for this aesthetic. It's what Linear
      // and Vercel actually use. Geist would also work — Inter is more
      // ubiquitous and renders identically across platforms.
      sans: [
        '"Inter"',
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'sans-serif',
      ],
      mono: [
        '"JetBrains Mono"',
        'ui-monospace',
        'SFMono-Regular',
        'monospace',
      ],
    },
    extend: {
      // Linear's signature "tight" letter-spacing on headings.
      letterSpacing: {
        tightish: '-0.01em',
        tighter: '-0.02em',
      },
      borderRadius: {
        // Slightly less round than Tailwind's defaults to match the
        // dense, geometric tone.
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
      },
      boxShadow: {
        // Subtle, only on hover. Used on the card edges to lift them
        // off the page surface slightly.
        card: '0 1px 0 rgba(11, 13, 16, 0.04), 0 0 0 1px #e4e6eb',
        cardHover: '0 1px 2px rgba(11, 13, 16, 0.06), 0 0 0 1px #d1d5db',
      },
      animation: {
        'fade-in': 'fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 500ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
