import { Cloud, Shield, Zap, Lock, Box } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Shield, text: "Privacy-first architecture" },
  { icon: Zap, text: "Lightning-fast uploads" },
  { icon: Lock, text: "Zero-knowledge encryption" },
];

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#f0f9f7] dark:bg-[#020b08] p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      {/* Global gradient blurs */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-15%] w-[50vw] h-[50vw] bg-[#14b8a6]/15 dark:bg-[#14b8a6]/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-15%] w-[40vw] h-[40vw] bg-[#3b82f6]/15 dark:bg-[#3b82f6]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[30%] w-[45vw] h-[45vw] bg-[#a855f7]/10 dark:bg-[#a855f7]/8 rounded-full blur-[120px]" />
      </div>

      {/* Unified Frame */}
      <div className="w-full max-w-[1100px] min-h-[600px] bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl border border-black/10 dark:border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)] rounded-[28px] lg:rounded-[32px] flex overflow-hidden relative z-10 transition-all duration-300">
        {/* ── Left Promo Panel ── */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative bg-gradient-to-br from-[#0f463e]/95 to-[#022c22]/95 border-r border-black/10 dark:border-white/[0.08] overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-[#14b8a6]/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] bg-[#3b82f6]/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="w-full p-10 xl:p-14 flex flex-col justify-between relative z-10 h-full">
            {/* Top — Logo and 3D Cube */}
            <div>
              <div className="flex items-center gap-4 mb-16">
                <div className="bg-[#01140f] border border-teal-500/30 p-2.5 rounded-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.8),0_0_15px_rgba(20,184,166,0.3)] transition-all duration-300 relative hover:border-teal-400 hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.8),0_0_25px_rgba(20,184,166,0.6)]">
                  <Box className="text-[#14b8a6] relative z-10" size={24} />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
                  Vault
                </span>
              </div>

              {/* Headline */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15] mb-6"
              >
                Start Your
                <br />
                Journey with
                <br />
                <span className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] bg-clip-text text-transparent">
                  Cloud Freedom.
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="text-white/60 text-base leading-relaxed max-w-[320px]"
              >
                Join thousands of users who trust Vault for their most
                important data.
              </motion.p>
            </div>

            {/* Bottom — Features + Testimonial */}
            <div>
              {/* Features */}
              <div className="space-y-3.5 mb-10">
                {features.map(({ icon: Icon, text }, i) => (
                  <motion.div
                    key={text}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#14b8a6]/15 border border-[#14b8a6]/20 flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-[#2dd4bf]" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">
                      {text}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Testimonial */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="border-t border-white/[0.08] pt-6"
              >
                <p className="text-[#2dd4bf]/70 text-sm italic leading-relaxed">
                  "Setting up an account was seamless. The best storage solution
                  I've used."
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="flex-1 flex items-center justify-center relative p-8 sm:p-12">
          {/* Glow aura behind form */}
          <div className="absolute w-[350px] h-[350px] bg-[#14b8a6]/8 dark:bg-[#14b8a6]/12 rounded-full blur-[100px] pointer-events-none" />

          <div className="w-full max-w-[400px] relative z-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
