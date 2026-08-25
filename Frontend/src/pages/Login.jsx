import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { handleGoogleAuth } from "../lib/googleAuth";
import Button from "../components/ui/Button";
import GoogleSignInButton from "../components/ui/GoogleSignInButton";
import AuthLayout from "../layouts/AuthLayout";
import { Eye, EyeOff, Loader2, ShieldCheck, Key, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { verifyTwoFactorLogin } from "../api/auth.api";
import { VaultLogo } from "../components/ui/VaultIcons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sendingForgot, setSendingForgot] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState(["", "", "", "", "", ""]);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setUser } = useAuth();

  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  // ── Process Query Parameters for OAuth 2FA and Errors ──
  useEffect(() => {
    const is2FA = searchParams.get("twoFactorRequired") === "true";
    const token = searchParams.get("tempToken");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      if (oauthError === "AccountTerminated") {
        setError("This account has been permanently terminated by system administration.");
      } else if (oauthError === "AccountDeactivated") {
        setError("This account is deactivated. Contact system administration to reactivate your account.");
      } else if (oauthError === "InvalidToken" || oauthError === "AuthFailed") {
        setError("Authentication failed. Please try again.");
      } else if (oauthError === "NoEmailFound") {
        setError("No verified email found on your GitHub account.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    }

    if (is2FA && token) {
      setTwoFactorToken(token);
      setTwoFactorRequired(true);
      setTwoFactorCode(["", "", "", "", "", ""]);
      setSearchParams({}, { replace: true });
      setTimeout(() => document.getElementById("2fa-login-code-0")?.focus(), 300);
    }
  }, [searchParams, setSearchParams]);

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

  const handleTwoFactorCodeChange = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...twoFactorCode];
    newCode[index] = value;
    setTwoFactorCode(newCode);

    if (value && index < 5) {
      document.getElementById(`2fa-login-code-${index + 1}`)?.focus();
    }
  };

  const handleTwoFactorKeyDown = (index, e) => {
    if (e.key === "Backspace" && !twoFactorCode[index] && index > 0) {
      document.getElementById(`2fa-login-code-${index - 1}`)?.focus();
    }
  };

  const handleTwoFactorPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const newCode = [...twoFactorCode];
      for (let i = 0; i < pasted.length; i++) {
        newCode[i] = pasted[i];
      }
      setTwoFactorCode(newCode);
      const nextEmpty = Math.min(pasted.length, 5);
      document.getElementById(`2fa-login-code-${nextEmpty}`)?.focus();
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setVerifying2FA(true);

    const codeToVerify = useRecoveryCode
      ? recoveryCodeInput.trim()
      : twoFactorCode.join("");

    if (!codeToVerify) {
      setError(
        useRecoveryCode
          ? "Please enter your recovery code"
          : "Please enter the complete 6-digit verification code"
      );
      setVerifying2FA(false);
      return;
    }

    try {
      const res = await verifyTwoFactorLogin({
        tempToken: twoFactorToken,
        code: codeToVerify,
        isRecoveryCode: useRecoveryCode,
      });

      if (res.data?.message) {
        const userRes = await fetch(`${SERVER_URL}/user`, {
          credentials: "include",
        });

        if (userRes.ok) {
          const userInfo = await userRes.json();
          setUser(userInfo);
          navigate("/dashboard");
        } else {
          setError("Failed to load user session");
        }
      } else {
        setError(res.data?.error || "Invalid verification code");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "2FA verification failed. Please try again."
      );
    } finally {
      setVerifying2FA(false);
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
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        // ── Check if Two-Factor Authentication is required ──
        if (data.twoFactorRequired && data.tempToken) {
          setTwoFactorToken(data.tempToken);
          setTwoFactorRequired(true);
          setTwoFactorCode(["", "", "", "", "", ""]);
          setTimeout(() => document.getElementById("2fa-login-code-0")?.focus(), 300);
          return;
        }

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
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <AuthLayout>
      <div className="w-full">
        {twoFactorRequired ? (
          /* ── TWO-FACTOR AUTHENTICATION CHALLENGE ── */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent-soft border border-accent-border flex items-center justify-center mb-4 shadow-accent-glow-sm">
                <ShieldCheck className="text-accent-primary" size={28} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Two-Factor Authentication
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {useRecoveryCode
                  ? "Enter one of your 12-character emergency recovery codes"
                  : "Enter the 6-digit code generated by your authenticator app"}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm border border-red-500/20 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
              {!useRecoveryCode ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                    6-Digit Security Code
                  </label>
                  <div className="flex gap-2 justify-center py-2" onPaste={handleTwoFactorPaste}>
                    {twoFactorCode.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`2fa-login-code-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) =>
                          handleTwoFactorCodeChange(idx, e.target.value.replace(/\D/, ""))
                        }
                        onKeyDown={(e) => handleTwoFactorKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-lg font-black rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all caret-accent-primary"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Backup Recovery Code
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryCodeInput}
                    onChange={(e) => setRecoveryCodeInput(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-center text-base tracking-widest uppercase focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setError("");
                  }}
                  className="text-accent-primary hover:opacity-80 font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <Key size={13} />
                  {useRecoveryCode
                    ? "Use Authenticator App Code"
                    : "Lost your device? Use Recovery Code"}
                </button>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  disabled={
                    verifying2FA ||
                    (!useRecoveryCode && twoFactorCode.join("").length !== 6) ||
                    (useRecoveryCode && !recoveryCodeInput.trim())
                  }
                  className="w-full bg-accent-primary text-accent-foreground font-bold py-3.5 rounded-xl shadow-md shadow-accent-glow/20 transition-all"
                >
                  {verifying2FA ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={16} /> Verifying…
                    </span>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorRequired(false);
                    setTwoFactorToken("");
                    setError("");
                  }}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={13} /> Back to standard login
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* ── STANDARD LOGIN SCREEN ── */
          <>
            {/* Header — logo visible on mobile only (promo panel hidden) */}
            <div className="flex flex-col items-center mb-6 lg:hidden">
              <div className="p-2.5 rounded-2xl bg-accent-soft border border-accent-border text-accent-primary mb-3 shadow-sm">
                <VaultLogo size={24} />
              </div>
            </div>
            <div className="flex flex-col mb-6 text-center lg:text-left">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Welcome back
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">
                Enter your credentials to access your secure vault
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-2xl text-xs mb-5 border border-red-500/20 font-medium">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl text-xs mb-5 border border-emerald-500/20 font-medium">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-sm font-semibold"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="flex text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 justify-between items-center">
                  <span>Password</span>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={sendingForgot}
                    className="text-accent-primary hover:opacity-80 text-xs font-semibold transition-colors disabled:opacity-50 lowercase tracking-normal"
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
                    className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-sm font-semibold"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="w-full pt-1">
                <Button
                  type="submit"
                  className="w-full py-3 text-xs uppercase tracking-wider font-bold"
                >
                  Sign In
                </Button>
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

            {/* Google & GitHub Sign In */}
            <div className="flex flex-col gap-2.5">
              <GoogleSignInButton
                label="Sign in with Google"
                onSuccess={(response) => {
                  if (response.credential) {
                    handleGoogleAuth(response.credential, {
                      setUser,
                      navigate,
                      setError,
                      onTwoFactorRequired: (tempToken) => {
                        setTwoFactorToken(tempToken);
                        setTwoFactorRequired(true);
                        setTwoFactorCode(["", "", "", "", "", ""]);
                        setTimeout(() => document.getElementById("2fa-login-code-0")?.focus(), 300);
                      },
                    });
                  }
                }}
                onError={() => setError("Google sign-in failed")}
              />

              <button
                type="button"
                onClick={() => {
                  const clientId = import.meta.env.VITE_GITHUB_CLIENTID;
                  const redirectUri = `${SERVER_URL}/user/auth/github`;
                  window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
                }}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
              >
            <svg
              className="w-4 h-4 fill-current"
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

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-accent-primary hover:opacity-80 font-bold transition-colors"
          >
            Sign up
          </Link>
        </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
