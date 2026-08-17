import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const Button = ({ children, variant = "primary", className, disabled, ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer";

  const variants = {
    /* Primary Action — Active Theme Accent */
    primary:
      "bg-accent-primary hover:opacity-90 text-accent-foreground shadow-md shadow-accent-glow/20 border border-white/10 active:scale-[0.98]",

    /* Secondary Neutral — Clean Glass Surface */
    secondary:
      "bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-800 dark:text-white/90 border border-slate-200 dark:border-white/10 active:scale-[0.98]",

    /* Minimal Ghost */
    ghost:
      "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08]",

    /* Outlined Glass */
    outline:
      "bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-800 dark:text-white/90 border border-slate-300 dark:border-white/15",

    /* Destructive / Danger */
    destructive:
      "bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 active:scale-[0.98]",

    danger:
      "bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 active:scale-[0.98]",

    /* Warning */
    warning:
      "bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 active:scale-[0.98]",

    /* Accent Pill */
    dashboard:
      "rounded-full bg-accent-primary hover:opacity-90 text-accent-foreground text-xs font-bold tracking-wide shadow-md shadow-accent-glow/20 px-5 py-2",
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
