import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import { Cloud } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${SERVER_URL}/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#faf5f7] dark:bg-[#020b08] transition-colors duration-300">
      {/* Layered Gradient Background — matching landing page */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-15%] w-[50vw] h-[50vw] bg-[#14b8a6]/15 dark:bg-[#14b8a6]/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-15%] w-[40vw] h-[40vw] bg-[#3b82f6]/15 dark:bg-[#3b82f6]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[30%] w-[45vw] h-[45vw] bg-[#a855f7]/10 dark:bg-[#a855f7]/8 rounded-full blur-[120px]" />
      </div>

      {/* Glow aura behind the card */}
      <div className="absolute w-[400px] h-[400px] bg-[#14b8a6]/10 dark:bg-[#14b8a6]/15 rounded-full blur-[100px] pointer-events-none z-[1]" />

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl border border-black/10 dark:border-white/[0.08] rounded-[24px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300">
          {/* Logo + Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-[#14b8a6] to-[#0f463e] p-3 rounded-2xl shadow-[0_0_25px_rgba(20,184,166,0.4)] mb-5">
              <Cloud className="text-white fill-white/20" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Enter your credentials to access your drive
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6 border border-red-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] outline-none transition-all duration-300"
                placeholder="name@example.com"
              />
            </div>
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

            <Button type="submit" className="w-full py-3.5 text-[15px]">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-[#14b8a6] hover:text-[#0d9488] font-semibold transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
