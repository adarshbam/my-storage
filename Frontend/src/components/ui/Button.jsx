import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const Button = ({ children, variant = "primary", className, ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variants = {
    /* Primary Accent CTA — Glowing Emerald/Teal Gradient */
    primary:
      "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 border border-emerald-400/30 tracking-wide active:scale-[0.98]",

    /* Secondary Neutral — Dark Translucent Glass */
    secondary:
      "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 active:scale-[0.98]",

    /* Warning / Attention Action — Amber */
    warning:
      "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 active:scale-[0.98]",

    /* Destructive / Danger Action — Red / Rose */
    destructive:
      "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 active:scale-[0.98]",

    /* Danger alias */
    danger:
      "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 active:scale-[0.98]",

    /* Purple / Owner Accent Action */
    purple:
      "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:border-purple-500/50 active:scale-[0.98]",

    /* Minimal Ghost */
    ghost:
      "text-white/60 hover:text-white hover:bg-white/5",

    /* Outlined Glass */
    outline:
      "bg-transparent hover:bg-white/5 text-white/80 hover:text-white border border-white/15",

    /* Dashboard Pill CTA */
    dashboard:
      "rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-white text-xs font-bold tracking-wide shadow-lg shadow-teal-500/20 px-5 py-2",

    /* Glass pill */
    glass:
      "bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 text-white active:scale-[0.98]",

    masterclass:
      "rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-teal-500/20 px-5 py-2",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant] || variants.primary, className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;

