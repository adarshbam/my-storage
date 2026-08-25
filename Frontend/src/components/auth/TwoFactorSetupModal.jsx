import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  QrCode,
  Key,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Loader2,
  X,
  Lock,
  ArrowRight,
  Shield,
} from "lucide-react";
import { setupTwoFactor, verifyTwoFactorSetup } from "../../api/auth.api";

export default function TwoFactorSetupModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: QR & Secret, 2: Code Verification, 3: Recovery Codes
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState(null); // { secret, otpauthUrl, qrCode }
  const [totpCode, setTotpCode] = useState(["", "", "", "", "", ""]);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedAllRecovery, setCopiedAllRecovery] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      setTotpCode(["", "", "", "", "", ""]);
      setCopiedKey(false);
      setCopiedAllRecovery(false);
      initSetup();
    }
  }, [isOpen]);

  const initSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await setupTwoFactor();
      if (res.data?.secret) {
        setSetupData(res.data);
      } else {
        setError("Failed to generate 2FA credentials");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to initialize 2FA setup"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...totpCode];
    newOtp[index] = value;
    setTotpCode(newOtp);

    if (value && index < 5) {
      document.getElementById(`2fa-setup-code-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !totpCode[index] && index > 0) {
      document.getElementById(`2fa-setup-code-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const newOtp = [...totpCode];
      for (let i = 0; i < pasted.length; i++) {
        newOtp[i] = pasted[i];
      }
      setTotpCode(newOtp);
      const nextEmpty = Math.min(pasted.length, 5);
      document.getElementById(`2fa-setup-code-${nextEmpty}`)?.focus();
    }
  };

  const handleVerifySetup = async (e) => {
    if (e) e.preventDefault();
    const codeStr = totpCode.join("");
    if (codeStr.length !== 6) {
      setError("Please enter the complete 6-digit code from your authenticator app");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await verifyTwoFactorSetup({ code: codeStr });
      if (res.data?.success && res.data.recoveryCodes) {
        setRecoveryCodes(res.data.recoveryCodes);
        setStep(3); // Go to recovery codes step
        if (onSuccess) await onSuccess();
      } else {
        setError(res.data?.error || "Invalid code");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Verification failed. Ensure device time is synchronized."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRecoveryCodes = () => {
    const text = recoveryCodes.join("\n");
    navigator.clipboard.writeText(
      `VAULT STORAGE - TWO-FACTOR RECOVERY CODES\nGenerated: ${new Date().toLocaleString()}\n\n${text}\n\nKeep these codes in a secure, confidential place.`
    );
    setCopiedAllRecovery(true);
    setTimeout(() => setCopiedAllRecovery(false), 2500);
  };

  const handleDownloadRecoveryCodes = () => {
    const text = recoveryCodes.join("\n");
    const content = `VAULT STORAGE - TWO-FACTOR RECOVERY CODES\nGenerated: ${new Date().toLocaleString()}\n\n${text}\n\nEach code can be used ONCE to log in if you lose access to your authenticator app.`;
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `vault-2fa-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={step === 3 ? onClose : undefined}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-vault-surface border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl z-10 max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden text-white"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors p-1 cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="text-emerald-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Two-Factor Authentication
              </h3>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                {step === 1 && "Step 1: Scan Authenticator QR Code"}
                {step === 2 && "Step 2: Verify Authenticator Code"}
                {step === 3 && "Step 3: Save Backup Recovery Codes"}
              </p>
            </div>
          </div>

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

          {/* STEP 1: Scan QR Code & View Secret */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-xs text-white/60 font-medium leading-relaxed">
                Scan this QR code using Google Authenticator, Authy, 1Password, or any TOTP authenticator app.
              </p>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-emerald-400" size={32} />
                  <span className="text-xs text-white/50">Generating 2FA security key…</span>
                </div>
              ) : setupData?.qrCode ? (
                <div className="flex flex-col items-center gap-4">
                  {/* QR Code Container */}
                  <div className="p-3 bg-white rounded-2xl shadow-xl">
                    <img
                      src={setupData.qrCode}
                      alt="2FA QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  </div>

                  {/* Secret Key Box */}
                  <div className="w-full">
                    <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1.5 text-center">
                      Or manually enter this secret key
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                      <code className="text-xs font-mono font-bold text-emerald-400 tracking-widest break-all">
                        {setupData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0 ml-2"
                        title="Copy Secret Key"
                      >
                        {copiedKey ? (
                          <Check size={16} className="text-emerald-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading || !setupData?.secret}
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-teal-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Next: Enter 6-Digit Code <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Verify Code */}
          {step === 2 && (
            <form onSubmit={handleVerifySetup} className="space-y-5">
              <p className="text-xs text-white/60 font-medium leading-relaxed">
                Enter the 6-digit code currently shown in your authenticator app to finalize setup.
              </p>

              <div>
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-3 text-center">
                  6-Digit Authenticator Code
                </label>
                <div className="flex gap-1.5 sm:gap-2 justify-center" onPaste={handleOtpPaste}>
                  {totpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`2fa-setup-code-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) =>
                        handleOtpChange(idx, e.target.value.replace(/\D/, ""))
                      }
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-9 sm:w-11 h-11 sm:h-12 text-center text-sm sm:text-lg font-black rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors caret-emerald-400 shadow-inner"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back to QR
                </button>
                <button
                  type="submit"
                  disabled={loading || totpCode.join("").length !== 6}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-teal-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Verifying…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Activate 2FA
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Recovery Codes */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                <span className="leading-relaxed">
                  <strong>Save these recovery codes!</strong> If you ever lose your phone or authenticator app, these single-use codes are the only way to recover account access.
                </span>
              </div>

              {/* Grid of Recovery Codes */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-black/40 border border-white/10 rounded-2xl font-mono text-xs text-white">
                {recoveryCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-white/5 text-center font-bold tracking-widest select-all border border-white/5 text-emerald-400"
                  >
                    {code}
                  </div>
                ))}
              </div>

              {/* Copy & Download actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyRecoveryCodes}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedAllRecovery ? (
                    <>
                      <Check size={14} className="text-emerald-400" /> Copied All Codes
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy All
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRecoveryCodes}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} /> Download .txt
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-500/25 hover:opacity-95 transition-opacity cursor-pointer"
                >
                  I Have Saved My Recovery Codes
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
