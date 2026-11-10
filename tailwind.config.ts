import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17324d',
        ocean: '#0f766e',
        sky: '#e0f2fe',
        sun: '#fbbf24',
        coral: '#f97360',
      },
    },
  },
  plugins: [],
} satisfies Config
