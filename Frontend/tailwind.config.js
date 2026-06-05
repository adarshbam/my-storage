/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        vault: {
          black: "#030706",
          bg: "#050A08",
          surface: "#07110E",
          panel: "#091613",
          emerald: "#00A884",
          "emerald-soft": "#1A9B82",
          "emerald-dark": "#0B6B56",
        },
        // ── Feature Module Identity Colors ──
        relay: { accent: "#7E86FF", glow: "#5F66FF" }, // Secure Relay → Purple
        pulse: { accent: "#00CFFF", glow: "#00A8CC" }, // Activity Pulse → Cyan
        beacon: { accent: "#FFD166", glow: "#E6B84D" }, // Priority Beacon → Gold
        recycle: { accent: "#FF5A7A", glow: "#E6364F" }, // Recycle Vault → Crimson
        core: { accent: "#4DA6FF", glow: "#3D8BE6" }, // System Core → Electric Blue
        linkdrive: { accent: "#FF7A3D", glow: "#E66A2E" }, // Link Drive → Orange
        linkgit: { accent: "#7E86FF", glow: "#5F66FF" }, // Link GitHub → Purple
        // ── Legacy aliases (backward compat) ──
        team: { accent: "#7E86FF" },
        document: { accent: "#00CFFF" },
        creative: { accent: "#7E86FF" },
        media: { accent: "#FF7A3D" },
        analytics: { accent: "#FFD166" },
        danger: { accent: "#FF5A7A" },
        brand: {
          50: "#eafaf1",
          100: "#cbf5df",
          200: "#96ebd7",
          300: "#54dbb8",
          400: "#14b8a6", // Vibrant glowing teal/emerald hybrid
          500: "#0f967e", // Rich dark-glow green
          600: "#0b7c69",
          700: "#086253",
          800: "#05493e",
          900: "#033129",
          950: "#011a16", // Deep obsidian dark-green base
        },
        accent: {
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899", // Pink 500 for light mode
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
          950: "#500724",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "pulse-glow": "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-x": "gradientX 3s ease infinite",
        float: "float 6s ease-in-out infinite",
        "slide-in-right":
          "slideInRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "scan-line": "scanLine 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
        gradientX: {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: 0 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        scanLine: {
          "0%": { top: "-5%", opacity: 0 },
          "10%": { opacity: 1 },
          "90%": { opacity: 1 },
          "100%": { top: "105%", opacity: 0 },
        },
      },
    },
  },
  plugins: [],
};
