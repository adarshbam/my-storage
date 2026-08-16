import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeProviderContext = createContext({
  theme: "dark",
  setTheme: () => null,
  accent: "ember",
  setAccent: () => null,
});

export const accentOptions = [
  {
    id: "ember",
    name: "Ember Signal",
    description: "Orange-red, inspired by Media Engine",
  },
  { id: "grove", name: "Grove Green", description: "Calm and grounded" },
  { id: "ocean", name: "Ocean Blue", description: "Clear and confident" },
  { id: "iris", name: "Iris Violet", description: "Creative and focused" },
];

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "vite-ui-theme",
  ...props
}) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(storageKey) || defaultTheme;
  });
  const [accent, setAccentState] = useState(() => {
    return localStorage.getItem("vault-accent") || "ember";
  });

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    window.document.documentElement.dataset.accent = accent;
  }, [accent]);

  const value = useMemo(() => ({
    theme,
    setTheme: (theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    accent,
    setAccent: (nextAccent) => {
      localStorage.setItem("vault-accent", nextAccent);
      setAccentState(nextAccent);
    },
    accentOptions,
  }), [accent, storageKey, theme]);

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
