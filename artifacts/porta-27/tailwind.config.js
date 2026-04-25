/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#07080c",
        "ink": "#c9c4b0",
        "ink-dim": "#8b8a7e",
        "ember": "#d97a2a",
        "ember-bright": "#ffb366",
        "blood": "#8b1a1a",
        "mind": "#5b8ca1",
        "mind-bright": "#9bd1ff",
        "gold": "#e6c34a",
        "fog": "#1a1d28",
      },
      animation: {
        "roomPulse": "roomPulse 2s ease-in-out infinite",
        "roomFloat": "roomFloat 3s ease-in-out infinite",
        "roomFall": "roomFall 4s linear infinite",
        "roomDrift": "roomDrift 5s ease-in-out infinite",
        "roomFlash": "roomFlash 3.4s ease-in-out infinite",
        "roomFadeIn": "roomFadeIn 600ms ease-out",
        "roomStreak": "roomStreak 3s linear infinite",
        "drift": "drift 8s ease-in-out infinite",
        "scanline-fast": "scanline-fast 0.1s linear infinite",
        "shake": "shake 0.3s",
      },
      keyframes: {
        "roomPulse": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.8" },
        },
        "roomFloat": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "roomFall": {
          "0%": { transform: "translateY(-20px)" },
          "100%": { transform: "translateY(20px)" },
        },
        "roomDrift": {
          "0%, 100%": { transform: "translateX(0px)" },
          "50%": { transform: "translateX(5px)" },
        },
        "roomFlash": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "0.3" },
        },
        "roomFadeIn": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "roomStreak": {
          "0%": { opacity: "0" },
          "50%": { opacity: "0.6" },
          "100%": { opacity: "0" },
        },
        "drift": {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "25%": { transform: "translateY(-5px) translateX(5px)" },
          "50%": { transform: "translateY(-10px) translateX(0px)" },
          "75%": { transform: "translateY(-5px) translateX(-5px)" },
        },
        "scanline-fast": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
}