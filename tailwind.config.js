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
        // Black and white theme with purposeful color usage
        'rillation': {
          'bg': '#000000',
          'card': '#141414',
          'card-hover': '#1a1a1a',
          'border': '#222222',
          'purple': '#a855f7', // Keep for backward compatibility, but avoid using
          'purple-dark': '#7c3aed',
          'magenta': '#d946ef', // Keep for backward compatibility, but avoid using
          'cyan': '#22d3ee', // Keep for backward compatibility, but avoid using
          'orange': '#f97316', // Keep for backward compatibility, but avoid using
          'green': '#22c55e', // Use for positive trends, targets met
          'red': '#ef4444', // Use for negative trends, targets missed
          'yellow': '#eab308', // Use for neutral/caution states
          'text': '#ffffff',
          'text-muted': '#888888',
        },
        // CRM-specific dark blue theme
        'crm': {
          'bg': '#0d1117',
          'card': '#161b22',
          'card-hover': '#1c2128',
          'border': '#30363d',
          'text': '#f0f6fc',
          'text-muted': '#8b949e',
          'checkbox': '#238636',
          'checkbox-hover': '#2ea043',
        }
      },
      fontFamily: {
        'sans': ['Sora', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

