import { Box, Github, Twitter, Linkedin } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="bg-[#011a14] border-t border-[#14b8a6]/20 pt-24 pb-12 relative z-10 overflow-hidden shadow-[inset_0_20px_40px_rgba(0,0,0,0.5)]">
      {/* Ambient glows */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#14b8a6]/30 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#14b8a6]/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 max-w-[1400px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-[#01140f] border border-teal-500/30 p-2 rounded-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.8),0_0_15px_rgba(20,184,166,0.3)] relative">
                <Box className="text-[#14b8a6]" size={24} />
              </div>
              <span className="text-2xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                VAULT
              </span>
            </div>
            <p className="text-teal-100/40 text-sm leading-relaxed mb-8 font-medium">
              Secure, intelligent cloud storage built for the modern web. Store,
              share, and collaborate with military-grade encryption.
            </p>
            <div className="flex gap-4">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <motion.a
                  key={i}
                  whileHover={{ y: -3 }}
                  href="#"
                  className="w-10 h-10 rounded-full bg-[#01140f] border-t border-teal-500/20 border-b border-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_5px_10px_rgba(0,0,0,0.3)] flex items-center justify-center text-teal-100/40 hover:text-[#14b8a6] hover:border-teal-500/40 transition-all duration-300"
                >
                  <Icon size={18} />
                </motion.a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-8 tracking-widest text-sm uppercase drop-shadow-md">
              Product
            </h4>
            <ul className="space-y-4">
              {[
                "Pricing",
                "Personal Vault",
                "Business",
                "Enterprise",
                "Architecture",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-teal-100/40 text-sm hover:text-white transition-colors font-medium"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-8 tracking-widest text-sm uppercase drop-shadow-md">
              Resources
            </h4>
            <ul className="space-y-4">
              {[
                "Documentation",
                "API Reference",
                "Community",
                "Help Center",
                "System Status",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-teal-100/40 text-sm hover:text-white transition-colors font-medium"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-8 tracking-widest text-sm uppercase drop-shadow-md">
              Legal
            </h4>
            <ul className="space-y-4">
              {[
                "Privacy Policy",
                "Terms of Service",
                "Cookie Policy",
                "Zero-Knowledge Audit",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-teal-100/40 text-sm hover:text-white transition-colors font-medium"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#14b8a6]/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-teal-100/30 text-sm font-medium">
            © 2026 VAULT Storage Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#01140f] text-[#14b8a6] text-xs font-bold uppercase tracking-widest border-t border-teal-500/20 border-b border-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <div className="w-2 h-2 rounded-full bg-[#14b8a6] animate-pulse shadow-[0_0_10px_#14b8a6]" />
            Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
