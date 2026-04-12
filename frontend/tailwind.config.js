/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        gray: {
          950: '#030712',
        },
      },
      animation: {
        'bounce': 'bounce 1s infinite',
      },
    },
  },
  plugins: [],
};
