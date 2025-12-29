/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        // Custom dark theme colors matching your current design
        'rillation': {
          'bg': '#0a0a0f',
          'card': '#12121a',
          'card-hover': '#1a1a25',
          'border': '#2a2a3a',
          'purple': '#a855f7',
          'purple-dark': '#7c3aed',
          'magenta': '#d946ef',
          'cyan': '#22d3ee',
          'orange': '#f97316',
          'green': '#22c55e',
          'red': '#ef4444',
          'text': '#f1f5f9',
          'text-muted': '#94a3b8',
        }
      },
      fontFamily: {
        'sans': ['Sora', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

