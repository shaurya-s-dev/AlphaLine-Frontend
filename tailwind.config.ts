import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: 'var(--bg-void)',
        surface: 'var(--bg-surface)',
        raised: 'var(--bg-raised)',
        'border-dark': 'var(--border-dark)',
        indigo: '#6366F1',
        frost: 'var(--text-frost)',
        muted: 'var(--text-muted)',
        dim: 'var(--text-dim)',
        'sig-green': '#22C55E',
        'sig-red': '#EF4444',
        'sig-amber': '#F59E0B',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        brand: ['var(--font-dm-mono)', 'monospace'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
