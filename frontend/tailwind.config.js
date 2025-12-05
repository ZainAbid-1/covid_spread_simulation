/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        susceptible: '#10b981',
        infected: '#ef4444',
        recovered: '#3b82f6',
        background: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155'
        }
      }
    },
  },
  plugins: [],
}
