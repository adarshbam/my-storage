import { cn } from "../../lib/utils";

const Badge = ({ children, className, variant = "default", ...props }) => {
  const variants = {
    default: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    outline:
      "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400",
    accent: "bg-gradient-to-r from-blue-600 to-cyan-500 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
