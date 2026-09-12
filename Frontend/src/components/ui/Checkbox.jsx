import React, { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Vault Custom Checkbox Component
 * Polished, cryptographic cyber design with smooth micro-spring animations.
 */
const Checkbox = forwardRef(function Checkbox(
  {
    checked,
    defaultChecked,
    onChange,
    disabled = false,
    required = false,
    id,
    name,
    value,
    indeterminate = false,
    variant = "accent", // "accent" | "danger" | "warning" | "purple"
    size = "md", // "sm" | "md" | "lg"
    label,
    description,
    children,
    className,
    containerClassName,
    labelClassName,
    ...props
  },
  ref
) {
  // If controlled or uncontrolled
  const [internalChecked, setInternalChecked] = React.useState(
    defaultChecked ?? false
  );
  const isChecked = checked !== undefined ? Boolean(checked) : internalChecked;

  const handleChange = (e) => {
    if (disabled) return;
    if (checked === undefined) {
      setInternalChecked(e.target.checked);
    }
    if (onChange) {
      onChange(e);
    }
  };

  // Size styling maps
  const sizeMap = {
    sm: {
      box: "w-3.5 h-3.5 min-w-[0.875rem] min-h-[0.875rem] rounded-[4px]",
      icon: 11,
      stroke: 2.5,
    },
    md: {
      box: "w-4 h-4 min-w-[1rem] min-h-[1rem] rounded-md",
      icon: 12,
      stroke: 2.75,
    },
    lg: {
      box: "w-5 h-5 min-w-[1.25rem] min-h-[1.25rem] rounded-lg",
      icon: 14,
      stroke: 3,
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Variant active color maps
  const variantStyles = {
    accent: {
      checked:
        "bg-accent-primary border-accent-primary text-accent-foreground shadow-[0_0_10px_var(--accent-glow)]",
      borderHover: "group-hover:border-accent-primary/60",
      focusRing: "focus-visible:ring-accent-primary",
    },
    danger: {
      checked:
        "bg-rose-500 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.35)]",
      borderHover: "group-hover:border-rose-400/70",
      focusRing: "focus-visible:ring-rose-500",
    },
    warning: {
      checked:
        "bg-amber-500 border-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.35)]",
      borderHover: "group-hover:border-amber-400/70",
      focusRing: "focus-visible:ring-amber-500",
    },
    purple: {
      checked:
        "bg-purple-600 border-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.35)]",
      borderHover: "group-hover:border-purple-400/70",
      focusRing: "focus-visible:ring-purple-500",
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.accent;

  const checkboxBox = (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 border transition-all duration-200 select-none",
        currentSize.box,
        isChecked || indeterminate
          ? currentVariant.checked
          : "bg-white/90 dark:bg-white/[0.06] backdrop-blur-md border-slate-300 dark:border-white/20",
        !disabled && !(isChecked || indeterminate) && currentVariant.borderHover,
        disabled && "opacity-40 cursor-not-allowed",
        !disabled && "cursor-pointer",
        className
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        id={id}
        name={name}
        value={value}
        checked={isChecked}
        disabled={disabled}
        required={required}
        onChange={handleChange}
        className={cn(
          "sr-only peer",
          currentVariant.focusRing
        )}
        {...props}
      />

      <AnimatePresence initial={false} mode="wait">
        {isChecked && !indeterminate && (
          <motion.span
            key="checked-icon"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 30,
            }}
            className="flex items-center justify-center leading-none pointer-events-none"
          >
            <Check
              size={currentSize.icon}
              strokeWidth={currentSize.stroke}
              className="currentColor"
            />
          </motion.span>
        )}

        {indeterminate && (
          <motion.span
            key="indeterminate-icon"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 30,
            }}
            className="flex items-center justify-center leading-none pointer-events-none"
          >
            <Minus
              size={currentSize.icon}
              strokeWidth={currentSize.stroke}
              className="currentColor"
            />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );

  // If no label or children provided, return standalone checkbox
  if (!label && !children && !description) {
    return checkboxBox;
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        "group inline-flex items-start gap-2.5 select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        containerClassName
      )}
    >
      <div className="pt-0.5">{checkboxBox}</div>
      <div className="flex flex-col">
        {label && (
          <span
            className={cn(
              "text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-snug",
              labelClassName
            )}
          >
            {label}
          </span>
        )}
        {children}
        {description && (
          <span className="text-[11px] text-slate-500 dark:text-white/50 leading-relaxed font-normal mt-0.5">
            {description}
          </span>
        )}
      </div>
    </label>
  );
});

export default Checkbox;
