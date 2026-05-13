import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          50:  "#f5f1e8",
          100: "#ebe2cc",
          200: "#d4bf90",
          300: "#bfa264",
          400: "#a4863f",
          500: "#8a6d29",
          600: "#6f561e",
          700: "#56411a",
          800: "#3c2c12",
          900: "#231a0b",
        },
        navy: {
          50:  "#f1f4f8",
          100: "#dde4ee",
          200: "#b6c4d6",
          300: "#7d93b0",
          400: "#456081",
          500: "#1f3a5f",
          600: "#163050",
          700: "#11253e",
          800: "#0c1b2e",
          900: "#07121f",
          950: "#040a14",
        },
        ink: {
          950: "#020617",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
          500: "#64748b",
          400: "#94a3b8",
          300: "#cbd5e1",
          200: "#e2e8f0",
          100: "#f1f5f9",
          50:  "#f8fafc",
        },
        positive: "#0f6b46",
        negative: "#8a1d2a",
        paper: "#fbfaf6",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Hiragino Kaku Gothic ProN",
          "Yu Gothic",
          "Meiryo",
          "sans-serif",
        ],
        serif: [
          "Iowan Old Style",
          "Apple Garamond",
          "Baskerville",
          "Times New Roman",
          "Hiragino Mincho ProN",
          "Yu Mincho",
          "serif",
        ],
      },
      maxWidth: {
        container: "1440px",
      },
      letterSpacing: {
        tightest: "-0.04em",
        tightheadline: "-0.022em",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.03)",
        elevated: "0 8px 24px -6px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)",
        inset: "inset 0 0 0 1px rgba(15,23,42,0.06)",
      },
    },
  },
  plugins: [],
}

export default config
