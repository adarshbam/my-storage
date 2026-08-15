import { cn } from "../../lib/utils";

const Badge = ({ children, className, variant = "default", ...props }) => {
  const variants = {
    default: "bg-white/5 border border-white/10 text-white/80",
    emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    purple: "bg-purple-500/10 text-purple-300 border border-purple-500/30",
    owner: "bg-purple-500/10 text-purple-300 border border-purple-500/30",
    rose: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
    destructive: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
    blue: "bg-blue-500/10 text-blue-300 border border-blue-500/30",
    neutral: "bg-white/5 text-white/50 border border-white/10",
    outline: "border border-white/15 text-white/70",
    accent: "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider select-none",
        variants[variant] || variants.default,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;

