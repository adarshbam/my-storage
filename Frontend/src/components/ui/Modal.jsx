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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className={cn(
          "relative w-full max-w-lg bg-white/95 dark:bg-vault-panel/95 text-slate-900 dark:text-white backdrop-blur-2xl rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_35px_var(--accent-glow)] border border-slate-200/90 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col",
          className,
        )}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.03]">
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
              title="Close modal"
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
