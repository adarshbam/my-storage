import { Shield, Zap, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { VaultLogo } from "../components/ui/VaultIcons";

const features = [
  { icon: Shield, text: "Privacy-first zero-knowledge architecture" },
  { icon: Zap, text: "Lightning-fast encrypted sync" },
  { icon: Lock, text: "Granular access control & permissions" },
];

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-vault-bg p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      {/* Ambient glows */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-15%] w-[50vw] h-[50vw] bg-accent-soft rounded-full blur-[140px] opacity-70" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[40vw] h-[40vw] bg-accent-glow rounded-full blur-[140px] opacity-30" />
      </div>

      {/* Frame */}
      <div className="w-full max-w-[1100px] min-h-[600px] bg-white/80 dark:bg-vault-surface/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl lg:rounded-[2.5rem] flex overflow-hidden relative z-10 transition-all duration-300">
        {/* Left Promo Panel */}
        <div className="hidden lg:flex lg:w-[46%] relative bg-slate-900 dark:bg-black/50 border-r border-slate-200 dark:border-white/10 overflow-hidden text-white">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,var(--accent-soft)_0%,transparent_70%)] pointer-events-none" />

          <div className="w-full p-10 xl:p-14 flex flex-col justify-between relative z-10 h-full">
            <div>
              <div className="flex items-center gap-3.5 mb-14">
                <div className="p-2.5 rounded-2xl bg-accent-soft border border-accent-border text-accent-primary shadow-sm">
                  <VaultLogo size={22} />
                </div>
                <span className="text-xl font-black tracking-widest uppercase">
                  VAULT
                </span>
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] mb-6"
              >
                Secure your <br />
                digital life with <br />
                <span className="text-accent-primary">total privacy.</span>
              </motion.h2>

              <p className="text-slate-400 text-sm leading-relaxed max-w-[320px]">
                Client-side zero-knowledge encrypted storage designed for developers and creators.
              </p>
            </div>

            <div>
              <div className="space-y-3.5 mb-8">
                {features.map(({ icon: Icon, text }, i) => (
                  <motion.div
                    key={text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-accent-primary">
                      <Icon size={16} />
                    </div>
                    <span className="text-slate-300 text-xs font-semibold">
                      {text}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-5">
                <p className="text-accent-primary/90 text-xs italic font-medium">
                  "Setting up an encrypted vault was effortless. The cleanest storage experience."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex-1 flex items-center justify-center relative p-8 sm:p-12">
          <div className="w-full max-w-[380px] relative z-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
