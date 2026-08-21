import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { AlertTriangle, ShieldAlert, AlertCircle } from "lucide-react";

export default function GitSafetyModal({
  isOpen,
  onClose,
  onConfirm,
  severity = "yellow", // "red" | "yellow" | "normal"
  title,
  description,
  impactDetails = [],
  confirmText = "Confirm",
  requireInputText = "", // if specified, user must type this exact string
  loading = false,
}) {
  const [typedInput, setTypedInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTypedInput("");
    }
  }, [isOpen]);

  const isRed = severity === "red";
  const isYellow = severity === "yellow";
  const canConfirm = requireInputText
    ? typedInput.trim() === requireInputText.trim()
    : true;

  const handleConfirm = () => {
    if (!canConfirm || loading) return;
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isRed ? (
            <ShieldAlert size={18} className="text-rose-500 animate-pulse" />
          ) : isYellow ? (
            <AlertTriangle size={18} className="text-amber-400" />
          ) : (
            <AlertCircle size={18} className="text-accent-primary" />
          )}
          <span className={isRed ? "text-rose-500" : isYellow ? "text-amber-400" : "text-white"}>
            {title}
          </span>
        </div>
      }
      className="max-w-md"
    >
      <div className="space-y-4 pt-1">
        {/* Banner */}
        <div
          className={`p-4 rounded-2xl border ${
            isRed
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
              : isYellow
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                : "bg-white/5 border-white/10 text-white/80"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                isRed
                  ? "bg-rose-500/20 text-rose-400"
                  : isYellow
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-white/10 text-white/60"
              }`}
            >
              {isRed ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="space-y-1">
              <div className="font-black text-xs uppercase tracking-wider">
                {isRed ? "DANGER — POTENTIALLY IRREVERSIBLE OPERATION" : isYellow ? "WARNING — IMPACTFUL OPERATION" : "CONFIRMATION REQUIRED"}
              </div>
              <p className="text-xs text-white/80 leading-relaxed font-medium">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Impact items */}
        {impactDetails.length > 0 && (
          <div className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl p-3.5 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              Expected Consequences
            </div>
            <ul className="space-y-1 text-xs text-slate-700 dark:text-white/70">
              {impactDetails.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isRed ? "bg-rose-500" : "bg-amber-400"}`} />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confirmation text input if required */}
        {requireInputText && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-white/70">
              To verify, type <span className="font-mono text-rose-500 font-bold px-1.5 py-0.5 bg-rose-500/10 rounded">{requireInputText}</span> below:
            </label>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={`Type "${requireInputText}" to confirm`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:border-rose-500 transition-colors"
              autoFocus
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className={
              isRed
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
                : isYellow
                  ? "bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20"
                  : "bg-accent-primary text-accent-foreground"
            }
          >
            {loading ? "Processing..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
