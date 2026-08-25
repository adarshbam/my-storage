import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  ShieldCheck,
  Send,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Edit2,
  Shield,
  Check,
} from "lucide-react";
import { sendPhoneOtp, verifyPhoneOtp, verifyFirebasePhone } from "../../api/auth.api";
import { getFirebaseAuth, setupRecaptchaVerifier, signInWithPhoneNumber } from "../../lib/firebase";

const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "United States / Canada", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+7", country: "Russia / Kazakhstan", flag: "🇷🇺" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+972", country: "Israel", flag: "🇮🇱" },
  { code: "+30", country: "Greece", flag: "🇬🇷" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+36", country: "Hungary", flag: "🇭🇺" },
  { code: "+40", country: "Romania", flag: "🇷🇴" },
  { code: "+380", country: "Ukraine", flag: "🇺🇦" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
  { code: "+886", country: "Taiwan", flag: "🇹🇼" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
];

export default function PhoneVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Verify Phone to Claim Free Trial",
  subtitle = "A verified mobile number is required to claim your 30-day Free Trial and protect against multi-account abuse.",
  purpose = "trial", // "trial" or "security"
}) {
  const [selectedCountry, setSelectedCountry] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const confirmationResultRef = useRef(null);
  const otpInputsRef = useRef([]);

  // Lock body scroll when modal is open
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

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !sendingOtp && !verifyingOtp) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, sendingOtp, verifyingOtp, onClose]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Reset state when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setPhoneNumber("");
      setOtp(["", "", "", "", "", ""]);
      setOtpSent(false);
      setError("");
      setSuccessMsg("");
      setCooldown(0);
      setVerifiedSuccess(false);
      confirmationResultRef.current = null;
    }
  }, [isOpen]);

  const fullPhoneNumber = `${selectedCountry}${phoneNumber.replace(/\D/g, "")}`;

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 6) {
      setError("Please enter a valid phone number with at least 6 digits.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setSendingOtp(true);

    try {
      // 1. Try Firebase Phone Authentication (10,000 free SMS/month)
      const firebaseAuth = getFirebaseAuth();
      const appVerifier = setupRecaptchaVerifier("firebase-phone-recaptcha");
      if (firebaseAuth && appVerifier) {
        try {
          const confirmation = await signInWithPhoneNumber(firebaseAuth, fullPhoneNumber, appVerifier);
          confirmationResultRef.current = confirmation;
          setOtpSent(true);
          setCooldown(60);
          setOtp(["", "", "", "", "", ""]);
          setSuccessMsg("SMS verification code sent to your mobile phone.");
          setTimeout(() => {
            otpInputsRef.current[0]?.focus();
          }, 300);
          return;
        } catch (firebaseErr) {
          console.warn("[Firebase Phone Auth] Notice:", firebaseErr.code || firebaseErr.message);

          // If standard Firebase user errors (e.g. invalid phone or too many requests), report directly
          if (
            firebaseErr.code === "auth/invalid-phone-number" ||
            firebaseErr.code === "auth/too-many-requests" ||
            firebaseErr.code === "auth/quota-exceeded"
          ) {
            let msg = "Failed to dispatch verification code. Please check your phone number format.";
            if (firebaseErr.code === "auth/invalid-phone-number") {
              msg = "Invalid phone number format. Please ensure your country code and number are correct.";
            } else if (firebaseErr.code === "auth/too-many-requests") {
              msg = "Too many requests. Please wait a few moments and try again.";
            } else if (firebaseErr.code === "auth/quota-exceeded") {
              msg = "Daily SMS quota exceeded. Please try again later or use test phone credentials.";
            }
            setError(msg);
            return;
          }
          // If Firebase config is not yet supplied by user, gracefully try backend endpoint
        }
      }

      // 2. Server-side fallback provider
      const res = await sendPhoneOtp({
        phone: fullPhoneNumber,
        defaultCountry: "IN",
      });

      const data = res?.data || res;

      if (data?.success) {
        setOtpSent(true);
        setCooldown(data.resendCooldownSeconds || 60);
        setOtp(["", "", "", "", "", ""]);
        setSuccessMsg(data.message || "Verification code sent via SMS.");
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 300);
      } else {
        setError(data?.error || data?.message || "Failed to send verification code. Please verify the number.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.data?.error ||
          err.data?.message ||
          err.message ||
          "Failed to dispatch verification code. Please check your phone number format."
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // Only accept numeric digit
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);
    setError("");

    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || "";
      }
      setOtp(newOtp);
      setError("");
      const targetIndex = Math.min(pasted.length, 5);
      otpInputsRef.current[targetIndex]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError("");
    setVerifyingOtp(true);

    try {
      let verifiedPhone = fullPhoneNumber;

      // 1. If we have active Firebase confirmationResult, confirm via Firebase Auth
      if (confirmationResultRef.current) {
        const userCredential = await confirmationResultRef.current.confirm(otpValue);
        const idToken = await userCredential.user.getIdToken();

        const backendRes = await verifyFirebasePhone({ idToken });
        const data = backendRes?.data || backendRes;

        if (data?.success) {
          verifiedPhone = data.phone || fullPhoneNumber;
        } else {
          throw new Error(data?.error || data?.message || "Failed to link verified phone to account.");
        }
      } else {
        // 2. Fallback backend verification
        const res = await verifyPhoneOtp({
          phone: fullPhoneNumber,
          otp: otpValue,
        });

        const data = res?.data || res;
        if (!data?.success) {
          throw new Error(data?.error || data?.message || "Invalid verification code. Please try again.");
        }
        verifiedPhone = data.phone || data.canonicalPhone || fullPhoneNumber;
      }

      setVerifiedSuccess(true);
      setSuccessMsg(
        purpose === "trial"
          ? "Phone verified! Activating your 30-Day Free Trial..."
          : "Phone number verified successfully!"
      );
      if (onSuccess) {
        await onSuccess({ phone: verifiedPhone });
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      let msg = "Verification failed. Please check the code and try again.";
      if (err.code === "auth/invalid-verification-code") {
        msg = "Incorrect SMS verification code. Please check and try again.";
      } else if (err.code === "auth/code-expired") {
        msg = "Verification code has expired. Please request a new code.";
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            key="phone-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/80 dark:bg-black/85 backdrop-blur-md"
            onClick={() => {
              if (!sendingOtp && !verifyingOtp) onClose();
            }}
          />

          {/* Modal Card */}
          <motion.div
            key="phone-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md my-auto bg-white dark:bg-[#0d1614] text-slate-900 dark:text-white border border-slate-200 dark:border-emerald-500/20 rounded-3xl p-5 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_40px_rgba(16,185,129,0.15)] z-10 max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto custom-scrollbar"
          >
            {/* Top Right Ambient Glow */}
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-500/15 dark:bg-emerald-500/20 blur-3xl pointer-events-none rounded-full" />
            <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-teal-500/10 dark:bg-teal-500/15 blur-3xl pointer-events-none rounded-full" />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={sendingOtp || verifyingOtp}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>

            {/* Header with Icon & Badges */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-emerald-600 dark:text-emerald-400">
                {verifiedSuccess ? (
                  <CheckCircle2 size={24} className="animate-bounce" />
                ) : purpose === "trial" ? (
                  <Sparkles size={24} className="animate-pulse" />
                ) : (
                  <Smartphone size={24} />
                )}
              </div>
              <div className="flex-1 pr-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider mb-1">
                  <Shield size={10} className="shrink-0" />
                  {purpose === "trial" ? "Anti-Abuse Verification" : "Security Verification"}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {title}
                </h3>
              </div>
            </div>

            {/* Subtitle & Trust Callout */}
            <p className="text-xs text-slate-600 dark:text-white/70 font-normal leading-relaxed mb-4">
              {subtitle}
            </p>

            {/* Trust highlights banner */}
            {!otpSent && (
              <div className="p-3 mb-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex flex-col gap-1.5 text-[11px] text-slate-600 dark:text-white/60">
                <div className="flex items-center gap-2">
                  <Lock size={12} className="text-emerald-500 shrink-0" />
                  <span>
                    <strong>Fair Usage:</strong> 1 Free Trial allowed per mobile identity
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                  <span>
                    <strong>Instant Activation:</strong> SMS code verification within seconds
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2.5 mb-4 overflow-hidden"
                >
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                  <span className="leading-relaxed flex-1">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 mb-4 overflow-hidden"
                >
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                  <span className="flex-1">{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FORM BODY */}
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
              {!otpSent ? (
                /* STEP 1: ENTER PHONE NUMBER */
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-2">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        disabled={sendingOtp}
                        className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shrink-0 disabled:opacity-50 cursor-pointer max-w-[130px] font-medium"
                      >
                        {countryCodes.map((c, i) => (
                          <option
                            key={`${c.code}-${i}`}
                            value={c.code}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {c.flag} {c.code} ({c.country})
                          </option>
                        ))}
                      </select>

                      <input
                        type="tel"
                        required
                        autoFocus
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={sendingOtp}
                        placeholder="98765 43210"
                        className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Firebase invisible reCAPTCHA container */}
                  <div id="firebase-phone-recaptcha" className="my-1 flex justify-center" />

                  <button
                    type="submit"
                    disabled={sendingOtp || !phoneNumber.trim()}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Sending SMS Code…
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Send Verification Code
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* STEP 2: ENTER 6-DIGIT OTP */
                <div className="space-y-4">
                  {/* Sent Phone Bar */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2 text-xs">
                      <Smartphone size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-slate-600 dark:text-white/60">Sent to:</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        {fullPhoneNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp(["", "", "", "", "", ""]);
                        setError("");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <Edit2 size={11} /> Change
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-2.5 text-center">
                      Enter 6-Digit SMS Verification Code
                    </label>

                    {/* 6 Digit Inputs */}
                    <div className="flex gap-1.5 sm:gap-2 justify-center" onPaste={handleOtpPaste}>
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputsRef.current[idx] = el)}
                          id={`phone-modal-otp-${idx}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          disabled={verifyingOtp || verifiedSuccess}
                          className="w-9 sm:w-11 h-11 sm:h-12 sm:w-12 sm:h-13 text-center text-base sm:text-xl font-mono font-bold rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all caret-emerald-500 disabled:opacity-50"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Resend & Expiry Info */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 px-1 pt-1">
                    <span>
                      {cooldown > 0 ? (
                        <>
                          Resend code in{" "}
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
                            {cooldown}s
                          </span>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp}
                          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} className={sendingOtp ? "animate-spin" : ""} />
                          Resend Code
                        </button>
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-white/40">
                      Code valid for 10 min
                    </span>
                  </div>

                  {/* Action CTA */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={verifyingOtp || otp.join("").length !== 6 || verifiedSuccess}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {verifyingOtp ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Verifying Code…
                        </>
                      ) : verifiedSuccess ? (
                        <>
                          <Check size={16} /> Verified!
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          {purpose === "trial" ? "Verify & Unlock Free Trial" : "Verify & Continue"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
