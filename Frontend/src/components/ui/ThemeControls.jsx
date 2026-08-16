import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun, X } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeControls() {
  const { theme, setTheme, accent, setAccent, accentOptions } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <aside className="vault-theme-control" ref={panelRef} aria-label="Display preferences">
      {isOpen && (
        <div className="vault-theme-popover" role="dialog" aria-label="Theme preferences">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="vault-eyebrow">Display</p>
              <h2 className="vault-theme-title">Make Vault yours</h2>
            </div>
            <button
              type="button"
              className="vault-icon-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close theme preferences"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-5">
            <p className="vault-control-label">Appearance</p>
            <div className="vault-segmented-control">
              <button
                type="button"
                className={theme === "light" ? "is-selected" : ""}
                onClick={() => setTheme("light")}
              >
                <Sun size={15} /> Light
              </button>
              <button
                type="button"
                className={theme === "dark" ? "is-selected" : ""}
                onClick={() => setTheme("dark")}
              >
                <Moon size={15} /> Dark
              </button>
            </div>
          </div>

          <div>
            <p className="vault-control-label">Accent color</p>
            <div className="space-y-1.5">
              {accentOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setAccent(option.id)}
                  className={`vault-palette-option ${accent === option.id ? "is-selected" : ""}`}
                >
                  <span className={`vault-palette-swatch vault-palette-${option.id}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block font-semibold text-sm">{option.name}</span>
                    <span className="block text-xs vault-muted truncate">{option.description}</span>
                  </span>
                  {accent === option.id && <Check size={16} aria-label="Selected" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="vault-theme-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label="Open theme preferences"
      >
        <Palette size={18} />
        <span className="hidden sm:inline">Theme</span>
      </button>
    </aside>
  );
}
