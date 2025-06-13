/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: { // Add 'Inter' font to your Tailwind config
        inter: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

