import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const Button = ({ children, variant = "primary", className, disabled, ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer";

  const variants = {
    /* Primary Action — Clean Solid Accent Fill */
    primary:
      "bg-accent-primary hover:opacity-90 text-accent-foreground shadow-sm hover:shadow transition-all active:scale-[0.98]",

    /* Secondary Neutral — Clean High-Contrast Surface */
    secondary:
      "bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm transition-all active:scale-[0.98]",

    /* Minimal Surface */
    minimal:
      "bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all active:scale-[0.98]",

    /* Minimal Ghost */
    ghost:
      "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all",

    /* Outlined Minimal */
    outline:
      "bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/15 transition-all active:scale-[0.98]",

    /* Success / Positive (Principal Green) */
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition-all active:scale-[0.98]",

    /* Warning / Attention (Principal Yellow) */
    warning:
      "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm transition-all active:scale-[0.98]",

    /* Destructive / Danger (Principal Red) */
    destructive:
      "bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-sm transition-all active:scale-[0.98]",

    danger:
      "bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-sm transition-all active:scale-[0.98]",

    /* Accent Pill */
    dashboard:
      "rounded-full bg-accent-primary hover:opacity-90 text-accent-foreground text-xs font-bold tracking-wide shadow-sm px-5 py-2 transition-all active:scale-[0.98]",
  };

  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.98 }}
      disabled={disabled}
      className={cn(baseStyles, variants[variant] || variants.primary, className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
