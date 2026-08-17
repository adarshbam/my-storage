import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  headerActions,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={cn(
          "relative w-full max-w-lg bg-white dark:bg-vault-surface text-slate-900 dark:text-white backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.75)] border border-slate-200/90 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200",
          className,
        )}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
