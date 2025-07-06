/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forge-primary': '#3B82F6',
        'forge-secondary': '#10B981',
        'forge-danger': '#EF4444',
        'forge-warning': '#F59E0B',
        'forge-dark': '#1F2937',
        'forge-light': '#F9FAFB'
      }
    },
  },
  plugins: [],
}