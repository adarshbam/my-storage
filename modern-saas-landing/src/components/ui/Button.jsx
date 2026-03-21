import { motion } from "framer-motion";
import { cn } from "../../lib/utils"; // Corrected import path

const Button = ({ children, variant = "primary", className, ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary:
      "bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:scale-[1.04] active:scale-[0.98] border border-white/20 transition-all duration-300",
    secondary:
      "glass-panel text-slate-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300",
    ghost:
      "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300",
    outline:
      "glass-panel hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-all duration-300",
    masterclass:
      "bg-[#0f463e]/90 backdrop-blur-3xl border-2 border-[#14b8a6] shadow-[0_0_20px_rgba(20,184,166,0.3)] text-white text-[15px] font-bold tracking-wide hover:bg-[#115e52] hover:border-[#2dd4bf] hover:shadow-[0_0_30px_rgba(20,184,166,0.5),inset_0_0_15px_rgba(231,111,81,0.2)] transition-all duration-300 hover:-translate-y-1 rounded-xl",
    glass:
      "glass-card hover:bg-black/[0.04] dark:hover:bg-white/[0.08] hover:scale-[1.02] transition-all duration-300 text-slate-700 dark:text-white",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
