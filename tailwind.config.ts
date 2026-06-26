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
        void: '#0D0F14',
        surface: '#111318',
        raised: '#1C1F28',
        'border-dark': '#1E2230',
        indigo: '#6366F1',
        frost: '#E2E8F0',
        muted: '#6B7280',
        dim: '#374151',
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
