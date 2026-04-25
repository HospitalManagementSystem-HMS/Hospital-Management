/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#1a3c5e", // Deep Blue
          accent: "#00a896", // Teal
          50: "#eff8ff",
          100: "#dbefff",
          200: "#bfe3ff",
          300: "#93d2ff",
          400: "#60baff",
          500: "#359cff",
          600: "#1f7df5",
          700: "#1c62d2",
          800: "#1d53aa",
          900: "#1d4688"
        }
      }
    }
  },
  plugins: []
};

