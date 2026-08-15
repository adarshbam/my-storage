import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Key,
  Trash2,
  RefreshCw,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Check,
} from "lucide-react";
import { disableTwoFactor, regenerateRecoveryCodes } from "../../api/auth.api";

export default function TwoFactorManageModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState("regenerate"); // "regenerate" or "disable"
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [newRecoveryCodes, setNewRecoveryCodes] = useState([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setTotpCode("");
      setError("");
      setSuccessMsg("");
      setNewRecoveryCodes([]);
      setCopiedCodes(false);
      setActiveTab("regenerate");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegenerateCodes = async (e) => {
    e.preventDefault();
    if (!password && !totpCode) {
      setError("Please enter your current account password or 6-digit authenticator code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await regenerateRecoveryCodes({
        password: password || undefined,
        totpCode: totpCode || undefined,
      });

      if (res.data?.success && res.data.recoveryCodes) {
        setNewRecoveryCodes(res.data.recoveryCodes);
        setSuccessMsg("10 new recovery codes generated! Your old codes are now invalid.");
      } else {
        setError(res.data?.error || "Failed to regenerate recovery codes");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Authorization failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!password && !totpCode) {
      setError("Please enter your current account password or 6-digit authenticator code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await disableTwoFactor({
        password: password || undefined,
        totpCode: totpCode || undefined,
      });

      if (res.data?.success) {
        setSuccessMsg("Two-Factor Authentication has been disabled.");
        if (onSuccess) await onSuccess();
        setTimeout(() => onClose(), 1200);
      } else {
        setError(res.data?.error || "Failed to disable 2FA");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Authorization failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNewCodes = () => {
    const text = newRecoveryCodes.join("\n");
    navigator.clipboard.writeText(
      `VAULT STORAGE - REGENERATED TWO-FACTOR RECOVERY CODES\nGenerated: ${new Date().toLocaleString()}\n\n${text}\n\nKeep these codes safe.`
    );
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  const handleDownloadNewCodes = () => {
    const text = newRecoveryCodes.join("\n");
    const content = `VAULT STORAGE - REGENERATED TWO-FACTOR RECOVERY CODES\nGenerated: ${new Date().toLocaleString()}\n\n${text}`;
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `vault-regenerated-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-vault-surface border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden text-white"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <ShieldAlert className="text-emerald-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Manage Two-Factor Authentication
              </h3>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                Security & Recovery Settings
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          {!newRecoveryCodes.length && (
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("regenerate");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "regenerate"
                    ? "bg-white/10 text-white shadow"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <RefreshCw size={14} /> Regenerate Codes
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("disable");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "disable"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <Trash2 size={14} /> Disable 2FA
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2.5 mb-5"
            >
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </motion.div>
          )}

          {/* Success Message */}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 mb-5"
            >
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Regenerated Codes View */}
          {newRecoveryCodes.length > 0 ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                Your previous recovery codes have been invalidated. Save these 10 new codes immediately:
              </div>

              <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-xs font-bold text-emerald-300">
                {newRecoveryCodes.map((code, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white/5 flex items-center justify-between">
                    <span className="text-white/40 text-[10px]">#{idx + 1}</span>
                    <span>{code}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyNewCodes}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {copiedCodes ? (
                    <>
                      <Check size={14} className="text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy All
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadNewCodes}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={14} /> Download .txt
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-500/25 hover:opacity-95"
              >
                Done
              </button>
            </div>
          ) : (
            /* Form for Regenerate or Disable */
            <form onSubmit={activeTab === "regenerate" ? handleRegenerateCodes : handleDisable2FA} className="space-y-5">
              <p className="text-xs text-white/60 font-medium leading-relaxed">
                {activeTab === "regenerate"
                  ? "Regenerate 10 brand-new recovery codes. All previously generated recovery codes will become inactive."
                  : "Disabling Two-Factor Authentication makes your account less secure. Confirm with your password or authenticator code."}
              </p>

              <div>
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
                  Account Password (or current 6-digit Authenticator Code)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter account password"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative bg-vault-surface px-3 text-[10px] uppercase font-bold text-white/30 tracking-widest">
                  OR USE CODE
                </span>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit authenticator code"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white text-center font-mono tracking-widest placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="pt-3">
                {activeTab === "regenerate" ? (
                  <button
                    type="submit"
                    disabled={loading || (!password && !totpCode)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <RefreshCw size={14} /> Regenerate 10 Recovery Codes
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || (!password && !totpCode)}
                    className="w-full py-3.5 rounded-2xl bg-rose-500/90 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <Trash2 size={14} /> Disable Two-Factor Authentication
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
