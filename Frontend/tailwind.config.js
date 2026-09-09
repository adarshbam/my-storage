/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
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
          // Dynamic Emerald mapped directly to active accent tokens
          emerald: "rgb(var(--accent-primary-rgb) / <alpha-value>)",
          "emerald-soft": "var(--accent-soft)",
          "emerald-dark": "var(--accent-active)",
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
        // Feature Module Identities mapped strictly to active theme tokens (Trash remains red exception)
        relay: { accent: "rgb(var(--accent-primary-rgb) / <alpha-value>)", glow: "var(--accent-glow)" },
        pulse: { accent: "rgb(var(--accent-primary-rgb) / <alpha-value>)", glow: "var(--accent-glow)" },
        beacon: { accent: "rgb(var(--accent-primary-rgb) / <alpha-value>)", glow: "var(--accent-glow)" },
        recycle: { accent: "#EF4444", glow: "#DC2626" },
        core: { accent: "rgb(var(--accent-primary-rgb) / <alpha-value>)", glow: "var(--accent-glow)" },
        linkdrive: { accent: "rgb(var(--accent-primary-rgb) / <alpha-value>)", glow: "var(--accent-glow)" },
        linkgit: { accent: "rgb(var(--accent-primary-rgb) / <alpha-value>)", glow: "var(--accent-glow)" },
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
