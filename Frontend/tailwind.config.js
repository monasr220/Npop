/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Three brand colours, exposed as CSS-variable RGB channels so
        // Tailwind opacity modifiers (e.g. bg-brand-primary/10) keep working.
        brand: {
          primary: "rgb(var(--brand-primary) / <alpha-value>)",
          social: "rgb(var(--brand-social) / <alpha-value>)",
          success: "rgb(var(--brand-success) / <alpha-value>)",
          solid: "rgb(var(--brand-solid) / <alpha-value>)",
          on: "rgb(var(--brand-on) / <alpha-value>)",
        },
        app: {
          bg: "rgb(var(--bg) / <alpha-value>)",
          surface: "rgb(var(--surface) / <alpha-value>)",
          raised: "rgb(var(--surface-2) / <alpha-value>)",
          border: "rgb(var(--border) / <alpha-value>)",
          strong: "rgb(var(--border-strong) / <alpha-value>)",
          text: "rgb(var(--text) / <alpha-value>)",
          muted: "rgb(var(--muted) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI Variable",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Book Antiqua",
          "Palatino",
          "Georgia",
          "serif",
        ],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.2rem",
        "3xl": "1.6rem",
      },
      boxShadow: {
        soft: "0 6px 18px rgb(23 23 23 / 0.14)",
        lift: "0 18px 44px rgb(23 23 23 / 0.32)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [],
}
