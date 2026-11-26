/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      colors: {
        navy: {
          50: '#f0f4fa', 100: '#dbe4f2', 200: '#b8c9e4', 300: '#8aa5cf', 400: '#5c7fb8',
          500: '#3d609c', 600: '#2e4a7d', 700: '#223a64', 800: '#142a4d', 900: '#0b1d3a', 950: '#06122a',
        },
      },
    },
  },
  plugins: [],
};
