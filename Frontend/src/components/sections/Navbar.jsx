import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Cloud, Lock, Box } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Navbar = () => {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = ["Features", "Security", "Ecosystem", "Pricing"];

  return (
    <div className="fixed top-0 w-full z-50 flex justify-center pt-4 px-4 pointer-events-none">
        <nav
        className={`pointer-events-auto transition-all duration-500 ease-out w-full max-w-[1200px] rounded-full overflow-hidden ${
            scrolled
            ? "bg-[#011f18]/80 backdrop-blur-2xl border-t border-white/20 border-b border-black/50 border-x border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-4px_8px_rgba(0,0,0,0.6),0_20px_40px_rgba(0,0,0,0.6)]"
            : "bg-transparent border border-transparent shadow-none"
        }`}
        >
        <div className={`px-6 py-3 flex items-center justify-between transition-all duration-500 ${scrolled ? 'py-3' : 'py-5'}`}>
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-[#01140f] border border-teal-500/30 p-2 rounded-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.8),0_0_15px_rgba(20,184,166,0.3)] group-hover:border-teal-400 group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.8),0_0_25px_rgba(20,184,166,0.6)] transition-all duration-300 relative">
                <Box className="text-[#14b8a6] relative z-10" size={20} />
            </div>
            <span className="text-2xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                VAULT
            </span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8 bg-black/20 border-t border-black/40 border-b border-white/10 px-8 py-2 rounded-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
            {navLinks.map((link) => (
                <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-[13px] font-bold tracking-widest uppercase text-white/50 hover:text-white transition-colors duration-200"
                >
                {link}
                </a>
            ))}
            </div>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-4">
            {user ? (
                <Link to="/dashboard">
                <button className="px-6 py-2.5 rounded-full text-sm font-bold tracking-wide bg-gradient-to-b from-[#14b8a6] to-[#0f766e] text-white border-t border-teal-300/50 border-b border-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_20px_rgba(20,184,166,0.4)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_15px_30px_rgba(20,184,166,0.6)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 flex items-center gap-2">
                    <Lock size={16} /> Dashboard
                </button>
                </Link>
            ) : (
                <>
                <Link to="/login" className="text-sm font-bold tracking-widest uppercase text-white/60 hover:text-white transition-colors px-4">
                    Log in
                </Link>
                <Link to="/register">
                    <button className="px-6 py-2.5 rounded-full text-sm font-bold tracking-wide bg-gradient-to-b from-white to-gray-200 text-[#01140f] border-t border-white border-b border-gray-400 shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_10px_20px_rgba(255,255,255,0.1)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_15px_30px_rgba(255,255,255,0.2)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5">
                    Get Started
                    </button>
                </Link>
                </>
            )}
            </div>

            {/* Mobile Toggle */}
            <div className="md:hidden flex items-center">
            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-full bg-black/20 border-t border-black/40 border-b border-white/10 text-white transition-colors shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
            >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
            {mobileMenuOpen && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-[#01140f] border-t border-white/[0.08] overflow-hidden"
            >
                <div className="px-6 py-6 flex flex-col gap-6">
                {navLinks.map((link) => (
                    <a
                    key={link}
                    href={`#${link.toLowerCase()}`}
                    className="text-lg font-black text-white py-2 border-b border-white/5"
                    onClick={() => setMobileMenuOpen(false)}
                    >
                    {link}
                    </a>
                ))}
                <div className="pt-4 flex flex-col gap-4">
                    {user ? (
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <button className="w-full py-4 rounded-2xl font-bold bg-[#14b8a6] text-[#01140f]">
                        Dashboard
                        </button>
                    </Link>
                    ) : (
                    <>
                        <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        <button className="w-full py-4 rounded-2xl font-bold bg-black/20 text-white border border-white/10">
                            Log in
                        </button>
                        </Link>
                        <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                        <button className="w-full py-4 rounded-2xl font-bold bg-white text-[#01140f]">
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
