import { useState } from "react";
import { Link } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import Button from "../components/ui/Button";
import { Cloud, ShieldCheck, Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VerifyOtp() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendOtp = async () => {
    if (!email) return;
    setError("");
    setSuccess("");
    setSendingOtp(true);

    try {
      const response = await fetch(`${SERVER_URL}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      if (response.ok) {
        setOtpSent(true);
        setSuccess("OTP sent! Check your email.");
        setTimeout(() => document.getElementById("otp-0")?.focus(), 300);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to send OTP");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setVerifying(true);

    const otpValue = otp.join("");

    try {
      const response = await fetch(`${SERVER_URL}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue }),
        credentials: "include",
      });

      if (response.ok) {
        setSuccess("Verified successfully!");
      } else {
        const data = await response.json();
        setError(data.error || "Invalid OTP");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
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
      document.getElementById(`otp-${nextEmpty}`)?.focus();
    }
  };

  const otpComplete = otp.join("").length === 6;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#faf5f7] dark:bg-[#020b08] transition-colors duration-300">
      {/* Layered Gradient Background */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-15%] w-[50vw] h-[50vw] bg-[#14b8a6]/15 dark:bg-[#14b8a6]/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-15%] w-[40vw] h-[40vw] bg-[#3b82f6]/15 dark:bg-[#3b82f6]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[30%] w-[45vw] h-[45vw] bg-[#a855f7]/10 dark:bg-[#a855f7]/8 rounded-full blur-[120px]" />
      </div>

      {/* Glow aura */}
      <div className="absolute w-[400px] h-[400px] bg-[#14b8a6]/10 dark:bg-[#14b8a6]/15 rounded-full blur-[100px] pointer-events-none z-[1]" />

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl border border-black/10 dark:border-white/[0.08] rounded-[24px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300"
        >
          {/* Logo + Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-[#14b8a6] to-[#0f463e] p-3 rounded-2xl shadow-[0_0_25px_rgba(20,184,166,0.4)] mb-5">
              <Cloud className="text-white fill-white/20" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Verify your email
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-center">
              Enter your email and verify with a 6-digit code
            </p>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-5 border border-red-500/20"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-sm mb-5 border border-emerald-500/20"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Single Form */}
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            {/* Email row — input + Send button inline */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <div className="flex gap-2">
                <input
                  id="otp-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent}
                  className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="name@example.com"
                />
                <motion.button
                  id="send-otp-btn"
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !email}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    flex items-center gap-1.5 px-5 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300
                    ${otpSent
                      ? "bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 dark:hover:bg-emerald-500/20"
                      : "bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] border border-white/20"
                    }
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
                  `}
                >
                  {sendingOtp ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <Send size={14} />
                      {otpSent ? "Resend" : "Send"}
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* OTP Input — slides in after send */}
            <AnimatePresence>
              {otpSent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Verification Code
                  </label>
                  <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value.replace(/\D/, ""))}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-full aspect-square max-w-[52px] text-center text-xl font-bold rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] outline-none transition-all duration-300 caret-[#14b8a6]"
                      />
                    ))}
                  </div>

                  {/* Verify Button */}
                  <Button
                    id="verify-otp-btn"
                    type="submit"
                    variant="masterclass"
                    className="w-full py-3.5 text-[15px] mt-5"
                    disabled={verifying || !otpComplete}
                  >
                    {verifying ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={18} />
                        Verifying…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShieldCheck size={18} />
                        Verify
                      </span>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Footer link */}
          <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already verified?{" "}
            <Link
              to="/login"
              className="text-[#14b8a6] hover:text-[#0d9488] font-semibold transition-colors"
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
