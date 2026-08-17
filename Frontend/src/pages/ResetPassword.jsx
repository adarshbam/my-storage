import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import Button from "../components/ui/Button";
import AuthLayout from "../layouts/AuthLayout";
import { Eye, EyeOff, CheckCircle2, Box } from "lucide-react";
import { VaultLogo } from "../components/ui/VaultIcons";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${SERVER_URL}/user/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
        credentials: "include",
      });

      if (response.ok) {
        setSuccess("Password reset successful. You can now login.");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        const data = await response.json();
        setError(data.message || data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 lg:hidden">
          <div className="p-2.5 rounded-2xl bg-accent-soft border border-accent-border text-accent-primary mb-3 shadow-sm">
            <VaultLogo size={24} />
          </div>
        </div>
        <div className="flex flex-col mb-6 text-center lg:text-left">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-2xl text-xs mb-5 border border-red-500/20 font-medium">
            {error}
          </div>
        )}
        
        {success ? (
          <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-6 text-center">
            <CheckCircle2 className="text-emerald-500 mb-3" size={40} />
            <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              Password Reset Successful
            </h3>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
              {success}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-xs uppercase tracking-wider font-bold"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Remember your password?{" "}
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
