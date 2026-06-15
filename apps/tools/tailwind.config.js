/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        dark:    'rgb(var(--color-dark)    / <alpha-value>)',
        base:    'rgb(var(--color-base)    / <alpha-value>)',
        muted:   'rgb(var(--color-muted)   / <alpha-value>)',
        soft:    'rgb(var(--color-soft)    / <alpha-value>)',
        accent:  'rgb(var(--color-accent)  / <alpha-value>)',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
