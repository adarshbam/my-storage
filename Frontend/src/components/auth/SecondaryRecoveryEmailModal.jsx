import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ShieldCheck,
  Send,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Lock,
} from "lucide-react";
import {
  sendSecondaryRecoveryEmailOtp,
  verifySecondaryRecoveryEmailOtp,
  removeSecondaryRecoveryEmail,
} from "../../api/auth.api";

export default function SecondaryRecoveryEmailModal({
  isOpen,
  onClose,
  currentEmail = null,
  onSuccess,
}) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setOtp(["", "", "", "", "", ""]);
      setOtpSent(false);
      setError("");
      setSuccessMsg("");
      setCooldown(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid secondary email address");
      return;
    }

    setError("");
    setSuccessMsg("");
    setSendingOtp(true);

    try {
      const res = await sendSecondaryRecoveryEmailOtp({ email });
      if (res.data?.success) {
        setOtpSent(true);
        setCooldown(res.data.resendCooldownSeconds || 60);
        setSuccessMsg(res.data.message || "Verification code sent to email");
        setTimeout(() => document.getElementById("sec-email-otp-0")?.focus(), 300);
      } else {
        setError(res.data?.error || "Failed to send verification code");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to send verification code"
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`sec-email-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`sec-email-otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const newOtp = [...otp];
      for (let i = 0; i < pasted.length; i++) {
        newOtp[i] = pasted[i];
      }
      setOtp(newOtp);
      const nextEmpty = Math.min(pasted.length, 5);
      document.getElementById(`sec-email-otp-${nextEmpty}`)?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setError("");
    setVerifyingOtp(true);

    try {
      const res = await verifySecondaryRecoveryEmailOtp({
        email,
        otp: otpValue,
      });

      if (res.data?.success) {
        setSuccessMsg("Secondary recovery email verified and saved!");
        if (onSuccess) await onSuccess();
        setTimeout(() => onClose(), 1200);
      } else {
        setError(res.data?.error || "Invalid verification code");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Verification failed. Please try again."
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Are you sure you want to remove your secondary recovery email?")) {
      return;
    }

    setError("");
    setRemoving(true);
    try {
      const res = await removeSecondaryRecoveryEmail();
      if (res.data?.success) {
        setSuccessMsg("Secondary recovery email removed.");
        if (onSuccess) await onSuccess();
        setTimeout(() => onClose(), 1000);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove recovery email");
    } finally {
      setRemoving(false);
    }
  };

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
          onClick={onClose}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-vault-surface border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden text-white"
        >
          {/* Top Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 blur-3xl pointer-events-none" />

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
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(20,184,166,0.2)]">
              <Mail className="text-teal-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {currentEmail ? "Update Recovery Email" : "Set Recovery Email"}
              </h3>
              <p className="text-xs text-teal-400 font-semibold uppercase tracking-wider mt-0.5">
                Secondary Security Email
              </p>
            </div>
          </div>

          <p className="text-xs text-white/60 font-medium leading-relaxed mb-6">
            {currentEmail
              ? "Change your secondary recovery email address used for critical account recovery and security alerts."
              : "Add a trusted backup email address. If you lose access to your primary email or 2FA, this address can be used for verification."}
          </p>

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

          {/* Form */}
          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-5">
            {/* Step 1: Input Email */}
            <div>
              <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
                Secondary Email Address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent}
                  placeholder="recovery@example.com"
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors disabled:opacity-50"
                />

                {!otpSent && (
                  <button
                    type="submit"
                    disabled={sendingOtp || !email}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-white text-xs font-bold transition-all shadow-lg shadow-teal-500/20 disabled:opacity-40 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    {sendingOtp ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <Send size={14} /> Send Code
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* If currently set email exists and no OTP active, show remove button */}
            {!otpSent && currentEmail && (
              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <span className="text-xs text-white/40">
                  Current: <strong className="text-white/80">{currentEmail}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {removing ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      <Trash2 size={14} /> Remove Email
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 2: Input 6-Digit OTP */}
            <AnimatePresence>
              {otpSent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-2"
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">
                      6-Digit Security Code
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp(["", "", "", "", "", ""]);
                      }}
                      className="text-xs text-teal-400 hover:underline font-semibold cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>

                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`sec-email-otp-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) =>
                          handleOtpChange(idx, e.target.value.replace(/\D/, ""))
                        }
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-lg font-black rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors caret-teal-400 shadow-inner"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                    <span>
                      {cooldown > 0 ? (
                        <>Resend available in <span className="font-bold text-white">{cooldown}s</span></>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp}
                          className="text-teal-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Send size={12} /> Resend Code
                        </button>
                      )}
                    </span>
                    <span className="font-medium">Valid for 10 minutes</span>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={verifyingOtp || otp.join("").length !== 6}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-teal-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {verifyingOtp ? (
                        <>
                          <Loader2 className="animate-spin" size={16} /> Verifying Code…
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} /> Verify & Activate Recovery Email
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
