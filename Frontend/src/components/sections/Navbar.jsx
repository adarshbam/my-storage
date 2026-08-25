import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Lock, Sun, Moon, Palette } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { VaultLogo } from "../ui/VaultIcons";
import { useTheme } from "../ui/ThemeProvider";

const Navbar = () => {
  const { user } = useAuth();
  const { theme, setTheme, accent, setAccent, palettes } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Security", href: "#security" },
    { name: "Ecosystem", href: "#ecosystem" },
    { name: "Pricing", href: "#pricing" },
  ];

  const toggleThemeMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="fixed top-0 w-full z-50 flex justify-center pt-3 sm:pt-4 px-2 sm:px-4 pointer-events-none">
      <nav
        className={`pointer-events-auto transition-all duration-300 w-full max-w-[1200px] rounded-2xl md:rounded-full ${
          scrolled
            ? "bg-white/80 dark:bg-vault-surface/85 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            : "bg-white/40 dark:bg-vault-surface/40 backdrop-blur-md border border-black/[0.04] dark:border-white/[0.05]"
        }`}
      >
        <div className="px-4 sm:px-5 md:px-7 py-3 flex items-center justify-between min-w-0">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="p-2 rounded-xl bg-accent-soft border border-accent-border text-accent-primary group-hover:scale-105 transition-transform duration-200 shadow-sm">
              <VaultLogo size={20} />
            </div>
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase">
              VAULT
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-8 px-5 xl:px-6 py-2 rounded-full bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] shrink-0">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-xs font-bold tracking-wider uppercase text-slate-600 dark:text-white/60 hover:text-accent-primary dark:hover:text-white transition-colors duration-150"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Actions & Theme Toggles */}
          <div className="hidden lg:flex items-center gap-2.5 xl:gap-3 shrink-0">
            {/* Theme Mode Toggle */}
            <button
              onClick={toggleThemeMode}
              className="p-2 rounded-xl text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all shrink-0"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Accent Color Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="p-2 rounded-xl text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all flex items-center gap-1.5"
                title="Change Color Theme"
              >
                <Palette size={17} className="text-accent-primary" />
              </button>

              <AnimatePresence>
                {themeDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setThemeDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 p-2 rounded-2xl bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 py-1 mb-1">
                        Select Accent Theme
                      </div>
                      {palettes.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setAccent(p.id);
                            setThemeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            accent === p.id
                              ? "bg-accent-soft text-accent-primary font-bold"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/20"
                              style={{ backgroundColor: p.swatch }}
                            />
                            <span>{p.name}</span>
                          </div>
                          {accent === p.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {user ? (
              <Link to="/dashboard" className="shrink-0">
                <button className="px-4 xl:px-5 py-2.5 rounded-full text-xs font-bold tracking-wide bg-accent-primary hover:opacity-90 text-accent-foreground shadow-md shadow-accent-glow/20 transition-all duration-200 flex items-center gap-2 shrink-0 whitespace-nowrap">
                  <Lock size={14} /> Dashboard
                </button>
              </Link>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/login"
                  className="text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white px-3 py-2 transition-colors whitespace-nowrap"
                >
                  Log in
                </Link>
                <Link to="/register" className="shrink-0">
                  <button className="px-4 xl:px-5 py-2.5 rounded-full text-xs font-bold tracking-wide bg-accent-primary hover:opacity-90 text-accent-foreground shadow-md shadow-accent-glow/20 transition-all duration-200 whitespace-nowrap">
                    Get Started
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="lg:hidden flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={toggleThemeMode}
              className="p-2 rounded-xl text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-slate-100 dark:border-white/10 px-5 py-5 max-h-[calc(100dvh-5rem)] overflow-y-auto custom-scrollbar"
            >
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-bold text-slate-800 dark:text-white/90 py-2 border-b border-slate-100 dark:border-white/5"
                  >
                    {link.name}
                  </a>
                ))}

                <div className="pt-3 flex flex-col gap-2.5">
                  {user ? (
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <button className="w-full py-3 rounded-xl font-bold bg-accent-primary text-accent-foreground text-sm shadow-md">
                        Open Dashboard
                      </button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        <button className="w-full py-3 rounded-xl font-bold bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-sm">
                          Log in
                        </button>
                      </Link>
                      <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                        <button className="w-full py-3 rounded-xl font-bold bg-accent-primary text-accent-foreground text-sm shadow-md">
                          Get Started
                        </button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
};

export default Navbar;
