import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { handleGoogleAuth } from "../lib/googleAuth";
import Button from "../components/ui/Button";
import GoogleSignInButton from "../components/ui/GoogleSignInButton";
import AuthLayout from "../layouts/AuthLayout";
import { Eye, EyeOff, Cloud, Send, Loader2, CheckCircle2, Box } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [sendingForgot, setSendingForgot] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  const isOtpComplete = true; // BYPASSED

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

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (otpSent) {
      setOtpSent(false);
      setOtp(["", "", "", "", "", ""]);
    }
  };

  const handleForgotPassword = async () => {
    if (!isEmailValid) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setMessage("");
    setSendingForgot(true);

    try {
      const response = await fetch(`${SERVER_URL}/user/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      if (response.ok) {
        setMessage("If an account exists, a reset email will be sent.");
      } else {
        const data = await response.json();
        setError(data.message || data.error || "Failed to process request");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setSendingForgot(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${SERVER_URL}/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, otp: otp.join("") }),
        credentials: "include",
      });

      if (response.ok) {
        const userRes = await fetch(`${SERVER_URL}/user`, {
          credentials: "include",
        });

        if (userRes.ok) {
          const userInfo = await userRes.json();
          setUser(userInfo);
          navigate("/dashboard");
        } else {
          setError("Failed to load user data");
        }
      } else {
        const data = await response.json();
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <AuthLayout>
      <div className="w-full">
        {/* Header — logo visible on mobile only (promo panel hidden) */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <div className="bg-[#01140f] border border-teal-500/30 p-3 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.8),0_0_15px_rgba(20,184,166,0.3)] mb-5 transition-all duration-300 relative">
            <Box className="text-[#14b8a6] relative z-10" size={28} />
          </div>
        </div>
        <div className="flex flex-col mb-8 text-center lg:text-left">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Enter your credentials to access your drive
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6 border border-red-500/20">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-sm mb-6 border border-emerald-500/20">
            {message}
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
                disabled={isOtpComplete && otpSent}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="name@example.com"
              />

              <AnimatePresence>
                {isEmailValid && !(isOtpComplete && otpSent) && (
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
                      ${
                        otpSent
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

                {isOtpComplete && otpSent && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0"
                  >
                    <CheckCircle2 size={16} />
                    Ready
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* OTP input — between email and password */}
          <AnimatePresence>
            {otpSent && !isOtpComplete && (
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
                <div
                  className="flex gap-2.5 justify-center"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) =>
                        handleOtpChange(idx, e.target.value.replace(/\D/, ""))
                      }
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-lg font-bold rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] outline-none transition-all duration-300 caret-[#14b8a6]"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="flex text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 justify-between items-center">
              <span>Password</span>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={sendingForgot}
                className="text-[#14b8a6] hover:text-[#0d9488] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {sendingForgot ? "Sending..." : "Forgot password?"}
              </button>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] outline-none transition-all duration-300"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="w-full relative group">
            <Button
              type="submit"
              disabled={false} // BYPASSED: !isOtpComplete || !otpSent
              className={`w-full py-3.5 text-[15px]`}
            >
              Sign In
            </Button>
            {/* BYPASSED: {(!isOtpComplete || !otpSent) && (
              <div
                className="absolute inset-0 z-10 cursor-not-allowed"
                title="Enter OTP first"
              />
            )} */}
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

        {/* Google Sign In */}
        <div className="flex flex-col gap-3">
          <GoogleSignInButton
            label="Sign in with Google"
            onSuccess={(response) => {
              if (response.credential) {
                handleGoogleAuth(response.credential, {
                  setUser,
                  navigate,
                  setError,
                });
              }
            }}
            onError={() => setError("Google sign-in failed")}
          />

          {/* GitHub Sign In */}
          <button
            type="button"
            onClick={() => {
              const clientId = import.meta.env.VITE_GITHUB_CLIENTID;
              const redirectUri = `${SERVER_URL}/user/auth/github`;
              window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm text-slate-700 dark:text-slate-200 font-semibold text-[15px] hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          >
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 100 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-[#14b8a6] hover:text-[#0d9488] font-semibold transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
