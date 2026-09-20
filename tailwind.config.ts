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
        background: "#04121b",
        foreground: "#ffffff",
        graphite: {
          950: "#0B0B0D",
          900: "#111115",
          850: "#18181F",
          800: "#202026",
          750: "#282732",
          700: "#32313D",
          600: "#4A4956",
        },
        paper: {
          DEFAULT: "#F1EEE8",
          dim: "#C7C2BC",
          muted: "#8D8B97",
        },
        smoke: {
          DEFAULT: "#8D8B97",
          dark: "#5A5864",
          light: "#AFAEB8",
        },
        signal: {
          red: "#FF3B30",
          redDim: "rgba(255, 59, 48, 0.15)",
          redGlow: "rgba(255, 59, 48, 0.4)",
        },
        violet: {
          DEFAULT: "#7968FF",
          deep: "#33275F",
          dim: "rgba(121, 104, 255, 0.15)",
          glow: "rgba(121, 104, 255, 0.4)",
        },
        chartreuse: {
          DEFAULT: "#C8FF3D",
          dim: "rgba(200, 255, 61, 0.15)",
          glow: "rgba(200, 255, 61, 0.4)",
        },
        amber: {
          DEFAULT: "#FFB347",
          dim: "rgba(255, 179, 71, 0.15)",
          glow: "rgba(255, 179, 71, 0.4)",
        },
      },
      fontFamily: {
        sans:    ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        tight:   ['"Inter Tight"', '"Inter"', 'sans-serif'],
        display: ['"Inter Tight"', '"Inter"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      keyframes: {
        "riseIn":    { from: { opacity: "0", transform: "translateY(14px)" },              to: { opacity: "1", transform: "translateY(0)" } },
        "slideL":    { from: { opacity: "0", transform: "translateX(-26px)" },             to: { opacity: "1", transform: "translateX(0)" } },
        "slideR":    { from: { opacity: "0", transform: "translateX(30px) scale(0.985)" }, to: { opacity: "1", transform: "translateX(0) scale(1)" } },
        "popIn":     { from: { opacity: "0", transform: "scale(0.7)" },                    to: { opacity: "1", transform: "scale(1)" } },
        "growY":     { from: { transform: "scaleY(0)" },                                   to: { transform: "scaleY(1)" } },
        "lineUp":    { from: { transform: "translateY(115%)" },                            to: { transform: "translateY(0)" } },
        "wipeDown":  { from: { clipPath: "inset(0 0 100% 0)", opacity: "0" },              to: { clipPath: "inset(0 0 0 0)", opacity: "1" } },
        "wipeRight": { from: { clipPath: "inset(0 100% 0 0)", opacity: "0" },              to: { clipPath: "inset(0 0 0 0)", opacity: "1" } },
        "wipeX":     { from: { transform: "scaleX(0)" },                                   to: { transform: "scaleX(1)" } },
        "sheen":     { from: { transform: "translate3d(-150%,0,0) skewX(-18deg)" },        to: { transform: "translate3d(260%,0,0) skewX(-18deg)" } },
        "radar-pulse":  { "0%": { transform: "scale(0.95)", opacity: "0.9" }, "50%": { transform: "scale(1.35)", opacity: "0" }, "100%": { transform: "scale(0.95)", opacity: "0.9" } },
        "signal-blink": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
        "scanline":     { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(1000%)" } },
      },
      animation: {
        "rise-in":      "riseIn 0.70s cubic-bezier(.16,1,.3,1) both",
        "rise-in-slow": "riseIn 0.90s cubic-bezier(.16,1,.3,1) both",
        "slide-l":      "slideL 0.92s cubic-bezier(.16,1,.3,1) 0.05s both",
        "slide-r":      "slideR 0.95s cubic-bezier(.16,1,.3,1) both",
        "pop-in":       "popIn  0.70s cubic-bezier(.16,1,.3,1) 0.26s both",
        "grow-y":       "growY  0.50s cubic-bezier(.16,1,.3,1) 0.68s both",
        "line-up":      "lineUp 1.05s cubic-bezier(.16,1,.3,1) 0.56s both",
        "wipe-down":    "wipeDown 0.90s cubic-bezier(.22,.61,.36,1) 0.90s both",
        "wipe-right":   "wipeRight 0.80s cubic-bezier(.22,.61,.36,1) 0.44s both",
        "wipe-x":       "wipeX 1.42s cubic-bezier(.37,.01,.2,1) 1.72s both",
        "sheen":        "sheen 1.15s cubic-bezier(.22,.61,.36,1) 2.55s 1 both",
        "radar-pulse":  "radar-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "signal-blink": "signal-blink 1.2s ease-in-out infinite",
        "scanline":     "scanline 8s linear infinite",
      },
      backdropBlur: {
        "glass":    "18px",
        "glass-lg": "26px",
        "glass-sm": "12px",
      },
    },
  },
  plugins: [],
};

export default config;
