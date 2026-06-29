/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // App surfaces (dark mode, matches reference mockups)
        ink: {
          900: "#0b0b0c", // app background (near black)
          800: "#141416", // raised surface
          700: "#1c1c1f", // input fill
          600: "#26262b", // input fill (lighter)
        },
        line: {
          DEFAULT: "#3a3a40", // input border (gray)
          soft: "#2a2a2e",
        },
        // Brand
        bamboo: {
          green: "#5cb838", // leaf green
          greenDark: "#143d14", // Delta button base
          greenAccent: "#16a34a", // active green (x100)
          blue: "#1f8fd6",
          navy: "#0e3a6b",
        },
        teal: {
          accent: "#14b8a6", // total row borders / active tab
        },
        warn: {
          orange: "#b45309", // Reset button
          red: "#dc2626", // discrepancy / overdue alert
          maroon: "#3d1418", // MEL "Today UTC" header card
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
