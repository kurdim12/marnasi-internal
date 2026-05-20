import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: { 900: '#0F3D2E', 950: '#0a2b20' },
        champagne: { 400: '#C9A86A', 500: '#b8975a' },
        ivory: { 50: '#F8F4ED', 100: '#efe9dd' },
        ink: { 950: '#0A0A0A' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'Tahoma', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [require('tailwindcss-rtl')],
};

export default config;
