import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const Card = ({ children, className, variant = "default", ...props }) => {
  const innerVariants = {
    default: "bg-white/80 dark:bg-[#020b08]/90 backdrop-blur-3xl",
    brand: "bg-white/80 dark:bg-[#020b08]/90 backdrop-blur-3xl",
    accent: "bg-white/80 dark:bg-[#020b08]/90 backdrop-blur-3xl",
    dark: "bg-white/80 dark:bg-[#020b08]/90 backdrop-blur-3xl",
  };

  // We make sure the outer wrapper takes the height constraints and handles hover effects
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.4, ease: "easeOut" } }}
      className={cn(
        "relative rounded-[22px] p-[1.5px] transition-all duration-300 ease-out overflow-hidden group shadow-2xl",
        props.className && props.className.includes("h-full") ? "h-full" : "",
      )}
      {...(() => {
        const { className: _, ...rest } = props;
        return rest;
      })()}
    >
      {/* Animating Border - Glowing Rotating background element */}
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_180deg,rgba(20,184,166,0.6)_360deg)] opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
      {/* Alternate rotating glow for extra effect */}
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 animate-[spin_6s_linear_infinite_reverse] bg-[conic-gradient(from_0deg,transparent_0_180deg,rgba(59,130,246,0.4)_360deg)] opacity-40 group-hover:opacity-80 transition-opacity duration-500" />

      {/* Inner Card content container */}
      <div className={cn(
        "relative z-10 w-full h-full rounded-[20px] p-8 flex flex-col overflow-hidden transition-colors duration-300",
        innerVariants[variant] || innerVariants.default,
        className
      )}>
        {/* Subtle top glare/gradient inside the card */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-[20px]" />
        
        {/* Decorative Internal Glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {children}
      </div>
    </motion.div>
  );
};

export default Card;
