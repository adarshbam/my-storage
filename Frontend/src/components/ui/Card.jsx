import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const Card = ({ children, className, variant = "default", ...props }) => {
  const variants = {
    default: "glass-card bg-white/40 dark:bg-[#0f463e]/40 border-slate-200 dark:border-[#14b8a6]/20 hover:bg-white/80 dark:hover:bg-[#0f463e]/80 hover:border-[#14b8a6]/40 dark:hover:border-[#14b8a6]/60 hover:shadow-[0_0_40px_rgba(20,184,166,0.15)] dark:hover:shadow-[0_0_40px_rgba(20,184,166,0.3)]",
    brand: "glass-card bg-[#14b8a6]/5 dark:bg-[#0f463e]/70 border-[#14b8a6]/20 dark:border-[#14b8a6]/30 shadow-[0_0_20px_rgba(20,184,166,0.05)] dark:shadow-[0_0_20px_rgba(20,184,166,0.15)] hover:bg-[#14b8a6]/10 dark:hover:bg-[#0f463e] hover:border-[#14b8a6]/40 dark:hover:border-[#14b8a6]/70 hover:shadow-[0_0_50px_rgba(20,184,166,0.2)] dark:hover:shadow-[0_0_50px_rgba(20,184,166,0.4)]",
    accent: "glass-card bg-[#db2777]/5 dark:bg-[#0f463e]/40 border-[#db2777]/20 dark:border-[#db2777]/30 shadow-[0_0_20px_rgba(219,39,119,0.05)] dark:shadow-[0_0_20px_rgba(219,39,119,0.1)] hover:bg-[#db2777]/10 dark:hover:bg-[#0f463e]/80 hover:shadow-[0_0_40px_rgba(219,39,119,0.15)] dark:hover:shadow-[0_0_40px_rgba(219,39,119,0.3)] hover:border-[#db2777]/40 dark:hover:border-[#db2777]/60",
    dark: "glass-panel bg-white/40 dark:bg-[#0f463e]/40 border-slate-200 dark:border-[#14b8a6]/20 hover:bg-white/80 dark:hover:bg-[#0f463e]/80 hover:border-[#14b8a6]/40 dark:hover:border-[#14b8a6]/60 hover:shadow-[0_0_40px_rgba(20,184,166,0.15)] dark:hover:shadow-[0_0_40px_rgba(20,184,166,0.3)] transition-all",
  };

  return (
    <motion.div
      whileHover={{ y: -12, scale: 1.01, transition: { duration: 0.4, ease: "easeOut" } }}
      className={cn(
        "relative rounded-[20px] p-8 transition-all duration-300 ease-out overflow-hidden group",
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
