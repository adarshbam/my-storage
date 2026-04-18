import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { handleGoogleAuth } from "../lib/googleAuth";
import Button from "../components/ui/Button";
import GoogleSignInButton from "../components/ui/GoogleSignInButton";
import AuthLayout from "../layouts/AuthLayout";
import { Cloud, Send, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  const handleSendOtp = async () => {
    if (!isEmailValid) return;
    setError("");
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

  const handleVerifyOtp = async () => {
    const otpValue = otp.join("");
    if (otpValue.length < 6) return;
    setError("");
    setVerifyingOtp(true);

    try {
      const response = await fetch(`${SERVER_URL}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue }),
        credentials: "include",
      });

      if (response.ok) {
        setOtpVerified(true);
      } else {
        const data = await response.json();
        setError(data.error || "Invalid OTP");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setVerifyingOtp(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${SERVER_URL}/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const loginRes = await fetch(`${SERVER_URL}/user/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });

        if (loginRes.ok) {
          const userInfo = await loginRes.json();
          setUser(userInfo);
          navigate("/dashboard");
        } else {
          navigate("/login");
        }
      } else {
        const data = await response.json();
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (otpSent) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtp(["", "", "", "", "", ""]);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <div className="bg-gradient-to-br from-[#14b8a6] to-[#0f463e] p-3 rounded-2xl shadow-[0_0_25px_rgba(20,184,166,0.4)] mb-5">
            <Cloud className="text-white fill-white/20" size={28} />
          </div>
        </div>
        <div className="flex flex-col mb-8 text-center lg:text-left">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create an account
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Start storing your files securely today
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email + Send OTP */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                disabled={otpVerified}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="name@example.com"
              />

              <AnimatePresence>
                {isEmailValid && !otpVerified && (
                  <motion.button
                    id="send-otp-btn"
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    initial={{ opacity: 0, scale: 0.85, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: "auto" }}
                    exit={{ opacity: 0, scale: 0.85, width: 0 }}
                    transition={{ duration: 0.2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300 overflow-hidden flex-shrink-0
                      ${otpSent
                        ? "bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] border border-white/20"
                      }
                      disabled:opacity-40 disabled:cursor-not-allowed
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
                )}

                {otpVerified && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0"
                  >
                    <CheckCircle2 size={16} />
                    Verified
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* OTP input — between email and password */}
          <AnimatePresence>
            {otpSent && !otpVerified && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 20 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Verification Code
                </label>
                <div className="flex gap-2.5 justify-center mb-3" onPaste={handleOtpPaste}>
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
                      className="w-11 h-12 text-center text-lg font-bold rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] outline-none transition-all duration-300 caret-[#14b8a6]"
                    />
                  ))}
                </div>
                <motion.button
                  id="verify-otp-btn"
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otp.join("").length < 6}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm bg-[#0f463e]/90 backdrop-blur-3xl border-2 border-[#14b8a6] shadow-[0_0_20px_rgba(20,184,166,0.3)] text-white hover:bg-[#115e52] hover:border-[#2dd4bf] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Verify
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] outline-none transition-all duration-300"
              placeholder="••••••••"
            />
          </div>

          <div className="w-full relative group">
            <Button 
              type="submit" 
              disabled={!otpVerified}
              className={`w-full py-3.5 text-[15px] ${!otpVerified ? "opacity-50 pointer-events-none hover:!scale-100 active:!scale-100" : ""}`}
            >
              Create Account
            </Button>
            {!otpVerified && (
              <div className="absolute inset-0 z-10 cursor-not-allowed" title="Verify email first" />
            )}
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
        </div>

        {/* Google Sign Up */}
        <GoogleSignInButton
          label="Sign up with Google"
          onSuccess={(response) => {
            if (response.credential) {
              handleGoogleAuth(response.credential, {
                setUser,
                navigate,
                setError,
              });
            }
          }}
          onError={() => setError("Google sign-up failed")}
        />

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#14b8a6] hover:text-[#0d9488] font-semibold transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
