import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // OLED-friendly surface ramp
        surface: {
          DEFAULT: "#000000",
          raised: "#0a0a0a",
          card: "#111111",
        },
      },
    },
  },
  plugins: [],
};

export default config;
