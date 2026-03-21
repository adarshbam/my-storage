import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const Card = ({ children, className, variant = "default", ...props }) => {
  const variants = {
    default:
      "glass-card",
    brand: 
      "bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-brand-950/40 border border-brand-200 dark:border-brand-800/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
    accent:
      "bg-gradient-to-br from-accent-50 to-white dark:from-accent-900/10 dark:to-brand-950/40 border border-accent-200 dark:border-accent-800/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]",
    dark:
      "bg-[#0D1520] dark:bg-[#080c13] border border-brand-500/10 hover:border-brand-500/30 transition-colors shadow-2xl",
  };

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        "relative backdrop-blur-sm border rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden group",
        variants[variant] || variants.default,
        className,
      )}
      {...props}
    >
      {/* Internal Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-current/5 to-transparent rounded-full blur-xl -ml-12 -mb-12 pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col">{children}</div>
    </motion.div>
  );
};

export default Card;
