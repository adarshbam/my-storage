import { motion } from "framer-motion";
import { cn } from "../../lib/utils"; // Corrected import path

const Button = ({ children, variant = "primary", className, ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary:
      "bg-gradient-to-r from-brand-600 to-brand-400 dark:from-brand-500 dark:to-brand-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] hover:scale-[1.02] active:scale-[0.98] border border-white/20",
    secondary:
      "bg-white/10 dark:bg-brand-950/40 backdrop-blur-md border border-brand-200 dark:border-brand-800 text-slate-800 dark:text-brand-100 hover:bg-white/30 dark:hover:bg-brand-900/60 transition-all",
    ghost:
      "text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/30",
    outline:
      "border border-slate-200 dark:border-brand-800 bg-transparent hover:bg-brand-50 dark:hover:bg-brand-900/20 text-slate-800 dark:text-brand-100",
    masterclass:
      "bg-[#0f463e]/90 backdrop-blur-3xl border-2 border-[#14b8a6] shadow-[0_0_20px_rgba(20,184,166,0.3)] text-white text-[15px] font-bold uppercase tracking-[0.1em] hover:bg-[#115e52] hover:border-[#2dd4bf] hover:shadow-[0_0_30px_rgba(20,184,166,0.5),inset_0_0_15px_rgba(231,111,81,0.2)] transition-all duration-300 hover:-translate-y-1 rounded-xl",
    glass:
      "bg-white/20 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/10 text-slate-800 dark:text-brand-50 hover:bg-white/30 dark:hover:bg-white/10 shadow-lg",
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
