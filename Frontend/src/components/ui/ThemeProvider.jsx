import { createContext, useContext, useEffect, useState } from "react";

export const THEME_PALETTES = [
  {
    id: "coral-ember",
    name: "Coral Ember",
    desc: "Signature pink-coral Media Engine accent (Default)",
    swatch: "#F43F5E",
    colorHex: "#F43F5E",
  },
  {
    id: "grove-green",
    name: "Emerald Green",
    desc: "Vivid cryptographic vault emerald",
    swatch: "#10B981",
    colorHex: "#10B981",
  },
  {
    id: "electric-cyan",
    name: "Electric Cyan",
    desc: "Bright cyber teal & electric cyan",
    swatch: "#22D3EE",
    colorHex: "#22D3EE",
  },
  {
    id: "ocean-blue",
    name: "Cobalt Blue",
    desc: "Clean electric signature cobalt",
    swatch: "#3B82F6",
    colorHex: "#3B82F6",
  },
  {
    id: "midnight-azure",
    name: "Deep Indigo",
    desc: "Midnight ultramarine & deep electric indigo",
    swatch: "#6366F1",
    colorHex: "#6366F1",
  },
  {
    id: "graphite-studio",
    name: "Royal Amethyst",
    desc: "Imperial violet & royal amethyst",
    swatch: "#8B5CF6",
    colorHex: "#8B5CF6",
  },
  {
    id: "barbie-pink",
    name: "Barbie Pink",
    desc: "Vibrant saturated hot pink & fuchsia",
    swatch: "#EC4899",
    colorHex: "#EC4899",
  },
  {
    id: "sunset-orange",
    name: "Sunset Orange",
    desc: "Warm radiant ember & glowing amber",
    swatch: "#F97316",
    colorHex: "#F97316",
  },
];

const ThemeProviderContext = createContext({
  theme: "dark",
  setTheme: () => null,
  accent: "coral-ember",
  setAccent: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  defaultAccent = "coral-ember",
  storageKey = "vite-ui-theme",
  accentStorageKey = "vite-ui-accent-v2",
  ...props
}) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(storageKey) || defaultTheme;
  });

  const [accent, setAccentState] = useState(() => {
    let stored = localStorage.getItem(accentStorageKey);
    if (!stored) {
      const legacy = localStorage.getItem("vite-ui-accent");
      if (legacy && legacy !== "grove-green" && THEME_PALETTES.some((p) => p.id === legacy)) {
        stored = legacy;
        try {
          localStorage.setItem(accentStorageKey, stored);
        } catch (_) {}
      }
    }
    if (stored === "signal-red" || stored === "ember-orange") return "sunset-orange";
    if (stored && THEME_PALETTES.some((p) => p.id === stored)) return stored;
    return defaultAccent;
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Handle Light/Dark class
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const applySystemTheme = () => {
        root.classList.remove("light", "dark");
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      };
      applySystemTheme();
      mediaQuery.addEventListener("change", applySystemTheme);
      return () => mediaQuery.removeEventListener("change", applySystemTheme);
    } else {
      root.classList.add(theme);
    }

    // Handle Accent attribute
    root.setAttribute("data-accent", accent);
  }, [theme, accent]);

  const setTheme = (newTheme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  const setAccent = (newAccent) => {
    localStorage.setItem(accentStorageKey, newAccent);
    setAccentState(newAccent);
  };

  const value = {
    theme,
    setTheme,
    accent,
    setAccent,
    palettes: THEME_PALETTES,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
