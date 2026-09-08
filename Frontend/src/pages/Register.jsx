import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { handleGoogleAuth } from "../lib/googleAuth";
import Button from "../components/ui/Button";
import GoogleSignInButton from "../components/ui/GoogleSignInButton";
import AuthLayout from "../layouts/AuthLayout";
import {
  Cloud,
  Send,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Box,
  Pencil,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VaultLogo, GitHubLogo } from "../components/ui/VaultIcons";

export default function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [password, setPassword] = useState("");
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
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
        let errorMsg = "Failed to send OTP";
        try {
          const data = await response.json();
          errorMsg = data.error || data.message || errorMsg;
        } catch {
          // Non-JSON response
        }
        setError(errorMsg);
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
        let errorMsg = "Invalid OTP";
        try {
          const data = await response.json();
          errorMsg = data.error || data.message || errorMsg;
        } catch {
          // Non-JSON response
        }
        setError(errorMsg);
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
        body: JSON.stringify({ email, name, password }),
        credentials: "include",
      });

      if (response.ok) {
        // Registration now auto-logs in (session cookie set by server)
        // Fetch user info to update the auth context
        const userRes = await fetch(`${SERVER_URL}/user`, {
          credentials: "include",
        });

        if (userRes.ok) {
          const userInfo = await userRes.json();
          setUser(userInfo);
          navigate("/dashboard");
        } else {
          // Fallback: session was created but user fetch failed, redirect to login
          navigate("/login");
        }
      } else {
        let errorMsg = "Registration failed";
        try {
          const data = await response.json();
          errorMsg = data.error || data.message || errorMsg;
        } catch {
          // Non-JSON response
        }
        setError(errorMsg);
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

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
  };

  const handleResetEmailVerification = () => {
    setOtpVerified(false);
    setOtpSent(false);
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  return (
    <AuthLayout>
      <div className="w-full min-w-0">
        {/* Header — logo visible on mobile only (promo panel hidden) */}
        <div className="flex flex-col items-center mb-5 sm:mb-6 lg:hidden">
          <div className="p-2.5 rounded-2xl bg-accent-soft border border-accent-border text-accent-primary mb-3 shadow-sm">
            <VaultLogo size={24} />
          </div>
        </div>
        <div className="flex flex-col mb-5 sm:mb-6 text-center lg:text-left">
          <h1 className="text-xl min-[360px]:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create an account
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">
            Start securing your assets with zero-knowledge encryption
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-2xl text-xs mb-5 border border-red-500/20 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
          {/* Name & Email */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="flex gap-2 mb-3 w-full min-w-0">
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                className="flex-1 min-w-0 px-3.5 sm:px-4 py-2.5 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Ada Lovelace"
              />
            </div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="flex items-center gap-1.5 min-[360px]:gap-2 w-full min-w-0">
              <input
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                disabled={otpVerified}
                className="flex-1 min-w-0 px-3 min-[360px]:px-4 py-2.5 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-xs min-[360px]:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
                      flex items-center justify-center gap-1 min-[360px]:gap-1.5 px-2.5 min-[360px]:px-3.5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-200 overflow-hidden shrink-0 cursor-pointer
                      ${otpSent
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-accent-primary text-accent-foreground shadow-md shadow-accent-glow/20"
                      }
                      disabled:opacity-40 disabled:cursor-not-allowed
                    `}
                  >
                    {sendingOtp ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        <Send size={12} className="min-[360px]:w-[13px] min-[360px]:h-[13px]" />
                        <span>{otpSent ? "Resend" : "Send"}</span>
                      </>
                    )}
                  </motion.button>
                )}

                {otpVerified && (
                  <motion.button
                    type="button"
                    onClick={handleResetEmailVerification}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative flex items-center justify-center gap-1.5 px-3 min-[360px]:px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/20 transition-all duration-200 shrink-0 overflow-hidden min-w-[85px] min-[360px]:min-w-[95px]"
                    title="Click to change email address"
                  >
                    <span className="flex items-center gap-1.5 group-hover:hidden transition-all duration-200">
                      <CheckCircle2 size={14} />
                      Verified
                    </span>
                    <span className="hidden group-hover:flex items-center gap-1.5 transition-all duration-200">
                      <Pencil size={12} />
                      Change
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* OTP input */}
          <AnimatePresence>
            {otpSent && !otpVerified && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden w-full min-w-0"
              >
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Verification Code
                </label>
                <div className="flex gap-1 min-[340px]:gap-1.5 sm:gap-2 justify-center mb-3 w-full min-w-0" onPaste={handleOtpPaste}>
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
                      className="w-8 min-[340px]:w-9 sm:w-10 h-10 min-[340px]:h-11 text-center text-xs min-[340px]:text-sm sm:text-base font-bold rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all caret-accent-primary"
                    />
                  ))}
                </div>
                <div className="flex gap-2 min-[360px]:gap-2.5">
                  <motion.button
                    id="verify-otp-btn"
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otp.join("").length < 6}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-accent-primary text-accent-foreground shadow-md shadow-accent-glow/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifyingOtp ? (
                      <>
                        <Loader2 className="animate-spin" size={15} />
                        Verifying…
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={15} />
                        Verify Code
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={handleResetEmailVerification}
                    whileTap={{ scale: 0.97 }}
                    className="px-3 min-[360px]:px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X size={15} />
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Choose Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-sm font-semibold"
              placeholder="••••••••"
            />
          </div>

          {/* Mandatory Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer group select-none">
              <input
                type="checkbox"
                required
                checked={agreedToPolicies}
                onChange={(e) => setAgreedToPolicies(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-accent-primary focus:ring-accent-primary focus:ring-offset-0 border-black/20 dark:border-white/20 bg-white dark:bg-white/5 cursor-pointer"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
                I agree to Vault's{" "}
                <Link to="/terms" target="_blank" className="text-accent-primary underline font-bold">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="text-accent-primary underline font-bold">
                  Privacy Policy
                </Link>
                , including the Google API Limited Use disclosure.
              </span>
            </label>
          </div>

          <div className="w-full relative group pt-1">
            <Button 
              type="submit" 
              disabled={!otpVerified || !agreedToPolicies}
              className="w-full py-3 text-xs uppercase tracking-wider font-bold"
            >
              Create Account
            </Button>
            {(!otpVerified || !agreedToPolicies) && (
              <div
                className="absolute inset-0 z-10 cursor-not-allowed"
                title={!otpVerified ? "Verify email first" : "Please agree to the Terms of Service and Privacy Policy to proceed"}
              />
            )}
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            or
          </span>
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
        </div>

        {/* Policy notice for OAuth */}
        <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
          By signing up with Google or GitHub, you agree to Vault's{" "}
          <Link to="/terms" target="_blank" className="text-accent-primary underline font-medium">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" target="_blank" className="text-accent-primary underline font-medium">
            Privacy Policy
          </Link>
          .
        </p>

        {/* Google Sign Up */}
        <div className="flex flex-col gap-2.5">
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

          <button
            type="button"
            onClick={() => {
              const clientId = import.meta.env.VITE_GITHUB_CLIENTID;
              const redirectUri = SERVER_URL.startsWith("http")
                ? `${SERVER_URL}/user/auth/github`
                : `${window.location.origin}${SERVER_URL}/user/auth/github`;
              window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email,repo&state=${encodeURIComponent(`login|${window.location.origin}`)}`;
            }}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
          >
            <GitHubLogo size={16} />
            Sign up with GitHub
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-accent-primary hover:opacity-80 font-bold transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
