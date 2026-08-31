/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: 'var(--navy-50)',
          100: 'var(--navy-100)',
          200: 'var(--navy-200)',
          300: 'var(--navy-300)',
          400: 'var(--navy-400)',
          500: 'var(--navy-500)',
          600: 'var(--navy-600)',
          700: 'var(--navy-700)',
          800: 'var(--navy-800)',
          900: 'var(--navy-900)',
          950: 'var(--navy-950)',
        },
        gold: {
          50: 'var(--gold-50)',
          100: 'var(--gold-100)',
          200: 'var(--gold-200)',
          300: 'var(--gold-300)',
          400: 'var(--gold-400)',
          500: 'var(--gold-500)',
          600: 'var(--gold-600)',
          700: 'var(--gold-700)',
          800: 'var(--gold-800)',
          900: 'var(--gold-900)',
          950: 'var(--gold-950)',
        },
        accent: {
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
        },
        // Landing page colors - Premium Nordic Burgundy Palette
        burgundy: {
          50: '#faf6f7',
          100: '#f4eff0',
          200: '#e8d9dc',
          300: '#d6b8bd',
          400: '#be8e96',
          500: '#a86772',
          600: '#5A2633', // Nordic Burgundy - Primary
          700: '#4a1f2a',
          800: '#3d1a23',
          900: '#35171f',
          950: '#1d0c12',
        },
        ivory: {
          50: '#FDFCFA',
          100: '#F5F1E8', // Warm Ivory - Primary Background
          200: '#F0EBE1',
          300: '#E8E2D7',
          400: '#DDD6C9',
        },
        cream: {
          50: '#fefdfb',
          100: '#F8F6F0',
          200: '#f3efe5',
          300: '#ebe4d5',
        },
        charcoal: {
          50: '#f7f7f7',
          100: '#ebebeb',
          200: '#d6d6d6',
          300: '#b8b8b8',
          400: '#939393',
          500: '#757575',
          600: '#5f5f5f',
          700: '#4a4a4a',
          800: '#3d3d3d',
          900: '#252525', // Charcoal - Primary Text
          950: '#161616',
        },
        gold: {
          50: '#faf8f3',
          100: '#f5f0e6',
          200: '#e9dfc5',
          300: '#dbc9a0',
          400: '#ceaf7a',
          500: '#B49A67', // Muted Gold - Accent
          600: '#a38550',
          700: '#886b42',
          800: '#6f5739',
          900: '#5c4730',
          950: '#332518',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'elegant': '0 4px 24px rgba(90, 38, 51, 0.08)',
        'elegant-lg': '0 8px 40px rgba(90, 38, 51, 0.12)',
        'elegant-xl': '0 20px 60px rgba(90, 38, 51, 0.15)',
        'premium': '0 2px 8px rgba(90, 38, 51, 0.04), 0 8px 24px rgba(90, 38, 51, 0.06)',
        'premium-lg': '0 4px 16px rgba(90, 38, 51, 0.06), 0 16px 48px rgba(90, 38, 51, 0.08)',
      },
    },
  },
  plugins: [],
};
