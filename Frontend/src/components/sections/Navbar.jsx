import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { VaultLogo } from "../ui/VaultIcons";

const navigation = [
  ["Features", "features"],
  ["Security", "security"],
  ["Ecosystem", "ecosystem"],
  ["Pricing", "pricing"],
];

export default function Navbar() {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="vault-nav-wrap">
      <nav className={`vault-nav ${isScrolled ? "is-scrolled" : ""}`} aria-label="Main navigation">
        <Link to="/" className="vault-brand" onClick={closeMenu}>
          <span className="vault-brand-mark"><VaultLogo size={23} /></span>
          <span>Vault</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1 vault-nav-links">
          {navigation.map(([label, id]) => (
            <a key={id} href={`#${id}`} className="vault-nav-link">{label}</a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link to={user ? "/dashboard" : "/login"} className="vault-nav-login">
            {user ? "Open dashboard" : "Log in"}
          </Link>
          <Link to={user ? "/dashboard" : "/register"} className="vault-nav-cta">
            {user ? "My vault" : "Get started"}<ArrowRight size={15} />
          </Link>
        </div>

        <button
          type="button"
          className="vault-nav-mobile-toggle lg:hidden"
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {isMenuOpen && (
        <div className="vault-nav-mobile-menu lg:hidden">
          {navigation.map(([label, id]) => (
            <a key={id} href={`#${id}`} className="vault-nav-mobile-link" onClick={closeMenu}>{label}</a>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-3 mt-2 border-t border-[var(--vault-border)]">
            <Link to={user ? "/dashboard" : "/login"} className="vault-button-secondary py-3 text-sm" onClick={closeMenu}>
              {user ? "Dashboard" : "Log in"}
            </Link>
            <Link to={user ? "/dashboard" : "/register"} className="vault-button py-3 text-sm" onClick={closeMenu}>
              {user ? "My vault" : "Start free"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
