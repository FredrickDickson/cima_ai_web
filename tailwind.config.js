/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5bdfd',
          400: '#8098f9',
          500: '#6172f3',
          600: '#4b55e8',
          700: '#3b44cc',
          800: '#2d3499',
          900: '#1e2566',
          950: '#0f172a',
        },
        gold: {
          50: '#fefbec',
          100: '#fdf3c8',
          200: '#fae58c',
          300: '#f7d14f',
          400: '#f4be28',
          500: '#c9a227',
          600: '#b8860b',
          700: '#92670a',
          800: '#78540e',
          900: '#654512',
          950: '#3a2506',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
