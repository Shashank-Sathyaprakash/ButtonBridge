/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#15161a",
          900: "#1c1e24",
          800: "#23262e",
          700: "#2d313b",
          600: "#3a3f4b",
          500: "#4a5160",
        },
        accent: {
          DEFAULT: "#6ee7b7",
          dim: "#34d399",
        },
      },
      keyframes: {
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        "press-ring": {
          "0%": { opacity: "0.9", transform: "scale(0.6)" },
          "100%": { opacity: "0", transform: "scale(2.2)" },
        },
        "facet-glow": {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.85" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 0.6s linear",
        "press-ring": "press-ring 0.5s ease-out forwards",
        "facet-glow": "facet-glow 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
