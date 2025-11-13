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
        pixel: ['"Press Start 2P"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Pastel Fantasy Palette
        'pastel-blue': '#A7C7E7',
        'pastel-green': '#B2D8B2',
        'pastel-pink': '#FFB6C1',
        'pastel-yellow': '#FDFD96',
        'pastel-purple': '#B19CD9',
        'dark-bg': '#282c34', // Dark background for contrast
        'dark-card': '#3a3f47', // Slightly lighter dark for cards
        'accent-light': '#8AFF8A', // Bright accent for interactive elements
        'accent-dark': '#4CAF50', // Darker accent
      },
      borderRadius: {
        'xl': '22px', // Custom rounded-xl to be 22px
      }
    },
  },
  plugins: [],
};
