/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        vault: {
          black: "#030706",
          bg: "rgb(var(--bg-base-rgb) / <alpha-value>)",
          surface: "rgb(var(--bg-surface-rgb) / <alpha-value>)",
          panel: "rgb(var(--bg-panel-rgb) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated-rgb) / <alpha-value>)",
          subtle: "rgb(var(--bg-subtle-rgb) / <alpha-value>)",
          emerald: "#10B981",
          "emerald-soft": "#059669",
          "emerald-dark": "#047857",
        },
        accent: {
          primary: "rgb(var(--accent-primary-rgb) / <alpha-value>)",
          hover: "var(--accent-hover)",
          active: "var(--accent-active)",
          foreground: "var(--accent-foreground)",
          soft: "var(--accent-soft)",
          border: "var(--accent-border)",
          glow: "var(--accent-glow)",
        },
        // Feature Module Identities
        relay: { accent: "#8B5CF6", glow: "#7C3AED" },
        pulse: { accent: "#06B6D4", glow: "#0891B2" },
        beacon: { accent: "#F59E0B", glow: "#D97706" },
        recycle: { accent: "#EF4444", glow: "#DC2626" },
        core: { accent: "#3B82F6", glow: "#2563EB" },
        linkdrive: { accent: "#F97316", glow: "#EA580C" },
        linkgit: { accent: "#8B5CF6", glow: "#7C3AED" },
        danger: { accent: "#EF4444" },
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.35s ease-out forwards",
        "pulse-glow": "pulseGlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "radar-sweep": "radarSweep 8s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        radarSweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
