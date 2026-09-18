import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brick: {
          950: "rgb(var(--brick-950) / <alpha-value>)",
          900: "rgb(var(--brick-900) / <alpha-value>)",
          800: "rgb(var(--brick-800) / <alpha-value>)",
          700: "rgb(var(--brick-700) / <alpha-value>)",
        },
        ember: {
          700: "#CC5200",
          600: "#FF6600",
          500: "#FF8533",
          400: "#FFA366",
          300: "#FFC299",
        },
        cream: "#FBF6F1",
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
