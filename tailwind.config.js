/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        grove: {
          green: "#4CAF50",
          dark: "#1A2E20",
          light: "#E8F5E9",
          accent: "#A5D6A7"
        }
      }
    },
  },
  plugins: [],
}
