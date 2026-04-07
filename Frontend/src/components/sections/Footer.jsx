import { Cloud, Github, Twitter, Linkedin } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="bg-transparent border-t border-slate-200 dark:border-white/10 pt-24 pb-12 relative z-10">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
              <div className="bg-gradient-to-br from-[#14b8a6] to-[#0f463e] p-2 rounded-xl shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                <Cloud className="text-white fill-white/20" size={20} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#14b8a6] to-[#3b82f6]">
                Storifyy
              </span>
            </div>
            <p className="text-slate-500 dark:text-white/70 text-sm leading-relaxed mb-6 font-medium">
              Secure, intelligent cloud storage built for the modern web. Store,
              share, and collaborate with ease.
            </p>
            <div className="flex gap-4">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <motion.a
                  key={i}
                  whileHover={{ y: -3 }}
                  href="#"
                  className="w-10 h-10 rounded-full bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-black/5 dark:border-white/[0.08] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#14b8a6] hover:border-[#14b8a6]/40 hover:shadow-[0_0_15px_rgba(20,184,166,0.15)] transition-all duration-300 shadow-sm"
                >
                  <Icon size={18} />
                </motion.a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-6">
              Product
            </h4>
            <ul className="space-y-3">
              {[
                "Pricing",
                "Personal",
                "Business",
                "Enterprise",
                "Security",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-slate-500 dark:text-white/50 text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-6">
              Resources
            </h4>
            <ul className="space-y-3">
              {[
                "Documentation",
                "API Reference",
                "Community",
                "Help Center",
                "Status",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-slate-500 dark:text-white/50 text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-6">
              Legal
            </h4>
            <ul className="space-y-3">
              {[
                "Privacy Policy",
                "Terms of Service",
                "Cookie Policy",
                "Acceptable Use",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-slate-500 dark:text-white/50 text-sm hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 dark:text-white/50 text-sm">
            © 2024 Storifyy Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
