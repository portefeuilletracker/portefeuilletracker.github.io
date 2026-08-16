/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F2ED",
        ink: "#1B2A26",
        "ink-soft": "#4A5754",
        line: "#DAD4C6",
        gain: "#4C7A5E",
        loss: "#A6432D",
        brass: "#B08D57",
      },
      fontFamily: {
        display: ["'Source Serif 4'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
