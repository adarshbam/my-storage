import { motion } from "framer-motion";
import { cn } from "../../lib/utils"; // Corrected import path

const Button = ({ children, variant = "primary", className, ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]",
    secondary:
      "bg-transparent border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400",
    ghost:
      "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800",
    outline:
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
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
