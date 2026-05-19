import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import Button from "../components/ui/Button";
import AuthLayout from "../layouts/AuthLayout";
import { Eye, EyeOff, CheckCircle2, Box } from "lucide-react";

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
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <div className="bg-[#01140f] border border-teal-500/30 p-3 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.8),0_0_15px_rgba(20,184,166,0.3)] mb-5 transition-all duration-300 relative">
            <Box className="text-[#14b8a6] relative z-10" size={28} />
          </div>
        </div>
        <div className="flex flex-col mb-8 text-center lg:text-left">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6 border border-red-500/20">
            {error}
          </div>
        )}
        
        {success ? (
          <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 text-center">
            <CheckCircle2 className="text-emerald-500 mb-3" size={48} />
            <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
              Password Reset
            </h3>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
              {success}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 justify-between items-center">
                <span>New Password</span>
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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 text-[15px]"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Remember your password?{" "}
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
