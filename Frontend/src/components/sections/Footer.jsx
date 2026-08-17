import { Github, Twitter, Linkedin } from "lucide-react";
import { VaultLogo } from "../ui/VaultIcons";

const Footer = () => {
  return (
    <footer className="bg-slate-50 dark:bg-[#020705] border-t border-slate-200 dark:border-white/5 pt-20 pb-12 relative z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1300px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-accent-soft border border-accent-border text-accent-primary shadow-sm">
                <VaultLogo size={20} />
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase">
                VAULT
              </span>
            </div>
            <p className="text-slate-500 dark:text-white/50 text-xs leading-relaxed mb-6 font-medium">
              Secure, intelligent cloud infrastructure with client-side zero-knowledge encryption.
            </p>
            <div className="flex gap-3">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-accent-primary hover:border-accent-border transition-colors shadow-sm"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-5 tracking-wider text-xs uppercase">
              Product
            </h4>
            <ul className="space-y-3 text-xs font-medium">
              {["Features", "Security", "Pricing", "Ecosystem", "Architecture"].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase()}`}
                    className="text-slate-500 dark:text-white/50 hover:text-accent-primary dark:hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-5 tracking-wider text-xs uppercase">
              Resources
            </h4>
            <ul className="space-y-3 text-xs font-medium">
              {["Documentation", "API Reference", "System Status", "Security Whitepaper"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-slate-500 dark:text-white/50 hover:text-accent-primary dark:hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-5 tracking-wider text-xs uppercase">
              Legal
            </h4>
            <ul className="space-y-3 text-xs font-medium">
              {["Privacy Policy", "Terms of Service", "Zero-Knowledge Audit", "GDPR Compliance"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-slate-500 dark:text-white/50 hover:text-accent-primary dark:hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 dark:text-white/40 text-xs font-medium">
            © {new Date().getFullYear()} VAULT Storage Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-accent-primary text-[11px] font-bold uppercase tracking-wider border border-slate-200 dark:border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
            <span>Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
