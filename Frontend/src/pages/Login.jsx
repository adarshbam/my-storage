import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import AuthLayout from "../layouts/AuthLayout";
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
    <AuthLayout>
      <div className="w-full">
        {/* Header — logo visible on mobile only (promo panel hidden) */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <div className="bg-gradient-to-br from-[#14b8a6] to-[#0f463e] p-3 rounded-2xl shadow-[0_0_25px_rgba(20,184,166,0.4)] mb-5">
            <Cloud className="text-white fill-white/20" size={28} />
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
            <label className="flex text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 justify-between items-center">
              <span>Password</span>
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
