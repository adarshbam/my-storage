import { Cloud, Github, Twitter, Linkedin } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Cloud className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
                Storifyy
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
              Secure, intelligent cloud storage built for the modern web. Store,
              share, and collaborate with ease.
            </p>
            <div className="flex gap-4">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <motion.a
                  key={i}
                  whileHover={{ y: -3 }}
                  href="#"
                  className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-500 hover:border-blue-500 transition-colors"
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
                    className="text-slate-600 dark:text-slate-400 text-sm hover:text-blue-500 transition-colors"
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
                    className="text-slate-600 dark:text-slate-400 text-sm hover:text-blue-500 transition-colors"
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
                    className="text-slate-600 dark:text-slate-400 text-sm hover:text-blue-500 transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
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
