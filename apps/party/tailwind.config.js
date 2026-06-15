/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6c63ff',
        dark: '#211738',
        muted: '#736694',
        soft: '#f2edfa',
        accent: '#a49ffe',
      },
    },
  },
  plugins: [],
}
