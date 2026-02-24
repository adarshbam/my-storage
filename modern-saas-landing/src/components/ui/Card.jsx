import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const Card = ({ children, className, variant = "default", ...props }) => {
  const variants = {
    default:
      "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10",
    blue: "bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900/50 border-blue-100 dark:border-blue-800 hover:shadow-blue-500/20",
    purple:
      "bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900/50 border-purple-100 dark:border-purple-800 hover:shadow-purple-500/20",
    orange:
      "bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-900/50 border-orange-100 dark:border-orange-800 hover:shadow-orange-500/20",
    green:
      "bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-slate-900/50 border-green-100 dark:border-green-800 hover:shadow-green-500/20",
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
