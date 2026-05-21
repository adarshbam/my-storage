import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Loader2,
  ShieldAlert,
  CheckCircle,
  FolderOpen,
  User,
} from "lucide-react";
import Button from "../components/ui/Button";

export default function SharedAccessClaim() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchLinkDetails();
  }, [token]);

  const fetchLinkDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/share/token/${token}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setOwnerInfo(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(
          errData.error ||
            "This share link is invalid, expired, or has been revoked.",
        );
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!user) {
      // Redirect to login with redirect back to this page
      navigate(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }

    setClaiming(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/share/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/dashboard/shared");
        }, 2000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to claim shared access.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans transition-colors duration-300 relative flex items-center justify-center p-4">
      {/* Background radial effects */}
      <div className="fixed inset-0 z-[0] bg-[#f0f9f7] dark:bg-[#020b08] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-[radial-gradient(ellipse,rgba(20,184,166,0.12)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(20,184,166,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl border border-black/5 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="animate-spin text-[#14b8a6]" size={40} />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Verifying sharing token...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="p-4 bg-red-500/10 text-red-500 rounded-full mb-4">
              <ShieldAlert size={36} />
            </div>
            <h2 className="text-xl font-bold mb-2">Access Link Error</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm sm:text-base leading-relaxed">
              {error}
            </p>
            <Link to="/" className="w-full">
              <Button className="w-full py-2.5 rounded-xl">Go Home</Button>
            </Link>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="p-4 bg-emerald-500/15 text-emerald-500 rounded-full mb-4 animate-bounce">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Granted!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Connecting you to the shared Vault...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-[#14b8a6]/10 text-[#14b8a6] rounded-full mb-4">
              <FolderOpen size={38} />
            </div>
            <h2 className="text-2xl font-extrabold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-[#14b8a6] to-[#3b82f6]">
              Shared Vault Invite
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You are invited to access a shared vault
            </p>

            <div className="w-full bg-slate-500/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/[0.04] rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                Shared By
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#14b8a6]/10 flex items-center justify-center text-[#14b8a6] overflow-hidden border border-black/5 dark:border-white/10 shadow-[0_0_10px_rgba(20,184,166,0.2)]">
                  {ownerInfo?.owner?.profilepic ? (
                    <img
                      src={ownerInfo.owner.profilepic.startsWith("http") 
                        ? ownerInfo.owner.profilepic 
                        : `${SERVER_URL}/user/profilepic?id=${ownerInfo.owner.profilepic}`
                      }
                      alt="Owner Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {ownerInfo?.owner?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {ownerInfo?.owner?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-left text-sm space-y-3 mb-8 text-slate-600 dark:text-slate-300">
              <div className="flex gap-2">
                <span className="text-[#14b8a6] font-bold">•</span>
                <p>
                  You can <strong>view and download</strong> all files in this
                  drive.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-[#14b8a6] font-bold">•</span>
                <p>
                  You <strong>cannot</strong> upload, edit, delete, or rename
                  any files.
                </p>
              </div>
              {ownerInfo?.expiresAt && (
                <div className="flex gap-2 text-amber-500 font-medium">
                  <span className="font-bold">•</span>
                  <p>
                    This access link expires on{" "}
                    {new Date(ownerInfo.expiresAt).toLocaleDateString()}.
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-3 text-base rounded-xl font-semibold shadow-lg shadow-[#14b8a6]/25 hover:shadow-xl hover:shadow-[#14b8a6]/30 transition-all duration-300"
            >
              {claiming ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Accepting Invite...
                </span>
              ) : user ? (
                "Accept Shared Access"
              ) : (
                "Login to Accept Invite"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
