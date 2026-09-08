import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0B0D",
        foreground: "#F1EEE8",
        graphite: {
          950: "#0B0B0D", // Primary page background
          900: "#111115", // Main panels & console surfaces
          850: "#18181F", // Elevated panels
          800: "#202026", // Chips, controls, tactile surfaces
          750: "#282732", // Borders & active card borders
          700: "#32313D", // Technical rule lines
          600: "#4A4956", // Dividers
        },
        paper: {
          DEFAULT: "#F1EEE8", // Warm Paper primary text
          dim: "#C7C2BC",     // Body copy and secondary labels
          muted: "#8D8B97",   // Smoke metadata & timestamps
        },
        smoke: {
          DEFAULT: "#8D8B97",
          dark: "#5A5864",
          light: "#AFAEB8",
        },
        signal: {
          red: "#FF3B30",     // Alarms, critical events, RED alert
          redDim: "rgba(255, 59, 48, 0.15)",
          redGlow: "rgba(255, 59, 48, 0.4)",
        },
        violet: {
          DEFAULT: "#7968FF", // Synthetic glow, AI copilot, sync, redaction
          deep: "#33275F",    // Deep interface layers & hover states
          dim: "rgba(121, 104, 255, 0.15)",
          glow: "rgba(121, 104, 255, 0.4)",
        },
        chartreuse: {
          DEFAULT: "#C8FF3D", // Live, active, power, action, healthy states
          dim: "rgba(200, 255, 61, 0.15)",
          glow: "rgba(200, 255, 61, 0.4)",
        },
        amber: {
          DEFAULT: "#FFB347", // Medium-severity caution & ORANGE/YELLOW alerts
          dim: "rgba(255, 179, 71, 0.15)",
          glow: "rgba(255, 179, 71, 0.4)",
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      keyframes: {
        "radar-pulse": {
          "0%": { transform: "scale(0.95)", opacity: "0.9" },
          "50%": { transform: "scale(1.35)", opacity: "0" },
          "100%": { transform: "scale(0.95)", opacity: "0.9" },
        },
        "signal-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "scanline": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
      },
      animation: {
        "radar-pulse": "radar-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "signal-blink": "signal-blink 1.2s ease-in-out infinite",
        "scanline": "scanline 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
