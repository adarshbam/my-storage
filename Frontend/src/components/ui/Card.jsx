import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

/**
 * Premium Card with subtle surface hierarchy and clean hover interactions.
 */
const Card = ({
  children,
  className,
  variant = "default",
  hoverLift = true,
  ...props
}) => {
  const isFullHeight = className?.includes("h-full");

  return (
    <motion.div
      whileHover={
        hoverLift
          ? {
              y: -4,
              transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
            }
          : undefined
      }
      className={cn(
        "relative rounded-2xl p-6 transition-all duration-300",
        "bg-white/70 dark:bg-vault-surface/70 backdrop-blur-xl",
        "border border-black/[0.08] dark:border-white/[0.08]",
        "hover:border-black/20 dark:hover:border-white/20",
        "shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)]",
        isFullHeight ? "h-full" : "",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
