/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14202b",
        mist: "#eef2ef",
        steel: "#2e5b6e",
        teal: "#0f766e",
        amber: "#b7791f",
        slate: "#556270",
        redoxide: "#b54f3a",
        moss: "#4d7a58",
        navy: "#0d1b2a",
        cloud: "#f6f3ec",
        brass: "#c08a2e",
        fog: "#d9e1dc"
      },
      boxShadow: {
        panel: "0 20px 45px rgba(20, 32, 43, 0.08)",
        float: "0 24px 70px rgba(13, 27, 42, 0.24)"
      },
      fontFamily: {
        sans: ["Avenir Next", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"]
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(20, 32, 43, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 32, 43, 0.05) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
