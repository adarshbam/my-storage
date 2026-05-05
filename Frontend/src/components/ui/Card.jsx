import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

/**
 * Premium Card — always dark background for max contrast on both themes.
 * Animated spinning border only (inner fill is 100% opaque).
 *
 * Props:
 *  - variant:      "default" | "brand" | "accent" | "dark" | "featured"
 *  - borderAccent: "teal" | "blue" | "purple" | "gold"
 *  - className:    applied to the inner content layer (padding, flex, etc.)
 */

const BORDER = {
  teal:   ["rgba(20,184,166,1)",   "rgba(13,148,136,0.6)"],
  blue:   ["rgba(99,102,241,1)",   "rgba(59,130,246,0.6)"],
  purple: ["rgba(168,85,247,1)",   "rgba(139,92,246,0.6)"],
  gold:   ["rgba(251,191,36,1)",   "rgba(245,158,11,0.6)"],
};

/* Dark-green card palette — rich, premium */
const CARD_BG = {
  default:  "bg-[#0b1e1a]",   // deep teal-black
  brand:    "bg-[#091a16]",   // slightly deeper teal
  accent:   "bg-[#0c0e20]",   // deep navy
  dark:     "bg-[#0b1e1a]",
  featured: "bg-[#061210]",   // almost black-teal
};

/* Inner top-edge highlight colour per variant */
const HIGHLIGHT = {
  default:  "from-teal-500/10",
  brand:    "from-blue-500/10",
  accent:   "from-indigo-500/10",
  dark:     "from-teal-500/10",
  featured: "from-teal-400/8",
};

const Card = ({
  children,
  className,
  variant = "default",
  borderAccent = "teal",
  ...props
}) => {
  const [primary, secondary] = BORDER[borderAccent] ?? BORDER.teal;
  const isFullHeight = props.className?.includes("h-full") || className?.includes("h-full");
  const { className: _ignored, ...restProps } = props;

  return (
    <motion.div
      whileHover={{
        y: -8,
        scale: 1.015,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      }}
      /* Outer shell — 2px border, clips the spinning gradient */
      className={cn(
        "relative rounded-[22px] p-[2px] group cursor-default",
        isFullHeight ? "h-full" : "",
      )}
      style={{ overflow: "hidden" }}
      {...restProps}
    >
      {/* ── Spinning conic primary ─────────────────────────────────── */}
      <div
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 pointer-events-none opacity-50 group-hover:opacity-90 transition-opacity duration-600"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg 210deg, ${primary} 360deg)`,
          animation: "border-spin 3.5s linear infinite",
        }}
      />
      {/* ── Spinning conic secondary (counter-rotate) ──────────────── */}
      <div
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 pointer-events-none opacity-25 group-hover:opacity-60 transition-opacity duration-600"
        style={{
          background: `conic-gradient(from 180deg, transparent 0deg 210deg, ${secondary} 360deg)`,
          animation: "border-spin-reverse 6s linear infinite",
        }}
      />

      {/* ── Inner card — fully opaque dark, zero bleed ─────────────── */}
      <div
        className={cn(
          // Layout
          "relative z-10 w-full h-full rounded-[20px] flex flex-col overflow-hidden",
          // Always-dark background (light + dark theme)
          CARD_BG[variant] ?? CARD_BG.default,
          // Text inherits white
          "text-white",
          // ── Light-theme shadow: multi-layer for extreme depth ─────
          "shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.25),0_12px_32px_rgba(0,0,0,0.2),0_32px_64px_rgba(0,0,0,0.15)]",
          // ── Hover shadow: dramatic lift + teal glow ───────────────
          "group-hover:shadow-[0_2px_4px_rgba(0,0,0,0.4),0_8px_20px_rgba(0,0,0,0.3),0_20px_50px_rgba(0,0,0,0.25),0_40px_80px_rgba(20,184,166,0.12)]",
          "transition-shadow duration-300",
          // Inner top highlight
          `before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent ${HIGHLIGHT[variant] ?? HIGHLIGHT.default} before:via-teal-400/20 before:to-transparent`,
          className,
        )}
      >
        {/* Top-edge inner glow */}
        <div className={cn(
          "absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent pointer-events-none rounded-t-[20px] opacity-60",
          HIGHLIGHT[variant] ?? HIGHLIGHT.default,
        )} />

        {children}
      </div>
    </motion.div>
  );
};

export default Card;
