import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const Button = ({ children, variant = "primary", className, ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2";

  const variants = {
    /* Main gradient CTA */
    primary:
      "bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white shadow-[0_0_20px_rgba(20,184,166,0.35)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:scale-[1.03] active:scale-[0.98] border border-white/15 tracking-wide",

    /* Pill-shaped glass secondary */
    secondary:
      "glass-panel text-slate-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]",

    /* Minimal ghost */
    ghost:
      "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10",

    /* Outlined glass */
    outline:
      "glass-panel hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white",

    /* ── Dashboard / nav CTA  ─────────────────────────────
       Clean pill with teal ring – professional & legible   */
    dashboard:
      "rounded-full bg-[#14b8a6] hover:bg-[#0d9488] text-white text-sm font-semibold tracking-wide shadow-[0_2px_12px_rgba(20,184,166,0.35)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.5)] hover:-translate-y-0.5 active:translate-y-0 px-5 py-2.5",

    /* Glass pill for hero */
    glass:
      "bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl border border-white/90 dark:border-white/[0.10] shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:bg-white dark:hover:bg-white/[0.10] hover:scale-[1.02] text-slate-700 dark:text-white",

    /* Legacy alias kept for any existing usages */
    masterclass:
      "rounded-full bg-[#14b8a6] hover:bg-[#0d9488] text-white text-sm font-semibold tracking-wide shadow-[0_2px_12px_rgba(20,184,166,0.35)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.5)] hover:-translate-y-0.5 active:translate-y-0 px-5 py-2.5",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
