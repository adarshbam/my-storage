import { createContext, useContext, useEffect, useState } from "react";

export const THEME_PALETTES = [
  {
    id: "veo-onyx",
    name: "Veo Onyx",
    desc: "Default - charcoal & soft white",
    swatch: "#E2E8F0",
    colorHex: "#F8FAFC",
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    desc: "Clear & confident",
    swatch: "#3B82F6",
    colorHex: "#3B82F6",
  },
  {
    id: "midnight-azure",
    name: "Midnight Azure",
    desc: "Deep blue & luminous",
    swatch: "#6366F1",
    colorHex: "#6366F1",
  },
  {
    id: "graphite-studio",
    name: "Graphite Studio",
    desc: "Graphite & violet",
    swatch: "#8B5CF6",
    colorHex: "#8B5CF6",
  },
  {
    id: "copper-slate",
    name: "Copper Slate",
    desc: "Mineral gray & copper",
    swatch: "#D48858",
    colorHex: "#D97706",
  },
  {
    id: "ember-orange",
    name: "Ember Orange",
    desc: "Warm & focused",
    swatch: "#F97316",
    colorHex: "#F97316",
  },
  {
    id: "sunlit-yellow",
    name: "Sunlit Yellow",
    desc: "Bright & optimistic",
    swatch: "#EAB308",
    colorHex: "#EAB308",
  },
  {
    id: "grove-green",
    name: "Grove Green",
    desc: "Calm & grounded (Default)",
    swatch: "#10B981",
    colorHex: "#10B981",
  },
  {
    id: "studio-rose",
    name: "Studio Rose",
    desc: "Expressive & warm",
    swatch: "#FB7185",
    colorHex: "#FB7185",
  },
  {
    id: "signal-red",
    name: "Signal Red",
    desc: "Crisp & high-impact",
    swatch: "#EF4444",
    colorHex: "#EF4444",
  },
  {
    id: "barbie-pink",
    name: "Barbie Pink",
    desc: "Bright & playful",
    swatch: "#EC4899",
    colorHex: "#EC4899",
  },
];

const ThemeProviderContext = createContext({
  theme: "dark",
  setTheme: () => null,
  accent: "grove-green",
  setAccent: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  defaultAccent = "grove-green",
  storageKey = "vite-ui-theme",
  accentStorageKey = "vite-ui-accent",
  ...props
}) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(storageKey) || defaultTheme;
  });

  const [accent, setAccentState] = useState(() => {
    return localStorage.getItem(accentStorageKey) || defaultAccent;
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
