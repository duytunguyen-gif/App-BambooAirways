/** @type {import('tailwindcss').Config} */

// Theme-aware colours are declared as space-separated RGB channels in CSS
// variables (see src/index.css) so Tailwind's `/<alpha>` opacity utilities keep
// working. Swapping the variable values under [data-theme="light"] re-themes
// every existing `bg-ink-*`, `border-line*`, `text-white`, `text-gray-*` class
// WITHOUT touching component markup. Brand accents (bamboo/teal/warn) are the
// same in both themes, so they stay as literal hex.
const themed = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary text token: `text-white` = near-white on dark, dark ink on light.
        white: themed("--c-white"),
        // Secondary / muted text scale (dark: classic Tailwind grays, light: readable grays).
        gray: {
          100: themed("--c-gray-100"),
          200: themed("--c-gray-200"),
          300: themed("--c-gray-300"),
          400: themed("--c-gray-400"),
          500: themed("--c-gray-500"),
          600: themed("--c-gray-600"),
        },
        // App surfaces
        ink: {
          900: themed("--c-ink-900"), // app background / header
          800: themed("--c-ink-800"), // raised surface / card
          700: themed("--c-ink-700"), // input fill
          600: themed("--c-ink-600"), // input fill (lighter) / hover
        },
        line: {
          DEFAULT: themed("--c-line"), // input border
          soft: themed("--c-line-soft"), // separators / bottom nav border
        },
        // Brand FILLS — identical across themes (keep cyan/green/orange identity
        // for solid buttons, borders and low-opacity tints).
        bamboo: {
          green: "#5cb838", // leaf green
          greenDark: themed("--c-green-dark"), // Delta button base (themed: darker in light)
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
        // Accent FOREGROUND (text/icons) — themed so accent text stays legible
        // on light surfaces. Dark = the brand hues above; light = darkened (see
        // src/index.css). Use `text-accent-*`, NOT `text-bamboo-green` etc.
        accent: {
          green: themed("--c-accent-green"),
          teal: themed("--c-accent-teal"),
          blue: themed("--c-accent-blue"),
          red: themed("--c-accent-red"),
          orange: themed("--c-accent-orange"),
        },
        // Selected/active pill surface (segmented controls, active bottom tab).
        sel: themed("--c-sel"),
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
