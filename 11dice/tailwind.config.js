/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"M PLUS Rounded 1c"', ...defaultTheme.fontFamily.sans], // Use M PLUS Rounded 1c as default sans-serif
      },
      colors: {
        // Pastel Fantasy Palette inspired by "belo"
        'pastel-pink': '#FFD1DC', // From belo background start
        'pastel-blue-light': '#B0E0E6', // From belo background end
        'pastel-blue-dark': '#A7C7E7', // Slightly darker pastel blue
        'pastel-green': '#B2D8B2',
        'pastel-yellow': '#FDFD96',
        'pastel-purple': '#B19CD9',
        'dark-text': '#213547', // From belo text color
        'dark-bg': '#1a1a1a', // From belo button background
        'dark-card': '#2d2d2d', // Slightly lighter dark for cards
        'accent-blue': '#646cff', // From belo link/accent
        'accent-blue-hover': '#535bf2', // From belo link hover
        'accent-green': '#8AFF8A', // Bright accent for interactive elements
      },
      borderRadius: {
        'xl': '8px', // Match belo's button border-radius
      }
    },
  },
  plugins: [],
};
